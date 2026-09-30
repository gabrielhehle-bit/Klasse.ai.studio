import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('class mascot has a permanent quick toggle in the cockpit dock', () => {
  const dock = readFileSync('src/components/cockpit/CockpitWidgetDock.tsx', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

  assert.match(dock, /onToggleMascot/);
  assert.match(dock, /Klassenmaskottchen ausblenden/);
  assert.match(dock, /Klassenmaskottchen einblenden/);
  assert.match(dock, /PawPrint/);

  assert.match(cockpit, /onToggleMascot=\{\(\) => \{/);
  assert.match(cockpit, /executeWidgetClose\(mascot\.id\)/);
  assert.match(cockpit, /handleOpenWidgetInCockpitLayout\("pet"\)/);
  assert.match(cockpit, /mascotVisible=\{cockpitWidgets\.some/);
});

test('mascot settings live on the widget gear instead of the global options menu', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"pet",/);
  assert.match(cockpit, /widget\.type === "pet" && isMascotSettingsOpen/);
  assert.match(cockpit, /if \(widget\.type === "pet"\)/);
  assert.match(cockpit, /setIsMascotSettingsOpen\(open => !open\)/);
  assert.doesNotMatch(
    cockpit,
    /setIsMascotSettingsOpen\(true\); setIsMoreOptionsMenuOpen\(false\);[\s\S]{0,180}Klassenmaskottchen/,
  );
});

test('cockpit widgets remain movable without a separate layout mode', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

  assert.match(cockpit, /const isLayoutLocked = false;/);
  assert.match(cockpit, /const isLayoutEditing = true;/);
  assert.match(cockpit, /Widgets bleiben immer frei verschiebbar/);
});
