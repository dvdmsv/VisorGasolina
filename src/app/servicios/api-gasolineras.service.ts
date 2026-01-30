import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap, finalize, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {

  // 1. Datos ya descargados (Caché final)
  private cacheGasolineras: any = null;
  
  // 2. Petición que está ocurriendo AHORA MISMO (Caché temporal)
  private peticionEnCurso: Observable<HttpEvent<any>> | null = null;

  constructor(private http: HttpClient) { }

  getGasolinera(): Observable<HttpEvent<any>> {
    // CASO A: Ya tenemos los datos finales en memoria.
    // Devolvemos un observable falso instantáneo.
    if (this.cacheGasolineras) {
      return of({ type: HttpEventType.Response, body: this.cacheGasolineras } as any);
    }

    // CASO B: Ya hay una descarga ocurriendo (background o botón previo), pero no ha terminado.
    // Devolvemos la MISMA petición que ya está viajando. ¡Aquí está la magia!
    if (this.peticionEnCurso) {
      return this.peticionEnCurso;
    }

    // CASO C: No hay datos ni petición en curso. Iniciamos una nueva.
    // Guardamos el observable en 'this.peticionEnCurso' para reutilizarlo.
    this.peticionEnCurso = this.http.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/', {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      // 'shareReplay(1)' hace que si alguien se suscribe tarde (ej: clic al botón cuando va por el 50%),
      // reciba inmediatamente el último evento emitido y se una a la descarga.
      shareReplay(1),

      // Guardamos en caché cuando termine con éxito
      tap((event: any) => {
        if (event.type === HttpEventType.Response) {
          this.cacheGasolineras = event.body;
        }
      }),

      // Importante: Tanto si acaba bien como si da error, limpiamos la variable de petición
      // para que la próxima vez se pueda intentar de nuevo si falló.
      finalize(() => {
        this.peticionEnCurso = null;
      })
    );

    return this.peticionEnCurso;
  }

  // ... resto de tus métodos (getProvincias, etc) ...
  
  // Opcional: Método para forzar recarga si quisieras un botón de "Actualizar datos"
  borrarCache() {
    this.cacheGasolineras = null;
  }

  getProvincias(){
    return this.http.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Provincias/');
  }

  getGasolinerasLocalidad(IDMunicipio: string){
    return this.http.get(`https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroMunicipio/${IDMunicipio}`);
  }

  getGasolinerasProvincia(IDProvincia: string){
    return this.http.get(`https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${IDProvincia}`);
  }

  //Obtiene todas las estaciones de servicio de la provincia que se ha pasado por parámetros
  //Actualmente solo se utiliza para obtener solo las localidades de la provincia que tienen gasolineras
  getLocalidades(IDProvincia: string){
    return this.http.get(`https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${IDProvincia}`);
  }
}
