# Findings

## 1. Staff can delete catalogues without admin authorization

**What happens**

The catalogue deletion server action checks that a user is signed in but does
not check that the user has the admin role. A staff account can invoke a
destructive action that the product reserves for admins.

**Steps to reproduce**

1. Sign in as `staff@catalogue.test` using the seeded `Staff#2026` password.
2. Invoke the `deleteCatalogue` server action with a catalogue ID.
3. Observe that the action reaches the database delete instead of rejecting
   the staff user.

**What should happen instead**

The server action should reject staff users and allow deletion only to admins.
The role check must happen server-side even if the UI hides the delete control.

**Impact — how bad is this, and why?**

High. A staff user can remove a catalogue without the admin approval required
for this destructive operation. Catalogues with attached enquiries are
protected by a database constraint, but catalogues without lead history can
still be deleted.

**Failing test**

`tests/admin-access.test.ts` — staff users cannot invoke the catalogue deletion
action. The staff case fails; the signed-out case passes.

## 2. Catalogue expiry is reversed in the effective status calculation

**What happens**

A published catalogue with a future validity date is reported as expired,
while a published catalogue whose validity date has passed is still reported
as published. The helper disagrees with the public catalogue query.

**Steps to reproduce**

1. Evaluate a published catalogue with an `expiresAt` date in the future.
2. Observe that its effective status is `expired`.
3. Evaluate a published catalogue with an `expiresAt` date in the past.
4. Observe that its effective status is `published`.

**What should happen instead**

A future validity date should leave a published catalogue published; a past
validity date should make it expired.

**Impact — how bad is this, and why?**

Medium. Staff can be misled about whether an offer is current, while an expired
catalogue may appear live in admin status displays. This risks stale pricing
being acted on and weakens lifecycle controls.

**Failing test**

`tests/catalogue-status.test.ts` — `keeps a published catalogue live until its
validity date`; `marks a published catalogue expired after its validity date`.

## 3. Listing mutations do not verify the listing belongs to the URL catalogue

**What happens**

The catalogue listing PATCH and DELETE handlers accept a valid listing ID
without binding it to the catalogue ID in the URL. A request can target a
listing from one catalogue through another catalogue's route.

**Steps to reproduce**

1. Obtain a listing ID belonging to catalogue A.
2. Send `PATCH /api/admin/catalogues/<catalogue-B-id>/listings/<catalogue-A-listing-id>`
   with a valid update payload, or send `DELETE` to that URL.
3. Observe whether the listing from catalogue A is changed or removed.

**What should happen instead**

The server must verify the listing belongs to the catalogue in the URL and
reject a mismatched pair without changing either catalogue.

**Impact — how bad is this, and why?**

High. An authorized catalogue editor can alter or delete another catalogue's
products by changing a URL ID, damaging the wrong buyer-facing catalogue and
its product selection.

**Failing test**

`tests/catalogue-listing-access.test.ts` — PATCH and DELETE scope the mutation
to the catalogue ID in the URL. Both cases fail because the current mutation
queries filter only by listing ID.

## 4. "List Price" is auto-mapped as the offer price

**What happens**

The auto-mapper checks the broad `price` synonym for offer price before checking
the more specific `listprice` synonym for MRP. As a result, a "List Price"
column is assigned to offer price, and a later "Selling Price" column is left
unmapped.

**Steps to reproduce**

1. Open the product import and provide columns named `Product Code`,
   `Product Name`, `Qty`, `List Price`, and `Selling Price`.
2. Allow the importer to auto-map the columns.
3. Observe that `List Price` maps to offer price and `Selling Price` maps to a
   custom attribute instead of offer price.

**What should happen instead**

The specific list-price synonym should map to MRP, and selling price should map
to offer price, regardless of column order.

**Impact — how bad is this, and why?**

Medium. Imports can silently put the wrong value in the buyer-facing offer
price or omit a price, affecting catalogue accuracy and potentially commercial
terms.

**Failing test**

`tests/import-mapping.test.ts` — `maps common seller column headings to product
fields`.

## 5. Import price parsing drops a price when a unit suffix is present

**What happens**

The number parser strips currency symbols and separators, but a common value
such as `₹1,20,000 / piece` becomes unparseable and is treated as a missing
price.

**Steps to reproduce**

1. Import a spreadsheet with a price cell containing `₹1,20,000 / piece`.
2. Let the importer validate the row.
3. Observe that it does not retain the numeric price.

**What should happen instead**

The parser should preserve the numeric amount while safely handling a known
unit suffix such as `/ piece`, or clearly flag the cell for correction rather
than silently counting the price as missing.

**Impact — how bad is this, and why?**

Medium. Sellers use currency grouping and unit notation in real inventory
sheets. Dropped prices create avoidable cleanup work and can leave imported
products without pricing.

**Failing test**

`tests/import-mapping.test.ts` — `parses a price followed by its selling unit`.

## 6. Public catalogue search exposes draft and expired product data

**What happens**

The public catalogue search API checks that a catalogue exists but does not
check whether it is published or still within its validity period. An
unauthenticated caller can query draft or expired slugs and receive matching
product names, SKUs, prices, and IDs.

**Steps to reproduce**

1. Use a draft catalogue slug such as `festive-overstock-2026` or an expired
   published slug such as `monsoon-clearance-2026`.
2. Request `/api/catalogues/<slug>/search?q=<matching product text>` without
   signing in.
3. Observe that the endpoint returns HTTP 200 with product search results.

**What should happen instead**

Search should return no product data unless the catalogue is published and
has not expired. Draft catalogues should be inaccessible publicly, and expired
catalogues must not expose stale product pricing through the search API.

**Impact — how bad is this, and why?**

High. This is an unauthenticated disclosure of confidential draft pricing and
expired offer data through an API even though the public catalogue page hides
those catalogues.

**Failing test**

`tests/catalogue-search-access.test.ts` — draft and expired catalogues do not
return search results. Both tests currently receive HTTP 200.
