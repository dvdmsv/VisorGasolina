/**
 * Utilidades de texto para los datos del Ministerio, que llegan en mayúsculas y con
 * tildes que nadie teclea al buscar.
 */

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'al', 'con']);

/**
 * Pasa a minúsculas y quita los acentos, para que «agreda» encuentre «Ágreda» y
 * «coruna» encuentre «A Coruña».
 */
export function paraBuscar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Convierte el texto en mayúsculas de la API en algo legible: «BURGO DE OSMA (EL)»
 * pasa a «Burgo de Osma (El)».
 */
export function comoNombrePropio(texto: string | null | undefined): string {
  if (!texto) {
    return '';
  }
  return texto
    .toLocaleLowerCase('es-ES')
    .replace(/[\p{L}\p{N}]+/gu, (palabra, posicion: number, completo: string) => {
      // Una palabra de enlace solo va en minúscula si viene detrás de un espacio:
      // en «BURGO DE OSMA (EL)» ese «el» abre paréntesis y sí se capitaliza.
      if (posicion > 0 && completo[posicion - 1] === ' ' && MINUSCULAS.has(palabra)) {
        return palabra;
      }
      return palabra.charAt(0).toLocaleUpperCase('es-ES') + palabra.slice(1);
    })
    // En las direcciones del Ministerio «SN» significa «sin número».
    .replace(/\bSn\b/g, 'S/N');
}
