import { Injectable } from '@angular/core';

const NOMBRE_CACHE = 'visorgasolina-api';
/** Cabecera propia con el momento en que se guardó la copia. */
const CABECERA_FECHA = 'x-vg-guardado';

/**
 * Caché en disco del navegador (Cache Storage) para las respuestas grandes de la API.
 *
 * El listado nacional son 12,2 MB que el Ministerio sirve sin comprimir y con
 * `Cache-Control: private`, así que nadie los cachea por nosotros. Guardarlos aquí hace
 * que la búsqueda por ubicación sea inmediata aunque se recargue la página, y permite
 * seguir viendo los últimos precios sin cobertura.
 *
 * Todo es tolerante a fallos: en navegación privada, con la cuota llena o en un navegador
 * sin Cache Storage, se comporta como si no hubiera caché en lugar de romper.
 */
@Injectable({
  providedIn: 'root'
})
export class CacheRespuestasService {
  /** Devuelve el cuerpo guardado si no ha caducado. */
  async leer(url: string, tiempoDeVidaMs: number): Promise<string | null> {
    try {
      const almacen = await this.almacen();
      if (!almacen) {
        return null;
      }

      const respuesta = await almacen.match(url);
      if (!respuesta) {
        return null;
      }

      if (this.haCaducado(respuesta, tiempoDeVidaMs)) {
        await almacen.delete(url);
        return null;
      }

      return await respuesta.text();
    } catch {
      return null;
    }
  }

  /** Indica si hay una copia utilizable, sin llegar a leer el cuerpo. */
  async estaFresca(url: string, tiempoDeVidaMs: number): Promise<boolean> {
    try {
      const almacen = await this.almacen();
      const respuesta = await almacen?.match(url);
      return !!respuesta && !this.haCaducado(respuesta, tiempoDeVidaMs);
    } catch {
      return false;
    }
  }

  async guardar(url: string, cuerpo: string): Promise<void> {
    try {
      const almacen = await this.almacen();
      await almacen?.put(
        url,
        new Response(cuerpo, {
          headers: {
            'Content-Type': 'application/json',
            [CABECERA_FECHA]: String(Date.now())
          }
        })
      );
    } catch {
      // Cuota agotada o almacenamiento bloqueado: se sigue sin caché.
    }
  }

  async borrar(url: string): Promise<void> {
    try {
      const almacen = await this.almacen();
      await almacen?.delete(url);
    } catch {
      // Nada que hacer: si no se puede borrar, la caducidad acabará descartándola.
    }
  }

  private haCaducado(respuesta: Response, tiempoDeVidaMs: number): boolean {
    const guardado = Number(respuesta.headers.get(CABECERA_FECHA));
    if (!Number.isFinite(guardado) || guardado === 0) {
      return true;
    }
    return Date.now() - guardado > tiempoDeVidaMs;
  }

  private async almacen(): Promise<Cache | null> {
    if (typeof caches === 'undefined') {
      return null;
    }
    return await caches.open(NOMBRE_CACHE);
  }
}
