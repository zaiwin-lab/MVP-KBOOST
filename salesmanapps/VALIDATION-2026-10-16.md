# Validation note — 16 October 2026

Sales Portal, salesman application. The acceptance criteria in the repository
README, re-run against the current build, on synthetic data only.

This note supplements [`VALIDATION-2026-10-15.md`](VALIDATION-2026-10-15.md),
which remains the full account of method, dataset and tester roles. Only what
differs is restated here.

| | |
|---|---|
| **Date** | 16 October 2026, 06:05 UTC (14:05 MYT) |
| **Commit under review** | `0e2908ebece56ff64e4781634e45443cac50c68d` |
| **Deployed build** | `salesmanapps.netlify.app`, build stamp `0e2908e · 2026-10-16` |
| **Database** | Supabase project `ebjsyramwnyekufvowft`, Postgres 17, 24 migrations applied |
| **Result** | **8 of 8 criteria pass.** 43 individual checks, 0 failed. |

## What changed since the previous run

| Commit | Change |
|---|---|
| `80b6be1` | Debt ageing, last payment, and the profile figures made tappable |
| `a7c9b17` | Approved special prices on the profile, the waiting panel, and migration 24 |
| `188232c` | Ignore the validation run artefact |
| `0e2908e` | Headers and redirects moved into files that travel with the site |

**Migration 24, `price_request_floor_guard`,** is the only database change.
`request_price()` and `decide_price_request()` now check the product's floor
price, at request time and again at approval time. Nothing checked it before,
so the office could approve a standing price that `post_sale()` would then
refuse on every order — the salesman would have been shown *below the floor
price* on a figure the application itself had filled in for him. No such price
existed in the data; the gap was in what could be created, not in what had
been.

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

The cycle issued `SO000080` / `INV000080`, settled them, returned 3 units, and
reconciled: van stock 91 = 100 issued − 12 sold + 3 returned; invoice total,
sales order total, line total and payments all 19.20; nothing outstanding.

**Criterion 8 failed on the first attempt that day, correctly.** The build
could not be published (below), so the live stamp named `80b6be1` while the
commit under review was `a7c9b17`. The criterion exists to catch exactly that,
and the result above is from the run made after the build was published.

## The deploy, and what it forced

The usual publishing route failed. Netlify's one-time deploy relay —
`netlify-mcp.netlify.app/proxy/<token>`, which supplies the credential for an
unauthenticated upload — returned a bare `403 Forbidden` to every API path,
including `/api/v1/user`, across two days and seven freshly issued tokens. The
response carried no `x-request-id`, which the Netlify API always sets, so the
request never reached the API. The account and the site were healthy
throughout: reads through the separate MCP credential worked normally. The
build was therefore published by hand from the staged folder.

That exposed a real defect, and it would have shipped silently. **A folder
published by hand never reads `netlify.toml`,** and every response header was
declared there. Two of them are not cosmetic:

- `Cache-Control: no-cache` on `app/sw.js`. A phone that caches the service
  worker keeps serving an old shell, and no later deploy reaches that salesman
  — the one failure mode of an installed app that the user cannot clear.
- `Content-Type: application/manifest+json` on the manifest. Served as
  octet-stream it is ignored: no install prompt, no home-screen icon.

`_headers` and `_redirects` are now the single source, copied into the
published folder by both routes. The blocks were removed from `netlify.toml`
rather than duplicated. Verified against the published site:

| Check | Result |
|---|---|
| `app/sw.js` | `cache-control: no-cache`, `service-worker-allowed: /app/` |
| `app/manifest.webmanifest` | `content-type: application/manifest+json` |
| Every path | `x-frame-options`, `x-content-type-options`, `referrer-policy` |
| `/proposal.html` | `301` to `/playbook.html` |

## Supporting suites

Run against the same commit, all passing:

| Suite | Result |
|---|---|
| `db/api-surface.mjs` | The internal functions remain unreachable from outside; the ones the app calls still work |
| `db/profile-debt.mjs` | Ageing and last payment agree with the ledger; no sideways scroll at 360 or 390 |
| `db/profile-prices.mjs` | Standing prices match `customer_prices`; both drift warnings render; the waiting panel matches the pending rows |

**A defect was found in the tests, not in the code.** `profile-prices.mjs`
asserted against whatever happened to be pending in the demo data, and someone
working through the office queue decided both outstanding price requests at
03:05 that morning. The suite failed. The screen was correct; the test was
wrong to assume a fixture it did not own.

It now raises its own price request through `request_price()`, asserts the
panel, and deletes the row again through the application's own client under
the policy that let it raise one — nothing is left in the office queue. Rows
that only need to be *drawn* are injected into the loaded data in the page
instead, which is also how the two drift warnings are exercised, since no
outlet has drifted yet and a warning nobody has seen render is not a warning.
The refusal rules are asserted by identity rather than by a count, because the
live data contributes refusals of its own.

The database was checked afterwards: four price requests, none pending, no
test rows remaining.

## Scope and limitations

As stated in the 15 October note, and unchanged. In short: this is a
functional and integrity validation on synthetic data, not a penetration test,
not a load test, and not a production readiness sign-off. It does not replace
a manual run through the screens on a physical handset. The company details
printed on documents are still placeholders, LHDN e-Invoice is not
implemented, and leaked-password protection remains disabled — a project
setting that should be enabled before real salesman accounts are issued.

One limitation is worth adding after this run: the suites run against a
database that people also use. Anything that leans on data it did not create
is measuring the demo set rather than the software, and will fail for reasons
that have nothing to do with the build. The sprint has always created and
disposed of its own account and outlet for this reason; the profile suites now
do the same.
