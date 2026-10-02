import { Gasolinera } from '../../clases/gasolinera';

/** Coordenadas de un punto, en el orden que espera Leaflet. */
export type Punto = [number, number];

export interface Encuadre {
  suroeste: Punto;
  noreste: Punto;
}

/**
 * Teselas de OpenStreetMap. Es el único proveedor serio que funciona sin registrarse: CARTO
 * y Wikimedia devuelven un aviso o un 403 si no eres cliente suyo.
 *
 * No hay versión oscura, así que el tema oscuro se consigue invirtiendo los colores con CSS
 * en el propio navegador (ver `.tema-oscuro` en la hoja del componente). Así el mapa sigue
 * pidiendo imágenes a un único dominio, que es el que abre la CSP.
 */
export const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** La licencia de OpenStreetMap exige que esta atribución esté visible en el mapa. */
export const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** Centro de España, por si hubiera que dibujar un mapa sin ninguna gasolinera. */
export const CENTRO_ESPANA: Punto = [40.4, -3.7];

/** Clase que oscurece el mapa invirtiendo las teselas, sin cambiar de proveedor. */
export function claseDelTema(esOscuro: boolean): string {
  return esOscuro ? 'mapa-oscuro' : '';
}

/**
 * Clase de color del precio, la misma que usa la lista: verde por debajo de la media de la
 * zona y rojo por encima.
 */
export function claseDePrecio(precio: number, precioMedio: number): string {
  return precio <= precioMedio ? 'precio-bajo' : 'precio-alto';
}

/**
 * Rectángulo que cubre todas las gasolineras, con un margen para que ninguna quede pegada
 * al borde. Devuelve null si no hay ninguna.
 */
export function encuadreDe(gasolineras: readonly Gasolinera[], margen = 0.01): Encuadre | null {
  if (gasolineras.length === 0) {
    return null;
  }

  const latitudes = gasolineras.map(g => g.latitud);
  const longitudes = gasolineras.map(g => g.longitud);

  return {
    suroeste: [Math.min(...latitudes) - margen, Math.min(...longitudes) - margen],
    noreste: [Math.max(...latitudes) + margen, Math.max(...longitudes) + margen]
  };
}

/** Identifica una gasolinera por su posición, igual que hace FavoritosService. */
export function claveDe(gasolinera: Gasolinera): string {
  return `${gasolinera.latitud}|${gasolinera.longitud}`;
}
