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
| 19 | `void_documents` | `voided_at` / `voided_by` / `void_reason` on the four document tables, `consignments.voided_at`, and `void_invoice()` · `void_delivery()` · `void_return()` behind `void_document()` |
| 20 | `reseller_status_flags` | `customers.blacklisted_*`, `vip*`, `tin*`, the four `set_*` functions, and `customers_upd` narrowed to management |
| 21 | `function_execute_allowlist` | `public` functions denied by default; EXECUTE granted back only to what the apps call |
| 22 | `rls_initplan_and_fk_indexes` | 30 policies evaluate `auth.uid()` once per statement instead of once per row; 43 foreign keys gain a covering index |

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

## Cancelling a document

Nothing could be undone. A salesman who posted twenty units instead of two had
wrong van stock, a wrong invoice and a wrong debt, and no way back: a credit
note works only on an invoice, and a consignment drop or a return had nothing
at all. This is the first operation in the system that reverses another.

**Cancelling is the office's, never the salesman's.** He is the one person with
a motive to make a bad day disappear, so `void_document()` goes through
`require_management()` like every other decision. A reason is required, not
optional — a cancelled document with no explanation is an argument waiting to
happen.

**Nothing is deleted.** The document keeps its running number, keeps its lines,
and is marked with `voided_at`, `voided_by` and `void_reason`. It still prints,
with `** DIBATALKAN **` on the roll and the reason under it, because the shop
may be holding the original. Running numbers are never reused.

Three reversals, one per document that moves something:

| | What it undoes |
|---|---|
| `void_invoice()` | Puts the SO's lines back on the van, marks the SO cancelled, reverses every payment against it (exactly as a rejection does) and marks their receipts void, then zeroes `paid`. `total` is left alone — a cancelled document must still read what it said. |
| `void_delivery()` | Puts the drop back on the van and marks its `consignments` rows voided, so the shelf no longer holds them. |
| `void_return()` | Takes the goods back off the van through `van_take()`, which raises if they have since been sold on again — the right answer, since the van cannot give back what it no longer holds. |

### What it refuses, and why

- **A consignment bill.** `post_consign_check()` splits shelf rows, carries
  balances forward at the price they were delivered at, and creates new rows
  dated now. Unpicking that from a cancel button would silently corrupt what is
  on the shelf, which is worse than not offering it. A credit note is the right
  instrument for an over-billed consignment, and the error says so.
- **A delivery order whose stock has already been counted.** The shelf has
  moved on and the goods have been billed; there is nothing left to take back.
- **An invoice with a final e-Invoice issued**, or with a credit note approved
  or still pending against it. Each would leave two documents disagreeing.
- **Cancelling twice.**

### Everything stops counting at once

A cancelled document that still appears in a total is worse than no cancel at
all. The app reads every figure through `INVS()`, `SOS()`, `RETS()`, `PAYS()`
and `SHELF()` rather than off the raw arrays, so one cancellation moves the
debt list, Kesimpulan, the day's takings, van stock and the consignment shelf
together. `post_consign_check()` was changed to skip `voided_at` rows as well,
or a count would still bill stock that had been taken back.

`PAYS()` also drops **rejected** payments, which were being counted as money
received since long before cancellation existed — a rejected payment reversed
the invoice but still showed up in Wang Terima.

### Two things worth knowing

A referral verified by an invoice that is later cancelled **keeps its
commission**. `referrals` records the customer, not the invoice, so there is no
safe way to tell which sale verified it. Left alone deliberately rather than
guessed at; it needs a column before it can be handled properly.

And the Supabase MCP `execute_sql` tool times out on a function body containing
`delete from`, every time, while the identical body without it applies in under
a second. The reversal marks `consignments` rows instead of removing them,
which is the better design anyway — but the reason it was written that way the
first time was a tool, not a principle.

## Reseller status: out of the app, VIP, TIN, service month

Four buttons on the client's customer profile did nothing. Each now does one
thing, through one function, with the authority it actually needs.

