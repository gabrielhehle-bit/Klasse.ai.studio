/**
 * ============================================================================
 * DIAGNOSTIK CORE - ZENTRALES DATENMODELL & TAXONOMIE (SCHRITT 1)
 * ============================================================================
 * 
 * Saubere, erweiterbare und kompetenzorientierte Grundstruktur für die 
 * Neuausrichtung der Diagnostik in der LehrerAPP.
 * 
 * Version: 1
 * Begründung:
 * - Ermöglicht gezielte 1:1-Diagnostik, Screenings, Beobachtungen und Verläufe
 * - Beantwortet: "Was kann das Kind in welchem Kompetenzbereich?" statt nur Rohpunkte
 * - Neutrale 4-stufige qualitative Skala statt vorzeitiger "Förderbedarf"-Zuschreibung
 * - Streng abwärtskompatibel zu bestehenden DiagnostikTest- und DiagnostikErhebung-Daten
 */

/**
 * 1. FACHBEREICHE (DiagnosticDomain)
 * Stabile Kern-IDs: 'deutsch', 'mathematik', 'lernvoraussetzungen', 'sozial-lernen'
 */
export interface DiagnosticDomain {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

/**
 * 2. KOMPETENZBEREICHE (DiagnosticCompetencyArea)
 * z. B. 'de-lesen', 'ma-zahlen', 'lv-basis', 'sl-sozial-lernen'
 */
export interface DiagnosticCompetencyArea {
  id: string;
  domainId: string;
  name: string;
  description?: string;
  order: number;
}

/**
 * 3. KONKRETE KOMPETENZEN (DiagnosticCompetency)
 * Stabile IDs für beobachtbare und überprüfbare Teilkompetenzen
 */
export interface DiagnosticCompetency {
  id: string;
  areaId: string;
  name: string;
  description?: string;
  order: number;
  recommendedGrade?: number[];
  tags?: string[];
}

/**
 * TEST-MODI
 */
export type DiagnosticTestMode = 'oneToOne' | 'screening' | 'observation' | string;

/**
 * 4. STANDARDISIERTER TEST-TYP (DiagnosticTestDefinition)
 * Beschreibt Tests, Screenings und Beobachtungsbögen und referenziert
 * eine oder mehrere spezifische Kompetenzen.
 */
export interface DiagnosticTestDefinition {
  id: string;
  title: string;
  description: string;
  domainId: string;
  competencyAreaId: string;
  competencyIds: string[];
  mode: DiagnosticTestMode;
  recommendedGrade?: number[];
  durationMinutes?: number;
  instructions?: string;
  tags?: string[];
}

/**
 * 5. EINHEITLICHE QUALITATIVE STATUS-SKALA
 * Neutrale 4-Stufen-Skala ohne voreilige Stigmatisierung
 */
export type CompetencyStatus = 
  | 'secure'            // Sicher
  | 'mostlySecure'      // Überwiegend sicher
  | 'partlySecure'      // Teilweise sicher
  | 'needsObservation'; // Weiter beobachten

/**
 * 6. STRUKTURIERTE BEOBACHTUNGEN
 */
export type DiagnosticObservationType = 
  | 'strength'      // Stärke
  | 'observation'   // Beobachtung
  | 'difficulty'    // Herausforderung / Auffälligkeit
  | 'strategy';     // Verwendete Strategie

export type DiagnosticObservationTag = 
  // General / Mengen & Kopfrechnen
  | 'instant'                  // sofort erkannt / gelöst (Subitizing / Fakt)
  | 'counted'                  // gezählt (zählt einzeln ab)
  | 'hesitant'                 // unsicher (zögert / probiert)
  | 'strategy_used'            // Strategie genutzt (z. B. 5er-/10er-Bündel, Verdopplung)
  | 'needs_hint'               // braucht Hinweis (Unterstützung erforderlich)
  | 'calculated'               // gerechnet (mentaler Rechenschritt / Halbschriftlich)
  // Zehnerübergang
  | 'decomposes_meaningful'    // zerlegt sinnvoll (z. B. Stopp bei 10: 8+2+3)
  | 'decomposed'               // zerlegt
  | 'ten_stop_used'            // Stopp bei 10 genutzt
  | 'bridges_to_ten'           // ergänzt zum Zehner
  | 'uses_near_double'         // nutzt Nachbaraufgabe (z. B. 7+7 -> 7+6)
  | 'counts_on'                // zählt weiter (ab erstem Summand)
  | 'counts_on_fingers'        // zählt an Fingern
  | 'counts_back'              // rechnet rückwärts
  | 'strategy_switched'        // Strategie gewechselt
  // Leseflüssigkeit
  | 'fluent'                   // flüssig
  | 'halting'                  // stockend
  | 'spelling_out'             // buchstabierend
  | 'meaningful_phrasing'      // sinnvolle Phrasierung
  | 'frequent_self_correction' // häufige Selbstkorrektur
  | 'skips_words'              // überspringt Wörter
  | 'loses_line'               // verliert Zeile
  // Zahlenraum & Stellenwert (Schritt 6)
  | 'number_concept_secure'    // Zahlvorstellung sicher
  | 'place_value_secure'       // Stellenwert sicher
  | 'uses_grouping'            // nutzt Bündelung
  | 'needs_material'           // braucht Material
  | 'counts_stepwise'          // zählt schrittweise
  | 'confuses_places'          // verwechselt Stellenwerte (z. B. Z und E)
  | 'digit_reversal'           // Zahlendreher (z. B. 35 als 53)
  | 'number_line_secure'       // Zahlenstrahl sicher
  // Multiplikation / Einmaleins (Schritt 6)
  | 'core_fact_used'           // Kernaufgabe genutzt (1x, 2x, 5x, 10x)
  | 'commutative_used'         // Tauschaufgabe genutzt
  | 'near_fact_used'           // Nachbaraufgabe genutzt
  | 'double_half_used'         // Verdoppeln/Halbieren
  | 'repeated_addition'        // wiederholt addiert (z. B. 4+4+4)
  // Leseverständnis (Schritt 6 & 9)
  | 'finds_information'        // findet Information gezielt
  | 'rereads_text'             // liest erneut nach
  | 'connects_information'     // verknüpft Informationen
  | 'connects_ideas'           // verknüpft Ideen / Handlungsstränge
  | 'identifies_main_idea'     // erkennt Kernaussage / Hauptgedanken
  | 'literal_understanding'    // wörtliches Textverständnis
  | 'uses_text_evidence'       // belegt mit Textstellen
  | 'critical_reflection'      // kritische Reflexion / eigene Bewertung
  | 'makes_inferences'         // zieht Schlussfolgerungen
  | 'draws_inference'          // schließt sinnvoll
  | 'draws_inferences'         // schließt logisch
  | 'checks_text'              // schlägt im Text nach
  | 'answers_from_memory'      // antwortet aus Erinnerung
  | 'recalls_details'          // erinnert Details
  | 'own_words_summary'        // fasst in eigenen Worten zusammen
  | 'understands_structure'    // versteht Handlungsstruktur
  | 'needs_prompt'             // benötigt gezielte Nachfrage
  | 'overlooks_information'    // übersieht Textinformation
  | 'confuses_facts'           // bringt Fakten durcheinander
  | 'guesses'                  // rät ohne Textbezug
  | 'guesses_answers'          // rät Antworten
  | 'does_not_understand_question' // versteht Frage nicht
  // Phonologische Bewusstheit (Schritt 6)
  | 'rhyme_secure'             // Reime sicher
  | 'syllable_secure'          // Silben sicher
  | 'initial_sound_secure'     // Anlaute sicher
  | 'final_sound_secure'       // Endlaute sicher
  | 'isolates_initial'         // isoliert Anlaut
  | 'isolates_final'           // isoliert Endlaut
  | 'phoneme_blending_secure'  // Lautsynthese sicher
  | 'blends_sounds'            // synthetisiert Laute
  | 'phoneme_segmentation_secure' // Lautanalyse sicher
  | 'segments_words'           // segmentiert Wörter
  | 'manipulates_phonemes'     // manipuliert Phoneme (Austausch/Löschung)
  | 'deletes_sounds'           // tilgt/löscht Laute
  | 'sound_confusion'          // Lautverwechslung
  | 'confuses_letter_sound'    // verwechselt Buchstabe/Laut
  | 'motor_support'            // motorische Unterstützung (Klatschen/Schwingen)
  | 'confuses_sound_and_letter_name' // verwechselt Laut & Buchstabenname (z. B. "em" statt /m/)

