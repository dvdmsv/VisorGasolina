import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { UbicacionService } from './ubicacion.service';
import { Gasolinera } from '../clases/gasolinera';

function gasolinera(rotulo: string, precio: number, distancia: number): Gasolinera {
  return {
    rotulo,
    localidad: 'Madrid',
    provincia: 'MADRID',
    direccion: 'Calle de prueba 1',
    precio,
    latitud: 40,
    longitud: -3,
    gasolina: 'Precio Gasoleo A',
    distancia
  };
}

describe('UbicacionService', () => {
  let servicio: UbicacionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    servicio = TestBed.inject(UbicacionService);
  });

  describe('calcularDistancia', () => {
    it('devuelve cero entre un punto y sí mismo', () => {
      expect(servicio.calcularDistancia(40.4168, -3.7038, 40.4168, -3.7038)).toBe(0);
    });

    it('calcula la distancia entre Madrid y Barcelona (unos 505 km)', () => {
      const km = servicio.calcularDistancia(40.4168, -3.7038, 41.3874, 2.1686);
      expect(km).toBeGreaterThan(495);
      expect(km).toBeLessThan(515);
    });

    it('es simétrica', () => {
      const ida = servicio.calcularDistancia(40.4168, -3.7038, 41.3874, 2.1686);
      const vuelta = servicio.calcularDistancia(41.3874, 2.1686, 40.4168, -3.7038);
      expect(ida).toBeCloseTo(vuelta, 9);
    });

    it('un grado de latitud son unos 111 km', () => {
      expect(servicio.calcularDistancia(40, -3, 41, -3)).toBeCloseTo(111.19, 1);
    });
  });

  describe('calcularCostes', () => {
    it('suma al repostaje el combustible del viaje de ida y vuelta', () => {
      // 40 L a 1,5 € = 60 €. El viaje son 20 km (10 de ida y vuelta) a 5 L/100 km = 1 L = 1,5 €.
      const [resultado] = servicio.calcularCostes([gasolinera('Repsol', 1.5, 10)], { consumo: 5, litros: 40 });

      expect(resultado.costeTotal).toBeCloseTo(61.5, 5);
    });

    it('ordena por coste total, no por precio por litro', () => {
      const lejanaBarata = gasolinera('Lejana', 1.4, 80);
      const cercanaCara = gasolinera('Cercana', 1.5, 1);

      const resultado = servicio.calcularCostes([lejanaBarata, cercanaCara], { consumo: 7, litros: 40 });

      expect(resultado.map(g => g.rotulo)).toEqual(['Cercana', 'Lejana']);
    });

    it('la mejor opción tiene ahorro cero y el resto la diferencia', () => {
      const resultado = servicio.calcularCostes(
        [gasolinera('Cara', 1.6, 2), gasolinera('Barata', 1.4, 2)],
        { consumo: 6, litros: 40 }
      );

      expect(resultado[0].ahorro).toBe(0);
      expect(resultado[1].ahorro).toBeCloseTo(resultado[1].costeTotal! - resultado[0].costeTotal!, 9);
      expect(resultado[1].ahorro!).toBeGreaterThan(0);
    });

    it('no modifica la lista original', () => {
      const original = [gasolinera('Repsol', 1.5, 10)];
      servicio.calcularCostes(original, { consumo: 5, litros: 40 });

      expect(original[0].costeTotal).toBeUndefined();
      expect(original[0].ahorro).toBeUndefined();
    });

    it('trata como cero la distancia desconocida', () => {
      const sinDistancia: Gasolinera = { ...gasolinera('Repsol', 1.5, 0), distancia: undefined };
      const [resultado] = servicio.calcularCostes([sinDistancia], { consumo: 6, litros: 10 });

      expect(resultado.costeTotal).toBeCloseTo(15, 5);
    });

    it('con la lista vacía devuelve una lista vacía', () => {
      expect(servicio.calcularCostes([], { consumo: 6, litros: 40 })).toEqual([]);
    });
  });
});
