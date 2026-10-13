# Sales Portal

**Web-based Retail Sales & Distribution Portal.**

The product carries no agency branding — the portal is the client's. The only
maker credit is a single line in the footer signature.

Built to the MASTER FINAL requirement: **16 modules, 3 transaction models**,
with Customer Profile as the command center — delivered this round as a **web
portal** so the full layout can be reviewed on a large screen before it is
wrapped as a mobile app.

This is a **separate build**. It shares no code with the earlier "Winning
Salesman" demo at the repository root, which is left untouched.

## Two pages, and an app

| Page | What it is |
|---|---|
| `index.html` | The portal — three access panels, all 16 modules, clickable |
| `playbook.html` | Operations Playbook — impact, the three models, and how each role uses it |
| `app/` | The phone app — a rebuild to the client's own design (see below) |

No install and no build step. The Public panel opens without an account; the
Management and Salesman panels need one.

## The phone app (`app/`)

The client's own design is an app, not a website, and the portal does not look
like it. `app/` is the rebuild, and it is **additive**: the portal stays live
and testable at the same URL it always had while this grows beside it.

What it is not is a second system. It signs into the same Supabase project,
reads the same resellers and documents, and will post through the same six
functions. Nothing about the data changes; only the surface does.

**Installable.** `manifest.webmanifest` declares it standalone and portrait, so
adding it to a phone's home screen opens it full-screen with no browser bar.
The icons are placeholders — a red box glyph — and want replacing with the
client's artwork before anyone outside the project installs it.

**Offline is handled, carefully.** `sw.js` caches the shell: the page, the
manifest, the icons. It caches **nothing from the database**. A salesman
standing in a shop must not be shown last week's outstanding balance because
his signal dropped — a stale figure is worse than no figure, because he will
act on it. So Supabase traffic is network-only, and when it fails the three
figures on the home screen read `—` with *"Angka tidak dapat dimuatkan"*
underneath, never `RM 0.00`.

One thing *is* kept on the phone: the salesman's own name, code and zone. That
is identity, not money, and without it a salesman opening the app with no
signal is thrown back to a login screen he cannot possibly get past.

**Built so far**

| Screen | What it does |
|---|---|
| Login | Email and password against the same accounts the portal uses |
| Home | Greeting, `Harian` cards, `Kesimpulan` with live Wang Terima / Qty Jualan / Stok Terkini, then `Invois Lama` / `D/O Lama` / `Hutang Lama` |
| Sales History | Every invoice, with month and date-range picker, search by invoice number, SSM name, app name or reseller code, and his three status colours |
| Maklumat Pesanan | Order Info block, the `Pesanan Produk` table, and the document buttons |
| Buat Bayaran | His two-step modal — Partial / Paid / Over, then Tunai · Cek · Pindahan Bank · Gaji · QR Code, amount and comment. **Posts a real payment** through `post_payment()` and issues a receipt |
| D/O Lepas | Delivery orders with quantity per drop |
| Consignment Order | The DO detail, with the consignment balance behind it |
| List Hutang | Outstanding invoices, oldest first, with the total owed |
| Kesimpulan | Date range, Wang Terima split by payment method, Qty Jualan and Stok Terkini per product |
| Reseller | Searchable list, and a profile with his four tabs — General, Sejarah Invois, Galeri, Kerja Harian |
| Customer Profile | Payment-term badge, Call (Dialer / WhatsApp), Location (Google Maps / Waze), consignment stock on the shelf, Service Month |
| Galeri | The five registration photograph types, read through the signed-URL edge function |
| Dokumen | Every Cetak and Lihat button now opens the document on a 58mm or 80mm roll, with **PDF**, **WhatsApp** and **Cetak**. D/O, Sales Order, Invois, Resit and Pulangan |
| Ambil Order | Take an order from an existing reseller. One screen, three outcomes, decided by the outlet's payment term — a stock drop at a consignment shop, an invoice at Bill To Bil, an invoice paid on the spot at Cash. Prices adjustable down to the floor; quantities capped at the van |
| Semak Baki Stok | The consignment balance check, from the customer profile. Count what is left on the shelf; the system works out what sold and raises **one** bill for the visit |
| Pendaftaran Reseller | His seven-step sequence — shop details, location with GPS capture, the person who runs it, payment term, four photographs, the opening order, and the consignment form signed and photographed back in. **Registers for real**, with the opening order posted in the same transaction |
| Stok | Van stock per product, with Stok Request and Sejarah Stok Request |
| Stock Request | **Posts a real request** through `request_stock()` |
| GPS | Nearest Reseller by distance from the handset, with map links |
| Ranking | His blue leaderboard — podium, periods, whole team |
| Settings | Who is signed in, the build date, reload, sign out — reachable from every tab |