**Keluarkan dari Apps** (his "Blacklist Reseller") sets `customers.active =
false`, which is the flag `acting_salesman()` has always checked — so clearing
it is what genuinely stops an order, a drop, a payment or a return, rather than
a new flag that each writer would have to remember. `blacklisted_at`,
`blacklisted_by` and `blacklist_reason` record who decided and why; without
them nobody can answer that next month. **Debt survives**: you stop selling to
a shop, you do not stop chasing what it owes, and `set_blacklist()` returns the
outstanding balance so the office is told rather than finding out later.

**Set VIP** is a label and a sort order, and nothing else. What VIP should
*give* a shop — a discount, delivery priority, a higher credit limit — was
never specified, so it is not invented here. The app says so on the screen and
it stays an open question in the report.

**TIN** stores the buyer's Tax Identification Number for LHDN e-Invoicing. The
shape is validated (`^[A-Z]{1,2}[0-9]{9,13}$`), the number is not — only LHDN
can say whether a TIN is real, and a check that implied otherwise would be
worse than no check. The client's button said "Enable TIN QR"; **no QR is
generated**. The validation QR exists only once LHDN has validated the
e-Invoice, and one we drew ourselves would look like a government attestation
without being one.

**Service Month** is the only one of the four the salesman may set, and only on
his own outlets. How often an outlet is serviced is his round, not a commercial
term, and it feeds the Jadual Harian suggestions.

### The hole these flags opened

`customers_upd` was `is_management() OR salesman_id = auth.uid()`, so a
salesman could PATCH his own outlets through PostgREST directly — including,
once these columns existed, `active`, `vip` and `blacklisted_at`. Neither app
writes to `customers` at all (every write goes through `register_customer()`,
which is `SECURITY DEFINER`), so the policy is now management-only. A salesman's
direct write changes no rows.

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

## The API surface is an allow-list

Supabase grants `EXECUTE` on every new function in `public` to `anon` and
`authenticated` by default. Every function written for this project inherited
that, which meant the internal helpers were published to the REST API the
moment they were created: `van_put`, `van_take`, `move_van_stock` and
`next_doc_no` were all callable by anyone holding the publishable key and a
signed-in session.

Nothing was exploited — the posting functions were still the only way to make
a *coherent* change, and row level security still held — but a signed-in
salesman could have put stock on his own van, or burned document numbers.

Migration `function_execute_allowlist` fixes the cause rather than the
instances. The schema default is revoked first, so a function added by the
next migration is unreachable until it is deliberately granted; then every
existing function is revoked and only what the two applications actually call
is granted back. Twenty-six reachable, fifteen internal.

**Two traps, both of which this hit:**

`is_management()` must stay executable by `authenticated`. It is called inside
the row level security policies on every table, and a policy is evaluated as
the *querying* role, not as the function owner. Revoking it does not tighten
anything — it silently empties every management query. The validation sprint
caught this within a minute of the change, which is the whole argument for
having one.

`doc_seq` has RLS enabled with no policy, and the linter flags it as a finding.
It is deliberate: deny-all. The table is reached only through `next_doc_no()`,
which locks the row, and that lock is what stops two salesmen posting at the
same instant from being handed the same invoice number. Adding a policy to
satisfy the linter would undo it. Both the table and the function now carry a
SQL comment saying so.

`db/api-surface.mjs` proves the result from the outside: it signs in as a
salesman and tries to call the internal functions directly, the way anyone
with the publishable key could.

### Still open

**Leaked-password protection is disabled**, and it cannot be enabled from a
migration — it is a project setting, at *Authentication → Policies* in the
Supabase dashboard. It checks new passwords against HaveIBeenPwned. Worth
turning on before real salesman accounts are issued, because they will choose
weak passwords.

## Two performance findings, and one the linter is wrong about

**Thirty row level security policies were re-evaluating `auth.uid()` for every
row.** The planner treats it as opaque, so `salesman_id = auth.uid()` called
the function once per row scanned. Wrapped as `( select auth.uid() )` it
becomes an InitPlan — evaluated once per statement, result reused.
`is_management()` got the same treatment, since it appears in nearly every
policy here.

The rewrite was generated from `pg_policy` rather than typed out, because a
mistyped policy silently changes who can see what. A snapshot was taken first,
the wrapper stripped back out afterwards, and the two compared: **zero
policies changed meaning**. The validation sprint was then re-run end to end.

