#!/usr/bin/env node
/**
 * Descarga el histórico de precios del Ministerio y lo guarda en datos/dias/.
 *
 * La API expone `EstacionesTerrestresHist/{dd-MM-yyyy}` con el listado nacional de una fecha
 * concreta —comprobado: llega al menos hasta 2010—, pero son 12 MB por fecha, no comprime y no
 * acepta filtro por provincia. Por eso no se pide desde el navegador: se recolecta aquí y
 * `generar-historico.mjs` lo transpone a una serie por estación.
 *
 * El muestreo es decreciente: diario los últimos 90 días, que es lo que sirve para decidir si
 * repostar hoy, y semanal hacia atrás. Guardar dos años en diario serían 730 descargas de 12 MB
 * para una resolución que nadie va a mirar.
 *
 *   node scripts/recolectar-historico.mjs                  # dos años hacia atrás
 *   node scripts/recolectar-historico.mjs --desde=2024-01-01
 *   node scripts/recolectar-historico.mjs --solo-ayer      # lo que ejecuta el workflow diario
 *
 * Es incremental: salta las fechas que ya están descargadas, así que se puede interrumpir y
 * relanzar sin perder el trabajo hecho.
 */
import { writeFile, readdir, mkdir } from 'node:fs/promises';

const BASE =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestresHist/';
const DIRECTORIO = 'datos/dias';

/** Campo de la API e idProducto de cada combustible, igual que en src/app/clases/combustibles.ts. */
const COMBUSTIBLES = [
  { campo: 'Precio Gasoleo A', idProducto: '4' },
  { campo: 'Precio Gasoleo Premium', idProducto: '5' },
  { campo: 'Precio Gasolina 95 E5', idProducto: '1' },
  { campo: 'Precio Gasolina 98 E5', idProducto: '3' }
];

const DIAS_EN_DIARIO = 90;
const ANOS_POR_DEFECTO = 2;
const REINTENTOS = 4;

const argumentos = process.argv.slice(2);
const soloAyer = argumentos.includes('--solo-ayer');
const desdeArgumento = argumentos.find(a => a.startsWith('--desde='))?.slice('--desde='.length);

const unDia = 86_400_000;
const aIso = fecha => fecha.toISOString().slice(0, 10);
const aApi = iso => iso.split('-').reverse().join('-');
const esperar = ms => new Promise(r => setTimeout(r, ms));

/**
 * Fechas a recolectar, de la más reciente a la más antigua. Nunca incluye hoy: la API publica el
 * histórico del día cerrado, y el precio de hoy ya lo da la aplicación en vivo.
 */
function fechasAMuestrear(desde) {
  const ayer = new Date(Date.now() - unDia);
  ayer.setUTCHours(0, 0, 0, 0);
  const limite = new Date(`${desde}T00:00:00Z`);
  const fechas = [];

  for (let i = 0; i < DIAS_EN_DIARIO; i++) {
    const fecha = new Date(ayer.getTime() - i * unDia);
    if (fecha < limite) {
      return fechas;
    }
    fechas.push(aIso(fecha));
  }

  let fecha = new Date(ayer.getTime() - DIAS_EN_DIARIO * unDia);
  while (fecha >= limite) {
    fechas.push(aIso(fecha));
    fecha = new Date(fecha.getTime() - 7 * unDia);
  }
  return fechas;
}

/** Precio en milésimas de euro: entero, sin coma decimal ni errores de redondeo. */
function aMilesimas(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    return null;
  }
  const numero = parseFloat(texto.replace(',', '.'));
  if (Number.isNaN(numero) || numero <= 0) {
    return null;
  }
  return Math.round(numero * 1000);
}

async function descargar(iso) {
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    try {
      const respuesta = await fetch(BASE + aApi(iso));
      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }
      const datos = await respuesta.json();
      const estaciones = datos.ListaEESSPrecio ?? [];
      if (estaciones.length === 0) {
        throw new Error('la lista vino vacía');
      }
      return estaciones;
    } catch (error) {
      if (intento === REINTENTOS) {
        throw error;
      }
      // La API del Ministerio falla de forma intermitente con respuestas de 12 MB.
      await esperar(intento * 3000);
    }
  }
}

function aFicheroCompacto(estaciones) {
  const porProducto = {};
  for (const { campo, idProducto } of COMBUSTIBLES) {
    porProducto[idProducto] = {};
  }

  for (const estacion of estaciones) {
    const id = estacion.IDEESS;
    if (!id) {
      continue;
    }
    for (const { campo, idProducto } of COMBUSTIBLES) {
      const precio = aMilesimas(estacion[campo]);
      if (precio !== null) {
        porProducto[idProducto][id] = precio;
      }
    }
  }
  return porProducto;
}

await mkdir(DIRECTORIO, { recursive: true });
const yaDescargadas = new Set(
  (await readdir(DIRECTORIO)).filter(n => n.endsWith('.json')).map(n => n.slice(0, -'.json'.length))
);

const desde = desdeArgumento ??
  aIso(new Date(Date.now() - ANOS_POR_DEFECTO * 365 * unDia));
const fechas = soloAyer ? [aIso(new Date(Date.now() - unDia))] : fechasAMuestrear(desde);
const pendientes = fechas.filter(f => !yaDescargadas.has(f));

console.log(`Fechas a cubrir: ${fechas.length} (desde ${fechas.at(-1)} hasta ${fechas[0]})`);
console.log(`Ya descargadas: ${fechas.length - pendientes.length}. Pendientes: ${pendientes.length}`);

let hechas = 0;
for (const iso of pendientes) {
  try {
    const estaciones = await descargar(iso);
    const compacto = aFicheroCompacto(estaciones);
    await writeFile(`${DIRECTORIO}/${iso}.json`, JSON.stringify(compacto), 'utf8');
    hechas++;
    const series = Object.values(compacto).reduce((s, p) => s + Object.keys(p).length, 0);
    console.log(`[${hechas}/${pendientes.length}] ${iso}: ${estaciones.length} estaciones, ${series} precios`);
  } catch (error) {
    console.error(`[${hechas}/${pendientes.length}] ${iso}: FALLA (${error.message}); se reintentará en otra pasada`);
  }
}

console.log(`Listo: ${hechas} fechas nuevas en ${DIRECTORIO}/`);
