import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { HistoricoDeEstacion, HistoricoService } from './historico.service';

describe('HistoricoService', () => {
  let servicio: HistoricoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HistoricoService, provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(HistoricoService);
    http = TestBed.inject(HttpTestingController);
  });

  function responder(id: string, cuerpo: Record<string, (number | null)[]>, fechas = ['2026-09-28', '2026-09-29']) {
    http.expectOne('historico/fechas.json').flush(fechas);
    http.expectOne(`historico/${id}.json`).flush(cuerpo);
  }

  it('cruza las fechas con la serie del combustible pedido', () => {
    let recibido: HistoricoDeEstacion | undefined;
    servicio.getHistorico('1234', '4').subscribe(v => (recibido = v));
    responder('1234', { '4': [1700, 1710], '1': [1800, 1810] });

    expect(recibido?.fechas).toEqual(['2026-09-28', '2026-09-29']);
    expect(recibido?.precios).toEqual([1700, 1710]);
  });

  it('devuelve la serie vacía si la estación no sirve ese combustible', () => {
    let recibido: HistoricoDeEstacion | undefined;
    servicio.getHistorico('1234', '5').subscribe(v => (recibido = v));
    responder('1234', { '4': [1700, 1710] });

    expect(recibido?.precios).toBeUndefined();
  });

  // Una estación recién abierta no tiene fichero generado. Es ausencia de datos, no un fallo:
  // si se propagara como error, la ficha mostraría «no se pudo cargar» en lugar de «sin datos».
  it('trata un 404 como ausencia de histórico, no como error', () => {
    let recibido: HistoricoDeEstacion | undefined;
    let fallo: unknown;
    servicio.getHistorico('nueva', '4').subscribe({
      next: v => (recibido = v),
      error: e => (fallo = e)
    });

    http.expectOne('historico/fechas.json').flush(['2026-09-29']);
    http.expectOne('historico/nueva.json')
      .flush('no existe', { status: 404, statusText: 'Not Found' });

    expect(fallo).toBeUndefined();
    expect(recibido?.precios).toBeUndefined();
    // Un 404 es definitivo: reintentarlo solo retrasaría el «sin datos».
    http.expectNone('historico/nueva.json');
  });

  it('pide las fechas una sola vez para varias estaciones', () => {
    servicio.getHistorico('1', '4').subscribe();
    http.expectOne('historico/fechas.json').flush(['2026-09-29']);
    http.expectOne('historico/1.json').flush({ '4': [1700] });

    servicio.getHistorico('2', '4').subscribe();
    http.expectNone('historico/fechas.json');
    http.expectOne('historico/2.json').flush({ '4': [1800] });

    http.verify();
  });

  it('no vuelve a descargar la misma estación', () => {
    servicio.getHistorico('1', '4').subscribe();
    http.expectOne('historico/fechas.json').flush(['2026-09-29']);
    http.expectOne('historico/1.json').flush({ '4': [1700] });

    servicio.getHistorico('1', '1').subscribe();
    http.expectNone('historico/1.json');

    http.verify();
  });
});
