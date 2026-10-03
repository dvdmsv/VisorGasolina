import { describe, expect, it } from 'vitest';
import {
  ATRIBUCION,
  TESELAS,
  agruparPorCercania,
  claseDePrecio,
  claseDelTema,
  claveDe,
  encuadreDe
} from './mapa.util';
import { Gasolinera } from '../../clases/gasolinera';

function gasolinera(latitud: number, longitud: number, precio = 1.5): Gasolinera {
  return {
    rotulo: 'Prueba',
    localidad: 'Madrid',
    provincia: 'Madrid',
    direccion: 'Calle de prueba 1',
    precio,
    latitud,
    longitud,
    gasolina: 'Precio Gasoleo A'
  };
}

describe('teselas', () => {
  it('se piden a OpenStreetMap por https', () => {
    // Si cambiara el dominio habría que tocar también la CSP de netlify.toml.
    expect(TESELAS).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('la atribución exigida por la licencia va en el mapa', () => {
    expect(ATRIBUCION).toContain('OpenStreetMap');
    expect(ATRIBUCION).toContain('openstreetmap.org/copyright');
  });
});

describe('claseDelTema', () => {
  it('marca el mapa para oscurecerlo solo con el tema oscuro', () => {
    // OpenStreetMap no tiene mapa oscuro: se invierte con CSS en el navegador.
    expect(claseDelTema(true)).toBe('mapa-oscuro');
    expect(claseDelTema(false)).toBe('');
  });
});

describe('claseDePrecio', () => {
  it('marca en verde lo que está en la media o por debajo', () => {
    expect(claseDePrecio(1.4, 1.5)).toBe('precio-bajo');
    expect(claseDePrecio(1.5, 1.5)).toBe('precio-bajo');
  });

  it('marca en rojo lo que está por encima', () => {
    expect(claseDePrecio(1.6, 1.5)).toBe('precio-alto');
  });
});

describe('encuadreDe', () => {
  it('cubre todas las gasolineras', () => {
    const encuadre = encuadreDe([gasolinera(40, -3), gasolinera(41, -2)], 0);

    expect(encuadre).toEqual({ suroeste: [40, -3], noreste: [41, -2] });
  });

  it('deja un margen para que ninguna quede pegada al borde', () => {
    const encuadre = encuadreDe([gasolinera(40, -3)], 0.01);

    expect(encuadre!.suroeste[0]).toBeLessThan(40);
    expect(encuadre!.noreste[0]).toBeGreaterThan(40);
  });

  it('con una sola gasolinera devuelve un rectángulo válido alrededor', () => {
    const encuadre = encuadreDe([gasolinera(41.76, -2.46)])!;

    expect(encuadre.suroeste[0]).toBeLessThan(encuadre.noreste[0]);
    expect(encuadre.suroeste[1]).toBeLessThan(encuadre.noreste[1]);
  });

  it('sin gasolineras no hay nada que encuadrar', () => {
    expect(encuadreDe([])).toBeNull();
  });

  it('funciona con coordenadas negativas y positivas a la vez', () => {
    const encuadre = encuadreDe([gasolinera(39.5, 2.6), gasolinera(40.4, -3.7)], 0)!;

    expect(encuadre.suroeste).toEqual([39.5, -3.7]);
    expect(encuadre.noreste).toEqual([40.4, 2.6]);
  });
});

describe('claveDe', () => {
  it('identifica cada gasolinera por su posición', () => {
    expect(claveDe(gasolinera(40.1, -3.7))).toBe('40.1|-3.7');
    expect(claveDe(gasolinera(40.1, -3.9))).not.toBe(claveDe(gasolinera(40.1, -3.7)));
  });
});

const base = gasolinera(40, -3);

describe('agruparPorCercania', () => {
  const estacion = (rotulo: string, precio: number, x: number, y: number) => ({
    gasolinera: { ...base, rotulo, precio } as Gasolinera,
    punto: { x, y }
  });

  function agrupar(entradas: ReturnType<typeof estacion>[], radio?: number) {
    const puntos = new Map(entradas.map(e => [e.gasolinera.rotulo, e.punto]));
    return agruparPorCercania(
      entradas.map(e => e.gasolinera),
      g => puntos.get(g.rotulo)!,
      radio
    );
  }

  it('deja sueltas las que están lejos', () => {
    const grupos = agrupar([estacion('A', 1.5, 0, 0), estacion('B', 1.6, 500, 500)]);

    expect(grupos).toHaveLength(2);
  });

  // En un área de servicio salían cuatro etiquetas encima de la otra y solo se leía una.
  it('junta las que se taparían en pantalla', () => {
    const grupos = agrupar([
      estacion('A', 1.5, 100, 100),
      estacion('B', 1.6, 110, 105),
      estacion('C', 1.7, 95, 98)
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].gasolineras).toHaveLength(3);
  });

  it('pone la más barata al frente del grupo', () => {
    const grupos = agrupar([
      estacion('cara', 1.9, 100, 100),
      estacion('barata', 1.4, 105, 102)
    ]);

    expect(grupos[0].gasolineras[0].rotulo).toBe('barata');
  });

  it('respeta el radio que se le pide', () => {
    const entradas = [estacion('A', 1.5, 0, 0), estacion('B', 1.6, 40, 0)];

    expect(agrupar(entradas, 10)).toHaveLength(2);
    expect(agrupar(entradas, 50)).toHaveLength(1);
  });

  it('con una lista vacía no devuelve nada', () => {
    expect(agrupar([])).toEqual([]);
  });
});
