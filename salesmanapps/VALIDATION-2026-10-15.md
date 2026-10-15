# Validation note — 15 October 2026

Sales Portal, salesman application. One complete operational cycle run against
the acceptance criteria in the repository README, on synthetic data only.

| | |
|---|---|
| **Date** | 15 October 2026, 04:00 UTC (12:00 MYT) |
| **Commit under review** | `9fca25b238ab83d3ee23dc1594778080857cd7f7` |
| **Deployed build** | `salesmanapps.netlify.app`, build stamp `9fca25b · 2026-10-15` |
| **Database** | Supabase project `ebjsyramwnyekufvowft`, Postgres 17, 20 migrations applied |
| **Result** | **8 of 8 criteria pass.** 43 individual checks, 0 failed. |

---

## Dataset

Entirely synthetic. No customer record, personal detail, real price or
credential appears in this note or in the data used.

The cycle created its own data rather than borrowing the demo set, so that
criterion 3 could be tested against a genuinely empty account:

- One salesperson account, created for this run and **revoked at the end of
  it** — a throwaway address on the project's own demo domain.
- One outlet, registered by that salesperson during the run, code `C0013`,
  **deactivated at the end of the run** so it cannot be mistaken for a real
  shop.
- Two products drawn from the existing synthetic catalogue; 100 units of
  opening van stock issued through the normal request-and-issue path.

The pre-existing ten weeks of synthetic trading data was left untouched and
was not relied on for any criterion.

## Tester roles

Two roles were exercised, each signed in with its own credentials through the
application's own client, so the tokens, the row-level security policies and
the posting functions are the same ones a salesman's phone uses. No part of
this run used a service-role key or bypassed row-level security.

| Role | Account | What it did |
|---|---|---|
| Management | `manager@salesportal.demo` | Created and revoked the account, issued stock, read the reconciliation |
| Salesperson | created during the run, now revoked | Everything a salesman does: registered the outlet, sold, collected, returned |

---

## Result by criterion

### 1. Management can create and revoke a salesperson account — **PASS**

The account was created through the `admin-users` edge function, which is the
only thing in the system holding the service-role key. The new account signed
in successfully. It was then revoked, after which sign-in fails with
`User is banned`.

Revocation sets two things, not one: the auth-level ban that stops a new
sign-in, and the `active` flag the application reads. A revoked salesman
cannot get back in by either route.

A salesperson calling the same endpoint directly was refused.

### 2. Opening van stock can be issued and reconciled — **PASS**

The new van started at **0 units**, which is the precondition that makes the
rest meaningful. Stock was requested by the salesperson and issued by the
office — the intended path, not a direct write — and the van then held
**100 units**, matching the `stock_issues` ledger exactly.

### 3. A salesperson cannot see another salesperson's restricted records — **PASS**

Tested two ways. Broadly: a freshly created account queried customers,
invoices, payments and van stock and received **0 rows** of each, with no row
belonging to another salesperson anywhere in the results.

Specifically: a known outlet belonging to a different salesperson was
requested **by its exact id**. The query returned nothing, and an attempt to
post a sale against it was refused. This is enforced by row-level security in
the database, so it holds however the request is made — not only through the
screens.

After registering his own outlet, the same account saw exactly one customer,
and it was his.

### 4. A transaction updates stock and creates the expected document — **PASS**

A sale of 12 units posted as a single transaction. Van stock fell by exactly
12. Two documents were issued with their own running numbers — `SO000075` and
`INV000075` — and the invoice total matched the order line to the sen. The
line total is computed by the database rather than sent by the client, and was
verified as such.

### 5. A payment cannot exceed the outstanding amount — **PASS**

Four attempts, in order:

| Attempt | Result |
|---|---|
| More than the balance | **Refused** — *the amount exceeds the 19.20 outstanding* |
| Zero | **Refused** |
| 40% of the balance | Accepted |
| More than the remaining balance | **Refused** |
| Exactly the remaining balance | Accepted; invoice moved to `paid` |

The rule is enforced in the posting function, not in the form, so it cannot be
bypassed by calling the API directly.

### 6. A return restores stock through the intended path — **PASS**

A return of 3 units issued a `RET` document and put exactly 3 units back on
the van.

A direct write to `van_stock` — attempting to set the quantity to 9,999 —
**changed no rows**. Stock moves only through the posting functions.

### 7. Management reports reconcile with the underlying ledger — **PASS**

Every figure was recomputed from the underlying rows and compared:

| Reconciliation | Result |
|---|---|
| Invoice totals = sum of order lines | 19.20 = 19.20 |
| Sales order totals = sum of their lines | 19.20 = 19.20 |
| `invoice.paid` = sum of non-rejected payments | 19.20 = 19.20 |
| Outstanding after settlement | 0.00 |
| Van stock = issued − sold + returned | 91 = 100 − 12 + 3 |

### 8. The deployed build is linked to the exact reviewed Git commit — **PASS**

The live page at `salesmanapps.netlify.app/app/` was fetched during the run and
its build stamp read: **`9fca25b · 2026-10-15`**, matching the commit under
review.

---

## Defects found, and changes made

This criterion was the one genuine gap, and it was **failing before this
sprint**. The build stamp was a hand-typed constant, `2026-10-12`, three days
stale and not a commit reference at all.

