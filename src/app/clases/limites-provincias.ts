// GENERADO por scripts/generar-limites-provincias.mjs · no editar a mano.
// Rectángulo que ocupan las estaciones de cada provincia, calculado desde los datos del
// Ministerio (11264 estaciones; 4 descartadas por tener coordenadas imposibles).

/** [IDProvincia, latitud mínima, latitud máxima, longitud mínima, longitud máxima] */
type LimiteProvincia = readonly [string, number, number, number, number];

const LIMITES: readonly LimiteProvincia[] = [
  ['01', 42.491, 43.149, -3.123, -2.312], // ARABA/ÁLAVA
  ['02', 38.151, 39.367, -2.751, -0.943], // ALBACETE
  ['03', 37.86, 38.858, -1.047, 0.186], // ALICANTE
  ['04', 36.71, 37.86, -3.004, -1.664], // ALMERÍA
  ['05', 40.14, 41.132, -5.34, -4.333], // ÁVILA
  ['06', 38.029, 39.364, -7.168, -4.947], // BADAJOZ
  ['07', 38.708, 40.008, 1.298, 4.272], // BALEARS (ILLES)
  ['08', 41.201, 42.245, 1.399, 2.756], // BARCELONA
  ['09', 41.574, 43.167, -4.245, -2.696], // BURGOS
  ['10', 39.133, 40.385, -7.298, -5.198], // CÁCERES
  ['11', 36.019, 36.934, -6.433, -5.164], // CÁDIZ
  ['12', 39.74, 40.664, -0.703, 0.475], // CASTELLÓN / CASTELLÓ
  ['13', 38.431, 39.46, -4.973, -2.692], // CIUDAD REAL
  ['14', 37.227, 38.573, -5.443, -4.1], // CÓRDOBA
  ['15', 42.554, 43.732, -9.265, -7.845], // CORUÑA (A)
  ['16', 39.325, 40.427, -3.083, -1.273], // CUENCA
  ['17', 41.676, 42.463, 1.922, 3.276], // GIRONA
  ['18', 36.699, 37.983, -4.285, -2.333], // GRANADA
  ['19', 40.298, 41.214, -3.455, -1.683], // GUADALAJARA
  ['20', 42.949, 43.356, -2.535, -1.753], // GIPUZKOA
  ['21', 37.02, 38.138, -7.41, -6.221], // HUELVA
  ['22', 41.413, 42.774, -0.787, 0.732], // HUESCA
  ['23', 37.412, 38.415, -4.261, -2.557], // JAÉN
  ['24', 42.076, 43.014, -6.922, -4.979], // LEÓN
  ['25', 41.365, 42.832, 0.393, 1.846], // LLEIDA
  ['26', 41.983, 42.575, -3.013, -1.726], // RIOJA (LA)
  ['27', 42.474, 43.687, -7.93, -7.018], // LUGO
  ['28', 40.021, 41.135, -4.476, -3.112], // MADRID
  ['29', 36.333, 37.268, -5.336, -3.876], // MÁLAGA
  ['30', 37.389, 38.62, -1.973, -0.708], // MURCIA
  ['31', 41.927, 43.309, -2.374, -0.939], // NAVARRA
  ['32', 41.825, 42.513, -8.246, -6.994], // OURENSE
  ['33', 43.038, 43.608, -7.149, -4.557], // ASTURIAS
  ['34', 41.835, 42.895, -4.966, -4.08], // PALENCIA
  ['35', 27.753, 29.149, -15.796, -13.465], // PALMAS (LAS)
  ['36', 41.911, 42.793, -8.884, -7.942], // PONTEVEDRA
  ['37', 40.341, 41.236, -6.825, -5.201], // SALAMANCA
  ['38', 27.705, 28.832, -18.012, -16.209], // SANTA CRUZ DE TENERIFE
  ['39', 42.805, 43.485, -4.606, -3.155], // CANTABRIA
  ['40', 40.713, 41.44, -4.699, -3.384], // SEGOVIA
  ['41', 36.853, 38.09, -6.324, -4.678], // SEVILLA
  ['42', 41.169, 42.028, -3.193, -1.926], // SORIA
  ['43', 40.533, 41.539, 0.284, 1.624], // TARRAGONA
  ['44', 40.063, 41.22, -1.652, 0.193], // TERUEL
  ['45', 39.354, 40.245, -5.333, -2.99], // TOLEDO
  ['46', 38.736, 40.127, -1.437, -0.073], // VALENCIA / VALÈNCIA
  ['47', 41.18, 42.161, -5.331, -4.114], // VALLADOLID
  ['48', 42.987, 43.42, -3.356, -2.496], // BIZKAIA
  ['49', 41.171, 42.089, -6.838, -5.318], // ZAMORA
  ['50', 41.117, 42.491, -2.123, 0.251], // ZARAGOZA
  ['51', 35.88, 35.895, -5.337, -5.301], // CEUTA
  ['52', 35.27, 35.297, -2.948, -2.935], // MELILLA
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
