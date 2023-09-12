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
    if(this.cookie.get('toolbar') == ''){
      this.router.navigate(['/diesel']);
    }else{
      this.router.navigate([this.cookie.get('toolbar')]);
    }
  }
}
