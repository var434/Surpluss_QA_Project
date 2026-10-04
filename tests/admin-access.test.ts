import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getPrismaMock, deleteCatalogueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getPrismaMock: vi.fn(),
  deleteCatalogueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ getPrisma: getPrismaMock }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { deleteCatalogue, setCatalogueStatus } from "@/app/admin/actions";

const catalogueId = "44444444-4444-4444-8444-444444444444";

describe("catalogue deletion authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCatalogueMock.mockResolvedValue({ id: catalogueId });
    getPrismaMock.mockReturnValue({
      catalogue: {
        delete: deleteCatalogueMock,
        deleteMany: deleteCatalogueMock,
        findUnique: vi.fn().mockResolvedValue({ id: catalogueId, slug: "sample" }),
      },
    });
  });

  it("does not allow a staff user to delete a catalogue", async () => {
    authMock.mockResolvedValue({ user: { id: "staff-id", role: "staff" } });

    await deleteCatalogue(catalogueId);

    expect(deleteCatalogueMock).not.toHaveBeenCalled();
  });

  it("does not allow a signed-out user to delete a catalogue", async () => {
    authMock.mockResolvedValue(null);

    await deleteCatalogue(catalogueId);

    expect(deleteCatalogueMock).not.toHaveBeenCalled();
  });

  it("does not allow a staff user to publish a catalogue", async () => {
    authMock.mockResolvedValue({
      user: { id: "staff-id", email: "staff@example.test", role: "staff" },
    });

    const result = await setCatalogueStatus(catalogueId, "published");

    expect(result).toEqual({
      error: "Only an admin can change what is published.",
    });
    expect(getPrismaMock).not.toHaveBeenCalled();
  });
});