**Ranking needed a new database function.** Row level security stops a salesman
reading another salesman's invoices, which is correct and stays. `ranking_board()`
returns a name, a zone and two totals per salesman and never a single document,
customer or line — the only thing one salesman sees of another's figures.

**Registration needed two.** `register_customer()` only stored the original
fields and silently dropped the fifteen added for his form, so it now writes all
of them and can post the opening order in the same transaction — in his design
registration and the first order are one sequence ending in one green Daftar
button, so they either both happen or neither does. And `post_consign_drop()`
issues **one** delivery order covering several products; `post_delivery()` makes
one DO per product, so dropping three products at a shop produced three delivery
notes for one visit. His app shows one Consignment Order with a product table,
which is also what the shopkeeper signs for.

Proved by registering a reseller through the wizard: every field landed in the
database, one DO with two lines, two consignment rows, five photographs stored,
van stock drawn down 80 → 68. An opening order larger than the van is refused
with the database's own message — *"van holds 68 of this product, 568
requested"* — and nothing is written, not even the customer, because the whole
registration is one transaction. The cash branch produces an SO and an invoice
and no DO; the consignment branch a DO and no invoice, since nothing is billed
at the drop.

**What is deliberately not faked.** Several controls in his design have no
backend yet and say so rather than pretending: `Keluar Invois Muktamad`,
`Request Credit Note`, `Blacklist Reseller`, `Set VIP`, `Enable TIN QR`, the
`Mohon` price-change request, Jadual Harian, and Kerja Harian. Over Payment
appears in the payment modal, as in his design, and explains that the database
still refuses it pending a decision. `Tpp` is left blank because nobody has
confirmed what it means. All of these are open items in
`COMPARISON-REPORT.md`.

**Two readings his demo data left ambiguous**, settled here: Sales History
shows what the invoice was worth, List Hutang shows what is still owed. And the
three invoice states are shown in his words and colours — Paid, Separa Bayar,
Unpaid — since `Pending Acc Approval` is an approval step we have no workflow
for.

**Verified in Chromium at 390×844**, driven through every screen: a payment
posted for real and the invoice flipped to Paid; a stock request posted and
came back in the history; search keeps keyboard focus; the date range picker
filters; the call and location sheets open; the service worker caches the shell
and the app still renders with the origin gone; with the database refused it
stays signed in and shows dashes, not zeroes. No console errors.

**The balance check needed a third function, and found two faults in the old
one.** `post_consign_bill()` bills a single consignment row, so a salesman
counting three products on a shelf raised three sales orders and three invoices
for one visit — the shopkeeper gets one bill. And it closed the row without
carrying the unsold units forward, so an outlet's stock read zero the moment it
was checked, even though the goods were still physically on the shelf.

`post_consign_check()` does both properly, and allocates **FIFO across price
layers**. A shop can hold two open drops of the same product at different
prices; the salesman counts the shelf, not which delivery each unit came from.
The oldest units are the ones that sold, so the balance is assigned to the
newest rows first and each row bills at its own price. Billing the lot at one
price would quietly misprice every outlet that ever had a price change.

Proved against a shelf holding 58 units at RM1.60 and 30 at RM1.75, plus 58 of
a second product. Counting 20 and 50 left billed 58 × RM1.60, 10 × RM1.75 and
8 × RM3.20 — one SO, one invoice, three lines, RM135.90 — and the shelf carried
forward to exactly 20 and 50. The screen's preview runs the same allocation as
the database, so what the salesman reads out at the counter is what gets
billed.

**Ambil Order is where the three transaction models become visible.** The same
screen produces a delivery order and no bill at a consignment outlet, a Sales
Order and an invoice due in two months at Bill To Bil, and a Sales Order,
invoice, payment and receipt at Cash. That is the requirement's *"payment term
is not a due date"* made literal, and all three were posted and checked against
the database: `DO000020` with no invoice, `INV000069` left pending with no
receipt, and `INV000070` paid by QR with `REC000065` behind it.

