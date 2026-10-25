/*
 * Showdown - effects
 * Shots, explosions, special attacks, fly-overs, the turn badges, the info window and big texts.
 */

//=========================== SHOTS =====================================

// The shot flies from the shooter to the target; a miss overshoots and fades
function ShowProjectile(sprite, shotOutcome, isShootsDiagonal) {
	var direction = sprite.direction;
	var shotDirection = direction;
	var overshoot = (shotOutcome == 0) ? 2 : 0; //=== a miss overshoots by twice the distance between pieces
	var shottime = 500;

	var xFrom = sprite.xOrigin + isoBaseSize;
	var yFrom = sprite.yOrigin + (0.5 * isoBaseSize);
	var xTo;
	var yTo;
	var baseX = sprite.x + isoBaseSize;
	var baseY = sprite.y + (0.5 * isoBaseSize);
	var dx = isoBaseSize * overshoot;
	var dy = 0.5 * isoBaseSize * overshoot;

	PlayShotSound(tiles[sprite.xFrom][sprite.yFrom].piece);

	switch (direction) {
		case "up":    xTo = baseX + dx; yTo = baseY - dy; break;
		case "right": xTo = baseX + dx; yTo = baseY + dy; break;
		case "down":  xTo = baseX - dx; yTo = baseY + dy; break;
		case "left":  xTo = baseX - dx; yTo = baseY - dy; break;
		default:      xFrom = undefined; yFrom = undefined; break;
	}

	//=== diagonal shooters (the riders)
	if (isShootsDiagonal) {
		shotDirection += '_rider';
		switch (direction) {
			case "up":    xTo = baseX;      yTo = baseY - dy; break;
			case "right": xTo = baseX;      yTo = baseY + dy; break;
			case "down":  xTo = baseX - dx; yTo = baseY;      break;
			case "left":  xTo = baseX + dx; yTo = baseY;      break;
		}
	}
	AnimateProjectile(xFrom, yFrom, xTo, yTo, shottime, shotDirection, shotOutcome);
}

function AnimateProjectile(xFrom, yFrom, xTo, yTo, shottime, shotDirection, shotOutcome) {
	var shot = game.add.sprite(xFrom, yFrom, 'sprites', 'shoot_' + shotDirection);
	shot.scale.setTo(0.8, 0.8);
	var tweenShot = game.add.tween(shot);
	tweenShot.to({ x: xTo, y: yTo }, shottime, Phaser.Easing.Linear.None, false);

	if (shotOutcome > 0) {
		//=== a hit stops at the target
		game.time.events.add(Phaser.Timer.SECOND * (shottime * 0.001), function () {
			shot.destroy();
		});
	}
	else {
		//=== a miss fades out past the target
		tweenShot.to({ alpha: 0 }, 1000, Phaser.Easing.Linear.None, false, 0);
	}
	tweenShot.start();
}

// A destroyed piece: its wreck, with flames, fading away
function DrawWreck(sprite, tileName) {
	var destroyedVehicle = SetSprite(sprite.xTo, sprite.yTo, 'sprites', tileName, isoGroupIndicators);

	var fire = UI.fireAnimation;
	fire.alpha = 1;
	fire.x = sprite.x + (isoBaseSize * 0.5);
	fire.y = sprite.y - (isoBaseSize * 0.5);
	var fireScale = 128 / fire.texture.frame.width;     // the fire is shown 128 across: 64-pixel frames doubled, 128-pixel ones as they are
	fire.scale.setTo(fireScale, fireScale);
	fire.animations.play('flames', 6, true);

	var tweenFireAnimation = game.add.tween(fire);
	tweenFireAnimation.to({ alpha: 0 }, 6000, Phaser.Easing.Linear.None, false, 0, 1000, true);
	tweenFireAnimation.start();

	var tweenDestroyedVehicle = game.add.tween(destroyedVehicle);
	tweenDestroyedVehicle.to({ alpha: 0 }, 3500, Phaser.Easing.Linear.None, false, 0, 1000, true);
	tweenDestroyedVehicle.start();
}

