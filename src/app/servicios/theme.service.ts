import { Injectable, effect, signal } from '@angular/core';

const CLAVE = 'theme';

/** Color de la barra del navegador en móvil: el mismo de la cabecera. */
const COLOR_BARRA = { light: '#ffffff', dark: '#171b21' } as const;

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly darkMode = signal<boolean>(this.preferenciaInicial());

  constructor() {
    effect(() => {
      const modo = this.darkMode() ? 'dark' : 'light';
      // Bootstrap 5.3 conmuta toda su paleta con este atributo, así que no hace falta
      // ninguna clase propia en el body.
      document.documentElement.setAttribute('data-bs-theme', modo);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[modo]);
      try {
        localStorage.setItem(CLAVE, modo);
      } catch {
        // Sin almacenamiento la preferencia simplemente no sobrevive a la recarga.
      }
    });
  }

  toggle() {
    this.darkMode.update(activo => !activo);
  }

  /** Si el usuario no ha elegido nunca, se respeta la preferencia del sistema. */
  private preferenciaInicial(): boolean {
    try {
      const guardada = localStorage.getItem(CLAVE);
      if (guardada !== null) {
        return guardada === 'dark';
      }
    } catch {
      // Se cae a la preferencia del sistema.
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
