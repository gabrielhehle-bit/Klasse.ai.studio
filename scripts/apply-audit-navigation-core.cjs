const fs = require('fs');
const path = require('path');

function replaceRequired(file, search, replacement, label) {
  const abs = path.resolve(file);
  const before = fs.readFileSync(abs, 'utf8');
  if (!before.includes(search)) {
    throw new Error(`Expected source pattern missing for ${label} in ${file}`);
  }
  const after = before.replace(search, replacement);
  fs.writeFileSync(abs, after);
  console.log(`patched: ${label}`);
}

const sidebarPath = 'src/components/Sidebar.tsx';

replaceRequired(
  sidebarPath,
  `  const orderedModules = orderSidebarItems(availableModules);\n  const utilityModules = orderedModules.filter(item => utilityIds.has(item.id));\n  const mainModules = orderedModules.filter(item => !utilityIds.has(item.id));\n  const PRIMARY_VISIBLE_COUNT = 8;\n  const visibleMainModules = showMorePages ? mainModules : mainModules.slice(0, PRIMARY_VISIBLE_COUNT);\n  const hiddenMainCount = Math.max(0, mainModules.length - PRIMARY_VISIBLE_COUNT);`,
  `  const orderedModules = orderSidebarItems(availableModules);\n  const utilityModules = orderedModules.filter(item => utilityIds.has(item.id));\n  const mainModules = orderedModules.filter(item => !utilityIds.has(item.id));\n\n  // Audit #1: keep the everyday navigation intentionally small. All modules stay\n  // available via \"Mehr\" and users can promote any module by pinning it.\n  const CORE_MODULE_IDS = new Set([\n    'dashboard',\n    'klasse',\n    'verhalten',\n    'planung',\n    'leistungen',\n    'unterricht',\n    'tools',\n  ]);\n  const defaultPrimaryModules = mainModules.filter(item =>\n    CORE_MODULE_IDS.has(item.id) || sidebarPinned.includes(item.id)\n  );\n  const visibleMainModules = showMorePages ? mainModules : defaultPrimaryModules;\n  const hiddenMainCount = Math.max(0, mainModules.length - defaultPrimaryModules.length);\n  const activeSecondaryModule = mainModules.find(item =>\n    item.id === currentPage && !defaultPrimaryModules.some(primary => primary.id === item.id)\n  );`,
  'core navigation model',
);

replaceRequired(
  sidebarPath,
  `                  {!isCollapsed && (\n                    <span>{showMorePages ? 'Weniger' : \`Mehr (\${hiddenMainCount})\`}</span>\n                  )}`,
  `                  {!isCollapsed && (\n                    <span>\n                      {showMorePages\n                        ? 'Weniger'\n                        : activeSecondaryModule\n                          ? \`Mehr · \${activeSecondaryModule.label}\`\n                          : \`Mehr (\${hiddenMainCount})\`}\n                    </span>\n                  )}`,
  'secondary navigation context label',
);

replaceRequired(
  sidebarPath,
  `                  Ziehe einen Bereich an den Punkten, verschiebe ihn mit den Pfeilen oder pinne ihn mit der Flagge an. Angepinnte Bereiche stehen automatisch oben; die ersten acht Bereiche sind direkt sichtbar.`,
  `                  Heute, Klasse, Notizen, Planung, Leistungen, Unterricht und Tools bilden die Kernnavigation. Ziehe weitere Bereiche an den Punkten, verschiebe sie mit den Pfeilen oder pinne sie mit der Flagge an. Angepinnte Bereiche erscheinen zusätzlich direkt; alle übrigen bleiben unter „Mehr“ erreichbar.`,
  'sidebar customization explanation',
);

const testFile = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\n\nconst source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Sidebar.tsx'), 'utf8');\n\ntest('Sidebar zeigt standardmäßig nur die Kernnavigation plus Pins', () => {\n  assert.match(source, /const CORE_MODULE_IDS = new Set\\(\\[/);\n  for (const id of ['dashboard', 'klasse', 'verhalten', 'planung', 'leistungen', 'unterricht', 'tools']) {\n    assert.match(source, new RegExp(\\`'\\${id}'\\`));\n  }\n  assert.match(source, /CORE_MODULE_IDS\\.has\\(item\\.id\\) \\|\\| sidebarPinned\\.includes\\(item\\.id\\)/);\n  assert.match(source, /visibleMainModules = showMorePages \\? mainModules : defaultPrimaryModules/);\n  assert.doesNotMatch(source, /PRIMARY_VISIBLE_COUNT/);\n});\n\ntest('Sekundäre Bereiche bleiben vollständig über Mehr erreichbar', () => {\n  assert.match(source, /showMorePages \\? mainModules : defaultPrimaryModules/);\n  assert.match(source, /Mehr · \\${activeSecondaryModule\\.label}/);\n  for (const id of ['textanalyse', 'cockpit', 'ki-helfer', 'diagnostik', 'materialien', 'drucken', 'datensicherung', 'settings']) {\n    assert.match(source, new RegExp(\\`id: '\\${id}'\\`));\n  }\n});\n\ntest('Sidebar-Anpassung erklärt die neue Hierarchie', () => {\n  assert.match(source, /Heute, Klasse, Notizen, Planung, Leistungen, Unterricht und Tools bilden die Kernnavigation/);\n  assert.match(source, /Angepinnte Bereiche erscheinen zusätzlich direkt/);\n  assert.match(source, /alle übrigen bleiben unter „Mehr“ erreichbar/);\n});\n`;

fs.writeFileSync('src/lib/navigationCoreRequirements.test.ts', testFile);
console.log('created: src/lib/navigationCoreRequirements.test.ts');
