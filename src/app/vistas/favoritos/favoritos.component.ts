import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThemeService } from '../../servicios/theme.service';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { FavoritosService } from 'src/app/servicios/favoritos.service';
import Swal from 'sweetalert2'

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritosComponent {
  constructor(private favoritosService: FavoritosService, private themeService: ThemeService){}

  gasolinerasFav:Gasolinera[] = [];

  //Flag que controla si los datos se han cargado 
  datosCargados: boolean = true;

  //Se obtiene el valor del modo oscuro y se establece en la variable de la clase
  darkMode = this.themeService.darkMode; // Esto es un signal;

  ngOnInit() {
    this.gasolinerasFav = this.leerFavoritos();
    this.datosCargados = this.gasolinerasFav.length > 0;
  }

  private leerFavoritos(): Gasolinera[] {
    try {
      const raw = localStorage.getItem("favoritos");
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem("favoritos");
      return [];
    }
  }

  eliminar(gasolinera: Gasolinera){
    Swal.fire({
      title: `Eliminar gasolinera ${gasolinera.rotulo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then((result) =>{
      if(result.isConfirmed){
        this.favoritosService.deleteFavoritos(gasolinera);
        this.gasolinerasFav = this.leerFavoritos();
        if(!this.gasolinerasFav.length){
          this.datosCargados = false;
        }
        Swal.fire({
          title: "Eliminado",
          icon: "success",
          showConfirmButton: false,
          timer: 1100
        });
      }else{
        Swal.fire({
          title: "No eliminado",
          icon: "info",
          showConfirmButton: false,
          timer: 1100
        });
      }
    })
  }

}
