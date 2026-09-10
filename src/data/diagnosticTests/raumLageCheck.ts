import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const RAUM_LAGE_TEST: DiagnosticTestDefinition = {
  id: 'raum-lage-check',
  title: 'Raum-Lage-Orientierung',
  subtitle: 'Lagebegriffe, Links-Rechts-Zuordnung, Rasterorientierung & Drehung/Spiegelung',
  domainId: 'lernvoraussetzungen',
  competencyAreaId: 'lv-wahrnehmung-raum',
  competencyIds: ['lv-raum-lage'],
  mode: 'oneToOne',
  description:
    'Schulischer 1:1-Check zur räumlichen Orientierung, Beherrschung von Richtungsbegriffen (oben/unten, links/rechts), Orientierung im Raster und mentaler Rotation (geometrische Vorläuferfähigkeiten).',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Basale Lagebegriffe (Oben, Unten, Mitte)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1 (Oben / Unten / Mitte im 3x3-Raster)',
      description: 'Erkennen von Positionen (oben, unten, mittig) im überschaubaren Raster.',
      tasks: [
        {
          id: 'rl-n1-t1',
          title: 'Position im Raster bestimmen: Oben in der Mitte',
          instruction: 'Zeige das 3x3-Feld und frage: „Welches Tier steht ganz oben in der Mitte?“',
          type: 'choice',
          aspect: 'spatial_directions',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_grid',
            spatialGrid: {
              gridSize: 3,
              cells: [
                ['🐱', '🐶', '🐰'],
                ['🦊', '🐻', '🐼'],
                ['🐸', '🦁', '🐵'],
              ],
              directionPrompt: 'Welches Tier steht ganz oben in der Mitte?',
              highlightPosition: { row: 0, col: 1 },
            },
          },
          options: [
            { label: 'Nennt sofort den Hund 🐶 (oben Mitte)', value: 'secure', isCorrect: true, strategyTag: 'spatial_relation_secure' },
            { label: 'Zeigt auf die richtige Stelle, zögert beim Benennen', value: 'hesitant_correct', isCorrect: true, strategyTag: 'uses_reference_point' },
            { label: 'Verwechselt oben mit unten oder links mit Mitte', value: 'confused', isCorrect: false, strategyTag: 'confuses_left_right' },
          ],
          defaultObservationTags: ['spatial_relation_secure', 'uses_reference_point', 'confuses_left_right'],
        },
        {
          id: 'rl-n1-t2',
          title: 'Unten links finden',
          instruction: 'Frage: „Tippe auf das Tier, das ganz unten links sitzt.“ (Frosch 🐸)',
          type: 'choice',
          aspect: 'spatial_directions',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_grid',
            spatialGrid: {
              gridSize: 3,
              cells: [
                ['🐱', '🐶', '🐰'],
                ['🦊', '🐻', '🐼'],
                ['🐸', '🦁', '🐵'],
              ],
              directionPrompt: 'Finde das Tier unten links (🐸)',
              highlightPosition: { row: 2, col: 0 },
            },
          },
          options: [
            { label: 'Tippt direkt auf den Frosch 🐸 (unten links)', value: 'secure', isCorrect: true, strategyTag: 'left_right_secure' },
            { label: 'Tippt erst rechts unten (Affe 🐵) und korrigiert dann auf links', value: 'self_correct', isCorrect: true, strategyTag: 'uses_reference_point' },
            { label: 'Tippt oben links (Katze) oder unten rechts (Affe)', value: 'confused', isCorrect: false, strategyTag: 'confuses_left_right' },
          ],
          defaultObservationTags: ['left_right_secure', 'spatial_relation_secure', 'confuses_left_right'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Links-Rechts-Differenzierung & relative Positionen
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2 (Links-Rechts & relative Lagebeziehungen)',
      description: 'Sichere Unterscheidung von Links und Rechts auf der Bildebene.',
      tasks: [
        {
          id: 'rl-n2-t1',
          title: 'Blickrichtung bestimmen: Schaut nach links oder rechts?',
          instruction: 'Zeige dem Kind die Pfeile/Figuren: „In welche Richtung fährt dieses Auto / zeigt dieser Pfeil?“ (nach links ⬅️)',
          type: 'choice',
          aspect: 'spatial_left_right',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_rotation',
            spatialRotation: {
              shapeType: 'arrow',
              leftContent: '⬅️',
              rightContent: '➡️',
              transformation: 'mirrored',
              questionText: 'Welcher Pfeil zeigt nach LINKS?',
            },
          },
          options: [
            { label: 'Benennt links und rechts spontan und fehlerfrei', value: 'secure', isCorrect: true, strategyTag: 'left_right_secure' },
            { label: 'Nutzt eigene Schreibhand zur Orientierung und antwortet richtig', value: 'body_anchor_correct', isCorrect: true, strategyTag: 'uses_reference_point' },
            { label: 'Verwechselt links und rechts', value: 'confused', isCorrect: false, strategyTag: 'confuses_left_right' },
          ],
          defaultObservationTags: ['left_right_secure', 'uses_reference_point', 'confuses_left_right', 'needs_physical_orientation'],
        },
        {
          id: 'rl-n2-t2',
          title: 'Relative Lage im 3x3-Gitter: „Steht rechts neben dem Bären“',
          instruction: 'Frage: „Schau dir den Bären 🐻 in der Mitte an. Welches Tier steht genau RECHTS neben dem Bären?“ (Panda 🐼)',
          type: 'choice',
          aspect: 'spatial_relations',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_grid',
            spatialGrid: {
              gridSize: 3,
              cells: [
                ['🐱', '🐶', '🐰'],
                ['🦊', '🐻', '🐼'],
                ['🐸', '🦁', '🐵'],
              ],
              directionPrompt: 'Welches Tier steht RECHTS neben dem Bären 🐻?',
              highlightPosition: { row: 1, col: 2 },
            },
          },
          options: [
            { label: 'Nennt sofort den Panda 🐼 (rechts neben dem Bären)', value: 'secure', isCorrect: true, strategyTag: 'spatial_relation_secure' },
            { label: 'Schaut kurz auf beide Seiten und wählt dann rechts', value: 'slow_correct', isCorrect: true, strategyTag: 'left_right_secure' },
            { label: 'Nennt den Fuchs 🦊 (links neben dem Bären)', value: 'left_side_chosen', isCorrect: false, strategyTag: 'confuses_left_right' },
          ],
          defaultObservationTags: ['spatial_relation_secure', 'left_right_secure', 'confuses_left_right'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Mentale Rotation (90° / 180° Drehung)
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3 (Mentale Rotation 90° & 180°)',
      description: 'Erkennen von gedrehten Figuren ohne reales Drehen des Blattes.',
      tasks: [
        {
          id: 'rl-n3-t1',
          title: 'Gedrehte L-Figur (90° nach rechts gedreht)',
          instruction: 'Sage dem Kind: „Schau dir die Figur links an. Welche der beiden Figuren rechts ist genau die gleiche Figur, nur gedreht?“',
          type: 'choice',
          aspect: 'spatial_rotation',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_rotation',
            spatialRotation: {
              shapeType: 'geometric',
              leftContent: '▛',
              rightContent: '▜',
              transformation: 'rotated_90',
              questionText: 'Vergleiche: Ist die rechte Figur gedreht oder gespiegelt?',
            },
          },
          options: [
            { label: 'Erkennt die 90°-Drehung im Kopf sicher', value: 'secure', isCorrect: true, strategyTag: 'rotation_secure' },
            { label: 'Dreht Kopf / Finger leicht mit und löst dann richtig', value: 'motor_assist_correct', isCorrect: true, strategyTag: 'needs_physical_orientation' },
            { label: 'Kann Drehung und Spiegelung nicht unterscheiden', value: 'confused', isCorrect: false, strategyTag: 'confuses_rotation' },
          ],
          defaultObservationTags: ['rotation_secure', 'needs_physical_orientation', 'confuses_rotation'],
        },
        {
          id: 'rl-n3-t2',
          title: '180°-Drehung (Auf dem Kopf stehende Figur)',
          instruction: 'Frage: „Steht die zweite Figur auf dem Kopf (180° gedreht) oder ist sie gespiegelt?“',
          type: 'choice',
          aspect: 'spatial_rotation',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_rotation',
            spatialRotation: {
              shapeType: 'letter_like',
              leftContent: '🔺',
              rightContent: '🔻',
              transformation: 'rotated_180',
              questionText: 'Welche Drehung liegt hier vor?',
            },
          },
          options: [
            { label: 'Erkennt die 180°-Drehung / Umkehrung sofort', value: 'secure', isCorrect: true, strategyTag: 'rotation_secure' },
            { label: 'Benötigt kurze Überlegungszeit, löst richtig', value: 'hesitant_correct', isCorrect: true, strategyTag: 'spatial_relation_secure' },
            { label: 'Unsicher bei der Unterscheidung von Drehung & Spiegelung', value: 'confused', isCorrect: false, strategyTag: 'confuses_rotation' },
          ],
          defaultObservationTags: ['rotation_secure', 'spatial_relation_secure', 'confuses_rotation'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Diagnostische Vertiefung (Spiegelachsen & Mehrfach-Raster)
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4 (Diagnostische Vertiefung & Spiegelachsen)',
      description: 'Unterscheidung von Spiegelachsen (senkrecht vs. waagerecht) und komplexen Rasterwegen.',
      tasks: [
        {
          id: 'rl-n4-t1',
          title: 'Spiegelung an der senkrechten Achse (Spiegelbild erkennen)',
          instruction: 'Aufgabe: „Welche Figur ist das echte Spiegelbild (wie im Spiegel)?“',
          type: 'choice',
          aspect: 'spatial_rotation',
          competencyId: 'lv-raum-lage',
          visual: {
            type: 'spatial_rotation',
            spatialRotation: {
              shapeType: 'complex',
              leftContent: '🫱 🪞',
              rightContent: '🫲',
              transformation: 'mirrored',
              questionText: 'Erkenne die Achsenspiegelung:',
            },
          },
          options: [
            { label: 'Erkennt Spiegelachsen sicher und begründet schlüssig', value: 'secure', isCorrect: true, strategyTag: 'rotation_secure' },
            { label: 'Findet das Spiegelbild nach einigem Nachdenken', value: 'hesitant_correct', isCorrect: true, strategyTag: 'uses_reference_point' },
            { label: 'Verwechselt Spiegelung mit einfacher Drehung', value: 'confused', isCorrect: false, strategyTag: 'confuses_rotation' },
          ],
          defaultObservationTags: ['rotation_secure', 'uses_reference_point', 'confuses_rotation', 'left_right_secure'],
        },
      ],
    },
  ],
};
