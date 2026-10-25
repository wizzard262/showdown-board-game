/*
 * Cyberpunk theme: Future City Battle.
 * Future cops, the Enforcers (the 'blue' side), against the Neon Gangs (the 'red' side) in a rainy city at night.
 * Graphics in graphics.js and sounds in sounds.js, all made in code; no picture or sound files.
 */

AddTheme({
	id: 'cyberpunk',
	name: 'future city',

	words: {
		appName: 'Future City Battle',
		loading: 'loading',
		title: ['future', 'city', 'battle'],
		factions: { blue: 'enforcers', red: 'neon gangs' },
		victory: { blue: ['cops', 'win!'], red: ['gangs', 'win!'] },
		special: { blue: ['lock', 'down!'], red: ['system', 'hacked!'] },
		hit: 'hit!',
		miss: 'miss!',
		weather: 'rain',
		instructions: [
			'enforcers against the neon gangs',
			'win by taking out every enemy piece',
			'or by reaching the enemy base',
			'each side has 2 actions a turn',
			'an action is a move or a shot',
			'a move is 1 square along a road',
			'pieces have different shot ranges',
			'shots hit 2 times in 3'
		]
	},

	graphics: {
		draw: CYBERPUNK_GRAPHICS,
		aliases: CYBERPUNK_GRAPHICS.aliases()
	},

	// made in code, except the real board-game sounds of picking up, sliding and turning over pieces
	sounds: {
		make: CYBERPUNK_SOUNDS,
		files: { select: 'assets/audio/pieceUp.mp3', move: 'assets/audio/pieceSlide.mp3', turn: 'assets/audio/factionFlipTwo.mp3' }
	},

	volume: {
		flyover_spinners: 0.55,
		flyover_blimp: 0.45,
		flyover_van: 0.45,
		radio: 0.3,
		modem: 0.12,
		datahiss: 0.1,
		neon: 0.15,
		dog: 0.25,
		ambience_rain: 0.4,
		ambience_city: 0.4,
		critter: 0.3
	},

	menuColours: { fill: 0x0B0E1C, line: 0x33F0FF },

	// the city's neon, dulled like the rest of the background
	flickerBrightness: 0.68,

	// glitch fonts: white with a purple and green split; yellow with a magenta and cyan split
	fonts: {
		fontBlue: { face: '#ffffff', left: '#7b2cff', right: '#39ff6a' },
		fontYellow: { face: '#ffe23d', left: '#ff38d4', right: '#33f0ff' }
	},

	// damage shows as a bar over each piece; y is where the bar's bottom sits (see AddHealthBar)
	healthBar: { y: { army: -10, hero_army: -22, vehicle: -4, cannon: 0, rider: -12 } },

	weather: {
		frames: 4, count: 350, minScale: 0.6, maxScale: 1.1,
		ySpeed: [600, 850], xSpeed: [-60, -30], rotation: [0, 0], lifespan: 1600, every: 6,
		gusts: false
	},

	// x, y as parts of the screen width and height; every: seconds between, [least, most].
	// Each craft is drawn facing the way it flies.
	flyovers: [
		{ frame: 'flyover_spinners', sound: 'flyover_spinners', scale: 1, centred: true, from: [1.5, 0.6], to: [0.15, -0.36], time: 2250, first: 100 / 60, every: [13, 53] },
		{ frame: 'flyover_van', sound: 'flyover_van', scale: 1, centred: true, from: [1.5, 0], to: [0.18, 1.2], time: 3000, first: 200 / 60, every: [13, 53] },
		{ frame: 'flyover_blimp', sound: 'flyover_blimp', scale: 1, centred: true, from: [-0.3, 0.05], to: [0.75, 1.25], time: 12000, first: 1000 / 60, every: [20, 80] }
	],

	ambience: ['ambience_rain', 'ambience_city'],
	critter: { sound: 'critter', first: 25, every: [25, 80] },
	// other sounds now and then: police radio chatter, a dial-up modem somewhere, data hiss on its own, a buzzing neon sign, a dog a few streets away
	nowAndThen: [{ sound: 'radio', first: 8, every: [12, 35] }, { sound: 'modem', first: 30, every: [45, 110] }, { sound: 'datahiss', first: 18, every: [30, 80] },
		{ sound: 'neon', first: 12, every: [25, 70] }, { sound: 'dog', first: 40, every: [50, 120] }],

	// the hero's special attack. Enforcers: the gunship flies across (x, y as parts of the screen) and their shield
	// grows from the middle to fill the screen. Gangs: the skull does. Both glitch the game for a moment
	special: {
		blue: { from: [-0.2, -0.3], to: [1.1, 1.1], scale: 1.3, time: 2000, zoom: 'blue_badge', glitch: 1.6 },
		red: { zoom: 'red_special', glitch: 1.8 }
	}
});
