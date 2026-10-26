/*
 * Cartas · Deluxe Pack: Mega (B4b)
 *
 * Sin librerías ni compilación: HTML, CSS y este fichero. Las marcas y los
 * puntos viven en una tabla de Supabase a la que se llega con fetch y la clave
 * publicable.
 *
 * Una marca significa "la he registrado alguna vez". Regalar la carta no la
 * desmarca: lo que importa es qué cartas no ha registrado ninguno de los dos,
 * que son las que hay que comprar con puntos de sobre.
 */

'use strict';

// El sobre deja de estar disponible el 29/10/2026 a las 22:59 (hora del Pacífico).
const FIN_DEL_SOBRE = new Date('2026-10-30T05:59:00Z');

/*
 * Sólo se llevan las metalizadas, que son las 166 que van de la 237 a la 402.
 * Las 236 primeras son las normales de expansiones anteriores y las tienen los
 * dos enteras, así que no se enseñan: estorbaban más que ayudaban.
 */
const TOTAL_CARTAS = 166;

// Lo que cuesta cambiar una carta por puntos de sobre, según su rareza.
const COSTE_POR_RAREZA = { 1: 35, 2: 70, 3: 150, 4: 500 };

const JUGADORES = {
  hector: { nombre: 'Héctor', inicial: 'H' },
  adrian: { nombre: 'Adrián', inicial: 'A' },
};

const CLAVE_JUGADOR = 'cartas.jugador';
const CLAVE_MARCAS = 'cartas.marcas';
const CLAVE_PALABRA = 'cartas.palabra';
const CLAVE_CHISTE = 'cartas.chiste';
const SEGUNDOS_ENTRE_REFRESCOS = 30;

// Desde este día se cuentan los chistes: uno por día, y al llegar al último
// se vuelve al primero.
const PRIMER_DIA = Date.UTC(2026, 9, 22);

let cartas = [];
let chistes = [];
// La palabra que abre la puerta. Va en cada petición y el servidor la comprueba.
let palabra = '';
// Conjunto de claves "numero|jugador" con las cartas registradas.
let marcas = new Set();
let puntos = { hector: 0, adrian: 0 };
let yo = null;
let filtro = 'todas';
let rareza = 0;
let busqueda = '';
let temporizador = null;

// ---------------------------------------------------------------- Supabase

function cabeceras(extra) {
  const base = {
    apikey: CONFIGURACION.clave,
    Authorization: 'Bearer ' + CONFIGURACION.clave,
    'Content-Type': 'application/json',
    'x-clave-cartas': palabra,
  };
  return extra ? Object.assign(base, extra) : base;
}

/*
 * Sin la palabra buena el servidor devuelve la lista vacía en vez de un error,
 * y la tabla de puntos siempre tiene dos filas. Así que una lista vacía aquí
 * sólo puede querer decir que la palabra no vale.
 */
function errorDePalabra() {
  const error = new Error('la palabra no vale');
  error.esDePalabra = true;
  return error;
}

async function leerMarcas() {
  const respuesta = await fetch(
    CONFIGURACION.url + '/rest/v1/marcas?select=numero_carta,jugador',
    { headers: cabeceras(), cache: 'no-store' }
  );
  if (!respuesta.ok) throw new Error('la base de datos ha contestado ' + respuesta.status);
  const filas = await respuesta.json();
  return new Set(filas.map(function (fila) {
    return fila.numero_carta + '|' + fila.jugador;
  }));
}

async function leerPuntos() {
  const respuesta = await fetch(
    CONFIGURACION.url + '/rest/v1/puntos?select=jugador,puntos',
    { headers: cabeceras(), cache: 'no-store' }
  );
  if (!respuesta.ok) throw new Error('la base de datos ha contestado ' + respuesta.status);
  const filas = await respuesta.json();
  if (filas.length === 0) throw errorDePalabra();
  const leidos = { hector: 0, adrian: 0 };
  for (const fila of filas) {
    if (fila.jugador in leidos) leidos[fila.jugador] = fila.puntos;
  }
  return leidos;
}

