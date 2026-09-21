export interface Gasolinera {
  rotulo: string;
  localidad: string;
  provincia: string;
  direccion: string;
  precio: number;
  latitud: number;
  longitud: number;
  /** Campo de la API del combustible al que corresponde el precio. */
  gasolina: string;
  /** Distancia en kilómetros al usuario. Solo en búsquedas por ubicación. */
  distancia?: number;
  /** Precio del repostaje más el combustible gastado en el trayecto de ida y vuelta. */
  costeTotal?: number;
  /** Diferencia de coste total respecto a la mejor opción. */
  ahorro?: number;
}
