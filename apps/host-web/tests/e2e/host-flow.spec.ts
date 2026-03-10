import { expect, test } from "@playwright/test";

test("host page renders and can create a pad", async ({ page }) => {
  await page.goto("/host");
  await expect(page.getByText("Soundboard")).toBeVisible();

  await page.getByPlaceholder("New pad label").fill("Wave");
  await page.getByRole("button", { name: "Add Pad" }).click();

  await expect(page.getByRole("button", { name: "Wave" })).toBeVisible();
});
