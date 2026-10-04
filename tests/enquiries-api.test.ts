import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPrismaMock,
  findListingsMock,
  findCatalogueMock,
  createEnquiryMock,
} = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
  findListingsMock: vi.fn(),
  findCatalogueMock: vi.fn(),
  createEnquiryMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: getPrismaMock }));

import { POST } from "@/app/api/enquiries/route";

const catalogueId = "55555555-5555-4555-8555-555555555555";
const productId = "66666666-6666-4666-8666-666666666666";
const listingId = "77777777-7777-4777-8777-777777777777";

function enquiryRequest(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    catalogueId,
    name: "A Buyer",
    email: "buyer@example.test",
    items: [{ productId, quantity: 5 }],
    ...overrides,
  };
}

describe("POST /api/enquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findListingsMock.mockResolvedValue([
      {
        id: listingId,
        productId,
        product: {
          name: "Steel bottle",
          sku: "BOT-1",
          brand: "Milton",
          offerPrice: 500,
          priceOnRequest: false,
          moq: 5,
          quantity: 20,
        },
      },
    ]);
    findCatalogueMock.mockResolvedValue({ notifyNumber: null });
    createEnquiryMock.mockResolvedValue({ id: "enquiry-id" });
    getPrismaMock.mockReturnValue({
      catalogueListing: { findMany: findListingsMock },
      catalogue: { findUnique: findCatalogueMock },
      enquiry: { create: createEnquiryMock },
    });
  });

  it("requires a buyer contact method before querying the database", async () => {
    const response = await POST(
      enquiryRequest({ catalogueId, name: "A Buyer", items: [{ productId, quantity: 5 }] }),
    );

    expect(response.status).toBe(400);
    expect(getPrismaMock).not.toHaveBeenCalled();
  });

  it("rejects fractional quantities before querying the database", async () => {
    const response = await POST(
      enquiryRequest(validPayload({ items: [{ productId, quantity: 1.5 }] })),
    );

    expect(response.status).toBe(400);
    expect(getPrismaMock).not.toHaveBeenCalled();
  });

  it("rejects quantities below the product MOQ without creating a lead", async () => {
    const response = await POST(
      enquiryRequest(validPayload({ items: [{ productId, quantity: 4 }] })),
    );

    expect(response.status).toBe(400);
    expect(createEnquiryMock).not.toHaveBeenCalled();
  });

  it("rejects tampered quantities above available stock without creating a lead", async () => {
    const response = await POST(
      enquiryRequest(validPayload({ items: [{ productId, quantity: 21 }] })),
    );

    expect(response.status).toBe(400);
    expect(createEnquiryMock).not.toHaveBeenCalled();
  });

  it("rejects a product that is not visible in the requested catalogue", async () => {
    findListingsMock.mockResolvedValue([]);

    const response = await POST(enquiryRequest(validPayload()));

    expect(response.status).toBe(409);
    expect(createEnquiryMock).not.toHaveBeenCalled();
  });
});
