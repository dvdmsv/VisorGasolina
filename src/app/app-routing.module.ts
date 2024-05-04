import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DieselComponent } from './vistas/diesel/diesel.component';
import { Gasolina95Component } from './vistas/gasolina95/gasolina95.component';
import { Gasolina98Component } from './vistas/gasolina98/gasolina98.component';
import { DieselPremiumComponent } from './vistas/diesel-premium/diesel-premium.component';
import { PoliticaPrivacidadComponent } from './vistas/politica-privacidad/politica-privacidad.component';
import { SelectorTablaComponent } from './vistas/selector-tabla/selector-tabla.component';
import { FavoritosComponent } from './vistas/favoritos/favoritos.component';

const routes: Routes = [
  {
    path: 'diesel',
    component: DieselComponent
  },{
    path: 'dieselPremium',
    component: DieselPremiumComponent
  },
  {
    path: 'gasolina95',
    component: Gasolina95Component
  },
  {
    path: 'gasolina98',
    component: Gasolina98Component
  },
  {
    path: 'politica-privacidad',
    component: PoliticaPrivacidadComponent
  },
  {
    path: 'selector',
    component: SelectorTablaComponent
  },
  {
    path: 'favoritos',
    component: FavoritosComponent
  },
  {
    path: '**',
    component: DieselComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {enableViewTransitions: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
