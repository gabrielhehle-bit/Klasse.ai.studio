import { AppState, Student } from '../types';

export interface PseudonymMap {
  [klarname: string]: string; // "Marko Petrovic" -> "Kind A"
}

/**
 * Replaces direct identifying patterns (E-Mail, Telefonnummer, SVNR, Datum) in any text string.
 */
export function maskDirectIdentifiers(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // 1. E-Mail addresses
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[E-Mail]');

  // 2. Austrian & international phone numbers (e.g. +43 664 1234567, 0043..., 0664/..., 05572 ...)
  cleaned = cleaned.replace(/(?:\+43|0043|0)\s*(?:\(?\d+\)?[\s\-/]*){6,14}\d\b/g, '[Telefonnummer]');

  // 3. Austrian SVNR: 10-digit number (4 check digits + 6 digits birthdate DDMMYY)
  cleaned = cleaned.replace(/\b\d{4}\s?\d{6}\b/g, '[SVNR]');

  // 4. Full birthdate / calendar date (DD.MM.YYYY or DD.MM.YY)
  cleaned = cleaned.replace(/\b(0?[1-9]|[12][0-9]|3[01])\.(0?[1-9]|1[0-2])\.(?:19|20)?\d{2}\b/g, '[Datum]');

  return cleaned;
}

/**
 * Creates a local temporary pseudonym mapping for a list of students (e.g. S01, S02... or Kind A, Kind B...).
 * Returns the sanitized list with temporary codes and local reverse lookup maps.
 */
export function createLocalStudentCodeMap<T extends { id: string; vorname?: string; nachname?: string; name?: string }>(
  students: T[],
  prefix: string = 'S'
): {
  codeMap: Map<string, string>;       // realId -> TempCode ("s-123" -> "S01")
  reverseCodeMap: Map<string, T>;    // TempCode -> original Student ("S01" -> Student)
  sanitizedList: Array<{ tempCode: string; label: string; [key: string]: any }>;
} {
  const codeMap = new Map<string, string>();
  const reverseCodeMap = new Map<string, T>();

  const sanitizedList = (students || []).map((s, idx) => {
    const tempCode = `${prefix}${String(idx + 1).padStart(2, '0')}`;
    codeMap.set(s.id, tempCode);
    reverseCodeMap.set(tempCode, s);

    return {
      tempCode,
      label: `Kind ${String(idx + 1).padStart(2, '0')}`,
    };
  });

  return { codeMap, reverseCodeMap, sanitizedList };
}