// The hero's special attack (see the theme's special): the side's special frame flies across the screen,
// a symbol grows from the middle to fill the screen as it fades, and the game glitches
function AnimateSpecialAttack(faction) {
	var attack = THEME.special[faction];
	PlaySound('special_' + faction);

	if (attack.from) {
		var sprite = game.add.sprite(attack.from[0] * game.world.width, attack.from[1] * game.world.height, 'sprites', faction + '_special');
		sprite.scale.setTo(attack.scale, attack.scale);
		var tween = game.add.tween(sprite);
		tween.to({ x: attack.to[0] * game.world.width, y: attack.to[1] * game.world.height }, attack.time, Phaser.Easing.Linear.None, false);
		tween.onComplete.add(function () { sprite.destroy(); });
		tween.start();
	}
	if (attack.zoom) {
		var symbol = game.add.sprite(game.world.centerX, game.world.centerY, 'sprites', attack.zoom);
		symbol.anchor.setTo(0.5, 0.5);
		symbol.scale.setTo(0.02, 0.02);
		var fill = game.world.width * 1.3 / symbol.texture.frame.width;
		game.add.tween(symbol.scale).to({ x: fill, y: fill }, 1500, Phaser.Easing.Cubic.Out, true);
		var fade = game.add.tween(symbol).to({ alpha: 0 }, 1500, Phaser.Easing.Quadratic.In, true);
		fade.onComplete.add(function () { symbol.destroy(); });
	}
	if (attack.glitch) StartGlitch(attack.glitch);
}

//=========================== GLITCH ====================================

// The game slides about in strips across the screen for a while, the way a broken screen does: every so often
// each strip jumps sideways and eases back. The foreground (badges, menu button, info window, words) stays put:
// it's hidden while the game draws, then drawn on top after the strips have moved (see main.js preRender, render)
var GLITCH = { until: 0, kick: -9999, next: 0, amp: [], strips: 12, out: 70, back: 380, hidden: [] };

function StartGlitch(seconds) {
	GLITCH.until = game.time.now + seconds * 1000;
	GLITCH.next = game.time.now;
}

// how far strip i is shifted right now, in pixels: out fast, then eased back
function GlitchShift(i) {
	var t = game.time.now - GLITCH.kick;
	var f = t < 0 ? 0 : t < GLITCH.out ? t / GLITCH.out : Math.max(0, 1 - (t - GLITCH.out) / GLITCH.back);
	return (GLITCH.amp[i] || 0) * f * f * (3 - 2 * f);
}

function GlitchShowing() {
	return game.time.now - GLITCH.kick < GLITCH.out + GLITCH.back;
}

function ForegroundObjects() {
	UI.specialTexts = UI.specialTexts.filter(function (t) { return t.game; });     // a destroyed object has no game
	var list = [UI.blueBadge_1, UI.blueBadge_2, UI.redBadge_1, UI.redBadge_2, UI.controlPanel, UI.menu, UI.robotMenuRow, UI.instructions,
		UI.robotLabels.blue, UI.robotLabels.red].concat(INFO_SPRITES.map(function (name) { return UI[name]; }), UI.specialTexts);
	return list.filter(function (o) { return o && o.game && o.visible; });
}

// before the game draws: a new kick now and then while the glitch lasts, and the foreground hidden while it shows
function GlitchPreRender() {
	var now = game.time.now;
	if (now < GLITCH.until && now >= GLITCH.next) {
		GLITCH.kick = now;
		GLITCH.next = now + 150 + Math.random() * 300;
		GLITCH.amp = [];
		for (var i = 0; i < GLITCH.strips; i++)
			GLITCH.amp.push((i % 2 ? 1 : -1) * (8 + Math.random() * 40) * (Math.random() < 0.25 ? 0.2 : 1));
	}
	GLITCH.hidden = GlitchShowing() ? ForegroundObjects() : [];
	GLITCH.hidden.forEach(function (o) { o.visible = false; });
}

