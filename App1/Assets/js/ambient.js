/*
 * Showdown - ambience
 * The theme's random fly-overs, background sounds and weather (snow, rain...), run from update() every frame.
 */

var FPS = 60;
var AMBIENT_EVENTS = [];

// A random whole number of seconds from range[0] up to (not including) range[1], in frames
function RandomFrames(range) {
	return (Math.floor(Math.random() * (range[1] - range[0])) + range[0]) * FPS;
}

// Each event runs its action every 'interval' frames, then picks a new random interval.
function InitAmbience() {
	AMBIENT_EVENTS = [];
	var add = function (first, every, action) {
		AMBIENT_EVENTS.push({ interval: Math.round(first * FPS), counter: 0, action: action, next: function () { return RandomFrames(every); } });
	};

	if (THEME.weather && THEME.weather.gusts)
		add(1, [1, 21], changeWindDirection);

	(THEME.flyovers || []).forEach(function (flyover) {
		add(flyover.first, flyover.every, function () { AnimateFlyover(flyover); });
	});

	// background sounds take turns: each lasts about 16s and one starts every 40-56s,
	// so one of them is playing about a third of the time, never two at once
	if (THEME.ambience && THEME.ambience.length)
		add(1, [40, 57], PlayAmbience);

	if (THEME.critter)
		add(THEME.critter.first, THEME.critter.every, function () { PlaySound(THEME.critter.sound); });

	(THEME.nowAndThen || []).forEach(function (extra) {
		add(extra.first, extra.every, function () { PlaySound(extra.sound); });
	});
}

var ambienceTurn = 0;

function PlayAmbience() {
	PlaySound(THEME.ambience[ambienceTurn]);
	ambienceTurn = (ambienceTurn + 1) % THEME.ambience.length;
}

function IncrementAnimationAndAudioCounters() {
	AMBIENT_EVENTS.forEach(function (event) {
		event.counter++;
		if (event.counter >= event.interval) {
			event.action();
			event.interval = event.next();
			event.counter = 0;
		}
	});
}

//=========================== WEATHER ===================================

function CreateWeather() {
	var w = THEME.weather;
	var frames = [];
	for (var i = 0; i < w.frames; i++)
		frames.push(i);

	var emitter = UI.weatherEmitter = game.add.emitter(game.world.centerX, -32, w.count);
	emitter.makeParticles('weather', frames);
	emitter.maxParticleScale = w.maxScale;
	emitter.minParticleScale = w.minScale;
	emitter.setYSpeed(w.ySpeed[0], w.ySpeed[1]);
	if (w.xSpeed)
		emitter.setXSpeed(w.xSpeed[0], w.xSpeed[1]);
	emitter.gravity = 0;
	emitter.width = game.world.width * 1.5;
	emitter.minRotation = w.rotation[0];
	emitter.maxRotation = w.rotation[1];
	StartWeather();
}

function StartWeather() {
	UI.weatherEmitter.revive();
	UI.weatherEmitter.start(false, THEME.weather.lifespan, THEME.weather.every);
}

// Clear the particles but keep them (destroying them left nothing to start the weather again with)
function StopWeather() {
	UI.weatherEmitter.forEachAlive(function (particle) { particle.kill(); });
	UI.weatherEmitter.kill();
}

// A gust: change the sideways speed of the weather
function changeWindDirection() {
	var max = 60;
	var multi = Math.floor((max + 30) / 4);
	var frag = (Math.floor(Math.random() * 30) - multi);

	max = max + frag;

	if (max > 60) max = 60;
	if (max < -60) max = -60;

	setXSpeed(UI.weatherEmitter, max);
}

function setXSpeed(emitter, max) {
	emitter.setXSpeed(max - 20, max);
	emitter.forEachAlive(setParticleXSpeed, this, max);
}

function setParticleXSpeed(particle, max) {
	particle.body.velocity.x = max - Math.floor(Math.random() * 200);
}
