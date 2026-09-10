import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const ARBEITSVERHALTEN_TEST: DiagnosticTestDefinition = {
  id: 'arbeitsverhalten-check',
  title: 'Arbeitsverhalten & Selbstständigkeit',
  subtitle: 'Arbeitsbeginn, Selbstständigkeit, Ausdauer, Materialorganisation & Fehlerkultur',
  domainId: 'sozial-lernen',
  competencyAreaId: 'sl-verhalten',
  competencyIds: ['sl-arbeitsverhalten'],
  mode: 'observation',
  description:
    'Strukturierte pädagogische Beobachtung von Arbeitsbeginn, Selbstständigkeit, Ausdauer, Materialorganisation und Fehlerkultur im Unterrichtsalltag. Kein klinischer Test, sondern eine beobachtungsbasierte Standortbestimmung mit konkreten Fördermöglichkeiten.',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Grundlegende Arbeitsstrukturen (Konkrete Alltagssituationen)
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1: Grundlegende Arbeitsstrukturen',
      description: 'Arbeitsbeginn, Arbeitsplatzordnung, Durchhalten bei kurzen Aufgaben und Reaktion auf Fehler.',
      tasks: [
        {
          id: 'av-n1-t1',
          title: 'Arbeitsbeginn nach Aufgabenstellung',
          instruction: 'Beobachte das Kind nach der gemeinsamen Einführung / Aufgabenstellung in einer Einzelarbeitsphase.',
          prompt: 'Wie gelingt dem Kind der Start in die eigenständige Arbeitsphase?',
          type: 'choice',
          aspect: 'behavior_start',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Arbeitsbeginn & Selbstständigkeit',
              aspectTitle: 'Arbeitsbeginn',
              aspectCategory: 'arbeitsbeginn',
              contextPrompt: 'Nachdem der Arbeitsauftrag für die Klasse erläutert wurde, beginnen die Kinder mit der Bearbeitung.',
              settingExample: 'Einführung einer Übungsaufgabe im Mathematik- oder Deutschunterricht',
              criteria: [
                {
                  id: 'crit-start',
                  label: 'Startverhalten',
                  positiveSignal: 'Nimmt Arbeitsmittel zur Hand und beginnt innerhalb von 1–2 Minuten eigenständig',
                  cautionSignal: 'Bleibt passiv sitzen, schaut umher oder benötigt wiederholte persönliche Ansprache',
                },
                {
                  id: 'crit-verstaendnis',
                  label: 'Auftragsverständnis',
                  positiveSignal: 'Weiß sofort, was zu tun ist, oder frägt gezielt einmal nach',
                  cautionSignal: 'Beginnt mit der falschen Aufgabe oder weiß nicht, welches Heft/Buch aufzuschlagen ist',
                },
              ],
              reflectionQuestions: [
                'Welche Art von Impuls benötigt das Kind (visuelle Tafelorientierung, kurze persönliche Erinnerung)?',
                'Beginnt das Kind zügiger bei vertrauten Routineformaten?',
              ],
            },
          },
          options: [
            { label: 'Beginnt zügig und selbstständig nach Erklärung', value: 'independent', isCorrect: true, strategyTag: 'starts_independently' },
            { label: 'Benötigt kurzen Orientierungsimpuls / Erinnerung', value: 'prompted', isCorrect: true, strategyTag: 'needs_prompting' },
            { label: 'Zögert lange, wirkt orientierungslos oder vermeidend', value: 'hesitant', isCorrect: false, strategyTag: 'needs_prompting' },
          ],
          defaultObservationTags: ['starts_independently', 'needs_prompting', 'plans_steps_ahead', 'acts_impulsively'],
        },
        {
          id: 'av-n1-t2',
          title: 'Materialorganisation & Arbeitsplatz',
          instruction: 'Beobachte, wie das Kind seinen Arbeitsplatz einrichtet und mit Stiften, Heften und Lineal umgeht.',
          prompt: 'Wie strukturiert das Kind seine Arbeitsmaterialien am Platz?',
          type: 'choice',
          aspect: 'behavior_organization',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Materialorganisation & Arbeitsplatzstruktur',
              aspectTitle: 'Organisation',
              aspectCategory: 'organisation',
              contextPrompt: 'Bereitlegen von Schulheft, Buch, Mäppchen und benötigten Utensilien (z. B. Lineal, Kleber).',
              settingExample: 'Unterrichtsbeginn oder Wechsel zwischen Fächern',
              criteria: [
                {
                  id: 'crit-materials',
                  label: 'Griffbereitschaft',
                  positiveSignal: 'Hat die nötigen Arbeitsmaterialien schnell zur Hand und pflegt Ordnung',
                  cautionSignal: 'Längere Suchphasen im Ranzen/Fach, vergisst oder verliert Utensilien häufig',
                },
                {
                  id: 'crit-desk',
                  label: 'Tischübersicht',
                  positiveSignal: 'Arbeitsfläche ist übersichtlich; nur aktuelle Materialien liegen bereit',
                  cautionSignal: 'Tisch ist überladen; Gegenstände fallen herunter oder lenken ab',
                },
              ],
              reflectionQuestions: [
                'Helfen dem Kind feste Ablageorte oder Bildkarten für benötigtes Material?',
              ],
            },
          },
          options: [
            { label: 'Übersichtlich, Materialien schnell griffbereit', value: 'organized', isCorrect: true, strategyTag: 'organized_workplace' },
            { label: 'Braucht gelegentlich Hilfestellung beim Finden', value: 'partially_organized', isCorrect: true, strategyTag: 'organized_workplace' },
            { label: 'Häufig unübersichtlich, verliert viel Zeit mit Suchen', value: 'disorganized', isCorrect: false, strategyTag: 'messy_workplace' },
          ],
          defaultObservationTags: ['organized_workplace', 'messy_workplace', 'starts_independently'],
        },
        {
          id: 'av-n1-t3',
          title: 'Ausdauer & Konzentrationsfähigkeit',
          instruction: 'Beobachte die Ausdauer während einer 10- bis 15-minütigen Stillarbeitsphase.',
          prompt: 'Wie gelingt es dem Kind, kontinuierlich an der Aufgabe dranzubleiben?',
          type: 'choice',
          aspect: 'behavior_endurance',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Ausdauer & Umgang mit Ablenkung',
              aspectTitle: 'Ausdauer',
              aspectCategory: 'ausdauer',
              contextPrompt: 'Eigenständiges Ausfüllen eines Arbeitsblattes oder Rechnen mehrerer Übungsaufgaben.',
              settingExample: '15 Minuten Stillarbeit im Unterricht',
              criteria: [
                {
                  id: 'crit-focus',
                  label: 'Fokus',
                  positiveSignal: 'Bleibt über die gesamte Phase hinweg bei der Aufgabe; schließt Teilschritte ab',
                  cautionSignal: 'Lässt sich durch Flurgeräusche, Mitschüler oder eigenes Spielzeug schnell ablenken',
                },
                {
                  id: 'crit-pacing',
                  label: 'Arbeitstempo',
                  positiveSignal: 'Arbeitet in angemessenem, gleichmäßigem Tempo ohne Hetze',
                  cautionSignal: 'Himmelt viel, arbeitet sehr schleppend oder eilt flüchtig durch die Aufgaben',
                },
              ],
            },
          },
          options: [
            { label: 'Bleibt kontinuierlich fokussiert und ausdauernd', value: 'focused', isCorrect: true, strategyTag: 'stays_on_task' },
            { label: 'Arbeitet phasenweise gut, lässt sich aber leicht ablenken', value: 'partially_focused', isCorrect: true, strategyTag: 'easily_distracted' },
            { label: 'Bricht nach wenigen Minuten ab / benötigt dauernde Re-Fokussierung', value: 'distracted', isCorrect: false, strategyTag: 'easily_distracted' },
          ],
          defaultObservationTags: ['stays_on_task', 'easily_distracted', 'rushes_through', 'works_too_slowly'],
        },
        {
          id: 'av-n1-t4',
          title: 'Fehlerkultur & Frustrationstoleranz',
          instruction: 'Beobachte die Reaktion des Kindes, wenn ein Fehler auftritt oder ein Rechenweg nicht sofort klappt.',
          prompt: 'Wie reagiert das Kind auf Fehler oder Schwierigkeiten?',
          type: 'choice',
          aspect: 'behavior_errors',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Fehlerkultur & Umgang mit Frustration',
              aspectTitle: 'Fehlerkultur',
              aspectCategory: 'fehlerkultur',
              contextPrompt: 'Das Kind bemerkt einen Rechenfehler oder wird von der Lehrkraft freundlich auf eine Korrektur hingewiesen.',
              settingExample: 'Korrekturphase oder Zwischenkontrolle',
              criteria: [
                {
                  id: 'crit-correction',
                  label: 'Korrekturbereitschaft',
                  positiveSignal: 'Radiert ruhig, probiert einen alternativen Weg oder frägt nach Hinweisen',
                  cautionSignal: 'Wird sofort wütend, streicht wütend durch, zerreißt Papier oder verweigert Weiterarbeit',
                },
              ],
            },
          },
          options: [
            { label: 'Konstruktiv: radiert ruhig und versucht es erneut', value: 'constructive', isCorrect: true, strategyTag: 'persistent_with_errors' },
            { label: 'Braucht Ermutigung, lässt sich dann aber wieder motivieren', value: 'encouraged', isCorrect: true, strategyTag: 'persistent_with_errors' },
            { label: 'Gibt schnell auf, zeigt Frustration oder Rückzug', value: 'frustrated', isCorrect: false, strategyTag: 'gives_up_easily' },
          ],
          defaultObservationTags: ['persistent_with_errors', 'gives_up_easily', 'asks_for_help_constructively', 'avoids_asking_help'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Offene Lernphasen & Hilfesuche (Wochenplan, Werkstatt)
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2: Offene Lernphasen & Werkstattarbeit',
      description: 'Selbstorganisation in offenen Formaten, gezielte Hilfesuche und systematische Selbstkontrolle.',
      tasks: [
        {
          id: 'av-n2-t1',
          title: 'Eigenständige Aufgabenauswahl im Wochenplan',
          instruction: 'Beobachte, wie das Kind eine Aufgabe aus dem Wochenplan oder der Stationenarbeit auswählt.',
          prompt: 'Wählt das Kind zielgerichtet aus und holt eigenständig das Material?',
          type: 'choice',
          aspect: 'behavior_start',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Eigenständige Arbeitsorganisation',
              aspectTitle: 'Selbstständigkeit',
              aspectCategory: 'selbststaendigkeit',
              contextPrompt: 'Das Kind entscheidet über die Reihenfolge der Pflicht- und Wahlaufgaben im Wochenplan.',
              settingExample: 'Freiarbeit oder Wochenplan-Stunde',
              criteria: [
                {
                  id: 'crit-choice',
                  label: 'Auswahl & Start',
                  positiveSignal: 'Wählt planvoll aus, holt Material zügig und trägt erledigte Aufgaben verlässlich ein',
                  cautionSignal: 'Steht unentschlossen am Regal, wandert im Raum umher oder schließt keine Aufgabe ab',
                },
              ],
            },
          },
          options: [
            { label: 'Wählt zielstrebig aus und arbeitet eigenständig ab', value: 'self_directed', isCorrect: true, strategyTag: 'plans_steps_ahead' },
            { label: 'Wählt nach kurzem Zögern; benötigt gelegentlich Bestätigung', value: 'needs_confirmation', isCorrect: true, strategyTag: 'starts_independently' },
            { label: 'Verliert sich in offenen Phasen; wechselt Aufgaben ohne Abschluss', value: 'disoriented', isCorrect: false, strategyTag: 'acts_impulsively' },
          ],
          defaultObservationTags: ['plans_steps_ahead', 'starts_independently', 'acts_impulsively', 'easily_distracted'],
        },
        {
          id: 'av-n2-t2',
          title: 'Art und Weise der Hilfesuche',
          instruction: 'Beobachte, wie das Kind vorgeht, wenn es nicht weiterweiß.',
          prompt: 'Wie äußert das Kind Hilfebedarf bei schwierigen Schritten?',
          type: 'choice',
          aspect: 'behavior_help',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Gezielte Hilfesuche',
              aspectTitle: 'Selbstständigkeit',
              aspectCategory: 'selbststaendigkeit',
              contextPrompt: 'Eine Aufgabe ist herausfordernd; das Kind benötigt Unterstützung.',
              settingExample: 'Einzel- oder Partnerarbeit',
              criteria: [
                {
                  id: 'crit-help',
                  label: 'Hilfeverhalten',
                  positiveSignal: 'Überlegt zuerst selbst, nutzt Hilfekarten oder meldet sich ruhig / frägt Tischnachbarn leise',
                  cautionSignal: 'Ruft laut durch die Klasse, wartet passiv ohne sich zu melden oder gibt Aufgabe sofort auf',
                },
              ],
            },
          },
          options: [
            { label: 'Überlegt zuerst selbst, fragt dann gezielt und höflich nach', value: 'constructive_help', isCorrect: true, strategyTag: 'asks_for_help_constructively' },
            { label: 'Fragt sehr schnell nach Hilfe, bevor es selbst probiert', value: 'quick_help', isCorrect: true, strategyTag: 'needs_prompting' },
            { label: 'Fragt gar nicht nach (vermeidet) oder ruft ungeduldig dazwischen', value: 'inappropriate_help', isCorrect: false, strategyTag: 'avoids_asking_help' },
          ],
          defaultObservationTags: ['asks_for_help_constructively', 'avoids_asking_help', 'needs_prompting'],
        },
        {
          id: 'av-n2-t3',
          title: 'Nutzung von Selbstkontroll-Möglichkeiten',
          instruction: 'Beobachte das Kind an der Lösungsstation oder bei Lösungsstreifen.',
          prompt: 'Wie gewissenhaft führt das Kind die Selbstkontrolle durch?',
          type: 'choice',
          aspect: 'behavior_control',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Selbstkontrolle & Sorgfalt',
              aspectTitle: 'Fehlerkultur',
              aspectCategory: 'fehlerkultur',
              contextPrompt: 'Abgleich der eigenen Ergebnisse mit der Kontrollkarte am Pult oder an der Wand.',
              settingExample: 'Abschluss einer Stationsübung',
              criteria: [
                {
                  id: 'crit-selfcheck',
                  label: 'Selbstkontrolle',
                  positiveSignal: 'Gleicht aufmerksam Eintrag für Eintrag ab und hakt verlässlich ab',
                  cautionSignal: 'Hakt ungesehen ab oder schreibt blind von der Lösungskarte ab',
                },
              ],
            },
          },
          options: [
            { label: 'Gleicht sorgfältig ab und korrigiert Abweichungen eigenständig', value: 'diligent', isCorrect: true, strategyTag: 'reflects_own_work' },
            { label: 'Kontrolliert grob; übersieht einzelne Fehler', value: 'superficial', isCorrect: true, strategyTag: 'rushes_through' },
            { label: 'Ignoriert Selbstkontrolle oder hakt ohne Prüfung ab', value: 'ignored', isCorrect: false, strategyTag: 'ignores_mistakes' },
          ],
          defaultObservationTags: ['reflects_own_work', 'ignores_mistakes', 'rushes_through', 'persistent_with_errors'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Selbstregulierung & Zeitmanagement bei komplexen Aufträgen
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3: Selbstregulierung & Zeitmanagement',
      description: 'Zeitmanagement, Fokussierung trotz Umgebungsreizen und selbstständige Arbeitsplanung.',
      tasks: [
        {
          id: 'av-n3-t1',
          title: 'Zeiteinteilung bei mehrteiligen Aufträgen',
          instruction: 'Beobachte, wie das Kind die verfügbare Zeit (z. B. 30 Minuten für 3 Teilaufgaben) im Blick behält.',
          prompt: 'Wie teilt sich das Kind die Arbeitszeit bei längeren Phasen ein?',
          type: 'choice',
          aspect: 'behavior_time',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Zeitmanagement & Arbeitseinteilung',
              aspectTitle: 'Zeitmanagement',
              aspectCategory: 'tempo_fokus',
              contextPrompt: 'Mehrschrittige Aufgabe mit Zeitvorgabe (z. B. Lesetext lesen + Fragen beantworten + Bild zeichnen).',
              settingExample: 'Klassenarbeit oder vertiefte Wochenplanarbeit',
              criteria: [
                {
                  id: 'crit-time',
                  label: 'Zeitempfinden',
                  positiveSignal: 'Behält den Zeitrahmen (Sanduhr/Klassenuhr) im Blick und wird rechtzeitig fertig',
                  cautionSignal: 'Verzettelt sich an Details (malt 25 Min. am ersten Buchstaben) oder hetzt in 5 Min. durch',
                },
              ],
            },
          },
          options: [
            { label: 'Gute Zeiteinteilung, wird mit allen Teilen fertig', value: 'well_timed', isCorrect: true, strategyTag: 'manages_time_well' },
            { label: 'Braucht gelegentliche Zwischenansage zur Restzeit', value: 'needs_time_reminder', isCorrect: true, strategyTag: 'manages_time_well' },
            { label: 'Verliert sich völlig in Details oder hetzt unüberlegt durch', value: 'poor_timing', isCorrect: false, strategyTag: 'rushes_through' },
          ],
          defaultObservationTags: ['manages_time_well', 'rushes_through', 'works_too_slowly', 'plans_steps_ahead'],
        },
        {
          id: 'av-n3-t2',
          title: 'Arbeitshaltung bei erhöhtem Geräuschpegel',
          instruction: 'Beobachte, wie das Kind arbeitet, wenn im Raum Bewegung oder leise Partnergespräche stattfinden.',
          prompt: 'Kann das Kind seinen Fokus bei normalem Klassengeräuschpegel aufrechterhalten?',
          type: 'choice',
          aspect: 'behavior_focus',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Fokus & Reizabschirmung',
              aspectTitle: 'Fokus',
              aspectCategory: 'tempo_fokus',
              contextPrompt: 'Freie Arbeitsphase, in der manche Kinder im Flur arbeiten oder sich leise austauschen.',
              settingExample: 'Offener Unterricht',
              criteria: [
                {
                  id: 'crit-shielding',
                  label: 'Reizabschirmung',
                  positiveSignal: 'Lässt sich von Nebenaktivitäten nicht beirren; nutzt bei Bedarf Kopfhörer/Sichtschutz',
                  cautionSignal: 'Verfolgt jedes Gespräch im Raum; bricht eigene Arbeit sofort ab',
                },
              ],
            },
          },
          options: [
            { label: 'Sehr stabil; schirmt sich selbstständig gut ab', value: 'shielded', isCorrect: true, strategyTag: 'stays_on_task' },
            { label: 'Mit Hilfsmitteln (Kopfhörer/Ruheplatz) konzentriert', value: 'assisted_focus', isCorrect: true, strategyTag: 'stays_on_task' },
            { label: 'Schnell abgelenkt durch Nebengeräusche und Bewegungen', value: 'unshielded', isCorrect: false, strategyTag: 'easily_distracted' },
          ],
          defaultObservationTags: ['stays_on_task', 'easily_distracted', 'plans_steps_ahead'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Eigenverantwortung & Transfer auf neue Lernformate
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4: Hohe Eigenverantwortung & Transfer',
      description: 'Selbstständige Strukturierung komplexer Projekte, eigene Qualitätsprüfung vor Abgabe.',
      tasks: [
        {
          id: 'av-n4-t1',
          title: 'Qualitätskontrolle eigener Arbeiten vor Abgabe',
          instruction: 'Beobachte, ob das Kind seine Arbeit vor der Abgabe noch einmal kritisch durchliest / überprüft.',
          prompt: 'Prüft das Kind selbstständig Vollständigkeit und Qualität der Arbeit?',
          type: 'choice',
          aspect: 'behavior_quality',
          competencyId: 'sl-arbeitsverhalten',
          visual: {
            type: 'behavior_observation',
            behaviorObservation: {
              title: 'Eigenständige Qualitätsprüfung',
              aspectTitle: 'Fehlerkultur',
              aspectCategory: 'fehlerkultur',
              contextPrompt: 'Das Kind hat einen eigenen Text geschrieben oder ein Mathe-Plakat gestaltet.',
              settingExample: 'Projektarbeit oder Aufsatzstunde',
              criteria: [
                {
                  id: 'crit-quality',
                  label: 'Kriterienabgleich',
                  positiveSignal: 'Liest den Text nochmals mit Checkliste Korrektur, prüft Satzanfänge und Punkte eigenständig',
                  cautionSignal: 'Gibt die Arbeit sofort nach dem letzten Wort ungelesen ab („Ich bin fertig!“)',
                },
              ],
            },
          },
          options: [
            { label: 'Prüft selbstständig gründlich anhand von Kriterien nach', value: 'thorough_check', isCorrect: true, strategyTag: 'reflects_own_work' },
            { label: 'Überfliegt kurz; reagiert gut auf den Hinweis „Schau noch einmal drauf“', value: 'quick_check', isCorrect: true, strategyTag: 'reflects_own_work' },
            { label: 'Gibt unbesehen ab; lehnt nochmaliges Durchsehen eher ab', value: 'no_check', isCorrect: false, strategyTag: 'rushes_through' },
          ],
          defaultObservationTags: ['reflects_own_work', 'rushes_through', 'persistent_with_errors'],
        },
      ],
    },
  ],
};
