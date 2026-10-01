# Database

Supabase project **`sales-portal`** — ref `ebjsyramwnyekufvowft`, Singapore
(`ap-southeast-1`), Postgres 17, in the KBZK organisation.

The schema is applied through Supabase migrations, which are the source of
truth and carry their own history. This folder records what was applied and
why, so the repository is not silent about where the data lives.

## Migrations applied

| # | Name | What it creates |
|---|------|-----------------|
| 1 | `people_and_reference_data` | `profiles`, `is_management()`, `products`, `customers` |
| 2 | `van_stock_and_running_numbers` | `van_stock`, `move_van_stock()`, `doc_seq`, `next_doc_no()` |
| 3 | `documents` | `delivery_orders`, `sales_orders`, `invoices`, `doc_lines`, `payments`, `receipts`, `returns` |
| 4 | `consignment_and_working_data` | `consignments`, `visit_schedule`, `referrals`, `company` |
| 5 | `row_level_security` | RLS enabled on all 16 tables, with policies |
| 6 | `lock_down_security_definer_functions` | Revokes anonymous access to the three privileged functions |

## Three decisions worth knowing

**Documents follow the payment term.** `delivery_orders` exists as its own
table and consignment is its only source. Bil to Bil and Cash go straight to
`sales_orders`. There is no Order table — taking an order is a step, not a
document. The structure enforces what the client described, so the numbering
bug he caught cannot return through a different route.

**Running numbers are issued by the database.** `next_doc_no()` does
`UPDATE ... RETURNING` inside a transaction, which takes a row lock, so two
salesmen submitting at the same instant queue rather than both receiving
`INV000053`. Verified: 500 consecutive calls produced 500 distinct values.

**Van stock belongs to a salesman, not a product.** `van_stock` is keyed on
(salesman, product). A single column on `products` — which is what the browser
build had — means one salesman's sale draws down another's van.

## Security

Row level security is on for all 16 tables. A salesman reads only his own rows
and the outlets assigned to him; management reads everything. This is the real
boundary: a salesman querying another's outlets gets nothing back, however he
asks.

`doc_seq` deliberately has RLS on with **no policy**, which denies every direct
read and write. `next_doc_no()` is the only way in. The Supabase linter reports
this as INFO; it is the intended state.

The three `SECURITY DEFINER` functions bypass RLS by design, so anonymous
`EXECUTE` is revoked on all of them — PostgREST publishes every public function
as an RPC endpoint, which had left `next_doc_no()` and `move_van_stock()`
callable by anyone holding the project URL. `move_van_stock()` additionally
refuses to move stock for a salesman other than the caller unless the caller is
management, since the salesman is a parameter.

Verified by attempting both as the anonymous role: `permission denied`.

## Still to do

- `company` holds one row with the operating company's real details. It is
  empty: the portal still prints placeholders, including `[SSM NO. — NOT SET]`.
- No data has been loaded. The client's outlets, products, salesmen and opening
  balances are still outstanding.
