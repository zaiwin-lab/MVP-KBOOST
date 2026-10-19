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
| Customer Profile | Everything registration collects, grouped and only shown when it exists: three figures at the top (outstanding, lifetime sales, last dealing) with the first two tappable, an ageing bar when anything is overdue, a panel of what the outlet is waiting on, the last payment actually taken, the approved special prices, every phone number with its own dial and WhatsApp button, email, the person in charge and their IC, full address with coordinates and their accuracy, opening hours and closed days, SSM name and number, TIN, payment term and months, credit limit with a warning when the debt exceeds it, service month, registration date, and the consignment stock on the shelf |
| Galeri | The five registration photograph types, read through the signed-URL edge function |
| Kelulusan (office) | The management side: payments, price requests, credit notes and stock requests waiting on a decision, each with Lulus / Tolak. Signing in as management swaps the tab bar — no van, so no Stok or GPS |
| Sejarah Kelulusan (office) | Every decision the office has made, newest first, searchable — including the documents it cancelled, and who decided each one |
| Cari Dokumen (office) | Find an invoice, delivery order or return by number or reseller. The way into a document the office needs to cancel |
| Borang Konsainan | The consignment agreement as a sheet of A4 — terms, what is on the shelf today, two signature blocks. Printed from the registration wizard before the shop signs, and from an existing outlet's profile or Galeri |
| Status Reseller (office) | Keluarkan dari Apps with a reason (and Aktifkan Semula), Set VIP, and the buyer's TIN for e-Invoicing. Service Month is the salesman's, on his own outlets |
| Batalkan Dokumen (office) | Cancel an invoice, a delivery order or a return. Stock goes back on the van, payments reverse, the shelf gives it up — and the document stays on file, numbered, marked **Dibatalkan** |
| Permohonan Saya | Everything the salesman has asked for — price change, credit note, stock request, and money the office has not yet confirmed — in one list, with what the office wrote back. Filtered Semua / Menunggu / Selesai, and reached from the bell or the home screen |
| Mohon Tukar Harga | A salesman asks for a price change on the reseller profile; approval writes a standing price the order screen then opens at |
| Request Credit Note | Raised from an invoice, capped at what is still owed, and numbered `CN000001` once the office approves |
| Jadual Harian | The day's round — pick a date, add shops, order them, note against each, and Navigate / Hubungi / Profil per stop. Suggests outlets with money owed or consignment stock due a count |
| Pulangan | Record a return from the reseller profile — product, quantity, one of seven reasons, a note and a photograph. Stock goes back on the van and the RET document prints |
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

**Every quantity field has − and + buttons.** Typing into eight boxes while
standing in a shop holding a phone in one hand is miserable, and the browser's
own number spinner is far too small to hit. The field stays typeable, so a
count of 48 is still one entry, but the common one-or-two-more case is a tap.
The buttons read the input's own `min`, `max` and `step`, so the van ceiling
and the shelf ceiling are declared once and obeyed everywhere — pressing + past
van stock clamps and says `Maksimum 24.` rather than silently accepting a
number the post would reject. They fire the same `input` event typing does, so
the running totals and the draft harvesters needed no changes. Ambil Order,
Semak Baki Stok, Pulangan, Request Stok and the registration opening order all
have them.

The line-total column on Ambil Order used to show an em dash for a row with no
quantity. Beside a − button that reads as another control, so it is now blank.

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

**Returns carry a photograph now.** MASTER FINAL asks for one and the table had
nowhere to put it. A return is a claim that goods were damaged, expired or
wrong, and the picture taken at the counter is the only evidence anyone will
ever have — without it the office is settling credits on a salesman's word
weeks later. It is attached after the return is written, so a failed upload
cannot undo a return whose stock has already gone back on the van.

That change needed three edits, not one: the edge function's own list of file
kinds, a CHECK constraint on `reseller_files.kind`, and the column itself.
Updating only the function gave a clean `sign-upload` and then a 400 on
`record`.

