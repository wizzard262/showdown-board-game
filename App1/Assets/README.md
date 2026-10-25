# Showdown – browser game code

A two-player isometric board game (either side, or both, can be played by the computer), built with Phaser 2 and its isometric plugin. Everything that makes it look and sound like somewhere comes from a **theme**, so the same rules can be played as cops vs gangs, knights vs goblins, and so on.

Plain JavaScript, no build step: `index.html` loads the libraries from `assets/`, the game from `js/`, then the themes, then `js/main.js`.

## Game (`js/`, in load order)

| File | What's in it |
| --- | --- |
| `data.js` | Move and shot patterns, every piece (`Piece(...)`: faction, unit, health, shots), and the six maps |
| `state.js` | Game state: `tiles` (the board), `turnStatus`, the sprite groups, and the `UI` and `Settings` objects |
| `board.js` | Setting up a map, drawing the board and pieces, and the rules for moving and shooting |
| `play.js` | Playing a turn: selecting, moving, shooting, damage, whose turn it is, victory |
| `bot.js` | The robot player: looks ahead over its goes this turn, scores each board, and plays its choice through the same functions as a tap |
| `effects.js` | Shots, wrecks, special attacks, fly-overs, the turn badges, the info window and texts |
| `ambient.js` | The theme's fly-overs, background sounds and weather |
| `menu.js` | The menu (drawn in code: how to play, weather on/off, new game, theme, player / robot for each side) and the how-to-play screen |
| `theme.js` | The theme engine: picking a theme, loading or drawing its graphics, loading or making its sounds, health bars. **Its header lists everything a theme gives** |
| `drawkit.js` | Drawing in code: isometric models (boxes, balls, cylinders, wheels) drawn in any of 4 directions, and the markers, grids, hearts and health bars every theme needs |
| `soundkit.js` | Making sounds in code: tones, noise, envelopes, filters, echo, mixing |
| `main.js` | The Phaser game: `preload`, `create`, `update` |

## Themes (`themes/`)

| Theme | What |
| --- | --- |
| `cyberpunk` | **Future City Battle**: Enforcers (cops) vs Neon Gangs in a rainy city at night. Graphics (`graphics.js`) and sounds (`sounds.js`) all made in code. The default |

With two or more themes, the player switches theme from the menu (the row only shows then); the choice is kept in `localStorage` (`showdown.theme`).

To add a theme: copy `themes/cyberpunk`, change its words, models, colours and sound recipes, and add its script tags to `index.html` (the first theme listed is the default).

## The board

`tiles[x][y]` is an object: `tileName` (which bridges the square has: north, east, south, west, e.g. `'1010'`), `piece` (or `null`), and `baseFaction` (whose base the square is part of). The two sides are called `'blue'` and `'red'` in the code; each theme gives them their names.

Each side has two goes per turn. Select a piece, then move it one square along a bridge, or shoot an enemy in its shot pattern. A side wins by destroying every enemy piece or moving onto the enemy base.
