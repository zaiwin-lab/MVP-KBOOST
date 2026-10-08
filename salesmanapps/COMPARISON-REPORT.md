# Salesman Portal — Delivery Review & Scope Analysis

**What was asked for, what has been delivered, and what Coach Aril's design adds
on top of it.**

Date: 8 October 2026
Prepared as a reference for discussion with Coach Aril.

---

## 1. What this is based on

Two sources. The **MASTER FINAL requirement document** — sixteen modules, three
transaction models, Customer Profile as the command center — which is the brief
the current portal was built to. And roughly **forty screenshots** of Coach
Aril's app design.

No working build of his version was available for testing, and two things were
never shown: **Jadual Harian**, and **any management or admin side**. Where this
report says something is absent from his design, that means *not seen* — not
*proven absent*. Those appear as questions rather than findings.

Claims about the current build were checked directly against the live database.

| Mark | Meaning |
|---|---|
| **Verified** | Checked against the live database or the running portal |
| **Observed** | Clearly visible in Coach Aril's screenshots |
| **Inferred** | A reasonable reading, not confirmed |
| **Unknown** | Not determinable from what we have |

---

## 2. What was delivered against the brief

MASTER FINAL specified sixteen modules and three transaction models. **All
sixteen are built**, and running against a live database.

- **19** database tables, access-controlled
- **6** transaction functions, each all-or-nothing
- **9** business rules proven to refuse the wrong thing

| # | Module | Delivered |
|---|---|---|
| 01 | Register Customer / Outlet | Atomic registration, GPS capture, five photograph types, fifteen additional reseller fields taken from his design |
| 02 | Senarai Outlet | Search on code, name, PIC, phone and WhatsApp |
| 03 | Jadual Harian | Day ordered by outstanding money, built to the brief's explicit exclusions |
| 04 | Order + Harga Tweak | Order posting with floor-price guard and live van deduction |
| 05 | Delivery Order | Consignment only, with its own running number |
| 06 | Sales Order | Issued on sale, carries the DO it came from |
| 07 | Invoice | Issued from the SO, due date derived from payment term |
| 08 | Payment | Full and partial, updates outstanding and invoice status |
| 09 | Payment Receipt | Own running number, PDF and print |
| 10 | Product & Stock | Van stock per salesman, plus restocking with request, issue and reject |
| 11 | Return | RET document, stock returns to the van |
| 12 | Sales Ranking | Recalculates on every sale, five periods |
| 13 | PDF, WhatsApp, Print | All three, at 58mm and 80mm thermal widths |
| 14 | Running Number | Six sequences off a locked counter; 500 consecutive calls produced 500 distinct values |
| 15 | Payment & Stock Control | Enforced in the database, not in the screen |
| 16 | Refer & Earn | End to end, 5% on the first settled invoice |

Four things were built that the brief never asked for, because the system would
not have survived contact with real use without them:

- **Van restocking.** MASTER FINAL describes stock going out but never coming
  back. Without a restocking path every van drains to zero and the system
  becomes unusable within a week of go-live.
- **A management panel.** Someone in the office has to see collections, ageing,
  stock and the team. It reads everything and posts nothing.
- **Four languages** — Bahasa Malaysia, English, Chinese and Iban, across 365
  dictionary entries.
- **Account administration.** Opening a login, resetting a password and revoking
  access, without the master key ever reaching a phone.

---

## 3. The two builds are different kinds of thing

**Coach Aril's version.** A designed interface, broad and detailed, covering
screens the current build presents differently. **The figures in it are
hardcoded.** There is no database, no stored transaction, and nothing that
survives closing the app. It shows what the system should look like. It cannot
yet record a sale.

**The current build.** A running system. Nineteen tables with access control
enforced at the database, so a salesman querying another's outlets gets nothing
back however he asks. Six transaction functions, each a single all-or-nothing
operation. Submit an order and it is still there after a reload, on another
device, next week.