async function guardarMarca(numero) {
  const respuesta = await fetch(CONFIGURACION.url + '/rest/v1/marcas', {
    method: 'POST',
    headers: cabeceras({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ numero_carta: numero, jugador: yo }),
  });
  if (!respuesta.ok) throw new Error('no se ha podido marcar (' + respuesta.status + ')');
}

async function borrarMarca(numero) {
  const direccion =
    CONFIGURACION.url + '/rest/v1/marcas?numero_carta=eq.' + numero + '&jugador=eq.' + yo;
  const respuesta = await fetch(direccion, { method: 'DELETE', headers: cabeceras() });
  if (!respuesta.ok) throw new Error('no se ha podido desmarcar (' + respuesta.status + ')');
}

async function guardarPuntos(jugador, cantidad) {
  const respuesta = await fetch(CONFIGURACION.url + '/rest/v1/puntos', {
    method: 'POST',
    headers: cabeceras({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ jugador: jugador, puntos: cantidad }),
  });
  if (!respuesta.ok) throw new Error('no se han podido guardar los puntos (' + respuesta.status + ')');
}

// ------------------------------------------------------------------ Estado

function elOtro() {
  return yo === 'hector' ? 'adrian' : 'hector';
}

function laTiene(numero, jugador) {
  return marcas.has(numero + '|' + jugador);
}

function faltaEntreLosDos(carta) {
  return !laTiene(carta.numero, 'hector') && !laTiene(carta.numero, 'adrian');
}

function guardarEspejo() {
  try {
    localStorage.setItem(CLAVE_MARCAS, JSON.stringify(Array.from(marcas)));
  } catch (error) {
    // Si el navegador no deja guardar, se sigue igual: el espejo es un extra.
  }
}

function recuperarEspejo() {
  try {
    const guardado = localStorage.getItem(CLAVE_MARCAS);
    if (guardado) marcas = new Set(JSON.parse(guardado));
  } catch (error) {
    // Se queda vacío hasta que conteste la base de datos.
  }
}

// ------------------------------------------------------------------ Avisos

function avisar(texto) {
  const aviso = document.getElementById('aviso');
  if (!texto) {
    aviso.classList.add('oculto');
    return;
  }
  aviso.textContent = texto;
  aviso.classList.remove('oculto');
}

function numero(cantidad) {
  return cantidad.toLocaleString('es-ES');
}

function escapar(texto) {
  return texto.replace(/[&<>"]/g, function (caracter) {
    if (caracter === '&') return '&amp;';
    if (caracter === '<') return '&lt;';
    if (caracter === '>') return '&gt;';
    return '&quot;';
  });
}

// ------------------------------------------------------- Cómo vamos

/*
 * Reparte los puntos de los dos, juntos y empezando por las cartas baratas,
 * entre las que no ha registrado ninguno. Devuelve cuántas se comprarían,
 * cuántas quedarían y lo que costaría el resto.
 */
function simular(pendientes, puntosDisponibles) {
  const costes = pendientes
    .map(function (carta) { return COSTE_POR_RAREZA[carta.rareza]; })
    .sort(function (uno, otro) { return uno - otro; });

  let bolsa = puntosDisponibles;
  let compradas = 0;
  let gastados = 0;
  let restante = 0;

  for (const coste of costes) {
    if (bolsa >= coste) {
      bolsa -= coste;
      gastados += coste;
      compradas += 1;
    } else {
      restante += coste;
    }
  }

  return {
    compradas: compradas,
    gastados: gastados,
    sobran: bolsa,
    quedan: costes.length - compradas,
    costeDeLoQueQueda: restante,
    costeDeTodo: gastados + restante,
  };
}