export function pseudonymisiere(text: string, appState: AppState): { text: string; map: PseudonymMap } {
  if (!text) return { text, map: {} };
  if (!appState) return { text: maskDirectIdentifiers(text), map: {} };

  // 1. Always mask direct identifiers first (E-Mail, Phone, SVNR, Date)
  let currentText = maskDirectIdentifiers(text);

  const allSchueler: Student[] = [];
  if (appState.schueler) {
    allSchueler.push(...appState.schueler);
  }
  if (appState.classes) {
    for (const c of appState.classes) {
      if (c.schueler) {
        allSchueler.push(...c.schueler);
      }
    }
  }

  // Remove duplicates by ID
  const uniqueSchueler = Array.from(new Map(allSchueler.map(s => [s.id, s])).values());

  const map: PseudonymMap = {};

  // Gather specific known addresses, phone numbers, SVNRs and emails from student records
  for (const s of uniqueSchueler) {
    const addr = (s.anschrift || (s as any).adresse || '').trim();
    if (addr && addr.length > 3) {
      const escaped = addr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Adresse entfernt]');
    }
    const sv = (s.sv_nummer || (s as any).svnr || '').trim();
    if (sv && sv.length >= 4) {
      const escaped = sv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[SVNR]');
    }
    const notiz = (s.notiz || (s as any).notizen || '').trim();
    if (notiz && notiz.length > 3) {
      const escaped = notiz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Vertrauliche Notiz entfernt]');
    }
    const allergien = (s.allergien || '').trim();
    if (allergien && allergien.length > 3) {
      const escaped = allergien.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Medizinische Angabe entfernt]');
    }
    const allPhones = [s.telefon_mutter, s.telefon_vater, (s as any).telefon].filter(Boolean);
    for (const rawTel of allPhones) {
      const tel = String(rawTel).trim();
      if (tel.length > 5) {
        const escaped = tel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Telefonnummer]');
      }
    }
    const allEmails = [s.email_eltern, (s as any).email].filter(Boolean);
    for (const rawMail of allEmails) {
      const mail = String(rawMail).trim();
      if (mail.length > 5) {
        const escaped = mail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[E-Mail]');
      }
    }
  }

  // Handle known parent meeting names if present
  if (appState.elterngespraeche && Array.isArray(appState.elterngespraeche)) {
    for (const eg of appState.elterngespraeche) {
      if (eg.teilnehmer && eg.teilnehmer.trim().length > 3) {
        const tn = eg.teilnehmer.trim();
        const escaped = tn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Erziehungsberechtigte]');
      }
    }
  }

  // Handle Schulname
  if (appState.lehrerProfil?.schule) {
    const schule = appState.lehrerProfil.schule.trim();
    if (schule.length > 2) {
      map[schule] = "unsere Schule";
      const escaped = schule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), "unsere Schule");
    }
  }
  if ((appState as any).schulName) {
    const schule = (appState as any).schulName.trim();
    if (schule && schule.length > 2 && schule !== appState.lehrerProfil?.schule) {
      map[schule] = "unsere Schule";
      const escaped = schule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentText = currentText.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), "unsere Schule");
    }
  }

  if (uniqueSchueler.length === 0) {
    return { text: currentText, map };
  }

  // Generate pseudonyms "Kind A", "Kind B", ..., "Kind Z", "Kind AA"...
  let currentPseudoIndex = 0;
  function getNextPseudonym(): string {
    let name = '';
    let num = currentPseudoIndex;
    do {
      name = String.fromCharCode(65 + (num % 26)) + name;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);
    currentPseudoIndex++;
    return `Kind ${name}`;
  }

  // Group names by student to assign consistent pseudonyms
  for (const s of uniqueSchueler) {
    const pseudo = getNextPseudonym();
    const vorname = s.vorname?.trim();
    const nachname = s.nachname?.trim();
    const fullname = s.name?.trim() || [vorname, nachname].filter(Boolean).join(' ');

    const addMapping = (n: string | undefined) => {
      if (n && n.length > 2) {
        if (!map[n]) {
          map[n] = pseudo;
        }
      }
    };
    addMapping(fullname);
    addMapping(vorname);
    addMapping(nachname);
  }

  // Ensure longest names are matched first to prevent partial replacements
  const sortedNames = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    currentText = currentText.replace(regex, () => map[name]);
  }

  return { text: currentText, map };
}

export function depseudonymisiere(text: string, map: PseudonymMap): string {
  if (!text) return text;
  if (!map || Object.keys(map).length === 0) return text;

  let currentText = text;

  // Create reverse map for student pseudonyms: "Kind A" -> "Original Full Name"
  const reverseMap: { [pseudo: string]: string } = {};
  for (const [klarname, pseudo] of Object.entries(map)) {
    // Only map back actual pseudonyms (e.g. "Kind A", "Kind B"), avoid mapping back generic placeholders
    if (pseudo.startsWith('Kind ')) {
      if (!reverseMap[pseudo] || klarname.length > reverseMap[pseudo].length) {
        reverseMap[pseudo] = klarname; // Prefer full name representation
      }
    }
  }

  const sortedPseudos = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

  for (const pseudo of sortedPseudos) {
    const escapedPseudo = pseudo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedPseudo}\\b`, 'gi');
    currentText = currentText.replace(regex, reverseMap[pseudo]);
  }

  return currentText;
}
