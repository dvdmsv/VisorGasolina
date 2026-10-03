import { describe, expect, it } from 'vitest';
import { RADIOS_KM, RADIO_POR_DEFECTO, margenEnGrados, radioValido } from './radio';

describe('margenEnGrados', () => {
  it('en latitud no depende de dónde se esté', () => {
    expect(margenEnGrados(20, 28).latitud).toBeCloseTo(margenEnGrados(20, 43).latitud, 10);
  });

  // Un grado de longitud mide 111 km por el coseno de la latitud. Con un margen fijo de 0,25°,
  // en Madrid se cubrían 28 km hacia el norte pero solo 21 hacia el este.
  it('en longitud abarca más grados que en latitud, porque un grado de longitud mide menos', () => {
    const madrid = margenEnGrados(20, 40.4);

    expect(madrid.longitud).toBeGreaterThan(madrid.latitud);
  });

  it('cubre de verdad el radio en los dos ejes, con algo de holgura', () => {
    const latitud = 40.4;
    const margen = margenEnGrados(50, latitud);
    const kmNorte = margen.latitud * 111.32;
    const kmEste = margen.longitud * 111.32 * Math.cos((latitud * Math.PI) / 180);

    expect(kmNorte).toBeGreaterThanOrEqual(50);
    expect(kmEste).toBeGreaterThanOrEqual(50);
    expect(kmEste).toBeLessThan(55);
  });

  it('crece con el radio', () => {
    expect(margenEnGrados(50, 40).longitud).toBeGreaterThan(margenEnGrados(5, 40).longitud);
  });
});

describe('radioValido', () => {
  it('acepta las opciones que se ofrecen, como número o como texto guardado', () => {
    for (const radio of RADIOS_KM) {
      expect(radioValido(radio)).toBe(radio);
      expect(radioValido(String(radio))).toBe(radio);
    }
  });

  // Lo que llega de localStorage puede ser cualquier cosa.
  it('vuelve al de defecto con un valor desconocido, vacío o manipulado', () => {
    expect(radioValido('')).toBe(RADIO_POR_DEFECTO);
    expect(radioValido(null)).toBe(RADIO_POR_DEFECTO);
    expect(radioValido('17')).toBe(RADIO_POR_DEFECTO);
    expect(radioValido('mucho')).toBe(RADIO_POR_DEFECTO);
    expect(radioValido(9999)).toBe(RADIO_POR_DEFECTO);
  });

  it('por defecto sigue siendo 20 km, el radio que había antes de poder elegirlo', () => {
    expect(RADIO_POR_DEFECTO).toBe(20);
  });
});
