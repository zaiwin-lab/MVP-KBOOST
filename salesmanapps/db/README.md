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
| 7 | `transaction_posting_functions` | `acting_salesman()`, `van_take()`, `van_put()`, `line_total()` — the shared guards |
| 8 | `post_sale_and_delivery` | `post_sale()`, `post_delivery()`, `post_consign_bill()` |
| 9 | `post_payment_return_customer` | `post_payment()`, `post_return()`, `register_customer()`, and the grants |
| 10 | `doc_lines_generated_total` | `doc_lines.line_total` is generated, so the three writers stop setting it |
| 11 | `van_restocking` | `stock_requests`, `stock_issues`, `request_stock()`, `issue_stock()`, `reject_stock_request()` |

## Rebuild to the client's own app — backend foundation

The client's app registers a **reseller**, not an outlet, and registration there
is a sequence rather than a form: details, four required photographs, the
payment term, an opening order per product, then a consignment agreement that is
generated, printed, signed and photographed back in.

Three of his terms are ours unchanged — **Konsainan / Belian Tunai / Bill To
Bil** are consignment, cash and bill-to-bill — so the document model, the
running numbers and the posting functions all carry over.

Migrations `reseller_registration_fields` and `reseller_photo_storage` carry the
data model. Everything added is nullable, so the twelve existing outlets stay
valid.

| Added | Why |
|---|---|
| `reseller_code`, `app_name`, `ssm_name` | his own identifiers, distinct from our running code |
| `country`, `town` | his geography is Negara / Negeri / Bandar / Poskod, deeper than our flat district |
| `commission_grp`, `excel_grp` | segmentation we had no equivalent of |
| `office_phone`, `pic_ic`, `email` | on his form; `pic_ic` is personal data and carries PDPA obligations |
| `pic_off_days`, `pic_open_time`, `pic_close_time` | **not admin detail** — the planner must not schedule a visit on a day the shop has nobody to receive it |
| `service_days`, `last_service` | the service cycle his planner buckets by |
| `products.retail_price` | his sheet carries two prices: Harga Kedai (what the reseller pays, our existing `price`) and Harga Jualan (what the reseller charges the public) |

**Two assumptions worth challenging.** `service_days` defaults to 30, and
`service_state()` calls a reseller `tamat` only once the interval has actually
passed, not when it is merely due. Both are guesses from the planner screenshot
and both are one line to change.

### Photographs

Private bucket `reseller`, laid out as `<customer_id>/<kind>-<timestamp>.<ext>`.
A shopkeeper's face, an SSM certificate and a signed agreement are not public
material.

Storage policies on `storage.objects` cannot be written with the tooling here —
that table belongs to `supabase_storage_admin`. Authorisation lives in the
`reseller-upload` edge function instead, which is tighter: the phone never holds
a key that reaches the bucket, only a one-shot URL for one path it has already
been judged entitled to.

- `sign-upload` → a short-lived URL the phone PUTs the file to. No base64, so a
  4MB photo on a weak signal is one upload rather than a 5.5MB JSON body.
- `record` → files the upload against the reseller. The path is checked against
  the caller's own claim, so a row can never point at another reseller's folder.
- `list` → signed read URLs, one hour.

Verified against live sessions: a real PNG signed, uploaded, recorded and read
back; the public path refused; and six refusals held, including another salesman
signing for an outlet he does not hold, recording a path in someone else's
folder, and an executable content type.

## Refer & Earn

Two things the client never specified are decided in migration `referrals`, and
both are one line to change:

- **"Verified" means the referred outlet's first invoice has been PAID**, not
  merely registered or ordered. A referral should not earn on a sale the company
  has not collected.
- **The 5% is paid once**, on that first settled invoice, not on everything the
  outlet ever buys. A perpetual cut is a liability nobody has agreed to.

The lifecycle is `pending` → `registered` → `verified`. A salesman records a
lead; registering the outlet claims it, in the same transaction as the customer
insert, so a lead and the customer it became are never recorded apart;
`post_payment` settles it when, and only when, the invoice goes to `paid`.

`settle_referral()` has EXECUTE revoked from `authenticated` as well as `anon` —
it is reached only from inside `post_payment`, so a commission cannot be
conjured by calling it directly. A unique partial index on `customer_id` stops
one outlet being credited to two referrals.

## Edge function: `admin-users`

