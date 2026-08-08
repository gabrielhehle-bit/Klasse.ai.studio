import React from 'react';
import { useApp } from '../context/AppContext';
import { getCurrentSchuljahr } from '../lib/utils';

interface PrintHeaderProps {
  title?: string;
}

const PAGE_TITLE_MAP: Record<string, string> = {
  'dashboard': 'Klassen-Leistungsübersicht',
  'schueler': 'Schülerliste',
  'anwesenheit': 'Anwesenheitsprotokoll & Absenzen',
  'noten': 'Notenmappe & Leistungsbeurteilung',
  'wochenplanung': 'Wochenplan',
  'sitzplan': 'Sitzordnung & LEHRERCOCKPIT',
  'diagnostik': 'Diagnostik-Ergebnisse',
  'materialien': 'Verzeichnis Materialbibliothek',
  'portfolio': 'Schülerportfolio & Meilensteine',
  'ki-helfer': 'KI-Unterstützte Unterrichtsplanung',
  'ki-paedagogik': 'KI Pädagogik-Assistent',
  'ki-wissen': 'KI Fachwissen-Assistent',
  'ki-recht': 'KI Schulrecht-Assistent',
  'ki-reflexion': 'KI Unterrichtsreflexion',
  'ki-elternbrief': 'KI Elternbrief-Generator',
  'ki-differenzierung': 'KI Differenzierungs-Assistent',
  'ki-beurteilung': 'KI Zeugnisbeurteilung',
  'ki-korrektur': 'KI Korrektur-Assistent',
  'verhalten': 'Verhaltensnotizen & Beobachtungen',
  'orga': 'Kassenführung & Organisation',
  'statistik': 'Statistik & Analysen',
  'jahresplanung': 'Jahresplanung & Lehrplanabdeckung',
  'uebergabemappe': 'Schul-Übergabemappe & Dokumentation',
  'stunden': 'Unterrichtsentwürfe & Stundenbilder',
  'eltern': 'Gesprächsprotokolle & Notizen',
  'kel': 'KEL-Gesprächsprotokoll',
  'elternbrief': 'Klassen-Elternbriefe (KI)',
  'notenTabelle': 'Klassen-Notenübersicht',
  'differenzierung': 'Differenzierte Lernmaterialien',
  'archiv': 'Datenarchiv',
  'datensicherung': 'System-Datensicherung',
  'settings': 'Anwendungs-Einstellungen',
  'verbal': 'Verbale Schüler-Beurteilung',
  'vertretung': 'Vertretungsplan',
};

export default function PrintHeader({ title }: PrintHeaderProps) {
  const { app } = useApp();
  const currentPage = app?.currentPage || 'dashboard';
  
  const [overrideTitle, setOverrideTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleCheckTitle = () => {
      if (typeof window !== 'undefined' && (window as any).__printTitle) {
        setOverrideTitle((window as any).__printTitle);
      } else {
        setOverrideTitle(null);
      }
    };

    // Initial check
    handleCheckTitle();

    // Setup an interval to check frequently in case components set it dynamically deep within render cycles
    const interval = setInterval(handleCheckTitle, 400);

    window.addEventListener('beforeprint', handleCheckTitle);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeprint', handleCheckTitle);
    };
  }, [currentPage]);

  const displayTitle = title || overrideTitle || PAGE_TITLE_MAP[currentPage] || 'Schulunterlagen';

  return (
    <div className="global-print-header hidden print:block w-full border-b-[1.5pt] border-black pb-4 mb-6">
      <div className="flex justify-between items-start">
        <div className="w-1/3">
          <div className="text-[7pt] font-black uppercase tracking-widest text-slate-500 mb-1">Schule / Klasse</div>
          <h1 className="text-[12pt] font-black text-black leading-tight">
            {app?.schulName || 'SchoolBase Pro'} {app?.schulkennzahl ? `(SKZ: ${app.schulkennzahl})` : ''} <br />
            <span className="text-[10pt] font-bold">Klasse: {app?.klassenbezeichnung || 'N/A'} • SJ {app?.schuljahr || getCurrentSchuljahr()}</span>
          </h1>
        </div>
        
        <div className="w-1/3 text-center px-4 border-x border-slate-200">
          <div className="text-[7pt] font-black uppercase tracking-widest text-slate-500 mb-1">Dokumentenart</div>
          <h2 className="text-[14pt] font-black text-black leading-tight">{displayTitle}</h2>
          <div className="text-[8pt] text-slate-600 mt-1 font-medium italic">Gemäß § 17 Schulunterrichtsgesetz</div>
        </div>
        
        <div className="w-1/3 text-right">
          <div className="text-[7pt] font-black uppercase tracking-widest text-slate-500 mb-1">Aussteller / Datum</div>
          <p className="font-bold text-black text-[10pt]">
            {app?.anrede ? `${app.anrede} ` : ''}{app?.nachname || 'Lehrperson'}
          </p>
          <p className="text-[9pt] text-slate-600">Stand: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}
