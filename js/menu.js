/*
 * Showdown - the menu (control panel, top left) and the instructions
 * Both are drawn in code with the theme's words, so they work for every theme.
 */

var MENU_WIDTH = 512;
var MENU_ROW = 128;

// The theme's menu colours (menuColours: { fill, line }), or light grey with dark lines
function MenuColours() {
	return THEME.menuColours || { fill: 0xC3C3C3, line: 0x1E1E1E };
}

function InitMenu() {
	var controlPanelSprite = UI.controlPanel = game.add.sprite(5, 5, 'sprites', 'control_panel');
	controlPanelSprite.scale.setTo(0.4, 0.4);
	controlPanelSprite.inputEnabled = true;
	controlPanelSprite.input.useHandCursor = true;

	// bounce now and then to get noticed
	var controlPanelScaleTween = game.add.tween(controlPanelSprite.scale);
	controlPanelScaleTween.to({ x: 0.6, y: 0.6 }, 300, Phaser.Easing.Bounce.Out, false, 0, true, false);
	controlPanelScaleTween.repeat(5, 10000); //1000 = 1 sec
	controlPanelScaleTween.start();

	//=== EVENT (tap control panel): pause and show the menu
	controlPanelSprite.events.onInputDown.add(function () {
		game.paused = true;
		DrawMenu();
		DrawRobotMenuRow();

		//=== taps while paused go to the menu
		game.input.onDown.add(MenuTapped, self);
	}, this);
}

// Which row is which: the theme row only shows when there's more than one theme to pick from, and the robot
// players row comes last
function MenuRows() {
	var themes = THEME_ORDER.length > 1;
	return { theme: themes ? 4 : -1, robot: themes ? 5 : 4 };
}

// The menu rows: back, how to play, weather on/off, new game, theme (the robot players row is drawn separately)
function DrawMenu() {
	var words = THEME.words;
	var labels = [
		'back',
		'how to play',
		words.weather + (Settings.weatherOn ? ' off' : ' on'),
		'new game'
	];
	if (MenuRows().theme >= 0)
		labels.push('theme ' + THEME.name);

	var menu = UI.menu = game.add.group();
	var background = game.add.graphics(0, 0, menu);
	background.beginFill(MenuColours().fill);
	background.drawRect(0, 0, MENU_WIDTH, MENU_ROW * labels.length);
	background.endFill();
	background.beginFill(MenuColours().line);
	labels.forEach(function (label, i) {
		if (i > 0)
			background.drawRect(0, i * MENU_ROW - 4, MENU_WIDTH, 4);
		game.add.bitmapText(32, i * MENU_ROW + 36, 'fontBlue', label, 48, menu);
	});
	background.endFill();
}

// Menu rows (128px each): back, how to play, weather on/off, new game, theme (if there are 2 or more), robot players
function MenuTapped(event) {
	//=== only while the menu is up (not the instructions)
	if (!(Settings.showInstructionScreen == false && game.paused && UI.menu && !UI.instructions))
		return;

	//=== outside the menu: close it
	if (!(event.x > 0 && event.x < MENU_WIDTH && event.y > 0 && event.y < (MenuRows().robot + 1) * MENU_ROW)) {
		CloseMenu();
		return;
	}

	var row = Math.floor(event.y / MENU_ROW);
	//=== back
	if (row == 0) {
		CloseMenu();
	}
	//=== how to play
	if (row == 1) {
		game.paused = false;
		DestroyMenu();
		Settings.showInstructionScreen = true;
		ShowInstructions();
	}
	//=== weather on/off
	if (row == 2) {
		Settings.weatherOn = !Settings.weatherOn;
		CloseMenu();
		if (Settings.weatherOn)
			StartWeather();
		else
			StopWeather();
	}
	//=== new game
	if (row == 3) {
		CloseMenu();
		ResetGame();
	}
	//=== the next theme (starts the game again)
	if (row == MenuRows().theme) {
		SwitchToNextTheme();
	}
	//=== robot players: tap a side to switch it between player and robot (the menu stays open)
	if (row == MenuRows().robot) {
		var faction = (event.x < MENU_WIDTH / 2) ? 'blue' : 'red';
		SetRobot(faction, !IsRobot(faction));
		DrawRobotMenuRow();
	}
}

function CloseMenu() {
	DestroyMenu();
	game.paused = false;
}

function DestroyMenu() {
	if (UI.menu)
		UI.menu.destroy(true);
	UI.menu = null;
	if (UI.robotMenuRow)
		UI.robotMenuRow.destroy(true);
	UI.robotMenuRow = null;
}

// The last menu row: each side's badge, and 'player' or 'robot'
function DrawRobotMenuRow() {
	if (UI.robotMenuRow)
		UI.robotMenuRow.destroy(true);
	var row = UI.robotMenuRow = game.add.group();
	var top = MenuRows().robot * MENU_ROW;

	var background = game.add.graphics(0, 0, row);
	background.beginFill(MenuColours().fill);
	background.drawRect(0, top, MENU_WIDTH, MENU_ROW);
	background.endFill();
	background.beginFill(MenuColours().line);
	background.drawRect(0, top - 4, MENU_WIDTH, 4);
	background.drawRect(MENU_WIDTH / 2 - 2, top + 12, 4, 104);
	background.endFill();

	['blue', 'red'].forEach(function (faction, i) {
		var badge = game.add.sprite(16 + 256 * i, top + 24, 'sprites', faction + '_badge', row);
		badge.scale.setTo(0.25, 0.25);
		game.add.bitmapText(108 + 256 * i, top + 48, IsRobot(faction) ? 'fontYellow' : 'fontBlue', IsRobot(faction) ? 'robot' : 'player', 30, row);
	});
}

// How to play: the theme's title and instructions over the whole screen; tap to close
function ShowInstructions() {
	var words = THEME.words;
	var screen = UI.instructions = game.add.group();

	var background = game.add.graphics(0, 0, screen);
	background.beginFill(0x111111, 0.92);
	background.drawRect(0, 0, game.world.width, game.world.height);
	background.endFill();

	// an invisible sprite over the whole screen takes the tap
	var tapArea = game.add.sprite(0, 0, null, null, screen);
	tapArea.width = game.world.width;
	tapArea.height = game.world.height;
	tapArea.inputEnabled = true;
	tapArea.input.useHandCursor = true;

	game.add.bitmapText(60, 40, 'fontYellow', words.title.join(' ').replace(/ +/g, ' ').trim(), 64, screen);
	words.instructions.forEach(function (line, i) {
		game.add.bitmapText(80, 150 + i * 72, 'fontBlue', line, 44, screen);
	});
	game.add.bitmapText(60, game.world.height - 70, 'fontYellow', 'tap to close', 32, screen);

	//=== tap to close
	tapArea.events.onInputDown.add(function () {
		game.paused = false;
		UI.instructions.destroy(true);
		UI.instructions = null;
		Settings.showInstructionScreen = false;
	}, game);
}
