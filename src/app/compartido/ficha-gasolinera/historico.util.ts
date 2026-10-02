/**
 * Lógica del histórico de precios que no necesita navegador: recortar la serie a un rango,
 * resumirla y convertirla en la geometría del gráfico.
 *
 * El componente solo pinta lo que sale de aquí, igual que el mapa con `mapa.util.ts`.
 */

/** Precios en milésimas de euro, alineados con el array de fechas. `null` donde no hay dato. */
export type Serie = readonly (number | null)[];

/** Lo que devuelve `historico/{IDEESS}.json`: un array de precios por idProducto. */
export type HistoricoEstacion = Record<string, Serie>;

export interface PuntoSerie {
  fecha: string;
  /** En euros, ya convertido desde las milésimas en que viaja. */
  precio: number;
}

export const RANGOS = [
  { clave: 'mes', etiqueta: '1 mes', dias: 30 },
  { clave: 'ano', etiqueta: '1 año', dias: 365 },
  { clave: 'todo', etiqueta: 'Todo', dias: Number.POSITIVE_INFINITY }
] as const;

export type ClaveRango = (typeof RANGOS)[number]['clave'];

/**
 * Cruza fechas y precios descartando los huecos. Las milésimas pasan a euros aquí, en un solo
 * sitio, para que el resto trabaje siempre con la misma unidad.
 */
export function puntosDe(fechas: readonly string[], serie: Serie | undefined): PuntoSerie[] {
  if (!serie) {
    return [];
  }
  const puntos: PuntoSerie[] = [];
  for (const [indice, milesimas] of serie.entries()) {
    if (milesimas === null || milesimas === undefined || fechas[indice] === undefined) {
      continue;
    }
    puntos.push({ fecha: fechas[indice], precio: milesimas / 1000 });
  }
  return puntos;
}

/**
 * Se queda con los puntos de los últimos `dias` contados desde el más reciente de la serie, no
 * desde hoy: si la recolección se quedó atrás, el rango seguiría teniendo sentido.
 */
export function recortarA(puntos: readonly PuntoSerie[], dias: number): PuntoSerie[] {
  if (puntos.length === 0 || !Number.isFinite(dias)) {
    return [...puntos];
  }
  const ultimo = Date.parse(`${puntos[puntos.length - 1].fecha}T00:00:00Z`);
  const limite = ultimo - dias * 86_400_000;
  return puntos.filter(p => Date.parse(`${p.fecha}T00:00:00Z`) >= limite);
}

export interface ResumenSerie {
  actual: number;
  minimo: number;
  maximo: number;
  /** Precio del punto más próximo a hace siete días, o null si la serie no llega. */
  haceUnaSemana: number | null;
  /** Diferencia respecto a hace una semana, en euros. Positiva si ha subido. */
  diferencia: number | null;
}

export function resumirSerie(puntos: readonly PuntoSerie[]): ResumenSerie | null {
  if (puntos.length === 0) {
    return null;
  }
  const precios = puntos.map(p => p.precio);
  const actual = precios[precios.length - 1];
  const referencia = precioHaceDias(puntos, 7);

  return {
    actual,
    minimo: Math.min(...precios),
    maximo: Math.max(...precios),
    haceUnaSemana: referencia,
    // Se redondea a milésimas: restar flotantes deja 0,019999999999999574.
    diferencia: referencia === null ? null : Math.round((actual - referencia) * 1000) / 1000
  };
}

/**
 * El punto más cercano a `dias` atrás, siempre que no se desvíe más de la mitad de la ventana:
 * en una serie de dos días, el dato de ayer no es «hace una semana» y decirlo engañaría.
 */
function precioHaceDias(puntos: readonly PuntoSerie[], dias: number): number | null {
  if (puntos.length < 2) {
    return null;
  }
  const ultimo = Date.parse(`${puntos[puntos.length - 1].fecha}T00:00:00Z`);
  const objetivo = ultimo - dias * 86_400_000;
  let mejor: PuntoSerie | null = null;
  let mejorDistancia = Number.POSITIVE_INFINITY;

  for (const punto of puntos.slice(0, -1)) {
    const distancia = Math.abs(Date.parse(`${punto.fecha}T00:00:00Z`) - objetivo);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = punto;
    }
  }
  return mejorDistancia <= (dias / 2) * 86_400_000 ? (mejor?.precio ?? null) : null;
}

