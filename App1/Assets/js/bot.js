/*
 * Showdown - the robot player
 * Either side (or both) can be played by the computer: set in the menu, remembered in the browser.
 * On its go the robot looks ahead over the goes it has left this turn, scores each result, and plays
 * the best move or shot through the same functions a tap uses, so it looks and sounds the same.
 */

var Robot = {
	timer: null,           // the pending go
	thinkTime: 1.4,        // seconds before it picks a piece (first go of a turn)
	thinkTimeSecond: 1.0,  // seconds before its second go
	showTime: 0.9          // seconds it shows the selected piece's moves before playing
};

// How much each kind of piece is worth, per point of health
var ROBOT_UNIT_WORTH = { hero_army: 16, vehicle: 14, cannon: 11, rider: 10, army: 8 };
var ROBOT_ALIVE_BONUS = 2;      // a piece is worth this many extra health points just for being alive
var ROBOT_WIN = 10000;

// How much the robot cares about: the damage the enemy can do next turn, the damage it could do after that, getting to the enemy base
var ROBOT_WEIGHTS = { danger: 0.5, chance: 0.5, advance: 5 };

//=========================== SETTINGS ==================================

function IsRobot(faction) {
	return Settings.robot[faction] === true;
}

function SetRobot(faction, isRobot) {
	Settings.robot[faction] = isRobot;
	try { localStorage.setItem('showdown.robot', JSON.stringify(Settings.robot)); } catch (e) { }
	DrawRobotLabels();

	//=== the side to play has changed hands: redraw so the right pieces can be tapped
	if (faction == turnStatus.currentTurnFaction) {
		DestroyInfoWindow();
		InitGameboard();
		RobotScheduleGo();
	}
}

function LoadRobotSettings() {
	try {
		var saved = JSON.parse(localStorage.getItem('showdown.robot'));
		if (saved) {
			Settings.robot.blue = saved.blue === true;
			Settings.robot.red = saved.red === true;
		}
	} catch (e) { }
}

// 'robot' under the turn badges of a side the computer plays
function DrawRobotLabels() {
	['blue', 'red'].forEach(function (faction) {
		var label = UI.robotLabels[faction];
		if (!label && IsRobot(faction)) {
			label = game.add.bitmapText(faction == 'blue' ? 775 : 1025, 122, 'fontBlue', 'robot', 36);
			UI.robotLabels[faction] = label;
		}
		if (label)
			label.visible = IsRobot(faction);
	});
}

//=========================== PLAYING A GO ==============================

// Called whenever a go ends (and at the start of a game): if the side to play is a robot, it plays after a pause
function RobotScheduleGo(delay) {
	if (Robot.timer) {
		game.time.events.remove(Robot.timer);
		Robot.timer = null;
	}
	if (!turnStatus || turnStatus.victory || !IsRobot(turnStatus.currentTurnFaction))
		return;

	if (delay == null)
		delay = (turnStatus.moveCounter == 0) ? Robot.thinkTime : Robot.thinkTimeSecond;
	Robot.timer = game.time.events.add(Phaser.Timer.SECOND * delay, RobotPlayGo, this);
}

