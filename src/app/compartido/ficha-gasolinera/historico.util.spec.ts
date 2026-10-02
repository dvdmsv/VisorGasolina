import { describe, expect, it } from 'vitest';
import { comoDiaYMes, comoMesYAno, puntosDe, recortarA, resumirSerie, trazar } from './historico.util';

const fechas = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'];

describe('puntosDe', () => {
  it('convierte las milésimas de la API en euros', () => {
    expect(puntosDe(['2026-09-01'], [1739])).toEqual([{ fecha: '2026-09-01', precio: 1.739 }]);
  });

  it('descarta los huecos sin desalinear las fechas', () => {
    const puntos = puntosDe(fechas, [1700, null, 1720, null, 1740]);

    expect(puntos.map(p => p.fecha)).toEqual(['2026-09-01', '2026-09-15', '2026-09-29']);
    expect(puntos.map(p => p.precio)).toEqual([1.7, 1.72, 1.74]);
  });

  // Una estación que no sirve un combustible no tiene ese array.
  it('devuelve una serie vacía si el combustible no existe', () => {
    expect(puntosDe(fechas, undefined)).toEqual([]);
  });
});

describe('recortarA', () => {
  const puntos = puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]);

  // Cuenta desde el último dato, no desde hoy: si la recolección se queda atrás, el rango
  // seguiría teniendo sentido.
  it('cuenta los días desde el punto más reciente de la serie', () => {
    expect(recortarA(puntos, 14).map(p => p.fecha)).toEqual([
      '2026-09-15',
      '2026-09-22',
      '2026-09-29'
    ]);
  });

  it('con «Todo» devuelve la serie entera', () => {
    expect(recortarA(puntos, Number.POSITIVE_INFINITY)).toHaveLength(5);
  });

  it('aguanta una serie vacía', () => {
    expect(recortarA([], 30)).toEqual([]);
  });
});

describe('resumirSerie', () => {
  it('resume el precio actual, el rango y el cambio semanal', () => {
    const resumen = resumirSerie(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]));

    expect(resumen).toMatchObject({ actual: 1.74, minimo: 1.7, maximo: 1.74, haceUnaSemana: 1.73 });
  });

  // Restar flotantes da 0,009999999999999787, que se vería en pantalla.
  it('redondea la diferencia a milésimas', () => {
    expect(resumirSerie(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]))?.diferencia).toBe(0.01);
  });

  it('marca la diferencia como desconocida si la serie no llega a una semana', () => {
    const resumen = resumirSerie(puntosDe(['2026-09-28', '2026-09-29'], [1700, 1710]));

    expect(resumen?.diferencia).toBeNull();
  });

  it('devuelve null si no hay datos', () => {
    expect(resumirSerie([])).toBeNull();
  });
});

