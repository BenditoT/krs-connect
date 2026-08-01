// Verifikation der v4.19.1-Änderungen ohne die (in dieser Sandbox hängende)
// playwright-test-CLI: Enter-Weg, Button-Weg, Escape, Versions-Konsistenz,
// keine JS-Fehler beim Laden.
const { chromium } = require('playwright-core');
const assert = require('assert');
const URL = 'http://127.0.0.1:4173/index.html?forceMode=demo&forceUser=la';

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('krs_onboarding_done','1'); } catch(e){} });
  await page.goto(URL);
  await page.waitForFunction(() => typeof window.KRS_VERSION === 'string', null, { timeout: 15000 });
  page.__errs = errs;
  return page;
}

async function openDialog(page) {
  await page.locator('button[aria-label="Neuen Kanal erstellen"]').first().click();
  const dialog = page.locator('.modal-overlay[aria-label="Neuen Kanal erstellen"]');
  await dialog.waitFor({ state: 'visible', timeout: 4000 });
  return dialog;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];

  // 1) Versions-/Changelog-Konsistenz
  {
    const page = await newPage(browser);
    const r = await page.evaluate(() => ({ v: window.KRS_VERSION, c: (window.KRS_CHANGELOG || [])[0] && window.KRS_CHANGELOG[0].v }));
    const ok = r.v === '4.19.1';
    results.push(['Version 4.19.1 gesetzt', ok, JSON.stringify(r)]);
    results.push(['Keine JS-Fehler beim Laden', page.__errs.length === 0, page.__errs.slice(0,3).join(' | ')]);
    await page.close();
  }

  // 2) Enter-Weg
  {
    const page = await newPage(browser);
    const dialog = await openDialog(page);
    const name = 'Enter-Kanal ' + Date.now();
    await page.locator('#new-channel-name').fill(name);
    await page.locator('#new-channel-name').press('Enter');
    await page.waitForTimeout(1500);
    const closed = await dialog.count() === 0;
    const inList = await page.locator('.sidebar-list').getByText(name).count() > 0;
    results.push(['Enter: Dialog geschlossen', closed, '']);
    results.push(['Enter: Kanal in Liste', inList, '']);
    await page.close();
  }

  // 3) Button-Weg (type=submit darf nicht doppelt anlegen)
  {
    const page = await newPage(browser);
    const dialog = await openDialog(page);
    const name = 'Button-Kanal ' + Date.now();
    await page.locator('#new-channel-name').fill(name);
    await dialog.getByRole('button', { name: 'Erstellen' }).click();
    await page.waitForTimeout(1500);
    const closed = await dialog.count() === 0;
    const count = await page.locator('.sidebar-list').getByText(name).count();
    results.push(['Button: Dialog geschlossen', closed, '']);
    results.push(['Button: genau 1 Kanal angelegt', count === 1, 'count=' + count]);
    await page.close();
  }

  // 4) Escape schließt weiterhin
  {
    const page = await newPage(browser);
    const dialog = await openDialog(page);
    await page.locator('#new-channel-name').press('Escape');
    await page.waitForTimeout(800);
    results.push(['Escape: Dialog geschlossen', await dialog.count() === 0, '']);
    await page.close();
  }

  // 5) Abbrechen-Button darf kein Submit auslösen
  {
    const page = await newPage(browser);
    const dialog = await openDialog(page);
    const name = 'Abbruch-Kanal ' + Date.now();
    await page.locator('#new-channel-name').fill(name);
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await page.waitForTimeout(1000);
    const closed = await dialog.count() === 0;
    const created = await page.locator('.sidebar-list').getByText(name).count() > 0;
    results.push(['Abbrechen: Dialog geschlossen', closed, '']);
    results.push(['Abbrechen: kein Kanal angelegt', !created, '']);
    await page.close();
  }

  await browser.close();
  let fail = 0;
  for (const [n, ok, info] of results) { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (info ? '  [' + info + ']' : '')); }
  console.log(fail === 0 ? '=> ALLE ' + results.length + ' CHECKS GRÜN' : '=> ' + fail + ' FEHLGESCHLAGEN');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('HARNESS-FEHLER: ' + e.message); process.exit(2); });
