import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, retry, shareReplay, switchMap, tap, throwError, timeout, timer } from 'rxjs';
import { ProvinciaApi, RespuestaEstaciones } from '../clases/respuesta-api';
import { CacheRespuestasService } from './cache-respuestas.service';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const ID_VALIDO = /^\d+$/;

/** Los listados por provincia o municipio son pequeños y pueden esperar poco. */
const TIEMPO_MAXIMO_MS = 20_000;
/** El listado nacional ronda los 12 MB: necesita mucho más margen. */
const TIEMPO_MAXIMO_NACIONAL_MS = 120_000;

/**
 * Listado nacional de un solo combustible. El de todos los combustibles son 12,2 MB; el de
 * uno, 4,3 MB con exactamente las mismas estaciones que lo sirven, que es lo único que
 * necesita la búsqueda por ubicación.
 */
const urlListadoNacional = (idProducto: string) =>
  `${BASE}/EstacionesTerrestres/FiltroProducto/${idProducto}`;

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

  /** Listado nacional por combustible. Se comparte entre suscriptores y queda en memoria. */
  private readonly listadoNacional$ = new Map<string, Observable<HttpEvent<RespuestaEstaciones>>>();

  private provincias$: Observable<ProvinciaApi[]> | null = null;

  /** Combustibles cuyo listado ya está disponible, no solo pedido. */
  private readonly listadosListos = new Set<string>();

  /**
   * Caché por IDProvincia. getGasolinerasProvincia y getLocalidades consumen el mismo
   * endpoint, así que comparten petición en lugar de pedirlo dos veces.
   */
  private readonly cacheProvincia = new Map<string, Observable<RespuestaEstaciones>>();

  /**
   * Listado nacional con eventos de progreso, para poder mostrar la barra de descarga.
   * Solo se usa en la búsqueda por ubicación.
   *
   * Antes de pedir nada mira la copia en disco: si es de hace menos de media hora, la
   * respuesta es inmediata y no hay descarga.
   */
  getListadoNacional(idProducto: string): Observable<HttpEvent<RespuestaEstaciones>> {
    const url = urlListadoNacional(idProducto);
    let peticion$ = this.listadoNacional$.get(idProducto);

    if (!peticion$) {
      peticion$ = from(this.cache.leer(url, VIGENCIA_LISTADO_MS)).pipe(
        switchMap(guardado =>
          this.desdeCache(url, idProducto, guardado) ?? this.descargarListadoNacional(url, idProducto)
        ),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.listadoNacional$.set(idProducto, peticion$);
    }
    return peticion$;
  }

  /** Indica si hay una descarga en marcha o ya terminada en esta sesión. */
  listadoNacionalPedido(idProducto: string): boolean {
    return this.listadoNacional$.has(idProducto);
  }

  /**
   * Indica si el listado ya se puede usar. Se distingue de `listadoNacionalPedido` para
   * que la vista enseñe la barra de progreso cuando la precarga aún va por la mitad.
   */
  listadoNacionalListo(idProducto: string): boolean {
    return this.listadosListos.has(idProducto);
  }

  /** Indica si hay una copia utilizable en disco, aunque la sesión acabe de empezar. */
  hayListadoNacionalGuardado(idProducto: string): Promise<boolean> {
    return this.cache.estaFresca(urlListadoNacional(idProducto), VIGENCIA_LISTADO_MS);
  }

  borrarCache() {
    for (const idProducto of this.listadoNacional$.keys()) {
      void this.cache.borrar(urlListadoNacional(idProducto));
    }
    this.listadoNacional$.clear();
    this.listadosListos.clear();
    this.cacheProvincia.clear();
  }

  /**
   * Se pide como texto, no como JSON: así el mismo contenido sirve para guardarlo en
   * disco y para analizarlo, sin volver a serializar 12 MB.
   */
  private descargarListadoNacional(url: string, idProducto: string): Observable<HttpEvent<RespuestaEstaciones>> {
    return this.http.get(url, {
      responseType: 'text',
      reportProgress: true,
      observe: 'events'
    }).pipe(
      timeout(TIEMPO_MAXIMO_NACIONAL_MS),
      tap(evento => {
        if (evento.type === HttpEventType.Response && evento.body) {
          this.listadosListos.add(idProducto);
          void this.cache.guardar(url, evento.body);
        }
      }),
      map(evento =>
        evento.type === HttpEventType.Response
          ? evento.clone({ body: JSON.parse(evento.body ?? 'null') as RespuestaEstaciones })
          : (evento as HttpEvent<RespuestaEstaciones>)
      )
    );
  }

  /**
   * Devuelve la copia guardada, o null si no sirve. Una escritura a medias dejaría un
   * JSON roto que, sin esta comprobación, inutilizaría la búsqueda durante media hora.
   */
  private desdeCache(
    url: string,
    idProducto: string,
    contenido: string | null
  ): Observable<HttpEvent<RespuestaEstaciones>> | null {
    if (contenido === null) {
      return null;
    }

    let cuerpo: RespuestaEstaciones;
    try {
      cuerpo = JSON.parse(contenido) as RespuestaEstaciones;
    } catch {
      void this.cache.borrar(url);
      return null;
    }

    if (!cuerpo?.ListaEESSPrecio) {
      void this.cache.borrar(url);
      return null;
    }

    this.listadosListos.add(idProducto);
    return of(new HttpResponse<RespuestaEstaciones>({ body: cuerpo, status: 200, url }));
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
