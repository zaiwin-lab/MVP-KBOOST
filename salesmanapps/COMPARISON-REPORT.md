# Salesman Portal — Comparison & Gap Analysis

**Current build (web portal + database) vs. Coach Aril's app design**

Prepared as a reference for discussion with Coach Aril.
Date: 8 October 2026

---

## How to read this document

Everything here is marked by how confident we are in it:

| Mark | Meaning |
|---|---|
| **Verified** | Checked directly against the live database or the running portal |
| **Observed** | Clearly visible in Coach Aril's screenshots |
| **Inferred** | A reasonable reading of the screenshots, not confirmed |
| **Unknown** | Not determinable from what we have |

**What this analysis is based on.** Roughly forty screenshots of Coach Aril's
app, plus the MASTER FINAL requirement document. We have not seen a working
build, and two things were never shown at all: **Jadual Harian**, and **any
management or admin side**. Where this report says something is absent from his
design, that means *not seen*, not *proven absent*. Those are flagged as
questions rather than findings.

---

## 1. The headline finding

**Both versions were built from the same document.**

The current portal was built to the MASTER FINAL requirement — 16 modules,
3 transaction models, Customer Profile as the command center. Coach Aril's app
was designed from that same document. This is not a disagreement about what the
system should do. It is the same brief rendered twice, in two different shapes.

What each side actually produced is close to complementary:

| | Coach Aril's app | Current build |
|---|---|---|
| **User interface** | Wide and detailed — most screens drawn | Complete, but as a desktop web portal |
| **Data** | Hardcoded. No database. | Live Postgres, 19 tables, row-level security |
| **Transactions** | Display only | Six atomic posting functions, each all-or-nothing |
| **Form factor** | Phone app | Web portal (phone app shell now started) |

When Coach Aril says the app is "80% done, the other 20% is the backend," that
20% is the larger and more expensive half of the engineering — and it is the
half that already exists and has been tested.

Neither version needs to be scrapped.

---

## 2. What each side has that the other does not

### In Coach Aril's design, not in the current build

Pending Acc Approval · Request Credit Note · price change as an approval
request · Over Payment permitted · Blacklist as a separate state · Set VIP ·
Enable TIN QR (e-Invoice) · Gaji as a payment method · per-outlet Service Month ·
Reseller Removed as a tracked metric · **product variants (flavours)** ·
**FOC and Combo products** · **multi-branch structure** · stock request running
number · stock request as one document with many products · Nearest Reseller
map · GPS route recording · Kerja Harian per-customer log · salesman photos

Nineteen items. Three of them — shown in bold — require database changes. The
rest are a screen, a field or a button.

### In the current build, not seen in Coach Aril's design

A database at all · row-level security · six atomic posting functions ·
a management panel · four languages (BM / English / 中文 / Iban) · real PDF
generation at 58mm and 80mm · running numbers issued off a locked shared
counter · van stock per salesman · van restocking with request, issue and
reject · Refer & Earn with 5% commission · the public-facing panel ·
consignment reconciliation · nine enforced business-rule refusals · more
ranking periods than his design offers

**Coach Aril's app is wider. The current build is deeper.** A screen is cheap.
A transaction engine is not.

---

## 3. Module-by-module against MASTER FINAL

| # | Module | Current build | Coach Aril's design | Gap |
|---|---|---|---|---|
| 01 | Register Customer / Outlet | Built — atomic registration, 15 extra reseller fields, 5 photo types, GPS capture | Full registration sequence | Code generation rule unclear |
| 02 | Senarai Outlet | Built — search on code, name, PIC, phone, WhatsApp | Reseller tab, search, 4-tab profile | Aligned |
| 03 | Jadual Harian | Partial — day ordered by outstanding money, not plannable | **Never shown** | Unknown |
| 04 | Order + Harga Tweak | Partial — floor-price guard only | Per-customer pricing, change by request | **Approval workflow + audit trail** |
| 05 | DO | Built — consignment only | Titled "Consignment Order" | **Aligned** (see §5) |
| 06 | SO | Built | SO numbers throughout | Aligned |
| 07 | Invoice | Built | Adds "Keluar Invois Muktamad" and Pending Acc Approval | **Final-issue step, approval status** |
| 08 | Payment | Built — partial and full; refuses overpayment | Partial / Paid / **Over Payment**, 5 methods, comment | **Overpayment rule, methods, comment** |
| 09 | Payment Receipt | Built — REC numbers, PDF, print | Not explicitly shown | Unknown |
| 10 | Product & Stock | Built — van stock, restocking, request/issue/reject | Stok tab, Stock Request, history | **Variants, FOC, combos, request number** |
| 11 | Return | Built — RET document, stock returns to van | Rtn in summaries; Request Credit Note | **Credit note, return photo** |
| 12 | Sales Ranking | Built — recalculates live, 5 periods | Podium, photos, branch filter, 3 periods | Photos, branch filter, presentation |
| 13 | PDF + WhatsApp + Print | Built — all three, thermal widths | Cetak / Lihat; WhatsApp via Call sheet | Aligned |
| 14 | Running Number | Built — 6 sequences off a locked counter | SO, DO and RS numbers visible | **RS sequence missing** |
| 15 | Payment & Stock Control | Built — 9 refusals enforced in the database | Cannot be enforced without a database | Current build ahead |
| 16 | Refer & Earn | Built end to end — 5% on first settled invoice | **Not seen anywhere** | Is it still wanted? |