This matters for reading the phrase *"80% done, the other 20% is the backend."*
In a distribution system that handles stock, debt and money, the data layer is
not the final fifth of the work. It is the part that has to be correct, the part
that takes longest, and the part that cannot be judged by looking at it.

A worked example. An order is two document numbers, four inserts and a stock
movement. Done from a phone that is five separate requests with no way to undo
them: a dropped signal halfway leaves a van decremented against an invoice that
was never written. The current build posts it as one transaction that either
completes or leaves nothing behind. That distinction is invisible on a
screenshot and is the difference between a system that can be trusted with money
and one that cannot.

**The practical reading:** the expensive, slow, invisible half is finished and
tested. The visible half is where Coach Aril's design is strongest. Those are
complementary, and the sensible path uses both.

---

## 4. What his design adds beyond the brief

Nineteen features appear in his screenshots that are not in the current build.
The significant point is not the number — it is where they came from.

- **19** features added
- **0** of them specified in MASTER FINAL
- **2** that contradict it directly
- **3** that require database changes

| Addition | In MASTER FINAL? | Class |
|---|---|---|
| Product variants (flavours) | No | **Schema** |
| Multi-branch operation (Selangor, Johor, Sabah) | No | **Schema** |
| Free goods and combo products (FOC) | No | **Schema** |
| Pending Acc Approval on payments | No — statuses listed are Paid, Partial, Pending, Overdue | Workflow |
| Price change as an approval request | Permission is mentioned; an approval workflow is not | Workflow |
| Request Credit Note | No — returns are specified, credit notes are not | Workflow |
| Over Payment permitted | No | Rule change |
| Enable TIN QR (LHDN e-Invoice) | No — only "Tax / SST jika diperlukan" | Compliance |
| Nearest Reseller map | Coordinates are stored; no map is specified | Screen |
| GPS route recording | **Contradicts it** — tracking is explicitly excluded | Screen |
| Kerja Harian per-customer log | **Contradicts it** — visit tracking is explicitly excluded | Screen |
| Stock request as one document with many lines | No | Structure |
| Stock request running number | No — six sequences are listed, this is not among them | Field |
| Blacklist Reseller, as distinct from removal | No | Field |
| Set VIP | No | Field |
| Reseller Removed as a tracked metric | No | Field |
| Per-outlet Service Month | No | Field |
| Gaji as a payment method | Method is mentioned generically | Field |
| Salesman photographs | No | Field |

None of this is unreasonable to want. Several of the additions are plainly good
ideas, and two of them — e-Invoice and product variants — would have to be built
eventually regardless.

But it should be stated plainly, because it governs timeline and budget: taken
together, these nineteen items describe a **multi-branch distribution platform
with layered internal approvals**, operating across at least three states. That
is a materially larger system than the single-company field-sales tool MASTER
FINAL describes, and it is a different class of build.

**Worth being direct about:** the question is not whether these features are
worth having. It is whether they are inside the agreed scope or beyond it — and
on the evidence of the requirement document, they are beyond it. That makes them
a second phase to be specified and costed, not a list of things missing from the
first.

---

## 5. What the additions cost

| Effort | Items | Why |
|---|---|---|
| **Hours each** | Gaji payment method · payment comment · salesman photographs · Set VIP · Reseller Removed metric · per-outlet Service Month · stock request number · Blacklist state | A column, a flag or a label. Eight of the nineteen. |
| **Days each** | Pending Acc Approval · price-change approval · Request Credit Note · Over Payment handling · Nearest Reseller map · GPS route recording · Kerja Harian log · stock request restructure | A screen, or a workflow with two parties. Eight more. |
| **Weeks each** | **Product variants** · **Multi-branch** · **Free goods** | Each one changes the database and touches every transaction built on it. |

### Why the last three are different

