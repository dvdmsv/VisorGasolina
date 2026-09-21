import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ThemeService } from '../../servicios/theme.service';
import { Gasolinera } from '../../clases/gasolinera';
import { FavoritosService } from '../../servicios/favoritos.service';
import Swal from 'sweetalert2'

@Component({
    selector: 'app-favoritos',
    templateUrl: './favoritos.component.html',
    styleUrl: './favoritos.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class FavoritosComponent {
  constructor(private favoritosService: FavoritosService, private themeService: ThemeService){}

  // El servicio es la única fuente de verdad: mantiene el signal sincronizado con localStorage.
  gasolinerasFav = this.favoritosService.favoritos;
  hayFavoritos = computed(() => this.gasolinerasFav().length > 0);

  darkMode = this.themeService.darkMode;

  eliminar(gasolinera: Gasolinera){
    Swal.fire({
      title: `Eliminar gasolinera ${gasolinera.rotulo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si",
      cancelButtonText: "No",
      background: this.darkMode() ? '#2d3436' : '#fff',
      color: this.darkMode() ? '#dfe6e9' : '#545454'
    }).then((result) =>{
      if(result.isConfirmed){
        this.favoritosService.deleteFavoritos(gasolinera);
        Swal.fire({
          title: "Eliminado",
          icon: "success",
          showConfirmButton: false,
          timer: 1100,
          background: this.darkMode() ? '#2d3436' : '#fff',
          color: this.darkMode() ? '#dfe6e9' : '#545454'
        });
      }
    })
  }

}
