import { DiagnosticTestDefinition } from '../../types/diagnosticCore';

export const SOZIALVERHALTEN_TEST: DiagnosticTestDefinition = {
  id: 'sozialverhalten-check',
  title: 'Sozialverhalten & Kooperation',
  subtitle: 'Zusammenarbeit, Gesprächsregeln, Perspektivübernahme & Konfliktbewältigung',
  domainId: 'sozial-lernen',
  competencyAreaId: 'sl-verhalten',
  competencyIds: ['sl-sozialverhalten'],
  mode: 'observation',
  description:
    'Strukturierte pädagogische Beobachtung von kooperativem Handeln, Einhaltung von Gesprächsregeln, Empathie und Konfliktbewältigung in realen schulischen Situationen (Partnerarbeit, Gruppenphasen, Pausenhof, Gesprächskreis). Wertungsfrei und ressourcenorientiert.',
  durationMinutes: 6,
  levels: [
    // =========================================================================
    // NIVEAU 1: Grundlegende Kooperation & Regelverständnis im Alltag
    // =========================================================================
    {
      level: 1,
      label: 'Niveau 1: Grundlegende Kooperation & Gesprächsregeln',
      description: 'Material teilen, Partnerabsprachen, Gesprächsregeln im Kreis und friedliches Pausenspiel.',
      tasks: [
        {
          id: 'sv-n1-t1',
          title: 'Partnerarbeit & Materialteilung',
          instruction: 'Beobachte das Kind während einer Partneraufgabe, bei der ein gemeinsames Arbeitsmittel genutzt wird.',
          prompt: 'Wie gelingt dem Kind das Teilen von Materialien und das Abwechseln?',
          type: 'choice',
          aspect: 'social_cooperation',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Partnerarbeit & Material teilen',
              situationTitle: 'Partnerarbeit',
              situationType: 'partnerarbeit',
              contextDescription: 'Zwei Kinder bearbeiten gemeinsam ein Rechenspiel oder gestalten ein Plakat mit gemeinsamen Buntstiften.',
              settingExample: 'Mathematik-Spielephase oder Sachunterricht',
              criteria: [
                {
                  id: 'crit-share',
                  label: 'Teilen & Abwechseln',
                  positiveSignal: 'Gibt Stifte/Würfel gerne weiter, wartet bis der Partner fertig ist und bespricht nächste Schritte',
                  cautionSignal: 'Reißt Materialien an sich, blockiert Werkzeuge oder bestimmt allein über das Vorgehen',
                },
                {
                  id: 'crit-tone',
                  label: 'Umgangston',
                  positiveSignal: 'Spricht freundlich, motivierend und wertschätzend mit dem Partner',
                  cautionSignal: 'Nutzt herabsetzende Bemerkungen („Du machst das falsch!“) oder wendet sich verärgert ab',
                },
              ],
              reflectionQuestions: [
                'Klappt die Kooperation bei bestimmten Partnern besser?',
                'Hilft ein klarer Spielplan (z. B. Sanduhr für den Wechsel)?',
              ],
            },
          },
          options: [
            { label: 'Kooperativ: teilt gerne, spricht freundlich ab', value: 'cooperative', isCorrect: true, strategyTag: 'cooperates_actively' },
            { label: 'Teilt nach kurzer Erinnerung; gelegentlich impulsiv', value: 'mostly_cooperative', isCorrect: true, strategyTag: 'shares_materials' },
            { label: 'Dominiert stark oder zieht sich frustriert zurück', value: 'difficult_sharing', isCorrect: false, strategyTag: 'dominates_interaction' },
          ],
          defaultObservationTags: ['cooperates_actively', 'shares_materials', 'dominates_interaction', 'withdrawn_passive'],
        },
        {
          id: 'sv-n1-t2',
          title: 'Gesprächsregeln im Morgenkreis / Klassenverband',
          instruction: 'Beobachte das Kind im gemeinsamen Unterrichtsgespräch oder Morgenkreis.',
          prompt: 'Wie gelingt dem Kind das Zuhören und die Einhaltung von Melderegeln?',
          type: 'choice',
          aspect: 'social_rules',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Gesprächsregeln & Zuhören',
              situationTitle: 'Gesprächskreis',
              situationType: 'gespraechskreis',
              contextDescription: 'Die Klasse sitzt im Kreis; Kinder erzählen von Erlebnissen oder tragen Beiträge vor.',
              settingExample: 'Morgenkreis am Montag oder Sachunterrichtsgespräch',
              criteria: [
                {
                  id: 'crit-listening',
                  label: 'Aufmerksames Zuhören',
                  positiveSignal: 'Hört anderen Kindern mit Blickkontakt zu und lässt sie ausreden',
                  cautionSignal: 'Unterbricht häufig, redet ungefragt dazwischen oder macht Nebengeräusche',
                },
                {
                  id: 'crit-handraising',
                  label: 'Melderegel',
                  positiveSignal: 'Meldet sich leise und wartet geduldig, bis es aufgerufen wird',
                  cautionSignal: 'Ruft ständig herein („Ich weiß es!“) oder schnipst ungeduldig mit den Fingern',
                },
              ],
            },
          },
          options: [
            { label: 'Hört aufmerksam zu, meldet sich und lässt andere ausreden', value: 'attentive', isCorrect: true, strategyTag: 'listens_attentively' },
            { label: 'Hört meist zu, ruft aber bei Begeisterung gelegentlich rein', value: 'mostly_attentive', isCorrect: true, strategyTag: 'follows_rules' },
            { label: 'Unterbricht ständig, hat große Mühe beim Warten auf Redeanteil', value: 'disruptive', isCorrect: false, strategyTag: 'interrupts_others' },
          ],
          defaultObservationTags: ['listens_attentively', 'follows_rules', 'interrupts_others', 'disregards_rules'],
        },
        {
          id: 'sv-n1-t3',
          title: 'Pausensituation & Freies Spiel',
          instruction: 'Beobachte das Verhalten des Kindes im freien Pausenspiel auf dem Schulhof.',
          prompt: 'Wie gestaltet das Kind Spielbeziehungen und den Umgang mit Spielregeln?',
          type: 'choice',
          aspect: 'social_play',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Pausenspiel & soziale Teilhabe',
              situationTitle: 'Pausenhof & Freispiel',
              situationType: 'pause_spiel',
              contextDescription: 'Große Pause auf dem Schulhof; Fangspiel, Fußball, Klettergerüst oder Seilspringen.',
              settingExample: '20 Minuten Hofpause',
              criteria: [
                {
                  id: 'crit-inclusion',
                  label: 'Teilhabe & Anschluss',
                  positiveSignal: 'Findet leicht Anschluss, fragt freundlich nach Mitspielen oder bindet andere ein',
                  cautionSignal: 'Bleibt isoliert abseits, vertreibt andere Kinder oder stört fremde Spiele',
                },
                {
                  id: 'crit-fairness',
                  label: 'Faires Spiel',
                  positiveSignal: 'Hält vereinbarte Spielregeln ein, akzeptiert Ausscheiden beim Fangspiel',
                  cautionSignal: 'Bricht Regeln eigenmächtig ab, bezichtigt andere des Betrugs oder reagiert aggressiv',
                },
              ],
            },
          },
          options: [
            { label: 'Integriert, spielt fair und hält sich an gemeinsame Regeln', value: 'integrated', isCorrect: true, strategyTag: 'follows_rules' },
            { label: 'Spielt meist gern mit; benötigt bei Frust gelegentlich Vermittlung', value: 'needs_guidance', isCorrect: true, strategyTag: 'cooperates_actively' },
            { label: 'Häufig in Reibereien verwickelt oder stark isoliert', value: 'conflict_prone', isCorrect: false, strategyTag: 'escalates_conflicts' },
          ],
          defaultObservationTags: ['follows_rules', 'cooperates_actively', 'escalates_conflicts', 'withdrawn_passive'],
        },
        {
          id: 'sv-n1-t4',
          title: 'Konfliktbewältigung bei alltäglichen Reibereien',
          instruction: 'Beobachte, wie das Kind reagiert, wenn es rempelt, übersehen wird oder ein Spiel verloren geht.',
          prompt: 'Wie geht das Kind mit Enttäuschung oder Streitigkeiten um?',
          type: 'choice',
          aspect: 'social_conflict',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Konfliktbewältigung & Deeskalation',
              situationTitle: 'Konfliktsituation',
              situationType: 'konfliktsituation',
              contextDescription: 'Ein Kind stößt versehentlich gegen den Tisch, sodass ein Bauwerk umfällt.',
              settingExample: 'Klassenzimmer oder Freispiel',
              criteria: [
                {
                  id: 'crit-reaction',
                  label: 'Reaktionsmuster',
                  positiveSignal: 'Bleibt ruhig, äußert seinen Ärger in Worten („Das hat mich geärgert“) oder bittet Lehrkraft um Schlichtung',
                  cautionSignal: 'Reagiert mit sofortigem Schlagen, Treten, wüstem Beschimpfen oder Racheaktionen',
                },
              ],
            },
          },
          options: [
            { label: 'Klärt Konflikte mit Worten oder holt sachlich Hilfe', value: 'verbal_resolution', isCorrect: true, strategyTag: 'resolves_conflicts_peacefully' },
            { label: 'Wird zunächst laut/wütend, lässt sich aber schnell beruhigen', value: 'emotional_then_calm', isCorrect: true, strategyTag: 'resolves_conflicts_peacefully' },
            { label: 'Eskaliert schnell körperlich/verbal; weist jede Schuld von sich', value: 'escalating', isCorrect: false, strategyTag: 'escalates_conflicts' },
          ],
          defaultObservationTags: ['resolves_conflicts_peacefully', 'escalates_conflicts', 'shows_empathy', 'defensive_to_feedback'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 2: Gruppenarbeit, Hilfsbereitschaft & Perspektivübernahme
    // =========================================================================
    {
      level: 2,
      label: 'Niveau 2: Gruppenarbeit & gegenseitige Unterstützung',
      description: 'Zusammenarbeit in Kleingruppen (3–4 Kinder), Hilfe anbieten, Rücksichtnahme und Kompromissbereitschaft.',
      tasks: [
        {
          id: 'sv-n2-t1',
          title: 'Rollen- und Aufgabenübernahme in Kleingruppen',
          instruction: 'Beobachte das Kind bei einer Gruppenarbeit mit 3 bis 4 Kindern.',
          prompt: 'Wie bringt sich das Kind in die Arbeitsgruppe ein?',
          type: 'choice',
          aspect: 'social_groupwork',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Kooperation in Kleingruppen',
              situationTitle: 'Gruppenarbeit',
              situationType: 'gruppenarbeit',
              contextDescription: 'Vier Kinder erarbeiten gemeinsam eine Gruppenpräsentation oder ein Plakat.',
              settingExample: 'Sachunterricht oder Deutsch-Gruppenphase',
              criteria: [
                {
                  id: 'crit-role',
                  label: 'Beitrag & Rollenverteilung',
                  positiveSignal: 'Übernimmt verlässlich einen Teilbereich, hört den Ideen anderer zu und stimmt sich ab',
                  cautionSignal: 'Bestimmt alles allein, drängt andere ab oder klinkt sich völlig aus der Arbeit aus',
                },
              ],
            },
          },
          options: [
            { label: 'Bringt sich konstruktiv ein, achtet auf die Beiträge aller', value: 'constructive_group', isCorrect: true, strategyTag: 'cooperates_actively' },
            { label: 'Arbeitet mit, benötigt aber gelegentlich Strukturhilfe von außen', value: 'guided_group', isCorrect: true, strategyTag: 'cooperates_actively' },
            { label: 'Verweigert Zusammenarbeit oder blockiert den Gruppenprozess', value: 'blocking_group', isCorrect: false, strategyTag: 'refuses_cooperation' },
          ],
          defaultObservationTags: ['cooperates_actively', 'helps_others', 'refuses_cooperation', 'dominates_interaction'],
        },
        {
          id: 'sv-n2-t2',
          title: 'Hilfsbereitschaft & Achtsamkeit für Mitschüler',
          instruction: 'Beobachte, wie das Kind reagiert, wenn ein anderes Kind Hilfe benötigt oder traurig ist.',
          prompt: 'Zeigt das Kind Feinfühligkeit und spontane Hilfsbereitschaft?',
          type: 'choice',
          aspect: 'social_empathy',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Hilfsbereitschaft & Empathie',
              situationTitle: 'Hilfe anbieten',
              situationType: 'hilfe_anbieten',
              contextDescription: 'Ein Mitschüler lässt seine Mappe fallen oder findet eine Seite im Buch nicht.',
              settingExample: 'Klassenalltag',
              criteria: [
                {
                  id: 'crit-empathy',
                  label: 'Empathische Wahrnehmung',
                  positiveSignal: 'Bemerkt die Notlage sofort, hebt Dinge auf oder bietet freundlich Unterstützung an',
                  cautionSignal: 'Schaut schadenfroh zu, lacht das Kind aus oder ignoriert die Situation bewusst',
                },
              ],
            },
          },
          options: [
            { label: 'Aufmerksam und hilfsbereit; unterstützt ohne Aufforderung', value: 'spontaneous_help', isCorrect: true, strategyTag: 'helps_others' },
            { label: 'Hilft gerne, wenn es von der Lehrkraft darum gebeten wird', value: 'prompted_help', isCorrect: true, strategyTag: 'helps_others' },
            { label: 'Zeigt wenig Interesse an anderen oder reagiert spöttisch', value: 'indifferent_or_mocking', isCorrect: false, strategyTag: 'defensive_to_feedback' },
          ],
          defaultObservationTags: ['shows_empathy', 'helps_others', 'cooperates_actively'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 3: Empathie, Deeskalation & Feedbackkultur
    // =========================================================================
    {
      level: 3,
      label: 'Niveau 3: Empathie & konstruktives Feedback',
      description: 'Konstruktive Rückmeldungen geben und annehmen, Perspektiven anderer verstehen und deeskalieren.',
      tasks: [
        {
          id: 'sv-n3-t1',
          title: 'Feedback geben und annehmen in Reflexionsphasen',
          instruction: 'Beobachte das Kind in einer Feedbackrunde (z. B. nach einem Referat oder einer Autorenlesung).',
          prompt: 'Wie formuliert das Kind Rückmeldungen und wie geht es mit Kritik um?',
          type: 'choice',
          aspect: 'social_feedback',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Feedbackkultur & Kritikfähigkeit',
              situationTitle: 'Reflexionsrunde',
              situationType: 'gespraechskreis',
              contextDescription: 'Kinder geben sich gegenseitig Tipps nach der „Zwei Sterne und ein Wunsch“-Methode.',
              settingExample: 'Präsentationsstunde',
              criteria: [
                {
                  id: 'crit-give',
                  label: 'Feedback geben',
                  positiveSignal: 'Benennt konkrete Stärken und formuliert Wünsche respektvoll und sachbezogen',
                  cautionSignal: 'Formuliert pauschal abwertend („Das war total langweilig“)',
                },
                {
                  id: 'crit-receive',
                  label: 'Feedback annehmen',
                  positiveSignal: 'Nimmt Hinweise offen an, bedankt sich und überlegt, was es umsetzen kann',
                  cautionSignal: 'Reagiert beleidigt, rechtfertigt sich aggressiv oder fängt an zu streiten',
                },
              ],
            },
          },
          options: [
            { label: 'Gibt respektvolles Feedback und nimmt Kritik sachlich an', value: 'constructive_feedback', isCorrect: true, strategyTag: 'accepts_feedback' },
            { label: 'Gibt gutes Feedback; ist bei eigener Kritik noch empfindlich', value: 'sensitive_to_criticism', isCorrect: true, strategyTag: 'accepts_feedback' },
            { label: 'Reagiert abwehrend/trotzig; teilt selbst gerne verletzend aus', value: 'defensive', isCorrect: false, strategyTag: 'defensive_to_feedback' },
          ],
          defaultObservationTags: ['accepts_feedback', 'defensive_to_feedback', 'shows_empathy'],
        },
      ],
    },

    // =========================================================================
    // NIVEAU 4: Soziale Verantwortung & Schlichtung im Klassenrat
    // =========================================================================
    {
      level: 4,
      label: 'Niveau 4: Soziale Verantwortung & Klassenrat',
      description: 'Aktive Mitgestaltung der Gemeinschaft, Streitschlichtung und Eintreten für schwächere Kinder.',
      tasks: [
        {
          id: 'sv-n4-t1',
          title: 'Mitgestaltung im Klassenrat & Streitschlichtung',
          instruction: 'Beobachte das Kind während des Klassenrats oder bei der Vermittlung zwischen zwei Streitenden.',
          prompt: 'Übernimmt das Kind Verantwortung für ein faires Miteinander in der Gruppe?',
          type: 'choice',
          aspect: 'social_responsibility',
          competencyId: 'sl-sozialverhalten',
          visual: {
            type: 'social_observation',
            socialObservation: {
              title: 'Gemeinschaftsverantwortung & Schlichtung',
              situationTitle: 'Klassenrat',
              situationType: 'gespraechskreis',
              contextDescription: 'Klassenrat zur Klärung von Hofpausenregeln oder Moderation eines gemeinsamen Beschlusses.',
              settingExample: 'Wöchentliche Klassenratsstunde',
              criteria: [
                {
                  id: 'crit-fairness',
                  label: 'Gerechtigkeitssinn',
                  positiveSignal: 'Setzt sich unaufgefordert für gerechte Lösungen ein, hört beiden Streitparteien zu',
                  cautionSignal: 'Ergreift blind Partei für Freunde, verschärft Vorwürfe oder nutzt Machtpositionen aus',
                },
              ],
            },
          },
          options: [
            { label: 'Vorbildlich: schlichtet neutral und setzt sich für Fairness ein', value: 'mediator', isCorrect: true, strategyTag: 'resolves_conflicts_peacefully' },
            { label: 'Bringt gute Vorschläge ein; lässt sich manchmal noch emotional leiten', value: 'engaged', isCorrect: true, strategyTag: 'cooperates_actively' },
            { label: 'Zeigt wenig Gemeinschaftssinn oder nutzt Konflikte zur Selbstdarstellung', value: 'egocentric', isCorrect: false, strategyTag: 'dominates_interaction' },
          ],
          defaultObservationTags: ['resolves_conflicts_peacefully', 'cooperates_actively', 'shows_empathy', 'dominates_interaction'],
        },
      ],
    },
  ],
};