Prices are adjustable **down to the product's floor** and no further, which is
what module 04 asks for — a line went through at RM1.36 against a RM1.60 list
price, and a penny lower is refused. Quantities are capped at van stock. Totals
recalculate as the salesman types, without re-rendering, so the caret and the
phone keyboard stay put.

One difference worth flagging: his design handles price changes through a
**Mohon** request on the reseller profile rather than on the order screen. The
app says so under the table, and it is an open question in the report.

**The Cetak and Lihat buttons do something now.** They were present on his
screens from the first batch of screenshots and had been dead since. Each opens
the document on a thermal roll at the selected width, with three real actions
behind it.

- **PDF** draws the receipt as text rather than screenshotting it, so a file is
  about 4KB and the figures stay selectable. The height is worked out by laying
  the whole receipt out twice — once on a scratch page to find where it ends,
  then on a page cut to exactly that length. On a roll, the difference is paper.
- **WhatsApp** sends it as text to the reseller's own number, normalised to
  international form. A web page cannot attach a file to a WhatsApp message —
  only the operating system can — and text is what a shop owner reads off their
  phone anyway.
- **Cetak** prints at 58mm or 80mm. The `@page` rule carrying the width is
  swapped from script, because `@page` cannot read a CSS variable; without that
  the browser prints onto A4 and a 58mm layout arrives a third of the way
  across the sheet.

One description of each document feeds the screen, the PDF and the WhatsApp
text, so the three cannot disagree about what is on the paperwork. An invoice
carries a total rather than a line list, so its goods are read back through the
Sales Order it was raised from; a receipt reaches them the same way. A Bill To
Bil invoice has no delivery order behind it, and asking for one says so instead
of opening a blank document.

**Every document still prints `[Company Name] Sdn Bhd` and `[SSM NO. — NOT
SET]`.** The company row has never been filled, and the screen says so under
the receipt rather than hiding it. Name, registered address, SSM number and
phone are still outstanding from the client — question 45 in the report.

Still to come from his design: the daily planner, and whatever screen Jadual
Harian turns out to be.

## Three access panels

| Panel | Route | For |
|---|---|---|
| **Public / Universal** | `#/` | Customers, partners, recruits — what the system does, no account |
| **Management** | `#/m/dash` | Owners and supervisors — team, collections, ageing, stock, reports, AI |
| **Salesman** | `#/s/home` | The field — schedule, orders, consignment, collections, documents, ranking |

Every panel reads the same data. Nothing is duplicated between them.

## The three standard items

1. **Four-pane language** — Bahasa Malaysia · English · 中文 · Jaku Iban. The
   switch is in the top bar of every page, persists in `localStorage` under
   `sp.lang`, and carries across from the portal to the playbook.
2. **Corner bubbles** — bottom-left **AI Help 24/7** opens an assistant that
   answers from live data; bottom-right is **WhatsApp**, in the platform's own
   green, going straight to `010-267 0177` with no drawer in between. It
   pre-fills a one-line message naming the page the visitor came from, so an
   incoming enquiry is recognisable on arrival without having to ask. The
   portal sends "Sales Portal demo", the playbook sends "Operations Playbook",
   and the line itself follows the selected language.
3. **Signature footer** — one line, `Designed & Built by KOBIS Berhad`, set
   small and letterspaced so it reads as a signature rather than a second
   logo. The name links to kobisberhad.com and the gradient shine, glow and
   underline sweep run on hover.

### What the language switch covers

The chrome, navigation, panel names, section headings, KPI labels, table
headers, period tabs, bubbles and footer all translate, plus every lead
paragraph and both step-by-step routines in the playbook.

The Iban column is a first pass written against standard Iban vocabulary. It
should be read by a native speaker before this goes in front of a Sarawak
audience — the technical loanwords (order, invoice, consignment, stock) are
deliberately left as-is, but the connecting prose is worth a check. This applies
to the whole column, which is now roughly 365 entries.

Deliberately **not** translated: running numbers, document type names
(`DO`, `SO`, `Invoice`, `Receipt`, `RET`), the three model names
(`Consignment`, `Bil to Bil`, `Cash`), product names, and outlet names. These
are proper nouns on printed paperwork and must read identically in every
language.

