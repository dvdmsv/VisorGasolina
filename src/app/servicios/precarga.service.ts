import { Injectable, inject } from '@angular/core';
import { ApiGasolinerasService } from './api-gasolineras.service';
import { PreferenciasService } from './preferencias.service';
import { UbicacionService } from './ubicacion.service';
import { productoDeCombustible } from '../clases/combustibles';
import { provinciasCercanas } from '../clases/limites-provincias';

/** Margen máximo de espera si el navegador nunca queda libre. */
const ESPERA_MAXIMA_MS = 4000;

interface ConexionDelNavegador {
  saveData?: boolean;
}

/**
 * Adelanta en segundo plano las gasolineras de la zona en la que está el usuario, para que
 * «cerca de mí» responda al instante.
 *
 * Solo actúa si el permiso de ubicación ya estaba concedido de una visita anterior: pedirlo
 * al abrir la web sacaría el diálogo del navegador a quien no ha pedido nada, y mucha gente
 * lo deniega por reflejo. Quien entra por primera vez no nota nada; al pulsar el botón se le
 * pedirá el permiso y la descarga es de unos cientos de kilobytes.
 */
@Injectable({
  providedIn: 'root'
})
export class PrecargaService {
  private readonly api = inject(ApiGasolinerasService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly ubicacion = inject(UbicacionService);
  private iniciada = false;

  async iniciar(): Promise<void> {
    if (this.iniciada) {
      return;
    }
    this.iniciada = true;

    if (this.ahorroDeDatos()) {
      return;
    }
    if (!(await this.ubicacion.permisoConcedido())) {
      return;
    }

    await this.esperarAHuecoLibre();

    try {
      const posicion = await this.ubicacion.obtenerPosicion();
      const idProducto = productoDeCombustible(this.preferencias.get('gasolina'));

      for (const idProvincia of provinciasCercanas(posicion.coords.latitude, posicion.coords.longitude)) {
        // Un fallo aquí no debe molestar: el usuario no ha pedido nada todavía.
        this.api.getGasolinerasProvinciaProducto(idProvincia, idProducto).subscribe({
          error: () => undefined
        });
      }
    } catch {
      // Sin ubicación no hay nada que adelantar; el botón seguirá funcionando.
    }
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
