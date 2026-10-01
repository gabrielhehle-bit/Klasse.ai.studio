import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { initialAppState } from './appState';

// Exercise the real component and eager useMemo; isolate the unrelated vault provider.
const bundled = await build({
  entryPoints: ['src/components/cockpit/widgets/GroupsWidget.tsx'],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'test-app-context', setup(builder) {
    builder.onResolve({ filter: /\/context\/AppContext$/ }, () => ({ path: 'context', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const useApp = () => ({});' }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { GroupsWidget } = module.exports;
const students = [
  { id: 'present', vorname: 'Anna', nachname: 'Test' },
  { id: 'absent', vorname: 'Ben', nachname: 'Test', abwesend: true },
];
const app = { ...initialAppState, activeClassId: 'test', schueler: students,
  classes: [{ id: 'test', name: 'Testklasse', schueler: students }] } as any;

for (const [scope, expected] of [['present', 1], ['all', 2]] as const) {
  test(`Groups widget initializes its active class before reading the ${scope} roster`, () => {
    const html = renderToStaticMarkup(React.createElement(GroupsWidget, {
      app, currentIsLight: true,
      widget: { id: 'groups-test', type: 'groups', settings: { studentScope: scope } } as any,
    }));
    assert.match(html, new RegExp(`${expected} Kinder`));
  });
}
