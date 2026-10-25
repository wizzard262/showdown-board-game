/*
 * Showdown - drawing kit for themes that draw their graphics in code
 *
 *   DrawKit.Model     an isometric model built from boxes, balls, cylinders, wheels, flat shapes and lines,
 *                     in board units (a square is 128 across): f forward, s sideways, z up.
 *                     Drawn facing any of the 4 directions, so each piece is built once.
 *   DrawKit.render    draws a model on a canvas
 *   DrawKit.voxelGroups, renderVoxels   the same model rebuilt from flat-shaded cubes, a blocky toy look
 *   DrawKit.uiFrames  the frames every theme needs that don't depend on the theme much:
 *                     move and target markers, shot patterns, hearts, health bars, menu button, info window
 *   DrawKit.random    a seeded random number source, so drawings come out the same every time
 */

var DrawKit = (function () {

	//=========================== COLOURS ===============================

	function rgb(hex) {
		var n = parseInt(hex.replace('#', ''), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	// k < 1 darker, k > 1 lighter (towards white)
	function shade(hex, k, alpha) {
		var c = rgb(hex).map(function (v) {
			var out = k <= 1 ? v * k : v + (255 - v) * (k - 1);
			return Math.max(0, Math.min(255, Math.round(out)));
		});
		return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha === undefined ? 1 : alpha) + ')';
	}

	function random(seed) {
		var s = seed >>> 0 || 1;
		return function () {
			s ^= s << 13; s >>>= 0;
			s ^= s >>> 17;
			s ^= s << 5; s >>>= 0;
			return (s % 100000) / 100000;
		};
	}

	//=========================== MODELS ================================

	function Model() {
		this.parts = [];
	}

	Model.prototype = {
		// a box from f0-f1, s0-s1, z0-z1. opt: { glow, alpha, top (colour of the top face) }
		box: function (f0, f1, s0, s1, z0, z1, color, opt) {
			this.parts.push({ type: 'box', f: [f0, f1], s: [s0, s1], z: [z0, z1], color: color, opt: opt || {} });
			return this;
		},
		// a ball centred at (f, s, z)
		ball: function (f, s, z, r, color, opt) {
			this.parts.push({ type: 'ball', at: [f, s, z], r: r, color: color, opt: opt || {} });
			return this;
		},
		// an upright cylinder
		cylinder: function (f, s, z0, z1, r, color, opt) {
			this.parts.push({ type: 'cylinder', at: [f, s], z: [z0, z1], r: r, color: color, opt: opt || {} });
			return this;
		},
		// a wheel standing upright, facing sideways, centred at (f, s, z)
		wheel: function (f, s, z, r, color, opt) {
			this.parts.push({ type: 'wheel', at: [f, s, z], r: r, color: color, opt: opt || {} });
			return this;
		},
		// a flat shape through the points [[f, s, z], ...]
		poly: function (points, color, opt) {
			this.parts.push({ type: 'poly', points: points, color: color, opt: opt || {} });
			return this;
		},
		// a flat ellipse lying on the ground (or at height z)
		disc: function (f, s, z, rf, rs, color, opt) {
			var points = [];
			for (var i = 0; i < 20; i++) {
				var a = i / 20 * Math.PI * 2;
				points.push([f + Math.cos(a) * rf, s + Math.sin(a) * rs, z]);
			}
			return this.poly(points, color, opt);
		},
		line: function (a, b, color, width, opt) {
			this.parts.push({ type: 'line', a: a, b: b, color: color, width: width, opt: opt || {} });
			return this;
		},
		// a rounded limb from a to b, r thick, shaded (arms, legs, necks)
		limb: function (a, b, r, color, opt) {
			this.parts.push({ type: 'limb', a: a, b: b, r: r, color: color, opt: opt || {} });
			return this;
		},
		// an egg shape centred at (f, s, z), half-sizes a (forward), b (sideways), c (up): heads, bodies, hulls
		ellipsoid: function (f, s, z, a, b, c, color, opt) {
			this.parts.push({ type: 'ellipsoid', at: [f, s, z], size: [a, b, c], color: color, opt: opt || {} });
			return this;
		},
		// add another model, moved by (f, s, z) and scaled by k. Its parts are copied in (marked fromChild), and
		// it's kept in children too, so voxelGroups can build each sub-model on its own grid
		add: function (model, f, s, z, k) {
			k = k || 1;
			var move = function (p) { return [f + p[0] * k, s + p[1] * k, z + p[2] * k]; };
			var self = this;
			(this.children = this.children || []).push({ model: model, at: [f, s, z], k: k });
			model.parts.forEach(function (part) {
				var p = CloneObject(part);
				p.opt = part.opt;
				p.fromChild = true;
				if (p.type == 'box') {
					p.f = [f + part.f[0] * k, f + part.f[1] * k];
					p.s = [s + part.s[0] * k, s + part.s[1] * k];
					p.z = [z + part.z[0] * k, z + part.z[1] * k];
				}
				if (p.type == 'ball' || p.type == 'wheel') { p.at = move(part.at); p.r = part.r * k; }
				if (p.type == 'cylinder') { p.at = [f + part.at[0] * k, s + part.at[1] * k]; p.z = [z + part.z[0] * k, z + part.z[1] * k]; p.r = part.r * k; }
				if (p.type == 'poly') p.points = part.points.map(move);
				if (p.type == 'line') { p.a = move(part.a); p.b = move(part.b); p.width = part.width * k; }
				if (p.type == 'limb') { p.a = move(part.a); p.b = move(part.b); p.r = part.r * k; }
				if (p.type == 'ellipsoid') { p.at = move(part.at); p.size = part.size.map(function (v) { return v * k; }); }
				self.parts.push(p);
			});
			return this;
		}
	};

	var FORWARD = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };

	/*
	 * Draw a model. view: { dir, x, y (where the model's origin lands), scale, dim (1 = normal, lower = darker, for wrecks) }
	 * Board projection: a square 128 across is a diamond 256 wide and 128 high.
	 */
	function render(ctx, model, view) {
		var F = FORWARD[view.dir || 'right'];
		var S = [-F[1], F[0]];
		var k = view.scale || 1;
		var baseDim = view.dim === undefined ? 1 : view.dim;
		var dim = baseDim, erasing = false;

		var world = function (p) { return [p[0] * F[0] + p[1] * S[0], p[0] * F[1] + p[1] * S[1], p[2]]; };
		var screen = function (p) {
			var w = world(p);
			return [view.x + k * (w[0] - w[1]), view.y + k * ((w[0] + w[1]) / 2 - w[2])];
		};
		var depthOf = function (p) { var w = world(p); return w[0] + w[1]; };
		var col = function (color, light, alpha) { return erasing ? 'rgba(0,0,0,1)' : shade(color, light * dim, alpha); };

		// sort back to front: further from the viewer (smaller x + y) first, then lower first
		var items = model.parts.map(function (part) {
			var c;
			if (part.type == 'box') c = [(part.f[0] + part.f[1]) / 2, (part.s[0] + part.s[1]) / 2, part.z[0]];
			else if (part.type == 'cylinder') c = [part.at[0], part.at[1], part.z[0]];
			else if (part.type == 'poly') c = part.points.reduce(function (a, p) { return [a[0] + p[0] / part.points.length, a[1] + p[1] / part.points.length, Math.min(a[2], p[2])]; }, [0, 0, Infinity]);
			else if (part.type == 'line' || part.type == 'limb') c = [(part.a[0] + part.b[0]) / 2, (part.a[1] + part.b[1]) / 2, Math.min(part.a[2], part.b[2])];
			else c = part.at;
			return { part: part, depth: depthOf(c) + (part.opt.layer || 0), z: c[2] };
		});
		items.sort(function (a, b) { return (a.depth - b.depth) || (a.z - b.z); });

		var path = function (points) {
			ctx.beginPath();
			points.forEach(function (p, i) {
				var q = screen(p);
				if (i == 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
			});
			ctx.closePath();
		};
		var glowOn = function (opt) {
			if (opt.glow && dim >= 1 && !erasing) {
				ctx.shadowColor = opt.glow;
				ctx.shadowBlur = (opt.blur || 10) * k * (view.blurScale || 1);
			}
		};
		var glowOff = function () { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };

		items.forEach(function (item) {
			var p = item.part;
			var opt = p.opt;
			var alpha = opt.alpha === undefined ? 1 : opt.alpha;

			// flickering lights (opt.flick = a layer number), drawn in passes (view.flicker = { layer }):
			// layer -1 is the base, with the flickering parts dimmed and unlit; layer n draws only the parts in
			// layer n, and the solid parts in front of them rub them out so they stay hidden behind things
			dim = baseDim; erasing = false;
			if (view.flicker) {
				var fl = opt.flick;
				if (view.flicker.layer < 0) {
					if (fl !== undefined) dim = baseDim * 0.4;
				}
				else if (fl !== view.flicker.layer) {
					if (fl !== undefined || alpha < 1 || p.type == 'line') return;
					erasing = true;
				}
			}
			ctx.save();
			if (erasing) ctx.globalCompositeOperation = 'destination-out';
			else glowOn(opt);

			if (p.type == 'box') {
				var f = p.f, s = p.s, z = p.z;
				// the faces turned towards the viewer: world normal with x + y > 0
				var faces = [
					{ n: [1, 0], pts: [[f[1], s[0], z[0]], [f[1], s[1], z[0]], [f[1], s[1], z[1]], [f[1], s[0], z[1]]] },
					{ n: [-1, 0], pts: [[f[0], s[0], z[0]], [f[0], s[1], z[0]], [f[0], s[1], z[1]], [f[0], s[0], z[1]]] },
					{ n: [0, 1], pts: [[f[0], s[1], z[0]], [f[1], s[1], z[0]], [f[1], s[1], z[1]], [f[0], s[1], z[1]]] },
					{ n: [0, -1], pts: [[f[0], s[0], z[0]], [f[1], s[0], z[0]], [f[1], s[0], z[1]], [f[0], s[0], z[1]]] }
				];
				faces.forEach(function (face) {
					var wn = world([face.n[0], face.n[1], 0]);
					if (wn[0] + wn[1] <= 0) return;
					path(face.pts);
					ctx.fillStyle = col(p.color, wn[0] > 0 ? 0.78 : 0.6, alpha);
					ctx.fill();
				});
				path([[f[0], s[0], z[1]], [f[1], s[0], z[1]], [f[1], s[1], z[1]], [f[0], s[1], z[1]]]);
				ctx.fillStyle = col(opt.top || p.color, 1, alpha);
				ctx.fill();
				if (opt.edge) {
					glowOff();
					ctx.strokeStyle = col(opt.edge, 1, 0.6);
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}

			if (p.type == 'ball') {
				var c = screen(p.at), r = p.r * k * 1.2;
				var g = ctx.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
				g.addColorStop(0, col(p.color, 1.35, alpha));
				g.addColorStop(0.6, col(p.color, 0.9, alpha));
				g.addColorStop(1, col(p.color, 0.55, alpha));
				ctx.beginPath();
				ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
				ctx.fillStyle = g;
				ctx.fill();
			}

			if (p.type == 'cylinder') {
				var b = screen([p.at[0], p.at[1], p.z[0]]), t = screen([p.at[0], p.at[1], p.z[1]]);
				var rx = p.r * k * Math.SQRT2, ry = rx / 2;
				var side = ctx.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
				side.addColorStop(0, col(p.color, 0.55, alpha));
				side.addColorStop(0.45, col(p.color, 0.95, alpha));
				side.addColorStop(1, col(p.color, 0.5, alpha));
				ctx.beginPath();
				ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI);
				ctx.lineTo(t[0] - rx, t[1]);
				ctx.ellipse(t[0], t[1], rx, ry, 0, Math.PI, 0, true);
				ctx.closePath();
				ctx.fillStyle = side;
				ctx.fill();
				ctx.beginPath();
				ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2);
				ctx.fillStyle = col(opt.top || p.color, 1.1, alpha);
				ctx.fill();
			}

			if (p.type == 'wheel') {
				var ring = function (r) {
					var pts = [];
					for (var i = 0; i < 18; i++) {
						var a = i / 18 * Math.PI * 2;
						pts.push([p.at[0] + Math.cos(a) * r, p.at[1], p.at[2] + Math.sin(a) * r]);
					}
					return pts;
				};
				path(ring(p.r));
				ctx.fillStyle = col(p.color, 0.8, alpha);
				ctx.fill();
				glowOff();
				if (opt.rim) {
					glowOn({ glow: opt.rim, blur: 6 });
					ctx.strokeStyle = col(opt.rim, 1, 0.9);
					ctx.lineWidth = 1.5 * k;
					ctx.stroke();
					glowOff();
				}
				path(ring(p.r * 0.45));
				ctx.fillStyle = col(opt.hub || '#888888', 1, alpha);
				ctx.fill();
			}

			if (p.type == 'poly') {
				path(p.points);
				ctx.fillStyle = col(p.color, 1, alpha);
				ctx.fill();
				if (opt.stroke) {
					ctx.strokeStyle = col(opt.stroke, 1, 1);
					ctx.lineWidth = (opt.strokeWidth || 1.5) * k;
					ctx.stroke();
				}
			}

			if (p.type == 'line') {
				var a = screen(p.a), e = screen(p.b);
				ctx.beginPath();
				ctx.moveTo(a[0], a[1]);
				ctx.lineTo(e[0], e[1]);
				ctx.strokeStyle = col(p.color, 1, alpha);
				ctx.lineWidth = p.width * k;
				ctx.lineCap = 'round';
				ctx.stroke();
			}

			if (p.type == 'limb') {
				var la = screen(p.a), lb = screen(p.b), lw = p.r * 2 * k;
				ctx.lineCap = 'round';
				ctx.beginPath(); ctx.moveTo(la[0], la[1]); ctx.lineTo(lb[0], lb[1]);
				ctx.strokeStyle = col(p.color, 0.7, alpha);
				ctx.lineWidth = lw;
				ctx.stroke();
				glowOff();
				ctx.beginPath(); ctx.moveTo(la[0] - lw * 0.15, la[1] - lw * 0.1); ctx.lineTo(lb[0] - lw * 0.15, lb[1] - lw * 0.1);
				ctx.strokeStyle = col(p.color, 1.05, alpha);
				ctx.lineWidth = lw * 0.55;
				ctx.stroke();
			}

			if (p.type == 'ellipsoid') {
				// the outline is the convex hull of points on the surface
				var pts = [];
				for (var u = 0; u < 12; u++) {
					for (var v = 0; v <= 8; v++) {
						var th = u / 12 * Math.PI * 2, ph = v / 8 * Math.PI - Math.PI / 2;
						pts.push(screen([p.at[0] + Math.cos(ph) * Math.cos(th) * p.size[0], p.at[1] + Math.cos(ph) * Math.sin(th) * p.size[1], p.at[2] + Math.sin(ph) * p.size[2]]));
					}
				}
				var hull = convexHull(pts);
				var ec = screen(p.at), er = Math.max(p.size[0], p.size[1], p.size[2]) * k * 1.3;
				var eg = ctx.createRadialGradient(ec[0] - er * 0.3, ec[1] - er * 0.45, er * 0.05, ec[0], ec[1], er);
				eg.addColorStop(0, col(p.color, 1.3, alpha));
				eg.addColorStop(0.55, col(p.color, 0.92, alpha));
				eg.addColorStop(1, col(p.color, 0.55, alpha));
				ctx.beginPath();
				hull.forEach(function (q, i) { if (i == 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
				ctx.closePath();
				ctx.fillStyle = eg;
				ctx.fill();
			}
			ctx.restore();
		});
	}

	// The outline round a set of points (monotone chain)
	function convexHull(points) {
		var p = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
		var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
		var lower = [], upper = [];
		p.forEach(function (q) {
			while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
			lower.push(q);
		});
		p.slice().reverse().forEach(function (q) {
			while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
			upper.push(q);
		});
		return lower.slice(0, -1).concat(upper.slice(0, -1));
	}

	/*
	 * Pixel art: paint(ctx) draws at full size into a canvas 'px' times smaller, the see-through edges are
	 * snapped (no fuzz), then it's blown back up with square pixels. paint gets the blur scale for glows.
	 * outline: optional colour for a 1-pixel outline round the solid shapes, as in hand-made pixel art.
	 */
	function pixelate(ctx, w, h, px, paint, outline) {
		var small = document.createElement('canvas');
		small.width = Math.ceil(w / px);
		small.height = Math.ceil(h / px);
		var s = small.getContext('2d', { willReadFrequently: true });
		s.scale(1 / px, 1 / px);
		paint(s, 1 / px);
		var image = s.getImageData(0, 0, small.width, small.height);
		var d = image.data;
		for (var i = 3; i < d.length; i += 4)
			d[i] = d[i] < 40 ? 0 : (d[i] < 150 ? 120 : 255);
		if (outline) {
			var sw = small.width, sh = small.height, solid = new Uint8Array(sw * sh), c = rgb(outline);
			for (var n = 0; n < sw * sh; n++)
				solid[n] = d[n * 4 + 3] == 255 ? 1 : 0;
			for (var y = 0; y < sh; y++) {
				for (var x = 0; x < sw; x++) {
					var k = y * sw + x;
					if (d[k * 4 + 3] != 0) continue;
					if ((x > 0 && solid[k - 1]) || (x < sw - 1 && solid[k + 1]) || (y > 0 && solid[k - sw]) || (y < sh - 1 && solid[k + sw])) {
						d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255;
					}
				}
			}
		}
		s.putImageData(image, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(small, 0, 0, small.width * px, small.height * px);
	}

	//=========================== VOXELS ================================

	/*
	 * Blocky toy look (like Crossy Road): a model rebuilt from cubes, each face one flat colour.
	 *   voxelGroups(model, style)       the cubes, worked out once. style: { size (cube size in model units),
	 *                                   swap(subModel) -> { model, size } or null, to rebuild a sub-model another way }
	 *   renderVoxels(ctx, groups, view) draws them; view as for render: { dir, x, y, scale, dim }
	 * Each sub-model gets its own grid, so a person looks the same whatever size it's added at.
	 */

	// does part p hold the point (f, s, z)? Thin parts count as at least one cube thick (h = half a cube)
	function holds(p, f, s, z, h) {
		var big = function (v) { return Math.max(v, h * 1.05); };     // a touch over half, so a thin part on a cube's edge isn't lost
		if (p.type == 'box') {
			var inside = function (v, r) { return Math.abs(v - (r[0] + r[1]) / 2) <= big((r[1] - r[0]) / 2); };
			return inside(f, p.f) && inside(s, p.s) && inside(z, p.z);
		}
		if (p.type == 'ball') return Math.hypot(f - p.at[0], s - p.at[1], z - p.at[2]) <= big(p.r);
		if (p.type == 'cylinder') return Math.hypot(f - p.at[0], s - p.at[1]) <= big(p.r) && z >= p.z[0] - h / 2 && z <= p.z[1] + h / 2;
		if (p.type == 'wheel') return Math.hypot(f - p.at[0], z - p.at[2]) <= big(p.r) && Math.abs(s - p.at[1]) <= big(p.r * 0.35);
		if (p.type == 'ellipsoid') {
			var a = (f - p.at[0]) / big(p.size[0]), b = (s - p.at[1]) / big(p.size[1]), c = (z - p.at[2]) / big(p.size[2]);
			return a * a + b * b + c * c <= 1;
		}
		if (p.type == 'limb') {
			var d = [p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]], q = [f - p.a[0], s - p.a[1], z - p.a[2]];
			var t = Math.max(0, Math.min(1, (q[0] * d[0] + q[1] * d[1] + q[2] * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1)));
			return Math.hypot(q[0] - d[0] * t, q[1] - d[1] * t, q[2] - d[2] * t) <= big(p.r);
		}
		return false;
	}

	// [[f0, f1], [s0, s1], [z0, z1]] round a part; null for flat shapes and lines, which aren't built in cubes
	function extent(p) {
		var r = p.r;
		if (p.type == 'box') return [p.f, p.s, p.z];
		if (p.type == 'ball' || p.type == 'wheel') return [0, 1, 2].map(function (i) { return [p.at[i] - r, p.at[i] + r]; });
		if (p.type == 'cylinder') return [[p.at[0] - r, p.at[0] + r], [p.at[1] - r, p.at[1] + r], p.z];
		if (p.type == 'ellipsoid') return [0, 1, 2].map(function (i) { return [p.at[i] - p.size[i], p.at[i] + p.size[i]]; });
		if (p.type == 'limb') return [0, 1, 2].map(function (i) { return [Math.min(p.a[i], p.b[i]) - r, Math.max(p.a[i], p.b[i]) + r]; });
		return null;
	}

	// the cubes of some parts: { 'i,j,l': { color, lit, alpha } } on a grid 'size' across; where parts overlap the later one wins
	function voxelize(parts, size) {
		parts = parts.filter(extent);
		var cells = {};
		if (!parts.length) return cells;
		var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
		parts.forEach(function (p) { extent(p).forEach(function (r, i) { lo[i] = Math.min(lo[i], r[0]); hi[i] = Math.max(hi[i], r[1]); }); });
		for (var i = Math.floor(lo[0] / size) - 1; i <= Math.ceil(hi[0] / size); i++)
			for (var j = Math.floor(lo[1] / size) - 1; j <= Math.ceil(hi[1] / size); j++)
				for (var l = Math.floor(lo[2] / size) - 1; l <= Math.ceil(hi[2] / size); l++) {
					for (var n = parts.length - 1; n >= 0; n--) {
						if (holds(parts[n], (i + 0.5) * size, (j + 0.5) * size, (l + 0.5) * size, size / 2)) {
							var o = parts[n].opt;
							cells[i + ',' + j + ',' + l] = { color: parts[n].color, lit: !!o.glow, alpha: o.alpha === undefined ? 1 : o.alpha };
							break;
						}
					}
				}
		return cells;
	}

	function voxelGroups(model, style, at, k, size, out) {
		at = at || [0, 0, 0]; k = k || 1; size = size || style.size; out = out || [];
		var own = model.parts.filter(function (p) { return !p.fromChild; });
		if (own.length) out.push({ cells: voxelize(own, size), size: size, at: at, k: k });
		(model.children || []).forEach(function (c) {
			var swapped = style.swap && style.swap(c.model);
			voxelGroups(swapped ? swapped.model : c.model, style, [at[0] + k * c.at[0], at[1] + k * c.at[1], at[2] + k * c.at[2]], k * c.k, swapped ? swapped.size : style.size, out);
		});
		return out;
	}

	// Flat-shaded like render's boxes: tops full, +x faces 0.78, +y faces 0.6; lit (neon) cubes bright all over unless dimmed
	function renderVoxels(ctx, groups, view) {
		var F = FORWARD[view.dir || 'right'], S = [-F[1], F[0]];
		var k = view.scale || 1, dim = view.dim === undefined ? 1 : view.dim;
		var rot = function (f, s) { return [f * F[0] + s * S[0], f * F[1] + s * S[1]]; };
		// the grid step that goes towards world +x, and +y
		var step = function (want) {
			return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { var w = rot(d[0], d[1]); return w[0] == want[0] && w[1] == want[1]; })[0];
		};
		var px = step([1, 0]), py = step([0, 1]);
		var screen = function (w) { return [view.x + k * (w[0] - w[1]), view.y + k * ((w[0] + w[1]) / 2 - w[2])]; };

		// groups back to front, then the cubes in each back to front
		groups.map(function (g) {
			var c = rot(g.at[0], g.at[1]);
			return { g: g, depth: c[0] + c[1] };
		}).sort(function (a, b) { return (a.depth - b.depth) || (a.g.at[2] - b.g.at[2]); }).forEach(function (item) {
			var g = item.g, hw = g.size * g.k / 2;
			var cubes = Object.keys(g.cells).map(function (key) {
				var ijl = key.split(',').map(Number);
				var m = [0, 1, 2].map(function (i) { return g.at[i] + g.k * (ijl[i] + 0.5) * g.size; });
				var w = rot(m[0], m[1]);
				return { ijl: ijl, cell: g.cells[key], w: [w[0], w[1], m[2]] };
			}).sort(function (a, b) { return (a.w[0] + a.w[1] + a.w[2]) - (b.w[0] + b.w[1] + b.w[2]); });

			// a face shows if nothing solid is next to it that way
			var open = function (c, d) {
				var n = g.cells[(c.ijl[0] + d[0]) + ',' + (c.ijl[1] + d[1]) + ',' + (c.ijl[2] + d[2])];
				return !n || (n.alpha < 1 && c.cell.alpha == 1);
			};
			cubes.forEach(function (c) {
				var x = c.w[0], y = c.w[1], z = c.w[2], cell = c.cell;
				var faces = [];
				if (open(c, [0, 0, 1])) faces.push([[[x - hw, y - hw, z + hw], [x + hw, y - hw, z + hw], [x + hw, y + hw, z + hw], [x - hw, y + hw, z + hw]], 1, 1.25]);
				if (open(c, [px[0], px[1], 0])) faces.push([[[x + hw, y - hw, z - hw], [x + hw, y + hw, z - hw], [x + hw, y + hw, z + hw], [x + hw, y - hw, z + hw]], 0.78, 1.1]);
				if (open(c, [py[0], py[1], 0])) faces.push([[[x - hw, y + hw, z - hw], [x + hw, y + hw, z - hw], [x + hw, y + hw, z + hw], [x - hw, y + hw, z + hw]], 0.6, 1]);
				faces.forEach(function (face) {
					var color = shade(cell.color, (cell.lit && dim >= 1 ? face[2] : face[1]) * dim, cell.alpha);
					ctx.beginPath();
					face[0].forEach(function (p, i) { var q = screen(p); if (i == 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
					ctx.closePath();
					ctx.fillStyle = color;
					ctx.fill();
					// a thin edge in the same colour hides the hairline seams between cubes
					if (cell.alpha == 1) { ctx.strokeStyle = color; ctx.lineWidth = 0.6; ctx.stroke(); }
				});
			});
		});
	}

	// draw(ctx) on a w x h canvas, then onto ctx with an outline round everything drawn, 'width' pixels (2 if not given)
	function outlined(ctx, w, h, color, draw, width) {
		var d = width || 2;
		var picture = document.createElement('canvas');
		picture.width = w; picture.height = h;
		draw(picture.getContext('2d'));
		var shape = document.createElement('canvas');
		shape.width = w; shape.height = h;
		var s = shape.getContext('2d');
		s.drawImage(picture, 0, 0);
		s.globalCompositeOperation = 'source-in';
		s.fillStyle = color;
		s.fillRect(0, 0, w, h);
		[[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, -d], [-d, d], [d, d]].forEach(function (o) { ctx.drawImage(shape, o[0], o[1]); });
		ctx.drawImage(picture, 0, 0);
	}

	// The point on screen for (f, s, z) facing 'dir', for drawing extras over a model
	function project(dir, f, s, z, x, y, scale) {
		var F = FORWARD[dir], S = [-F[1], F[0]], k = scale || 1;
		var wx = f * F[0] + s * S[0], wy = f * F[1] + s * S[1];
		return [x + k * (wx - wy), y + k * ((wx + wy) / 2 - z)];
	}

	//=========================== THE BOARD SQUARE ======================

	// A board square's frame is 256 x 128: the diamond's corners, and the middle of each edge (by direction)
	var TILE = {
		corners: [[128, 0], [256, 64], [128, 128], [0, 64]],
		edge: { up: [192, 32], right: [192, 96], down: [64, 96], left: [64, 32] },
		centre: [128, 64]
	};

	// The diamond shrunk towards the centre by k (1 = the whole square)
	function diamond(ctx, k) {
		ctx.beginPath();
		TILE.corners.forEach(function (c, i) {
			var x = 128 + (c[0] - 128) * k, y = 64 + (c[1] - 64) * k;
			if (i == 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
		});
		ctx.closePath();
	}

	//=========================== PIXEL HEART ===========================

	// A chunky pixel heart on a 7 x 7 grid of 8-pixel cells, filling a 64 x 64 frame: the cells on its edge
	// darker, the inside bright. Each cell is split in 4 so the crack can zigzag down the middle.
	var HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
	var HEART_CRACK = [7, 7, 6, 6, 7, 7, 8, 8, 7, 7, 6, 6, 7, 7];   // per half-cell row: the first half-cell column of the right half
	var HEART_RED = { edge: '#c40d0d', fill: '#ff1a1a', crack: '#7a0606' };
	var HEART_GREY = { edge: '#5b5f60', fill: '#9b9fa0' };

	// half: undefined for the whole heart, or 'left' / 'right' for one side of it cracked off, its broken edge darkened
	function pixelHeart(ctx, colors, half) {
		var on = function (r, c) { return r >= 0 && r < 7 && c >= 0 && c < 7 && HEART[r].charAt(c) == 'X'; };
		for (var r2 = 0; r2 < 14; r2++) {
			for (var c2 = 0; c2 < 14; c2++) {
				var r = r2 >> 1, c = c2 >> 1;
				if (!on(r, c)) continue;
				var right = c2 >= HEART_CRACK[r2];
				if ((half == 'left' && right) || (half == 'right' && !right)) continue;
				var edge = !on(r - 1, c) || !on(r + 1, c) || !on(r, c - 1) || !on(r, c + 1);
				var broken = half && (c2 == HEART_CRACK[r2] - 1 || c2 == HEART_CRACK[r2]);
				ctx.fillStyle = broken ? colors.crack : (edge ? colors.edge : colors.fill);
				ctx.fillRect(4 + c2 * 4, 4 + r2 * 4, 4, 4);
			}
		}
	}

	//=========================== UI FRAMES =============================

	/*
	 * Frames every theme needs. style: {
	 *   factions: { blue: '#hex', red: '#hex' }   each side's colour (health bars, the selected piece's ring)
	 *   move, target                                  colours for move arrows and target markers
	 *   panel: { fill, edge, window }                 the menu button and info window (window: the info window's fill, if not fill)
	 * }
	 */
	function uiFrames(style) {
		var frames = [];
		var tile = function (name, paint) { frames.push({ name: name, w: 256, h: 128, source: { w: 256, h: 256, x: 0, y: 0 }, paint: paint }); };
		var glow = function (ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; };

		// move arrows: a chevron pointing the way of the move
		['up', 'right', 'down', 'left'].forEach(function (dir) {
			tile('moveable_' + dir, function (ctx) {
				var e = TILE.edge[dir], c = TILE.centre;
				var dx = e[0] - c[0], dy = e[1] - c[1];
				ctx.lineCap = 'round'; ctx.lineJoin = 'round';
				glow(ctx, style.move, 12);
				ctx.strokeStyle = style.move;
				ctx.lineWidth = 7;
				[-0.25, 0.15].forEach(function (t) {
					var tipX = c[0] + dx * (t + 0.35), tipY = c[1] + dy * (t + 0.35);
					ctx.beginPath();
					ctx.moveTo(tipX - dx * 0.35 - dy * 0.6, tipY - dy * 0.35 + dx * 0.15);
					ctx.lineTo(tipX, tipY);
					ctx.lineTo(tipX - dx * 0.35 + dy * 0.6, tipY - dy * 0.35 - dx * 0.15);
					ctx.stroke();
				});
				diamond(ctx, 0.8);
				ctx.lineWidth = 2;
				ctx.globalAlpha = 0.5;
				ctx.stroke();
			});
		});

		// target markers: brackets in each corner of the square
		var brackets = function (ctx, color, alpha, width) {
			ctx.globalAlpha = alpha;
			glow(ctx, color, 14);
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.lineCap = 'round';
			TILE.corners.forEach(function (c, i) {
				var prev = TILE.corners[(i + 3) % 4], next = TILE.corners[(i + 1) % 4];
				var x = 128 + (c[0] - 128) * 0.85, y = 64 + (c[1] - 64) * 0.85;
				ctx.beginPath();
				ctx.moveTo(x + (prev[0] - c[0]) * 0.22, y + (prev[1] - c[1]) * 0.22);
				ctx.lineTo(x, y);
				ctx.lineTo(x + (next[0] - c[0]) * 0.22, y + (next[1] - c[1]) * 0.22);
				ctx.stroke();
			});
		};
		// a square in range: a red border round it, cross-hatched inside (strong when there's a target on it)
		var hatched = function (ctx, alpha, width) {
			ctx.save();
			diamond(ctx, 0.84);
			ctx.clip();
			ctx.globalAlpha = alpha * 0.55;
			ctx.strokeStyle = style.target;
			ctx.lineWidth = 2.5;
			for (var i = -256; i < 256; i += 18) {
				ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 128); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 128); ctx.stroke();
			}
			ctx.restore();
			ctx.globalAlpha = alpha;
			glow(ctx, style.target, 12);
			ctx.strokeStyle = style.target;
			ctx.lineWidth = width;
			ctx.lineJoin = 'round';
			diamond(ctx, 0.84);
			ctx.stroke();
		};
		tile('shootable_on', function (ctx) { hatched(ctx, 1, 6); brackets(ctx, '#ffffff', 0.9, 4); });
		tile('shootable_on_over', function (ctx) { hatched(ctx, 1, 8); });
		tile('shootable_off', function (ctx) { hatched(ctx, 0.55, 3); });
		tile('blankTile', function () { });

		// the selected piece: a glowing ring in its side's colour
		['blue', 'red'].forEach(function (faction) {
			tile(faction + '_shooter', function (ctx) {
				var color = style.factions[faction];
				glow(ctx, color, 16);
				ctx.strokeStyle = color;
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.ellipse(128, 64, 90, 45, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.globalAlpha = 0.18;
				ctx.fillStyle = color;
				ctx.fill();
			});
		});

		// shot patterns for the info window: the piece in the middle, the squares it can shoot in red
		Object.keys(shootArray).forEach(function (pattern) {
			frames.push({
				name: pattern, w: 128, h: 128, paint: function (ctx) {
					var cell = 16, n = 7, start = (128 - n * cell) / 2;
					var hit = {};
					shootArray[pattern].forEach(function (list) { list.forEach(function (d) { hit[(d[0] + 3) + ',' + (d[1] + 3)] = true; }); });
					for (var x = 0; x < n; x++) {
						for (var y = 0; y < n; y++) {
							ctx.shadowBlur = 0;
							ctx.fillStyle = 'rgba(255,255,255,0.12)';
							if (hit[x + ',' + y]) { ctx.fillStyle = style.target; glow(ctx, style.target, 8); }
							if (x == 3 && y == 3) ctx.fillStyle = '#ffffff';
							ctx.fillRect(start + x * cell + 1, start + y * cell + 1, cell - 2, cell - 2);
						}
					}
				}
			});
		});

		// pixel hearts for the info window: red, and grey for lost health
		frames.push({ name: 'health_heart', w: 64, h: 64, paint: function (ctx) { pixelHeart(ctx, HEART_RED); } });
		frames.push({ name: 'empty_health_heart', w: 64, h: 64, paint: function (ctx) { pixelHeart(ctx, HEART_GREY); } });
		// what a hit piece throws out: a heart that cracks in two (see AnimateEject)
		frames.push({ name: 'eject_heart', w: 64, h: 64, paint: function (ctx) { pixelHeart(ctx, HEART_RED); } });
		frames.push({ name: 'eject_heart_left', w: 64, h: 64, paint: function (ctx) { pixelHeart(ctx, HEART_RED, 'left'); } });
		frames.push({ name: 'eject_heart_right', w: 64, h: 64, paint: function (ctx) { pixelHeart(ctx, HEART_RED, 'right'); } });

		// health bars over the pieces: health_<faction>_<full health>_<health>
		['blue', 'red'].forEach(function (faction) {
			[1, 2, 3, 4].forEach(function (full) {
				for (var h = 0; h <= full; h++) {
					(function (h) {
						frames.push({
							name: 'health_' + faction + '_' + full + '_' + h, w: full * 15 + 9, h: 18, paint: function (ctx) {
								ctx.fillStyle = 'rgba(0,0,0,0.7)';
								ctx.fillRect(0, 0, full * 15 + 9, 18);
								for (var i = 0; i < full; i++) {
									ctx.shadowBlur = 0;
									ctx.fillStyle = 'rgba(90,90,100,0.9)';
									if (i < h) { ctx.fillStyle = style.factions[faction]; glow(ctx, style.factions[faction], 6); }
									ctx.fillRect(5 + i * 15, 4, 12, 10);
								}
							}
						});
					})(h);
				}
			});
		});

		// the menu button
		frames.push({
			name: 'control_panel', w: 128, h: 128, paint: function (ctx) {
				ctx.fillStyle = style.panel.fill;
				ctx.beginPath();
				ctx.roundRect ? ctx.roundRect(8, 8, 112, 112, 20) : ctx.rect(8, 8, 112, 112);
				ctx.fill();
				glow(ctx, style.panel.edge, 14);
				ctx.strokeStyle = style.panel.edge;
				ctx.lineWidth = 6;
				ctx.stroke();
				ctx.lineCap = 'round';
				ctx.lineWidth = 10;
				[40, 64, 88].forEach(function (y) {
					ctx.beginPath();
					ctx.moveTo(34, y);
					ctx.lineTo(94, y);
					ctx.stroke();
				});
			}
		});

		// the info window behind the selected piece's picture
		frames.push({
			// short enough (it sits at y 580) that its rounded bottom edge shows on screen
			name: 'info_window', w: 448, h: 216, paint: function (ctx) {
				ctx.fillStyle = style.panel.window || style.panel.fill;
				ctx.beginPath();
				ctx.roundRect ? ctx.roundRect(6, 6, 436, 202, 24) : ctx.rect(6, 6, 436, 202);
				ctx.fill();
				ctx.save();
				ctx.clip();
				ctx.fillStyle = 'rgba(255,255,255,0.04)';
				for (var y = 8; y < 250; y += 4)
					ctx.fillRect(6, y, 436, 1);
				ctx.restore();
				glow(ctx, style.panel.edge, 16);
				ctx.strokeStyle = style.panel.edge;
				ctx.lineWidth = 5;
				ctx.stroke();
			}
		});
		return frames;
	}

	//=========================== GLITCH FONT ===========================

	// The characters the game's texts use
	var CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789! ';

	/*
	 * A glitch font for Phaser: heavy capital letters in the face colour, with a copy offset left and one offset
	 * right in two other colours (an RGB split), cut by thin gaps with a slice or two shoved sideways.
	 * style: { face, left, right }. Returns { canvas, xml } for game.cache.addBitmapFont.
	 */
	function glitchFont(style) {
		var px = 120, cellH = Math.round(px * 1.2), pad = Math.round(px * 0.12);
		var css = '900 ' + px + 'px "Arial Black", "Segoe UI Black", "Roboto Black", "Helvetica Neue", Arial, sans-serif';
		var measure = document.createElement('canvas').getContext('2d');
		measure.font = css;

		// lay the letters out in rows
		var width = 2048, x = 0, y = 0, spots = [];
		CHARACTERS.split('').forEach(function (ch) {
			var w = Math.ceil(measure.measureText(ch == ' ' ? 'I' : ch.toUpperCase()).width);
			var cellW = w + pad * 2;
			if (x + cellW > width) { x = 0; y += cellH; }
			spots.push({ ch: ch, x: x, y: y, w: w, cellW: cellW });
			x += cellW;
		});
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = y + cellH;
		var ctx = canvas.getContext('2d');

		var xml = '<font><info face="glitch" size="150" bold="1" italic="0" charset="" unicode="" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="0,0" outline="0"/>' +
			'<common lineHeight="' + cellH + '" base="' + Math.round(px * 0.95) + '" scaleW="' + canvas.width + '" scaleH="' + canvas.height + '" pages="1" packed="0"/>' +
			'<pages><page id="0" file="glitch.png"/></pages><chars count="' + spots.length + '">';

		spots.forEach(function (spot) {
			if (spot.ch != ' ') {
				var letter = DrawCanvas(spot.cellW, cellH, function (g) {
					g.font = css;
					g.textBaseline = 'alphabetic';
					var draw = function (dx, color) { g.fillStyle = color; g.fillText(spot.ch.toUpperCase(), pad + dx, px * 0.98); };
					draw(-px * 0.05, style.left);
					draw(px * 0.05, style.right);
					draw(0, style.face);
				});
				ctx.drawImage(letter, spot.x, spot.y);
				// thin gaps across the letter, and a slice shoved sideways
				var rnd = random(spot.ch.charCodeAt(0) * 31 + 5);
				for (var cut = 0; cut < 2; cut++)
					ctx.clearRect(spot.x, spot.y + px * (0.25 + rnd() * 0.65), spot.cellW, Math.max(2, px * 0.025));
				var sy = Math.round(px * (0.2 + rnd() * 0.6)), sh = Math.round(px * (0.06 + rnd() * 0.1)), shift = Math.round((rnd() - 0.5) * px * 0.12);
				ctx.clearRect(spot.x, spot.y + sy, spot.cellW, sh);
				ctx.drawImage(letter, 0, sy, spot.cellW, sh, spot.x + shift, spot.y + sy, spot.cellW, sh);
			}
			xml += '<char id="' + spot.ch.charCodeAt(0) + '" x="' + spot.x + '" y="' + spot.y + '" width="' + spot.cellW + '" height="' + cellH +
				'" xoffset="' + (-pad) + '" yoffset="0" xadvance="' + Math.round(spot.w + px * 0.08) + '" page="0" chnl="15"/>';
		});
		xml += '</chars></font>';
		return { canvas: canvas, xml: xml };
	}

	return {
		Model: Model,
		render: render,
		glitchFont: glitchFont,
		pixelate: pixelate,
		voxelGroups: voxelGroups,
		renderVoxels: renderVoxels,
		outlined: outlined,
		project: project,
		shade: shade,
		rgb: rgb,
		random: random,
		TILE: TILE,
		diamond: diamond,
		uiFrames: uiFrames
	};
})();