**Product variants.** *Observed* — the Stock Request form carries an **Edit
Flavour** dropdown under every product. Dwangi is an air freshener; it comes in
scents. If every product has variants, that dimension has to flow through van
stock, order lines, consignment balances and every invoice line. The current
product table is flat because the brief described flat products.

**Multi-branch.** *Observed* — salesman codes read `SEL001`, `JB005`, `SBH011`,
and one entry reads literally *"JB003 SOLIHIN JOHOR BRANCH."* MASTER FINAL never
mentions branches at all. This governs who may see whose data, which is enforced
in the database, and it is far cheaper to design in than to retrofit.

**Free goods.** *Observed* — the Stock Request lists **Combo 3**, **Combo 1
FOC** and **Others**. The current build would refuse a zero-price line, because
a floor-price guard was built deliberately to stop salesmen discounting away the
margin. Allowing free goods means reworking that rule everywhere it applies.

All three are entirely buildable. All three cost a fraction as much decided now
as decided after real outlets and real stock are loaded.

---

## 6. The missing approver

Four of the additions are approval workflows: a payment waits for **Pending Acc
Approval**, a price change is submitted as **Mohon**, a stock request is
**Approved**, and an invoice has to be issued as **Keluar Invois Muktamad**.

Every one of those needs a second person — someone in the office who sees the
request and decides. **No such screen appeared anywhere in the forty
screenshots.** His design is the salesman's half of four conversations that each
require two parties.

The current build already has that half: a management panel that reads
everything and posts nothing, sitting on access control that distinguishes
office from field at the database. Stock requests already flow through it, with
issue and reject implemented.

If his design does have an admin side that simply was not shared, we should see
it — it changes the estimate. If it does not, that office-side application is
unbudgeted scope on his side, and largely built already on ours.

---

## 7. Where both versions already agree

MASTER FINAL contradicts itself about Delivery Orders. Section B lists a DO in
the Bil to Bil flow, while its own comparison table marks Bil to Bil as *not*
sending stock ahead. If no stock goes ahead of the sale, there is nothing for a
delivery order to deliver.

The current build resolved this by making **consignment the only source of a
DO**, and structured the database so the alternative cannot happen by accident.
Coach Aril's app resolved it the same way: his delivery order screen is titled
**"Consignment Order"** and carries no total, because nothing is billed at the
drop.

Two independent readings reached the same answer against an ambiguous document.
The hardest judgement in the data model is one both sides already share — which
is a good indication the foundation is sound.

---

## 8. Contradictions and unknowns

### Inside the requirement document

**Cash is described twice, differently.** Section C says
`Order → Bill → Payment Terus → Receipt`. The Full Transaction Flow section says
`ORDER → DO → SO → INVOICE → PAYMENT TERUS → RECEIPT`. These are different
systems, and a ruling is needed.

**Visit tracking is excluded, then built.** MASTER FINAL states emphatically
that Jadual Harian is not attendance, not visit tracking, and needs no pending
or completed state. The current build followed that instruction and deliberately
built less. His design contradicts it in three places: a **Kerja Harian
Report**, GPS **Today / Past / Reset Route**, and a per-shop daily log. If the
instruction has changed, that is a scope addition rather than an omission.

### In the demo data

Several figures in his screenshots do not reconcile, which is expected of
hardcoded sample data but prevented some rules being read with confidence:

- An order detail shows Total Paid `RM 0.00`, Total Pending `RM 0.00` and Total
  `RM 348.00`. The three do not add up.
- In Sales History, some rows marked **Paid** show `RM 0.00` and others
  `RM 40.00`. Unclear whether the figure is outstanding or paid.
- The Kesimpulan screen, by contrast, is internally consistent throughout, which
  is why its figures were the ones relied on here.

### Labels nobody outside his team can read

| Label | Where it appears | Status |
|---|---|---|
| **TPP** | "Kesimpulan Tpp & Rtn" | Unknown |
| **RTN** | Same | Probably Return |
| **Pt. / Hc. / Tst** | Stock Request quantity columns | Unknown |
| **SE / SMS / NTN / SM** | Reseller code prefixes | Unknown |

