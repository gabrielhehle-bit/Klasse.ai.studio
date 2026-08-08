import { AppState, MaterialItem, VertretungsStundenbild } from '../types';

export function migrateStundenbilderToMaterialien(app: AppState): MaterialItem[] {
  if (!app.vertretungsStundenbilder || app.vertretungsStundenbilder.length === 0) return app.materialien || [];

  const existingMaterialien = app.materialien || [];
  const existingIds = new Set(existingMaterialien.filter(m => m.typ === 'stundenentwurf').map(m => m.id));

  const newMaterialien: MaterialItem[] = app.vertretungsStundenbilder
    .filter(sb => !existingIds.has(sb.id))
    .map(sb => ({
      id: sb.id,
      titel: sb.titel,
      beschreibung: sb.beschreibung,
      typ: 'stundenentwurf',
      inhaltText: `Lernziel: ${sb.lernziel}\n\nMaterial: ${sb.benoetigtesMaterial.join(', ')}\n\nAblauf:\n${sb.beschreibung}`,
      // Zusätzliche Felder für den Erhalt der Funktionalität
      dauer: sb.dauer,
      schwierigkeit: sb.schwierigkeit,
      lernziel: sb.lernziel,
      benoetigtesMaterial: sb.benoetigtesMaterial,
      istEigeneVorlage: sb.istEigeneVorlage,
      faecher: [sb.fach],
      schulstufen: sb.schulstufen,
      tags: [...sb.tags, 'aus Stundenbild-Sammlung'],
      erstelltAm: sb.erstelltAm,
      zuletztVerwendet: sb.zuletztVerwendet,
      favorit: false,
      kiGeneriert: false,
      quelleModul: 'uebergabemappe'
    }));

  return [...existingMaterialien, ...newMaterialien];
}

export function createMaterialItemFromStundenbild(sb: VertretungsStundenbild): MaterialItem {
  return {
    id: sb.id,
    titel: sb.titel,
    beschreibung: sb.beschreibung,
    typ: 'stundenentwurf',
    inhaltText: `Lernziel: ${sb.lernziel}\n\nMaterial: ${sb.benoetigtesMaterial.join(', ')}\n\nAblauf:\n${sb.beschreibung}`,
    // Zusätzliche Felder
    dauer: sb.dauer,
    schwierigkeit: sb.schwierigkeit,
    lernziel: sb.lernziel,
    benoetigtesMaterial: sb.benoetigtesMaterial,
    istEigeneVorlage: sb.istEigeneVorlage,
    faecher: [sb.fach],
    schulstufen: sb.schulstufen,
    tags: sb.tags,
    erstelltAm: sb.erstelltAm,
    zuletztVerwendet: sb.zuletztVerwendet,
    favorit: false,
    kiGeneriert: !!sb.id.includes('custom'),
    quelleModul: 'uebergabemappe'
  };
}
