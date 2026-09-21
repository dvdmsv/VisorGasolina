import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Gasolinera } from '../../clases/gasolinera';
import { etiquetaCombustible } from '../../clases/combustibles';
import { FavoritosService } from '../../servicios/favoritos.service';
import { AlertasService } from '../../servicios/alertas.service';
import { IconoComponent } from '../../compartido/icono/icono.component';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.scss',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritosComponent {
  private readonly favoritosService = inject(FavoritosService);
  private readonly alertas = inject(AlertasService);

  // El servicio es la única fuente de verdad: mantiene el signal sincronizado con localStorage.
  readonly gasolinerasFav = this.favoritosService.favoritos;
  readonly hayFavoritos = computed(() => this.gasolinerasFav().length > 0);

  readonly etiqueta = (campoApi: string) => etiquetaCombustible(campoApi);

  async eliminar(gasolinera: Gasolinera) {
    const confirmado = await this.alertas.confirmar(`Eliminar gasolinera ${gasolinera.rotulo}`);
    if (!confirmado) {
      return;
    }
    this.favoritosService.deleteFavoritos(gasolinera);
    await this.alertas.exito('Eliminado');
  }
}
