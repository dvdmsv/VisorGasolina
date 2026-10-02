import {
  ChangeDetectionStrategy,
  Component,
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
  puntosDe,
  recortarA,
  resumirSerie,
  trazar
} from './historico.util';

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
  readonly trazado = computed(() => trazar(this.visibles()));

  constructor() {
    // Un <dialog> solo atrapa el foco y responde a Escape si se abre con showModal().
    effect(() => {
      const elemento = this.dialogo()?.nativeElement;
      if (elemento && !elemento.open) {
        elemento.showModal();
      }
    });
  }

  verRango(clave: ClaveRango) {
    this.rango.set(clave);
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
    const periodo = RANGOS.find(r => r.clave === this.rango())?.etiqueta ?? '';
    return `Evolución del precio en ${periodo.toLowerCase()}: ` +
      `mínimo ${datos.minimo.toFixed(3)} euros, máximo ${datos.maximo.toFixed(3)} euros, ` +
      `actual ${datos.actual.toFixed(3)} euros`;
  }

  enlaceMapa(gasolinera: Gasolinera): string {
    return `https://www.google.es/maps/place/${gasolinera.latitud},${gasolinera.longitud}`;
  }
}
