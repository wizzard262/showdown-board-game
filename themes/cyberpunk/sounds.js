/*
 * Cyberpunk theme - every sound made in code when the game starts (see js/soundkit.js), gritty and urban:
 * gunfire, rain on concrete and metal, traffic, trains, sirens down the street, radios, neon buzz.
 * Each recipe takes the sample rate and returns the samples. Picking up, sliding and turning over pieces
 * are the real board-game recordings in assets/audio (see theme.js).
 */

var CYBERPUNK_SOUNDS = (function () {
	var K = SoundKit;

	//=========================== BUILDING BLOCKS =======================

	// A gunshot: the crack, the body of the blast, a low thump, and its echo off the buildings.
	// o: { crack (0-1), body (0-1), thump (Hz), length (s), echo (s), seed }
	function gunshot(sr, o) {
		var len = o.length || 0.25;
		var crack = K.envelope(sr, K.highpass(sr, K.noise(sr, 0.03, o.seed), 2500), 0.0003, 4);
		var body = K.envelope(sr, K.lowpass(sr, K.noise(sr, len, o.seed + 1), function (t) { return 4000 * Math.pow(1 - t, 3) + 200; }), 0.001, 2.5);
		var thump = K.envelope(sr, K.tone(sr, len * 0.6, o.thump || 110, (o.thump || 110) * 0.4, 'sine', 0.5), 0.001, 2);
		var shot = K.drive(K.mix(sr, len, [{ x: crack, gain: o.crack || 0.8 }, { x: body, gain: o.body || 1 }, { x: thump, gain: 0.9 }]), 3);
		return K.normalize(K.reverb(sr, shot, o.echo || 0.6, 0.3), 0.9);
	}

	// several shots in a row
	function burst(sr, count, gap, make) {
		var layers = [];
		for (var i = 0; i < count; i++) layers.push({ x: make(i), at: i * gap, gain: 1 - i * 0.08 });
		return K.normalize(K.mix(sr, count * gap + 0.8, layers), 0.9);
	}

	// an explosion: a deep boom, the blast tearing through the air, debris clattering down, glass, the echo
	function blast(sr, seed) {
		var rnd = DrawKit.random(seed);
		var boom = K.envelope(sr, K.tone(sr, 1.2, 70, 28, 'sine', 0.4), 0.004, 2);
		var roar = K.envelope(sr, K.lowpass(sr, K.noise(sr, 1.5, seed), function (t) { return 2500 * Math.pow(1 - t, 2) + 120; }), 0.004, 1.4);
		var bits = [];
		for (var i = 0; i < 26; i++) {
			var f = 1500 + rnd() * 5000;
			bits.push({ x: K.envelope(sr, K.mix(sr, 0.05, [{ x: K.highpass(sr, K.noise(sr, 0.05, seed + 10 + i), 2000), gain: 0.6 }, { x: K.tone(sr, 0.05, f, f * 0.97, 'sine'), gain: 0.4 }]), 0.001, 3), at: 0.25 + rnd() * 1.1, gain: 0.08 + rnd() * 0.15 });
		}
		var out = K.drive(K.mix(sr, 1.6, [{ x: boom }, { x: roar, gain: 1.1 }].concat(bits)), 2.5);
		return K.normalize(K.reverb(sr, out, 1.2, 0.35), 0.95);
	}

	// voice-like mumbling: breathy syllables through a narrow band (radios, PA, a crowd)
	function mumble(sr, seconds, seed, pitch, band) {
		var rnd = DrawKit.random(seed), layers = [], t = 0;
		while (t < seconds - 0.2) {
			var d = 0.07 + rnd() * 0.14, f = pitch * (0.85 + rnd() * 0.35);
			// breathy noise through a vowel-like band that moves each syllable (no buzzing tone: that sounds like a horn)
			var v = K.bandpass(sr, K.noise(sr, d, seed + layers.length), f * (3 + rnd() * 5));
			layers.push({ x: K.envelope(sr, v, d * 0.3, 1.2), at: t });
			t += d + rnd() * 0.07 + (rnd() < 0.12 ? 0.3 : 0);
		}
		var out = K.mix(sr, seconds, layers);
		K.bandpass(sr, out, band || 1200);
		return K.drive(out, 3);
	}

	// A cheerful advert announcer chattering in Japanese-sounding words through a loudspeaker. A voice is made the
	// way a throat does it: a buzz of pulses at the speaking pitch, shaped by three resonances (formants) that
	// set the vowel. Japanese has five clear vowels and keeps a steady beat, one beat per kana (mora), and its
	// pitch steps up after the first beat and falls after the accented one; that's what makes it sound Japanese.
	// phrases: [{ morae: ['i', 'ra', 'Q', 'sha', ...], accent (the beat after which the pitch falls, -1 for none), rise }]
	//   'Q' is a held beat of silence (a double consonant), 'N' the beat-long n. pitch: the voice's speaking pitch (Hz)
	var FORMANTS = { a: [850, 1350, 2800], i: [320, 2700, 3300], u: [360, 1500, 2600], e: [500, 2150, 2900], o: [500, 900, 2800], n: [280, 1700, 2600] };
	var VOICED = { n: 1, m: 1, r: 1, y: 1, w: 1, g: 1, d: 1, b: 1, z: 1, j: 1 };
	function announcer(sr, phrases, pitch, seed) {
		var rnd = DrawKit.random(seed), BEAT = 0.13, GAP = 0.32;
		// the beats, with their sounds and pitch
		var beats = [], t = 0.05;
		phrases.forEach(function (phrase) {
			var n = phrase.morae.length;
			phrase.morae.forEach(function (mora, i) {
				var vowel = mora == 'Q' ? null : (mora == 'N' ? 'n' : mora.charAt(mora.length - 1));
				var cons = mora == 'Q' || mora == 'N' ? '' : mora.slice(0, -1), glide = '';
				if (cons.length > 1 && cons.charAt(cons.length - 1) == 'y') { glide = 'i'; cons = cons.slice(0, -1); }
				var high = i > 0 && (phrase.accent < 0 || i <= phrase.accent);
				var f0 = pitch * (high ? 1.28 : 1) * (1 - 0.12 * i / n);
				if (i == n - 1 && phrase.rise) f0 = pitch * 1.45;
				var len = BEAT * (i == n - 1 ? 1.6 : 1) * (0.94 + rnd() * 0.12);
				beats.push({ t0: t, t1: t + len, vowel: vowel, cons: cons, glide: glide, f0: f0, end: i == n - 1 });
				t += len;
			});
			t += GAP;
		});
		var out = K.samples(sr, t), noise = K.noise(sr, t, seed + 1);
		var res = [0, 1, 2].map(function () { return { x1: 0, x2: 0, y1: 0, y2: 0, b0: 0, a1: 0, a2: 0 }; });
		var phase = 0, glottal = 0, f0 = pitch, form = FORMANTS.a.slice(), b = 0, prevNoise = 0;
		for (var s = 0; s < out.length; s++) {
			var time = s / sr;
			while (b < beats.length - 1 && time >= beats[b].t1) b++;
			var beat = beats[b], tau = time - beat.t0, len = beat.t1 - beat.t0;
			var inBeat = time >= beat.t0 && time < beat.t1;
			var consLen = !beat.cons ? 0 : (/^(s|sh|ts|h|ch)$/.test(beat.cons) ? 0.065 : 0.035);
			// the vowel's resonances, gliding in from where they were
			var target = FORMANTS[beat.vowel || 'a'];
			if (beat.glide && tau < consLen + 0.04) target = FORMANTS.i;
			var nasal = beat.cons == 'n' || beat.cons == 'm';
			if (nasal && tau < consLen) target = FORMANTS.n;
			for (var k = 0; k < 3; k++) form[k] += (target[k] - form[k]) * 0.004;
			// the pitch, gliding too, with a little wobble
			f0 += (beat.f0 - f0) * 0.002;
			// how loud the buzz and the hiss are right now
			var voice = 0, hiss = 0;
			if (inBeat && beat.vowel) {
				if (tau < consLen) {
					if (VOICED[beat.cons]) voice = nasal ? 0.45 : 0.6;
					if (/^(s|sh|ts|ch)$/.test(beat.cons)) hiss = 0.5;
					if (beat.cons == 'h') hiss = 0.3;
					if (/^(k|t|p|g|d|b)$/.test(beat.cons) && tau > consLen - 0.012) hiss = 0.8;   // the burst as the stop opens
				}
				else voice = Math.min(1, (tau - consLen) / 0.012) * Math.min(1, (len - tau) / (beat.end ? 0.08 : 0.025));
			}
			// the buzz: a smooth pulse each cycle, its slope (rich in harmonics) feeding the resonances
			phase += f0 * (1 + 0.012 * Math.sin(time * 2 * Math.PI * 5.5)) / sr;
			var p = phase - Math.floor(phase);
			var pulse = p < 0.6 ? 0.5 * (1 - Math.cos(Math.PI * p / 0.6)) : Math.cos(Math.PI * (p - 0.6) / 0.8);
			var excite = (pulse - glottal) * 30 * voice;
			glottal = pulse;
			var nz = noise[s];
			excite += nz * hiss * 0.25;
			// three resonances, their settings refreshed every 32 samples
			var y = 0;
			for (k = 0; k < 3; k++) {
				var r = res[k];
				if (s % 32 == 0) {
					var w = 2 * Math.PI * form[k] / sr, alpha = Math.sin(w) * (60 + 40 * k) / form[k], a0 = 1 + alpha;
					r.b0 = alpha / a0; r.a1 = -2 * Math.cos(w) / a0; r.a2 = (1 - alpha) / a0;
				}
				var v = r.b0 * (excite - r.x2) - r.a1 * r.y1 - r.a2 * r.y2;
				r.x2 = r.x1; r.x1 = excite; r.y2 = r.y1; r.y1 = v;
				y += v * [1, 0.7, 0.35][k];
			}
			// s and sh hiss up high, past the resonances
			if (hiss && /^(s|ts)$/.test(beat.cons)) y += (nz - prevNoise) * hiss * 0.35;
			if (hiss && /^(sh|ch)$/.test(beat.cons)) y += nz * hiss * 0.12;
			prevNoise = nz;
			out[s] = y;
		}
		// through a loudspeaker: thin, a bit crunchy
		K.highpass(sr, out, 380);
		K.lowpass(sr, out, 3600);
		return K.drive(K.normalize(out, 0.9), 2);
	}

	// the station chime before and after an announcement: four soft vibraphone notes, up, or down
	function chime(sr, up) {
		var notes = up ? [8, 12, 15, 20] : [20, 15, 12, 8], layers = [];
		notes.forEach(function (n, i) {
			var f = K.note(n), len = 1.4;
			var bell = K.mix(sr, len, [{ x: K.tone(sr, len, f, f, 'sine') }, { x: K.tone(sr, len, f * 4, f * 4, 'sine'), gain: 0.25 }, { x: K.tone(sr, len, f * 2.76, f * 2.76, 'sine'), gain: 0.08 }]);
			K.gain(bell, function (t) { return 1 + 0.15 * Math.sin(t * len * 2 * Math.PI * 5); });
			layers.push({ x: K.envelope(sr, bell, 0.004, 3), at: i * 0.32, gain: 0.5 });
		});
		return K.mix(sr, notes.length * 0.32 + 1.4, layers);
	}

	// scrambled modem data: random phase and level symbols on two carriers, fluttering, mixed with hissing
	// noise round the carriers, kept to a phone line's range
	function scrambledData(sr, seconds, seed) {
		var rnd = DrawKit.random(seed), data = K.samples(sr, seconds), symbol = Math.round(sr / 2400);
		var ph1 = 0, ph2 = 0, a1 = 1, a2 = 1, p1 = 0, p2 = 0, rate = 9 + rnd() * 6;
		for (var z = 0; z < data.length; z++) {
			if (z % symbol == 0) {
				p1 = Math.floor(rnd() * 8) * Math.PI / 4; a1 = 0.3 + rnd() * 0.7;
				p2 = Math.floor(rnd() * 8) * Math.PI / 4; a2 = 0.3 + rnd() * 0.7;
			}
			ph1 += 1800 / sr; ph2 += 1200 / sr;
			var flutter = 0.7 + 0.3 * Math.sin(z / sr * 2 * Math.PI * rate);
			data[z] = (Math.sin(2 * Math.PI * ph1 + p1) * a1 + Math.sin(2 * Math.PI * ph2 + p2) * a2 * 0.6) * flutter * 0.5;
		}
		var hiss = K.mix(sr, seconds, [{ x: K.bandpass(sr, K.noise(sr, seconds, seed + 1), 1800) }, { x: K.bandpass(sr, K.noise(sr, seconds, seed + 2), 1100), gain: 0.7 }]);
		K.gain(hiss, function (t) { return 0.8 + 0.2 * Math.sin(t * seconds * 2 * Math.PI * 3.3); });
		var out = K.mix(sr, seconds, [{ x: data, gain: 0.8 }, { x: K.normalize(hiss, 0.6), gain: 1 }]);
		K.highpass(sr, out, 300);
		return K.lowpass(sr, out, 3400);
	}

	// The siren's pitch at time t, for each of the patterns a modern siren switches between:
	// wail (a slow rise and fall), yelp (fast rising sweeps) and hi-lo (two tones taking turns)
	function sirenPitch(kind, t, low, high, rate) {
		if (kind == 'yelp') return low + (high - low) * Math.pow((t * rate * 7) % 1, 0.7);
		if (kind == 'hilo') return Math.floor(t / 0.36) % 2 ? high * 0.92 : low * 1.12;
		return low + (high - low) * (0.5 + 0.5 * Math.sin(2 * Math.PI * rate * t));
	}

	// a police siren through a loudspeaker, wailing between two pitches.
	// pass: { at (seconds), amount (0.1 = 10% higher coming, lower going), width (seconds) } adds the
	// Doppler effect of it going by: higher pitch as it comes, lower as it goes, loudest as it passes.
	// patterns: optional [{ kind, until (seconds) }, ...] to switch between wail, yelp and hi-lo (see sirenPitch)
	function siren(sr, seconds, low, high, rate, pass, patterns) {
		var out = K.samples(sr, seconds), phase = 0;
		for (var i = 0; i < out.length; i++) {
			var t = i / sr;
			var kind = 'wail';
			for (var p = 0; patterns && p < patterns.length; p++) {
				kind = patterns[p].kind;
				if (t < patterns[p].until) break;
			}
			var f = sirenPitch(kind, t, low, high, rate);
			var loud = 1;
			if (pass) {
				var x = (t - pass.at) / pass.width;
				f *= 1 - pass.amount * Math.tanh(x);
				loud = 0.25 + 0.75 / (1 + x * x);
			}
			phase += f / sr;
			out[i] = Math.tanh(Math.sin(2 * Math.PI * phase) * 3) * loud;      // a hard-driven horn speaker
		}
		K.bandpass(sr, out, 1100);
		return out;
	}

	// a far-off siren going by, with the street's echo, switching from wail to yelp to hi-lo as it goes
	function farSiren(sr, seconds, seed) {
		var rnd = DrawKit.random(seed);
		var patterns = [{ kind: 'wail', until: seconds * 0.36 }, { kind: 'yelp', until: seconds * 0.68 }, { kind: 'hilo', until: seconds }];
		var s = siren(sr, seconds, 560 + rnd() * 60, 980 + rnd() * 80, 0.55 + rnd() * 0.3, { at: seconds * 0.5, amount: 0.07, width: seconds * 0.18 }, patterns);
		K.lowpass(sr, s, 1600);
		return K.reverb(sr, K.fades(sr, s, 1, 1.5), 1.5, 0.5);
	}

	// a vehicle swishing past on the wet road: tyre hiss and engine rumble swelling and fading
	function carPass(sr, seconds, seed) {
		var hiss = K.bandpass(sr, K.noise(sr, seconds, seed), 1400);
		var rumble = K.lowpass(sr, K.brown(sr, seconds, seed + 1), 180);
		var out = K.mix(sr, seconds, [{ x: hiss, gain: 0.6 }, { x: rumble, gain: 0.8 }]);
		return K.gain(out, function (t) { var x = (t - 0.5) * 5; return 1 / (1 + x * x); });
	}

	//=========================== THE SOUNDS ============================

	return {
		// shots. Enforcers: pulse rifles and service guns
		shoot_blue_army: function (sr) { return gunshot(sr, { crack: 0.9, body: 0.8, thump: 120, length: 0.22, seed: 11 }); },
		shoot_blue_hero_army: function (sr) { return gunshot(sr, { crack: 1, body: 1, thump: 80, length: 0.35, echo: 0.9, seed: 12 }); },
		shoot_blue_vehicle: function (sr) { return gunshot(sr, { crack: 0.6, body: 1.2, thump: 55, length: 0.55, echo: 1.2, seed: 14 }); },
		shoot_blue_cannon: function (sr) { return burst(sr, 4, 0.085, function (i) { return gunshot(sr, { crack: 0.9, body: 0.7, thump: 130, length: 0.15, echo: 0.4, seed: 16 + i }); }); },
		shoot_blue_rider: function (sr) { return burst(sr, 3, 0.07, function (i) { return gunshot(sr, { crack: 1, body: 0.5, thump: 150, length: 0.12, echo: 0.4, seed: 18 + i }); }); },

		// Gangs: shotguns, a hand cannon, a rocket launcher, pistols
		shoot_red_army: function (sr) {
			var shot = gunshot(sr, { crack: 0.5, body: 1.3, thump: 70, length: 0.4, echo: 0.8, seed: 21 });
			var pump = K.mix(sr, 0.2, [{ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.03, 22), 1500), 0.001, 3) }, { x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.04, 23), 1000), 0.001, 3), at: 0.12 }]);
			return K.normalize(K.mix(sr, 1.2, [{ x: shot }, { x: pump, at: 0.55, gain: 0.4 }]), 0.9);
		},
		shoot_red_hero_army: function (sr) { return gunshot(sr, { crack: 1, body: 1.2, thump: 65, length: 0.45, echo: 1.1, seed: 24 }); },
		shoot_red_vehicle: function (sr) { return burst(sr, 2, 0.16, function (i) { return gunshot(sr, { crack: 0.5, body: 1.3, thump: 65, length: 0.4, echo: 0.8, seed: 25 + i }); }); },
		shoot_red_cannon: function (sr) {
			var pop = gunshot(sr, { crack: 0.4, body: 0.6, thump: 90, length: 0.2, seed: 27 });
			var whoosh = K.envelope(sr, K.bandpass(sr, K.noise(sr, 0.9, 28), 700), 0.05, 1.3);
			K.gain(whoosh, function (t) { return 1 - t * 0.5; });
			return K.normalize(K.mix(sr, 1.2, [{ x: pop }, { x: K.drive(whoosh, 2), at: 0.03, gain: 0.9 }]), 0.9);
		},
		shoot_red_rider: function (sr) { return burst(sr, 2, 0.13, function (i) { return gunshot(sr, { crack: 1, body: 0.6, thump: 140, length: 0.15, echo: 0.6, seed: 29 + i }); }); },

		explode_blue: function (sr) { return blast(sr, 41); },
		explode_red: function (sr) { return blast(sr, 42); },

		// the Enforcers win: the siren whoops, a radio squawks "all units"
		win_blue: function (sr) {
			var whoop = K.mix(sr, 1.4, [{ x: K.fades(sr, siren(sr, 0.5, 500, 1400, 1), 0.02, 0.1) }, { x: K.fades(sr, siren(sr, 0.5, 500, 1400, 1), 0.02, 0.1), at: 0.6 }]);
			var voice = K.crush(mumble(sr, 1.4, 130, 140, 1500), 24, 2);
			var squelch = K.envelope(sr, K.highpass(sr, K.noise(sr, 0.08, 131), 2500), 0.001, 2);
			return K.normalize(K.reverb(sr, K.mix(sr, 3, [{ x: whoop, gain: 0.6 }, { x: squelch, at: 1.3, gain: 0.5 }, { x: voice, at: 1.38, gain: 0.8 }]), 1, 0.3), 0.85);
		},

		// the Gangs win: glass smashes, a car alarm goes off, the crew roars
		win_red: function (sr) {
			var glass = [], rnd = DrawKit.random(140);
			for (var i = 0; i < 30; i++) {
				var f = 2500 + rnd() * 6000;
				glass.push({ x: K.envelope(sr, K.tone(sr, 0.08 + rnd() * 0.1, f, f * 0.98, 'sine'), 0.001, 2), at: rnd() * 0.5, gain: 0.1 + rnd() * 0.15 });
			}
			glass.push({ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.3, 141), 3000), 0.001, 2), gain: 0.6 });
			var alarm = K.samples(sr, 2.2), ph = 0;
			for (var a = 0; a < alarm.length; a++) {
				ph += ((Math.floor(a / (sr * 0.25)) % 2) ? 900 : 1300) / sr;
				alarm[a] = Math.tanh(Math.sin(2 * Math.PI * ph) * 4);
			}
			K.bandpass(sr, alarm, 1100);
			var crowd = K.mix(sr, 2.2, [0, 1, 2, 3, 4].map(function (k) { return { x: mumble(sr, 2.2, 150 + k, 160 + k * 25, 900), gain: 0.4 }; }));
			K.gain(crowd, function (t) { return Math.sin(Math.PI * Math.min(1, t * 1.4)); });
			return K.normalize(K.reverb(sr, K.mix(sr, 3, glass.concat([{ x: alarm, at: 0.4, gain: 0.35 }, { x: crowd, at: 0.5, gain: 0.8 }])), 1.2, 0.3), 0.85);
		},

		// lock down: a police gunship roars over: rotor thumps, turbine whine, a burst from its chin gun, a siren whoop,
		// all rising as it comes and falling away (Doppler) as it passes
		special_blue: function (sr) {
			var seconds = 2.6, pass = 1.2, n = Math.round(sr * seconds);
			var rotor = K.samples(sr, seconds), whine = K.samples(sr, seconds), thump = K.noise(sr, seconds, 101);
			K.lowpass(sr, thump, 400);
			var phase = 0, wphase = 0;
			for (var i = 0; i < n; i++) {
				var t = i / sr, x = (t - pass) / 0.45;
				var doppler = 1 - 0.1 * Math.tanh(x), loud = 0.2 + 0.8 / (1 + x * x);
				phase += 7.5 * doppler / sr;                          // blades passing: about 7 thumps a second
				var blade = Math.pow(Math.max(0, Math.sin(2 * Math.PI * phase)), 6);
				rotor[i] = (thump[i] * 3 + Math.sin(2 * Math.PI * phase * 9) * 0.4) * blade * loud;
				wphase += 2400 * doppler / sr;
				whine[i] = Math.sin(2 * Math.PI * wphase) * 0.05 * loud;
			}
			var shots = [], rnd = DrawKit.random(102);
			for (var b = 0; b < 14; b++)
				shots.push({ x: K.envelope(sr, K.mix(sr, 0.05, [{ x: K.highpass(sr, K.noise(sr, 0.05, 110 + b), 800) }, { x: K.tone(sr, 0.05, 160, 60, 'sine'), gain: 0.8 }]), 0.001, 3), at: 0.9 + b * 0.045 + rnd() * 0.006, gain: 0.55 });
			var whoop = K.fades(sr, siren(sr, 1.4, 650, 1300, 1.4, { at: 0.5, amount: 0.1, width: 0.3 }), 0.1, 0.4);
			return K.normalize(K.mix(sr, seconds, [{ x: rotor }, { x: whine }, { x: whoop, at: 0.5, gain: 0.12 }].concat(shots)), 0.9);
		},

		// hacked: the power surges and shorts out: crackling sparks, a mains buzz rising then dying, a breaker clunks
		special_red: function (sr) {
			var rnd = DrawKit.random(52), sparks = [];
			for (var i = 0; i < 40; i++)
				sparks.push({ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.01 + rnd() * 0.04, 60 + i), 1500), 0.0005, 3), at: rnd() * 1.4, gain: 0.3 + rnd() * 0.7 });
			var buzz = K.samples(sr, 1.8), ph = 0;
			for (var b = 0; b < buzz.length; b++) {
				var t = b / buzz.length;
				ph += 50 * (t < 0.6 ? 1 + t : 1.6 - (t - 0.6) * 2.4) / sr;
				buzz[b] = Math.tanh(Math.sin(2 * Math.PI * ph) * 5) * (t < 0.85 ? 1 : (1 - t) / 0.15);
			}
			K.lowpass(sr, buzz, 2500);
			var clunk = gunshot(sr, { crack: 0.2, body: 0.4, thump: 60, length: 0.2, echo: 0.5, seed: 59 });
			return K.normalize(K.mix(sr, 2.4, sparks.concat([{ x: buzz, gain: 0.5 }, { x: clunk, at: 1.6, gain: 0.6 }])), 0.85);
		},

		// fly-overs: police spinners screaming past, the gangs' hover van, the advert blimp
		flyover_spinners: function (sr) {
			var whoosh = K.lowpass(sr, K.noise(sr, 2.4, 61), function (t) { return 300 + 1800 * Math.sin(Math.PI * t); });
			K.gain(whoosh, function (t) { return Math.sin(Math.PI * t); });
			var turbine = K.bandpass(sr, K.noise(sr, 2.4, 63), 2600);
			K.gain(turbine, function (t) { return Math.sin(Math.PI * t) * 0.6; });
			var chirp = K.fades(sr, siren(sr, 1.6, 700, 1400, 3.3, { at: 0.8, amount: 0.14, width: 0.25 }), 0.05, 0.3);
			return K.normalize(K.mix(sr, 2.4, [{ x: whoosh }, { x: turbine }, { x: chirp, at: 0.4, gain: 0.2 }]), 0.8);
		},
		flyover_van: function (sr) {
			// a rough engine: rumble chopped at the firing rate, with exhaust pops
			var seconds = 2.8, engine = K.lowpass(sr, K.brown(sr, seconds, 64), 500), ph = 0;
			for (var i = 0; i < engine.length; i++) {
				var t = i / engine.length;
				ph += (32 - 10 * t) / sr;
				engine[i] *= (0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * ph)), 2)) * Math.sin(Math.PI * t);
			}
			K.drive(engine, 3);
			var pops = [0.9, 1.3, 1.45, 2.0].map(function (at, k) { return { x: gunshot(sr, { crack: 0.3, body: 0.6, thump: 90, length: 0.1, echo: 0.3, seed: 65 + k }), at: at, gain: 0.25 }; });
			return K.normalize(K.mix(sr, seconds + 0.5, [{ x: engine }, { x: carPass(sr, seconds, 66), gain: 0.5 }].concat(pops)), 0.8);
		},
		flyover_blimp: function (sr) {
			// a droning engine, and an advert booming out of its loudspeakers in Japanese, between station chimes,
			// echoing down the street: "irasshaimase! neon shitii! kyou dake! tokubetsu kakaku desu! shinshouhin!"
			// (welcome! neon city! today only! special price! new products!)
			var words = announcer(sr, [
				{ morae: ['i', 'ra', 'Q', 'sha', 'i', 'ma', 'se'], accent: 5 },
				{ morae: ['ne', 'o', 'N', 'shi', 'ti', 'i'], accent: -1, rise: true },
				{ morae: ['kyo', 'u', 'da', 'ke'], accent: 1 },
				{ morae: ['to', 'ku', 'be', 'tsu', 'ka', 'ka', 'ku', 'de', 'su'], accent: 4 },
				{ morae: ['shi', 'N', 'sho', 'u', 'hi', 'N'], accent: -1, rise: true }
			], 235, 68);
			var down = 1.6 + words.length / sr + 0.15, after = chime(sr, false);
			var pa = K.mix(sr, down + after.length / sr, [{ x: chime(sr, true), gain: 0.6 }, { x: words, at: 1.6 }, { x: after, at: down, gain: 0.6 }]);
			pa = K.reverb(sr, K.lowpass(sr, pa, 3200), 1.4, 0.45);
			var seconds = 1 + pa.length / sr + 0.5;
			var drone = K.lowpass(sr, K.brown(sr, seconds, 67), 140);
			K.gain(drone, function (t) { return 0.7 + 0.3 * Math.sin(t * 40); });
			return K.normalize(K.fades(sr, K.mix(sr, seconds, [{ x: drone, gain: 0.8 }, { x: pa, at: 1, gain: 0.55 }]), 2, 1.5), 0.7);
		},

		// police radio chatter: muffled voices through a radio, squelch clicks and a beep
		radio: function (sr) {
			var rnd = DrawKit.random(81), layers = [], at = 0.1;
			for (var b = 0; b < 2 + Math.floor(rnd() * 2); b++) {
				var len = 0.6 + rnd() * 1.2;
				var voice = K.crush(mumble(sr, len, 90 + b, 120 + rnd() * 40, 1300), 24, 2);
				layers.push({ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.06, 80 + b), 2500), 0.001, 2), at: at, gain: 0.5 });
				layers.push({ x: voice, at: at + 0.06 });
				layers.push({ x: K.envelope(sr, K.tone(sr, 0.08, 1400, 1400, 'sine'), 0.002, 1), at: at + len + 0.08, gain: 0.3 });
				at += len + 0.6 + rnd() * 0.8;
			}
			layers.push({ x: K.gain(K.highpass(sr, K.noise(sr, at + 0.3, 85), 3000), 0.04) });
			return K.normalize(K.mix(sr, at + 0.3, layers), 0.6);
		},

		// a dial-up modem somewhere: dialling, the answer tone, the handshake warble, the training bongs and the
		// scrambled data hiss of connecting, down a phone line
		modem: function (sr) {
			var rnd = DrawKit.random(91), layers = [], t = 0;
			var DTMF = [[697, 1209], [770, 1336], [852, 1477], [941, 1336], [697, 1477], [770, 1209], [852, 1336]];
			for (var d = 0; d < 7; d++) {
				var keys = DTMF[Math.floor(rnd() * DTMF.length)];
				layers.push({ x: K.fades(sr, K.mix(sr, 0.09, [{ x: K.tone(sr, 0.09, keys[0], keys[0]) }, { x: K.tone(sr, 0.09, keys[1], keys[1]) }]), 0.005, 0.005), at: t, gain: 0.35 });
				t += 0.15;
			}
			t += 0.4;
			layers.push({ x: K.fades(sr, K.tone(sr, 0.9, 2100, 2100), 0.02, 0.05), at: t, gain: 0.4 });
			t += 1;
			// handshake: two-tone warbling bits
			var fsk = K.samples(sr, 0.9), phase = 0;
			for (var i = 0, f = 980; i < fsk.length; i++) {
				if (i % Math.round(sr / 300) == 0) f = rnd() < 0.5 ? 980 : 1180;
				phase += f / sr;
				fsk[i] = Math.sin(2 * Math.PI * phase);
			}
			layers.push({ x: K.fades(sr, fsk, 0.02, 0.05), at: t, gain: 0.35 });
			layers.push({ x: K.fades(sr, K.tone(sr, 0.9, 1650, 1850, 'sine'), 0.02, 0.05), at: t, gain: 0.2 });
			t += 0.95;
			// training: the carrier flipping phase, "bong bong"
			var train = K.samples(sr, 0.5), tp = 0;
			for (var q = 0; q < train.length; q++) {
				tp += 1800 / sr;
				train[q] = Math.sin(2 * Math.PI * tp + (Math.floor(q / (sr * 0.06)) % 2) * Math.PI) * 0.8;
			}
			layers.push({ x: K.fades(sr, train, 0.01, 0.05), at: t, gain: 0.35 });
			t += 0.55;
			// the scrambled data hiss of connecting
			layers.push({ x: K.fades(sr, scrambledData(sr, 4, 92), 0.03, 0.8), at: t, gain: 1.3 });
			t += 4.1;
			var out = K.mix(sr, t, layers.concat([{ x: K.gain(K.highpass(sr, K.noise(sr, t, 93), 2500), 0.05) }]));
			K.highpass(sr, out, 300);
			K.lowpass(sr, out, 3400);
			return K.normalize(out, 0.5);
		},

		// on its own now and then: scrambled data hiss, fading in, swelling and fading away
		datahiss: function (sr) {
			var x = scrambledData(sr, 9, 120);
			K.gain(x, function (t) { return 0.6 + 0.4 * Math.sin(t * Math.PI * 3); });
			return K.normalize(K.fades(sr, x, 2.5, 3), 0.5);
		},

		// a broken neon sign buzzing, crackling and flickering
		neon: function (sr) {
			var seconds = 5, buzz = K.samples(sr, seconds), ph = 0, rnd = DrawKit.random(160), on = 1;
			for (var i = 0; i < buzz.length; i++) {
				if (i % Math.round(sr * 0.05) == 0) on = rnd() < 0.8 ? 1 : 0.1;
				ph += 100 / sr;
				buzz[i] = Math.tanh(Math.sin(2 * Math.PI * ph) * 6) * on;
			}
			K.highpass(sr, buzz, 200);
			K.lowpass(sr, buzz, 3000);
			var crackle = [];
			for (var c = 0; c < 18; c++)
				crackle.push({ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.02, 161 + c), 2000), 0.0005, 3), at: rnd() * seconds, gain: 0.4 });
			return K.normalize(K.fades(sr, K.mix(sr, seconds, [{ x: buzz, gain: 0.5 }].concat(crackle)), 1, 1.5), 0.5);
		},

		// a dog barking a few streets away
		dog: function (sr) {
			var rnd = DrawKit.random(170), barks = [];
			for (var b = 0; b < 2 + Math.floor(rnd() * 3); b++) {
				var d = 0.12 + rnd() * 0.06, f = 380 + rnd() * 120;
				var bark = K.bandpass(sr, K.noise(sr, d, 171 + b), f * 2);
				K.gain(bark, function (t) { return Math.pow(Math.sin(Math.PI * t), 0.5); });
				barks.push({ x: K.envelope(sr, K.drive(bark, 3), 0.005, 1.5), at: b * (0.3 + rnd() * 0.25) });
			}
			return K.normalize(K.reverb(sr, K.lowpass(sr, K.mix(sr, 2, barks), 1800), 1.4, 0.5), 0.5);
		},

		// background, taking turns: rain on concrete and metal, and the city itself
		ambience_rain: function (sr) {
			var seconds = 12, rnd = DrawKit.random(72);
			var rain = K.lowpass(sr, K.highpass(sr, K.noise(sr, seconds, 71), 500), 6000);
			K.gain(rain, function (t) { return 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 2.3); });      // gusts
			var hits = [];
			for (var i = 0; i < 160; i++)                                 // drops on puddles and concrete
				hits.push({ x: K.envelope(sr, K.highpass(sr, K.noise(sr, 0.012, 200 + i), 1500), 0.0005, 3), at: rnd() * (seconds - 0.1), gain: 0.1 + rnd() * 0.2 });
			for (var m = 0; m < 30; m++) {                                // drips ringing on metal
				var f = 1800 + rnd() * 2600;
				hits.push({ x: K.envelope(sr, K.tone(sr, 0.12, f, f, 'sine'), 0.001, 3), at: rnd() * (seconds - 0.2), gain: 0.05 + rnd() * 0.08 });
			}
			var gutter = [];                                              // a gutter dripping steadily
			for (var g = 0.5; g < seconds - 0.2; g += 0.55 + rnd() * 0.1)
				gutter.push({ x: K.envelope(sr, K.tone(sr, 0.05, 900, 600, 'sine'), 0.001, 3), at: g, gain: 0.12 });
			return K.normalize(K.fades(sr, K.mix(sr, seconds, [{ x: rain, gain: 0.6 }].concat(hits, gutter)), 2, 3), 0.6);
		},
		ambience_city: function (sr) {
			var seconds = 14, rnd = DrawKit.random(73);
			var rumble = K.lowpass(sr, K.brown(sr, seconds, 73), 120);              // traffic across the city
			var cars = [0.5, 3.2, 6, 9.5].map(function (at, k) { return { x: carPass(sr, 2.5, 74 + k), at: at, gain: 0.35 }; });
			// an elevated train: rumble and the clack of the rail joints, coming and going
			var train = K.lowpass(sr, K.brown(sr, 6, 80), 300), clacks = [];
			K.gain(train, function (t) { return Math.sin(Math.PI * t); });
			for (var c = 0.3; c < 5.7; c += 0.32) {
				clacks.push({ x: K.envelope(sr, K.lowpass(sr, K.noise(sr, 0.04, 81 + Math.round(c * 10)), 1200), 0.001, 3), at: c, gain: 0.5 * Math.sin(Math.PI * c / 6) });
				clacks.push({ x: K.envelope(sr, K.lowpass(sr, K.noise(sr, 0.04, 82 + Math.round(c * 10)), 1200), 0.001, 3), at: c + 0.1, gain: 0.4 * Math.sin(Math.PI * c / 6) });
			}
			var trainAll = K.reverb(sr, K.mix(sr, 6, [{ x: train, gain: 0.8 }].concat(clacks)), 1, 0.4);
			var crowd = K.lowpass(sr, K.mix(sr, seconds, [0, 1, 2].map(function (k) { return { x: mumble(sr, seconds, 90 + k, 150 + k * 40, 700), gain: 0.3 }; })), 900);
			return K.normalize(K.fades(sr, K.mix(sr, seconds, [
				{ x: rumble, gain: 0.8 }, { x: crowd, gain: 0.15 }, { x: trainAll, at: 5, gain: 0.5 }
			].concat(cars)), 3, 3.5), 0.6);
		},

		// now and then: a siren going by a few streets away
		critter: function (sr) {
			return K.normalize(farSiren(sr, 7.5, 175), 0.5);
		}
	};
})();
