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

// Los favoritos guardados antes de que el modelo tuviera IDEESS solo tienen coordenadas, y la
// clave del histórico es el IDEESS: sin completarlos no podrían abrir su gráfico.
describe('completarIdentificadores', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('rellena el id de un favorito antiguo a partir del listado descargado', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    servicio.completarIdentificadores([{ ...gasolinera('Repsol', 40.1, -3.7), id: '1234' }]);

    expect(servicio.getFavoritos()[0].id).toBe('1234');
  });

  it('deja intacto el favorito que no aparece en el listado', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Cepsa', 41.5, -2.2));

    servicio.completarIdentificadores([{ ...gasolinera('Repsol', 40.1, -3.7), id: '1234' }]);

    expect(servicio.getFavoritos()[0].id).toBeUndefined();
  });

  it('no toca el id de un favorito que ya lo tiene', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos({ ...gasolinera('Repsol', 40.1, -3.7), id: 'original' });

    servicio.completarIdentificadores([{ ...gasolinera('Repsol', 40.1, -3.7), id: 'otro' }]);

    expect(servicio.getFavoritos()[0].id).toBe('original');
  });

  it('sobrevive al recargar: el id completado queda guardado', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    servicio.completarIdentificadores([{ ...gasolinera('Repsol', 40.1, -3.7), id: '1234' }]);

    expect(servicioNuevo().getFavoritos()[0].id).toBe('1234');
  });
});

describe('exportar e importar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('exporta lo guardado y lo recupera en un navegador vacío', () => {
    const origen = TestBed.inject(FavoritosService);
    origen.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    origen.setFavoritos(gasolinera('Cepsa', 41.5, -2.2));
    const copia = origen.exportar();

    localStorage.clear();
    const destino = servicioNuevo();

    expect(destino.importar(copia)).toBe(2);
    expect(destino.getFavoritos().map(g => g.rotulo)).toEqual(['Repsol', 'Cepsa']);
  });

  // Importar en un móvil que ya tiene favoritos no debe borrar los suyos.
  it('añade a lo que ya hay en lugar de reemplazarlo', () => {
    const origen = TestBed.inject(FavoritosService);
    origen.setFavoritos(gasolinera('Repsol', 40.1, -3.7));
    const copia = origen.exportar();

    localStorage.clear();
    const destino = servicioNuevo();
    destino.setFavoritos(gasolinera('BP', 39.0, -0.4));

    expect(destino.importar(copia)).toBe(1);
    expect(destino.getFavoritos().map(g => g.rotulo)).toEqual(['BP', 'Repsol']);
  });

  it('no duplica las que ya están guardadas', () => {
    const servicio = TestBed.inject(FavoritosService);
    servicio.setFavoritos(gasolinera('Repsol', 40.1, -3.7));

    expect(servicio.importar(servicio.exportar())).toBe(0);
    expect(servicio.getFavoritos()).toHaveLength(1);
  });

  it('rechaza un fichero que no es JSON', () => {
    expect(TestBed.inject(FavoritosService).importar('esto no es json')).toBeNull();
  });

  it('rechaza un JSON con otra forma', () => {
    expect(TestBed.inject(FavoritosService).importar('{"otra":"cosa"}')).toBeNull();
  });

  it('acepta también un array suelto, por si la copia es antigua', () => {
    const servicio = TestBed.inject(FavoritosService);

    expect(servicio.importar(JSON.stringify([gasolinera('Repsol', 40.1, -3.7)]))).toBe(1);
  });

  // Un fichero manipulado no debe meter basura en localStorage.
  it('descarta las entradas sin la forma de una gasolinera', () => {
    const servicio = TestBed.inject(FavoritosService);
    const copia = JSON.stringify({ favoritos: [gasolinera('Repsol', 40.1, -3.7), { rotulo: 'rota' }] });

    expect(servicio.importar(copia)).toBe(1);
    expect(servicio.getFavoritos()).toHaveLength(1);
  });
});
