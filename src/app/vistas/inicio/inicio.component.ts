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

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService){}

  ngOnInit(){
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = result;
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
        if(gasolinera.Localidad == "VALLADOLID" && !Number.isNaN(parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")))){
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera['Dirección'],
              parseFloat(gasolinera['Precio Gasoleo A'].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", "."))
            )
          );
        }
        this.arrGasolineras.sort((a, b) => a.precio - b.precio);
      }
      //console.log(this.arrGasolineras);
      for (const gasolinera of this.arrGasolineras) {
        this.precioTotal += gasolinera.precio;
      }

      this.precioTotal = this.precioTotal / this.arrGasolineras.length;
      this.precioMedio = parseFloat(this.precioTotal.toFixed(3));
    });
  }
}
