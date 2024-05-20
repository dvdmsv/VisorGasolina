import { ChangeDetectorRef, Component } from '@angular/core';
import { DarkModeService } from 'angular-dark-mode';
import { Gasolinera } from 'src/app/clases/gasolinera';
import { FavoritosService } from 'src/app/servicios/favoritos.service';
import Swal from 'sweetalert2'

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
        const favoritosString: string | null = localStorage.getItem("favoritos");
        if (favoritosString !== null) {
          this.gasolinerasFav = JSON.parse(favoritosString);
        }
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
