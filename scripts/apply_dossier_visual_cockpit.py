from pathlib import Path

repo = Path('.')
overview_path = repo / 'src/components/dossier/DossierUebersicht.tsx'
dossier_path = repo / 'src/components/StudentDossier.tsx'
test_path = repo / 'src/lib/dossierOverviewCompactRequirements.test.ts'

overview = overview_path.read_text()
overview = overview.replace(
    "import { berechne, getAssessmentMode } from '../../lib/GradeUtils';",
    "import { berechne, calculateItemPercent, getAssessmentMode, getMaxPoints } from '../../lib/GradeUtils';"
)
overview = overview.replace("  const classroomRowsWithData=classroomRows.filter(row=>row.participation.hasData||row.homework.tracked);\n", "")

anchor = "  const openSubject=(fach:string)=>onSubjectSelect?onSubjectSelect(fach):onTabChange('leistungen');\n"
if anchor not in overview:
    raise SystemExit('overview helper anchor missing')
helper = """  const openSubject=(fach:string)=>onSubjectSelect?onSubjectSelect(fach):onTabChange('leistungen');
  const totalParticipation=classroomRows.reduce((sum,row)=>sum+row.participation.total,0);
  const subjectCards=subjects.map(fach=>{
    const mode=getAssessmentMode(app,fach);
    const nd:any=app.noten?.[student.id]?.[fach]?.[semester]||{};
    const meta:any=app.notenMeta?.[fach]||{};
    const avg=berechne(app,student.id,fach,semester);
    const final=nd.endnote;
    const hasFinal=mode==='grades'&&final!==undefined&&final!==null&&String(final).trim()!==''&&String(final)!=='—';
    const display=hasFinal?String(final):avg===null?'Noch keine Bewertung':`${avg.toFixed(1).replace('.',',')}${mode==='percent'?' %':mode==='points'?' % · Punktebasis':''}`;
    const normalizedCurrent=avg===null?null:mode==='grades'?Math.max(0,Math.min(100,((5-avg)/4)*100)):Math.max(0,Math.min(100,avg));
    const assessments:{score:number;date:string;order:number}[]=[];
    let order=0;
    (['sa','lzk','wp','aufgaben'] as const).forEach(category=>{
      const list=Array.isArray(nd[category])?nd[category]:[];
      list.forEach((raw:any,idx:number)=>{
        if(raw===null||raw===undefined||raw===''||['e','f','x','-'].includes(String(raw).toLowerCase())){order++;return;}
        const primitive=typeof raw==='object'?(mode==='points'?(raw.score??raw.punkte??raw.grade):(mode==='percent'?(raw.percent??raw.grade):(raw.grade??raw.originalGrade??raw.numericGrade??raw.val??raw.note))):raw;
        const numeric=Number(String(primitive).replace(',','.'));
        if(!Number.isFinite(numeric)){order++;return;}
        let score:number|null=null;
        if(mode==='grades'&&numeric>=1&&numeric<=5) score=((5-numeric)/4)*100;
        else score=calculateItemPercent(numeric,mode,getMaxPoints(app,fach,category,idx));
        if(score!==null) assessments.push({score,date:String(meta.colDates?.[category]?.[idx]||''),order});
        order++;
      });
    });
    assessments.sort((a,b)=>a.date&&b.date?a.date.localeCompare(b.date):a.order-b.order);
    const trendValues=assessments.slice(-6).map(item=>item.score);
    const delta=trendValues.length>1?trendValues[trendValues.length-1]-trendValues[0]:null;
    const trendLabel=delta===null?'Noch kein Verlauf':delta>7?'↗ verbessert':delta<-7?'↘ rückläufig':'→ stabil';
    const classroom=classroomRows.find(row=>row.fach===fach)!;
    return {fach,mode,display,hasFinal,avg,normalizedCurrent,trendValues,trendLabel,assessmentCount:assessments.length,participation:classroom.participation,homework:classroom.homework};
  });
  const assessedSubjects=subjectCards.filter(card=>card.avg!==null||card.hasFinal).length;
"""
overview = overview.replace(anchor, helper)

