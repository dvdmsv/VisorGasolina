import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap, finalize, shareReplay, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {

  // Caché del listado completo nacional (para búsqueda por GPS)
  private cacheGasolineras: any = null;
  private peticionEnCurso: Observable<HttpEvent<any>> | null = null;

  // Caché de provincias (dato estático, nunca cambia en sesión)
  private provincias$: Observable<any> | null = null;

  // Caché por IDProvincia: evita duplicar la misma petición cuando
  // getGasolinerasProvincia y getLocalidades se llaman simultáneamente
  private cacheProvincia = new Map<string, Observable<any>>();

  private readonly ID_REGEX = /^\d+$/;

  constructor(private http: HttpClient) { }

  getGasolinera(): Observable<HttpEvent<any>> {
    if (this.cacheGasolineras) {
      return of({ type: HttpEventType.Response, body: this.cacheGasolineras } as any);
    }

    if (this.peticionEnCurso) {
      return this.peticionEnCurso;
    }

    this.peticionEnCurso = this.http.get(
      'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/',
      { reportProgress: true, observe: 'events' }
    ).pipe(
      shareReplay(1),
      tap((event: any) => {
        if (event.type === HttpEventType.Response) {
          this.cacheGasolineras = event.body;
        }
      }),
      finalize(() => { this.peticionEnCurso = null; })
    );

    return this.peticionEnCurso;
  }

  borrarCache() {
    this.cacheGasolineras = null;
  }

  getProvincias(): Observable<any> {
    if (!this.provincias$) {
      this.provincias$ = this.http.get(
        'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Provincias/'
      ).pipe(shareReplay(1));
    }
    return this.provincias$;
  }

  getGasolinerasLocalidad(IDMunicipio: string): Observable<any> {
    if (!this.ID_REGEX.test(IDMunicipio)) {
      return throwError(() => new Error('IDMunicipio inválido'));
    }
    return this.http.get(
      `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroMunicipio/${IDMunicipio}`
    );
  }

  // Devuelve los datos de la provincia con shareReplay(1) por IDProvincia,
  // de forma que getGasolinerasProvincia y getLocalidades comparten la misma petición HTTP.
  getGasolinerasProvincia(IDProvincia: string): Observable<any> {
    if (!this.ID_REGEX.test(IDProvincia)) {
      return throwError(() => new Error('IDProvincia inválido'));
    }
    if (!this.cacheProvincia.has(IDProvincia)) {
      const obs$ = this.http.get(
        `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${IDProvincia}`
      ).pipe(shareReplay(1));
      this.cacheProvincia.set(IDProvincia, obs$);
    }
    return this.cacheProvincia.get(IDProvincia)!;
  }

  // Reutiliza exactamente el mismo endpoint y la misma caché que getGasolinerasProvincia
  getLocalidades(IDProvincia: string): Observable<any> {
    return this.getGasolinerasProvincia(IDProvincia);
  }
}
