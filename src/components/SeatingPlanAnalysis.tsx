import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Sparkles, 
  Heart, 
  ShieldAlert, 
  Smile, 
  HelpCircle,
  TrendingUp,
  Award,
  BookOpen
} from 'lucide-react';

interface Student {
  id: string;
  vorname: string;
  nachname: string;
  geschlecht: 'männlich' | 'weiblich' | string;
  niveau?: number; // 1 (strong), 2 (medium), 3 (weak)
  charakter?: string[];
  daz?: boolean;
  spf?: boolean;
  espf?: boolean;
  wunschpartner?: string[];
  sperrpartner?: string[];
}

interface SeatingPlanAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
  setApp: (updater: any) => void;
  onHighlightStudents: (ids: string[] | null) => void;
}

export default function SeatingPlanAnalysis({
  isOpen,
  onClose,
  app,
  setApp,
  onHighlightStudents
}: SeatingPlanAnalysisProps) {
  const students = (app.schueler || []) as Student[];
  const seatPlan = (app.sitzplan_schueler || {}) as Record<string, { x: number; y: number }>;
  const objects = (app.sitzplan_objekte || []) as any[];

  // 1. Filter out placed vs unplaced students
  const placedStudents = useMemo(() => {
    return students.filter(s => !!seatPlan[s.id]);
  }, [students, seatPlan]);

  const unplacedStudents = useMemo(() => {
    return students.filter(s => !seatPlan[s.id]);
  }, [students, seatPlan]);

  // 2. Identify neighbors helper
  const areNeighbors = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    // Standard double desk or adjacent seating threshold
    return (dx < 160 && dy < 60) || (dx < 60 && dy < 160);
  };

  // 3. Compute Metrics
  const analysis = useMemo(() => {
    let totalPlaced = placedStudents.length;
    let totalStudents = students.length;
    
    let totalWishes = 0;
    let fulfilledWishes = 0;
    const fulfilledWishesStudents: string[] = [];
    const violatedWishesStudents: string[] = [];

    let totalConflicts = 0;
    let violatedConflicts = 0;
    const violatedConflictsPairs: [Student, Student][] = [];

    let doubleChairsCount = 0;
    let mixedGenderChairs = 0;
    const mixedGenderStudents: string[] = [];

    let activeAnchorPairs = 0;
    const activeAnchorStudents: string[] = [];

    let highLowTandems = 0;
    const tandemStudents: string[] = [];

    let dazSpfCount = 0;
    let dazSpfFrontCount = 0;
    const dazSpfInFront: string[] = [];

    // Blackboard or Teacher desk position
    const mainBoard = objects.find(o => o.type === 'blackboard') || { x: 500, y: 15 };

    // Process relationships and seating matches
    for (let i = 0; i < placedStudents.length; i++) {
      const s1 = placedStudents[i];
      const pos1 = seatPlan[s1.id];
      if (!pos1) continue;

      // Check DaZ/SPF distance to front (blackboard at y=15)
      if (s1.daz || s1.spf || s1.espf) {
        dazSpfCount++;
        // Considered "front" if y-coordinate is in the top 45% of the active room space (typically y < 380)
        if (pos1.y < 380) {
          dazSpfFrontCount++;
          dazSpfInFront.push(s1.id);
        }
      }

      // Check neighbors
      for (let j = i + 1; j < placedStudents.length; j++) {
        const s2 = placedStudents[j];
        const pos2 = seatPlan[s2.id];
        if (!pos2) continue;

        if (areNeighbors(pos1, pos2)) {
          doubleChairsCount++;

          // A. Gender balance
          if (s1.geschlecht !== s2.geschlecht) {
            mixedGenderChairs++;
            mixedGenderStudents.push(s1.id, s2.id);
          }

          // B. Learning Tandems (Niveau 1 next to Niveau 3)
          if (s1.niveau && s2.niveau) {
            const diff = Math.abs(s1.niveau - s2.niveau);
            if (diff >= 1) {
              highLowTandems++;
              tandemStudents.push(s1.id, s2.id);
            }
          }

          // C. Active / Anchor Balance (Synergy check)
          const isS1Active = s1.charakter?.some(c => ['impulsstark', 'lebhaft', 'braucht_ruhepol', 'braucht_fokus'].includes(c));
          const isS2Active = s2.charakter?.some(c => ['impulsstark', 'lebhaft', 'braucht_ruhepol', 'braucht_fokus'].includes(c));
          const isS1Anchor = s1.charakter?.some(c => ['ruhig', 'konzentriert', 'aufmerksam', 'hilfsbereit'].includes(c));
          const isS2Anchor = s2.charakter?.some(c => ['ruhig', 'konzentriert', 'aufmerksam', 'hilfsbereit'].includes(c));

          if ((isS1Active && isS2Anchor) || (isS2Active && isS1Anchor)) {
            activeAnchorPairs++;
            activeAnchorStudents.push(s1.id, s2.id);
          }
        }
      }

      // D. Wishes
      const wishes = s1.wunschpartner || [];
      wishes.forEach(wid => {
        const friend = placedStudents.find(fs => fs.id === wid);
        if (friend) {
          totalWishes++;
          const friendPos = seatPlan[friend.id];
          if (friendPos && areNeighbors(pos1, friendPos)) {
            fulfilledWishes++;
            fulfilledWishesStudents.push(s1.id, friend.id);
          } else {
            violatedWishesStudents.push(s1.id, friend.id);
          }
        }
      });

      // E. Conflicts
      const conflicts = s1.sperrpartner || [];
      conflicts.forEach(cid => {
        const rival = placedStudents.find(rs => rs.id === cid);
        if (rival) {
          totalConflicts++;
          const rivalPos = seatPlan[rival.id];
          if (rivalPos && areNeighbors(pos1, rivalPos)) {
            violatedConflicts++;
            if (!violatedConflictsPairs.some(pair => (pair[0].id === s1.id && pair[1].id === rival.id) || (pair[0].id === rival.id && pair[1].id === s1.id))) {
              violatedConflictsPairs.push([s1, rival]);
            }
          }
        }
      });
    }

    // Double counts adjust (wishes & conflicts are checked from both sides)
    const wishRate = totalWishes > 0 ? Math.round((fulfilledWishes / totalWishes) * 100) : 100;
    const conflictViolationsRate = totalConflicts > 0 ? Math.round((violatedConflicts / totalConflicts) * 100) : 0;

    return {
      totalPlaced,
      totalStudents,
      wishRate,
      fulfilledWishes,
      totalWishes,
      totalConflicts,
      violatedConflicts: violatedConflictsPairs.length,
      violatedConflictsPairs,
      doubleChairsCount,
      mixedGenderChairs,
      mixedGenderRate: doubleChairsCount > 0 ? Math.round((mixedGenderChairs / doubleChairsCount) * 100) : 0,
      activeAnchorPairs,
      highLowTandems,
      dazSpfCount,
      dazSpfFrontCount,
      dazSpfRate: dazSpfCount > 0 ? Math.round((dazSpfFrontCount / dazSpfCount) * 100) : 100,
      
      // Student group IDs for interactive highlighting
      highlightIds: {
        mixedGender: Array.from(new Set(mixedGenderStudents)),
        tandems: Array.from(new Set(tandemStudents)),
        activeAnchors: Array.from(new Set(activeAnchorStudents)),
        dazSpfFront: dazSpfInFront,
        fulfilledWishes: Array.from(new Set(fulfilledWishesStudents)),
        violatedWishes: Array.from(new Set(violatedWishesStudents))
      }
    };
  }, [placedStudents, students, seatPlan, objects]);

  // Smart localized improvement algorithm
  const runSmartOptimization = () => {
    if (placedStudents.length < 2) return;

    // We preserve current furniture, and just shuffle students on the current chair coordinates to maximize relations
    const currentCoords = placedStudents.map(s => ({ ...seatPlan[s.id] }));
    const currentStudents = [...placedStudents];

    // Simple hill-climbing optimization local search
    let bestArrangement = [...currentStudents];
    
    const evaluate = (arr: Student[]) => {
      let score = 0;
      for (let i = 0; i < arr.length; i++) {
        const s1 = arr[i];
        const p1 = currentCoords[i];
        if (!s1 || !p1) continue;

        // Wishes & conflicts
        for (let j = i + 1; j < arr.length; j++) {
          const s2 = arr[j];
          const p2 = currentCoords[j];
          if (!s2 || !p2) continue;

          if (areNeighbors(p1, p2)) {
            // Wunschpartner
            if ((s1.wunschpartner || []).includes(s2.id)) score += 120;
            if ((s2.wunschpartner || []).includes(s1.id)) score += 120;

            // Sperrpartner (massive penalty)
            if ((s1.sperrpartner || []).includes(s2.id)) score -= 1000;
            if ((s2.sperrpartner || []).includes(s1.id)) score -= 1000;

            // Active/Anchor synergy (minor boost)
            const isS1Active = s1.charakter?.some(c => ['impulsstark', 'lebhaft', 'braucht_ruhepol', 'braucht_fokus'].includes(c));
            const isS2Active = s2.charakter?.some(c => ['impulsstark', 'lebhaft', 'braucht_ruhepol', 'braucht_fokus'].includes(c));
            const isS1Anchor = s1.charakter?.some(c => ['ruhig', 'konzentriert', 'aufmerksam', 'hilfsbereit'].includes(c));
            const isS2Anchor = s2.charakter?.some(c => ['ruhig', 'konzentriert', 'aufmerksam', 'hilfsbereit'].includes(c));
            if ((isS1Active && isS2Anchor) || (isS2Active && isS1Anchor)) {
              score += 25;
            }

            // Learning Tandem (diff level)
            if (s1.niveau && s2.niveau && Math.abs(s1.niveau - s2.niveau) >= 1) {
              score += 15;
            }
          }
        }
      }
      return score;
    };

    let bestScore = evaluate(bestArrangement);

    // Iterative local swap searches
    for (let iteration = 0; iteration < 400; iteration++) {
      const idx1 = Math.floor(Math.random() * bestArrangement.length);
      const idx2 = Math.floor(Math.random() * bestArrangement.length);
      if (idx1 === idx2) continue;

      // Swap
      const testArr = [...bestArrangement];
      const temp = testArr[idx1];
      testArr[idx1] = testArr[idx2];
      testArr[idx2] = temp;

      const score = evaluate(testArr);
      if (score > bestScore) {
        bestArrangement = testArr;
        bestScore = score;
      }
    }

    // Apply back
    const newPlan = { ...seatPlan };
    bestArrangement.forEach((student, idx) => {
      newPlan[student.id] = currentCoords[idx];
    });

    setApp((prev: any) => ({
      ...prev,
      sitzplan_schueler: newPlan
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        className="fixed right-6 top-24 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 no-print z-[200] max-h-[calc(100vh-140px)] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            <h3 className="font-extrabold text-[0.8125rem] uppercase tracking-wide text-indigo-950">Planungs-Analyse</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 custom-scrollbar text-xs">
          {/* Seated Ratio */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-500 block text-[0.625rem] uppercase tracking-wider">Platzierungsquote</span>
              <span className="text-lg font-black text-slate-800">{analysis.totalPlaced} von {analysis.totalStudents} platziert</span>
            </div>
            <div className="w-10 h-10 rounded-full border-4 border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-xs bg-white">
              {analysis.totalStudents > 0 ? Math.round((analysis.totalPlaced / analysis.totalStudents) * 100) : 0}%
            </div>
          </div>

          {/* Unplaced Students List */}
          {unplacedStudents.length > 0 && (
            <div className="bg-amber-50/55 border border-amber-200/60 p-3 rounded-xl space-y-2">
              <span className="font-black text-amber-800 uppercase tracking-wider text-[0.625rem] block">
                ⚠️ Nicht platziert ({unplacedStudents.length})
              </span>
              <p className="text-[0.625rem] text-slate-500">
                Diese Schüler haben aktuell keinen Platz auf dem Sitzplan. Klicke auf ein Kind, um es automatisch im Raum zu platzieren:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1.5 custom-scrollbar">
                {unplacedStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const occupied = Object.values(app.sitzplan_schueler || {}) as { x: number; y: number }[];
                      let nextX = 100;
                      let nextY = 250;
                      while (occupied.some(p => Math.abs(p.x - nextX) < 120 && Math.abs(p.y - nextY) < 75)) {
                        nextX += 130;
                        if (nextX > 900) {
                          nextX = 100;
                          nextY += 80;
                        }
                      }
                      setApp((prev: any) => ({
                        ...prev,
                        sitzplan_schueler: {
                          ...(prev.sitzplan_schueler || {}),
                          [s.id]: { x: nextX, y: nextY }
                        }
                      }));
                    }}
                    className="px-2 py-1 bg-white border border-amber-200 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50 text-slate-700 rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                    title={`${s.vorname} im Raum platzieren`}
                  >
                    <span>➕ {s.vorname} {s.nachname ? s.nachname.charAt(0) + '.' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Social / Relations */}
          <div>
            <span className="font-black text-slate-400 uppercase tracking-wider text-[0.625rem] block mb-2">Soziale Kriterien</span>
            
            <div className="grid grid-cols-1 gap-2">
              {/* Wishes */}
              <div 
                className="p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all cursor-pointer group/item"
                onMouseEnter={() => onHighlightStudents(analysis.highlightIds.fulfilledWishes)}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Heart size={13} className="text-rose-500 group-hover/item:scale-110 transition-transform" />
                    <span>Sitzwünsche</span>
                  </div>
                  <span className={`font-black text-[0.6875rem] px-1.5 py-0.5 rounded-full ${analysis.wishRate >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {analysis.wishRate}% erfüllt
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${analysis.wishRate}%` }} />
                </div>
                <p className="text-[0.5625rem] text-slate-400 mt-1">Hovern, um erfüllte Wünsche im Raum hervorzuheben.</p>
              </div>

              {/* Conflicts */}
              <div 
                className={`p-2.5 rounded-xl border transition-all cursor-pointer group/item ${
                  analysis.violatedConflicts > 0 
                    ? 'border-rose-200 bg-rose-50/10 hover:bg-rose-50/20' 
                    : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20'
                }`}
                onMouseEnter={() => {
                  const ids = analysis.violatedConflictsPairs.flatMap(p => [p[0].id, p[1].id]);
                  if (ids.length > 0) onHighlightStudents(ids);
                }}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <ShieldAlert size={13} className={analysis.violatedConflicts > 0 ? 'text-rose-500' : 'text-slate-400'} />
                    <span>Konflikte im Raum</span>
                  </div>
                  <span className={`font-black text-[0.6875rem] px-1.5 py-0.5 rounded-full ${analysis.violatedConflicts === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {analysis.violatedConflicts} Konflikte
                  </span>
                </div>
                {analysis.violatedConflicts > 0 ? (
                  <div className="flex flex-col gap-1 mt-1.5">
                    {analysis.violatedConflictsPairs.map(([s1, s2], idx) => (
                      <span key={idx} className="text-[0.5625rem] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-medium inline-block truncate">
                        ⚠️ {s1.vorname} & {s2.vorname} sitzen nebeneinander
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.5625rem] text-slate-400 mt-1">Hervorragend! Keine Konflikte (Sperrpartner) nebeneinander.</p>
                )}
              </div>
            </div>
          </div>

          {/* Pedagogical Balance */}
          <div>
            <span className="font-black text-slate-400 uppercase tracking-wider text-[0.625rem] block mb-2">Pädagogische Synergien</span>
            
            <div className="flex flex-col gap-2">
              {/* Quiet Anchor & Active Synergy */}
              <div 
                className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer"
                onMouseEnter={() => onHighlightStudents(analysis.highlightIds.activeAnchors)}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Smile size={12} className="text-amber-500" />
                    Ruhe-Balance (Sitzplatz-Synergie)
                  </span>
                  <span className="font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full text-[0.5625rem]">
                    {analysis.activeAnchorPairs} Paare
                  </span>
                </div>
                <p className="text-[0.5625rem] text-slate-400 leading-normal">
                  Anzahl lebhafter/impulsstarker Schüler, die neben einem ruhigen Anker-Schüler platziert sind.
                </p>
              </div>

              {/* Learning Tandems */}
              <div 
                className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer"
                onMouseEnter={() => onHighlightStudents(analysis.highlightIds.tandems)}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <BookOpen size={12} className="text-emerald-500" />
                    Lern-Tandems
                  </span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full text-[0.5625rem]">
                    {analysis.highLowTandems} Paare
                  </span>
                </div>
                <p className="text-[0.5625rem] text-slate-400 leading-normal">
                  Nachbarn mit unterschiedlichen akademischen Niveaus, um gegenseitiges Lernen zu fördern.
                </p>
              </div>

              {/* Inclusion Front Focus */}
              <div 
                className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer"
                onMouseEnter={() => onHighlightStudents(analysis.highlightIds.dazSpfFront)}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Award size={12} className="text-indigo-500" />
                    Inklusions-Nähe zur Tafel
                  </span>
                  <span className={`font-black text-[0.5625rem] px-1.5 py-0.5 rounded-full ${analysis.dazSpfRate >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {analysis.dazSpfRate}% vorn
                  </span>
                </div>
                <p className="text-[0.5625rem] text-slate-400 leading-normal">
                  {analysis.dazSpfFrontCount} von {analysis.dazSpfCount} DaZ/SPF-Schülern befinden sich in vorderen Reihen nahe der Tafel.
                </p>
              </div>

              {/* Gender Balance */}
              <div 
                className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer"
                onMouseEnter={() => onHighlightStudents(analysis.highlightIds.mixedGender)}
                onMouseLeave={() => onHighlightStudents(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Users size={12} className="text-indigo-500" />
                    Geschlechter-Mischung
                  </span>
                  <span className="font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full text-[0.5625rem]">
                    {analysis.mixedGenderRate}% gemischt
                  </span>
                </div>
                <p className="text-[0.5625rem] text-slate-400 leading-normal">
                  Prozentualer Anteil an Nachbarsitzen, die gemischtgeschlechtlich besetzt sind.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Placement Optimizer Action */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={runSmartOptimization}
              disabled={placedStudents.length < 2}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>Sitzordnung optimieren</span>
            </button>
            <p className="text-[0.5rem] text-slate-400 text-center mt-1.5 leading-normal px-2">
              Sucht mittels künstlicher Raumsuche (Lokaler Such-Heuristik) nach einer optimalen Platzierung für Wünsche & Konfliktvermeidung.
            </p>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
