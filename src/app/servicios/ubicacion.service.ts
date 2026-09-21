import { Injectable } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';

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
  obtenerPosicion(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('El navegador no soporta geolocalización'));
    }
    return new Promise((resolver, rechazar) => {
      navigator.geolocation.getCurrentPosition(resolver, rechazar, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0
      });
    });
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
