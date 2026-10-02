import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Gasolinera } from '../../clases/gasolinera';
import { productoDeCombustible } from '../../clases/combustibles';
import { HistoricoService } from '../../servicios/historico.service';
import { PrecioPipe } from '../precio.pipe';
import { IconoComponent } from '../icono/icono.component';
import {
  ClaveRango,
  PuntoSerie,
  RANGOS,
  Vertice,
  cajaDeAviso,
  comoFechaLarga,
  indiceEnX,
  puntosDe,
  recortarA,
  resumirSerie,
  trazar
} from './historico.util';

/** Hasta que ResizeObserver mide, y en jsdom, donde no existe. */
const ANCHO_DE_PARTIDA = 320;
const ALTO = 144;
/** Ancho del recuadro con la fecha y el precio del día señalado. */
const ANCHO_CAJA = 112;

/**
 * Ficha de una gasolinera con la evolución de su precio.
 *
 * El histórico sale de ficheros estáticos generados en el build (ver
 * `scripts/generar-historico.mjs`), no de la API: el endpoint histórico del Ministerio devuelve
 * 12 MB por fecha y no se puede pedir desde el navegador.
 *
 * El gráfico es SVG propio. Una librería como Chart.js serían 70 KB para dibujar una polilínea,
 * y la geometría ya está resuelta en `historico.util.ts`.
 */
@Component({
  selector: 'app-ficha-gasolinera',
  templateUrl: './ficha-gasolinera.component.html',
  styleUrl: './ficha-gasolinera.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, PrecioPipe, IconoComponent]
})
export class FichaGasolineraComponent {
  private readonly historico = inject(HistoricoService);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly lienzo = viewChild<ElementRef<SVGSVGElement>>('lienzo');

  /**
   * Ancho real del gráfico en píxeles. El viewBox se ajusta a él, de modo que no hace falta
   * estirar el SVG: con `preserveAspectRatio="none"` el texto salía deformado al doble de ancho.
   */
  private readonly ancho = signal(ANCHO_DE_PARTIDA);

  /** Índice del día señalado con el puntero o el teclado, o null si no se señala ninguno. */
  readonly senalado = signal<number | null>(null);

  readonly anchoCaja = ANCHO_CAJA;

  readonly gasolinera = input.required<Gasolinera>();
  /**
   * Campo de la API del combustible activo, tal como lo guarda `PreferenciasService`. No se
   * puede deducir de `gasolinera.gasolina`: en las búsquedas por provincia ese campo vale
   * `PrecioProducto` para cualquier combustible.
   */
  readonly combustible = input.required<string>();
  readonly cerrar = output<void>();

  readonly rangos = RANGOS;
  readonly rango = signal<ClaveRango>('mes');

  private readonly consulta = computed(() => ({
    id: this.gasolinera().id,
    producto: productoDeCombustible(this.combustible())
  }));

  private readonly peticion = toSignal(
    toObservable(this.consulta).pipe(
      switchMap(({ id, producto }) => this.historico.getHistorico(id ?? '', producto))
    ),
    { initialValue: undefined }
  );

  /** Todos los puntos con dato, de más antiguo a más reciente. */
  private readonly puntos = computed<PuntoSerie[]>(() => {
    const datos = this.peticion();
    return datos ? puntosDe(datos.fechas, datos.precios) : [];
  });

  readonly cargando = computed(() => this.peticion() === undefined);
  readonly sinDatos = computed(() => !this.cargando() && this.puntos().length === 0);

  readonly visibles = computed(() => {
    const dias = RANGOS.find(r => r.clave === this.rango())?.dias ?? 30;
    return recortarA(this.puntos(), dias);
  });

  readonly resumen = computed(() => resumirSerie(this.visibles()));
  readonly trazado = computed(() => trazar(this.visibles(), this.ancho(), ALTO));

  /** Datos del día señalado, ya colocados para dibujar el recuadro. */
  readonly aviso = computed(() => {
    const indice = this.senalado();
    const trazado = this.trazado();
    if (indice === null || !trazado) {
      return null;
    }
    const vertice: Vertice | undefined = trazado.vertices[indice];
    if (!vertice) {
      return null;
    }
    return {
      vertice,
      fecha: comoFechaLarga(vertice.fecha),
      izquierda: cajaDeAviso(vertice.x, ANCHO_CAJA, trazado.ancho)
    };
  });