Verified end to end: all three guards fire, van stock went 31 → 34 on a
three-unit return, the photograph landed under kind `return`, and `RET000006`
prints with its reason on the roll.

## End-to-end pass

Every feature had been tested alone; none had been tested against the others.
A single run now walks a salesman's whole day — order, return, consignment
drop, balance check, payment — and asserts the numbers at each seam: van stock
down by exactly the units sold and up by the units returned, the shelf rising
by what was dropped and carrying forward what was counted, hutang moving by the
invoice total and back by the payment, and the stock never moving when an
invoice is merely billed.

It found one real fault, and it was a money one. **The Kesimpulan totalled four
hardcoded payment methods**, so anything taken by Gaji — or written by the web
portal, which records `Cash` rather than `tunai` — counted towards the total and
appeared under nothing. The parts did not sum to the whole, and a salesman
reconciling his cash at the end of the day would have been short with no way to
see why. The breakdown is now derived from the methods actually present, so it
always reconciles, and anything unrecognised lands in `Lain-lain` rather than
vanishing.

Chasing it turned up the cause of the stray `Cash`: **the registration form
never asked how a cash opening order was paid**, so the database fell back to
its own default. Cash registrations now ask, as the order screen already did.

**Jadual Harian is built to the written requirement, not to his app.** The
requirement is unusually explicit about what it is *not*: not attendance, not
visit tracking, no pending or completed state. It is the list of shops a
salesman means to call on, in the order he means to call on them, and nothing
records whether he went. There are no tick boxes on the screen and `done_at` is
never written.

His own app contradicts that in three places — a Kerja Harian report, GPS route
recording, a per-shop daily log — and the screen itself was never shared. The
spec is followed and the contradiction stays open as question 32. If the answer
is that tracking *is* wanted, the column is already there and it becomes a
small change rather than a rebuild.

One addition that is ours: **Cadangan**, a short list of outlets with money
outstanding or consignment stock old enough to be worth counting, one tap to
add. It is derived at render time and never stored — the salesman still decides
who he visits. Without it, planning a round means looking every outlet up by
hand.

Reordering rewrites positions from 1 upward each time rather than nudging them,
so a list that has been reordered and had stops removed for weeks cannot drift
into ties or gaps.

## The approval workflows, and the office

Four of his screens hand a request to somebody who is not the salesman, and
none of the forty screenshots showed the person doing the approving. The app
now has that half: sign in as management and the tab bar becomes **Kelulusan ·
Reseller · Ranking** — no van, so no Stok or GPS — and the home screen is the
queue of what is waiting.

The decision that mattered most: **a payment reduces the balance the moment it
is taken**, and approval is a confirmation afterwards rather than a gate
before. Otherwise a shop that has just handed over cash still reads as owing
it, and the salesman argues with them at the counter. Rejecting is what moves
money — it reverses the amount and keeps the payment on the record, because a
deleted payment leaves a receipt with nothing behind it. Rejection always asks
why, since "no" on its own is useless to the salesman at a counter tomorrow.

An invoice with money awaiting confirmation reads **Pending Acc Approval** in
his orange, and `Total Pending` on the order screen — a field that was showing
`RM 0.00` since the first build — now carries that amount.

Verified both halves: a salesman raised a price request and a credit note, a
second request for the same product was refused, a credit note larger than the
balance was refused, the office approved the price and the order screen opened
at it, rejecting a payment put RM 10.00 back on the invoice, approving a credit
note issued `CN000001` and credited RM 472.50, and a salesman calling an
approval directly got `only the office can decide this`.

Still open and genuinely blocked on the client: whether his app has an office
side at all (question 29), and what Pending Acc Approval means in his own
operation (question 6). This is a proposal, not a reading of his design.

## Permohonan Saya — the answer getting back

