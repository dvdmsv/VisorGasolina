import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PreferenciasService } from '../../servicios/preferencias.service';
import { COMBUSTIBLES } from '../../clases/combustibles';
import { RouterLinkActive, RouterLink } from '@angular/router';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrl: './toolbar.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLinkActive, RouterLink]
})
export class ToolbarComponent {
  constructor(private preferencias: PreferenciasService){}

  readonly combustibles = COMBUSTIBLES;

  seleccionarCombustible(ruta: string, campoApi: string){
    this.preferencias.set('toolbar', ruta);
    this.preferencias.set('gasolina', campoApi);
  }

  seleccionarFavoritos(){
    this.preferencias.set('toolbar', 'favoritos');
  }
}
