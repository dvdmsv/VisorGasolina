# Auditoría de VisorGasolina

Estado a 21 de septiembre de 2026, tras la modernización a Angular 22.

## 1. Qué es crítico en esta aplicación

Ordenado por lo que más daño hace si falla.

### 1.1 La API del Ministerio es un punto único de fallo

Toda la aplicación existe para mostrar esos datos y **no hay alternativa ni copia**. Si la sede
electrónica cae, cambia el formato de la respuesta o deja de enviar `Access-Control-Allow-Origin`,
la aplicación deja de servir para nada, y no hay forma de arreglarlo desde el cliente.

Mitigaciones ya implantadas: tiempo máximo de espera, dos reintentos espaciados, caché en memoria
por provincia y mensaje de error explícito en lugar del *spinner* infinito que había antes.

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

### 1.5 El listado nacional de 12 MB

Es el recurso más caro con diferencia. Descargarlo sin que el usuario lo pida castiga la carga
inicial y el plan de datos de quien entra desde el móvil. Antes se pedía en cada carga de página;
ahora solo al pulsar «Gasolineras cerca de mí», y hay un test que lo comprueba.

### 1.6 La cadena de despliegue

Un push a `master` va directo a producción. La CSP de `netlify.toml` es estricta, así que un recurso
externo nuevo o un script en línea rompen la aplicación **en producción pero no en local**. El
workflow de CI (build, tests y auditoría) reduce el riesgo, pero conviene validar la *deploy
preview* antes de fusionar.

## 2. Qué se puede mejorar

Por orden de relación entre valor y esfuerzo.

### 2.1 Accesibilidad

Es lo que peor está. El trabajo hecho (etiquetas para los campos, `aria-label` en los botones de
icono, `aria-expanded` en los desplegables) es el mínimo. Queda:

- Navegación por teclado completa en el desplegable con buscador: flechas, `Home`/`End`,
  `aria-activedescendant`.
- Revisar el contraste de los colores de precio en ambos temas con un medidor real.
- Anunciar los cambios de resultados con una región `aria-live`.
- Indicador de foco visible y coherente en toda la aplicación.

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

Ya hay `meta description`, Open Graph y títulos por ruta. Faltan `robots.txt` y `sitemap.xml`, y
una URL por combustible que sea autosuficiente: hoy las cuatro rutas muestran lo mismo según la
preferencia guardada, así que compartir un enlace no garantiza que el destinatario vea ese
combustible. Que la ruta mande sobre la preferencia sería más correcto y mejor para SEO.

### 2.6 Proxy con caché en Netlify

Una función que sirviera el listado nacional ya filtrado por zona evitaría mandar 12 MB al
navegador, permitiría cachear la respuesta media hora y daría un punto donde amortiguar las caídas
del Ministerio. Es la mejora de rendimiento con más recorrido que queda.

### 2.7 Detalles de calidad

- **Linter y formateador**: el proyecto no tiene ESLint ni Prettier. Con `ng add @angular/eslint`
  se automatiza gran parte de la coherencia del código.
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
| Tests | 10 *specs* autogenerados y rotos | 69 tests sobre la lógica crítica |