These cannot be built, because nobody outside his team knows what they mean.
They also cannot be trained — a new salesman cannot be taught a column that has
no name. **Recommendation: spell terms out in full in the interface, and keep a
short written glossary for any that must stay short.**

---

## 9. Questions for Coach Aril

Items marked **[Scope]** change the size of the job.

### Scope and sequencing

1. **Do all products have flavours or variants?** Which ones, and how many each?
   This is the largest single item in the report. **[Scope]**
2. **How many branches, and in which states?** Selangor, Johor and Sabah appear
   in the salesman codes. Nothing in the requirement mentions branches.
   **[Scope]**
3. How should **FOC** items be handled — a zero-price line on the invoice, or
   tracked outside it entirely? **[Scope]**
4. **Is there a management or admin side to the app?** Four approval workflows
   appear in the design with no screen for the approver. If there is one, we
   should see it; if not, who approves payments and price changes, issues stock
   and issues final invoices? **[Scope]**
5. Which additions are **needed at launch**, and which can follow? Several are a
   column; three are a rebuild of part of the database. **[Scope]**

### Terminology

6. What does **TPP** stand for, and what does that column count?
7. What does **RTN** stand for — Return, or something else?
8. In the Stock Request table, what are the **Pt.**, **Hc.** and **Tst**
   columns?
9. What do the reseller code prefixes mean — **SE**, **SMS**, **NTN**, **SM**?
10. Are reseller codes **auto-generated**, or entered from the chain's own site
    codes? MASTER FINAL says the system must generate them, but the codes look
    like they come from Shell, Petron and Caltex.

### Payment

11. What does **Pending Acc Approval** mean operationally — who approves, how
    long does it take, and what happens on rejection?
12. Is **Total Pending** the amount awaiting that approval? *(Our reading; it
    would explain the orange status.)*
13. In the Sales History list, is the RM figure the **outstanding balance** or
    the **amount paid**?
14. Should **Over Payment** be allowed? The current build refuses it
    deliberately, as a safeguard. If allowed, does the excess carry forward as
    credit, or is it refunded?
15. What is the **Gaji** payment method — salary deduction, and for whom?
16. Is the payment **comment** free text, and should it print on the receipt?

### Pricing

17. Price change is a **Mohon** (request) — who approves it, and how quickly? A
    salesman standing at a counter cannot wait long.
18. Should there still be a **floor price** below which a salesman cannot go?
19. Does the audit trail MASTER FINAL asks for still apply — original price,
    requested price, final price, who changed it, when?

### Products

20. What are **Combo 3** and **Combo 1 FOC** — products with their own SKU, or
    groups of other products?
21. What is the **Others** line in the Stock Request?
22. Can we have the **full product list** — SKUs, variants, Harga Kedai and
    Harga Jualan?
23. The Stock Request asks for name, address, telephone, SO/DO number and order
    reference. Is stock ever delivered somewhere other than to the salesman?

### Documents

24. **Keluar Invois Muktamad** — what happens between the Sales Order and the
    final invoice? Who issues it, and when?
25. **Request Credit Note** — when is a credit note used instead of a return?
    These are different documents with different accounting treatment.
26. Should the Order have its own running number (`ORD000001`)? MASTER FINAL
    lists one; neither version has one.
27. Should stock requests carry a running number like `RS014199`?
28. Running number format: MASTER FINAL specifies `SO000001`, the app shows
    `SO378767`. We assume the latter is demo data — please confirm.

### Customer lifecycle

29. What is the difference between **Keluarkan Dari Apps** and **Blacklist
    Reseller**? We read the first as housekeeping and the second as a credit
    decision.
30. Why does the remove / reactivate button appear on **only some rows** in the
    reseller list?
31. What does **Set VIP** change — pricing, priority, visibility?

### Schedule and tracking

