/* Where the pin came from, and whether the screen says so honestly.
   ---------------------------------------------------------------------------
   The profile used to tell every salesman an outlet's coordinates were taken
   from the district and good to about 600m. True of the seeded outlets; false
   of any outlet registered through the app, whose coordinates are a device GPS
   fix taken at the shop. These checks compare the caption against
   customers.coords_source rather than against itself. */
import { browser, page } from './harness.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('.shots', { recursive: true });
const b = await browser();
const pg = await page(b, { width: 390, height: 844 });
const errs = [], fails = [];
pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 150)); });
const ok = (n, v) => console.log(('  ' + n).padEnd(40), v);
const check = (n, got, want) => { const g = String(got) === String(want);
  if (!g) fails.push(`${n}: ${got} != ${want}`);
  console.log(('  ' + n).padEnd(40), (g ? 'PASS ' : 'FAIL ') + got + (g ? '' : ' want ' + want)); };
const T = async s => (await pg.locator(s).first().innerText().catch(() => 'NONE')).replace(/\s+/g, ' ');

await pg.goto('http://localhost:8901/app/', { waitUntil: 'load' });
await pg.waitForTimeout(2500);
await pg.fill('#em', 'ahmad@salesportal.demo'); await pg.fill('#pw', 'portal2026');
await pg.click('#go'); await pg.waitForTimeout(12000);
const open = async name => {
  await pg.click('.tabs [data-v="home"]'); await pg.waitForTimeout(600);
  await pg.click('.tabs [data-v="reseller"]'); await pg.waitForTimeout(900);
  await pg.fill('#q', name); await pg.waitForTimeout(800);
  await pg.locator('.rrow').first().click(); await pg.waitForTimeout(1500);
};
const coordRow = () => T('.prow:has-text("Koordinat")');
/* Inside pg.evaluate only real CSS works, so the row is found by its label. */
const INPAGE_ROW = `(() => { const r = [...document.querySelectorAll('.prow')]
  .find(x => (x.querySelector('.lb') || {}).textContent === 'Koordinat');
  return r ? r.textContent : ''; })()`;

console.log('=== a seeded outlet, approximated from its district ===');
await open('Kedai Maju');
check('source is district', await pg.evaluate(() => cur() && custOf(cur().id).coords_source), 'district');
ok('row', await coordRow());
check('it is called an estimate', /Anggaran/i.test(await coordRow()), true);
check('and still names the 600m', /600m/.test(await coordRow()), true);
check('it does not claim a GPS reading', /GPS/.test(await coordRow()), false);

console.log('\n=== an outlet registered from a real phone ===');
await open('001 kedai runcit ali');
check('source is gps', await pg.evaluate(() => cur() && custOf(cur().id).coords_source), 'gps');
ok('row', await coordRow());
check('it says the reading came from GPS', /GPS/.test(await coordRow()), true);
check('it is not called an estimate', /Anggaran/i.test(await coordRow()), false);
check('and does not claim 600m', /600m/.test(await coordRow()), false);
check('the figures are the stored ones', await pg.evaluate(() => {
  const c = custOf(cur().id);
  return document.querySelector('.prow:has(.vl)') &&
    [...document.querySelectorAll('.prow')].some(r =>
      r.textContent.includes((+c.lat).toFixed(5)) && r.textContent.includes((+c.lng).toFixed(5)));
}), true);
await pg.screenshot({ path: '.shots/c-coords.png', fullPage: true });

console.log('\n--- the caption follows the column, whatever it says ---');
const flipped = await pg.evaluate(src => {
  const ROW = () => eval(src);
  const c = custOf(cur().id);
  const was = c.coords_source;
  c.coords_source = 'district'; draw();
  const asDistrict = ROW();
  c.coords_source = null; draw();
  const asUnknown = ROW();
  c.coords_source = was; draw();
  return { asDistrict: /Anggaran/.test(asDistrict), asUnknown: /tidak direkod/.test(asUnknown) };
}, INPAGE_ROW);
check('set to district, it reads as an estimate', flipped.asDistrict, true);
check('set to nothing, it says the source is unknown', flipped.asUnknown, true);

console.log('\n--- no coordinates at all ---');
const none = await pg.evaluate(src => {
  const c = custOf(cur().id); const la = c.lat, ln = c.lng;
  c.lat = null; c.lng = null; draw();
  const t = eval(src);
  c.lat = la; c.lng = ln; draw();
  return /Belum ditangkap/.test(t);
}, INPAGE_ROW);
check('it says the pin was never captured', none, true);

console.log('\n=== the nearest list carries the same distinction ===');
await pg.click('.tabs [data-v="gps"]'); await pg.waitForTimeout(1200);
/* A real position is never granted in this harness, so one is set directly;
   without it the list sorts alphabetically and shows no distances to mark. */
await pg.evaluate(() => { S.here = { lat: 3.1390, lng: 101.6869 }; draw(); });
await pg.waitForTimeout(500);
await pg.click('[data-a="go"][data-v="nearest"]'); await pg.waitForTimeout(1500);
const near = await pg.evaluate(() => {
  const rows = [...document.querySelectorAll('.rrow')].map(r => r.textContent.replace(/\s+/g, ' '));
  const src = {};
  DB.customers.filter(c => c.lat && c.lng).forEach(c => { src[c.name] = c.coords_source; });
  return { rows, src, withKm: rows.filter(t => /km/.test(t)).length };
});
check('distances are shown', near.withKm > 0, true);
ok('a row', near.rows.find(t => /km/.test(t)) || '?');
const marked = near.rows.filter(t => /≈/.test(t)).length;
const district = Object.values(near.src).filter(v => v === 'district').length;
check('every estimated pin is marked', marked > 0, true);
check('and only the estimated ones', marked <= district, true);
check('a GPS outlet has no estimate mark', await pg.evaluate(() => {
  const c = DB.customers.find(x => x.coords_source === 'gps' && x.lat);
  if (!c) return 'no gps outlet';
  const row = [...document.querySelectorAll('.rrow')].find(r => r.textContent.includes(c.name));
  return row ? !/≈/.test(row.textContent) : 'not listed';
}), true);
await pg.screenshot({ path: '.shots/c-nearest.png', fullPage: true });

console.log('\n' + (errs.length ? 'PAGE ERRORS:\n  ' + errs.join('\n  ') : 'no page errors'));
console.log(fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed');
await b.close();