Those four workflows only ran one way. A salesman raised a Mohon or a credit
note, the office decided it, and nothing told him. He had to telephone. The
bell in the corner of the home screen made it worse: it carried a permanent red
dot and a "coming soon" message.

**Permohonan Saya** is one list of all four things he has asked for, newest
movement first, each showing the outcome, the date it was answered, his own
reason for asking, and — set apart in red — what the office wrote back. On a
rejection that last line is the whole point of the screen. Filters are Semua /
Menunggu / Selesai, and tapping a row opens the shop or the invoice it is
about. It is reached from the bell and from a button on the home screen that
reads `Permohonan Saya · 3 menunggu`.

The bell now carries a **count of decisions he has not looked at**, and nothing
at all when there are none. Opening the screen is what marks them read. The
"Baru" flags are measured against a snapshot taken as the screen opens, not
against the live stamp, or they would vanish in the same frame that showed
them — the badge clears, the flags stay until he leaves.

**A payment appears here only while it is waiting, or if it was rejected.** An
approved payment is not news: the invoice itself turns **Paid**, which is what
he wanted, and listing all forty-odd of them would bury the three kinds of
request that genuinely need an answer. The screen says so at the bottom rather
than leaving it a mystery.

The office keeps no bell — their home screen *is* the queue, with its own live
count, so a second unread badge over the top of it would say nothing.

Two bugs surfaced while building it, both in the stock-request path and both
now fixed: the office's rejection reason was overwriting the salesman's own
note, and the app was calling `reject_stock_request` with the wrong argument
name, which in PostgREST is a 404 rather than a null — **rejecting a stock
request had never worked at all**. Both are written up in `db/README.md`.

Verified end to end: a price request raised on the phone, rejected by the
office with a reason, and the reason read back on the salesman's phone with the
badge appearing, the flag showing, and both clearing on the way out; then the
same for a stock request, with his note and the warehouse's note sitting side
by side.

## Cancelling a document, and the office's own record

Two gaps, both of them holes the system could not be got out of from inside the
app.

**Nothing could be undone.** Post twenty units instead of two and the van
stock, the invoice and the shop's debt were all wrong with no way back. A
credit note works only on an invoice; a consignment drop or a return had
nothing at all. The office can now cancel an **invoice**, a **delivery order**
or a **return**, and the reversal is the point rather than the flag: stock goes
back on the van, payments reverse and their receipts are marked void, the
consignment shelf gives the goods up, and the debt list, Kesimpulan, the day's
takings and van stock all move in the same breath.

The document is never deleted. It keeps its running number and its lines, it
still opens and still prints — with `** DIBATALKAN **` on the roll and the
reason underneath, because the shop may be holding the original. The reason is
required, since a cancellation nobody can explain is an argument waiting to
happen. And it is the office's button, never the salesman's: he is the one
person with a motive to make a bad day disappear.

Four things it refuses, each for a reason the error spells out: a **consignment
bill** (its shelf rows were split and carried forward; unpicking that from a
button would silently corrupt the shelf — a credit note is the right
instrument), a **delivery order whose stock has already been counted**, an
**invoice with a final e-Invoice or a credit note against it**, and
**cancelling twice**.

Along the way: rejected payments were still being counted as money received in
Wang Terima — the rejection reversed the invoice but not the total. Fixed with
the same change, since a cancellation that left the money on the screen would
have looked like it had not worked.

**And the office had no record of its own decisions.** The queue shows only
what is waiting, so the moment something was approved or rejected it vanished —
no way to check whether it had already been handled, no way to see who decided
it, nothing to answer "why was that price approved in March" six months later.
**Sejarah Kelulusan** is the same four workflows read the other way, plus every
cancellation, searchable by reseller, product, document or salesman. Approved
payments are deliberately left out: there are hundreds, every one routine, and
they would bury the decisions that were actually judgements. Rejected ones are
there.

