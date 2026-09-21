#!/usr/bin/env node
/**
 * Regenera src/app/clases/limites-provincias.ts a partir de los datos del Ministerio.
 *
 * La búsqueda por ubicación necesita saber en qué provincia está el usuario para pedir solo
 * esa (y las vecinas) en lugar del listado nacional. No hay servicio de geocodificación
 * disponible —la CSP solo permite la API del Ministerio—, así que los límites se calculan
 * desde las coordenadas de las propias estaciones.
 *
 * Conviene volver a ejecutarlo de vez en cuando: si el Ministerio añade estaciones en un
 * extremo de una provincia, su rectángulo crece.
 *
 *   node scripts/generar-limites-provincias.mjs
 */
import { writeFile } from 'node:fs/promises';

const URL_LISTADO =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProducto/4';
const DESTINO = 'src/app/clases/limites-provincias.ts';

/** Territorio español, para descartar coordenadas imposibles. */
const LATITUD = [27, 44];
const LONGITUD = [-19, 5];

const aNumero = texto => {
  const numero = parseFloat(String(texto).replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
};

console.log('Descargando el listado del Ministerio...');
const respuesta = await fetch(URL_LISTADO);
if (!respuesta.ok) {
  console.error(`La API respondió ${respuesta.status}`);
  process.exit(1);
}
const { ListaEESSPrecio: estaciones } = await respuesta.json();

const provincias = new Map();
let descartadas = 0;

for (const estacion of estaciones) {
  const lat = aNumero(estacion.Latitud);
  const lon = aNumero(estacion['Longitud (WGS84)']);

  // Hay unas pocas estaciones en (0,0) y alguna con latitud y longitud intercambiadas.
  if (lat === null || lon === null ||
      lat < LATITUD[0] || lat > LATITUD[1] || lon < LONGITUD[0] || lon > LONGITUD[1]) {
    descartadas++;
    continue;
  }

  const id = estacion.IDProvincia;
  const limite = provincias.get(id) ?? {
    nombre: estacion.Provincia,
    minLat: lat, maxLat: lat, minLon: lon, maxLon: lon, estaciones: 0
  };
  limite.minLat = Math.min(limite.minLat, lat);
  limite.maxLat = Math.max(limite.maxLat, lat);
  limite.minLon = Math.min(limite.minLon, lon);
  limite.maxLon = Math.max(limite.maxLon, lon);
  limite.estaciones++;
  provincias.set(id, limite);
}

const redondea = valor => Math.round(valor * 1000) / 1000;
const filas = [...provincias.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, l]) =>
    `  ['${id}', ${redondea(l.minLat)}, ${redondea(l.maxLat)}, ${redondea(l.minLon)}, ${redondea(l.maxLon)}], // ${l.nombre}`
  );

const contenido = `// GENERADO por scripts/generar-limites-provincias.mjs · no editar a mano.
// Rectángulo que ocupan las estaciones de cada provincia, calculado desde los datos del
// Ministerio (${estaciones.length - descartadas} estaciones; ${descartadas} descartadas por tener coordenadas imposibles).

/** [IDProvincia, latitud mínima, latitud máxima, longitud mínima, longitud máxima] */
type LimiteProvincia = readonly [string, number, number, number, number];

const LIMITES: readonly LimiteProvincia[] = [
${filas.join('\n')}
];

/**
 * Margen añadido al rectángulo de cada provincia, en grados: unos 25 km, algo más que el
 * radio de búsqueda, para no perder las estaciones que quedan al otro lado de un límite
 * provincial.
 */
const MARGEN_GRADOS = 0.25;

/**
 * Provincias que pueden tener estaciones cerca de una posición. Normalmente una o dos,
 * cuatro como máximo cerca de varios límites. Vacío si el punto está fuera de España.
 */
export function provinciasCercanas(latitud: number, longitud: number): string[] {
  return LIMITES.filter(
    ([, minLat, maxLat, minLon, maxLon]) =>
      latitud >= minLat - MARGEN_GRADOS &&
      latitud <= maxLat + MARGEN_GRADOS &&
      longitud >= minLon - MARGEN_GRADOS &&
      longitud <= maxLon + MARGEN_GRADOS
  ).map(([id]) => id);
}
`;

await writeFile(DESTINO, contenido, 'utf8');
console.log(`${DESTINO}: ${provincias.size} provincias, ${descartadas} estaciones descartadas.`);
