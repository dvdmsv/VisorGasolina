# VisorGasolina

Aplicación web para consultar y comparar los precios de los carburantes en las gasolineras de
España, a partir de los datos oficiales del Ministerio para la Transformación Digital y de la
Función Pública.

No tiene backend propio: es una SPA de Angular que consulta directamente la API pública del
Ministerio desde el navegador y guarda las preferencias del usuario en su propio dispositivo.

## Qué hace

- **Precios por provincia y localidad** de diésel, diésel premium, gasolina 95 y gasolina 98,
  ordenados de más barato a más caro.
- **Comparación con la media**: los precios por debajo de la media de la zona se muestran en verde
  y los que están por encima, en rojo.
- **Gasolineras cerca de mí**: con el permiso de ubicación del navegador, busca las estaciones en un
  radio de 20 km y las ordena por distancia.
- **Calculadora de ahorro**: calcula lo que cuesta *de verdad* repostar en cada gasolinera sumando
  el combustible que se gasta en llegar hasta ella y volver, y señala la mejor opción. Una
  gasolinera más barata pero lejana a menudo no compensa.
- **Favoritos**: guarda las estaciones habituales en el navegador.
- **Modo claro y oscuro**, que respeta la preferencia del sistema la primera vez.
- **Pensada para el móvil**: pestañas de combustible siempre a mano, resultados en tarjetas y
  tabla completa en pantallas grandes.
- Cada dirección enlaza con su posición exacta en Google Maps.

## Puesta en marcha

Requiere Node.js 20.19+, 22.12+ o 24+.

```bash
npm ci                 # instalar dependencias
npm start              # servidor de desarrollo en http://localhost:4200
npm test               # tests unitarios (Vitest)
npm run build          # build de producción en dist/visor-gasolina/browser
npm run verificar:css  # comprueba que el CSS compilado define todo lo que usan las plantillas
```

> Si hubiera que regenerar `package-lock.json` desde cero, `npm install` puede fallar con
> `Cannot read properties of null (reading 'edgesOut')`: es un fallo conocido del resolutor de npm
> con los *peers* opcionales de Vitest. Se resuelve con `npm install --legacy-peer-deps`; el
> `package-lock.json` resultante funciona con `npm ci` sin ninguna marca adicional.

## Stack

| | |
|---|---|
| Framework | Angular 22 (componentes *standalone*, *signals*, `@if`/`@for`) |
| Estilos | Bootstrap 5 (importación modular de SCSS), tokens propios e Instrument Sans autoalojada |
| Diálogos | SweetAlert2, cargado bajo demanda |
| Tests | Vitest sobre jsdom |
| Build | `@angular/build` (esbuild) |
| Despliegue | Netlify, automático en cada push a `master` |

## Origen de los datos

Los precios provienen de la API pública de carburantes del Ministerio:

```
https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/
```

| Endpoint | Para qué |
|---|---|
| `Listados/Provincias/` | listado de provincias |
| `EstacionesTerrestres/FiltroProvincia/{id}` | estaciones de una provincia y sus localidades |
| `EstacionesTerrestres/FiltroMunicipio/{id}` | estaciones de un municipio |
| `EstacionesTerrestres/` | listado nacional completo (~12 MB), solo para la búsqueda por GPS |

Los datos se actualizan en origen cada media hora. La aplicación no los almacena ni los transforma
más allá de lo necesario para mostrarlos.

## Privacidad

No hay servidor, ni cookies, ni analítica, ni seguimiento. Las preferencias y los favoritos se
guardan en el `localStorage` del navegador y las coordenadas de la geolocalización se usan solo
para calcular distancias en el propio dispositivo.

## Documentación

- [`CLAUDE.md`](CLAUDE.md): guía técnica para trabajar en el repositorio.
- [`docs/auditoria.md`](docs/auditoria.md): partes críticas de la aplicación, riesgos y mejoras
  pendientes.

## Licencia

Proyecto personal. Los datos de precios son del Ministerio para la Transformación Digital y de la
Función Pública y se consultan a través de su API pública.
