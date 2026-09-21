import React, {useMemo, useState} from 'react';
import {BookOpen, CalendarDays, CheckCircle2, ClipboardList, FileText, Printer, Search, Users} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {TAGE_NAMEN, LESSON_SLOT_NUMBERS} from '../constants';
import {getKW} from '../lib/utils';
import {getStudentAttendanceSummary, getStudentBehaviorSummary, getStudentNotes} from '../lib/studentMetrics';
import {sek1GradeEntries, sek1GradebookComments} from '../lib/sek1StudentData';
import {faecherFuerKlasse} from '../lib/sek1Subjects';
import {erstelleLehrerstundenplan} from '../lib/teacherTimetable';

const TEMPLATES = [
  {id:'liste', label:'Klassenliste', desc:'Namen der ausgewählten Klasse', category:'Klasse', icon:Users},
  {id:'anwesenheit', label:'Anwesenheit', desc:'Fehlstunden & Absenzen der Klasse', category:'Klasse', icon:CheckCircle2},
  {id:'noten', label:'Notenübersicht', desc:'Dokumentierte rechnerische Fachwerte', category:'Leistung', icon:ClipboardList},
  {id:'wochenplanung', label:'Wochenplanung', desc:'Meine Fächer, Themen und Materialien', category:'Planung', icon:CalendarDays},
  {id:'lehrerstundenplan', label:'Lehrerstundenplan', desc:'Eigene Fachstunden über mehrere Klassen', category:'Planung', icon:CalendarDays},
  {id:'klassenbuch', label:'Unterrichtsnachweis', desc:'Klassenbuch-Auszug aus dokumentierten Fachstunden', category:'Planung', icon:BookOpen},
  {id:'dossier', label:'Kurzes Schülerdossier', desc:'Notizen, Verhalten, Fachwerte und Fehlstunden', category:'Schüler:innen', icon:FileText},
  {id:'sitzplan', label:'Sitzplan-Zuordnung', desc:'Gespeicherte Sitzplätze der ausgewählten Klasse', category:'Klasse', icon:Users},
] as const;
type TemplateId = typeof TEMPLATES[number]['id'];

/**
 * Eigenständiges Sek-I-Druckzentrum. Keine VS-Förder-, KEL-, Kinderwochenplan-
 * oder Kassen-Vorlagen. Ausdruck ist eine Ansicht aktueller Klassendaten,
 * niemals eine neue Kopie/Änderung der Datensätze.
 */
