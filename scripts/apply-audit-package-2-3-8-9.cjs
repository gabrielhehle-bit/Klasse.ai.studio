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

const testFile = `import { describe, expect, it } from 'vitest';\nimport fs from 'node:fs';\nimport path from 'node:path';\n\nconst readSource = (relativePath: string) =>\n  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');\n\ndescribe('audit package #2/#3/#8/#9 regressions', () => {\n  it('uses local calendar keys for dashboard day and attendance lookups', () => {\n    const source = readSource('src/components/Dashboard.tsx');\n    expect(source).toContain('const todayStr = formatLocalDateKey(new Date());');\n    expect(source).toContain('const todayStrFull = formatLocalDateKey(heute);');\n    expect(source).toContain('const dateStr = formatLocalDateKey(d);');\n    expect(source).not.toContain('const todayStrFull = heute.toISOString().split(\\\"T\\\")[0];');\n  });\n\n  it('shows the missing AI-key notice only inside KI pages and remembers dismissal for the session', () => {\n    const source = readSource('src/App.tsx');\n    expect(source).toContain(\"hasAiKey === false && showAiWarning && currentPage.startsWith('ki-')\");\n    expect(source).toContain(\"sessionStorage.setItem('klassio_ai_warning_dismissed', '1')\");\n    expect(source).toContain(\"sessionStorage.getItem('klassio_ai_warning_dismissed') !== '1'\");\n  });\n\n  it('keeps actionable gradebook empty states', () => {\n    const source = readSource('src/components/Gradebook.tsx');\n    expect(source).toContain('title=\\\"Keine Schüler:innen\\\"');\n    expect(source).toContain('actionLabel=\\\"Zur Schülerliste\\\"');\n    expect(source).toContain('title=\\\"Keine Noten-Spalten aktiv\\\"');\n    expect(source).toContain('actionLabel=\\\"Neues Bewertungselement\\\"');\n  });\n\n  it('keeps unavailable gradebook actions disabled with an explanation', () => {\n    const source = readSource('src/components/Gradebook.tsx');\n    expect(source).toContain('disabled={missingCount === 0}');\n    expect(source).toContain('Alle vorgesehenen Bewertungen sind vollständig');\n  });\n});\n`;

fs.writeFileSync('src/lib/auditPackage2389Requirements.test.ts', testFile);
console.log('created: src/lib/auditPackage2389Requirements.test.ts');