function pintarSimulacion(pendientes) {
  const total = puntos.hector + puntos.adrian;
  const hueco = document.getElementById('simulacion');

  if (pendientes.length === 0) {
    hueco.innerHTML = 'Ya las tenéis <span class="destacado">todas</span>. No hace falta gastar nada.';
    return;
  }

  const cuenta = simular(pendientes, total);
  const frases = [];

  frases.push(
    'Entre los dos tenéis <span class="destacado">' + numero(total) + '</span> puntos.'
  );

  if (cuenta.compradas === 0) {
    frases.push('No llegan ni para la más barata, que cuesta ' +
      numero(Math.min.apply(null, pendientes.map(function (carta) {
        return COSTE_POR_RAREZA[carta.rareza];
      }))) + '.');
  } else {
    frases.push(
      'Comprando de lo barato a lo caro os llevaríais <span class="destacado">' +
      numero(cuenta.compradas) + '</span> ' +
      (cuenta.compradas === 1 ? 'carta' : 'cartas') +
      ' por ' + numero(cuenta.gastados) + ' puntos.'
    );
  }

  if (cuenta.quedan === 0) {
    frases.push('Con eso las completaríais y os sobrarían ' + numero(cuenta.sobran) + ' puntos.');
  } else {
    frases.push(
      'Aun así os quedarían <span class="destacado">' + numero(cuenta.quedan) + '</span> ' +
      (cuenta.quedan === 1 ? 'carta' : 'cartas') +
      ' por conseguir, que costarían otros ' + numero(cuenta.costeDeLoQueQueda) + ' puntos.'
    );
  }

  hueco.innerHTML = frases.join(' ');
}

function pintarComoVamos() {
  const otro = elOtro();
  const pendientes = [];
  let mias = 0;
  let suyas = 0;

  for (const carta of cartas) {
    if (faltaEntreLosDos(carta)) pendientes.push(carta);
    if (!laTiene(carta.numero, yo)) mias += 1;
    if (!laTiene(carta.numero, otro)) suyas += 1;
  }

  const registradas = TOTAL_CARTAS - pendientes.length;
  document.getElementById('registradas').textContent = registradas;
  document.getElementById('faltan-ambos').textContent = pendientes.length;
  document.getElementById('progreso-relleno').style.width =
    (registradas / TOTAL_CARTAS) * 100 + '%';

  document.getElementById('faltan-yo').textContent = mias;
  document.getElementById('faltan-otro').textContent = suyas;
  document.getElementById('rotulo-yo').textContent = 'le faltan a ' + JUGADORES[yo].nombre;
  document.getElementById('rotulo-otro').textContent = 'le faltan a ' + JUGADORES[otro].nombre;

  pintarSimulacion(pendientes);
}

function pintarPuntos() {
  for (const jugador of Object.keys(JUGADORES)) {
    const casilla = document.getElementById('puntos-' + jugador);
    // No se pisa lo que esté escribiendo en ese momento.
    if (document.activeElement !== casilla) casilla.value = puntos[jugador];
  }
}

// ------------------------------------------------------------------ Pintar

function cartasVisibles() {
  const otro = elOtro();
  const texto = busqueda.trim().toLowerCase();
  return cartas.filter(function (carta) {
    if (rareza !== 0 && carta.rareza !== rareza) return false;
    if (filtro === 'ambos' && !faltaEntreLosDos(carta)) return false;
    if (filtro === 'yo' && laTiene(carta.numero, yo)) return false;
    if (filtro === 'otro' && laTiene(carta.numero, otro)) return false;
    if (texto) {
      const coincide =
        carta.nombre.toLowerCase().includes(texto) || String(carta.numero) === texto;
      if (!coincide) return false;
    }
    return true;
  });
}

function pintarResumenLista(visibles) {
  const porRareza = [0, 0, 0, 0, 0];
  let coste = 0;
  for (const carta of visibles) {
    porRareza[carta.rareza] += 1;
    coste += COSTE_POR_RAREZA[carta.rareza];
  }

  const trozos = [];
  for (let nivel = 1; nivel <= 4; nivel += 1) {
    if (porRareza[nivel] > 0) trozos.push('♦'.repeat(nivel) + ' ' + porRareza[nivel]);
  }

  const cuantas = visibles.length === 1 ? '1 carta' : visibles.length + ' cartas';
  const partes = [cuantas];
  if (trozos.length > 0) partes.push(trozos.join(' · '));
  if (visibles.length > 0) partes.push(numero(coste) + ' puntos');
  document.getElementById('resumen-lista').textContent = partes.join(' · ');
}

