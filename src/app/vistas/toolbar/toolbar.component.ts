import { Component } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent {
  constructor(private cookie: CookieService){}

  setCookie(datosCookie: string, tipoGasolina: string){
    this.cookie.set("toolbar", datosCookie, 30);
    this.cookie.set("gasolina", tipoGasolina, 30);
  }

  getCookie(nombreCookie: string): string{
    return this.cookie.get(nombreCookie);
  }
}