export interface Trazado {
  /** Atributo `d` de la polilínea. */
  linea: string;
  /** El mismo trazado cerrado contra la base, para el relleno bajo la línea. */
  area: string;
  /** Líneas y etiquetas del eje de precios. */
  guias: { y: number; precio: number }[];
  /**
   * Fechas a rotular en el eje horizontal, con la etiqueta formateada y el borde al que se
   * anclan: centrar las tres sacaba la primera y la última fuera del área.
   */
  marcas: { x: number; fecha: string; etiqueta: string; anclaje: Anclaje }[];
  /** Coordenadas de cada punto, para poder señalarlos con el puntero o el teclado. */
  vertices: Vertice[];
  ancho: number;
  alto: number;
}

export type Anclaje = 'start' | 'middle' | 'end';

export interface Vertice {
  x: number;
  y: number;
  fecha: string;
  precio: number;
}

const MARGEN = { arriba: 8, derecha: 4, abajo: 18, izquierda: 38 } as const;

/**
 * Convierte los puntos en coordenadas del `viewBox`. El SVG se escala con CSS, así que las
 * dimensiones son fijas y no hace falta medir el DOM.
 */
export function trazar(
  puntos: readonly PuntoSerie[],
  ancho = 320,
  alto = 140,
  guias = 3
): Trazado | null {
  if (puntos.length === 0) {
    return null;
  }

  const precios = puntos.map(p => p.precio);
  let minimo = Math.min(...precios);
  let maximo = Math.max(...precios);
  if (maximo === minimo) {
    // Una serie plana dejaría la línea pegada al borde y dividiría por cero.
    minimo -= 0.01;
    maximo += 0.01;
  }

  const utilAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
  const utilAlto = alto - MARGEN.arriba - MARGEN.abajo;

  // El eje horizontal va por tiempo, no por posición en el array: la serie es diaria en los
  // últimos 90 días y semanal hacia atrás, así que repartir los puntos a espacios iguales
  // dedicaría media anchura a tres meses y la otra media a dos años. La curva mentiría.
  const instantes = puntos.map(p => Date.parse(`${p.fecha}T00:00:00Z`));
  const primero = instantes[0];
  const ultimo = instantes[instantes.length - 1];
  const lapso = ultimo - primero;
  const x = (indice: number) =>
    MARGEN.izquierda + (lapso === 0 ? utilAncho / 2 : ((instantes[indice] - primero) / lapso) * utilAncho);
  const y = (precio: number) =>
    MARGEN.arriba + utilAlto - ((precio - minimo) / (maximo - minimo)) * utilAlto;

  const vertices: Vertice[] = puntos.map((punto, indice) => ({
    x: redondear(x(indice)),
    y: redondear(y(punto.precio)),
    fecha: punto.fecha,
    precio: punto.precio
  }));
  const linea = `M${vertices.map(v => `${v.x},${v.y}`).join('L')}`;
  const base = redondear(MARGEN.arriba + utilAlto);
  const area = `${linea}L${redondear(x(puntos.length - 1))},${base}L${redondear(x(0))},${base}Z`;

  return {
    linea,
    area,
    guias: Array.from({ length: guias }, (_, i) => {
      const precio = minimo + ((maximo - minimo) * i) / (guias - 1);
      return { y: redondear(y(precio)), precio };
    }),
    marcas: marcasDe(puntos, x),
    vertices,
    ancho,
    alto
  };
}

/**
 * Primera, última y la del medio: con 194 puntos, rotularlas todas no cabe.
 *
 * La etiqueta se formatea aquí con `Intl`, que es nativo: usar `DatePipe` en la plantilla metía
 * el formateador de fechas de Angular en el paquete inicial (10,7 kB) aunque la ficha sea
 * diferida.
 */
