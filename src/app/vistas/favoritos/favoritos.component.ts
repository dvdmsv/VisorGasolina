import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Gasolinera } from '../../clases/gasolinera';
import { COMBUSTIBLE_POR_DEFECTO, etiquetaCombustible } from '../../clases/combustibles';
import { FavoritosService } from '../../servicios/favoritos.service';
import { AlertasService } from '../../servicios/alertas.service';
import { PantallaService } from '../../servicios/pantalla.service';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { PrecioPipe } from '../../compartido/precio.pipe';
import { FichaGasolineraComponent } from '../../compartido/ficha-gasolinera/ficha-gasolinera.component';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrl: './favoritos.component.scss',
  imports: [IconoComponent, PrecioPipe, RouterLink, FichaGasolineraComponent],
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

  /** Favorita cuya ficha con el histórico está abierta. */
  readonly fichaAbierta = signal<Gasolinera | null>(null);

  /** Descarga los favoritos como fichero. Todo el estado vive en el navegador y se puede perder. */
  exportar() {
    const blob = new Blob([this.favoritosService.exportar()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `favoritos-visorgasolina-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  async importar(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    const fichero = campo.files?.[0];
    if (!fichero) {
      return;
    }
    const anadidas = this.favoritosService.importar(await fichero.text());
    // El campo se limpia siempre: si no, elegir el mismo fichero dos veces no dispara el evento.
    campo.value = '';

    if (anadidas === null) {
      await this.alertas.error(
        'No se ha podido importar',
        'Ese fichero no parece una copia de favoritos de VisorGasolina.'
      );
      return;
    }
    if (anadidas === 0) {
      await this.alertas.exito('Ya tenías todas las gasolineras del fichero.');
      return;
    }
    await this.alertas.exito(
      anadidas === 1 ? 'Se ha añadido 1 gasolinera.' : `Se han añadido ${anadidas} gasolineras.`
    );
  }

  abrirFicha(gasolinera: Gasolinera) {
    this.fichaAbierta.set(gasolinera);
  }

  cerrarFicha() {
    this.fichaAbierta.set(null);
  }

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