---

## 4. Three structural items — cheap now, expensive later

Everything else on the list is a screen or a field. These three change the
database, and the cost of adding them rises steeply once real data is loaded.
They should be settled **before** any screen is built.

### 4.1 Product variants (flavours)

**Observed.** The Stock Request form carries an *Edit Flavour* dropdown under
every product.

Dwangi is an air freshener. It comes in scents. A salesman cannot restock by
asking for "20 Dwangi HC" — the warehouse needs to know which scents, or the
wrong stock goes on the van.

The current `products` table is flat: one row per product, no variant
dimension. If products have flavours, that dimension has to flow through van
stock, order lines, consignment balances and every invoice line.

**This is the single largest technical finding in this report.**

### 4.2 Multi-branch operation

**Observed.** Salesman codes on the Ranking screen read `SEL001`, `SEL002`,
`SEL003` (Selangor), `JB003`, `JB005` (Johor), `SBH011` (Sabah). One entry
reads literally *"JB003 SOLIHIN JOHOR BRANCH."* The `‹ ALL ›` control above the
podium is a branch filter.

MASTER FINAL never mentions branches. The current build assumes one company
with a text "zone" label on each salesman — enough to print "Kajang" next to a
name, not enough to run a branch.

This affects who can see whose data, which is enforced in the database and is
far cheaper to design in than to retrofit.

### 4.3 Free goods and bundles

**Observed.** The Stock Request lists **Combo 3**, **Combo 1 FOC** and
**Others** as orderable items.

The current database would reject a free item outright. The floor-price guard
refuses any price below a product's floor, so a zero-price promotional unit
fails with *"price is below the floor price."* That guard exists deliberately,
to stop salesmen discounting away the margin — and it would also block
legitimate free goods.

---

## 5. Where the two versions already agree — against the written spec

This is worth raising with Coach Aril, because it is unusual and it is good
news.

MASTER FINAL contains an internal contradiction about Delivery Orders. Section
B lists a DO in the Bil to Bil flow, while its own comparison table marks Bil
to Bil as *not* sending stock ahead. If no stock goes ahead of the sale, there
is nothing for a delivery order to deliver.

The current build resolved this by making **consignment the only source of a
DO**. Coach Aril's app resolved it the same way — his DO detail screen is
titled **"Consignment Order"**, and it carries no total, because nothing is
billed at the time of the drop.

Two independent readings arrived at the same answer, against the document both
were working from. The hardest part of the data model is the part already
agreed.

---

## 6. Contradictions and inconsistencies worth raising

### 6.1 Inside MASTER FINAL itself

**Cash flow is described twice, differently.** Section C says
`Order → Bill → Payment Terus → Receipt`. The Full Transaction Flow section
says `ORDER → DO → SO → INVOICE → PAYMENT TERUS → PAYMENT RECEIPT`. These are
different systems. Which is correct?

**The Bil to Bil delivery order**, as described in §5 above.

**"No visit tracking" appears to be superseded.** MASTER FINAL states
emphatically that Jadual Harian is *"❌ Bukan attendance, ❌ Bukan tracking
visit, ❌ Tidak perlu Pending / Completed."* Coach Aril's app contradicts this
three separate times: a **Kerja Harian Report** per customer, GPS **Today /
Past / Reset Route**, and a per-shop daily work log. The current build
deliberately built *less* here because the spec said so.

### 6.2 In the demo data

