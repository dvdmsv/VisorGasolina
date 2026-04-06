import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { ApiGasolinerasService } from './api-gasolineras.service';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const MOCK_GASOLINERAS = { Fecha: '01/01/2025', ListaEESSPrecio: [] };
const MOCK_PROVINCIAS = [{ CCAA: 'Madrid', IDCCAA: '13', IDPovincia: '28', Provincia: 'Madrid' }];

describe('ApiGasolinerasService', () => {
  let service: ApiGasolinerasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiGasolinerasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.borrarCache();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProvincias', () => {
    it('realiza una petición GET al endpoint de provincias', () => {
      service.getProvincias().subscribe(data => {
        expect(data).toEqual(MOCK_PROVINCIAS);
      });
      const req = httpMock.expectOne(`${BASE}/Listados/Provincias/`);
      expect(req.request.method).toBe('GET');
      req.flush(MOCK_PROVINCIAS);
    });
  });

  describe('getGasolinerasProvincia', () => {
    it('realiza GET al endpoint de provincia con el ID correcto', () => {
      service.getGasolinerasProvincia('28').subscribe();
      const req = httpMock.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`);
      expect(req.request.method).toBe('GET');
      req.flush(MOCK_GASOLINERAS);
    });
  });

  describe('getGasolinerasLocalidad', () => {
    it('realiza GET al endpoint de municipio con el ID correcto', () => {
      service.getGasolinerasLocalidad('28079').subscribe();
      const req = httpMock.expectOne(`${BASE}/EstacionesTerrestres/FiltroMunicipio/28079`);
      expect(req.request.method).toBe('GET');
      req.flush(MOCK_GASOLINERAS);
    });
  });

  describe('getGasolinera (caché)', () => {
    it('la segunda llamada no realiza una nueva petición HTTP', () => {
      // Primera llamada — lanza la petición HTTP
      service.getGasolinera().subscribe();
      const req = httpMock.expectOne(`${BASE}/EstacionesTerrestres/`);
      req.flush(MOCK_GASOLINERAS);

      // Segunda llamada — debe usar el caché, sin nueva petición
      service.getGasolinera().subscribe(event => {
        expect(event.type).toBe(HttpEventType.Response);
      });
      httpMock.expectNone(`${BASE}/EstacionesTerrestres/`);
    });

    it('borrarCache() fuerza una nueva descarga en la siguiente llamada', () => {
      // Primera llamada
      service.getGasolinera().subscribe();
      httpMock.expectOne(`${BASE}/EstacionesTerrestres/`).flush(MOCK_GASOLINERAS);

      // Limpiar caché
      service.borrarCache();

      // Segunda llamada — debe hacer nueva petición
      service.getGasolinera().subscribe();
      const req2 = httpMock.expectOne(`${BASE}/EstacionesTerrestres/`);
      req2.flush(MOCK_GASOLINERAS);
    });
  });
});
