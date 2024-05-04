import { ChangeDetectorRef, Component } from '@angular/core';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { FavoritosService } from 'src/app/servicios/favoritos.service';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.css'
})
export class FavoritosComponent {
  constructor(private favoritosService: FavoritosService){}
  gasolinerasFav:Gasolinera[] = [];

  ngOnInit() {
    const favoritosString: string | null = localStorage.getItem("favoritos");
    if (favoritosString !== null) {
      this.gasolinerasFav = JSON.parse(favoritosString);
    }
  }

  eliminar(gasolinera: Gasolinera){
    this.favoritosService.deleteFavoritos(gasolinera);
    const favoritosString: string | null = localStorage.getItem("favoritos");
    if (favoritosString !== null) {
      this.gasolinerasFav = JSON.parse(favoritosString);
    }
  }

}
