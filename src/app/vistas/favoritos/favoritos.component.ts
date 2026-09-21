import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Gasolinera } from '../../clases/gasolinera';
import { COMBUSTIBLE_POR_DEFECTO, etiquetaCombustible } from '../../clases/combustibles';
import { FavoritosService } from '../../servicios/favoritos.service';
import { AlertasService } from '../../servicios/alertas.service';
import { PantallaService } from '../../servicios/pantalla.service';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { PrecioPipe } from '../../compartido/precio.pipe';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.scss',
  imports: [IconoComponent, PrecioPipe, RouterLink],
  providers: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritosComponent {
  private readonly favoritosService = inject(FavoritosService);
  private readonly alertas = inject(AlertasService);

  readonly esEscritorio = inject(PantallaService).esEscritorio;

  // El servicio es la única fuente de verdad: mantiene el signal sincronizado con localStorage.
  readonly gasolinerasFav = this.favoritosService.favoritos;
  readonly hayFavoritos = computed(() => this.gasolinerasFav().length > 0);
  readonly rutaInicial = COMBUSTIBLE_POR_DEFECTO.ruta;

  readonly etiqueta = (campoApi: string) => etiquetaCombustible(campoApi);

  enlaceMapa(gasolinera: Gasolinera): string {
    return `https://www.google.es/maps/place/${gasolinera.latitud},${gasolinera.longitud}`;
  }

  async eliminar(gasolinera: Gasolinera) {
    const confirmado = await this.alertas.confirmar(`¿Quitar ${gasolinera.rotulo} de favoritos?`);
    if (!confirmado) {
      return;
    }
    this.favoritosService.deleteFavoritos(gasolinera);
    await this.alertas.exito(`${gasolinera.rotulo} quitada de favoritos`);
  }
}
