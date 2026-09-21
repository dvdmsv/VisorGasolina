import { describe, expect, it } from 'vitest';
import {
  COMBUSTIBLE_POR_DEFECTO,
  campoCombustibleValido,
  etiquetaCombustible,
  rutaValida
} from './combustibles';

describe('campoCombustibleValido', () => {
  it('acepta un campo conocido', () => {
    expect(campoCombustibleValido('Precio Gasolina 95 E5')).toBe('Precio Gasolina 95 E5');
  });

  it('cae al combustible por defecto con una preferencia corrupta', () => {
    // Antes, un valor así provocaba un TypeError al parsear la respuesta de la API.
    expect(campoCombustibleValido('cualquier cosa')).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);
    expect(campoCombustibleValido('')).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);
    expect(campoCombustibleValido(null)).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);
    expect(campoCombustibleValido(undefined)).toBe(COMBUSTIBLE_POR_DEFECTO.campoApi);
  });
});

describe('etiquetaCombustible', () => {
  it('devuelve el nombre legible', () => {
    expect(etiquetaCombustible('Precio Gasoleo Premium')).toBe('Diésel Premium');
  });

  it('cae a la etiqueta por defecto si no reconoce el campo', () => {
    expect(etiquetaCombustible('otra cosa')).toBe(COMBUSTIBLE_POR_DEFECTO.etiqueta);
  });
});

describe('rutaValida', () => {
  it('reconoce las rutas de combustible', () => {
    expect(rutaValida('gasolina98')).toBe(true);
  });

  it('rechaza cualquier otra', () => {
    expect(rutaValida('favoritos')).toBe(false);
    expect(rutaValida('')).toBe(false);
    expect(rutaValida(null)).toBe(false);
  });
});
