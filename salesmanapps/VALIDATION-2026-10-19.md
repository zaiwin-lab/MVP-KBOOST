# Validation note — 19 October 2026

Sales Portal, salesman application. The acceptance criteria in the repository
README, re-run against the current build, on synthetic data only.

This supplements [`VALIDATION-2026-10-15.md`](VALIDATION-2026-10-15.md), which
remains the full account of method, dataset and tester roles, and
[`VALIDATION-2026-10-16.md`](VALIDATION-2026-10-16.md). Only what differs is
restated here.

| | |
|---|---|
| **Date** | 19 October 2026, 04:10 UTC (12:10 MYT) |
| **Commit under review** | `34044dea…` — `app: a commission follows its invoice, and a shelf says how long it has sat` |
| **Deployed build** | `salesmanapps.netlify.app`, build stamp `34044de · 2026-10-19` |
| **Database** | Supabase project `ebjsyramwnyekufvowft`, Postgres 17, 33 migrations applied |
| **Result** | **8 of 8 criteria pass.** 43 individual checks, 0 failed. |

## Result by criterion

| # | Criterion | Checks | Result |
|---|---|---|---|
| 1 | Management can create and revoke a salesperson account | 5 | PASS |
| 2 | Opening van stock can be issued and reconciled | 5 | PASS |
| 3 | A salesperson cannot see another's restricted records | 9 | PASS |
| 4 | A transaction updates stock and creates the expected document | 7 | PASS |
| 5 | A payment cannot exceed the outstanding amount | 6 | PASS |
| 6 | A return restores stock through the intended path | 4 | PASS |
| 7 | Management reports reconcile with the underlying ledger | 5 | PASS |
| 8 | The deployed build is linked to the exact reviewed Git commit | 2 | PASS |

Every request the run logs as failing is one it deliberately provokes, and each
now carries the right status: `404` for a line naming no product, three `400`s
for payments refused as over the balance or zero, `400` for a banned account
signing in, `401` for a salesman calling the administration endpoint.

## Defects found and fixed since the previous note

**A "not found" was returned as a server error.** Twenty-six functions raised
`P0002` for an ordinary not-found refusal, and PostgREST maps `P0002` to HTTP
**500**. So an unknown product, a missing outlet or an already-decided request
reached the phone as Internal Server Error. The real cost was not the wording:
nobody reading the logs could separate a genuine fault from a routine refusal,
because both were 500s. All twenty-six now raise `PT404`. Messages are
unchanged — the application maps them to Malay by text, not by code.

This had been logged by every sprint run for days and passed anyway, because
the sprint asserts that a call was *refused* and a 500 is a refusal. An
assertion about the outcome cannot see a wrong status code. The sprint now
records the method and path of each failing request in place of the browser's
"Failed to load resource", which names nothing; that is what turned it into a
one-line diagnosis.

**The profile misdescribed where an outlet's coordinates came from.** Every
outlet was labelled as approximated from its district, to about 600m. True of
the twelve seeded outlets; false of any outlet registered through the app,
whose coordinates are a device GPS fix taken standing at the shop. Wrong in the
direction that costs something: a salesman told his pin is a 600m estimate
drives to the area and looks around instead of driving to the pin.
`coords_source` now records which it is, set by the function rather than sent
by the client. Found when the first outlet registered from a real phone outside
this project carried the same caption as the seeded ones.

**A referral commission outlived the invoice that earned it.** A referral is
verified when the shop's first invoice is settled, and 5% recorded as
commission; nothing recorded which invoice. Both routes that un-settle an
invoice are now covered — cancelling it, and rejecting a payment on it, the
second being easy to miss because it recalculates the balance and can take an
invoice from paid back to partial with nothing cancelled. Fixed while the table
was empty, which was the point: with commissions already paid against unknown
invoices there is no safe way to decide which sale earned which.

**Consignment stock did not say how long it had been sitting.** Goods on a
shop's shelf are not billed until somebody counts them. The profile listed
quantities with no dates, so a shelf last counted in August read like one
counted yesterday — and the demo data holds one untouched since 9 August, 261
units. The age is now shown, and compared against the outlet's **own agreed
service interval** rather than a number chosen here.

## Test residue, and why it is a defect

Two leaks were found in the testing itself, both on screens somebody
demonstrates from.

**Four working salesman logins.** Revoking the throwaway account is itself one
of criterion 1's checks, so a run that failed earlier left a usable login
behind. Four had accumulated over one afternoon and had been live for four
days. They are revoked, and each run now begins by revoking any account a
previous run left live, so the leak heals on the next run whatever killed the
last one.

**Eight collections in the office's approval queue.** The cycle takes two real
payments per run and left them queued, each a *Kedai Ujian Validasi* row on the
screen the office actually uses. Teardown now confirms its own payments —
confirmed rather than rejected, because nothing was wrong with them.

Checked after this run: no validation account live, no validation outlet
active, no test referral row, and the office queue holding only the nine items
it is meant to.

## Supporting suites

Run against the same commit, all passing. Each drives the real application in a
real browser with real credentials; none holds a service-role key.

| Suite | What it proves |
|---|---|
| `api-surface.mjs` | The internal functions stay unreachable; the ones the app calls still work |
| `profile-debt.mjs` | Debt ageing and last payment agree with the ledger |
| `profile-prices.mjs` | Standing prices match `customer_prices`; both drift warnings render |
| `profile-location.mjs` | The coordinate caption follows `coords_source` |
| `profile-shelf.mjs` | Shelf age matches the drops behind it; the threshold follows the outlet's service interval |
| `referral-commission.mjs` | A commission is earned on settlement and given back by both routes that un-settle the invoice |

## Scope and limitations

As stated in the 15 October note, and unchanged. In short: a functional and
integrity validation on synthetic data — not a penetration test, not a load
test, not a production readiness sign-off. It does not replace a run through
the screens on a physical handset, which has still not been done. The company
details printed on documents are still placeholders, so no document produced is
a valid commercial document. LHDN e-Invoice is not implemented. Leaked-password
protection remains disabled; the linter flagged it again today.
