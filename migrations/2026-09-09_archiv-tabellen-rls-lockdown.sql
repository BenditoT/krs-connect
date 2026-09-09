-- =====================================================================
-- KRS Connect — Advisor-Fix: RLS für die Archiv-Snapshots vom 03.09.2026
-- Datum: 09.09.2026 · Projekt: ooejsfixxiuobrpqgfqm
-- Anlass: Supabase-Security-Mail 06.09.2026, Lint `rls_disabled_in_public`
--
-- BEFUND (verifiziert am 09.09.2026):
--   Betroffen waren ausschliesslich die drei BACKUP-Snapshots, die die
--   Datenhygiene-Migration 2026-09-03_teams-aufraeumen-datenhygiene.sql
--   per `create table ... as` angelegt hat:
--     _archiv_2026_09_03_teams        (14 Zeilen)
--     _archiv_2026_09_03_channels     (17 Zeilen)
--     _archiv_2026_09_03_team_members ( 4 Zeilen)
--   `create table as` erbt KEINE RLS -> die Tabellen lagen offen im
--   Schema public und waren per anon-Key les-, aenderbar und loeschbar.
--   Nachgewiesen: GET /rest/v1/_archiv_2026_09_03_teams mit anon-Key
--   lieferte HTTP 200 + vollstaendige Zeilen.
--
--   Inhalt: Demo-Seed-Teams (Fachschaft ..., SMV, Schulband) und
--   Test-Teams (Test/Tesr/Kartoffel 161), Kanalnamen, sowie 4 Zeilen
--   team_members mit numerischer user_id + Rolle. KEINE Klarnamen,
--   KEINE E-Mails, KEINE Schuelerdaten -> kein meldepflichtiger Vorfall.
--
--   Kein App-Code liest diese Tabellen (grep `_archiv` in
--   krs-connect-deploy/index.html trifft nur das Feld `_archived`).
-- =====================================================================


-- ============================================================
-- 1) CHECK — Tabellen ohne RLS im Schema public
-- ============================================================
-- select c.relname, c.relrowsecurity as rls_an,
--        has_table_privilege('anon', c.oid, 'SELECT') as anon_select
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;


-- ============================================================
-- 2) ACTION — am 09.09.2026 angewendet (Migration
--    `lockdown_archiv_2026_09_03_tables`)
-- ============================================================
-- RLS an, bewusst OHNE Policy: Archivtabellen sind reine Snapshots.
-- Ohne Policy sind sie fuer anon + authenticated dicht; service_role
-- und SQL-Editor lesen weiterhin. Zusaetzlich die Tabellenrechte
-- entziehen -> verschwinden auch aus dem GraphQL-Schema.

alter table public._archiv_2026_09_03_teams        enable row level security;
alter table public._archiv_2026_09_03_channels     enable row level security;
alter table public._archiv_2026_09_03_team_members enable row level security;

revoke all on table public._archiv_2026_09_03_teams        from anon, authenticated;
revoke all on table public._archiv_2026_09_03_channels     from anon, authenticated;
revoke all on table public._archiv_2026_09_03_team_members from anon, authenticated;


-- ============================================================
-- 3) VERIFY — am 09.09.2026 gelaufen, Ergebnis dokumentiert
-- ============================================================
--   SQL : alle drei rls_an = true, anon_select = false, anon_delete = false
--         keine Tabelle in public mehr ohne RLS
--   REST: GET mit anon-Key -> HTTP 401, 42501 "permission denied for table"
--         (vorher HTTP 200 mit Daten)
--   Gegenprobe: GET /rest/v1/teams mit anon-Key -> HTTP 200 [] (RLS filtert,
--         App unveraendert funktionsfaehig)


-- ============================================================
-- 4) UNDO — nur falls jemand die Archive doch per REST braucht
-- ============================================================
-- grant select on table public._archiv_2026_09_03_teams        to authenticated;
-- grant select on table public._archiv_2026_09_03_channels     to authenticated;
-- grant select on table public._archiv_2026_09_03_team_members to authenticated;
-- -- plus je eine passende SELECT-Policy, sonst bleibt RLS dicht.


-- ============================================================
-- 5) EMPFEHLUNG — Archive haben ein Verfallsdatum
-- ============================================================
-- Der Snapshot ist die Undo-Grundlage der Loeschung vom 03.09.2026.
-- Wenn bis ca. Dezember 2026 niemand etwas vermisst hat:
-- drop table public._archiv_2026_09_03_team_members;
-- drop table public._archiv_2026_09_03_channels;
-- drop table public._archiv_2026_09_03_teams;
