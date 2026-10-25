/*
 * Showdown - game data
 *   moveArray / shootArray  how pieces move and shoot
 *   pieces                  every piece, with its stats (see Piece below)
 *   tilesInit1..6           the six maps
 */

//=== each pair is a possible move from the current position: i.e. [0,1] is (x+0) and (y+1)
var moveArray = [[-1, 0], [1, 0], [0, -1], [0, 1]];

//=== each list is the squares a piece can shoot, one list per direction: i.e. [0,1] is (x+0) and (y+1)
var shootArray = {
	one_linear: [
		[[0, 1]],
		[[0, -1]],
		[[1, 0]],
		[[-1, 0]]
	],
	two_linear: [
		[[0, 1], [0, 2]],
		[[0, -1], [0, -2]],
		[[1, 0], [2, 0]],
		[[-1, 0], [-2, 0]]
	],
	three_linear: [
		[[0, 1], [0, 2], [0, 3]],
		[[0, -1], [0, -2], [0, -3]],
		[[1, 0], [2, 0], [3, 0]],
		[[-1, 0], [-2, 0], [-3, 0]]
	],
	two_diaganol: [
		[[-1, -1], [-2, -2]],
		[[1, 1], [2, 2]],
		[[1, -1], [2, -2]],
		[[-1, 1], [-2, 2]]
	]
};

/*
 * A game piece. What it looks and sounds like comes from the theme (js/theme.js), by faction and unit.
 *   faction        'blue' or 'red' (the two sides; the theme gives them their names)
 *   unit           'hero_army', 'army', 'vehicle', 'rider' or 'cannon' (used in sprite and sound names)
 *   health         current health (also in the sprite name, e.g. blue_army_right_4)
 *   direction      'up', 'right', 'down' or 'left': which way it faces
 *   shootsDiagonal riders shoot diagonally
 *   shootArray     squares it can shoot (from shootArray above)
 *   canSpecialHit    heroes can land a special hit: instant kill
 *   scale          sprite scale
 *   shotRangeImage the shot pattern image shown in the info window
 *   initialHealth  full health
 */
function Piece(faction, unit, health, direction, shootPattern, shootsDiagonal, canSpecialHit, scale) {
	return {
		faction: faction,
		unit: unit,
		health: health,
		direction: direction,
		shootsDiagonal: shootsDiagonal,
		shootArray: shootArray[shootPattern],
		canSpecialHit: canSpecialHit,
		scale: scale,
		shotRangeImage: shootPattern,
		initialHealth: health
	};
}

//                     faction   unit         health dir     shots           diagonal special scale
var pieces = {
	R_hero1:       Piece('red', 'hero_army', 3, 'left',  'one_linear',   false, true,  0.7),
	R_hero2:       Piece('red', 'hero_army', 3, 'left',  'one_linear',   false, true,  0.7),
	R_army1:       Piece('red', 'army',      4, 'left',  'one_linear',   false, false, 0.7),
	R_army2:       Piece('red', 'army',      4, 'left',  'one_linear',   false, false, 0.7),
	R_vehicle1:    Piece('red', 'vehicle',   3, 'left',  'three_linear', false, false, 1),
	R_vehicle2:    Piece('red', 'vehicle',   3, 'left',  'three_linear', false, false, 1),
	R_rider1:      Piece('red', 'rider',     2, 'left',  'two_diaganol', true,  false, 1),
	R_rider2:      Piece('red', 'rider',     2, 'left',  'two_diaganol', true,  false, 1),
	R_cannon1:     Piece('red', 'cannon',    3, 'left',  'two_linear',   false, false, 1),
	R_cannon2:     Piece('red', 'cannon',    3, 'left',  'two_linear',   false, false, 1),
	B_hero1:       Piece('blue',  'hero_army', 3, 'right', 'one_linear',   false, true,  0.7),
	B_hero2:       Piece('blue',  'hero_army', 3, 'right', 'one_linear',   false, true,  0.7),
	B_army1:       Piece('blue',  'army',      4, 'right', 'one_linear',   false, false, 0.7),
	B_army2:       Piece('blue',  'army',      4, 'right', 'one_linear',   false, false, 0.7),
	B_vehicle1:    Piece('blue',  'vehicle',   3, 'right', 'three_linear', false, false, 1),
	B_vehicle2:    Piece('blue',  'vehicle',   3, 'right', 'three_linear', false, false, 1),
	B_rider1:      Piece('blue',  'rider',     2, 'right', 'two_diaganol', true,  false, 1),
	B_rider2:      Piece('blue',  'rider',     2, 'right', 'two_diaganol', true,  false, 1),
	B_cannon1:     Piece('blue',  'cannon',    3, 'right', 'two_linear',   false, false, 1),
	B_cannon2:     Piece('blue',  'cannon',    3, 'right', 'two_linear',   false, false, 1)
};

