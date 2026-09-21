import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../servicios/theme.service';
import { IconoComponent } from '../../compartido/icono/icono.component';

@Component({
  selector: 'app-modo-oscuro',
  templateUrl: './modo-oscuro.component.html',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModoOscuroComponent {
  private readonly themeService = inject(ThemeService);

  readonly isDarkMode = this.themeService.darkMode;

  onToggle() {
    this.themeService.toggle();
  }
}
