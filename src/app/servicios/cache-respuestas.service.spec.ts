import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheRespuestasService } from './cache-respuestas.service';

const URL = 'https://ejemplo.test/listado';
const MEDIA_HORA = 30 * 60 * 1000;

/** Cache Storage no existe en jsdom: se simula uno en memoria. */
function simularCacheStorage() {
  const guardado = new Map<string, Response>();
  const almacen = {
    match: async (url: string) => guardado.get(url),
    put: async (url: string, respuesta: Response) => void guardado.set(url, respuesta),
    delete: async (url: string) => guardado.delete(url)
  };
  Object.defineProperty(globalThis, 'caches', {
    value: { open: async () => almacen },
    configurable: true,
    writable: true
  });
  return guardado;
}

function sinCacheStorage() {
  Object.defineProperty(globalThis, 'caches', { value: undefined, configurable: true, writable: true });
}

describe('CacheRespuestasService', () => {
  let servicio: CacheRespuestasService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    simularCacheStorage();
    servicio = TestBed.inject(CacheRespuestasService);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { caches?: unknown }).caches;
  });

  it('devuelve lo guardado mientras esté vigente', async () => {
    await servicio.guardar(URL, '{"precios":1}');

    expect(await servicio.leer(URL, MEDIA_HORA)).toBe('{"precios":1}');
  });

  it('no devuelve nada si nunca se guardó', async () => {
    expect(await servicio.leer(URL, MEDIA_HORA)).toBeNull();
  });

  it('descarta la copia cuando caduca', async () => {
    vi.useFakeTimers();
    await servicio.guardar(URL, '{"precios":1}');

    // Los precios del Ministerio cambian cada media hora.
    vi.advanceTimersByTime(MEDIA_HORA + 1000);

    expect(await servicio.leer(URL, MEDIA_HORA)).toBeNull();
  });

  it('mantiene la copia justo antes de caducar', async () => {
    vi.useFakeTimers();
    await servicio.guardar(URL, '{"precios":1}');

    vi.advanceTimersByTime(MEDIA_HORA - 1000);

    expect(await servicio.leer(URL, MEDIA_HORA)).toBe('{"precios":1}');
  });

  it('estaFresca responde sin leer el cuerpo', async () => {
    expect(await servicio.estaFresca(URL, MEDIA_HORA)).toBe(false);

    await servicio.guardar(URL, '{"precios":1}');
    expect(await servicio.estaFresca(URL, MEDIA_HORA)).toBe(true);
  });

  it('borra la copia cuando se le pide', async () => {
    await servicio.guardar(URL, '{"precios":1}');
    await servicio.borrar(URL);

    expect(await servicio.leer(URL, MEDIA_HORA)).toBeNull();
  });

  it('sin Cache Storage se comporta como si no hubiera caché', async () => {
    sinCacheStorage();

    await servicio.guardar(URL, '{"precios":1}');
    expect(await servicio.leer(URL, MEDIA_HORA)).toBeNull();
    expect(await servicio.estaFresca(URL, MEDIA_HORA)).toBe(false);
  });

  it('un fallo al guardar, como la cuota agotada, no rompe nada', async () => {
    Object.defineProperty(globalThis, 'caches', {
      value: { open: async () => ({ put: async () => { throw new Error('cuota agotada'); } }) },
      configurable: true,
      writable: true
    });

    await expect(servicio.guardar(URL, '{"precios":1}')).resolves.toBeUndefined();
  });
});
