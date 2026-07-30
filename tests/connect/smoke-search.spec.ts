import { test, expect, openConnect } from '../fixtures/connect';

/**
 * Suche (Kern-Testabdeckungs-Review)
 *
 * Bisher NICHT abgedeckt: smoke-settings.spec.ts prüft nur, dass der
 * 🔍-Button die Such-ANSICHT öffnet (Überschrift „Suche" erscheint) — nicht
 * die eigentliche Suchfunktion DataService.search(query), die Beiträge nach
 * Inhalt/Titel filtert.
 */
test.describe('Suche — DataService (Demo)', () => {
  test('search(query) findet Beiträge per Volltext-Teilstring, leere Anfrage liefert leeres Ergebnis', async ({ page }) => {
    await openConnect(page, { user: 'la' });
    const r = await page.evaluate(async () => {
      const DS = (window as any).DataService;
      const ds = new DS(null);
      // "Elternsprechtag" kommt in den Demo-Posts (Kanal 2, FAQ) genau einmal vor.
      const hit = await ds.search('Elternsprechtag');
      const noHit = await ds.search('DieserBegriffKommtGarantiertNichtVor12345');
      const empty = await ds.search('');
      return {
        hasPostsArray: Array.isArray(hit.posts),
        hitCount: hit.posts.length,
        noHitCount: noHit.posts.length,
        emptyCount: empty.posts.length,
      };
    });
    expect(r.hasPostsArray).toBe(true);
    expect(r.hitCount).toBeGreaterThan(0);
    expect(r.noHitCount).toBe(0);
    expect(r.emptyCount).toBe(0);
  });
});

test.describe('Suche — UI (Demo)', () => {
  test('Such-Ansicht: Eingabe eines bekannten Begriffs zeigt ein Treffer-Ergebnis', async ({ connectPage: page }) => {
    const searchBtn = page.locator('button[aria-label="Suche öffnen"]').first();
    if (await searchBtn.count() === 0) {
      test.skip(true, 'Such-Button nicht gefunden — UI-Variante');
    }
    await searchBtn.click();
    await expect(page.getByRole('heading', { name: 'Suche' }).first()).toBeVisible({ timeout: 5_000 });

    const input = page.locator('input[type="search"], input[placeholder*="Such" i], input[aria-label*="Such" i]').first();
    if (await input.count() === 0) {
      test.skip(true, 'Kein Sucheingabefeld gefunden — UI-Variante');
    }
    await input.fill('Elternsprechtag');
    // Debounce/Re-Render abwarten statt fester Wartezeit möglich, aber ein
    // kurzer Timeout auf ein Ergebnis-Element ist hier robuster als raten.
    await expect(page.getByText(/Elternsprechtag/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