**Cari Dokumen** exists because of the first feature. An invoice can be reached
through a reseller's profile, but a delivery order and a return cannot — those
screens belong to the salesman's side — and the office is the only side that
can cancel one. "Somebody rang about DO000020" is how that conversation starts,
so that is what it takes.

One known limitation, left deliberately rather than guessed at: a **referral
verified by an invoice that is later cancelled keeps its commission**. The
table records the customer, not the invoice, so there is no safe way to tell
which sale verified it. It needs a column first.

## The reseller profile shows what registration collected

Registration asks for twenty-odd fields across seven steps. The profile showed
five of them: one phone number, one address line, the consignment stock,
service month and the payment term. Everything else — the WhatsApp number, the
office line, the email, the person in charge and their IC, the SSM name and
number, the opening hours, the closed days, the credit limit, the coordinates —
was captured, stored, and never shown to anybody again.

It is now grouped into sections — **Hubungi, Lokasi, Waktu Operasi, Syarikat,
Terma & Servis, Stok Di Kedai** — with three figures above them that answer
what a salesman wants to know before he gets out of the van: **what this shop
owes, what it has ever bought, and when it was last dealt with.**

Two decisions worth stating:

**A row appears only when it has something in it.** An outlet registered before
a field existed shows a shorter profile rather than a column of dashes. The
seeded outlets carry no opening hours, so they have no Waktu Operasi section at
all; the one registered from a real phone does, and shows *Ahad, Sabtu* under
**Hari Tutup** with the note not to schedule a visit then.

**The screen says where the pin came from.** An outlet seeded into the demo has
coordinates approximated from its district, to about 600m. An outlet registered
through the app has a device GPS fix taken standing at the shop. The profile
called both of them the first kind, which is wrong in the direction that costs
something: a salesman told his pin is a 600m estimate drives to the area and
looks around rather than driving to the pin. `coords_source` now records which
it is, the caption reads from it, and the nearest-reseller list marks an
estimated distance with `~` because a distance is only as good as the pin it is
measured from. Found when the first outlet registered from a phone outside this
project carried the same caption as the seeded ones.

**Every number is actionable where it sits.** The phone row carries a dial
button, the WhatsApp row its own link with the number normalised to a 60 prefix,
the office line a dial button, the email a `mailto:`. Previously one Call button
guessed between WhatsApp and the dialler — which is the thing the report
criticised in Coach Aril's design.

The credit limit shows **Hutang melebihi had** in red when the outstanding
balance is over it, which is the one thing on the screen that should stop a
salesman writing another order.

## What the profile answers now

Three readings were added to it after the fields, because the fields alone
answer *who this shop is* and not *what to do about it*.

**How old the debt is.** One total answers "how much"; a salesman at the
counter also needs "how old", because an invoice thirty days past its due date
is a different conversation from one raised yesterday. A red bar appears when
anything is overdue, naming how many invoices, how much, and how long the
worst one has been late. Tapping it opens exactly those invoices, **oldest
first**, each carrying its due date and how late it is — the order they should
be chased in.

**When they last actually paid.** Separate from *Urusan terakhir*, which
counts an order. An order says they wanted stock; a payment says they settle.
The row names the amount, the method, the date, and whether the office has
confirmed it yet.

**What the outlet is waiting on.** An amber panel listing every price request,
credit note and collection on this shop that the office has not answered,
longest wait first, with how many days each has waited. It is filtered by
*outlet* rather than by person — Permohonan Saya answers "what did I ask for",
this answers "what is in flight on this shop" — so a manager opening the
profile sees it too. Row-level security still limits a salesman to his own
rows, so this widens the reading, not the access. A stock request is not in
it: that belongs to a van, not to a shop.

### Approved special prices, and the two ways they go wrong

An approved **Mohon Tukar Harga** writes a standing price for that outlet, and
the order screen opens at it from then on. Nothing expires it. It was visible
nowhere except as a small green *Harga diluluskan* label once an order was
already being written.

