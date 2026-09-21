# Auditoría de VisorGasolina

Estado a 21 de septiembre de 2026, tras la modernización a Angular 22 y el rediseño de la interfaz.

## 1. Qué es crítico en esta aplicación

Ordenado por lo que más daño hace si falla.

### 1.1 La API del Ministerio es un punto único de fallo

Toda la aplicación existe para mostrar esos datos y **no hay alternativa ni copia**. Si la sede
electrónica cae, cambia el formato de la respuesta o deja de enviar `Access-Control-Allow-Origin`,
la aplicación deja de servir para nada, y no hay forma de arreglarlo desde el cliente.

Mitigaciones ya implantadas: tiempo máximo de espera, dos reintentos espaciados, caché en memoria
por provincia y un estado de error propio con botón de reintento, en lugar del *spinner* infinito
que había antes. Comprobado bloqueando el dominio del Ministerio en el navegador.

Mitigación pendiente: una función de Netlify que haga de proxy con caché (ver 2.6).

### 1.2 El parseo de la respuesta

Es la parte con más superficie de rotura silenciosa, porque depende de detalles frágiles del
proveedor: nombres de campo con tilde, un campo con paréntesis, comas decimales y el typo
`IDPovincia` de la propia API. Un cambio de cualquiera de ellos no produce un error visible: produce
una lista vacía o precios erróneos.

Está aislado en `src/app/clases/mapeo.ts` como funciones puras y cubierto por tests con la forma
real de la respuesta. Cualquier cambio en el formato debería empezar por ahí.

### 1.3 Los favoritos del usuario

Es el único dato que el usuario genera y vive únicamente en el `localStorage` de su navegador: si se
pierde, no hay copia. Aquí estaba **el peor fallo del proyecto**, ya corregido: el servicio no leía
`localStorage` al arrancar, de modo que tras recargar la página añadir un favorito machacaba los
anteriores y eliminar uno los borraba todos. Hay tests que reproducen ese escenario exacto.

Pendiente: permitir exportar e importar los favoritos (ver 2.4).

### 1.4 La preferencia de combustible

El valor guardado se usa para **indexar** el campo de precio en la respuesta de la API. Un valor
corrupto provocaba un `TypeError` que rompía la vista. Ahora pasa siempre por la lista blanca de
`clases/combustibles.ts`.

### 1.5 El volumen de datos de la API

La API del Ministerio sirve sus listados **sin comprimir** (pedirlos con `Accept-Encoding: gzip`
devuelve exactamente los mismos bytes) y con `Cache-Control: private`, así que ningún intermediario
los cachea. Sus tamaños condicionan todo el diseño:

| Consulta | Tamaño |
|---|---|
| Todas las estaciones y combustibles | 12,2 MB |
| Todas las estaciones de un combustible | 4,3 MB |
| **Una provincia y un combustible** | **16–322 KB** |

La búsqueda por ubicación usa la última: deduce las provincias cercanas con una tabla de límites de
1,8 KB calculada desde los propios datos del Ministerio y pide solo esas. Contrastado contra el
listado nacional en seis puntos —capitales, un límite provincial y una isla—, devuelve exactamente
las mismas gasolineras con las mismas distancias.

Medido a 3 Mbps con 400 ms de latencia:

| Situación | Tarda | Datos |
|---|---|---|
| Usuario nuevo pulsa «Cerca de mí» | **1,5 s** | 410 KB en Madrid |
| Segunda visita dentro de la media hora | **11 ms** | **0 KB** |
| Abrir la web sin permiso de ubicación | — | **0 KB de listados** |

Para comparar: con el listado nacional completo, ese primer caso tardaba 31,9 s y gastaba 11,9 MB.

Quien ya concedió el permiso de ubicación tiene además esas provincias precargadas al abrir, así
que el botón responde al instante. A quien no lo ha concedido no se le pide nada al entrar: sacar el
diálogo del navegador sin que el usuario haya pedido nada hace que mucha gente lo deniegue por
reflejo, y entonces pierde la función.

La tabla de límites hay que regenerarla de vez en cuando con `npm run generar:limites`: si el
Ministerio añade estaciones en un extremo de una provincia, su rectángulo crece.

### 1.6 La cadena de despliegue

Un push a `master` va directo a producción. La CSP de `netlify.toml` es estricta, así que un recurso
externo nuevo o un script en línea rompen la aplicación **en producción pero no en local**. El
workflow de CI (build, tests y auditoría) reduce el riesgo, pero conviene validar la *deploy
preview* antes de fusionar.

## 2. Qué se puede mejorar

