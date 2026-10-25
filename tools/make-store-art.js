/*
 * Makes the Google Play pictures from the running game, into store/:
 *   screenshot-1..4.png  1620 x 1080 (the game's own 3:2 shape, filling the picture)
 *   feature-graphic.png  1024 x 500, the board with the title in the game's own lettering
 *
 * Serve App1/Assets first (python -m http.server 8766 in App1/Assets), then from the repo root:
 *   node tools/make-store-art.js
 */
const path = require('path');
let playwright;
try { playwright = require('playwright'); }
catch (e) { playwright = require('C:/DEV/Repositories/GitHub/harrier-carrier-playwright-tests/node_modules/playwright'); }
const store = path.join(__dirname, '..', 'store');

(async () => {
	const browser = await playwright.chromium.launch({ headless: false, slowMo: 50 });
	const page = await browser.newPage({ viewport: { width: 1620, height: 1080 } });
	await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
	await page.goto('http://localhost:8766/index.html');
	await page.waitForFunction(() => document.getElementById('loader').style.display === 'none', null, { timeout: 60000 });
	const shot = (name) => page.screenshot({ path: path.join(store, name) });

	// 1: the title over the board as the game starts
	await page.waitForTimeout(700);
	await shot('screenshot-1.png');

	// 2: mid-game, a piece picked: its moves, its targets and the info window
	await page.evaluate(() => { SetRobot('blue', true); SetRobot('red', true); });
	await page.waitForTimeout(14000);
	await page.evaluate(() => { SetRobot('blue', false); SetRobot('red', false); });
	await page.waitForTimeout(2500);
	await page.evaluate(() => {
		// tap the first piece of the side to play
		var side = turnStatus.currentTurnFaction;
		var s = isoGroupPieces.children.filter(function (p) { return p.frameName && p.frameName.indexOf(side + '_') == 0 && p.inputEnabled; })[0];
		if (s) s.events.onInputDown.dispatch(s, game.input.activePointer);
	});
	await page.waitForTimeout(800);
	await shot('screenshot-2.png');

	// 3: the gangs' special attack: the skull fills the screen and the city glitches
	await page.evaluate(() => { AnimateSpecialAttack('red'); SpecialAttackText('red'); });
	await page.waitForTimeout(750);
	await shot('screenshot-3.png');
	await page.waitForTimeout(3000);

	// 4: the advert blimp drifting over the city
	await page.evaluate(() => {
		var f = THEME.flyovers.filter(function (f) { return f.frame == 'flyover_blimp'; })[0];
		if (typeof AnimateFlyover == 'function') AnimateFlyover(f);
	});
	await page.waitForTimeout(5500);
	await shot('screenshot-4.png');

	// the feature graphic: the board with the title on one line, menu and badges hidden
	await page.setViewportSize({ width: 1200, height: 800 });
	await page.waitForTimeout(800);
	await page.evaluate(() => {
		[UI.controlPanel, UI.blueBadge_1, UI.blueBadge_2, UI.redBadge_1, UI.redBadge_2, UI.robotLabels.blue, UI.robotLabels.red]
			.forEach(function (o) { if (o) o.visible = false; });
		DestroyInfoWindow();
		var title = game.add.bitmapText(0, 170, 'fontYellow', THEME.words.title.join(' '), 76);
		title.x = (game.width - title.width) / 2;
	});
	await page.waitForTimeout(300);
	await page.evaluate(() => { game.paused = true; });
	const big = await page.screenshot({ clip: { x: 0, y: 140, width: 1200, height: 586 } });
	await page.setContent('<canvas id="c" width="1024" height="500"></canvas>');
	const url = await page.evaluate(async (b64) => {
		var img = new Image();
		img.src = 'data:image/png;base64,' + b64;
		await img.decode();
		var c = document.getElementById('c'), ctx = c.getContext('2d');
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, 0, 0, 1024, 500);
		return c.toDataURL('image/png');
	}, big.toString('base64'));
	require('fs').writeFileSync(path.join(store, 'feature-graphic.png'), Buffer.from(url.split(',')[1], 'base64'));
	console.log('made store/screenshot-1..4.png and store/feature-graphic.png');
	await browser.close();
})();
