import { TestBed } from '@angular/core/testing';
import { FavoritosService } from './favoritos.service';
import { Gasolinera } from '../clases/gasolinera';

const gasolinera = (rotulo: string, lat: number, lon: number): Gasolinera =>
  new Gasolinera(rotulo, 'Madrid', 'Madrid', 'Calle Test 1', 1.5, lat, lon, 'Precio Gasoleo A', false);

describe('FavoritosService', () => {
  let service: FavoritosService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FavoritosService);
    service.gasolineras = [];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setFavoritos', () => {
    it('añade una gasolinera nueva', () => {
      const g = gasolinera('Repsol', 40.4, -3.7);
      service.setFavoritos(g);
      expect(service.getFavoritos().length).toBe(1);
    });

    it('no añade duplicados', () => {
      const g = gasolinera('Repsol', 40.4, -3.7);
      service.setFavoritos(g);
      service.setFavoritos(g);
      expect(service.getFavoritos().length).toBe(1);
    });

    it('persiste en localStorage', () => {
      const g = gasolinera('BP', 41.0, -2.0);
      service.setFavoritos(g);
      const stored = JSON.parse(localStorage.getItem('favoritos')!);
      expect(stored.length).toBe(1);
      expect(stored[0].rotulo).toBe('BP');
    });
  });

  describe('comprobarExiste', () => {
    it('devuelve true si la gasolinera ya está guardada', () => {
      const g = gasolinera('Cepsa', 40.4, -3.7);
      service.setFavoritos(g);
      expect(service.comprobarExiste(g)).toBe(true);
    });

    it('devuelve false si la gasolinera no está guardada', () => {
      const g = gasolinera('Cepsa', 40.4, -3.7);
      expect(service.comprobarExiste(g)).toBe(false);
    });

    it('distingue gasolineras con la misma latitud pero diferente longitud', () => {
      const g1 = gasolinera('Repsol', 40.4, -3.7);
      const g2 = gasolinera('BP', 40.4, -3.8);
      service.setFavoritos(g1);
      expect(service.comprobarExiste(g2)).toBe(false);
    });

    it('distingue gasolineras con mismas coordenadas pero diferente nombre', () => {
      const g1 = gasolinera('Repsol', 40.4, -3.7);
      const g2 = gasolinera('BP', 40.4, -3.7);
      service.setFavoritos(g1);
      expect(service.comprobarExiste(g2)).toBe(false);
    });
  });

  describe('deleteFavoritos', () => {
    it('elimina la gasolinera correcta', () => {
      const g1 = gasolinera('Repsol', 40.4, -3.7);
      const g2 = gasolinera('BP', 41.0, -2.0);
      service.setFavoritos(g1);
      service.setFavoritos(g2);
      service.deleteFavoritos(g1);
      expect(service.getFavoritos().length).toBe(1);
      expect(service.getFavoritos()[0].rotulo).toBe('BP');
    });

    it('actualiza localStorage tras eliminar', () => {
      const g = gasolinera('Repsol', 40.4, -3.7);
      service.setFavoritos(g);
      service.deleteFavoritos(g);
      const stored = JSON.parse(localStorage.getItem('favoritos')!);
      expect(stored.length).toBe(0);
    });
  });

  describe('getFavoritos', () => {
    it('devuelve array vacío si no hay favoritos', () => {
      expect(service.getFavoritos()).toEqual([]);
    });

    it('devuelve todas las gasolineras guardadas', () => {
      service.setFavoritos(gasolinera('Repsol', 40.4, -3.7));
      service.setFavoritos(gasolinera('BP', 41.0, -2.0));
      expect(service.getFavoritos().length).toBe(2);
    });
  });
});
