import { describe, expect, it, vi } from "vitest";
import {
  discountPercent,
  needsPricesForSale,
  NO_PRICE_LABEL,
  priceLabel,
  PRICE_ON_REQUEST_LABEL,
} from "@/lib/pricing";

describe("catalogue pricing helpers", () => {
  it("rounds the discount percentage to the nearest whole number", () => {
    expect(
      discountPercent({ priceOnRequest: false, mrp: 1000, offerPrice: 749 }),
    ).toBe(25);
  });

  it("does not expose a discount for price-on-request items", () => {
    expect(
      discountPercent({ priceOnRequest: true, mrp: 1000, offerPrice: 500 }),
    ).toBe(0);
  });

  it("returns zero when either comparison price is unavailable", () => {
    expect(
      discountPercent({ priceOnRequest: false, mrp: null, offerPrice: 500 }),
    ).toBe(0);
    expect(
      discountPercent({ priceOnRequest: false, mrp: 1000, offerPrice: null }),
    ).toBe(0);
  });

  it("uses request and enquiry labels instead of formatting a missing price", () => {
    const format = vi.fn((value: number) => `₹${value}`);

    expect(priceLabel({ priceOnRequest: true, offerPrice: 500 }, format)).toBe(
      PRICE_ON_REQUEST_LABEL,
    );
    expect(priceLabel({ priceOnRequest: false, offerPrice: null }, format)).toBe(
      NO_PRICE_LABEL,
    );
    expect(format).not.toHaveBeenCalled();
  });

  it("requires both MRP and offer price unless price is on request", () => {
    expect(
      needsPricesForSale({ priceOnRequest: false, mrp: 1000, offerPrice: null }),
    ).toBe(true);
    expect(
      needsPricesForSale({ priceOnRequest: false, mrp: 1000, offerPrice: 500 }),
    ).toBe(false);
    expect(
      needsPricesForSale({ priceOnRequest: true, mrp: null, offerPrice: null }),
    ).toBe(false);
  });
});
