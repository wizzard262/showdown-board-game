/*
 * Showdown - sound kit for themes that make their sounds in code
 * Every function works on plain arrays of samples (-1 to 1) at sample rate sr, so a sound is built
 * by making layers (tones, noise), shaping them (envelopes, filters) and mixing them.
 * Randomness is seeded, so a sound comes out the same every time.
 */

var SoundKit = (function () {

	function samples(sr, seconds) {
		return new Float32Array(Math.max(1, Math.round(sr * seconds)));
	}

	// A tone sliding from f0 to f1 Hz. type: 'sine', 'square', 'saw', 'triangle'. curve > 1 slides late, < 1 early.
	function tone(sr, seconds, f0, f1, type, curve) {
		var out = samples(sr, seconds), phase = 0, n = out.length;
		curve = curve || 1;
		for (var i = 0; i < n; i++) {
			var t = Math.pow(i / n, curve);
			phase += (f0 + (f1 - f0) * t) / sr;
			var p = phase - Math.floor(phase);
			var v;
			if (type == 'square') v = p < 0.5 ? 1 : -1;
			else if (type == 'saw') v = 2 * p - 1;
			else if (type == 'triangle') v = 1 - 4 * Math.abs(p - 0.5);
			else v = Math.sin(2 * Math.PI * p);
			out[i] = v;
		}
		return out;
	}

	function noise(sr, seconds, seed) {
		var rnd = DrawKit.random(seed || 7), out = samples(sr, seconds);
		for (var i = 0; i < out.length; i++)
			out[i] = rnd() * 2 - 1;
		return out;
	}

	// Rumbly noise (each sample wanders from the last): traffic, engines, wind
	function brown(sr, seconds, seed) {
		var rnd = DrawKit.random(seed || 9), out = samples(sr, seconds), v = 0;
		for (var i = 0; i < out.length; i++) {
			v = (v + (rnd() * 2 - 1) * 0.04) * 0.998;
			out[i] = v * 6;
		}
		return out;
	}

	// A rough room or street echo: four echoes that feed back, darker each time round, mixed in by wet (0-1)
	function reverb(sr, x, seconds, wet) {
		var out = new Float32Array(x.length + Math.round(sr * seconds));
		[0.0297, 0.0371, 0.0411, 0.0437].forEach(function (d, k) {
			var delay = Math.round(sr * d * (1 + seconds)), fb = Math.pow(0.001, d * (1 + seconds) / seconds), low = 0;
			var line = new Float32Array(out.length);
			for (var i = 0; i < out.length; i++) {
				var input = i < x.length ? x[i] : 0;
				var back = i >= delay ? line[i - delay] : 0;
				low += 0.4 * (back - low);
				line[i] = input + low * fb;
				out[i] += line[i] * 0.25;
			}
		});
		for (var j = 0; j < out.length; j++)
			out[j] = (j < x.length ? x[j] * (1 - wet) : 0) + out[j] * wet;
		return out;
	}

	// Fade in over attack seconds, then die away; shape > 1 dies faster
	function envelope(sr, x, attack, shape) {
		var n = x.length, a = Math.max(1, Math.round(sr * attack));
		shape = shape || 2;
		for (var i = 0; i < n; i++) {
			var g = i < a ? i / a : Math.pow(1 - (i - a) / Math.max(1, n - a), shape);
			x[i] *= g;
		}
		return x;
	}

	// Fade in and out at the ends only (for long sounds that should hold steady)
	function fades(sr, x, fadeIn, fadeOut) {
		var n = x.length, a = Math.round(sr * fadeIn), b = Math.round(sr * fadeOut);
		for (var i = 0; i < n; i++) {
			if (i < a) x[i] *= i / a;
			if (i > n - b) x[i] *= (n - i) / b;
		}
		return x;
	}

	// One-pole filters; cutoff can be a number or a function of 0-1 through the sound
	function lowpass(sr, x, cutoff) {
		var y = 0, n = x.length;
		for (var i = 0; i < n; i++) {
			var c = typeof cutoff == 'function' ? cutoff(i / n) : cutoff;
			var a = 1 - Math.exp(-2 * Math.PI * c / sr);
			y += a * (x[i] - y);
			x[i] = y;
		}
		return x;
	}

	function highpass(sr, x, cutoff) {
		var low = Float32Array.from(x);
		lowpass(sr, low, cutoff);
		for (var i = 0; i < x.length; i++)
			x[i] -= low[i];
		return x;
	}

	// Two passes of each: a rough band around the centre frequency
	function bandpass(sr, x, centre) {
		highpass(sr, x, centre * 0.7);
		highpass(sr, x, centre * 0.7);
		lowpass(sr, x, centre * 1.4);
		return lowpass(sr, x, centre * 1.4);
	}

	function gain(x, g) {
		for (var i = 0; i < x.length; i++)
			x[i] *= typeof g == 'function' ? g(i / x.length) : g;
		return x;
	}

	// Soft clipping for grit
	function drive(x, amount) {
		for (var i = 0; i < x.length; i++)
			x[i] = Math.tanh(x[i] * amount) / Math.tanh(amount);
		return x;
	}

	// Fewer levels and held samples: a lo-fi, glitchy sound
	function crush(x, levels, hold) {
		var held = 0;
		for (var i = 0; i < x.length; i++) {
			if (i % hold == 0)
				held = Math.round(x[i] * levels) / levels;
			x[i] = held;
		}
		return x;
	}

	function echo(sr, x, seconds, feedback, wet) {
		var d = Math.round(sr * seconds);
		var out = Float32Array.from(x);
		for (var i = d; i < out.length; i++)
			out[i] += out[i - d] * feedback;
		for (var j = 0; j < x.length; j++)
			x[j] = x[j] * (1 - wet) + out[j] * wet;
		return x;
	}

	// Mix layers: [{ x, at (seconds), gain }] into one sound of the given length
	function mix(sr, seconds, layers) {
		var out = samples(sr, seconds);
		layers.forEach(function (layer) {
			var start = Math.round((layer.at || 0) * sr), g = layer.gain === undefined ? 1 : layer.gain;
			for (var i = 0; i < layer.x.length && start + i < out.length; i++)
				out[start + i] += layer.x[i] * g;
		});
		return out;
	}

	// Scale so the loudest sample is at peak
	function normalize(x, peak) {
		var max = 0;
		for (var i = 0; i < x.length; i++)
			max = Math.max(max, Math.abs(x[i]));
		return max > 0 ? gain(x, (peak || 0.9) / max) : x;
	}

	// A note's frequency: 0 = A4 (440 Hz), in semitones
	function note(semitones) {
		return 440 * Math.pow(2, semitones / 12);
	}

	return {
		samples: samples, tone: tone, noise: noise, brown: brown, reverb: reverb, envelope: envelope, fades: fades,
		lowpass: lowpass, highpass: highpass, bandpass: bandpass, gain: gain, drive: drive,
		crush: crush, echo: echo, mix: mix, normalize: normalize, note: note
	};
})();