export default function Sek1PrintCenter() {
  const {app} = useApp();
  const [template,setTemplate] = useState<TemplateId>('liste');
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('Alle');
  const [semester,setSemester] = useState<'1'|'2'>('1');
  const [kw,setKw] = useState(() => app.currentKW || getKW(new Date()));
  const [studentId,setStudentId] = useState(() => app.schueler[0]?.id || '');
  const [includeMaterials,setIncludeMaterials] = useState(true);
  React.useEffect(() => {setTemplate('liste');setQuery('');setCategory('Alle');setStudentId(app.schueler[0]?.id || '');},[app.activeClassId]);
  const subjects = faecherFuerKlasse(app);
  const students = useMemo(() => [...(app.schueler || [])].sort((a,b) => a.nachname.localeCompare(b.nachname,'de-AT') || a.vorname.localeCompare(b.vorname,'de-AT')),[app.schueler]);
  const timetable = useMemo(() => erstelleLehrerstundenplan(app), [app]);
  const templateDef = TEMPLATES.find(t => t.id === template)!;
  const filtered = TEMPLATES.filter(t => (category === 'Alle'||t.category===category) && `${t.label} ${t.desc}`.toLocaleLowerCase('de-AT').includes(query.toLocaleLowerCase('de-AT')));
  const lessons = useMemo(() => TAGE_NAMEN.flatMap(tag => {
    const day = app.wochenplanung?.[kw]?.[tag] || {};
    const plan = app.stammplan?.[tag] || {};
    return LESSON_SLOT_NUMBERS.flatMap(stunde => {
      const item = day[stunde - 1] || {};
      const fach = String(item.fach || plan[stunde] || '').trim();
      if (!subjects.includes(fach)) return [];
      const thema = String(item.thema || '').trim();
      const material = String(item.material || '').trim();
      const housework = String(item.housework || item.hue || '').trim();
      if (!thema && !material && !housework) return [];
      return [{id:`${tag}-${stunde}`,tag,stunde,fach,thema,material,housework}];
    });
  }),[app.wochenplanung,app.stammplan,kw,subjects.join('\u0000')]);
  const currentStudent = students.find(s=>s.id===studentId);
  const studentGrades = currentStudent ? sek1GradeEntries(app,currentStudent.id,semester) : null;
  const studentAttendance = currentStudent ? getStudentAttendanceSummary(app,currentStudent.id) : null;
  const studentBehavior = currentStudent ? getStudentBehaviorSummary(app,currentStudent.id) : null;
  const studentNotes = currentStudent ? getStudentNotes(app,currentStudent.id) : [];
  const seatAssignments = Object.entries(app.sitzplan_schueler || {})
    .flatMap(([id,coordinate]) => {const student=students.find(s=>s.id===id);return student && coordinate ? [{student,coordinate}]:[];})
    .sort((a,b)=>a.coordinate.y-b.coordinate.y||a.coordinate.x-b.coordinate.x);
  const print = () => window.print();
  return <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
    <style>{`@media print {
      @page { size: A4 portrait; margin: 12mm; }
      body * { visibility: hidden !important; }
      #sek1-print-content, #sek1-print-content * { visibility: visible !important; }
      #sek1-print-content { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; color: #111 !important; background: white !important; }
      #sek1-print-content table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
      #sek1-print-content th, #sek1-print-content td { border: 1px solid #aaa !important; padding: 5pt !important; }
      #sek1-print-content tr { break-inside: avoid; }
      #sek1-print-content h2 { margin-top: 14pt !important; }
      #sek1-print-content .no-print { display: none !important; }
    }`}</style>
    <header className="print:hidden"><p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Klasse {app.klassenbezeichnung}</p><h1 className="mt-1 text-2xl font-black text-[var(--text)]">Druckzentrum · Unterstufe</h1>
      <p className="mt-2 text-sm text-[var(--text2)]">Ausgewählte Unterrichts- und Klassendaten drucken. „Als PDF speichern“ findest du im Druckdialog deines Browsers.</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] print:block">
      <section className="space-y-4 print:hidden">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><Search size={17} className="text-[var(--text2)]"/><input type="search" aria-label="Druckvorlagen suchen" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Dokument suchen …" className="w-full bg-transparent text-sm text-[var(--text)] outline-none"/></div>
        <div className="flex flex-wrap gap-2">{['Alle','Klasse','Schüler:innen','Leistung','Planung'].map(cat=><button type="button" key={cat} aria-pressed={category===cat} onClick={()=>setCategory(cat)} className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${category===cat?'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]':'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'}`}>{cat}</button>)}</div>
        <div className="grid gap-2 sm:grid-cols-2">{filtered.map(t => <button type="button" key={t.id} aria-pressed={template===t.id} onClick={()=>setTemplate(t.id)} className={`rounded-2xl border p-4 text-left ${template===t.id?'border-[var(--accent)] bg-[var(--accent-soft)]':'border-[var(--border)] bg-[var(--surface)]'}`}><t.icon size={19} className="text-[var(--accent)]"/><span className="mt-2 block text-sm font-black text-[var(--text)]">{t.label}</span><span className="mt-1 block text-xs text-[var(--text2)]">{t.desc}</span></button>)}</div>
        {template==='dossier' && <label className="block text-sm font-semibold text-[var(--text)]">Schüler:in<select value={studentId} onChange={e=>setStudentId(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">{students.map(s=><option key={s.id} value={s.id}>{s.nachname}, {s.vorname}</option>)}</select></label>}
        {(template==='noten'||template==='dossier') && <label className="block text-sm font-semibold text-[var(--text)]">Semester<select value={semester} onChange={e=>setSemester(e.target.value as '1'|'2')} className="ml-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><option value="1">1. Semester</option><option value="2">2. Semester</option></select></label>}
        {(template==='wochenplanung'||template==='klassenbuch') && <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text)]"><label htmlFor="sek1-print-week">Kalenderwoche</label><input id="sek1-print-week" type="number" min="1" max="53" value={kw} onChange={e=>setKw(Math.max(1,Math.min(53,Number(e.target.value)||1)))} className="w-20 rounded-xl border border-[var(--border)] p-2"/><label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeMaterials} onChange={e=>setIncludeMaterials(e.target.checked)}/> Materialien & Hausübungen</label></div>}
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Ausdrucke mit Schülernamen, Notizen und Absenzen vertraulich behandeln. Dieser Unterrichtsnachweis ist ein Auszug aus deinen Einträgen, kein amtlich geprüftes Klassenbuch.</p>
        <button type="button" onClick={print} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-bold text-white"><Printer size={18}/> Drucken / als PDF speichern</button>
      </section>
      <article id="sek1-print-content" className="min-w-0 rounded-2xl border border-[var(--border)] bg-white p-5 text-slate-900 shadow-sm print:rounded-none print:p-0">
        <header className="border-b border-slate-300 pb-3"><p className="text-xs uppercase tracking-wider text-slate-600">KLASSIO · Unterstufe · Schuljahr {app.schuljahr}</p><h2 className="mt-1 text-xl font-black">{templateDef.label}</h2><p className="mt-1 text-sm">Klasse {app.klassenbezeichnung} · {app.stufe}. Schulstufe{['wochenplanung','klassenbuch'].includes(template) ? ` · KW ${kw}` : ''}</p></header>
        {(template==='liste'||template==='anwesenheit'||template==='noten') && <table className="mt-4 w-full border-collapse text-left text-sm"><thead><tr><th className="border border-slate-300 p-2">Schüler:in</th>{template==='liste'?<th className="border border-slate-300 p-2">Nr.</th>:template==='anwesenheit'?<><th className="border border-slate-300 p-2">Entschuldigt (Std.)</th><th className="border border-slate-300 p-2">Unentschuldigt (Std.)</th></>:<>{subjects.map(f=><th key={f} className="border border-slate-300 p-2">{f}</th>)}</>}</tr></thead><tbody>{students.map((s,i)=>{const absence=getStudentAttendanceSummary(app,s.id);const grades=sek1GradeEntries(app,s.id,semester);return <tr key={s.id}><td className="border border-slate-300 p-2">{s.nachname}, {s.vorname}</td>{template==='liste'?<td className="border border-slate-300 p-2">{i+1}</td>:template==='anwesenheit'?<><td className="border border-slate-300 p-2">{absence.excused}</td><td className="border border-slate-300 p-2">{absence.unexcused}</td></>:subjects.map(f=><td key={f} className="border border-slate-300 p-2">{grades.find(g=>g.fach===f)?.wert||'–'}</td>)}</tr>;})}</tbody></table>}
        {template==='noten' && <p className="mt-3 text-xs text-slate-600">Direkt eingetragene oder rechnerische Werte aus der Notenmappe, {semester}. Semester – keine amtliche Zeugnisnote oder Zuordnung zu Mittelschul-Leistungsniveaus.</p>}
        {(template==='wochenplanung'||template==='klassenbuch') && <div className="mt-4 space-y-3">{lessons.length? TAGE_NAMEN.map(tag=>{const items=lessons.filter(e=>e.tag===tag);return items.length?<section key={tag}><h3 className="border-b border-slate-300 py-1 font-bold">{tag}</h3><table className="w-full border-collapse text-left text-sm"><thead><tr><th className="border border-slate-300 p-2">Stunde</th><th className="border border-slate-300 p-2">Fach</th><th className="border border-slate-300 p-2">Thema / Unterricht</th>{includeMaterials && <th className="border border-slate-300 p-2">Material / Hausübung</th>}</tr></thead><tbody>{items.map(item=><tr key={item.id}><td className="border border-slate-300 p-2">{item.stunde}.</td><td className="border border-slate-300 p-2">{item.fach}</td><td className="border border-slate-300 p-2">{item.thema||'–'}</td>{includeMaterials && <td className="border border-slate-300 p-2">{[item.material,item.housework].filter(Boolean).join(' · ')||'–'}</td>}</tr>)}</tbody></table></section>:null;}):<p className="text-sm text-slate-600">Für diese Kalenderwoche sind noch keine Unterrichtsinhalte dokumentiert.</p>}
          {template==='klassenbuch' && Object.keys(app.klassenbuchErgaenzungen?.[kw]||{}).length>0 && <section><h3 className="mt-4 font-bold">Ergänzende Unterrichtsnotizen</h3>{Object.entries(app.klassenbuchErgaenzungen?.[kw]||{}).map(([key,value])=><p key={key} className="mt-2 whitespace-pre-wrap text-sm"><strong>{key}:</strong> {String(value)}</p>)}</section>}
          {template==='klassenbuch' && <p className="mt-4 text-xs text-slate-600">Dieser Ausdruck enthält nur tatsächlich gespeicherte Themen/Materialien aus der Planung und ergänzende Einträge der ausgewählten Klasse. Er bestätigt nicht, dass eine Einheit tatsächlich gehalten wurde.</p>}</div>}
        {template==='lehrerstundenplan' && <table className="mt-4 w-full border-collapse text-left text-sm"><thead><tr><th className="border border-slate-300 p-2">Std.</th>{timetable.tage.map(tag=><th key={tag} className="border border-slate-300 p-2">{tag}</th>)}</tr></thead><tbody>{timetable.stunden.filter(stunde=>timetable.zeilen.some(e=>e.stunde===stunde)).map(stunde=><tr key={stunde}><th className="border border-slate-300 p-2">{stunde}.</th>{timetable.tage.map(tag=><td key={tag} className="border border-slate-300 p-2">{timetable.zeilen.filter(e=>e.tag===tag&&e.stunde===stunde).map(e=><div key={e.klasseId}>{e.klasse} · {e.fach}</div>)}</td>)}</tr>)}</tbody></table>}
        {template==='lehrerstundenplan' && timetable.konflikte.length>0 && <p className="mt-3 text-sm font-semibold text-amber-800">Achtung: {timetable.konflikte.length} zeitliche Überschneidung(en) im Lehrerstundenplan.</p>}
        {template==='sitzplan' && <div className="mt-4">{seatAssignments.length?<table className="w-full border-collapse text-left text-sm"><thead><tr><th className="border border-slate-300 p-2">Schüler:in</th><th className="border border-slate-300 p-2">Sitzplatz / Position</th></tr></thead><tbody>{seatAssignments.map(({student,coordinate},i)=><tr key={student.id}><td className="border border-slate-300 p-2">{student.nachname}, {student.vorname}</td><td className="border border-slate-300 p-2">{i+1} · ({Math.round(coordinate.x)}, {Math.round(coordinate.y)})</td></tr>)}</tbody></table>:<p className="text-sm text-slate-600">Noch kein Sitzplan für diese Klasse gespeichert.</p>}<p className="mt-3 text-xs text-slate-600">Zuordnung der gespeicherten Schülerpositionen. Öffne den Sitzplan für die grafische Ansicht.</p></div>}
        {template==='dossier' && <div className="mt-4 space-y-4">{currentStudent?<>
          <h3 className="text-lg font-bold">{currentStudent.vorname} {currentStudent.nachname}</h3>
          {currentStudent.notiz?.trim() && <p className="text-sm"><strong>Hinweis:</strong> {currentStudent.notiz}</p>}
          <section><h4 className="font-bold">Notizen & Verhalten</h4>{app.behavior_notes?.[currentStudent.id] && <p className="mt-1 text-sm">{app.behavior_notes[currentStudent.id]}</p>}{studentBehavior?.hasData && <p className="mt-1 text-sm">Verhalten: {studentBehavior.stage?.label||'–'}</p>}
            {studentNotes.length?<ul className="mt-2 space-y-1">{studentNotes.map((n:any,i:number)=><li key={n.id||i} className="text-sm">{n.datum||''} · {n.kategorie||'Notiz'}: {n.inhalt||n.text||n.titel||''}</li>)}</ul>:<p className="mt-1 text-sm">Keine weiteren Notizen.</p>}</section>
          <section><h4 className="font-bold">Bewertungen · {semester}. Semester</h4>{studentGrades?.length?<ul>{studentGrades.map(g=><li key={g.fach} className="text-sm">{g.fach}: {g.wert} ({g.quelle==='direkt_eingetragen'?'direkt erfasst':'rechnerisch'})</li>)}</ul>:<p className="text-sm">Keine Bewertungen vorhanden.</p>}
            {sek1GradebookComments(app,currentStudent.id).map(comment=><p key={`${comment.fach}-${comment.semester}`} className="mt-1 text-sm">{comment.fach}, {comment.semester}. Sem.: {comment.text}</p>)}</section>
          <section><h4 className="font-bold">Anwesenheit</h4><p className="text-sm">{studentAttendance?.total||0} Fehlstunden ({studentAttendance?.excused||0} entschuldigt, {studentAttendance?.unexcused||0} unentschuldigt)</p></section>
        </>:<p className="text-sm text-slate-600">Bitte eine Person auswählen.</p>}</div>}
        {students.length===0 && ['liste','anwesenheit','noten'].includes(template) && <p className="mt-3 text-sm text-slate-600">Noch keine Schüler:innen in dieser Klasse.</p>}
        <footer className="mt-6 border-t border-slate-300 pt-2 text-xs text-slate-500">Klasse {app.klassenbezeichnung} · Auszug aus KLASSIO · {new Date().toLocaleDateString('de-AT')}</footer>
      </article>
    </div>
  </main>;
}
