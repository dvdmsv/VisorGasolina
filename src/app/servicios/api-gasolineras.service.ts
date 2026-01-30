import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {

  private cacheGasolineras: any = null;

  constructor(private http: HttpClient) { }

  getGasolinera() {
    // 1. Si ya tenemos datos, los devolvemos instantáneamente sin llamar a internet
    if (this.cacheGasolineras) {
      return of(this.cacheGasolineras);
    }

    // 2. Si no, descargamos y guardamos en caché con 'tap'
    return this.http.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/')
      .pipe(
        tap(data => this.cacheGasolineras = data)
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