  constructor() {
    // Un <dialog> solo atrapa el foco y responde a Escape si se abre con showModal().
    effect(() => {
      const elemento = this.dialogo()?.nativeElement;
      if (elemento && !elemento.open) {
        elemento.showModal();
      }
    });

    // El viewBox sigue al ancho real para que el texto no se deforme. ResizeObserver no existe
    // en jsdom, así que el valor de partida tiene que servir por sí solo.
    effect(onCleanup => {
      const svg = this.lienzo()?.nativeElement;
      if (!svg || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(([entrada]) => {
        const medido = Math.round(entrada.contentRect.width);
        if (medido > 0) {
          this.ancho.set(medido);
        }
      });
      observador.observe(svg);
      onCleanup(() => observador.disconnect());
    });
  }

  verRango(clave: ClaveRango) {
    this.rango.set(clave);
    // El índice señalado apunta a otra serie en cuanto cambia el periodo.
    this.senalado.set(null);
  }

  /** Traduce la posición del puntero a un día de la serie. */
  senalarEn(evento: PointerEvent) {
    const trazado = this.trazado();
    const svg = this.lienzo()?.nativeElement;
    if (!trazado || !svg) {
      return;
    }
    const caja = svg.getBoundingClientRect();
    if (caja.width === 0) {
      return;
    }
    // El viewBox mide lo mismo que el elemento, pero el navegador puede escalarlo por zoom.
    const x = ((evento.clientX - caja.left) / caja.width) * trazado.ancho;
    this.senalado.set(indiceEnX(trazado.vertices, x));
  }

  soltar() {
    this.senalado.set(null);
  }

  /** Flechas para recorrer los días sin ratón, Escape para soltar. */
  moverConTeclado(evento: KeyboardEvent) {
    const trazado = this.trazado();
    if (!trazado || trazado.vertices.length === 0) {
      return;
    }
    if (evento.key === 'Escape') {
      // Con un día señalado, Escape lo suelta y se queda ahí: si además cerrara la ficha, el
      // usuario perdería el gráfico al intentar quitar el indicador. El segundo Escape ya cierra.
      if (this.senalado() !== null) {
        evento.preventDefault();
        evento.stopPropagation();
        this.soltar();
      }
      return;
    }
    const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
    if (paso === 0) {
      return;
    }
    // Sin esto, las flechas desplazarían la ficha en lugar de mover el punto.
    evento.preventDefault();
    const actual = this.senalado() ?? (paso === 1 ? -1 : trazado.vertices.length);
    const siguiente = Math.min(Math.max(actual + paso, 0), trazado.vertices.length - 1);
    this.senalado.set(siguiente);
  }

  /** Cierra el <dialog>, que a su vez emite (close) y avisa a la vista. */
  pedirCierre() {
    this.dialogo()?.nativeElement.close();
  }

  /**
   * Pulsar el fondo oscuro cierra la ficha. El propio <dialog> es quien recibe el clic cuando
   * se pulsa fuera del contenido, así que basta comparar el objetivo con él.
   */
  cerrarSiEsElFondo(evento: MouseEvent) {
    if (evento.target === this.dialogo()?.nativeElement) {
      this.pedirCierre();
    }
  }

  /** El gráfico es una imagen para un lector de pantalla: los datos van en el texto de abajo. */
  descripcionAccesible(): string {
    const datos = this.resumen();
    if (!datos) {
      return 'Sin datos de precio';
    }
    const aviso = this.aviso();
    if (aviso) {
      return `${aviso.fecha}: ${aviso.vertice.precio.toFixed(3)} euros`;
    }
    const periodo = RANGOS.find(r => r.clave === this.rango())?.etiqueta ?? '';
    return `Evolución del precio en ${periodo.toLowerCase()}: ` +
      `mínimo ${datos.minimo.toFixed(3)} euros, máximo ${datos.maximo.toFixed(3)} euros, ` +
      `actual ${datos.actual.toFixed(3)} euros`;
  }

  enlaceMapa(gasolinera: Gasolinera): string {
    return `https://www.google.es/maps/place/${gasolinera.latitud},${gasolinera.longitud}`;
  }
}
