import pdfMakeLib from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { isDiagnosticAlert } from './diagnosticData';

// @ts-ignore
const pdfMake = pdfMakeLib as any;
// @ts-ignore
pdfMake.vfs = pdfFonts?.pdfMake?.vfs || (pdfFonts as any)?.vfs;

export async function generateFoerderBescheid(student: any, erhebungen: any[]) {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: 'Bescheid über sonderpädagogischen Förderbedarf', style: 'header' },
      { text: `Schüler/in: ${student.vorname} ${student.nachname}`, style: 'subheader', margin: [0, 10, 0, 5] },
      { text: `Geburtsdatum: ${student.geburtsdatum || 'Keine Angabe'}`, margin: [0, 0, 0, 15] },
      { text: 'Begründung & Diagnostik', style: 'subheader', margin: [0, 10, 0, 10] },
      { text: 'Aufgrund der durchgeführten pädagogischen Diagnostik wird für die oben genannte Schülerin / den oben genannten Schüler folgender Förderbedarf festgestellt:', margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            ['Erhebung / Test', 'Datum', 'Ergebnis / Maßnahme'],
            ...erhebungen.map((e: any) => [
              e.testId,
              e.datum,
              e.foerderbedarfErkannt
                ? 'Förderbedarf dokumentiert'
                : isDiagnosticAlert(e)
                  ? 'Pädagogischer Prüfhinweis'
                  : 'Kein Prüfhinweis'
            ]),
          ]
        },
        margin: [0, 0, 0, 20]
      },
      { text: 'Gültigkeit des Bescheids:', style: 'subheader', margin: [0, 10, 0, 5] },
      { text: 'Dieser Bescheid ist für das laufende Schuljahr gültig und berechtigt zur Inanspruchnahme von Fördermaßnahmen im Unterricht.', margin: [0, 0, 0, 40] },
      
      {
        columns: [
          {
            text: '_________________________________\nOrt, Datum',
            alignment: 'center'
          },
          {
            text: '_________________________________\nUnterschrift Direktion',
            alignment: 'center'
          }
        ]
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      subheader: {
        fontSize: 14,
        bold: true
      }
    },
    defaultStyle: {
      fontSize: 11,
      lineHeight: 1.5
    }
  };

  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.download(`Foerderbescheid_${student.nachname}_${student.vorname}.pdf`);
}

