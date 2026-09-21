# CLAUDE.md

Guía para trabajar en este repositorio. El contexto funcional está en [`README.md`](README.md) y el
análisis de riesgos en [`docs/auditoria.md`](docs/auditoria.md).

## Resumen

SPA de Angular 22 sin backend que consulta la API pública de carburantes del Ministerio. Todo el
estado del usuario vive en `localStorage`. Se despliega en Netlify.

## Comandos

```bash
npm start           # desarrollo en http://localhost:4200
npm run build       # build de producción
npm test            # Vitest (una pasada, sin watch)
npm run verificar:css  # comprueba que no falta ningún módulo de Bootstrap (necesita build)
npm audit           # debe quedar en 0 vulnerabilidades
```

## Arquitectura

```
src/
  styles.scss            importación modular de Bootstrap + parciales propios
  styles/
    _tokens.scss         variables propias (colores de precio, radios)
    _tarjetas.scss       estilos compartidos por la tabla y las tarjetas
  app/
    app.routes.ts        rutas; favoritos y política se cargan con loadComponent
    clases/              modelos y funciones puras
      combustibles.ts    lista blanca de combustibles (ruta, campo de la API, etiqueta)
      respuesta-api.ts   forma real de las respuestas del Ministerio
      mapeo.ts           conversión de la respuesta a modelos de dominio
      texto.ts           comoNombrePropio y paraBuscar (búsquedas sin tildes)
    servicios/
      api-gasolineras    peticiones, caché y reintentos
      favoritos          favoritos en localStorage (signal)
      preferencias       preferencias en localStorage (signal)
      theme              modo claro/oscuro vía data-bs-theme
      ubicacion          geolocalización, distancias y cálculo de ahorro
      pantalla           si toca tabla o tarjetas, según el ancho
      cache-respuestas   copia del listado nacional en disco, con caducidad
      precarga           adelanta esa descarga en segundo plano
      alertas            SweetAlert2 con el tema aplicado, cargado bajo demanda
    compartido/
      select-buscable    desplegable con buscador (sustituye a mat-select)
      icono              iconos SVG embebidos
      precio.pipe        formato de precio español: 1,739 €
    vistas/              componentes de página
```

`SelectorTablaComponent` es la vista principal: mantiene el estado en *signals* y deriva con
`computed` el filtrado, la paginación y el cálculo de costes. No debe volver a acumular lógica de
dominio: esa va a `clases/` (si es pura) o a un servicio.

Las cuatro rutas de combustible comparten componente; el combustible activo lo decide la
preferencia guardada, no la ruta.

## Sistema de estilos

- **Bootstrap se importa por módulos** en `src/styles.scss` para no cargar lo que no se usa.
  Su personalización (paleta, tipografía, radios) va en variables SCSS **antes** de importar
  `variables`, de modo que todos los componentes derivan de ahí en lugar de parchearse después.
- **Riesgo conocido**: si una plantilla usa una clase cuyo módulo no está importado, el build pasa
  y el fallo solo se ve en pantalla. Ocurrió con `pagination` (la paginación salía como lista con
  viñetas) y `transitions` (`.collapse` no existía y el menú móvil no se plegaba). Por eso
  `npm run verificar:css` corre en CI: cruza las clases de las plantillas con el CSS compilado.
  Si añades una clase de Bootstrap nueva, importa su módulo.
- Los tokens propios viven en `src/styles/_tokens.scss` y lo compartido entre la vista de precios
  y la de favoritos en `src/styles/_tarjetas.scss`. Nada de copiar estilos entre componentes.
- El tema oscuro sale de `data-bs-theme`; no se añaden clases condicionales de tema en las
  plantillas ni `!important`.
- La tipografía es **Instrument Sans**, autoalojada con `@fontsource-variable/instrument-sans`.
  No añadir fuentes externas: la CSP solo permite `font-src 'self'`.
- Los precios y las distancias se formatean siempre con `PrecioPipe` o `DecimalPipe`; el locale
  `es-ES` se registra en `src/main.ts`.
- Los textos de la API llegan en mayúsculas: `comoNombrePropio` (`src/app/clases/texto.ts`) los
  hace legibles. El rótulo comercial se respeta tal cual.
- Toda búsqueda pasa por `paraBuscar` (`src/app/clases/texto.ts`), que ignora tildes y mayúsculas:
  «agreda» debe encontrar «Ágreda» tanto en los desplegables como en el filtro por nombre.
- La vista de resultados tiene cuatro estados (`inicial`, `cargando`, `listo`, `error`). Un fallo
  de la API usa `error`, nunca `listo` con la lista vacía: decir «no hay resultados» cuando el
  problema es del servidor confunde al usuario.

## Convenciones

- **Todo en español**: código, nombres de archivo, comentarios, commits y documentación.
- Componentes *standalone* con `ChangeDetectionStrategy.OnPush` e `inject()` en lugar de
  constructor injection.
- Los controles interactivos miden al menos `var(--vg-toque)` (44 px) de alto.
- Cuidado con los `effect`: si dentro se lee un signal que la propia acción reescribe, el efecto
  se repite sin fin. El efecto que reacciona a la ruta envuelve su trabajo en `untracked` por eso.
