import { TestBed } from '@angular/core/testing';
import { SelectorTablaComponent } from './selector-tabla.component';
import { Gasolinera } from 'src/app/clases/gasolinera';

const gasolinera = (lat: number, lon: number, precio: number, rotulo = 'Test'): Gasolinera => {
  const g = new Gasolinera(rotulo, 'Madrid', 'Madrid', 'Calle Test', precio, lat, lon, 'Precio Gasoleo A', false);
  g.distancia = 0;
  return g;
};

// Test unitario puro de calcularDistancia — sin necesidad de montar el componente Angular completo
describe('calcularDistancia (Haversine)', () => {
  let component: SelectorTablaComponent;

  beforeEach(() => {
    // Instanciamos directamente con dependencias nulas ya que solo testamos el método puro
    component = Object.create(SelectorTablaComponent.prototype);
  });

  it('devuelve 0 para dos puntos idénticos', () => {
    const dist = component.calcularDistancia(40.4168, -3.7038, 40.4168, -3.7038);
    expect(dist).toBeCloseTo(0, 1);
  });

  it('calcula correctamente Madrid → Barcelona (~504 km)', () => {
    // Madrid: 40.4168, -3.7038 | Barcelona: 41.3851, 2.1734
    const dist = component.calcularDistancia(40.4168, -3.7038, 41.3851, 2.1734);
    expect(dist).toBeGreaterThan(490);
    expect(dist).toBeLessThan(520);
  });

  it('calcula correctamente Madrid → Sevilla (~390 km)', () => {
    // Sevilla: 37.3891, -5.9845
    const dist = component.calcularDistancia(40.4168, -3.7038, 37.3891, -5.9845);
    expect(dist).toBeGreaterThan(375);
    expect(dist).toBeLessThan(410);
  });

  it('es simétrica: distancia(A,B) === distancia(B,A)', () => {
    const d1 = component.calcularDistancia(40.4168, -3.7038, 41.3851, 2.1734);
    const d2 = component.calcularDistancia(41.3851, 2.1734, 40.4168, -3.7038);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe('trackBy helpers', () => {
  let component: SelectorTablaComponent;

  beforeEach(() => {
    component = Object.create(SelectorTablaComponent.prototype);
  });

  it('trackByGasolinera devuelve clave única por coordenadas', () => {
    const g = gasolinera(40.4, -3.7, 1.5);
    expect(component.trackByGasolinera(0, g)).toBe('40.4_-3.7');
  });

  it('trackByGasolinera diferencia dos gasolineras con distintas coordenadas', () => {
    const g1 = gasolinera(40.4, -3.7, 1.5);
    const g2 = gasolinera(41.0, -2.0, 1.6);
    expect(component.trackByGasolinera(0, g1)).not.toBe(component.trackByGasolinera(1, g2));
  });
});
