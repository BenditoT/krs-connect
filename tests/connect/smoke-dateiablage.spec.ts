import { test, expect } from '../fixtures/connect';

/**
 * Dateiablage — Zwischen-Modal entfernt (v4.18.0)
 *
 * Bis v4.17.0 öffnete der Sidebar-Nav-Button ein Zwischenfenster
 * (FilesPlaceholderModal) mit Nextcloud-Hinweis + Team-Links darunter.
 * Seit v4.18.0 ist der Button ein Direktlink zur Nextcloud (kein Klick-Umweg
 * mehr) — dieser Test stellt sicher, dass das alte Modal wirklich weg ist.
 * Die Direktlink-Prüfung selbst steht in smoke-dateiablage-direktlink.spec.ts.
 */
test.describe('Dateiablage — kein Zwischen-Modal mehr (Demo)', () => {
  test('Es gibt kein Dateiablage-Modal (Zwischenfenster) mehr im DOM', async ({ connectPage: page }) => {
    await expect(page.locator('.modal-overlay[aria-label="Dateiablage"]')).toHaveCount(0);
  });
});