  // --------------------------------------------------------------------------
  // LERNVORAUSSETZUNGEN (Schritt 11)
  // --------------------------------------------------------------------------
  // 1. Aufmerksamkeit & Impulskontrolle
  | 'stays_focused'            // bleibt fokussiert
  | 'works_systematically'     // arbeitet systematisch
  | 'distractible'             // leicht ablenkbar
  | 'impulsive_response'       // reagiert vorschnell / impulsiv
  | 'misses_targets'           // übersieht Zielreize
  | 'rule_kept'                // Regel sicher beibehalten
  | 'rule_lost'                // verliert Regel
  | 'fatigue_observed'         // Konzentration lässt im Verlauf nach

  // 2. Arbeitsgedächtnis
  | 'recalls_sequence'         // erinnert Sequenz
  | 'keeps_order'              // behält Reihenfolge
  | 'rehearses'                // spricht leise mit / inneres Wiederholen
  | 'groups_information'       // nutzt Bündelung / Chunking
  | 'loses_order'              // verliert Reihenfolge
  | 'forgets_steps'            // vergisst Teilschritte
  | 'uses_strategy'            // nutzt gezielte Merkstrategie

  // 3. Visuelle Wahrnehmung
  | 'visual_discrimination_secure' // visuelle Differenzierung sicher
  | 'systematic_scan'          // systematischer Suchverlauf (z.B. zeilenweise)
  | 'finds_difference'         // erkennt Details / Unterschiede sicher
  | 'overlooks_details'        // übersieht optische Details
  | 'confuses_similar_symbols' // verwechselt ähnliche Symbole (b/d, p/q)
  | 'loses_place'              // verliert Zeile / Suchposition
  | 'needs_more_time'          // benötigt mehr Betrachtungszeit

  // 4. Raum-Lage-Orientierung
  | 'left_right_secure'        // Links-Rechts-Unterscheidung sicher
  | 'spatial_relation_secure'  // Lagebeziehungen sicher erfasst
  | 'rotation_secure'          // Drehungen sicher erkannt
  | 'uses_reference_point'     // nutzt Bezugspunkt / Orientierungshilfe
  | 'confuses_left_right'      // verwechselt links und rechts
  | 'confuses_rotation'        // Schwierigkeit bei Drehung/Spiegelung
  | 'needs_physical_orientation' // dreht Kopf / Körper / Blatt mit

