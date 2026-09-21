import { Routes } from '@angular/router';
import { COMBUSTIBLES } from './clases/combustibles';
import { SelectorTablaComponent } from './vistas/selector-tabla/selector-tabla.component';

// Las cuatro rutas de combustible comparten componente: el combustible activo se decide
// por la preferencia guardada, no por la ruta.
const rutasCombustible: Routes = COMBUSTIBLES.map(combustible => ({
  path: combustible.ruta,
  component: SelectorTablaComponent,
  title: `${combustible.etiqueta} — VisorGasolina`
}));

export const routes: Routes = [
  ...rutasCombustible,
  {
    path: 'favoritos',
    title: 'Favoritos — VisorGasolina',
    loadComponent: () => import('./vistas/favoritos/favoritos.component').then(m => m.FavoritosComponent)
  },
  {
    path: 'politica-privacidad',
    title: 'Política de privacidad — VisorGasolina',
    loadComponent: () => import('./vistas/politica-privacidad/politica-privacidad.component')
      .then(m => m.PoliticaPrivacidadComponent)
  },
  { path: 'selector', redirectTo: COMBUSTIBLES[0].ruta },
  { path: '**', redirectTo: COMBUSTIBLES[0].ruta }
];
