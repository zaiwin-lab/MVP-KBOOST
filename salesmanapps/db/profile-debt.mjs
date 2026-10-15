/* Debt ageing, last payment, and the figures that open the list behind them. */
import { browser, page } from './harness.mjs';
/* Screenshots are evidence of a run, not part of the repository. */
import { mkdirSync } from 'node:fs';
mkdirSync('.shots', { recursive: true });
const b = await browser();
const pg = await page(b, { width: 390, height: 844 });
const errs = [], fails = [];
pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 150)); });
const ok = (n, v) => console.log(('  ' + n).padEnd(36), v);
const check = (n, got, want) => { const g = String(got) === String(want);
  if (!g) fails.push(`${n}: ${got} != ${want}`);
  console.log(('  ' + n).padEnd(36), (g ? 'PASS ' : 'FAIL ') + got + (g ? '' : ' want ' + want)); };
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

console.log('=== an outlet with overdue invoices ===');
await open('Kedai Maju');
ok('figures', (await T('.pstat')));
check('two figures are buttons', await pg.locator('.pstat button').count(), 2);
check('hutang names the invoice count', /Hutang · \d+ invois/.test(await T('.pstat')), true);
check('ageing bar shown', await pg.locator('.agebar').count(), 1);
ok('ageing bar', await T('.agebar'));

/* the figures must agree with the ledger, not just look plausible */
const truth = await pg.evaluate(() => {
  const c = cur().id; const d = debtOf(c);
  const open = INVS().filter(v => v.customer_id === c && v.status !== 'paid');
  const today = new Date(new Date().toDateString());
  const late = open.filter(v => new Date(new Date(v.due_at).toDateString()) < today);
  return { d, realCount: open.length, realOverdue: late.length,
           realOwed: +open.reduce((a, v) => a + (+v.total - +v.paid), 0).toFixed(2),
           realLate: +late.reduce((a, v) => a + (+v.total - +v.paid), 0).toFixed(2) };
});
check('unpaid count matches the ledger', truth.d.count, truth.realCount);
check('overdue count matches', truth.d.overdue, truth.realOverdue);
check('owed matches', truth.d.owed.toFixed(2), truth.realOwed.toFixed(2));
check('overdue amount matches', truth.d.lateAmt.toFixed(2), truth.realLate.toFixed(2));
check('oldest is a positive day count', truth.d.oldest > 0, true);
ok('oldest overdue (days)', truth.d.oldest);

console.log('\n--- last payment ---');
const txt = await T('.pcard');
check('Bayaran section present', /BAYARAN/i.test((await pg.locator('.psec').allInnerTexts()).join(' ')), true);
check('last payment row shown', /Bayaran Akhir/.test(txt), true);
ok('row', (txt.match(/Bayaran Akhir ([^A-Z]{5,70})/) || [])[1] || '?');
check('it is the real last payment', await pg.evaluate(() => {
  const p = lastPayOf(cur().id);
  const all = PAYS().filter(x => x.customer_id === cur().id);
  return !!p && all.every(x => new Date(x.paid_at) <= new Date(p.paid_at));
}), true);
await pg.screenshot({ path: '.shots/a-prof.png', fullPage: true });

console.log('\n=== the Hutang figure opens the chase list ===');
await pg.locator('.pstat button').first().click(); await pg.waitForTimeout(1400);
const rows = await pg.locator('.row').count();
ok('rows', rows);
check('rows match the unpaid count', rows, truth.realCount);
check('Sejarah Invois tab is highlighted',
  await pg.locator('.ctabs button.on, .tabrow button.on, button.on').first().innerText()
    .catch(() => '?'), 'Sejarah Invois');
check('every row carries a due date', await pg.locator('.row .due').count(), rows);
check('late ones are marked', await pg.locator('.row .due.late').count(), truth.realOverdue);
const order = await pg.locator('.row .due').allInnerTexts();
ok('first row', order[0].replace(/\s+/g, ' '));
check('oldest first', /^Lewat/.test(order[0]), true);
await pg.screenshot({ path: '.shots/a-chase.png', fullPage: true });

console.log('\n=== the sales figure opens the full history ===');
await pg.click('[data-a="csub"][data-v="general"]'); await pg.waitForTimeout(1200);
await pg.locator('.pstat button').nth(1).click(); await pg.waitForTimeout(1400);
const all = await pg.locator('.row').count();
check('shows more than just the unpaid', all > truth.realCount, true);
check('no due lines on the full history', await pg.locator('.row .due').count(), 0);
ok('rows', all);

console.log('\n=== an outlet that owes nothing ===');
await open('Kedai Barokah');
ok('figures', await T('.pstat'));
check('no ageing bar', await pg.locator('.agebar').count(), 0);
check('reads Tiada', /Tiada/.test(await T('.pstat')), true);
await pg.locator('.pstat button').first().click(); await pg.waitForTimeout(1300);
ok('empty state', await T('.empty'));
check('says the debt is clear', /sudah dijelaskan/.test(await T('.empty')), true);

console.log('\n=== the chase rows do not collide ===');
await open('Kedai Maju');
await pg.locator('.pstat button').first().click(); await pg.waitForTimeout(1400);
/* A long status used to wrap into the amount beside it. Measured, not eyed. */
const overlap = await pg.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.row').forEach((r, i) => {
    const st = r.querySelector('.st'), amt = r.querySelector('.amt');
    if (!st || !amt) return;
    const a = st.getBoundingClientRect(), b = amt.getBoundingClientRect();
    const sameLine = Math.abs(a.top - b.top) < 6;
    if (sameLine && a.right > b.left + 1) bad.push(i);
  });
  return bad.length ? bad.join(',') : 'none';
});
check('no status overlapping an amount', overlap, 'none');
check('customer name not repeated per row', await pg.evaluate(() =>
  [...document.querySelectorAll('.row')].filter(r => /Kedai Maju/.test(r.innerText)).length), 0);
check('each row names its document', await pg.evaluate(() =>
  [...document.querySelectorAll('.row .code')].every(e => /^(INV|SO)\d{6}$/.test(e.textContent.trim()))), true);
ok('first row', (await T('.row')).slice(0, 80));
await pg.screenshot({ path: '.shots/a-chase2.png', fullPage: true });

console.log('\n=== the other two lists keep their customer names ===');
/* vSales, vHutang and custInvois render near-identical rows. Changing the one
   inside a profile must not touch the two that list many customers. */
await pg.click('.tabs [data-v="home"]'); await pg.waitForTimeout(800);
await pg.click('[data-v="hutang"]'); await pg.waitForTimeout(1400);
check('List Hutang still names the customer', await pg.evaluate(() =>
  [...document.querySelectorAll('.row .nm')].some(e => e.textContent.trim().length > 3)), true);
ok('a List Hutang row', (await T('.row')).slice(0, 72));
await pg.click('[data-a="pop"]'); await pg.waitForTimeout(800);
await pg.click('[data-v="sales"]'); await pg.waitForTimeout(1400);
check('Sales History still names the customer', await pg.evaluate(() =>
  [...document.querySelectorAll('.row .nm')].some(e => e.textContent.trim().length > 3)), true);
ok('a Sales History row', (await T('.row')).slice(0, 72));

console.log('\n=== narrow phone ===');
await open('Kedai Maju');
for (const w of [390, 360]) {
  await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(500);
  const over = await pg.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no sideways scroll at ${w}`, over <= 0, true);
}

console.log('\n' + (fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed'));
console.log('errors: ' + (errs.length ? '\n  ' + errs.join('\n  ') : 'none'));
await b.close();
