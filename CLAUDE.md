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

npm run recolectar:historico   # descarga fechas nuevas a datos/dias/ (ver «El histórico»)
npm run generar:historico      # transpone datos/dias/ a una serie por estación (lo hace el build)
```

### Probar la interfaz en un navegador real

`npm run probar:navegador [ancho]` recorre la aplicación y comprueba las 21 cosas que los tests
unitarios no pueden ver: que la CSP no bloquea las teselas, que Leaflet no viaja en el paquete
inicial, que el mapa dibuja marcadores y atribución, que el tema arrastra al mapa, que un filtro
sin resultados se explica y que no se pide ningún listado nacional. Necesita tres cosas en marcha:

```bash
npm run build
npm run servir:cabeceras &     # sirve el build con la CSP real de netlify.toml, en :4330
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/perfil &
npm run probar:navegador 390   # y 1440 para escritorio
```

**El perfil de Chrome debe ser nuevo en cada tanda**: el permiso de geolocalización y la caché en
disco se arrastran entre ejecuciones y dan falsos negativos (la propia batería vacía
`localStorage` y `caches`, pero no puede rehacer el perfil).

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
      mapa-gasolineras   mapa con Leaflet, cargado bajo demanda
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

## El mapa

- Los resultados se ven como **lista o mapa**, con un conmutador que recuerda la elección en la
  preferencia `vista`.
- **El mapa dibuja `gasolineras()`, no `gasolinerasPagina()`**: todas las del filtro, y la
  paginación se oculta mientras está abierto. Paginarlo dejaba fuera la mayoría de las estaciones
  de una ciudad, que es justo lo que se va a buscar en un mapa. El peor caso es Madrid con 865
  estaciones (la provincia con más de España): medido, **706 ms en dibujarse y 61 fps al
  arrastrar**, así que no hace falta agrupar marcadores. Los popups se construyen al abrirlos
  (`bindPopup` con función), no los 865 por adelantado.
- **Leaflet se carga bajo demanda** con `@defer`, igual que SweetAlert2: son 42 KB más su hoja de
  estilos, y no entran en el paquete inicial. Se publica como **CommonJS**, así que al importarlo
  dinámicamente su API queda en `default` (ver `cargarLeaflet`); sin eso, `L.map` no es una función.
- El componente usa `ViewEncapsulation.None` porque el CSS de Leaflet tiene que alcanzar los
  elementos que crea fuera de Angular. Todos sus estilos cuelgan de `.mapa` para no escaparse.
- Los marcadores son `divIcon`, es decir, HTML: enseñan el precio con los colores de la lista y no
  descargan ninguna imagen. El más barato lleva mayor `zIndexOffset` para que no quede tapado.
- **Las teselas son de OpenStreetMap** (`tile.openstreetmap.org`), el único proveedor serio que
  funciona sin registrarse: CARTO devuelve una imagen de «API KEY REQUIRED» y Wikimedia responde
  403. Al comprobar un proveedor **no basta el código HTTP**: hay que mirar la imagen, o comparar el
  tamaño de dos teselas distintas (si pesan igual, es un aviso).
- OpenStreetMap no tiene mapa oscuro: el tema oscuro **invierte las teselas con un filtro CSS**
  sobre `.leaflet-tile-pane`, sin pedir nada a otro servidor. Hay que bajar la saturación o los
  bosques quedan en verde fosforescente.
- La atribución de OpenStreetMap es obligatoria y va visible en el propio mapa.
- **La rueda del ratón hace zoom** (`scrollWheelZoom: true`). Estuvo desactivada para que el mapa
  no atrapara el desplazamiento de la página, pero en escritorio parecía roto. El compromiso se
  asume a conciencia: en la vista de mapa el mapa es el contenido principal. Si alguna vez molesta,
  la alternativa es exigir Ctrl + rueda y avisarlo en pantalla, no volver a desactivarlo a secas.
- `img-src` de la CSP está abierto a `https://tile.openstreetmap.org`. Si se cambia de proveedor hay
  que tocar `netlify.toml` **y** `mapa.util.ts`, y revisar la política de privacidad: con el mapa,
  la aplicación dejó de poder decir que no hay terceros.
