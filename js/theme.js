/*
 * Showdown - themes
 * A theme is everything that makes the game look and sound like somewhere: graphics, sounds and words.
 * The rules never change. Each file in themes/ calls AddTheme({...}); the player's pick is kept in localStorage.
 *
 * A theme gives:
 *   id, name       e.g. 'cyberpunk', 'future city'
 *   words          every word the game shows (the font has a-z, 0-9, ! and space only)
 *   graphics       files: { atlas, atlasData, background, weather, fire } loaded from disk, or
 *                  draw:  { frames(), background(), weather(), fire() } drawn in code when the game starts;
 *                  optional flickers(): canvases of lights laid over the background, each flickering on its own
 *                  aliases: { 'frame name the game uses': 'frame name in the atlas' }
 *   sounds         files: { name: url } and/or make: { name: function (sampleRate) -> Float32Array } (see SOUND NAMES)
 *   volume         { name: 0-1 } for sounds that play quieter than full volume
 *   weather        falling particles (snow, rain...): speeds, sizes, gusts
 *   flyovers       things that cross the screen now and then, each with its own sound (centred: the route is for its middle)
 *   ambience       background sounds that take turns, one playing about a third of the time
 *   critter        a sound now and then
 *   nowAndThen     more sounds now and then: [{ sound, first, every }]
 *   special        each side's special attack (the hero's instant kill): { from, to, scale, time } flies the side's
 *                  special frame across the screen; zoom: a frame that grows from the middle to fill the screen as it
 *                  fades; glitch: seconds of the game sliding about in strips (see StartGlitch)
 *   healthBar      optional: show damage as a bar over each piece (see AddHealthBar)
 *   menuColours    optional: { fill, line } for the menu
 *   flickerBrightness  optional: how bright the flickering background lights are when on (0-1)
 *   fonts          optional: the two fonts drawn in code (see LoadThemeFonts); otherwise Steve's font
 *
 * To make a new theme: copy themes/cyberpunk, change the words, models, colours and sound recipes,
 * and add its script tags to index.html. js/drawkit.js and js/soundkit.js do the drawing and sound making.
 *
 * SOUND NAMES the game plays:
 *   select, move, turn                         picking up a piece, moving it, the turn passing
 *   shoot_<faction>_<unit>                     e.g. shoot_blue_vehicle
 *   explode_<faction>                          a piece of that side destroyed
 *   win_<faction>, special_<faction>           victory, and the hero's special attack
 *   plus the sounds named in flyovers, ambience and critter
 *
 * FRAME NAMES the game draws (the atlas must have all of these, directly or through aliases):
 *   board tiles      '0000'..'1111' (bridges north, east, south, west), blankTile
 *   pieces           <faction>_<unit>_<direction>_<health> (health 0 = the wreck), <faction>_<unit> (info window)
 *   eject_heart, eject_heart_left, eject_heart_right   thrown out when a piece is hit, cracking in two (drawn by DrawKit.uiFrames);
 *                    or, if there's no eject_heart, eject_<faction>_<unit> thrown out instead
 *   shots            shoot_<direction>, shoot_<direction>_rider
 *   markers          moveable_<direction>, shootable_on, shootable_off, <faction>_shooter
 *   info window      info_window, one_linear, two_linear, three_linear, two_diaganol, health_heart, empty_health_heart
 *   other            control_panel, <faction>_badge, <faction>_special, and each flyover's frame
 */

var THEMES = {};
var THEME_ORDER = [];
var THEME;                  // the theme being played

function AddTheme(theme) {
	THEMES[theme.id] = theme;
	THEME_ORDER.push(theme.id);
}

// The player's last pick, or the first theme added
function ChooseTheme() {
	var id = null;
	try { id = localStorage.getItem('showdown.theme'); } catch (e) { }
	THEME = THEMES[id] || THEMES[THEME_ORDER[0]];
	document.title = THEME.words.appName;
}

// The menu's theme row: save the next theme and start again with it
function SwitchToNextTheme() {
	var next = THEME_ORDER[(THEME_ORDER.indexOf(THEME.id) + 1) % THEME_ORDER.length];
	try { localStorage.setItem('showdown.theme', next); } catch (e) { }
	window.location.reload();
}

