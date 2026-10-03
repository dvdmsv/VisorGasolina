/**
 * Radio de la búsqueda «cerca de mí» y su traducción a grados.
 *
 * El radio no se puede pasar a grados con una constante: un grado de latitud mide siempre unos
 * 111 km, pero uno de longitud mide 111 km por el coseno de la latitud, unos 85 km en Madrid y
 * 95 km en Canarias. Con un margen fijo de 0,25° la búsqueda cubría unos 28 km hacia el norte
 * pero solo 21 km hacia el este, justo por encima de los 20 km de entonces; con un radio mayor se
 * habrían perdido en silencio las gasolineras del otro lado de un límite provincial.
 */

/** Opciones que se ofrecen. 50 km cubre un desvío razonable en carretera. */
export const RADIOS_KM = [5, 10, 20, 30, 50] as const;

export type RadioKm = (typeof RADIOS_KM)[number];

export const RADIO_POR_DEFECTO: RadioKm = 20;

const KM_POR_GRADO_LATITUD = 111.32;

/**
 * Holgura sobre el radio exacto. La distancia se calcula con haversine sobre una esfera y los
 * límites con un rectángulo plano; un 5 % evita perder una estación justo en el borde por
 * redondeos.
 */
const HOLGURA = 1.05;

export interface MargenEnGrados {
  latitud: number;
  longitud: number;
}

/** Cuántos grados abarca el radio en cada eje, a una latitud dada. */
export function margenEnGrados(radioKm: number, latitud: number): MargenEnGrados {
  const kmPorGradoLongitud = KM_POR_GRADO_LATITUD * Math.cos((latitud * Math.PI) / 180);
  return {
    latitud: (radioKm / KM_POR_GRADO_LATITUD) * HOLGURA,
    longitud: (radioKm / kmPorGradoLongitud) * HOLGURA
  };
}

/** Lee el radio guardado; cualquier valor que no sea una de las opciones vuelve al de defecto. */
export function radioValido(valor: string | number | null | undefined): RadioKm {
  const numero = Number(valor);
  return (RADIOS_KM as readonly number[]).includes(numero) ? (numero as RadioKm) : RADIO_POR_DEFECTO;
}
