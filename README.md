# Cartas · Deluxe Pack: Mega

Página para que Héctor y Adrián apunten qué cartas de la expansión **Deluxe
Pack: Mega (B4b)** de *Pokémon TCG Pocket* tienen registradas, y vean de un
vistazo cuáles no tiene **ninguno de los dos**: ésas son las que hay que comprar
con puntos de sobre.

## Qué es cada cosa

| Fichero | Para qué |
|---|---|
| `index.html` | La página entera. |
| `estilos.css` | Los estilos. |
| `app.js` | Toda la lógica: marcar, filtrar y la simulación de puntos. |
| `config.js` | La dirección y la clave publicable del proyecto de Supabase. |
| `cartas.json` | Las 166 cartas metalizadas: número, nombre y rareza. |
| `img/` | Una miniatura por carta, `237.jpg` … `402.jpg`. |
| `chistes.json` | Los 100 chistes, uno por día. |

No hay nada que compilar ni ninguna librería que se pueda quedar obsoleta: son
cuatro ficheros que el navegador abre tal cual. Es a propósito, para que esto
siga funcionando dentro de unos años sin tocar nada.

## Cómo funciona

- Una marca quiere decir **"la he registrado alguna vez"**. Si regalas la carta
  sigue marcada: lo que cuenta es haberla pasado por el álbum.
- Al entrar se pide **la palabra**, una sola vez por móvil. La comprueba el
  servidor en cada petición: sin ella no devuelve nada ni deja escribir.
  **La palabra no está en el código**: vive sólo dentro de la base de datos y
  en la cabeza de los dos. Para cambiarla se vuelve a ejecutar la función
  `clave_correcta()` de [`supabase.sql`](supabase.sql) con la nueva.
- Cada uno entra, dice quién es (se guarda en el móvil) y toca una carta para
  marcarla o desmarcarla. Sólo marca las suyas.
- Al entrar, una vez al día, sale la cara de Héctor con un chiste. Hay 100 y
  van por días desde el 22/10/2026; al llegar al último se vuelve al primero.
  El botón redondo de la cabecera lo abre cuando se quiera.
- Las marcas y los puntos viven en **Supabase**, así que los dos ven lo mismo.
  La página se actualiza sola cada 30 segundos y al volver a ella.
- La simulación reparte los puntos de los dos juntos, **empezando por las
  cartas baratas**, y dice cuántas quedarían aún por conseguir.

## Dónde vive

- La web: **https://hrcasbas.github.io/cartas_pokemon/** (GitHub Pages, rama `main`).
- La base de datos: proyecto de Supabase **cartas-pokemon**, `jwumnclmdsvcdkbsvikq`,
  Irlanda, plan Free. Dos tablas, `marcas` y `puntos`, creadas con
  [`supabase.sql`](supabase.sql). **No tiene nada que ver con el proyecto de
  Cashtor**, que es otro distinto y no se toca.
- El plan Free duerme un proyecto tras una semana sin usarlo. Si un día la web
  deja de guardar, se despierta con un botón desde el panel de Supabase.

## Los datos de la expansión

- La expansión trae **429 cartas**: 402 numeradas más 27 secretas. Pero aquí
  **sólo se llevan las 166 que van de la 237 a la 402**, que son las
  **metalizadas**. Cada una tiene su gemela normal entre la 1 y la 236, y esas
  las tienen los dos enteras, así que estorbaban. Las 27 secretas (estrella y
  corona) tampoco entran: no se completan y con puntos no salen a cuenta.
- Puntos de sobre por rareza: **♦ 35 · ♦♦ 70 · ♦♦♦ 150**. Entre las 166 no hay
  ninguna ♦♦♦♦: son 71 de ♦, 65 de ♦♦ y 30 de ♦♦♦, **11.535 puntos** en total.
- Cada sobre abierto da 5 puntos; se guardan hasta 2.500 por expansión.
- El sobre está disponible del **30/09/2026 al 29/10/2026**. Los puntos **no
  caducan** cuando cierra: lo que se acaba es poder abrir más sobres.

La lista de cartas y las imágenes salen de
[Serebii](https://www.serebii.net/tcgpocket/deluxepackmega/). Página personal,
sin ánimo de lucro.