//=========================== GRAPHICS ==================================

// Called from preload: the atlas ('sprites'), the background, the weather particles and the fire animation
function LoadThemeGraphics() {
	var g = THEME.graphics;
	if (g.files) {
		var f = g.files;
		game.load.atlas('sprites', f.atlas, null, WithAliases(f.atlasData, g.aliases));
		game.load.image('background', f.background);
		game.load.spritesheet('weather', f.weather.url, f.weather.width, f.weather.height);
		game.load.spritesheet('fire', f.fire.url, f.fire.width, f.fire.height, f.fire.frames);
	}
	else {
		var d = g.draw;
		var atlas = PackFrames(d.frames());
		game.cache.addTextureAtlas('sprites', null, atlas.canvas, WithAliases(atlas.data, g.aliases), Phaser.Loader.TEXTURE_ATLAS_JSON_ARRAY);
		game.cache.addImage('background', null, d.background());
		if (d.flickers)
			d.flickers().forEach(function (canvas, i) { game.cache.addImage('flicker' + i, null, canvas); });
		AddDrawnSpriteSheet('weather', d.weather());
		AddDrawnSpriteSheet('fire', d.fire());
	}
}

// A strip of equal frames drawn in code: { canvas, width, height, frames }
function AddDrawnSpriteSheet(key, sheet) {
	game.cache.addSpriteSheet(key, null, sheet.canvas, sheet.width, sheet.height, sheet.frames, 0, 0);
}

// Background lights that flicker: images 'flicker0', 'flicker1'... over the background, each mostly on,
// now and then stuttering off and on, or going out for a moment (see the theme's draw.flickers)
function AddFlickers() {
	for (var i = 0; game.cache.checkImageKey('flicker' + i); i++) {
		(function (layer) {
			var state = { left: 0, out: 0 }, on = THEME.flickerBrightness || 1;
			layer.alpha = on;
			game.time.events.loop(70, function () {
				if (state.out > 0) { state.out--; layer.alpha = state.out == 0 ? on : 0.1 * on; return; }
				if (state.left > 0) { state.left--; layer.alpha = Math.random() < 0.5 ? on : 0.15 * on; if (state.left == 0) layer.alpha = on; return; }
				var r = Math.random();
				if (r < 0.012) state.left = 4 + Math.floor(Math.random() * 12);       // a stutter
				else if (r < 0.015) state.out = 15 + Math.floor(Math.random() * 30);  // out for a second or two
			});
		})(game.add.image(0, 0, 'flicker' + i));
	}
}

// Add extra frame names that point at existing frames
function WithAliases(atlasData, aliases) {
	if (!aliases)
		return atlasData;
	var byName = {};
	atlasData.frames.forEach(function (frame) { byName[frame.filename] = frame; });
	var frames = atlasData.frames.slice();
	Object.keys(aliases).forEach(function (alias) {
		var frame = byName[aliases[alias]];
		if (frame) {
			var copy = CloneObject(frame);
			copy.filename = alias;
			frames.push(copy);
		}
	});
	return { frames: frames };
}

/*
 * Frames drawn in code, packed into one canvas in rows.
 * Each frame: { name, w, h, paint: function (ctx) }, painted with (0, 0) at its top left.
 *   source: { w, h, x, y }  optional: the frame sits at (x, y) in a source box w by h (like a trimmed sprite).
 *                           Pieces use a 256 x 256 source box with the board square's top face at y 0-128.
 */
function PackFrames(frames) {
	var width = 2048;
	var gap = 2;
	var x = 0, y = 0, rowHeight = 0;
	var placed = frames.slice().sort(function (a, b) { return b.h - a.h; }).map(function (frame) {
		if (x + frame.w > width) {
			x = 0;
			y += rowHeight + gap;
			rowHeight = 0;
		}
		var spot = { frame: frame, x: x, y: y };
		x += frame.w + gap;
		rowHeight = Math.max(rowHeight, frame.h);
		return spot;
	});

	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = y + rowHeight;
	var ctx = canvas.getContext('2d');

	var data = { frames: [] };
	placed.forEach(function (spot) {
		var f = spot.frame;
		ctx.save();
		ctx.translate(spot.x, spot.y);
		ctx.beginPath();
		ctx.rect(0, 0, f.w, f.h);
		ctx.clip();
		f.paint(ctx);
		ctx.restore();

		var source = f.source || { w: f.w, h: f.h, x: 0, y: 0 };
		data.frames.push({
			filename: f.name,
			frame: { x: spot.x, y: spot.y, w: f.w, h: f.h },
			rotated: false,
			trimmed: !!f.source,
			spriteSourceSize: { x: source.x, y: source.y, w: f.w, h: f.h },
			sourceSize: { w: source.w, h: source.h }
		});
	});
	return { canvas: canvas, data: data };
}

