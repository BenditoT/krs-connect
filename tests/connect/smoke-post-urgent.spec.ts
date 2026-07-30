import { test, expect, openConnect } from '../fixtures/connect';

/**
 * Dringend / @alle (Kern-Testabdeckungs-Review)
 *
 * Bisher NICHT abgedeckt: kein Spec erwähnt "dringend"/"urgent"/"@alle" —
 * weder die is_urgent-Markierung beim Erstellen eines Beitrags noch die
 * optische Hervorhebung ("🚨 DRINGEND").
 */
test.describe('Dringend-Markierung — DataService (Demo)', () => {
  test('createPost mit isUrgent=true setzt is_urgent; ohne Flag bleibt es false', async ({ page }) => {
    await openConnect(page, { user: 'la' });
    const r = await page.evaluate(async () => {
      const DS = (window as any).DataService;
      const ds = new DS(null);
      const channelId = 1;
      const urgent = await ds.createPost(channelId, 1, '<p>Achtung, wichtige Info!</p>', null, null, true);
      const normal = await ds.createPost(channelId, 1, '<p>Ganz normaler Beitrag.</p>', null, null, false);
      const posts = await ds.getPosts(channelId);
      return {
        urgentFlag: urgent?.is_urgent,
        normalFlag: normal?.is_urgent,
        foundUrgentInList: posts.some((p: any) => p.id === urgent?.id && p.is_urgent === true),
      };
    });
    expect(r.urgentFlag).toBe(true);
    expect(r.normalFlag).toBe(false);
    expect(r.foundUrgentInList).toBe(true);
  });
});

test.describe('Dringend-Markierung — UI (Demo)', () => {
  test('🚨-Button markiert den Entwurf als dringend; veröffentlichter Beitrag zeigt "DRINGEND"', async ({ connectPage: page }) => {
    // Compact-Bar öffnet den Editor (gleiches Muster wie smoke-teams.spec.ts).
    const compactBar = page.getByText(/Beitrag schreiben/i).first();
    if (await compactBar.count() === 0) {
      test.skip(true, 'Kein Beitrags-Einstieg sichtbar — UI-Variante');
    }
    await compactBar.click();

    const urgentBtn = page.locator('button[aria-label="Als dringend markieren"]').first();
    if (await urgentBtn.count() === 0) {
      test.skip(true, 'Dringend-Button nicht gefunden — UI-Variante');
    }
    await urgentBtn.click();
    await expect(page.locator('button[aria-label="Dringend-Markierung entfernen"]')).toBeVisible({ timeout: 3_000 });

    const editor = page.locator('[contenteditable="true"]').first();
    if (await editor.count() === 0) {
      test.skip(true, 'Kein Editor-Feld gefunden — UI-Variante');
    }
    const marker = 'Dringend-Test ' + Date.now();
    await editor.click();
    await editor.fill(marker);
    await expect(editor).toContainText(marker, { timeout: 2_000 });

    const publishBtn = page.locator('button:has-text("Veröffentlichen"), button:has-text("Posten"), button:has-text("Senden")').first();
    if (await publishBtn.count() === 0) {
      test.skip(true, 'Kein Veröffentlichen-Button gefunden — UI-Variante');
    }
    await publishBtn.click();

    await expect(page.getByText('🚨 DRINGEND').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 5_000 });
  });
});
