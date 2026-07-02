import { test, expect } from "@playwright/test";

const BASE_URL = "https://stay.dovail.com";

test.describe("Servia Stay basic production smoke tests", () => {
  test("home page loads", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/stay\.dovail\.com/);
  });

  test("admin login page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText(/Sign in to Admin/i)).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Sign in$/i })
    ).toBeVisible();
  });

  test("admin login validates empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`, {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByText(/Admin email is required/i)).toBeVisible();
  });

  test("property listing/home content loads", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();

    const images = page.locator("img");
    await expect(images.first()).toBeVisible({ timeout: 10000 });
  });

  test("notifications route redirects or loads safely", async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();
  });

  test("unknown route shows not found or safe page", async ({ page }) => {
    await page.goto(`${BASE_URL}/unknown-test-route`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();
  });
});