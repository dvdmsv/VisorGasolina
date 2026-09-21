import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiGasolinerasService, VIGENCIA_LISTADO_MS } from './api-gasolineras.service';
import { CacheRespuestasService } from './cache-respuestas.service';
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
  let cache: CacheRespuestasService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(ApiGasolinerasService);
    http = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(CacheRespuestasService);
    vi.spyOn(cache, 'leer').mockResolvedValue(null);
    vi.spyOn(cache, 'estaFresca').mockResolvedValue(false);
    vi.spyOn(cache, 'guardar').mockResolvedValue();
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

  describe('listado nacional', () => {
    // Gasóleo A: el listado de un solo combustible son 4,3 MB en vez de 12,2 MB.
    const PRODUCTO = '4';
    const URL = `${BASE}/EstacionesTerrestres/FiltroProducto/${PRODUCTO}`;

    it('lo pide con seguimiento del progreso, para poder mostrar la barra', async () => {
      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();

      const peticion = http.expectOne(URL);
      expect(peticion.request.reportProgress).toBe(true);
      // Se pide como texto: así se guarda en disco sin volver a serializar 12 MB.
      expect(peticion.request.responseType).toBe('text');
      peticion.flush(JSON.stringify(respuestaVacia));
    });

    it('guarda lo descargado para las visitas siguientes', async () => {
      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();
      http.expectOne(URL).flush(JSON.stringify(respuestaVacia));

      expect(cache.guardar).toHaveBeenCalledWith(URL, JSON.stringify(respuestaVacia));
    });

    it('sirve la copia guardada sin tocar la red', async () => {
      vi.mocked(cache.leer).mockResolvedValue(JSON.stringify(respuestaVacia));

      const recibido = await new Promise<unknown>(resolver =>
        servicio.getListadoNacional(PRODUCTO).subscribe(evento => {
          if (evento.type === HttpEventType.Response) {
            resolver(evento.body);
          }
        })
      );

      expect(recibido).toEqual(respuestaVacia);
      http.expectNone(URL);
    });

    it('vuelve a la red cuando la copia ha caducado', async () => {
      // El servicio pregunta por una copia vigente; la caché responde que no hay.
      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();

      expect(cache.leer).toHaveBeenCalledWith(URL, VIGENCIA_LISTADO_MS);
      http.expectOne(URL).flush(JSON.stringify(respuestaVacia));
    });

    it('descarga de nuevo si la copia guardada está corrupta', async () => {
      // Una escritura a medias dejaría un JSON roto; sin esto la búsqueda quedaría
      // inutilizada durante media hora.
      vi.mocked(cache.leer).mockResolvedValue('{"ListaEESS');
      vi.spyOn(cache, 'borrar').mockResolvedValue();

      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();
      await Promise.resolve();

      expect(cache.borrar).toHaveBeenCalledWith(URL);
      http.expectOne(URL).flush(JSON.stringify(respuestaVacia));
    });

    it('descarta una copia que no tenga la forma esperada', async () => {
      vi.mocked(cache.leer).mockResolvedValue('{"otraCosa":true}');
      vi.spyOn(cache, 'borrar').mockResolvedValue();

      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();
      await Promise.resolve();

      http.expectOne(URL).flush(JSON.stringify(respuestaVacia));
    });

    it('pide cada combustible por separado y los cachea aparte', async () => {
      servicio.getListadoNacional('4').subscribe();
      await Promise.resolve();
      http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProducto/4`).flush(JSON.stringify(respuestaVacia));

      servicio.getListadoNacional('1').subscribe();
      await Promise.resolve();
      http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProducto/1`).flush(JSON.stringify(respuestaVacia));

      expect(servicio.listadoNacionalListo('4')).toBe(true);
      expect(servicio.listadoNacionalListo('1')).toBe(true);
      expect(servicio.listadoNacionalListo('3')).toBe(false);
    });

    it('distingue entre descarga en marcha y listado disponible', async () => {
      expect(servicio.listadoNacionalPedido(PRODUCTO)).toBe(false);
      expect(servicio.listadoNacionalListo(PRODUCTO)).toBe(false);

      servicio.getListadoNacional(PRODUCTO).subscribe();
      await Promise.resolve();
      expect(servicio.listadoNacionalPedido(PRODUCTO)).toBe(true);
      expect(servicio.listadoNacionalListo(PRODUCTO)).toBe(false);

      http.expectOne(URL).flush(JSON.stringify(respuestaVacia));
      expect(servicio.listadoNacionalListo(PRODUCTO)).toBe(true);
    });
  });
});

function firstValueOf<T>(observable: { subscribe: Function }): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    observable.subscribe({ next: resolver, error: rechazar });
  });
}