start = overview.index('  return <div className="space-y-4" data-dossier-overview>')
end_marker = '    <section aria-label="Verhalten, Befinden & Anwesenheit" className="space-y-3">'
end = overview.index(end_marker, start)
new_top = r'''  return <div className="space-y-4" data-dossier-overview>
    <section data-dossier-cockpit aria-label="Schnellüberblick" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Auf einen Blick</p><h2 className="mt-0.5 text-lg font-black text-slate-900">{student.vorname} · aktueller Stand</h2></div>
        <span className="text-[0.68rem] font-semibold text-slate-500">Ganzes Schuljahr · Details per Klick</span>
      </div>
      <div aria-label="Kernüberblick" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-xl border border-indigo-100 bg-white p-3 text-left shadow-2xs transition hover:border-indigo-200 hover:shadow-sm"><span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-indigo-700"><BarChart3 size={14}/>Leistung</span><strong className="mt-2 block text-lg font-black text-slate-900">{assessedSubjects}/{subjects.length||0}</strong><span className="mt-0.5 block text-[0.65rem] text-slate-500">Fächer mit Bewertung</span></button>
        <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-xl border border-amber-100 bg-white p-3 text-left shadow-2xs transition hover:border-amber-200 hover:shadow-sm"><span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-amber-700"><Star size={14}/>Mitarbeit</span><strong className="mt-2 block text-lg font-black text-slate-900">{totalParticipation} ★</strong><span className="mt-0.5 block text-[0.65rem] text-slate-500">{participationSubjects}/{subjects.length||0} Fächer erfasst</span></button>
        <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-xl border border-violet-100 bg-white p-3 text-left shadow-2xs transition hover:border-violet-200 hover:shadow-sm"><span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-violet-700"><Activity size={14}/>Verhalten</span><strong className="mt-2 block truncate text-sm font-black text-slate-900">{latestStage?latestStage.icon+' '+latestStage.label:'Noch nicht erfasst'}</strong><span className="mt-0.5 block text-[0.65rem] text-slate-500">{stats.logs.length} Beobachtungen</span></button>
        <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-xl border border-teal-100 bg-white p-3 text-left shadow-2xs transition hover:border-teal-200 hover:shadow-sm"><span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-teal-700"><CalendarDays size={14}/>Anwesenheit</span><strong className="mt-2 block truncate text-sm font-black text-slate-900">{todayStatus}</strong><span className="mt-0.5 block text-[0.65rem] text-slate-500">{stats.excused+stats.unexcused} Fehlstunden im Zeitraum</span></button>
        <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-xl border border-rose-100 bg-white p-3 text-left shadow-2xs transition hover:border-rose-200 hover:shadow-sm"><span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-rose-700"><Smile size={14}/>Befinden</span><strong className="mt-2 block truncate text-sm font-black text-slate-900">{mood?mood.emoji+' '+mood.label:'Noch nicht erfasst'}</strong><span className="mt-0.5 block text-[0.65rem] text-slate-500">{stats.moodCount} Rückmeldungen</span></button>
      </div>
    </section>

    <section className={card} aria-label="Notenstand aller Fächer" data-dossier-subject-grid>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-base font-black text-slate-900"><BarChart3 size={18} className="text-indigo-600"/>Alle Fächer auf einen Blick</h2><p className="mt-1 text-xs text-slate-500">Mitarbeit & Hausübungen direkt in den Fachkarten · Fachsterne aus dem Unterrichtsmodus · {trackedHomeworkSubjects} Fächer mit HÜ-Daten</p></div>
        <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Alle Bewertungen <ArrowRight size={14} className="inline"/></button>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {subjectCards.map(cardData=>{
          const points=cardData.trendValues.length>1?cardData.trendValues.map((value,index,all)=>`${(index/(all.length-1))*100},${27-(Math.max(0,Math.min(100,value))*0.22)}`).join(' '):'';
          const homeworkText=!cardData.homework.tracked?'HÜ noch nicht erfasst':cardData.homework.missing===0?'HÜ ✓':`${cardData.homework.missing} fehlende HÜ`;
          return <button key={cardData.fach} type="button" onClick={()=>openSubject(cardData.fach)} className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{cardData.fach}</span><span className="mt-0.5 block text-[0.62rem] font-semibold text-slate-400">{cardData.mode==='grades'?'Noten 1–5':cardData.mode==='percent'?'Prozent':'Punkte + Prozent'}</span></div><div className="shrink-0 text-right"><strong className={`block text-base font-black ${cardData.avg===null&&!cardData.hasFinal?'text-slate-400':'text-indigo-700'}`}>{cardData.hasFinal?'Endnote ':cardData.mode==='grades'&&cardData.avg!==null?'Ø ':''}{cardData.display}</strong><span className="text-[0.62rem] font-semibold text-slate-500">{cardData.trendLabel}</span></div></div>
            <div className="mt-3 grid grid-cols-[1fr_5.5rem] items-center gap-3">
              <div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{width:`${cardData.normalizedCurrent??0}%`}}/></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-slate-600"><span>{cardData.assessmentCount} {cardData.assessmentCount===1?'Nachweis':'Nachweise'}</span><span>{cardData.participation.hasData?cardData.participation.total+' Fachsterne':'Mitarbeit noch nicht erfasst'}</span><span className={cardData.homework.tracked&&cardData.homework.missing>0?'font-bold text-rose-700':''}>{homeworkText}</span></div></div>
              <div data-subject-sparkline className="h-9 text-indigo-500">{points?<svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-label={`Verlauf ${cardData.fach}`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="100" cy={27-(Math.max(0,Math.min(100,cardData.trendValues[cardData.trendValues.length-1]))*0.22)} r="3" fill="currentColor"/></svg>:<div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-[0.58rem] font-semibold text-slate-400">Verlauf folgt</div>}</div>
            </div>
          </button>;
        })}
      </div>
      {!subjects.length&&<p className="text-sm text-slate-500">Noch keine Fächer ausgewählt.</p>}
    </section>
'''
overview = overview[:start] + new_top + overview[end:]
overview_path.write_text(overview)