32. MASTER FINAL says Jadual Harian is explicitly **not** visit tracking. The
    design tracks visits in three places. **Which instruction stands?**
33. What does **Kerja Harian** record — what was done at the shop, or whether
    the salesman attended?
34. **Can we see the Jadual Harian screens?** They were never shared, and it is
    module 03.

### GPS

35. On the Nearest Reseller map, what do the **blue, green and red pins** mean?
36. Should GPS be **captured from the phone** at registration? The current build
    derives coordinates from the registered district, accurate to roughly 600
    metres.
37. What does **Reset Route** do?

### e-Invoice

38. **Enable TIN QR** is LHDN e-Invoice. What is the compliance deadline? This
    is the only item anywhere in this report that is a legal requirement rather
    than a preference.
39. Is it enabled **per reseller**, outlet by outlet, as the screen suggests?

### Consignment

40. **Where is the consignment balance entered?** Entering baki stock at the
    next visit is the heart of the consignment model, and no screen for it was
    shared.
41. Service Month shows **1** — is the interval always monthly, or does it vary
    by outlet?

### Confirmations and outstanding data

42. **Is Refer & Earn still wanted?** It is module 16, fully built and tested,
    and appears nowhere in the app design.
43. Is the **four-language switch** wanted? Bahasa Malaysia, English, Chinese
    and Iban are built. His design is Malay only.
44. Is the **public-facing panel** wanted?
45. Company **SSM number, registered address and phone** — needed for document
    headers. Invoices currently print a placeholder.
46. The **real outlet list** and **salesman list with email addresses**, so
    accounts can be opened and testing can begin on real data.

---

## 10. Recommendation

**Build forward from the current system, and treat the additions as a specified,
costed second phase.**

- **The agreed brief is delivered.** All sixteen modules, running against a live
  database, with the business rules enforced where they cannot be bypassed. That
  is a finished first phase, and it should be signed off as one.
- **The hard half is the half that exists.** Transaction integrity, access
  control, collision-free document numbering and consignment reconciliation are
  the parts that take longest and cannot be judged by eye. Rebuilding them from
  a prototype would mean paying for them twice.
- **The form factor is not an obstacle.** A phone app shell now exists that signs
  in against the same database, installs to a home screen and works without a
  signal. It took one working session, which is a fair measure of what
  re-skinning to his design actually costs.
- **His design should drive the interface.** It is detailed, it is the client's
  own, and adopting it removes the largest source of rework. Where it improves
  on ours — the per-outlet consignment view, the stock request as one document,
  the customer profile layout — it should simply be followed.
- **The three schema items must be settled first.** Variants, branches and free
  goods are weeks of work each if decided late and days if decided now.

The alternative — restarting from the prototype — means rebuilding a tested data
layer that already does the job, while the nineteen additions remain unbuilt in
either version.

---

## 11. Summary for the meeting

1. **All sixteen modules of the agreed requirement are built and running against
   a live database.** The brief has been delivered.
2. Coach Aril's design is a detailed interface with hardcoded figures and no
   data layer. It shows what the system should look like; it cannot yet record a
   sale.
3. The two fit together. His design should drive the screens; the existing
   system should remain underneath them.
4. **Nineteen features in his design were never in the requirement document**,
   and two of them contradict it directly. They are worth having, but they are a
   second phase, not a list of omissions.
5. Eight of those nineteen are hours of work. Eight are days. **Three — product
   flavours, multiple branches and free goods — change the database and should
   be decided before anything else is built.**
6. His design contains four approval workflows and no screen for the approver.
   That office-side application already exists on our side.
7. Both versions independently departed from the requirement in the same place,
   on delivery orders, and both were right. The foundation is sound.
8. **Enable TIN QR is LHDN e-Invoice — the only legal deadline anywhere in
   this.** We need the date.
9. Several labels — TPP, RTN, Pt., Hc., Tst — cannot be read by anyone outside
   his team, and cannot be built until they are defined.
