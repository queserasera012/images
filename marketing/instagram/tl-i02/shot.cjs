const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.goto('http://127.0.0.1:8791/slides.html', { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(() => document.fonts.check('900 40px "Zen Maru Gothic"')));
  for (let i = 1; i <= 5; i++) await pg.locator('#s' + i).screenshot({ path: `tl-i02-${i}.jpg`, type: 'jpeg', quality: 90 });
  await b.close();
})();
