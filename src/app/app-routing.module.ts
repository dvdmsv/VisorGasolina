import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PoliticaPrivacidadComponent } from './vistas/politica-privacidad/politica-privacidad.component';
import { SelectorTablaComponent } from './vistas/selector-tabla/selector-tabla.component';
import { FavoritosComponent } from './vistas/favoritos/favoritos.component';

const routes: Routes = [
  { path: 'diesel', component: SelectorTablaComponent },
  { path: 'dieselPremium', component: SelectorTablaComponent },
  { path: 'gasolina95', component: SelectorTablaComponent },
  { path: 'gasolina98', component: SelectorTablaComponent },
  { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
  { path: 'selector', component: SelectorTablaComponent },
  { path: 'favoritos', component: FavoritosComponent },
  { path: '**', component: SelectorTablaComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {enableViewTransitions: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