  // 5. Feinmotorik
  | 'precise_grip'             // präziser Pinzettengriff
  | 'hand_eye_coordination'    // sichere Hand-Auge-Koordination
  | 'bilateral_coordination'   // gute beidhändige Koordination (Halte- & Arbeitshand)
  | 'controlled_movement'      // dosierte, kontrollierte Kraft & Bewegung
  | 'awkward_grip'             // ungünstiger / unvollständiger Griff
  | 'drops_objects'            // Gegenstände entgleiten
  | 'slow_execution'           // stark verlangsamte Ausführung
  | 'needs_assistance'         // benötigt manuelle Unterstützung

  // 6. Graphomotorik
  | 'grip_functional'          // funktionale Stifthaltung (Dreipunktgriff)
  | 'line_control_secure'      // sichere Linienführung & Formtreue
  | 'movement_fluid'           // flüssiger Bewegungsablauf
  | 'size_consistent'          // gleichmäßige Größenkonstanz
  | 'pressure_appropriate'     // angemessener Schreibdruck
  | 'grip_tense'               // verkrampfte Stifthaltung
  | 'excessive_pressure'       // zu starker Schreibdruck (drückt durch)
  | 'weak_pressure'            // zu schwacher Schreibdruck (blasse Linien)
  | 'movement_stiff'           // starre Bewegung aus dem ganzen Arm
  | 'needs_repositioning'      // korrigiert Sitz-/Blatthaltung

  // --------------------------------------------------------------------------
  // SOZIAL & LERNEN (Schritt 12)
  // --------------------------------------------------------------------------
  // 1. Arbeitsverhalten & Selbstständigkeit
  | 'starts_independently'      // beginnt selbstständig
  | 'starts_after_orientation'  // beginnt nach kurzer Orientierung
  | 'works_independently'       // arbeitet eigenständig
  | 'asks_targeted_help'        // fragt gezielt nach / holt gezielt Hilfe
  | 'stays_with_task'           // bleibt über angemessene Zeit bei der Aufgabe
  | 'stays_on_task'             // bleibt konzentriert bei der Sache
  | 'works_with_breaks'         // arbeitet mit kurzen Unterbrechungen weiter
  | 'organizes_material'        // Material gut organisiert / vorbereitet
  | 'material_ready'            // findet benötigtes Material
  | 'tidy_workplace'            // hält Arbeitsplatz übersichtlich
  | 'organized_workplace'       // gut organisierter Arbeitsplatz
  | 'checks_work'               // überprüft eigene Arbeit sorgfältig
  | 'corrects_errors'           // korrigiert Fehler selbstständig
  | 'tries_again'               // versucht es beharrlich erneut
  | 'persistent_with_errors'    // beharrlich trotz Fehlern
  | 'appropriate_work_pace'     // angemessenes, stetiges Arbeitstempo
  | 'handles_distractions_well' // lässt sich nicht leicht ablenken
  | 'needs_repeated_prompt'     // braucht wiederholte Erinnerung / Impuls zum Start
  | 'needs_prompting'           // benötigt Aufforderung
  | 'waits_for_direct_help'     // wartet unselbstständig auf direkte Hilfe
  | 'needs_reassurance'         // benötigt häufig Rückversicherung
  | 'loses_task_focus'          // verliert den Arbeitsfokus / ablenkbar
  | 'easily_distracted'         // leicht ablenkbar bei der Arbeit
  | 'rushes_through'            // arbeitet überhastet / flüchtig
  | 'stops_after_error'         // bricht nach Fehler ab / vermeidet weitere Versuche
  | 'gives_up_easily'           // gibt bei Schwierigkeiten schnell auf
  | 'premature_task_abort'      // bricht Aufgaben häufig vorzeitig ab
  | 'needs_step_by_step_support' // braucht schrittweise Begleitung
  | 'needs_org_support'         // braucht Unterstützung bei Materialorganisation
  | 'avoids_asking_help'        // fragt ungern nach Hilfe
  | 'asks_for_help_constructively' // fragt konstruktiv und gezielt nach Unterstützung
  | 'reflects_own_work'         // reflektiert eigene Arbeitsergebnisse
  | 'ignores_mistakes'          // übergeht Fehler ohne Korrekturversuch
  | 'manages_time_well'         // teilt sich Zeit gut ein
  | 'works_too_slowly'          // arbeitet auffallend verlangsamt / vertrödelt Zeit
  | 'plans_steps_ahead'         // plant Zwischenschritte vorausschauend
  | 'acts_impulsively'          // handelt vorschnell / impulsiv
  | 'messy_workplace'           // unstrukturierter Arbeitsplatz