- Estado en *signals*; nada de `ChangeDetectorRef` manual.
- Plantillas con `@if` / `@for`; nada de `*ngIf` / `*ngFor`.
- El tema oscuro se resuelve con las variables de Bootstrap (`var(--bs-*)`) y `data-bs-theme`.
  No añadir clases condicionales de tema en las plantillas ni `!important`.
- Los estilos compartidos entre vistas van a `src/styles/`, no se copian entre componentes.
- La lista de resultados tiene dos formas, tabla y tarjetas. **Solo se dibuja una**, con
  `@if (esEscritorio())` sobre `PantallaService`: ocultar la otra con CSS obligaba a construir
  las dos y una provincia grande llegaba a 1.700 filas en el DOM.

## API del Ministerio: rarezas que hay que respetar

Base: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/`

- Precios y coordenadas llegan como **texto con coma decimal** (`aNumero` en `clases/mapeo.ts`).
- Campos con tilde: `Rótulo`, `Dirección`. Campo con espacios y paréntesis: `Longitud (WGS84)`.
- **La API tiene un typo propio: devuelve `IDPovincia`**, sin la «r», en el listado de provincias y
  en cada estación. No es un error del proyecto; no lo "corrijas" al leer.
- Una estación que no sirve un combustible trae la cadena vacía en ese campo.
- El listado de todas las estaciones y todos los combustibles (`EstacionesTerrestres/`) pesa
  **12,2 MB**, la API **no lo comprime** (da lo mismo pedirlo con `Accept-Encoding: gzip`) y
  responde `Cache-Control: private`, así que ningún intermediario lo cachea. **No se usa.**
- La búsqueda por ubicación pide `EstacionesTerrestres/FiltroProducto/{idProducto}`: el listado
  nacional de **un solo combustible, 4,3 MB**, con exactamente las mismas estaciones que lo sirven
  (11.268 de 11.483 para el gasóleo A, todas con coordenadas y precio). El `idProducto` de cada
  combustible está en `clases/combustibles.ts`. En estas respuestas el precio viene en un único
  campo, `PrecioProducto`, no en uno por combustible.
- Cada combustible se descarga y cachea por separado. Quien use el GPS con tres o más combustibles
  distintos en la misma media hora acabaría descargando más que con el listado completo; a cambio,
  el caso normal —un solo combustible— gasta un tercio.
- Ese listado **no se pide durante la carga inicial**, pero sí se adelanta justo después, en
  segundo plano: con una conexión mala, descargarlo en el momento de pulsar «cerca de mí» deja la
  función inservible. La estrategia son tres capas, de más rápida a más lenta:
  1. `CacheRespuestasService` guarda la respuesta en disco (Cache Storage) durante 30 minutos, que
     es lo que tardan los precios en cambiar. Sobrevive a la recarga.
  2. `PrecargaService` la descarga en un hueco libre del navegador (`requestIdleCallback`), después
     del primer pintado, disparado desde `AppComponent` con `afterNextRender`. Respeta
     `navigator.connection.saveData`.
  3. Si el usuario se adelanta, la descarga en curso se comparte y la barra muestra su progreso.
- Medido a 3 Mbps y 400 ms de latencia: pulsar el botón tarda 11,7 s si no hay nada guardado, 11 ms
  con la precarga terminada y 13 ms en una segunda visita (sin gastar datos). El arranque solo se
  retrasa 105 ms respecto a no precargar.
- `listadoNacionalPedido` significa «hay descarga en marcha o hecha»; `listadoNacionalListo`, «ya se
  puede usar». La vista necesita el segundo para decidir si enseña la barra de progreso.
- El listado se pide **como texto** (`responseType: 'text'`) para guardarlo en disco sin volver a
  serializar 12 MB; el `JSON.parse` se hace una sola vez.
- Hay un test que vigila que la carga inicial de la vista no lo pida.

## Despliegue y avisos

- **Cada push a `master` despliega a producción.** Trabajar en rama y validar la *deploy preview*.
- `netlify.toml` define una CSP estricta y el redirect SPA (`/* -> /index.html`), imprescindible
  desde que se retiró `HashLocationStrategy`. Un script en línea en `index.html` violaría la CSP:
  si hace falta lógica temprana, va en `AppComponent`.
- **`optimization.styles.inlineCritical` debe seguir en `false`**: inyecta un
  `<link onload="...">` en el HTML que `script-src 'self'` bloquea. Ya rompió producción una vez
  (commit `6f40193`). Para comprobarlo sin desplegar, sirve `dist/visor-gasolina/browser` con las
  cabeceras de `netlify.toml` y mira la consola.
- No hay fuentes ni recursos externos. Si se añade alguno, hay que abrir su dominio en la CSP.
- Los `budgets` de `angular.json` están ajustados al tamaño real del bundle: si el build avisa de
  que se supera, conviene mirar qué ha entrado antes de subir el límite.
- Al regenerar `package-lock.json`, ver la nota sobre `--legacy-peer-deps` en el README.
