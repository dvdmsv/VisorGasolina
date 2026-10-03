import { Injectable, computed, signal } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';

const CLAVE_ALMACEN = 'favoritos';

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  // El estado se inicializa SIEMPRE desde localStorage. Si no se hace, tras recargar la página
  // la lista en memoria queda vacía y cualquier escritura posterior machaca lo guardado.
  private readonly estado = signal<Gasolinera[]>(this.leerAlmacen());

  readonly favoritos = this.estado.asReadonly();
  readonly total = computed(() => this.estado().length);

  setFavoritos(gasolinera: Gasolinera) {
    if (this.comprobarExiste(gasolinera)) {
      return;
    }
    this.guardar([...this.estado(), gasolinera]);
  }

  deleteFavoritos(gasolinera: Gasolinera) {
    this.guardar(this.estado().filter(g => !this.esLaMisma(g, gasolinera)));
  }

  /**
   * Rellena el `id` de los favoritos guardados antes de que el modelo lo tuviera, usando un
   * listado recién descargado. Sin esto, un favorito antiguo no podría abrir su histórico,
   * porque la clave del histórico es el IDEESS y esos solo tienen coordenadas.
   */
  completarIdentificadores(gasolineras: readonly Gasolinera[]) {
    const pendientes = this.estado().filter(g => !g.id);
    if (pendientes.length === 0) {
      return;
    }
    const porCoordenada = new Map(gasolineras.filter(g => g.id).map(g => [claveDe(g), g.id]));
    let cambiados = 0;

    const completados = this.estado().map(favorito => {
      if (favorito.id) {
        return favorito;
      }
      const id = porCoordenada.get(claveDe(favorito));
      if (id === undefined) {
        return favorito;
      }
      cambiados++;
      return { ...favorito, id };
    });

    if (cambiados > 0) {
      this.guardar(completados);
    }
  }

  /**
   * Favoritos en JSON, para guardarlos en un fichero. Todo el estado vive en `localStorage`:
   * vaciar los datos del navegador o cambiar de móvil se los lleva por delante.
   */
  exportar(): string {
    return JSON.stringify({ version: 1, favoritos: this.estado() }, null, 2);
  }

  /**
   * Añade los favoritos de un fichero exportado a los que ya hay, sin duplicar. Devuelve cuántos
   * se han añadido, o null si el fichero no tiene la forma esperada.
   *
   * No reemplaza: importar en un dispositivo que ya tiene favoritos no debe borrarlos.
   */
  importar(contenido: string): number | null {
    let datos: unknown;
    try {
      datos = JSON.parse(contenido);
    } catch {
      return null;
    }

    const lista = Array.isArray(datos)
      ? datos
      : (datos as { favoritos?: unknown })?.favoritos;
    if (!Array.isArray(lista)) {
      return null;
    }

    const validas = lista.filter(g => this.esValida(g));
    const nuevas = validas.filter(g => !this.comprobarExiste(g));
    if (nuevas.length > 0) {
      this.guardar([...this.estado(), ...nuevas]);
    }
    return nuevas.length;
  }

  comprobarExiste(gasolineraComprobar: Gasolinera): boolean {
    return this.estado().some(gasolinera => this.esLaMisma(gasolinera, gasolineraComprobar));
  }

  getFavoritos(): Gasolinera[] {
    return this.estado();
  }

  // Dos estaciones distintas pueden compartir latitud, así que la identidad necesita ambas
  // coordenadas.
  private esLaMisma(a: Gasolinera, b: Gasolinera): boolean {
    return a.latitud === b.latitud && a.longitud === b.longitud;
  }

  private guardar(gasolineras: Gasolinera[]) {
    this.estado.set(gasolineras);
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(gasolineras));
    } catch {
      // Cuota agotada o almacenamiento bloqueado: el estado en memoria sigue siendo válido
      // para la sesión actual.
    }
  }

  private leerAlmacen(): Gasolinera[] {
    try {
      const crudo = localStorage.getItem(CLAVE_ALMACEN);
      if (crudo === null) {
        return [];
      }
      const datos = JSON.parse(crudo);
      return Array.isArray(datos) ? datos.filter(g => this.esValida(g)) : [];
    } catch {
      localStorage.removeItem(CLAVE_ALMACEN);
      return [];
    }
  }

  private esValida(gasolinera: unknown): gasolinera is Gasolinera {
    const g = gasolinera as Gasolinera | null;
    return !!g && typeof g.rotulo === 'string' &&
      typeof g.latitud === 'number' && typeof g.longitud === 'number';
  }
}

function claveDe(gasolinera: Gasolinera): string {
  return `${gasolinera.latitud}|${gasolinera.longitud}`;
}
