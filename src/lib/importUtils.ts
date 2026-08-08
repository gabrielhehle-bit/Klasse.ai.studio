
import { Student } from '../types';

export interface SokratesImportResult {
  students: Partial<Student>[];
}

export function parseSokratesCSV(csvText: string): SokratesImportResult {
  // Remove BOM if present
  const cleanCsv = csvText.replace(/^\uFEFF/, '');
  const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return { students: [] };

  // Detect separator (usually ; in Austria)
  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';
  
  const headers = headerLine.split(separator).map(h => h.replace(/["']/g, '').trim());
  const students: Partial<Student>[] = [];

  // Mapping patterns based on typical Sokrates exports
  const patterns = {
    vorname: ['vorname', 'vname', 'first name'],
    nachname: ['familienname', 'zuname', 'nachname', 'nachn', 'last name', 'surname'],
    geburtstag: ['geb.datum', 'geburtsdatum', 'gebdatum', 'geb.dat', 'birth', 'geburts'],
    geschlecht: ['geschlecht', 'geschl', 'sex', 'gender', 'g'],
    religion: ['religion', 'bekenntnis', 'rel', 'bek', 'konfession'],
    erstsprache: ['erstsprache', 'muttersprache', 'l1', 'sprache', 'language']
  };

  const getColIndex = (keys: string[]) => {
    return headers.findIndex(h => keys.some(k => h.toLowerCase() === k.toLowerCase() || h.toLowerCase().includes(k.toLowerCase())));
  };

  const colIdx = {
    vorname: getColIndex(patterns.vorname),
    nachname: getColIndex(patterns.nachname),
    geburtstag: getColIndex(patterns.geburtstag),
    geschlecht: getColIndex(patterns.geschlecht),
    religion: getColIndex(patterns.religion),
    erstsprache: getColIndex(patterns.erstsprache)
  };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(separator).map(c => c.replace(/["']/g, '').trim());
    if (row.length < 2) continue;

    const vorname = colIdx.vorname !== -1 ? row[colIdx.vorname] : '';
    const nachname = colIdx.nachname !== -1 ? row[colIdx.nachname] : '';
    let geburtstag = colIdx.geburtstag !== -1 ? row[colIdx.geburtstag] : '';
    let geschlecht = colIdx.geschlecht !== -1 ? row[colIdx.geschlecht].toLowerCase() : 'w';
    const religion = colIdx.religion !== -1 ? row[colIdx.religion] : '';
    const erstsprache = colIdx.erstsprache !== -1 ? row[colIdx.erstsprache] : 'Deutsch';

    // Convert Austrian date DD.MM.YYYY to YYYY-MM-DD
    if (geburtstag && geburtstag.includes('.')) {
      const parts = geburtstag.split('.');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year; 
        geburtstag = `${year}-${month}-${day}`;
      }
    }

    // Map geschlecht
    if (geschlecht.startsWith('m')) geschlecht = 'm';
    else if (geschlecht.startsWith('w')) geschlecht = 'w';
    else geschlecht = 'w';

    if (vorname || nachname) {
      students.push({
        vorname,
        nachname,
        geburtstag,
        geschlecht,
        religion,
        erstsprache
      });
    }
  }

  return { students };
}
