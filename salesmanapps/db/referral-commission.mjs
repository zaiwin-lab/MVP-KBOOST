/* A referral's commission follows the invoice that earned it.
   ---------------------------------------------------------------------------
   The commission is 5% of the invoice that settles first. Two things can take
   that invoice back below settled -- cancelling it, and rejecting a payment on
   it -- and until now neither gave the commission back. This runs the whole
   cycle twice, once for each route, through the real functions and the real
   policies, and disposes of what it creates. */
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
  pg.on('response', r => { if (r.status() >= 400)
    errs.push(`HTTP ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
  await pg.goto('http://localhost:8901/app/', { waitUntil: 'load' });
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(async ([e, p]) => {
    const { error } = await sb.auth.signInWithPassword({ email: e, password: p });
    return error ? error.message : 'ok';
  }, [email, pw]);
  if (r !== 'ok') { console.log('sign-in failed:', email, r); process.exit(1); }
  return pg;
};
const rpc = (pg, fn, args) => pg.evaluate(async ([f, a]) => {
  const { data, error } = await sb.rpc(f, a);
  return error ? { error: error.message } : { data };
}, [fn, args]);
const ref = (pg, id) => pg.evaluate(async i => {
  const { data } = await sb.from('referrals').select('*').eq('id', i).maybeSingle();
  return data;
}, id);

const sm = await open('ahmad@salesportal.demo', 'portal2026');
const mg = await open('manager@salesportal.demo', 'portal2026');
const tag = Date.now().toString(36).slice(-5).toUpperCase();

/* ------------------------------------------------------------------ setup */
console.log('=== a referral, through to a settled invoice ===');
const added = await rpc(sm, 'add_referral',
  { p_name: `Kedai Ujian Rujukan ${tag}`, p_phone: '0123456789', p_district: 'Zon Ujian',
    p_note: 'Rekod ujian automatik' });
check('referral recorded', !!(added.data && added.data.referral_id), true);
const RID = added.data.referral_id;

const prod = await sm.evaluate(async () => {
  const { data } = await sb.from('products').select('id,price').eq('active', true).limit(1);
  return data[0];
});
/* Bill-to-bil, because a consignment bill deliberately cannot be cancelled. */
const reg = await rpc(sm, 'register_customer', { p: {
  name: `Kedai Ujian Rujukan ${tag}`, term: 'biltobil', term_months: 2,
  district: 'Zon Ujian', state: 'Selangor', referral_id: RID,
  lines: [{ product_id: prod.id, qty: 10, price: prod.price }] } });
check('outlet registered and linked', !!(reg.data && reg.data.customer_id), true);
if (reg.error) ok('error', reg.error);
const CUST = reg.data.customer_id, INV = reg.data.opening.invoice_id;
ok('outlet / invoice', `${reg.data.code} / ${reg.data.opening.invoice_no}`);

const linked = await ref(sm, RID);
check('referral is registered, not yet earned', linked.status, 'registered');
check('no invoice recorded against it yet', linked.invoice_id, null);
check('no commission yet', Number(linked.commission), 0);

const total = Number(reg.data.opening.total);
const pay1 = await rpc(sm, 'post_payment', { p_invoice: INV, p_amount: total, p_method: 'tunai' });
check('invoice settled in full', pay1.data && pay1.data.status, 'paid');

const earned = await ref(sm, RID);
check('referral is now verified', earned.status, 'verified');
check('it names the invoice that earned it', earned.invoice_id, INV);
check('commission is 5% of that invoice',
  Number(earned.commission).toFixed(2), (total * 0.05).toFixed(2));
ok('earned', `RM ${Number(earned.commission).toFixed(2)} of RM ${total.toFixed(2)}`);

/* ------------------------------------------- route 1: a rejected payment */
console.log('\n=== route 1: the office rejects the payment ===');
const payId = await mg.evaluate(async i => {
  const { data } = await sb.from('payments').select('id').eq('invoice_id', i)
    .is('rejected_at', null).limit(1);
  return data[0].id;
}, INV);
const rej = await rpc(mg, 'reject_payment', { p_payment: payId, p_note: 'Ujian: pembatalan bayaran' });
check('payment rejected', !rej.error, true);
check('it reports the referral went back', rej.data && rej.data.referral_reversed, true);

const back1 = await ref(mg, RID);
check('referral back to registered', back1.status, 'registered');
check('commission given back', Number(back1.commission), 0);
check('value given back', Number(back1.value), 0);
check('invoice no longer recorded', back1.invoice_id, null);
check('but the shop is still linked', back1.customer_id, CUST);

/* --------------------------------------------- it can be earned again */
console.log('\n=== and it can be earned again ===');
const pay2 = await rpc(sm, 'post_payment', { p_invoice: INV, p_amount: total, p_method: 'tunai' });
check('settled a second time', pay2.data && pay2.data.status, 'paid');
const earned2 = await ref(sm, RID);
check('verified again', earned2.status, 'verified');
check('same commission', Number(earned2.commission).toFixed(2), (total * 0.05).toFixed(2));

/* ------------------------------------------- route 2: the invoice is void */
console.log('\n=== route 2: the office cancels the invoice ===');
const voided = await rpc(mg, 'void_document',
  { p_kind: 'INV', p_id: INV, p_reason: 'Ujian: pembatalan invois' });
check('invoice cancelled', !voided.error, true);
if (voided.error) ok('error', voided.error);
check('it reports the referral went back', voided.data && voided.data.referral_reversed, true);

const back2 = await ref(mg, RID);
check('referral back to registered', back2.status, 'registered');
check('commission given back', Number(back2.commission), 0);
check('invoice no longer recorded', back2.invoice_id, null);

/* ------------------------------------------------------------------ tidy */
console.log('\n=== tidy up ===');
const gone = await mg.evaluate(async ([r, c]) => {
  const d = await sb.from('referrals').delete().eq('id', r);
  const { error } = await sb.rpc('set_blacklist',
    { p_customer: c, p_on: true, p_reason: 'Outlet ujian rujukan — bukan kedai sebenar' });
  const { data } = await sb.from('referrals').select('id').eq('id', r);
  return { del: d.error ? d.error.message : 'deleted', outlet: error ? error.message : 'deactivated',
           left: (data || []).length };
}, [RID, CUST]);
ok('test referral', gone.del);
ok('test outlet', gone.outlet);
check('nothing left behind', gone.left, 0);

console.log('\n' + (errs.length ? 'REQUEST ERRORS:\n  ' + errs.join('\n  ') : 'no request errors'));
console.log(fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed');
await b.close();
