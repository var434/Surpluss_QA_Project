import { describe, expect, it } from "vitest";
import { effectiveStatus } from "@/lib/catalogue-status";

describe("effectiveStatus", () => {
  it("keeps a published catalogue live until its validity date", () => {
    const future = new Date(Date.now() + 60_000);
    expect(effectiveStatus("published", future)).toBe("published");
  });

  it("marks a published catalogue expired after its validity date", () => {
    const past = new Date(Date.now() - 60_000);
    expect(effectiveStatus("published", past)).toBe("expired");
  });

  it("keeps a published catalogue without a validity date live", () => {
    expect(effectiveStatus("published", null)).toBe("published");
  });

  it("treats drafts and legacy inactive or expired statuses as drafts", () => {
    expect(effectiveStatus("draft", null)).toBe("draft");
    expect(effectiveStatus("inactive", null)).toBe("draft");
    expect(effectiveStatus("expired", null)).toBe("draft");
  });
});
