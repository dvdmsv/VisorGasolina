import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { ApiGasolinerasService } from 'src/app/servicios/api-gasolineras.service';
import { CookieService } from 'ngx-cookie-service'
import { Provincia } from 'src/app/clases/provincia';
import { Localidad } from 'src/app/clases/localidad';

@Component({
  selector: 'app-gasolina',
  templateUrl: './gasolina.component.html',
  styleUrls: ['./gasolina.component.css']
})

export class GasolinaComponent {
  //Array temporal con los datos devueltos por el servicio
  arrGasolinerasTemp: any = [];
  //Array de objetos Gasolinera
  arrGasolineras: Gasolinera[] = [];

  //Precio total y precio medio
  precioTotal: number = 0;
  precioMedio: number = 0;

  //Flag que controla si los datos se han cargado 
  datosCargados: boolean = true;

  //Columnas de la tabla
  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  //Variable que contiene la fecha obtenida por el servicio
  fechaActualizacion: String = "";

  //Variable que contiene el nombre de la localidad/provincia
  nombreLocalidad: String = "";

  //Array temporal de datos devueltos por el servicio
  arrProvinciasTemp: any = [];
  //Array de objetos Provincia
  arrProvincias: Provincia[] = [];

  //Array temporal de datos devueltos por el servicio
  arrLocalidadesTemp: any = [];
  //Array de objetos Localidad
  arrLocalidades: Localidad[] = [];
  //Array con las localidades sin repetir
  arrLocalidadesUnicas: Localidad[] = [];

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService, private cookie: CookieService){}

  ngOnInit(){
    this.getProvincias();
    this.getGasolinerasLocalidad(this.getCookie("IDMunicipio"));
    this.nombreLocalidad = this.getCookie("Localidad");
  }

  //Funcion que obtiene las provincias
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
    this.getGasolinerasProvincia(provincia.IDProvincia);
    this.apiGasolina.getLocalidades(provincia.IDProvincia).subscribe(result=> {
      this.arrLocalidadesTemp = [];
      this.arrLocalidadesTemp = result;
      this.arrLocalidades = [];

      for (const localidad of this.arrLocalidadesTemp.ListaEESSPrecio) {
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
      
      this.arrLocalidadesUnicas = this.arrLocalidades.filter((localidad, index, self) =>
      self.findIndex((l) => l.IDMunicipio === localidad.IDMunicipio) === index);
    });
  }

  getGasolinerasProvincia(IDPovincia: string){
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;

    this.apiGasolina.getGasolinerasProvincia(IDPovincia).subscribe(result=>{
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras =  []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if( gasolinera.IDProvincia == IDPovincia && !Number.isNaN(parseFloat(gasolinera['Precio Gasolina 95 E5'].replace(",", ".")))){
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera['Precio Gasolina 95 E5'].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", "."))
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
        this.datosCargados = true; //Flag que controla que se carguen los datos
        this.setCookie('Localidad', gasolinera.Localidad);
        this.nombreLocalidad = gasolinera.Provincia;
      }

      //Se recorre el array de gasolineras obteniendo el precio total de las gasolineras
      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }
      
      //Se obtiene el precio medio de las gasolineras
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
    })
  }
  getGasolinerasLocalidad(IDMunicipio: string){
    this.precioMedio = 0;
    this.precioTotal = 0;
    this.datosCargados = false;

    this.apiGasolina.getGasolinerasLocalidad(IDMunicipio).subscribe(result=>{
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras =  []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if( gasolinera.IDMunicipio == IDMunicipio && !Number.isNaN(parseFloat(gasolinera['Precio Gasolina 95 E5'].replace(",", ".")))){
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera['Precio Gasolina 95 E5'].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", "."))
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
        this.datosCargados = true; //Flag que controla que se carguen los datos
        this.setCookie('Localidad', gasolinera.Localidad);
        this.nombreLocalidad = gasolinera.Localidad;
      }

      //Se recorre el array de gasolineras obteniendo el precio total de las gasolineras
      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }
      
      //Se obtiene el precio medio de las gasolineras
      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));

      this.setCookie('IDMunicipio',IDMunicipio);
      
    })
  }

  setCookie(nombreCookie: string, datosCookie: string){
    this.cookie.set(nombreCookie, datosCookie, 30);
  }

  getCookie(nombreCookie: string): string{
    return this.cookie.get(nombreCookie);
  }
}
