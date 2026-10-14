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
| 12 | `ranking_board` | `ranking_board(from, to)` — the leaderboard, without breaking row level security |
| 13 | `registration_with_opening_order` | `post_consign_drop()`, and `register_customer()` extended to every field his form collects |
| 14 | `consignment_visit_check` | `post_consign_check()` — one bill per visit, FIFO across price layers, unsold stock carried forward |
| 15 | `grant_consign_drop_to_salesmen` | `post_consign_drop()` granted to `authenticated`, so taking an order at a consignment outlet reaches it |
| 16 | `return_photo` | `returns.photo_path`, `set_return_photo()`, and `return` added to the file kinds |
| 17 | `approval_workflows` | `price_requests`, `customer_prices`, `credit_notes`, payment approval columns, and the six decision functions |
| 18 | `request_feedback_to_salesman` | `profiles.alerts_seen_at`, `stock_requests.decide_note`, `mark_alerts_seen()`, and a fix to `reject_stock_request()` |

## The leaderboard, without a hole in row level security

A salesman must not read another salesman's invoices, and the policies enforce
that. But a ranking screen has to show the whole team. `ranking_board()` is a
`SECURITY DEFINER` function returning one row per salesman — code, name, zone,
sales, collected, order count — and nothing else. No document, no customer, no
line ever leaves through it. It is the only thing one salesman sees of
another's figures, and it is aggregate by construction rather than by a filter
someone could forget.

## The four approval workflows

Four of the client's screens put a request in front of somebody who is not the
salesman: a payment waits for accounts, a price change is submitted as **Mohon**,
a credit note is requested, and a stock request is approved. None of his forty
screenshots showed the person doing the approving, so this is a proposal for
that half rather than a copy of one.

**A payment is recorded and reduces the balance the moment it is taken.**
Approval is a confirmation afterwards, not a gate before. The alternative — an
unapproved payment leaving the balance untouched — means a shop that has just
handed over cash still reads as owing it, and the salesman argues with them at
the counter. It also makes the change additive: if accounts never approves
anything, the system behaves exactly as it did before. **Rejection** is what
moves money, and it reverses the amount off the invoice rather than deleting
the payment, because a deleted payment leaves a receipt with nothing behind it.

**Tukar Harga writes a standing price.** `price_requests` holds the ask;
approving it writes `customer_prices`, which the order screen then opens at and
marks as approved. Per-customer pricing is visible in the client's own data —
one product at two prices in two shops — and the system had no room for it. One
pending request per product per outlet, so a salesman cannot queue five.

**A credit note is a financial document, not a stock movement**, which is why
it is separate from a return: a return puts goods back on the van, a credit
note reduces what the shop owes without anything moving. Approving one issues a
`CN` running number and credits the invoice. The requested amount cannot exceed
what is still outstanding, less anything already pending against the same
invoice.

Every decision goes through `require_management()`, and a salesman calling one
directly gets `only the office can decide this`.

### Two things worth remembering

A `CASE` expression assigned to an enum column does **not** cast implicitly the
way a bare string literal does. `reject_payment` and `decide_credit_note` both
failed with *"column status is of type invoice_status but expression is of type
text"* until the CASE was cast explicitly. The failure was silent in the UI
because the error only surfaced in a toast.

And introducing an approval gate must **backfill existing rows as approved**.
Without it the office signs in to a queue of forty-four historical payments it
was never asked to review.

## The answer getting back to the salesman

The four workflows above only ran one way. A salesman raised a Mohon or a
credit note, the office decided it, and nothing told him — he had to telephone.
Migration `request_feedback_to_salesman` is the return path.

`profiles.alerts_seen_at` is a single timestamp per person: everything decided
after it is unread. One stamp rather than a row per notification, because the
question a salesman asks is "what has happened since I last looked", and a
table of read receipts would be a second thing to keep correct for no extra
answer. It defaults to `now()`, so switching this on does not greet everybody
with a month of history.

`profiles` is management-write, and should stay that way — a salesman must not
be able to edit his own code, zone or role. So the one field that *is* his to
set moves through `mark_alerts_seen()`, a `SECURITY DEFINER` function that
stamps `auth.uid()` and nothing else, rather than by widening the table's write
policy.

### Two bugs this uncovered

`reject_stock_request()` wrote the office's reason into `note` — which is the
*salesman's* column, holding why he asked for the stock. The answer destroyed
the question, and his history screen read the rejection back to him as if he
had written it. The reason now goes in `stock_requests.decide_note`, which the
other three workflows already had.

