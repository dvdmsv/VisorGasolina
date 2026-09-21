import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, retry, shareReplay, throwError, timeout, timer } from 'rxjs';
import { ProvinciaApi, RespuestaEstaciones } from '../clases/respuesta-api';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const ID_VALIDO = /^\d+$/;

/** Los listados por provincia o municipio son pequeños y pueden esperar poco. */
const TIEMPO_MAXIMO_MS = 20_000;
/** El listado nacional ronda los 12 MB: necesita mucho más margen. */
const TIEMPO_MAXIMO_NACIONAL_MS = 120_000;

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {
  private readonly http = inject(HttpClient);

  /** Listado nacional completo. Se comparte entre suscriptores y se conserva en memoria. */
  private listadoNacional$: Observable<HttpEvent<RespuestaEstaciones>> | null = null;

  private provincias$: Observable<ProvinciaApi[]> | null = null;

  /**
   * Caché por IDProvincia. getGasolinerasProvincia y getLocalidades consumen el mismo
   * endpoint, así que comparten petición en lugar de pedirlo dos veces.
   */
  private readonly cacheProvincia = new Map<string, Observable<RespuestaEstaciones>>();

  /**
   * Listado nacional con eventos de progreso, para poder mostrar la barra de descarga.
   * Solo se usa en la búsqueda por ubicación.
   */
  getListadoNacional(): Observable<HttpEvent<RespuestaEstaciones>> {
    if (!this.listadoNacional$) {
      this.listadoNacional$ = this.http.get<RespuestaEstaciones>(`${BASE}/EstacionesTerrestres/`, {
        reportProgress: true,
        observe: 'events'
      }).pipe(
        timeout(TIEMPO_MAXIMO_NACIONAL_MS),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.listadoNacional$;
  }

  /** Indica si el listado nacional ya está en memoria de esta sesión. */
  get listadoNacionalEnCache(): boolean {
    return this.listadoNacional$ !== null;
  }

  borrarCache() {
    this.listadoNacional$ = null;
    this.cacheProvincia.clear();
  }

  getProvincias(): Observable<ProvinciaApi[]> {
    if (!this.provincias$) {
      this.provincias$ = this.http
        .get<ProvinciaApi[]>(`${BASE}/Listados/Provincias/`)
        .pipe(this.reintentos(), shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.provincias$;
  }

  getGasolinerasProvincia(idProvincia: string): Observable<RespuestaEstaciones> {
    if (!ID_VALIDO.test(idProvincia)) {
      return throwError(() => new Error('IDProvincia inválido'));
    }

    let peticion$ = this.cacheProvincia.get(idProvincia);
    if (!peticion$) {
      peticion$ = this.http
        .get<RespuestaEstaciones>(`${BASE}/EstacionesTerrestres/FiltroProvincia/${idProvincia}`)
        .pipe(this.reintentos(), shareReplay({ bufferSize: 1, refCount: false }));
      this.cacheProvincia.set(idProvincia, peticion$);
    }
    return peticion$;
  }

  /** Reutiliza exactamente la misma petición y caché que getGasolinerasProvincia. */
  getLocalidades(idProvincia: string): Observable<RespuestaEstaciones> {
    return this.getGasolinerasProvincia(idProvincia);
  }

  getGasolinerasLocalidad(idMunicipio: string): Observable<RespuestaEstaciones> {
    if (!ID_VALIDO.test(idMunicipio)) {
      return throwError(() => new Error('IDMunicipio inválido'));
    }
    return this.http
      .get<RespuestaEstaciones>(`${BASE}/EstacionesTerrestres/FiltroMunicipio/${idMunicipio}`)
      .pipe(this.reintentos());
  }

  /** La sede electrónica falla de forma intermitente; dos reintentos espaciados bastan. */
  private reintentos<T>() {
    return (fuente$: Observable<T>) =>
      fuente$.pipe(
        timeout(TIEMPO_MAXIMO_MS),
        retry({ count: 2, delay: (_, intento) => timer(500 * 2 ** intento) })
      );
  }
}
