# Write-up

## 1. Strategy

- I started with server-side access boundaries and catalogue lifecycle because
  exposing an unpublished price or accepting stale pricing can cost the seller
  money.
- I added focused checks around pricing, import mapping and number parsing,
  catalogue expiry, enquiry validation, role enforcement, and catalogue-scoped
  listing updates.
- I used one browser journey to verify that a buyer's enquiry reaches the
  sales team's leads inbox, not just that the form displays a success state.

## 2. The riskiest part of this product

Catalogue visibility and pricing are the highest-risk areas. A draft contains
negotiated prices that have not been approved, and an expired catalogue has
stale offers. The public search API currently returns product search results
for both; a user can retrieve the information even when the public catalogue
page hides it. I would protect this boundary first, with server-side checks on
every read path and direct API tests for published, draft, and expired states.

## 3. What I left out, and why

- I did not test every component, admin CRUD route, filter, or import dialog
  interaction. I prioritized data exposure, destructive permissions, seller
  price mapping, and enquiry quantity boundaries.
- The enquiry API tests mock persistence; they do not verify PostgreSQL
  transaction behavior, concurrent stock changes, or notification delivery.
- The Playwright test covers one seeded product and one buyer enquiry. It does
  not cover mobile layouts, multiple products, or error recovery.
- I did not change the application code to make the regression tests pass:
  the failing tests are evidence for the bugs documented in `FINDINGS.md`.

## 4. AI tool usage

- I used Copilot in VS Code to inspect the project, draft focused Vitest and
  Playwright tests, and help structure the findings and write-up.
- I also used a security-review agent to check role and catalogue access
  boundaries. I compared its report with the source and narrowed the staff
  finding to the destructive delete action: sales staff are supposed to use
  the admin portal, but they must not delete catalogues.
- I ran the proposed tests and adjusted them based on actual results. For
  example, the first browser run exposed that the API submission needed a
  response-based wait and that sign-in took longer than the default assertion
  window. I replaced implicit timing assumptions with Playwright waits.
- I reviewed the resulting tests and kept the failing assertions as
  bug-reproduction evidence rather than changing the behavior under test.

## 5. One thing this codebase gets wrong

Role enforcement is easy to omit when each server action implements its own
checks. `setCatalogueStatus()` enforces the admin role, but
`deleteCatalogue()` only checks that someone is signed in. I would centralize
the admin-only action guard and add a test for each destructive or
publication-related server action so a hidden UI control is never the only
permission boundary.

## Notes

- `npm test` originally found no tests because the exercise starts with empty
  `tests/` and `e2e/` directories. Vitest is configured to exit successfully
  on an empty suite, so that initial green exit did not mean tests had run.
- I installed the Chromium browser required by Playwright using
  `npx playwright install chromium`.
- The Playwright journey uses the seeded published catalogue and creates a
  uniquely named buyer on each run. It needs the local database and the seeded
  sign-in accounts described in `README.md`.
- The current Vitest run has 27 tests: 18 pass, and 9 intentionally fail to
  reproduce the documented bugs. The focused Playwright journey passed.
