import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PreferenciasService } from '../../servicios/preferencias.service';
import { ThemeService } from '../../servicios/theme.service';
import { COMBUSTIBLES } from '../../clases/combustibles';
import { IconoComponent } from '../../compartido/icono/icono.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconoComponent]
})
export class ToolbarComponent {
  private readonly preferencias = inject(PreferenciasService);
  private readonly tema = inject(ThemeService);

  readonly combustibles = COMBUSTIBLES;
  readonly modoOscuro = this.tema.darkMode;

  protected alternarTema() {
    this.tema.toggle();
  }

  protected seleccionarFavoritos() {
    this.preferencias.set('toolbar', 'favoritos');
  }
}
