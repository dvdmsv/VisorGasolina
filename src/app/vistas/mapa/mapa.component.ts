import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Map, marker, tileLayer, MarkerClusterGroup } from 'leaflet';
import { CookieService } from 'ngx-cookie-service';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { ApiGasolinerasService } from 'src/app/servicios/api-gasolineras.service';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent {
  arrGasolinerasTemp: any = [];
  arrGasolineras: Gasolinera[] = [];

  constructor(private http: HttpClient, private apiGasolina: ApiGasolinerasService, private cookie: CookieService) {
  }

  ngAfterViewInit() {
    this.apiGasolina.getGasolinera().subscribe(result => {
      this.arrGasolinerasTemp = [];
      this.arrGasolinerasTemp = result; //Se guardan los datos en un array temporal
      this.arrGasolineras = []; //Se vacía el array de gasolineras ppara tenerlo limpio

      //Se recorre el array de gasolinerasTemp introduciendo un objeto gasolinera en el array de gasolineras
      for (const gasolinera of this.arrGasolinerasTemp.ListaEESSPrecio) {
          this.arrGasolineras.push(
            new Gasolinera(
              gasolinera['Rótulo'],
              gasolinera.Localidad,
              gasolinera.Provincia,
              gasolinera['Dirección'],
              parseFloat(gasolinera[this.cookie.get("gasolina")].replace(",", ".")),
              parseFloat(gasolinera.Latitud.replace(",", ".")),
              parseFloat(gasolinera["Longitud (WGS84)"].replace(",", ".")),
              this.cookie.get("gasolina"),
              false
            )
          );
        this.arrGasolineras.sort((a, b) => a.precio - b.precio); //Se ordenan los datos por precio de menos a mayor
      }
      const map = new Map('map').setView([40.4139, -3.7031], 6);
      tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 150,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      

      for (const gasolinera of this.arrGasolineras) {
        //marker([gasolinera.latitud, gasolinera.longitud]).addTo(map).bindPopup(gasolinera.rotulo);
      }
      
    })
  }
}
