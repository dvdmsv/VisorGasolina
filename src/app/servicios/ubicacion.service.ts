import { Injectable, inject, signal } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';
import { PreferenciasService } from './preferencias.service';

const RADIO_TIERRA_KM = 6371;

export interface ParametrosAhorro {
  /** Consumo del vehículo en litros cada 100 km. */
  consumo: number;
  /** Litros que se van a repostar. */
  litros: number;
}

@Injectable({
  providedIn: 'root'
})
export class UbicacionService {
  private readonly preferencias = inject(PreferenciasService);

  /**
   * Última posición usada en una búsqueda. Vive en el servicio y no en el componente
   * porque al cambiar de combustible el enrutador recrea la vista, y la búsqueda por
   * ubicación debe sobrevivir a ese cambio. No se persiste: tras recargar la página
   * se vuelve a pedir el permiso.
   */
  readonly ultimaPosicion = signal<{ latitud: number; longitud: number } | null>(null);

  recordarPosicion(latitud: number, longitud: number) {
    this.ultimaPosicion.set({ latitud, longitud });
  }

  olvidarPosicion() {
    this.ultimaPosicion.set(null);
  }

  async obtenerPosicion(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      throw new Error('El navegador no soporta geolocalización');
    }

    const posicion = await new Promise<GeolocationPosition>((resolver, rechazar) => {
      navigator.geolocation.getCurrentPosition(resolver, rechazar, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0
      });
    });

    // Queda constancia de que el usuario aceptó, para poder aprovechar su ubicación en las
    // visitas siguientes allí donde no existe la Permissions API.
    this.preferencias.set('usaUbicacion', 'si');
    return posicion;
  }

  /**
   * Indica si se puede usar la ubicación sin provocar el diálogo del navegador, es decir,
   * si el usuario ya lo concedió en otra visita.
   *
   * Se pregunta a la Permissions API; Safari no la implementa para la geolocalización, así
   * que allí se recurre a la constancia que dejó `obtenerPosicion`. Nunca se llama a
   * `getCurrentPosition` a ciegas: hacerlo sacaría el diálogo nada más abrir la web.
   */
  async permisoConcedido(): Promise<boolean> {
    try {
      const estado = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      if (estado) {
        return estado.state === 'granted';
      }
    } catch {
      // Sin Permissions API se usa la constancia propia.
    }
    return this.preferencias.get('usaUbicacion') === 'si';
  }

  /** Distancia en kilómetros entre dos coordenadas (fórmula del semiverseno). */
  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const aRadianes = (grados: number) => grados * (Math.PI / 180);
    const dLat = aRadianes(lat2 - lat1);
    const dLon = aRadianes(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLon / 2) ** 2;

    return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calcula el coste real de repostar en cada gasolinera: el precio del repostaje más el
   * combustible que se gasta en el viaje de ida y vuelta, y la diferencia con la mejor opción.
   *
   * Devuelve una lista nueva ordenada por coste; no modifica la original.
   */
  calcularCostes(gasolineras: readonly Gasolinera[], { consumo, litros }: ParametrosAhorro): Gasolinera[] {
    const conCoste = gasolineras.map(gasolinera => {
      const litrosDelViaje = (gasolinera.distancia ?? 0) * 2 * (consumo / 100);
      return {
        ...gasolinera,
        costeTotal: (litros + litrosDelViaje) * gasolinera.precio
      };
    });

    conCoste.sort((a, b) => a.costeTotal - b.costeTotal);

    const mejorCoste = conCoste[0]?.costeTotal ?? 0;
    return conCoste.map(gasolinera => ({
      ...gasolinera,
      ahorro: gasolinera.costeTotal - mejorCoste
    }));
  }

  mensajeDeError(error: unknown): string {
    if (typeof GeolocationPositionError !== 'undefined' && error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          return 'Has denegado el permiso de ubicación.';
        case error.POSITION_UNAVAILABLE:
          return 'La ubicación no está disponible.';
        case error.TIMEOUT:
          return 'Se ha agotado el tiempo de espera.';
      }
    }
    return 'No se ha podido obtener la ubicación.';
  }
}
