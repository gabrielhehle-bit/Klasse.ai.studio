import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

test('widget library is a focused modal with search, settings and close in one header', () => {
  assert.match(surface, /aria-label="Widget-Bibliothek"/);
  assert.match(surface, /klassio-widget-library-header/);
  assert.match(surface, /placeholder="Widget suchen … z\. B\. Timer, Gruppen, Brüche"/);
  assert.match(surface, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.match(surface, /aria-label="Widget-Bibliothek schließen"/);
  assert.doesNotMatch(surface, />Auswahl schließen<\/button>/);
  assert.match(surface, /isWidgetConfigurationOpen \? "flex" : "hidden"/);
});

test('favorites and recent appear before subject/category navigation', () => {
  const start = surface.indexOf('klassio-widget-library-sidebar');
  const end = surface.indexOf('const allAvailableWidgets = COCKPIT_WIDGET_LIBRARY_ITEMS;', start);
  assert.ok(start >= 0 && end > start);
  const sidebar = surface.slice(start, end);
  const favorites = sidebar.indexOf('⭐ Favoriten');
  const recent = sidebar.indexOf('🕘 Zuletzt verwendet');
  const core = sidebar.indexOf('🧩 Kernwidgets');
  const all = sidebar.indexOf('▦ Alle Widgets');
  assert.ok(favorites >= 0 && recent > favorites && core > recent && all > core);
  assert.match(surface, /activeWidgetCategory === "recent"/);
  assert.match(surface, /recentWidgetTypes\.includes\(item\.type\)/);
  assert.match(surface, /Noch keine zuletzt verwendeten Widgets/);
});

test('widget cards expose favorite, safe quick-bar pinning and a clear board action', () => {
  assert.match(surface, /const icon = parts\.length > 1 \? parts\[0\] : "🧩"/);
  assert.match(surface, /const name = parts\.length > 1 \? parts\.slice\(1\)\.join\(" "\) : item\.label/);
  assert.match(surface, /line-clamp-2 text-xs leading-relaxed text-slate-500/);
  assert.match(surface, /Von Favoriten entfernen/);
  assert.match(surface, /Zu Favoriten hinzufügen/);
  assert.match(surface, /auf der Tafel anzeigen/);
  assert.match(surface, /wiederherstellen/);
  assert.match(surface, /An die untere Widget-Leiste heften/);
  assert.match(surface, /addCockpitQuickbarItem\\(settings, item\\.type as CockpitQuickbarId\\)/);
  assert.doesNotMatch(surface, /aria-label="Ich bin da! einstellen"/);
  assert.doesNotMatch(surface, /aria-label="Gruppen bilden einstellen"/);
  assert.doesNotMatch(surface, /aria-label="Wochenplan der Kinder einstellen"/);
  assert.doesNotMatch(surface, /aria-label="Zufallsauswahl einstellen"/);
});

test('library uses a left rail on desktop and horizontal category strip on phones', () => {
  assert.match(css, /\.klassio-widget-library \{[\s\S]*?grid-template-columns: 13\.5rem minmax\(0, 1fr\)/);
  assert.match(css, /\.klassio-widget-library-sidebar \{[\s\S]*?grid-column: 1/);
  assert.match(css, /\.klassio-widget-library-content \{[\s\S]*?grid-column: 2/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.klassio-widget-library-sidebar[\s\S]*?overflow-x: auto/);
});

test('teaching dock fully steps back while widget library is open', () => {
  assert.match(surface, /data-widget-library-open=\{isAddWidgetMenuOpen \? "true" : "false"\}/);
  assert.match(css, /data-widget-library-open="true"\] \.klassio-dock-row/);
  assert.match(css, /opacity: 0;/);
  assert.match(css, /visibility: hidden/);
  assert.match(css, /pointer-events: none/);
});

test('opening the library prioritizes favorites, then recent, then core without changing widget layouts', () => {
  assert.match(surface, /const openWidgetLibrary = \(\) =>/);
  assert.match(surface, /favoriteCount > 0 \? "favorites" : recentWidgetTypes\.length > 0 \? "recent" : "core"/);
  assert.match(surface, /setWidgetSearch\(""\)/);
  const helper = surface.slice(surface.indexOf('const openWidgetLibrary'), surface.indexOf('const [isWidgetPickerOpen'));
  assert.doesNotMatch(helper, /cockpitLayout\s*:/);
  assert.doesNotMatch(helper, /setCockpitWidgets/);
});


test('library stays inside app chrome, closes with Escape and keeps favorites compact', () => {
  assert.match(surface, /top-\[4\.75rem\] bottom-\[4\.75rem\]/);
  assert.match(surface, /if \(event\.key !== "Escape"\) return/);
  assert.match(surface, /setIsWidgetConfigurationOpen\(false\)/);
  assert.match(surface, /setIsAddWidgetMenuOpen\(false\)/);
  assert.match(surface, /aria-label="Favoriten-Ordner auswählen"/);
  assert.match(surface, /const favoriteFolderPicker = \(/);
  assert.doesNotMatch(surface, /FAVORITEN-ORDNER:/);
  assert.match(css, /top: 4\.25rem !important;/);
  assert.match(css, /bottom: 4\.25rem !important;/);
  assert.match(css, /height: auto !important;/);
});
