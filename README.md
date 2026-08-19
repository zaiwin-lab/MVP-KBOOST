# Winning Salesman — Web Demo V1

A clickable demo of the Winning Salesman Platform, a retail field-sales management
app for **KOBIS Berhad**. Built for Coach Aril to pitch to companies running field
sales teams.

It proves one loop, end to end:

**plan the day → visit the outlet → take the order → generate invoice → collect
payment → watch the ranking move**

- **[PITCH-PATH.md](PITCH-PATH.md)** — the exact 60-second click sequence for a live pitch.

## Run it

Open `index.html` in any browser. That is the whole setup.

No install, no build, no server, no login, no internet required. One file. It works
from a USB stick, an email attachment, or a laptop with no signal in a client's
meeting room.

## What is in the demo

| Module | What works |
|---|---|
| **Manager Dashboard** | Live coverage, today's sales, collection rate, activity feed, AI briefing |
| **Jadual Harian** | Beat plan ordered by AI priority, check-in with GPS tag and timestamp |
| **Order → Invoice → Payment** | Quantity capture, controlled price tweak, anomaly flag, invoice, part or full payment, digital receipt |
| **Sales Ranking** | Live leaderboard, contribution % toward the monthly company target |
| **Company-Owned Client Data** | Outlet register with full history, plus a resignation simulation |
| **AI Copilot** | Route priority, coaching nudge, morning briefing, price anomaly flag |

Switch between **Manager** (desktop-first) and **Salesman** (mobile-first) with the
toggle in the top right. On a desktop the salesman view renders inside a phone frame
so the mobile story is visible during a pitch; on a real phone it goes full screen.

---

## What is real vs. simulated

This matters. Nothing below should be overclaimed in front of a client.

### Real — actually computed, live, from the seeded dataset
- **All arithmetic.** Sales totals, outstanding balances, overdue amounts, collection
  rate, lifetime value, average order value, contribution percentages, days since last
  order. Every figure is derived, none is typed in.
- **The full transaction chain.** Placing an order really creates an order record,
  which really generates an invoice with a sequential number and a due date computed
  from that outlet's credit term. Recording a payment really updates the invoice
  balance and status, and really moves the leaderboard.
- **Document numbering.** `ORD-0001`, `INV-2026-0001`, `PAY-0001` increment properly.
- **Partial payments.** Pay less than the balance and the invoice becomes `partial`,
  the receipt is stamped `PART PAYMENT RECEIVED`, and the outstanding figure follows.
- **All four AI outputs.** See below.
- **The resignation simulation.** It genuinely reassigns every outlet and visit, and
  the order and payment records genuinely survive, because they were never attached to
  the salesman in the first place.

### Real logic, but rule-based rather than a language model
The AI layer is **templated logic running on live data** — not a chat model, and not
static text. Every number in every AI output is computed at the moment you look at it.
Swapping in a real model later does not change the data model.

- **Route priority** — scores each outlet on overdue amount, average order value, days
  since last order, and outlet tier, then shows the rationale as chips.
- **Coaching nudge** — finds a product the outlet used to buy but did not order this
  time, and reports the real gap in days. Falls back to comparing the order against
  that outlet's real average.
- **Morning briefing** — counts who is behind plan, totals what is actually overdue,
  identifies the real top performer, and reports true month-to-date against target.
- **Price anomaly** — compares the entered unit price against both the product floor
  price and that outlet's real 90-day average unit price.

### Simulated — clearly fake, by design
- **The dataset.** 1 company, 6 salesmen, 18 outlets, 8 products and about 90 days of
  trading history are generated from a fixed seed. The figures are realistic but
  invented. The seed is fixed so the demo is identical every run — no surprises mid-pitch.
- **"Today" is pinned to 19 August 2026**, so the numbers never drift.
- **GPS check-in** produces a plausible Klang Valley coordinate. It does not read the
  device location.
- **"Send via WhatsApp"** opens a mock preview. It does not send a message. The
  receipt link (`kobis.my/r/...`) is illustrative and does not resolve.
- **No login or accounts.** The role toggle stands in for authentication, deliberately.
- **Nothing persists.** Reload and everything resets. There is no database.

### Not built — on purpose
Ten modules are named and scoped but not implemented, shown as a "Coming in the full
build" strip: Sales Order (SO), Return & Credit Note, Refer & Earn, Running Number
Config, Stock Control, Multi-Warehouse, Commission Engine, GPS Route Optimisation,
LHDN e-Invoice, and Offline Mode.

They are visible rather than hidden so the demo stays honest and the roadmap does the
selling.

---

## For the engineer picking this up

`index.html` is self-contained: tokens and styles, then data model, then selectors,
then the AI layer, then views, then actions, then the router.

The data model is the part built to survive. Entities are `company`, `salesmen`,
`outlets`, `products`, `orders`, `invoices`, `payments`, `visits` and `assignments`,
with normalised IDs throughout. The ten roadmap modules attach to these same entities
without a rewrite — stock control hangs off `products`, commission off `orders` and
`payments`, returns off `invoices`.

Two deliberate choices worth keeping when this becomes the real build:

- **Hash routing with real URLs** (`#/salesman/order/o7`). Every screen is
  addressable and the browser back button works. Do not replace this with a
  `setPage()` state variable — deep links and back-button behaviour are extremely
  expensive to retrofit later.
- **One definition per rule.** `S.pace()` decides "behind plan" once, and both the
  dashboard table and the AI briefing call it. When the same rule gets computed in two
  places, the screen eventually contradicts itself in front of a client.

Motion respects `prefers-reduced-motion`. Layout is genuinely responsive down to
390px with no horizontal overflow.
