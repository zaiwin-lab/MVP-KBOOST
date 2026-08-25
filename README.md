# Winning Salesman — Field Sales Control Room

**Maturity:** Working interactive demonstration prototype  
**Portfolio category:** Field-sales operations, collections and performance visibility  
**Production status:** Demonstration only; no accounts, shared database or operational integrations

Winning Salesman demonstrates one connected field-sales loop:

**plan the day → visit the outlet → take the order → generate an invoice → record payment → update the ranking**

The product is designed to help a sales manager see field activity, collections and performance in one operating view while giving sales representatives a focused mobile workflow.

## Business problem

Field-sales organisations can lose visibility when customer histories, visit plans, orders, collections and salesperson relationships live in separate devices or informal records. Common risks include:

- weak follow-up on overdue invoices;
- inconsistent visit planning;
- unapproved price reductions;
- slow paperwork and reconciliation;
- customer history leaving with a departing salesperson;
- managers learning about problems only after month end.

Winning Salesman makes those risks visible in a single, inspectable demonstration.

## Intended users

- field-sales managers and supervisors;
- sales representatives visiting outlets;
- finance or collections teams;
- distribution-business owners;
- implementation teams evaluating a future operational build.

These are intended personas. The repository does not evidence customers, adoption or production use.

## Demonstrated capabilities

- manager dashboard with coverage, sales and collection indicators;
- salesman beat plan and outlet check-in flow;
- order, invoice, part-payment and receipt sequence;
- configurable client terminology, products, territories and credit terms;
- live leaderboard and target contribution;
- company-owned outlet history and reassignment simulation;
- responsive manager and mobile salesperson experiences;
- deterministic data reset for repeatable demonstrations.

Four tenant configurations illustrate perfume, FMCG, pharmacy-supply and automotive-parts workflows. Their companies, people, transactions and figures are fictional demonstration data.

## What is real in the prototype

The application genuinely calculates its displayed results from the seeded browser dataset:

- sales, balances, overdue amounts, collection rate and target contribution;
- sequential order, invoice and payment identifiers;
- invoice due dates derived from configured credit terms;
- part-payment balances and status changes;
- leaderboard changes after a transaction;
- outlet reassignment while retaining company-owned transaction history;
- tenant-scoped views through the selected in-memory company dataset.

The application is a self-contained HTML/CSS/JavaScript file with hash-based navigation. Reloading restores the fixed starting state.

## The “AI” boundary

The current intelligence layer is **rule-based and explainable**, not a language model:

- route priority scores overdue amount, order value, recency and outlet tier;
- coaching nudges identify product or ordering gaps;
- the morning briefing summarises computed performance data;
- price checks compare an entered value with configured floors and prior averages.

Calling this “AI” describes deterministic decision-support logic. The repository contains no model API, machine-learning training, predictive model or autonomous sales decision-maker.

## Simulated or not implemented

- The fixed dataset and all performance history are invented.
- The demonstration date is pinned to 19 August 2026.
- GPS check-in generates a plausible coordinate; it does not read device location.
- WhatsApp displays a preview; it does not send a message.
- Receipt links are illustrative and do not resolve.
- There is no login, authorisation, database, persistence or offline synchronisation.
- Sales orders, returns, stock, multi-warehouse, commissions, route optimisation, LHDN e-Invoice and referral functions remain roadmap concepts.
- No money is transferred and no compliant tax invoice is issued.

## Strategic value

Winning Salesman is a useful discovery and sales-engineering asset because it proves the product flow before a costly backend build. It helps an organisation test:

1. whether the field workflow matches actual selling practice;
2. which exceptions require manager approval;
3. what data must remain company-owned;
4. how collections and margin controls should surface;
5. which integrations justify a production pilot.

## Technology

| Layer | Current implementation |
|---|---|
| Application | Single static `index.html` |
| Interface | HTML, responsive CSS and vanilla JavaScript |
| Navigation | Hash routes with browser back-button support |
| Data | Fixed seeded in-memory tenant datasets |
| Intelligence | Deterministic scoring, comparison and templating rules |
| Backend / authentication | Not implemented |
| Persistence | Not implemented |
| Hosting | Manually uploaded static Netlify deployment |

## Live demonstration

[Open Winning Salesman](https://winning-salesman.netlify.app)

The Netlify deployment was confirmed ready on **25 August 2026**. It is manually uploaded rather than Git-linked, so a repository update does not by itself prove that the hosted copy changed.

A repeatable 60-second walkthrough is available in [PITCH-PATH.md](PITCH-PATH.md).

## Delivery role

**Ts. Zaiwin Kassim** led the product concept, operating-model design, commercial narrative and solution direction with the **KOBIS AI Prodigy Team**, using supervised AI-assisted development.

This statement describes delivery responsibility. It does not claim client adoption, endorsement or commercial deployment.

## Responsible use

A production build must add:

- authenticated users, least-privilege roles and tenant isolation enforced server-side;
- encrypted shared storage, backups, audit logs and retention controls;
- explicit consent and lawful handling for location, customer and employee data;
- approved pricing, discount, credit, commission and collection rules;
- verified inventory, accounting, payment and e-Invoice integrations;
- human review of route, coaching, anomaly and performance recommendations;
- bias testing and an appeal path for employee-impacting rankings;
- security, accessibility, reliability and offline-conflict testing.

Managers should not use prototype rankings or recommendations for employment, disciplinary, credit or customer decisions.

## Run locally

Open `index.html` in a modern browser. No install, build, server, login or API key is required.

## Evidence needed for the next maturity stage

Build and test one secure shared workflow:

**authenticated salesperson → real device-location consent → outlet visit → approved order → finance-reviewed invoice → auditable payment status**

Use synthetic data until privacy, financial and employment safeguards are approved.
