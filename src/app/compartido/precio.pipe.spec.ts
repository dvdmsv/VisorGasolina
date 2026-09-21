import { TestBed } from '@angular/core/testing';
import { DecimalPipe, registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import localeEs from '@angular/common/locales/es';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrecioPipe } from './precio.pipe';

registerLocaleData(localeEs);

describe('PrecioPipe', () => {
  let pipe: PrecioPipe;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'es-ES' }, DecimalPipe, PrecioPipe]
    });
    pipe = TestBed.inject(PrecioPipe);
  });

  it('usa coma decimal, como se escriben los precios en España', () => {
    expect(pipe.transform(1.739)).toBe('1,739 €');
  });

  it('rellena siempre los tres decimales', () => {
    // La API devuelve 1,8 y antes se mostraba «1.8€» junto a «1.739€».
    expect(pipe.transform(1.8)).toBe('1,800 €');
    expect(pipe.transform(2)).toBe('2,000 €');
  });

  it('redondea a tres decimales', () => {
    expect(pipe.transform(1.73949)).toBe('1,739 €');
  });

  it('admite otro número de decimales para el coste del trayecto', () => {
    expect(pipe.transform(75.1567, 2)).toBe('75,16 €');
  });

  it('muestra una raya cuando no hay dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(Number.NaN)).toBe('—');
  });
});
