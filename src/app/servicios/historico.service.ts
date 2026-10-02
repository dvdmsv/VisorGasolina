import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, map, of, retry, shareReplay, throwError, timeout, timer } from 'rxjs';
import { HistoricoEstacion, Serie } from '../compartido/ficha-gasolinera/historico.util';

/**
 * Ficheros estáticos que genera `scripts/generar-historico.mjs` en el build, servidos por
 * Netlify desde el propio dominio: la CSP no necesita abrirse a nada.
 */
const BASE = 'historico';

/** Son 2,8 KB del mismo servidor; si tarda más que esto, algo va mal. */
const TIEMPO_MAXIMO_MS = 10_000;

export interface HistoricoDeEstacion {
  fechas: readonly string[];
  precios: Serie | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class HistoricoService {
  private readonly http = inject(HttpClient);

  /** Las fechas son las mismas para todas las estaciones: se piden una vez por sesión. */
  private fechas$: Observable<readonly string[]> | null = null;

  /** Caché por estación, para que abrir y cerrar la ficha no vuelva a descargar. */
  private readonly porEstacion = new Map<string, Observable<HistoricoEstacion | null>>();

  /**
   * Histórico de una estación para un combustible. Devuelve `precios: undefined` cuando la
   * estación no tiene datos —es nueva, o no servía ese combustible—, que no es un error.
   */
  getHistorico(id: string, idProducto: string): Observable<HistoricoDeEstacion> {
    return combineLatest([this.getFechas(), this.getEstacion(id)]).pipe(
      map(([fechas, historico]) => ({ fechas, precios: historico?.[idProducto] }))
    );
  }

  private getFechas(): Observable<readonly string[]> {
    this.fechas$ ??= this.http.get<string[]>(`${BASE}/fechas.json`).pipe(
      timeout(TIEMPO_MAXIMO_MS),
      retry({ count: 1, delay: 500 }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.fechas$;
  }

  private getEstacion(id: string): Observable<HistoricoEstacion | null> {
    let peticion = this.porEstacion.get(id);
    if (peticion === undefined) {
      peticion = this.http.get<HistoricoEstacion>(`${BASE}/${encodeURIComponent(id)}.json`).pipe(
        timeout(TIEMPO_MAXIMO_MS),
        // Un 404 es una respuesta definitiva: esa estación no tiene fichero y reintentar solo
        // retrasaría el aviso. Se reintenta lo que puede ser pasajero (red, 5xx).
        retry({
          count: 1,
          delay: error => (error?.status === 404 ? throwError(() => error) : timer(500))
        }),
        // Una estación recién abierta no tiene fichero. Es ausencia de datos, no un fallo:
        // la ficha lo dice y el resto de la aplicación sigue funcionando.
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.porEstacion.set(id, peticion);
    }
    return peticion;
  }
}