// after the game draws: shift its strips (wrapped round, so no gap shows), then draw the foreground on top
var glitchCopy = document.createElement('canvas');
function GlitchRender() {
	if (!GLITCH.hidden.length && !GlitchShowing()) return;
	var canvas = game.canvas, ctx = game.context;
	if (GlitchShowing()) {
		if (glitchCopy.width != canvas.width || glitchCopy.height != canvas.height) {
			glitchCopy.width = canvas.width;
			glitchCopy.height = canvas.height;
		}
		var copy = glitchCopy.getContext('2d');
		copy.clearRect(0, 0, canvas.width, canvas.height);
		copy.drawImage(canvas, 0, 0);
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var h = canvas.height / GLITCH.strips, k = canvas.width / game.width;
		for (var i = 0; i < GLITCH.strips; i++) {
			var y = Math.round(i * h), sh = Math.round((i + 1) * h) - y, dx = Math.round(GlitchShift(i) * k);
			ctx.drawImage(glitchCopy, 0, y, canvas.width, sh, dx, y, canvas.width, sh);
			ctx.drawImage(glitchCopy, 0, y, canvas.width, sh, dx - (dx > 0 ? 1 : -1) * canvas.width, y, canvas.width, sh);
		}
		ctx.restore();
	}
	GLITCH.hidden.forEach(function (o) {
		o.visible = true;
		game.renderer.renderDisplayObject(o, ctx);
	});
	GLITCH.hidden = [];
}

// A hit piece throws something out, which arcs left or right and fades: a heart that cracks in two if the
// theme has one (eject_heart), otherwise its own eject_<faction>_<unit>
function AnimateEject(sprite) {
	// this runs 0.4s after the hit: by then the game may have been reset, leaving the square empty
	var piece = tiles[sprite.xTo] && tiles[sprite.xTo][sprite.yTo] && tiles[sprite.xTo][sprite.yTo].piece;
	if (!piece) return;

	var x = sprite.xDestination - isoBaseSize;
	var y = sprite.yDestination;
	if (game.cache.getFrameData('sprites').getFrameByName('eject_heart')) {
		AnimateHeartBreak(x + 48, y + 48);
		return;
	}
	var thrown = game.add.sprite(x, y, 'sprites', 'eject_' + piece.faction + '_' + piece.unit);
	var side = (Math.floor(Math.random() * 2) == 1) ? -1 : 1;

	var tweenProjectile = game.add.tween(thrown);
	tweenProjectile.to({
		x: [x, x + (100 * side), x + (250 * side)],
		y: [y, y - 300, y - 100]
	}, 3000, function (k) {
		return parabolicEasing(k);
	}, false);
	tweenProjectile.start();

	var tweenDisappear = game.add.tween(thrown);
	tweenDisappear.to({ alpha: 0 }, 2500, Phaser.Easing.Linear.None, false, 0);
	tweenDisappear.onComplete.add(function () { thrown.destroy(); });
	tweenDisappear.start();
}

// The heart pops up out of the piece, holds a moment, cracks in two, and the halves tip apart, fall and fade
function AnimateHeartBreak(x, y) {
	var heart = game.add.sprite(x, y, 'sprites', 'eject_heart');
	heart.anchor.setTo(0.5, 0.5);
	heart.scale.setTo(0.3, 0.3);
	game.add.tween(heart.scale).to({ x: 1, y: 1 }, 350, Phaser.Easing.Back.Out, true);
	var rise = game.add.tween(heart).to({ y: y - 70 }, 350, Phaser.Easing.Quadratic.Out, true);
	rise.onComplete.add(function () {
		// a little shudder before it breaks
		var shake = game.add.tween(heart).to({ angle: 6 }, 50, Phaser.Easing.Linear.None, true, 150, 2, true);
		shake.onComplete.add(function () {
			var hx = heart.x, hy = heart.y;
			heart.destroy();
			[['eject_heart_left', -1], ['eject_heart_right', 1]].forEach(function (half) {
				var side = half[1];
				var bit = game.add.sprite(hx + side * 3, hy, 'sprites', half[0]);
				bit.anchor.setTo(0.5, 0.5);
				game.add.tween(bit).to({ x: hx + side * 45, angle: side * 30 }, 900, Phaser.Easing.Quadratic.Out, true);
				game.add.tween(bit).to({ y: hy + 60 }, 900, Phaser.Easing.Quadratic.In, true);
				var fade = game.add.tween(bit).to({ alpha: 0 }, 700, Phaser.Easing.Linear.None, true, 200);
				fade.onComplete.add(function () { bit.destroy(); });
			});
		});
	});
}

