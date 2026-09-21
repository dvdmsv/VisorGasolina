import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PantallaService } from './pantalla.service';

const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

/** jsdom no trae matchMedia, así que se inyecta uno controlable desde el test. */
function simularAncho(esEscritorio: boolean) {
  const oyentes: ((evento: MediaQueryListEvent) => void)[] = [];
  const consulta = {
    matches: esEscritorio,
    addEventListener: (_: string, oyente: (evento: MediaQueryListEvent) => void) => oyentes.push(oyente)
  };
  Object.defineProperty(window, 'matchMedia', {
    value: () => consulta,
    configurable: true,
    writable: true
  });
  return {
    cambiarA(escritorio: boolean) {
      oyentes.forEach(oyente => oyente({ matches: escritorio } as MediaQueryListEvent));
    }
  };
}

describe('PantallaService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  afterEach(() => {
    if (original) {
      Object.defineProperty(window, 'matchMedia', original);
    } else {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });

  it('detecta una pantalla ancha', () => {
    simularAncho(true);

    expect(TestBed.inject(PantallaService).esEscritorio()).toBe(true);
  });

  it('detecta una pantalla estrecha', () => {
    simularAncho(false);

    expect(TestBed.inject(PantallaService).esEscritorio()).toBe(false);
  });

  it('reacciona al cambiar el tamaño de la ventana', () => {
    const pantalla = simularAncho(false);
    const servicio = TestBed.inject(PantallaService);

    pantalla.cambiarA(true);
    expect(servicio.esEscritorio()).toBe(true);

    pantalla.cambiarA(false);
    expect(servicio.esEscritorio()).toBe(false);
  });

  it('sin matchMedia asume pantalla estrecha en lugar de romperse', () => {
    // Es el caso de jsdom, y también el de un navegador que lo bloquee.
    delete (window as { matchMedia?: unknown }).matchMedia;

    expect(TestBed.inject(PantallaService).esEscritorio()).toBe(false);
  });
});
