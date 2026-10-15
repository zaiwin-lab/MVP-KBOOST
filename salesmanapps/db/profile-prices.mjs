/* Approved special prices, and what an outlet is waiting on.
   ---------------------------------------------------------------------------
   The two readings this adds to the reseller profile are both facts that used
   to live only on the office's screen, so each check compares the screen with
   the underlying rows rather than with itself. The drift warnings are
   exercised by moving the catalogue prices in the page and redrawing, because
   no outlet has drifted yet and a warning nobody has seen render is not a
   warning. */
import { browser, page } from './harness.mjs';
/* Screenshots are evidence of a run, not part of the repository. */
import { mkdirSync } from 'node:fs';
mkdirSync('.shots', { recursive: true });
const b = await browser();
const pg = await page(b, { width: 390, height: 844 });
const errs = [], fails = [];
pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
let expect400 = false;
pg.on('console', m => { if (m.type() !== 'error') return;
  /* The floor guard below is asked to refuse a request, and the browser logs
     the refusal as a 400. Every other console error is a real fault. */
  if (expect400 && /400/.test(m.text())) return;
  errs.push('CONSOLE ' + m.text().slice(0, 150)); });
const ok = (n, v) => console.log(('  ' + n).padEnd(38), v);
const check = (n, got, want) => { const g = String(got) === String(want);
  if (!g) fails.push(`${n}: ${got} != ${want}`);
  console.log(('  ' + n).padEnd(38), (g ? 'PASS ' : 'FAIL ') + got + (g ? '' : ' want ' + want)); };
