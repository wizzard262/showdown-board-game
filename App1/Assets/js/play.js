/*
 * Showdown - playing a turn
 * Select one of your pieces, then either move it one square or shoot an enemy in range.
 */

function SelectPiece(sprite) {
	turnStatus.factionFlipBounce = false;
	var newSprite = InitGameboard(sprite.xx, sprite.yy);

	moveIndicatorSprites = SetMoveIndicators(sprite, moveArray);
	shootIndicatorSprites = SetShootIndicators(sprite, tiles[sprite.xx][sprite.yy].piece.shootArray);

	PlaySound('select');

	//=== lift the selected piece
	var tweenPiece = game.add.tween(newSprite);
	tweenPiece.to({ isoZ: 20 }, 50, Phaser.Easing.Bounce.In, false);
	tweenPiece.to({ isoZ: 5 }, 200, Phaser.Easing.Bounce.Out, false);
	tweenPiece.start();
	DrawInfoWindow(sprite.xx, sprite.yy);
}

// Isometric sprites overlap: find the piece or move square actually under the pointer
function RedirectSpritesOnInputDownEvent(xCoord, yCoord) {
	if (IsRobot(turnStatus.currentTurnFaction))
		return;

	isoGroupPieces.forEach(function (sprite) {
		if (sprite
			&& sprite.isoBounds.containsXY(xCoord, yCoord)
			&& sprite.yy != null
			&& sprite.xx != null
			&& tiles[sprite.xx][sprite.yy].piece != null
			&& tiles[sprite.xx][sprite.yy].piece.faction == turnStatus.currentTurnFaction) {
			SelectPiece(sprite);
		}
	});

	isoGroupIndicators.forEach(function (sprite) {
		if (sprite
			&& sprite.isoBounds.containsXY(xCoord, yCoord)
			&& sprite.yFrom != null
			&& sprite.xFrom != null
			&& tiles[sprite.xFrom][sprite.yFrom].piece != null
			&& tiles[sprite.xFrom][sprite.yFrom].piece.faction == turnStatus.currentTurnFaction) {
			MovePiece(sprite);
		}
	});
}

//=========================== MOVING ====================================

// Show the squares the selected piece can move to
function SetMoveIndicators(spritePiece, moves) {
	var x = spritePiece.xx;
	var y = spritePiece.yy;
	var faction = tiles[x][y].piece.faction;
	SetSprite(x, y, 'sprites', faction + '_shooter', isoGroupIndicators);

	for (var i = 0; i < moves.length; i++) {
		var xTo = x + moves[i][0];
		var yTo = y + moves[i][1];
		var direction = GetDirection(x, y, xTo, yTo);

		if (IsViableMove(x, y, xTo, yTo, tiles.length, tiles[0].length, direction)) {
			var sprite = SetSprite(xTo, yTo, 'sprites', "moveable_" + direction, isoGroupIndicators);
			sprite.xTo = xTo;
			sprite.yTo = yTo;
			sprite.direction = direction;
			sprite.xFrom = x;
			sprite.yFrom = y;
			sprite.piece = spritePiece;

			if (!IsRobot(faction)) {
				sprite.inputEnabled = true;
				sprite.input.useHandCursor = true;
			}

			//=== EVENT (move piece)
			sprite.events.onInputDown.add(function (sprite) {
				game.iso.unproject(game.input.activePointer.position, cursorPos);

				if (sprite.isoBounds.containsXY(cursorPos.x, cursorPos.y)) {
					MovePiece(sprite);
				}
				else {
					RedirectSpritesOnInputDownEvent(cursorPos.x, cursorPos.y);
				}
				CheckVictoryConditions(3);
			}, this);

			sprite.tint = 0xCCCCCC;
		}
	}
}

// sprite: the move square tapped (xFrom/yFrom to xTo/yTo)
function MovePiece(sprite) {
	FlipFactionTurn();

	//=== turn the piece to face the way it moves
	tiles[sprite.xFrom][sprite.yFrom].piece.direction = GetDirection(sprite.xFrom, sprite.yFrom, sprite.xTo, sprite.yTo);

	//=== move it on the board
	tiles[sprite.xTo][sprite.yTo].piece = tiles[sprite.piece.xx][sprite.piece.yy].piece;
	tiles[sprite.xFrom][sprite.yFrom].piece = null;

	var newSprite = InitGameboard(sprite.xTo, sprite.yTo);
	turnStatus.factionFlipBounce = false;

	PlaySound('move');

	//=== start it at its old square so the move can be seen
	newSprite.isoX = isoBaseSize * sprite.xFrom;
	newSprite.isoY = isoBaseSize * sprite.yFrom;

	var tweenPiece = game.add.tween(newSprite);
	tweenPiece.to({ isoZ: 20, isoX: (isoBaseSize * sprite.xTo), isoY: (isoBaseSize * sprite.yTo) }, 200, Phaser.Easing.Quadratic.InOut, false);
	tweenPiece.to({ isoZ: 0 }, 200, Phaser.Easing.Bounce.Out, false);
	tweenPiece.start();

	CheckVictoryConditions(0);
}

