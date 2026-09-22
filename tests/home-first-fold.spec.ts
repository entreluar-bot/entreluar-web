import { expect, test } from "@playwright/test";

const mobileViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

for (const viewport of mobileViewports) {
  test(`primeira dobra em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("http://127.0.0.1:3004");

    const portals = page.getByRole("navigation", { name: "Escolha por onde começar" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Madura.");
    await expect(portals.getByRole("link")).toHaveCount(3);

    const navigationBox = await portals.boundingBox();
    const portraitBox = await page.locator(".hero-portrait").boundingBox();
    const bottomNavBox = await page.getByRole("navigation", { name: "Navegação rápida" }).boundingBox();

    expect(navigationBox).not.toBeNull();
    expect(portraitBox).not.toBeNull();
    expect(bottomNavBox).not.toBeNull();
    expect(navigationBox!.y + navigationBox!.height).toBeLessThan(bottomNavBox!.y);
    expect(portraitBox!.y).toBeLessThan(bottomNavBox!.y);

    for (const portal of await portals.getByRole("link").all()) {
      const box = await portal.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      const titleFits = await portal.locator(".home-portal__copy strong").evaluate((node) => node.scrollWidth <= node.clientWidth);
      const subtitleFits = await portal.locator(".home-portal__copy > span").evaluate((node) => node.scrollWidth <= node.clientWidth);
      expect(titleFits).toBe(true);
      expect(subtitleFits).toBe(true);
    }

    await page.screenshot({ path: `test-results/home-${viewport.width}x${viewport.height}.png`, fullPage: false });
  });
}

test("portais novos apontam direto para cada tipo de conteúdo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:3004");

  const portals = page.getByRole("navigation", { name: "Escolha por onde começar" });
  await expect(portals.getByRole("link", { name: /Vitrine/ })).toHaveAttribute("href", /^\/vitrine\/.+/);
  await expect(portals.getByRole("link", { name: /Papo de Mulher/ })).toHaveAttribute("href", /^\/blog\/.+/);
  await expect(portals.getByRole("link", { name: /Te Explico/ })).toHaveAttribute("href", /^\/resenhas\/.+/);
  await expect(portals.getByText("NOVO")).toHaveCount(3);
  await page.screenshot({ path: "test-results/home-desktop-1280x900.png", fullPage: false });
});
