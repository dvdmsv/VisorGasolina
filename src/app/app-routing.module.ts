import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DieselComponent } from './vistas/diesel/diesel.component';
import { GasolinaComponent } from './vistas/gasolina/gasolina.component';

const routes: Routes = [
  {
    path: 'diesel',
    component: DieselComponent
  },
  {
    path: 'gasolina',
    component: GasolinaComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
