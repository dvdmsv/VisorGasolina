import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, retry, shareReplay, switchMap, tap, throwError, timeout, timer } from 'rxjs';
import { ProvinciaApi, RespuestaEstaciones } from '../clases/respuesta-api';
import { CacheRespuestasService } from './cache-respuestas.service';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const ID_VALIDO = /^\d+$/;

/** Los listados por provincia o municipio son pequeños y pueden esperar poco. */
const TIEMPO_MAXIMO_MS = 20_000;

/**
 * Estaciones de una provincia que sirven un combustible: entre 16 KB y 322 KB. Es lo que
 * necesita la búsqueda por ubicación, frente a los 4,3 MB del listado nacional de ese mismo
 * combustible o los 12,2 MB del listado completo, que ya no se piden.
 */
const urlProvinciaProducto = (idProvincia: string, idProducto: string) =>
  `${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/${idProvincia}/${idProducto}`;

/** En estas respuestas el precio viene en un único campo, no uno por combustible. */
export const CAMPO_PRECIO_PRODUCTO = 'PrecioProducto';

/** El Ministerio actualiza los precios cada media hora; no tiene sentido repetir antes. */
export const VIGENCIA_LISTADO_MS = 30 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheRespuestasService);

  private provincias$: Observable<ProvinciaApi[]> | null = null;

  /**
   * Caché por IDProvincia. getGasolinerasProvincia y getLocalidades consumen el mismo
   * endpoint, así que comparten petición en lugar de pedirlo dos veces.
   */
  private readonly cacheProvincia = new Map<string, Observable<RespuestaEstaciones>>();

  /**
   * Caché por provincia y combustible, en memoria para esta sesión. El disco lo cubre
   * CacheRespuestasService, de modo que volver a entrar tampoco descarga.
   */
  private readonly cacheProvinciaProducto = new Map<string, Observable<RespuestaEstaciones>>();

  // --- Búsqueda por ubicación ---

  /**
   * Estaciones de una provincia que sirven un combustible. El precio llega en el campo
   * único `CAMPO_PRECIO_PRODUCTO`.
   */
  getGasolinerasProvinciaProducto(idProvincia: string, idProducto: string): Observable<RespuestaEstaciones> {
    if (!ID_VALIDO.test(idProvincia) || !ID_VALIDO.test(idProducto)) {
      return throwError(() => new Error('IDProvincia o IDProducto inválido'));
    }

    const clave = `${idProvincia}/${idProducto}`;
    let peticion$ = this.cacheProvinciaProducto.get(clave);

    if (!peticion$) {
      const url = urlProvinciaProducto(idProvincia, idProducto);
      peticion$ = from(this.cache.leer(url, VIGENCIA_LISTADO_MS)).pipe(
        switchMap(guardado => this.desdeCache(url, guardado) ?? this.descargar(url)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.cacheProvinciaProducto.set(clave, peticion$);
    }
    return peticion$;
  }

  /** Indica si los datos de esa provincia y combustible ya están disponibles. */
  provinciaProductoEnCache(idProvincia: string, idProducto: string): boolean {
    return this.cacheProvinciaProducto.has(`${idProvincia}/${idProducto}`);
  }

  /** Indica si hay una copia en disco utilizable, aunque la sesión acabe de empezar. */
  hayProvinciaProductoGuardada(idProvincia: string, idProducto: string): Promise<boolean> {
    return this.cache.estaFresca(urlProvinciaProducto(idProvincia, idProducto), VIGENCIA_LISTADO_MS);
  }

  // --- Listados por zona ---

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

  borrarCache() {
    for (const clave of this.cacheProvinciaProducto.keys()) {
      const [idProvincia, idProducto] = clave.split('/');
      void this.cache.borrar(urlProvinciaProducto(idProvincia, idProducto));
    }
    this.cacheProvinciaProducto.clear();
    this.cacheProvincia.clear();
  }

  /**
   * Se pide como texto, no como JSON, para guardar en disco exactamente lo recibido sin
   * volver a serializarlo.
   */
  private descargar(url: string): Observable<RespuestaEstaciones> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      this.reintentos(),
      tap(texto => void this.cache.guardar(url, texto)),
      map(texto => JSON.parse(texto) as RespuestaEstaciones)
    );
  }

  /**
   * Devuelve la copia guardada, o null si no sirve. Una escritura a medias dejaría un JSON
   * roto que, sin esta comprobación, inutilizaría la búsqueda durante media hora.
   */
  private desdeCache(url: string, contenido: string | null): Observable<RespuestaEstaciones> | null {
    if (contenido === null) {
      return null;
    }

    try {
      const cuerpo = JSON.parse(contenido) as RespuestaEstaciones;
      if (!cuerpo?.ListaEESSPrecio) {
        void this.cache.borrar(url);
        return null;
      }
      return of(cuerpo);
    } catch {
      void this.cache.borrar(url);
      return null;
    }
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
