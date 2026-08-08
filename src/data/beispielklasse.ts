import { AppState, ClassRoom, Student, DifferenzierungsGruppe, MorningWidget, AppNote } from '../types';
import { FAECHER_ALLE, DEFAULT_FACH_COLORS, STUNDEN_INFO, DEFAULT_TAGEPLAN, DEFAULT_YEARLY_SUBJECTS } from '../constants';
import { getKW } from '../lib/utils';

export const createBeispielklasse = (): Partial<AppState> => {
  const today = new Date();
  
  // Helper to generate dates relative to today
  const relativeDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const studentNames = [
    { vorname: 'Lukas', nachname: 'Gruber' },
    { vorname: 'Sophie', nachname: 'Wimmer' },
    { vorname: 'Maximilian', nachname: 'Huber' },
    { vorname: 'Elena', nachname: 'Bauer' },
    { vorname: 'Tobias', nachname: 'Müller' },
    { vorname: 'Sarah', nachname: 'Steiner' },
    { vorname: 'Felix', nachname: 'Moser' },
    { vorname: 'Mia', nachname: 'Hofmann' },
    { vorname: 'Jakob', nachname: 'Leitner' },
    { vorname: 'Anna', nachname: 'Pichler' },
    { vorname: 'Leo', nachname: 'Fischer' },
    { vorname: 'Julia', nachname: 'Schmid' }
  ];

  const students: Student[] = studentNames.map((name, i) => {
    const id = `demo-s${i + 1}`;
    
    // Birthday logic: one in the next 14 days
    let birthdayDate = new Date();
    if (i === 0) {
      birthdayDate.setDate(today.getDate() + 5); 
    } else {
      birthdayDate.setMonth(i % 12);
      birthdayDate.setDate((i * 7) % 28 + 1);
    }
    
    return {
      id,
      vorname: name.vorname,
      nachname: name.nachname,
      name: `${name.vorname} ${name.nachname}`,
      niveau: 1,
      notiz: '',
      geburtstag: birthdayDate.toISOString(),
      geburtsdatum: birthdayDate.toISOString().split('T')[0],
      staatsbuergerschaft: 'Österreich',
      religion: i % 3 === 0 ? 'r.k.' : 'o.B.',
      besuchsjahr: '3',
      espf: false,
      spf: i === 10, // 1 SPF
      erstsprache: i < 3 ? 'Deutsch' : (i < 6 ? 'Türkisch' : 'Deutsch'),
      daz: i >= 3 && i < 6, // 3 DaZ
      geschlecht: i % 2 === 0 ? 'm' : 'w',
      gruppen: [],
      erstelltAm: relativeDate(100)
    };
  });

  // Grades Distribution
  const subjects = ['Deutsch', 'Mathematik', 'Sachunterricht'];
  const grades: Record<string, any> = {};
  const mitarbeit: Record<string, any> = {};

  students.forEach(s => {
    grades[s.id] = {};
    mitarbeit[s.id] = {};
    subjects.forEach(subj => {
      grades[s.id][subj] = {
        lzk: [
          Math.floor(Math.random() * 3) + 1,
          Math.floor(Math.random() * 3) + 1
        ],
        sa: [Math.floor(Math.random() * 3) + 1],
        wp: [Math.floor(Math.random() * 2) + 1],
        hue: Math.floor(Math.random() * 2) + 1,
        mode: 'absolute'
      };
      mitarbeit[s.id][subj] = {
        "1": Math.floor(Math.random() * 5) + 5
      };
    });
  });

  // Attendance
  const attendance: Record<string, any> = {};
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(today.getDate() - 42);
  
  for (let i = 0; i < 4; i++) {
    const studentId = students[i].id;
    attendance[studentId] = {};
    const date = new Date(sixWeeksAgo);
    date.setDate(date.getDate() + (i * 3));
    const dateKey = date.toISOString().split('T')[0];
    attendance[studentId][dateKey] = { "1": "E" }; // Entschuldigt
  }

  // Behavior Notes
  const notes: AppNote[] = [
    { id: 'demo-n1', schuelerId: students[0].id, inhalt: 'Hat heute der Banknachbarin beim Aufräumen geholfen.', kategorie: 'Verhalten', datum: relativeDate(2) },
    { id: 'demo-n2', schuelerId: students[2].id, inhalt: 'Besonders konzentriert bei der Gruppenarbeit zu den Waldtieren.', kategorie: 'Journal', datum: relativeDate(5) },
    { id: 'demo-n3', schuelerId: students[4].id, inhalt: 'Hat freiwillig den Tafeldienst für die kranke Mitschülerin übernommen.', kategorie: 'Verhalten', datum: relativeDate(10) },
    { id: 'demo-n4', schuelerId: students[6].id, inhalt: 'Zeigt sehr gute Fortschritte beim sinnerfassenden Lesen.', kategorie: 'Erfolg', datum: relativeDate(15) },
    { id: 'demo-n5', schuelerId: students[8].id, inhalt: 'War sehr hilfsbereit beim Austeilen der Arbeitsblätter.', kategorie: 'Verhalten', datum: relativeDate(20) }
  ];

  // Differentiation Groups
  const groups: DifferenzierungsGruppe[] = [
    {
      id: 'demo-gr1',
      name: 'Lesefüchse 📚',
      farbe: 'blue',
      emoji: '📚',
      schuelerIds: [students[0].id, students[1].id, students[2].id, students[3].id],
      erstellt: relativeDate(30),
      zuletzt: today.toISOString()
    },
    {
      id: 'demo-gr2',
      name: 'Mathe-Profis 🔢',
      farbe: 'red',
      emoji: '🔢',
      schuelerIds: [students[4].id, students[5].id, students[6].id, students[7].id],
      erstellt: relativeDate(25),
      zuletzt: today.toISOString()
    }
  ];

  // Learning Words
  const lernwoerter = {
    aktuelleListe: ['Schule', 'Lernen', 'Pause', 'Freunde', 'Hausübung', 'Rechnen', 'Schreiben', 'Lesen'],
    kw: getKW(today),
    archiv: []
  };

  // Förderprofil
  students[3].foerderprofil = {
    staerken: ['Sprechen', 'Motivation'],
    foerderbedarfBereiche: ['Rechtschreiben', 'Grammatik'],
    foerderziele: [
      {
        id: 'demo-fz1',
        ziel: 'Sicheres Schreiben von Lernwörtern der Woche',
        bereich: 'Rechtschreiben',
        startDatum: relativeDate(20),
        zielDatum: relativeDate(-10),
        status: 'in Arbeit'
      }
    ]
  };

  // Diagnostik
  const defaultTests: any[] = [
    { id: 'live-lesefluessigkeit', name: '1:1 Leseflüssigkeit (RGW)', kategorie: 'lesen', kurzbeschreibung: 'Mund-zu-Ohr-Leseflüssigkeitsdiagnose (Richtig gelesene Wörter pro Minute)', einheit: 'rohwert', schwellenwert: 40, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
    { id: 'live-zahlenspanne', name: '1:1 Digit-Span (Zahlenspanne)', kategorie: 'kognition', kurzbeschreibung: 'Prüfung des auditiven Arbeitsgedächtnisses (Vorwärts/Rückwärts)', einheit: 'punkte', schwellenwert: 4, schwellenrichtung: 'unter', schulstufen: [1, 2, 3, 4] },
    { id: 'live-subitizing', name: '1:1 Mengen blitzen', kategorie: 'mathematik', kurzbeschreibung: 'Simultane Mengenerfassung (Subitizing) im Zahlenraum bis 10', einheit: 'punkte', schwellenwert: 10, schwellenrichtung: 'unter', schulstufen: [1, 2, 3] },
  ];

  const diagnostik: any[] = [];
  students.forEach((student, idx) => {
    if (idx < 6) {
      const baseLese = 30 + (idx * 5); // 30, 35, 40, 45, 50, 55
      diagnostik.push({
        id: `demo-lf-1-${student.id}`,
        schuelerId: student.id,
        testId: 'live-lesefluessigkeit',
        datum: relativeDate(90),
        schulstufe: 3,
        ergebniswert: baseLese,
        kommentar: 'Erster Versuch zu Schulbeginn.',
        foerderbedarfErkannt: baseLese < 40
      });
      diagnostik.push({
        id: `demo-lf-2-${student.id}`,
        schuelerId: student.id,
        testId: 'live-lesefluessigkeit',
        datum: relativeDate(45),
        schulstufe: 3,
        ergebniswert: baseLese + 8 + (idx % 2),
        kommentar: 'Deutliche Steigerung durch Lese-Training.',
        foerderbedarfErkannt: (baseLese + 8) < 40
      });
      diagnostik.push({
        id: `demo-lf-3-${student.id}`,
        schuelerId: student.id,
        testId: 'live-lesefluessigkeit',
        datum: relativeDate(5),
        schulstufe: 3,
        ergebniswert: baseLese + 15 + (idx % 3),
        kommentar: 'Sehr gute Entwicklung, flüssiges Lesen.',
        foerderbedarfErkannt: (baseLese + 15) < 40
      });

      const baseZahlen = 3 + (idx % 3);
      diagnostik.push({
        id: `demo-zs-1-${student.id}`,
        schuelerId: student.id,
        testId: 'live-zahlenspanne',
        datum: relativeDate(60),
        schulstufe: 3,
        ergebniswert: baseZahlen,
        kommentar: 'Auditiver Fokus gut.',
        foerderbedarfErkannt: baseZahlen < 4
      });
      diagnostik.push({
        id: `demo-zs-2-${student.id}`,
        schuelerId: student.id,
        testId: 'live-zahlenspanne',
        datum: relativeDate(15),
        schulstufe: 3,
        ergebniswert: Math.min(9, baseZahlen + 2),
        kommentar: 'Gesteigerte Konzentration.',
        foerderbedarfErkannt: false
      });
    }
  });

  const demoClass: ClassRoom = {
    id: 'demo-klasse',
    name: 'Beispielklasse 3b',
    stufe: 3,
    klassenvorstand: true,
    schueler: students,
    noten: grades,
    mitarbeit: mitarbeit,
    verhalten: {},
    karten: {},
    jahresplanung: {},
    wochenplanung: {},
    stammplan: {},
    anwesenheit: attendance,
    anwesenheitDetail: {},
    klassenglas_count: 7,
    klassenglas_ziel: 20,
    klassenglas_belohnung: 'Spielestunde',
    sitzplan_schueler: {},
    sitzplan_objekte: [],
    sue_kontrolle: {},
    tageplan: DEFAULT_TAGEPLAN,
    faecher: subjects,
    fachConfig: DEFAULT_FACH_COLORS,
    theme: 'classic_light',
    settings: {
      uiScale: 1,
      fontFamily: 'outfit',
      sidebarCollapsed: false
    }
  };

  return {
    demoModusAktiv: true,
    activeClassId: 'demo-klasse',
    classes: [demoClass],
    schueler: students,
    noten: grades,
    mitarbeit: mitarbeit,
    differenzierungsGruppen: groups,
    lernwoerter: lernwoerter,
    notes: notes,
    diagnostikTests: defaultTests,
    diagnostikErhebungen: diagnostik, // Use the correct field if different in state
    klassenbezeichnung: 'Beispielklasse 3b',
    stufe: 3,
    klassenvorstand: true,
    tourAbgeschlossen: false
  };
};