  // 2. Sozialverhalten & Kooperation
  | 'cooperates'                // arbeitet konstruktiv mit anderen zusammen
  | 'cooperates_actively'       // arbeitet aktiv und engagiert mit anderen zusammen
  | 'active_in_group'           // bringt sich aktiv in Gruppen ein
  | 'listens_to_others'         // hört anderen aufmerksam zu
  | 'listens_attentively'       // hört aufmerksam zu
  | 'takes_turns'               // wartet Gesprächs- oder Spielbeitrag ab
  | 'offers_help'               // bietet anderen proaktiv Hilfe an
  | 'helps_others'              // unterstützt Mitschüler hilfsbereit
  | 'accepts_help'              // nimmt Unterstützung von Mitschülern an
  | 'expresses_needs_clearly'   // äußert eigene Bedürfnisse gewaltfrei und klar
  | 'respects_boundaries'       // nimmt Grenzen anderer wahr und respektiert sie
  | 'finds_compromise'          // verhandelt und findet gemeinsame Kompromisse
  | 'shares_materials'          // teilt Gemeinschaftsmaterialien bereitwillig
  | 'shows_empathy'             // nimmt Gefühle anderer wahr und tröstet/unterstützt
  | 'deescalates_conflict'      // trägt aktiv zur Konfliktschlichtung bei
  | 'resolves_conflicts_peacefully' // löst Konflikte friedlich und verbal
  | 'participates_in_circle'    // beteiligt sich verlässlich am Gesprächskreis
  | 'needs_support_in_conflict' // benötigt bei Konflikten Unterstützung zur Lösung
  | 'escalates_conflicts'       // neigt zu Konflikteskalation
  | 'interrupts_often'          // fällt anderen häufig ins Wort
  | 'interrupts_others'         // unterbricht andere beim Sprechen
  | 'follows_rules'             // hält Gruppen- und Spielregeln verlässlich ein
  | 'disregards_rules'          // missachtet vereinbarte Regeln
  | 'dominates_interaction'     // dominiert Gespräche oder Gruppenentscheidungen
  | 'refuses_cooperation'       // verweigert Kooperation mit bestimmten Kindern
  | 'accepts_feedback'          // nimmt sachliche Rückmeldungen an
  | 'defensive_to_feedback'     // reagiert abwehrend auf Rückmeldungen
  | 'withdraws_from_group'      // zieht sich in Gruppenphasen stark zurück
  | 'withdrawn_passive'         // verhält sich passiv / zurückgezogen
  | 'reacts_impulsively'        // reagiert bei Frust/Konflikt vorschnell oder emotional
  | 'needs_help_with_perspective_taking' // benötigt Hilfe, die Sichtweise anderer zu verstehen

  // 3. Metakognition & Selbsteinschätzung
  | 'assesses_self_realistically' // schätzt eigenes Können realistisch ein
  | 'recognizes_uncertainty'    // erkennt eigene Unsicherheiten rechtzeitig
  | 'notices_difficulties'      // nimmt eigene Lernschwierigkeiten wahr
  | 'names_strategy'            // kann genutzte Lösungsstrategie klar benennen
  | 'names_used_strategies'     // benennt genutzte Strategien
  | 'verbalizes_thinking_process' // versprachlicht den eigenen Denkprozess
  | 'adapts_strategy'           // passt Vorgehensweise flexibel an
  | 'persists_with_ineffective_strategy' // hält an unökonomischer Strategie fest
  | 'reflects_on_error'         // reflektiert eigene Fehler sachlich und konstruktiv
  | 'asks_for_help_appropriately' // fordert Hilfe bewusst und gezielt ein
  | 'identifies_next_step'      // kann nächsten Lern- oder Arbeitsschritt benennen
  | 'sets_learning_goals'       // setzt sich eigene Lern- und Übungsziele
  | 'uses_feedback'             // setzt erhaltene Rückmeldungen gezielt um
  | 'chooses_helpful_tool'      // wählt gezielt passende Hilfsmittel/Materialien
  | 'chooses_appropriate_tools' // wählt angemessene Arbeits- und Hilfsmittel
  | 'random_tool_choice'        // wählt Hilfsmittel willkürlich ohne erkennbaren Nutzen
  | 'explains_learning_process' // kann den eigenen Lernweg nachvollziehbar erklären
  | 'self_assessment_matches'   // Selbst- und Fremdeinschätzung stimmen überein
  | 'cannot_name_strategy_yet'  // kann eigene Vorgehensweise noch nicht benennen
  | 'needs_prompt_for_reflection' // benötigt gezielte Impulse zur Selbstreflexion
  | 'self_assessment_differs_from_observation' // Selbsteinschätzung und Lehrerbeobachtung unterscheiden sich aktuell
  | 'overestimates_self'        // schätzt eigene Leistungsfähigkeit tendenziell zu hoch ein
  | 'underestimates_self'       // schätzt eigene Leistungsfähigkeit tendenziell zu vorsichtig ein
  | 'unaware_of_errors'         // nimmt eigene Fehler noch nicht selbstständig wahr

