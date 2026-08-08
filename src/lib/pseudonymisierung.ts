import { AppState, Student } from '../types';

export interface PseudonymMap {
  [klarname: string]: string; // "Marko Petrovic" -> "Kind A"
}

export function pseudonymisiere(text: string, appState: AppState): { text: string; map: PseudonymMap } {
  if (!text) return { text, map: {} };
  if (!appState) return { text, map: {} };
  
  if (appState.pseudonymisierungAktiv === false) {
    return { text, map: {} };
  }

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
  
  if (uniqueSchueler.length === 0) {
    return { text, map };
  }

  // Gather all variations of names (Full Name, First Name, Last Name)
  // And avoid adding empty or too short strings
  interface NameVariation {
    original: string;
  }
  
  const nameVariations: NameVariation[] = [];

  for (const s of uniqueSchueler) {
    const vorname = s.vorname?.trim();
    const nachname = s.nachname?.trim();
    const fullname = s.name?.trim() || [vorname, nachname].filter(Boolean).join(' ');

    if (fullname && fullname.length > 2) {
      nameVariations.push({ original: fullname });
    }
    if (vorname && vorname.length > 2) {
      nameVariations.push({ original: vorname });
    }
    if (nachname && nachname.length > 2) {
      nameVariations.push({ original: nachname });
    }
  }

  // Handle Schulname if we have it in settings
  if (appState.lehrerProfil?.schule) {
    nameVariations.push({ original: appState.lehrerProfil.schule });
    map[appState.lehrerProfil.schule] = "unsere Schule";
  }
  
  if (appState.klassenbezeichnung) {
    // Keep Klassenbezeichnung explicitly untouched, so do nothing.
  }

  // Remove duplicates and sort by length descending
  const uniqueVariations = Array.from(new Set(nameVariations.map(nv => nv.original)))
    .sort((a, b) => b.length - a.length);

  let currentText = text;

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

  // We assign a pseudonym for each student (so variations of a student resolve to the SAME pseudonym)
  // Wait, if we process "Full Name" then "First Name", they should ideally get the SAME pseudonym.
  // The simplest way: First Name -> "Kind A", Last Name -> "Kind A", Full Name -> "Kind A".
  // Let's create a mapping of originalName -> Pseudonym
  const studentToPseudonym = new Map<string, string>(); // studentId -> Pseudonym

  // To map correctly, let's group by student.
  for (const s of uniqueSchueler) {
    const pseudo = getNextPseudonym();
    const vorname = s.vorname?.trim();
    const nachname = s.nachname?.trim();
    const fullname = s.name?.trim() || [vorname, nachname].filter(Boolean).join(' ');

    const addMapping = (n: string | undefined) => {
      if (n && n.length > 2) {
        if (!map[n]) { // if two students have same first name, first one wins right now, which is okay for AI context usually.
          map[n] = pseudo;
        }
      }
    }
    addMapping(fullname);
    addMapping(vorname);
    addMapping(nachname);
  }

  // Ensure "Kind AB" is matched before "Kind A" in depseudonymisiere later
  const sortedNames = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    // Regex with word boundaries \b, case insensitive
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    
    // We must avoid replacing parts inside already replaced text?
    // Kind A shouldn't contain names. But what if a student's name is "Kind"? Unlikely but possible.
    
    currentText = currentText.replace(regex, (match) => {
      return map[name] || match; // Replace with corresponding Pseudonym
    });
  }

  return { text: currentText, map };
}

export function depseudonymisiere(text: string, map: PseudonymMap): string {
  if (!text) return text;
  
  let currentText = text;
  
  // Create reverse map: "Kind A" -> "Original Name"
  // Wait, multiple names can map to "Kind A". For example: Full Name, First Name, Last Name.
  // Which one should we use when replacing "Kind A" back?
  // Ideally, the First Name or Full Name. We take the longest original name that mapped to this Pseudonym.
  // Or simply the first one we mapped.
  
  const reverseMap: { [pseudo: string]: string } = {};
  for (const [klarname, pseudo] of Object.entries(map)) {
    if (!reverseMap[pseudo] || klarname.length > reverseMap[pseudo].length) {
      reverseMap[pseudo] = klarname; // Use the longest representation (Full Name)
    }
  }

  const sortedPseudos = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

  for (const pseudo of sortedPseudos) {
    const escapedPseudo = pseudo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // We might not always have strict word boundaries if punctuation is attached.
    // However, "Kind A" is safe to replace directly.
    const regex = new RegExp(`\\b${escapedPseudo}\\b`, 'gi');
    currentText = currentText.replace(regex, reverseMap[pseudo]);
  }

  return currentText;
}
