import { Component } from '@angular/core';
import { PreferenciasService } from 'src/app/servicios/preferencias.service';
import { COMBUSTIBLES } from 'src/app/clases/combustibles';

@Component({
    selector: 'app-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrl: './toolbar.component.css',
    standalone: false
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
