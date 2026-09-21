import { Gasolinera } from './gasolinera';
import { Localidad } from './localidad';
import { Provincia } from './provincia';
import { EstacionApi, ProvinciaApi, RespuestaEstaciones } from './respuesta-api';
import { comoNombrePropio } from './texto';

export { comoNombrePropio };

/**
 * Convierte a número un valor de la API: llegan como texto con coma decimal y las
 * estaciones que no sirven un combustible traen la cadena vacía.
 */
export function aNumero(valor: unknown): number | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return null;
  }
  const numero = parseFloat(valor.replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
}

/**
 * Territorio español. El Ministerio publica unas pocas estaciones en (0,0) y alguna con la
 * latitud y la longitud intercambiadas; en un listado no se notan, pero falsean el cálculo
 * de distancias y los límites provinciales.
 */
const LATITUD_ESPANA = [27, 44] as const;
const LONGITUD_ESPANA = [-19, 5] as const;

function coordenadasPlausibles(latitud: number, longitud: number): boolean {
  return latitud >= LATITUD_ESPANA[0] && latitud <= LATITUD_ESPANA[1] &&
    longitud >= LONGITUD_ESPANA[0] && longitud <= LONGITUD_ESPANA[1];
}

export function mapearGasolineras(
  estaciones: readonly EstacionApi[] | null | undefined,
  campoCombustible: string,
  filtro: (estacion: EstacionApi) => boolean = () => true
): Gasolinera[] {
  const gasolineras: Gasolinera[] = [];

  for (const estacion of estaciones ?? []) {
    if (!filtro(estacion)) {
      continue;
    }
    const precio = aNumero(estacion[campoCombustible]);
    const latitud = aNumero(estacion.Latitud);
    const longitud = aNumero(estacion['Longitud (WGS84)']);
    if (precio === null || latitud === null || longitud === null) {
      continue;
    }
    if (!coordenadasPlausibles(latitud, longitud)) {
      continue;
    }
    gasolineras.push({
      // El rótulo es una marca comercial y se respeta tal cual.
      rotulo: estacion['Rótulo'],
      localidad: comoNombrePropio(estacion.Localidad),
      provincia: comoNombrePropio(estacion.Provincia),
      direccion: comoNombrePropio(estacion['Dirección']),
      precio,
      latitud,
      longitud,
      gasolina: campoCombustible
    });
  }

  return gasolineras;
}

export function mapearProvincias(provincias: readonly ProvinciaApi[] | null | undefined): Provincia[] {
  return (provincias ?? []).map(
    p => new Provincia(p.CCAA, p.IDCCAA, p.IDPovincia, comoNombrePropio(p.Provincia))
  );
}

/** Extrae las localidades únicas de la respuesta de estaciones de una provincia. */
export function mapearLocalidades(respuesta: RespuestaEstaciones | null | undefined): Localidad[] {
  const vistas = new Set<string>();
  const localidades: Localidad[] = [];

  for (const estacion of respuesta?.ListaEESSPrecio ?? []) {
    if (vistas.has(estacion.IDMunicipio)) {
      continue;
    }
    vistas.add(estacion.IDMunicipio);
    localidades.push(
      new Localidad(
        estacion.CCAA,
        estacion.IDCCAA,
        estacion.IDMunicipio,
        estacion.IDPovincia,
        comoNombrePropio(estacion.Municipio),
        comoNombrePropio(estacion.Provincia)
      )
    );
  }

  return localidades.sort((a, b) => a.Localidad.localeCompare(b.Localidad, 'es'));
}

export function precioMedio(gasolineras: readonly Gasolinera[]): number {
  if (gasolineras.length === 0) {
    return 0;
  }
  const suma = gasolineras.reduce((acc, gasolinera) => acc + gasolinera.precio, 0);
  return parseFloat((suma / gasolineras.length).toFixed(3));
}
