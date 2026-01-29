import { Component } from '@angular/core';
import { ThemeService } from '../../servicios/theme.service';

@Component({
  selector: 'app-modo-oscuro',
  templateUrl: './modo-oscuro.component.html',
  styleUrl: './modo-oscuro.component.css'
})
export class ModoOscuroComponent {
  // Exponemos el signal para usarlo en el HTML
  isDarkMode = this.themeService.darkMode;

  constructor(private themeService: ThemeService) {}

  onToggle(): void {
    this.themeService.toggle();
  }
}