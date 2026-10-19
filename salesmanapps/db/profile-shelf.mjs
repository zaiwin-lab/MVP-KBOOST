/* How long consignment stock has been sitting uncounted.
   ---------------------------------------------------------------------------
   Consignment goods are with the shop but not yet billed; counting them is
   what turns them into a bill. The profile listed quantities and never said
   how old they were, so a shelf last counted in August looked like one counted
   yesterday. The threshold is the outlet's own agreed service interval, not a
   number chosen here, so the checks compare the screen against service_days
   rather than against a constant. */
import { browser, page } from './harness.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('.shots', { recursive: true });
const b = await browser();
const errs = [], fails = [];
const ok = (n, v) => console.log(('  ' + n).padEnd(42), v);
const check = (n, got, want) => { const g = String(got) === String(want);
  if (!g) fails.push(`${n}: ${got} != ${want}`);
  console.log(('  ' + n).padEnd(42), (g ? 'PASS ' : 'FAIL ') + got + (g ? '' : ' want ' + want)); };

const open = async (email, pw) => {
  const pg = await page(b, { width: 390, height: 844 });
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    errs.push('CONSOLE ' + m.text().slice(0, 140)); });
  await pg.goto('http://localhost:8901/app/', { waitUntil: 'load' });
  await pg.waitForTimeout(2500);
  await pg.fill('#em', email); await pg.fill('#pw', pw);
  await pg.click('#go'); await pg.waitForTimeout(12000);
  return pg;
};
const T = async (pg, s) => (await pg.locator(s).first().innerText().catch(() => 'NONE')).replace(/\s+/g, ' ');
const openCust = async (pg, name) => {
  await pg.click('.tabs [data-v="home"]'); await pg.waitForTimeout(700);
  await pg.click('.tabs [data-v="reseller"]'); await pg.waitForTimeout(1000);
  await pg.fill('#q', name); await pg.waitForTimeout(900);
  await pg.locator('.rrow').first().click(); await pg.waitForTimeout(1600);
};
const stokRow = pg => pg.evaluate(() => {
  const r = [...document.querySelectorAll('.prow')]
    .find(x => (x.querySelector('.lb') || {}).textContent === 'Stok');
  return r ? r.textContent.replace(/\s+/g, ' ') : 'NONE';
});

/* ------------------------------------------------- a shelf long overdue */
console.log('=== Siti · Mini Market Rawang, uncounted since August ===');
const siti = await open('siti@salesportal.demo', 'portal2026');
await openCust(siti, 'Mini Market Rawang');
const truth = await siti.evaluate(() => {
  const c = custOf(cur().id); const s = shelfOf(c.id);
  const open = SHELF().filter(g => g.customer_id === c.id);
  const today = new Date(new Date().toDateString());
  const real = Math.max(...open.map(g =>
    Math.floor((today - new Date(new Date(g.sent_at).toDateString())) / 864e5)));
  return { oldest: s.oldest, real, total: s.total, drops: s.drops,
           realTotal: open.reduce((a, g) => a + g.qty_sent, 0),
           cycle: c.service_days, stale: shelfStale(c) };
});
ok('row', await stokRow(siti));
check('the age matches the drops behind it', truth.oldest, truth.real);
check('the total matches the shelf', truth.total, truth.realTotal);
ok('agreed interval (days)', truth.cycle);
check('it is past the agreed interval', truth.oldest > truth.cycle, true);
check('so it is flagged stale', truth.stale, truth.oldest);
check('the row says how long it has sat', /hari belum dikira/.test(await stokRow(siti)), true);
check('and names the date it arrived', /sejak \d/.test(await stokRow(siti)), true);
check('a warning is shown', await siti.locator('.drift').count(), 1);
check('it names the service interval', /kitaran servis/.test(await T(siti, '.drift')), true);
check('and says the stock is unbilled', /belum dibilkan/.test(await T(siti, '.drift')), true);
ok('warning', await T(siti, '.drift'));
check('Semak is offered', await siti.locator('[data-a="cgcheck"]').count(), 1);
await siti.screenshot({ path: '.shots/d-shelf.png', fullPage: true });

console.log('\n--- the threshold is the outlet\'s own interval ---');
const flip = await siti.evaluate(() => {
  const c = custOf(cur().id); const was = c.service_days;
  c.service_days = 365; draw();
  const lenient = { stale: shelfStale(c), warn: document.querySelectorAll('.drift').length };
  c.service_days = 7; draw();
  const strict = { stale: shelfStale(c), warn: document.querySelectorAll('.drift').length };
  c.service_days = was; draw();
  return { lenient, strict };
});
check('a long interval clears the warning', flip.lenient.warn, 0);
check('and it is no longer stale', flip.lenient.stale, 0);
check('a short interval brings it back', flip.strict.warn, 1);
check('and it is stale again', flip.strict.stale > 0, true);

console.log('\n--- the list says which shops need a count ---');
await siti.click('.tabs [data-v="reseller"]'); await siti.waitForTimeout(1200);
await siti.fill('#q', ''); await siti.waitForTimeout(900);
const chips = await siti.evaluate(() => {
  const rows = [...document.querySelectorAll('.rrow')];
  const flagged = rows.filter(r => r.querySelector('.chip.due')).length;
  const should = DB.customers.filter(c => c.active !== false && shelfStale(c)).length;
  return { flagged, should, sample: (rows.find(r => r.querySelector('.chip.due')) || {}).textContent };
});
check('every overdue shelf is flagged', chips.flagged, chips.should);
check('at least one is', chips.flagged > 0, true);
ok('a flagged row', (chips.sample || '?').replace(/\s+/g, ' ').trim());

/* ------------------------------------------------------ a fresh shelf */
console.log('\n=== Ahmad · Kedai Maju, counted two days ago on a 3-month cycle ===');
const ahmad = await open('ahmad@salesportal.demo', 'portal2026');
await openCust(ahmad, 'Kedai Maju');
ok('row', await stokRow(ahmad));
check('the age is still shown', /hari belum dikira/.test(await stokRow(ahmad)), true);
check('but no warning', await ahmad.locator('.drift').count(), 0);
check('and it is not stale', await ahmad.evaluate(() => shelfStale(custOf(cur().id))), 0);
check('nothing is flagged in his list', await ahmad.evaluate(() =>
  DB.customers.filter(c => c.active !== false && shelfStale(c)).length), 0);

console.log('\n--- an outlet that is not on consignment ---');
await openCust(ahmad, 'Pasar Mini Abadi');
const notCon = await stokRow(ahmad);
check('it says so plainly', /Bukan konsainan/.test(notCon), true);
check('with no age and no warning', /belum dikira/.test(notCon), false);
check('and no Semak button', await ahmad.locator('[data-a="cgcheck"]').count(), 0);

console.log('\n=== narrow phone ===');
for (const w of [390, 360]) {
  await siti.setViewportSize({ width: w, height: 844 }); await siti.waitForTimeout(600);
  check(`no sideways scroll at ${w}`, await siti.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 1), true);
}

console.log('\n' + (errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'no page errors'));
console.log(fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed');
await b.close();
