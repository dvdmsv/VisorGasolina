export interface Gasolinera {
  /**
   * IDEESS del Ministerio. Es estable en el tiempo —contrastado con el listado de 2010: las
   * estaciones que siguen abiertas conservan su identificador, su dirección y su municipio—,
   * así que es la clave con la que se busca el histórico de precios.
   *
   * Opcional porque los favoritos guardados en localStorage antes de existir este campo no lo
   * tienen; esos se siguen identificando por coordenadas.
   */
  id?: string;
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