# No stored photo in the dossier header: use initials consistently.
dossier = dossier_path.read_text()
old_avatar = """          {student.foto ? (
            <img src={student.foto} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover object-top ring-1 ring-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-200':'border-slate-200 bg-slate-100 text-slate-700'}`}>
              {student.vorname.charAt(0)}{student.nachname.charAt(0)}
            </div>
          )}
"""
new_avatar = """          <div aria-label="Initialen" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${app.dossierFocusMode?'border-slate-700 bg-slate-800 text-slate-200':'border-slate-200 bg-slate-100 text-slate-700'}`}>
            {student.vorname.charAt(0)}{student.nachname.charAt(0)}
          </div>
"""
if old_avatar not in dossier:
    raise SystemExit('student photo block missing')
dossier = dossier.replace(old_avatar, new_avatar)
dossier_path.write_text(dossier)

# Update requirements to reflect the visual cockpit and photo-free header.
test = test_path.read_text()
test = test.replace("  assert.match(dossier, /student\\.foto/);", "  assert.doesNotMatch(dossier, /student\\.foto/);\n  assert.match(dossier, /aria-label=\"Initialen\"/);")
insert_before = "test('Dossierübersicht: Mitarbeit und Hausübungen sind vor der Vertiefung direkt sichtbar', () => {"
new_test = """test('Dossierübersicht: visueller Schnellüberblick kommt vor den Fachkarten und nutzt keinen gemischten Gesamtnotenschnitt', () => {
  assert.match(overview, /data-dossier-cockpit/);
  assert.match(overview, /data-dossier-subject-grid/);
  assert.match(overview, /data-subject-sparkline/);
  assert.match(overview, />Leistung</);
  assert.match(overview, /Fächer mit Bewertung/);
  assert.match(overview, /Punkte \+ Prozent/);
  assert.ok(overview.indexOf('data-dossier-cockpit') < overview.indexOf('data-dossier-subject-grid'));
  assert.ok(overview.indexOf('data-dossier-subject-grid') < overview.indexOf('Verhalten, Befinden & Anwesenheit'));
});

"""
if insert_before not in test:
    raise SystemExit('test insert anchor missing')
test = test.replace(insert_before, new_test + insert_before)
test_path.write_text(test)

print('visual dossier cockpit patch applied')
