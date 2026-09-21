/**
 * Forma real de las respuestas de la API de carburantes del Ministerio.
 *
 * Los nombres de campo se respetan tal cual llegan, incluidas las tildes, los espacios
 * y el typo «IDPovincia» del propio servicio.
 */

export interface EstacionApi {
  'Rótulo': string;
  'Dirección': string;
  Localidad: string;
  Municipio: string;
  Provincia: string;
  IDMunicipio: string;
  IDProvincia: string;
  IDPovincia: string;
  IDCCAA: string;
  CCAA: string;
  Latitud: string;
  'Longitud (WGS84)': string;
  /** Los precios llegan como texto con coma decimal, o vacíos si no se sirve ese combustible. */
  [campoPrecio: string]: string;
}

export interface RespuestaEstaciones {
  Fecha: string;
  ListaEESSPrecio: EstacionApi[];
  ResultadoConsulta: string;
}

export interface ProvinciaApi {
  IDPovincia: string;
  IDCCAA: string;
  Provincia: string;
  CCAA: string;
}
