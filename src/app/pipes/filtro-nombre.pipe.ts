import { Pipe, PipeTransform } from '@angular/core';
import { Gasolinera } from '../clases/gasolinera';

@Pipe({ name: 'filtroNombre', pure: true })
export class FiltroNombrePipe implements PipeTransform {
  transform(gasolineras: Gasolinera[], filtro: string): Gasolinera[] {
    if (!filtro.trim()) return gasolineras;
    const f = filtro.toLowerCase();
    return gasolineras.filter(g => g.rotulo.toLowerCase().includes(f));
  }
}