const T = async s => (await pg.locator(s).first().innerText().catch(() => 'NONE')).replace(/\s+/g, ' ');
const ALL = async s => (await pg.locator(s).allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');

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

/* ---------------------------------------------------------------------- 4 */
console.log('=== an outlet with an approved special price ===');
await open('Pasar Mini Abadi');
check('Harga Khas section present', /HARGA KHAS/i.test(await ALL('.psec')), true);
check('one approved price shown', await pg.locator('.pprice').count(), 1);
ok('the row', await T('.prow:has(.pprice)'));

/* the screen against customer_prices, not against the screen */
const truth = await pg.evaluate(() => {
  const px = pricesOf(cur().id);
  return px.live.map(x => ({ name: x.p.name, price: x.price, list: x.list,
    floor: x.floor, cut: +x.cut.toFixed(1),
    src: +DB.custPrices.find(y => y.customer_id === cur().id && y.product_id === x.p.id).price,
    srcList: +DB.products.find(q => q.id === x.p.id).price }));
});
check('price is the stored standing price', truth[0].price, truth[0].src);
check('struck price is the list price', truth[0].list, truth[0].srcList);
check('approved is below list', truth[0].price < truth[0].list, true);
check('approved is at or above floor', truth[0].price >= truth[0].floor, true);
const shown = await T('.prow:has(.pprice)');
check('list price appears struck out', shown.includes(truth[0].list.toFixed(2)), true);
check('approved price appears', shown.includes(truth[0].price.toFixed(2)), true);
check('discount chip matches the figures',
  (await T('.pprice .cut')).replace(/[^0-9.]/g, ''), String(truth[0].cut));
check('it names who approved it and when', /Diluluskan \d/.test(shown), true);
check('no drift warning on a healthy price', await pg.locator('.drift').count(), 0);

/* the reason the section exists: this price is what an order opens at */
console.log('\n--- the standing price is what the order screen opens at ---');
const atOrder = await pg.evaluate(async () => {
  const c = cur().id;
  const x = DB.custPrices.find(y => y.customer_id === c);
  return { approved: +x.price, product: x.product_id };
});
await pg.click('[data-a="takeorder"]'); await pg.waitForTimeout(1600);
const opened = await pg.locator(`input[data-op="${atOrder.product}"]`).inputValue().catch(() => '?');
check('order opens at the approved price', opened, atOrder.approved.toFixed(2));
check('and is labelled as approved', /Harga diluluskan/.test(await T('.block')), true);
await pg.click('.bk, [data-a="back"]').catch(() => {}); await pg.waitForTimeout(1200);

/* ---------------------------------------------------------------------- 5 */
console.log('\n=== what the outlet is waiting on ===');
await open('Pasar Mini Abadi');
check('waiting panel shown', await pg.locator('.waitbar').count(), 1);
check('it is tappable for a salesman', await pg.locator('button.waitbar').count(), 1);
ok('panel', await T('.waitbar'));
const wt = await pg.evaluate(() => {
  const w = waitingOn(cur().id);
  const c = cur().id;
  return { n: w.length, kinds: w.map(x => x.k),
    realPrice: DB.priceReqs.filter(r => r.customer_id === c && r.status === 'pending').length,
    realCn: DB.creditNotes.filter(r => r.customer_id === c && r.status === 'pending').length,
    realPay: DB.payments.filter(p => p.customer_id === c && !p.approved_at && !p.rejected_at).length,
    sorted: w.every((x, i) => i === 0 || new Date(w[i - 1].at) <= new Date(x.at)) };
});
check('count matches the pending rows', wt.n, wt.realPrice + wt.realCn + wt.realPay);
check('rows in the panel match the count', await pg.locator('.wrow').count(), wt.n);
check('longest wait first', wt.sorted, true);
check('a pending price request is listed', wt.kinds.includes('Tukar Harga'), true);
check('each row says how long it has waited',
  (await ALL('.wrow .d')).split('|').every(s => /hari/.test(s)), true);
check('it does not list stock requests', wt.kinds.includes('Request Stok'), false);
await pg.screenshot({ path: '.shots/b-prices.png', fullPage: true });

console.log('\n--- tapping it opens Permohonan Saya ---');
await pg.click('button.waitbar'); await pg.waitForTimeout(1500);
check('Permohonan Saya opened', /Permohonan Saya/i.test(await T('body')), true);
await open('Kedai Maju');

console.log('\n--- an outlet with a refused price and a payment in the air ---');
const kt = await pg.evaluate(() => ({
  refused: refusedPrices(cur().id).length,
  wait: waitingOn(cur().id).map(x => x.k),
}));
check('a refusal is shown at the counter', kt.refused >= 1, true);
check('the refusal row is on the profile', /Ditolak/.test(await T('.pcard')), true);
ok('refusal', (await T('.prow:has-text("Ditolak")')) || '?');
check('the office reason is carried with it',
  /Harga lantai tidak boleh dilanggar/.test(await T('.pcard')), true);
check('an unconfirmed payment is waiting', kt.wait.includes('Bayaran'), true);

/* -------------------------------------------------------------- the drift */
console.log('\n=== drift: the prices it was approved against have moved ===');
await open('Pasar Mini Abadi');
const drift = async how => pg.evaluate(h => {
  const c = cur().id;
  const x = DB.custPrices.find(y => y.customer_id === c);
  const p = DB.products.find(q => q.id === x.product_id);
  if (h === 'floor') p.floor_price = (+x.price + 0.10).toFixed(2);
  if (h === 'list')  p.price = (+x.price - 0.10).toFixed(2);
  draw();
  return { price: +x.price, floor: +p.floor_price, list: +p.price };
}, how);

const f = await drift('floor'); await pg.waitForTimeout(500);
check('floor above the standing price warns', await pg.locator('.drift').count(), 1);
check('the warning names the new floor',
  (await T('.drift')).includes(f.floor.toFixed(2)), true);
check('and says the order would be refused', /akan ditolak/.test(await T('.drift')), true);
ok('warning', await T('.drift'));

await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(9000);
await open('Pasar Mini Abadi');
const l = await drift('list'); await pg.waitForTimeout(500);
check('list below the standing price warns', await pg.locator('.drift').count(), 1);
check('it says the shop is paying more', /membayar lebih/.test(await T('.drift')), true);
ok('warning', await T('.drift'));
await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(9000);

/* --------------------------------------------------- an outlet with none */
console.log('\n=== an outlet with no special price says so ===');
await open('Kedai Maju');
check('no price rows', await pg.locator('.pprice').count(), 0);
check('it says there are none', /Tiada harga khas diluluskan/.test(await T('.pcard')), true);
check('and that orders open at the list price',
  /harga senarai/i.test(await T('.pcard')), true);
check('Mohon is still offered', await pg.locator('[data-a="mohon"]').count(), 1);

/* ----------------------------------------------- the floor, server side */
console.log('\n=== the floor is enforced where the price is asked for ===');
expect400 = true;
const guard = await pg.evaluate(async () => {
  const c = DB.customers.find(x => x.name.includes('Kedai Maju'));
  const p = DB.products.find(q => +q.floor_price > 0.2);
  const below = await sb.rpc('request_price',
    { p_customer: c.id, p_product: p.id, p_price: +(+p.floor_price - 0.05).toFixed(2), p_note: 'ujian' });
  return { floor: +p.floor_price,
    msg: below.error ? below.error.message : 'ALLOWED',
    malay: below.error ? friendly(below.error.message) : '' };
});
check('a request below the floor is refused', /below the floor price/.test(guard.msg), true);
check('and the refusal is in Malay', /harga lantai/i.test(guard.malay), true);
ok('message', guard.malay);
expect400 = false;

/* --------------------------------------- nothing else on the page moved */
console.log('\n=== the other lists are untouched ===');
await pg.click('.tabs [data-v="home"]'); await pg.waitForTimeout(900);
await pg.click('[data-a="go"][data-v="hutang"]'); await pg.waitForTimeout(1500);
check('List Hutang still names its customers',
  await pg.evaluate(() => document.querySelectorAll('.row .nm').length > 0), true);
check('no waiting panel outside a profile', await pg.locator('.waitbar').count(), 0);

console.log('\n=== the same panel, read by the office ===');
await pg.evaluate(() => sb.auth.signOut()); await pg.waitForTimeout(1500);
await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(3000);
await pg.fill('#em', 'manager@salesportal.demo'); await pg.fill('#pw', 'portal2026');
await pg.click('#go'); await pg.waitForTimeout(13000);
await open('Pasar Mini Abadi');
check('the office sees the waiting panel', await pg.locator('.waitbar').count(), 1);
check('but it is not a button for them', await pg.locator('button.waitbar').count(), 0);
check('it points at the Kelulusan tab', /tab Kelulusan/.test(await T('.waitbar')), true);
check('the office sees the approved price too', await pg.locator('.pprice').count(), 1);
ok('panel', await T('.waitbar'));

console.log('\n=== narrow phone ===');
for (const w of [390, 360]) {
  await pg.setViewportSize({ width: w, height: 844 }); await pg.waitForTimeout(700);
  check(`no sideways scroll at ${w}`,
    await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
}
/* The waiting rows put a fixed label, a flexible description and a day count
   on one line, which is where a long product name would push the row wide. */
check('the waiting rows stay inside the panel', await pg.evaluate(() => {
  const bar = document.querySelector('.waitbar'); if (!bar) return 'no panel';
  return [...bar.querySelectorAll('.wrow')]
    .every(r => r.scrollWidth <= r.clientWidth + 1); }), true);
await pg.screenshot({ path: '.shots/b-prices-360.png', fullPage: true });

console.log('\n' + (errs.length ? 'PAGE ERRORS:\n  ' + errs.join('\n  ') : 'no page errors'));
console.log(fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed');
await b.close();