Opening a login, changing someone's password and revoking access all need the
**service role key**, which bypasses row level security completely. That key can
never reach a browser, so it lives as a function secret and this function is the
only thing that holds it.

Every request is authorised twice: the caller's own token must be valid, and the
profile behind it must be `management` and active. A salesman calling the
endpoint directly gets `403` on all five actions — `create`, `set_password`,
`set_active`, `set_email`, `list` — as does an anonymous caller.

Two rules inside it are worth knowing:

- **Only salesman rows are touched.** Management accounts are deliberately out
  of reach, including the caller's own: locking out the last management account
  would leave nobody able to unlock anything.
- **A failed profile insert deletes the login it just made.** A login with no
  profile behind it can sign in and then see nothing, which is worse than a
  clean failure.

Revoking sets both an auth ban and `profiles.active = false`. The ban stops a
new sign-in; the flag is what the portal reads, so a session already open cannot
carry on either. The row is never deleted — documents already issued carry that
salesman's name, and a document that cannot name who raised it is worse than one
naming someone who has left.

## Four decisions worth knowing

**One function per business event, each a single transaction.** An order is two
document numbers, four inserts and a stock movement. Done from the browser that
is five requests with no way to roll back, so a crash between them leaves a van
decremented for an invoice that was never written, or an SO with no invoice
against it. `post_sale`, `post_delivery`, `post_consign_bill`, `post_payment`,
`post_return` and `register_customer` are the entire write surface, and each one
either completes or leaves nothing behind.

They are `SECURITY DEFINER` because they take numbers off the shared counter and
move van stock, so they carry their own authorisation: `acting_salesman()`
refuses unless the caller holds the outlet, and locks the customer row so
ownership cannot change mid-transaction. Management reads everything and posts
nothing — it has no van for stock to come out of.

What each one refuses, proved against a live signed-in session:

| Attempt | Result |
|---|---|
| Selling at another salesman's outlet | `this outlet is held by another salesman` |
| More units than the van holds | `van holds 12 of this product, 99999 requested` |
| A price below the floor | `price 0.01 is below the floor price 1.36` |
| An ordinary order at a consignment outlet | refused — consignment bills from its balance check |
| A stock drop at a cash outlet | refused — only consignment takes a drop |
| Billing one consignment twice | `this consignment has already been billed` |
| A balance above what was delivered | refused with the delivered quantity |
| Paying a settled invoice, or overpaying | `already settled` / exceeds outstanding |
| Calling `next_doc_no` or `move_van_stock` directly | `permission denied for function` |

## Three further decisions worth knowing

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

PostgREST publishes every public function as an RPC endpoint, so a
`SECURITY DEFINER` function is reachable by anyone the grant allows. The counter
and the stock movers — `next_doc_no()`, `move_van_stock()`, `van_take()`,
`van_put()`, `line_total()`, `acting_salesman()` — now have `EXECUTE` revoked
from `anon`, `authenticated` and `public` alike. Nothing client-side calls them;
the six posting functions reach them as their own definer. A signed-in user
therefore has no way to burn document numbers or move stock outside a posted
transaction. Verified from a live session: `permission denied for function`.

`is_management()` stays executable by `authenticated` because the RLS policies
evaluate it as the querying role; revoking it would break every policy. It
discloses nothing but a boolean about the caller.

The Supabase linter still reports the six posting functions under
`authenticated_security_definer_function_executable`. That is the intended
state — they are the write API, and their authorisation is inside them.

## Still to do

- `company` holds one row with the operating company's real details. It is
  empty: the portal still prints placeholders, including `[SSM NO. — NOT SET]`.
- No business data has been loaded. The client's outlets, products, salesmen and
  opening balances are still outstanding; the 12 outlets, 8 products and 5
  salesmen currently in the tables are stand-ins for testing.
- Leaked-password protection is off in Auth settings. It is a dashboard toggle,
  not a migration, and worth switching on before real accounts are handed out.
- `visit_schedule` is empty and nothing writes to it yet. Until a planning
  screen exists the portal derives the day's route from outstanding money, in
  the browser, and rebuilds it on every load rather than storing it.

## Test data

The transaction tables were emptied and the document counters reset to zero
after the posting functions were verified, so the first real document issued
will be `DO000001` / `SO000001` / `INV000001`. Van stock sits at 80 units per
salesman per product.
