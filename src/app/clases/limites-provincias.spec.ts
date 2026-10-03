import { describe, expect, it } from 'vitest';
import { provinciasCercanas } from './limites-provincias';

/**
 * La tabla la genera scripts/generar-limites-provincias.mjs desde los datos del Ministerio.
 * Estos casos comprueban que sirve para lo que se usa: decidir qué provincias hay que pedir
 * para buscar gasolineras en 20 km a la redonda.
 */
describe('provinciasCercanas', () => {
  it('en el centro de Madrid propone Madrid y Toledo', () => {
    // Plaza Mayor: el límite con Toledo está a menos de 25 km.
    expect(provinciasCercanas(40.4155, -3.7074).sort()).toEqual(['28', '45']);
  });

  it('en una isla propone solo su provincia', () => {
    expect(provinciasCercanas(39.5696, 2.6502)).toEqual(['07']); // Palma
    expect(provinciasCercanas(28.1235, -15.4363)).toEqual(['35']); // Las Palmas
  });

  it('cerca de varios límites propone todas las provincias implicadas', () => {
    const cercaDeSoria = provinciasCercanas(41.7636, -2.4649);

    expect(cercaDeSoria).toContain('42'); // Soria
    expect(cercaDeSoria.length).toBeGreaterThan(1);
    expect(cercaDeSoria.length).toBeLessThanOrEqual(5);
  });

  it('en una capital alejada de límites propone una sola provincia', () => {
    expect(provinciasCercanas(41.3874, 2.1686)).toEqual(['08']); // Barcelona
    expect(provinciasCercanas(43.3623, -8.4115)).toEqual(['15']); // A Coruña
  });

  it('fuera de España no propone ninguna', () => {
    expect(provinciasCercanas(48.8566, 2.3522)).toEqual([]); // París
    expect(provinciasCercanas(0, 0)).toEqual([]);
    expect(provinciasCercanas(51.5, -0.12)).toEqual([]); // Londres
  });

  it('nunca propone tantas provincias como para no ahorrar nada', () => {
    // Si un rectángulo estuviera mal, saldrían muchas provincias y volveríamos a descargar
    // media España. Se comprueba en una rejilla de puntos por todo el país.
    for (let lat = 36.5; lat <= 43.5; lat += 0.5) {
      for (let lon = -9; lon <= 3; lon += 0.5) {
        expect(provinciasCercanas(lat, lon).length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('provinciasCercanas con radio', () => {
  // Plaza Mayor de Madrid.
  const madrid = [40.4155, -3.7074] as const;

  it('con un radio pequeño se queda en la provincia propia', () => {
    expect(provinciasCercanas(...madrid, 5)).toEqual(['28']);
  });

  it('al ampliar el radio entran las provincias vecinas', () => {
    expect(provinciasCercanas(...madrid, 50).length).toBeGreaterThan(provinciasCercanas(...madrid, 5).length);
  });

  // Ampliar el radio nunca puede hacer que desaparezca una provincia que ya estaba.
  it('cada radio incluye todas las provincias del radio anterior', () => {
    const radios = [5, 10, 20, 30, 50];
    for (let i = 1; i < radios.length; i++) {
      const menor = provinciasCercanas(...madrid, radios[i - 1]);
      const mayor = provinciasCercanas(...madrid, radios[i]);
      for (const provincia of menor) {
        expect(mayor).toContain(provincia);
      }
    }
  });

  it('sin radio usa los 20 km de siempre', () => {
    expect(provinciasCercanas(...madrid)).toEqual(provinciasCercanas(...madrid, 20));
  });

  it('ni con el radio máximo propone nada fuera de España', () => {
    expect(provinciasCercanas(48.8566, 2.3522, 50)).toEqual([]); // París
  });
});
