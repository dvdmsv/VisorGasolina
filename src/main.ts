import { LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

// Sin esto los precios se formatean con punto decimal: 1.739 en lugar de 1,739.
registerLocaleData(localeEs);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-ES' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    provideHttpClient(),
    // La aplicación se usa repostando, justo donde peor cobertura hay: sin esto, abrirla sin
    // conexión daba una pantalla en blanco. Se registra cuando la aplicación ya está estable
    // para no competir con la primera carga.
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.produccion,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
}).catch(err => console.error(err));
