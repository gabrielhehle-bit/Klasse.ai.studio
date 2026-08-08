import { MorningWidget } from '../types';

export const DEFAULT_MORNING_WIDGETS: MorningWidget[] = [
  // ==========================================
  // DEUTSCH (Wort des Tages) - ca. 20
  // ==========================================
  { id: 'd1', type: 'deutsch', stufe: 'all', frage: 'Empathie', loesung: 'Die Fähigkeit, sich in die Gefühle anderer hineinzuversetzen.' },
  { id: 'd2', type: 'deutsch', stufe: 'all', frage: 'Toleranz', loesung: 'Das Respektieren anderer, die anders denken oder leben als man selbst.' },
  { id: 'd3', type: 'deutsch', stufe: 'all', frage: 'Optimismus', loesung: 'Die Eigenschaft, immer das Gute zu sehen und positiv in die Zukunft zu blicken.' },
  { id: 'd4', type: 'deutsch', stufe: 'all', frage: 'Fazit', loesung: 'Eine Zusammenfassung oder das abschließende Ergebnis einer Überlegung.' },
  { id: 'd5', type: 'deutsch', stufe: 'all', frage: 'Improvisieren', loesung: 'Etwas ohne Vorbereitung tun oder erfinden, wenn man spontan handeln muss.' },
  { id: 'd6', type: 'deutsch', stufe: 'all', frage: 'Zivilcourage', loesung: 'Mut, sich für andere einzusetzen, besonders wenn Unrecht geschieht.' },
  { id: 'd7', type: 'deutsch', stufe: 'all', frage: 'Fiktion', loesung: 'Etwas Erfundenes, das nicht der Wirklichkeit entspricht (z.B. in Geschichten).' },
  { id: 'd8', type: 'deutsch', stufe: 'all', frage: 'Kompromiss', loesung: 'Eine Lösung, bei der beide Seiten ein bisschen nachgeben, um sich zu einigen.' },
  { id: 'd9', type: 'deutsch', stufe: 'all', frage: 'Solidarität', loesung: 'Zusammenhalt und gegenseitige Unterstützung in einer Gruppe.' },
  { id: 'd10', type: 'deutsch', stufe: 'all', frage: 'Harmonie', loesung: 'Ein friedliches und freundliches Zusammenleben ohne Streit.' },
  { id: 'd11', type: 'deutsch', stufe: 'all', frage: 'Respekt', loesung: 'Die Achtung und Wertschätzung gegenüber anderen Menschen oder der Natur.' },
  { id: 'd12', type: 'deutsch', stufe: 'all', frage: 'Motivation', loesung: 'Der innere Antrieb oder die Lust, etwas Bestimmtes zu tun oder zu erreichen.' },
  { id: 'd13', type: 'deutsch', stufe: 'all', frage: 'Kreativität', loesung: 'Die Fähigkeit, neue und originelle Ideen zu entwickeln.' },
  { id: 'd14', type: 'deutsch', stufe: 'all', frage: 'Gerechtigkeit', loesung: 'Ein faires und gleiches Verhalten gegenüber allen Menschen.' },
  { id: 'd15', type: 'deutsch', stufe: 'all', frage: 'Verantwortung', loesung: 'Die Bereitschaft, für sein eigenes Handeln und dessen Folgen einzustehen.' },

  // ==========================================
  // MATHE (Rechnung des Tages)
  // ==========================================
  // Klasse 1 (ZR 10 +, -)
  { id: 'm1_1', type: 'mathe', stufe: 1, frage: '5 + 3 = ?', loesung: '8' },
  { id: 'm1_2', type: 'mathe', stufe: 1, frage: '10 - 4 = ?', loesung: '6' },
  { id: 'm1_3', type: 'mathe', stufe: 1, frage: '2 + 7 = ?', loesung: '9' },
  { id: 'm1_4', type: 'mathe', stufe: 1, frage: '8 - 5 = ?', loesung: '3' },
  { id: 'm1_5', type: 'mathe', stufe: 1, frage: '4 + 6 = ?', loesung: '10' },

  // Klasse 2 (ZR 100 +, -, 1x1)
  { id: 'm2_1', type: 'mathe', stufe: 2, frage: '45 + 23 = ?', loesung: '68' },
  { id: 'm2_2', type: 'mathe', stufe: 2, frage: '87 - 35 = ?', loesung: '52' },
  { id: 'm2_3', type: 'mathe', stufe: 2, frage: '4 · 5 = ?', loesung: '20' },
  { id: 'm2_4', type: 'mathe', stufe: 2, frage: '37 + 55 = ?', loesung: '92' },
  { id: 'm2_5', type: 'mathe', stufe: 2, frage: '6 · 7 = ?', loesung: '42' },

  // Klasse 3 (ZR 1000 +, -, *, /)
  { id: 'm3_1', type: 'mathe', stufe: 3, frage: '345 + 128 = ?', loesung: '473' },
  { id: 'm3_2', type: 'mathe', stufe: 3, frage: '500 - 184 = ?', loesung: '316' },
  { id: 'm3_3', type: 'mathe', stufe: 3, frage: '42 : 6 = ?', loesung: '7' },
  { id: 'm3_4', type: 'mathe', stufe: 3, frage: '8 · 12 = ?', loesung: '96' },
  { id: 'm3_5', type: 'mathe', stufe: 3, frage: '75 : 5 = ?', loesung: '15' },

  // Klasse 4 (ZR 10000)
  { id: 'm4_1', type: 'mathe', stufe: 4, frage: '4500 + 2300 = ?', loesung: '6800' },
  { id: 'm4_2', type: 'mathe', stufe: 4, frage: '8000 - 3450 = ?', loesung: '4550' },
  { id: 'm4_3', type: 'mathe', stufe: 4, frage: '25 · 40 = ?', loesung: '1000' },
  { id: 'm4_4', type: 'mathe', stufe: 4, frage: '3600 : 6 = ?', loesung: '600' },
  { id: 'm4_5', type: 'mathe', stufe: 4, frage: '5340 + 1250 = ?', loesung: '6590' },

  // ==========================================
  // LOGIK (Zahlenrätsel)
  // ==========================================
  { id: 'l1', type: 'logik', stufe: 'all', frage: 'Welche Zahl fehlt? 2, 4, 6, 8, ...', loesung: '10' },
  { id: 'l2', type: 'logik', stufe: 'all', frage: 'Wenn du mich hast, willst du mich teilen. Wenn du mich teilst, hast du mich nicht mehr. Was bin ich?', loesung: 'Ein Geheimnis' },
  { id: 'l3', type: 'logik', stufe: 'all', frage: 'Welche Zahl fehlt? 1, 3, 6, 10, ...', loesung: '15 (immer +2, +3, +4, +5)' },
  { id: 'l4', type: 'logik', stufe: 'all', frage: 'Ich bin ungerade. Nimmt man einen Buchstaben weg, werde ich gerade. Welche Zahl bin ich?', loesung: 'Sieben (S + ieben -> ieben = nicht mehr sieben; bzw. "S-ieben" -> "even" auf englisch? Nein! Auf Deutsch: S-ieben -> ieben, oh wait. Klassiker: "Sieben" -> "S" weg = "ieben" -> ungerade -> gerade (Englisch Seven / Even). Auf Deutsch leider schwer. Besser: "Was hat 4 Beine und kann nicht laufen?" -> "Ein Tisch")' },
  { id: 'l5', type: 'logik', stufe: 'all', frage: 'Was hat 4 Beine und kann nicht laufen?', loesung: 'Ein Tisch / Ein Stuhl' },
  { id: 'l6', type: 'logik', stufe: 'all', frage: 'Welches Tier dreht sich um die eigene Achse und wird etwa 200 Mal größer?', loesung: 'Ein Karussell? Nein, ein Pusteblumen-Stängel. Besser: Ein Strudel, oder eine Schnecke? Lass uns was einfaches nehmen: Welches Tier springt höher als ein Haus? -> Alle, ein Haus kann nicht springen.' },
  { id: 'l6_b', type: 'logik', stufe: 'all', frage: 'Welches Lebewesen springt höher als ein Haus?', loesung: 'Fast alle, denn ein Haus kann nicht springen!' },
  { id: 'l7', type: 'logik', stufe: 'all', frage: 'Was wird mehr, wenn man es teilt?', loesung: 'Glück' },
  { id: 'l8', type: 'logik', stufe: 'all', frage: 'Welche Brille trägt man nicht auf der Nase?', loesung: 'Die Klobrille' },
  { id: 'l9', type: 'logik', stufe: 'all', frage: 'Zahlenfolge: 5, 10, 20, 40, ...', loesung: '80 (Immer verdoppeln)' },
  { id: 'l10', type: 'logik', stufe: 'all', frage: 'Drei Katzen fangen drei Mäuse in drei Minuten. Wie lange brauchen hundert Katzen für hundert Mäuse?', loesung: 'Drei Minuten. Jede Katze braucht drei Minuten für eine Maus.' },

  // ==========================================
  // SPASS (Scherzfragen)
  // ==========================================
  { id: 's1', type: 'spass', stufe: 'all', frage: 'Was ist grün, glücklich und hüpft über Wiesen?', loesung: 'Eine Freuschrecke!' },
  { id: 's2', type: 'spass', stufe: 'all', frage: 'Was liegt am Strand und redet undeutlich?', loesung: 'Eine Nuschel!' },
  { id: 's3', type: 'spass', stufe: 'all', frage: 'Was schwimmt auf dem Wasser und fängt mit "Z" an?', loesung: 'Zwei Enten!' },
  { id: 's4', type: 'spass', stufe: 'all', frage: 'Wo wohnen Katzen am liebsten?', loesung: 'Im Miezhaus!' },
  { id: 's5', type: 'spass', stufe: 'all', frage: 'Was macht ein Clown im Büro?', loesung: 'Faxen!' },
  { id: 's6', type: 'spass', stufe: 'all', frage: 'Wer ist immer der Schnellste?', loesung: 'Das Licht – aber wenn es ankommt, steht der Schatten schon da!' },
  { id: 's7', type: 'spass', stufe: 'all', frage: 'Was hat keine Beine, rennt aber immer?', loesung: 'Die Nase (oder die Zeit)!' },
  { id: 's8', type: 'spass', stufe: 'all', frage: 'Was hat Hände, kann aber nicht klatschen?', loesung: 'Eine Uhr!' },
  { id: 's9', type: 'spass', stufe: 'all', frage: 'Welcher Baum hat keine Blätter?', loesung: 'Der Purzelbaum!' },
  { id: 's10', type: 'spass', stufe: 'all', frage: 'Warum fliegen Vögel im Winter in den Süden?', loesung: 'Weil es zum Laufen zu weit ist!' },

  // ==========================================
  // DISKUSSION (Frage des Tages)
  // ==========================================
  { id: 'di1', type: 'diskussion', stufe: 'all', frage: 'Wenn du für einen Tag der Direktor unserer Schule wärst: Was würdest du sofort ändern?', loesung: 'Diskutiert in der Klasse: Ein neues Fach? Längere Pausen? Anderes Essen?' },
  { id: 'di2', type: 'diskussion', stufe: 'all', frage: 'Wenn du eine neue Sportart erfinden könntest: Wie würde sie heißen und welche Regeln gäbe es?', loesung: 'Sammelt Ideen an der Tafel – kombiniert z.B. Fußball mit Tennis oder Schwimmen.' },
  { id: 'di3', type: 'diskussion', stufe: 'all', frage: 'Was war die netteste Tat, die ein Mitschüler diese Woche für dich getan hat?', loesung: 'Teilt eure Geschichten und sagt einmal Danke.' },
  { id: 'di4', type: 'diskussion', stufe: 'all', frage: 'Wenn du eine Zeitmaschine hättest: Würdest du lieber in die Vergangenheit reisen oder in die Zukunft? Warum?', loesung: 'Stimmt in der Klasse ab: Wer will zu den Rittern/Dinosauriern, wer in die Zukunft?' },
  { id: 'di5', type: 'diskussion', stufe: 'all', frage: 'Welches Buch, welcher Film oder welches Spiel hat dich zuletzt so richtig begeistert und warum?', loesung: 'Gib deinen Mitschülern eine kurze Empfehlung ohne zu viel zu verraten!' },
  { id: 'di6', type: 'diskussion', stufe: 'all', frage: 'Wenn Tiere sprechen könnten: Welches Tier wäre wohl am nettesten und welches am gesprächigsten?', loesung: 'Was würde ein Hund uns wohl morgens erzählen? Was eine faule Katze?' },

  // ==========================================
  // SPIEL (5-Minuten-Spiel)
  // ==========================================
  { id: 'sp1', type: 'spiel', stufe: 'all', frage: 'Kommando Pimperle 🎲', loesung: 'Spielregel: Alle trommeln mit den Zeigefingern auf die Tischkante. Die Spielleitung ruft Kommandos: "Kommando Flach" (Hände flach), "Kommando Hoch" (Fingerspitzen hoch), "Kommando Pimperle" (weiterklopfen). Achtung: Nur wenn das Wort "Kommando" davor steht, darf die Bewegung gewechselt werden! Wer einen Fehler macht, setzt eine Runde aus.' },
  { id: 'sp2', type: 'spiel', stufe: 'all', frage: 'Der Dirigent 🎻', loesung: 'Spielregel: Ein Kind verlässt den Raum. Die Klasse bestimmt heimlich einen "Dirigenten". Dieser fängt an, Bewegungen vorzumachen (z.B. Klatschen, am Kopf kratzen, Luftgitarre), die alle sofort nachmachen müssen. Das Kind kommt herein und muss durch Beobachten herausfinden, wer der geheime Dirigent ist (3 Versuche).' },
  { id: 'sp3', type: 'spiel', stufe: 'all', frage: 'Roboter-Steuerung 🤖', loesung: 'Spielregel: Je zwei Kinder arbeiten leise zusammen. Ein Kind schließt die Augen (= der Roboter). Das andere Kind lenkt den Roboter vorsichtig nur durch sanftes Tippen auf die Schultern (Rechts tippen = Rechtskurve, Links tippen = Linkskurve, Rücken = vorwärts, Stopp-Signal vereinbaren) durch den Klassenraum.' },
  { id: 'sp4', type: 'spiel', stufe: 'all', frage: 'Flüsterpost / Stille Post 🗣️', loesung: 'Spielregel: Ein langes Wort oder ein schwerer Satz wird ganz leise von Kind zu Kind weitergeflüstert. Am Ende sagt das letzte Kind laut, was angekommen ist. Kommt das Originalwort an oder ist Quatsch entstanden?' },
  { id: 'sp5', type: 'spiel', stufe: 'all', frage: 'Blinzel-Mörder 👁️', loesung: 'Spielregel: Alle schließen die Augen. Die Lehrkraft tippt einem Kind auf die Schulter – das ist der Detektiv, einem anderen auf den Kopf – das ist der Blinzler. Alle laufen leise umher. Der Blinzler schaut Kinder an und blinzelt ihnen unbemerkt zu. Wer angeblinzelt wird, wartet 3 Sekunden und sinkt stumm zu Boden. Der Detektiv muss den Blinzler entlarven.' },

  // ==========================================
  // ACHTSAMKEIT (5-Minuten-Achtsamkeit)
  // ==========================================
  { id: 'ac1', type: 'achtsamkeit', stufe: 'all', frage: 'Die Ballon-Atmung 🎈', loesung: 'Übung: Setze dich aufrecht hin. Lege die Hände auf deinen Bauch. Atme tief durch die Nase ein und spüre, wie sich dein Bauch wie ein Luftballon aufbläst. Atme langsam durch den Mund aus und stelle dir vor, wie der Ballon wieder schrumpft. Wiederhole das 5-mal ganz leise.' },
  { id: 'ac2', type: 'achtsamkeit', stufe: 'all', frage: 'Die 5-Sinne-Suche 👁️👂👃', loesung: 'Übung: Schau dich ganz leise im Raum um. Finde im Stillen: 5 Dinge, die du sehen kannst. 4 Dinge, die du anfassen kannst. 3 Dinge, die du hören kannst. 2 Dinge, die du riechen kannst (oder magst). 1 Sache, die du gut an dir selbst findest.' },
  { id: 'ac3', type: 'achtsamkeit', stufe: 'all', frage: 'Der Zitronen-Greifer 🍋', loesung: 'Übung: Balle deine Hände fest zu Fäusten, als ob du eine Zitrone so fest wie möglich auspressen willst. Halte die Spannung für 5 Sekunden. Lass jetzt schlagartig locker und spüre, wie deine Hände ganz warm und schwer werden. Zweimal wiederholen!' },
  { id: 'ac4', type: 'achtsamkeit', stufe: 'all', frage: 'Geräusche-Detektive 🎧', loesung: 'Übung: Schließe für 1 Minute die Augen. Verhalte dich absolut lautlos. Versuche, das leiseste Geräusch im Raum oder von draußen zu erhaschen. Welches Tier oder welcher Gegenstand könnte das sein?' }
];
