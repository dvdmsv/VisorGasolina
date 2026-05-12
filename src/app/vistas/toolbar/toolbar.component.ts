import { Component } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css'
})
export class ToolbarComponent {
  constructor(private cookie: CookieService){}

  private readonly cookieOpts = { expires: 30, sameSite: 'Strict' as const };

  setCookie(datosCookie: string, tipoGasolina: string){
    this.cookie.set("toolbar", datosCookie, this.cookieOpts);
    this.cookie.set("gasolina", tipoGasolina, this.cookieOpts);
  }

  setFavoritos(){
    this.cookie.set("toolbar", "favoritos", this.cookieOpts);
  }

  getCookie(nombreCookie: string): string{
    return this.cookie.get(nombreCookie);
  }
}