- El presupuesto `anyComponentStyle` está en 24 kB por la hoja de Leaflet (14,8 kB), no porque los
  estilos propios hayan crecido.

## El histórico de precios

- **El histórico es de la propia API**, no se recolecta desde cero:
  `EstacionesTerrestresHist/{dd-MM-yyyy}` devuelve el listado nacional de una fecha concreta y
  llega al menos hasta 2010. No está documentado, así que puede cambiar sin aviso.
- El `IDEESS` es **estable en el tiempo**: de las 8.099 estaciones de 2010, 7.035 siguen hoy y el
  100 % conserva dirección y municipio. Por eso es la clave del histórico. Está en
  `Gasolinera.id`, y es opcional porque los favoritos guardados antes de existir ese campo no lo
  tienen.
- **Son 12 MB por fecha, sin comprimir y sin filtro por provincia** (`FiltroProvincia` sobre el
  histórico responde 400). Pedirlo desde el navegador es imposible: 90 días serían 1,1 GB. De ahí
  la cadena en tres pasos:

```
API ──► datos/dias/{aaaa-mm-dd}.json ──► datos/generado/historico/{IDEESS}.json ──► navegador
     recolectar-historico.mjs      generar-historico.mjs (prebuild)      2,8 KB por ficha
       (workflow diario)                (no toca la API)
```

- **Lo que se versiona está partido por fecha y lo que se descarga, por estación.** Son los dos
  formatos opuestos a propósito: por fecha nada se reescribe nunca y git no engorda; por estación
  el navegador baja 2,8 KB en vez de 1,3 MB. Partir por municipio no sirve: la mediana son 4
  series, pero Madrid capital tiene 710.
- **El muestreo es decreciente**: diario los últimos 90 días y semanal hacia atrás. Dos años en
  diario serían 730 descargas de 12 MB para una resolución que nadie mira.
- `datos/generado/` **no se versiona**: lo rehace el `prebuild` en cada build, también en Netlify.
- **El eje horizontal del gráfico va por tiempo, no por posición en el array.** Con el muestreo
  decreciente, repartir los puntos a espacios iguales dedicaba media anchura a tres meses y la
  otra media a dos años: la curva mentía.
- **El `viewBox` del gráfico mide lo mismo que el elemento en pantalla**, medido con un
  `ResizeObserver`. Con un `viewBox` fijo y `preserveAspectRatio="none"`, el SVG se estiraba al
  ancho real y **deformaba todo el texto**, casi al doble en escritorio. Si se vuelve a fijar el
  `viewBox`, hay que volver a mirar los rótulos.
- Las marcas de fecha se anclan a su borde (`start`, `middle`, `end`): centradas, la primera
  pisaba la etiqueta del eje de precios y la última se salía. La batería lo comprueba con
  `getBBox()` de cada texto contra el `viewBox`.
- Al señalar el gráfico —puntero, dedo o flechas del teclado— sale el precio de ese día. Con un
  día señalado, **Escape solo suelta el indicador**; hace falta un segundo Escape para cerrar la
  ficha, porque cerrarla al intentar quitar el indicador hacía perder el gráfico.
- **Nada de `DatePipe` en la ficha**: arrastra el formateador de fechas de Angular al paquete
  inicial (10,7 kB) aunque el componente sea diferido. Las fechas se formatean con `Intl` en
  `historico.util.ts`.
- Si no hay fichero para una estación, es que es nueva: la ficha dice que no hay datos. Un 404
  **no se reintenta**, porque es una respuesta definitiva.

## Uso sin conexión (PWA): retirado, y por qué

**No hay service worker en producción.** Se implementó y funcionaba —verificado con la red
cortada: la aplicación arrancaba, recordaba la última búsqueda y el gráfico seguía disponible—,
pero hubo que retirarlo.

**Netlify inyecta un comentario publicitario de 326 bytes en el `index.html` servido** (1819 →
2145 bytes). El service worker de Angular compara el hash del fichero que generó el build con el
que recibe del servidor; al no coincidir se degrada a `EXISTING_CLIENTS_ONLY`, y en ese estado
**responde 504 a todo lo que no tenga cacheado**. El síntoma visible fue el mapa sin teselas
(0 de 18) aunque OpenStreetMap respondía en 40 ms y la CSP no bloqueaba nada.

