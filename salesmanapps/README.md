# KOBIS Sales Portal

**Web-based Retail Sales & Distribution Portal** for KOBIS Berhad.

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
| **Salesman** | `#/s/home` | The field — schedule, orders, consignment, documents, ranking |

Every panel reads the same data. Nothing is duplicated between them.

## The three standard items

1. **Four-pane language** — Bahasa Malaysia · English · 中文 · தமிழ். The switch
   is in the top bar of every page, persists in `localStorage`, and carries
   across from the portal to the playbook.
2. **Corner bubbles** — bottom-left **AI Help 24/7** opens an assistant that
   answers from live data; bottom-right **Support** carries KOBIS contact
   details and common topics.
3. **Signature footer** — credits KOBIS Berhad, and hovering the name runs a
   gradient shine with an underline sweep.

### What the language switch covers

The chrome, navigation, panel names, section headings, KPI labels, table
headers, period tabs, bubbles and footer all translate, plus every lead
paragraph and both step-by-step routines in the playbook.

Deliberately **not** translated: running numbers, document type names
(`Order`, `DO`, `SO`, `Invoice`, `Receipt`, `RET`), the three model names
(`Consignment`, `Bil to Bil`, `Cash`), product names, and outlet names. These
are proper nouns on printed paperwork and must read identically in every
language. The deeper transaction screens also keep their Bahasa Malaysia
working copy — that is the language the counter staff use.

## The three transaction models

Payment Term is not a due date — each runs a different transaction flow.

**📦 Consignment** — stock is delivered first, and the customer is charged only
for what actually sold.

```
Hantar Stock 100 unit
  → next visit: masukkan Baki Stock = 30
  → sistem kira 100 − 30 = 70 unit terjual
  → Bill = 70 × RM5 = RM350   (not 100 units)
  → Payment → Receipt
```

**📝 Bil to Bil** — every order becomes its own bill, paid on a 1/2/3 month term.
`Order → DO → SO → Invoice → Payment ikut term`

**💵 Cash** — order and pay on the spot.
`Order → DO → SO → Invoice → Payment terus → Receipt`

## Running numbers

Six independent sequences, in the required format:

`ORD000001` · `DO000001` · `SO000001` · `INV000001` · `RET000001` · `REC000001`

## What is real vs. simulated

**Real — computed live from the seeded data**
- All arithmetic: sales, outstanding, overdue, debt ageing, commission, ranking.
- The full chain. Submitting an order really creates Order → DO → SO → Invoice,
  each with its own running number, and a due date derived from the customer's
  payment term.
- **Consignment reconciliation.** Entering a balance really computes units sold
  and bills only those units.
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
- GPS coordinates are plausible Klang Valley values, not device readings.
- No login. The panel you pick is the panel you get — there is no auth boundary.
- No database — reload resets everything.

## Verified

Checked in a real browser (Chromium) before each deploy:

- All 26 routes render with no page errors.
- No horizontal overflow at 360, 390, 768, 1024 and 1440px.
- All four languages switch and persist across a reload and across pages.
- Consignment: 81 − 30 = 51 sold → billed RM 918.00, not RM 1,458.00.
- Order chain: `ORD000054 → DO000054 → SO000054 → INV000054`.
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
- `mkChain()` is the single place that creates Order → DO → SO → Invoice, so the
  chain can never be produced inconsistently.
- `payInvoice()` is the single place that records a payment and issues a receipt.
- Payment term lives on the customer, so the same order flow branches correctly
  for all three models without duplicated screens.
- `T(key)` is the only way user-facing chrome text reaches the DOM; adding a
  language means adding a fifth column to `DICT`.
- Navigation clears any open modal — a sheet left standing across a route change
  would sit on top of the new screen and swallow every click.
