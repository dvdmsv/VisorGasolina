import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrecargaService } from './precarga.service';
import { CacheRespuestasService } from './cache-respuestas.service';
import { UbicacionService } from './ubicacion.service';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
/** Plaza Mayor de Madrid: la tabla de límites propone Madrid (28) y Toledo (45). */
const MADRID = { coords: { latitude: 40.4155, longitude: -3.7074 } } as GeolocationPosition;

function simularAhorroDeDatos(activo: boolean) {
  Object.defineProperty(navigator, 'connection', { value: { saveData: activo }, configurable: true });
}

describe('PrecargaService', () => {
  let http: HttpTestingController;
  let ubicacion: UbicacionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    ubicacion = TestBed.inject(UbicacionService);

    const cache = TestBed.inject(CacheRespuestasService);
    vi.spyOn(cache, 'estaFresca').mockResolvedValue(false);
    vi.spyOn(cache, 'leer').mockResolvedValue(null);
    vi.spyOn(cache, 'guardar').mockResolvedValue();
  });

  afterEach(() => {
    delete (navigator as { connection?: unknown }).connection;
    vi.restoreAllMocks();
  });

  it('adelanta las provincias de la zona cuando el permiso ya estaba concedido', async () => {
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(true);
    vi.spyOn(ubicacion, 'obtenerPosicion').mockResolvedValue(MADRID);

    await TestBed.inject(PrecargaService).iniciar();

    // Gasóleo A (producto 4) en Madrid y Toledo: unos 414 KB en total.
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/28/4`).flush('{"ListaEESSPrecio":[]}');
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/45/4`).flush('{"ListaEESSPrecio":[]}');
  });

  it('no pide la ubicación si el permiso no estaba concedido', async () => {
    // Lo importante: no se llama a getCurrentPosition, que sacaría el diálogo del
    // navegador a quien acaba de abrir la web sin pedir nada.
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(false);
    const posicion = vi.spyOn(ubicacion, 'obtenerPosicion');

    await TestBed.inject(PrecargaService).iniciar();

    expect(posicion).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('no descarga nada con el ahorro de datos activado', async () => {
    simularAhorroDeDatos(true);
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(true);
    vi.spyOn(ubicacion, 'obtenerPosicion').mockResolvedValue(MADRID);

    await TestBed.inject(PrecargaService).iniciar();

    http.expectNone(() => true);
  });

  it('adelanta el combustible que el usuario tiene activo', async () => {
    localStorage.setItem('pref.gasolina', 'Precio Gasolina 98 E5');
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(true);
    vi.spyOn(ubicacion, 'obtenerPosicion').mockResolvedValue(MADRID);

    await TestBed.inject(PrecargaService).iniciar();

    // Gasolina 98 es el producto 3.
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/28/3`).flush('{"ListaEESSPrecio":[]}');
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/45/3`).flush('{"ListaEESSPrecio":[]}');
  });

  it('no se repite si se llama dos veces', async () => {
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(true);
    vi.spyOn(ubicacion, 'obtenerPosicion').mockResolvedValue(MADRID);
    const servicio = TestBed.inject(PrecargaService);

    await servicio.iniciar();
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/28/4`).flush('{"ListaEESSPrecio":[]}');
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvinciaProducto/45/4`).flush('{"ListaEESSPrecio":[]}');

    await servicio.iniciar();

    http.expectNone(() => true);
  });

  it('si falla la ubicación no molesta al usuario', async () => {
    vi.spyOn(ubicacion, 'permisoConcedido').mockResolvedValue(true);
    vi.spyOn(ubicacion, 'obtenerPosicion').mockRejectedValue(new Error('sin señal'));

    await expect(TestBed.inject(PrecargaService).iniciar()).resolves.toBeUndefined();
    http.expectNone(() => true);
  });
});
