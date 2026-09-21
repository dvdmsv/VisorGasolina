import { Injectable, inject } from '@angular/core';
import { ThemeService } from './theme.service';

/** El mismo azul de acción que usa el resto de la interfaz. */
const AZUL_ACCION = '#1b5fd9';
const ROJO_CANCELAR = '#b23a26';

/**
 * Envoltorio de SweetAlert2.
 *
 * Centraliza el tema (antes cada Swal.fire repetía los colores a mano) y carga la
 * librería bajo demanda, de forma que no entra en el paquete inicial.
 */
@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private readonly tema = inject(ThemeService);

  async exito(titulo: string) {
    const Swal = await this.cargar();
    await Swal.fire({ ...this.estiloBase(), icon: 'success', title: titulo, showConfirmButton: false, timer: 1300 });
  }

  async info(titulo: string) {
    const Swal = await this.cargar();
    await Swal.fire({ ...this.estiloBase(), icon: 'info', title: titulo, showConfirmButton: false, timer: 1300 });
  }

  async aviso(titulo: string, texto: string) {
    const Swal = await this.cargar();
    await Swal.fire({ ...this.estiloBase(), icon: 'warning', title: titulo, text: texto });
  }

  async error(titulo: string, texto: string) {
    const Swal = await this.cargar();
    await Swal.fire({ ...this.estiloBase(), icon: 'error', title: titulo, text: texto });
  }

  async confirmar(titulo: string): Promise<boolean> {
    const Swal = await this.cargar();
    const resultado = await Swal.fire({
      ...this.estiloBase(),
      title: titulo,
      icon: 'question',
      showCancelButton: true,
      cancelButtonColor: ROJO_CANCELAR,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    });
    return resultado.isConfirmed;
  }

  private async cargar() {
    const modulo = await import('sweetalert2');
    return modulo.default;
  }

  private estiloBase() {
    const oscuro = this.tema.darkMode();
    return {
      background: oscuro ? '#171b21' : '#fff',
      color: oscuro ? '#e7eaee' : '#1a1e24',
      // Sin esto SweetAlert2 pinta sus botones de morado, ajeno a la paleta.
      confirmButtonColor: AZUL_ACCION
    };
  }
}
