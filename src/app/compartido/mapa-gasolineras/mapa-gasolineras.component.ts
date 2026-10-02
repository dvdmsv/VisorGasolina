import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { Map as MapaLeaflet, LayerGroup, TileLayer } from 'leaflet';
import { Gasolinera } from '../../clases/gasolinera';
import { ThemeService } from '../../servicios/theme.service';
import { PrecioPipe } from '../precio.pipe';
import { ATRIBUCION, CENTRO_ESPANA, TESELAS, claseDePrecio, claseDelTema, claveDe, encuadreDe } from './mapa.util';

/** Posición del usuario, cuando la búsqueda ha sido por ubicación. */
export interface PosicionUsuario {
  latitud: number;
  longitud: number;
}

const ZOOM_SIN_RESULTADOS = 5;
const ZOOM_MAXIMO = 16;

/**
 * Mapa con las gasolineras que se están viendo en la lista.
 *
 * Leaflet se carga bajo demanda —son 42 KB más su hoja de estilos— y la vista solo lo monta
 * cuando el usuario pulsa «Mapa», así que no entra en el paquete inicial.
 *
 * Los marcadores son HTML, no imágenes: así muestran el precio directamente, se pintan con
 * los colores del tema y no hay que servir los iconos de Leaflet.
 */
@Component({
  selector: 'app-mapa-gasolineras',
  templateUrl: './mapa-gasolineras.component.html',
  styleUrl: './mapa-gasolineras.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El CSS de Leaflet tiene que alcanzar los elementos que crea fuera de Angular.
  encapsulation: ViewEncapsulation.None,
  providers: [DecimalPipe, PrecioPipe]
})
export class MapaGasolinerasComponent {
  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('lienzo');
  private readonly tema = inject(ThemeService);
  private readonly precio = inject(PrecioPipe);

  readonly gasolineras = input.required<readonly Gasolinera[]>();
  readonly precioMedio = input<number>(0);
  readonly posicionUsuario = input<PosicionUsuario | null>(null);
  /** Se emite al pulsar «Ver histórico» en el globo de una gasolinera. */
  readonly verHistorico = output<Gasolinera>();

  /** Gasolinera por clave de coordenadas, para resolver el botón del globo. */
  private readonly porClave = new Map<string, Gasolinera>();
  private delegacionPuesta = false;
  private mapa: MapaLeaflet | null = null;
  private capaTeselas: TileLayer | null = null;
  private marcadores: LayerGroup | null = null;
  private leaflet: typeof import('leaflet') | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      // El contenedor es un signal: la primera vez el efecto corre antes de que exista la
      // vista, y vuelve a correr en cuanto aparece.
      const host = this.contenedor()?.nativeElement;
      if (!host) {
        return;
      }

      // Se leen aquí para que el efecto vuelva a correr cuando cambien.
      const gasolineras = this.gasolineras();
      const posicion = this.posicionUsuario();
      const medio = this.precioMedio();
      const oscuro = this.tema.darkMode();

