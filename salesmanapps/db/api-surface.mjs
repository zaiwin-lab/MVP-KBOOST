/* The allow-list, proved from the outside: a signed-in salesman tries to call
   the functions that move stock and issue document numbers directly, the way
   anyone with the publishable key and a terminal could. */
import { browser, page } from './harness.mjs';
const b = await browser();
const pg = await page(b, { width: 390, height: 844 });
await pg.goto('http://localhost:8901/app/', { waitUntil: 'load' });
await pg.waitForTimeout(2500);
const fails = [];
const check = (n, got, want) => { const g = String(got) === String(want);
  if (!g) fails.push(`${n}: ${got} != ${want}`);
  console.log(('  ' + n).padEnd(34), (g ? 'PASS ' : 'FAIL ') + got); };

console.log('=== as an anonymous caller (no sign-in at all) ===');
const anon = await pg.evaluate(async () => {
  const out = {};
  for (const f of ['mark_alerts_seen', 'post_sale', 'ranking_board', 'next_doc_no', 'van_put']) {
    const { error } = await sb.rpc(f, {});
    out[f] = error ? (/not find the function|permission denied|PGRST202|42501/i.test(
      error.message + (error.code || '')) ? 'refused' : 'error: ' + error.message.slice(0, 50))
      : 'ALLOWED';
  }
  return out;
});
Object.entries(anon).forEach(([k, v]) => check('anon ' + k, v !== 'ALLOWED', true));
console.log('   ', JSON.stringify(anon));

console.log('\n=== as a signed-in salesman ===');
await pg.evaluate(async () => sb.auth.signInWithPassword(
  { email: 'ahmad@salesportal.demo', password: 'portal2026' }));
await pg.waitForTimeout(3000);

const internal = await pg.evaluate(async () => {
  const out = {};
  const tries = {
    van_put:        { p_salesman: '00000000-0000-0000-0000-000000000000', p_product: '00000000-0000-0000-0000-000000000000', p_qty: 9999 },
    van_take:       { p_salesman: '00000000-0000-0000-0000-000000000000', p_product: '00000000-0000-0000-0000-000000000000', p_qty: 1 },
    next_doc_no:    { p_kind: 'INV' },
    move_van_stock: { p_salesman: '00000000-0000-0000-0000-000000000000', p_product: '00000000-0000-0000-0000-000000000000', p_delta: 500 },
    require_management: {},
    void_invoice:   { p_id: '00000000-0000-0000-0000-000000000000', p_reason: 'x' },
    void_return:    { p_id: '00000000-0000-0000-0000-000000000000', p_reason: 'x' },
    void_delivery:  { p_id: '00000000-0000-0000-0000-000000000000', p_reason: 'x' },
    post_delivery:  { p_customer: '00000000-0000-0000-0000-000000000000', p_product: '00000000-0000-0000-0000-000000000000', p_qty: 1, p_price: 1 },
    post_consign_bill: { p_consignment: '00000000-0000-0000-0000-000000000000', p_balance: 0 },
    settle_referral: { p_customer: '00000000-0000-0000-0000-000000000000', p_invoice: '00000000-0000-0000-0000-000000000000' },
    acting_salesman: { p_customer: '00000000-0000-0000-0000-000000000000' },
  };
  for (const [f, args] of Object.entries(tries)) {
    const { error } = await sb.rpc(f, args);
    out[f] = error ? 'refused' : 'ALLOWED';
  }
  return out;
});
Object.entries(internal).forEach(([k, v]) => check(k + ' unreachable', v, 'refused'));

console.log('\n=== but the ones the app needs still work ===');
const works = await pg.evaluate(async () => {
  const a = await sb.rpc('mark_alerts_seen');
  const b = await sb.rpc('ranking_board', { p_from: new Date(Date.now() - 30 * 864e5).toISOString(),
                                            p_to: new Date().toISOString() });
  const c = await sb.from('customers').select('id').limit(1);
  return { mark_alerts_seen: a.error ? 'BROKEN: ' + a.error.message : 'ok',
           ranking_board: b.error ? 'BROKEN: ' + b.error.message : 'ok (' + (b.data || []).length + ' rows)',
           customers_readable: c.error ? 'BROKEN' : (c.data || []).length + ' row' };
});
check('mark_alerts_seen still works', works.mark_alerts_seen, 'ok');
check('ranking_board still works', /^ok/.test(works.ranking_board), true);
check('his own customers still readable', /row/.test(works.customers_readable), true);
console.log('   ', JSON.stringify(works));

console.log('\n' + (fails.length ? 'FAILURES:\n  ' + fails.join('\n  ') : 'all checks passed'));
await b.close();