describe('trazar', () => {
  it('no traza nada si la serie está vacía', () => {
    expect(trazar([])).toBeNull();
  });

  it('empieza la línea a la izquierda y la acaba a la derecha', () => {
    const trazado = trazar(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]), 320, 140);
    const coordenadas = trazado!.linea.slice(1).split('L').map(p => p.split(',').map(Number));

    expect(coordenadas[0][0]).toBe(38);
    expect(coordenadas.at(-1)![0]).toBe(316);
  });

  it('pone el precio más alto arriba y el más bajo abajo', () => {
    const trazado = trazar(puntosDe(fechas, [1740, 1710, 1720, 1730, 1700]), 320, 140);
    const ys = trazado!.linea.slice(1).split('L').map(p => Number(p.split(',')[1]));

    expect(ys[0]).toBeLessThan(ys.at(-1)!);
  });

  // Sin este caso la escala divide por cero y el path sale con NaN.
  it('separa los extremos cuando todos los precios son iguales', () => {
    const trazado = trazar(puntosDe(fechas, [1700, 1700, 1700, 1700, 1700]));

    expect(trazado!.linea).not.toContain('NaN');
    expect(trazado!.guias[0].precio).toBeLessThan(trazado!.guias.at(-1)!.precio);
  });

  it('cierra el área contra la base para poder rellenarla', () => {
    const trazado = trazar(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]));

    expect(trazado!.area.endsWith('Z')).toBe(true);
  });

  it('rotula tres fechas: la primera, la del medio y la última', () => {
    const trazado = trazar(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]));

    expect(trazado!.marcas.map(m => m.fecha)).toEqual(['2026-09-01', '2026-09-15', '2026-09-29']);
  });

  // La serie es diaria en los últimos 90 días y semanal hacia atrás. Repartiendo los puntos a
  // espacios iguales, tres meses ocupaban media anchura y dos años la otra media: el gráfico
  // daba a entender una subida repentina que no existía.
  it('reparte el eje horizontal por tiempo, no por posición en el array', () => {
    // Dos puntos separados un año y un tercero al día siguiente del segundo.
    const irregulares = puntosDe(['2024-01-01', '2025-01-01', '2025-01-02'], [1700, 1800, 1810]);
    const xs = trazar(irregulares, 320, 140)!.linea.slice(1).split('L').map(p => Number(p.split(',')[0]));

    const primerTramo = xs[1] - xs[0];
    const segundoTramo = xs[2] - xs[1];

    expect(primerTramo).toBeGreaterThan(segundoTramo * 100);
  });

  it('rotula en el medio el punto más cercano a la mitad del periodo', () => {
    // La mitad del periodo es el 2 de julio. El punto central del array sería el 1 de febrero,
    // pero el que cae donde el eje lo pinta es el 1 de marzo.
    const irregulares = puntosDe(
      ['2024-01-01', '2024-02-01', '2024-03-01', '2025-01-01'],
      [1700, 1750, 1800, 1850]
    );

    expect(trazar(irregulares)!.marcas[1].fecha).toBe('2024-03-01');
  });

  it('deja la etiqueta de la fecha ya formateada en español', () => {
    const trazado = trazar(puntosDe(fechas, [1700, 1710, 1720, 1730, 1740]));

    expect(trazado!.marcas.map(m => m.etiqueta)).toEqual(['1 sept', '15 sept', '29 sept']);
  });

  // Con dos años en pantalla, las tres marcas salían como «4 oct», «3 oct» y «1 oct»: el mismo
  // texto para tres años distintos.
  it('pone el año en las marcas cuando la serie abarca más de un año', () => {
    const largo = puntosDe(['2024-10-04', '2025-10-03', '2026-10-01'], [1700, 1750, 1800]);

    expect(trazar(largo)!.marcas.map(m => m.etiqueta)).toEqual(['oct 2024', 'oct 2025', 'oct 2026']);
  });

  it('se queda en el día y el mes cuando la serie es corta', () => {
    const corto = puntosDe(['2026-09-01', '2026-09-15', '2026-09-29'], [1700, 1750, 1800]);

    expect(trazar(corto)!.marcas.map(m => m.etiqueta)).toEqual(['1 sept', '15 sept', '29 sept']);
  });

  it('centra el único punto de una serie de uno', () => {
    const trazado = trazar(puntosDe(['2026-09-01'], [1700]), 320, 140);

    expect(trazado!.marcas).toHaveLength(1);
    expect(trazado!.linea).not.toContain('NaN');
  });
});

// Se formatea con Intl en lugar de DatePipe: el pipe de Angular metía su formateador de fechas
// en el paquete inicial (10,7 kB) aunque la ficha se cargue bajo demanda.
describe('comoDiaYMes', () => {
  it('escribe el día y el mes abreviado sin punto', () => {
    expect(comoDiaYMes('2026-01-07')).toBe('7 ene');
  });

  // Sin fijar la zona a UTC, en España «2026-01-01T00:00:00» cae en el 31 de diciembre.
  it('no se desplaza un día por la zona horaria', () => {
    expect(comoDiaYMes('2026-01-01')).toBe('1 ene');
  });

  it('devuelve la cadena tal cual si no es una fecha', () => {
    expect(comoDiaYMes('vaya')).toBe('vaya');
  });
});

describe('comoMesYAno', () => {
  it('escribe el mes abreviado y el año', () => {
    expect(comoMesYAno('2024-10-04')).toBe('oct 2024');
  });
});
