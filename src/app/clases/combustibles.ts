/**
 * Combustibles soportados. La clave es el segmento de ruta y `campoApi` es el nombre exacto
 * del campo en la respuesta del Ministerio.
 */
export interface Combustible {
  ruta: string;
  campoApi: string;
  etiqueta: string;
}

export const COMBUSTIBLES: readonly Combustible[] = [
  { ruta: 'diesel', campoApi: 'Precio Gasoleo A', etiqueta: 'Diésel/Gasoil' },
  { ruta: 'dieselPremium', campoApi: 'Precio Gasoleo Premium', etiqueta: 'Diésel Premium' },
  { ruta: 'gasolina95', campoApi: 'Precio Gasolina 95 E5', etiqueta: 'Gasolina 95' },
  { ruta: 'gasolina98', campoApi: 'Precio Gasolina 98 E5', etiqueta: 'Gasolina 98' }
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

/** Nombre legible del combustible a partir del campo guardado en preferencias. */
export function etiquetaCombustible(campo: string | null | undefined): string {
  const combustible = COMBUSTIBLES.find(c => c.campoApi === campo);
  return (combustible ?? COMBUSTIBLE_POR_DEFECTO).etiqueta;
}