function RobotPlayGo() {
	Robot.timer = null;
	var status = turnStatus;
	var faction = status.currentTurnFaction;
	if (status.victory || !IsRobot(faction))
		return;

	//=== wait while the instructions are up, or a wreck is still burning
	if (Settings.showInstructionScreen || UI.fireAnimation.x != -300) {
		RobotScheduleGo(0.5);
		return;
	}

	var action = RobotChooseAction(faction, (status.moveCounter == 0) ? 2 : 1);
	if (action == null) {
		FlipFactionTurn(); // nothing can move or shoot: the go is lost
		return;
	}

	//=== pick the piece up, as if tapped
	var pieceSprite = FindSprite(isoGroupPieces, function (s) { return s.xx === action.x && s.yy === action.y; });
	if (!pieceSprite)
		return;
	SelectPiece(pieceSprite);
	var goCounter = status.moveCounter;

	//=== then move or shoot
	game.time.events.add(Phaser.Timer.SECOND * Robot.showTime, function () {
		if (turnStatus !== status || status.victory || status.currentTurnFaction != faction || status.moveCounter != goCounter)
			return; // a new game started, or someone else played meanwhile

		var group = (action.type == 'move') ? isoGroupIndicators : isoGroupHotspots;
		var target = FindSprite(group, function (s) { return s.xFrom === action.x && s.yFrom === action.y && s.xTo === action.xTo && s.yTo === action.yTo; });
		if (!target) {
			RobotScheduleGo(0.5);
			return;
		}
		if (action.type == 'move') {
			MovePiece(target);
			CheckVictoryConditions(3);
		}
		else {
			ShootPiece(target);
			AfterShot();
		}
	}, this);
}

function FindSprite(group, test) {
	var found = null;
	group.forEach(function (sprite) {
		if (!found && test(sprite))
			found = sprite;
	});
	return found;
}

//=========================== CHOOSING ==================================

/*
 * The robot plays on its own copy of the board:
 *   squares[x][y]  { bridges, baseFaction } (never change)
 *   pieces[x][y]   the piece there or null (copied, never changed in place, as the search tries many boards)
 */
function RobotChooseAction(faction, goesLeft) {
	var squares = tiles.map(function (column) {
		return column.map(function (tile) { return { bridges: tile.tileName, baseFaction: tile.baseFaction }; });
	});
	var pieces = tiles.map(function (column) {
		return column.map(function (tile) { return tile.piece; });
	});

	var actions = RobotActions(squares, pieces, faction);
	if (actions.length == 0)
		return null;

	var scored = actions.map(function (action) {
		return { action: action, value: RobotActionValue(squares, pieces, faction, action, goesLeft - 1) };
	});
	var best = Math.max.apply(null, scored.map(function (s) { return s.value; }));

	//=== pick at random among the near-best, so it doesn't play the same game every time
	var choices = scored.filter(function (s) { return s.value >= best - 2; });
	return choices[Math.floor(Math.random() * choices.length)].action;
}

// Expected value of an action (averaged over a shot's possible outcomes)
function RobotActionValue(squares, pieces, faction, action, goesLeft) {
	var value = 0;
	RobotOutcomes(pieces, action).forEach(function (outcome) {
		value += outcome.chance * RobotBoardValue(squares, outcome.pieces, faction, goesLeft);
	});
	return value;
}

function RobotBoardValue(squares, pieces, faction, goesLeft) {
	var winner = RobotWinner(squares, pieces);
	if (winner == faction)
		return ROBOT_WIN + goesLeft * 100; // sooner is better
	if (winner != null)
		return -ROBOT_WIN;
	if (goesLeft == 0)
		return RobotEvaluate(squares, pieces, faction);

	var actions = RobotActions(squares, pieces, faction);
	if (actions.length == 0)
		return RobotEvaluate(squares, pieces, faction);

	var best = -Infinity;
	actions.forEach(function (action) {
		best = Math.max(best, RobotActionValue(squares, pieces, faction, action, goesLeft - 1));
	});
	return best;
}

// Every move and shot the side can make: { type: 'move' | 'shoot', x, y, xTo, yTo }
function RobotActions(squares, pieces, faction) {
	var actions = [];
	EachPiece(pieces, faction, function (piece, x, y) {
		RobotMoves(squares, pieces, x, y).forEach(function (to) {
			actions.push({ type: 'move', x: x, y: y, xTo: to[0], yTo: to[1] });
		});
		RobotTargets(squares, pieces, x, y).forEach(function (to) {
			actions.push({ type: 'shoot', x: x, y: y, xTo: to[0], yTo: to[1] });
		});
	});
	return actions;
}

