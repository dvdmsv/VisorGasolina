import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { ApiGasolinerasService } from 'src/app/servicios/api-gasolineras.service';

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

  datosCargados: boolean = false;

  columnasGasolinera: string[] = ['gasolinera', 'direccion', 'precio'];

  fechaActualizacion: String = "";

  arrLocalidadesTemp: String[] = [];
  arrLocalidades: String[] = [];

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService){}

  ngOnInit(){

    //Obtención de las gasolineras a partir del servicio
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras =  []; //Se vacía el array de gasolineras ppara tenerlo limpio
      this.fechaActualizacion = this.arrGasolinerasTemp.Fecha; //Se obtiene la fecha de la api
      //console.log(this.arrGasolinerasTemp);

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if( gasolinera.Provincia == "VALLADOLID" && !Number.isNaN(parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")))){
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

      //Se recorre el array de gasolineras obteniendo la localidad y guardandola en el array temporal de localidades
      for (const gasolinera of this.arrGasolineras) {
        this.arrLocalidadesTemp.push(gasolinera.localidad);
      }

      //Se recorre el array temporal de localidades filtrando los datos duplicados e introduciendolos en un array definitivo
      for (const localidad of this.arrLocalidadesTemp) {
        if(!this.arrLocalidades.includes(localidad)){
          this.arrLocalidades.push(localidad);
        }
      }
    });
  }

  buscar(localidad: String){
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
      
    });
  }
}
