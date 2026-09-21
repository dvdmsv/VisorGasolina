import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiGasolinerasService } from './api-gasolineras.service';
import { RespuestaEstaciones } from '../clases/respuesta-api';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';

const respuestaVacia: RespuestaEstaciones = {
  Fecha: '21/09/2026 9:00:00',
  ResultadoConsulta: 'OK',
  ListaEESSPrecio: []
};

describe('ApiGasolinerasService', () => {
  let servicio: ApiGasolinerasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(ApiGasolinerasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('rechaza un IDProvincia que no sea numérico, sin llegar a llamar a la API', async () => {
    // Evita que un valor manipulado acabe concatenado en la URL.
    await expect(firstValueOf(servicio.getGasolinerasProvincia('28; drop'))).rejects.toThrow('IDProvincia inválido');
    http.expectNone(() => true);
  });

  it('rechaza un IDMunicipio que no sea numérico', async () => {
    await expect(firstValueOf(servicio.getGasolinerasLocalidad('../../otro'))).rejects.toThrow('IDMunicipio inválido');
    http.expectNone(() => true);
  });

  it('comparte una sola petición entre getGasolinerasProvincia y getLocalidades', () => {
    const recibidas: RespuestaEstaciones[] = [];
    servicio.getGasolinerasProvincia('28').subscribe(r => recibidas.push(r));
    servicio.getLocalidades('28').subscribe(r => recibidas.push(r));

    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaVacia);

    expect(recibidas).toHaveLength(2);
  });

  it('no repite la petición de una provincia ya consultada', () => {
    servicio.getGasolinerasProvincia('28').subscribe();
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaVacia);

    servicio.getGasolinerasProvincia('28').subscribe();
    http.expectNone(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`);
  });

  it('pide de nuevo los datos tras borrar la caché', () => {
    servicio.getGasolinerasProvincia('28').subscribe();
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaVacia);

    servicio.borrarCache();
    servicio.getGasolinerasProvincia('28').subscribe();
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaVacia);
  });

  it('reutiliza la respuesta cacheada de provincias', () => {
    servicio.getProvincias().subscribe();
    http.expectOne(`${BASE}/Listados/Provincias/`).flush([]);

    servicio.getProvincias().subscribe();
    http.expectNone(`${BASE}/Listados/Provincias/`);
  });

  it('reintenta cuando la sede responde con un error', async () => {
    vi.useFakeTimers();
    const recibidas: RespuestaEstaciones[] = [];
    servicio.getGasolinerasLocalidad('4276').subscribe(r => recibidas.push(r));

    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroMunicipio/4276`)
      .flush('fallo', { status: 503, statusText: 'Service Unavailable' });

    await vi.advanceTimersByTimeAsync(2000);

    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroMunicipio/4276`).flush(respuestaVacia);
    expect(recibidas).toHaveLength(1);
    vi.useRealTimers();
  });

  it('pide el listado nacional con seguimiento del progreso', () => {
    servicio.getListadoNacional().subscribe();

    const peticion = http.expectOne(`${BASE}/EstacionesTerrestres/`);
    expect(peticion.request.reportProgress).toBe(true);
    peticion.flush(respuestaVacia);
  });
});

function firstValueOf<T>(observable: { subscribe: Function }): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    observable.subscribe({ next: resolver, error: rechazar });
  });
}
