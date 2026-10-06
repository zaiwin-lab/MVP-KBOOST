# Sales Portal — Field Sales & Distribution Operations

**Maturity:** Authenticated pre-pilot operational prototype with a public sample-data mode  
**Portfolio category:** Field sales, distribution, collections, van stock and management visibility  
**Production status:** Core workflows are database-backed and tested; real business onboarding, governance and deployment traceability remain incomplete

[Open the current Sales Portal](https://salesmanapps.netlify.app) · [Open the earlier Winning Salesman demonstration](https://winning-salesman.netlify.app)

Sales Portal turns a fragmented field-sales operation into one connected workflow:

**assign outlet → plan visit → deliver or sell → issue documents → collect payment → reconcile stock → review performance**

The current build lives under [`salesmanapps/`](salesmanapps/). It is a separate implementation from the earlier single-file Winning Salesman demonstration retained at the repository root.

## Business problem

Distribution businesses often manage customer ownership, routes, orders, consignment stock, invoices, payments and salesperson performance across messages, spreadsheets and disconnected paperwork. This creates avoidable risks:

- sales and collections are difficult to reconcile;
- stock can move without an auditable explanation;
- document numbers can collide or skip without control;
- customer history may remain with an individual salesperson;
- managers lack a timely view of debt ageing and field activity;
- privileged account actions may be handled informally.

Sales Portal demonstrates how those activities can share one secured operational record while preserving role boundaries.

## Intended users

- distribution-business owners and management teams;
- field-sales representatives;
- finance and collections teams;
- stock controllers and supervisors;
- implementation teams evaluating a controlled operational pilot.

These are intended roles. The repository does not evidence adoption, revenue, production customers or commercial deployment.

## Current capabilities

### Three access panels

| Panel | Purpose |
|---|---|
| Public | Product explanation and safe sample-data demonstration |
| Management | Team, collections, debt ageing, van stock, reports and account administration |
| Salesman | Schedule, customer, sales, consignment, collection, return and document workflows |

### Operational flows

- Consignment, Bil to Bil and Cash transaction models
- Independent DO, SO, Invoice, Return and Receipt sequences
- Database-backed sales, deliveries, consignment billing, payments, returns and outlet registration
- Per-salesperson van stock with request, issue and rejection history
- Management-controlled salesperson account creation, password change, revocation and restoration
- Actual PDF generation, browser printing and WhatsApp document text
- Search, ranking, collection, ageing and product reporting derived from the shared ledger
- Bahasa Malaysia, English, Chinese and first-pass Jaku Iban interface modes

## Verified implementation

The authenticated implementation uses Supabase Auth and Postgres. Row Level Security is enabled across 16 tables. A salesperson reads only their assigned operational records; management receives the broader read view.

Six business events are posted through database functions designed as atomic transactions:

- sale;
- consignment delivery;
- consignment balance billing;
- payment;
- return;
- customer registration.

Shared document numbers and stock movements are protected behind server-side functions. Privileged account operations run through the `admin-users` Edge Function so the service-role key is not shipped to the browser.

The repository documents live-session checks for role isolation, stock limits, floor-price enforcement, payment limits, consignment duplication, document numbering and account revocation. See [the implementation README](salesmanapps/README.md) and [database evidence](salesmanapps/db/README.md).

## Decision-support boundary

The product's “AI” layer is deterministic and explainable. It derives route order, quiet-outlet signals, payment behaviour, coaching prompts and management summaries from the current transaction data.

It is **not** a language model, predictive model or autonomous decision-maker. It must not be used by itself for employment, disciplinary, customer-credit or pricing decisions.

## Demonstration data and limitations

The public path uses generated sample data: one fictional company, five salespeople, 12 outlets, eight products and approximately 120 days of transactions. The sample path does not write to the database.

Before real operational use:

- load authorised company, staff, customer, product, opening-stock and balance data;
- replace all placeholder company and registration information;
- enable breached-password protection and complete account-recovery controls;
- validate the first-pass Jaku Iban translation with a native speaker;
- add a governed visit-planning workflow rather than deriving the route only in the browser;
- document backups, retention, incident response, audit review and support ownership;
- complete privacy, employment, financial, tax and e-Invoice review;
- connect the deployment to an exact reviewed Git commit.

## Strategic value

Sales Portal is portfolio evidence of moving beyond a visual mock-up into a controlled operational architecture:

1. business rules are expressed as auditable transactions;
2. authentication and database policies enforce role boundaries;
3. stock and document sequences are shared rather than browser-local;
4. public demonstration data is separated from authenticated records;
5. the design remains inspectable before a wider rollout.

It is suitable for supervised discovery and pre-pilot validation, not a claim of production readiness.

## Technology

| Layer | Implementation |
|---|---|
| Interface | Self-contained HTML, CSS and vanilla JavaScript |
| Navigation | Hash-based routes |
| Languages | BM, English, Chinese and first-pass Jaku Iban |
| Authentication | Supabase Auth |
| Data | Supabase Postgres |
| Authorisation | Row Level Security plus server-side checks |
| Business writes | Transactional Postgres functions |
| Privileged account operations | Supabase Edge Function |
| Documents | Browser print, WhatsApp text and client-side PDF generation |
| Hosting | Netlify |

## Live demonstrations

### Current authenticated build

[Sales Portal](https://salesmanapps.netlify.app)

Netlify records the current deployment as ready and published on **5 October 2026**. It was uploaded through an API workflow and has no attached Git branch, commit reference or commit URL. Its timing aligns with the latest repository work, but exact file-for-file parity is not proven by Netlify metadata.

### Earlier product demonstration

[Winning Salesman](https://winning-salesman.netlify.app)

The earlier root application remains a browser-only demonstration. It is useful for a quick field-sales walkthrough but does not represent the authenticated Supabase implementation under `salesmanapps/`.

## Delivery role

**Ts. Zaiwin Kassim** led the product concept, operating-model translation, commercial direction and delivery review with the **KOBIS AI Prodigy Team**, using supervised AI-assisted development.

This statement describes product and delivery responsibility. It does not claim client adoption, endorsement, partnership approval or production deployment.

## Responsible use

A real rollout should keep human owners responsible for:

- customer onboarding and data accuracy;
- pricing, credit, payment and return approval;
- stock reconciliation and exception investigation;
- employee-impacting rankings and coaching;
- access reviews, account revocation and incident handling;
- document, tax and regulatory compliance.

Do not load confidential or personal business data into the public sample mode.

## Development provenance

Fifteen substantive default-branch application commits from **1–5 October 2026** added authentication, database transactions, stock replenishment, real document outputs, four-language coverage, account management and interface corrections. Those commits use `claude` as GitHub author and committer, so they do not map to the `zaiwin-lab` contribution graph. Their history has not been rewritten.

Future accepted work should be committed with an email linked to `zaiwin-lab`, while retaining an AI co-author trailer when appropriate.

## Run locally

### Earlier Winning Salesman demonstration

Open the repository-root `index.html` in a modern browser.

### Current Sales Portal

Serve the `salesmanapps/` directory with a local static server. Authenticated workflows also require the authorised Supabase configuration and deployed database objects documented under `salesmanapps/db/`.

## Highest-value next validation

Load a fully synthetic but realistic company dataset and run one complete audited cycle:

**management creates salesperson → stock is issued → salesperson serves outlet → transaction posts → document leaves the system → payment settles → management reconciles stock and ageing**

Record the exact Git commit used for the next Netlify deployment.
