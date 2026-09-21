#!/usr/bin/env node
/**
 * Comprueba que toda clase de Bootstrap usada en las plantillas existe en el CSS compilado.
 *
 * src/styles.scss importa Bootstrap por módulos para no cargar lo que no se usa. El riesgo de
 * hacerlo es silencioso: si falta un módulo, la plantilla sigue compilando y el fallo solo se ve
 * en pantalla. Pasó con `pagination` (los números salían como lista con viñetas) y con
 * `transitions` (el menú móvil no se plegaba).
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIRECTORIO_PLANTILLAS = 'src';
const DIRECTORIO_CSS = 'dist/visor-gasolina/browser';
const DIRECTORIO_BOOTSTRAP = 'node_modules/bootstrap/scss';

async function archivos(directorio, extensiones) {
  const encontrados = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...(await archivos(ruta, extensiones)));
    } else if (extensiones.includes(extname(entrada.name))) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

/** Clases escritas en los atributos class de las plantillas. */
async function clasesUsadas() {
  const usadas = new Map();

  for (const ruta of await archivos(DIRECTORIO_PLANTILLAS, ['.html'])) {
    const contenido = await readFile(ruta, 'utf8');
    for (const coincidencia of contenido.matchAll(/class="([^"]*)"/g)) {
      for (const clase of coincidencia[1].split(/\s+/)) {
        // Se ignoran las interpolaciones y los enlaces de Angular.
        if (clase === '' || clase.includes('{{') || clase.includes('(') || clase.includes('[')) {
          continue;
        }
        if (!usadas.has(clase)) {
          usadas.set(clase, ruta);
        }
      }
    }

    // Clases condicionales: [class.collapse]="..." — así se usaba la que faltaba.
    for (const coincidencia of contenido.matchAll(/\[class\.([a-z][a-z0-9-]*)\]/gi)) {
      if (!usadas.has(coincidencia[1])) {
        usadas.set(coincidencia[1], ruta);
      }
    }
  }
  return usadas;
}

/** Clases que Bootstrap define en su código fuente, se importen o no. */
async function clasesDeBootstrap() {
  const definidas = new Set();
  for (const ruta of await archivos(DIRECTORIO_BOOTSTRAP, ['.scss'])) {
    const contenido = await readFile(ruta, 'utf8');
    for (const coincidencia of contenido.matchAll(/\.([a-z][a-z0-9-]*)/gi)) {
      definidas.add(coincidencia[1]);
    }
  }
  return definidas;
}

async function cssCompilado() {
  const hojas = (await archivos(DIRECTORIO_CSS, ['.css']));
  if (hojas.length === 0) {
    console.error(`No hay CSS en ${DIRECTORIO_CSS}. Ejecuta "npm run build" antes.`);
    process.exit(2);
  }
  return (await Promise.all(hojas.map(h => readFile(h, 'utf8')))).join('\n');
}

const [usadas, deBootstrap, css] = await Promise.all([
  clasesUsadas(),
  clasesDeBootstrap(),
  cssCompilado()
]);

const ausentes = [];
for (const [clase, plantilla] of usadas) {
  // Solo se comprueban las clases que Bootstrap conoce: las propias del proyecto viven en
  // los estilos de cada componente, que esbuild renombra.
  if (!deBootstrap.has(clase)) {
    continue;
  }
  if (!css.includes(`.${clase}`)) {
    ausentes.push({ clase, plantilla });
  }
}

if (ausentes.length > 0) {
  console.error('Clases de Bootstrap usadas en las plantillas que no están en el CSS compilado.');
  console.error('Falta importar su módulo en src/styles.scss:\n');
  for (const { clase, plantilla } of ausentes) {
    console.error(`  .${clase}  (${plantilla})`);
  }
  process.exit(1);
}

console.log(`Correcto: las ${usadas.size} clases de las plantillas están definidas.`);
