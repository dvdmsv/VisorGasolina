import { FiltroNombrePipe } from './filtro-nombre.pipe';
import { Gasolinera } from '../clases/gasolinera';

const gasolinera = (rotulo: string): Gasolinera =>
  new Gasolinera(rotulo, 'Madrid', 'Madrid', 'Calle Test', 1.5, 40.4, -3.7, 'Precio Gasoleo A', false);

describe('FiltroNombrePipe', () => {
  let pipe: FiltroNombrePipe;

  beforeEach(() => {
    pipe = new FiltroNombrePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('devuelve el array completo cuando el filtro está vacío', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP'), gasolinera('Cepsa')];
    expect(pipe.transform(lista, '')).toEqual(lista);
  });

  it('devuelve el array completo cuando el filtro es solo espacios', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP')];
    expect(pipe.transform(lista, '   ')).toEqual(lista);
  });

  it('filtra por nombre exacto', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP'), gasolinera('Cepsa')];
    const result = pipe.transform(lista, 'Repsol');
    expect(result.length).toBe(1);
    expect(result[0].rotulo).toBe('Repsol');
  });

  it('filtra de forma case-insensitive', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP')];
    expect(pipe.transform(lista, 'repsol').length).toBe(1);
    expect(pipe.transform(lista, 'REPSOL').length).toBe(1);
    expect(pipe.transform(lista, 'RePs').length).toBe(1);
  });

  it('filtra por subcadena', () => {
    const lista = [gasolinera('Repsol'), gasolinera('Repsolito'), gasolinera('BP')];
    expect(pipe.transform(lista, 'reps').length).toBe(2);
  });

  it('devuelve array vacío si no hay coincidencias', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP')];
    expect(pipe.transform(lista, 'zzz').length).toBe(0);
  });

  it('devuelve el array original sin mutarlo', () => {
    const lista = [gasolinera('Repsol'), gasolinera('BP')];
    pipe.transform(lista, 'Repsol');
    expect(lista.length).toBe(2);
  });
});
