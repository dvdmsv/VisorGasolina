#!/usr/bin/env node
/**
 * Recorre la aplicación en un navegador real y comprueba lo que los tests unitarios no ven:
 * que la interfaz responde, que no hay errores de consola, que la CSP no bloquea nada y que
 * no se descarga lo que no toca.
 *
 * Necesita el build hecho y un Chrome escuchando por CDP:
 *
 *   npm run build
 *   node scripts/servir-con-cabeceras.mjs dist/visor-gasolina/browser &
 *   chrome --headless --remote-debugging-port=9222 --user-data-dir=/tmp/perfil &
 *   node scripts/probar-en-navegador.mjs [ancho]
 */
const CDP = process.env.CDP ?? 'http://localhost:9222';
const BASE = process.env.BASE ?? 'http://localhost:4330';
const ANCHO = Number(process.argv[2] ?? 390);
const MOVIL = ANCHO < 768;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let id = 0;

const pestana = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(pestana.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));

const pendientes = new Map();
const eventos = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); return; }
  if (m.method) eventos.push(m);
});
const enviar = (metodo, params = {}) =>
  new Promise(r => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method: metodo, params })); });
const evaluar = async expresion =>
  (await enviar('Runtime.evaluate', { expression: expresion, returnByValue: true, awaitPromise: true }))?.result?.result?.value;

const resultados = [];
const comprobar = (nombre, condicion, detalle = '') =>
  resultados.push({ prueba: nombre, ok: !!condicion, detalle: condicion ? '' : String(detalle).slice(0, 120) });

const peticiones = () => eventos.filter(e => e.method === 'Network.requestWillBeSent').map(e => e.params.request.url);
const filas = () => evaluar(`document.querySelectorAll('${MOVIL ? '.gas-card' : '.tabla tbody tr'}').length`);
const desborda = () => evaluar('document.documentElement.scrollWidth > document.documentElement.clientWidth');

