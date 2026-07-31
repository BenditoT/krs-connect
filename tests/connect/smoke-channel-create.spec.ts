import { test, expect, openConnect } from '../fixtures/connect';

/**
 * Kanal anlegen (Kern-Testabdeckungs-Review)
 *
 * Bisher NICHT abgedeckt: alle bestehenden Specs prüfen nur den automatisch
 * beim Team-Anlegen erzeugten Default-Kanal "Allgemein" (z. B.
 * smoke-team-create.spec.ts), aber nicht das eigenständige Anlegen eines
 * weiteren Kanals über DataService.createChannel bzw. den „+"-Button/Dialog
 * „Neuen Kanal erstellen" in der Team-Sidebar.
 */
test.describe('Kanal anlegen — DataService (Demo)', () => {
  test('createChannel legt einen weiteren Kanal an und taucht in getChannels auf', async ({ page }) => {
    await openConnect(page, { user: 'la' });
    const r = await page.evaluate(async () => {
      const DS = (window as any).DataService;
      const ds = new DS(null);
      const teamId = 1;
      const before = await ds.getChannels(teamId);
      const name = 'Test-Kanal ' + Date.now();
      const created = await ds.createChannel(teamId, name, 'Beschreibung');
      const after = await ds.getChannels(teamId);
      return {
        beforeCount: before.length,
        afterCount: after.length,
        createdName: created?.name,
        createdTeamId: created?.team_id,
        afterNames: after.map((c: any) => c.name),
      };
    });
    expect(r.afterCount).toBe(r.beforeCount + 1);
    expect(r.createdTeamId).toBe(1);
    expect(r.afterNames).toContain(r.createdName);
  });
});

test.describe('Kanal anlegen — UI (Demo)', () => {
  test('"+ Neuen Kanal erstellen" öffnet Dialog, neuer Kanal erscheint in der Kanalliste', async ({ connectPage: page }) => {
    const addBtn = page.locator('button[aria-label="Neuen Kanal erstellen"]').first();
    if (await addBtn.count() === 0) {
      test.skip(true, 'Kein "+"-Button für Kanäle sichtbar — UI-Variante (evtl. kein Team gewählt oder kein Admin)');
    }
    await addBtn.click();

    const dialog = page.locator('.modal-overlay[aria-label="Neuen Kanal erstellen"]');
    await expect(dialog).toBeVisible({ timeout: 4_000 });

    const input = page.locator('#new-channel-name');
    await expect(input).toBeVisible();
    const name = 'UI-Kanal ' + Date.now();
    await input.fill(name);
    // Enter im Namensfeld ist der primäre, erwartete UI-Weg (wie beim
    // Team-Anlegen-Dialog) — seit v4.19.1 läuft das über ein echtes
    // <form onSubmit>, das den Kanal anlegt und den Dialog zuverlässig
    // schließt (siehe Changelog: vorher gab es einen Fokus-Restore-Race mit
    // dem globalen Focus-Trap, der den Dialog sofort wieder öffnete).
    await input.press('Enter');

    await expect(dialog).toHaveCount(0, { timeout: 4_000 });
    // Gezielt auf die Kanalliste scopen: der neue Kanalname erscheint nach dem
    // Anlegen mehrfach im DOM (Kanalliste, Ansichts-Überschrift, Erfolgs-Toast)
    // — ein ungescoptes getByText(name) verletzt daher den Strict-Mode.
    await expect(page.locator('.sidebar-list').getByText(name)).toBeVisible({ timeout: 4_000 });
  });
});
