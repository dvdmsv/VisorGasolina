import { HttpEventType } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { PrecioPipe } from '../../compartido/precio.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Gasolinera } from '../../clases/gasolinera';
import { Localidad } from '../../clases/localidad';
import { Provincia } from '../../clases/provincia';
import { COMBUSTIBLES, campoCombustibleValido, etiquetaCombustible } from '../../clases/combustibles';
import { comoNombrePropio, mapearGasolineras, mapearLocalidades, mapearProvincias, precioMedio } from '../../clases/mapeo';
import { paraBuscar } from '../../clases/texto';
import { ApiGasolinerasService } from '../../servicios/api-gasolineras.service';
import { AlertasService } from '../../servicios/alertas.service';
import { FavoritosService } from '../../servicios/favoritos.service';
import { PreferenciasService } from '../../servicios/preferencias.service';
import { UbicacionService } from '../../servicios/ubicacion.service';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { SelectBuscableComponent } from '../../compartido/select-buscable/select-buscable.component';

/** Estado de la vista de resultados. */
type EstadoCarga = 'inicial' | 'cargando' | 'listo' | 'error';

/** Radio de búsqueda para la opción «cerca de mí». */
const RADIO_KM = 20;
/** Preselección por caja delimitadora antes de calcular distancias sobre 12 MB de datos. */
const MARGEN_GRADOS = 0.25;
const MAXIMO_RESULTADOS_GPS = 50;