Se diagnostica pidiendo `/ngsw/state` **desde el navegador** (con curl no vale: esa ruta la
atiende el propio worker):

```
Driver state: EXISTING_CLIENTS_ONLY (Degraded due to: Hash mismatch ... /index.html)
```

Lo probado y descartado: `[build.processing] skip_processing = true` **no** evita la inyección,
porque ocurre en el edge y no en el post-procesado; no hay ajuste documentado para desactivarla.

En su lugar se publica el **safety worker** de Angular con el nombre `ngsw-worker.js`: los
navegadores que ya tuvieran el anterior lo sustituyen por este, que se desregistra y borra sus
cachés. La cabecera `no-cache` de `ngsw-worker.js` en `netlify.toml` es lo que permite que ese
reemplazo llegue; sin ella habría quedado cacheado un año.

**Si se retoma**, no sirve `@angular/service-worker` tal cual: hace falta un worker propio que no
dependa de que el HTML servido sea byte a byte el que se generó, o un alojamiento que no toque el
HTML.

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
  las dos, y Madrid (865 estaciones) llegaba así a unas 1.700 filas en el DOM.

## API del Ministerio: rarezas que hay que respetar

Base: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/`

- Precios y coordenadas llegan como **texto con coma decimal** (`aNumero` en `clases/mapeo.ts`).
- Campos con tilde: `Rótulo`, `Dirección`. Campo con espacios y paréntesis: `Longitud (WGS84)`.
- **La API tiene un typo propio: devuelve `IDPovincia`**, sin la «r», en el listado de provincias y
  en cada estación. No es un error del proyecto; no lo "corrijas" al leer.
- Una estación que no sirve un combustible trae la cadena vacía en ese campo.
- **La búsqueda por ubicación pide solo las provincias cercanas**, no ningún listado nacional:
  `EstacionesTerrestres/FiltroProvinciaProducto/{idProvincia}/{idProducto}`, entre 16 y 322 KB por
  provincia. El listado completo (12,2 MB) y el de un solo combustible (4,3 MB) ya no se usan; la
  API además **no comprime** y responde `Cache-Control: private`.
- La provincia se deduce con `provinciasCercanas` (`clases/limites-provincias.ts`), una tabla de
  1,8 KB con el rectángulo que ocupan las estaciones de cada provincia, ampliado 0,25° (unos 25 km)
  para no perder las que quedan al otro lado de un límite. Devuelve entre una y cuatro provincias,
  y ninguna fuera de España. **La regenera `npm run generar:limites`**; no se edita a mano.
- Contrastado contra el listado nacional en seis puntos (capitales, un límite provincial y una
  isla): devuelve exactamente las mismas gasolineras, con las mismas distancias.
- El precio llega en el campo único `CAMPO_PRECIO_PRODUCTO`, no en uno por combustible, y el
  `idProducto` de cada combustible está en `clases/combustibles.ts`.
- **Cuidado con los datos del Ministerio**: hay estaciones en (0,0) y alguna con la latitud y la
  longitud intercambiadas. `mapearGasolineras` descarta lo que cae fuera del territorio español.
- `PrecargaService` adelanta esas provincias al abrir, pero **solo si el permiso de ubicación ya
  estaba concedido** (`UbicacionService.permisoConcedido`, que pregunta a la Permissions API y, en
  Safari, a la preferencia `usaUbicacion`). Nunca se llama a `getCurrentPosition` a ciegas: sacaría
  el diálogo del navegador a quien acaba de entrar. Respeta `navigator.connection.saveData`.
- `CacheRespuestasService` guarda cada respuesta en disco media hora, que es cada cuánto cambian los
  precios: la segunda visita no descarga nada.
- Medido a 3 Mbps con 400 ms de latencia: un usuario nuevo ve resultados **1,5 s** después de pulsar
  el botón (410 KB en Madrid); en la segunda visita, **11 ms** y 0 KB. Sin permiso concedido, abrir
  la web no descarga ningún listado.
- Al probarlo en un navegador hay que vaciar también la caché en disco
  (`for (const c of await caches.keys()) await caches.delete(c)`), no solo `localStorage`.

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
