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
/* This section used to lean on whatever happened to be pending in the demo
   data, and a person clearing the office queue broke it -- which is a fault in
   the test, not in the screen. It now raises its own request through the real
   function, asserts, and removes it again. Rows it only needs to *draw* are
   injected into the loaded data in the page instead, so no fixture has to
   survive somebody else using the app. */
console.log('\n=== what the outlet is waiting on ===');
await open('Pasar Mini Abadi');

const made = await pg.evaluate(async () => {
  const c = cur().id;
  /* A product with no request already waiting on it -- request_price refuses
     a second one -- asked for at a price that clears the floor. */
  const busy = DB.priceReqs.filter(r => r.customer_id === c && r.status === 'pending')
                           .map(r => r.product_id);
  const p = DB.products.find(q => !busy.includes(q.id) && +q.floor_price > 0);
  /* Three percent off, but never under the floor -- the function refuses that
     now, and this test is about the panel, not about the guard. */
  const want = +Math.max(+p.floor_price, +p.price * 0.97).toFixed(2);
  const { data, error } = await sb.rpc('request_price',
    { p_customer: c, p_product: p.id, p_price: want, p_note: 'ujian automatik' });
  return { id: data && data.request_id, product: p.id, name: p.name, want,
           err: error ? error.message : null };
});
check('a price request can be raised', made.err, 'null');
ok('raised', `${made.name} @ ${made.want}`);

await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(9000);
await open('Pasar Mini Abadi');
check('waiting panel shown', await pg.locator('.waitbar').count(), 1);
check('it is tappable for a salesman', await pg.locator('button.waitbar').count(), 1);
ok('panel', await T('.waitbar'));
const wt = await pg.evaluate(() => {
  const c = cur().id; const w = waitingOn(c);
  return { n: w.length, kinds: w.map(x => x.k),
    realPrice: DB.priceReqs.filter(r => r.customer_id === c && r.status === 'pending').length,
    realCn: DB.creditNotes.filter(r => r.customer_id === c && r.status === 'pending').length,
    realPay: DB.payments.filter(p => p.customer_id === c && !p.approved_at && !p.rejected_at).length,
    sorted: w.every((x, i) => i === 0 || new Date(w[i - 1].at) <= new Date(x.at)) };
});
check('count matches the pending rows', wt.n, wt.realPrice + wt.realCn + wt.realPay);
check('rows in the panel match the count', await pg.locator('.wrow').count(), wt.n);
check('longest wait first', wt.sorted, true);
check('the request just raised is listed', wt.kinds.includes('Tukar Harga'), true);
check('the panel names the product asked about',
  (await T('.waitbar')).includes(made.name), true);
check('each row says how long it has waited',
  (await ALL('.wrow .d')).split('|').every(s => /hari/.test(s)), true);
check('it does not list stock requests', wt.kinds.includes('Request Stok'), false);
await pg.screenshot({ path: '.shots/b-prices.png', fullPage: true });

console.log('\n--- tapping it opens Permohonan Saya ---');
await pg.click('button.waitbar'); await pg.waitForTimeout(1500);
check('Permohonan Saya opened', /Permohonan Saya/i.test(await T('body')), true);

console.log('\n--- and the panel is gone once nothing is waiting ---');
/* Removed through the app's own client, under the same policy that let him
   raise it -- no service-role key, and nothing left behind in the queue. */
const gone = await pg.evaluate(async id => {
  const del = await sb.from('price_requests').delete().eq('id', id);
  const left = await sb.from('price_requests').select('id').eq('id', id);
  return { err: del.error ? del.error.message : null, rows: (left.data || []).length };
}, made.id);
check('the test request is deleted', gone.err, 'null');
check('and no longer in the table', gone.rows, 0);
await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(9000);
await open('Pasar Mini Abadi');
check('no panel when nothing is waiting', await pg.evaluate(() =>
  waitingOn(cur().id).length === document.querySelectorAll('.wrow').length), true);

