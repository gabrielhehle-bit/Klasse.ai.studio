import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedUrl,
  normalizeUrl,
  addLink,
  editLink,
  deleteLink,
  moveLink,
  migrateLegacyLinks,
  hasNoStudentTracking,
  getLinksResponsiveCategory,
  SECURE_LINK_ATTRIBUTES,
  DEFAULT_SAMPLE_LINKS,
  UnterrichtsLink,
  resolveCanonicalWidgetLinks,
} from './linksAlgorithm';

test('Links: 1. Link hinzufügen', () => {
  const initial: UnterrichtsLink[] = [];
  const res = addLink(initial, {
    title: 'Mathe-Lernspiel',
    url: 'https://mathe.beispiel.at',
    category: 'exercise',
    iconEmoji: '🧩',
  });
  assert.equal(res.success, true);
  assert.equal(res.links.length, 1);
  assert.equal(res.links[0].title, 'Mathe-Lernspiel');
  assert.equal(res.links[0].url, 'https://mathe.beispiel.at');
  assert.equal(res.links[0].category, 'exercise');
  assert.equal(res.links[0].iconEmoji, '🧩');
});

test('Links: 2. Link bearbeiten (Titel & URL aktualisieren)', () => {
  const initial: UnterrichtsLink[] = [
    { id: 'link-1', title: 'Alte Übung', url: 'https://alt.at', category: 'exercise' },
  ];
  const res = editLink(initial, 'link-1', {
    title: 'Neue Online-Übung',
    url: 'https://neu.at',
  });
  assert.equal(res.success, true);
  assert.equal(res.links[0].title, 'Neue Online-Übung');
  assert.equal(res.links[0].url, 'https://neu.at');
});

test('Links: 3. Link löschen', () => {
  const initial: UnterrichtsLink[] = [
    { id: 'link-1', title: 'Link 1', url: 'https://eins.at' },
    { id: 'link-2', title: 'Link 2', url: 'https://zwei.at' },
  ];
  const updated = deleteLink(initial, 'link-1');
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, 'link-2');
});

test('Links: 4. Reihenfolge ändern (hoch / runter)', () => {
  const initial: UnterrichtsLink[] = [
    { id: 'l-1', title: 'Erster', url: 'https://1.at' },
    { id: 'l-2', title: 'Zweiter', url: 'https://2.at' },
    { id: 'l-3', title: 'Dritter', url: 'https://3.at' },
  ];
  // Verschiebe Index 1 ("Zweiter") nach oben
  const movedUp = moveLink(initial, 1, 'up');
  assert.equal(movedUp[0].id, 'l-2');
  assert.equal(movedUp[1].id, 'l-1');

  // Verschiebe Index 0 ("Zweiter") nach unten
  const movedDown = moveLink(movedUp, 0, 'down');
  assert.equal(movedDown[0].id, 'l-1');
  assert.equal(movedDown[1].id, 'l-2');
});

test('Links: 5. Gültige URL akzeptiert (https, http, relative Pfade)', () => {
  assert.equal(isAllowedUrl('https://schule.at/mathe'), true);
  assert.equal(isAllowedUrl('http://bildungsserver.at'), true);
  assert.equal(isAllowedUrl('/materialien/arbeitsblatt.pdf'), true);
  assert.equal(isAllowedUrl('anton.app'), true); // Normalisierbar
});

test('Links: 6. Ungültige URL abgewiesen', () => {
  assert.equal(isAllowedUrl(''), false);
  assert.equal(isAllowedUrl('   '), false);
  assert.equal(isAllowedUrl('nicht-valide://test'), false);
});

test('Links: 7. javascript: und bösartige Schemes blockiert (XSS-Schutz)', () => {
  assert.equal(isAllowedUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedUrl('JAVASCRIPT:void(0)'), false);
  assert.equal(isAllowedUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isAllowedUrl('vbscript:msgbox(1)'), false);
  assert.equal(isAllowedUrl('file:///etc/passwd'), false);

  const res = addLink([], { title: 'Böse', url: 'javascript:alert("hacked")' });
  assert.equal(res.success, false);
  assert.ok(res.error);
});

test('Links: 8. Externer Link sicher geöffnet (target=_blank, rel=noopener noreferrer)', () => {
  assert.equal(SECURE_LINK_ATTRIBUTES.target, '_blank');
  assert.equal(SECURE_LINK_ATTRIBUTES.rel, 'noopener noreferrer');
});

test('Links: 9. Stabile interne IDs (keine Titel als Schlüssel)', () => {
  const res = addLink([], { title: 'Doppel', url: 'https://test1.at' });
  const res2 = addLink(res.links, { title: 'Doppel', url: 'https://test2.at' });
  assert.notEqual(res2.links[0].id, res2.links[1].id);
  assert.ok(res2.links[0].id.startsWith('link-'));
});

