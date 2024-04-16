import { Component } from '@angular/core';
import { DarkModeService } from 'angular-dark-mode';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-modo-oscuro',
  templateUrl: './modo-oscuro.component.html',
  styleUrl: './modo-oscuro.component.css'
})
export class ModoOscuroComponent {
  darkMode$: Observable<boolean> = this.darkModeService.darkMode$;
  
  constructor(private darkModeService: DarkModeService){}

  onToggle(): void {
    console.log("Modo")
    this.darkModeService.toggle();
  }

}
