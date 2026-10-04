# Security review summary

This review covers server-side role enforcement, catalogue lifecycle access,
and catalogue-scoped listing mutations. Findings are based on the current
application code and should be retested after fixes.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `src/app/admin/actions.ts` | 35-63 | `deleteCatalogue()` checks for a signed-in user but does not require the admin role, so staff can invoke a destructive admin-only operation. | 9/10 |
| 2 | 🟡 MEDIUM | `src/lib/catalogue-status.ts`, `src/lib/catalogue-queries.ts` | 5-13; 44-55 | The admin-facing lifecycle calculation treats future-dated published catalogues as expired and past-dated ones as published, disagreeing with the public catalogue query. This can mislead staff about whether pricing is current or a catalogue is still live. | 8/10 |
| 3 | 🟠 HIGH | `src/app/api/admin/catalogues/[id]/listings/[listingId]/route.ts` | 8-78 | Listing PATCH and DELETE operations validate the IDs but update/delete by `listingId` alone; they do not require the listing's `catalogueId` to match the catalogue ID in the URL. A valid listing ID from another catalogue can therefore be changed or removed through the wrong parent route. | 9/10 |
| 4 | 🟠 HIGH | `src/app/api/catalogues/[slug]/search/route.ts` | 18-38 | Public search queries the listing table without enforcing that the catalogue is published and unexpired. Draft and expired catalogue product data, including price, is returned to unauthenticated callers. | 9/10 |

## Reproduction and regression test targets

### 1. Staff can delete catalogues

1. Sign in with the seeded `staff@catalogue.test` account.
2. Invoke `deleteCatalogue()` with a catalogue ID as the staff user.
3. The deletion action runs without checking the user's admin role.

Add a regression test asserting that the deletion action rejects staff. The
current regression is `tests/admin-access.test.ts`.

### 2. Published catalogue expiry is reversed in the admin status helper

1. Evaluate a published catalogue with a future `expiresAt`.
2. Evaluate a published catalogue with a past `expiresAt`.
3. The first should remain published and the second should be expired.

`tests/catalogue-status.test.ts` currently contains assertions for these cases;
both fail against the current implementation.

### 3. Listing mutation does not enforce parent catalogue ownership

1. Obtain a valid listing ID from catalogue A.
2. Send `PATCH` or `DELETE` to
   `/api/admin/catalogues/<catalogue-B-id>/listings/<catalogue-A-listing-id>`.
3. The request should reject the mismatched parent/listing pair without
   changing data; the current handler's mutation query uses the listing ID
   without constraining it to the URL's catalogue ID.

Add route tests for both PATCH and DELETE, with the listing belonging to a
different catalogue, and assert that the record remains unchanged.

### 4. Public search returns draft and expired catalogue products

1. Request `/api/catalogues/<draft-slug>/search?q=<product>` without signing
   in, then repeat with an expired published catalogue slug.
2. Both requests currently return HTTP 200 and query matching catalogue
   listings.
3. The endpoint should reject these catalogues before querying their product
   listings.

`tests/catalogue-search-access.test.ts` contains failing draft and expired
catalogue cases.