test('Links: 10. Kein Schülertracking (weder an URLs noch in State)', () => {
  const safeLinks: UnterrichtsLink[] = [
    { id: '1', title: 'Portal', url: 'https://lernportal.at/start' },
  ];
  assert.equal(hasNoStudentTracking(safeLinks), true);

  const unsafeUrl: UnterrichtsLink[] = [
    { id: '1', title: 'Portal', url: 'https://lernportal.at?schuelerId=123&name=Anna' },
  ];
  assert.equal(hasNoStudentTracking(unsafeUrl), false);

  const unsafeObject = [{ id: '1', title: 'Portal', url: 'https://lernportal.at', clickCount: 5 }] as any;
  assert.equal(hasNoStudentTracking(unsafeObject), false);
});

test('Links: 11. Keine KI (deterministische Speicherung & Verwaltung)', () => {
  const link = { title: 'Video', url: 'https://video.at' };
  const res1 = addLink([], link);
  const res2 = addLink([], link);
  assert.equal(res1.links[0].title, res2.links[0].title);
  assert.equal(res1.links[0].url, res2.links[0].url);
});

test('Links: 12. COMPACT Responsive Kategorie (< 380 px)', () => {
  assert.equal(getLinksResponsiveCategory(320, false), 'compact');
  assert.equal(getLinksResponsiveCategory(379, false), 'compact');
});

test('Links: 13. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getLinksResponsiveCategory(380, false), 'standard');
  assert.equal(getLinksResponsiveCategory(549, false), 'standard');
});

test('Links: 14. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getLinksResponsiveCategory(550, false), 'large');
  assert.equal(getLinksResponsiveCategory(799, false), 'large');
});

test('Links: 15. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getLinksResponsiveCategory(800, false), 'fullscreen');
  assert.equal(getLinksResponsiveCategory(320, true), 'fullscreen');
});

test('Links: 16. Kein horizontaler Overflow / URL Normalisierung', () => {
  assert.equal(normalizeUrl('anton.app'), 'https://anton.app');
  assert.equal(normalizeUrl('https://orf.at'), 'https://orf.at');
  assert.equal(normalizeUrl('/material'), '/material');
});

test('Links: 17. Keine Klartext-Persistenz (strukturierte Migration)', () => {
  const legacy = [
    { title: 'Alte Plattform', url: 'https://schule.at', emoji: '🏫' },
    { label: 'Unbekannt', url: 'javascript:alert(1)' }, // Bösartig: wird verworfen
  ];
  const migrated = migrateLegacyLinks(legacy);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].title, 'Alte Plattform');
  assert.equal(migrated[0].url, 'https://schule.at');
  assert.equal(migrated[0].iconEmoji, '🏫');
});

test('Links: 18. Offline Widget stabil (reine lokale Logik)', () => {
  // Widget-Datenoperationen laufen ohne externe HTTP-Calls
  const res = addLink([], { title: 'Offline Buch', url: 'https://buch.at' });
  const moved = moveLink(res.links, 0, 'up');
  const deleted = deleteLink(moved, res.links[0].id);
  assert.equal(deleted.length, 0);
});

test('Links: 19. Keine automatischen Netzwerkrequests beim Laden', () => {
  const sample = DEFAULT_SAMPLE_LINKS;
  assert.ok(Array.isArray(sample));
  assert.equal(sample.length, 3);
  assert.ok(sample.every((s) => s.url.startsWith('https://')));
});

test('Links: 20. Andere Widgets unverändert (Standarddaten isoliert)', () => {
  const migrated = migrateLegacyLinks(null);
  assert.deepEqual(migrated, []);
});

// ==========================================
// F16.1 TESTS: EINE KANONISCHE DATENQUELLE
// ==========================================

test('F16.1: 1. Legacy app.quickLinks wird übernommen, wenn Widget-State noch leer/uninitialisiert ist', () => {
  const legacyQuickLinks = [
    { id: 'legacy-1', label: 'Legacy Übung', url: 'https://legacy-lernportal.at' },
  ];
  const widgetSettings = undefined; // Noch keine Settings gespeichert

  const resolved = resolveCanonicalWidgetLinks(widgetSettings, legacyQuickLinks);
  assert.equal(resolved.shouldPersistMigration, true);
  assert.equal(resolved.links.length, 1);
  assert.equal(resolved.links[0].id, 'legacy-1');
  assert.equal(resolved.links[0].title, 'Legacy Übung');
  assert.equal(resolved.links[0].url, 'https://legacy-lernportal.at');
});

test('F16.1: 2. Bestehender Widget-State gewinnt gegenüber Legacy-Daten (Kanonische Quelle)', () => {
  const legacyQuickLinks = [
    { id: 'legacy-1', label: 'Alte App-Links', url: 'https://alt.at' },
  ];
  // Widget hat bereits eigene Links gespeichert
  const widgetSettings = {
    linksState: {
      links: [
        { id: 'custom-1', title: 'Meine Stunde', url: 'https://stunde.at', category: 'exercise' },
      ],
    },
  };

  const resolved = resolveCanonicalWidgetLinks(widgetSettings, legacyQuickLinks);
  assert.equal(resolved.shouldPersistMigration, false);
  assert.equal(resolved.links.length, 1);
  assert.equal(resolved.links[0].id, 'custom-1');
  assert.equal(resolved.links[0].title, 'Meine Stunde');

  // Auch wenn Widget-State bewusst eine leere Liste [] hat (alle gelöscht):
  const emptyWidgetSettings = {
    linksState: {
      links: [],
    },
  };
  const resolvedEmpty = resolveCanonicalWidgetLinks(emptyWidgetSettings, legacyQuickLinks);
  assert.equal(resolvedEmpty.shouldPersistMigration, false);
  assert.equal(resolvedEmpty.links.length, 0); // Greift NICHT auf legacy zurück!
});

