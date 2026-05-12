import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

const RUTAS_VALIDAS = new Set(['diesel', 'dieselPremium', 'gasolina95', 'gasolina98', 'favoritos']);
const COOKIE_OPTS = { expires: 30, sameSite: 'Strict' as const };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'VisorGasolina';

  constructor(private router: Router, private cookie: CookieService){}

  ngOnInit(){
    const toolbar = this.cookie.get('toolbar');
    if (toolbar !== '' && RUTAS_VALIDAS.has(toolbar)) {
      this.router.navigate([toolbar]);
    } else {
      this.cookie.set('gasolina', 'Precio Gasoleo A', COOKIE_OPTS);
      this.cookie.set('toolbar', 'diesel', COOKIE_OPTS);
      this.router.navigate(['diesel']);
    }
  }
}
