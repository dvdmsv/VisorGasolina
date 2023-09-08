import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiGasolinerasService {

  constructor(private http: HttpClient) { }

  getGasolinera(){
    return this.http.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/');
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