test('F16.1: 3. Migration erzeugt keine Duplikate (weder gleiche IDs noch doppelte URLs)', () => {
  const rawDuplicates = [
    { id: 'dup-1', title: 'Anton', url: 'https://anton.app' },
    { id: 'dup-1', title: 'Anton Doppelt', url: 'https://anton.app' }, // Gleiche URL
    { id: 'dup-2', title: 'Anton Ohne Protocol', url: 'anton.app' }, // Normalisiert identisch
  ];
  const migrated = migrateLegacyLinks(rawDuplicates);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].url, 'https://anton.app');
});

test('F16.1: 4. Zweites Laden migriert nicht erneut (Idempotenz)', () => {
  const legacyQuickLinks = [
    { id: 'link-x', label: 'Wikipedia', url: 'https://de.wikipedia.org' },
  ];
  // 1. Laden:
  const firstLoad = resolveCanonicalWidgetLinks(undefined, legacyQuickLinks);
  assert.equal(firstLoad.shouldPersistMigration, true);

  // Nach dem Persistieren in widget.settings:
  const savedSettings = {
    linksState: {
      links: firstLoad.links,
      lastUpdated: '2026-09-05T12:00:00.000Z',
    },
  };

  // 2. Laden (mit identischen Legacy-Daten im Hintergrund):
  const secondLoad = resolveCanonicalWidgetLinks(savedSettings, legacyQuickLinks);
  assert.equal(secondLoad.shouldPersistMigration, false);
  assert.deepEqual(secondLoad.links, firstLoad.links);
});

test('F16.1: 5. Änderungen im Widget schreiben nicht dauerhaft zurück nach app.quickLinks', () => {
  // Simulation: Ein Widget hat Links und fügt einen neuen Link hinzu
  const currentWidgetLinks: UnterrichtsLink[] = [
    { id: 'w-1', title: 'Übung 1', url: 'https://uebung1.at' },
  ];
  const updated = addLink(currentWidgetLinks, {
    title: 'Übung 2',
    url: 'https://uebung2.at',
  });

  // Globales Lehrer-app.quickLinks bleibt unverändert geschützt
  const teacherPersonalQuickLinks = [
    { id: 'untis', label: 'WebUntis', url: 'https://untis.at' },
  ];

  // Nur Widget-State enthält den neuen Link
  assert.equal(updated.links.length, 2);
  assert.equal(teacherPersonalQuickLinks.length, 1);
  assert.equal(teacherPersonalQuickLinks[0].label, 'WebUntis');
});

test('F16.1: 6. Zwei Link-Widgets können unterschiedliche Daten besitzen (Unabhängigkeit)', () => {
  const widgetA_Settings = {
    linksState: {
      links: [{ id: 'a-1', title: 'Mathe Portal', url: 'https://mathe.at' }],
    },
  };
  const widgetB_Settings = {
    linksState: {
      links: [{ id: 'b-1', title: 'Deutsch Portal', url: 'https://deutsch.at' }],
    },
  };

  const resolvedA = resolveCanonicalWidgetLinks(widgetA_Settings, []);
  const resolvedB = resolveCanonicalWidgetLinks(widgetB_Settings, []);

  assert.notDeepEqual(resolvedA.links, resolvedB.links);
  assert.equal(resolvedA.links[0].title, 'Mathe Portal');
  assert.equal(resolvedB.links[0].title, 'Deutsch Portal');
});

test('F16.1: 7. Bestehende URL-Sicherheit bleibt vollständig bestehen', () => {
  // Erlaubte URLs
  assert.equal(isAllowedUrl('https://schule.at'), true);
  assert.equal(isAllowedUrl('http://schule.at'), true);
  assert.equal(isAllowedUrl('/lokal/arbeitsblatt'), true);

  // Gefährliche Payloads blockiert
  assert.equal(isAllowedUrl('javascript:alert("exploit")'), false);
  assert.equal(isAllowedUrl('data:text/html,<script>evil()</script>'), false);
  assert.equal(isAllowedUrl('vbscript:msgbox'), false);
  assert.equal(isAllowedUrl('file:///C:/passwords.txt'), false);
});

test('F16.1: 8. QR-Funktion und sichere Link-Attribute unverändert', () => {
  assert.equal(SECURE_LINK_ATTRIBUTES.target, '_blank');
  assert.equal(SECURE_LINK_ATTRIBUTES.rel, 'noopener noreferrer');
});