These are almost certainly artefacts of hardcoded sample data rather than
design decisions, but they prevented us from reading the rules with confidence:

- On the order detail screen: `Total Paid RM 0.00`, `Total Pending RM 0.00`,
  `Total RM 348.00`. The three do not reconcile.
- In the Sales History list, some rows marked **Paid** show `RM 0.00` while
  others show `RM 40.00` and `RM 46.00`. It is unclear whether that figure is
  the outstanding balance or the amount paid.
- By contrast, the Kesimpulan screen's arithmetic is internally consistent
  throughout, which is why its figures were trusted in this analysis.

### 6.3 Undefined abbreviations

Several labels in the app cannot be interpreted by anyone outside Coach Aril's
own team:

| Label | Where | Status |
|---|---|---|
| **TPP** | "Kesimpulan Tpp & Rtn" | Unknown |
| **RTN** | Same | Probably Return — unconfirmed |
| **Pt. / Hc. / Tst** | Stock Request quantity columns | Unknown. "Tst" may be *tester* |
| **SE / SMS / NTN / SM** | Reseller code prefixes | Unknown |

**Recommendation:** spell terms out in full in the interface, and keep a short
written glossary for any that must stay abbreviated. A new salesman cannot be
trained on a column nobody can name, and a developer cannot build a field whose
meaning is undocumented.

---

## 7. Questions for Coach Aril

Grouped by topic. These are every open question raised during the analysis.

### Terminology

1. What does **TPP** stand for, and what does that column count?
2. What does **RTN** stand for — Return, or something else?
3. In the Stock Request table, what are the **Pt.**, **Hc.** and **Tst**
   columns?
4. What do the reseller code prefixes mean — **SE**, **SMS**, **NTN**, **SM**?
5. Are reseller codes **auto-generated by the system**, or entered from the
   chain's own site codes? MASTER FINAL says the system must generate them, but
   the codes in the app look like they come from Shell, Petron and Caltex.

### Payment

6. What does **"Pending Acc Approval"** mean operationally — who approves, how
   long does it take, and what happens if it is rejected?
7. Is **"Total Pending"** the amount awaiting that approval? *(This is our
   reading; it would explain the orange status, but it needs confirming.)*
8. In the Sales History list, is the RM figure the **outstanding balance** or
   the **amount paid**?
9. **Should Over Payment be allowed?** The current database refuses it
   deliberately. If it is allowed, does the excess become credit carried
   forward to the next bill, or is it refunded?
10. What is the **"Gaji"** payment method — salary deduction, and for whom?
    Staff purchases?
11. Is the payment **comment** field free text, and should it print on the
    receipt?

### Pricing

12. Price change is a **"Mohon"** (request) — who approves it, and how quickly?
13. Should there still be a **floor price** below which a salesman cannot go?
14. Does the full audit trail MASTER FINAL asks for still apply — original
    price, requested price, final price, who changed it, when?

### Products

15. **Do all products have flavours or variants?** Which ones, and how many
    each?
16. How should **FOC (free of charge)** items be handled — a zero-price line on
    the invoice, or tracked outside the invoice entirely?
17. What are **"Combo 3"** and **"Combo 1 FOC"** — products with their own
    SKU, or groups of other products?
18. What is the **"Others"** line in the Stock Request?
19. Can we have the **full product list** — SKUs, variants, Harga Kedai and
    Harga Jualan?

### Documents

20. **"Keluar Invois Muktamad"** — what happens between the Sales Order and the
    final invoice? Who issues it, and when?
21. **"Request Credit Note"** — when is a credit note used instead of a return?
22. Should the **Order** have its own running number (`ORD000001`)? MASTER
    FINAL lists one; neither version currently has one.
23. Should **stock requests** carry a running number like `RS014199`? *(Easy to
    add; the current build uses an internal ID.)*
24. Running number format: MASTER FINAL specifies `SO000001`. The app shows
    `SO378767`. We assume the latter is demo data — please confirm.

### Company structure

25. **How many branches, and in which states?** Selangor, Johor and Sabah are
    visible.
26. Does a branch manager see **only their own branch**, or everything?
27. Does each branch hold **its own stock and warehouse**?
28. Is ranking competed **within a branch, nationally, or both**?
29. **Is there a management or admin side to the app?** Nothing resembling one
    appeared in any screenshot. If there is, we would like to see it. If there
    is not, who does office-side work — approving payments, approving price
    changes, issuing stock, issuing final invoices?

