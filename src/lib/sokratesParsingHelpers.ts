export interface SokratesContactData {
  anschrift: string;
  plz: string;
  ort: string;
  telefon_mutter: string;
  telefon_vater: string;
}

export function cleanSokratesPhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.trim()
    .replace(/^tel(?:\.|efon)?[:\s]*/i, '')
    .replace(/^(?:mutter|mama|vater|papa|obsorge|obs|eltern)[:\s]*/i, '')
    .replace(/[,.;]+$/, '')
    .trim();

  clean = clean.replace(/\s+[0-9]{4}\s*[0-9]{6}\b.*$/, '').trim();
  clean = clean.replace(/\s+[0-9]{10}\b.*$/, '').trim();
  clean = clean.replace(/^\+43\s*0?([1-9])/, '+43 $1');
  clean = clean.replace(/^0043\s*0?([1-9])/, '+43 $1');
  clean = clean.replace(/^0([67][0-9]{2})/, '+43 $1');
  if (/^\+43[0-9]{3}/.test(clean)) clean = clean.replace(/^\+43([0-9]{3})/, '+43 $1 ');
  return clean.replace(/\s+/g, ' ').trim();
}

export function cleanStudentNameString(raw: string): string {
  if (!raw) return '';
  let value = raw
    .replace(/^\s*[0-9]{1,2}[\.)\s\t]+/, ' ')
    .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Vater|Papa|Obsorge|Obs|Eltern)|(?:Mutter|Vater)\s*Tel)[:\s]*[+0-9\s/()\-]+/gi, ' ')
    .replace(/(?:\+43|0043|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g, ' ')
    .replace(/(?<!\p{L})(?:röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\([^\)]+\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)(?!\p{L})/gui, ' ')
    .replace(/\([^\)]+\)/g, ' ')
    .replace(/(?<!\p{L})(?:AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|LIE|KOS|GBR|SOM|CZE|RUS|MKD|POL|SVK|SVN|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland|Nordmazedonien|Polen|Slowakei|Slowenien|Liechtenstein)(?!\p{L})/gui, ' ')
    .replace(/\b(?:0[1-9]|[12][0-9]|3[01])\.(?:0[1-9]|1[0-2])\.(?:19|20)[0-9]{2}\b/g, ' ')
    .replace(/\b[0-9]{10}\b/g, ' ')
    .replace(/\b[A-ZÄÖÜ][a-zäöüß0-9.\-]+?(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|rain|ried|dorf|anger|siedlung|hof|feld|steig|promenade|berg|graben|tal)\s+[0-9]+[a-zA-Z]?(?:\s*(?:Top|Tür|Stiege|Stg\.?)\s*[0-9]+[a-zA-Z]*)?\b/gi, ' ')
    .replace(/\b[1-9][0-9]{3}\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-/]+/g, ' ');

  return value.trim().replace(/\s+/g, ' ');
}

export function splitSokratesName(cleanName: string): { nachname: string; vorname: string } {
  if (!cleanName) return { nachname: '', vorname: '' };
  if (cleanName.includes(',')) {
    const parts = cleanName.split(',').map(part => part.trim()).filter(Boolean);
    return {
      nachname: parts.shift() || '',
      vorname: parts.join(' '),
    };
  }

  const tokens = cleanName.split(/\s+/).map(token => token.trim()).filter(Boolean);
  if (tokens.length === 0) return { nachname: '', vorname: '' };
  if (tokens.length === 1) return { nachname: tokens[0], vorname: '' };

  // Austrian Sokrates exports use surname first. Preserve all remaining given-name tokens
  // instead of guessing gender or reordering names from a name dictionary.
  return {
    nachname: tokens[0],
    vorname: tokens.slice(1).join(' '),
  };
}

