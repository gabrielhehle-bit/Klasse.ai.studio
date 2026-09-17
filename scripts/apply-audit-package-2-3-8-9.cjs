const fs = require('fs');
const path = require('path');

function replaceRequired(file, search, replacement, label) {
  const abs = path.resolve(file);
  const before = fs.readFileSync(abs, 'utf8');
  if (before.includes(replacement)) {
    console.log(`already patched: ${label}`);
    return;
  }
  if (!before.includes(search)) {
    throw new Error(`Expected source pattern missing for ${label} in ${file}`);
  }
  const after = before.replace(search, replacement);
  fs.writeFileSync(abs, after);
  console.log(`patched: ${label}`);
}

// #2: local school-day keys must never be derived from UTC ISO dates.
replaceRequired(
  'src/components/Dashboard.tsx',
  'const todayStr = new Date().toISOString().split("T")[0];',
  'const todayStr = formatLocalDateKey(new Date());',
  'birthday toast local day key',
);
replaceRequired(
  'src/components/Dashboard.tsx',
  'const todayStrFull = heute.toISOString().split("T")[0];',
  'const todayStrFull = formatLocalDateKey(heute);',
  'dashboard current local day key',
);
replaceRequired(
  'src/components/Dashboard.tsx',
  'const dateStr = d.toISOString().split("T")[0];',
  'const dateStr = formatLocalDateKey(d);',
  'weekly attendance local day key',
);

// #3: the missing-AI-key warning belongs in the KI context, not globally on every page.
replaceRequired(
  'src/App.tsx',
  '{hasAiKey === false && showAiWarning && (',
  "{hasAiKey === false && showAiWarning && currentPage.startsWith('ki-') && (",
  'contextual AI warning',
);
replaceRequired(
  'src/App.tsx',
  'onClick={() => setShowAiWarning(false)}',
  `onClick={() => {\n                setShowAiWarning(false);\n                try {\n                  sessionStorage.setItem('klassio_ai_warning_dismissed', '1');\n                } catch {\n                  // Session storage can be unavailable in hardened/private browser modes.\n                }\n              }}`,
  'persist AI warning dismissal',
);
replaceRequired(
  'src/App.tsx',
  'const [showAiWarning, setShowAiWarning] = useState(true);',
  `const [showAiWarning, setShowAiWarning] = useState(() => {\n    try {\n      return sessionStorage.getItem('klassio_ai_warning_dismissed') !== '1';\n    } catch {\n      return true;\n    }\n  });`,
  'restore AI warning dismissal',
);

const testFile = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\n\nconst readSource = (relativePath: string) =>\n  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');\n\ntest('audit #2 uses local calendar keys for dashboard day and attendance lookups', () => {\n  const source = readSource('src/components/Dashboard.tsx');\n  assert.match(source, /const todayStr = formatLocalDateKey\\(new Date\\(\\)\\);/);\n  assert.match(source, /const todayStrFull = formatLocalDateKey\\(heute\\);/);\n  assert.match(source, /const dateStr = formatLocalDateKey\\(d\\);/);\n  assert.doesNotMatch(source, /const todayStrFull = heute\\.toISOString\\(\\)\\.split/);\n});\n\ntest('audit #3 keeps the missing AI-key notice contextual and session-dismissible', () => {\n  const source = readSource('src/App.tsx');\n  assert.ok(source.includes(\"hasAiKey === false && showAiWarning && currentPage.startsWith('ki-')\"));\n  assert.ok(source.includes(\"sessionStorage.setItem('klassio_ai_warning_dismissed', '1')\"));\n  assert.ok(source.includes(\"sessionStorage.getItem('klassio_ai_warning_dismissed') !== '1'\"));\n});\n\ntest('audit #8 keeps actionable gradebook empty states', () => {\n  const source = readSource('src/components/Gradebook.tsx');\n  assert.ok(source.includes('title=\\\"Keine Schüler:innen\\\"'));\n  assert.ok(source.includes('actionLabel=\\\"Zur Schülerliste\\\"'));\n  assert.ok(source.includes('title=\\\"Keine Noten-Spalten aktiv\\\"'));\n  assert.ok(source.includes('actionLabel=\\\"Neues Bewertungselement\\\"'));\n});\n\ntest('audit #9 keeps unavailable gradebook actions disabled with an explanation', () => {\n  const source = readSource('src/components/Gradebook.tsx');\n  assert.ok(source.includes('disabled={missingCount === 0}'));\n  assert.ok(source.includes('Alle vorgesehenen Bewertungen sind vollständig'));\n});\n`;

fs.writeFileSync('src/lib/auditPackage2389Requirements.test.ts', testFile);
console.log('created: src/lib/auditPackage2389Requirements.test.ts');