  // Allgemein
  | 'needs_repetition';        // braucht Wiederholung der Aufgabenstellung

export interface DiagnosticObservation {
  type: DiagnosticObservationType;
  text: string;
  competencyId?: string;
  tag?: DiagnosticObservationTag;
}

/**
 * 6b. AUFGABENTYPEN & LEVEL-STRUKTUR (SCHRITT 3)
 */
export type DiagnosticTaskType = 
  | 'choice'           // Auswahl aus mehreren Optionen
  | 'successFailure'   // Richtig / Falsch bzw. Gelingt / Gelingt nicht
  | 'numeric'          // Zahleneingabe oder Zahlenwert
  | 'reading'          // Lautlesetext mit Zeit- & Wort-Erfassung
  | 'calculation'      // Rechenaufgabe mit Strategiebeobachtung
  | 'observation';     // Reine Verhaltens- / Strategiebeobachtung

export type DiagnosticTaskAspect = 
  | 'instant_recognition'     // Mengen direkt / simultan erkennen (Subitizing)
  | 'comparison'              // Mengen vergleichen
  | 'number_match'            // Zahl <-> Menge zuordnen
  | 'structure_decomposition' // Mengenstruktur & Zerlegung (5er, 10er, Stellenwert)
  | 'structure_recognition'   // Strukturiertes Erfassen
  | 'decomposition'           // Zerlegen
  | 'calculation'             // Rechnen / Rechenoperation
  | 'reading_fluency'         // Leseflüssigkeit & Lesetempo
  | 'reading_accuracy'        // Lesegenauigkeit & Dekodierung
  | 'reading_prosody'         // Phrasierung & Betonung
  | 'ten_carry_addition'      // Zehnerübergang Addition
  | 'ten_carry_subtraction'   // Zehnerübergang Subtraktion
  | 'mental_fact_retrieval'   // Faktenabruf / Grundaufgaben
  | 'mental_strategy'         // Strategisches Kopfrechnen
  // Schritt 6 Aspekte
  | 'number_orientation'      // Zahlvorstellung, Zahlenstrahl, Nachbarzahlen
  | 'place_value_bundling'    // Stellenwert & Bündelung
  | 'multiplication_concept'  // Multiplikatives Verständnis
  | 'multiplication_strategy' // Ableitungen & Kernaufgaben
  | 'reading_comprehension'   // Leseverständnis / Sinnerfassung
  | 'comprehension_literal'   // Wörtliches Detailverstehen
  | 'comprehension_inferential' // Logische Inferenz
  | 'comprehension_critical'  // Textreflexion / Hauptaussage
  | 'literal_comprehension'   // Wörtliches Detailverstehen (Screening)
  | 'inferential_comprehension' // Schlussfolgerndes Leseverständnis (Screening)
  | 'evaluative_comprehension'// Bewertendes Leseverständnis (Screening)
  | 'phonology_rhyme_syllable'// Reime & Silben
  | 'phonology_rhyme'         // Reimerkennung & -bildung
  | 'phonology_syllable'      // Silbengliederung & -segmentierung
  | 'phonology_initial_sound' // Anlautidentifikation
  | 'phonology_final_sound'   // Endlautidentifikation
  | 'phonology_synthesis'     // Lautsynthese
  | 'phonology_analysis'      // Lautanalyse & -segmentierung
  | 'phonology_manipulation'  // Phonemmanipulation / Lautaustausch
  // Lernvoraussetzungen Aspekte (Schritt 11)
  | 'attention_selective'            // Selektive Aufmerksamkeit / Suchgitter
  | 'attention_focus'                // Aufmerksamkeitsfokus / Zielsuche
  | 'attention_rule_maintenance'     // Regelbeibehaltung & Konzentration
  | 'attention_rule_keeping'         // Regelbeibehaltung im Handlungsablauf
  | 'attention_response_inhibition'  // Impulskontrolle & Go/No-Go
  | 'attention_impulse_control'      // Impulskontrolle & Handlungshemmung
  | 'attention_endurance'            // Daueraufmerksamkeit & Ausdauer
  | 'memory_forward_span'            // Zahlenspanne vorwärts
  | 'memory_span_forward'            // Zahlenspanne vorwärts
  | 'memory_backward_span'           // Zahlenspanne rückwärts
  | 'memory_span_backward'           // Zahlenspanne rückwärts
  | 'memory_sequence_recall'         // Merkfolge (Symbole/Wörter)
  | 'memory_multistep_instruction'   // Mehrschrittige Handlungsanweisung
  | 'memory_multistep_instructions'  // Mehrschrittige Handlungsanweisungen
  | 'visual_discrimination'          // Optische Differenzierung (b/d, Formen)
  | 'visual_figure_ground'           // Figur-Grund-Wahrnehmung
  | 'visual_pattern_completion'      // Visuelle Mustererkennung & Ergänzung
  | 'spatial_orientation_directions' // Raumlage: Richtungen & Lagebegriffe
  | 'spatial_directions'             // Raumlage: Richtungen & Lagebegriffe
  | 'spatial_left_right'             // Raumlage: Links-Rechts-Orientierung
  | 'spatial_relations'              // Raumlage: Relative Lagebeziehungen
  | 'spatial_orientation_rotation'   // Raumlage: Drehungen & Perspektive
  | 'spatial_rotation'               // Raumlage: Mentale Rotation
  | 'spatial_orientation_mirror'     // Raumlage: Spiegelungen
  | 'fine_motor_control'             // Feinmotorik: Pinzettengriff & Kleinteile
  | 'fine_motor_pincer_grip'         // Feinmotorik: Pinzettengriff
  | 'fine_motor_scissors'            // Feinmotorik: Scherenführung
  | 'fine_motor_bilateral'           // Feinmotorik: Beidhändige Koordination & Falten
  | 'fine_motor_cutting_folding'     // Feinmotorik: Ausschneiden & Falten
  | 'graphomotor_grip_pressure'      // Graphomotorik: Stifthaltung & Druck
  | 'graphomotor_pen_grip'           // Graphomotorik: Stiftgriff & Haltung
  | 'graphomotor_line_control'       // Graphomotorik: Linienkontrolle & Eckenstopp
  | 'graphomotor_line_flow'          // Graphomotorik: Linienführung, Schwung & Schrift
  | 'graphomotor_flow'               // Graphomotorik: Schreibfluss in Lineatur
  | 'graphomotor_endurance'          // Graphomotorik: Schreibausdauer
  // Sozial & Lernen Aspekte (Schritt 12)
  | 'behavior_start'                 // Arbeitsverhalten: Arbeitsbeginn & Initiative
  | 'behavior_work_start'            // Arbeitsverhalten: Arbeitsbeginn & Initiative
  | 'behavior_independence'          // Arbeitsverhalten: Selbstständigkeit & Begleitbedarf
  | 'behavior_endurance'             // Arbeitsverhalten: Ausdauer & Durchhaltevermögen
  | 'behavior_organization'          // Arbeitsverhalten: Materialorganisation & Ordnung
  | 'behavior_errors'                // Arbeitsverhalten: Umgang mit Fehlern
  | 'behavior_error_handling'        // Arbeitsverhalten: Fehlertoleranz & Korrekturbereitschaft
  | 'behavior_help'                  // Arbeitsverhalten: Hilfesuchverhalten
  | 'behavior_pace_focus'            // Arbeitsverhalten: Arbeitstempo & Aufmerksamkeitsfokus
  | 'behavior_control'               // Arbeitsverhalten: Selbstkontrolle
  | 'behavior_time'                  // Arbeitsverhalten: Zeiteinteilung
  | 'behavior_focus'                 // Arbeitsverhalten: Fokus & Konzentration
  | 'behavior_quality'               // Arbeitsverhalten: Arbeitsgenauigkeit & Sorgfalt
  | 'social_cooperation'             // Sozialverhalten: Kooperation & Teamfähigkeit
  | 'social_groupwork'               // Sozialverhalten: Gruppenarbeit & Kooperation
  | 'social_conversation_rules'      // Sozialverhalten: Gesprächsregeln & Zuhören
  | 'social_rules'                   // Sozialverhalten: Regelakzeptanz & Einhaltung
  | 'social_play'                    // Sozialverhalten: Spiel- und Pausenverhalten
  | 'social_conflict'                // Sozialverhalten: Konfliktsituationen
  | 'social_conflict_resolution'     // Sozialverhalten: Konfliktverhalten & Kompromissbereitschaft
  | 'social_empathy_boundaries'      // Sozialverhalten: Empathie & Grenzen anderer wahrnehmen
  | 'social_empathy'                 // Sozialverhalten: Empathie & Rücksichtnahme
  | 'social_helping_sharing'         // Sozialverhalten: Hilfe anbieten / annehmen & Teilen
  | 'social_feedback'                // Sozialverhalten: Feedback- und Kritikfähigkeit
  | 'social_responsibility'          // Sozialverhalten: Verantwortung & Gemeinschaftssinn
  | 'metacognition_self_assessment'  // Metakognition: Kindgerechte Selbsteinschätzung
  | 'metacognition_difficulty'       // Metakognition: Schwierigkeitseinschätzung
  | 'metacognition_uncertainty'      // Metakognition: Erkennen von Unsicherheiten
  | 'metacognition_tools'            // Metakognition: Hilfsmittelwahl
  | 'metacognition_toolchoice'       // Metakognition: Hilfsmittelnutzung
  | 'metacognition_strategy'         // Metakognition: Strategiewahl & Reflexion
  | 'metacognition_strategy_naming'  // Metakognition: Benennen genutzter Lösungsstrategien
  | 'metacognition_adapt'            // Metakognition: Strategieanpassung
  | 'metacognition_error_reflection' // Metakognition: Reflexion von Fehlern & Lernprozess
  | 'metacognition_goal'             // Metakognition: Zielsetzung
  | 'metacognition_transfer'         // Metakognition: Transfer auf neue Aufgaben
  | 'metacognition_help_seeking'     // Metakognition: Gezieltes Einfordern passender Hilfe
  | 'metacognition_next_steps'       // Metakognition: Formulieren des nächsten Lernschritts
  | 'general';

export interface DiagnosticTaskOption {
  label: string;
  value: any;
  isCorrect?: boolean;
  strategyTag?: DiagnosticObservationTag;
}

export interface DiagnosticTaskVisual {
  type: 
    | 'dots' 
    | 'five_frame' 
    | 'ten_frame' 
    | 'twenty_frame' 
    | 'hundred_field' 
    | 'place_value' 
    | 'place_value_blocks' 
    | 'comparison' 
    | 'reading_text' 
    | 'calculation' 
    | 'number_line' 
    | 'place_value_table' 
    | 'dot_array' 
    | 'comprehension_story' 
    | 'phonology_card' 
    | 'visual_search' 
    | 'reaction_control' 
    | 'sequence_recall' 
    | 'spatial_grid' 
    | 'spatial_rotation' 
    | 'teacher_observation' 
    | 'behavior_observation' 
    | 'social_observation' 
    | 'metacognition_reflection' 
    | 'custom';
  count?: number;
  arrangement?: 'dice' | 'random' | 'structured_5' | 'structured_10' | 'double_row';
  dotsA?: number;
  dotsB?: number;
  labelA?: string;
  labelB?: string;
  tenRows?: number; // for ten frames
  filled?: number[];
  hundredFieldHighlighted?: number[];
  placeValueBlocks?: { thousands?: number; hundreds?: number; tens?: number; ones?: number };
  customSvg?: string;
  customText?: string;
  
