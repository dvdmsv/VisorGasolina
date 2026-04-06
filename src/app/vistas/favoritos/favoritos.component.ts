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
  constructor(private favoritosService: FavoritosService, private themeService: ThemeService) {}

  gasolinerasFav: Gasolinera[] = [];
  datosCargados: boolean = false;
  darkMode = this.themeService.darkMode;

  private get swalTheme() {
    return {
      background: this.darkMode() ? '#2d3436' : '#fff',
      color: this.darkMode() ? '#dfe6e9' : '#545454'
    };
  }

  trackByGasolinera(_index: number, g: Gasolinera): string {
    return `${g.latitud}_${g.longitud}`;
  }

  ngOnInit() {
    this.gasolinerasFav = this.leerFavoritos();
    this.datosCargados = this.gasolinerasFav.length > 0;
  }

  private leerFavoritos(): Gasolinera[] {
    try {
      const raw = localStorage.getItem("favoritos");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  eliminar(gasolinera: Gasolinera) {
    Swal.fire({
      title: `Eliminar gasolinera ${gasolinera.rotulo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí",
      cancelButtonText: "No",
      ...this.swalTheme
    }).then((result) => {
      if (result.isConfirmed) {
        this.favoritosService.deleteFavoritos(gasolinera);
        this.gasolinerasFav = this.leerFavoritos();
        this.datosCargados = this.gasolinerasFav.length > 0;
        Swal.fire({ title: "Eliminado", icon: "success", showConfirmButton: false, timer: 1100, ...this.swalTheme });
      } else {
        Swal.fire({ title: "No eliminado", icon: "info", showConfirmButton: false, timer: 1100, ...this.swalTheme });
      }
    });
  }
}