function marcasDe(
  puntos: readonly PuntoSerie[],
  x: (indice: number) => number
): { x: number; fecha: string; etiqueta: string; anclaje: Anclaje }[] {
  const indices = puntos.length < 3
    ? puntos.map((_, i) => i)
    : [0, indiceDelMedio(puntos), puntos.length - 1];

  // Con dos años en pantalla, «4 oct» tres veces no dice nada: hace falta el año. Con un mes,
  // el año sobra y el día es lo único que distingue una marca de otra.
  const lapsoDias =
    (Date.parse(`${puntos[puntos.length - 1].fecha}T00:00:00Z`) -
      Date.parse(`${puntos[0].fecha}T00:00:00Z`)) / 86_400_000;
  const formatear = lapsoDias > 300 ? comoMesYAno : comoDiaYMes;

  return indices.map((indice, posicion) => ({
    x: redondear(x(indice)),
    fecha: puntos[indice].fecha,
    etiqueta: formatear(puntos[indice].fecha),
    // La primera se ancla al principio y la última al final: centradas, la de la izquierda
    // pisaba la etiqueta del eje de precios y la de la derecha se salía del área.
    anclaje: anclajeDe(posicion, indices.length)
  }));
}

function anclajeDe(posicion: number, total: number): Anclaje {
  if (posicion === 0) {
    return total === 1 ? 'middle' : 'start';
  }
  return posicion === total - 1 ? 'end' : 'middle';
}

/** El punto más próximo a la mitad del periodo, para que la marca caiga donde la pinta el eje. */
function indiceDelMedio(puntos: readonly PuntoSerie[]): number {
  const instantes = puntos.map(p => Date.parse(`${p.fecha}T00:00:00Z`));
  const medio = (instantes[0] + instantes[instantes.length - 1]) / 2;
  let mejor = 0;
  let mejorDistancia = Number.POSITIVE_INFINITY;

  for (const [indice, instante] of instantes.entries()) {
    const distancia = Math.abs(instante - medio);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = indice;
    }
  }
  return mejor;
}

const FORMATO_DIA_MES = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
});

/**
 * Vértice más cercano a una posición horizontal. Es lo que convierte el gesto del usuario
 * —puntero o dedo— en un día concreto de la serie.
 */
export function indiceEnX(vertices: readonly Vertice[], x: number): number | null {
  if (vertices.length === 0) {
    return null;
  }
  let mejor = 0;
  let mejorDistancia = Number.POSITIVE_INFINITY;

  for (const [indice, vertice] of vertices.entries()) {
    const distancia = Math.abs(vertice.x - x);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = indice;
    }
  }
  return mejor;
}

/**
 * Coloca el recuadro del precio centrado sobre el punto, pero sin salirse por los lados. Con la
 * serie completa, los puntos interesantes caen a menudo en el borde derecho.
 */
export function cajaDeAviso(x: number, anchoCaja: number, anchoSvg: number, margen = 2): number {
  const centrada = x - anchoCaja / 2;
  const maximo = anchoSvg - anchoCaja - margen;
  if (maximo < margen) {
    // El recuadro no cabe: se pega al margen izquierdo en lugar de salirse por los dos lados.
    return margen;
  }
  return Math.min(Math.max(centrada, margen), maximo);
}

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

/** «2026-09-15» -> «15 sept 2026», para el recuadro del día señalado. */
export function comoFechaLarga(iso: string): string {
  return formatear(iso, FORMATO_FECHA_LARGA);
}

const FORMATO_MES_ANO = new Intl.DateTimeFormat('es-ES', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

/** «2026-09-15» -> «15 sept». */
export function comoDiaYMes(iso: string): string {
  return formatear(iso, FORMATO_DIA_MES);
}

/** «2026-09-15» -> «sept 2026», para series que abarcan más de un año. */
export function comoMesYAno(iso: string): string {
  return formatear(iso, FORMATO_MES_ANO);
}

function formatear(iso: string, formato: Intl.DateTimeFormat): string {
  const fecha = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? iso : formato.format(fecha).replace('.', '');
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
