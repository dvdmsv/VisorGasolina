import { Injectable } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  gasolineras: Gasolinera[] = [];

  constructor(private cookie: CookieService) { }

  setFavoritos(gasolinera: Gasolinera){
    if(!this.comprobarExiste(gasolinera)){
      this.gasolineras.push(gasolinera);
      localStorage.setItem("favoritos", JSON.stringify(this.gasolineras));
    }
  }

  deleteFavoritos(gasolinera: Gasolinera){
    this.gasolineras = this.gasolineras.filter(g =>
      !(g.latitud === gasolinera.latitud && g.longitud === gasolinera.longitud && g.rotulo === gasolinera.rotulo)
    );
    localStorage.setItem("favoritos", JSON.stringify(this.gasolineras));
  }
  
  

  comprobarExiste(gasolineraComprobar: Gasolinera): boolean {
    return this.gasolineras.some(g =>
      g.latitud === gasolineraComprobar.latitud &&
      g.longitud === gasolineraComprobar.longitud &&
      g.rotulo === gasolineraComprobar.rotulo
    );
  }

  getFavoritos(){
    return this.gasolineras;
  }
}