Everything else does translate, including the transaction screens, every modal
and refusal message, and the AI assistant's answers and suggested questions. An
earlier build kept the deeper screens in Bahasa Malaysia on the reasoning that
counter staff work in BM; that is not defensible next to a four-language switch,
so the remaining 175 strings were translated.

Strings that wrap a number or a name go through `TF("key",{…})`, which fills
`{placeholders}`, because word order moves between languages and a sentence
split into fragments cannot be reassembled correctly in all four.

## The three transaction models

Payment Term is not a due date — each runs a different transaction flow.

Which documents exist depends on the term. There is no Order document — taking
an order is a step, not a numbered document.

**📦 Consignment** — the only term that produces a DO. Stock is delivered first,
and the customer is charged only for what actually sold.

```
Hantar Stock 100 unit    → DO issued at the drop
  → next visit: masukkan Baki Stock = 30
  → sistem kira 100 − 30 = 70 unit terjual
  → SO for the 70 units sold
  → Invoice = 70 × RM5 = RM350   (not 100 units)
  → Payment → Receipt
```

**📝 Bil to Bil** — no DO; goods and sale happen on the same visit.
`SO → Invoice → Payment ikut term → Receipt`

**💵 Cash** — no DO, paid on the spot.
`SO → Invoice → Payment terus → Receipt`

## Running numbers

Five independent sequences, in the required format:

`DO000001` · `SO000001` · `INV000001` · `RET000001` · `REC000001`

They are deliberately **never in step with each other**, because each is issued
on a different event: a DO only when consignment stock is dropped, an SO only
when goods actually sell, an Invoice once the office processes the SO. In the
seeded demo that lands at `DO000012` · `SO000054` · `INV000052` · `REC000041` ·
`RET000005`. A couple of the day's SOs are deliberately left awaiting invoice,
which is what keeps those two sequences apart.

## What is real vs. simulated

**Real — computed live from the seeded data**
- All arithmetic: sales, outstanding, overdue, debt ageing, commission, ranking.
- The document chain, branching on payment term. Submitting an order on a Bil
  to Bil or Cash outlet really creates SO → Invoice with no DO; a consignment
  drop really creates a DO and bills nothing until the balance is checked. Each
  document carries its own running number and a due date derived from the
  customer's payment term.
- **Consignment reconciliation.** Entering a balance really computes units sold
  and bills only those units. The SO and Invoice carry the DO they came from, so
  the paperwork traces back to the delivery weeks earlier.
- **Delivering consignment stock** really issues a DO and decrements van stock,
  with nothing billed until the balance is checked.
- Payments (full and partial) really update invoice status and outstanding.
- Returns really create a `RET` document and add stock back to the van.
- Van stock really decrements when an order is submitted.
- Search really filters on code, name, PIC, phone and WhatsApp.
- Ranking really recalculates on every sale, across all periods.
- **The AI layer.** Route order, quiet-outlet detection, payment behaviour and
  the management briefing are all derived from the transaction data at render
  time. Change the data and every reading changes with it. The AI Help bubble
  answers from the same selectors, so its figures always agree with the panel
  behind it.

**Simulated — clearly fake, by design**
- The dataset: 1 company, 5 salesmen, 12 outlets, 8 products, ~120 days of
  trading history, generated from a fixed seed so every run is identical.
- The **daily schedule** cannot be planned or ticked off; the day is ordered by
  outstanding money and rebuilt on each load.
- The AI Help bubble matches on keywords against live selectors. It is not a
  language model and will fall back to a menu of topics on an unrecognised
  question.
- GPS coordinates resolve from the outlet's registered district — a pin lands
  within about 600m of the right town centre — but they are derived, not device
  readings. The registration screen's "Tangkap GPS" resolves from the district
  typed into Kawasan; on a phone this would read the handset.

The two items that used to head this list — no login, no database — are done.
See **Signed in against the database** below.

## Signed in against the database

Opening a management or salesman route asks for an account. Everything behind it
reads and writes Supabase; see `db/README.md` for the schema and the security
boundary.

- **Master data is live.** Company, products, outlets, the salesman roster and
  van stock all come from the database on sign-in.
- **Transactions are written to the database**, each through one function that is
  a single transaction. Submitting an order, dropping consignment stock, billing
  a balance, recording a payment, saving a return and registering an outlet are
  the six events; each either completes or leaves nothing behind. Reload and the
  paperwork is still there.
