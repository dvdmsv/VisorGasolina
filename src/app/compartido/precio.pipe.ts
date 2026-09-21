import { Pipe, PipeTransform, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Formatea un precio de carburante: siempre tres decimales y coma decimal, como en los
 * paneles de las estaciones. Sin esto se ven cosas como «1.8€» junto a «1.739€».
 */
@Pipe({
  name: 'precio'
})
export class PrecioPipe implements PipeTransform {
  private readonly decimal = inject(DecimalPipe);

  transform(valor: number | null | undefined, decimales = 3): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) {
      return '—';
    }
    return `${this.decimal.transform(valor, `1.${decimales}-${decimales}`)} €`;
  }
}