//=========================== SHOOTING ==================================

// Show the selected piece's shot pattern; enemies in range get a target and can be tapped
function SetShootIndicators(spritePiece, shootArray) {
	var sprites = [];
	var xFrom = spritePiece.xx;
	var yFrom = spritePiece.yy;

	for (var i = 0; i < shootArray.length; i++) { //=== 4 directions
		var shotAvailable = true;

		//=== the squares in range in this direction
		for (var j = 0; j < shootArray[i].length; j++) {
			var xTo = xFrom + shootArray[i][j][0];
			var yTo = yFrom + shootArray[i][j][1];
			var direction = GetDirection(xFrom, yFrom, xTo, yTo);
			var shot = IsViableShot(xFrom, yFrom, xTo, yTo, tiles.length, tiles[0].length);
			var sprite;

			if (shot == 0) continue; // off the board

			if (shot == 1 && shotAvailable) {
				sprite = DrawShootableTarget(spritePiece, xFrom, yFrom, xTo, yTo, direction);
				shotAvailable = false;
			}
			else {
				sprite = SetSprite(xTo, yTo, 'sprites', "shootable_off", isoGroupIndicators);
			}
			//=== any piece in the way stops the shot going further
			if (tiles[xTo][yTo].piece != null) {
				shotAvailable = false;
			}
			sprites.push(sprite);
		}
	}
	return sprites;
}

// A target marker on an enemy piece, with a tap area that shoots it. Returns the redrawn piece.
function DrawShootableTarget(spritePiece, xFrom, yFrom, xTo, yTo, direction) {
	SetSprite(xTo, yTo, 'sprites', "shootable_on", isoGroupPieces);

	//=== redraw the target piece over the marker, and a tap area for shooting it
	var sprite = SetPieceSprite(xTo, yTo, isoGroupPieces);
	var spriteShootable = SetSprite(xTo, yTo, 'sprites', 'blankTile', isoGroupHotspots);

	//=== keep the pieces drawn in the right order
	isoGroupPieces.sort('y', Phaser.Group.SORT_ASCENDING);

	spriteShootable.xTo = xTo;
	spriteShootable.yTo = yTo;
	spriteShootable.direction = direction;
	spriteShootable.xFrom = xFrom;
	spriteShootable.yFrom = yFrom;
	if (!IsRobot(tiles[xFrom][yFrom].piece.faction)) {
		spriteShootable.inputEnabled = true;
		spriteShootable.input.useHandCursor = true;
	}
	spriteShootable.xOrigin = spritePiece.x;
	spriteShootable.yOrigin = spritePiece.y;

	//=== EVENT (shoot)
	spriteShootable.events.onInputDown.add(function (spriteShootable) {
		game.iso.unproject(game.input.activePointer.position, cursorPos);

		if (spriteShootable.isoBounds.containsXY(cursorPos.x, cursorPos.y)) {
			ShootPiece(spriteShootable);
		}
		else {
			RedirectSpritesOnInputDownEvent(cursorPos.x, cursorPos.y);
		}
		AfterShot();
	}, this);

	return sprite;
}

function AfterShot() {
	//=== remove the targets straight away so it can't shoot again
	isoGroupIndicators.destroy(true, true);
	isoGroupHotspots.destroy(true, true);

	//=== redraw after the shot lands (so the target doesn't show damage before it's hit)
	game.time.events.add(Phaser.Timer.SECOND * 0.5, function () {
		InitGameboard();
	}, this);

	CheckVictoryConditions(3);
}