async function elegirEnDesplegable(indice, texto) {
  await evaluar(`document.querySelectorAll('app-select-buscable')[${indice}].querySelector('.form-select').click()`);
  await sleep(350);
  await evaluar(`(() => {
    const campo = document.querySelectorAll('app-select-buscable')[${indice}].querySelector('input[type=search]');
    const asignar = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    asignar.call(campo, ${JSON.stringify(texto)});
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(450);
  const hay = await evaluar(`!!document.querySelectorAll('app-select-buscable')[${indice}].querySelector('.opcion')`);
  await evaluar(`document.querySelectorAll('app-select-buscable')[${indice}].querySelector('.opcion')?.click()`);
  return hay;
}

await enviar('Page.enable'); await enviar('Runtime.enable'); await enviar('Log.enable'); await enviar('Network.enable');
await enviar('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'granted', origin: BASE });
await enviar('Emulation.setGeolocationOverride', { latitude: 40.4155, longitude: -3.7074, accuracy: 20 });
await enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: MOVIL });

// --- Arranque limpio ---
await enviar('Page.navigate', { url: `${BASE}/diesel` });
await sleep(2500);
await evaluar(`(async () => { localStorage.clear(); for (const c of await caches.keys()) await caches.delete(c); })()`);
await enviar('Page.navigate', { url: `${BASE}/diesel` });
await sleep(3500);
comprobar('arranca invitando a elegir provincia', await evaluar(`document.body.innerText.includes('Elige una provincia')`));
comprobar('nunca se pide un listado nacional',
  !peticiones().some(u => /EstacionesTerrestres\/(FiltroProducto\/)?$/.test(u)));

// --- Provincia, localidad y filtro ---
comprobar('busca provincia ignorando tildes', await elegirEnDesplegable(0, 'avila'));
await sleep(6000);
comprobar('muestra resultados de la provincia', (await filas()) > 0);
comprobar('el nombre de la zona se escribe legible',
  (await evaluar(`document.querySelector('.resumen-zona')?.textContent`)) === 'Ávila');

await evaluar(`(() => {
  const campo = document.querySelector('#nombre');
  const asignar = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  asignar.call(campo, 'zzzz');
  campo.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(600);
comprobar('un filtro sin coincidencias se explica',
  await evaluar(`document.body.innerText.includes('Ninguna gasolinera se llama así')`));
await evaluar(`document.querySelector('.estado-vacio button')?.click()`);
await sleep(500);

// --- Mapa ---
// Los chunks diferidos se publican con nombre de hash («chunk-BqSj3jt6.js»), así que lo que se
// comprueba es que aparecen peticiones de JavaScript nuevas justo al pedir el mapa: eso es que
// Leaflet viajaba aparte y no en el paquete inicial.
const guionesIniciales = new Set(peticiones().filter(u => u.endsWith('.js')));
await evaluar(`[...document.querySelectorAll('.boton-vista')].find(b => b.textContent.includes('Mapa'))?.click()`);
await sleep(6000);
const guionesNuevos = peticiones().filter(u => u.endsWith('.js') && !guionesIniciales.has(u));
comprobar('Leaflet no viaja en el paquete inicial, se pide al abrir el mapa',
  guionesNuevos.length > 0, `chunks nuevos: ${guionesNuevos.length}`);
comprobar('se piden teselas a OpenStreetMap', peticiones().some(u => u.includes('tile.openstreetmap.org')));
comprobar('las teselas se ven (la CSP no las bloquea)',
  (await evaluar(`[...document.querySelectorAll('.leaflet-tile')].filter(i => i.complete && i.naturalWidth > 0).length`)) > 0);
const marcadores = await evaluar(`document.querySelectorAll('.marcador-precio').length`);
comprobar('cada gasolinera lleva su precio en el mapa', marcadores > 0);
// El mapa enseñaba solo la página actual, así que faltaban gasolineras: tiene que dibujar
// todas las del filtro, no las diez de la página.
const totalEstaciones = Number((await evaluar(`document.querySelector('.resumen-datos')?.textContent ?? ''`)).match(/\d+/)?.[0] ?? 0);
comprobar('el mapa dibuja todas las gasolineras, no solo la página',
  totalEstaciones > 10 && marcadores === totalEstaciones, `${marcadores} marcadores de ${totalEstaciones} estaciones`);
comprobar('la paginación desaparece con el mapa',
  !(await evaluar(`!!document.querySelector('.paginacion')`)));
comprobar('la atribución de OpenStreetMap está visible',
  (await evaluar(`document.querySelector('.leaflet-control-attribution')?.textContent ?? ''`)).includes('OpenStreetMap'));
await evaluar(`document.querySelector('.marcador-precio')?.click()`);
await sleep(700);
comprobar('al tocar una gasolinera se abre su ficha',
  (await evaluar(`document.querySelector('.popup-gasolinera')?.innerText ?? ''`)).includes('Cómo llegar'));
comprobar('el mapa no desborda la pantalla', !(await desborda()));

// La rueda estuvo desactivada para no atrapar el desplazamiento de la página, y en escritorio
// parecía que el mapa estuviera roto. El nivel de zoom se lee de la URL de las teselas, que es
// «/{z}/{x}/{y}.png».
// Se toma el mayor nivel presente, no el de la primera tesela: al acercar, Leaflet añade las
// nuevas antes de retirar las viejas, y leer una sola daba un falso negativo.
const nivelDeZoom = `(() => {
  const niveles = [...document.querySelectorAll('.leaflet-tile')]
    .map(t => Number(t.src.match(/\\/(\\d+)\\/\\d+\\/\\d+\\.png/)?.[1] ?? -1));
  return niveles.length === 0 ? -1 : Math.max(...niveles);
})()`;
const zoomAntes = await evaluar(nivelDeZoom);
await evaluar(`(() => {
  const lienzo = document.querySelector('.leaflet-container');
  const caja = lienzo.getBoundingClientRect();
  lienzo.dispatchEvent(new WheelEvent('wheel', {
    bubbles: true, cancelable: true, deltaY: -240,
    clientX: caja.left + caja.width / 2, clientY: caja.top + caja.height / 2
  }));
})()`);
await sleep(1500);
const zoomDespues = await evaluar(nivelDeZoom);
comprobar('la rueda del ratón acerca el mapa',
  zoomAntes > 0 && zoomDespues > zoomAntes, `zoom ${zoomAntes} -> ${zoomDespues}`);

// --- Ficha con el histórico ---
// Se abre desde el globo del mapa, que es la vista activa en este punto del recorrido.
await evaluar(`document.querySelector('.popup-boton')?.click()`);
await sleep(2500);
comprobar('el globo del mapa abre la ficha',
  await evaluar(`!!document.querySelector('dialog.ficha[open]')`));
comprobar('la ficha dibuja el gráfico del precio',
  (await evaluar(`document.querySelector('.grafico-linea')?.getAttribute('d') ?? ''`)).startsWith('M'));
comprobar('el gráfico no sale con coordenadas inválidas',
  !(await evaluar(`(document.querySelector('.grafico-linea')?.getAttribute('d') ?? '').includes('NaN')`)));
comprobar('el histórico se descarga como fichero estático propio',
  peticiones().some(u => /\/historico\/\d+\.json$/.test(u)));
comprobar('las fechas del histórico se piden una sola vez',
  peticiones().filter(u => u.endsWith('/historico/fechas.json')).length === 1);

const puntosMes = await evaluar(`(document.querySelector('.grafico-linea')?.getAttribute('d') ?? '').split('L').length`);
await evaluar(`[...document.querySelectorAll('.boton-rango')].find(b => b.textContent.trim() === 'Todo')?.click()`);
await sleep(900);
const puntosTodo = await evaluar(`(document.querySelector('.grafico-linea')?.getAttribute('d') ?? '').split('L').length`);
comprobar('el selector de periodo cambia la serie', puntosTodo > puntosMes,
  `1 mes: ${puntosMes} puntos, todo: ${puntosTodo}`);
comprobar('la ficha resume el cambio de la semana',
  (await evaluar(`document.querySelector('.ficha-datos')?.textContent ?? ''`)).includes('Hace 7 días'));

// Ningún rótulo debe salirse del área dibujable. Los tres se centraban, así que el primero
// pisaba la etiqueta de precio y el último se salía por la derecha.
const desbordes = await evaluar(`(() => {
  const svg = document.querySelector('.ficha-grafico svg');
  const ancho = svg.viewBox.baseVal.width;
  return [...svg.querySelectorAll('text')].filter(t => {
    const caja = t.getBBox();
    return caja.x < -0.5 || caja.x + caja.width > ancho + 0.5;
  }).map(t => t.textContent.trim());
})()`);
comprobar('ningún rótulo del gráfico se sale del área', desbordes.length === 0, desbordes.join(', '));

// El viewBox tiene que medir lo mismo que el elemento, o el texto sale estirado.
const proporcion = await evaluar(`(() => {
  const svg = document.querySelector('.ficha-grafico svg');
  return Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width);
})()`);
comprobar('el gráfico no deforma el texto', proporcion <= 1, `viewBox y ancho real difieren en ${proporcion}px`);

// Seguimiento del precio por día.
await evaluar(`(() => {
  const svg = document.querySelector('.ficha-grafico svg');
  const c = svg.getBoundingClientRect();
  svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: c.left + c.width * 0.6, clientY: c.top + c.height / 2 }));
})()`);
await sleep(500);
const avisoRaton = await evaluar(`document.querySelector('.grafico-aviso')?.textContent?.trim().replace(/\\s+/g, ' ') ?? ''`);
comprobar('señalar el gráfico muestra el precio de ese día', /\d,\d{3}\s*€/.test(avisoRaton), avisoRaton);
comprobar('y también la fecha del día señalado', /\d{4}/.test(avisoRaton), avisoRaton);

await evaluar(`(() => {
  const svg = document.querySelector('.ficha-grafico svg');
  svg.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
})()`);
await sleep(400);
comprobar('al salir del gráfico se suelta el día señalado',
  !(await evaluar(`!!document.querySelector('.grafico-aviso')`)));

// Sin teclado, el seguimiento sería inalcanzable para quien no use ratón.
await evaluar(`document.querySelector('.ficha-grafico svg').focus()`);
await enviar('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await sleep(500);
const primerDia = await evaluar(`document.querySelector('.grafico-aviso-fecha')?.textContent?.trim() ?? ''`);
comprobar('las flechas del teclado recorren los días', primerDia !== '', primerDia);

await enviar('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await sleep(500);
const segundoDia = await evaluar(`document.querySelector('.grafico-aviso-fecha')?.textContent?.trim() ?? ''`);
comprobar('cada pulsación avanza un día', segundoDia !== primerDia, `${primerDia} -> ${segundoDia}`);

// Con un día señalado, el primer Escape solo suelta el indicador: cerrar la ficha entera al
// intentar quitarlo haría perder el gráfico.
await enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(600);
comprobar('el primer Escape suelta el día sin cerrar la ficha',
  (await evaluar(`!!document.querySelector('dialog.ficha[open]')`)) &&
  !(await evaluar(`!!document.querySelector('.grafico-aviso')`)));

await enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(700);
comprobar('la ficha se cierra con Escape',
  !(await evaluar(`!!document.querySelector('dialog.ficha[open]')`)));

// --- Tema ---
const temaAntes = await evaluar(`document.documentElement.getAttribute('data-bs-theme')`);
await evaluar(`document.querySelectorAll('.accion')[1].click()`);
await sleep(1200);
comprobar('el tema cambia', (await evaluar(`document.documentElement.getAttribute('data-bs-theme')`)) !== temaAntes);
comprobar('el mapa acompaña al tema',
  (await evaluar(`document.querySelector('.mapa')?.classList.contains('mapa-oscuro')`)) === (temaAntes !== 'dark'));

// --- Vuelta a la lista ---
await evaluar(`[...document.querySelectorAll('.boton-vista')].find(b => b.textContent.includes('Lista'))?.click()`);
await sleep(800);
comprobar('se puede volver a la lista', (await filas()) > 0);

// --- Ubicación ---
await evaluar(`document.querySelector('.boton-ubicacion').click()`);
await sleep(9000);
comprobar('la búsqueda por ubicación devuelve resultados', (await filas()) > 0);
comprobar('la zona pasa a ser «Cerca de ti»',
  (await evaluar(`document.querySelector('.resumen-zona')?.textContent`)) === 'Cerca de ti');
comprobar('solo se piden las provincias cercanas',
  peticiones().some(u => u.includes('FiltroProvinciaProducto/')));

const errores = eventos
  .filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
  .map(e => (e.params.exceptionDetails?.exception?.description || e.params.entry?.text || '').slice(0, 140));
comprobar('sin errores de consola', errores.length === 0, errores.join(' | '));
comprobar('sin violaciones de la CSP',
  !eventos.some(e => e.method === 'Log.entryAdded' && /Content Security Policy/i.test(e.params.entry.text ?? '')));

const fallos = resultados.filter(r => !r.ok);
console.log(`${ANCHO}px: ${resultados.length - fallos.length}/${resultados.length} comprobaciones`);
for (const fallo of fallos) {
  console.log(`  FALLA: ${fallo.prueba}${fallo.detalle ? ` — ${fallo.detalle}` : ''}`);
}
ws.close();
process.exit(fallos.length === 0 ? 0 : 1);
