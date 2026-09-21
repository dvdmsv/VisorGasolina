import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SelectorTablaComponent } from './selector-tabla.component';
import { PreferenciasService } from '../../servicios/preferencias.service';
import { UbicacionService } from '../../servicios/ubicacion.service';
import { RespuestaEstaciones } from '../../clases/respuesta-api';

const BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';

const respuesta: RespuestaEstaciones = {
  Fecha: '21/09/2026 9:00:00',
  ResultadoConsulta: 'OK',
  ListaEESSPrecio: []
};

@Component({ template: 'vacío' })
class VistaVacia {}

describe('SelectorTablaComponent y la ruta activa', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'inicio', component: VistaVacia },
          { path: 'diesel', component: SelectorTablaComponent },
          { path: 'gasolina98', component: SelectorTablaComponent }
        ])
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('la ruta decide el combustible mostrado, no la preferencia guardada', async () => {
    localStorage.setItem('pref.gasolina', 'Precio Gasoleo A');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/gasolina98', SelectorTablaComponent);
    http.expectOne(`${BASE}/Listados/Provincias/`).flush([]);
    harness.detectChanges();

    expect(TestBed.inject(PreferenciasService).combustible()).toBe('Precio Gasolina 98 E5');
    expect(harness.routeDebugElement!.nativeElement.textContent).toContain('Gasolina 98 en España');
  });

  it('al cambiar de combustible conserva la búsqueda por ubicación', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/diesel', SelectorTablaComponent);
    http.expectOne(`${BASE}/Listados/Provincias/`).flush([]);
    harness.detectChanges();

    // Simula que ya se buscó por ubicación: no hay provincia guardada.
    TestBed.inject(UbicacionService).recordarPosicion(40.4155, -3.7074);

    // El enrutador recrea el componente, así que la posición no puede vivir en él.
    const nuevo = await harness.navigateByUrl('/gasolina98', SelectorTablaComponent);
    harness.detectChanges();

    // Antes se perdían los resultados y aparecía «Elige una provincia». Se pide el
    // listado del combustible nuevo: gasolina 98 es el producto 3.
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProducto/3`).flush(respuesta);
    harness.detectChanges();

    expect(nuevo.busquedaPorUbicacion()).toBe(true);
    expect(nuevo.estado()).not.toBe('inicial');
  });

  it('al cambiar de combustible vuelve a consultar la misma zona', async () => {
    localStorage.setItem('pref.IDProvincia', '28');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/diesel', SelectorTablaComponent);
    http.expectOne(`${BASE}/Listados/Provincias/`).flush([]);
    // La consulta inicial y la de las localidades comparten la misma petición cacheada.
    http.expectOne(`${BASE}/EstacionesTerrestres/FiltroProvincia/28`).flush(respuesta);
    harness.detectChanges();

    TestBed.inject(Router).navigateByUrl('/gasolina98');
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    // La respuesta de la provincia está cacheada, así que no hay petición nueva, pero sí
    // debe reflejarse el cambio de combustible.
    expect(TestBed.inject(PreferenciasService).combustible()).toBe('Precio Gasolina 98 E5');
  });
});
