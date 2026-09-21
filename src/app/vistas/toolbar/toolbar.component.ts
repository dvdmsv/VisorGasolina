import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PreferenciasService } from '../../servicios/preferencias.service';
import { COMBUSTIBLES } from '../../clases/combustibles';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive]
})
export class ToolbarComponent {
  private readonly preferencias = inject(PreferenciasService);

  readonly combustibles = COMBUSTIBLES;
  protected readonly menuAbierto = signal(false);

  protected alternarMenu() {
    this.menuAbierto.update(abierto => !abierto);
  }

  // El combustible lo fija la propia ruta (ver SelectorTablaComponent); aquí solo se
  // cierra el menú desplegable en móvil.
  protected cerrarMenu() {
    this.menuAbierto.set(false);
  }

  protected seleccionarFavoritos() {
    this.menuAbierto.set(false);
    this.preferencias.set('toolbar', 'favoritos');
  }
}
