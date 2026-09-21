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
    estacion('ESTACIÓN ÚNICA', '1,600'),
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
    expect(texto()).toContain('Elige una provincia');
  });

  it('muestra las gasolineras de la provincia ordenadas por precio', () => {
    cargarProvincia();

    expect(componente.gasolineras().map(g => g.rotulo)).toEqual(['BARATA', 'MEDIA', 'ESTACIÓN ÚNICA', 'CARA']);
    expect(texto()).toContain('BARATA');
  });

  it('descarta las gasolineras sin ese combustible', () => {
    cargarProvincia();

    expect(componente.gasolineras().map(g => g.rotulo)).not.toContain('SIN DIESEL');
  });

  it('describe el recuento sin filtro', () => {
    cargarProvincia();

    expect(componente.resumenRecuento()).toBe('4 estaciones');
  });

  it('calcula el precio medio de los resultados', () => {
    cargarProvincia();

    expect(componente.precioMedio()).toBe(1.525);
  });

  it('filtra por nombre', () => {
    cargarProvincia();

    componente.filtroNombre.set('bara');
    fixture.detectChanges();

    expect(componente.gasolineras().map(g => g.rotulo)).toEqual(['BARATA']);
  });

  it('el filtro encuentra los rótulos con tilde escritos sin ella', () => {
    cargarProvincia();

    componente.filtroNombre.set('estacion unica');
    fixture.detectChanges();

    expect(componente.gasolineras().map(g => g.rotulo)).toEqual(['ESTACIÓN ÚNICA']);
  });

  it('con filtro activo dice cuántas de cuántas y mantiene la media de la zona', () => {
    cargarProvincia();
    const mediaDeLaZona = componente.precioMedio();

    componente.filtroNombre.set('bara');
    fixture.detectChanges();

    expect(componente.hayFiltro()).toBe(true);
    expect(componente.totalSinFiltro()).toBe(4);
    expect(componente.gasolineras()).toHaveLength(1);
    expect(componente.precioMedio()).toBe(mediaDeLaZona);
    expect(componente.resumenRecuento()).toBe('1 de 4 estaciones');
    expect(texto()).toContain('1 de 4 estaciones, precio medio de la zona');
  });

  describe('cuando la API falla', () => {
    it('lo dice en lugar de fingir que no hay resultados', () => {
      // Un identificador inválido falla en el servicio sin llegar a pedir nada, que es
      // el mismo camino que un error de red una vez agotados los reintentos.
      componente.getGasolinerasProvincia('no-numerico');
      fixture.detectChanges();

      expect(componente.estado()).toBe('error');
      expect(texto()).toContain('no responde');
      expect(texto()).not.toContain('Ninguna gasolinera se llama así');
    });

    it('permite reintentar la última consulta', () => {
      localStorage.setItem('pref.IDProvincia', '28');
      componente.reintentar();

      http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuestaProvincia);
      fixture.detectChanges();

      expect(componente.estado()).toBe('listo');
      expect(componente.gasolineras().length).toBeGreaterThan(0);
    });
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
    expect(componente.gasolinerasPagina().map(g => g.rotulo)).toEqual(['ESTACIÓN ÚNICA', 'CARA']);
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

  it('ofrece la paginación numerada y el indicador compacto a la vez', () => {
    // El CSS enseña los números en escritorio y «2 de 5» en móvil; ambos deben existir.
    cargarProvincia();
    componente.tamanoPagina.set(1);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('.numero-pagina').length).toBeGreaterThan(0);
    expect(html.querySelector('.indicador-pagina')?.textContent).toContain('1 de 4');
  });

  it('muestra la estrella llena cuando la gasolinera ya está guardada', () => {
    cargarProvincia();
    const gasolinera = componente.gasolineras()[0];

    expect(componente.esFavorita(gasolinera)).toBe(false);

    componente.guardar(gasolinera);
    fixture.detectChanges();

    expect(componente.esFavorita(gasolinera)).toBe(true);
  });

  it('al pulsar de nuevo la estrella quita la gasolinera de favoritos', () => {
    cargarProvincia();
    const gasolinera = componente.gasolineras()[0];

    componente.guardar(gasolinera);
    componente.guardar(gasolinera);
    fixture.detectChanges();

    expect(componente.esFavorita(gasolinera)).toBe(false);
  });

  it('los desplegables recuerdan la zona al recrearse la vista', () => {
    cargarProvincia();

    // Los identificadores quedan expuestos para que el desplegable los preseleccione
    // aunque el componente se haya vuelto a crear (cambio de combustible o recarga).
    expect(componente.idProvinciaElegida()).toBe('28');

    componente.seleccionarLocalidad({
      CCAA: 'Madrid, Comunidad de',
      IDCCAA: '13',
      IDMunicipio: '4276',
      IDProvincia: '28',
      Localidad: 'Madrid',
      Provincia: 'Madrid'
    });
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroMunicipio/4276`).flush(respuestaProvincia);
    fixture.detectChanges();

    expect(componente.idMunicipioElegido()).toBe('4276');
  });

  it('no repite la localidad en cada resultado si ya se eligió una', () => {
    cargarProvincia();
    expect(componente.mostrarLocalidad()).toBe(true);

    componente.seleccionarLocalidad({
      CCAA: 'Madrid, Comunidad de',
      IDCCAA: '13',
      IDMunicipio: '4276',
      IDProvincia: '28',
      Localidad: 'Madrid',
      Provincia: 'Madrid'
    });
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroMunicipio/4276`).flush(respuestaProvincia);
    fixture.detectChanges();

    expect(componente.mostrarLocalidad()).toBe(false);
  });

  it('al cambiar de provincia deja de haber localidad elegida', () => {
    cargarProvincia();
    componente.seleccionarProvincia({
      CCAA: 'Castilla y León',
      IDCCAA: '8',
      IDProvincia: '42',
      Provincia: 'Soria'
    });
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/42`).flush(respuestaProvincia);
    fixture.detectChanges();

    expect(componente.idProvinciaElegida()).toBe('42');
    expect(componente.idMunicipioElegido()).toBe('');
  });

  it('recuerda la provincia elegida para la próxima visita', () => {
    cargarProvincia();

    expect(localStorage.getItem('pref.IDProvincia')).toBe('28');
    // El nombre se guarda ya legible: la API lo devuelve en mayúsculas.
    expect(localStorage.getItem('pref.Localidad')).toBe('Madrid');
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
