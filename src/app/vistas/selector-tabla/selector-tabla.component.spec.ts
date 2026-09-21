import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SelectorTablaComponent } from './selector-tabla.component';
import { EstacionApi, RespuestaEstaciones } from '../../clases/respuesta-api';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';

function estacion(rotulo: string, precio: string, idMunicipio = '4276'): EstacionApi {
  return {
    'Rótulo': rotulo,
    'Dirección': `Calle ${rotulo}`,
    Localidad: 'MADRID',
    Municipio: 'Madrid',
    Provincia: 'MADRID',
    IDMunicipio: idMunicipio,
    IDProvincia: '28',
    IDPovincia: '28',
    IDCCAA: '13',
    CCAA: 'Madrid, Comunidad de',
    Latitud: '40,416775',
    'Longitud (WGS84)': `-3,70${precio.slice(-2)}`,
    'Precio Gasoleo A': precio
  } as EstacionApi;
}

const respuestaProvincia: RespuestaEstaciones = {
  Fecha: '21/09/2026 9:00:00',
  ResultadoConsulta: 'OK',
  ListaEESSPrecio: [
    estacion('CARA', '1,700'),
    estacion('BARATA', '1,300'),
    estacion('SIN DIESEL', ''),
    estacion('MEDIA', '1,500')
  ]
};

describe('SelectorTablaComponent', () => {
  let fixture: ComponentFixture<SelectorTablaComponent>;
  let componente: SelectorTablaComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SelectorTablaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorTablaComponent);
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    http.expectOne(`${BASE}/Listados/Provincias/`).flush([
      { IDPovincia: '28', IDCCAA: '13', Provincia: 'MADRID', CCAA: 'Madrid, Comunidad de' }
    ]);
    fixture.detectChanges();
  });

  it('arranca invitando a elegir provincia y sin pedir el listado nacional de 12 MB', () => {
    // La versión anterior descargaba el listado completo en cada carga de página.
    http.expectNone(`${BASE}/EstacionesTerrestres/`);
    expect(texto()).toContain('Selecciona una provincia');
  });

  it('muestra las gasolineras de la provincia ordenadas por precio', () => {
    cargarProvincia();

    expect(componente.gasolineras().map(g => g.rotulo)).toEqual(['BARATA', 'MEDIA', 'CARA']);
    expect(texto()).toContain('BARATA');
  });

  it('descarta las gasolineras sin ese combustible', () => {
    cargarProvincia();

    expect(componente.gasolineras().map(g => g.rotulo)).not.toContain('SIN DIESEL');
  });

  it('calcula el precio medio de los resultados', () => {
    cargarProvincia();

    expect(componente.precioMedio()).toBe(1.5);
  });

  it('filtra por nombre', () => {
    cargarProvincia();

    componente.filtroNombre.set('bara');
    fixture.detectChanges();

    expect(componente.gasolineras().map(g => g.rotulo)).toEqual(['BARATA']);
  });

  it('vuelve a la primera página al cambiar el filtro', () => {
    cargarProvincia();
    componente.tamanoPagina.set(1);
    componente.irAPagina(3);
    expect(componente.pagina()).toBe(3);

    componente.filtroNombre.set('a');
    fixture.detectChanges();

    expect(componente.pagina()).toBe(1);
  });

  it('pagina los resultados', () => {
    cargarProvincia();
    componente.tamanoPagina.set(2);
    fixture.detectChanges();

    expect(componente.totalPaginas()).toBe(2);
    expect(componente.gasolinerasPagina().map(g => g.rotulo)).toEqual(['BARATA', 'MEDIA']);

    componente.irAPagina(2);
    expect(componente.gasolinerasPagina().map(g => g.rotulo)).toEqual(['CARA']);
  });

  it('ignora una página fuera de rango', () => {
    cargarProvincia();
    componente.irAPagina(99);

    expect(componente.pagina()).toBe(1);
  });

  it('en modo calculadora ordena por coste total', () => {
    cargarProvincia();
    componente.modoCalculadora.set(true);
    fixture.detectChanges();

    const costes = componente.gasolineras().map(g => g.costeTotal!);
    expect(costes).toEqual([...costes].sort((a, b) => a - b));
    expect(componente.gasolineras()[0].ahorro).toBe(0);
  });

  it('recuerda la provincia elegida para la próxima visita', () => {
    cargarProvincia();

    expect(localStorage.getItem('pref.IDProvincia')).toBe('28');
    expect(localStorage.getItem('pref.Localidad')).toBe('MADRID');
  });

  function cargarProvincia() {
    componente.seleccionarProvincia({
      CCAA: 'Madrid, Comunidad de',
      IDCCAA: '13',
      IDProvincia: '28',
      Provincia: 'MADRID'
    });
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaProvincia);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
