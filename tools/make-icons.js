/*
 * Makes the app icons from the theme's icon drawing (CYBERPUNK_GRAPHICS.icon) in the game's own code:
 * the launcher icons in App1/Resources/drawable*, and the 512 x 512 Google Play icon in store/.
 *
 * Serve App1/Assets first (python -m http.server 8766 in App1/Assets), then from the repo root:
 *   node tools/make-icons.js
 * Needs Playwright: found in this folder's node_modules, or in the harrier-carrier-playwright-tests repo.
 */
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); }
catch (e) { playwright = require('C:/DEV/Repositories/GitHub/harrier-carrier-playwright-tests/node_modules/playwright'); }

const root = path.join(__dirname, '..');
const SIZES = [
	['App1/Resources/drawable-mdpi/icon.png', 48],
	['App1/Resources/drawable-hdpi/icon.png', 72],
	['App1/Resources/drawable-xhdpi/icon.png', 96],
	['App1/Resources/drawable-xxhdpi/icon.png', 144],
	['App1/Resources/drawable-xxxhdpi/icon.png', 192],
	['App1/Resources/drawable/icon.png', 72],
	['store/icon-512.png', 512]
];

(async () => {
	const browser = await playwright.chromium.launch({ headless: false, slowMo: 50 });
	const page = await browser.newPage();
	await page.goto('http://localhost:8766/index.html');
	await page.waitForFunction(() => typeof CYBERPUNK_GRAPHICS != 'undefined');
	const images = await page.evaluate((sizes) => {
		var big = CYBERPUNK_GRAPHICS.icon();
		return sizes.map(function (s) {
			// shrink in halves for a smooth small icon
			var src = big;
			while (src.width / 2 >= s[1]) {
				var half = document.createElement('canvas');
				half.width = half.height = src.width / 2;
				var hctx = half.getContext('2d');
				hctx.imageSmoothingQuality = 'high';
				hctx.drawImage(src, 0, 0, half.width, half.height);
				src = half;
			}
			var c = document.createElement('canvas');
			c.width = c.height = s[1];
			var ctx = c.getContext('2d');
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(src, 0, 0, s[1], s[1]);
			return c.toDataURL('image/png');
		});
	}, SIZES);
	SIZES.forEach(([file], i) => {
		const out = path.join(root, file);
		fs.mkdirSync(path.dirname(out), { recursive: true });
		fs.writeFileSync(out, Buffer.from(images[i].split(',')[1], 'base64'));
		console.log('made', file);
	});
	await browser.close();
})();
