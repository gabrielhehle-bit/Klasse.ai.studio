import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UNIFIED_DEFAULT_BADGES } from '../types';
import { Trash2, Plus, Star, Award, Search, Hash, Clock, Calendar, AlertCircle, BookOpen, Check, RefreshCw, Import, CheckCircle2, X } from 'lucide-react';
import { getKW, getStartYear } from '../lib/utils';

export default function StudentStatsEditor({ 
  schuelerId, 
  onStartPresentation 
}: { 
  schuelerId: string; 
  onStartPresentation?: () => void; 
}) {
  const { app, setApp } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  const studentLogs = (app.statusLog || []).filter(l => l.schuelerId === schuelerId).sort((a,b) => b.timestamp - a.timestamp);
  
  const [newBadge, setNewBadge] = useState({ name: '', icon: '🌟' });
  const [badgeSearch, setBadgeSearch] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showBadgeManager, setShowBadgeManager] = useState(false);

  // Manual missed content form states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualFach, setManualFach] = useState('Deutsch');
  const [manualThema, setManualThema] = useState('');
  const [manualStunde, setManualStunde] = useState(0);

  if (!student) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: crypto.randomUUID(),
      titel: 'Schnelle Notiz',
      inhalt: newNote.trim(),
      icon: '📝',
      timestamp: Date.now(),
      schuelerId: student.id
    };
    setApp((prev: any) => ({
      ...prev,
      notizen: [note, ...(prev.notizen || [])]
    }));
    setNewNote('');
  };

  const deleteLog = (logId: string) => {
    if(confirm('Möchten Sie diesen Verhaltens-Eintrag wirklich löschen? Der Streak wird dadurch neu berechnet.')) {
      setApp(prev => ({
        ...prev,
        statusLog: (prev.statusLog || []).filter(l => l.id !== logId)
      }));
    }
  };

  const deleteBadge = (badgeId: string) => {
    if(confirm('Möchten Sie dieses Abzeichen wirklich entfernen?')) {
      setApp(prev => ({
        ...prev,
        schueler: prev.schueler.map(s => 
          s.id === schuelerId 
            ? { ...s, badges: (s.badges || []).filter(b => b.id !== badgeId) } 
            : s
        )
      }));
    }
  };

  const addBadge = (bName: string, bIcon: string) => {
    const freshId = Date.now().toString() + Math.random().toString(36).substring(2,5);
    setApp(prev => {
      // Avoid duplicate logic simplified
      let cBadges = prev.custom_badges || [];
      if(!prev.custom_badges?.find(x => x.name === bName)) {
         cBadges = [...cBadges, { name: bName, icon: bIcon }];
      }
      return {
        ...prev,
        custom_badges: cBadges,
        schueler: prev.schueler.map(s => 
          s.id === schuelerId 
            ? { ...s, badges: [...(s.badges || []), { id: freshId, name: bName, icon: bIcon, date: new Date().toISOString() }] }
            : s
        )
      };
    });
    setNewBadge({ name: '', icon: '🌟' });
  };

  const stages = app.behavior_stages || [
    { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
    { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
    { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
    { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
    { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
  ];

  const templateBadges = [
    ...UNIFIED_DEFAULT_BADGES,
    ...(app.custom_badges || [])
  ];

  const filteredTemplateBadges = templateBadges.filter(b => b.name.toLowerCase().includes(badgeSearch.toLowerCase()));

  // Get all absence dates for this student
  const studentAttendance = app.anwesenheit?.[schuelerId] || {};
  const hasAttendanceData = Object.keys(studentAttendance).length > 0;
  const absentDates = Object.entries(studentAttendance).filter(([_, hours]) => {
    return Object.values(hours).some(status => status === 'e' || status === 'u');
  }).map(([dateStr, hours]) => {
    const statusList = Object.values(hours);
    const isExcused = statusList.some(st => st === 'e');
    return {
      dateStr,
      status: isExcused ? 'e' : 'u',
      hours
    };
  }).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Find lessons in wochenplanung on absent dates that aren't yet in verpassteInhalte
  const getMissedWochenplanLessons = () => {
    const lessons: any[] = [];
    const existingMissed = app.verpassteInhalte || [];
    
    absentDates.forEach(({ dateStr }) => {
      const date = new Date(dateStr);
      const kw = getKW(date);
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const tag = days[date.getDay()];
      
      const kwPlan = app.wochenplanung?.[kw] || {};
      const dayPlan = kwPlan[tag] || {};
      
      Object.entries(dayPlan).forEach(([idxStr, cell]: [string, any]) => {
        const idx = parseInt(idxStr);
        if (cell && cell.fach && cell.thema) {
          const alreadyAdded = existingMissed.some((item: any) => 
            item.schuelerId === schuelerId && 
            item.date === dateStr && 
            item.stunde === idx
          );
          
          if (!alreadyAdded) {
            lessons.push({
              kw,
              tag,
              date: dateStr,
              fach: cell.fach,
              thema: cell.thema,
              stunde: idx,
              type: cell.type || 'standard'
            });
          }
        }
      });
    });
    
    return lessons;
  };

  const missedWochenplanLessons = getMissedWochenplanLessons();

  const handleImportLesson = (lesson: any) => {
    const newItem = {
      id: crypto.randomUUID(),
      schuelerId,
      kw: lesson.kw,
      tag: lesson.tag,
      date: lesson.date,
      fach: lesson.fach,
      thema: lesson.thema,
      stunde: lesson.stunde,
      status: 'offen' as const,
      timestamp: Date.now()
    };
    
    setApp((prev: any) => ({
      ...prev,
      verpassteInhalte: [...(prev.verpassteInhalte || []), newItem]
    }));
  };

  const handleImportAllLessons = () => {
    if (missedWochenplanLessons.length === 0) return;
    const newItems = missedWochenplanLessons.map(lesson => ({
      id: crypto.randomUUID(),
      schuelerId,
      kw: lesson.kw,
      tag: lesson.tag,
      date: lesson.date,
      fach: lesson.fach,
      thema: lesson.thema,
      stunde: lesson.stunde,
      status: 'offen' as const,
      timestamp: Date.now()
    }));
    
    setApp((prev: any) => ({
      ...prev,
      verpassteInhalte: [...(prev.verpassteInhalte || []), ...newItems]
    }));
  };

  const handleAddManualMissed = () => {
    if (!manualThema.trim()) return;
    const dateObj = new Date(manualDate);
    const kw = getKW(dateObj);
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const tag = days[dateObj.getDay()];

    const newItem = {
      id: crypto.randomUUID(),
      schuelerId,
      kw,
      tag,
      date: manualDate,
      fach: manualFach,
      thema: manualThema.trim(),
      stunde: manualStunde,
      status: 'offen' as const,
      timestamp: Date.now()
    };

    setApp((prev: any) => ({
      ...prev,
      verpassteInhalte: [...(prev.verpassteInhalte || []), newItem]
    }));

    setManualThema('');
    setShowManualForm(false);
  };

  const handleToggleStatus = (id: string) => {
    setApp((prev: any) => ({
      ...prev,
      verpassteInhalte: (prev.verpassteInhalte || []).map((item: any) => {
        if (item.id === id) {
          return { ...item, status: item.status === 'offen' ? 'nachgeholt' : 'offen' };
        }
        return item;
      })
    }));
  };

  const handleDeleteMissedItem = (id: string) => {
    if (confirm('Eintrag wirklich löschen?')) {
      setApp((prev: any) => ({
        ...prev,
        verpassteInhalte: (prev.verpassteInhalte || []).filter((item: any) => item.id !== id)
      }));
    }
  };

  const getFachColor = (fach: string) => {
    const f = fach.toLowerCase();
    if (f.startsWith('deutsch')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (f.startsWith('mathe')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (f.startsWith('sach')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (f.startsWith('engl')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (f.startsWith('sport') || f === 'bsp') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (f.startsWith('werk')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (f.startsWith('mus')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (f.startsWith('zeich') || f.startsWith('bild')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const missedItems = (app.verpassteInhalte || []).filter((item: any) => item.schuelerId === schuelerId);
  const studentNotes = (app.notizen || []).filter((item: any) => item.schuelerId === schuelerId);
  const timelineCount = studentLogs.length + studentNotes.length + (student.badges?.length || 0);
  const latestTimelineTimestamp = Math.max(
    0,
    ...studentLogs.map(item => Number(item.timestamp || 0)),
    ...studentNotes.map((item: any) => new Date(item.datum || item.timestamp || 0).getTime()),
    ...(student.badges || []).map(item => new Date(item.date || 0).getTime())
  );
  const openMissedCount = missedItems.filter((item: any) => item.status === 'offen').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Beobachtungen', value: studentLogs.length + studentNotes.length, helper: 'Chronik-Einträge' },
          { label: 'Abzeichen', value: student.badges?.length || 0, helper: 'dokumentierte Stärken' },
          { label: 'Fehltage', value: hasAttendanceData ? absentDates.length : '–', helper: hasAttendanceData ? 'aus Anwesenheit' : 'noch nicht erfasst' },
          { label: 'Nachzuholen', value: openMissedCount, helper: openMissedCount === 1 ? 'offener Lerninhalt' : 'offene Lerninhalte' }
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{card.value}</div>
            <div className="mt-1 text-[0.65rem] font-bold text-slate-500">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
      
      {/* BADGES */}
      <div className="order-2 bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3">
                <Award className="text-amber-500" /> Stärken & Abzeichen
              </h3>
              <p className="mt-1 text-[0.75rem] font-medium text-slate-500">
                Sichtbare Anerkennungen aus tatsächlich beobachteten Situationen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBadgeManager(value => !value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
            >
              {showBadgeManager ? 'Verwaltung schließen' : 'Abzeichen verwalten'}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400">Aktuelle Abzeichen ({student.badges?.length || 0})</h3>
            {student.badges && student.badges.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {student.badges.map(b => (
                  <div key={b.id} className="group relative pr-8 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-[0.75rem] leading-tight flex items-center gap-2">
                    <span>{b.icon}</span>
                    <span>{b.name}</span>
                    <button 
                      onClick={() => deleteBadge(b.id)}
                      className="absolute right-1 top-1 bottom-1 w-6 flex items-center justify-center rounded-lg bg-amber-200/50 hover:bg-red-100 hover:text-red-600 text-amber-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[0.875rem] leading-snug font-medium text-slate-400 italic">Noch keine Abzeichen vergeben.</div>
            )}
          </div>

          {showBadgeManager && (
          <div className="space-y-3 pt-6 border-t border-slate-100">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400">Neues Abzeichen erstellen</h3>
            <div className="flex gap-2">
              <input 
                className="w-16 h-10 px-0 text-center bg-slate-50 border border-slate-200 rounded-xl text-[1.125rem] leading-normal disabled:opacity-50"
                value={newBadge.icon}
                onChange={e => setNewBadge({...newBadge, icon: e.target.value})}
                placeholder="🌟"
                maxLength={2}
              />
              <input 
                className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-emerald-500/20"
                value={newBadge.name}
                onChange={e => setNewBadge({...newBadge, name: e.target.value})}
                placeholder="Name des Abzeichens (z.B. Lese-Profi)"
              />
              <button 
                disabled={!newBadge.name}
                onClick={() => addBadge(newBadge.name, newBadge.icon)}
                className="px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl flex items-center justify-center font-black disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          )}
        </div>

        {showBadgeManager && templateBadges.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-slate-100">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400">Aus Vorlage wählen</h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-medium"
                value={badgeSearch}
                onChange={e => setBadgeSearch(e.target.value)}
                placeholder="Abzeichen suchen..."
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-[380px] overflow-y-auto pt-2 pr-1 custom-scrollbar">
              {filteredTemplateBadges.map(b => (
                 <button 
                   key={b.name}
                   onClick={() => addBadge(b.name, b.icon)}
                   className="bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                 >
                   <span>{b.icon}</span>
                   <span>{b.name}</span>
                 </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VERHALTENS-LOGS & STREAKS */}
      <div className="order-1 bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 flex flex-col max-h-[700px]">
        <div className="shrink-0 space-y-2 mb-2">
          <h2 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3">
            <Star className="text-indigo-500" /> Beobachtungs-Chronik
          </h2>
          <p className="text-[0.875rem] leading-snug font-medium text-slate-500">
            Pädagogische Beobachtungen, Rückmeldungen und Abzeichen in zeitlicher Reihenfolge.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
           <input 
              type="text" 
              placeholder="Schnelle Textnotiz / Beobachtung..." 
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 text-slate-700"
           />
           <button 
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 font-black px-5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
           >
              Hinzufügen
           </button>
        </div>

        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
          <div>
            <div className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">Gesamt Logs</div>
            <div className="text-[1.25rem] leading-normal font-black text-slate-800">{timelineCount}</div>
          </div>
          <div>
            <div className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest text-right">letzter Eintrag</div>
            <div className="text-[0.875rem] leading-snug font-bold text-slate-600 tabular-nums">
              {latestTimelineTimestamp > 0 ? new Date(latestTimelineTimestamp).toLocaleDateString('de-DE') : '—'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-slate-100">
          {(() => {
             // Combine Behavioral Logs
             const combinedTimeline: any[] = studentLogs.map(l => ({ ...l, type: 'behavior' }));
             
             // Combine Notes
             const notes = (app.notizen || []).filter((n: any) => n.schuelerId === schuelerId);
             notes.forEach((n: any) => {
               combinedTimeline.push({ ...n, type: 'note' });
             });

             // Combine Badges
             if (student.badges) {
               student.badges.forEach(b => {
                 combinedTimeline.push({ 
                   id: b.id, 
                   timestamp: b.date ? new Date(b.date).getTime() : Date.now(), 
                   type: 'badge',
                   icon: b.icon,
                   name: b.name
                 });
               });
             }

             combinedTimeline.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

             if (combinedTimeline.length === 0) {
               return (
                 <div className="text-center py-12 px-6 relative z-10 bg-white">
                    <Hash size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-[0.875rem] leading-snug font-bold text-slate-400">Keine Einträge vorhanden.</p>
                 </div>
               );
             }

             return combinedTimeline.map(item => {
               if (item.type === 'behavior') {
                 const stage = stages.find(s => s.id === item.iconId) || stages[0];
                 return (
                  <div key={item.id} className="relative z-10 flex items-center gap-4 p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-colors group shadow-sm ml-8 before:absolute before:top-1/2 before:-left-8 before:w-8 before:h-px before:bg-slate-100">
                    <div className="absolute top-1/2 -left-[36.5px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[1.125rem] leading-normal border"
                      style={{ backgroundColor: `${stage.color}15`, borderColor: `${stage.color}30`, color: stage.color }}
                    >
                      {stage.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.875rem] leading-snug font-bold text-slate-700 text-wrap leading-tight break-words">{stage.label} <span className="font-medium text-slate-400 text-[0.75rem] leading-tight ml-1">Verhaltensprotokoll</span></div>
                      <div className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> 
                        {new Date(item.timestamp).toLocaleDateString('de-DE')} 
                        <span className="opacity-50 mx-0.5">•</span> 
                        {new Date(item.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteLog(item.id)}
                      className="w-9 h-9 flex justify-center items-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Eintrag löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                 );
               }
               
               if (item.type === 'note') {
                 return (
                  <div key={item.id} className="relative z-10 flex items-center gap-4 p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-colors group shadow-sm ml-8 before:absolute before:top-1/2 before:-left-8 before:w-8 before:h-px before:bg-slate-100">
                    <div className="absolute top-1/2 -left-[36.5px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[1.125rem] leading-normal border bg-amber-50 border-amber-100 text-amber-600">
                      📝
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.875rem] leading-snug font-bold text-slate-700 break-words">{item.titel}: <span className="font-normal text-slate-500">{item.inhalt}</span></div>
                      <div className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> 
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString('de-DE') : '—'} 
                      </div>
                    </div>
                    <button 
                       onClick={() => {
                          if(confirm('Notiz wirklich löschen?')) {
                             setApp(prev => ({
                                ...prev,
                                notizen: (prev.notizen || []).filter((n: any) => n.id !== item.id)
                             }));
                          }
                       }}
                      className="w-9 h-9 flex justify-center items-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Eintrag löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                 )
               }
               
               if (item.type === 'badge') {
                 return (
                  <div key={item.id} className="relative z-10 flex items-center gap-4 p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-colors group shadow-sm ml-8 before:absolute before:top-1/2 before:-left-8 before:w-8 before:h-px before:bg-slate-100">
                    <div className="absolute top-1/2 -left-[36.5px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[1.125rem] leading-normal border bg-emerald-50 border-emerald-100 text-emerald-600">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.875rem] leading-snug font-bold text-slate-700 text-wrap leading-tight break-words">Abzeichen vergeben: <span className="font-black text-emerald-700">{item.name}</span></div>
                      <div className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> 
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString('de-DE') : '—'} 
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteBadge(item.id)}
                      className="w-9 h-9 flex justify-center items-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Abzeichen löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                 )
               }
             });
          })()}
        </div>
      </div>
    </div>

    {/* CARD 3: FEHLZEITEN & VERPASSTE LERNINHALTE */}
    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 flex items-center gap-3">
            <Calendar className="text-rose-500" /> Fehlzeiten & Verpasste Lerninhalte
          </h3>
          <p className="text-[0.875rem] leading-snug font-medium text-slate-500">
            Dokumentieren und verwalten Sie verpasste Unterrichtsthemen und kontrollieren Sie, ob diese nachgeholt wurden.
          </p>
        </div>
        <button 
          onClick={() => setShowManualForm(!showManualForm)}
          className="btn btn-accent shrink-0 flex items-center gap-2 self-start sm:self-auto animate-none"
        >
          {showManualForm ? <X size={16} /> : <Plus size={16} />}
          <span>{showManualForm ? 'Schließen' : 'Inhalt manuell erfassen'}</span>
        </button>
      </div>

      {/* Presence / Absence List */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
        <div className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest pl-1">Registrierte Fehltage</div>
        {absentDates.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {absentDates.map(({ dateStr, status }) => (
              <span key={dateStr} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.75rem] font-bold border ${status === 'e' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'e' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                {new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ({status === 'e' ? 'Entschuldigt' : 'Unentschuldigt'})
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-slate-400 font-medium italic pl-1">
            {hasAttendanceData
              ? 'In den erfassten Anwesenheitstagen ist keine Abwesenheit dokumentiert.'
              : 'Noch keine Anwesenheitstage erfasst. Daher ist keine Aussage zu Fehlzeiten möglich.'}
          </p>
        )}
      </div>

      {/* Manual entry form */}
      {showManualForm && (
        <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/80 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <h4 className="text-[0.875rem] font-black text-slate-800 uppercase tracking-wider">Verpassten Inhalt manuell hinzufügen</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">Datum</label>
              <input 
                type="date"
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.875rem] font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">Stunde (0 = Ganztägig)</label>
              <select 
                value={manualStunde}
                onChange={e => setManualStunde(parseInt(e.target.value))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.875rem] font-medium"
              >
                <option value={0}>Ganztägig</option>
                {[1, 2, 3, 4, 5, 6].map(h => (
                  <option key={h} value={h}>{h}. Stunde</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">Fach</label>
              <select 
                value={manualFach}
                onChange={e => setManualFach(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.875rem] font-medium"
              >
                <option value="Deutsch">Deutsch</option>
                <option value="Mathematik">Mathematik</option>
                <option value="Sachunterricht">Sachunterricht</option>
                <option value="Englisch">Englisch</option>
                <option value="Musik">Musik</option>
                <option value="Werken">Werken</option>
                <option value="Sport (BSP)">Sport (BSP)</option>
                <option value="Zeichnen">Zeichnen</option>
                <option value="Religion">Religion</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest block">Lerninhalt / Thema</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={manualThema}
                  onChange={e => setManualThema(e.target.value)}
                  placeholder="z.B. Einmaleins mit 7"
                  className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.875rem] font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <button 
                  onClick={handleAddManualMissed}
                  disabled={!manualThema.trim()}
                  className="h-10 px-4 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black text-[0.75rem] uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic suggestions block from Wochenplan */}
      {missedWochenplanLessons.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
              <Import size={20} />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[0.875rem] font-black text-slate-800 leading-tight">Verpasste Einheiten importieren</h4>
              <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed max-w-xl">
                Es wurden <strong>{missedWochenplanLessons.length}</strong> geplante Wochenplan-Einheiten während der Fehlzeiten von {student.vorname} gefunden, die noch nicht dokumentiert sind.
              </p>
            </div>
          </div>
          <button 
            onClick={handleImportAllLessons}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest shrink-0 shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} /> Alle {missedWochenplanLessons.length} importieren
          </button>
        </div>
      )}

      {/* Missed contents table */}
      <div className="space-y-3">
        <h4 className="text-[0.75rem] font-black text-slate-400 uppercase tracking-widest pl-1">Verpasste Lerninhalte ({missedItems.length})</h4>
        {missedItems.length > 0 ? (
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 bg-white">
              {missedItems.map((item: any) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="space-y-1 shrink-0 text-left sm:w-[130px]">
                      <div className="text-[0.75rem] font-bold text-slate-800">
                        {new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">
                        {item.tag} • {item.stunde === 0 ? 'Ganztägig' : `${item.stunde}. Stunde`}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 flex-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.625rem] font-black uppercase border tracking-widest ${getFachColor(item.fach)}`}>
                        {item.fach}
                      </span>
                      <div className="text-[0.875rem] font-bold text-slate-700 leading-tight">
                        {item.thema}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      className={`px-3 py-1.5 rounded-xl border font-black text-[0.6875rem] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer ${
                        item.status === 'nachgeholt'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                      title={item.status === 'nachgeholt' ? 'Als offen markieren' : 'Als nachgeholt markieren'}
                    >
                      {item.status === 'nachgeholt' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{item.status === 'nachgeholt' ? 'Nachgeholt' : 'Offen'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteMissedItem(item.id)}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-transparent hover:border-red-200 rounded-xl transition-all cursor-pointer"
                      title="Eintrag löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
            <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-[0.875rem] font-black text-slate-700">Noch keine verpassten Lerninhalte dokumentiert</p>
            <p className="text-[0.75rem] text-slate-400 font-medium max-w-md mx-auto mt-1">
              {!hasAttendanceData
                ? 'Da noch keine Anwesenheitstage erfasst wurden, kann nicht automatisch geprüft werden, ob Lerninhalte nachzuholen sind.'
                : absentDates.length === 0
                  ? 'In den erfassten Anwesenheitstagen liegt keine Abwesenheit vor. Es wird daraus keine zusätzliche Lernstands-Aussage abgeleitet.'
                  : 'Es gibt dokumentierte Fehltage, aber noch keine zugeordneten Lerninhalte. Prüfe die Vorschläge aus der Wochenplanung oder erfasse einen Inhalt manuell.'}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
