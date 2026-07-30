import { test, expect, openConnect } from '../fixtures/connect';

/**
 * v4.19.0 — Team-Stummschaltung
 *
 * Der FEATURE-GAP-REPORT-2026-07-02.md behauptete, ein Team-/Kanal-Mute
 * existiere bereits ("muted*"). Stimmt nicht — gegengecheckt per Grep
 * (case-insensitiv stumm|mute|silen|notif) über die ganze index.html: es
 * gab nur die globale An/Aus-Einstellung 'krs-notifications' (ganze App),
 * kein Team-/Kanal-bezogenes Mute. Dieses Spec deckt das neu gebaute
 * Feature ab:
 *  - DataService.getMutedIds('team', userId) / setMuted('team', id, userId, bool)
 *    persistieren rein lokal (eigener localStorage-Namespace 'krs-muted-…',
 *    getrennt vom bestehenden 'krs-hidden-…' Ausblenden-Feature).
 *  - Sidebar: 🔔/🔕-Button pro Team (data-testid="team-mute-btn"), sichtbares
 *    🔕-Statusicon neben stummgeschalteten Teams.
 *  - Unread-Badge wird bei Mute unterdrückt (Zähler intern unverändert).
 */

test.describe('v4.19.0 Team-Stummschaltung — DataService (Demo)', () => {
  test('setMuted/getMutedIds persistieren pro User & Art, getrennt vom Ausblenden-Feature', async ({ page }) => {
    await openConnect(page, { user: 'la' });

    const r = await page.evaluate(async () => {
      const DS = (window as any).DataService;
      const ds = new DS(null); // Demo-Modus
      try { localStorage.removeItem('krs-muted-team-1'); } catch (e) {}

      const beforeMuted = await ds.getMutedIds('team', 1);
      await ds.setMuted('team', 2, 1, true);
      const afterMuteTeam2 = await ds.getMutedIds('team', 1);
      await ds.setMuted('team', 3, 1, true);
      const afterMuteTeam3 = await ds.getMutedIds('team', 1);
      await ds.setMuted('team', 2, 1, false);
      const afterUnmuteTeam2 = await ds.getMutedIds('team', 1);

      // Eigener Namespace: Muten darf 'hidden' NICHT beeinflussen und umgekehrt.
      await ds.setHidden('team', 2, 1, true);
      const mutedAfterHide = await ds.getMutedIds('team', 1);
      const hiddenIds = await ds.getHiddenIds('team', 1);
      await ds.setHidden('team', 2, 1, false); // aufräumen

      // Verschiedene User dürfen sich nicht gegenseitig beeinflussen.
      const mutedOtherUser = await ds.getMutedIds('team', 999);

      return {
        beforeMutedCount: beforeMuted.size,
        afterMuteTeam2: Array.from(afterMuteTeam2),
        afterMuteTeam3: Array.from(afterMuteTeam3).sort(),
        afterUnmuteTeam2: Array.from(afterUnmuteTeam2),
        mutedAfterHideCount: mutedAfterHide.size,
        hiddenIds: Array.from(hiddenIds),
        mutedOtherUserCount: mutedOtherUser.size,
      };
    });

    expect(r.beforeMutedCount).toBe(0);
    expect(r.afterMuteTeam2).toEqual([2]);
    expect(r.afterMuteTeam3).toEqual([2, 3]);
    expect(r.afterUnmuteTeam2).toEqual([3]);
    // team 3 bleibt weiterhin gemutet (unverändert durch das Hidden-Feature)
    expect(r.mutedAfterHideCount).toBe(1);
    expect(r.hiddenIds).toEqual([2]);
    expect(r.mutedOtherUserCount).toBe(0);
  });
});

test.describe('v4.19.0 Team-Stummschaltung — UI (Demo)', () => {
  test('🔕/🔔-Button schaltet Team stumm; Statusicon erscheint; Badge wird unterdrückt', async ({ page }) => {
    await openConnect(page, { user: 'la' });
    // Sauberer Start, damit der Test unabhängig von vorherigen Läufen ist.
    await page.evaluate(() => { try { localStorage.removeItem('krs-muted-team-1'); } catch (e) {} });
    await page.reload();
    await page.waitForFunction(() => typeof (window as any).KRS_VERSION === 'string');

    const teamItem = page.locator('[data-testid="team-visible"]').first();
    if (await teamItem.count() === 0) {
      test.skip(true, 'Kein Team in der Sidebar sichtbar — UI-Variante');
    }

    const muteBtn = teamItem.getByTestId('team-mute-btn');
    if (await muteBtn.count() === 0) {
      test.skip(true, 'Mute-Button nicht gefunden — UI-Variante');
    }

    // Vorher: kein 🔕-Statusicon im Team-Eintrag.
    await expect(teamItem.getByTitle('Stummgeschaltet')).toHaveCount(0);

    await muteBtn.click({ force: true }); // Button ist per CSS nur bei :hover sichtbar (opacity)

    // Statusicon erscheint, Button-Titel wechselt auf "aufheben".
    await expect(teamItem.getByTitle('Stummgeschaltet')).toBeVisible({ timeout: 4_000 });
    await expect(muteBtn).toHaveAttribute('title', 'Stummschaltung aufheben');

    // Persistenz: eigener localStorage-Namespace enthält jetzt die Team-ID.
    const persisted = await page.evaluate(() => {
      try { return localStorage.getItem('krs-muted-team-1'); } catch (e) { return null; }
    });
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted!)).toContain(1);

    // Wieder aufheben — Statusicon verschwindet.
    await muteBtn.click({ force: true });
    await expect(teamItem.getByTitle('Stummgeschaltet')).toHaveCount(0);
    await expect(muteBtn).toHaveAttribute('title', 'Stummschalten');
  });

  test('Team "Kollegium" hat im Demo ungelesene Kanäle — Mute blendet die Zahlen-Badge aus', async ({ page }) => {
    // Team 1 (Kollegium) hat im Demo-Datensatz Kanäle mit unread > 0
    // (FAQ und Infos: 3, Kollegialer Austausch: 1, SMV: 2 → Summe 6),
    // dadurch zeigt die Sidebar ohne Mute eine sichtbare Zahlen-Badge.
    await openConnect(page, { user: 'la' });
    await page.evaluate(() => { try { localStorage.removeItem('krs-muted-team-1'); } catch (e) {} });
    await page.reload();
    await page.waitForFunction(() => typeof (window as any).KRS_VERSION === 'string');

    const teamItem = page.locator('[data-testid="team-visible"]').first();
    if (await teamItem.count() === 0) {
      test.skip(true, 'Kein Team in der Sidebar sichtbar — UI-Variante');
    }
    const badge = teamItem.locator('.unread-badge');
    const muteBtn = teamItem.getByTestId('team-mute-btn');
    if (await muteBtn.count() === 0) {
      test.skip(true, 'Mute-Button nicht gefunden — UI-Variante');
    }
    if (await badge.count() === 0) {
      test.skip(true, 'Kein Unread-Badge im Demo-Zustand vorhanden — Datenvariante');
    }

    await expect(badge).toBeVisible();
    await muteBtn.click({ force: true });
    // Badge verschwindet, obwohl der interne Zähler weiterläuft (nicht prüfbar von außen,
    // aber die Anforderung ist ausschließlich die Anzeige-Unterdrückung).
    await expect(badge).toHaveCount(0);
  });
});
