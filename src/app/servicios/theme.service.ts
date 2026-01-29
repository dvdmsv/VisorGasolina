import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Usamos un Signal para el estado. Es más moderno y eficiente que los Observables para esto.
  darkMode = signal<boolean>(localStorage.getItem('theme') === 'dark');

  constructor() {
    // El effect se ejecuta automáticamente cada vez que el valor de darkMode cambia
    effect(() => {
      const mode = this.darkMode() ? 'dark' : 'light';
      
      // 1. Aplicamos el atributo nativo de Bootstrap 5.3+
      document.documentElement.setAttribute('data-bs-theme', mode);
      
      // 2. Mantenemos compatibilidad con tus clases CSS actuales en el body
      if (this.darkMode()) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
      }

      // 3. Persistencia
      localStorage.setItem('theme', mode);
    });
  }

  toggle() {
    this.darkMode.set(!this.darkMode());
  }
}