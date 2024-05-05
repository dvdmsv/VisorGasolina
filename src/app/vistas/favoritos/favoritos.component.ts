import { ChangeDetectorRef, Component } from '@angular/core';
import { DarkModeService } from 'angular-dark-mode';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { FavoritosService } from 'src/app/servicios/favoritos.service';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.css'
})
export class FavoritosComponent {
  constructor(private favoritosService: FavoritosService, private darkModeService: DarkModeService){}

  gasolinerasFav:Gasolinera[] = [];
  
  //Variable que controla el modo oscuro
  darkMode: boolean = false;

  //Flag que controla si los datos se han cargado 
  datosCargados: boolean = false;

  ngOnInit() {
    const favoritosString: string | null = localStorage.getItem("favoritos");
    if (favoritosString !== null) {
      this.gasolinerasFav = JSON.parse(favoritosString);
    }

    if(this.gasolinerasFav.length){
      this.datosCargados = true;
    }

    //Se obtiene el valor del modo oscuro y se establece en la variable de la clase
    this.darkModeService.darkMode$.subscribe(boolean=>{
      this.darkMode = boolean;
    });
  }

  eliminar(gasolinera: Gasolinera){
    this.favoritosService.deleteFavoritos(gasolinera);
    const favoritosString: string | null = localStorage.getItem("favoritos");
    if (favoritosString !== null) {
      this.gasolinerasFav = JSON.parse(favoritosString);
    }
    if(!this.gasolinerasFav.length){
      this.datosCargados = false;
    }
  }

}
