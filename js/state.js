/*
 * Showdown - game state
 */

/*
 * The board: tiles[x][y] (see CreateTiles in board.js)
 *   tileName     board tile: bridges north, east, south, west as '1010' etc.; '0000' = no square
 *   piece        the piece on it (see Piece in data.js), or null
 *   baseFaction  'blue' / 'red' if this square is part of that side's base
 */
var tiles;

// Whose turn it is. Each side gets two goes (moveCounter 1 then 0) before the turn passes.
//   currentTurnFaction 'blue', 'red', or 'none' once someone has won
//   factionFlipBounce  the new side's pieces are bouncing to show it's their turn
var turnStatus;

var isoBaseSize = 128;      // size of a board square
var cursorPos;              // 3D position of the pointer on the board

//=== sprite groups, back to front
var isoGroupBackground;     // the board squares
var isoGroupIndicators;     // move and shot-pattern indicators (under the pieces)
var isoGroupPieces;         // the pieces (and the red target markers)
var isoGroupHotspots;       // invisible tap areas on shootable pieces

var moveIndicatorSprites;
var shootIndicatorSprites;
var mapText;                // 'level X of Y' (not currently shown)

// Display objects
var UI = {
	fireAnimation: null,
	blueBadge_1: null,     // the badges top right show whose turn it is
	blueBadge_2: null,
	redBadge_1: null,
	redBadge_2: null,

	// the info window (bottom left) for the selected piece
	infoWindow: undefined,
	infoPiece: undefined,
	infoRange: undefined,
	infoHeart4: undefined,
	infoHeart3: undefined,
	infoHeart2: undefined,
	infoHeart1: undefined,

	weatherEmitter: null,
	robotLabels: {},        // 'robot' under the badges of a side the computer plays
	controlPanel: null,     // the menu button, top left
	specialTexts: [],       // the special attack's words while they show
	menu: undefined,
	robotMenuRow: null,     // the menu's robot players row (see menu.js)
	instructions: undefined
};

var Settings = {
	weatherOn: true,
	showInstructionScreen: false,
	robot: { blue: false, red: false }  // which sides the computer plays (see bot.js)
};
