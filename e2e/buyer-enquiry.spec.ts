import { expect, test } from "@playwright/test";

test("buyer submits a catalogue enquiry that appears in the admin leads inbox", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const buyerName = `E2E Buyer ${Date.now()}`;
  const phone = "9876543210";

  await page.goto("/catalogue/premium-corporate-essentials");
  await expect(
    page.getByRole("heading", { name: "Premium corporate essentials" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Atlas cabin trolley" }).first().click();
  await expect(page).toHaveURL(/\/catalogue\/premium-corporate-essentials\/product\//);
  await expect(
    page.getByRole("heading", { name: "Atlas cabin trolley" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const contactButton = page.getByRole("button", { name: "Contact Us" });
  await contactButton.scrollIntoViewIfNeeded();
  await contactButton.click();

  await page.getByLabel("Your name *").fill(buyerName);
  await page.getByLabel("WhatsApp number *").fill(phone);
  const enquiryResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/enquiries") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();
  expect((await enquiryResponse).status()).toBe(201);

  await expect(page.getByRole("heading", { name: "Enquiry sent" })).toBeVisible();
  const reference = page.getByText(/ENQ-\d{7}/);
  await expect(reference).toBeVisible();
  const referenceText = await reference.innerText();
  expect(referenceText).toMatch(/^ENQ-\d{7}$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@catalogue.test");
  await page.getByLabel("Password").fill("Admin#2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.goto("/admin/leads");
  const leadRow = page.getByRole("row").filter({ hasText: buyerName });
  await expect(leadRow).toBeVisible();
  await expect(leadRow).toContainText(referenceText);
  await expect(leadRow).toContainText("1 product");
  await expect(leadRow).toContainText("20 units");
});