function pintarCuadricula() {
  const visibles = cartasVisibles();
  const otro = elOtro();
  const trozos = [];

  for (const carta of visibles) {
    const esMia = laTiene(carta.numero, yo);
    const esSuya = laTiene(carta.numero, otro);
    const diamantes = '♦'.repeat(carta.rareza);
    const etiqueta = escapar(carta.nombre) + ', número ' + carta.numero +
      (esMia ? ', registrada' : ', sin registrar');
    trozos.push(
      '<button class="carta' + (esMia ? ' mia' : '') + '" data-numero="' + carta.numero +
        '" aria-pressed="' + esMia + '" title="' + etiqueta + '">' +
        (esMia ? '<span class="senal mia">' + JUGADORES[yo].inicial + '</span>' : '') +
        (esSuya ? '<span class="senal suya">' + JUGADORES[otro].inicial + '</span>' : '') +
        '<img src="img/' + carta.numero + '.jpg" alt="" loading="lazy" decoding="async" width="170" height="237">' +
        '<span class="pie-carta">' +
          '<span class="nombre">' + escapar(carta.nombre) + '</span>' +
          '<span class="datos"><span>' + carta.numero + '</span><span>' + diamantes + '</span></span>' +
        '</span>' +
      '</button>'
    );
  }

  document.getElementById('cuadricula').innerHTML = trozos.join('');
  document.getElementById('sin-resultados').classList.toggle('oculto', visibles.length > 0);
  pintarResumenLista(visibles);
}

function pintarTodo() {
  if (!yo) return;
  pintarComoVamos();
  pintarCuadricula();
}

function pintarCuentaAtras() {
  const dias = Math.ceil((FIN_DEL_SOBRE - new Date()) / 86400000);
  const hueco = document.getElementById('cuenta-atras');
  if (dias > 1) hueco.textContent = 'quedan ' + dias + ' días de sobre';
  else if (dias === 1) hueco.textContent = 'queda un día de sobre';
  else if (dias === 0) hueco.textContent = '¡hoy es el último día!';
  else hueco.textContent = 'el sobre ya ha cerrado';
}

// -------------------------------------------------------------- Interacción

async function alternar(numeroCarta) {
  const tenia = laTiene(numeroCarta, yo);
  const clave = numeroCarta + '|' + yo;

  // Se pinta antes de que conteste el servidor y se deshace si falla.
  if (tenia) marcas.delete(clave);
  else marcas.add(clave);
  pintarTodo();

  try {
    if (tenia) await borrarMarca(numeroCarta);
    else await guardarMarca(numeroCarta);
    guardarEspejo();
    avisar('');
  } catch (error) {
    if (tenia) marcas.add(clave);
    else marcas.delete(clave);
    pintarTodo();
    avisar('No se ha guardado: ' + error.message);
  }
}

async function cambiarPuntos(jugador, casilla) {
  const anterior = puntos[jugador];
  let cantidad = Math.round(Number(casilla.value));
  if (!isFinite(cantidad) || cantidad < 0) cantidad = 0;
  if (cantidad > 2500) cantidad = 2500;
  casilla.value = cantidad;
  puntos[jugador] = cantidad;
  pintarComoVamos();

  try {
    await guardarPuntos(jugador, cantidad);
    avisar('');
  } catch (error) {
    puntos[jugador] = anterior;
    casilla.value = anterior;
    pintarComoVamos();
    avisar('No se han guardado los puntos: ' + error.message);
  }
}

