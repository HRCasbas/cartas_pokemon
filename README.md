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
| `cartas.json` | Las 402 cartas: número, nombre y rareza. |
| `img/` | Una miniatura por carta, `1.jpg` … `402.jpg`. |

No hay nada que compilar ni ninguna librería que se pueda quedar obsoleta: son
cuatro ficheros que el navegador abre tal cual. Es a propósito, para que esto
siga funcionando dentro de unos años sin tocar nada.

## Cómo funciona

- Una marca quiere decir **"la he registrado alguna vez"**. Si regalas la carta
  sigue marcada: lo que cuenta es haberla pasado por el álbum.
- Cada uno entra, dice quién es (se guarda en el móvil) y toca una carta para
  marcarla o desmarcarla. Sólo marca las suyas.
- Las marcas y los puntos viven en **Supabase**, así que los dos ven lo mismo.
  La página se actualiza sola cada 30 segundos y al volver a ella.
- La simulación reparte los puntos de los dos juntos, **empezando por las
  cartas baratas**, y dice cuántas quedarían aún por conseguir.

## Los datos de la expansión

- **402 cartas**, todas de diamante. Las 27 secretas (estrella y corona) no
  entran: no se completan y con puntos no salen a cuenta.
- Puntos de sobre por rareza: **♦ 35 · ♦♦ 70 · ♦♦♦ 150 · ♦♦♦♦ 500**.
- Cada sobre abierto da 5 puntos; se guardan hasta 2.500 por expansión.
- El sobre está disponible del **30/09/2026 al 29/10/2026**. Los puntos **no
  caducan** cuando cierra: lo que se acaba es poder abrir más sobres.

La lista de cartas y las imágenes salen de
[Serebii](https://www.serebii.net/tcgpocket/deluxepackmega/). Página personal,
sin ánimo de lucro.