      this.dibujar(host, gasolineras, medio, posicion, oscuro).catch(error =>
        console.error('No se pudo dibujar el mapa', error)
      );
    });

    destroyRef.onDestroy(() => {
      this.mapa?.remove();
      this.mapa = null;
    });
  }

  private async dibujar(
    host: HTMLElement,
    gasolineras: readonly Gasolinera[],
    precioMedio: number,
    posicion: PosicionUsuario | null,
    oscuro: boolean
  ): Promise<void> {
    const L = (this.leaflet ??= await cargarLeaflet());
    const mapa = (this.mapa ??= L.map(host, {
      center: CENTRO_ESPANA,
      zoom: ZOOM_SIN_RESULTADOS,
      // La rueda hace zoom: en esta vista el mapa es el contenido principal y es lo que se
      // espera de él en escritorio. El precio es que, al desplazar la página con el puntero
      // encima del mapa, el gesto se lo queda el mapa.
      scrollWheelZoom: true
    }));

    this.delegarClicDelGlobo(host);
    this.pintarTeselas(L, mapa);
    // OpenStreetMap no tiene mapa oscuro: se invierte con CSS sin pedir nada a otro sitio.
    host.classList.toggle('mapa-oscuro', claseDelTema(oscuro) !== '');
    this.pintarMarcadores(L, mapa, gasolineras, precioMedio, posicion);
    this.encuadrar(gasolineras, posicion);
  }

  private delegarClicDelGlobo(host: HTMLElement) {
    if (this.delegacionPuesta) {
      return;
    }
    this.delegacionPuesta = true;
    host.addEventListener('click', evento => {
      const boton = (evento.target as HTMLElement | null)?.closest<HTMLElement>('.popup-boton');
      const gasolinera = boton ? this.porClave.get(boton.dataset['clave'] ?? '') : undefined;
      if (gasolinera) {
        this.verHistorico.emit(gasolinera);
      }
    });
  }

  private pintarTeselas(L: typeof import('leaflet'), mapa: MapaLeaflet) {
    this.capaTeselas ??= L.tileLayer(TESELAS, {
      attribution: ATRIBUCION,
      maxZoom: 19
    }).addTo(mapa);
  }

  private pintarMarcadores(
    L: typeof import('leaflet'),
    mapa: MapaLeaflet,
    gasolineras: readonly Gasolinera[],
    precioMedio: number,
    posicion: PosicionUsuario | null
  ) {
    this.marcadores?.clearLayers();
    this.porClave.clear();
    this.marcadores ??= L.layerGroup().addTo(mapa);

    if (posicion) {
      this.marcadores.addLayer(
        L.marker([posicion.latitud, posicion.longitud], {
          icon: L.divIcon({
            className: 'marcador-usuario',
            html: '<span class="punto-usuario"></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          }),
          // Decorativo: lo que importa para un lector de pantalla es la lista.
          keyboard: false,
          interactive: false
        })
      );
    }

    for (const gasolinera of gasolineras) {
      this.porClave.set(claveDe(gasolinera), gasolinera);
      this.marcadores.addLayer(
        L.marker([gasolinera.latitud, gasolinera.longitud], {
          title: gasolinera.rotulo,
          // Cuando varias gasolineras caen casi en el mismo punto, la barata queda encima:
          // es la que interesa ver.
          zIndexOffset: Math.round((precioMedio - gasolinera.precio) * 1000),
          icon: L.divIcon({
            className: 'marcador-precio',
            html: `<span class="etiqueta-precio ${claseDePrecio(gasolinera.precio, precioMedio)}">${this.precio.transform(gasolinera.precio)}</span>`,
            iconSize: [64, 24],
            iconAnchor: [32, 24]
          })
        }).bindPopup(() => this.contenidoPopup(gasolinera))
      );
    }
  }

  /** El contenido lo monta Leaflet fuera de Angular, así que se escapa a mano. */
  private contenidoPopup(gasolinera: Gasolinera): string {
    const enlace = `https://www.google.es/maps/place/${gasolinera.latitud},${gasolinera.longitud}`;
    const distancia = gasolinera.distancia !== undefined
      ? `<p class="popup-dato">A ${gasolinera.distancia} km</p>`
      : '';

    return `
      <div class="popup-gasolinera">
        <p class="popup-rotulo">${escapar(gasolinera.rotulo)}</p>
        <p class="popup-precio">${this.precio.transform(gasolinera.precio)}</p>
        <p class="popup-dato">${escapar(gasolinera.direccion)}</p>
        ${distancia}
        <div class="popup-acciones">
          <button type="button" class="popup-boton" data-clave="${escapar(claveDe(gasolinera))}">
            Ver histórico
          </button>
          <a class="popup-enlace" href="${enlace}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
        </div>
      </div>`;
  }

  private encuadrar(gasolineras: readonly Gasolinera[], posicion: PosicionUsuario | null) {
    const puntos = posicion
      ? [...gasolineras, { latitud: posicion.latitud, longitud: posicion.longitud } as Gasolinera]
      : gasolineras;
    const encuadre = encuadreDe(puntos);

    if (!encuadre || !this.mapa) {
      return;
    }
    this.mapa.fitBounds([encuadre.suroeste, encuadre.noreste], { maxZoom: ZOOM_MAXIMO });
  }
}

/**
 * Leaflet se publica como CommonJS, así que al importarlo dinámicamente su API queda
 * colgando de `default` en lugar de en el propio módulo.
 */
async function cargarLeaflet(): Promise<typeof import('leaflet')> {
  const modulo = await import('leaflet');
  const conInterop = modulo as unknown as { default?: typeof import('leaflet') };
  return conInterop.default ?? modulo;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
