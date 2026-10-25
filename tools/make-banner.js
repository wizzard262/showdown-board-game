/*
 * Makes the wide banner for the Harrier Carrier home page: the game at twice size, mid-game, with its own title
 * lettering, the menu button and badges hidden, cropped to 8:3. Saves store/showdown_banner.png (2400 x 900);
 * the website copies are made from it.
 *
 * Serve App1/Assets first (python -m http.server 8766 in App1/Assets), then from the repo root:
 *   node tools/make-banner.js
 */
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); }
catch (e) { playwright = require('C:/DEV/Repositories/GitHub/harrier-carrier-playwright-tests/node_modules/playwright'); }

(async () => {
	const browser = await playwright.chromium.launch({ headless: false, slowMo: 50 });
	const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
	await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
	await page.goto('http://localhost:8766/index.html');
	await page.addStyleTag({ content: 'canvas { image-rendering: pixelated; }' });
	await page.waitForFunction(() => document.getElementById('loader').style.display === 'none', null, { timeout: 60000 });
	// the robots play a few goes, so the pieces are out on the board
	await page.evaluate(() => { SetRobot('blue', true); SetRobot('red', true); });
	await page.waitForTimeout(16000);
	await page.evaluate(() => {
		SetRobot('blue', false); SetRobot('red', false);
		[UI.controlPanel, UI.blueBadge_1, UI.blueBadge_2, UI.redBadge_1, UI.redBadge_2, UI.robotLabels.blue, UI.robotLabels.red]
			.forEach(function (o) { if (o) o.visible = false; });
		DestroyInfoWindow();
		// the title on one line across the top of the banner, in the game's own lettering
		var title = game.add.bitmapText(0, 190, 'fontYellow', THEME.words.title.join(' '), 76);
		title.x = (game.width - title.width) / 2;
	});
	await page.waitForTimeout(300);
	await page.evaluate(() => { game.paused = true; });
	await page.screenshot({ path: path.join(__dirname, '..', 'store', 'showdown_banner.png'), clip: { x: 0, y: 170, width: 1200, height: 450 } });
	console.log('made store/showdown_banner.png');
	await browser.close();
})();