### Customer lifecycle

30. What is the difference between **"Keluarkan Dari Apps"** and **"Blacklist
    Reseller"**? We read the first as housekeeping and the second as a credit
    decision — is that right?
31. Why does the remove / reactivate button appear on **only some rows** in the
    reseller list?
32. What does **"Set VIP"** change — pricing, priority, visibility?

### Schedule and tracking

33. MASTER FINAL says Jadual Harian is explicitly **not** visit tracking, but
    the app has a Kerja Harian Report and GPS route recording. **Which is
    correct?**
34. What does **Kerja Harian** record — what was done at the shop, or whether
    the salesman attended?
35. **Can we see the Jadual Harian screens?** They were never shared, and it is
    module 03.

### GPS

36. On the Nearest Reseller map, what do the **blue, green and red pins** mean?
37. Should GPS be **captured from the phone** at registration? The current
    build derives coordinates from the registered district, accurate to roughly
    600 metres — not precise enough for a "nearest shop" feature.
38. What does **"Reset Route"** do?

### e-Invoice — legal

39. **"Enable TIN QR"** is LHDN e-Invoice. **What is the compliance deadline?**
    This is the only item on either list that is a legal requirement rather
    than a preference.
40. Is it enabled **per reseller**, outlet by outlet, as the screen suggests?

### Consignment

41. Service Month shows **1** — is the service interval always monthly, or does
    it vary by outlet? *(The current build assumes 30 days and allows it to be
    changed.)*
42. **Where is the consignment balance entered?** Entering "baki stock" at the
    next visit is the heart of the consignment model, and no screen for it was
    shared.

### Stock

43. The Stock Request form asks for **NAMA / ALAMAT / TEL-NO**, **SO / DO NO.**
    and **ORDER REF NO.** Is stock ever delivered somewhere other than to the
    salesman — direct to a customer, for instance?

### Scope

44. **Is Refer & Earn still wanted?** It is module 16 of MASTER FINAL, it is
    fully built in the current system, and it appears nowhere in the app
    design.
45. Is the **four-language switch** wanted? The current build supports Bahasa
    Malaysia, English, Chinese and Iban. The app design is Malay only.
46. Is the **public-facing panel** wanted?

### Still outstanding from before

47. Company **SSM number, registered address and phone** — needed for document
    headers. Invoices currently print a placeholder.
48. The **real outlet list** and **real salesman list** with email addresses, so
    accounts can be opened.

---

## 8. Recommendation

Keep the database and rebuild the surface to Coach Aril's design.

The reasoning is practical rather than defensive:

- **The expensive half already exists and is tested.** Nineteen tables, access
  control enforced at the database rather than in the screen, six transaction
  functions that either complete or leave nothing behind, running numbers that
  cannot collide between two salesmen submitting at the same moment, and nine
  business rules that have been proven to refuse the wrong thing.
- **His design is the agreed target, and it is mostly drawn.** That removes the
  largest source of rework — nobody has to guess what the screens should look
  like.
- **It has already been shown to work.** A phone-shaped app shell now exists,
  signs in against the same database, installs to a phone's home screen, and
  works without a signal. It took one session. The form factor is not the
  obstacle.
- **The three structural items in §4 should be settled first.** Variants,
  branches and free goods all touch the schema. Deciding them now costs days.
  Deciding them after real data is loaded costs considerably more.

That said, the questions in §7 matter more than the recommendation. Most of
them take Coach Aril a minute to answer and would take weeks to discover the
wrong way.

---

## 9. Summary for the meeting

1. Both versions came from the same requirement document. This is not a
   disagreement about scope.
2. His app has the interface. The current build has the engine. They fit
   together.
3. Nineteen things in his design are new to us. Sixteen are small. **Three
   change the database and should be decided before any screen is built:
   product flavours, multiple branches, and free goods.**
4. Both versions independently departed from MASTER FINAL in the same place,
   on delivery orders, and both were right.
5. The written spec says visit tracking is not wanted. His app tracks visits in
   three places. That needs a ruling.
6. **Enable TIN QR is LHDN e-Invoice — the only legal deadline on the table.**
   We need to know the date.
7. Several labels in the app — TPP, RTN, Pt., Hc., Tst — cannot be read by
   anyone outside his team, and need defining before they can be built.
8. Jadual Harian and any admin side were never shared. Module 03 and the entire
   office-side workflow are still unknown.
