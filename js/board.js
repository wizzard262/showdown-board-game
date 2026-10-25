/*
 * Showdown - the board
 * Setting up a map, drawing the board and pieces, and the rules for moving and shooting.
 */

// Start a new game on a random map
function InitTiles() {
	var mapCount = 6;
	var gameBoard = Math.floor(Math.random() * mapCount) + 1; //=== a random map (1 to 6)

	tiles = CreateTiles(MAPS[gameBoard - 1] || MAPS[0]);

	//=== the blues move first (copy, so the original data is kept for the next game)
	turnStatus = CloneObject(turnStatusInit);

	if (typeof mapText !== "undefined")
		mapText.destroy(true, true);
}

// Turn a map from data.js into tile objects (pieces are copied, so the map data is never changed)
function CreateTiles(map) {
	return map.map(function (column) {
		return column.map(function (tile) {
			return {
				tileName: tile[2],
				piece: CloneObject(tile[3]),
				baseFaction: tile[4]
			};
		});
	});
}

//=========================== DRAWING ===================================

function InitBackgound() {
	//=== clear the board of old ground pieces
	isoGroupBackground.destroy(true, true);
	for (var x = 0; x < tiles.length; x += 1) {
		for (var y = 0; y < tiles[0].length; y += 1) {
			SetSprite(x, y, 'sprites', tiles[x][y].tileName, isoGroupBackground);
		}
	}
}

// Redraw every piece (clearing indicators). Returns the sprite at (xIn, yIn) if given.
function InitGameboard(xIn, yIn) {
	var returnSprite;

	isoGroupIndicators.destroy(true, true);
	isoGroupPieces.destroy(true, true);
	isoGroupHotspots.destroy(true, true);

	for (var x = 0; x < tiles.length; x += 1) {
		for (var y = 0; y < tiles[0].length; y += 1) {
			if (tiles[x][y].piece != null) {
				var sprite = InitPiece(x, y);
				if (xIn != null && yIn != null && x == xIn && y == yIn) {
					returnSprite = sprite;
				}
			}
		}
	}
	return returnSprite;
}

// Draw one piece; the side whose turn it is can tap theirs
function InitPiece(x, y) {
	var sprite = SetPieceSprite(x, y, isoGroupPieces);
	sprite.xx = x;
	sprite.yy = y;

	if (tiles[x][y].piece.faction == turnStatus.currentTurnFaction) {
		if (!IsRobot(turnStatus.currentTurnFaction)) {
			sprite.inputEnabled = true;
			sprite.input.useHandCursor = true;

			//=== EVENT (select piece)
			sprite.events.onInputDown.add(function (sprite) {
				game.iso.unproject(game.input.activePointer.position, cursorPos);

				if (sprite.isoBounds.containsXY(cursorPos.x, cursorPos.y)) {
					SelectPiece(sprite);
				}
				else {
					// isometric sprites overlap: pass the tap on to the one actually under the pointer
					RedirectSpritesOnInputDownEvent(cursorPos.x, cursorPos.y);
				}
			}, this);
		}

		// at the start of a side's turn its pieces bounce, at random times
		if (turnStatus.moveCounter == 0 && turnStatus.factionFlipBounce) {
			var delay = (Math.floor(Math.random() * 12000) + 6000);
			var tweenPiece = game.add.tween(sprite.scale);
			tweenPiece.to({ x: 1.1, y: 1.1 }, 100, Phaser.Easing.Bounce.Out, false, delay, false, true);
			tweenPiece.repeat(2);
			tweenPiece.repeatDelay(delay);
			tweenPiece.yoyoDelay(100);
			tweenPiece.start();
		}
	}
	return sprite;
}

function SetSprite(x, y, tileAtlas, tileName, group) {
	return game.add.isoSprite(x * isoBaseSize, y * isoBaseSize, 0, tileAtlas, tileName, group);
}

// The piece on (x, y), with its health bar if the theme shows one
function SetPieceSprite(x, y, group) {
	var sprite = SetSprite(x, y, 'sprites', GetPieceTileName(x, y), group);
	AddHealthBar(sprite, tiles[x][y].piece);
	return sprite;
}

// Sprite name for a piece, e.g. 'blue_army_right_4'
function GetPieceTileName(x, y) {
	var piece = tiles[x][y].piece;
	if (piece != null) {
		return piece.faction + "_" + piece.unit + "_" + piece.direction + "_" + piece.health;
	}
}

function GetGameboardTileName(x, y) {
	return tiles[x][y].tileName;
}

//=========================== RULES =====================================

// A move to (xTo, yTo) is allowed if that square is on the board and empty, and a bridge leads there
function IsViableMove(xFrom, yFrom, xTo, yTo, xMax, yMax, direction) {
	if (yTo >= 0 && xTo >= 0 && yTo < yMax && xTo < xMax && tiles[xTo][yTo].piece == null) {
		var bridge = { up: 0, right: 1, down: 2, left: 3 }[direction];
		return bridge !== undefined && tiles[xFrom][yFrom].tileName.substring(bridge, bridge + 1) == 1;
	}
	return false;
}

// 0 = off the board, 1 = an enemy piece to shoot, 2 = on the board but nothing to shoot
function IsViableShot(xFrom, yFrom, xTo, yTo, xMax, yMax) {
	if (yTo >= 0 && xTo >= 0 && yTo < yMax && xTo < xMax && tiles[xTo][yTo].tileName != '0000') {
		var target = tiles[xTo][yTo].piece;
		if (target != null && target.health > 0 && target.faction != tiles[xFrom][yFrom].piece.faction) {
			return 1;
		}
		return 2;
	}
	return 0;
}

function GetDirection(xFrom, yFrom, xTo, yTo) {
	if (xFrom >= xTo && yFrom == yTo)
		return "left";
	if (xFrom <= xTo && yFrom == yTo)
		return "right";
	if (xFrom == xTo && yFrom >= yTo)
		return "up";
	if (xFrom == xTo && yFrom <= yTo)
		return "down";

	//=== the riders shoot diagonally: pick the nearest of the 4 directions
	if (yFrom > yTo && xFrom > xTo)
		return "up";
	if (yFrom < yTo && xFrom > xTo)
		return "down";
	if (yFrom > yTo && xFrom < xTo)
		return "left";
	if (yFrom < yTo && xFrom < xTo)
		return "right";
}

// Deep copy of plain data
function CloneObject(obj) {
	if (obj == null || typeof (obj) != 'object')
		return obj;

	var temp = new obj.constructor();
	for (var key in obj)
		temp[key] = CloneObject(obj[key]);

	return temp;
}
