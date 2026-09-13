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

## Two pages

| Page | What it is |
|---|---|
| `index.html` | The portal — three access panels, all 16 modules, clickable |
| `playbook.html` | Operations Playbook — impact, the three models, and how each role uses it |

Open `index.html` in any browser. No install, no build, no server, no login.

## Three access panels

| Panel | Route | For |
|---|---|---|
| **Public / Universal** | `#/` | Customers, partners, recruits — what the system does, no login |
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
deliberately left as-is, but the connecting prose is worth a check.

Deliberately **not** translated: running numbers, document type names
(`DO`, `SO`, `Invoice`, `Receipt`, `RET`), the three model names
(`Consignment`, `Bil to Bil`, `Cash`), product names, and outlet names. These
are proper nouns on printed paperwork and must read identically in every
language. The deeper transaction screens also keep their Bahasa Malaysia
working copy — that is the language the counter staff use.

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
- "Today" is pinned to 24 August 2026 so figures never drift.
- **PDF, WhatsApp and Direct Print open realistic previews. They do not
  generate a real PDF, send a real message, or drive a real printer.** The
  thermal 58mm/80mm layout is real and correct; the transport is not wired.
- The AI Help bubble matches on keywords against live selectors. It is not a
  language model and will fall back to a menu of topics on an unrecognised
  question.
- GPS coordinates resolve from the outlet's registered district — a pin lands
  within about 600m of the right town centre — but they are derived, not device
  readings. The registration screen's "Tangkap GPS" resolves from the district
  typed into Kawasan; on a phone this would read the handset.
- No login. The panel you pick is the panel you get — there is no auth boundary.
- No database — reload resets everything.

## Verified

Checked in a real browser (Chromium) before each deploy:

- All 30 routes render with no page errors.
- No horizontal overflow at 360, 390, 768, 1024 and 1440px.
- All four languages switch and persist across a reload and across pages.
- Consignment: 81 − 30 = 51 sold → billed RM 918.00, not RM 1,458.00.
- Document model per term: consignment issues DO → SO → Invoice; Bil to Bil and
  Cash issue SO → Invoice only, and submitting one leaves the DO count unchanged.
- Chain integrity: every invoice traces to an SO, every consignment invoice
  traces to a DO, and no DO exists on a non-consignment outlet.
- Delivering consignment stock issues a DO on the spot.
- Floor-price guard fires when a price is edited below the floor.
- Payment records and routes to the generated `REC` receipt.
- Search, ranking, ageing buckets and the mobile rail drawer.

## Deployment

Its own Netlify project, separate from the earlier demo. `netlify.toml`
publishes only `index.html` and `playbook.html`; this README is never served.
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
- `mkDelivery()` issues a DO and nothing else — consignment drops only.
  `mkSale()` issues the SO and, unless told to hold it, the Invoice. Between
  them they are the only places a document is created, so a term can never end
  up with paperwork it should not have. There is no single chain builder,
  because there is no single chain.
- The **SO is the canonical record that a sale happened**. `ordersIn`, `qtyIn`,
  `custIn` and the product report all read from `DB.sos`. There is no `DB.orders`.
- `payInvoice()` is the single place that records a payment and issues a receipt.
- Payment term lives on the customer, so the same order flow branches correctly
  for all three models without duplicated screens.
- `T(key)` is the only way user-facing chrome text reaches the DOM; adding a
  language means adding a fifth column to `DICT`.
- Navigation clears any open modal — a sheet left standing across a route change
  would sit on top of the new screen and swallow every click.
