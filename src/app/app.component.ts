import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'VisorGasolina';

  constructor(private router: Router, private cookie: CookieService){}

  ngOnInit(){
    //Si la cookie de toolbar existe
    if(this.cookie.get('toolbar') != ''){
      this.router.navigate([this.cookie.get('toolbar')]); //Se navega a ese componente
    }else{ //Si no existe
      this.cookie.set('gasolina', 'Precio Gasoleo A'); //Se establece los datos de la tabla en gasoleo a
      this.cookie.set('toolbar', 'diesel'); //Se establece la ruta en diesel
    }
  }
}
