import React from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Heart, BarChart2, AlertCircle, StickyNote, Activity, Clock, X, TrendingUp, Brain, CheckSquare, BookOpen, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'kel' | 'foerderplan' | 'diagnostik' | 'abwesend' | 'notiz' | 'activity' | 'interaktion' | 'metakognition';
  title: string;
  icon: React.ReactNode;
  color: string;
}

export default function StudentTimeline({ studentId, onClose }: { studentId: string; onClose?: () => void }) {
  const { app, setApp } = useApp();

  const handleDelete = (ev: TimelineEvent) => {
    if (!confirm(`Eintrag "${ev.title}" wirklich löschen?`)) return;

    setApp(prev => {
      const updated = { ...prev };
      const idParts = ev.id.split('-');
      const id = idParts[1];

      if (ev.id.startsWith('diag-')) {
        updated.diagnostikErhebungen = (prev.diagnostikErhebungen || []).filter(d => d.id !== id);
      } else if (ev.id.startsWith('interaktion-')) {
        updated.interaktionsLog = {
          ...prev.interaktionsLog,
          eintraege: (prev.interaktionsLog?.eintraege || []).filter(e => e.id !== id)
        };
      } else if (ev.id.startsWith('note-')) {
        updated.notes = (prev.notes || []).filter(n => n.id !== id);
      } else if (ev.id.startsWith('journal-')) {
        updated.journal = (prev.journal || []).filter(j => j.id !== id);
      } else if (ev.id.startsWith('meta')) {
        updated.metaKognitionsProtokolle = (prev.metaKognitionsProtokolle || []).filter(p => p.id !== id);
      } else if (ev.id.startsWith('act-')) {
        updated.activityLog = (prev.activityLog || []).filter(a => a.id !== id);
      } else if (ev.id.startsWith('kel-')) {
        updated.kelGespraeche = (prev.kelGespraeche || []).filter(k => k.id !== id);
      }

      return updated;
    });
  };

  const events: TimelineEvent[] = [];

  // KEL
  if (Array.isArray(app?.kelGespraeche)) {
    app.kelGespraeche.filter(k => k.schuelerId === studentId).forEach(k => {
      events.push({
        id: `kel-${k.id}`,
        date: new Date(k.datum),
        type: 'kel',
        title: 'KEL-Gespräch',
        icon: <MessageSquare size={14} />,
        color: 'bg-blue-50 text-blue-600 border-blue-200'
      });
    });
  }

  // Förderplan (we collect notes matching student id from journal if no dedicated studentPlans field exists)
  // Or check activity log for foerderprofil
  const acts = Array.isArray(app?.activityLog) ? app.activityLog : [];
  acts.filter(a => a.entityId === studentId && a.entityType === 'foerderprofil').forEach(a => {
    events.push({
      id: `fp-${a.id}`,
      date: new Date(a.timestamp),
      type: 'foerderplan',
      title: 'Förderplan aktualisiert',
      icon: <Heart size={14} />,
      color: 'bg-green-50 text-green-600 border-green-200'
    });
  });

  // Diagnostik
  if (Array.isArray(app?.diagnostikErhebungen)) {
    app.diagnostikErhebungen.filter(d => d.schuelerId === studentId).forEach(d => {
      if (d.type === 'ipsativ') {
        const fach = d.meta?.fach || 'Allgemein';
        const trend = d.meta?.trend || 'stabil';
        const emoji = trend === 'steigend' ? '📈' : trend === 'fallend' ? '📉' : '➡️';
        events.push({
          id: `diag-${d.id}`,
          date: d.datum ? new Date(d.datum) : new Date(),
          type: 'diagnostik',
          title: `Lernentwicklung: ${fach} ${emoji}`,
          icon: <TrendingUp size={14} />,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
        });
      } else if (d.type === 'exekutiv') {
        const kontext = d.meta?.kontext || 'Allgemein';
        events.push({
          id: `diag-${d.id}`,
          date: d.datum ? new Date(d.datum) : new Date(),
          type: 'diagnostik',
          title: `Exekutive Funktionen: ${kontext}`,
          icon: <Brain size={14} />,
          color: 'bg-purple-50 text-purple-600 border-purple-200'
        });
      } else {
        const test = Array.isArray(app?.diagnostikTests) ? app.diagnostikTests.find(t => t.id === d.testId) : null;
        events.push({
          id: `diag-${d.id}`,
          date: d.datum ? new Date(d.datum) : new Date(),
          type: 'diagnostik',
          title: `Diagnostik: ${test?.name || 'Erhebung'}`,
          icon: <BarChart2 size={14} />,
          color: 'bg-purple-50 text-purple-600 border-purple-200'
        });
      }
    });
  }

  // Interaktionen
  if (app?.interaktionsLog?.eintraege) {
    app.interaktionsLog.eintraege.filter(e => e.schuelerId === studentId).forEach(e => {
       const is1to1 = e.war1zu1 ? ' (1:1)' : '';
       events.push({
         id: `interaktion-${e.id}`,
         date: new Date(e.datum),
         type: 'interaktion',
         title: `${e.typ.charAt(0).toUpperCase() + e.typ.slice(1)}: ${e.kontext}${is1to1}`,
         icon: <MessageSquare size={14} />,
         color: 'bg-blue-50 text-blue-600 border-blue-200'
       });
    });
  }

  // Metakognition
  if (app?.metaKognitionsProtokolle) {
     app.metaKognitionsProtokolle.filter(p => p.schuelerId === studentId && (p.vorPhase || p.nachPhase)).forEach(p => {
        if (p.vorPhase) {
           events.push({
             id: `meta1-${p.id}`,
             date: new Date(p.vorPhase.erfasstAm || p.pruefungsDatum),
             type: 'metakognition',
             title: `Prüfungsvorbereitung: ${p.pruefungsName} am ${new Date(p.pruefungsDatum).toLocaleDateString('de-DE')}`,
             icon: <BookOpen size={14} />,
             color: 'bg-violet-50 text-violet-600 border-violet-200'
           });
        }
        if (p.nachPhase) {
           const color = p.nachPhase.note <= 2 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                         p.nachPhase.note === 3 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                         'bg-rose-50 text-rose-600 border-rose-200';
           const wirksamStr = p.nachPhase.strategieWirksam ? 'wirksam' : p.nachPhase.strategieWirksam === false ? 'nicht wirksam' : 'teilweise';
           events.push({
             id: `meta2-${p.id}`,
             date: new Date(p.nachPhase.erfasstAm),
             type: 'metakognition',
             title: `Ergebnis (${p.pruefungsName}): Note ${p.nachPhase.note} · Strategien ${wirksamStr}`,
             icon: <CheckSquare size={14} />,
             color: color
           });
        }
     });
  }

  // Anwesenheit
  if (app?.anwesenheit?.[studentId]) {
    Object.entries(app.anwesenheit[studentId]).forEach(([dateStr, hours]) => {
      const isAbsent = Object.values(hours).some(v => v !== 'a' && v !== '');
      if (isAbsent) {
        events.push({
          id: `absent-${dateStr}`,
          date: new Date(dateStr),
          type: 'abwesend',
          title: 'Abwesend',
          icon: <AlertCircle size={14} />,
          color: 'bg-orange-50 text-orange-600 border-orange-200'
        });
      }
    });
  }

  // Verhaltensnotiz
  if (Array.isArray(app?.notes)) {
    app.notes.filter(n => n.schuelerId === studentId).forEach(n => {
      events.push({
        id: `note-${n.id}`,
        date: new Date(n.datum),
        type: 'notiz',
        title: 'Verhaltensnotiz',
        icon: <StickyNote size={14} />,
        color: 'bg-amber-50 text-amber-600 border-amber-200'
      });
    });
  }
  if (Array.isArray(app?.journal)) {
    app.journal.filter(n => n.schuelerId === studentId).forEach(n => {
      events.push({
        id: `journal-${n.id}`,
        date: new Date(n.datum),
        type: 'notiz',
        title: 'Journal Eintrag',
        icon: <StickyNote size={14} />,
        color: 'bg-amber-50 text-amber-600 border-amber-200'
      });
    });
  }

  // Activity Log 
  acts.filter(a => (a.entityId === studentId || a.action.includes(studentId)) && a.entityType !== 'foerderprofil').forEach(a => {
    // avoid duplicates if we already caught it in others, though id might differ.
    // We just show a short activity
    events.push({
      id: `act-${a.id}`,
      date: new Date(a.timestamp),
      type: 'activity',
      title: a.action,
      icon: <Activity size={14} />,
      color: 'bg-slate-50 text-slate-600 border-slate-200'
    });
  });

  const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);

  const student = (app?.schueler || []).find(s => s.id === studentId);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl  shadow-xl border border-slate-100">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Zeitstrahl</h3>
            <div className="text-[1.125rem] leading-normal font-black text-slate-900">{student?.vorname}</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative bg-slate-50/50">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Clock size={48} className="opacity-20" />
            <p className="text-[0.875rem] leading-snug font-bold">Noch keine Ereignisse für dieses Kind erfasst.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-8">
            {sortedEvents.map(ev => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={ev.id} 
                className="relative pl-6"
              >
                <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${ev.color.split(' ')[2]}`}>
                  <div className={ev.color.split(' ')[1]}>
                    {ev.icon}
                  </div>
                </div>
                <div>
                  <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 mb-1">
                    {ev.date.toLocaleDateString('de-DE')}
                  </div>
                  <div className={`px-2 py-2 rounded-xl text-[0.75rem] leading-tight font-bold border flex items-center justify-between group/item ${ev.color}`}>
                    <span>{ev.title}</span>
                    <button 
                      onClick={() => handleDelete(ev)}
                      className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {events.length > 50 && (
              <div className="pl-6 pt-4 text-[0.625rem] font-black uppercase text-slate-400">
                Ältere Einträge nicht angezeigt
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