Por orden de relación entre valor y esfuerzo.

### 2.1 Accesibilidad

Ya cubierto: etiquetas en todos los campos, `aria-label` en los botones de icono,
`aria-current` en las pestañas, `aria-pressed` en la estrella de favoritos, foco visible en todo
el recorrido de tabulación, zonas táctiles de 44 px, `prefers-reduced-motion` respetado y
navegación por teclado del desplegable (flechas, `Home`, `End`, `Enter`, `Escape` y
`aria-activedescendant`).

Contraste medido en el navegador, en ambos temas: todos los textos revisados quedan por encima
de 4,5:1 (el más justo es el precio por debajo de la media en tema claro, 4,97:1).

Queda pendiente:

- Anunciar los cambios de resultados con una región `aria-live`, para quien navegue con lector.
- Revisar con un lector de pantalla real: lo medido es el marcado, no la experiencia.

### 2.2 Uso offline (PWA)

La aplicación se usa en carretera, justo donde peor cobertura hay. Un *service worker*
(`@angular/pwa`) permitiría abrirla sin conexión y mostrar los últimos precios consultados, además
de poder instalarla en la pantalla de inicio.

### 2.3 Mapa de resultados

Hoy cada gasolinera enlaza con Google Maps de una en una. Ver todas a la vez sobre un mapa es la
forma natural de elegir, sobre todo en la búsqueda por ubicación. Requiere una librería ligera
(MapLibre o Leaflet) y abrir el dominio de teselas en la CSP.

### 2.4 Exportar e importar favoritos

Descargar un JSON y volver a cargarlo. Son pocas líneas y elimina el riesgo de perder los datos al
cambiar de navegador o limpiar el almacenamiento.

### 2.5 SEO

Ya hay `meta description`, Open Graph, títulos por ruta, `robots.txt` y URLs autosuficientes: la
ruta manda sobre la preferencia guardada, así que un enlace a `/gasolina98` muestra gasolina 98 a
quien lo reciba.

Falta el `sitemap.xml`: hace falta conocer el dominio definitivo de Netlify para no publicar URLs
inventadas.

### 2.6 Proxy con caché en Netlify

Pedir solo la provincia ya está hecho (ver 1.5) y deja la descarga en 16–322 KB. El siguiente paso,
si alguna vez hace falta, sería una función en el propio hosting que reciba las coordenadas y
devuelva solo las gasolineras cercanas, unos 20 KB, con caché compartida entre usuarios y un punto
donde amortiguar las caídas del Ministerio. Dejaría de ser una aplicación solo de frontend.

### 2.7 Detalles de calidad

- **Linter y formateador**: el proyecto no tiene ESLint ni Prettier. Con `ng add @angular/eslint`
  se automatiza gran parte de la coherencia del código.
- **«Todas» en el tamaño de página** dibuja las 862 filas de una provincia grande de golpe. Con
  `content-visibility` y dibujando solo la vista que toca, en una CPU cuatro veces más lenta que
  la de un móvil actual tarda 416 ms en móvil y 688 ms en escritorio, frente a los 933 ms de
  antes. Sigue siendo el punto más caro de la interfaz: una lista virtualizada lo bajaría más.
- **Zoneless**: Angular 22 permite eliminar `zone.js` (unos 35 kB y mejor rendimiento). El estado ya
  está en *signals*, así que el cambio es viable, pero conviene hacerlo con calma y probando a mano.
- **Ordenación configurable**: por precio, distancia o coste total, hoy implícita según el modo.
- **Histórico de precios**: el Ministerio publica datos diarios; mostrar la tendencia de una
  gasolinera daría un valor que ningún competidor directo ofrece gratis.

## 3. Estado tras la modernización

| | Antes | Ahora |
|---|---|---|
| Angular | 18.2 | 22.1 |
| `npm audit` | 79 vulnerabilidades (3 críticas, 30 altas) | 0 |
| Dependencias de producción | 19 | 7 |
| Paquete inicial | 1,21 MB (240 kB transferidos) | 555 kB (124 kB transferidos) |
| CSS | 322 kB (Bootstrap + tema de Material) | 158 kB (Bootstrap modular) |
| Descarga en la carga inicial | 12,2 MB de JSON | ninguna |
| Peticiones a dominios externos | Google Fonts (2) | ninguna |
| Tests | 10 *specs* autogenerados y rotos | 112 tests sobre la lógica crítica |
| Interfaz | Bootstrap y Material mezclados, menú móvil roto, paginación sin estilos | un solo sistema, verificado en Chrome de 320 a 1440 px |
