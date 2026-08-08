export interface ParsedStudent {
  vorname: string;
  nachname: string;
  geburtstag?: string;
  geschlecht?: string;
}

export interface ImportResult {
  schueler: ParsedStudent[];
  warnungen: string[];
}

// Robust date conversion to YYYY-MM-DD
function normalizeDate(str: string): string {
  if (!str) return '';
  const clean = str.trim();
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  
  // Format: DD.MM.YYYY or DD.MM.YY
  const dotParts = clean.split('.');
  if (dotParts.length === 3) {
    const day = dotParts[0].padStart(2, '0');
    const month = dotParts[1].padStart(2, '0');
    let year = dotParts[2].trim();
    if (year.length === 2) {
      year = '20' + year; // assume 21st century
    }
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return clean;
}

// Splits combined fields like "Maier, Anna" -> { vorname: "Anna", nachname: "Maier" }
function splitCombinedName(nameStr: string): { vorname: string; nachname: string } | null {
  const trimmed = nameStr.trim();
  if (!trimmed) return null;
  
  // Case 1: "Maier, Anna" (Comma-separated)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Nachname is usually before the comma
      return { nachname: parts[0], vorname: parts[1] };
    }
  }
  
  // Case 2: Space separated
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 2) {
    // If first word is all UPPERCASE (minimum 2 chars) and second is normal case, first is Nachname
    const firstWord = spaceParts[0];
    const rest = spaceParts.slice(1).join(' ');
    
    if (firstWord.length >= 2 && firstWord === firstWord.toUpperCase() && !/\d/.test(firstWord)) {
      return { nachname: firstWord, vorname: rest };
    }
    
    // Default fallback: first word is Nachname, others are Vorname (Sokrates-like default)
    return { nachname: firstWord, vorname: rest };
  }
  
  return null;
}

