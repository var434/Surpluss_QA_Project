import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPrismaMock, findCatalogueMock, findListingsMock } = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
  findCatalogueMock: vi.fn(),
  findListingsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: getPrismaMock }));

import { GET } from "@/app/api/catalogues/[slug]/search/route";

const catalogueId = "88888888-8888-4888-8888-888888888888";

async function searchCatalogue(slug: string) {
  return GET(
    new Request(`http://localhost/api/catalogues/${slug}/search?q=sku`),
    { params: Promise.resolve({ slug }) },
  );
}

describe("public catalogue search access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCatalogueMock.mockResolvedValue({
      id: catalogueId,
      status: "draft",
      expiresAt: null,
    });
    findListingsMock.mockResolvedValue([
      {
        productId: "99999999-9999-4999-8999-999999999999",
        product: { name: "Confidential product", sku: "SECRET-1", offerPrice: 25 },
      },
    ]);
    getPrismaMock.mockReturnValue({
      catalogue: { findUnique: findCatalogueMock },
      catalogueListing: { findMany: findListingsMock },
    });
  });

  it("does not return search results for a draft catalogue", async () => {
    const response = await searchCatalogue("private-draft");
    const body: { ids?: string[]; matches?: unknown[] } = await response.json();

    expect(body.ids ?? []).toEqual([]);
    expect(body.matches ?? []).toEqual([]);
  });

  it("does not return search results for an expired published catalogue", async () => {
    findCatalogueMock.mockResolvedValue({
      id: catalogueId,
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const response = await searchCatalogue("expired-offer");
    const body: { ids?: string[]; matches?: unknown[] } = await response.json();

    expect(body.ids ?? []).toEqual([]);
    expect(body.matches ?? []).toEqual([]);
  });
});
