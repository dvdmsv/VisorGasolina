import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThemeService } from '../../servicios/theme.service';

@Component({
  selector: 'app-modo-oscuro',
  templateUrl: './modo-oscuro.component.html',
  styleUrl: './modo-oscuro.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModoOscuroComponent {
  isDarkMode = this.themeService.darkMode;

  constructor(private themeService: ThemeService) {}

  onToggle(): void {
    this.themeService.toggle();
  }
}
