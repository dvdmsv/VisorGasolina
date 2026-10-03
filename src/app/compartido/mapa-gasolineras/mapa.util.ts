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

export interface GrupoDeMarcadores {
  /** Gasolineras que caen tan juntas que sus etiquetas se taparían, la más barata primera. */
  gasolineras: Gasolinera[];
  /** Centro del grupo en píxeles de pantalla, donde se dibuja el marcador. */
  x: number;
  y: number;
}

/**
 * Junta las gasolineras cuyas etiquetas se solaparían al zoom actual.
 *
 * Sin esto, en una misma área de servicio o en un polígono industrial salen cuatro etiquetas
 * encima de la otra y solo se lee la de arriba. Se agrupa en píxeles y no en grados porque lo
 * que importa es si se tapan en pantalla, y eso depende del zoom.
 *
 * `proyectar` traduce cada gasolinera a coordenadas de pantalla; se pasa como parámetro para
 * poder probar esto sin Leaflet.
 */
export function agruparPorCercania(
  gasolineras: readonly Gasolinera[],
  proyectar: (gasolinera: Gasolinera) => { x: number; y: number },
  radio = 28
): GrupoDeMarcadores[] {
  const grupos: GrupoDeMarcadores[] = [];
  // De más barata a más cara: así la que encabeza cada grupo es la que interesa.
  const ordenadas = [...gasolineras].sort((a, b) => a.precio - b.precio);

  for (const gasolinera of ordenadas) {
    const punto = proyectar(gasolinera);
    const grupo = grupos.find(
      g => Math.hypot(g.x - punto.x, g.y - punto.y) <= radio
    );

    if (grupo) {
      grupo.gasolineras.push(gasolinera);
    } else {
      grupos.push({ gasolineras: [gasolinera], x: punto.x, y: punto.y });
    }
  }
  return grupos;
}
