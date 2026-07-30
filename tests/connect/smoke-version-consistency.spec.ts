import { test, expect, openConnect } from '../fixtures/connect';

/**
 * Versions-/Changelog-Konsistenz
 *
 * window.KRS_VERSION muss immer mit dem obersten KRS_CHANGELOG-Eintrag
 * übereinstimmen — sonst zeigt „Was ist neu" eine andere Version als die
 * Sidebar/das Update-Banner. smoke-version-display.spec.ts prüft nur die
 * UI-Textanzeige, nicht diese Konsistenz. Analog zum Hub-Vorbild
 * (krs-hub/tests/hub/smoke-pwa.spec.ts, Test „sw.js VERSION stimmt mit
 * CONFIG.VERSION überein").
 */
test.describe('Versions-/Changelog-Konsistenz (Demo)', () => {
  test('window.KRS_VERSION stimmt mit KRS_CHANGELOG[0].v überein', async ({ page }) => {
    await openConnect(page, { user: 'la' });

    const result = await page.evaluate(() => {
      const version = (window as any).KRS_VERSION;
      const changelog = (window as any).KRS_CHANGELOG;
      return {
        version,
        hasChangelog: Array.isArray(changelog) && changelog.length > 0,
        topEntryVersion: Array.isArray(changelog) && changelog.length > 0 ? changelog[0].v : null,
        topEntryDate: Array.isArray(changelog) && changelog.length > 0 ? changelog[0].date : null,
      };
    });

    expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.hasChangelog, 'KRS_CHANGELOG sollte im globalen Scope existieren und nicht leer sein').toBe(true);
    expect(result.topEntryVersion, 'Oberster Changelog-Eintrag sollte eine Versionsnummer haben').toBeTruthy();
    expect(result.topEntryVersion).toBe(result.version);
    expect(result.topEntryDate).toBeTruthy();
  });
});
