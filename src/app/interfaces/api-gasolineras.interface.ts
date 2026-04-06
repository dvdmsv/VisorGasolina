export interface EstacionServicio {
  'Rótulo': string;
  Localidad: string;
  Provincia: string;
  'Dirección': string;
  Latitud: string;
  'Longitud (WGS84)': string;
  IDProvincia: string;
  IDMunicipio: string;
  CCAA: string;
  IDCCAA: string;
  'Precio Gasoleo A': string;
  'Precio Gasoleo Premium': string;
  'Precio Gasolina 95 E5': string;
  'Precio Gasolina 98 E5': string;
  [key: string]: string;
}

export interface RespuestaGasolineras {
  Fecha: string;
  ListaEESSPrecio: EstacionServicio[];
}

export interface ProvinciaApi {
  CCAA: string;
  IDCCAA: string;
  IDPovincia: string;
  Provincia: string;
}

export interface LocalidadApi {
  CCAA: string;
  IDCCAA: string;
  IDMunicipio: string;
  IDPovincia: string;
  Municipio: string;
  Provincia: string;
}

export interface RespuestaLocalidades {
  Fecha: string;
  ListaEESSPrecio: LocalidadApi[];
}