function parabolicEasing(k) {
	var p = 1.2;
	var a = 0.5;
	var s = p / 4;

	if (k === 0) return 0;
	if (k === 1) return 1;
	return (a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1);
}

//=========================== FLY-OVERS =================================

// One of the theme's fly-overs crosses the screen with its sound (x, y as parts of the screen)
function AnimateFlyover(flyover) {
	var sprite = game.add.sprite(flyover.from[0] * game.world.width, flyover.from[1] * game.world.height, 'sprites', flyover.frame);
	sprite.scale.setTo(flyover.scale, flyover.scale);
	if (flyover.centred)
		sprite.anchor.setTo(0.5, 0.5);      // the route is for the craft's middle, not the frame's corner
	PlaySound(flyover.sound);

	var tween = game.add.tween(sprite);
	tween.to({ x: flyover.to[0] * game.world.width, y: flyover.to[1] * game.world.height }, flyover.time, Phaser.Easing.Linear.None, false);
	tween.onComplete.add(function () { sprite.destroy(); });
	tween.start();
}

//=========================== TURN BADGES ===============================

// Scale, fade and move a badge (all after 300ms)
function TweenBadge(badge, scale, alpha, xFromRight, y, scaleTime, moveTime, startMove) {
	game.add.tween(badge.scale).to({ x: scale, y: scale }, scaleTime, Phaser.Easing.Back.Out, true, 300);
	game.add.tween(badge).to({ alpha: alpha }, 500, Phaser.Easing.Back.Out, true, 300);
	game.add.tween(badge).to({ x: (game.world.width - xFromRight), y: y }, moveTime, Phaser.Easing.Back.Out, startMove, 300);
}

// turnCount 1: the current side's first badge fades (one go used).
// turnCount 0: the turn passes: the new side's badges grow, the old side's fade.
function AnimateFactionFlip(turnCount) {
	DestroyInfoWindow();

	if (turnCount == 1) {
		if (turnStatus.currentTurnFaction == 'blue') {
			TweenBadge(UI.blueBadge_1, 0.2, 0.2, 360, 30, 200, 200, true);
		}
		else if (turnStatus.currentTurnFaction == 'red') {
			TweenBadge(UI.redBadge_1, 0.2, 0.2, 210, 30, 500, 500, true);
		}
	}

	if (turnCount == 0) {
		if (turnStatus.currentTurnFaction == 'blue') {
			turnStatus.currentTurnFaction = 'red';
			TweenBadge(UI.redBadge_1, 0.3, 1, 220, 20, 200, 200, true);
			TweenBadge(UI.redBadge_2, 0.3, 1, 120, 20, 200, 200, true);
			TweenBadge(UI.blueBadge_1, 0.2, 0.2, 360, 30, 200, 200, true);
			TweenBadge(UI.blueBadge_2, 0.2, 0.2, 460, 30, 200, 200, true);
		}
		else if (turnStatus.currentTurnFaction == 'red') {
			turnStatus.currentTurnFaction = 'blue';
			TweenBadge(UI.blueBadge_1, 0.3, 1, 370, 20, 500, 500, false); // (this move tween is never started)
			TweenBadge(UI.blueBadge_2, 0.3, 1, 470, 20, 500, 500, true);
			TweenBadge(UI.redBadge_1, 0.2, 0.2, 210, 30, 500, 500, true);
			TweenBadge(UI.redBadge_2, 0.2, 0.2, 110, 30, 500, 500, true);
		}

		game.time.events.add(Phaser.Timer.SECOND * 0.3, function () {
			PlaySound('turn');
		});

		turnStatus.factionFlipBounce = true;
	}
}

//=========================== INFO WINDOW ===============================

var INFO_SPRITES = ['infoWindow', 'infoPiece', 'infoRange', 'infoHeart4', 'infoHeart3', 'infoHeart2', 'infoHeart1'];