**Forty-three foreign keys had no covering index** — mostly the `voided_by`,
`decided_by` and `product_id` columns added over the last fortnight. Without
one, every delete or update of a parent row scans the whole child table.

### Where the linter is wrong

It also reports four indexes as "never used", and they are kept deliberately.
The tables hold between 15 and 87 rows, where Postgres will choose a
sequential scan whatever indexes exist — so "unused" here means *the dataset
is too small to need one*, not *not needed*. Three of the four cover
`salesman_id`, which is the column every policy filters on, and therefore
exactly what will carry the load once the tables are real. Dropping them to
satisfy a linter would remove the indexes that matter most.

Likewise the "multiple permissive policies" warning on `company`, `products`
and `profiles`: that is a read policy and a write policy coexisting, which is
the intended shape.

### A note on scratch tables

Taking the policy snapshot meant creating a table in `public`, and Supabase's
default privileges granted it full read and write to `anon` and `authenticated`
the moment it existed — with no RLS. It was dropped immediately, but the lesson
generalises: **any table created in `public`, even for five minutes, is
world-accessible until RLS is enabled on it.** Unlike the function grants,
this default is intentional in Supabase's model — row level security is what
does the protecting, which is why every table here has it enabled, and why
that is now checked rather than assumed.

## Validating a release

`db/validate.mjs` runs the acceptance criteria from the repository README as
one audited cycle, in the order it specifies: management creates a
salesperson, stock is issued, that salesperson serves an outlet, a transaction
posts, a document leaves the system, a payment settles, management reconciles.

It drives the application's own Supabase client in a real browser, so the
tokens, the row level security policies and the posting functions are the ones
a salesman's phone uses — **no service-role key, no bypass**. That is the whole
point: a validation that runs as an administrator proves nothing about what a
salesman can reach.

It creates its own salesperson account and its own outlet, so criterion 3 is
tested against a genuinely empty account rather than one that happens to look
empty, and it revokes the account and deactivates the outlet when it finishes.

```sh
git rev-parse HEAD > .validation-commit    # the build being validated
node db/validate.mjs                        # with the app served on :8901
```

It prints pass or fail per criterion and writes `validation-run.json`. The
findings go in a dated note — see `VALIDATION-2026-10-15.md` for the shape:
dataset, tester roles, result per criterion, defects found, and an explicit
statement of what the run does **not** cover.

## Test data

The transaction tables were emptied and the document counters reset to zero
after the posting functions were verified, so the first real document issued
will be `DO000001` / `SO000001` / `INV000001`. Van stock sits at 80 units per
salesman per product.

### Kept demo-ready

The data since then is about ten weeks of a five-salesman round, and it is
maintained so that opening either login shows a working day rather than an
empty screen:

- **The office queue is never empty.** Three collections taken this morning and
  not yet confirmed, two price requests, a credit note and two stock requests —
  spread across four salesmen, so it reads like a team rather than one man.
- **`SM01` is the demo salesman.** His home screen shows money taken and
  quantity sold *today*, his bell carries an unread count, and Permohonan Saya
  has both things waiting and things recently answered, including rejections
  with the office's reason attached.
- **Cancelled documents are left in deliberately** — an invoice, two delivery
  orders and two returns. They are the clearest demonstration of the reversal
  working, and they show correctly as struck through and marked *Dibatalkan*.
- **`C0016` Uncle Aiman Workshop is left alone.** It is a real registration
  done from a phone, with real photographs, and it is the proof that
  registration works end to end.

Two faults were fixed while setting this up, both of which would have been
visible in a demo:

- **Seven stock requests were answered before they were asked.** The seed
  generated `decided_at` and `requested_at` independently, so the history
  screens read "Dimohon 8 Okt · Dijawab 24 Sep". Decisions are now placed a few
  hours after their request.
- **Re-running a test twice left exact duplicate rows** — same note, same
  decision, same day. One of each is useful; two is obviously machinery.

Nothing here is dated in the future, which is checked rather than assumed: a
document dated later than now is the first thing that gives demo data away.
