/*
 * Showdown - the Phaser game: loading the theme, building the scene, and the per-frame update.
 * Loaded last: every other js/ file and the themes must be loaded before this one.
 */

ChooseTheme();

var game = new Phaser.Game(1200, 800, Phaser.CANVAS, 'game', null, true, false);
var BasicGame = function (game) { };
BasicGame.Boot = function (game) { };

BasicGame.Boot.prototype = {
	init: function () {
	},

	preload: function () {
		game.time.advancedTiming = true;
		game.plugins.add(new Phaser.Plugin.Isometric(game));
		game.iso.anchor.setTo(0.35, 0); //indent the isometric grid

		//=== the theme's graphics and sounds (from files, or drawn and made in code)
		LoadThemeGraphics();
		LoadThemeSounds();

		//=== fonts: the theme's own, or Steve's
		LoadThemeFonts();
	},

	create: function () {
		this.scale.pageAlignHorizontally = true;
		this.scale.pageAlignVertically = true;
		// as big as the browser window allows, keeping its shape (and following the window when it's resized)
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.minWidth = 480;
		this.scale.minHeight = 320;
		this.scale.refresh();

		//=== background
		game.add.tileSprite(0, 0, 1200, 800, 'background');
		AddFlickers();
		game.add.bitmapText(10, 10, 'fontBlue', 'v3', 16);

		//=== sprite groups, back to front
		isoGroupBackground = game.add.group();
		isoGroupIndicators = game.add.group();
		isoGroupPieces = game.add.group();
		isoGroupHotspots = game.add.group();

		InitTiles();
		ShowTitleText(0);
		InitMenu();
		InitBackgound();
		InitGameboard();

		cursorPos = new Phaser.Plugin.Isometric.Point3(); //=== 3D position of the pointer

		//=== whose turn: badges top right
		UI.blueBadge_1 = game.add.sprite(game.world.width - 470, 20, 'sprites', 'blue_badge');
		UI.blueBadge_2 = game.add.sprite(game.world.width - 370, 100, 'sprites', 'blue_badge');
		UI.redBadge_1 = game.add.sprite(game.world.width - 220, 20, 'sprites', 'red_badge');
		UI.redBadge_2 = game.add.sprite(game.world.width - 120, 100, 'sprites', 'red_badge');

		LoadRobotSettings();
		DrawRobotLabels();

		UI.fireAnimation = game.add.sprite(-300, -300, 'fire');
		UI.fireAnimation.animations.add('flames');

		CreateWeather();
		InitAmbience();

		FlipFactionTurn();
		InitGameboard();

		//=== remove the loading screen
		document.getElementById("loader").style.display = "none";
	},

	update: function () {
		IncrementAnimationAndAudioCounters();
		game.iso.unproject(game.input.activePointer.position, cursorPos);
	},

	// the special attack's glitch: the game slides about in strips, the foreground stays still (see effects.js)
	preRender: function () {
		GlitchPreRender();
	},

	render: function () {
		GlitchRender();
	}
};

game.state.add('Boot', BasicGame.Boot);
game.state.start('Boot');
