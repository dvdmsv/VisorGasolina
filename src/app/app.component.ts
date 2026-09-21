import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { COMBUSTIBLE_POR_DEFECTO, rutaValida } from './clases/combustibles';

const COOKIE_OPTS = { expires: 30, sameSite: 'Strict' as const };

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    standalone: false
})
export class AppComponent implements OnInit {
  title = 'VisorGasolina';

  constructor(private router: Router, private cookie: CookieService){}

  ngOnInit(){
    const toolbar = this.cookie.get('toolbar');
    if (rutaValida(toolbar) || toolbar === 'favoritos') {
      this.router.navigate([toolbar]);
    } else {
      this.cookie.set('gasolina', COMBUSTIBLE_POR_DEFECTO.campoApi, COOKIE_OPTS);
      this.cookie.set('toolbar', COMBUSTIBLE_POR_DEFECTO.ruta, COOKIE_OPTS);
      this.router.navigate([COMBUSTIBLE_POR_DEFECTO.ruta]);
    }
  }
}
