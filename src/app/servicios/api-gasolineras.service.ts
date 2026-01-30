import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of, tap, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {

  private cacheGasolineras: any = null;

  constructor(private http: HttpClient) { }

  getGasolinera(): Observable<HttpEvent<any>> {
    // Si hay caché, devolvemos un observable que simula una respuesta HTTP finalizada
    // Esto es un truco para no romper la lógica del componente si ya tenemos datos
    if (this.cacheGasolineras) {
      // Devolvemos un objeto que imita un evento de tipo "Response" (4)
      return of({ type: 4, body: this.cacheGasolineras } as any);
    }

    return this.http.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/', {
      reportProgress: true, // ¡Clave! Activa el seguimiento
      observe: 'events'     // ¡Clave! Queremos ver el flujo, no solo el final
    }).pipe(
      // Interceptamos solo el evento final para guardar en caché
      tap((event: any) => {
        if (event.type === 4) { // 4 es HttpEventType.Response
          this.cacheGasolineras = event.body;
        }
      })
    );
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
