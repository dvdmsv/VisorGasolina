import { Injectable, inject } from '@angular/core';
import { ApiGasolinerasService } from './api-gasolineras.service';
import { PreferenciasService } from './preferencias.service';
import { productoDeCombustible } from '../clases/combustibles';

/** Margen máximo de espera si el navegador nunca queda libre. */
const ESPERA_MAXIMA_MS = 4000;

interface ConexionDelNavegador {
  saveData?: boolean;
}

/**
 * Descarga el listado nacional del combustible activo en segundo plano al abrir.
 *
 * Son 4,3 MB, así que con una conexión mala pedirlos en el momento de pulsar «cerca de
 * mí» hace la función inservible. Adelantarlos mientras el usuario elige provincia hace
 * que el botón responda al instante; y como quedan guardados en disco media hora, las
 * visitas siguientes no repiten la descarga.
 *
 * La precarga siempre va por detrás de lo que el usuario está viendo: se encola en un
 * hueco libre del navegador, después del primer pintado.
 */
@Injectable({
  providedIn: 'root'
})
export class PrecargaService {
  private readonly api = inject(ApiGasolinerasService);
  private readonly preferencias = inject(PreferenciasService);
  private iniciada = false;

  async iniciar(): Promise<void> {
    // Se adelanta el combustible que el usuario está viendo, que es el que usará la
    // búsqueda por ubicación.
    const idProducto = productoDeCombustible(this.preferencias.get('gasolina'));

    if (this.iniciada || this.api.listadoNacionalPedido(idProducto)) {
      return;
    }
    this.iniciada = true;

    const hayCopiaEnDisco = await this.api.hayListadoNacionalGuardado(idProducto);

    // Si el usuario ha pedido ahorrar datos se respeta y no se descarga nada, pero una
    // copia que ya está en su disco no cuesta datos: esa sí se aprovecha.
    if (!hayCopiaEnDisco && this.ahorroDeDatos()) {
      return;
    }

    await this.esperarAHuecoLibre();

    // Solo interesa que quede disponible; el resultado lo consume la búsqueda por GPS.
    this.api.getListadoNacional(idProducto).subscribe({
      // Un fallo aquí no debe molestar: el usuario no ha pedido nada todavía.
      error: () => undefined
    });
  }

  private ahorroDeDatos(): boolean {
    const conexion = (navigator as Navigator & { connection?: ConexionDelNavegador }).connection;
    return conexion?.saveData === true;
  }

  /** Espera a que el navegador esté ocioso; Safari no implementa requestIdleCallback. */
  private esperarAHuecoLibre(): Promise<void> {
    return new Promise(resolver => {
      const pedirHueco = (window as Window & {
        requestIdleCallback?: (cb: () => void, opciones?: { timeout: number }) => number;
      }).requestIdleCallback;

      if (typeof pedirHueco === 'function') {
        pedirHueco(() => resolver(), { timeout: ESPERA_MAXIMA_MS });
        return;
      }
      setTimeout(resolver, 1200);
    });
  }
}
