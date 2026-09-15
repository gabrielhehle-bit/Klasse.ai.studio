import { 
  CompetencyStatus, 
  DiagnosticCompetencyResult,
  DiagnosticLevelDefinition, 
  DiagnosticObservation, 
  DiagnosticObservationTag, 
  DiagnosticTaskDefinition 
} from '../types/diagnosticCore';

export interface CompletedTaskRecord {
  taskId: string;
  task: DiagnosticTaskDefinition;
  isCorrect: boolean;
  selectedValue?: any;
  observationTags: DiagnosticObservationTag[];
  teacherNote?: string;
}

export interface EvaluationResult {
  status: CompetencyStatus;
  rawScore: number;
  maxScore: number;
  normalizedScore: number; // 0..100
  observationCounts: Record<string, number>;
  structuredObservations: DiagnosticObservation[];
  competencyResults?: DiagnosticCompetencyResult[];
  summaryText: string;
  suggestedNextStep: string;
  levelAdvice: {
    type: 'higher' | 'lower' | 'appropriate';
    message: string;
    suggestedLevel?: number;
  } | null;
}

/**
 * Helper to compute status from raw accuracy and qualitative counts
 */
function computeGenericStatus(
  accuracy: number,
  positiveSignals: number,
  disruptionSignals: number
): CompetencyStatus {
  if (accuracy >= 0.80 && (positiveSignals >= disruptionSignals || disruptionSignals === 0)) {
    return 'secure';
  } else if (accuracy >= 0.60 || (accuracy >= 0.50 && positiveSignals > disruptionSignals)) {
    return 'mostlySecure';
  } else if (accuracy >= 0.35) {
    return 'partlySecure';
  } else {
    return 'needsObservation';
  }
}

/**
 * Transparent, pedagogical evaluation logic for 1:1 checks.
 * Adapts to specific test domains (Reading fluency, Reading comprehension, Place value, Multiplication, Phonology, Ten-carry, Mental arithmetic, Quantities).
 */