  // Lesetext-Erweiterungen
  readingText?: {
    title: string;
    text: string;
    wordCount: number;
    recommendedTimeSeconds?: number;
    syllables?: string[];
  };

  // Rechenaufgabe-Erweiterungen
  calculation?: {
    expression: string;
    result: string | number;
    subType?: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
    hintSteps?: string[];
  };

  // Zahlenstrahl-Erweiterungen
  numberLine?: {
    min: number;
    max: number;
    step?: number;
    target?: number;
    labeledNumbers?: number[];
    markedPositions?: { pos: number; label?: string }[];
  };

  // Stellenwerttafel-Erweiterungen
  placeValueTable?: {
    values: { place: 'M' | 'HT' | 'ZT' | 'T' | 'H' | 'Z' | 'E'; count: number | string }[];
    highlightPlace?: string;
  };

  // Multiplikations-Punktefeld
  dotArray?: {
    rows: number;
    cols: number;
    groupLabel?: string;
  };

  // Leseverständnis-Erweiterungen
  comprehensionStory?: {
    title: string;
    text: string;
    paragraphCount?: number;
    readingHint?: string;
  };

  // Phonologie-Erweiterungen
  phonologyCard?: {
    word: string;
    promptType: 'rhyme' | 'syllable' | 'initial_sound' | 'final_sound' | 'blending' | 'segmentation' | 'manipulation';
    syllableCount?: number;
    rhymePair?: [string, string];
    phonemeTokens?: string[];
    visualHint?: string;
  };

