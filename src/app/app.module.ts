import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DieselComponent } from './vistas/diesel/diesel.component';
import {HttpClientModule} from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Gasolina95Component } from './vistas/gasolina95/gasolina95.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { ToolbarComponent } from './vistas/toolbar/toolbar.component';
import {MatMenuModule} from '@angular/material/menu';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { Gasolina98Component } from './vistas/gasolina98/gasolina98.component';
import { DieselPremiumComponent } from './vistas/diesel-premium/diesel-premium.component';
import { PoliticaPrivacidadComponent } from './vistas/politica-privacidad/politica-privacidad.component';
import { FooterComponent } from './vistas/footer/footer.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { SelectorTablaComponent } from './vistas/selector-tabla/selector-tabla.component';

@NgModule({
  declarations: [
    AppComponent,
    DieselComponent,
    Gasolina95Component,
    ToolbarComponent,
    Gasolina98Component,
    DieselPremiumComponent,
    PoliticaPrivacidadComponent,
    FooterComponent,
    SelectorTablaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatTableModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    NgxPaginationModule
  ],
  providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
  bootstrap: [AppComponent]
})
export class AppModule { }
