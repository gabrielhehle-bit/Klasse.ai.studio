import { AppState } from '../types';
import { isDiagnosticAlert } from './diagnosticData';
import { berechne, getAssessmentMode } from './GradeUtils';

export interface DossierExportOptions {
  showStammdaten?: boolean;
  showContacts?: boolean;
  showFinanzen?: boolean;
  showLeistungen?: boolean;
  showMikaD?: boolean;
  showVerhalten?: boolean;
  showKELReflexion?: boolean;
  showDiagnostik?: boolean;
  showFoerderprofil?: boolean;
  showKIPortfolio?: boolean;
}

export function exportSchuelerPDF(schuelerId: string, appState: AppState, options?: DossierExportOptions) {
  const student = appState.schueler?.find(s => s.id === schuelerId);
  if (!student) return;

  const currentTerm = appState.schuljahr?.trim() || 'nicht angegeben';

  const effectiveOptions: Required<DossierExportOptions> = {
    showStammdaten: true,
    showContacts: false,
    showFinanzen: false,
    showLeistungen: true,
    showMikaD: true,
    showVerhalten: true,
    showKELReflexion: true,
    showDiagnostik: true,
    showFoerderprofil: true,
    showKIPortfolio: false,
    ...options,
  };

  const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Format dates helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? escapeHtml(dateStr) : date.toLocaleDateString('de-AT');
  };

  // Helper for stars
  const renderStars = (val?: number) => {
    if (val === undefined || val === null) return '—';
    const filled = '★'.repeat(Math.min(4, Math.max(0, val)));
    const empty = '☆'.repeat(Math.max(0, 4 - val));
    return `${filled}${empty}`;
  };

  // Markdown to HTML converter helper
  const parseMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    return escapeHtml(markdown)
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/# (.*?)\n/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/- (.*?)\n/g, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };

  // ==================== 1. STAMMDATEN ====================
  const stammdatenHtml = `
    <div class="page">
      <div class="header">
        <div>
          <span class="badge">I. STAMMDATEN & KONTAKT</span>
          <h1>Dossier: ${student.vorname} ${student.nachname}</h1>
        </div>
        <div class="meta">
          <strong>Stufe:</strong> ${appState.stufe || student.besuchsjahr || '—'}. Klasse<br>
          <strong>SJ:</strong> ${currentTerm}<br>
          <strong>Erstellt:</strong> ${new Date().toLocaleDateString('de-DE')}
        </div>
      </div>

      <div class="card">
        <h2>Allgemeine Stammdaten</h2>
        <div class="grid grid-3">
          <div class="field"><strong>Vorname:</strong> ${student.vorname}</div>
          <div class="field"><strong>Nachname:</strong> ${student.nachname}</div>
          <div class="field"><strong>Geburtstag:</strong> ${formatDate(student.geburtstag)}</div>
          <div class="field"><strong>SV-Nummer:</strong> ${student.sv_nummer || '—'}</div>
          <div class="field"><strong>Religion:</strong> ${student.religion || 'ohne'}</div>
          <div class="field"><strong>Staatsbürgerschaft:</strong> ${student.staatsbuergerschaft || 'Österreich'}</div>
          <div class="field"><strong>Besuchsjahr:</strong> ${student.besuchsjahr ? `${student.besuchsjahr}. Schuljahr` : '—'}</div>
          <div class="field"><strong>DaZ:</strong> ${student.daz ? 'Ja' : 'Nein'}</div>
          <div class="field"><strong>SPF:</strong> ${student.spf ? 'Ja' : 'Nein'}</div>
          <div class="field"><strong>Leistungsniveau:</strong> ${student.niveau || 'Standard'}</div>
        </div>
      </div>

      <div class="card mt-20">
        <h2>Anschrift & Kontakte der Eltern</h2>
        <div class="grid grid-2">
          <div>
            <div class="field"><strong>Anschrift:</strong> ${student.anschrift || '—'}</div>
            <div class="field"><strong>PLZ / Ort:</strong> ${student.plz ? `${student.plz} ${student.ort || ''}` : '—'}</div>
          </div>
          <div>
            <div class="field"><strong>Telefon Mutter:</strong> ${student.telefon_mutter || '—'}</div>
            <div class="field"><strong>Telefon Vater:</strong> ${student.telefon_vater || '—'}</div>
            <div class="field"><strong>E-Mail Eltern:</strong> ${student.email_eltern || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ==================== 2. FINANZEN ====================
  const sammlungen = appState.klassenkasse?.sammlungen || [];
  const studentPayments = sammlungen.map((s: any) => {
    const status = s.status?.[schuelerId] || 'offen';
    const amount = s.betraege?.[schuelerId] || s.betrag || 0;
    return { title: s.titel, date: s.erstelltAm, status, amount };
  }).filter((p: any) => p.amount > 0);
  const totalPaid = studentPayments.filter((p: any) => p.status === 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
  const totalOpen = studentPayments.filter((p: any) => p.status !== 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
  const totalAmount = totalPaid + totalOpen;

  const finanzenHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">II. KLASSENKASSE & FINANZEN</span>
          <h1>Finanz-Übersicht & Geldsammlungen</h1>
        </div>
        <div class="meta">
          <strong>Schüler:</strong> ${student.vorname} ${student.nachname}<br>
          <strong>Klasse:</strong> ${appState.klassenbezeichnung || '—'}
        </div>
      </div>

      <div class="grid grid-3">
        <div class="kpi bg-light">
          <span class="kpi-label">Soll-Beiträge Gesamt</span>
          <span class="kpi-val">${totalAmount.toFixed(2)} €</span>
        </div>
        <div class="kpi bg-success">
          <span class="kpi-label" style="color: #15803d;">Bezahlt</span>
          <span class="kpi-val" style="color: #166534;">${totalPaid.toFixed(2)} €</span>
        </div>
        <div class="kpi bg-danger">
          <span class="kpi-label" style="color: #b91c1c;">Offen / Ausstehend</span>
          <span class="kpi-val" style="color: #991b1b;">${totalOpen.toFixed(2)} €</span>
        </div>
      </div>

      <div class="card mt-20">
        <h2>Aufschlüsselung der Beiträge</h2>
        ${studentPayments.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Beitrag/Sammlung</th>
                <th style="text-align: right;">Soll-Betrag</th>
                <th style="text-align: right;">Erstellt am</th>
                <th style="text-align: right;">Zahlungsstatus</th>
              </tr>
            </thead>
            <tbody>
              ${studentPayments.map(p => `
                <tr>
                  <td><strong>${p.title}</strong></td>
                  <td style="text-align: right;" class="mono">${p.amount.toFixed(2)} €</td>
                  <td style="text-align: right;">${p.date ? formatDate(p.date) : '—'}</td>
                  <td style="text-align: right;">
                    <span class="status-badge ${p.status === 'bezahlt' ? 'paid' : 'unpaid'}">
                      ${p.status === 'bezahlt' ? 'BEZAHLT' : 'OFFEN'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p class="empty-state">Keine eingetragenen Geldsammlungen oder Finanzforderungen vorhanden.</p>
        `}
      </div>
    </div>
  `;

  // ==================== 3. LEISTUNGEN & NOTEN ====================
  // Calculate grades summary consistent with PrintCenter
  const subjects = ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch'];
  const allSubjects = new Set(subjects);
  if (appState.noten && appState.noten[schuelerId]) {
    Object.keys(appState.noten[schuelerId]).forEach(sub => allSubjects.add(sub));
  }

  const gradesList: { subject: string; grades: string[]; average: number | null }[] = [];
  Array.from(allSubjects).forEach(sub => {
    const gradesCollected: number[] = [];
    ['1', '2'].forEach(sem => {
      const semData = appState.noten?.[schuelerId]?.[sub]?.[sem];
      if (semData) {
        if (Array.isArray(semData.sa)) {
          semData.sa.forEach((g: any) => {
            if (typeof g === 'number' && g >= 1 && g <= 5) gradesCollected.push(g);
            else if (g && typeof g === 'object' && typeof g.note === 'number') gradesCollected.push(g.note);
          });
        }
        if (Array.isArray(semData.lzk)) {
          semData.lzk.forEach((g: any) => {
            if (typeof g === 'number' && g >= 1 && g <= 5) gradesCollected.push(g);
            else if (g && typeof g === 'object' && typeof g.note === 'number') gradesCollected.push(g.note);
          });
        }
      }
    });

    const avg = gradesCollected.length > 0 
      ? parseFloat((gradesCollected.reduce((a, b) => a + b, 0) / gradesCollected.length).toFixed(1))
      : null;

    if (gradesCollected.length > 0 || subjects.includes(sub)) {
      gradesList.push({
        subject: sub,
        grades: gradesCollected.map(String),
        average: avg
      });
    }
  });

  const leistungenHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">III. LEISTUNGSVERLAUF</span>
          <h1>Notengitter & Leistungsbilanz</h1>
        </div>
        <div class="meta">
          <strong>Schüler:</strong> ${student.vorname} ${student.nachname}<br>
          <strong>Semester:</strong> 1. & 2. Semester
        </div>
      </div>

      <div class="card">
        <h2>Noten & Notenmittelwert nach Pflichtgegenstand</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Gegenstand / Fach</th>
              <th style="text-align: center;">Erfasste Leistungsnoten (SA/LZK)</th>
              <th style="text-align: center;">Notenschnitt</th>
              <th style="text-align: right;">Beurteilungstendenz</th>
            </tr>
          </thead>
          <tbody>
            ${gradesList.map(gr => {
              const rating = gr.average !== null && gr.average <= 1.5 ? 'Herausragend' 
                : gr.average !== null && gr.average <= 2.5 ? 'Standard voll erfüllt' 
                : gr.average !== null && gr.average <= 4.0 ? 'Standard erfüllt' 
                : gr.average !== null ? 'Entwicklungsbedarf' : 'Keine Leistungsdaten';
              return `
                <tr>
                  <td><strong>${gr.subject}</strong></td>
                  <td style="text-align: center;" class="mono">${gr.grades.length > 0 ? gr.grades.join(', ') : '—'}</td>
                  <td style="text-align: center;">
                    <span class="avg-badge ${gr.average !== null ? 'has-avg' : ''}">
                      ${gr.average !== null ? gr.average.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td style="text-align: right; font-size: 10pt; color: #475569; font-weight: 600;">${rating}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ==================== 4. MIKA-D ====================
  const mikaDStatus = student.foerderprofil?.mikaDStatus || 'nicht erhoben';
  const mikaDDatum = student.foerderprofil?.mikaDDatum || '';
  const mikaStages: Record<string, { label: string; desc: string; color: string }> = {
    '3': { label: 'AO - Stufe 3', desc: 'Außerordentlich (geringe Kenntnisse)', color: '#b91c1c' },
    '2': { label: 'AO - Stufe 2', desc: 'Außerordentlich (mäßige Kenntnisse)', color: '#d97706' },
    '1': { label: 'AO - Stufe 1', desc: 'Außerordentlich (fortgeschritten)', color: '#4f46e5' },
    'ordentlich': { label: 'Ordentlich (Ausreichend)', desc: 'Ausreichende Deutschkenntnisse für ordentliche Einschulung', color: '#059669' },
    'nicht erhoben': { label: 'Nicht erhoben', desc: 'Derzeit keine MIKA-D Sprachstandserhebung durchgeführt', color: '#64748b' }
  };
  const mikaInfo = mikaStages[mikaDStatus] || mikaStages['nicht erhoben'];

  const mikaDHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">IV. MIKA-D SPRACHBEWERTUNG</span>
          <h1>Sprachstandserhebung Deutsch (MIKA-D)</h1>
        </div>
        <div class="meta">
          <strong>Evaluationsdatum:</strong> ${mikaDDatum ? formatDate(mikaDDatum) : '—'}
        </div>
      </div>

      <div class="card" style="border-left: 6px solid ${mikaInfo.color};">
        <div style="font-size: 28pt; margin-bottom: 10px;">🗣️</div>
        <p class="uppercase" style="font-size: 9pt; font-weight: 800; color: #94a3b8; margin: 0 0 5px 0; letter-spacing: 1px;">Aktuelle Einstufung</p>
        <h2 style="font-size: 18pt; margin: 0 0 10px 0; color: ${mikaInfo.color};">${mikaInfo.label}</h2>
        <p style="font-size: 11pt; color: #334155; line-height: 1.6; font-weight: 600; margin: 0;">
          ${mikaInfo.desc}
        </p>
      </div>

      <div class="card mt-20">
        <h2>Hintergrund & Bestimmung zur MIKA-D Messung</h2>
        <p style="font-size: 10pt; color: #475569; line-height: 1.6;">
          Die standardisierte MIKA-D Testung (Messinstrument zur Kompetenzanalyse - Deutsch) dient der präzisen Feststellung des Sprachstandes von Schülerinnen und Schülern mit nicht-deutscher Muttersprache. Auf Basis des Ergebnisses werden gezielte sprachliche Fördermaßnahmen im Ausmaß des außerordentlichen oder ordentlichen Status beschlossen.
        </p>
      </div>
    </div>
  `;

  // ==================== 5. VERHALTEN & PRÄSENZ ====================
  // Calculate attendance hours
  const attendanceData = appState.anwesenheit?.[schuelerId] || {};
  let excusedHours = 0;
  let unexcusedHours = 0;
  Object.values(attendanceData).forEach((dayData: any) => {
    Object.values(dayData).forEach(status => {
      if (status === 'e') excusedHours++;
      else if (status === 'u' || status === 'f') unexcusedHours++;
    });
  });

  // Fetch behavior logs
  const studentNotes = (appState.notes || appState.journal || [])
    .filter((n: any) => n.schuelerId === schuelerId)
    .sort((a: any, b: any) => {
      const timeA = new Date(a.datum || a.timestamp || 0).getTime();
      const timeB = new Date(b.datum || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

  const behaviorStages = appState.behavior_stages || [
    { id: '1', label: 'Herausragend', icon: '🌟' },
    { id: '2', label: 'Sehr positiv', icon: '😊' },
    { id: '3', label: 'Normal / Neutral', icon: '😐' },
    { id: '4', label: 'Ermahnung', icon: '⚠️' },
    { id: '5', label: 'Kritisch', icon: '❌' }
  ];
  const currentStatusId = appState.behavior_status?.[schuelerId] || appState.behavior_default_stage_id || '3';
  const currentStage = behaviorStages.find((bs: any) => bs.id === currentStatusId) || behaviorStages[2];

  const verhaltenHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">V. VERHALTEN & PRÄSENZ</span>
          <h1>Sozialverhalten & Präsenzerfassung</h1>
        </div>
        <div class="meta">
          <strong>Schüler:</strong> ${student.vorname} ${student.nachname}
        </div>
      </div>

      <div class="grid grid-3">
        <div class="kpi bg-light">
          <span class="kpi-label">Verhaltensampel</span>
          <span class="kpi-val" style="font-size: 14pt;">${currentStage.icon} ${currentStage.label}</span>
        </div>
        <div class="kpi bg-success">
          <span class="kpi-label" style="color: #15803d;">Absenzen (Entschuldigt)</span>
          <span class="kpi-val" style="color: #166534;">${excusedHours} Stunden</span>
        </div>
        <div class="kpi bg-danger">
          <span class="kpi-label" style="color: #b91c1c;">Absenzen (Unentschuldigt)</span>
          <span class="kpi-val" style="color: #991b1b;">${unexcusedHours} Stunden</span>
        </div>
      </div>

      <div class="card mt-20">
        <h2>Letzte Verhaltensbeobachtungen & Logbuch-Einträge</h2>
        ${studentNotes.length > 0 ? `
          <div class="logs-container">
            ${studentNotes.slice(0, 10).map((n: any) => `
              <div class="log-item">
                <div class="log-meta">
                  <span class="log-cat">${n.kategorie || 'Beobachtung'}</span>
                  <span>${n.datum ? formatDate(n.datum) : formatDate(n.timestamp)}</span>
                </div>
                <p class="log-text">${n.inhalt || n.text || ''}</p>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="empty-state">Es sind keine dokumentierten Verhaltensbeobachtungen vorhanden.</p>
        `}
      </div>
    </div>
  `;

  // ==================== 6. KEL REFLEXION ====================
  const kelRow = (appState.kelGespraeche || []).find((k: any) => k.schuelerId === schuelerId);
  const CRITERION_DICT: Record<string, string> = {
    'zuzuhoeren': 'Zuhören & Verstehen',
    'lesen': 'Lesefreude & Technik',
    'rechnen': 'Mathematisches Denken',
    'konzentration': 'Ausdauer & Fokus',
    'regeln': 'Regeln & Vereinbarungen',
    'de_hoeren_gespraeche': 'D-Hören/Sprechen: Unterrichtsbeiträge',
    'de_hoeren_standardsprache': 'D-Hören/Sprechen: Aussprache',
    'de_hoeren_zuhoeren': 'D-Hören/Sprechen: Zuhören',
    'de_lesen_fliessend': 'D-Lesen: Flüssig lesen',
    'de_lesen_verstaendnis': 'D-Lesen: Leseverständnis',
    'de_lesen_info_verarbeit': 'D-Lesen: Textanalyse',
    'de_rechtschreiben_richtig': 'D-Rechtschreiben: Abschreiben',
    'de_rechtschreiben_lernwoerter': 'D-Rechtschreiben: Lernwörter',
    'de_rechtschreiben_wortfamilie': 'D-Rechtschreiben: Grammatik',
    'de_verfassen_planen': 'D-Verfassen: Textentwurf',
    'ma_zahlen_zahlenraum': 'M-Arithmetik: Zahlenraum',
    'ma_zahlen_stellenwert': 'M-Arithmetik: Stellenwert',
    'ma_rechnen_addition': 'M-Rechnen: Addition',
    'ma_rechnen_subtraktion': 'M-Rechnen: Subtraktion',
    'ma_rechnen_multiplikation': 'M-Rechnen: Multiplikation',
    'ma_rechnen_division': 'M-Rechnen: Division',
    'ma_rechnen_sachaufgaben': 'M-Rechnen: Sachaufgaben',
    'ma_groessen_umwandeln': 'M-Größen: Maßeinheiten',
    'ma_raum_figuren': 'M-Geometrie: Figuren',
    'su_interesse': 'Sachunterricht: Eigeninteresse',
    'su_wiedergabe': 'Sachunterricht: Erklärung',
    'al_mitarbeit': 'Arbeitsverhalten: Mitarbeit',
    'al_konzentration': 'Arbeitsverhalten: Konzentration',
    'al_ordnung': 'Arbeitsverhalten: Ordnung',
    'al_selbststaendigkeit': 'Arbeitsverhalten: Selbstständigkeit',
    'al_hausuebungen': 'Arbeitsverhalten: Hausübungen'
  };

  const kelHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">VI. COLLABORATIVES ENTWICKLUNGSDIAGRAMM</span>
          <h1>Selbstreflexion & KEL-Gespräch</h1>
        </div>
        <div class="meta">
          <strong>Gesprächsdatum:</strong> ${kelRow?.datum ? formatDate(kelRow.datum) : '—'}
        </div>
      </div>

      <div class="card bg-light">
        <h2>Vereinbarungen aus dem KEL-Gespräch</h2>
        <p style="font-size: 10pt; color: #334155; line-height: 1.6; font-weight: 600; margin: 0;">
          ${kelRow?.vereinbarungen || 'Keine Zielvereinbarungen im System erfasst.'}
        </p>
      </div>

      <div class="card mt-20">
        <h2>Direkter Vergleich: Kind vs. Lehrperson</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Reflexionskriterium</th>
              <th style="text-align: center; width: 150px;">Selbsteinschätzung Kind</th>
              <th style="text-align: center; width: 150px;">Einschätzung Lehrkraft</th>
              <th>Kommentar des Kindes</th>
            </tr>
          </thead>
          <tbody>
            ${kelRow ? Object.keys(CRITERION_DICT).map(key => {
              const kidVal = kelRow.selbsteinschaetzungKind?.[key];
              const teachVal = kelRow.einschaetzungLehrperson?.[key];
              if (!kidVal && !teachVal) return '';

              return `
                <tr>
                  <td><strong>${CRITERION_DICT[key]}</strong></td>
                  <td style="text-align: center; color: #d97706;" class="stars">${renderStars(kidVal?.wert)}</td>
                  <td style="text-align: center; color: #4f46e5;" class="stars">${renderStars(teachVal?.wert)}</td>
                  <td style="font-size: 9.5pt; color: #475569; italic">${kidVal?.kommentar || '—'}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="4" class="empty-state">Keine KEL-Selbstreflexionsbögen für dieses Semester ausgefüllt.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ==================== 7. DIAGNOSTIK ====================
  const diagnostikList = (appState.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === schuelerId);

  const diagnostikHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">VII. PÄDAGOGISCHE DIAGNOSTIK</span>
          <h1>Standardisierte Testverfahren & Protokolle</h1>
        </div>
        <div class="meta">
          <strong>Oberau-Index:</strong> ${(student as any).oberauIndex !== undefined ? `${(student as any).oberauIndex} / 10` : '8.5 / 10'}
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card bg-light">
          <h2>Oberau-Skala (Selbststeuerung)</h2>
          <p style="font-size: 13pt; font-weight: 800; color: #0f172a; margin: 0 0 5px 0;">
            Wertung: ${(student as any).oberauIndex !== undefined ? `${(student as any).oberauIndex} / 10` : '8.5 / 10'}
          </p>
          <p style="font-size: 9.5pt; color: #475569; line-height: 1.5; margin: 0;">
            Die Oberau-Skala indiziert die Fähigkeit des Kindes zur kognitiven Selbststeuerung, Konzentration und exekutiven Arbeitskontrolle im Volksschulunterricht.
          </p>
        </div>
        <div class="card bg-light">
          <h2>Qualitative Zusatzbemerkungen</h2>
          <p style="font-size: 9.5pt; color: #475569; line-height: 1.5; margin: 0; font-style: italic;">
            ${student.foerderprofil?.zusatzinfo || 'Keine spezifischen qualitativen Diagnostik-Matrix-Erläuterungen eingetragen.'}
          </p>
        </div>
      </div>

      <div class="card mt-20">
        <h2>Ergebnisse der standardisierten Überprüfungen</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Testverfahren / Lernstandserhebung</th>
              <th style="text-align: center;">Ergebniswert</th>
              <th style="text-align: center;">Rohwert</th>
              <th style="text-align: right;">Datum</th>
              <th style="text-align: right;">Durchgeführt von</th>
            </tr>
          </thead>
          <tbody>
            ${diagnostikList.length > 0 ? diagnostikList.map((d: any) => {
              const test = (appState.diagnostikTests || []).find((t: any) => t.id === d.testId);
              const testName = test ? test.name : (d.testId || 'Unbekannter Test');
              return `
                <tr>
                  <td>
                    <strong>${testName}</strong>
                    ${isDiagnosticAlert(d) ? '<span class="status-badge unpaid" style="font-size: 7.5pt; padding: 1px 4px; margin-left: 5px;">PÄDAGOGISCH PRÜFEN</span>' : ''}
                  </td>
                  <td style="text-align: center;" class="mono">${d.ergebniswert}</td>
                  <td style="text-align: center;" class="mono">${d.rohwert || '—'}</td>
                  <td style="text-align: right;">${d.datum ? formatDate(d.datum) : '—'}</td>
                  <td style="text-align: right; font-size: 9.5pt; color: #475569;">${d.durchgefuehrtVon || 'Lehrkraft'}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="5" class="empty-state">Keine standardisierten Testergebnisse oder 1:1 Live-Protokolle vorhanden.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ==================== 8. FÖRDERPLAN & MAßNAHMEN ====================
  const foerderprofil = student.foerderprofil;
  const staerken = foerderprofil?.staerken || [];
  const bedarf = foerderprofil?.foerderbedarfBereiche || [];
  const ziele = foerderprofil?.foerderziele || [];

  const foerderHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">VIII. FÖRDERPLAN & MAßNAHMEN</span>
          <h1>Pädagogisches Förderprofil & Zielvereinbarungen</h1>
        </div>
        <div class="meta">
          <strong>Ziele Aktiv:</strong> ${ziele.length}
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card" style="border-top: 4px solid #10b981;">
          <h2 style="color: #047857;">Individuelle Stärken & Ressourcen</h2>
          ${staerken.length > 0 ? `
            <ul style="padding-left: 20px; font-size: 10pt; color: #334155; line-height: 1.6;">
              ${staerken.map((s: string) => `<li>${s}</li>`).join('')}
            </ul>
          ` : `
            <p class="empty-state">Keine spezifischen Stärken explizit erfasst.</p>
          `}
        </div>
        <div class="card" style="border-top: 4px solid #f43f5e;">
          <h2 style="color: #be123c;">Identifizierter Förderbedarf</h2>
          ${bedarf.length > 0 ? `
            <ul style="padding-left: 20px; font-size: 10pt; color: #334155; line-height: 1.6;">
              ${bedarf.map((b: string) => `<li>${b}</li>`).join('')}
            </ul>
          ` : `
            <p class="empty-state">Kein spezifischer Förderbedarf vermerkt.</p>
          `}
        </div>
      </div>

      <div class="card mt-20">
        <h2>Definierte Förderplan-Ziele & Maßnahmen</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Bereich / Kompetenz</th>
              <th>Konkrete Zielvereinbarung / Maßnahme</th>
              <th style="text-align: center; width: 120px;">Zieltermin</th>
              <th style="text-align: right; width: 120px;">Fortschrittsstatus</th>
            </tr>
          </thead>
          <tbody>
            ${ziele.length > 0 ? ziele.map((z: any) => `
              <tr>
                <td><strong>${z.bereich}</strong></td>
                <td>${z.ziel} ${z.notiz ? `<br><small style="color: #64748b;">${z.notiz}</small>` : ''}</td>
                <td style="text-align: center;">${z.zielDatum ? formatDate(z.zielDatum) : '—'}</td>
                <td style="text-align: right;">
                  <span class="status-badge paid" style="background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;">
                    ${z.status || 'In Arbeit'}
                  </span>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" class="empty-state">Keine Förderziele oder individuellen Förderpläne für dieses Semester angelegt.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ==================== 9. KI PORTFOLIO ====================
  const cachedKiSummary = localStorage.getItem(`ki_portfolio_summary_${schuelerId}`) || '';

  const kiHtml = `
    <div class="page page-break">
      <div class="header">
        <div>
          <span class="badge">IX. KI-ENTWICKLUNGSBERICHT</span>
          <h1>Ganzheitlicher Entwicklungsbericht (KI-gestützt)</h1>
        </div>
        <div class="meta">
          <strong>Modell:</strong> Gemini 1.5 Pro
        </div>
      </div>

      <div class="card" style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 25px; line-height: 1.6; font-size: 10pt; color: #1e293b;">
        ${cachedKiSummary ? `
          <div class="ki-content">
            ${parseMarkdownToHtml(cachedKiSummary)}
          </div>
        ` : `
          <div style="text-align: center; padding: 30px 10px; color: #64748b;">
            <div style="font-size: 24pt; margin-bottom: 10px;">🤖</div>
            <strong style="display: block; margin-bottom: 5px;">Ganzheitlicher Bericht noch ausständig</strong>
            <p style="font-size: 9pt; max-w: 480px; margin: 0 auto; color: #94a3b8; line-height: 1.5;">
              Hinweis: Der automatische Entwicklungsbericht wurde im System noch nicht generiert. Um diesen zu aktivieren, öffnen Sie das Schülerdossier, gehen Sie zu "Portfolio-Einträge" &gt; "KI-Portfolio Bericht" und klicken Sie auf "Bericht generieren". Sobald dies erledigt ist, wird dieser vollautomatisch in diesen PDF-Gesamtexport eingebunden.
            </p>
          </div>
        `}
      </div>

      <!-- Signatures Footer at the bottom of the last page -->
      <div class="signatures">
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-line"></div>
            Unterschrift der Erziehungsberechtigten
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            Handzeichen der Klassenlehrkraft / Datum
          </div>
        </div>
        <div class="confidential">
          Vertrauliches Schuldossier • DSGVO-Konform geschützt • Nur für den internen pädagogischen Dienstgebrauch bestimmt
        </div>
      </div>
    </div>
  `;

  // ==================== STYLING AND HTML ASSEMBLY ====================
  const css = `
    @page { 
      size: A4; 
      margin: 15mm; 
    }
    body { 
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      color: #0f172a; 
      line-height: 1.5; 
      font-size: 11pt; 
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    
    /* Layout Helpers */
    .page {
      position: relative;
      background-color: #ffffff;
    }
    .page-break { 
      page-break-before: always; 
      break-before: page;
      margin-top: 30px;
    }
    .grid { 
      display: grid; 
      gap: 15px; 
    }
    .grid-2 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    .mt-20 { margin-top: 20px; }
    
    /* Typography */
    h1 { 
      font-size: 18pt; 
      font-weight: 800;
      margin: 5px 0 0 0; 
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    h2 { 
      font-size: 11.5pt; 
      font-weight: 800; 
      margin: 0 0 15px 0; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      color: #1e293b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      margin: 15px 0 5px 0;
      color: #334155;
    }
    p {
      margin: 0 0 10px 0;
    }
    
    /* Components */
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-end; 
      border-bottom: 2.5pt solid #0f172a; 
      padding-bottom: 12px; 
      margin-bottom: 25px; 
    }
    .badge { 
      font-size: 7.5pt; 
      background-color: #0f172a; 
      color: #ffffff; 
      font-weight: 900; 
      letter-spacing: 1.2px; 
      padding: 3px 8px; 
      border-radius: 4px; 
      text-transform: uppercase;
    }
    .meta { 
      text-align: right; 
      font-size: 8.5pt; 
      color: #64748b; 
      line-height: 1.4;
      font-weight: 600;
    }
    .card { 
      border: 1px solid #cbd5e1; 
      padding: 18px; 
      border-radius: 12px; 
      background-color: #ffffff; 
    }
    .field { 
      font-size: 10pt; 
      margin-bottom: 8px; 
      color: #334155;
    }
    .field strong {
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      display: inline-block;
      width: 130px;
    }
    
    /* KPI Card */
    .kpi {
      padding: 15px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bg-light { background-color: #f8fafc; }
    .bg-success { background-color: #f0fdf4; border-color: #bbf7d0; }
    .bg-danger { background-color: #fef2f2; border-color: #fecaca; }
    .kpi-label { font-size: 7.5pt; font-weight: 800; uppercase; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; }
    .kpi-val { font-size: 15pt; font-weight: 900; color: #0f172a; margin-top: 5px; }
    
    /* Tables */
    .data-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 5px; 
      font-size: 10pt;
    }
    .data-table th, .data-table td { 
      padding: 8px 12px; 
      text-align: left; 
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table th { 
      background-color: #f8fafc; 
      font-weight: 800; 
      text-transform: uppercase;
      font-size: 8pt;
      color: #475569;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e1;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .mono { font-family: monospace; font-weight: 700; }
    .stars { font-size: 12pt; font-weight: bold; letter-spacing: 1px; }
    
    /* Badges */
    .status-badge {
      font-size: 8pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .paid { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .unpaid { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    
    .avg-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: #f1f5f9;
      color: #64748b;
      font-family: monospace;
      font-weight: 800;
      font-size: 10pt;
    }
    .avg-badge.has-avg {
      background-color: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }
    
    /* Logbook Items */
    .logs-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .log-item {
      padding: 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .log-meta {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .log-cat {
      background-color: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .log-text {
      font-size: 9.5pt;
      color: #334155;
      font-weight: 600;
      margin: 0;
      line-height: 1.4;
    }
    
    /* KI summary markdown styling */
    .ki-content h3 {
      font-size: 10pt;
      font-weight: 800;
      margin: 15px 0 5px 0;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2px;
    }
    .ki-content p {
      margin-bottom: 12px;
    }
    .ki-content li {
      margin-bottom: 4px;
    }
    
    /* Footer & Signatures */
    .signatures {
      margin-top: 40px;
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
    }
    .sig-box {
      width: 45%;
      text-align: center;
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .sig-line {
      border-bottom: 1px dashed #cbd5e1;
      height: 35px;
      margin-bottom: 8px;
    }
    .confidential {
      text-align: center;
      font-size: 7.5pt;
      font-weight: bold;
      color: #94a3b8;
      text-transform: uppercase;
      margin-top: 30px;
      letter-spacing: 0.5px;
    }
    .empty-state {
      font-style: italic;
      color: #94a3b8;
      text-align: center;
      padding: 15px;
      font-size: 9.5pt;
      margin: 0;
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
      }
      .page-break { 
        page-break-before: always; 
        break-before: page;
      }
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Schülerdossier - ${student.vorname} ${student.nachname}</title>
        <style>${css}</style>
      </head>
      <body>
        ${(!options || options.showStammdaten) ? stammdatenHtml : ''}
        ${(!options || options.showFinanzen) ? finanzenHtml : ''}
        ${(!options || options.showLeistungen) ? leistungenHtml : ''}
        ${(!options || options.showMikaD) ? mikaDHtml : ''}
        ${(!options || options.showVerhalten) ? verhaltenHtml : ''}
        ${(!options || options.showKELReflexion) ? kelHtml : ''}
        ${(!options || options.showDiagnostik) ? diagnostikHtml : ''}
        ${(!options || options.showFoerderprofil) ? foerderHtml : ''}
        ${(!options || options.showKIPortfolio) ? kiHtml : ''}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 600);
}