function EachPiece(pieces, faction, callback) {
	for (var x = 0; x < pieces.length; x++) {
		for (var y = 0; y < pieces[x].length; y++) {
			var piece = pieces[x][y];
			if (piece != null && (faction == null || piece.faction == faction))
				callback(piece, x, y);
		}
	}
}

// Same rule as IsViableMove: one square along a bridge, onto an empty square
function RobotMoves(squares, pieces, x, y) {
	var moves = [];
	for (var i = 0; i < moveArray.length; i++) {
		var xTo = x + moveArray[i][0];
		var yTo = y + moveArray[i][1];
		var bridge = { up: 0, right: 1, down: 2, left: 3 }[GetDirection(x, y, xTo, yTo)];
		if (xTo >= 0 && yTo >= 0 && xTo < pieces.length && yTo < pieces[0].length
			&& pieces[xTo][yTo] == null
			&& squares[x][y].bridges.substring(bridge, bridge + 1) == 1) {
			moves.push([xTo, yTo]);
		}
	}
	return moves;
}

// Same rule as SetShootIndicators: the first enemy in each direction of the shot pattern, unless a piece is in the way
function RobotTargets(squares, pieces, x, y) {
	var shooter = pieces[x][y];
	var targets = [];
	shooter.shootArray.forEach(function (line) {
		var shotAvailable = true;
		line.forEach(function (step) {
			var xTo = x + step[0];
			var yTo = y + step[1];
			if (xTo < 0 || yTo < 0 || xTo >= pieces.length || yTo >= pieces[0].length || squares[xTo][yTo].bridges == '0000')
				return;
			var target = pieces[xTo][yTo];
			if (target != null && target.health > 0 && target.faction != shooter.faction && shotAvailable)
				targets.push([xTo, yTo]);
			if (target != null)
				shotAvailable = false;
		});
	});
	return targets;
}

// The boards an action can lead to, with their chances (see ShootPiece: miss, hit, or a hero's special hit)
function RobotOutcomes(pieces, action) {
	if (action.type == 'move') {
		var moved = CopyPieces(pieces);
		moved[action.xTo][action.yTo] = moved[action.x][action.y];
		moved[action.x][action.y] = null;
		return [{ chance: 1, pieces: moved }];
	}

	var shooter = pieces[action.x][action.y];
	var target = pieces[action.xTo][action.yTo];
	var hit = CopyPieces(pieces);
	hit[action.xTo][action.yTo] = (target.health > 1) ? WithHealth(target, target.health - 1) : null;

	if (shooter.canSpecialHit) {
		var killed = CopyPieces(pieces);
		killed[action.xTo][action.yTo] = null;
		return [{ chance: 1 / 3, pieces: pieces }, { chance: 1 / 3, pieces: hit }, { chance: 1 / 3, pieces: killed }];
	}
	return [{ chance: 1 / 3, pieces: pieces }, { chance: 2 / 3, pieces: hit }];
}

function CopyPieces(pieces) {
	return pieces.map(function (column) { return column.slice(); });
}

function WithHealth(piece, health) {
	return { faction: piece.faction, unit: piece.unit, health: health, shootArray: piece.shootArray, canSpecialHit: piece.canSpecialHit };
}

// Same rule as CheckVictoryConditions
function RobotWinner(squares, pieces) {
	var alive = { blue: false, red: false };
	var winner = null;
	EachPiece(pieces, null, function (piece, x, y) {
		alive[piece.faction] = true;
		var base = squares[x][y].baseFaction;
		if (base != null && base != piece.faction)
			winner = piece.faction;
	});
	if (!alive.red)
		return 'blue';
	if (!alive.blue)
		return 'red';
	return winner;
}

//=========================== SCORING A BOARD ===========================

