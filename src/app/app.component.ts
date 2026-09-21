import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { PreferenciasService } from './servicios/preferencias.service';
import { COMBUSTIBLE_POR_DEFECTO, rutaValida } from './clases/combustibles';
import { ToolbarComponent } from './vistas/toolbar/toolbar.component';
import { ModoOscuroComponent } from './vistas/modo-oscuro/modo-oscuro.component';
import { FooterComponent } from './vistas/footer/footer.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ToolbarComponent, ModoOscuroComponent, RouterOutlet, FooterComponent]
})
export class AppComponent implements OnInit {
  title = 'VisorGasolina';

  constructor(private router: Router, private preferencias: PreferenciasService){}

  ngOnInit(){
    const toolbar = this.preferencias.get('toolbar');
    if (rutaValida(toolbar) || toolbar === 'favoritos') {
      this.router.navigate([toolbar]);
    } else {
      this.preferencias.set('gasolina', COMBUSTIBLE_POR_DEFECTO.campoApi);
      this.preferencias.set('toolbar', COMBUSTIBLE_POR_DEFECTO.ruta);
      this.router.navigate([COMBUSTIBLE_POR_DEFECTO.ruta]);
    }
  }
}
