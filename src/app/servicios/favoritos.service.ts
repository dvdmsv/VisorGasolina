import { Injectable } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  gasolineras: Gasolinera[] = [];
  gasolinerasLocalStorange: string | null = localStorage.getItem("favoritos");

  constructor(private cookie: CookieService) { }

  setFavoritos(gasolinera: Gasolinera){
    if(!this.comprobarExiste(gasolinera)){
      this.gasolineras.push(gasolinera);
      localStorage.setItem("favoritos", JSON.stringify(this.gasolineras));
    }else{
      console.log("EXSISE")
    }
  }

  deleteFavoritos(gasolinera: Gasolinera){
    this.gasolineras = this.gasolineras.filter(g => g.latitud !== gasolinera.latitud);
    localStorage.setItem("favoritos", JSON.stringify(this.gasolineras));
  }
  
  

  comprobarExiste(gasolineraComprobar: Gasolinera){
    if(this.gasolineras.find(gasolinera => gasolinera.latitud == gasolineraComprobar.latitud)){
      return true;
    }
    return false;
  }

  getFavoritos(){
    return this.gasolineras;
  }
}