/*
 * How good a board is for the faction, once its goes are used up and the enemy is about to play.
 *   pieces left (health, weighted by what each kind of piece can do)
 *   how close the enemy is to walking into our base (they get two goes), and how close we are to theirs
 *   the damage the enemy can do with their next two goes, and (less) what we could do after that
 */
function RobotEvaluate(squares, pieces, faction) {
	var enemy = (faction == 'blue') ? 'red' : 'blue';
	var score = 0;

	EachPiece(pieces, null, function (piece) {
		var value = ROBOT_UNIT_WORTH[piece.unit] * (piece.health + ROBOT_ALIVE_BONUS);
		score += (piece.faction == faction) ? value : -value;
	});

	var enemyDistance = RobotBaseDistance(squares, pieces, enemy);
	if (enemyDistance <= 2)
		score -= ROBOT_WIN / 2;
	else if (enemyDistance <= 4)
		score -= (enemyDistance == 3) ? 60 : 25;

	var ourDistance = RobotBaseDistance(squares, pieces, faction);
	score += ROBOT_WEIGHTS.advance * (20 - Math.min(ourDistance, 20));
	if (ourDistance <= 2)
		score += 60;

	score -= ROBOT_WEIGHTS.danger * RobotBestDamage(squares, pieces, enemy);
	score += ROBOT_WEIGHTS.chance * RobotBestDamage(squares, pieces, faction);
	return score;
}

// What a shot is expected to take off the target's value
function RobotShotValue(shooter, target) {
	var worth = ROBOT_UNIT_WORTH[target.unit];
	var hitChance = shooter.canSpecialHit ? 1 / 3 : 2 / 3;
	var value = hitChance * worth * (target.health == 1 ? 1 + ROBOT_ALIVE_BONUS : 1);
	if (shooter.canSpecialHit)
		value += (1 / 3) * worth * (target.health + ROBOT_ALIVE_BONUS);
	return value;
}

// The most damage a side can expect to do in one turn: two shots, or a move then a shot
function RobotBestDamage(squares, pieces, faction) {
	var bestShot = 0;
	var bestMoveAndShot = 0;

	var bestFrom = function (x, y) {
		var best = 0;
		RobotTargets(squares, pieces, x, y).forEach(function (to) {
			best = Math.max(best, RobotShotValue(pieces[x][y], pieces[to[0]][to[1]]));
		});
		return best;
	};

	EachPiece(pieces, faction, function (piece, x, y) {
		bestShot = Math.max(bestShot, bestFrom(x, y));

		RobotMoves(squares, pieces, x, y).forEach(function (to) {
			//=== try the move in place, then put it back
			pieces[to[0]][to[1]] = piece;
			pieces[x][y] = null;
			bestMoveAndShot = Math.max(bestMoveAndShot, bestFrom(to[0], to[1]));
			pieces[x][y] = piece;
			pieces[to[0]][to[1]] = null;
		});
	});
	return Math.max(2 * bestShot, bestMoveAndShot);
}

// Fewest moves for any of the faction's pieces to reach a square of the enemy base (99 if blocked)
function RobotBaseDistance(squares, pieces, faction) {
	var distance = pieces.map(function (column) { return column.map(function () { return -1; }); });
	var queue = [];
	EachPiece(pieces, faction, function (piece, x, y) {
		distance[x][y] = 0;
		queue.push([x, y]);
	});

	for (var i = 0; i < queue.length; i++) {
		var x = queue[i][0];
		var y = queue[i][1];
		var moves = RobotMoves(squares, pieces, x, y);
		for (var m = 0; m < moves.length; m++) {
			var xTo = moves[m][0];
			var yTo = moves[m][1];
			if (distance[xTo][yTo] >= 0)
				continue;
			distance[xTo][yTo] = distance[x][y] + 1;
			var base = squares[xTo][yTo].baseFaction;
			if (base != null && base != faction)
				return distance[xTo][yTo];
			queue.push([xTo, yTo]);
		}
	}
	return 99;
}
