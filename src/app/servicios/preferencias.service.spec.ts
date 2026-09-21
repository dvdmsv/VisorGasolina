import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferenciasService } from './preferencias.service';
import { COMBUSTIBLE_POR_DEFECTO } from '../clases/combustibles';

function servicioNuevo(): PreferenciasService {
  TestBed.resetTestingModule();
  return TestBed.inject(PreferenciasService);
}

describe('PreferenciasService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'gasolina=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    TestBed.resetTestingModule();
  });

  it('devuelve cadena vacía para una preferencia que nunca se guardó', () => {
    expect(servicioNuevo().get('IDProvincia')).toBe('');
  });

  it('guarda y recupera una preferencia entre recargas', () => {
    servicioNuevo().set('IDProvincia', '28');

    expect(servicioNuevo().get('IDProvincia')).toBe('28');
  });

  it('expone el combustible activo como signal', () => {
    const servicio = servicioNuevo();
    expect(servicio.combustible()).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);

    servicio.set('gasolina', 'Precio Gasolina 98 E5');
    expect(servicio.combustible()).toBe('Precio Gasolina 98 E5');
  });

  it('ignora un combustible guardado que no existe', () => {
    localStorage.setItem('pref.gasolina', 'Precio Inventado');

    expect(servicioNuevo().combustible()).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);
  });

  it('migra las preferencias que estaban en cookies', () => {
    document.cookie = 'gasolina=Precio%20Gasolina%2095%20E5; path=/';

    const servicio = servicioNuevo();

    expect(servicio.get('gasolina')).toBe('Precio Gasolina 95 E5');
    expect(servicio.combustible()).toBe('Precio Gasolina 95 E5');
  });

  it('no pisa una preferencia ya migrada con el valor antiguo de la cookie', () => {
    localStorage.setItem('pref.gasolina', 'Precio Gasolina 98 E5');
    document.cookie = 'gasolina=Precio%20Gasoleo%20A; path=/';

    expect(servicioNuevo().get('gasolina')).toBe('Precio Gasolina 98 E5');
  });
});
