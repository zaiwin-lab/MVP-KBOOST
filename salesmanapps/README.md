# Salesman Apps

**Retail Sales & Distribution Management App** for KOBIS Berhad.

Built to the MASTER FINAL requirement: **16 modules, 3 transaction models**,
salesman-mobile-first, with Customer Profile as the command center.

This is a **separate build**. It does not share any code with the earlier
"Winning Salesman" demo at the repository root, which is left untouched.

## Three pages

| Page | What it is |
|---|---|
| `index.html` | The working app — all 16 modules, clickable |
| `proposal.html` | Complete system proposal and screen layout, for the client |
| `gap.html` | Gap analysis — why the first demo reached 30% and what changed |

Open `index.html` in any browser. No install, no build, no server, no login.

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
- All arithmetic: sales, outstanding, overdue, totals, commission, ranking.
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

**Simulated — clearly fake, by design**
- The dataset: 1 company, 5 salesmen, 12 outlets, 8 products, ~120 days of
  trading history, generated from a fixed seed so every run is identical.
- "Today" is pinned to 24 August 2026 so figures never drift.
- **PDF, WhatsApp and Direct Print open realistic previews. They do not
  generate a real PDF, send a real message, or drive a real printer.** The
  thermal 58mm/80mm layout is real and correct; the transport is not wired.
- GPS coordinates are plausible Klang Valley values, not device readings.
- No login. No database — reload resets everything.

## What changed from the first demo

Seven modules were at zero: Register Customer, DO, SO, Product & Stock, Return,
Payment & Stock Control, Refer & Earn. All are now built.

The AI layer was removed entirely — it was never in the requirement.

Jadual Harian was rebuilt as what the spec actually asks for: a plain ordered
list of shops to visit, with Navigate / WhatsApp / Profile shortcuts.
**No attendance, no visit tracking, no pending/completed status.**

See `gap.html` for the full module-by-module comparison.

## Deployment

Its own Netlify project, separate from the earlier demo. Deploy from **this
folder** (the CLI uploads the current directory):

```shell
cd salesmanapps
npx -y @netlify/mcp@latest --site-id <site-id> --proxy-path <token>
```

## Notes for the engineer

Single self-contained `index.html`: styles, then data, then selectors, then
screens, then actions, then the router.

- **Hash routing** (`#/customer/c1`) — every screen is addressable and the back
  button works.
- `mkChain()` is the single place that creates Order → DO → SO → Invoice, so the
  chain can never be produced inconsistently.
- `payInvoice()` is the single place that records a payment and issues a receipt.
- Payment term lives on the customer, so the same order flow branches correctly
  for all three models without duplicated screens.