export function evaluateOneToOneTest(
  level: DiagnosticLevelDefinition,
  completedTasks: CompletedTaskRecord[],
  testId?: string
): EvaluationResult {
  const maxScore = completedTasks.length || 1;
  const rawScore = completedTasks.filter(t => t.isCorrect).length;
  const accuracy = rawScore / maxScore;
  const normalizedScore = Math.round(accuracy * 100);

  // Count all observation tags dynamically
  const observationCounts: Record<string, number> = {};
  completedTasks.forEach(t => {
    t.observationTags.forEach(tag => {
      observationCounts[tag] = (observationCounts[tag] || 0) + 1;
    });
  });

  // Identify Test Domain from testId or task competencies
  const isLesefluessigkeit = testId === 'lesefluessigkeit-check' || (completedTasks.some(t => t.task.aspect?.startsWith('reading_')) && testId !== 'leseverstaendnis-check');
  const isLeseverstaendnis = testId === 'leseverstaendnis-check' || completedTasks.some(t => t.task.aspect?.startsWith('comprehension_'));
  const isZahlenraum = testId === 'zahlenraum-stellenwert-check' || completedTasks.some(t => t.task.competencyId === 'ma-zahlen-vorstellung' || t.task.competencyId === 'ma-zahlen-stellenwert' || t.task.aspect === 'place_value_bundling' || t.task.aspect === 'number_orientation');
  const isMultiplikation = testId === 'einmaleins-multiplikation-check' || completedTasks.some(t => t.task.aspect === 'multiplication_concept' || t.task.aspect === 'multiplication_strategy');
  const isPhonologie = testId === 'phonologische-bewusstheit-check' || completedTasks.some(t => t.task.aspect?.startsWith('phonology_'));
  const isZehner = testId === 'zehneruebergang-check' || completedTasks.some(t => t.task.aspect?.startsWith('ten_carry'));
  const isKopf = testId === 'kopfrechnen-check' || completedTasks.some(t => t.task.aspect?.startsWith('mental'));

  // Lernvoraussetzungen (Schritt 11)
  const isAufmerksamkeit = testId === 'aufmerksamkeit-check' || completedTasks.some(t => t.task.competencyId === 'lv-aufmerksamkeit' || t.task.aspect?.startsWith('attention_'));
  const isArbeitsgedaechtnis = testId === 'arbeitsgedaechtnis-check' || completedTasks.some(t => t.task.competencyId === 'lv-arbeitsgedaechtnis' || t.task.aspect?.startsWith('memory_'));
  const isVisuell = testId === 'visuelle-wahrnehmung-check' || completedTasks.some(t => t.task.competencyId === 'lv-visuell' || t.task.aspect?.startsWith('visual_'));
  const isRaumLage = testId === 'raum-lage-check' || completedTasks.some(t => t.task.competencyId === 'lv-raum-lage' || t.task.aspect?.startsWith('spatial_'));
  const isFeinmotorik = testId === 'feinmotorik-check' || completedTasks.some(t => t.task.competencyId === 'lv-feinmotorik' || t.task.aspect?.startsWith('fine_motor_'));
  const isGraphomotorik = testId === 'graphomotorik-check' || completedTasks.some(t => t.task.competencyId === 'lv-graphomotorik' || t.task.aspect?.startsWith('graphomotor_'));

  // Sozial & Lernen (Schritt 12)
  const isArbeitsverhalten = testId === 'arbeitsverhalten-check' || completedTasks.some(t => t.task.competencyId === 'sl-arbeitsverhalten' || t.task.aspect?.startsWith('behavior_'));
  const isSozialverhalten = testId === 'sozialverhalten-check' || completedTasks.some(t => t.task.competencyId === 'sl-sozialverhalten' || t.task.aspect?.startsWith('social_'));
  const isMetakognition = testId === 'metakognition-check' || completedTasks.some(t => t.task.competencyId === 'sl-metakognition' || t.task.aspect?.startsWith('metacognition_'));

  let status: CompetencyStatus = 'mostlySecure';
  const structuredObservations: DiagnosticObservation[] = [];
  let competencyResults: DiagnosticCompetencyResult[] | undefined = undefined;
  let summaryText = '';
  let suggestedNextStep = '';

  // =========================================================================
  // 1. ZAHLENRAUM & STELLENWERT (DOPPEL-KOMPETENZ: Vorrat & Stellenwert)
  // =========================================================================
  if (isZahlenraum) {
    const tasksVorstellung = completedTasks.filter(t => t.task.competencyId === 'ma-zahlen-vorstellung' || t.task.aspect === 'number_orientation');
    const tasksStellenwert = completedTasks.filter(t => t.task.competencyId === 'ma-zahlen-stellenwert' || t.task.aspect === 'place_value_bundling');

    const scoreVorstellung = tasksVorstellung.filter(t => t.isCorrect).length;
    const maxVorstellung = tasksVorstellung.length || 1;
    const accVorstellung = scoreVorstellung / maxVorstellung;

    const scoreStellenwert = tasksStellenwert.filter(t => t.isCorrect).length;
    const maxStellenwert = tasksStellenwert.length || 1;
    const accStellenwert = scoreStellenwert / maxStellenwert;

    const numberConceptSecure = observationCounts['number_concept_secure'] || 0;
    const numberLineSecure = observationCounts['number_line_secure'] || 0;
    const placeValueSecure = observationCounts['place_value_secure'] || 0;
    const usesGrouping = observationCounts['uses_grouping'] || 0;
    const countsStepwise = observationCounts['counts_stepwise'] || 0;
    const confusesPlaces = observationCounts['confuses_places'] || 0;
    const digitReversal = observationCounts['digit_reversal'] || 0;
    const needsMaterial = observationCounts['needs_material'] || 0;

    // Sub-Status 1: Zahlvorstellung & Zahlenraum
    const statusVorstellung: CompetencyStatus = computeGenericStatus(
      accVorstellung,
      numberConceptSecure + numberLineSecure,
      countsStepwise + (observationCounts['hesitant'] || 0)
    );

    // Sub-Status 2: Stellenwertverständnis
    const statusStellenwert: CompetencyStatus = computeGenericStatus(
      accStellenwert,
      placeValueSecure + usesGrouping,
      confusesPlaces + digitReversal + needsMaterial
    );

    const statusOrder: Record<CompetencyStatus, number> = {
      needsObservation: 1,
      partlySecure: 2,
      mostlySecure: 3,
      secure: 4,
    };

    if (statusVorstellung === 'secure' && statusStellenwert === 'secure') {
      status = 'secure';
    } else if (statusOrder[statusVorstellung] <= 1 || statusOrder[statusStellenwert] <= 1) {
      status = accuracy < 0.5 ? 'needsObservation' : 'partlySecure';
    } else if (statusOrder[statusVorstellung] >= 3 && statusOrder[statusStellenwert] >= 3) {
      status = 'mostlySecure';
    } else {
      status = 'partlySecure';
    }

    competencyResults = [
      {
        competencyId: 'ma-zahlen-vorstellung',
        status: statusVorstellung,
        score: scoreVorstellung,
        maxScore: maxVorstellung,
        note: `Zahlvorstellung: ${scoreVorstellung}/${maxVorstellung} (${statusVorstellung})`,
      },
      {
        competencyId: 'ma-zahlen-stellenwert',
        status: statusStellenwert,
        score: scoreStellenwert,
        maxScore: maxStellenwert,
        note: `Stellenwert: ${scoreStellenwert}/${maxStellenwert} (${statusStellenwert})`,
      },
    ];

    if (numberLineSecure >= 1 || numberConceptSecure >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Sichere Orientierung am Zahlenstrahl und schnelles Erfassen von Nachbarzahlen.',
        competencyId: 'ma-zahlen-vorstellung',
        tag: 'number_line_secure',
      });
    }

    if (placeValueSecure >= 1 || usesGrouping >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Versteht dezimale Bündelungen und die Stellenwerttafel zuverlässig.',
        competencyId: 'ma-zahlen-stellenwert',
        tag: 'place_value_secure',
      });
    }

    if (digitReversal >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Gelegentliche Zahlendreher beim Sprechen und Schreiben zweistelliger Zahlen (z. B. 35 vs. 53).',
        competencyId: 'ma-zahlen-stellenwert',
        tag: 'digit_reversal',
      });
    }

    if (confusesPlaces >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Unsicherheiten bei Null als Stellenhalter oder Verwechslung von Zehnern und Einern.',
        competencyId: 'ma-zahlen-stellenwert',
        tag: 'confuses_places',
      });
    }

    if (countsStepwise >= 2) {
      structuredObservations.push({
        type: 'observation',
        text: 'Zahlenräume werden noch vorwiegend in Einzelschritten abgezählt.',
        competencyId: 'ma-zahlen-vorstellung',
        tag: 'counts_stepwise',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Zahlraumorientierung und Stellenwertverständnis sind sicher.' : 'Stellenwertstrukturen sind in Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere Beherrschung des Zahlenraums und Stellenwertsystems (${rawScore}/${maxScore} Punkte). Zahlaufbau und Orientierung funktionieren stabil.`;
        suggestedNextStep = level.level < 4
          ? `Zahlenraum auf Niveau ${level.level} ist gesichert. Bei Gelegenheit Erweiterung auf Niveau ${level.level + 1} anbahnen.`
          : 'Sehr hohe Stellenwertsicherheit im Millionenraum. Komplexe Rechenoperationen und Runden weiter vertiefen.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sicheres Zahlenverständnis (${rawScore}/${maxScore} Punkte). Grundlagen sind stabil, einzelne Stellenwertübergänge bedürfen noch kurzer Bedenkzeit.`;
        suggestedNextStep = 'Regelmäßige Übungen an der Stellenwerttafel (insbesondere mit der Null als Stellenhalter) festigen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sicheres Verständnis (${rawScore}/${maxScore} Punkte). Unterschiedliche Sicherheit zwischen linearer Orientierung und Stellenwertbündelung.`;
        suggestedNextStep = 'Handlungsorientiertes Bündeln mit Dienes-Material und Hunderterfeld anbieten, um Zahlendreher abzubauen.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf im Stellenwertsystem (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Vorübergehend Basisorientierung auf Niveau ${level.level - 1} mit Anschauungsmaterial festigen.`
          : 'Strukturierte Zahldarstellungen bis 20 handlungsorientiert vertiefen.';
        break;
    }
  }

  // =========================================================================
  // 2. EINMALEINS & MULTIPLIKATION
  // =========================================================================
  else if (isMultiplikation) {
    const instant = observationCounts['instant'] || 0;
    const coreFact = observationCounts['core_fact_used'] || 0;
    const commutative = observationCounts['commutative_used'] || 0;
    const nearFact = observationCounts['near_fact_used'] || 0;
    const doubleHalf = observationCounts['double_half_used'] || 0;
    const repeatedAdd = observationCounts['repeated_addition'] || 0;
    const counted = observationCounts['counted'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;

    const strongStrategies = instant + coreFact + commutative + nearFact + doubleHalf;
    const countingApproaches = repeatedAdd + counted;

    if (accuracy >= 0.80 && (instant >= 2 || strongStrategies >= countingApproaches)) {
      status = 'secure';
    } else if (accuracy >= 0.60 || (accuracy >= 0.50 && strongStrategies > countingApproaches)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.35) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (coreFact >= 1 || instant >= 2) {
      structuredObservations.push({
        type: 'strength',
        text: 'Greift sicher auf Kernaufgaben (2er-, 5er-, 10er-Reihe) und automatisierten Faktenabruf zurück.',
        tag: 'core_fact_used',
      });
    }

    if (commutative >= 1 || nearFact >= 1 || doubleHalf >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Nutzt geschickt Ableitungsstrategien (Tauschaufgaben, Nachbaraufgaben, Verdoppeln/Halbieren).',
        tag: 'near_fact_used',
      });
    }

    if (repeatedAdd >= 2 || counted >= 2) {
      structuredObservations.push({
        type: 'observation',
        text: 'Ermittelt Mal-Ergebnisse häufig noch über schrittweise wiederholte Addition (Plusketten).',
        tag: 'repeated_addition',
      });
    }

    if (hesitant >= 2) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zeigt noch längere Bedenkzeiten bei schwierigeren 1x1-Sätzen (z. B. 7er-, 8er-Reihe).',
        tag: 'hesitant',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Multiplikative Grundvorstellungen und Kernaufgaben sind gesichert.' : 'Einmaleins-Strategien in Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere Multiplikationskompetenz (${rawScore}/${maxScore} Punkte). Kernaufgaben und Ableitungen werden souverän angewendet.`;
        suggestedNextStep = level.level < 4
          ? `Kompetenz ist auf Niveau ${level.level} gefestigt. Kann an das Einmaleins auf Niveau ${level.level + 1} herangeführt werden.`
          : 'Umfassende Multiplikationssicherheit. Zehner-1x1 und halbschriftliche Multiplikation weiter vertiefen.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sicheres Multiplizieren (${rawScore}/${maxScore} Punkte). Die meisten Aufgaben werden über Kernaufgaben oder Tauschaufgaben sicher gelöst.`;
        suggestedNextStep = 'Gezielte Nachbaraufgaben-Kärtchen (z. B. 6x7 über 5x7+7) zur Festigung der restlichen 1x1-Sätze nutzen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sicheres Einmaleins (${rawScore}/${maxScore} Punkte). Häufiger Rückgriff auf Plusketten statt flexibler Ableitungen.`;
        suggestedNextStep = 'Kernaufgaben (1x, 2x, 5x, 10x) mit Punktefeldern automatisieren, um Plusketten schrittweise abzulösen.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf beim Einmaleins (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Zunächst Vorstufen und Kernaufgaben auf Niveau ${level.level - 1} mit anschaulichen Punktefeldern festigen.`
          : 'Handlungsorientiertes Legen von gleichen Gruppen und Verdopplungsaufgaben vertiefen.';
        break;
    }
  }

  // =========================================================================
  // 3. LESEVERSTÄNDNIS (SINNENTNAHME & VERSTEHENSEBENEN)
  // =========================================================================
  else if (isLeseverstaendnis) {
    const recallsDetails = observationCounts['recalls_details'] || 0;
    const drawsInferences = observationCounts['draws_inferences'] || 0;
    const ownWordsSummary = observationCounts['own_words_summary'] || 0;
    const understandsStructure = observationCounts['understands_structure'] || 0;
    const checksText = observationCounts['checks_text'] || 0;
    const guessesAnswers = observationCounts['guesses_answers'] || 0;
    const confusesFacts = observationCounts['confuses_facts'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;

    const positiveComprehension = recallsDetails + drawsInferences + ownWordsSummary + understandsStructure + checksText;
    const misunderstandingSignals = guessesAnswers + confusesFacts;

    if (accuracy >= 0.80 && misunderstandingSignals === 0) {
      status = 'secure';
    } else if (accuracy >= 0.60 || (accuracy >= 0.50 && positiveComprehension > misunderstandingSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.35) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (drawsInferences >= 1 || ownWordsSummary >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Zieht selbstständig treffende Schlüsse zwischen den Zeilen und fasst Texte treffend in eigenen Worten zusammen.',
        tag: 'draws_inferences',
      });
    }

    if (recallsDetails >= 2 || checksText >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Findet gezielt explizite Detailinformationen im Text und nutzt Nachlesen als aktive Kontrollstrategie.',
        tag: 'checks_text',
      });
    }

    if (confusesFacts >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Verwechselt gelegentlich Einzelheiten oder Handlungsabfolgen.',
        tag: 'confuses_facts',
      });
    }

    if (guessesAnswers >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Antwortet bei einzelnen Fragen noch intuitiv oder geraten ohne direkten Textbezug.',
        tag: 'guesses_answers',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Sinnentnahme auf Satz- und Textebene ist gesichert.' : 'Leseverständnis ist in stetiger Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sicheres Leseverständnis (${rawScore}/${maxScore} Punkte). Wörtliche Details, logische Schlüsse und Kernaussagen werden mühelos erfasst.`;
        suggestedNextStep = level.level < 4
          ? `Textverständnis ist auf Niveau ${level.level} gefestigt. Kann an anspruchsvollere Textformate auf Niveau ${level.level + 1} herangeführt werden.`
          : 'Herausragendes Leseverständnis. Literarische Interpretationen und anspruchsvolle Sachtexte anbieten.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sicheres Leseverständnis (${rawScore}/${maxScore} Punkte). Hauptaussagen werden erfasst, bei komplexen Inferenzen hilft gelegentliches Nachlesen.`;
        suggestedNextStep = 'Gezielte W-Fragen und Textabschnitts-Überschriften zur Vertiefung von Schlussfolgerungen nutzen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sicheres Leseverständnis (${rawScore}/${maxScore} Punkte). Einfache Details werden verstanden, Handlungszusammenhänge noch wechselhaft.`;
        suggestedNextStep = 'Abschnittsweises Lesen mit kurzen mündlichen Zwischenstopps („Was ist bisher passiert?“) trainieren.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf bei der Sinnentnahme (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Zunächst kürzere Texte auf Niveau ${level.level - 1} mit starkem Bildbezug einsetzen.`
          : 'Lesen auf Satzebene mit konkreter Bild-Satz-Zuordnung festigen.';
        break;
    }
  }

  // =========================================================================
  // 4. PHONOLOGISCHE BEWUSSTHEIT
  // =========================================================================
  else if (isPhonologie) {
    const isolatesInitial = observationCounts['isolates_initial'] || 0;
    const isolatesFinal = observationCounts['isolates_final'] || 0;
    const blendsSounds = observationCounts['blends_sounds'] || 0;
    const segmentsWords = observationCounts['segments_words'] || 0;
    const manipulatesPhonemes = observationCounts['manipulates_phonemes'] || 0;
    const confusesLetterSound = observationCounts['confuses_letter_sound'] || 0;
    const soundConfusion = observationCounts['sound_confusion'] || 0;
    const deletesSounds = observationCounts['deletes_sounds'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;

    const strongPhonology = isolatesInitial + isolatesFinal + blendsSounds + segmentsWords + manipulatesPhonemes;
    const phonologyDifficulties = soundConfusion + deletesSounds;

    if (accuracy >= 0.80 && phonologyDifficulties === 0) {
      status = 'secure';
    } else if (accuracy >= 0.60 || (accuracy >= 0.50 && strongPhonology > phonologyDifficulties)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.35) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (blendsSounds >= 1 || segmentsWords >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Beherrscht Lautsynthese und Lautanalyse zuverlässig.',
        tag: 'blends_sounds',
      });
    }

    if (manipulatesPhonemes >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Kann Laute im Wortinneren flexibel austauschen, hinzufügen oder umkehren (Phonemmanipulation).',
        tag: 'manipulates_phonemes',
      });
    }

    if (confusesLetterSound >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Nennt teilweise noch Buchstabennamen (z. B. „Em“, „Ka“) statt reiner Laute (/m/, /k/).',
        tag: 'confuses_letter_sound',
      });
    }

    if (deletesSounds >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Lässt bei Konsonantenhäufungen (z. B. /bl/, /st/, /pfl/) einzelne Binnenlaute aus.',
        tag: 'deletes_sounds',
      });
    }

    if (soundConfusion >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zeigt noch Unsicherheiten bei der auditiven Lautunterscheidung oder Positionierung.',
        tag: 'sound_confusion',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Die bearbeiteten Aufgaben zur phonologischen Bewusstheit wurden in diesem Check sicher gelöst.' : 'Phonologische Fertigkeiten in Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere phonologische Bewusstheit (${rawScore}/${maxScore} Punkte). Lautsynthese, Lautanalyse und Reime werden souverän beherrscht.`;
        suggestedNextStep = level.level < 4
          ? `Kompetenz ist auf Niveau ${level.level} gefestigt. Bei Bedarf weiterführende Aufgaben auf Niveau ${level.level + 1} ansehen.`
          : 'Phonologische Analyse- und Manipulationsfähigkeiten sind vollständig gesichert.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sichere phonologische Bewusstheit (${rawScore}/${maxScore} Punkte). Die meisten Lautaufgaben werden zuverlässig gelöst.`;
        suggestedNextStep = 'Gezielte Lautspiele zu Konsonantenclustern und reine Lautsprache (/m/ statt „Em“) im Unterrichtsalltag festigen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sichere phonologische Bewusstheit (${rawScore}/${maxScore} Punkte). Reime und Silben gelingen, Einzellautanalyse bei komplexen Wörtern noch wechselhaft.`;
        suggestedNextStep = 'Lautgebärden und Lauttreppen zur Unterstützung der Lautanalyse einsetzen.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} zeigen die bearbeiteten Aufgaben noch deutlichen Übungs- und Beobachtungsbedarf in der phonologischen Bewusstheit (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Zunächst Vorstufen (Reime, Silben, Anlaute) auf Niveau ${level.level - 1} intensiv mit Bildkarten festigen.`
          : 'Rhythmisch-musikalische Reime und Silbenspiele intensivieren.';
        break;
    }
  }

  // =========================================================================
  // 5. LESEFLÜSSIGKEIT & LESEGENAUIGKEIT (MEHRDIMENSIONALES PROFIL)
  // =========================================================================
  else if (isLesefluessigkeit) {
    const fluent = observationCounts['fluent'] || 0;
    const meaningfulPhrasing = observationCounts['meaningful_phrasing'] || 0;
    const halting = observationCounts['halting'] || 0;
    const spellingOut = observationCounts['spelling_out'] || 0;
    const selfCorrection = observationCounts['frequent_self_correction'] || 0;
    const losesLine = observationCounts['loses_line'] || 0;
    const skipsWords = observationCounts['skips_words'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const hasFlow = fluent > 0;
    const hasPhrasing = meaningfulPhrasing > 0;
    const hasSelfCorrection = selfCorrection > 0;

    const isHalting = halting >= 2;
    const hasSingleHalt = halting === 1;
    const isSpellingOut = spellingOut >= 1;
    const isHeavySpellingOut = spellingOut >= 2;
    const hasOrientationIssues = (losesLine + skipsWords) >= 1;
    const hasHeavyOrientationIssues = (losesLine + skipsWords) >= 2 || needsHint >= 1;

    if (
      accuracy >= 0.75 &&
      (hasFlow || hasPhrasing) &&
      !isSpellingOut &&
      !hasOrientationIssues &&
      !isHalting
    ) {
      status = 'secure';
    } else if (
      (accuracy >= 0.60 && !isHeavySpellingOut && !hasHeavyOrientationIssues) ||
      (accuracy >= 0.75 && (hasSingleHalt || hasSelfCorrection || isHalting) && !isHeavySpellingOut) ||
      ((hasFlow || hasPhrasing) && !isHeavySpellingOut && accuracy >= 0.50)
    ) {
      status = 'mostlySecure';
    } else if (
      isHeavySpellingOut ||
      hasHeavyOrientationIssues ||
      accuracy < 0.35 ||
      (accuracy < 0.50 && isHalting)
    ) {
      status = 'needsObservation';
    } else {
      status = 'partlySecure';
    }

    if (hasFlow || hasPhrasing) {
      structuredObservations.push({
        type: 'strength',
        text: 'Flüssiger, verbundener Lesefluss mit sinnvoller Phrasierung und natürlicher Betonung.',
        tag: 'meaningful_phrasing',
      });
    }

    if (hasSelfCorrection) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Aktive Lesekontrolle: Korrigiert eigene Lesefehler selbstständig und sinnbewusst.',
        tag: 'frequent_self_correction',
      });
    }

    if (isHalting || isSpellingOut) {
      structuredObservations.push({
        type: 'difficulty',
        text: isSpellingOut
          ? 'Greift bei unbekannten Wörtern noch auf lautierendes oder buchstabierendes Dekodieren zurück.'
          : 'Lesefluss wird durch häufige Wortpausen und Stockungen unterbrochen.',
        tag: isSpellingOut ? 'spelling_out' : 'halting',
      });
    }

    if (hasOrientationIssues) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zeilensprünge oder Auslassungen einzelner Wörter bei längeren Sätzen.',
        tag: losesLine > 0 ? 'loses_line' : 'skips_words',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Der verwendete Lesetext wurde in diesem Check ruhig, genau und flüssig gelesen.' : 'Lesekompetenz befindet sich in kontinuierlicher Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere und verbundene Leseflüssigkeit (${rawScore}/${maxScore} Aufgaben korrekt erlesen). Hohe Genauigkeit, sinnvolle Phrasierung und selbstständige Fehlerkorrektur.`;
        suggestedNextStep = level.level < 4
          ? `Leseflüssigkeit auf Niveau ${level.level} gefestigt. Textkomplexität kann bei Gelegenheit auf Niveau ${level.level + 1} gesteigert werden.`
          : 'Leseflüssigkeit umfassend gesichert. Fokus auf anspruchsvolle literarische Texte und prosodische Gestaltung legen.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sichere Leseflüssigkeit (${rawScore}/${maxScore} Aufgaben gelöst). Guter Lesefluss mit gelegentlichen Verlangsamungen oder einzelnen Selbstkorrekturen.`;
        suggestedNextStep = 'Regelmäßige kurze Tandem-Lesezeiten (10 Min. täglich) zur Steigerung der automatisierten Worterkennung nutzen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sichere Leseflüssigkeit (${rawScore}/${maxScore} Aufgaben). Gelesene Sätze werden noch häufig durch Stocken oder Buchstabieren unterbrochen.`;
        suggestedNextStep = 'Silbengestützte Lesetexte, Blitzwort-Training und Leselineal einsetzen, um das Dekodieren zu erleichtern.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf bei der Leseflüssigkeit (${rawScore}/${maxScore} Aufgaben). Ausgeprägtes Lautieren oder Orientierungsprobleme im Text.`;
        suggestedNextStep = level.level > 1
          ? `Vorübergehend Leseangebote auf Niveau ${level.level - 1} mit vergrößerter Schrift und Silbentrennern nutzen.`
          : 'Buchstabe-Laut-Synthese und wiederholtes Lesen kurzer, einfacher Wörter intensivieren.';
        break;
    }
  }

  // =========================================================================
  // 6. ZEHNERÜBERGANG & RECHENSTRATEGIEN
  // =========================================================================
  else if (isZehner) {
    const tenStop = observationCounts['ten_stop_used'] || 0;
    const doubling = observationCounts['doubling_used'] || 0;
    const decomposed = observationCounts['decomposed'] || 0;
    const countedOn = observationCounts['counts_on'] || 0;
    const countedFingers = observationCounts['counts_on_fingers'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;

    const structuredStrategies = tenStop + doubling + decomposed;
    const countingStrategies = countedOn + countedFingers;

    if (accuracy >= 0.85 && (structuredStrategies >= countingStrategies || countingStrategies <= 1)) {
      status = 'secure';
    } else if (accuracy >= 0.70 || (accuracy >= 0.60 && structuredStrategies > countingStrategies)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (tenStop >= 1 || doubling >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Nutzt strukturierte Rechenstrategien wie „Stopp bei der 10“ oder Verdoppeln/Halbieren.',
        tag: 'ten_stop_used',
      });
    }

    if (decomposed >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Zerlegt den zweiten Summanden schrittweise.',
        tag: 'decomposed',
      });
    }

    if (countingStrategies >= 2) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Fällt beim Zehnerübergang noch in zählendes Rechnen (an Fingern oder inneres Weiterzählen) zurück.',
        tag: countedFingers > 0 ? 'counts_on_fingers' : 'counts_on',
      });
    }

    if (hesitant >= 2) {
      structuredObservations.push({
        type: 'observation',
        text: 'Zeigt längere Bedenkzeit beim Überschreiten des Zehners.',
        tag: 'hesitant',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Zehnerübergang wird strategisch sicher beherrscht.' : 'Strategien zum Zehnerübergang sind im Aufbau.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere Bewältigung des Zehnerübergangs (${rawScore}/${maxScore} Punkte). Strukturierte Strategien werden zuverlässig und nicht-zählend angewendet.`;
        suggestedNextStep = level.level < 4
          ? `Strategie ist auf Niveau ${level.level} gefestigt. Kann an den Zehnerübergang im erweiterten Zahlenraum auf Niveau ${level.level + 1} herangeführt werden.`
          : 'Zehnerübergang ist umfassend gefestigt. Kann für komplexere Rechenverfahren genutzt werden.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sicherer Zehnerübergang (${rawScore}/${maxScore} Punkte). Aufgaben werden meist richtig gelöst, gelegentlich noch mit kurzer Bedenkzeit.`;
        suggestedNextStep = 'Regelmäßige Blitzübungen zu den Zerlegungen bis 10 einbinden, um die Zerlegungsschritte weiter zu beschleunigen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sichere Bewältigung (${rawScore}/${maxScore} Punkte). Das Kind erreicht richtige Ergebnisse häufig noch über zählendes Weiterrechnen.`;
        suggestedNextStep = 'Gezielte Übungen zum „Stopp bei der 10“ mit Wendeplättchen und Zwanzigerfeld durchführen, um Fingerzählen schrittweise abzulösen.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf beim Zehnerübergang (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Vorübergehend Basisaufgaben im ZR 20 auf Niveau ${level.level - 1} mit strukturierter Punktekarte festigen.`
          : 'Verliebte Zahlen zur 10 und Zerlegungen bis 10 handlungsorientiert automatisieren.';
        break;
    }
  }

  // =========================================================================
  // 7. KOPFRECHNEN & AUTOMATISIERUNG
  // =========================================================================
  else if (isKopf) {
    const instant = observationCounts['instant'] || 0;
    const calculated = observationCounts['calculated'] || 0;
    const strategyUsed = observationCounts['strategy_used'] || 0;
    const counted = observationCounts['counted'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const fastRecall = instant + strategyUsed;
    const slowCounting = counted + hesitant;

    if (accuracy >= 0.85 && (instant >= 2 || fastRecall >= counted)) {
      status = 'secure';
    } else if (accuracy >= 0.70 || (accuracy >= 0.60 && fastRecall > slowCounting)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (instant >= 2) {
      structuredObservations.push({
        type: 'strength',
        text: 'Grundaufgaben und Fakten werden blitzartig (< 2-3 Sek.) aus dem Gedächtnis abgerufen.',
        tag: 'instant',
      });
    }

    if (strategyUsed >= 1 || calculated >= 2) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Leitet unbekannte Aufgaben geschickt über Kernaufgaben oder Rechengesetze ab.',
        tag: 'strategy_used',
      });
    }

    if (counted >= 2) {
      structuredObservations.push({
        type: 'observation',
        text: 'Kopfrechenergebnisse werden noch über inneres Abzählen ermittelt.',
        tag: 'counted',
      });
    }

    if (hesitant >= 2 || needsHint >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Benötigt bei Zehneranalogien oder 1x1-Sätzen noch längere Bedenkzeit.',
        tag: 'hesitant',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Die bearbeiteten Kopfrechenaufgaben wurden in diesem Check sicher und zügig gelöst.' : 'Automatisierung in Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr hohe Geläufigkeit im Kopfrechnen (${rawScore}/${maxScore} Punkte). Faktenabruf und mentale Ableitungsstrategien funktionieren zuverlässig.`;
        suggestedNextStep = level.level < 4
          ? `Automatisierung ist auf Niveau ${level.level} gefestigt. Kann an Kopfrechnen auf Niveau ${level.level + 1} herangeführt werden.`
          : 'Kopfrechnen ist umfassend gesichert. Strategische Rechenvorteile und Schätzaufgaben anbieten.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sicheres Kopfrechnen (${rawScore}/${maxScore} Punkte). Die meisten Grundaufgaben werden sicher gelöst.`;
        suggestedNextStep = 'Regelmäßige 3-Minuten-Blitzrechenphasen zur weiteren Verfestigung der Kernaufgaben einbauen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sicheres Kopfrechnen (${rawScore}/${maxScore} Punkte). Wechsel zwischen schnellem Abruf und zählendem Rechnen.`;
        suggestedNextStep = 'Kernaufgaben (Verdopplungen, Verliebte Zahlen, 5er/10er 1x1) mit Rechenkärtchen gezielt automatisieren.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf im Kopfrechnen (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = level.level > 1
          ? `Zunächst Grundaufgaben auf Niveau ${level.level - 1} mit Anschauungsmaterial festigen.`
          : 'Zahlzerlegungen bis 10 und Kraft der 5 handlungsorientiert trainieren.';
        break;
    }
  }

  // =========================================================================
  // 8. AUFMERKSAMKEIT & IMPULSKONTROLLE (lv-aufmerksamkeit)
  // =========================================================================
  else if (isAufmerksamkeit) {
    const staysFocused = observationCounts['stays_focused'] || 0;
    const worksSystematically = observationCounts['works_systematically'] || 0;
    const ruleKept = observationCounts['rule_kept'] || 0;
    const distractible = observationCounts['distractible'] || 0;
    const impulsiveResponse = observationCounts['impulsive_response'] || 0;
    const missesTargets = observationCounts['misses_targets'] || 0;
    const ruleLost = observationCounts['rule_lost'] || 0;
    const fatigueObserved = observationCounts['fatigue_observed'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const positiveSignals = staysFocused + worksSystematically + ruleKept;
    const disruptionSignals = distractible + impulsiveResponse + missesTargets + ruleLost + fatigueObserved + needsHint;

    if (accuracy >= 0.80 && disruptionSignals <= 1) {
      status = 'secure';
    } else if (accuracy >= 0.60 && disruptionSignals <= 3) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (staysFocused >= 1 || ruleKept >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Hält Aufmerksamkeit über den Aufgabenzeitraum stabil aufrecht und hält Regeln zuverlässig ein.',
        tag: 'stays_focused',
      });
    }

    if (worksSystematically >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Geht bei visuellen Such- und Zuordnungsaufgaben strukturiert und planvoll vor.',
        tag: 'works_systematically',
      });
    }

    if (impulsiveResponse >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Reagiert bei einzelnen Aufgaben vorschnell, bevor die Reize vollständig geprüft wurden.',
        tag: 'impulsive_response',
      });
    }

    if (distractible >= 1 || ruleLost >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Lässt sich durch Nebenreize ablenken oder benötigt gelegentlich eine Regelreaktivierung.',
        tag: 'distractible',
      });
    }

    if (fatigueObserved >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Konzentrationsleistung lässt gegen Ende der Aufgabenserie spürbar nach.',
        tag: 'fatigue_observed',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Die vereinbarten Aufmerksamkeitsaufgaben wurden in diesem Check sicher bearbeitet.' : 'Aufmerksamkeitsfokus im Unterricht weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Zeigt im schulischen Check eine stabile, fokussierte Aufmerksamkeit (${rawScore}/${maxScore} Punkte). Regeln und Zielreize werden sicher beibehalten.`;
        suggestedNextStep = 'Aufmerksamkeit im regulären Klassenunterricht bei offenen Arbeitsphasen weiter beobachten; aktuell keine gesonderte Strukturierung nötig.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend aufmerksame Arbeitsweise (${rawScore}/${maxScore} Punkte). Bei steigender Reizdichte oder Zeitdruck treten vereinzelt vorschnelle Reaktionen auf.`;
        suggestedNextStep = 'Vor längeren Arbeitsphasen Handlungsregeln kurz reaktivieren; ruhige Arbeitsplatzgestaltung unterstützen.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere Aufmerksamkeitssteuerung (${rawScore}/${maxScore} Punkte). Zeigt noch Wechsel zwischen fokussierten Momenten und rascher Ablenkbarkeit.`;
        suggestedNextStep = 'Kurze, klar abgegrenzte Arbeitsschritte vereinbaren; visuelle Störreize auf Arbeitsblättern reduzieren und Stopp-Signale einüben.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt im Check deutlichen Unterstützungsbedarf bei der Aufmerksamkeits- und Impulskontrolle (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Aufmerksamkeit im Unterricht unter verschiedenen Lernbedingungen (z.B. mit Kopfhörern / Einzeltisch) gezielt beobachten und erneut überprüfen.';
        break;
    }
  }

  // =========================================================================
  // 9. ARBEITSGEDÄCHTNIS / ZAHLENSPANNE (lv-arbeitsgedaechtnis)
  // =========================================================================
  else if (isArbeitsgedaechtnis) {
    const recallsSequence = observationCounts['recalls_sequence'] || 0;
    const keepsOrder = observationCounts['keeps_order'] || 0;
    const rehearses = observationCounts['rehearses'] || 0;
    const groupsInfo = observationCounts['groups_information'] || 0;
    const usesStrategy = observationCounts['uses_strategy'] || 0;
    const losesOrder = observationCounts['loses_order'] || 0;
    const forgetsSteps = observationCounts['forgets_steps'] || 0;
    const needsRepetition = observationCounts['needs_repetition'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;

    const positiveSignals = recallsSequence + keepsOrder + rehearses + groupsInfo + usesStrategy;
    const disruptionSignals = losesOrder + forgetsSteps + needsRepetition + hesitant;

    if (accuracy >= 0.75 && disruptionSignals <= 2) {
      status = 'secure';
    } else if (accuracy >= 0.55 || (accuracy >= 0.45 && positiveSignals > disruptionSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.35) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (keepsOrder >= 1 || recallsSequence >= 2) {
      structuredObservations.push({
        type: 'strength',
        text: 'Behält Reihenfolgen und kurzfristig dargebotene Sequenzen sicher im Gedächtnis.',
        tag: 'keeps_order',
      });
    }

    if (rehearses >= 1 || groupsInfo >= 1 || usesStrategy >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Wendet eigenständig Merkstrategien an (z. B. inneres Mitsprechen oder Strukturieren).',
        tag: 'rehearses',
      });
    }

    if (losesOrder >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Elemente werden zwar erinnert, jedoch in veränderter Reihenfolge wiedergegeben.',
        tag: 'loses_order',
      });
    }

    if (forgetsSteps >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Bei mehrschrittigen Anweisungen gehen Teilschritte verloren.',
        tag: 'forgets_steps',
      });
    }

    if (needsRepetition >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Benötigte bei längeren Sequenzen eine Wiederholung der Vorgabe.',
        tag: 'needs_repetition',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Arbeitsgedächtnisspanne für schulische Anforderungen stabil.' : 'Gedächtnisspanne im Unterricht weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Sehr sicheres kurzfristiges Behalten (${rawScore}/${maxScore} Punkte). Sequenzen vorwärts und rückwärts sowie mehrschrittige Anweisungen gelingen zuverlässig.`;
        suggestedNextStep = 'Gutes kurzfristiges Behalten; kann mehrschrittige Arbeitsanweisungen im Unterricht eigenständig umsetzen.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend sicheres Behalten (${rawScore}/${maxScore} Punkte). 3–4 Informationseinheiten werden stabil erinnert; bei komplexerer Rückwärtsverarbeitung kurze Hilfen sinnvoll.`;
        suggestedNextStep = 'Bei 3-schrittigen Arbeitsaufträgen Zwischenschritte kurz visualisieren oder das Kind wiederholen lassen.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere Gedächtnisspanne (${rawScore}/${maxScore} Punkte). Kürzere Einheiten gelingen gut, bei längeren Ketten geht die Reihenfolge verloren.`;
        suggestedNextStep = 'Mehrschrittige Arbeitsanweisungen im Unterricht in 1–2 Einzelschritte portionieren und mit Bildkarten stützen.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt deutliche Unsicherheiten beim Behalten von Reihenfolgen und mehrteiligen Anweisungen (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Benötigt aktuell mehr Struktur und Wiederholung bei mündlichen Anweisungen; Merkstrategien (inneres Wiederholen) schrittweise anbahnen.';
        break;
    }
  }

  // =========================================================================
  // 10. VISUELLE WAHRNEHMUNG (lv-visuell)
  // =========================================================================
  else if (isVisuell) {
    const visualSecure = observationCounts['visual_discrimination_secure'] || 0;
    const systematicScan = observationCounts['systematic_scan'] || 0;
    const findsDiff = observationCounts['finds_difference'] || 0;
    const confusesSymbols = observationCounts['confuses_similar_symbols'] || 0;
    const overlooksDetails = observationCounts['overlooks_details'] || 0;
    const losesPlace = observationCounts['loses_place'] || 0;
    const needsMoreTime = observationCounts['needs_more_time'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const positiveSignals = visualSecure + systematicScan + findsDiff;
    const disruptionSignals = confusesSymbols + overlooksDetails + losesPlace + needsMoreTime + needsHint;

    if (accuracy >= 0.80 && disruptionSignals <= 1) {
      status = 'secure';
    } else if (accuracy >= 0.60) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (visualSecure >= 1 || findsDiff >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Unterscheidet feine optische Details, Formen und Zeichen sicher.',
        tag: 'visual_discrimination_secure',
      });
    }

    if (systematicScan >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Wendet einen systematischen Blickverlauf (z.B. zeilenweise Suche) an.',
        tag: 'systematic_scan',
      });
    }

    if (confusesSymbols >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Verwechselt optisch ähnliche Zeichen oder spiegelbildliche Formen (z.B. b/d, p/q).',
        tag: 'confuses_similar_symbols',
      });
    }

    if (overlooksDetails >= 1 || losesPlace >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Übersieht feine Detailmerkmale oder verliert bei dichter Anordnung die Position.',
        tag: 'overlooks_details',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Die bearbeiteten Aufgaben zur visuellen Differenzierung wurden in diesem Check sicher gelöst.' : 'Optische Differenzierung bei Buchstaben und Formen weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Sehr sichere visuelle Differenzierung und gezielter Blickverlauf (${rawScore}/${maxScore} Punkte). Optisch ähnliche Zeichen werden mühelos erkannt.`;
        suggestedNextStep = 'Visuelle Wahrnehmung ist für schulische Lese- und Schreibanforderungen gefestigt.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend sichere visuelle Wahrnehmung (${rawScore}/${maxScore} Punkte). Einzelne ähnliche Formen werden bei genauerem Hinsehen richtig unterschieden.`;
        suggestedNextStep = 'Bei dicht gestalteten Arbeitsblättern Lesezeiger / Lineal zur optischen Orientierung anbieten.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere visuelle Differenzierung (${rawScore}/${maxScore} Punkte). Zeigt Unsicherheiten bei spiegelverkehrten oder feinen Detailunterschieden.`;
        suggestedNextStep = 'Ähnliche Buchstabenformen (z.B. b/d) mit motorischen und visuellen Merkankern (z.B. Bauch links/rechts) gezielt festigen.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt deutliche Unsicherheiten bei der optischen Detailunterscheidung und Figur-Grund-Wahrnehmung (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Suchstrategien bei Arbeitsblättern explizit vorführen, Zeilenabstände vergrößern und optische Hilfen nutzen.';
        break;
    }
  }

  // =========================================================================
  // 11. RAUM-LAGE-ORIENTIERUNG (lv-raum-lage)
  // =========================================================================
  else if (isRaumLage) {
    const leftRightSecure = observationCounts['left_right_secure'] || 0;
    const spatialRelationSecure = observationCounts['spatial_relation_secure'] || 0;
    const rotationSecure = observationCounts['rotation_secure'] || 0;
    const usesReferencePoint = observationCounts['uses_reference_point'] || 0;
    const confusesLeftRight = observationCounts['confuses_left_right'] || 0;
    const confusesRotation = observationCounts['confuses_rotation'] || 0;
    const needsPhysicalOrientation = observationCounts['needs_physical_orientation'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const positiveSignals = leftRightSecure + spatialRelationSecure + rotationSecure + usesReferencePoint;
    const disruptionSignals = confusesLeftRight + confusesRotation + needsPhysicalOrientation + needsHint;

    if (accuracy >= 0.80 && disruptionSignals <= 1) {
      status = 'secure';
    } else if (accuracy >= 0.60) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (leftRightSecure >= 1 || spatialRelationSecure >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Beherrscht räumliche Lagebegriffe und Links-Rechts-Zuordnungen sicher.',
        tag: 'spatial_relation_secure',
      });
    }

    if (rotationSecure >= 1 || usesReferencePoint >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Erkennt Drehungen und Spiegelungen zielsicher im mentalen Vorstellungsvermögen.',
        tag: 'rotation_secure',
      });
    }

    if (confusesLeftRight >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Verwechselt rechts und links am Bild oder im Raster.',
        tag: 'confuses_left_right',
      });
    }

    if (confusesRotation >= 1 || needsPhysicalOrientation >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Benötigt bei Drehungen und Spiegelungen mehr Zeit oder körperliche Mitbewegung.',
        tag: 'confuses_rotation',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Raum-Lage-Orientierung sicher gesichert.' : 'Raumorientierung im Unterricht weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Sehr sichere Raum- und Lageorientierung (${rawScore}/${maxScore} Punkte). Richtungen, Rasterpositionen und Transformationen werden mühelos beherrscht.`;
        suggestedNextStep = 'Sichere Raumlage; geometrische Konstruktionen und Planarbeiten können eigenständig durchgeführt werden.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend sichere Raum-Lage-Kompetenz (${rawScore}/${maxScore} Punkte). Grundlegende Lagebeziehungen sicher, bei 180°-Drehungen kurze Bedenkzeit.`;
        suggestedNextStep = 'Lagebeziehungen im Raum überwiegend sicher; bei komplexeren Drehungen konkretes Anschauungsmaterial nutzen.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere Raumorientierung (${rawScore}/${maxScore} Punkte). Gelegentliche Unsicherheit bei Rechts-Links oder Spiegelachsen.`;
        suggestedNextStep = 'Links-Rechts-Begriffe am eigenen Körper und auf dem Tisch mit festen Orientierungspunkten (z.B. Schreibhand-Punkt) festigen.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt deutlichen Unterstützungsbedarf bei räumlichen Lagebeziehungen und Richtungsbegriffen (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Räumliche Lagebegriffe handlungsorientiert in Bewegung und mit konkretem Material festigen und im Unterricht weiter beobachten.';
        break;
    }
  }

  // =========================================================================
  // 12. FEINMOTORIK (lv-feinmotorik)
  // =========================================================================
  else if (isFeinmotorik) {
    const preciseGrip = observationCounts['precise_grip'] || 0;
    const handEye = observationCounts['hand_eye_coordination'] || 0;
    const bilateral = observationCounts['bilateral_coordination'] || 0;
    const controlledMove = observationCounts['controlled_movement'] || 0;
    const awkwardGrip = observationCounts['awkward_grip'] || 0;
    const dropsObjects = observationCounts['drops_objects'] || 0;
    const slowExecution = observationCounts['slow_execution'] || 0;
    const needsAssistance = observationCounts['needs_assistance'] || 0;

    const positiveSignals = preciseGrip + handEye + bilateral + controlledMove;
    const disruptionSignals = awkwardGrip + dropsObjects + slowExecution + needsAssistance;

    if (accuracy >= 0.75 && (positiveSignals >= disruptionSignals || disruptionSignals === 0)) {
      status = 'secure';
    } else if (accuracy >= 0.50 || (accuracy >= 0.40 && positiveSignals > disruptionSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.25 || disruptionSignals <= 3) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (preciseGrip >= 1 || handEye >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Zeigt einen sicheren Pinzettengriff und gute Hand-Auge-Koordination.',
        tag: 'precise_grip',
      });
    }

    if (bilateral >= 1 || controlledMove >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Halte- und Arbeitshand arbeiten beim Schneiden und Falten harmonisch zusammen.',
        tag: 'bilateral_coordination',
      });
    }

    if (awkwardGrip >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Nutzt beim Greifen von Kleinteilen noch unvollständige oder kraftaufwändige Fingergriffe.',
        tag: 'awkward_grip',
      });
    }

    if (needsAssistance >= 1 || slowExecution >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Benötigte bei Werkzeughandhabung (Schere/Falten) manuelle Unterstützung oder mehr Zeit.',
        tag: 'needs_assistance',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Feinmotorische Handlungen gelingen sicher und dosiert.' : 'Feinmotorische Entwicklung im Unterricht weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Sehr sichere feinmotorische Geschicklichkeit im schulischen Beobachtungscheck (${rawScore}/${maxScore} Punkte). Schere, Papier und Kleinteile werden koordiniert geführt.`;
        suggestedNextStep = 'Gute Hand-Auge-Koordination; reguläre Werk- und Bastelphasen ohne besondere Hilfen durchführen.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend sichere Feinmotorik (${rawScore}/${maxScore} Punkte). Die meisten Handlungen gelingen selbstständig; bei feinen Rundungen etwas Geduld einplanen.`;
        suggestedNextStep = 'Feinmotorische Handlungen gelingen weitgehend selbstständig; bei filigranen Schneidearbeiten ausreichend Zeit einräumen.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere Feinmotorik (${rawScore}/${maxScore} Punkte). Schneiden oder Falten zeigt noch Unterstützungs- oder Übungsbedarf.`;
        suggestedNextStep = 'Kurze feinmotorische Tätigkeiten (Kneten, Schneiden, Perlen auffädeln) spielerisch in den Wochenplan einbinden.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt im Check deutlichen Unterstützungsbedarf bei Werkzeuggebrauch und Fingerkoordination (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Zeigt noch Unsicherheit beim Werkzeuggebrauch; ergonomische Scheren und gezielte Kräftigungsübungen der Finger anbieten.';
        break;
    }
  }

  // =========================================================================
  // 13. GRAPHOMOTORIK (lv-graphomotorik)
  // =========================================================================
  else if (isGraphomotorik) {
    const gripFunctional = observationCounts['grip_functional'] || 0;
    const lineControlSecure = observationCounts['line_control_secure'] || 0;
    const movementFluid = observationCounts['movement_fluid'] || 0;
    const sizeConsistent = observationCounts['size_consistent'] || 0;
    const pressureAppropriate = observationCounts['pressure_appropriate'] || 0;
    const gripTense = observationCounts['grip_tense'] || 0;
    const excessivePressure = observationCounts['excessive_pressure'] || 0;
    const weakPressure = observationCounts['weak_pressure'] || 0;
    const movementStiff = observationCounts['movement_stiff'] || 0;
    const needsRepositioning = observationCounts['needs_repositioning'] || 0;

    const positiveSignals = gripFunctional + lineControlSecure + movementFluid + sizeConsistent + pressureAppropriate;
    const disruptionSignals = gripTense + excessivePressure + weakPressure + movementStiff + needsRepositioning;

    if (accuracy >= 0.75 && (positiveSignals >= disruptionSignals || disruptionSignals === 0)) {
      status = 'secure';
    } else if (accuracy >= 0.50 || (accuracy >= 0.40 && positiveSignals > disruptionSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.25 || disruptionSignals <= 3) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (gripFunctional >= 1 || pressureAppropriate >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Funktionale Stifthaltung (Dreipunktgriff) mit angemessener Druckdosierung.',
        tag: 'grip_functional',
      });
    }

    if (lineControlSecure >= 1 || movementFluid >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Sichere Linienführung und flüssiger Bewegungsablauf beim Schreiben/Zeichnen.',
        tag: 'movement_fluid',
      });
    }

    if (gripTense >= 1 || excessivePressure >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zeigt verkrampfte Stifthaltung oder übermäßig starken Schreibdruck.',
        tag: 'grip_tense',
      });
    }

    if (movementStiff >= 1 || weakPressure >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Bewegung erfolgt starr aus dem Arm oder mit sehr blassem Schriftbild.',
        tag: 'movement_stiff',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Die beobachteten graphomotorischen Aufgaben wurden in dieser Situation sicher ausgeführt.' : 'Schreibhaltung und Stiftführung im Unterricht weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Entspannte Stifthaltung, angemessener Schreibdruck und flüssiger Bewegungsablauf (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Im beobachteten Setting waren keine zusätzlichen Hilfen nötig; im Unterricht weiter beobachten.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend sichere Graphomotorik (${rawScore}/${maxScore} Punkte). Flüssiges Schriftbild; bei längeren Schreibphasen auf Lockerung achten.`;
        suggestedNextStep = 'Flüssiges Schriftbild; bei längeren Texten auf lockere Fingerhaltung und kurze Pausen achten.';
        break;
      case 'partlySecure':
        summaryText = `Teilweise sichere Graphomotorik (${rawScore}/${maxScore} Punkte). Zeigt Verkrampfung oder schwankenden Schreibdruck bei längeren Zeilen.`;
        suggestedNextStep = 'Stift mit Griffhilfe oder Dreikant-Profil anbieten; Lockerungsübungen vor dem Schreiben einbinden.';
        break;
      case 'needsObservation':
        summaryText = `Zeigt deutlichen Unterstützungsbedarf bei Stifthaltung, Druckdosierung oder Bewegungsfluss (${rawScore}/${maxScore} Punkte).`;
        suggestedNextStep = 'Zeigt deutliche Verkrampfung oder ungünstige Stifthaltung; kurze Schreibeinheiten vereinbaren und Stifte mit ergonomischer Griffmulde nutzen.';
        break;
    }
  }

  // =========================================================================
  // 14. ARBEITSVERHALTEN (sl-arbeitsverhalten, Schritt 12)
  // =========================================================================
  else if (isArbeitsverhalten) {
    const startsIndependently = observationCounts['starts_independently'] || 0;
    const staysOnTask = observationCounts['stays_on_task'] || 0;
    const organizedWorkplace = observationCounts['organized_workplace'] || 0;
    const persistentWithErrors = observationCounts['persistent_with_errors'] || 0;
    const asksConstructively = observationCounts['asks_for_help_constructively'] || 0;
    const managesTime = observationCounts['manages_time_well'] || 0;
    const plansSteps = observationCounts['plans_steps_ahead'] || 0;
    const reflectsWork = observationCounts['reflects_own_work'] || 0;

    const needsPrompting = observationCounts['needs_prompting'] || 0;
    const easilyDistracted = observationCounts['easily_distracted'] || 0;
    const messyWorkplace = observationCounts['messy_workplace'] || 0;
    const givesUpEasily = observationCounts['gives_up_easily'] || 0;
    const avoidsAskingHelp = observationCounts['avoids_asking_help'] || 0;
    const rushesThrough = observationCounts['rushes_through'] || 0;
    const worksTooSlowly = observationCounts['works_too_slowly'] || 0;
    const actsImpulsively = observationCounts['acts_impulsively'] || 0;
    const ignoresMistakes = observationCounts['ignores_mistakes'] || 0;

    const positiveSignals = startsIndependently + staysOnTask + organizedWorkplace + persistentWithErrors + asksConstructively + managesTime + plansSteps + reflectsWork;
    const challengingSignals = needsPrompting + easilyDistracted + messyWorkplace + givesUpEasily + avoidsAskingHelp + rushesThrough + worksTooSlowly + actsImpulsively + ignoresMistakes;

    if (accuracy >= 0.75 && (positiveSignals >= challengingSignals || challengingSignals === 0)) {
      status = 'secure';
    } else if (accuracy >= 0.50 || (accuracy >= 0.40 && positiveSignals >= challengingSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.25 || challengingSignals <= 3) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (startsIndependently >= 1 || plansSteps >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Beginnt Arbeitsaufträge zügig und selbstständig; zeigt planvolles Vorgehen.',
        tag: 'starts_independently',
      });
    }

    if (staysOnTask >= 1 || managesTime >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Zeigt gute Ausdauer in Stillarbeitsphasen und behält den Zeitrahmen im Blick.',
        tag: 'stays_on_task',
      });
    }

    if (organizedWorkplace >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Hält Arbeitsmaterialien übersichtlich und griffbereit am Platz.',
        tag: 'organized_workplace',
      });
    }

    if (persistentWithErrors >= 1 || reflectsWork >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Geht konstruktiv mit Fehlern um; nutzt Selbstkontroll-Angebote gewissenhaft.',
        tag: 'persistent_with_errors',
      });
    }

    if (needsPrompting >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Benötigt gelegentlich eine kurze persönliche Erinnerung oder Tafelorientierung zum Start.',
        tag: 'needs_prompting',
      });
    }

    if (easilyDistracted >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Lässt sich in offenen Phasen durch Umgebungsreize oder Mitschüler ablenken.',
        tag: 'easily_distracted',
      });
    }

    if (rushesThrough >= 1 || actsImpulsively >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Bearbeitet Aufgaben sehr flüchtig; vergisst die abschließende Selbstkontrolle vor der Abgabe.',
        tag: 'rushes_through',
      });
    }

    if (givesUpEasily >= 1 || avoidsAskingHelp >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zieht sich bei Hürden eher zurück; formuliert Hilfebedarf noch zögerlich.',
        tag: 'gives_up_easily',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure'
          ? 'Zeigt ein selbstständiges und zielgerichtetes Arbeitsverhalten.'
          : 'Arbeitsverhalten und Selbstorganisation im Unterricht weiter begleiten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Hohe Selbstständigkeit bei Arbeitsbeginn, Ausdauer und Materialorganisation (${positiveSignals} ressourcenstarke Signale erfasst).`;
        suggestedNextStep = 'Selbstständigkeit durch anspruchsvolle Wahlaufgaben im Wochenplan oder Expertenrollen weiter stärken.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend selbstständiges Arbeiten. Gelegentlich hilft ein kurzer Strukturimpuls oder eine Zeiterinnerung.`;
        suggestedNextStep = 'Mit einer kurzen Checkliste am Platz („Was brauche ich? Was ist mein erster Schritt?“) die Selbstorganisation festigen.';
        break;
      case 'partlySecure':
        summaryText = `Arbeitsstrukturen sind im Aufbau. Zeigt schwankende Ausdauer oder benötigt häufiger Erinnerungen zum Aufgabenstart.`;
        suggestedNextStep = 'Arbeitsaufträge in 2–3 sichtbare Teilschritte gliedern und gezielte Zwischenrückmeldungen vereinbaren.';
        break;
      case 'needsObservation':
        summaryText = `Deutlicher Unterstützungsbedarf bei Arbeitsorganisation, Beginn oder Durchhalten von Aufgabenphasen.`;
        suggestedNextStep = 'Reizarme Arbeitsplatzumgebung schaffen (z. B. Sichtschutz/Kopfhörer) und klare Start-Routinen mit Bildkarten festigen.';
        break;
    }
  }

  // =========================================================================
  // 15. SOZIALVERHALTEN & KOOPERATION (sl-sozialverhalten, Schritt 12)
  // =========================================================================
  else if (isSozialverhalten) {
    const cooperatesActively = observationCounts['cooperates_actively'] || 0;
    const followsRules = observationCounts['follows_rules'] || 0;
    const sharesMaterials = observationCounts['shares_materials'] || 0;
    const showsEmpathy = observationCounts['shows_empathy'] || 0;
    const resolvesPeacefully = observationCounts['resolves_conflicts_peacefully'] || 0;
    const acceptsFeedback = observationCounts['accepts_feedback'] || 0;
    const helpsOthers = observationCounts['helps_others'] || 0;
    const listensAttentively = observationCounts['listens_attentively'] || 0;

    const dominatesInteraction = observationCounts['dominates_interaction'] || 0;
    const withdrawnPassive = observationCounts['withdrawn_passive'] || 0;
    const disregardsRules = observationCounts['disregards_rules'] || 0;
    const possessiveMaterials = observationCounts['possessive_with_materials'] || 0;
    const escalatesConflicts = observationCounts['escalates_conflicts'] || 0;
    const defensiveFeedback = observationCounts['defensive_to_feedback'] || 0;
    const refusesCooperation = observationCounts['refuses_cooperation'] || 0;
    const interruptsOthers = observationCounts['interrupts_others'] || 0;

    const positiveSignals = cooperatesActively + followsRules + sharesMaterials + showsEmpathy + resolvesPeacefully + acceptsFeedback + helpsOthers + listensAttentively;
    const challengingSignals = dominatesInteraction + withdrawnPassive + disregardsRules + possessiveMaterials + escalatesConflicts + defensiveFeedback + refusesCooperation + interruptsOthers;

    if (accuracy >= 0.75 && (positiveSignals >= challengingSignals || challengingSignals === 0)) {
      status = 'secure';
    } else if (accuracy >= 0.50 || (accuracy >= 0.40 && positiveSignals >= challengingSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.25 || challengingSignals <= 3) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (cooperatesActively >= 1 || sharesMaterials >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Kooperiert aktiv in Partner- und Gruppenphasen; teilt Arbeitsmittel bereitwillig.',
        tag: 'cooperates_actively',
      });
    }

    if (listensAttentively >= 1 || followsRules >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Hält vereinbarte Gesprächsregeln ein und hört Beiträgen anderer Kinder aufmerksam zu.',
        tag: 'listens_attentively',
      });
    }

    if (showsEmpathy >= 1 || helpsOthers >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Zeigt Feinfühligkeit für Mitschüler und bietet unaufgefordert Unterstützung an.',
        tag: 'shows_empathy',
      });
    }

    if (resolvesPeacefully >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Klärt Meinungsverschiedenheiten sachlich und nutzt friedliche Lösungsstrategien.',
        tag: 'resolves_conflicts_peacefully',
      });
    }

    if (interruptsOthers >= 1 || dominatesInteraction >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Möchte Gesprächs- oder Gruppenphasen stark bestimmen; das Abwarten des eigenen Redeanteils fällt noch schwer.',
        tag: 'dominates_interaction',
      });
    }

    if (withdrawnPassive >= 1 || refusesCooperation >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Zieht sich in offenen sozialen Situationen eher zurück oder zögert bei Gruppenaufgaben.',
        tag: 'withdrawn_passive',
      });
    }

    if (escalatesConflicts >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Reagiert bei Missverständnissen oder Enttäuschungen schnell impulsiv.',
        tag: 'escalates_conflicts',
      });
    }

    if (defensiveFeedback >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Reagiert auf Rückmeldungen von Mitschülern oder Lehrkraft zunächst empfindlich oder abwehrend.',
        tag: 'defensive_to_feedback',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure'
          ? 'Zeigt verlässliches kooperatives Verhalten im Schulalltag.'
          : 'Soziale Interaktionsmuster in Gruppen- und Pausensituationen weiter beobachten.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Verlässliches, faires und empathisches Sozialverhalten in Partner- und Gruppenphasen (${positiveSignals} positive Signale).`;
        suggestedNextStep = 'Soziale Stärken gezielt in Patenschaften oder als Schlichter/Gruppensprecher einbinden.';
        break;
      case 'mostlySecure':
        summaryText = `Überwiegend kooperatives Verhalten. In dynamischen Situationen (Pause, Streit) gelegentlich noch Begleitung hilfreich.`;
        suggestedNextStep = 'Vereinbarungen für friedliche Pausenspiele und Gesprächsregeln in kurzen Reflexionsrunden bekräftigen.';
        break;
      case 'partlySecure':
        summaryText = `Kooperationsfähigkeiten sind im Aufbau. Zeigt bei Gruppenaufgaben oder Meinungsverschiedenheiten noch Unterstützungsbedarf.`;
        suggestedNextStep = 'Feste Partner mit klaren Rollenaufteilungen wählen; Stopp-Regel und friedliche Konfliktlösung einüben.';
        break;
      case 'needsObservation':
        summaryText = `Deutlicher Begleitbedarf bei Regelakzeptanz, Impulskontrolle oder Konfliktbewältigung im sozialen Miteinander.`;
        suggestedNextStep = 'Engmaschige Begleitung in Pausen- und Gruppenphasen; verbindliche Konfliktlösungs-Rituale gemeinsam erarbeiten.';
        break;
    }
  }

  // =========================================================================
  // 16. METAKOGNITION & SELBSTEINSCHÄTZUNG (sl-metakognition, Schritt 12)
  // =========================================================================
  else if (isMetakognition) {
    const assessesRealistically = observationCounts['assesses_self_realistically'] || 0;
    const namesStrategies = observationCounts['names_used_strategies'] || 0;
    const choosesTools = observationCounts['chooses_appropriate_tools'] || 0;
    const noticesDifficulties = observationCounts['notices_difficulties'] || 0;
    const adaptsStrategy = observationCounts['adapts_strategy'] || 0;
    const setsGoals = observationCounts['sets_learning_goals'] || 0;
    const verbalizesThinking = observationCounts['verbalizes_thinking_process'] || 0;

    const overestimates = observationCounts['overestimates_self'] || 0;
    const underestimates = observationCounts['underestimates_self'] || 0;
    const randomToolChoice = observationCounts['random_tool_choice'] || 0;
    const unawareOfErrors = observationCounts['unaware_of_errors'] || 0;
    const persistsIneffective = observationCounts['persists_with_ineffective_strategy'] || 0;

    const positiveSignals = assessesRealistically + namesStrategies + choosesTools + noticesDifficulties + adaptsStrategy + setsGoals + verbalizesThinking;
    const developmentSignals = overestimates + underestimates + randomToolChoice + unawareOfErrors + persistsIneffective;

    if (accuracy >= 0.75 && (positiveSignals >= developmentSignals || developmentSignals === 0)) {
      status = 'secure';
    } else if (accuracy >= 0.50 || (accuracy >= 0.40 && positiveSignals >= developmentSignals)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.25 || developmentSignals <= 3) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (assessesRealistically >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Schätzt die eigene Lösungsqualität und Aufgabenschwierigkeit realistisch ein.',
        tag: 'assesses_self_realistically',
      });
    }

    if (choosesTools >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Wählt gezielt passende Anschauungs- und Hilfsmittel zur Aufgabenbewältigung.',
        tag: 'chooses_appropriate_tools',
      });
    }

    if (verbalizesThinking >= 1 || namesStrategies >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Kann eigene Denk- und Lösungswege sprachlich nachvollziehbar erklären („Lautes Denken“).',
        tag: 'verbalizes_thinking_process',
      });
    }

    if (adaptsStrategy >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Passt das eigene Vorgehen flexibel an, wenn ein Weg nicht zum Ziel führt („Plan B“).',
        tag: 'adapts_strategy',
      });
    }

    if (overestimates >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Schätzt Aufgaben sehr optimistisch ein („Ganz leicht!“), obwohl Hürden auftraten. Guter Anlass für gemeinsamen Kriterienabgleich.',
        tag: 'overestimates_self',
      });
    }

    if (underestimates >= 1) {
      structuredObservations.push({
        type: 'observation',
        text: 'Stuft eigene Leistungen vorsichtig oder ängstlich ein, obwohl die Aufgaben sicher gelöst wurden. Ermutigung stärkt das Selbstvertrauen.',
        tag: 'underestimates_self',
      });
    }

    if (noticesDifficulties >= 1) {
      structuredObservations.push({
        type: 'strength',
        text: 'Erkennt Hürden und kann die knifflige Stelle in der Aufgabe genau zeigen.',
        tag: 'notices_difficulties',
      });
    }

    if (unawareOfErrors >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Bemerkt eigene Unsicherheiten oder Fehlerstellen noch wenig; nimmt Aufgabenverlauf global wahr.',
        tag: 'unaware_of_errors',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure'
          ? 'Metakognitives Bewusstsein und Reflexionsfähigkeit sind altersangemessen ausgeprägt.'
          : 'Reflexion eigener Lernschritte und Hilfsmittelwahl weiter im Dialog anregen.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Hohes Reflexionsbewusstsein: Schätzt Anforderungen treffend ein, benennt Strategien und wählt Hilfen zielgerichtet (${positiveSignals} positive Beobachtungen).`;
        suggestedNextStep = 'Strategievielfalt vertiefen und das Kind zum Vergleichen verschiedener Rechen-/Lesewege ermutigen.';
        break;
      case 'mostlySecure':
        summaryText = `Gute Ansätze zur Selbstreflexion. Mit gezielten Impulsen können Lösungswege und Hilfsmittelwahl gut verbalisiert werden.`;
        suggestedNextStep = 'In kurzen Lernstandsgesprächen regelmäßig fragen: „Was hat dir geholfen? Was würdest du beim nächsten Mal genauso machen?“';
        break;
      case 'partlySecure':
        summaryText = `Metakognitive Prozesse im Aufbau. Selbsteinschätzung und Aufgabenverlauf weichen teilweise ab; Hilfen werden eher intuitiv gewählt.`;
        suggestedNextStep = 'Kindgerechte Ampelkarten (🟢 leicht, 🟡 okay, 🔴 schwer) und Bildsymbole für Hilfen im Unterricht etablieren.';
        break;
      case 'needsObservation':
        summaryText = `Deutlicher Entwicklungsbedarf bei der Reflexion des eigenen Lernens und Erkennen von Fehlerquellen.`;
        suggestedNextStep = 'Gemeinsame Lösungswege kleinschrittig nachzeichnen („Lautes Denken der Lehrkraft“ als Vorbild) und Fehler wertfrei als Lernchancen besprechen.';
        break;
    }
  }

  // =========================================================================
  // 17. GENERAL / MENGENVERSTÄNDNIS & PILOT
  // =========================================================================
  else {
    const instant = observationCounts['instant'] || 0;
    const counted = observationCounts['counted'] || 0;
    const hesitant = observationCounts['hesitant'] || 0;
    const strategyUsed = observationCounts['strategy_used'] || 0;
    const needsHint = observationCounts['needs_hint'] || 0;

    const positiveBehaviors = instant + strategyUsed;
    const challengingBehaviors = counted + hesitant + needsHint;

    if (accuracy >= 0.85 && (positiveBehaviors >= challengingBehaviors || challengingBehaviors <= 1)) {
      status = 'secure';
    } else if (accuracy >= 0.70 || (accuracy >= 0.60 && positiveBehaviors > challengingBehaviors)) {
      status = 'mostlySecure';
    } else if (accuracy >= 0.40) {
      status = 'partlySecure';
    } else {
      status = 'needsObservation';
    }

    if (status === 'secure' && counted >= Math.ceil(maxScore * 0.6)) {
      status = 'mostlySecure';
    }

    if (instant >= 2) {
      structuredObservations.push({
        type: 'strength',
        text: 'Mengen werden in vielen Situationen blitzartig/simultan ohne Abzählen erfasst.',
        tag: 'instant',
      });
    }

    if (strategyUsed >= 1) {
      structuredObservations.push({
        type: 'strategy',
        text: 'Nutzt mathematische Strukturen (z. B. Fünfer-/Zehnerbündel, Verdopplungen).',
        tag: 'strategy_used',
      });
    }

    if (counted >= 2) {
      structuredObservations.push({
        type: 'observation',
        text: 'Greift bei größeren oder weniger vertrauten Mengen noch auf einzelnes Abzählen zurück.',
        tag: 'counted',
      });
    }

    if (hesitant >= 2) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Zeigt noch Unsicherheiten beim schnellen Erkennen oder Vergleichen von Mengen.',
        tag: 'hesitant',
      });
    }

    if (needsHint >= 1) {
      structuredObservations.push({
        type: 'difficulty',
        text: 'Benötigte bei einzelnen Aufgaben einen gezielten Impuls oder Hinweis.',
        tag: 'needs_hint',
      });
    }

    if (structuredObservations.length === 0) {
      structuredObservations.push({
        type: status === 'secure' ? 'strength' : 'observation',
        text: status === 'secure' ? 'Aufgaben wurden zügig und sicher gelöst.' : 'Mengenbeziehungen sind in Entwicklung.',
      });
    }

    switch (status) {
      case 'secure':
        summaryText = `Auf Niveau ${level.level} sehr sichere Mengenerfassung (${rawScore}/${maxScore} Punkte). Mengenstrukturen werden selbstständig und zügig genutzt.`;
        suggestedNextStep = level.level < 4 
          ? `Kompetenz ist auf Niveau ${level.level} gefestigt. Bei Gelegenheit nächsthöhere Zahlräume oder Niveau ${level.level + 1} ansehen.`
          : 'Kompetenz ist umfassend gefestigt. Kann für komplexere Rechenstrategien genutzt werden.';
        break;
      case 'mostlySecure':
        summaryText = `Auf Niveau ${level.level} überwiegend sichere Mengenerfassung (${rawScore}/${maxScore} Punkte). Gelegentlich wird noch gezählt oder kurz nachgedacht.`;
        suggestedNextStep = 'Strukturierte Mengenbilder (z. B. 5er-/10er-Felder) in kurzen Übungen festigen und in 4–6 Wochen erneut prüfen.';
        break;
      case 'partlySecure':
        summaryText = `Auf Niveau ${level.level} teilweise sichere Mengenerfassung (${rawScore}/${maxScore} Punkte). Erste Strukturen sind erkennbar, jedoch noch wechselhaft.`;
        suggestedNextStep = 'Gezielte Handlungen mit strukturiertem Material (Wendeplättchen, Zehnerfeld) anbieten, um das Abzählen schrittweise abzulösen.';
        break;
      case 'needsObservation':
        summaryText = `Auf Niveau ${level.level} noch deutlicher Unterstützungsbedarf (${rawScore}/${maxScore} Punkte). Häufiges Abzählen oder Unsicherheiten bei Mengenstrukturen.`;
        suggestedNextStep = level.level > 1
          ? `Möglicherweise vorerst Basismengen auf Niveau ${level.level - 1} festigen und Anschauungsmaterial intensiv einbinden.`
          : 'Grundlegende Mengen bis 5 intensiv handlungsorientiert mit konkretem Material aufbauen.';
        break;
    }
  }

  // Level Advice Calculation
  let levelAdvice: EvaluationResult['levelAdvice'] = null;
  if (status === 'secure' && accuracy >= 0.88 && level.level < 4) {
    levelAdvice = {
      type: 'higher',
      message: `Sehr sichere Beherrschung auf ${level.label}. Möchtest du bei Gelegenheit Niveau ${level.level + 1} überprüfen?`,
      suggestedLevel: level.level + 1,
    };
  } else if (status === 'needsObservation' && accuracy < 0.35 && level.level > 1) {
    levelAdvice = {
      type: 'lower',
      message: `Auf ${level.label} noch herausfordernd. Möglicherweise ist Niveau ${level.level - 1} zur genaueren Standortbestimmung aussagekräftiger.`,
      suggestedLevel: level.level - 1,
    };
  }

  return {
    status,
    rawScore,
    maxScore,
    normalizedScore,
    observationCounts,
    structuredObservations,
    competencyResults,
    summaryText,
    suggestedNextStep,
    levelAdvice,
  };
}