  // --------------------------------------------------------------------------
  // LERNVORAUSSETZUNGEN VISUALS (Schritt 11)
  // --------------------------------------------------------------------------
  // 1. Visuelle Suche / Selektive Aufmerksamkeit
  visualSearch?: {
    gridSize: number; // e.g. 4 for 4x4, 5 for 5x5
    targetItem: string; // e.g. '🍎' or 'b'
    targetCount: number; // e.g. 4
    items: { id: number | string; symbol: string; isTarget: boolean }[];
    instructionNote?: string;
  };

  // 2. Reaktionskontrolle / Go-NoGo
  reactionControl?: {
    mode: 'go_nogo' | 'rule_series' | 'rule_shift';
    targetSymbol: string; // e.g. '🟢'
    targetAction: string; // e.g. 'Tippen / Reagieren'
    stopSymbol?: string; // e.g. '🔴'
    stopAction?: string; // e.g. 'Stopp / Warten'
    distractorSymbol?: string; // e.g. '🟡'
    trialCount?: number;
    speedLevel?: 'slow' | 'medium' | 'standard' | 'fast';
    ruleDescription?: string;
  };

  // 3. Arbeitsgedächtnis / Sequenz-Wiederholung
  sequenceRecall?: {
    items: string[]; // e.g. ['4', '7', '2'] or ['Baum', 'Haus', 'Fisch']
    mode: 'forward' | 'backward' | 'multistep';
    category: 'digits' | 'words' | 'actions';
    steps?: string[];
    hint?: string;
  };

  // 4. Raum-Lage Gitter & Richtungen
  spatialGrid?: {
    gridSize: 3 | 4;
    cells: string[][]; // 3x3 or 4x4 array of emojis or characters
    targetRow?: number;
    targetCol?: number;
    targetSymbol?: string;
    highlightPosition?: { row: number; col: number };
    directionPrompt?: string;
  };

  // 5. Raum-Lage Drehung & Spiegelung
  spatialRotation?: {
    shapeType: 'arrow' | 'emoji' | 'symbol' | 'letter' | 'geometric' | 'letter_like' | 'complex';
    leftContent: string;
    rightContent: string;
    transformation: 'same' | 'rotated_90' | 'rotated_180' | 'mirrored' | 'rotated_and_mirrored';
    questionText?: string;
  };

  // 6. Fein- und Graphomotorische Beobachtungsvorlage (Reale Ausführung)
  teacherObservation?: {
    title: string;
    category: 'feinmotorik' | 'graphomotorik';
    exercisePrompt: string; // Was das Kind tun soll
    materialNeeded?: string; // z.B. "Papier, Kinderschere, Bleistift"
    observationCriteria: {
      id: string;
      label: string;
      description?: string;
      positiveSignal: string;
      cautionSignal: string;
    }[];
    writingSample?: string; // z.B. Text/Schwungübungsvorlage
  };

  // 7. Arbeitsverhalten Beobachtungsvorlage (Schritt 12)
  behaviorObservation?: {
    title: string;
    aspectTitle: string;
    aspectCategory: 'arbeitsbeginn' | 'selbststaendigkeit' | 'ausdauer' | 'organisation' | 'fehlerkultur' | 'tempo_fokus';
    contextPrompt: string;
    settingExample?: string; // z.B. "Offene Wochenplanarbeit, Einzelarbeitsphase"
    criteria: {
      id: string;
      label: string;
      positiveSignal: string;
      cautionSignal: string;
    }[];
    reflectionQuestions?: string[];
  };