The profile now has a **Harga Khas** section: each standing price with the
list price struck through beside it, the discount, and who approved it when.
An outlet with none says so, rather than showing an empty section.

Two checks come with it, because a price approved months ago is compared
against a catalogue that has since moved:

- **Below the new floor.** `line_total()` refuses any line under the product's
  floor price, so this is a standing price no order can use — and the salesman
  would be shown *below the floor price* on a figure the app itself filled in.
  The row says so and says the office must approve it again.
- **Above the new list price.** The special price is now worse than the price
  every other outlet gets, and the order screen would still open at it. The
  row says the shop is paying more.

Neither can be prevented at write time, only noticed. What *can* be prevented
is creating an unusable one in the first place, and that was a real gap:
nothing checked a price request against the floor at all. Migration 24 checks
it when the price is asked for and again when it is approved — twice, because
the floor can rise while a request sits waiting — and the app checks it before
the request leaves the phone so the answer is immediate and in Malay.

A refused price is shown too, with the office's reason, for sixty days or until
a later approval supersedes it. A refusal is as useful at the counter as an
approval: it stops him promising a price the office has already said no to.

## The nine buttons that said "coming soon"

Nine buttons in the app did nothing but open a sheet saying the screen was not
built. They were there because they are in the client's screenshots. Every one
of them now either does something or says plainly whose job it is — and two of
them turned out never to render at all.

**Keluarkan dari Apps** (his "Blacklist Reseller") stops an outlet trading. It
sets the same `active` flag the database has always checked, so an order, a
drop, a payment and a return are all refused at the source rather than hidden
in the UI. It takes a reason, records who decided, and can be reversed. The
dialogue says what the shop still owes before you press it, because
**blacklisting does not cancel a debt** — you stop selling to them, you do not
stop chasing them.

**Set VIP** sorts the outlet to the top of the Reseller list and the Jadual
Harian suggestions, and shows a badge. That is all it does, and the screen says
so: what VIP should *give* a shop — a discount, delivery priority, a bigger
credit limit — was never specified, and it stays an open question in the report
rather than something we invented.

**TIN** replaces "Enable TIN QR". The buyer's Tax Identification Number is
stored and printed on the invoice, ready for LHDN e-Invoicing. **No QR is
drawn.** The validation QR only exists once LHDN has validated the e-Invoice;
one we generated ourselves would look like a government attestation without
being one, which is not a thing to put on a customer's invoice. The screen
explains that rather than leaving it a gap.

**Service Month** is now editable, with a stepper, by the salesman on his own
outlets — it is his round, not a commercial term — and it feeds which shops the
daily schedule suggests.

**Borang Konsainan** was two dead buttons in two places. It is now a real sheet
of A4: the company header, the shop's details, the six terms, what is on the
shelf today priced as it was delivered, and two signature blocks. One screen
serves both callers — the registration wizard printing it for the shopkeeper to
sign before the opening order is posted, and an outlet already on the books
printing a fresh copy — because the words have to be identical in both. It
prints to A4 rather than a thermal roll, since it is signed and kept; the
phone's print sheet is also how you save it as a PDF.

The two in the Galeri **never rendered at all**: the condition tested for a
section named `konsainan` when the file kind is `consign_form`, so the branch
was dead. That is the same mismatch that once left every Galeri section empty.

And the salesman's **Keluar Invois Muktamad** is not a button at all now. It is
the office's to issue, and the screen says so instead of promising a feature.

### A bug this found, already live

Writing the error messages for all of this exposed six earlier ones that were
returning `undefined`. `return` followed by a newline is an automatic
semicolon — the function returns nothing and the string below it is dead code.
Six refusals, including every one added with document cancellation, were
showing the salesman the word "undefined" instead of a Malay explanation. All
of `friendly()` is now covered by a test that asserts every known server
message maps to a non-empty Malay string.

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
