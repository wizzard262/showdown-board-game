/*
 * Cyberpunk theme - graphics, all drawn in code when the game starts.
 * Enforcers (the 'blue' side, cyan) against the Neon Gangs (the 'red' side, magenta) in a rainy, smoggy city at night.
 * Each piece is one model drawn in 4 directions (DrawKit), once whole and once as a wreck, built from cubes like a
 * blocky toy (Crossy Road style) with a dark outline. People are rebuilt as blocky toys (see blockyPerson).
 * The health bar is separate (see AddHealthBar).
 */

var CYBERPUNK_GRAPHICS = (function () {
	var Model = DrawKit.Model;

	var COP = { body: '#1c2a4d', plate: '#41639e', neon: '#33f0ff', white: '#dfe9ff', gold: '#ffcc33', dark: '#0d1220', skin: '#c99a78', red: '#ff3344', blue: '#3a6bff', amber: '#ffb347' };
	var GANG = { jacket: '#2e1338', purple: '#5b2a74', neon: '#ff38d4', yellow: '#ffe23d', green: '#5dff7a', denim: '#2d3550', rust: '#6a3428', chrome: '#c8ccd8', dark: '#141018', leather: '#1c1416', skins: ['#e0b08a', '#8a5a3c', '#c58c5e'] };

	var UNITS = ['army', 'hero_army', 'vehicle', 'cannon', 'rider'];
	var DIRS = ['up', 'right', 'down', 'left'];
	var FULL_HEALTH = { army: 4, hero_army: 3, vehicle: 3, cannon: 3, rider: 2 };
	var TEAL = '#3ff2d6', TEAL2 = '#2fb8c9';   // the city's lit windows
	var PIXEL = 3;              // pixel art: each pixel is 3 x 3 screen pixels
	var OUTLINE = '#05050a';    // and solid shapes get a dark 1-pixel outline

	// The board on screen: the centre of square (i, j), and the scale of the board's projection
	var BOARD = { x: 548, y: 64, step: 128 * Math.cos(Math.atan(0.5)), scale: Math.cos(Math.atan(0.5)) };
	function squareCentre(i, j) {
		return [BOARD.x + BOARD.step * (i - j), BOARD.y + BOARD.step / 2 * (i + j)];
	}

	//=========================== PEOPLE ================================

	// One person, about 49 high (53 with a hat), facing forward (+f). o: colours and extras
	function person(o) {
		var m = new Model();
		var skin = o.skin;
		[-1, 1].forEach(function (side) {
			var s = side * 3;
			m.box(-2, 4.5, s - 2, s + 2, 0, 3, o.boots || '#151515');
			m.limb([0.3, s, 3], [0.9, s, 12], 2.1, o.legs);
			m.limb([0.9, s, 12], [0, s * 1.05, 21], 2.6, o.legs);
		});
		m.ellipsoid(0, 0, 22, 3.6, 5.8, 3, o.legs);
		if (o.coat)
			m.ellipsoid(-0.5, 0, 22, 5, 7.6, 11, o.body);
		m.ellipsoid(0, 0, 30, 4.3, 7, 7, o.body);
		if (o.stripe)
			m.box(3.9, 4.5, -5.5, 5.5, 28, 29.4, o.stripe, { glow: o.stripe, blur: 6 });
		if (o.badge)
			m.box(4, 5, 1.5, 4, 31, 33.5, o.badge, { glow: o.badge, blur: 5 });

		[-1, 1].forEach(function (side) {
			var s = side * 7.6;
			var arm = side > 0 ? (o.armRight || o.body) : (o.armLeft || o.body);
			var armOpt = side > 0 && o.armGlow ? { glow: o.armGlow, blur: 6 } : null;
			var holding = side > 0 && (o.weapon || o.bat);
			var elbow = [1, s * 1.12, 27];
			var hand = holding ? [6, s * 0.9, 23] : [1.5, s * 1.08, 19.5];
			m.ball(0, s, 34, 2.7, arm);
			m.limb([0, s, 34], elbow, 2.1, arm, armOpt);
			m.limb(elbow, hand, 1.9, arm, armOpt);
			m.ball(hand[0] + 0.6, hand[1], hand[2] - 0.6, 1.8, o.gloves || skin);
		});
		if (o.weapon)
			m.box(4, 15, 6, 7.8, 22, 24.5, '#1b1b1b');
		if (o.bat)
			m.limb([7, 6.8, 23], [12, 8, 40], 1.2, o.bat, { glow: o.bat, blur: 5 });

		m.limb([0, 0, 36], [0.3, 0, 39.5], 1.9, skin);
		m.ellipsoid(0.4, 0, 43.5, 4.4, 4, 5, skin);
		if (!o.helmet && !o.shades) {
			m.box(4.1, 4.6, -2.4, -1.1, 44, 45, '#111111');
			m.box(4.1, 4.6, 1.1, 2.4, 44, 45, '#111111');
		}
		if (o.hair)
			m.ellipsoid(-0.8, 0, 45.6, 4.3, 4.3, 3.4, o.hair);
		if (o.longHair)
			m.ellipsoid(-2, 0, 41.5, 3.2, 4.6, 6.5, o.longHair);
		if (o.helmet) {
			m.ellipsoid(-0.2, 0, 45, 5.3, 4.9, 5.4, o.helmet);
			m.box(3.6, 6, -4, 4, 42.5, 45.8, o.visor, { glow: o.visor });
		}
		if (o.cap) {
			m.cylinder(0, 0, 47.5, 49, 4.9, o.capBand || o.cap);
			m.cylinder(0, 0, 49, 53, 4.7, o.cap, { top: o.cap });
			m.box(3.5, 8.5, -3.6, 3.6, 47.5, 48.5, '#111111');
		}
		if (o.shades)
			m.box(4, 5.3, -3.6, 3.6, 43.8, 45.6, '#0a0a0a', { glow: o.shades, blur: 5 });
		if (o.mohawk)
			m.box(-4.5, 4, -1, 1, 47, 53, o.mohawk, { glow: o.mohawk, blur: 5 });
		if (o.spikes)
			[[-3, -2], [-1, 2], [1.5, -1.5], [-2.5, 1.5], [0.5, 0]].forEach(function (p) { m.box(p[0] - 1, p[0] + 1, p[1] - 1, p[1] + 1, 46.5, 51.5, o.spikes); });
		if (o.shield)
			m.box(8, 9.8, -7.5, 7.5, 6, 32, o.shield, { alpha: 0.5, glow: o.shield, blur: 8 });
		m.person = o;     // what it's made from, so the pieces can swap in blockyPerson(o)
		return m;
	}

	// The same person as a blocky toy, on a grid of 2: boots, legs, an 8 x 8 body, arms one cube thick and a big
	// 12-cube head. Every box lines up with the grid, so it builds into cubes exactly (see VOXEL)
	function blockyPerson(o) {
		var m = new Model();
		var B = function (f0, f1, s0, s1, z0, z1, color, opt) { m.box(f0, f1, s0, s1, z0, z1, color, opt); };
		var glow = function (color) { return { glow: color }; };
		var hand = o.gloves || o.skin;
		B(-2, 2, -4, 4, 0, 4, o.boots || '#151515');
		B(-2, 2, -4, 4, 4, 12, o.legs);
		if (o.coat) B(-4, 4, -4, 4, 6, 12, o.body);
		B(-4, 4, -4, 4, 12, 28, o.body);
		if (o.stripe) B(2, 4, -4, 4, 22, 24, o.stripe, glow(o.stripe));
		if (o.badge) B(2, 4, 0, 4, 24, 28, o.badge, glow(o.badge));
		// the left arm hangs; the right one holds the gun or bat out in front
		B(-2, 2, -6, -4, 16, 28, o.armLeft || o.body);
		B(-2, 2, -6, -4, 12, 16, hand);
		var arm = o.armRight || o.body, armOpt = o.armGlow ? glow(o.armGlow) : null;
		if (o.weapon || o.bat) {
			B(-2, 2, 4, 6, 20, 28, arm, armOpt);
			B(2, 6, 4, 6, 20, 24, arm, armOpt);
			B(6, 8, 4, 6, 20, 24, hand);
			if (o.weapon) B(4, 14, 4, 6, 24, 26, '#1b1b1b');
			if (o.bat) B(6, 8, 4, 6, 24, 42, o.bat, glow(o.bat));
		}
		else {
			B(-2, 2, 4, 6, 16, 28, arm, armOpt);
			B(-2, 2, 4, 6, 12, 16, hand);
		}
		// the head, and what's on it
		B(-6, 6, -6, 6, 28, 40, o.skin);
		if (!o.helmet && !o.shades) {
			B(4, 6, -4, -2, 32, 36, '#111111');
			B(4, 6, 2, 4, 32, 36, '#111111');
		}
		if (o.longHair) {
			B(-8, -6, -6, 6, 22, 40, o.longHair);
			B(-6, 6, -6, 6, 38, 42, o.longHair);
		}
		if (o.hair) {
			B(-6, 6, -6, 6, 38, 42, o.hair);
			B(-6, -4, -6, 6, 30, 42, o.hair);
		}
		if (o.helmet) {
			B(-6, 6, -6, 6, 36, 44, o.helmet);
			B(-8, -6, -6, 6, 28, 44, o.helmet);
			B(6, 8, -6, 6, 32, 36, o.visor, glow(o.visor));
		}
		if (o.cap) {
			B(-6, 6, -6, 6, 40, 46, o.cap);
			B(-6, 6, -6, 6, 40, 42, o.capBand || o.cap);
			B(6, 10, -6, 6, 40, 42, '#111111');
		}
		if (o.shades) {
			B(6, 8, -6, 6, 32, 36, '#0a0a0a');
			B(6, 8, -4, -2, 32, 36, o.shades, glow(o.shades));
			B(6, 8, 2, 4, 32, 36, o.shades, glow(o.shades));
		}
		if (o.mohawk) B(-6, 6, -2, 2, 40, 48, o.mohawk, glow(o.mohawk));
		if (o.spikes) [[-4, -4], [-4, 2], [0, -2], [2, 4], [-2, 6]].forEach(function (p) { B(p[0], p[0] + 2, p[1] - 2, p[1], 40, 46, o.spikes); });
		if (o.shield) B(6, 8, -8, 0, 6, 28, o.shield, { alpha: 0.5, glow: o.shield });
		return m;
	}

	// How the pieces and fly-overs are built in cubes: vehicles and gear 3.5 units across, people swapped for
	// their blocky toy; the blimp in big cubes of 6
	var VOXEL = {
		size: 3.5,
		swap: function (model) { return model.person ? { model: blockyPerson(model.person), size: 2 } : null; }
	};
	var BLIMP_VOXEL = { size: 6 };

	var riotCop = function () {
		return person({ legs: COP.body, body: COP.plate, skin: COP.skin, gloves: COP.dark, boots: COP.dark, helmet: COP.dark, visor: COP.neon, stripe: COP.neon, shield: COP.neon });
	};

	var punk = function (i) {
		return [
			person({ legs: GANG.denim, body: GANG.jacket, skin: GANG.skins[0], mohawk: GANG.neon, stripe: GANG.neon, bat: GANG.yellow }),
			person({ legs: GANG.dark, body: GANG.purple, skin: GANG.skins[1], longHair: '#1a1a1a', hair: '#1a1a1a', stripe: GANG.yellow, weapon: true }),
			person({ legs: GANG.denim, body: GANG.leather, skin: GANG.skins[2], mohawk: GANG.green, stripe: GANG.neon, weapon: true }),
			person({ legs: GANG.dark, body: GANG.jacket, skin: GANG.skins[1], hair: '#d8d8d8', stripe: GANG.yellow, bat: GANG.neon })
		][i % 4];
	};

	// four people, two by two
	function squad(make) {
		var m = new Model();
		[[-12, -13], [-12, 13], [11, -13], [11, 13]].forEach(function (p, i) { m.add(make(i), p[0], p[1], 0, 0.95); });
		return m;
	}

	// a leader out in front of two followers
	function ledSquad(leader, follower) {
		var m = new Model();
		[[-16, -12], [-16, 12]].forEach(function (p, i) { m.add(follower(i), p[0], p[1], 0, 0.85); });
		m.add(leader, 16, 0, 0, 1.15);
		return m;
	}

	//=========================== VEHICLES ==============================

	// police spinner: a flying patrol car
	function spinner() {
		var m = new Model();
		m.disc(0, 0, 1, 44, 26, COP.neon, { alpha: 0.25, glow: COP.neon, blur: 18 });
		[[-30, -18], [-30, 18], [30, -18], [30, 18]].forEach(function (p) { m.cylinder(p[0], p[1], 4, 11, 7, COP.dark, { top: COP.amber }); });
		m.box(-46, 40, -24, 24, 10, 24, COP.body, { top: COP.plate });
		m.ellipsoid(44, 0, 18, 12, 20, 7, COP.white);
		m.box(-46, 40, 24, 25, 16, 19, COP.neon, { glow: COP.neon });
		m.box(-46, 40, -25, -24, 16, 19, COP.neon, { glow: COP.neon });
		m.ellipsoid(2, 0, 30, 24, 17, 10, '#0b1a2a');
		m.ellipsoid(10, 0, 32, 12, 13, 6, COP.neon, { alpha: 0.45, glow: COP.neon, blur: 6 });
		m.box(-8, 4, -13, 13, 38, 40.5, COP.dark);
		m.box(-7, 3, -12, -2, 40.5, 44, COP.red, { glow: COP.red, blur: 14 });
		m.box(-7, 3, 2, 12, 40.5, 44, COP.blue, { glow: COP.blue, blur: 14 });
		m.ball(54, -12, 17, 2.5, '#ffffff', { glow: '#ffffff', blur: 10 });
		m.ball(54, 12, 17, 2.5, '#ffffff', { glow: '#ffffff', blur: 10 });
		m.box(-50, -46, -18, 18, 12, 20, COP.red, { glow: COP.red, blur: 8 });
		return m;
	}

	// the gangs' spiked junk truck
	function junkTruck() {
		var m = new Model();
		[[-30, -27], [-30, 27], [28, -27], [28, 27]].forEach(function (p) { m.wheel(p[0], p[1], 12, 12, '#141414', { hub: '#777777' }); });
		m.box(-46, 18, -24, 24, 12, 30, GANG.rust, { top: '#4a2621' });
		m.box(18, 46, -22, 22, 12, 40, GANG.purple, { top: GANG.jacket });
		m.box(46, 47, -18, 18, 30, 38, GANG.yellow, { glow: GANG.yellow, alpha: 0.7 });
		m.box(46, 52, -27, 27, 12, 18, '#8c8c8c');
		[-20, -8, 4, 16].forEach(function (s) { m.box(52, 60, s - 2, s + 2, 13, 17, '#d0d0d0'); });
		m.box(-46, 18, 24, 24.6, 18, 21, GANG.neon, { glow: GANG.neon });
		m.box(-40, 0, 24, 24.6, 23, 25, GANG.yellow, { glow: GANG.yellow });
		m.box(-46, 18, -24.6, -24, 18, 21, GANG.neon, { glow: GANG.neon });
		m.box(-40, 0, -24.6, -24, 23, 25, GANG.yellow, { glow: GANG.yellow });
		m.cylinder(14, -17, 30, 50, 3, '#9a9a9a');
		m.cylinder(14, 17, 30, 50, 3, '#9a9a9a');
		m.box(-24, -8, 6, 18, 30, 35, '#56303a');
		// a cannon on the back, its short fat barrel pointing out over the tail
		m.box(-40, -22, -10, 10, 30, 36, '#2a2a30');
		m.box(-42, -20, -9, 9, 36, 48, GANG.purple, { top: GANG.jacket });
		m.box(-42, -20, 9, 9.6, 40, 42, GANG.neon, { glow: GANG.neon });
		m.box(-42, -20, -9.6, -9, 40, 42, GANG.neon, { glow: GANG.neon });
		m.box(-60, -42, -5, 5, 38, 46, '#1e1e1e');
		m.box(-66, -60, -7, 7, 36, 48, '#3a3a3a');
		m.box(-67, -66, -4, 4, 39, 45, GANG.yellow, { glow: GANG.yellow });
		return m;
	}

	// the gangs' hover van (a fly-over)
	function hoverVan() {
		var m = new Model();
		m.disc(0, 0, 0, 40, 24, GANG.neon, { alpha: 0.3, glow: GANG.neon, blur: 18 });
		m.box(-40, 30, -22, 22, 8, 34, GANG.purple, { top: GANG.jacket });
		m.ellipsoid(34, 0, 20, 12, 21, 12, GANG.jacket);
		m.box(30, 31, -16, 16, 24, 32, GANG.yellow, { glow: GANG.yellow, alpha: 0.8 });
		m.box(-40, 30, 22, 22.6, 18, 21, GANG.neon, { glow: GANG.neon });
		m.box(-40, 30, -22.6, -22, 18, 21, GANG.neon, { glow: GANG.neon });
		m.box(-30, -10, 22, 22.6, 23, 30, GANG.green, { glow: GANG.green });
		m.box(-30, -10, -22.6, -22, 23, 30, GANG.green, { glow: GANG.green });
		m.box(-44, -40, -14, 14, 12, 22, GANG.neon, { glow: GANG.neon, blur: 14 });
		return m;
	}

	// an advert blimp, squared up like a blocky toy: a boxy hull with stepped ends and a band round it, fins with
	// neon edges, a big screen down its side, a lit gondola, engine pods and navigation lights.
	// Facing +f; the side we see is +s. Every box is on a grid of 6, the size of its cubes (see BLIMP_VOXEL)
	function blimp() {
		var m = new Model();
		var hull = '#454a68', trim = '#5a6080', fin = '#2a2d48', ink = '#120a24';
		var glow = function (color) { return { glow: color }; };

		// the hull: a long box with its long edges cut off, and stepped ends
		m.box(-90, 90, -36, 36, -30, 30, hull);
		m.box(-90, 90, -30, 30, -36, 36, hull);
		m.box(-90, 90, -36, 36, -6, 6, trim);
		[-1, 1].forEach(function (end) {
			m.box(end > 0 ? 90 : -108, end > 0 ? 108 : -90, -30, 30, -30, 30, hull);
			m.box(end > 0 ? 108 : -120, end > 0 ? 120 : -108, -18, 18, -18, 18, end > 0 ? trim : hull);
		});

		// fins at the back, with neon edges
		m.box(-120, -90, -3, 3, 36, 66, fin);
		m.box(-120, -96, -3, 3, 60, 66, COP.neon, glow(COP.neon));
		m.box(-120, -90, 36, 66, -3, 3, fin);
		m.box(-120, -96, 60, 66, -3, 3, GANG.neon, glow(GANG.neon));
		m.box(-120, -90, -66, -36, -3, 3, fin);
		m.box(-120, -90, -3, 3, -60, -36, '#24273e');

		// the screen down our side: a neon frame, bars of "text" and a logo
		m.box(-66, 66, 36, 42, -24, 24, ink);
		m.box(-66, 66, 36, 42, 18, 24, GANG.neon, glow(GANG.neon));
		m.box(-66, 66, 36, 42, -24, -18, GANG.neon, glow(GANG.neon));
		m.box(-66, -60, 36, 42, -24, 24, GANG.neon, glow(GANG.neon));
		m.box(60, 66, 36, 42, -24, 24, GANG.neon, glow(GANG.neon));
		m.box(-18, 30, 36, 42, 6, 12, COP.neon, glow(COP.neon));
		m.box(-18, 42, 36, 42, -6, 0, '#ff8a3d', glow('#ff8a3d'));
		m.box(-18, 18, 36, 42, -12, -6, '#8a4dff', glow('#8a4dff'));
		m.box(-54, -30, 36, 42, -12, 12, '#ffd23d', glow('#ffb347'));
		m.box(-48, -36, 36, 42, -6, 6, ink);

		// the gondola underneath, with lit windows; engine pods with see-through spinning props
		m.box(-36, 36, -12, 12, -54, -36, '#1c1f30', { top: fin });
		m.box(-30, 30, 6, 12, -48, -42, '#ffb347', glow('#ffb347'));
		[-1, 1].forEach(function (side) {
			var s = function (a, b) { return side > 0 ? [a, b] : [-b, -a]; };
			m.box(-18, -6, s(36, 42)[0], s(36, 42)[1], -24, -18, fin);
			m.box(-24, 6, s(42, 54)[0], s(42, 54)[1], -30, -18, fin);
			m.box(-30, -24, s(36, 60)[0], s(36, 60)[1], -36, -12, '#c8f8ff', { alpha: 0.3 });
		});
		// navigation lights: red on the left, green on the right, white at the tail, a red strobe under
		m.box(0, 6, -42, -36, -6, 0, '#ff3344', glow('#ff3344'));
		m.box(78, 84, 36, 42, -6, 0, '#39ff6a', glow('#39ff6a'));
		m.box(-126, -120, -3, 3, 60, 66, '#ffffff', glow('#ffffff'));
		m.box(-6, 6, -6, 6, -60, -54, '#ff3344', glow('#ff3344'));
		return m;
	}

	// the police gunship: a helicopter with a dark hull and cyan stripes, stub wings with rocket pods,
	// a chin gun, skids, a blurred main rotor, a tail rotor and a light bar. Facing +f.
	function gunship() {
		var m = new Model();
		// skids
		[-1, 1].forEach(function (side) {
			m.limb([-26, side * 16, -24], [30, side * 16, -24], 1.6, '#2a2f44');
			m.limb([-14, side * 16, -24], [-10, side * 9, -12], 1.2, '#2a2f44');
			m.limb([16, side * 16, -24], [14, side * 9, -12], 1.2, '#2a2f44');
		});
		// tail boom, fin and tail rotor
		m.limb([-30, 0, 4], [-100, 0, 10], 4, COP.body);
		m.box(-112, -96, -1, 1, 8, 34, COP.body);
		m.box(-112, -104, -0.5, 0.5, 26, 34, COP.neon, { glow: COP.neon, blur: 8 });
		m.wheel(-106, 3, 14, 11, '#c8f8ff', { alpha: 0.3, rim: '#dfe9ff', hub: COP.dark });
		// the body: a long rounded hull, a glass cockpit, cyan stripes
		m.ellipsoid(0, 0, 0, 42, 18, 16, COP.body);
		m.ellipsoid(26, 0, 2, 18, 13, 11, '#0b1a2a');
		m.ellipsoid(30, 0, 4, 12, 10, 7, COP.neon, { alpha: 0.5, glow: COP.neon, blur: 6 });
		m.box(-30, 20, 17.5, 18.2, -2, 1, COP.neon, { glow: COP.neon, blur: 8, layer: 1 });
		m.box(-30, 20, -18.2, -17.5, -2, 1, COP.neon, { glow: COP.neon, blur: 8, layer: 1 });
		// stub wings with rocket pods
		[-1, 1].forEach(function (side) {
			m.box(-8, 6, side > 0 ? 16 : -34, side > 0 ? 34 : -16, -4, -1, COP.plate);
			m.cylinder(0, side * 30, -12, -4, 4.5, '#202428');
			m.ball(0, side * 30, -13, 2.5, GANG.yellow, { glow: '#ff8a3d', blur: 8 });
		});
		// chin gun
		m.ball(38, 0, -12, 4, '#1a1a1a');
		m.box(40, 56, -1.5, 1.5, -14, -11, '#202020');
		// light bar and engine on top, the rotor hub
		m.box(-12, 10, -10, 10, 14, 20, COP.plate, { top: COP.body });
		m.box(-4, 4, -9, -1, 20, 23, COP.red, { glow: COP.red, blur: 12 });
		m.box(-4, 4, 1, 9, 20, 23, COP.blue, { glow: COP.blue, blur: 12 });
		m.cylinder(0, 0, 20, 27, 3, '#3a4050');
		// main rotor: a blurred disc and two blades
		m.disc(0, 0, 28, 82, 82, '#5a7080', { alpha: 0.2 });
		m.limb([-80, -8, 28], [80, 8, 28], 1.6, '#1a1d28');
		m.limb([-8, 80, 28], [8, -80, 28], 1.6, '#1a1d28');
		return m;
	}

	//=========================== PIECES ================================

	var MODELS = {
		blue: {
			army: function () { return squad(riotCop); },
			hero_army: function () {
				return ledSquad(person({ legs: COP.dark, body: COP.body, coat: true, skin: COP.skin, gloves: COP.dark, cap: COP.dark, capBand: COP.gold, shades: COP.neon, badge: COP.gold, stripe: COP.neon, weapon: true }), riotCop);
			},
			vehicle: spinner,
			// sentry turret on a tripod
			cannon: function () {
				var m = new Model();
				m.cylinder(0, 0, 0, 3, 20, COP.dark);
				[0, 2.1, 4.2].forEach(function (a) { m.limb([Math.cos(a) * 20, Math.sin(a) * 20, 1], [0, 0, 20], 1.6, COP.plate); });
				m.cylinder(0, 0, 16, 30, 11, COP.body, { top: COP.plate });
				m.ellipsoid(0, 0, 34, 12, 11, 7, COP.plate);
				m.box(10, 36, -5, -1, 33, 37, '#202020');
				m.box(10, 36, 1, 5, 33, 37, '#202020');
				m.ball(11, 0, 39, 2.6, COP.neon, { glow: COP.neon, blur: 12 });
				m.box(-6, 6, -11.6, -11, 30, 33, COP.neon, { glow: COP.neon });
				m.box(-6, 6, 11, 11.6, 30, 33, COP.neon, { glow: COP.neon });
				return m;
			},
			// pursuit bike and rider
			rider: function () {
				var m = new Model();
				m.wheel(-22, 0, 11, 11, '#151515', { rim: COP.neon, hub: COP.plate });
				m.wheel(24, 0, 11, 11, '#151515', { rim: COP.neon, hub: COP.plate });
				m.box(-24, 22, -5, 5, 12, 22, COP.body, { top: COP.plate });
				m.ellipsoid(20, 0, 24, 11, 8, 7, COP.white);
				m.ball(31, 0, 24, 3, '#ffffff', { glow: '#ffffff', blur: 12 });
				m.box(-24, -12, -9, 9, 18, 24, COP.dark);
				m.box(-24, 22, 5, 5.6, 16, 18, COP.neon, { glow: COP.neon });
				m.box(-24, 22, -5.6, -5, 16, 18, COP.neon, { glow: COP.neon });
				// the rider, leaning forward over the bars
				m.limb([-6, -4, 23], [6, -4, 15], 2.5, COP.body);
				m.limb([-6, 4, 23], [6, 4, 15], 2.5, COP.body);
				m.ellipsoid(-4, 0, 31, 6, 6.5, 8, COP.plate);
				m.limb([-2, -6.5, 35], [12, -7, 29], 2, COP.plate);
				m.limb([-2, 6.5, 35], [12, 7, 29], 2, COP.plate);
				m.ellipsoid(1, 0, 41, 5.2, 4.8, 5.4, COP.dark);
				m.box(4.5, 6.9, -4, 4, 38.5, 41.8, COP.neon, { glow: COP.neon });
				return m;
			}
		},
		red: {
			army: function () { return squad(punk); },
			hero_army: function () {
				return ledSquad(person({ legs: GANG.dark, body: GANG.purple, coat: true, armRight: GANG.chrome, armGlow: GANG.neon, skin: GANG.skins[0], spikes: '#f2f2f2', shades: GANG.neon, stripe: GANG.yellow, weapon: true }), punk);
			},
			vehicle: junkTruck,
			// rocket launcher on a scrap pile
			cannon: function () {
				var m = new Model();
				m.box(-22, 10, -20, 14, 0, 10, GANG.rust);
				m.box(-10, 18, -12, 20, 0, 14, '#3c3c48');
				m.cylinder(-14, 12, 0, 6, 9, '#151515');
				m.box(-14, 14, -13, 13, 14, 32, GANG.purple, { top: GANG.jacket });
				m.box(-14, 14, 13, 13.6, 20, 23, GANG.neon, { glow: GANG.neon });
				m.box(-14, 14, -13.6, -13, 20, 23, GANG.neon, { glow: GANG.neon });
				[[-6, 18], [6, 18], [-6, 28], [6, 28]].forEach(function (p) {
					m.box(14, 30, p[0] - 4, p[0] + 4, p[1] - 4, p[1] + 4, '#1e1e1e');
					m.ball(31, p[0], p[1], 2.8, GANG.yellow, { glow: GANG.yellow, blur: 8 });
				});
				return m;
			},
			// hoverboard punk
			rider: function () {
				var m = new Model();
				m.disc(0, 0, 2, 26, 11, GANG.neon, { alpha: 0.35, glow: GANG.neon, blur: 18 });
				m.box(-26, 26, -9, 9, 8, 11, '#111111', { top: '#222233' });
				m.box(-26, 26, 9, 9.6, 8, 10, GANG.neon, { glow: GANG.neon });
				m.box(-26, 26, -9.6, -9, 8, 10, GANG.neon, { glow: GANG.neon });
				m.add(person({ legs: GANG.denim, body: GANG.jacket, skin: GANG.skins[1], mohawk: GANG.green, stripe: GANG.neon, shades: GANG.yellow, weapon: true }), 0, 0, 11, 0.95);
				return m;
			}
		}
	};

	//=========================== FRAMES ================================

	// Piece frames: a 208 x 232 window on the 256 x 256 source box, with the square's centre at (128, 64)
	var PIECE = { w: 208, h: 232, x: 24, y: -120 };

	// how big each piece is drawn on the board, and [scale, y] for its picture in the info window (scaled again)
	var PIECE_SCALE = { army: 1.3, hero_army: 1.15, vehicle: 1.15, cannon: 1.3, rider: 1.3 };
	var PORTRAIT = { army: [1.15, 140], hero_army: [1.05, 150], vehicle: [0.72, 118], cannon: [1.0, 132], rider: [1.0, 136] };

	// A frame drawn in cubes with a dark outline: the cubes (DrawKit.voxelGroups) at (x, y) on a w x h frame
	function voxelFrame(name, w, h, groups, view, source) {
		return {
			name: name, w: w, h: h, source: source, paint: function (ctx) {
				DrawKit.outlined(ctx, w, h, OUTLINE, function (c) { DrawKit.renderVoxels(c, groups, view); });
			}
		};
	}

	function pieceFrame(name, groups, dir, dim) {
		return voxelFrame(name, PIECE.w, PIECE.h, groups, { dir: dir, x: 128 - PIECE.x, y: 64 - PIECE.y, dim: dim }, { w: 256, h: 256, x: PIECE.x, y: PIECE.y });
	}

	// A shot: a blocky glowing rod, like the pieces, flying the way (dx, dy) on screen. A box in the board's
	// projection: its top and the sides facing the viewer, with a dark outline round it
	function shotFrame(name, dx, dy) {
		var wx = dy + dx / 2, wy = dy - dx / 2;     // the screen direction as a direction on the board
		var len = Math.sqrt(wx * wx + wy * wy), u = [wx / len, wy / len], w = [-u[1], u[0]];
		var L = 18, W = 4, H = 4;                   // half length, half width, half height
		var corner = function (a, b, c) {
			var x = u[0] * a * L + w[0] * b * W, y = u[1] * a * L + w[1] * b * W;
			return [32 + x - y, 34 + (x + y) / 2 - c * H];
		};
		var face = function (ctx, pts, light) {
			ctx.beginPath();
			pts.forEach(function (p, i) { var q = corner(p[0], p[1], p[2]); if (i == 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
			ctx.closePath();
			ctx.fillStyle = DrawKit.shade('#ffb02e', light);
			ctx.fill();
		};
		// the two long sides and the two ends: [outward direction, corners as (along, across, up)]
		var sides = [
			[u, [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], [[-u[0], -u[1]], [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]]],
			[w, [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]], [[-w[0], -w[1]], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]]
		];
		return {
			name: name, w: 64, h: 64, paint: function (ctx) {
				DrawKit.outlined(ctx, 64, 64, OUTLINE, function (c) {
					sides.forEach(function (side) {
						var n = side[0];
						if (n[0] + n[1] > 0.01) face(c, side[1], n[0] > n[1] ? 1.05 : 0.9);    // only the sides facing the viewer
					});
					face(c, [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], 1.45);
				});
			}
		};
	}

	// The board squares as a circuit board: a chip in the middle of each square, bright traces out to the
	// connected sides (the moves), and dim decorative traces that stop short of the edges (so they never
	// look like a way to move)
	function tileFrame(name) {
		return {
			name: name, w: 256, h: 128, source: { w: 256, h: 256, x: 0, y: 0 }, paint: function (ctx) {
				if (name == '0000') return;
				var at = function (wx, wy) { return [128 + wx - wy, 64 + (wx + wy) / 2]; };
				var path = function (pts) {
					ctx.beginPath();
					pts.forEach(function (p, i) { var q = at(p[0], p[1]); if (i == 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
				};
				var rnd = DrawKit.random(parseInt(name, 2) * 7 + 11);

				// the board: a mid grey-green, light enough for the dark pieces to stand out, with a faint dot grid
				DrawKit.diamond(ctx, 0.9);
				var g = ctx.createLinearGradient(0, 0, 0, 128);
				g.addColorStop(0, '#46605e');
				g.addColorStop(1, '#344a49');
				ctx.fillStyle = g;
				ctx.fill();
				ctx.save();
				DrawKit.diamond(ctx, 0.9);
				ctx.clip();
				ctx.fillStyle = 'rgba(120,220,200,0.10)';
				for (var gx = -56; gx <= 56; gx += 14) {
					for (var gy = -56; gy <= 56; gy += 14) {
						var d = at(gx, gy);
						ctx.fillRect(d[0] - 1, d[1] - 0.5, 2, 1);
					}
				}

				// decorative traces: short runs with a 45-degree bend and a via at each end, inside the square
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				for (var t = 0; t < 7; t++) {
					var sx = rnd() * 80 - 40, sy = rnd() * 80 - 40;
					if (Math.abs(sx) < 26 && Math.abs(sy) < 26) continue;
					var len = 10 + rnd() * 18, bend = (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 10);
					var alongX = rnd() < 0.5;
					var p1 = alongX ? [sx + len, sy] : [sx, sy + len];
					var p2 = alongX ? [p1[0] + Math.abs(bend), p1[1] + bend] : [p1[0] + bend, p1[1] + Math.abs(bend)];
					var clamp = function (p) { return [Math.max(-50, Math.min(50, p[0])), Math.max(-50, Math.min(50, p[1]))]; };
					var pts = [[sx, sy], clamp(p1), clamp(p2)];
					path(pts);
					ctx.strokeStyle = 'rgba(70,170,150,0.35)';
					ctx.lineWidth = 1.5;
					ctx.stroke();
					[pts[0], pts[2]].forEach(function (p) {
						var v = at(p[0], p[1]);
						ctx.beginPath(); ctx.ellipse(v[0], v[1], 2.6, 1.4, 0, 0, Math.PI * 2);
						ctx.strokeStyle = 'rgba(200,170,90,0.5)';
						ctx.lineWidth = 1;
						ctx.stroke();
					});
				}
				ctx.restore();

				// the moves: bright traces from the chip to each connected side, running on to the next square
				var ends = { up: [0, -64], right: [64, 0], down: [0, 64], left: [-64, 0] };
				DIRS.forEach(function (dir, i) {
					if (name.charAt(i) != '1') return;
					var e = ends[dir];
					path([[0, 0], e]);
					ctx.strokeStyle = '#3a2a14';
					ctx.lineWidth = 11;
					ctx.stroke();
					ctx.strokeStyle = '#b8862e';
					ctx.lineWidth = 7;
					ctx.stroke();
					ctx.shadowColor = '#33f0ff';
					ctx.shadowBlur = 10;
					ctx.strokeStyle = '#7ff8ff';
					ctx.lineWidth = 2.5;
					ctx.stroke();
					ctx.shadowBlur = 0;
				});

				// the edge of the square
				DrawKit.diamond(ctx, 0.9);
				ctx.strokeStyle = 'rgba(51,240,255,0.25)';
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// the chip in the middle: pins on every side, a dark top, a lit dot
				var chip = 20;
				ctx.strokeStyle = '#d7b25a';
				ctx.lineWidth = 2;
				for (var p = -14; p <= 14; p += 7) {
					[[p, -chip, p, -chip - 6], [p, chip, p, chip + 6], [-chip, p, -chip - 6, p], [chip, p, chip + 6, p]].forEach(function (l) {
						path([[l[0], l[1]], [l[2], l[3]]]);
						ctx.stroke();
					});
				}
				path([[-chip, -chip], [chip, -chip], [chip, chip], [-chip, chip]]);
				ctx.closePath();
				ctx.fillStyle = '#12161c';
				ctx.fill();
				ctx.strokeStyle = 'rgba(255,56,212,0.6)';
				ctx.shadowColor = '#ff38d4';
				ctx.shadowBlur = 8;
				ctx.lineWidth = 1.5;
				ctx.stroke();
				ctx.shadowBlur = 0;
				var dot = at(-12, -12);
				ctx.fillStyle = '#5dff7a';
				ctx.beginPath(); ctx.ellipse(dot[0], dot[1], 2.5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
			}
		};
	}

	// The selected piece: the circuit under it lights up neon blue, traces wiggling out from the chip to vias
	function selectedFrame(faction) {
		return {
			name: faction + '_shooter', w: 256, h: 128, source: { w: 256, h: 256, x: 0, y: 0 }, paint: function (ctx) {
				var at = function (wx, wy) { return [128 + wx - wy, 64 + (wx + wy) / 2]; };
				var rnd = DrawKit.random(faction == 'blue' ? 404 : 808);
				var traces = [];
				// from each side of the chip, traces head outwards with 45-degree jogs
				[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (out) {
					var side = [-out[1], out[0]];
					[-14, -5, 5, 14].forEach(function (along) {
						var p = [out[0] * 24 + side[0] * along, out[1] * 24 + side[1] * along];
						var pts = [p.slice()];
						var reach = 40 + rnd() * 14;
						while (Math.abs(p[0] * out[0] + p[1] * out[1]) < reach) {
							var run = 5 + rnd() * 8, jog = (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 5);
							p = [p[0] + out[0] * run, p[1] + out[1] * run];
							pts.push(p.slice());
							p = [p[0] + out[0] * Math.abs(jog) + side[0] * jog, p[1] + out[1] * Math.abs(jog) + side[1] * jog];
							pts.push(p.slice());
						}
						traces.push(pts);
					});
				});
				ctx.save();
				DrawKit.diamond(ctx, 0.9);
				ctx.clip();
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				[[7, 'rgba(51,160,255,0.35)', 14], [3, '#33c8ff', 10], [1.4, '#e8fbff', 0]].forEach(function (pass) {
					ctx.lineWidth = pass[0];
					ctx.strokeStyle = pass[1];
					ctx.shadowColor = '#33f0ff';
					ctx.shadowBlur = pass[2];
					traces.forEach(function (pts) {
						ctx.beginPath();
						pts.forEach(function (q, i) { var s = at(q[0], q[1]); if (i == 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]); });
						ctx.stroke();
					});
				});
				// a via at the end of each trace
				ctx.shadowBlur = 10;
				traces.forEach(function (pts) {
					var e = at(pts[pts.length - 1][0], pts[pts.length - 1][1]);
					ctx.fillStyle = '#e8fbff';
					ctx.beginPath(); ctx.ellipse(e[0], e[1], 3.4, 1.9, 0, 0, Math.PI * 2); ctx.fill();
				});
				// the chip's outline lit up
				ctx.shadowBlur = 14;
				ctx.strokeStyle = '#33c8ff';
				ctx.lineWidth = 3;
				ctx.beginPath();
				[[-22, -22], [22, -22], [22, 22], [-22, 22]].forEach(function (q, i) { var s = at(q[0], q[1]); if (i == 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]); });
				ctx.closePath();
				ctx.stroke();
				ctx.restore();
			}
		};
	}

	// The hero's special attack. Enforcers: a police gunship swoops over (see gunship). Gangs: a glitching skull hologram.
	// (drone() is no longer used)
	function drone(ctx, x, y, k, lights) {
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(k, k);
		ctx.strokeStyle = '#41639e';
		ctx.lineWidth = 6;
		[[-70, -30], [70, -30], [-70, 30], [70, 30]].forEach(function (p) {
			ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1] * 0.6); ctx.stroke();
			ctx.save();
			ctx.shadowColor = COP.neon; ctx.shadowBlur = 14;
			ctx.strokeStyle = COP.neon; ctx.lineWidth = 3;
			ctx.beginPath(); ctx.ellipse(p[0], p[1] * 0.6, 34, 10, 0, 0, Math.PI * 2); ctx.stroke();
			ctx.restore();
		});
		var g = ctx.createLinearGradient(0, -24, 0, 24);
		g.addColorStop(0, '#41639e'); g.addColorStop(1, '#141c33');
		ctx.fillStyle = g;
		ctx.beginPath(); ctx.ellipse(0, 0, 44, 22, 0, 0, Math.PI * 2); ctx.fill();
		if (lights) {
			ctx.shadowBlur = 18;
			ctx.shadowColor = COP.red; ctx.fillStyle = COP.red;
			ctx.beginPath(); ctx.arc(-16, -16, 7, 0, Math.PI * 2); ctx.fill();
			ctx.shadowColor = COP.blue; ctx.fillStyle = COP.blue;
			ctx.beginPath(); ctx.arc(16, -16, 7, 0, Math.PI * 2); ctx.fill();
		}
		ctx.shadowColor = COP.neon; ctx.shadowBlur = 12; ctx.fillStyle = COP.neon;
		ctx.beginPath(); ctx.ellipse(0, 6, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
		ctx.restore();
	}

	function specialFrames() {
		return [
			voxelFrame('blue_special', 460, 420, DrawKit.voxelGroups(gunship(), VOXEL), { dir: 'right', x: 230, y: 160, scale: 1.25 }),
			{
				name: 'red_special', w: 300, h: 300, paint: function (ctx) {
					DrawKit.pixelate(ctx, 300, 300, PIXEL, function (c) {
						var skull = function (dx, color) {
							c.save();
							c.translate(150 + dx, 150);
							c.fillStyle = color;
							c.beginPath(); c.arc(0, -20, 90, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(55, 60); c.lineTo(-55, 60); c.closePath(); c.fill();
							c.fillRect(-45, 60, 90, 40);
							c.globalCompositeOperation = 'destination-out';
							c.beginPath(); c.ellipse(-36, -5, 24, 28, 0, 0, Math.PI * 2); c.fill();
							c.beginPath(); c.ellipse(36, -5, 24, 28, 0, 0, Math.PI * 2); c.fill();
							c.beginPath(); c.moveTo(0, 25); c.lineTo(-12, 50); c.lineTo(12, 50); c.closePath(); c.fill();
							for (var t = -36; t <= 36; t += 18) c.fillRect(t - 3, 66, 6, 34);
							c.restore();
						};
						c.globalAlpha = 0.6; skull(-8, '#33f0ff');
						skull(8, '#ffe23d');
						c.globalAlpha = 0.9; skull(0, GANG.neon);
						c.globalCompositeOperation = 'destination-out';
						for (var y = 0; y < 300; y += 9) c.fillRect(0, y, 300, 3);
						var rnd = DrawKit.random(99);
						for (var i = 0; i < 8; i++) c.fillRect(0, rnd() * 300, 300, 3 + rnd() * 8);
					});
				}
			}
		];
	}

	// Fly-overs, isometric like the board and blocky like the pieces, on the old routes: three police spinners,
	// a gang hover van, an advert blimp
	function flyoverFrames() {
		var squadron = new Model();
		squadron.add(spinner(), -80, -62, 0, 0.85).add(spinner(), -80, 62, 0, 0.85).add(spinner(), 0, 0, 0, 0.85);
		return [
			voxelFrame('flyover_spinners', 480, 320, DrawKit.voxelGroups(squadron, VOXEL), { dir: 'left', x: 230, y: 170, scale: BOARD.scale }),
			voxelFrame('flyover_van', 300, 260, DrawKit.voxelGroups(hoverVan(), VOXEL), { dir: 'down', x: 150, y: 140, scale: BOARD.scale * 1.1 }),
			voxelFrame('flyover_blimp', 640, 520, DrawKit.voxelGroups(blimp(), BLIMP_VOXEL), { dir: 'right', x: 320, y: 170, scale: 1.15 })
		];
	}

	// Side badges: the Enforcers' shield, the Gangs' spray-painted skull tag
	function badgeFrames() {
		return pixelBadges([
			{
				name: 'blue_badge', w: 320, h: 320, paint: function (ctx) {
					ctx.beginPath();
					ctx.moveTo(160, 20); ctx.lineTo(280, 60); ctx.lineTo(270, 180);
					ctx.quadraticCurveTo(250, 260, 160, 300); ctx.quadraticCurveTo(70, 260, 50, 180);
					ctx.lineTo(40, 60); ctx.closePath();
					var g = ctx.createLinearGradient(0, 20, 0, 300);
					g.addColorStop(0, '#2a4170'); g.addColorStop(1, '#0d1430');
					ctx.fillStyle = g; ctx.fill();
					ctx.shadowColor = COP.gold; ctx.shadowBlur = 16;
					ctx.strokeStyle = COP.gold; ctx.lineWidth = 16; ctx.stroke();
					ctx.shadowColor = COP.neon; ctx.shadowBlur = 24; ctx.fillStyle = COP.neon;
					ctx.beginPath();
					for (var i = 0; i < 10; i++) {
						var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 36 : 84;
						ctx.lineTo(160 + Math.cos(a) * r, 160 + Math.sin(a) * r);
					}
					ctx.closePath(); ctx.fill();
				}
			},
			{
				name: 'red_badge', w: 320, h: 320, paint: function (ctx) {
					var rnd = DrawKit.random(5);
					ctx.fillStyle = GANG.neon;
					ctx.shadowColor = GANG.neon; ctx.shadowBlur = 18;
					ctx.beginPath(); ctx.arc(160, 150, 128, 0, Math.PI * 2); ctx.fill();
					for (var i = 0; i < 9; i++) {
						var x = 60 + rnd() * 200, len = 30 + rnd() * 70;
						ctx.fillRect(x - 6, 200, 12, 60 + len);
						ctx.beginPath(); ctx.arc(x, 260 + len, 9, 0, Math.PI * 2); ctx.fill();
					}
					ctx.shadowBlur = 0;
					ctx.fillStyle = '#0a0a0f';
					ctx.beginPath(); ctx.arc(160, 130, 70, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(118, 205); ctx.lineTo(202, 205); ctx.closePath(); ctx.fill();
					ctx.fillStyle = GANG.neon;
					ctx.beginPath(); ctx.ellipse(132, 140, 18, 21, 0, 0, Math.PI * 2); ctx.fill();
					ctx.beginPath(); ctx.ellipse(188, 140, 18, 21, 0, 0, Math.PI * 2); ctx.fill();
					ctx.beginPath(); ctx.moveTo(160, 160); ctx.lineTo(150, 180); ctx.lineTo(170, 180); ctx.closePath(); ctx.fill();
					ctx.strokeStyle = GANG.yellow; ctx.lineWidth = 8;
					ctx.shadowColor = GANG.yellow; ctx.shadowBlur = 12;
					ctx.beginPath(); ctx.arc(160, 150, 128, 0, Math.PI * 2); ctx.stroke();
				}
			}
		]);
	}

	// the badges as pixel art: drawn shrunk, then blown up with square pixels (8 x 8, as they're shown about a third size)
	function pixelBadges(frames) {
		return frames.map(function (f) {
			return {
				name: f.name, w: f.w, h: f.h, paint: function (ctx) {
					DrawKit.pixelate(ctx, f.w, f.h, 8, function (small, blurScale) {
						var blur = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
						Object.defineProperty(small, 'shadowBlur', { set: function (v) { blur.set.call(small, v * blurScale); }, get: function () { return blur.get.call(small) / blurScale; } });
						f.paint(small);
					}, OUTLINE);
				}
			};
		});
	}

	//=========================== ALL THE FRAMES ========================

	function frames() {
		var list = DrawKit.uiFrames({
			factions: { blue: COP.neon, red: GANG.neon },
			move: '#5dff7a',
			target: '#ff3355',
			panel: { fill: 'rgba(8,10,22,0.92)', edge: COP.neon, window: 'rgba(62,86,84,0.95)' }   // the info window in the board's grey-green
		});
		// the selected piece: lit-up circuit instead of the usual ring
		list = list.filter(function (f) { return !/_shooter$/.test(f.name); }).concat([selectedFrame('blue'), selectedFrame('red')]);

		// board squares
		for (var n = 0; n < 16; n++) {
			var name = ('000' + n.toString(2)).slice(-4);
			list.push(tileFrame(name));
		}

		// pieces: whole and wrecked, 4 directions; the info window's pictures
		['blue', 'red'].forEach(function (faction) {
			UNITS.forEach(function (unit) {
				var model = new Model().add(MODELS[faction][unit](), 0, 0, 0, PIECE_SCALE[unit]);
				var cubes = DrawKit.voxelGroups(model, VOXEL);
				DIRS.forEach(function (dir) {
					var name = faction + '_' + unit + '_' + dir;
					list.push(pieceFrame(name, cubes, dir, 1));
					list.push(pieceFrame(name + '_wreck', cubes, dir, 0.32));
				});
				// the info window's picture, right of the hearts
				list.push(voxelFrame(faction + '_' + unit, 192, 192, cubes, { dir: 'right', x: 118, y: PORTRAIT[unit][1], scale: PORTRAIT[unit][0] }));
			});
		});

		// shots: along the board for most pieces, straight up, down or across for the riders
		var shot = { up: [1, -0.5], right: [1, 0.5], down: [-1, 0.5], left: [-1, -0.5] };
		var riderShot = { up: [0, -1], right: [0, 1], down: [-1, 0], left: [1, 0] };
		DIRS.forEach(function (dir) {
			list.push(shotFrame('shoot_' + dir, shot[dir][0], shot[dir][1]));
			list.push(shotFrame('shoot_' + dir + '_rider', riderShot[dir][0], riderShot[dir][1]));
		});

		return list.concat(specialFrames(), flyoverFrames(), badgeFrames());
	}

	// The names the game asks for that point at the frames above
	function aliases() {
		var map = {};
		['blue', 'red'].forEach(function (faction) {
			UNITS.forEach(function (unit) {
				DIRS.forEach(function (dir) {
					var name = faction + '_' + unit + '_' + dir;
					map[name + '_0'] = name + '_wreck';
					for (var h = 1; h <= FULL_HEALTH[unit]; h++)
						map[name + '_' + h] = name;
				});
			});
		});
		return map;
	}

	//=========================== SCREEN ================================

	// The city's towers for the board's back edges. About 6 in 10 are plain concrete with lit windows and
	// grime; the rest carry the neon: edge lights, framed billboards, signs and tubes. The neon is tagged
	// to flicker (opt.flick: one of FLICKER_LAYERS), and drawn in its own layers (see flickers).
	// Drawn facing right, so the faces we see are +f and +s; 'f' and 's' below say which face a thing is on.
	var NEON = ['#ff3fae', '#33f0ff', '#8a4dff', '#ff8a3d', '#3ff2d6'];
	var CONCRETE = ['#3b3d44', '#45464c', '#34373e', '#4b4a4c', '#3e3a38'];
	var DARK_WALLS = ['#1d2148', '#232552', '#1b1e3c', '#28284a', '#2a2438'];
	var FLICKER_LAYERS = 3;

	// a hex colour made lighter (k > 1) or darker (k < 1)
	function lighter(hex, k) {
		return '#' + DrawKit.rgb(hex).map(function (v) { return ('0' + Math.min(255, Math.round(v * k)).toString(16)).slice(-2); }).join('');
	}

	function tower(rnd, tall) {
		var m = new Model();
		var pick = function (list) { return list[Math.floor(rnd() * list.length)]; };
		var flick = function () { return Math.floor(rnd() * FLICKER_LAYERS); };
		var neony = rnd() < 0.4;
		var wall = neony ? pick(DARK_WALLS) : pick(CONCRETE);
		var roofTop = neony ? '#2f3666' : lighter(wall, 1.25);
		var w = 34 + rnd() * 22, d = 34 + rnd() * 22, h = tall ? 160 + rnd() * 240 : 70 + rnd() * 150;

		// a flat thing on a face: corners given as (along the face, up)
		var onFace = function (face, out, a0, a1, z0, z1) {
			return face == 'f' ? [[out, a0, z0], [out, a1, z0], [out, a1, z1], [out, a0, z1]] : [[a0, out, z0], [a1, out, z0], [a1, out, z1], [a0, out, z1]];
		};
		// glowing lines up the corners we see and round the top of a block
		var rim = function (w, d, z0, z1, color) {
			var k = flick();
			[[w, -d], [w, d], [-w, d]].forEach(function (c) { m.line([c[0], c[1], z0], [c[0], c[1], z1], color, 1.6, { glow: color, blur: 10, layer: 2, flick: k }); });
			[[[w, -d], [w, d]], [[-w, d], [w, d]], [[-w, -d], [w, -d]], [[-w, -d], [-w, d]]].forEach(function (e) {
				m.line([e[0][0], e[0][1], z1], [e[1][0], e[1][1], z1], color, 1.6, { glow: color, blur: 10, layer: 2, flick: k });
			});
		};
		// a framed billboard: a glowing frame, a dark screen, a sun or planet and a few bars of "text"
		var billboard = function (face, out, a0, a1, z0, z1) {
			var frame = pick(['#ff3fae', '#ff8a3d', '#33f0ff']), fill = pick(['#2a1240', '#3a1a10', '#0d2a3a']), k = flick();
			m.poly(onFace(face, out, a0, a1, z0, z1), frame, { glow: frame, blur: 16, layer: 3, flick: k });
			m.poly(onFace(face, out + 0.4, a0 + 3, a1 - 3, z0 + 3, z1 - 3), fill, { layer: 4 });
			var cx = a0 + (a1 - a0) * 0.3, cz = (z0 + z1) / 2, r = Math.min(a1 - a0, z1 - z0) * 0.25;
			var circle = [];
			for (var i = 0; i < 14; i++) {
				var t = i / 14 * Math.PI * 2;
				circle.push(face == 'f' ? [out + 0.8, cx + Math.cos(t) * r, cz + Math.sin(t) * r] : [cx + Math.cos(t) * r, out + 0.8, cz + Math.sin(t) * r]);
			}
			m.poly(circle, '#ffd23d', { glow: '#ffb347', blur: 10, layer: 5, flick: k });
			for (var b = 0; b < 3; b++) {
				var bz = z1 - 7 - b * ((z1 - z0 - 10) / 3);
				m.poly(onFace(face, out + 0.8, a0 + (a1 - a0) * 0.55, a1 - 4 - rnd() * 6, bz - 2.5, bz), frame, { layer: 5, flick: k });
			}
		};
		// a small neon sign on a face
		var sign = function (face, out, a, z) {
			var c = pick(NEON), k = flick(), len = 14 + rnd() * 10;
			m.poly(onFace(face, out, a, a + len, z, z + 9), '#0a0a10', { layer: 2 });
			m.poly(onFace(face, out + 0.4, a + 2, a + len - 2, z + 2, z + 7), c, { glow: c, blur: 10, layer: 3, flick: k });
		};
		// windows: one by one on concrete, lit warm or cool, some dark; floor lines between
		var windows = function (w, d, z0, z1) {
			var lights = ['#ffcf7a', '#ffe0a8', '#bfe8ff', '#ffcf7a'];
			for (var z = z0 + 8; z < z1 - 8; z += 11) {
				m.poly(onFace('f', w + 0.4, -d, d, z - 2.5, z - 2), '#000000', { alpha: 0.33, layer: 1 });
				for (var a = -d + 5; a < d - 6; a += 9) {
					var lit = rnd() < 0.38;
					m.poly(onFace('f', w + 0.5, a, a + 5, z, z + 6), lit ? pick(lights) : '#14161c', { alpha: lit ? 0.9 : 0.8, layer: 1 });
				}
				for (var b = -w + 5; b < w - 6; b += 9) {
					var lit2 = rnd() < 0.38;
					m.poly(onFace('s', d + 0.5, b, b + 5, z, z + 6), lit2 ? pick(lights) : '#14161c', { alpha: lit2 ? 0.85 : 0.8, layer: 1 });
				}
			}
		};
		// lit window bands round a block (the neon towers)
		var bands = function (w, d, z0, z1, lit) {
			for (var z = z0 + 10; z < z1 - 8; z += 9 + Math.floor(rnd() * 6)) {
				if (rnd() < 0.55) {
					m.poly(onFace('f', w + 0.5, -d + 5, d - 5, z, z + 3), lit, { alpha: 0.55 + rnd() * 0.4, layer: 1 });
					m.poly(onFace('s', d + 0.5, -w + 5, w - 5, z, z + 3), lit, { alpha: 0.45 + rnd() * 0.4, layer: 1 });
				}
			}
		};

		// the building: two or three tiers, each set back from the one below
		var tiers = 1 + Math.floor(rnd() * 3), z0 = 0, tw = w, td = d, lit = rnd() < 0.5 ? '#ffb347' : TEAL;
		for (var t = 0; t < tiers; t++) {
			var th = (t == tiers - 1) ? h - z0 : h * (0.35 + rnd() * 0.2);
			m.box(-tw, tw, -td, td, z0, z0 + th, wall, { top: roofTop });
			if (neony) {
				bands(tw, td, z0, z0 + th, lit);
				if (rnd() < 0.6) rim(tw, td, z0, z0 + th, pick(NEON));
			}
			else {
				windows(tw, td, z0, z0 + th);
			}
			z0 += th;
			tw *= 0.72; td *= 0.72;
		}
		var top = z0;

		// the neon: billboards, signs and a tube on the neon towers; maybe one small sign on a concrete one
		if (neony) {
			if (rnd() < 0.7) billboard('f', w + 1, -d * 0.8, d * 0.8, 24, 24 + Math.min(70, h * 0.3));
			if (rnd() < 0.35) billboard('s', d + 1, -w * 0.7, w * 0.7, 40, 40 + Math.min(50, h * 0.25));
			for (var sg = 0; sg < 2; sg++) sign(rnd() < 0.5 ? 'f' : 's', (rnd() < 0.5 ? w : d) + 1.2, -20 + rnd() * 10, 30 + rnd() * (h * 0.5));
			if (rnd() < 0.5) {
				var tube = pick(NEON);
				m.line([w + 2, d + 2, 20], [w + 2, d + 2, Math.min(h * 0.6, 160)], tube, 3, { glow: tube, blur: 14, layer: 6, flick: flick() });
			}
		}
		else if (rnd() < 0.3) {
			sign('f', w + 1.2, -d + 6 + rnd() * (d - 10), 26 + rnd() * 30);
		}

		// grime: dark streaks running down from the ledges and roof, rust patches
		for (var g = 0; g < 6 + rnd() * 6; g++) {
			var gs = -d + 4 + rnd() * (2 * d - 8), gtop = 30 + rnd() * (h - 40), glen = 20 + rnd() * 60;
			var dirt = rnd() < 0.7 ? '#0b0d16' : '#4a2a1c';
			m.poly(onFace('f', w + 0.7, gs, gs + 2 + rnd() * 4, Math.max(4, gtop - glen), gtop), dirt, { alpha: 0.5 + rnd() * 0.3, layer: 1 });
			var gs2 = -w + 4 + rnd() * (2 * w - 8);
			m.poly(onFace('s', d + 0.7, gs2, gs2 + 2 + rnd() * 4, Math.max(4, gtop - glen), gtop), dirt, { alpha: 0.5 + rnd() * 0.3, layer: 1 });
		}
		// a drainpipe and a cable down the wall
		var pipeS = -d + 6 + rnd() * 10;
		m.limb([w + 2, pipeS, 0], [w + 2, pipeS, h * 0.9], 1.4, '#3a3f52', { layer: 2 });
		for (var pj = 20; pj < h * 0.9; pj += 30) m.box(w, w + 3, pipeS - 2, pipeS + 2, pj, pj + 1.5, '#2a2e3e', { layer: 2 });
		m.limb([-w + 8, d + 2, 0], [-w + 6, d + 2, h * 0.7], 0.8, '#151820', { layer: 2 });
		// a fire escape: landings and ladders up the side we see
		if (rnd() < 0.55) {
			var fa = -w * 0.2 + rnd() * w * 0.3, fb = fa + 22;
			for (var fz = 30; fz < Math.min(h - 10, 170); fz += 24) {
				m.box(fa, fb, d, d + 7, fz, fz + 1.2, '#2c3040', { layer: 3 });
				m.line([fa, d + 7, fz], [fb, d + 7, fz], '#4a5068', 0.8, { layer: 4 });
				m.line([fa, d + 7, fz + 6], [fb, d + 7, fz + 6], '#4a5068', 0.8, { layer: 4 });
				m.line([fa + 3, d + 5, fz], [fb - 3, d + 5, fz + 24], '#4a5068', 0.9, { layer: 4 });
			}
		}
		// graffiti tags at street level
		for (var tg = 0; tg < 2; tg++) {
			var tc = pick(['#ff3fae', '#39ff6a', '#ffe23d', '#33f0ff']), ta = -d + 6 + rnd() * (2 * d - 30);
			for (var st = 0; st < 4; st++) {
				var sa = ta + st * 5;
				m.line([w + 0.9, sa, 20 + rnd() * 4], [w + 0.9, sa + 3 + rnd() * 3, 26 + rnd() * 6], tc, 1.2, { layer: 3, alpha: 0.85 });
			}
		}
		// on the roof: a hut, an aerial with a red light, a water tank, a vent letting off steam
		m.box(-tw * 0.6, tw * 0.2, -td * 0.6, td * 0.1, top, top + 12, lighter(wall, 0.85), { top: roofTop });
		m.limb([tw * 0.5, td * 0.5, top], [tw * 0.5, td * 0.5, top + 40], 0.8, '#55607a');
		m.ball(tw * 0.5, td * 0.5, top + 42, 2.5, COP.red, { glow: COP.red, blur: 12 });
		if (rnd() < 0.5) {
			var tx = -w * 0.3, ty = d * 0.3;
			[[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(function (l) { m.limb([tx + l[0], ty + l[1], top], [tx + l[0], ty + l[1], top + 10], 0.7, '#3a3f52'); });
			m.cylinder(tx, ty, top + 10, top + 26, 7, '#5a4030', { top: '#6a4a36' });
		}
		if (rnd() < 0.6) {
			var vx = tw * 0.3, vy = -td * 0.4;
			m.box(vx - 4, vx + 4, vy - 4, vy + 4, top, top + 8, '#4a4f62', { top: '#2a2e3e' });
			m.ellipsoid(vx - 2, vy, top + 18, 7, 7, 6, '#c8d0dc', { alpha: 0.35 });
			m.ellipsoid(vx - 6, vy - 2, top + 30, 9, 9, 7, '#c8d0dc', { alpha: 0.25 });
		}
		// street level: a lit shopfront, an awning on some
		var shop = pick(['#ffcf7a', '#ffb347', TEAL, '#ff3fae']);
		m.poly(onFace('f', w + 0.6, -d + 8, d - 18, 3, 18), shop, { glow: shop, blur: 8, alpha: 0.75, layer: 1 });
		m.poly(onFace('s', d + 0.6, -w + 8, w - 8, 3, 18), shop, { glow: shop, blur: 8, alpha: 0.6, layer: 1 });
		if (rnd() < 0.5)
			m.box(w, w + 10, -d + 6, d - 16, 20, 23, pick(['#c23b5a', '#2a8a6a', '#5a5a64']), { top: '#d8d8e0', layer: 1 });
		return m;
	}

	var CITY = [];              // the towers, built by background() and drawn again by flickers()

	// A rainy city at night in navy and teal: searchlights, a far skyline, towers along the board's back edges
	function background() {
		return DrawCanvas(1200, 800, function (ctx) {
			DrawKit.pixelate(ctx, 1200, 800, PIXEL, function (c, blurScale) {
				var rnd = DrawKit.random(2019);
				var sky = c.createLinearGradient(0, 0, 0, 800);
				sky.addColorStop(0, '#0a0f1c');
				sky.addColorStop(0.45, '#141d2f');
				sky.addColorStop(0.7, '#1b2a3c');
				sky.addColorStop(1, '#090d16');
				c.fillStyle = sky;
				c.fillRect(0, 0, 1200, 800);

				// searchlights in the haze
				[[150, 0.5], [700, -0.35], [1050, 0.25]].forEach(function (s) {
					var g = c.createLinearGradient(s[0], 800, s[0] + s[1] * 600, 0);
					g.addColorStop(0, 'rgba(160,255,240,0.12)');
					g.addColorStop(1, 'rgba(160,255,240,0)');
					c.fillStyle = g;
					c.beginPath(); c.moveTo(s[0] - 6, 800); c.lineTo(s[0] + s[1] * 800 - 50, 0); c.lineTo(s[0] + s[1] * 800 + 50, 0); c.lineTo(s[0] + 6, 800); c.closePath(); c.fill();
				});

				// far skyline, teal windows, now and then a tower with a magenta crown
				var x = -20;
				while (x < 1220) {
					var w = 30 + rnd() * 60, h = 60 + rnd() * 160;
					c.fillStyle = '#121a28';
					c.fillRect(x, 560 - h, w, h + 300);
					for (var i = 0; i < 14; i++) {
						c.fillStyle = 'rgba(63,242,214,' + (0.15 + rnd() * 0.4) + ')';
						c.fillRect(x + rnd() * (w - 4), 560 - h + rnd() * h, 3, 3);
					}
					if (rnd() < 0.15) {
						c.fillStyle = 'rgba(255,56,212,0.7)';
						c.fillRect(x + 4, 560 - h - 4, w - 8, 3);
					}
					x += w + 6;
				}

				// haze over the city
				var haze = c.createLinearGradient(0, 380, 0, 620);
				haze.addColorStop(0, 'rgba(63,242,214,0)');
				haze.addColorStop(0.6, 'rgba(63,242,214,0.07)');
				haze.addColorStop(1, 'rgba(9,13,22,1)');
				c.fillStyle = haze;
				c.fillRect(0, 380, 1200, 240);
				c.fillStyle = '#090d16';
				c.fillRect(0, 620, 1200, 180);

				// the ground round the board: gritty concrete slabs, two roads and a car park, laid out on the board's grid.
				// u, v count board squares; (i, j) is the middle of square i, j
				var G = function (u, v) { return squareCentre(u, v); };
				var quad = function (u0, v0, u1, v1) {
					var a = G(u0, v0), b = G(u1, v0), e = G(u1, v1), d = G(u0, v1);
					c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.lineTo(d[0], d[1]); c.closePath();
				};
				var line = function (u0, v0, u1, v1) {
					var a = G(u0, v0), b = G(u1, v1);
					c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
				};
				var kind = function (u, v) {
					if (v >= 6 && v < 7.2) return 'road';                     // along the front left edge
					if (u >= 7 && u < 8.2) return 'road';                     // along the front right edge
					if (v >= 7.4 && v < 9.6 && u >= -3 && u < 7) return 'park';    // in front, past the road
					if ((v >= 5.5 && v < 6) || (u >= 6.5 && u < 7)) return 'kerb';
					return 'slab';
				};
				for (var u = -7; u < 15; u += 0.5) {
					for (var v = -7; v < 13; v += 0.5) {
						var k = kind(u + 0.25, v + 0.25), shade = rnd() * 10;
						quad(u, v, u + 0.5, v + 0.5);
						c.fillStyle = k == 'slab' ? 'rgb(' + (30 + shade) + ',' + (35 + shade) + ',' + (45 + shade) + ')' :
							k == 'kerb' ? '#3a4250' : k == 'park' ? '#1e232c' : '#181c24';
						c.fill();
						if (k == 'slab' || k == 'kerb') {
							c.strokeStyle = 'rgba(10,12,18,0.7)';
							c.lineWidth = 1;
							c.stroke();
						}
					}
				}
				// road markings: amber dashes down the middle, white edge lines
				c.lineWidth = 2;
				c.setLineDash([10, 12]);
				c.strokeStyle = 'rgba(255,179,71,0.6)';
				line(-7, 6.6, 15, 6.6);
				line(7.6, -7, 7.6, 6);
				c.setLineDash([]);
				c.strokeStyle = 'rgba(220,230,240,0.35)';
				line(-7, 6.05, 7, 6.05); line(-7, 7.15, 15, 7.15);
				line(7.05, -7, 7.05, 6); line(8.15, -7, 8.15, 6);
				// zebra crossings
				c.fillStyle = 'rgba(225,230,240,0.45)';
				[1.6, 4.4].forEach(function (cu) {
					for (var zv = 6.1; zv < 7.1; zv += 0.13) { quad(cu, zv, cu + 0.3, zv + 0.07); c.fill(); }
				});
				[1.5, 4.2].forEach(function (cv) {
					for (var zu = 7.1; zu < 8.1; zu += 0.13) { quad(zu, cv, zu + 0.07, cv + 0.3); c.fill(); }
				});
				// car park bays and a few parked cars
				c.strokeStyle = 'rgba(220,230,240,0.4)';
				for (var bu = -3; bu <= 7; bu += 0.35) {
					line(bu, 7.5, bu, 8.4);
					line(bu, 8.6, bu, 9.5);
				}
				var car = function (color) {
					var m = new Model();
					m.box(-26, 26, -12, 12, 4, 16, color, { top: DrawKit.shade(color, 1.2) });
					m.box(-12, 12, -10, 10, 16, 25, '#10141c', { top: color });
					m.ball(26, -8, 10, 2, '#ffd9a0', { glow: '#ffd9a0', blur: 8 });
					m.ball(26, 8, 10, 2, '#ffd9a0', { glow: '#ffd9a0', blur: 8 });
					return m;
				};
				[[1.1, 7.95, '#5a2a3c'], [2.85, 7.95, '#2a3c5a'], [4.95, 7.95, '#3c3c46'], [0.4, 9.05, '#2c4a44'], [3.55, 9.05, '#4a3a22'], [5.65, 9.05, '#22303e']].forEach(function (p) {
					var at = G(p[0], p[1]);
					DrawKit.render(c, car(p[2]), { dir: p[1] < 8.5 ? 'up' : 'down', x: at[0], y: at[1], scale: BOARD.scale * 0.9, blurScale: blurScale });
				});
				// grime: oil stains, cracks, manhole covers, the glow of lamps on the wet ground
				for (var o = 0; o < 140; o++) {
					var spot = G(-7 + rnd() * 22, -7 + rnd() * 20);
					c.fillStyle = 'rgba(5,6,10,' + (0.12 + rnd() * 0.25) + ')';
					c.beginPath(); c.ellipse(spot[0], spot[1], 6 + rnd() * 26, 3 + rnd() * 10, 0, 0, Math.PI * 2); c.fill();
				}
				// cracks: long ones that branch, in pixels a shade lighter along one edge, like broken concrete
				var crack = function (p0, segs, width, branchChance) {
					var pts = [p0];
					for (var seg = 0; seg < segs; seg++) {
						p0 = [p0[0] + (rnd() - 0.5) * 40, p0[1] + (rnd() - 0.35) * 18];
						pts.push(p0);
						if (rnd() < branchChance) crack(p0, 2 + Math.floor(rnd() * 3), width * 0.6, 0);
					}
					c.beginPath();
					pts.forEach(function (q, i) { if (i == 0) c.moveTo(q[0] + 1, q[1] + 1); else c.lineTo(q[0] + 1, q[1] + 1); });
					c.strokeStyle = 'rgba(130,140,160,0.3)';
					c.lineWidth = width;
					c.stroke();
					c.beginPath();
					pts.forEach(function (q, i) { if (i == 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); });
					c.strokeStyle = 'rgba(4,5,8,0.9)';
					c.stroke();
				};
				c.lineJoin = 'miter';
				for (var cr = 0; cr < 700; cr++)
					crack(G(-7 + rnd() * 22, -7 + rnd() * 20), 5 + Math.floor(rnd() * 8), 2.5 + rnd() * 2.5, 0.4);
				// broken corners off the slabs
				for (var bc = 0; bc < 70; bc++) {
					var bu = Math.floor(-7 + rnd() * 22) + (rnd() < 0.5 ? 0 : 0.5), bv = Math.floor(-7 + rnd() * 20) + (rnd() < 0.5 ? 0 : 0.5);
					var size = 0.1 + rnd() * 0.12, a = G(bu, bv), b = G(bu + size, bv), e = G(bu, bv + size);
					c.fillStyle = 'rgba(6,7,11,0.85)';
					c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fill();
				}
				// potholes with broken rims, and patched-over tarmac on the roads
				for (var ph = 0; ph < 28; ph++) {
					var road = rnd() < 0.5 ? G(-6 + rnd() * 13, 6.1 + rnd() * 1) : G(7.1 + rnd() * 1, -6 + rnd() * 12);
					var rx = 8 + rnd() * 14;
					c.fillStyle = 'rgba(90,100,115,0.35)';
					c.beginPath(); c.ellipse(road[0] + 1, road[1] + 1, rx + 2, rx / 2 + 1, 0, 0, Math.PI * 2); c.fill();
					c.fillStyle = '#07080c';
					c.beginPath(); c.ellipse(road[0], road[1], rx, rx / 2, 0, 0, Math.PI * 2); c.fill();
					c.fillStyle = ['rgba(63,242,214,0.25)', 'rgba(255,63,174,0.22)', 'rgba(255,179,71,0.22)'][ph % 3];
					c.beginPath(); c.ellipse(road[0] - rx * 0.2, road[1] - 1, rx * 0.4, rx * 0.15, 0, 0, Math.PI * 2); c.fill();
				}
				for (var pt = 0; pt < 16; pt++) {
					var pu = rnd() < 0.5 ? -6 + rnd() * 13 : 7.15 + rnd() * 0.6, pv = pu > 7 ? -6 + rnd() * 12 : 6.15 + rnd() * 0.6;
					quad(pu, pv, pu + 0.3 + rnd() * 0.5, pv + 0.2 + rnd() * 0.3);
					c.fillStyle = 'rgba(14,16,22,0.8)';
					c.fill();
					c.strokeStyle = 'rgba(70,78,92,0.5)';
					c.lineWidth = 1;
					c.stroke();
				}
				// rubble and grit
				for (var rb = 0; rb < 400; rb++) {
					var gp = G(-7 + rnd() * 22, -7 + rnd() * 20);
					c.fillStyle = rnd() < 0.5 ? 'rgba(10,11,16,0.7)' : 'rgba(110,115,128,0.35)';
					c.fillRect(Math.round(gp[0]), Math.round(gp[1]), 2, 2);
				}
				[[3, 6.6], [7.6, 2], [-2, 6.6], [7.6, -3]].forEach(function (m) {
					var at = G(m[0], m[1]);
					c.fillStyle = '#101319'; c.strokeStyle = '#4a5260';
					c.beginPath(); c.ellipse(at[0], at[1], 14, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
				});
				// streetlights along the board's back edges: pools of light first, the lamps after the towers
				var lamps = [];
				for (var li = 0; li <= 6; li += 2) lamps.push(G(li, -0.62));
				for (var lj = 1; lj <= 5; lj += 2) lamps.push(G(-0.62, lj));
				lamps.forEach(function (at) {
					var pool = c.createRadialGradient(at[0], at[1], 4, at[0], at[1], 90);
					pool.addColorStop(0, 'rgba(190,255,240,0.22)');
					pool.addColorStop(1, 'rgba(190,255,240,0)');
					c.fillStyle = pool;
					c.beginPath(); c.ellipse(at[0], at[1], 90, 45, 0, 0, Math.PI * 2); c.fill();
				});

				// towers behind the board's two back edges, drawn back to front
				var spots = [];
				for (var i2 = -2; i2 <= 8; i2++) { spots.push([i2, -2]); spots.push([i2, -1]); }
				for (var j = 0; j <= 7; j++) { spots.push([-2, j]); spots.push([-1, j]); }
				spots.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]; });
				CITY = spots.map(function (s) { return { model: tower(rnd, s[0] == -2 || s[1] == -2), at: squareCentre(s[0], s[1]) }; });
				CITY.forEach(function (b) {
					DrawKit.render(c, b.model, { dir: 'right', x: b.at[0], y: b.at[1], scale: BOARD.scale, blurScale: blurScale, flicker: { layer: -1 } });
				});

				lamps.forEach(function (at) {
					var lamp = new Model();
					lamp.limb([0, 0, 0], [0, 0, 120], 2.2, '#3a4250');
					lamp.limb([0, 0, 120], [22, 0, 126], 1.8, '#3a4250');
					lamp.box(18, 30, -4, 4, 121, 125, '#1a1f28');
					lamp.box(19, 29, -3, 3, 119.5, 121, '#e8fff8', { glow: '#bffff0', blur: 18 });
					DrawKit.render(c, lamp, { dir: 'right', x: at[0], y: at[1], scale: BOARD.scale, blurScale: blurScale });
				});

				// the whole city dulled by about a third, so it sits back behind the board and pieces
				c.fillStyle = 'rgba(6,8,16,0.32)';
				c.fillRect(0, 0, 1200, 800);

				// wet ground: neon streaks reflected in puddles
				for (var r = 0; r < 50; r++) {
					c.fillStyle = ['rgba(63,242,214,0.12)', 'rgba(255,56,212,0.10)', 'rgba(138,77,255,0.10)'][r % 3];
					c.fillRect(rnd() * 1200, 600 + rnd() * 200, 2 + rnd() * 4, 20 + rnd() * 80);
				}
			});
		});
	}

	// The towers' neon, one canvas per flicker layer, laid over the background so each layer can flicker on its own
	function flickers() {
		var layers = [];
		for (var k = 0; k < FLICKER_LAYERS; k++) {
			(function (k) {
				layers.push(DrawCanvas(1200, 800, function (ctx) {
					DrawKit.pixelate(ctx, 1200, 800, PIXEL, function (c, blurScale) {
						CITY.forEach(function (b) {
							DrawKit.render(c, b.model, { dir: 'right', x: b.at[0], y: b.at[1], scale: BOARD.scale, blurScale: blurScale, flicker: { layer: k } });
						});
					});
				}));
			})(k);
		}
		return layers;
	}

	// Rain: 4 streaks
	function weather() {
		return {
			canvas: DrawCanvas(32, 32, function (ctx) {
				for (var i = 0; i < 4; i++) {
					ctx.strokeStyle = 'rgba(170,210,255,' + (0.35 + i * 0.12) + ')';
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(i * 8 + 5, 2);
					ctx.lineTo(i * 8 + 3, 30);
					ctx.stroke();
				}
			}),
			width: 8, height: 32, frames: 4
		};
	}

	// Fire on a wreck, 6 frames, in glowing cubes like the pieces: teardrop flames (a round bottom, fat low down,
	// tapering to a point), red at the base through orange to yellow at the tip, swaying and growing and shrinking
	// in turn, with embers rising off them. 128 x 128 frames, shown full size
	var FIRE_FLAMES = [{ at: [0, 0], R: 2.3, H: 15, phase: 0 }, { at: [-2, 4], R: 1.7, H: 10, phase: 2 }, { at: [4, -2], R: 1.5, H: 8, phase: 4 }];
	var FIRE_COLOURS = [[0.3, '#d8261a'], [0.55, '#ff6a1a'], [0.8, '#ffaa1a'], [1, '#ffe45a']];

	function fireCells(f) {
		var cells = {}, spin = f / 6 * 2 * Math.PI;
		FIRE_FLAMES.forEach(function (flame) {
			var H = flame.H + Math.round(Math.sin(spin + flame.phase));
			for (var l = 0; l < H; l++) {
				var t = (l + 0.5) / H;
				var r = flame.R * Math.sin(Math.PI * Math.pow(t, 0.7));                 // the teardrop's width at this height
				var cx = flame.at[0] + Math.round(Math.sin(spin + flame.phase + t * 2) * t * 1.5);
				var cy = flame.at[1] + Math.round(Math.cos(spin + flame.phase) * t * 0.8);
				var color = FIRE_COLOURS.filter(function (c) { return t <= c[0]; })[0][1];
				for (var i = -4; i <= 4; i++)
					for (var j = -4; j <= 4; j++)
						if (i * i + j * j <= r * r + 0.3) cells[(cx + i) + ',' + (cy + j) + ',' + l] = { color: color, lit: true, alpha: 1 };
			}
			// an ember drifting up off the top
			var z = H + (f + flame.phase) % 6 * 1.6;
			cells[(flame.at[0] + Math.round(Math.sin(spin * 2 + flame.phase))) + ',' + flame.at[1] + ',' + Math.round(z)] = { color: '#ffd23d', lit: true, alpha: 1 };
		});
		return cells;
	}

	function fire() {
		var size = 128;
		var canvas = DrawCanvas(size * 6, size, function (ctx) {
			for (var f = 0; f < 6; f++) {
				ctx.save();
				ctx.translate(f * size, 0);
				DrawKit.renderVoxels(ctx, [{ cells: fireCells(f), size: 5, at: [0, 0, 0], k: 1 }], { dir: 'right', x: 64, y: 112 });
				ctx.restore();
			}
		});
		return { canvas: canvas, width: size, height: size, frames: 6 };
	}

	//=========================== APP ICON ==============================

	// The app icon, 512 x 512 (made into PNGs by tools/make-icons.js): the two heroes face off on a lit-up
	// circuit square, under a night sky with a neon glow on the horizon
	function icon() {
		return DrawCanvas(512, 512, function (ctx) {
			var sky = ctx.createLinearGradient(0, 0, 0, 512);
			sky.addColorStop(0, '#0b0f1e');
			sky.addColorStop(0.55, '#1d2148');
			sky.addColorStop(1, '#3a1840');
			ctx.fillStyle = sky;
			ctx.fillRect(0, 0, 512, 512);
			var glow = ctx.createRadialGradient(256, 330, 20, 256, 330, 300);
			glow.addColorStop(0, 'rgba(255,56,212,0.45)');
			glow.addColorStop(1, 'rgba(255,56,212,0)');
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, 512, 512);

			// the square, twice size, its circuit lit up neon blue under the heroes
			ctx.save();
			ctx.translate(0, 236);
			ctx.scale(2, 2);
			tileFrame('1111').paint(ctx);
			selectedFrame('blue').paint(ctx);
			ctx.restore();

			// each side's hero (the leader of its squad, added last), facing the other
			var hero = function (faction) { var kids = MODELS[faction].hero_army().children; return kids[kids.length - 1].model; };
			DrawKit.outlined(ctx, 512, 512, OUTLINE, function (c) {
				DrawKit.renderVoxels(c, DrawKit.voxelGroups(new Model().add(hero('blue'), 0, 0, 0, 1), VOXEL), { dir: 'right', x: 150, y: 384, scale: 5 });
				DrawKit.renderVoxels(c, DrawKit.voxelGroups(new Model().add(hero('red'), 0, 0, 0, 1), VOXEL), { dir: 'down', x: 362, y: 384, scale: 5 });
			}, 8);
		});
	}

	return { frames: frames, aliases: aliases, background: background, flickers: flickers, weather: weather, fire: fire, icon: icon };
})();