  // 8. Sozialverhalten & Kooperation Beobachtungsvorlage (Schritt 12)
  socialObservation?: {
    title: string;
    situationTitle: string;
    situationType: 'partnerarbeit' | 'gruppenarbeit' | 'pause_spiel' | 'konfliktsituation' | 'gespraechskreis' | 'material_teilen' | 'hilfe_anbieten';
    contextDescription: string;
    settingExample?: string; // z.B. "Gruppenaufgabe Sachunterricht, Freispiel auf dem Pausenhof"
    criteria: {
      id: string;
      label: string;
      positiveSignal: string;
      cautionSignal: string;
    }[];
    reflectionQuestions?: string[];
  };

  // 9. Metakognition & Selbsteinschätzung Beobachtungsvorlage (Schritt 12)
  metacognitionReflection?: {
    title: string;
    taskContext: string; // Kontext z.B. "Nach einer anspruchsvollen Lese- oder Rechenaufgabe"
    childPrompt: string; // z.B. "Wie leicht oder schwer ist dir diese Aufgabe gefallen?"
    childRatingOptions?: {
      level: 'easy' | 'okay' | 'hard';
      label: string;
      symbol: string; // '🟢' | '🟡' | '🔴' or '😊' | '😐' | '😟'
    }[];
    helpfulToolsQuestion?: string; // "Was hat dir bei der Lösung geholfen?"
    availableTools?: {
      id: string;
      label: string;
      icon?: string;
    }[];
    teacherCriteria: {
      id: string;
      label: string;
      description?: string;
      positiveSignal: string;
      cautionSignal: string;
    }[];
  };
}

export interface DiagnosticTaskDefinition {
  id: string;
  title?: string;
  prompt?: string;
  instruction?: string; // Konkrete Anweisung an die Lehrkraft (z. B. "Zeige der Schülerin...")
  aspect: DiagnosticTaskAspect;
  type: DiagnosticTaskType;
  order?: number;
  level?: number; // 1 | 2 | 3 | 4
  competencyIds?: string[];
  competencyId?: string; // Optionale Einzel-ID für spezifische Teilaufgaben
  visual?: DiagnosticTaskVisual;
  options?: DiagnosticTaskOption[];
  correctValue?: any;
  defaultObservationTags?: DiagnosticObservationTag[];
  hint?: string;
}

export interface DiagnosticLevelDefinition {
  level: number; // 1 = 1. Klasse, 2 = 2. Klasse, 3 = 3. Klasse, 4 = 4. Klasse
  label: string; // z. B. "1. Klasse (Niveau 1)"
  shortLabel?: string; // z. B. "Niveau 1"
  recommendedGrade?: number[];
  description?: string;
  focusPoints?: string[];
  durationMinutes?: number;
  tasks: DiagnosticTaskDefinition[];
}

/**
 * 4. STANDARDISIERTER TEST-TYP (DiagnosticTestDefinition)
 * Beschreibt Tests, Screenings und Beobachtungsbögen und referenziert
 * eine oder mehrere spezifische Kompetenzen sowie Niveaustufen.
 */
export interface DiagnosticTestDefinition {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  domainId: string;
  competencyAreaId: string;
  competencyIds: string[];
  mode: DiagnosticTestMode;
  screeningFormat?: 'task_for_all' | 'child_compact';
  recommendedGrade?: number[];
  durationMinutes?: number;
  instructions?: string;
  tags?: string[];
  levels: DiagnosticLevelDefinition[];
}

/**
 * 7. KOMPETENZ-ERGEBNIS
 * Speichert den erreichten Status und ggf. quantitative Messwerte für eine Teilkompetenz
 */
export interface DiagnosticCompetencyResult {
  competencyId: string;
  status: CompetencyStatus;
  score?: number;
  maxScore?: number;
  note?: string;
}

/**
 * 8. ZENTRALES DIAGNOSTIK-ERGEBNIS (DiagnosticResult)
 * Strukturierte, versionierte Speicherung einer Erhebung, eines Screenings oder einer Beobachtung
 */
export interface DiagnosticResult {
  id: string;
  schemaVersion: 1;
  studentId: string;
  classId: string;
  testId: string;
  date: string; // ISO-Datum YYYY-MM-DD
  mode: DiagnosticTestMode;
  screeningSessionId?: string; // Gemeinsame Session-ID für alle Ergebnisse eines Klassenscreenings
  source?: 'oneToOne' | 'screening' | 'observation';
  createdAt: string; // ISO-Timestamp
  
  // Getestetes Niveau (1..4)
  gradeLevel?: number;

  // Optionale quantitative Gesamtmesswerte
  rawScore?: number;
  maxScore?: number;
  normalizedScore?: number;

  // Zwingend: Beobachtete Kompetenzen mit qualitativem Status
  competencyResults: DiagnosticCompetencyResult[];

  // Strukturierte Beobachtungen (Stärken, Strategien, Besonderheiten)
  observations?: DiagnosticObservation[];

  // Pädagogisch neutraler nächster Schritt
  nextStep?: string;

  // Ergänzende Notizen & Kontext
  notes?: string;
  conductedBy?: string;

  // Spezifischer Situations- & Beobachtungskontext (Schritt 12)
  observationContext?: {
    situation?: string;
    setting?: string;
    childSelfAssessment?: {
      rating?: 'easy' | 'okay' | 'hard';
      helpfulTools?: string[];
      childNote?: string;
    };
    teacherAssessmentRating?: string;
  };
}