// A canvas of the given size, painted by paint(ctx)
function DrawCanvas(width, height, paint) {
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	paint(canvas.getContext('2d'));
	return canvas;
}

//=========================== FONTS =====================================

// The two fonts the game writes with, 'fontBlue' (titles, labels) and 'fontYellow' (hits, wins, highlights):
// drawn by the theme (fonts: { fontBlue: { face, left, right }, fontYellow: {...} }, see DrawKit.glitchFont),
// or Steve's own from assets/font
function LoadThemeFonts() {
	['fontBlue', 'fontYellow'].forEach(function (key) {
		var style = THEME.fonts && THEME.fonts[key];
		if (style) {
			var font = DrawKit.glitchFont(style);
			var xml = new DOMParser().parseFromString(font.xml, 'text/xml');
			game.cache.addBitmapFont(key, null, font.canvas, xml, 0, 0);
		}
		else {
			game.load.bitmapFont(key, 'assets/font/' + key + '.png', 'assets/font/font.xml');
		}
	});
}

//=========================== SOUNDS ====================================

var SoundCache = {};

// Called from preload: sound files to load, or sounds made in code put straight into the cache
function LoadThemeSounds() {
	var s = THEME.sounds;
	if (s.files) {
		Object.keys(s.files).forEach(function (name) {
			game.load.audio(name, [s.files[name]]);
		});
	}
	if (s.make && game.sound.usingWebAudio && game.sound.context) {
		var context = game.sound.context;
		Object.keys(s.make).forEach(function (name) {
			if (s.files && s.files[name]) return;      // a file wins over a recipe
			var samples = s.make[name](context.sampleRate);
			var buffer = context.createBuffer(1, samples.length, context.sampleRate);
			buffer.getChannelData(0).set(samples);
			game.cache.addSound(name, '', buffer, true, false);
			game.cache.decodedSound(name, buffer);
		});
	}
}

// Play a sound by name at the theme's volume for it (or full). Unknown names are silent.
function PlaySound(name, volume) {
	if (!game.cache.checkSoundKey(name))
		return;
	if (!SoundCache[name])
		SoundCache[name] = game.add.audio(name);
	if (volume === undefined)
		volume = (THEME.volume && THEME.volume[name] !== undefined) ? THEME.volume[name] : 1;
	SoundCache[name].play('', 0, volume);
}

// A piece's shot, falling back to the unit's, then any shot
function PlayShotSound(piece) {
	var names = ['shoot_' + piece.faction + '_' + piece.unit, 'shoot_' + piece.unit, 'shoot'];
	for (var i = 0; i < names.length; i++) {
		if (game.cache.checkSoundKey(names[i])) {
			PlaySound(names[i]);
			return;
		}
	}
}

//=========================== HEALTH BARS ===============================

// Themes that show damage as a bar (healthBar: { y: { unit: y } }) get one over each piece, in the side's colour.
// y is where the bar's bottom sits in the piece's 256 x 256 source box (the board square's top face is y 0-128).
function AddHealthBar(sprite, piece) {
	var bar = THEME.healthBar;
	if (!bar || !piece || piece.health <= 0)
		return;
	var frame = 'health_' + piece.faction + '_' + piece.initialHealth + '_' + piece.health;
	var child = game.make.sprite(128, bar.y[piece.unit], 'sprites', frame);
	child.anchor.setTo(0.5, 1);
	sprite.addChild(child);
}

//=========================== WORDS =====================================

// The name a theme gives a side, e.g. 'blues'
function FactionName(faction) {
	return THEME.words.factions[faction];
}