async function refrescar(silencioso) {
  try {
    const [marcasLeidas, puntosLeidos] = await Promise.all([leerMarcas(), leerPuntos()]);
    marcas = marcasLeidas;
    puntos = puntosLeidos;
    guardarEspejo();
    pintarPuntos();
    pintarTodo();
    avisar('');
  } catch (error) {
    if (error.esDePalabra) {
      pedirPalabra('Esa palabra ya no vale.');
    } else if (!silencioso) {
      avisar('Sin conexión con la base de datos. Lo que ves es lo último que se guardó en este móvil.');
    }
  }
}

// ---------------------------------------------------------- Chiste del día

// Medianoche de hoy en hora local, para que el chiste cambie al cambiar el día.
function diaDeHoy() {
  const ahora = new Date();
  return Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function chisteDeHoy() {
  if (chistes.length === 0) return '';
  const dias = Math.floor((diaDeHoy() - PRIMER_DIA) / 86400000);
  const indice = ((dias % chistes.length) + chistes.length) % chistes.length;
  return chistes[indice];
}

function ensenarChiste() {
  const texto = chisteDeHoy();
  if (!texto) return;
  document.getElementById('chiste-texto').textContent = texto;
  document.getElementById('chiste').classList.remove('oculto');
}

function cerrarChiste() {
  document.getElementById('chiste').classList.add('oculto');
}

// Sólo salta la primera vez que se entra cada día.
function quizaElChiste() {
  const hoy = String(diaDeHoy());
  let visto = null;
  try {
    visto = localStorage.getItem(CLAVE_CHISTE);
  } catch (error) {
    // Sin memoria del navegador saldrá cada vez; tampoco pasa nada.
  }
  if (visto === hoy) return;
  ensenarChiste();
  try {
    localStorage.setItem(CLAVE_CHISTE, hoy);
  } catch (error) {
    // Nada.
  }
}

// ------------------------------------------------------------------- Puerta

function pedirPalabra(queja) {
  const mal = document.getElementById('palabra-mal');
  if (queja) {
    mal.textContent = queja;
    mal.classList.remove('oculto');
  } else {
    mal.classList.add('oculto');
  }
  document.getElementById('puerta').classList.remove('oculto');
  document.getElementById('palabra').focus();
}

// Se prueba contra el servidor: si contesta con los dos jugadores, la palabra vale.
async function laPalabraVale(candidata) {
  const anterior = palabra;
  palabra = candidata;
  try {
    await leerPuntos();
    return true;
  } catch (error) {
    palabra = anterior;
    if (error.esDePalabra) return false;
    throw error;
  }
}

async function probarPalabra(candidata) {
  let vale;
  try {
    vale = await laPalabraVale(candidata);
  } catch (error) {
    avisar('Sin conexión con la base de datos. Prueba otra vez en un momento.');
    return false;
  }

  if (!vale) {
    pedirPalabra('Esa palabra no vale.');
    return false;
  }

  try {
    localStorage.setItem(CLAVE_PALABRA, candidata);
  } catch (error) {
    // Sin memoria del navegador se vuelve a preguntar la próxima vez.
  }
  document.getElementById('palabra-mal').classList.add('oculto');
  document.getElementById('puerta').classList.add('oculto');
  return true;
}

function elegirJugador(cual) {
  yo = cual;
  try {
    localStorage.setItem(CLAVE_JUGADOR, cual);
  } catch (error) {
    // Sin memoria del navegador se vuelve a preguntar la próxima vez.
  }
  document.getElementById('portada').classList.add('oculto');
  document.getElementById('quien-soy').textContent = JUGADORES[cual].nombre;
  pintarTodo();
  quizaElChiste();
}

function arrancarRefrescoAutomatico() {
  if (temporizador) clearInterval(temporizador);
  temporizador = setInterval(function () {
    if (!document.hidden) refrescar(true);
  }, SEGUNDOS_ENTRE_REFRESCOS * 1000);
}

// ----------------------------------------------------------------- Arranque

async function arrancar() {
  pintarCuentaAtras();
  recuperarEspejo();

  try {
    const respuesta = await fetch('cartas.json', { cache: 'no-store' });
    cartas = await respuesta.json();
  } catch (error) {
    avisar('No se ha podido cargar la lista de cartas.');
    return;
  }

  try {
    const respuesta = await fetch('chistes.json', { cache: 'no-store' });
    chistes = await respuesta.json();
  } catch (error) {
    // Sin chistes se sigue igual: la web va de cartas.
    document.getElementById('abrir-chiste').classList.add('oculto');
  }

  document.getElementById('cerrar-chiste').addEventListener('click', cerrarChiste);
  document.getElementById('abrir-chiste').addEventListener('click', ensenarChiste);
  document.getElementById('chiste').addEventListener('click', function (evento) {
    // Tocar fuera de la caja también lo cierra.
    if (evento.target.id === 'chiste') cerrarChiste();
  });

  document.getElementById('forma-palabra').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const escrita = document.getElementById('palabra').value.trim().toLowerCase();
    if (!escrita) return;
    if (await probarPalabra(escrita)) {
      document.getElementById('palabra').value = '';
      await entrar();
    }
  });

  // Sólo los de Héctor y Adrián: "Entrar" y el "Ja" del chiste comparten el
  // estilo pero no eligen a nadie.
  document.querySelectorAll('.jugador-boton[data-jugador]').forEach(function (boton) {
    boton.addEventListener('click', function () {
      elegirJugador(boton.dataset.jugador);
    });
  });

  document.getElementById('quien-soy').addEventListener('click', function () {
    document.getElementById('portada').classList.remove('oculto');
  });

  document.getElementById('cuadricula').addEventListener('click', function (evento) {
    const carta = evento.target.closest('.carta');
    if (carta) alternar(Number(carta.dataset.numero));
  });

  for (const jugador of Object.keys(JUGADORES)) {
    const casilla = document.getElementById('puntos-' + jugador);
    // Mientras escribe se recalcula la simulación; al salir de la casilla se guarda.
    casilla.addEventListener('input', function () {
      const cantidad = Math.round(Number(casilla.value));
      puntos[jugador] = isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
      pintarComoVamos();
    });
    casilla.addEventListener('change', function () {
      cambiarPuntos(jugador, casilla);
    });
  }

  document.querySelectorAll('.filtro').forEach(function (boton) {
    boton.addEventListener('click', function () {
      document.querySelectorAll('.filtro').forEach(function (otro) {
        otro.classList.remove('activo');
      });
      boton.classList.add('activo');
      filtro = boton.dataset.filtro;
      pintarCuadricula();
    });
  });

  document.querySelectorAll('.rareza').forEach(function (boton) {
    boton.addEventListener('click', function () {
      document.querySelectorAll('.rareza').forEach(function (otro) {
        otro.classList.remove('activo');
      });
      boton.classList.add('activo');
      rareza = Number(boton.dataset.rareza);
      pintarCuadricula();
    });
  });

  document.getElementById('buscador').addEventListener('input', function (evento) {
    busqueda = evento.target.value;
    pintarCuadricula();
  });

  document.getElementById('actualizar').addEventListener('click', function () {
    refrescar(false);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refrescar(true);
  });

  // La puerta va primero. Si la palabra guardada ya no vale, el primer
  // refresco lo descubre y la vuelve a pedir.
  let palabraGuardada = null;
  try {
    palabraGuardada = localStorage.getItem(CLAVE_PALABRA);
  } catch (error) {
    // Se preguntará la palabra.
  }

  if (palabraGuardada) {
    palabra = palabraGuardada;
    await entrar();
  } else {
    pedirPalabra('');
  }
}

// Ya se ha pasado la puerta: quién eres y a cargar.
async function entrar() {
  let guardado = null;
  try {
    guardado = localStorage.getItem(CLAVE_JUGADOR);
  } catch (error) {
    // Se preguntará quién eres.
  }

  if (guardado && JUGADORES[guardado]) elegirJugador(guardado);
  else document.getElementById('portada').classList.remove('oculto');

  await refrescar(false);
  arrancarRefrescoAutomatico();
}

arrancar();