export function parseKlassenliste(rohtext: string): ImportResult {
  const warnungen: string[] = [];
  const schueler: ParsedStudent[] = [];
  
  // Remove BOM and clean whitespace
  const cleanText = rohtext.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { schueler: [], warnungen: ["Die eingegebene Liste ist leer."] };
  }
  
  // Split into lines
  const lines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) {
    return { schueler: [], warnungen: ["Die eingegebene Liste enthält keine lesbaren Zeilen."] };
  }
  
  // Detect separator: Tab, Semicolon, or Comma
  let separator = ';';
  const firstLine = lines[0];
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  
  if (tabs > semicolons && tabs > commas) {
    separator = '\t';
  } else if (commas > semicolons) {
    separator = ',';
  }
  
  // Helpers to clean CSV values from quotes
  const cleanVal = (v: string) => v ? v.replace(/^["']|["']$/g, '').trim() : '';
  
  const headerKeys = ["name", "vorname", "nachname", "familienname", "zuname", "geburtsdatum", "geb", "skz", "klasse", "geschlecht", "m/w", "sex"];
  const isHeaderLine = (line: string): boolean => {
    const parts = line.split(separator).map(p => cleanVal(p).toLowerCase());
    return parts.some(part => headerKeys.some(key => part === key || part.includes(key)));
  };
  
  let hasHeader = isHeaderLine(lines[0]);
  let headerRowIndex = -1;
  let dataStartIndex = 0;
  
  if (hasHeader) {
    headerRowIndex = 0;
    dataStartIndex = 1;
  } else {
    // Check if second line is a header and first is something else, or if header is further down
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (isHeaderLine(lines[i])) {
        hasHeader = true;
        headerRowIndex = i;
        dataStartIndex = i + 1;
        break;
      }
    }
  }
  
  // Determine Columns Mapping
  let colMap: { vorname: number; nachname: number; geburtstag: number; geschlecht: number; combinedName: number } = {
    vorname: -1,
    nachname: -1,
    geburtstag: -1,
    geschlecht: -1,
    combinedName: -1
  };
  
  if (hasHeader && headerRowIndex !== -1) {
    const headers = lines[headerRowIndex].split(separator).map(h => cleanVal(h).toLowerCase());
    
    headers.forEach((h, idx) => {
      if (h === 'vorname' || h === 'vname' || h === 'first name') {
        colMap.vorname = idx;
      } else if (h === 'nachname' || h === 'familienname' || h === 'zuname' || h === 'last name' || h === 'surname' || h === 'zuname(n)') {
        colMap.nachname = idx;
      } else if (h === 'geburtsdatum' || h === 'geb.datum' || h === 'gebdatum' || h === 'geb' || h === 'geboren' || h === 'geb. dat.') {
        colMap.geburtstag = idx;
      } else if (h === 'geschlecht' || h === 'geschl' || h === 'sex' || h === 'gender' || h === 'g' || h === 'm/w') {
        colMap.geschlecht = idx;
      } else if (h === 'name' || h === 'schüler' || h === 'schueler' || h === 'schülerin' || h === 'schuelerin' || h === 'name schüler' || h === 'name schülerin') {
        colMap.combinedName = idx;
      }
    });
  }
  
  const getValues = (line: string) => line.split(separator).map(cleanVal);
  
  // Custom heuristics if no header or some columns are not mapped
  if (colMap.vorname === -1 || colMap.nachname === -1) {
    // Analyze first few data lines to find matches
    const testLines = lines.slice(dataStartIndex, dataStartIndex + 5);
    if (testLines.length > 0) {
      const fieldCounts = testLines.map(line => getValues(line).length);
      const maxFields = Math.max(...fieldCounts);
      
      const columnsType = Array.from({ length: maxFields }, () => ({
        isDate: 0,
        isGender: 0,
        hasComma: 0,
        textCount: 0
      }));
      
      testLines.forEach(line => {
        const vals = getValues(line);
        vals.forEach((val, colIdx) => {
          if (!val) return;
          if (columnsType[colIdx]) {
            // Check if looks like date
            if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val)) {
              columnsType[colIdx].isDate++;
            }
            // Check if looks like gender flag (m/w, f)
            else if (/^[mwf]$/i.test(val) || /^(männlich|weiblich|maennlich)$/i.test(val)) {
              columnsType[colIdx].isGender++;
            }
            // Text values
            else if (val.length > 1) {
              columnsType[colIdx].textCount++;
              if (val.includes(',')) {
                columnsType[colIdx].hasComma++;
              }
            }
          }
        });
      });
      
      // Assign column indices based on findings
      columnsType.forEach((col, idx) => {
        const total = testLines.length;
        if (col.isDate > total * 0.5 && colMap.geburtstag === -1) {
          colMap.geburtstag = idx;
        } else if (col.isGender > total * 0.5 && colMap.geschlecht === -1) {
          colMap.geschlecht = idx;
        }
      });
      
      // Find text columns
      const textColIndices: number[] = [];
      columnsType.forEach((col, idx) => {
        if (idx !== colMap.geburtstag && idx !== colMap.geschlecht && col.textCount > 0) {
          textColIndices.push(idx);
        }
      });
      
      if (colMap.vorname === -1 && colMap.nachname === -1) {
        if (textColIndices.length >= 2) {
          // Sokrates standard is Nachname first, then Vorname
          colMap.nachname = textColIndices[0];
          colMap.vorname = textColIndices[1];
        } else if (textColIndices.length === 1) {
          colMap.combinedName = textColIndices[0];
        }
      }
    }
  }
  
  // If we still have no columns mapped, let's fall back to split of each line or first/second column
  const isAllUnmapped = (colMap.vorname === -1 && colMap.nachname === -1 && colMap.combinedName === -1);
  
  // Parse data rows
  let rowCount = 0;
  for (let i = dataStartIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    
    const rowVals = getValues(rawLine);
    // If row has no data or starts with a comment/header, skip
    if (rowVals.length === 0 || (rowVals.length === 1 && !rowVals[0])) continue;
    
    let vorname = '';
    let nachname = '';
    let geburtstag = '';
    let geschlecht = 'w';
    
    if (isAllUnmapped) {
      // Just try splitting the whole line by the separator if multiple columns exist, or by name splitting heuristic
      if (rowVals.length >= 2) {
        nachname = rowVals[0];
        vorname = rowVals[1];
        if (rowVals[2]) {
          const possibleDate = normalizeDate(rowVals[2]);
          if (possibleDate) geburtstag = possibleDate;
        }
      } else if (rowVals.length === 1) {
        const splitRes = splitCombinedName(rowVals[0]);
        if (splitRes) {
          vorname = splitRes.vorname;
          nachname = splitRes.nachname;
        } else {
          nachname = rowVals[0];
          vorname = '';
        }
      }
    } else {
      // Extract from known column mapping
      // Combined Name
      if (colMap.combinedName !== -1 && rowVals[colMap.combinedName]) {
        const splitRes = splitCombinedName(rowVals[colMap.combinedName]);
        if (splitRes) {
          vorname = splitRes.vorname;
          nachname = splitRes.nachname;
        } else {
          nachname = rowVals[colMap.combinedName];
        }
      }
      
      // Individual columns map (overrides combined if specified)
      if (colMap.vorname !== -1 && rowVals[colMap.vorname]) {
        vorname = rowVals[colMap.vorname];
      }
      if (colMap.nachname !== -1 && rowVals[colMap.nachname]) {
        nachname = rowVals[colMap.nachname];
      }
      if (colMap.geburtstag !== -1 && rowVals[colMap.geburtstag]) {
        geburtstag = normalizeDate(rowVals[colMap.geburtstag]);
      }
      if (colMap.geschlecht !== -1 && rowVals[colMap.geschlecht]) {
        const g = rowVals[colMap.geschlecht].toLowerCase();
        if (g.startsWith('m')) geschlecht = 'm';
        else if (g.startsWith('w') || g.startsWith('f')) geschlecht = 'w';
      }
    }
    
    // Fallbacks and cleanup
    vorname = vorname.trim();
    nachname = nachname.trim();
    
    // If we only got one word or something, make sure we have at least one name
    if (!vorname && !nachname) continue;
    
    rowCount++;
    if (rowCount > 40) {
      if (warnungen.indexOf("Nur die ersten 40 Einträge wurden übernommen") === -1) {
        warnungen.push("Nur die ersten 40 Einträge wurden übernommen");
      }
      break;
    }
    
    schueler.push({
      vorname,
      nachname,
      geburtstag: geburtstag || undefined,
      geschlecht
    });
  }
  
  // Duplicates check (same first and last name)
  const seen = new Set<string>();
  schueler.forEach(s => {
    const key = `${s.vorname.toLowerCase()}|${s.nachname.toLowerCase()}`;
    if (seen.has(key)) {
      const warnMsg = `Ein/e Schüler/in namens "${s.vorname} ${s.nachname}" ist mehrfach vorhanden.`;
      if (warnungen.indexOf(warnMsg) === -1) {
        warnungen.push(warnMsg);
      }
    } else {
      seen.add(key);
    }
  });
  
  if (schueler.length === 0) {
    warnungen.push("Es konnten keine Schülerdaten aus dem Text extrahiert werden.");
  }
  
  return { schueler, warnungen };
}
