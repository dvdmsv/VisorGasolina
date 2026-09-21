import { Injectable, signal } from '@angular/core';

/** A partir de aquí se muestra la tabla en lugar de las tarjetas. */
const ANCHO_ESCRITORIO = '(min-width: 768px)';

@Injectable({
  providedIn: 'root'
})
export class PantallaService {
  /**
   * La vista de resultados tiene dos formas: tabla en pantallas anchas y tarjetas en
   * estrechas. Ocultar una con CSS obliga a construir las dos, así que con una provincia
   * grande se dibujaban más de 1.700 filas para enseñar la mitad.
   */
  readonly esEscritorio = signal(this.coincide());

  constructor() {
    try {
      window.matchMedia(ANCHO_ESCRITORIO)
        .addEventListener('change', evento => this.esEscritorio.set(evento.matches));
    } catch {
      // Sin matchMedia se queda en el valor inicial; el CSS sigue ocultando la otra vista.
    }
  }

  private coincide(): boolean {
    try {
      return window.matchMedia(ANCHO_ESCRITORIO).matches;
    } catch {
      return false;
    }
  }
}