And the app was calling that function with `p_note` when the argument is
`p_reason`. PostgREST resolves an overload by argument *name*, so a wrong name
does not quietly fall through to the default — it fails to find the function at
all. Rejecting a stock request had never worked. Worth remembering when adding
an RPC: the parameter names are part of the contract, and a typo in one is a
404, not a null.

## A photograph on a return

MASTER FINAL asks for "Gambar Produk" on a return and the table had nowhere to
put one. It is not decoration: a return is a claim that goods were damaged,
expired or wrong, and the photograph taken at the counter is the only evidence
anyone will ever have. Without it the office settles credits on a salesman's
word weeks after the fact.

`returns.photo_path` holds it, and `set_return_photo()` attaches it after the
return exists. Recording it separately rather than as a sixth argument to
`post_return()` is deliberate: a photograph that fails to upload must not undo
a return whose stock has already gone back on the van.

Adding a new file kind turned out to touch **three** places, not one. The edge
function keeps its own `KINDS` list, and `reseller_files.kind` has a CHECK
constraint of its own. Updating only the function produced a clean `sign-upload`
followed by a 400 on `record` — *"violates check constraint
reseller_files_kind_check"*. Worth remembering: the allowed kinds live in the
edge function **and** in the table.

## Taking an order

`post_consign_drop()` was revoked from `authenticated` when it only served
registration. Taking an order at an existing consignment outlet is the same
business event, so the app calls it directly and the grant is restored.

That is the same posture as `post_sale()` and `post_delivery()`: it carries its
own authorisation. `acting_salesman()` refuses unless the caller holds the
outlet and locks the customer row so ownership cannot change mid-transaction,
`van_take()` refuses a quantity the van cannot cover, and the term check refuses
anything that is not a consignment outlet.

Which function the order screen calls is decided entirely by the outlet's
payment term, which is where the three transaction models stop being a
description and start being behaviour:

| Term | Function | What is written |
|---|---|---|
| Konsainan | `post_consign_drop()` | One DO, consignment rows, nothing billed |
| Bill To Bil | `post_sale(pay_now = false)` | SO and invoice, due by the agreed term |
| Tunai | `post_sale(pay_now = true)` | SO, invoice, payment and receipt |

## The balance check, as one visit

`post_consign_bill()` bills one consignment row. A salesman counting three
products on a shelf therefore raised three sales orders and three invoices for
a single visit, and the shopkeeper is handed one bill. It also closed the row
without doing anything with the unsold units, so an outlet's stock read zero
the moment it was checked even though the goods were still on the shelf.

`post_consign_check(customer, counts)` takes what was counted per product and
writes one SO and one invoice for the visit. Two things it has to get right:

**FIFO across price layers.** A shop can hold two open drops of the same
product at different prices — 40 at RM1.30 in March, 30 at RM1.35 in April. The
salesman counts the shelf, not which delivery each unit came from. The oldest
units are the ones that sold, so the counted balance is assigned to the newest
rows first and whatever each row has left over is what sold, at that row's own
price. Billing the lot at one price would quietly misprice every consignment
outlet that ever had a price change.

**Carry-forward.** Each row with a balance left is reopened as a new row at the
same price and the same originating DO, so the next visit counts against what
is actually there.

Verified against a shelf of 58 at RM1.60 plus 30 at RM1.75, and 58 of a second
product at RM3.20. Counting 20 and 50 remaining produced one invoice with three
lines — 58 × RM1.60, 10 × RM1.75, 8 × RM3.20, RM135.90 — and left exactly 20
and 50 open. The function refuses a balance above what is on the shelf, a count
for a product with nothing open, a non-consignment outlet, and a visit where
nothing has sold.

## Registration, as one transaction

`register_customer()` originally stored the first sixteen columns and silently
dropped the fifteen added for the client's own form — a registration could
collect an IC number, opening hours, a commission group and a service interval
and keep none of them. It now writes all of them.

It also posts the opening order. In his design registration and the first order
are one sequence ending in one green Daftar button, so they belong in one
transaction: a customer created without the stock that was physically handed
over is worse than a clean failure. Consignment goes through
`post_consign_drop()`, everything else through `post_sale()`.

`post_consign_drop()` exists because `post_delivery()` issues one delivery order
per product. A salesman dropping three products at a shop got three delivery
notes for one visit. This writes one DO with several lines and one consignment
row per line, which is what the shopkeeper signs for. Every line is taken from
the van before anything is written, so a van that cannot cover the drop fails
the whole delivery rather than half of it. EXECUTE is revoked from
`authenticated` — it is reached only from inside `register_customer()`.

Verified against a live session: an opening order larger than the van is refused
with `van holds 68 of this product, 568 requested`, and nothing survives — not
the delivery order, not the customer, and not the customer code, because
`next_doc_no` rolls back with everything else.

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