console.log('\n--- all three kinds draw, and a refusal carries its reason ---');
/* Drawn from injected rows rather than real ones: a credit note and an
   unconfirmed payment cannot be fabricated without moving real money, and the
   office may clear either at any moment. The refusal rules are asserted by
   identity, not by a count, because the live data contributes refusals too. */
const drawn = await pg.evaluate(() => {
  const c = cur().id;
  const mine = q => DB.custPrices.some(x => x.customer_id === c && x.product_id === q.id);
  const free = DB.products.filter(q => !mine(q));
  const owned = DB.products.find(mine);
  const appr = DB.custPrices.find(x => x.customer_id === c && x.product_id === owned.id);
  const inv = DB.invoices.find(v => v.customer_id === c) || { id: 'x', doc_no: 'INV000000' };
  const day = n => new Date(Date.now() - n * 864e5).toISOString();

  DB.priceReqs.push({ id: 't1', customer_id: c, product_id: free[0].id, status: 'pending',
    old_price: 9.9, new_price: 8.8, requested_at: day(4) });
  DB.creditNotes.push({ id: 't2', customer_id: c, invoice_id: inv.id, status: 'pending',
    amount: 25, reason: 'Barang rosak', requested_at: day(2) });
  DB.payments.push({ id: 't3', customer_id: c, invoice_id: inv.id, amount: 40,
    method: 'tunai', paid_at: day(1), approved_at: null, rejected_at: null });

  /* One refusal per product, so each exclusion rule is tested on its own
     rather than being masked by the one-per-product rule. */
  DB.priceReqs.push({ id: 't4', customer_id: c, product_id: free[0].id, status: 'rejected',
    old_price: 9.9, new_price: 7.7, decided_at: day(3),
    decide_note: 'Terlalu rendah untuk kedai ini' });
  DB.priceReqs.push({ id: 't5', customer_id: c, product_id: free[1].id, status: 'rejected',
    old_price: 9.9, new_price: 7.0, decided_at: day(90), decide_note: 'Sudah lama' });
  /* Refused before the standing price was approved, so the approval answers
     it and it should not reappear at the counter. */
  const before = new Date(new Date(appr.set_at).getTime() - 864e5).toISOString();
  DB.priceReqs.push({ id: 't6', customer_id: c, product_id: owned.id, status: 'rejected',
    old_price: 9.9, new_price: 6.5, decided_at: before, decide_note: 'Sebelum diluluskan' });
  draw();
  const ids = refusedPrices(c).map(r => r.id);
  return { kinds: waitingOn(c).map(x => x.k),
           recent: ids.includes('t4'), old: ids.includes('t5'), superseded: ids.includes('t6') };
});
check('all three kinds are listed', drawn.kinds.join(','), 'Tukar Harga,Credit Note,Bayaran');
check('longest wait first', (await ALL('.wrow .k')).startsWith('TUKAR HARGA'), true);
check('the credit note names its reason', /Barang rosak/.test(await T('.waitbar')), true);
check('a recent refusal is kept', drawn.recent, true);
check('one older than 60 days is dropped', drawn.old, false);
check('one answered by a later approval is dropped', drawn.superseded, false);
check('the refusal row is on the profile', /Ditolak/.test(await T('.pcard')), true);
check('and carries the office reason',
  /Terlalu rendah untuk kedai ini/.test(await T('.pcard')), true);
check('the old refusal is not shown', /Sudah lama/.test(await T('.pcard')), false);
check('the superseded one is not shown', /Sebelum diluluskan/.test(await T('.pcard')), false);
await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(9000);

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
/* The office queue is a live screen that somebody may have just cleared, so
   the panel is given a row to draw rather than borrowed from the queue. */
await pg.evaluate(() => {
  DB.priceReqs.push({ id: 'o1', customer_id: cur().id, product_id: DB.products[0].id,
    status: 'pending', old_price: 9.9, new_price: 8.8,
    requested_at: new Date(Date.now() - 3 * 864e5).toISOString() });
  draw();
});
await pg.waitForTimeout(500);
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