export function extractPhoneNumbersFromText(text: string): { telefon_mutter: string; telefon_vater: string } {
  let telefon_mutter = '';
  let telefon_vater = '';

  const mother = text.match(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Obs(?:orge)?\s*1)|Mutter\s*Tel)[:\s]*([+0-9][0-9\s/()\-]*)/i);
  if (mother) telefon_mutter = cleanSokratesPhoneNumber(mother[1].split(/(?:Vater|Papa|Obs|Tel|Mail|[a-zA-ZäöüÄÖÜ]|\n)/)[0]);

  const father = text.match(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Vater|Papa|Obs(?:orge)?\s*2)|Vater\s*Tel)[:\s]*([+0-9][0-9\s/()\-]*)/i);
  if (father) telefon_vater = cleanSokratesPhoneNumber(father[1].split(/(?:Mutter|Mama|Obs|Tel|Mail|[a-zA-ZäöüÄÖÜ]|\n)/)[0]);

  if (!telefon_mutter && !telefon_vater) {
    const all = text.match(/(?:\+43|0043|06[56789][0-9]|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g) || [];
    if (all[0]) telefon_mutter = cleanSokratesPhoneNumber(all[0]);
    if (all[1]) telefon_vater = cleanSokratesPhoneNumber(all[1]);
  }

  return { telefon_mutter, telefon_vater };
}

export function extractContactAndAddress(
  rawInput: string | string[] | Array<{ text: string; x?: number; y?: number }>,
): SokratesContactData {
  let lines: string[];
  if (Array.isArray(rawInput)) {
    if (rawInput.length > 0 && typeof rawInput[0] === 'object') {
      const items = [...(rawInput as Array<{ text: string; x?: number; y?: number }>)]
        .sort((a, b) => (b.y ?? 0) - (a.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
      const grouped = new Map<number, string[]>();
      for (const item of items) {
        const key = Math.round((item.y ?? 0) / 4) * 4;
        grouped.set(key, [...(grouped.get(key) || []), item.text]);
      }
      lines = [...grouped.entries()].sort((a,b)=>b[0]-a[0]).map(([, values]) => values.join(' '));
    } else {
      lines = rawInput as string[];
    }
  } else {
    lines = rawInput.split(/\r?\n/);
  }

  lines = lines
    .map(line => line.replace(/\b(?:Adressdaten|Adresse|Wohnadresse|Wohnort|Telefon|Tel\.?|Telefonnummer|Erziehungsberechtigte|Notfallkontakt|Kontaktdaten)\b[:\s]*/gi, ' ').trim())
    .filter(Boolean);

  const fullText = lines.join(' ');
  const { telefon_mutter, telefon_vater } = extractPhoneNumbersFromText(fullText);
  const textWithoutPhones = fullText
    .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Obs(?:orge)?\s*1)|Mutter\s*Tel)[:\s]*/gi, ' ')
    .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Vater|Papa|Obs(?:orge)?\s*2)|Vater\s*Tel)[:\s]*/gi, ' ')
    .replace(/(?:\+43|0043|06[56789][0-9]|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let plz = '';
  let ort = '';
  let anschrift = '';

  const plzOrt = textWithoutPhones.match(/\b([1-9][0-9]{3})\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-/]+(?:\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-/]+)*?)(?=\s+(?:Mutter|Vater|Mama|Papa|Tel|Telefon|Obsorge|\+43|0043|06)|$|,|;)/);
  if (plzOrt) {
    plz = plzOrt[1];
    ort = plzOrt[2].trim();
  }

  const street = textWithoutPhones.match(/\b(?:(?:Am|Im|In der|Auf der|Beim|Zum)\s+)?[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ0-9.\- ]*?(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|rain|ried|dorf|anger|siedlung|hof|feld|steig|promenade|berg|graben|tal)\s+[0-9]+[a-zA-Z]?(?:\s*(?:Top|Tür|Stiege|Stg\.?)\s*[0-9]+[a-zA-Z]*)?\b/i);
  if (street) anschrift = street[0].trim();

  return { anschrift, plz, ort, telefon_mutter, telefon_vater };
}
