import { Injectable, signal } from '@angular/core';
import { COMBUSTIBLE_POR_DEFECTO, campoCombustibleValido } from '../clases/combustibles';

/** Preferencias locales del usuario. Nunca salen del navegador. */
export type ClavePreferencia =
  | 'gasolina'
  | 'toolbar'
  | 'IDProvincia'
  | 'IDMunicipio'
  | 'Localidad';

const PREFIJO = 'pref.';

@Injectable({
  providedIn: 'root'
})
export class PreferenciasService {
  /** Campo de la API del combustible activo, ya validado. */
  readonly combustible = signal<string>(COMBUSTIBLE_POR_DEFECTO.campoApi);

  constructor() {
    this.migrarDesdeCookies();
    this.combustible.set(campoCombustibleValido(this.get('gasolina')));
  }

  get(clave: ClavePreferencia): string {
    try {
      return localStorage.getItem(PREFIJO + clave) ?? '';
    } catch {
      return '';
    }
  }

  set(clave: ClavePreferencia, valor: string) {
    try {
      localStorage.setItem(PREFIJO + clave, valor);
    } catch {
      // Almacenamiento no disponible: la sesión sigue funcionando sin persistencia.
    }
    if (clave === 'gasolina') {
      this.combustible.set(campoCombustibleValido(valor));
    }
  }

  /**
   * Las preferencias vivían en cookies hasta la versión anterior. Se copian una sola vez
   * para que nadie pierda su provincia ni su combustible al actualizar.
   */
  private migrarDesdeCookies() {
    const claves: ClavePreferencia[] = ['gasolina', 'toolbar', 'IDProvincia', 'IDMunicipio', 'Localidad'];
    for (const clave of claves) {
      if (this.get(clave) !== '') {
        continue;
      }
      const valor = this.leerCookie(clave);
      if (valor !== '') {
        this.set(clave, valor);
      }
    }
  }

  private leerCookie(nombre: string): string {
    try {
      const entrada = document.cookie
        .split('; ')
        .find(c => c.startsWith(`${nombre}=`));
      return entrada ? decodeURIComponent(entrada.slice(nombre.length + 1)) : '';
    } catch {
      return '';
    }
  }
}
