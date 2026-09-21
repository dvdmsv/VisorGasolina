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
