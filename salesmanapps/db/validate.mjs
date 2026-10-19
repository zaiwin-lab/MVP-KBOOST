/* The validation sprint from README.md, run as one audited cycle in the order
   it specifies:
     management creates salesperson -> stock is issued -> salesperson serves
     outlet -> transaction posts -> document leaves the system -> payment
     settles -> management reconciles stock and ageing
   Eight acceptance criteria, each pass/fail, on synthetic data only.

   Run through the app's own Supabase client in a real browser context, so the
   tokens, the row level security and the posting functions are exactly the
   ones a salesman's phone uses. */
/* Needs two things that are not in the repository:
     - `./harness.mjs`, exporting `browser()` and `page(b, viewport)` over
       Playwright. Any thin wrapper will do; ours exists only to work around a
       sandbox proxy whose CA Chromium will not verify, which is not a problem
       anywhere else.
     - the app served at http://localhost:8901/app/ (any static server rooted
       at `salesmanapps/`), and `../.validation-commit` holding the full SHA of
       the commit being validated.
   Everything else it creates and disposes of itself. */
import { browser, page } from './harness.mjs';
import fs from 'node:fs';

const STAMP = new Date().toISOString();
const results = [];
const errs = [];
let crit = 0;

const C = (n, title) => { crit = n; console.log(`\n=== ${n}. ${title} ===`); };
const ok = (n, v) => console.log(('  ' + n).padEnd(38), v);
const check = (n, got, want) => {
  const pass = String(got) === String(want);
  results.push({ crit, name: n, pass, got: String(got), want: String(want) });
  console.log(('  ' + n).padEnd(38), (pass ? 'PASS ' : 'FAIL ') + got + (pass ? '' : '   expected ' + want));
  return pass;
};