@Component({
  selector: 'app-selector-tabla',
  templateUrl: './selector-tabla.component.html',
  styleUrl: './selector-tabla.component.scss',
  imports: [IconoComponent, FormsModule, SelectBuscableComponent, PrecioPipe, DecimalPipe],
  providers: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectorTablaComponent implements OnInit {
  private readonly api = inject(ApiGasolinerasService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly favoritos = inject(FavoritosService);
  private readonly ubicacion = inject(UbicacionService);
  private readonly alertas = inject(AlertasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ruta = inject(ActivatedRoute);

  // --- Datos de los selectores ---
  readonly provincias = signal<Provincia[]>([]);
  readonly localidades = signal<Localidad[]>([]);

  readonly nombreProvincia = (provincia: Provincia) => provincia.Provincia;
  readonly nombreLocalidadOpcion = (localidad: Localidad) => localidad.Localidad;

  // --- Resultados ---
  private readonly resultados = signal<Gasolinera[]>([]);
  readonly estado = signal<EstadoCarga>('inicial');
  readonly busquedaPorUbicacion = signal(false);
  readonly fechaActualizacion = signal('');
  readonly nombreLocalidad = signal('');

  // --- Filtro, paginación y calculadora ---
  readonly filtroNombre = signal('');
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(10);
  readonly modoCalculadora = signal(false);
  readonly consumo = signal(6.5);
  readonly litros = signal(40);

  // --- Descarga del listado nacional ---
  readonly mostrandoBarra = signal(false);
  readonly progresoCarga = signal(0);


  /** Segmento de la URL: las cuatro rutas de combustible comparten componente. */
  private readonly segmentoRuta = toSignal(
    this.ruta.url.pipe(map(segmentos => segmentos[0]?.path ?? '')),
    { initialValue: '' }
  );

  readonly radioKm = RADIO_KM;
  readonly combustible = this.preferencias.combustible;
  readonly etiquetaGasolina = computed(() => etiquetaCombustible(this.combustible()));

  readonly precioMedio = computed(() => precioMedio(this.resultados()));

  /** La API devuelve «21/09/2026 10:16:17»; en pantalla basta la hora. */
  readonly horaActualizacion = computed(() => {
    const partes = this.fechaActualizacion().split(' ');
    const hora = partes.length > 1 ? partes[1] : '';
    return hora.split(':').slice(0, 2).join(':');
  });

  /** Resultados tras el filtro por nombre y, si procede, el cálculo de coste del trayecto. */
  readonly gasolineras = computed(() => {
    const busqueda = paraBuscar(this.filtroNombre().trim());
    const filtradas = busqueda === ''
      ? this.resultados()
      : this.resultados().filter(g => paraBuscar(g.rotulo).includes(busqueda));

    if (!this.modoCalculadora()) {
      return filtradas;
    }
    return this.ubicacion.calcularCostes(filtradas, {
      consumo: this.consumo(),
      litros: this.litros()
    });
  });

  /** Total sin filtrar, para poder decir «12 de 41» y que la media cuadre. */
  readonly totalSinFiltro = computed(() => this.resultados().length);
  readonly hayFiltro = computed(() => this.filtroNombre().trim() !== '');

  /**
   * Recuento en una sola cadena. En la plantilla, los saltos de línea de un bloque @if
   * se convertían en un espacio antes de la coma siguiente.
   */
  readonly resumenRecuento = computed(() => {
    const total = this.totalSinFiltro();
    const palabra = total === 1 ? 'estación' : 'estaciones';

    if (this.hayFiltro()) {
      return `${this.gasolineras().length} de ${total} ${palabra}`;
    }
    if (this.busquedaPorUbicacion()) {
      return `${total} ${palabra} a menos de ${RADIO_KM} km`;
    }
    return `${total} ${palabra}`;
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.gasolineras().length / this.tamanoPagina()))
  );

  readonly gasolinerasPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamanoPagina();
    return this.gasolineras().slice(inicio, inicio + this.tamanoPagina());
  });

  readonly paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const desde = Math.max(1, Math.min(actual - 2, total - 4));
    const hasta = Math.min(total, desde + 4);
    return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  });

  constructor() {
    // Cualquier cambio de filtro o de tamaño de página devuelve al principio del listado.
    effect(() => {
      this.filtroNombre();
      this.tamanoPagina();
      this.pagina.set(1);
    });

    // La URL manda sobre la preferencia guardada: así un enlace a /gasolina95 muestra
    // gasolina 95 aunque la última visita fuese de diésel. Angular reutiliza el componente
    // al navegar entre combustibles, de modo que la recarga se dispara aquí.
    effect(() => {
      const ruta = this.segmentoRuta();

      // Solo la ruta debe disparar esto. Sin untracked, la lectura de la última posición
      // dentro de repetirUltimaConsulta suscribiría el efecto a un signal que la propia
      // búsqueda reescribe, y se repetiría sin fin.
      untracked(() => {
        const combustible = COMBUSTIBLES.find(c => c.ruta === ruta);
        if (!combustible) {
          return;
        }
        this.preferencias.set('gasolina', combustible.campoApi);
        this.preferencias.set('toolbar', combustible.ruta);
        this.repetirUltimaConsulta();
      });
    });
  }

  ngOnInit() {
    this.cargarProvincias();
    this.nombreLocalidad.set(this.preferencias.get('Localidad'));

    const idProvincia = this.preferencias.get('IDProvincia');
    if (idProvincia !== '') {
      this.cargarLocalidades(idProvincia);
    }
  }

  /** Vuelve a pedir los datos de la última zona consultada con el combustible activo. */
  private repetirUltimaConsulta() {
    // Si la última búsqueda fue por ubicación, se rehace con ella: cambiar de
    // combustible no debe costar volver a buscar dónde estás.
    const posicion = this.ubicacion.ultimaPosicion();
    if (posicion !== null) {
      this.buscarCercanas(posicion.latitud, posicion.longitud);
      return;
    }

    const idMunicipio = this.preferencias.get('IDMunicipio');
    const idProvincia = this.preferencias.get('IDProvincia');

    if (idMunicipio !== '') {
      this.getGasolinerasLocalidad(idMunicipio);
    } else if (idProvincia !== '') {
      this.getGasolinerasProvincia(idProvincia);
    }
  }

  // --- Carga de datos ---

  private cargarProvincias() {
    this.api.getProvincias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: provincias => this.provincias.set(mapearProvincias(provincias)),
        error: error => this.avisarDeFallo(error)
      });
  }

  seleccionarProvincia(provincia: Provincia) {
    this.preferencias.set('IDMunicipio', '');
    this.preferencias.set('IDProvincia', provincia.IDProvincia);
    this.localidades.set([]);
    this.getGasolinerasProvincia(provincia.IDProvincia);
    this.cargarLocalidades(provincia.IDProvincia);
  }

  private cargarLocalidades(idProvincia: string) {
    this.api.getLocalidades(idProvincia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => this.localidades.set(mapearLocalidades(respuesta)),
        error: error => this.avisarDeFallo(error)
      });
  }

  getGasolinerasProvincia(idProvincia: string) {
    this.prepararCarga();
    const campo = campoCombustibleValido(this.preferencias.get('gasolina'));

    this.api.getGasolinerasProvincia(idProvincia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          const gasolineras = mapearGasolineras(
            respuesta.ListaEESSPrecio,
            campo,
            estacion => estacion.IDProvincia === idProvincia
          );
          this.publicarResultados(gasolineras, respuesta.Fecha, gasolineras[0]?.provincia ?? '');
        },
        error: error => this.avisarDeFallo(error)
      });
  }

  /**
   * El nombre lo pone la localidad elegida, no la primera gasolinera: la API escribe
   * «Ágreda» en el municipio pero «AGREDA» en la estación, y quedarían desacompasados.
   */
  seleccionarLocalidad(localidad: Localidad) {
    this.getGasolinerasLocalidad(localidad.IDMunicipio, localidad.Localidad);
  }

  getGasolinerasLocalidad(idMunicipio: string, nombre?: string) {
    this.prepararCarga();
    const campo = campoCombustibleValido(this.preferencias.get('gasolina'));

    this.api.getGasolinerasLocalidad(idMunicipio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          const gasolineras = mapearGasolineras(
            respuesta.ListaEESSPrecio,
            campo,
            estacion => estacion.IDMunicipio === idMunicipio
          );
          this.preferencias.set('IDMunicipio', idMunicipio);
          this.publicarResultados(gasolineras, respuesta.Fecha, nombre ?? gasolineras[0]?.localidad ?? '');
        },
        error: error => this.avisarDeFallo(error)
      });
  }

  private prepararCarga() {
    this.estado.set('cargando');
    this.busquedaPorUbicacion.set(false);
    this.ubicacion.olvidarPosicion();
  }

  private publicarResultados(gasolineras: Gasolinera[], fecha: string, nombre: string) {
    nombre = comoNombrePropio(nombre);
    this.resultados.set([...gasolineras].sort((a, b) => a.precio - b.precio));
    this.fechaActualizacion.set(fecha);
    this.nombreLocalidad.set(nombre);
    this.preferencias.set('Localidad', nombre);
    this.pagina.set(1);
    this.estado.set('listo');
  }

  private avisarDeFallo(error: unknown) {
    console.error('Error consultando la API del Ministerio', error);
    this.resultados.set([]);
    // Estado propio: decir «no hay gasolineras con estos filtros» cuando la API ha
    // fallado confunde, porque el problema no está en lo que pidió el usuario.
    this.estado.set('error');
    this.alertas.error(
      'No se pudieron cargar los precios',
      'La API del Ministerio no ha respondido. Inténtalo de nuevo en unos minutos.'
    );
  }

  /** Reintenta la última consulta tras un fallo. */
  reintentar() {
    this.repetirUltimaConsulta();
  }

  // --- Búsqueda por ubicación ---

  async obtenerUbicacion() {
    try {
      const posicion = await this.ubicacion.obtenerPosicion();
      this.buscarCercanas(posicion.coords.latitude, posicion.coords.longitude);
    } catch (error) {
      // No se toca el estado: si ya había resultados en pantalla, siguen siendo válidos.
      this.alertas.aviso(
        'No pudimos localizarte',
        `${this.ubicacion.mensajeDeError(error)} Revisa los permisos de tu navegador.`
      );
    }
  }

  private buscarCercanas(latitud: number, longitud: number) {
    this.ubicacion.recordarPosicion(latitud, longitud);
    this.estado.set('cargando');
    this.busquedaPorUbicacion.set(true);
    // Con el listado ya descargado no hay nada que esperar: la barra solo parpadearía.
    this.mostrandoBarra.set(!this.api.listadoNacionalEnCache);
    this.progresoCarga.set(0);

    const campo = campoCombustibleValido(this.preferencias.get('gasolina'));

    this.api.getListadoNacional()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: evento => {
          if (evento.type === HttpEventType.DownloadProgress) {
            this.progresoCarga.set(evento.total ? Math.round((100 * evento.loaded) / evento.total) : 0);
            return;
          }
          if (evento.type !== HttpEventType.Response || !evento.body) {
            return;
          }

          this.mostrandoBarra.set(false);

          // Se descarta primero por caja delimitadora: calcular la distancia real de las
          // ~12.000 estaciones del listado nacional sería mucho más costoso.
          const cercanas = mapearGasolineras(
            evento.body.ListaEESSPrecio,
            campo,
            estacion => {
              const lat = parseFloat(estacion.Latitud.replace(',', '.'));
              const lon = parseFloat(estacion['Longitud (WGS84)'].replace(',', '.'));
              return Math.abs(lat - latitud) <= MARGEN_GRADOS && Math.abs(lon - longitud) <= MARGEN_GRADOS;
            }
          )
            .map(gasolinera => ({
              ...gasolinera,
              distancia: parseFloat(
                this.ubicacion.calcularDistancia(latitud, longitud, gasolinera.latitud, gasolinera.longitud).toFixed(2)
              )
            }))
            .filter(gasolinera => (gasolinera.distancia ?? Infinity) < RADIO_KM)
            .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))
            .slice(0, MAXIMO_RESULTADOS_GPS);

          this.resultados.set(cercanas);
          this.fechaActualizacion.set(evento.body.Fecha);
          this.nombreLocalidad.set('Cerca de ti');
          this.filtroNombre.set('');
          this.pagina.set(1);
          this.estado.set('listo');
          this.desplazarArriba();
        },
        error: error => {
          console.error('Error descargando el listado nacional', error);
          this.mostrandoBarra.set(false);
          this.estado.set('listo');
          this.resultados.set([]);
          this.alertas.error('Error de conexión', 'No se pudieron descargar los datos del Ministerio.');
        }
      });
  }

  // --- Interacción ---

  /** La estrella refleja si la gasolinera ya está guardada. */
  esFavorita(gasolinera: Gasolinera): boolean {
    const guardadas = this.favoritos.favoritos();
    return guardadas.some(g => g.latitud === gasolinera.latitud && g.longitud === gasolinera.longitud);
  }

  guardar(gasolinera: Gasolinera) {
    if (this.esFavorita(gasolinera)) {
      this.favoritos.deleteFavoritos(gasolinera);
      this.alertas.info(`${gasolinera.rotulo} quitada de favoritos`);
      return;
    }
    this.favoritos.setFavoritos(gasolinera);
    this.alertas.exito(`${gasolinera.rotulo} guardada en favoritos`);
  }

  irAPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.desplazarArriba();
  }

  vaciarFiltroNombre() {
    this.filtroNombre.set('');
  }

  enlaceMapa(gasolinera: Gasolinera): string {
    return `https://www.google.es/maps/place/${gasolinera.latitud},${gasolinera.longitud}`;
  }

  private desplazarArriba() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