export async function generateDataConsistencyReport(app: any, issues: any[]) {
  const currentDate = new Date().toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const klassenbezeichnung = app.klassenbezeichnung || app.name || 'Nicht definiert';
  const stufe = app.stufe ? `${app.stufe}. Schulstufe` : 'Nicht angegeben';
  const totalStudents = app.schueler ? app.schueler.length : 0;

  const tableBody = [
    [
      { text: 'Typ / Fehler', style: 'th' },
      { text: 'Modul', style: 'th' },
      { text: 'Schweregrad', style: 'th' },
      { text: 'Beschreibung / Betroffene ID', style: 'th' }
    ]
  ];

  if (issues.length === 0) {
    tableBody.push([
      { text: 'Perfekte Konsistenz', colSpan: 4, alignment: 'center', style: 'successText', margin: [0, 10, 0, 10] } as any,
      {}, {}, {}
    ]);
  } else {
    issues.forEach((issue, index) => {
      const severityStyle = issue.severity === 'error' ? 'redBadge' : issue.severity === 'warning' ? 'orangeBadge' : 'blueBadge';
      const severityLabel = issue.severity === 'error' ? 'KRITISCH (Error)' : issue.severity === 'warning' ? 'WARNUNG' : 'INFO';
      
      tableBody.push([
        { text: issue.title, style: 'cellBold' },
        { text: issue.module.toUpperCase(), style: 'cell' },
        { text: severityLabel, style: severityStyle },
        { text: `${issue.description}${issue.details ? `\nDetails: ${issue.details}` : ''}`, style: 'cellSmall' }
      ]);
    });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 55],
    header: (currentPage, pageCount) => {
      return {
        text: 'DIGITALES KLASSENBUCH • KONSISTENZBERICHT',
        alignment: 'right',
        fontSize: 7,
        color: '#94a3b8',
        margin: [40, 20, 40, 0],
        bold: true
      };
    },
    footer: (currentPage, pageCount) => {
      return {
        columns: [
          { text: `Generiert am: ${currentDate}`, fontSize: 8, color: '#64748b' },
          { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'right', fontSize: 8, color: '#64748b' }
        ],
        margin: [40, 0, 40, 15]
      };
    },
    content: [
      { text: 'System-Prüfbericht: Datenkonsistenz', style: 'docTitle' },
      { text: 'Modulübergreifende Synchronisationsüberprüfung', style: 'docSubtitle' },
      
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }
        ],
        margin: [0, 8, 0, 15]
      },

      {
        columns: [
          {
            width: '60%',
            stack: [
              { text: 'Klassendaten & Kontext', style: 'sectionHeader' },
              { text: `Klasse: ${klassenbezeichnung} (${stufe})`, style: 'metaText' },
              { text: `Klassenvorstand: ${app.klassenvorstand ? 'Ja' : 'Nein'}`, style: 'metaText' },
              { text: `Aktive Schülerprofile: ${totalStudents}`, style: 'metaText' }
            ]
          },
          {
            width: '40%',
            stack: [
              { text: 'Sicherheits- & Integritätsstatus', style: 'sectionHeader' },
              {
                text: issues.length === 0 ? '✓ VOLLSTÄNDIG INTEGRAL' : '⚠️ DISKREPANZ GEFUNDEN',
                fontSize: 11,
                bold: true,
                color: issues.length === 0 ? '#10b981' : issues.filter(i => i.severity === 'error').length > 0 ? '#ef4444' : '#f59e0b'
              },
              { text: `Offene Abweichungen: ${issues.length}`, style: 'metaText' },
              { text: `Schwere Mängel (Critical): ${issues.filter(i => i.severity === 'error').length}`, style: 'metaText' }
            ]
          }
        ],
        margin: [0, 0, 0, 25]
      },

      { text: 'Analysierte Modulsektoren', style: 'sectionHeader' },
      {
        text: 'Folgende Anwendungskomponenten wurden auf referenzielle Integrität, verwaiste Schüler-IDs, Namensgleichheiten und doppelte Registrierungen vollautomatisch gescannt:',
        style: 'introText',
        margin: [0, 0, 0, 10]
      },
      
      {
        ul: [
          'Schülerstamm (Eindeutige ID-Zuweisung, Namensüberlappungen)',
          'Notenmappe (Schriftliche Arbeiten, Tests, Hausübungen)',
          'Diagnostik-Modul (Testergebnisse, Förderaufzeichnungen, Meilensteine)',
          'Mitarbeit-Tracker & Verhaltensampel',
          'Dienste, Sitzpläne, Checklisten und Klassenkasse'
        ],
        style: 'introText',
        margin: [10, 0, 0, 20]
      },

      { text: 'Ergebnis & Detailanalyse der Synchronitäts-Fehler', style: 'sectionHeader', margin: [0, 10, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '15%', '20%', '40%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1.5 : 0.5,
          vLineWidth: (i, node) => 0,
          hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? '#94a3b8' : '#e2e8f0',
          paddingLeft: (i, node) => 8,
          paddingRight: (i, node) => 8,
          paddingTop: (i, node) => 8,
          paddingBottom: (i, node) => 8
        }
      },

      { text: '\n\nEmpfohlene Handlungsanweisungen:', style: 'sectionHeader', margin: [0, 15, 0, 5] },
      {
        text: '1. Verwaiste Einträge: Verwende die Funktion "Komplett löschen", wenn der Schüler permanent aus der Klasse entfernt wurde.\n2. Daten-Zusammenführung: Verwende "Daten Transferieren", wenn ein Schüler eine neue ID erhalten hat, damit Leistungsstände, Verhaltenschroniken und Checklisten erhalten bleiben.',
        style: 'introText'
      }
    ],
    styles: {
      docTitle: {
        fontSize: 20,
        bold: true,
        color: '#0f172a',
        characterSpacing: 0.5
      },
      docSubtitle: {
        fontSize: 11,
        color: '#64748b',
        margin: [0, 2, 0, 0]
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#1e293b',
        margin: [0, 0, 0, 8],
        characterSpacing: 0.2
      },
      metaText: {
        fontSize: 9,
        color: '#475569',
        margin: [0, 2, 0, 0]
      },
      introText: {
        fontSize: 9,
        color: '#475569',
        lineHeight: 1.4
      },
      th: {
        fontSize: 9,
        bold: true,
        color: '#ffffff',
        fillColor: '#1e293b',
        margin: [2, 4, 2, 4]
      },
      cellBold: {
        fontSize: 9,
        bold: true,
        color: '#1e293b'
      },
      cell: {
        fontSize: 9,
        color: '#475569'
      },
      cellSmall: {
        fontSize: 8,
        color: '#475569',
        lineHeight: 1.2
      },
      redBadge: {
        fontSize: 8,
        bold: true,
        color: '#b91c1c',
        fillColor: '#fee2e2',
        alignment: 'center'
      },
      orangeBadge: {
        fontSize: 8,
        bold: true,
        color: '#c2410c',
        fillColor: '#ffedd5',
        alignment: 'center'
      },
      blueBadge: {
        fontSize: 8,
        bold: true,
        color: '#0369a1',
        fillColor: '#e0f2fe',
        alignment: 'center'
      },
      successText: {
        fontSize: 10,
        bold: true,
        color: '#059669'
      }
    },
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.4,
      font: 'Roboto'
    }
  };

  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  const cleanKlassen = klassenbezeichnung.replace(/[^a-zA-Z0-9]/g, '_');
  pdfDocGenerator.download(`Konsistenzbericht_${cleanKlassen}_${new Date().toISOString().substring(0,10)}.pdf`);
}