function DestroyInfoWindow() {
	INFO_SPRITES.forEach(function (name) {
		if (typeof UI[name] !== "undefined")
			UI[name].destroy(true, true);
	});
}

// The selected piece's picture, shot pattern and health (red hearts, grey for lost health)
function DrawInfoWindow(x, y) {
	DestroyInfoWindow();

	var piece = tiles[x][y].piece;
	var heartScale = 0.5;

	UI.infoWindow = game.add.sprite(15, 580, 'sprites', 'info_window');
	UI.infoPiece = game.add.sprite(50, 600, 'sprites', piece.faction + '_' + piece.unit);
	UI.infoRange = game.add.sprite(250, 620, 'sprites', piece.shotRangeImage);

	[4, 3, 2, 1].forEach(function (heart) {
		if (piece.initialHealth >= heart) {
			var sprite = game.add.sprite(50, 750 - (25 * heart), 'sprites', (piece.health >= heart) ? 'health_heart' : 'empty_health_heart');
			sprite.scale.setTo(heartScale, heartScale);
			UI['infoHeart' + heart] = sprite;
		}
	});
}

//=========================== TEXTS =====================================

function ShowVictoryText(victoriousFaction, delay) {
	var victoryText1;
	var victoryText2;

	turnStatus.victory = true;

	//=== no more moves: nobody's turn
	turnStatus.currentTurnFaction = 'none';
	InitGameboard();

	//=== show victory text, then fade
	game.time.events.add(Phaser.Timer.SECOND * delay, function () {
		var words = THEME.words.victory[victoriousFaction];
		victoryText1 = game.add.bitmapText(0.2 * game.world.centerX, 0.6 * game.world.centerY, 'fontYellow', words[0], 256);
		victoryText2 = game.add.bitmapText(0.2 * game.world.centerX, 1.1 * game.world.centerY, 'fontYellow', words[1], 192);
		FadeText(victoryText1, 0.6, 5000);
		FadeText(victoryText2, 0.6, 5000);

		PlaySound('win_' + victoriousFaction);
	});

	//=== then start a new game
	game.time.events.add(Phaser.Timer.SECOND * (delay + 5), function () {
		victoryText1.destroy();
		victoryText2.destroy();
		ResetGame();
	});
}

function FadeText(text, alpha, duration) {
	var tween = game.add.tween(text);
	tween.to({ alpha: alpha }, duration, Phaser.Easing.Linear.None, false, 0);
	tween.start();
}

// 'hit!' / 'miss!' over the target
function ShowResultText(font, delay, text, x, y) {
	game.time.events.add(Phaser.Timer.SECOND * delay, function () {
		var hitText = game.add.bitmapText(x, y - (isoBaseSize * 0.5), font, text, 128);
		FadeText(hitText, 0, 1000);
	}, this);
}

// The special attack's two lines of text (the theme's words.special for that side)
function SpecialAttackText(faction) {
	game.time.events.add(Phaser.Timer.SECOND * 0.6, function () {
		THEME.words.special[faction].forEach(function (line, i) {
			var text = game.add.bitmapText(0.1 * game.world.centerX, (0.6 + 0.5 * i) * game.world.centerY, 'fontYellow', line, 256);
			UI.specialTexts.push(text);      // kept still while the game glitches
			FadeText(text, 0, 1000);
		});
	}, this);
}

// The theme's title (up to 3 lines) at the start of a game
function ShowTitleText(delay) {
	var fadeTime = 2000;
	var texts;

	game.time.events.add(Phaser.Timer.SECOND * delay, function () {
		texts = THEME.words.title.map(function (line, i) {
			return game.add.bitmapText(0.1 * game.world.centerX, (0.3 + 0.5 * i) * game.world.centerY, 'fontBlue', line, 256);
		});
		texts.forEach(function (text) {
			FadeText(text, 0, fadeTime);
		});
	});

	//=== destroy the texts once faded
	game.time.events.add(Phaser.Timer.SECOND * delay + fadeTime, function () {
		texts.forEach(function (text) {
			text.destroy();
		});
	});
}
