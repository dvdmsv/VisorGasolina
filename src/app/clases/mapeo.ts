import { Gasolinera } from './gasolinera';
import { Localidad } from './localidad';
import { Provincia } from './provincia';
import { EstacionApi, ProvinciaApi, RespuestaEstaciones } from './respuesta-api';

/**
 * La API devuelve los textos en mayúsculas: «SORIA», «AVENIDA DE LA PAZ, 12».
 * Leerlos así cansa, de modo que se pasan a mayúscula inicial respetando las palabras
 * cortas de enlace y las abreviaturas de una sola letra.
 */
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'al', 'con']);

export function comoNombrePropio(texto: string | null | undefined): string {
  if (!texto) {
    return '';
  }
  return texto
    .toLocaleLowerCase('es-ES')
    .replace(/[\p{L}\p{N}]+/gu, (palabra, posicion: number, completo: string) => {
      // Una palabra de enlace solo va en minúscula si viene detrás de un espacio:
      // en «BURGO DE OSMA (EL)» ese «el» abre paréntesis y sí se capitaliza.
      if (posicion > 0 && completo[posicion - 1] === ' ' && MINUSCULAS.has(palabra)) {
        return palabra;
      }
      return palabra.charAt(0).toLocaleUpperCase('es-ES') + palabra.slice(1);
    })
    // En las direcciones del Ministerio «SN» significa «sin número».
    .replace(/\bSn\b/g, 'S/N');
}

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
