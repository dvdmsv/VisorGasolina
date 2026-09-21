import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrecargaService } from './precarga.service';
import { ApiGasolinerasService } from './api-gasolineras.service';
import { CacheRespuestasService } from './cache-respuestas.service';

// Por defecto el combustible activo es el gasóleo A, producto 4 en la API.
const URL_NACIONAL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProducto/4';

/** El navegador anuncia el modo de ahorro de datos en navigator.connection. */
function simularAhorroDeDatos(activo: boolean) {
  Object.defineProperty(navigator, 'connection', {
    value: { saveData: activo },
    configurable: true
  });
}

describe('PrecargaService', () => {
  let http: HttpTestingController;
  let cache: CacheRespuestasService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    localStorage.clear();
    http = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(CacheRespuestasService);
    // Sin copia en disco salvo que el test diga lo contrario.
    vi.spyOn(cache, 'estaFresca').mockResolvedValue(false);
    vi.spyOn(cache, 'leer').mockResolvedValue(null);
    vi.spyOn(cache, 'guardar').mockResolvedValue();
  });

  afterEach(() => {
    delete (navigator as { connection?: unknown }).connection;
    vi.restoreAllMocks();
  });

  it('adelanta la descarga del listado nacional', async () => {
    await TestBed.inject(PrecargaService).iniciar();

    const peticion = http.expectOne(URL_NACIONAL);
    expect(peticion.request.responseType).toBe('text');
    peticion.flush('{"ListaEESSPrecio":[]}');
  });

  it('no descarga nada con el ahorro de datos activado', async () => {
    simularAhorroDeDatos(true);

    await TestBed.inject(PrecargaService).iniciar();

    // El botón de ubicación seguirá funcionando bajo demanda.
    http.expectNone(URL_NACIONAL);
  });

  it('no repite la descarga si ya se pidió', async () => {
    const servicio = TestBed.inject(PrecargaService);
    await servicio.iniciar();
    http.expectOne(URL_NACIONAL).flush('{"ListaEESSPrecio":[]}');

    await servicio.iniciar();

    http.expectNone(URL_NACIONAL);
  });

  it('con copia en disco no vuelve a la red, ni siquiera ahorrando datos', async () => {
    vi.mocked(cache.estaFresca).mockResolvedValue(true);
    vi.mocked(cache.leer).mockResolvedValue('{"ListaEESSPrecio":[]}');
    simularAhorroDeDatos(true);

    await TestBed.inject(PrecargaService).iniciar();

    http.expectNone(URL_NACIONAL);
    expect(TestBed.inject(ApiGasolinerasService).listadoNacionalPedido('4')).toBe(true);
  });

  it('adelanta el combustible que el usuario tiene activo', async () => {
    localStorage.setItem('pref.gasolina', 'Precio Gasolina 98 E5');

    await TestBed.inject(PrecargaService).iniciar();

    // Gasolina 98 es el producto 3.
    http.expectOne(URL_NACIONAL.replace('/4', '/3')).flush('{"ListaEESSPrecio":[]}');
  });

  it('no se queda esperando si el listado ya está en memoria', async () => {
    const api = TestBed.inject(ApiGasolinerasService);
    api.getListadoNacional('4').subscribe();
    // La consulta a la caché es asíncrona, así que la petición sale en el tick siguiente.
    await Promise.resolve();
    http.expectOne(URL_NACIONAL).flush('{"ListaEESSPrecio":[]}');

    await TestBed.inject(PrecargaService).iniciar();

    http.expectNone(URL_NACIONAL);
  });
});
