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
