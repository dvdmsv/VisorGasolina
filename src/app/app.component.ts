import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { PreferenciasService } from './servicios/preferencias.service';
import { COMBUSTIBLE_POR_DEFECTO, rutaValida } from './clases/combustibles';
import { ToolbarComponent } from './vistas/toolbar/toolbar.component';
import { FooterComponent } from './vistas/footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarComponent, RouterOutlet, FooterComponent]
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly preferencias = inject(PreferenciasService);

  ngOnInit() {
    if (this.redirigirEnlaceAntiguo()) {
      return;
    }

    // Solo se restaura la última sección cuando se entra por la raíz: si la URL trae una
    // ruta concreta (un enlace compartido, el pie de página, el botón de atrás) manda ella.
    if (window.location.pathname !== '/') {
      return;
    }

    const rutaGuardada = this.preferencias.get('toolbar');
    if (rutaValida(rutaGuardada) || rutaGuardada === 'favoritos') {
      this.router.navigate([rutaGuardada]);
      return;
    }

    this.preferencias.set('gasolina', COMBUSTIBLE_POR_DEFECTO.campoApi);
    this.preferencias.set('toolbar', COMBUSTIBLE_POR_DEFECTO.ruta);
    this.router.navigate([COMBUSTIBLE_POR_DEFECTO.ruta]);
  }

  /**
   * La app usaba HashLocationStrategy, así que siguen circulando enlaces del tipo
   * /#/diesel. Se traducen a la ruta equivalente en lugar de perderlos.
   */
  private redirigirEnlaceAntiguo(): boolean {
    const hash = window.location.hash;
    if (!hash.startsWith('#/')) {
      return false;
    }
    const ruta = hash.slice(2);
    window.location.hash = '';
    this.router.navigateByUrl('/' + ruta);
    return true;
  }
}