A file cannot contain its own commit hash, because the hash is computed from
the file. The stamp is therefore injected at deploy time: the build prefers
Netlify's `COMMIT_REF`, and falls back to a file written from the real `HEAD`
at the moment of deploy. Served straight from the repository the placeholder
survives and the screen reads *"belum dibina (sumber)"* rather than inventing a
version number.

A `deploy.sh` was added so the stamp cannot be forgotten. It refuses to pass
silently over a dirty working tree, because stamping `HEAD` while publishing
something else would make the audit trail a lie.

Two further defects were found in the data while preparing the run, both fixed:

- **Seven stock requests were recorded as answered before they were asked.**
  The synthetic seed generated the decision timestamp independently of the
  request timestamp.
- **Re-running a test left exact duplicate request rows** — same note, same
  decision, same day.

Three faults were also found and fixed in the week preceding this sprint, each
of which would have affected real operation:

- Rejecting a stock request **had never worked**: the application called the
  database function with the wrong argument name, which in PostgREST is a
  "function not found" error rather than a fall-through.
- Rejected payments were still being counted as **money received** in the daily
  summary.
- Six error messages returned `undefined` to the user instead of an
  explanation, caused by a `return` placed on its own line.

## Addendum — database security hardening, same day

After the sprint passed, Supabase's security linter was run against the
project. It found that **every function in the `public` schema was reachable
over the REST API**, including the internal helpers that move van stock
(`van_put`, `van_take`, `move_van_stock`) and issue document numbers
(`next_doc_no`). The cause was the schema's default grant, which publishes
every new function to `anon` and `authenticated` automatically, so each
function written for this project inherited it.

Nothing was exploited and nothing in the data is wrong: the posting functions
remained the only way to make a *coherent* change, and row-level security held
throughout — as this sprint demonstrates. But a signed-in salesman could have
put stock on his own van.

Fixed at the cause: the schema default is now deny, and `EXECUTE` is granted
back only to the twenty-six functions the applications call. Fifteen are now
unreachable from the API, which was verified from the outside by signing in as
a salesman and attempting each one directly.

**One regression, caught by re-running this sprint.** Revoking
`is_management()` broke every management query — it is called inside the
row-level security policies, and a policy is evaluated as the querying role,
not as the function owner. The sprint failed within a minute, the grant was
restored, and all eight criteria passed again. The sprint was re-run to
completion after the change, and the result above is from that run.

The linter's remaining finding on `public.doc_seq` — RLS enabled with no
policy — is deliberate and is not a defect. It is deny-all by design; the
table is reached only through a `SECURITY DEFINER` function that locks the
row, and that lock is what prevents two salesmen being issued the same invoice
number.

**Not fixed, and outstanding:** leaked-password protection is disabled. It is a
project setting rather than a migration, and should be enabled before real
salesman accounts are issued.

## Addendum 2 — database performance pass, same day

The performance linter was run after the security one. Two findings were real
and are fixed; the rest were not defects.

**Thirty row-level-security policies re-evaluated `auth.uid()` for every row
scanned.** Wrapped in a scalar subquery it is evaluated once per statement
instead. The rewrite was generated from the catalogue rather than typed, a
snapshot was compared before and after with the wrapper stripped back out —
**zero policies changed meaning** — and this sprint was re-run to completion
afterwards: 8 of 8, 43 checks, 0 failed.

**Forty-three foreign keys had no covering index**, mostly on columns added in
the last fortnight. Each now has one.

Four indexes reported as "never used" were **kept deliberately**. The tables
hold 15 to 87 rows, where Postgres chooses a sequential scan whatever indexes
exist, so the report means *too small to need one* rather than *not needed* —
and three of the four cover `salesman_id`, the column every policy filters on.

One thing worth recording against this sprint rather than hiding: taking the
policy snapshot required a scratch table in `public`, which Supabase's default
privileges granted to `anon` and `authenticated` the instant it was created,
with no row-level security. It existed for about two minutes and was dropped.
Every table in `public` is now checked to have RLS enabled rather than assumed.

## Scope and limitations

Stated plainly, because a validation note that overclaims is worse than none:

- This is a **functional and integrity validation on synthetic data**. It is
  not a penetration test, not a load test, and not a production readiness
  sign-off.
- It exercises the database functions and row-level security through the
  application's own client. It does **not** replace a manual run through the
  screens on a physical handset, which remains worth doing before go-live.
- Row-level security was tested for the salesman-to-salesman boundary. It was
  not exhaustively tested for every table and every role combination.
- The database linter was run and its findings acted on (see the addendum).
  That is not a substitute for a penetration test by someone trying to break
  in.
- The company details printed on documents are still placeholders. No document
  produced in this run is a valid commercial document.
- LHDN e-Invoice is **not** implemented. The buyer's TIN is stored and printed;
  no validation QR is generated, because only LHDN can issue one.
- No claim is made here about client adoption, endorsement or production
  deployment.

## Reproducing this

The run is scripted end to end and is re-runnable. It creates its own account
and outlet, and disposes of both. It prints pass or fail per criterion and
exits with the full check list.

The next run should state its own commit; a validation note that does not name
the build it tested is not evidence of anything.
