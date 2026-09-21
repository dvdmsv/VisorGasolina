import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FavoritosService } from './favoritos.service';
import { Gasolinera } from '../clases/gasolinera';

function gasolinera(nombre: string, latitud: number, longitud: number): Gasolinera {
  return {
    rotulo: nombre,
    localidad: 'Madrid',
    provincia: 'MADRID',
    direccion: 'Calle de prueba 1',
    precio: 1.5,
    latitud,
    longitud,
    gasolina: 'Precio Gasoleo A'
  };
}

/** Simula la recarga de la página: servicio nuevo sobre el mismo localStorage. */
function servicioNuevo(): FavoritosService {
  TestBed.resetTestingModule();
  return TestBed.inject(FavoritosService);
}

describe('FavoritosService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('guarda un favorito y lo devuelve', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    expect(servicio.getFavoritos()).toHaveLength(1);
    expect(servicio.getFavoritos()[0].rotulo).toBe('Repsol');
  });

  it('recupera los favoritos guardados al recargar la página', () => {
    TestBed.inject(FavoritosService).setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    expect(servicioNuevo().getFavoritos()).toHaveLength(1);
  });

  it('no pierde los favoritos anteriores al añadir uno tras recargar', () => {
    TestBed.inject(FavoritosService).setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    const trasRecargar = servicioNuevo();
    trasRecargar.setFavoritos(gasolinera('Cepsa', 41.2, -2.5));

    const rotulos = trasRecargar.getFavoritos().map(g => g.rotulo);
    expect(rotulos).toEqual(['Repsol', 'Cepsa']);
  });

  it('al eliminar uno tras recargar conserva el resto', () => {
    const inicial = TestBed.inject(FavoritosService);
    inicial.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    inicial.setFavoritos(gasolinera('Cepsa', 41.2, -2.5));

    const trasRecargar = servicioNuevo();
    trasRecargar.deleteFavoritos(gasolinera('Repsol', 40.1, -3.7));

    expect(trasRecargar.getFavoritos().map(g => g.rotulo)).toEqual(['Cepsa']);
    expect(servicioNuevo().getFavoritos()).toHaveLength(1);
  });

  it('no duplica una gasolinera ya guardada', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    expect(servicio.getFavoritos()).toHaveLength(1);
  });

  it('distingue dos gasolineras que comparten latitud', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    servicio.setFavoritos(gasolinera('Cepsa', 40.1, -3.9));

    expect(servicio.getFavoritos()).toHaveLength(2);

    servicio.deleteFavoritos(gasolinera('Repsol', 40.1, -3.7));
    expect(servicio.getFavoritos().map(g => g.rotulo)).toEqual(['Cepsa']);
  });

  it('tolera un localStorage con contenido corrupto', () => {
    localStorage.setItem('favoritos', '{ esto no es json');

    expect(servicioNuevo().getFavoritos()).toEqual([]);
  });

  it('descarta entradas guardadas que no son gasolineras', () => {
    localStorage.setItem('favoritos', JSON.stringify([{ algo: 'raro' }, gasolinera('Repsol', 40.1, -3.7)]));

    expect(servicioNuevo().getFavoritos()).toHaveLength(1);
  });
});
