/**
 * Combustibles soportados. La clave es el segmento de ruta y `campoApi` es el nombre exacto
 * del campo en la respuesta del Ministerio.
 */
export interface Combustible {
  ruta: string;
  campoApi: string;
  etiqueta: string;
  /**
   * Identificador del producto en la API. Permite pedir el listado nacional de un solo
   * combustible (4,3 MB) en lugar del de todos (12,2 MB), que es lo que necesita la
   * búsqueda por ubicación.
   */
  idProducto: string;
}

export const COMBUSTIBLES: readonly Combustible[] = [
  { ruta: 'diesel', campoApi: 'Precio Gasoleo A', etiqueta: 'Diésel/Gasoil', idProducto: '4' },
  { ruta: 'dieselPremium', campoApi: 'Precio Gasoleo Premium', etiqueta: 'Diésel Premium', idProducto: '5' },
  { ruta: 'gasolina95', campoApi: 'Precio Gasolina 95 E5', etiqueta: 'Gasolina 95', idProducto: '1' },
  { ruta: 'gasolina98', campoApi: 'Precio Gasolina 98 E5', etiqueta: 'Gasolina 98', idProducto: '3' }
];

export const COMBUSTIBLE_POR_DEFECTO = COMBUSTIBLES[0];

/**
 * Valida un campo de combustible que viene de una preferencia guardada. Sin esta comprobación,
 * un valor corrupto o ausente hace que el parseo de la respuesta lance un TypeError.
 */
export function campoCombustibleValido(campo: string | null | undefined): string {
  const combustible = COMBUSTIBLES.find(c => c.campoApi === campo);
  return combustible ? combustible.campoApi : COMBUSTIBLE_POR_DEFECTO.campoApi;
}

export function rutaValida(ruta: string | null | undefined): boolean {
  return COMBUSTIBLES.some(c => c.ruta === ruta);
}

/** Producto de la API correspondiente al campo guardado en preferencias. */
export function productoDeCombustible(campo: string | null | undefined): string {
  const combustible = COMBUSTIBLES.find(c => c.campoApi === campo);
  return (combustible ?? COMBUSTIBLE_POR_DEFECTO).idProducto;
}

/** Nombre legible del combustible a partir del campo guardado en preferencias. */
export function etiquetaCombustible(campo: string | null | undefined): string {
  const combustible = COMBUSTIBLES.find(c => c.campoApi === campo);
  return (combustible ?? COMBUSTIBLE_POR_DEFECTO).etiqueta;
}
