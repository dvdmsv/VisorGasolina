import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { ApiGasolinerasService } from 'src/app/servicios/api-gasolineras.service';
import { CookieService } from 'ngx-cookie-service'
import { Provincia } from 'src/app/clases/provincia';
import { Localidad } from 'src/app/clases/localidad';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {
  arrGasolinerasTemp: any = [];
  arrGasolineras: Gasolinera[] = [];

  precioTotal: number = 0;
  precioMedio: number = 0;

  datosCargados: boolean = true;

  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  fechaActualizacion: String = "";

  nombreLocalidad: String = "";

  // arrProvinciasTemp: String[] = [];
  // arrProvincias: String[] = [];

  arrProvinciasTemp: any = [];
  arrProvincias: Provincia[] = [];

  // arrLocalidadesTemp: String[] = [];
  // arrLocalidades: String[] = [];

  arrLocalidadesTemp: any = [];
  arrLocalidades: Localidad[] = [];

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService, private cookie: CookieService){}

  ngOnInit(){
    this.getProvincias();
    this.getGasolineras(this.getCookie());
    this.nombreLocalidad = this.getCookie();
  }

  getProvincias_2(){
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = result;
      this.arrProvinciasTemp =  [];

      //Se recorre el array de gasolinerasTemp 
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if(!Number.isNaN(parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")))){
          this.arrProvinciasTemp.push(gasolinera.Provincia);
          this.arrLocalidadesTemp.push(gasolinera.Localidad);
        }
      }

      for (const provincia of this.arrProvinciasTemp) {
        if(!this.arrProvincias.includes(provincia)){
          this.arrProvincias.push(provincia);
        }
      }
    });
  }

  getProvincias(){
    this.apiGasolina.getProvincias().subscribe(result => {
      this.arrProvinciasTemp = [];
      this.arrProvinciasTemp = result;
      this.arrProvincias = [];
      for(const provincia of this.arrProvinciasTemp){
        this.arrProvincias.push(
          new Provincia(
            provincia.CCAA,
            provincia.IDCCAA,
            provincia.IDPovincia,
            provincia.Provincia
          )
        );
      }
    });
  }

  getLocalidades(provincia: Provincia){
    this.apiGasolina.getLocalidades(provincia.IDProvincia).subscribe(result =>{
      this.arrLocalidadesTemp = [];
      this.arrLocalidadesTemp = result;
      this.arrLocalidades = [];

      for (const localidad of this.arrLocalidadesTemp) {
        this.arrLocalidades.push(
          new Localidad(
            localidad.CCAA,
            localidad.IDCCAA,
            localidad.IDMunicipio,
            localidad.IDPovincia,
            localidad.Municipio,
            localidad.Provincia
          )
        );
      }

    });
  }

  //Funcion que obtiene las localidades en según la provincia pasada por parámetro
  getLocalidades_2(provincia: string){
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result;
      this.arrLocalidadesTemp = []; 
      this.arrLocalidades = []; 

      //Se recorre el array de gasolinerasTemp 
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if(gasolinera.Provincia == provincia && !Number.isNaN(parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")))){
          this.arrLocalidadesTemp.push(gasolinera.Localidad);
        }
      }

      for (const localidad of this.arrLocalidadesTemp) {
        if(!this.arrLocalidades.includes(localidad)){
          this.arrLocalidades.push(localidad);
        }
      }
    });
  }

  getGasolineras(localidad: string){
    //Se inicializan los precios a 0 para no interferir con operaciones anteriores
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;

    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras =  []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if( gasolinera.Localidad == localidad && !Number.isNaN(parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")))){
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", "."))
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
        this.datosCargados = true; //Flag que controla que se carguen los datos
      }

      //Se recorre el array de gasolineras obteniendo el precio total de las gasolineras
      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }
      
      //Se obtiene el precio medio de las gasolineras
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
      
      this.setCookie(localidad);
    });
  }

  setCookie(localidad: string){
    this.cookie.set("localidad", localidad, 30);
  }

  getCookie(): string{
    return this.cookie.get("localidad");
  }
}
