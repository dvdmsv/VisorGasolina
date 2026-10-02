#!/usr/bin/env node
/**
 * Transpone datos/dias/*.json a una serie por estación en datos/generado/historico/.
 *
 * Lo que el repositorio guarda está partido por fecha, porque así nada se reescribe nunca y git
 * no engorda. Lo que el navegador necesita es lo contrario: todas las fechas de UNA estación.
 * Este script es el puente, y corre en el build (`prebuild`), sin pedir nada a la API.
 *
 * No se parte por municipio: la mediana son 4 series por municipio, pero Madrid capital tiene
 * 710, y nadie debería descargar 1,3 MB para ver una gasolinera. Por estación son ~2,8 KB.
 *
 *   node scripts/generar-historico.mjs
 */
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const ORIGEN = 'datos/dias';
const DESTINO = 'datos/generado/historico';

const ficheros = (await readdir(ORIGEN)).filter(n => n.endsWith('.json')).sort();
if (ficheros.length === 0) {
  console.error(`No hay nada en ${ORIGEN}/. Ejecuta antes: node scripts/recolectar-historico.mjs`);
  process.exit(1);
}

const fechas = ficheros.map(n => n.slice(0, -'.json'.length));

/** series: IDEESS -> idProducto -> array de precios alineado con `fechas` (null en los huecos). */
const series = new Map();

for (const [indice, fichero] of ficheros.entries()) {
  const porProducto = JSON.parse(await readFile(`${ORIGEN}/${fichero}`, 'utf8'));

  for (const [idProducto, precios] of Object.entries(porProducto)) {
    for (const [id, precio] of Object.entries(precios)) {
      let estacion = series.get(id);
      if (estacion === undefined) {
        estacion = {};
        series.set(id, estacion);
      }
      // Se crea al vuelo y se rellena de null: una estación puede aparecer a mitad de la serie
      // porque abrió después, o dejar de servir un combustible.
      (estacion[idProducto] ??= new Array(fechas.length).fill(null))[indice] = precio;
    }
  }
}

await rm(DESTINO, { recursive: true, force: true });
await mkdir(DESTINO, { recursive: true });

// Las fechas van una sola vez en su propio fichero: repetirlas en cada estación multiplicaría
// por once mil el mismo dato.
await writeFile(`${DESTINO}/fechas.json`, JSON.stringify(fechas), 'utf8');

let bytes = 0;
for (const [id, porProducto] of series) {
  // Los arrays creados tarde quedan cortos si la estación dejó de aparecer: se igualan todos.
  for (const precios of Object.values(porProducto)) {
    while (precios.length < fechas.length) {
      precios.push(null);
    }
  }
  const contenido = JSON.stringify(porProducto);
  bytes += contenido.length;
  await writeFile(`${DESTINO}/${id}.json`, contenido, 'utf8');
}

const medio = (bytes / series.size / 1024).toFixed(1);
console.log(`${fechas.length} fechas (${fechas[0]} a ${fechas.at(-1)})`);
console.log(`${series.size} estaciones en ${DESTINO}/, ${medio} KB de media, ${(bytes / 1024 / 1024).toFixed(1)} MB en total`);