- **Running numbers come off a shared counter**, so two salesmen submitting at
  the same instant cannot both be issued `INV000042`.
- **A salesman sees only his own outlets and paperwork.** Row level security is
  the boundary, not the screen — the database returns nothing else, however it
  is asked. Management reads everything and posts nothing.
- **The management panel is read-only.** An outlet opened from there shows who
  holds the account, with no Take Order or Payment commands for someone else's
  customer.

## Documents leave the building

The three actions on a document are real.

- **PDF** generates an actual file, drawn as text at the selected roll width —
  80mm or 58mm, cut to the length of the receipt rather than padded to A4. The
  figures stay selectable and the file is about 4KB. The library loads from a
  CDN on first use; with no connection the button says so and points at Print.
- **WhatsApp** opens a chat with the outlet's own number, normalised to
  international form from however it was written on the customer card, with the
  document written out as readable text. A web page cannot attach a file to a
  WhatsApp message — only the operating system can — so the document travels as
  text, which is what a shop owner reads off their phone anyway. An outlet with
  no number recorded is told so instead of opening a broken link.
- **Print** is the browser's own print path, which is what actually reaches a
  printer, including a Bluetooth thermal printer paired with the phone. `@page`
  is rewritten to the selected roll width whenever it changes, so the receipt
  feeds at its true size instead of being scaled onto A4, and everything but the
  receipt is hidden.

`docModel()` describes a document once and the on-screen receipt, the PDF and
the WhatsApp message all render from it, so the three cannot disagree about what
is on the paperwork. An invoice carries a total rather than a line list — the
goods are described on the SO it was raised from — so the lines are read back
through that link, because a customer being charged has to see what for.

**Still simulated, by design:** the Public panel and the **Sample data** badge.
Choosing "Open the Public panel" from the login screen runs the whole system on
generated figures with no account — the seeded 5 salesmen, 12 outlets, 8 products
and ~120 days of trading. That path never touches the database, and every screen
on it carries the badge. It is for showing the system, not for recording work.

## Van stock goes back up

Selling draws a van down, a consignment drop draws it down, and a return puts a
little back. Nothing else did, so every van drained toward zero and would have
refused all orders within about a week of real trading.

Restocking has two sides, because both happen in distribution:

- A salesman opens **Request Stock** on Stok Van. The sheet arrives pre-filled
  with whatever is at or under its minimum level, topped up to five times that —
  the products running out are the point of the screen, so they are not typed
  out again. Each line becomes a request, with an optional note.
- Management sees the queue on **Stok**, with the salesman, the product, what
  was asked for and what is currently in that van, and supplies it or rejects
  it. It can also load any van directly without a request, which is what loading
  a van in the morning actually is.

Every issue is recorded in `stock_issues`, so a van balance can be explained —
who put stock in it, when, and against which request — rather than just
asserted. `issue_stock()` is management-only: a salesman able to issue to his
own van could conjure the stock that every sale is then checked against.

## Salesman accounts

Management → **Akaun Salesman** lists the team with their login email, zone,
outlets held and units in the van, and opens, updates or revokes an account
without anyone touching Supabase.

Opening a login, changing a password and revoking access go through the
`admin-users` edge function, because all three need the service role key and
that key bypasses row level security — it can never sit in a browser. The
ordinary profile fields (name, code, zone, phone, carries-stock) are a plain
table write, since management already holds that right through RLS.

Revoking asks first, and says plainly that nothing is deleted: the salesman
cannot sign in again, and their outlets, documents and sales record all stay.
The roster deliberately keeps revoked salesmen so their name still resolves on
documents they raised; screens that hand out new work filter them out.

## Refer & Earn

A salesman records a shop he introduced, with a phone and district. When that
shop is registered, the registration form offers his pending referrals and
claims one. When the shop's first invoice is **settled** — paid, not merely
raised — the referral is verified and 5% of that invoice is recorded as
commission, once.

Both of those rules are decisions the brief never made; they are the
conservative reading and they are stated in `db/README.md` so they can be
changed on a word from the client.

The share button carries the salesman's own code, derived from his initials and
staff code. It previously carried one person's initials and a link to a domain
nobody owns, so every salesman shared the same one.

## Verified

Checked in a real browser (Chromium) before each deploy, on the demo path and
signed in as a real salesman and as management.