/*
 * The maps. Each is a grid of tiles: tilesInitN[x][y] = [y, x, tileName, piece, baseFaction]
 *   tileName     board tile: 4 digits for bridges to the north, east, south, west (1 = bridge); '0000' = no square
 *   piece        the piece starting there, or null
 *   baseFaction  'blue' / 'red' if this square is part of that side's base, else null
 * (the first two numbers are not used by the game; CreateTiles in board.js turns these into tile objects)
 */
//========= map 1 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject, baseFaction]
var tilesInit1 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', pieces.B_army1, 'blue'],
		[2, 1, '1110', pieces.B_rider1, 'blue'],
		[3, 0, '1010', pieces.B_hero1, 'blue'],
		[4, 0, '1100', pieces.B_vehicle1, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0000', null, null],
		[2, 2, '0101', null, null],
		[3, 1, '0111', null, null],
		[4, 1, '1110', null, null],
		[5, 0, '1001', null, null],
		[6, 0, '0000', null, null]
	],
	[
		[2, 3, '0000', null, null],
		[3, 2, '0111', null, null],
		[4, 2, '1101', null, null],
		[5, 1, '0011', null, null],
		[6, 1, '1100', null, null],
		[7, 0, '0000', null, null]
	],
	[
		[3, 3, '0000', null, null],
		[4, 3, '0111', null, null],
		[5, 2, '1011', null, null],
		[6, 2, '1110', null, null],
		[7, 1, '1101', null, null],
		[8, 1, '0000', null, null]
	],
	[[4, 4, '0000', null, null],
		[5, 3, '0011', null, null],
		[6, 3, '1100', null, null],
		[7, 2, '0111', null, null],
		[8, 2, '1101', null, null],
		[9, 1, '0000', null, null]
	],
	[
		[5, 4, '0000', null, null],
		[6, 4, '0110', null, null],
		[7, 3, '1011', null, null],
		[8, 3, '1101', null, null],
		[9, 2, '0101', null, null],
		[10, 2, '0000', null, null]
	],
	[
		[6, 5, '0000', null, null],
		[7, 4, '0011', pieces.R_vehicle1, 'red'],
		[8, 4, '1010', pieces.R_hero1, 'red'],
		[9, 3, '1011', pieces.R_rider1, 'red'],
		[10, 3, '1001', pieces.R_army1, 'red'],
		[11, 2, '0000', null, null]
	]
];
//========= map 2 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject]
var tilesInit2 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', pieces.B_rider1, 'blue'],
		[2, 1, '1110', pieces.B_army1, 'blue'],
		[3, 0, '1010', pieces.B_hero1, 'blue'],
		[4, 0, '1100', pieces.B_vehicle1, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0000', null, null],
		[2, 2, '0101', null, null],
		[3, 1, '0011', null, null],
		[4, 1, '1110', null, null],
		[5, 0, '1101', null, null],
		[6, 0, '0000', null, null]
	],
	[
		[2, 3, '0110', null, null],
		[3, 2, '1011', null, null],
		[4, 2, '1110', null, null],
		[5, 1, '1101', null, null],
		[6, 1, '0011', null, null],
		[7, 0, '1100', null, null]
	],
	[
		[3, 3, '0011', null, null],
		[4, 3, '1100', null, null],
		[5, 2, '0111', null, null],
		[6, 2, '1011', null, null],
		[7, 1, '1110', null, null],
		[8, 1, '1001', null, null]
	],

	[
		[4, 4, '0000', null, null],
		[5, 3, '0111', null, null],
		[6, 3, '1011', null, null],
		[7, 2, '1100', null, null],
		[8, 2, '0101', null, null],
		[9, 1, '0000', null, null]
	],
	[
		[5, 4, '0000', null, null],
		[6, 4, '0011', pieces.R_vehicle1, 'red'],
		[7, 3, '1010', pieces.R_hero1, 'red'],
		[8, 3, '1011', pieces.R_army1, 'red'],
		[9, 2, '1001', pieces.R_rider1, 'red'],
		[10, 2, '0000', null, null]
	]
];
//========= map 3 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject]
var tilesInit3 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', pieces.B_army1, 'blue'],
		[2, 1, '1110', pieces.B_rider1, 'blue'],
		[3, 0, '1110', pieces.B_hero1, 'blue'],
		[4, 0, '1100', pieces.B_cannon1, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0110', null, null],
		[2, 2, '1001', null, null],
		[3, 1, '0111', null, null],
		[4, 1, '1101', null, null],
		[5, 0, '0011', null, null],
		[6, 0, '1100', null, null]
	],
	[
		[2, 3, '0111', null, null],
		[3, 2, '1010', null, null],
		[4, 2, '1111', null, null],
		[5, 1, '1111', null, null],
		[6, 1, '1010', null, null],
		[7, 0, '1101', null, null]
	],
	[
		[3, 3, '0101', null, null],
		[4, 3, '0000', null, null],
		[5, 2, '0111', null, null],
		[6, 2, '1101', null, null],
		[7, 1, '0000', null, null],
		[8, 1, '0101', null, null]
	],
	[
		[4, 4, '0111', null, null],
		[5, 3, '1010', null, null],
		[6, 3, '1111', null, null],
		[7, 2, '1111', null, null],
		[8, 2, '1010', null, null],
		[9, 1, '1101', null, null]
	],
	[
		[5, 4, '0011', null, null],
		[6, 4, '1100', null, null],
		[7, 3, '0111', null, null],
		[8, 3, '1101', null, null],
		[9, 2, '0110', null, null],
		[10, 2, '1001', null, null]
	],
	[
		[6, 5, '0000', null, null],
		[7, 4, '0011', pieces.R_cannon1, 'red'],
		[8, 4, '1011', pieces.R_hero1, 'red'],
		[9, 3, '1011', pieces.R_rider1, 'red'],
		[10, 3, '1001', pieces.R_army1, 'red'],
		[11, 2, '0000', null, null]
	]
];
//========= map 4 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject]
var tilesInit4 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', null, 'blue'],
		[2, 1, '1110', pieces.B_rider1, 'blue'],
		[3, 0, '1110', pieces.B_hero1, 'blue'],
		[4, 0, '1100', null, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0110', pieces.B_army1, null],
		[2, 2, '1001', null, null],
		[3, 1, '0111', null, null],
		[4, 1, '1101', null, null],
		[5, 0, '0011', null, null],
		[6, 0, '1100', pieces.B_army2, null]
	],
	[
		[2, 3, '0111', null, null],
		[3, 2, '1010', null, null],
		[4, 2, '1111', null, null],
		[5, 1, '1111', null, null],
		[6, 1, '1010', null, null],
		[7, 0, '1101', null, null]
	],
	[
		[3, 3, '0111', null, null],
		[4, 3, '1010', null, null],
		[5, 2, '1101', null, null],
		[6, 2, '0111', null, null],
		[7, 1, '1010', null, null],
		[8, 1, '1101', null, null]
	],
	[
		[4, 4, '0111', null, null],
		[5, 3, '1010', null, null],
		[6, 3, '1111', null, null],
		[7, 2, '1111', null, null],
		[8, 2, '1010', null, null],
		[9, 1, '1101', null, null]
	],
	[
		[5, 4, '0011', pieces.R_army1, null],
		[6, 4, '1100', null, null],
		[7, 3, '0111', null, null],
		[8, 3, '1101', null, null],
		[9, 2, '0110', null, null],
		[10, 2, '1001', pieces.R_army2, null]
	],
	[
		[6, 5, '0000', null, null],
		[7, 4, '0011', null, 'red'],
		[8, 4, '1011', pieces.R_hero1, 'red'],
		[9, 3, '1011', pieces.R_rider1, 'red'],
		[10, 3, '1001', null, 'red'],
		[11, 2, '0000', null, null]
	]
];
//========= map 5 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject]
var tilesInit5 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', pieces.B_army1, 'blue'],
		[2, 1, '1100', pieces.B_vehicle1, 'blue'],
		[3, 0, '0110', pieces.B_vehicle2, 'blue'],
		[4, 0, '1100', pieces.B_army2, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0100', null, null],
		[2, 2, '0111', null, null],
		[3, 1, '1101', null, null],
		[4, 1, '0111', null, null],
		[5, 0, '1111', null, null],
		[6, 0, '1100', null, null]
	],
	[
		[2, 3, '0101', null, null],
		[3, 2, '0111', null, null],
		[4, 2, '1101', null, null],
		[5, 1, '0111', null, null],
		[6, 1, '1101', null, null],
		[7, 0, '0101', null, null]
	],
	[
		[3, 3, '0101', pieces.B_cannon1, null],
		[4, 3, '0111', null, null],
		[5, 2, '1101', null, null],
		[6, 2, '0111', null, null],
		[7, 1, '1101', null, null],
		[8, 1, '0101', pieces.R_cannon1, null]
	],
	[
		[4, 4, '0101', null, null],
		[5, 3, '0111', null, null],
		[6, 3, '1101', null, null],
		[7, 2, '0111', null, null],
		[8, 2, '1101', null, null],
		[9, 1, '0101', null, null]
	],
	[
		[5, 4, '0011', null, null],
		[6, 4, '1111', null, null],
		[7, 3, '1101', null, null],
		[8, 3, '0111', null, null],
		[9, 2, '1101', null, null],
		[10, 2, '0001', null, null]
	],
	[
		[6, 5, '0000', null, null],
		[7, 4, '0011', pieces.R_army2, 'red'],
		[8, 4, '1001', pieces.R_vehicle1, 'red'],
		[9, 3, '0011', pieces.R_vehicle2, 'red'],
		[10, 3, '1001', pieces.R_army1, 'red'],
		[11, 2, '0000', null, null]
	]
];
//========= map 6 ===================
//=== [y, x, backgroundTileName(N,E,S,W), pieceObject]
var tilesInit6 =
[
	[
		[0, 2, '0000', null, null],
		[1, 1, '0110', pieces.B_hero1, 'blue'],
		[2, 1, '1110', pieces.B_rider1, 'blue'],
		[3, 0, '1110', pieces.B_hero2, 'blue'],
		[4, 0, '1100', pieces.B_rider2, 'blue'],
		[5, -1, '0000', null, null]
	],
	[
		[1, 2, '0110', null, null],
		[2, 2, '1111', null, null],
		[3, 1, '1111', null, null],
		[4, 1, '1111', null, null],
		[5, 0, '1111', null, null],
		[6, 0, '1100', null, null]
	],
	[
		[2, 3, '0111', null, null],
		[3, 2, '1111', null, null],
		[4, 2, '1111', null, null],
		[5, 1, '1111', null, null],
		[6, 1, '1111', null, null],
		[7, 0, '1101', null, null]
	],
	[
		[3, 3, '0111', null, null],
		[4, 3, '1111', null, null],
		[5, 2, '1111', null, null],
		[6, 2, '1111', null, null],
		[7, 1, '1111', null, null],
		[8, 1, '1101', null, null]
	],
	[
		[4, 4, '0111', null, null],
		[5, 3, '1111', null, null],
		[6, 3, '1111', null, null],
		[7, 2, '1111', null, null],
		[8, 2, '1111', null, null],
		[9, 1, '1101', null, null]
	],
	[
		[5, 4, '0011', null, null],
		[6, 4, '1111', null, null],
		[7, 3, '1111', null, null],
		[8, 3, '1111', null, null],
		[9, 2, '1101', null, null],
		[10, 2, '1001', null, null]
	],
	[
		[6, 5, '0000', null, null],
		[7, 4, '0011', pieces.R_rider1, 'red'],
		[8, 4, '1011', pieces.R_hero1, 'red'],
		[9, 3, '1011', pieces.R_rider2, 'red'],
		[10, 3, '1001', pieces.R_hero2, 'red'],
		[11, 2, '0000', null, null]
	]
];

var MAPS = [tilesInit1, tilesInit2, tilesInit3, tilesInit4, tilesInit5, tilesInit6];

var shootOutcomes = [
	['missed'],
	['hit'],
	['special hit!']
];

var turnStatusInit = { currentTurnFaction: 'blue', moveCounter: 1, victory: false, factionFlipBounce: false };
