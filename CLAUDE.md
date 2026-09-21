# CLAUDE.md

Guía para trabajar en este repositorio. Se actualiza al cerrar cada fase de la modernización.

## Qué es

**VisorGasolina** es una SPA en Angular, sin backend propio, que consulta la API pública de precios
de carburantes del Ministerio para la Transformación Digital y de la Función Pública de España.
Permite buscar gasolineras por provincia/localidad o por geolocalización, comparar precios frente a
la media, calcular el coste real de un repostaje incluyendo el desplazamiento, y guardar favoritos.

Todo el estado del usuario vive en el navegador (`localStorage`). No hay servidor, ni base de datos,
ni autenticación.

## Stack

- Angular (ver `package.json` para la versión exacta), TypeScript en modo `strict`.
- Bootstrap 5 como único sistema de estilos.
- `ngx-pagination` para la paginación, `sweetalert2` para los diálogos.
- Build con el builder `application` (esbuild).
- Despliegue en Netlify.

## Comandos

```bash
npm start          # servidor de desarrollo en http://localhost:4200
npm run build      # build de producción en dist/visor-gasolina/browser
npm test           # tests unitarios
npm audit          # revisión de vulnerabilidades
```

## Arquitectura

```
src/app/
  clases/      modelos de dominio (Gasolinera, Provincia, Localidad)
  servicios/   acceso a la API, tema claro/oscuro, favoritos, preferencias
  vistas/      componentes de página y de UI
```

Rutas (`app-routing.module.ts`): `diesel`, `dieselPremium`, `gasolina95`, `gasolina98` apuntan todas
al mismo `SelectorTablaComponent`; el combustible activo se decide por la preferencia guardada, no
por la ruta. Además: `favoritos`, `politica-privacidad` y un comodín `**`.

`SelectorTablaComponent` es el componente central y concentra la mayor parte de la lógica.

## API del Ministerio

Base: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/`

| Endpoint | Uso |
|---|---|
| `Listados/Provincias/` | listado de provincias |
| `EstacionesTerrestres/FiltroProvincia/{IDProvincia}` | estaciones de una provincia (y de aquí se derivan sus localidades) |
| `EstacionesTerrestres/FiltroMunicipio/{IDMunicipio}` | estaciones de un municipio |
| `EstacionesTerrestres/` | **listado nacional completo: ~12 MB.** Solo para la búsqueda por GPS, nunca en la carga inicial |

Rarezas que hay que respetar al parsear:

- Los precios y coordenadas vienen como texto con **coma decimal**: hay que hacer `replace(',', '.')`.
- Hay campos con tilde en el nombre: `Rótulo`, `Dirección`.
- Un campo con espacios y paréntesis: `Longitud (WGS84)`.
- La API tiene un **typo propio**: devuelve `IDPovincia` (sin la "r"), no `IDProvincia`. No es un error
  nuestro; no "corregirlo" al leer la respuesta.
- Las gasolineras sin ese combustible traen el precio como cadena vacía.
- Los datos se refrescan cada media hora en origen.

## Convenciones

- **Código, comentarios, commits y documentación en español**, incluidos los nombres de variables y
  de archivos. Es la convención existente del proyecto: mantenerla.
- Los archivos de componentes usan nombres en español (`vistas/selector-tabla`, `servicios/favoritos.service.ts`).

## Despliegue y riesgos

- **Cada push a `master` despliega a producción en Netlify.** Trabajar siempre en rama y validar la
  *deploy preview* antes de fusionar.
- `netlify.toml` define una **CSP estricta**. Por eso `optimization.fonts.inline` y
  `styles.inlineCritical` están en `false` en `angular.json` (commits `287c10d` y `6f40193`): si se
  reactivan sin ajustar la CSP, la app se rompe en producción pero **no** en local.
- La API del Ministerio es un punto único de fallo: si cambia el formato o cae, la app deja de servir.