**Demo path** — 25 routes render with no page errors; no horizontal overflow at
360, 390, 768, 1024 and 1440px; all four languages switch and persist across a
reload and across pages; an order still runs entirely in memory and writes
nothing.

**Signed in** — 19 salesman routes and 9 management routes render with no page
errors, including document views addressed by real running numbers.

**The login itself**, driven with the mouse only: clicking the email box, the
password box or a label raises nothing; a wrong password keeps the email and
focuses the password; an empty submit is answered locally and never reaches the
server; a correct sign-in lands on the right panel.

**Posting, through the actual screens:**

- A Bil to Bil order issues SO → Invoice, no DO, due date on the term, and the
  van drops by exactly what was sold.
- A Cash order settles on the spot and issues the receipt with it.
- A partial payment leaves the invoice `partial` with the right outstanding; the
  balance settles it and routes to the generated `REC`.
- Consignment: the drop issues a DO and bills nothing; 40 − 15 = 25 sold, billed
  RM 120.00 and not RM 192.00 for all 40, with the SO carrying the DO it came
  from.
- A return issues a `RET` and puts the stock back on the van.
- Registering an outlet takes its code off the shared counter.
- **Reload and every one of them is still there** — the whole point.
- A second salesman signed in sees none of it, and management sees all of it.

**Refusals** — the nine the database enforces are listed in `db/README.md`, each
checked against a live signed-in session.

## Deployment

Its own Netlify project, separate from the earlier demo. `netlify.toml` names
every published file explicitly — the portal, the playbook, their assets, and
the six files under `app/`. This README is never served.

Two headers under `/app/` are not cosmetic. `sw.js` is sent `no-cache`: a phone
holding an old service worker keeps serving an old shell, and a deploy never
reaches the salesman — the one failure of an installed app that the user cannot
clear himself. And `manifest.webmanifest` is sent as `application/manifest+json`,
because Netlify would otherwise serve the unknown extension as octet-stream, a
manifest served that way is ignored, and the app stops being installable with
no visible error anywhere.

Deploy from **this folder** (the CLI uploads the current directory):

```shell
cd salesmanapps
npx -y @netlify/mcp@latest --site-id <site-id> --proxy-path <token>
```

## Notes for the engineer

Single self-contained `index.html`: styles, then the i18n dictionary, then
data, then selectors, then the AI layer, then panels, then actions, then the
router.

- **Hash routing** — `#/m/...` is management, `#/s/...` is salesman, bare `#/`
  is public. Every screen is addressable and the back button works.
- **Two code paths, one set of screens.** Signed in, a mutation goes through
  `post()` to a database function and the ledger is re-read from the server, so
  what is on screen is what was stored. On the demo path the same action runs
  `mkDelivery()` / `mkSale()` / `payInvoice()` in memory. Every action branches
  on `LIVE()` once, at the top, and both branches feed the same modal.
- `loadLedger()` reads the transaction tables back into the same `DB.*` arrays
  the panels already used. The local id stays the **running number**, because
  that is what the screens print and what the document routes address; the uuid
  rides along as `.uuid` for the posting functions. Cross-references are
  rewritten from uuid to running number on the way in, so `inv.soId` is still
  `"SO000002"` exactly as the seeded data had it.
- `mkDelivery()` issues a DO and nothing else — consignment drops only.
  `mkSale()` issues the SO and, unless told to hold it, the Invoice. Between
  them they are the only places a document is created on the demo path, so a
  term can never end up with paperwork it should not have. There is no single
  chain builder, because there is no single chain.
- The **SO is the canonical record that a sale happened**. `ordersIn`, `qtyIn`,
  `custIn` and the product report all read from `DB.sos`. There is no `DB.orders`.
- `payInvoice()` is the single place that records a payment and issues a receipt.
- Payment term lives on the customer, so the same order flow branches correctly
  for all three models without duplicated screens.
- `T(key)` is the only way user-facing chrome text reaches the DOM; adding a
  language means adding a fifth column to `DICT`.
- Navigation clears any open modal — a sheet left standing across a route change
  would sit on top of the new screen and swallow every click.
- A `<form>`'s `data-a` is its **submit** action and is dispatched only by the
  submit listener. The click dispatcher skips FORM elements: it resolves an
  action by walking up from the click target, so without that skip, clicking an
  input inside a form fires the form's action with the fields still empty.