// sprite: the target tapped (xFrom/yFrom shoots xTo/yTo)
function ShootPiece(sprite) {
	FlipFactionTurn();
	sprite.xDestination = sprite.x + isoBaseSize;
	sprite.yDestination = sprite.y + (0.5 * isoBaseSize) - (0.5 * isoBaseSize);

	var shooter = tiles[sprite.xFrom][sprite.yFrom].piece;

	//=== turn the shooter to face the target and redraw it
	shooter.direction = GetDirection(sprite.xFrom, sprite.yFrom, sprite.xTo, sprite.yTo);
	SetSprite(sprite.xFrom, sprite.yFrom, 'sprites', GetPieceTileName(sprite.xFrom, sprite.yFrom), isoGroupPieces);

	InitGameboard();
	turnStatus.factionFlipBounce = false;

	//=== miss, hit, or (heroes only) special hit
	var shotOutcome = Math.floor(Math.random() * shootOutcomes.length);
	var isSpecialHit = shooter.canSpecialHit && (shotOutcome == 2);

	ShowProjectile(sprite, shotOutcome, shooter.shootsDiagonal);

	if (isSpecialHit) {
		AnimateSpecialAttack(shooter.faction); // special hit! instant kill!
		SpecialAttackText(shooter.faction);
	}
	else if (shotOutcome == 0) {
		ShowResultText('fontBlue', 0.6, THEME.words.miss, sprite.x, sprite.y);
	}
	else {
		ShowResultText('fontYellow', 0.6, THEME.words.hit, sprite.x, sprite.y);
	}

	if (shotOutcome > 0) {
		DamagePiece(sprite, shooter, isSpecialHit);
	}
}

function DamagePiece(sprite, shooter, isSpecialHit) {
	var target = tiles[sprite.xTo][sprite.yTo].piece;
	var health;

	if (isSpecialHit) {
		target.health = 0;
		health = 0;
	} else {
		target.health -= 1;
		health = target.health;
	}

	// the wrecked version of the piece's sprite
	var tileName = GetPieceTileName(sprite.xTo, sprite.yTo).replace("_4", "_0").replace("_3", "_0").replace("_2", "_0").replace("_1", "_0");

	if (health <= 0) {
		PlaySound('explode_' + target.faction);

		//=== remove it from the board
		tiles[sprite.xTo][sprite.yTo].piece = null;

		//=== show the wreck burning, after the board has been redrawn
		game.time.events.add(Phaser.Timer.SECOND * 0.6, function () {
			DrawWreck(sprite, tileName);
		}, this);

		//=== then clear it away
		game.time.events.add(Phaser.Timer.SECOND * 4, function () {
			UI.fireAnimation.animations.stop('flames');
			UI.fireAnimation.x = -300;
			UI.fireAnimation.y = -300;
			InitGameboard();
		}, this);
	}
	else {
		//=== something is thrown out of it
		game.time.events.add(Phaser.Timer.SECOND * 0.4, function () {
			AnimateEject(sprite);
		}, this);
	}
}

//=========================== TURNS AND VICTORY =========================

// Each side has two goes; the badges change after the second
function FlipFactionTurn() {
	if (turnStatus.moveCounter == 1) {
		turnStatus.moveCounter = 0;
	}
	else {
		turnStatus.moveCounter++;
	}
	AnimateFactionFlip(turnStatus.moveCounter);

	//=== if the computer plays the side whose go it is now, it plays after a pause
	RobotScheduleGo();
}

// A side wins by destroying every enemy piece, or by moving a piece onto the enemy base
function CheckVictoryConditions(delay) {
	//=== prevent a 'double victory' (overlapping isometric sprites can tap twice)
	if (turnStatus.victory)
		return;

	var blueDead = true;
	var redDead = true;
	var blueBaseTaken = false;
	var redBaseTaken = false;

	for (var x = 0; x < tiles.length; x += 1) {
		for (var y = 0; y < tiles[0].length; y += 1) {
			var piece = tiles[x][y].piece;
			if (piece != null && piece.faction == 'red') {
				redDead = false;
				if (tiles[x][y].baseFaction == 'blue')
					blueBaseTaken = true;
			}
			if (piece != null && piece.faction == 'blue') {
				blueDead = false;
				if (tiles[x][y].baseFaction == 'red')
					redBaseTaken = true;
			}
		}
	}

	if (redDead || redBaseTaken) {
		ShowVictoryText('blue', delay);
	}
	if (blueDead || blueBaseTaken) {
		ShowVictoryText('red', delay);
	}
}

// Start a new game
function ResetGame() {
	InitTiles();
	FlipFactionTurn();
	InitBackgound();
	InitGameboard();
	ShowTitleText(0);
}