const open = async (email, pw) => {
  const pg = await page(browserRef, { width: 390, height: 844 });
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  /* "Failed to load resource: 500" tells you nothing about which resource.
     The response listener records the method and path, so the error list is
     something you can act on; the browser's own duplicate of it is dropped. */
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    errs.push('CONSOLE ' + m.text().slice(0, 150)); });
  pg.on('response', r => { if (r.status() >= 400)
    errs.push(`HTTP ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
  await pg.goto('http://localhost:8901/app/', { waitUntil: 'load' });
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(async ([e, p]) => {
    const { error } = await sb.auth.signInWithPassword({ email: e, password: p });
    return error ? error.message : 'ok';
  }, [email, pw]);
  return { pg, signin: r };
};
const rpc = (pg, fn, args) => pg.evaluate(async ([f, a]) => {
  const { data, error } = await sb.rpc(f, a);
  return error ? { error: error.message } : { data };
}, [fn, args]);
const fn = (pg, body) => pg.evaluate(async b => {
  const { data, error } = await sb.functions.invoke('admin-users', { body: b });
  return error ? { error: (await error.context?.json?.().catch(() => null))?.error || error.message } : { data };
}, body);

const browserRef = await browser();

/* ------------------------------------------------------------------ setup */
const tag = Date.now().toString(36).slice(-5);
const NEW = { email: `validasi.${tag}@salesportal.demo`, pw: 'Validasi#2026',
              name: `Ujian Validasi ${tag.toUpperCase()}`, code: `VX${tag.slice(-2).toUpperCase()}`,
              zone: 'Zon Ujian' };
console.log('Validation sprint —', STAMP);
console.log('Synthetic account:', NEW.email, '/', NEW.code);

const mg = await open('manager@salesportal.demo', 'portal2026');
if (mg.signin !== 'ok') { console.log('cannot sign in as management:', mg.signin); process.exit(1); }

/* Revoking the account is itself one of the checks, so a run that fails before
   criterion 1 leaves a working salesman login behind. Four of them accumulated
   that way over one afternoon of iterating on this file, and sat usable for
   four days. Rather than make the teardown clever, each run begins by revoking
   any account a previous run left live: the leak then heals on the next run,
   whatever killed the last one. */
const swept = await mg.pg.evaluate(async () => {
  const { data } = await sb.from('profiles').select('id,code,name')
    .eq('role', 'salesman').eq('active', true).like('name', 'Ujian Validasi%');
  const done = [];
  for (const p of data || []) {
    const { error } = await sb.functions.invoke('admin-users',
      { body: { action: 'set_active', id: p.id, active: false } });
    done.push(p.code + (error ? ' (failed: ' + error.message + ')' : ''));
  }
  return done;
});
if (swept.length) console.log('Revoked leftovers from an earlier run:', swept.join(', '));

/* The same for the current run, on any crash: the handler cannot await, so it
   fires the request and lets the process end -- better than certainly leaking. */
let CURRENT = null;
const sweepCurrent = () => { if (!CURRENT) return;
  mg.pg.evaluate(id => sb.functions.invoke('admin-users',
    { body: { action: 'set_active', id, active: false } }), CURRENT).catch(() => {}); };
process.on('unhandledRejection', e => { console.log('\nABORTED:', e && e.message);
  sweepCurrent(); process.exitCode = 1; });
process.on('uncaughtException', e => { console.log('\nABORTED:', e && e.message);
  sweepCurrent(); process.exitCode = 1; });

/* ---------------------------------------------------------------------- 1 */
C(1, 'Management can create and revoke a salesperson account');
const created = await fn(mg.pg, { action: 'create', email: NEW.email, password: NEW.pw,
  name: NEW.name, code: NEW.code, zone: NEW.zone });
check('account created', !!(created.data && created.data.id), true);
const NEWID = created.data && created.data.id;
CURRENT = NEWID;
ok('account id', NEWID || created.error);

const smFirst = await open(NEW.email, NEW.pw);
check('the new salesperson can sign in', smFirst.signin, 'ok');

/* ---------------------------------------------------------------------- 3a */
C(3, 'A salesperson cannot see another salesperson\'s restricted records');
const seen = await smFirst.pg.evaluate(async () => {
  const me = (await sb.auth.getUser()).data.user.id;
  const cust = await sb.from('customers').select('id,salesman_id');
  const inv  = await sb.from('invoices').select('id,salesman_id');
  const pay  = await sb.from('payments').select('id,salesman_id');
  const van  = await sb.from('van_stock').select('salesman_id');
  const others = rows => (rows.data || []).filter(r => r.salesman_id && r.salesman_id !== me).length;
  return { me, cust: (cust.data || []).length, custOther: others(cust),
           inv: (inv.data || []).length, invOther: others(inv),
           pay: (pay.data || []).length, payOther: others(pay),
           vanOther: others(van) };
});
ok('rows visible to a new salesman', `customers ${seen.cust}, invoices ${seen.inv}, payments ${seen.pay}`);
check('no other salesman\'s customers', seen.custOther, 0);
check('no other salesman\'s invoices', seen.invOther, 0);
check('no other salesman\'s payments', seen.payOther, 0);
check('no other salesman\'s van stock', seen.vanOther, 0);
/* and a direct, deliberate attempt at a known foreign row */
const target = await mg.pg.evaluate(async () => {
  const { data } = await sb.from('customers').select('id,name,code').limit(1);
  return data[0];
});
const steal = await smFirst.pg.evaluate(async id => {
  const { data } = await sb.from('customers').select('*').eq('id', id);
  return (data || []).length;
}, target.id);
check(`asking for ${target.code} by id returns nothing`, steal, 0);
check('and posting against it is refused', await (async () => {
  const r = await rpc(smFirst.pg, 'post_sale', { p_customer: target.id,
    p_lines: [{ product_id: null, qty: 1, price: 1 }] });
  return !!r.error;
})(), true);

/* ---------------------------------------------------------------------- 2 */
C(2, 'Opening van stock can be issued and reconciled');
const prods = await mg.pg.evaluate(async () => {
  const { data } = await sb.from('products').select('id,sku,name,price,floor_price')
    .eq('active', true).order('sku').limit(2);
  return data;
});
const vanBefore = await smFirst.pg.evaluate(async () => {
  const { data } = await sb.from('van_stock').select('product_id,qty');
  return (data || []).reduce((a, r) => a + r.qty, 0);
});
check('a new van starts empty', vanBefore, 0);
/* the salesman asks, the office issues — the intended path, not a direct write */
const req = await rpc(smFirst.pg, 'request_stock', {
  p_lines: [{ product_id: prods[0].id, qty: 60 }, { product_id: prods[1].id, qty: 40 }],
  p_note: 'Stok pembukaan untuk ujian validasi' });
check('stock request raised', !req.error, true);
const pend = await mg.pg.evaluate(async id => {
  const { data } = await sb.from('stock_requests').select('id,product_id,qty')
    .eq('salesman_id', id).eq('status', 'pending');
  return data;
}, NEWID);
check('office sees both lines', (pend || []).length, 2);
for (const p of pend || []) {
  const r = await rpc(mg.pg, 'issue_stock', { p_salesman: NEWID, p_product: p.product_id,
    p_qty: p.qty, p_request: p.id });
  if (r.error) ok('issue failed', r.error);
}
const vanAfter = await smFirst.pg.evaluate(async () => {
  const { data } = await sb.from('van_stock').select('product_id,qty');
  return (data || []).reduce((a, r) => a + r.qty, 0);
});
check('van now holds what was issued', vanAfter, 100);
const ledger = await mg.pg.evaluate(async id => {
  const { data } = await sb.from('stock_issues').select('qty').eq('salesman_id', id);
  return (data || []).reduce((a, r) => a + r.qty, 0);
}, NEWID);
check('and it reconciles with stock_issues', ledger, vanAfter);

/* ---------------------------------------------------------------------- 3b */
C(3, 'The salesperson serves an outlet assigned to him');
/* register_customer takes one jsonb payload, exactly as the wizard sends it. */
const reg = await rpc(smFirst.pg, 'register_customer', { p: {
  name: `Kedai Ujian Validasi ${tag.toUpperCase()}`,
  pic: 'Encik Ujian', phone: '0123456789',
  address: 'Lot 1, Jalan Ujian', postcode: '43000',
  district: 'Kajang', state: 'Selangor', country: 'Malaysia',
  outlet_type: 'Kedai Runcit', term: 'biltobil', term_months: 2,
  service_days: 30, lines: [] } });
check('outlet registered', !reg.error, true);
if (reg.error) ok('error', reg.error);
const CUST = reg.data && (reg.data.customer_id || reg.data.id);
ok('reseller code issued', (reg.data || {}).reseller_code || (reg.data || {}).code || '-');
ok('outlet id', CUST);
const mine = await smFirst.pg.evaluate(async () => {
  const me = (await sb.auth.getUser()).data.user.id;
  const { data } = await sb.from('customers').select('id,salesman_id');
  return { n: (data || []).length, allMine: (data || []).every(c => c.salesman_id === me) };
});
check('he now sees exactly one outlet', mine.n, 1);
check('and it is his', mine.allMine, true);

/* ---------------------------------------------------------------------- 4 */
C(4, 'A transaction updates stock and creates the expected document');
const vanP0 = async pg => pg.evaluate(async id => {
  const { data } = await sb.from('van_stock').select('qty').eq('product_id', id).maybeSingle();
  return data ? data.qty : 0; }, prods[0].id);
const v0 = await vanP0(smFirst.pg);
const sale = await rpc(smFirst.pg, 'post_sale', { p_customer: CUST,
  p_lines: [{ product_id: prods[0].id, qty: 12, price: prods[0].price }], p_pay_now: false });
check('sale posted', !sale.error, true);
if (sale.error) ok('error', sale.error);
const v1 = await vanP0(smFirst.pg);
check('van fell by the quantity sold', v0 - v1, 12);
ok('documents', `${sale.data && sale.data.so_no} / ${sale.data && sale.data.invoice_no}`);
check('a sales order was issued', /^SO\d{6}$/.test((sale.data || {}).so_no || ''), true);
check('an invoice was issued', /^INV\d{6}$/.test((sale.data || {}).invoice_no || ''), true);
const INV = sale.data && sale.data.invoice_id;
const total = sale.data ? Number(sale.data.total) : 0;
check('invoice total matches the line', total.toFixed(2), (12 * Number(prods[0].price)).toFixed(2));
const lines = !sale.data ? [] : await smFirst.pg.evaluate(async id => {
  const { data } = await sb.from('doc_lines').select('qty,unit_price,line_total')
    .eq('doc_id', id).eq('kind', 'SO');
  return data; }, (sale.data || {}).so_id);
check('the order line is on file', (lines || []).length, 1);
check('line total is computed, not sent', Number((lines || [{}])[0].line_total).toFixed(2),
  (12 * Number(prods[0].price)).toFixed(2));

/* ---------------------------------------------------------------------- 5 */
C(5, 'A payment cannot exceed the outstanding amount');
const over = await rpc(smFirst.pg, 'post_payment',
  { p_invoice: INV, p_amount: Math.round((total + 50) * 100) / 100, p_method: 'tunai' });
check('over-payment refused', !!over.error, true);
ok('reason', over.error || '(allowed!)');
const zero = await rpc(smFirst.pg, 'post_payment', { p_invoice: INV, p_amount: 0, p_method: 'tunai' });
check('zero refused', !!zero.error, true);
const part = await rpc(smFirst.pg, 'post_payment',
  { p_invoice: INV, p_amount: Math.round(total * 40) / 100, p_method: 'tunai' });
check('a partial payment is accepted', !part.error, true);
const after = await rpc(smFirst.pg, 'post_payment',
  { p_invoice: INV, p_amount: Math.round((total * 0.75) * 100) / 100, p_method: 'tunai' });
check('a second payment over the remainder is refused', !!after.error, true);
const settle = await rpc(smFirst.pg, 'post_payment',
  { p_invoice: INV, p_amount: Number((part.data || {}).outstanding), p_method: 'qr' });
check('settling the exact balance is accepted', !settle.error, true);
check('invoice now reads paid', (settle.data || {}).status, 'paid');

/* ---------------------------------------------------------------------- 6 */
C(6, 'A return restores stock through the intended path');
const v2 = await vanP0(smFirst.pg);
const ret = await rpc(smFirst.pg, 'post_return', { p_customer: CUST, p_product: prods[0].id,
  p_qty: 3, p_reason: 'damaged', p_remark: 'Ujian validasi' });
check('return posted', !ret.error, true);
check('a RET document was issued', /^RET\d{6}$/.test((ret.data || {}).return_no || ''), true);
const v3 = await vanP0(smFirst.pg);
check('stock came back to the van', v3 - v2, 3);
const direct = await smFirst.pg.evaluate(async () => {
  const { error } = await sb.from('van_stock').update({ qty: 9999 }).eq('salesman_id',
    (await sb.auth.getUser()).data.user.id).select();
  const { data } = await sb.from('van_stock').select('qty').order('qty', { ascending: false }).limit(1);
  return error ? 'refused' : (data && data[0] && data[0].qty === 9999 ? 'ALLOWED' : 'no rows changed');
});
check('van stock cannot be written directly', direct !== 'ALLOWED', true);
ok('direct write', direct);

/* ---------------------------------------------------------------------- 7 */
C(7, 'Management reports reconcile with the underlying ledger');
const recon = await mg.pg.evaluate(async ([cust, smid]) => {
  const num = r => Number(r || 0);
  const [inv, pay, lines, sos, rets, vans, issues] = await Promise.all([
    sb.from('invoices').select('*').eq('customer_id', cust),
    sb.from('payments').select('*').eq('customer_id', cust),
    sb.from('doc_lines').select('*'),
    sb.from('sales_orders').select('*').eq('customer_id', cust),
    sb.from('returns').select('*').eq('customer_id', cust),
    sb.from('van_stock').select('*').eq('salesman_id', smid),
    sb.from('stock_issues').select('*').eq('salesman_id', smid),
  ]);
  const I = inv.data || [], P = (pay.data || []).filter(p => !p.rejected_at);
  const S = sos.data || [], R = rets.data || [], V = vans.data || [], X = issues.data || [];
  const soLines = (lines.data || []).filter(l => l.kind === 'SO' && S.some(s => s.id === l.doc_id));
  return {
    invoiceTotal: I.reduce((a, v) => a + num(v.total), 0),
    invoicePaid:  I.reduce((a, v) => a + num(v.paid), 0),
    paymentSum:   P.reduce((a, p) => a + num(p.amount), 0),
    outstanding:  I.filter(v => v.status !== 'paid').reduce((a, v) => a + num(v.total) - num(v.paid), 0),
    soTotal:      S.reduce((a, s) => a + num(s.total), 0),
    lineTotal:    soLines.reduce((a, l) => a + num(l.line_total), 0),
    issued:       X.reduce((a, r) => a + r.qty, 0),
    sold:         soLines.reduce((a, l) => a + l.qty, 0),
    returned:     R.reduce((a, r) => a + r.qty, 0),
    vanNow:       V.reduce((a, r) => a + r.qty, 0),
  };
}, [CUST, NEWID]);
ok('figures', JSON.stringify(recon));
check('invoices equal their order lines', recon.invoiceTotal.toFixed(2), recon.lineTotal.toFixed(2));
check('sales orders equal their lines', recon.soTotal.toFixed(2), recon.lineTotal.toFixed(2));
check('invoice.paid equals the payments', recon.invoicePaid.toFixed(2), recon.paymentSum.toFixed(2));
check('nothing is left outstanding', recon.outstanding.toFixed(2), '0.00');
check('van = issued - sold + returned',
  recon.vanNow, recon.issued - recon.sold + recon.returned);

/* ---------------------------------------------------------------------- 1b */
C(1, 'Management revokes the account');
const revoked = await fn(mg.pg, { action: 'set_active', id: NEWID, active: false });
check('revocation accepted', !!(revoked.data && revoked.data.active === false), true);
const retry = await open(NEW.email, NEW.pw);
check('the revoked account can no longer sign in', retry.signin !== 'ok', true);
ok('what it says', retry.signin);
const selfServe = await smFirst.pg.evaluate(async () => {
  const { error } = await sb.functions.invoke('admin-users',
    { body: { action: 'list' } });
  return error ? 'refused' : 'ALLOWED';
});
check('a salesman cannot call the admin endpoint', selfServe, 'refused');

/* ---------------------------------------------------------------------- 8 */
C(8, 'The deployed build is linked to the exact reviewed Git commit');
const deployed = await mg.pg.evaluate(async () => {
  const r = await fetch('https://salesmanapps.netlify.app/app/', { cache: 'no-store' });
  const t = await r.text();
  const m = t.match(/const BUILD = "([^"]*)"/);
  return m ? m[1] : 'not found';
});
ok('stamp on the live build', deployed);
const sha = fs.readFileSync(new URL('../.validation-commit', import.meta.url), 'utf8').trim();
ok('commit under review', sha.slice(0, 7));
check('the live stamp names a commit', /^[0-9a-f]{7} · \d{4}-\d{2}-\d{2}$/.test(deployed), true);
check('and it is the reviewed commit', deployed.slice(0, 7), sha.slice(0, 7));

/* ------------------------------------------------------------------ tidy */
console.log('\n=== tidy up ===');
const tidy = await mg.pg.evaluate(async c => {
  const { error } = await sb.rpc('set_blacklist',
    { p_customer: c, p_on: true, p_reason: 'Outlet ujian validasi — bukan kedai sebenar' });
  return error ? error.message : 'outlet deactivated';
}, CUST);
ok('test outlet', tidy);

/* The cycle takes two real payments, and they sat in the office's approval
   queue afterwards -- eight of them accumulated over four runs in one morning,
   every one a "Kedai Ujian Validasi" row on the screen the office actually
   uses. They are confirmed rather than rejected because nothing was wrong with
   them: the money was taken and the invoices read paid. Only this run's own
   outlet is touched. */
const cleared = await mg.pg.evaluate(async c => {
  const { data } = await sb.from('payments').select('id')
    .eq('customer_id', c).is('approved_at', null).is('rejected_at', null);
  let n = 0;
  for (const p of data || []) {
    const { error } = await sb.rpc('approve_payment', { p_payment: p.id });
    if (!error) n++;
  }
  return n;
}, CUST);
ok('payments taken off the queue', cleared);

/* ---------------------------------------------------------------- summary */
const byCrit = {};
results.forEach(r => { byCrit[r.crit] = byCrit[r.crit] || { pass: 0, fail: 0, fails: [] };
  r.pass ? byCrit[r.crit].pass++ : (byCrit[r.crit].fail++, byCrit[r.crit].fails.push(r.name)); });
console.log('\n================= RESULT =================');
Object.keys(byCrit).sort().forEach(k => {
  const b = byCrit[k];
  console.log(`  criterion ${k}: ${b.fail ? 'FAIL' : 'PASS'}  (${b.pass} checks pass` +
    (b.fail ? `, ${b.fail} fail: ${b.fails.join('; ')}` : '') + ')');
});
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length} checks, ${failed.length} failed`);
console.log('errors: ' + (errs.length ? '\n  ' + errs.join('\n  ') : 'none'));
fs.writeFileSync(new URL('../validation-run.json', import.meta.url),
  JSON.stringify({ stamp: STAMP, account: NEW.email, code: NEW.code, commit: sha,
                   deployedStamp: deployed, results, errors: errs }, null, 2));
await browserRef.close();
