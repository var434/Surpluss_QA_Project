import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, getPrismaMock, updateManyMock, deleteManyMock, findCatalogueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getPrismaMock: vi.fn(),
  updateManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
  findCatalogueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: getPrismaMock,
}));

import {
  DELETE,
  PATCH,
} from "@/app/api/admin/catalogues/[id]/listings/[listingId]/route";

const foreignCatalogueId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";

describe("catalogue listing access boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-id", role: "admin" } });
    findCatalogueMock.mockResolvedValue({ id: foreignCatalogueId });
    updateManyMock.mockResolvedValue({ count: 1 });
    deleteManyMock.mockResolvedValue({ count: 1 });
    getPrismaMock.mockReturnValue({
      catalogue: { findUnique: findCatalogueMock },
      catalogueListing: {
        updateMany: updateManyMock,
        deleteMany: deleteManyMock,
      },
    });
  });

  it("blocks signed-out requests before querying the database", async () => {
    authMock.mockResolvedValue(null);
    const request = new NextRequest(
      `http://localhost/api/admin/catalogues/${foreignCatalogueId}/listings/${listingId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVisible: false }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: foreignCatalogueId, listingId }),
    });

    expect(response.status).toBe(401);
    expect(getPrismaMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered payload for a valid listing ID", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/catalogues/${foreignCatalogueId}/listings/${listingId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVisible: "false" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: foreignCatalogueId, listingId }),
    });

    expect(response.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("scopes PATCH to the catalogue in the URL", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/catalogues/${foreignCatalogueId}/listings/${listingId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVisible: false }),
      },
    );

    await PATCH(request, {
      params: Promise.resolve({ id: foreignCatalogueId, listingId }),
    });

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: listingId,
          catalogueId: foreignCatalogueId,
        }),
      }),
    );
  });

  it("scopes DELETE to the catalogue in the URL", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/catalogues/${foreignCatalogueId}/listings/${listingId}`,
      { method: "DELETE" },
    );

    await DELETE(request, {
      params: Promise.resolve({ id: foreignCatalogueId, listingId }),
    });

    expect(deleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: listingId,
          catalogueId: foreignCatalogueId,
        }),
      }),
    );
  });
});
