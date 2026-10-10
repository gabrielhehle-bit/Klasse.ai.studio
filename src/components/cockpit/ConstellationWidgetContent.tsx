import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SKY_PATTERN_FILTER_LABELS,
  SKY_PATTERN_KIND_LABELS,
  doesStarPairMatchEdge,
  filterSkyPatterns,
  getSkyPatternStar,
  normalizeConstellationWidgetSettings,
  skyPatternEdgeKey,
  type ConstellationWidgetSettings,
  type SkyPattern,
  type SkyPatternFilter,
} from '../../lib/constellationWidgetModel';

interface ConstellationWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const ConstellationWidgetContent: React.FC<ConstellationWidgetContentProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeConstellationWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const patterns = useMemo(
    () => filterSkyPatterns(settings.filter),
    [settings.filter],
  );
  const lifecycle = readWidgetLifecycleState(widget, "constellation", { mode: 'discover' as 'discover' | 'connect', patternIndex: 0, selectedStarId: null as string | null, firstConnectStarId: null as string | null, connectedEdgeKeys: [] as string[], feedback: 'Tippe einen Stern an, um seinen Namen zu sehen.' });
  const [mode, setMode] = useState<'discover' | 'connect'>(() => lifecycle.mode);
  const [patternIndex, setPatternIndex] = useState(() => lifecycle.patternIndex);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(() => lifecycle.selectedStarId);
  const [firstConnectStarId, setFirstConnectStarId] = useState<string | null>(() => lifecycle.firstConnectStarId);
  const [connectedEdgeKeys, setConnectedEdgeKeys] = useState<Set<string>>(() => new Set(lifecycle.connectedEdgeKeys));
  const [feedback, setFeedback] = useState(() => lifecycle.feedback);
  usePersistedWidgetLifecycleState(widget, onUpdate, "constellation", { mode, patternIndex, selectedStarId, firstConnectStarId, feedback, connectedEdgeKeys: Array.from(connectedEdgeKeys) });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const pattern: SkyPattern = patterns[patternIndex] ?? patterns[0];

  const previousFilter = useRef(settings.filter);
  useEffect(() => {
    if (previousFilter.current === settings.filter) return;
    previousFilter.current = settings.filter;
    setPatternIndex(0);
    setSelectedStarId(null);
    setFirstConnectStarId(null);
    setConnectedEdgeKeys(new Set());
    setFeedback('Tippe einen Stern an, um seinen Namen zu sehen.');
  }, [settings.filter]);

  const previousPatternMode = useRef(`${patternIndex}:${mode}`);
  useEffect(() => {
    const key = `${patternIndex}:${mode}`;
    if (previousPatternMode.current === key) return;
    previousPatternMode.current = key;
    setSelectedStarId(null);
    setFirstConnectStarId(null);
    setConnectedEdgeKeys(new Set());
    setFeedback(
      mode === 'discover'
        ? 'Tippe einen Stern an, um seinen Namen zu sehen.'
        : 'Verbinde die markierten Sterne Schritt für Schritt.',
    );
  }, [patternIndex, mode]);

  const persistSettings = (patch: Partial<ConstellationWidgetSettings>) => {
    onUpdateRef.current?.({ settings: patch });
  };

  const nextPattern = () => {
    if (patterns.length <= 1) return;
    setPatternIndex(index => (index + 1) % patterns.length);
  };

  const previousPattern = () => {
    if (patterns.length <= 1) return;
    setPatternIndex(index => (index - 1 + patterns.length) % patterns.length);
  };

  if (!pattern) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm font-bold">
        Keine Himmelsmuster für diese Auswahl verfügbar.
      </div>
    );
  }

  const currentTargetEdge = pattern.edges[connectedEdgeKeys.size];
  const currentTargetIds = currentTargetEdge
    ? new Set([currentTargetEdge.a, currentTargetEdge.b])
    : new Set<string>();
  const selectedStar = selectedStarId
    ? pattern.stars.find(star => star.id === selectedStarId)
    : null;
  const complete = connectedEdgeKeys.size === pattern.edges.length;

  const handleStarClick = (starId: string) => {
    if (mode === 'discover') {
      setSelectedStarId(starId);
      const star = getSkyPatternStar(pattern, starId);
      setFeedback(`${star.name} gehört zu diesem gezeigten Himmelsmuster.`);
      return;
    }

    if (complete || !currentTargetEdge) return;

    if (!firstConnectStarId) {
      if (!currentTargetIds.has(starId)) {
        setFeedback('Noch nicht: Beginne mit einem der beiden markierten Sterne.');
        return;
      }
      setFirstConnectStarId(starId);
      setFeedback('Gut. Tippe jetzt den zweiten markierten Stern an.');
      return;
    }

    if (firstConnectStarId === starId) {
      setFeedback('Wähle den anderen markierten Stern.');
      return;
    }

    if (doesStarPairMatchEdge(firstConnectStarId, starId, currentTargetEdge)) {
      const edgeKey = skyPatternEdgeKey(currentTargetEdge);
      const next = new Set(connectedEdgeKeys);
      next.add(edgeKey);
      setConnectedEdgeKeys(next);
      setFirstConnectStarId(null);

      if (next.size === pattern.edges.length) {
        setFeedback(`Fertig. Du hast „${pattern.name}“ vollständig verbunden.`);
      } else {
        setFeedback('Richtig verbunden. Weiter mit dem nächsten markierten Paar.');
      }
      return;
    }

    if (currentTargetIds.has(starId)) {
      setFirstConnectStarId(starId);
      setFeedback('Fast. Dieser Stern gehört zum Paar – tippe jetzt den anderen markierten Stern an.');
      return;
    }

    setFirstConnectStarId(null);
    setFeedback('Dieses Paar gehört noch nicht zur nächsten Verbindung.');
  };

  const drawEdges = mode === 'discover'
    ? pattern.edges
    : pattern.edges.filter(edge => connectedEdgeKeys.has(skyPatternEdgeKey(edge)));

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Sternbilder-Zeichner"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Sternbilder-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Wähle, welche Himmelsmuster gezeigt werden und ob Sternnamen sichtbar sind.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Himmelsmuster</p>
            <div className="grid gap-2">
              {(['all', 'constellation', 'asterism'] as SkyPatternFilter[]).map(filter => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={settings.filter === filter}
                  onClick={() => persistSettings({ filter })}
                  className={settingButtonClass(settings.filter === filter)}
                >
                  {SKY_PATTERN_FILTER_LABELS[filter]}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <button
              type="button"
              aria-pressed={settings.showStarNames}
              onClick={() => persistSettings({ showStarNames: !settings.showStarNames })}
              className={settingButtonClass(settings.showStarNames)}
            >
              Sternnamen {settings.showStarNames ? 'anzeigen' : 'ausblenden'}
            </button>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Die IAU erkennt 88 Sternbilder als Himmelsregionen an. Die Verbindungslinien hier sind Lernhilfen und keine offiziellen Grenzen. Asterismen sind bekannte Sternmuster innerhalb eines oder mehrerer Sternbilder.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={mode === 'discover'}
          onClick={() => setMode('discover')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            mode === 'discover'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Entdecken
        </button>
        <button
          type="button"
          aria-pressed={mode === 'connect'}
          onClick={() => setMode('connect')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            mode === 'connect'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Verbinden
        </button>
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={previousPattern}
          disabled={patterns.length <= 1}
          className={`min-h-11 min-w-11 rounded-xl border text-lg font-black disabled:opacity-30 ${
            currentIsLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'
          }`}
          aria-label="Vorheriges Himmelsmuster"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <h3 className="truncate text-base font-black">{pattern.name}</h3>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-1 text-[10px] font-black text-accent">
              {SKY_PATTERN_KIND_LABELS[pattern.kind]}
            </span>
          </div>
          {pattern.parent && (
            <p className="mt-0.5 text-[11px] font-semibold opacity-60">Teil von: {pattern.parent}</p>
          )}
        </div>
        <button
          type="button"
          onClick={nextPattern}
          disabled={patterns.length <= 1}
          className={`min-h-11 min-w-11 rounded-xl border text-lg font-black disabled:opacity-30 ${
            currentIsLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'
          }`}
          aria-label="Nächstes Himmelsmuster"
        >
          ›
        </button>
      </div>

      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
        <div className="absolute inset-0 opacity-60" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, index) => {
            const left = (index * 37) % 97;
            const top = (index * 53) % 91;
            const size = index % 5 === 0 ? 2 : 1;
            return (
              <span
                key={index}
                className="absolute rounded-full bg-white"
                style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
              />
            );
          })}
        </div>

        <svg className="absolute" style={{ left: 24, top: 24, width: 'calc(100% - 48px)', height: 'calc(100% - 48px)' }} aria-hidden="true">
          {drawEdges.map(edge => {
            const a = getSkyPatternStar(pattern, edge.a);
            const b = getSkyPatternStar(pattern, edge.b);
            return (
              <line
                key={skyPatternEdgeKey(edge)}
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-accent"
              />
            );
          })}
        </svg>

        {pattern.stars.map(star => {
          const isTarget = mode === 'connect' && !complete && currentTargetIds.has(star.id);
          const isFirst = firstConnectStarId === star.id;
          const isSelected = selectedStarId === star.id;
          return (
            <button
              key={star.id}
              type="button"
              onClick={() => handleStarClick(star.id)}
              className={`absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 font-black shadow-lg transition-colors ${
                isFirst || isSelected
                  ? 'border-accent bg-accent text-accent-text'
                  : isTarget
                    ? 'border-accent bg-slate-900 text-white ring-4 ring-accent/30'
                    : 'border-white/70 bg-slate-900 text-white'
              }`}
              style={{ left: `calc(${star.x}% + ${24 - star.x * 0.48}px)`, top: `calc(${star.y}% + ${24 - star.y * 0.48}px)` }}
              aria-label={settings.showStarNames ? star.name : 'Stern'}
            >
              ★
              {settings.showStarNames && (
                <span data-star-name className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  {star.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 shrink-0">
        <p role="status" aria-live="polite" className="text-xs font-bold leading-relaxed opacity-70">
          {feedback}
        </p>
        {mode === 'discover' && selectedStar && (
          <p className="mt-1 text-xs font-semibold leading-relaxed text-accent">{selectedStar.name}</p>
        )}
        <div className={`mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${
          currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
        }`}>
          {pattern.fact}
        </div>
      </div>
    </div>
  );
};

export default ConstellationWidgetContent;
