import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  RotateCcw,
  Edit2,
  ListTodo,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { getTodoPageWindow, getTodoRowsPerPage } from '../todoLayout';
import {
  ClassroomTodoItem,
  ClassroomTodoState,
  CLASSROOM_TODO_PRESETS,
  calculateTodoProgress,
  migrateLegacyTodos,
  addTodoItem,
  toggleTodoItem,
  updateTodoText,
  deleteTodoItem,
  moveTodoItem,
  toggleBonusTodo,
  resetTodoList,
  applyTodoPreset,
} from '../../../lib/todoAlgorithm';

export interface TodoWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  // Abwärtskompatibilität für alte Übergaben
  todoList?: any[];
  setTodoList?: (items: any) => void;
}

export const TodoWidget: React.FC<TodoWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
  todoList: legacyTodoList,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('TodoWidget', containerRef);

  // Lokaler synchroner Zustand zur Entlastung des Haupt-Cockpits
  const [state, setState] = useState<ClassroomTodoState>(() =>
    migrateLegacyTodos(widget?.settings, legacyTodoList)
  );

  const [inputText, setInputText] = useState('');
  const [inputIsBonus, setInputIsBonus] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [page, setPage] = useState(0);
  // A visible page replaces the former hidden inner scrolling region. On very
  // small boards use a single task instead of shrinking touch targets or text.
  const rowsPerPage = getTodoRowsPerPage(size.height, size.isCompact, showPresetsMenu, showConfirmReset);
  const { pageCount, visiblePage, firstVisibleItem } = getTodoPageWindow(state.items.length, rowsPerPage, page);

  useEffect(() => {
    setPage(current => Math.min(current, pageCount - 1));
  }, [pageCount]);

  // Synchronisation bei externen Updates des Widget-Objekts
  useEffect(() => {
    if (widget?.settings?.todoState) {
      setState(migrateLegacyTodos(widget.settings));
    }
  }, [widget?.settings?.todoState]);

  // Zentraler persistenter State-Update
  const commitState = (nextState: ClassroomTodoState) => {
    setState(nextState);
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget?.settings,
          todoState: nextState,
        },
      });
    }
  };

  const progress = calculateTodoProgress(state.items);
  const progressPercent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  // Handlers
  const handleAdd = () => {
    if (!inputText.trim()) return;
    const nextState = addTodoItem(state, inputText, inputIsBonus);
    commitState(nextState);
    setPage(Math.floor((nextState.items.length - 1) / rowsPerPage));
    setInputText('');
    setInputIsBonus(false);
  };

  const handleToggleItem = (id: string) => {
    const nextState = toggleTodoItem(state, id);
    commitState(nextState);
  };

  const handleDeleteItem = (id: string) => {
    const nextState = deleteTodoItem(state, id);
    commitState(nextState);
    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const nextState = moveTodoItem(state, id, direction);
    commitState(nextState);
  };

  const handleToggleBonus = (id: string) => {
    const nextState = toggleBonusTodo(state, id);
    commitState(nextState);
  };

  const handleSaveEdit = (id: string) => {
    if (editingItemText.trim()) {
      const nextState = updateTodoText(state, id, editingItemText);
      commitState(nextState);
    }
    setEditingItemId(null);
  };

  const handleConfirmReset = () => {
    const nextState = resetTodoList(state);
    commitState(nextState);
    setShowConfirmReset(false);
    setIsEditMode(false);
    setPage(0);
  };

  const handleApplyPreset = (presetId: string) => {
    const nextState = applyTodoPreset(presetId);
    commitState(nextState);
    setShowPresetsMenu(false);
    setShowConfirmReset(false);
    setPage(0);
  };

  // Typografische Skalierung nach Breakpoints
  const titleSizeClass = isFullscreen
    ? 'text-2xl font-black'
    : size.isLarge
    ? 'text-lg font-black'
    : 'text-sm font-bold';

  const itemTextSizeClass = isFullscreen
    ? 'text-xl font-bold'
    : size.isLarge
    ? 'text-base font-medium'
    : size.isCompact
    ? 'text-xs font-medium'
    : 'text-sm font-medium';

  const checkboxSizeClass = isFullscreen
    ? 'w-9 h-9 text-xl'
    : size.isLarge
    ? 'w-7 h-7 text-base'
    : 'w-6 h-6 text-xs';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col justify-between p-3 select-none overflow-hidden ${
        currentIsLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900/90 text-slate-100'
      }`}
    >
      {/* 1. Header: Titel, Fortschritt & Steuerungs-Aktionen */}
      <div className="shrink-0 space-y-2 mb-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                currentIsLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/60 text-emerald-400'
              }`}
            >
              <ListTodo size={isFullscreen ? 24 : 18} />
            </div>
            <div className="truncate">
              <h3 className={`${titleSizeClass} truncate leading-tight tracking-tight`}>
                {state.title || 'Arbeitsphase'}
              </h3>
            </div>
          </div>

          {/* Aktionsleiste rechts */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Vorlagen Menü Toggle */}
            <button
              type="button"
              onClick={() => setShowPresetsMenu(prev => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                showPresetsMenu
                  ? currentIsLight
                    ? 'bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-slate-800 border-slate-700 text-white'
                  : currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Vorlagen (Stillarbeit, Partnerarbeit, etc.)"
            >
              <Layers size={14} />
              {!size.isCompact && <span>Vorlagen</span>}
            </button>

            {/* Bearbeitungsmodus Toggle */}
            <button
              type="button"
              onClick={() => setIsEditMode(prev => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                isEditMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title={isEditMode ? 'Bearbeitungsmodus beenden' : 'Aufgaben sortieren / bearbeiten'}
            >
              <Edit2 size={14} />
              {!size.isCompact && <span>{isEditMode ? 'Fertig' : 'Bearbeiten'}</span>}
            </button>

            {/* Neue Liste (mit Bestätigung) */}
            <button
              type="button"
              onClick={() => {
                if (state.items.length === 0) {
                  handleConfirmReset();
                } else {
                  setShowConfirmReset(true);
                }
              }}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                currentIsLight
                  ? 'bg-white hover:bg-rose-50 border-slate-200 text-slate-600 hover:text-rose-600'
                  : 'bg-slate-800/60 hover:bg-rose-950/40 border-slate-700 text-slate-300 hover:text-rose-400'
              }`}
              title="Neue Liste anlegen"
            >
              <RotateCcw size={14} />
              {!size.isCompact && <span>Neu</span>}
            </button>
          </div>
        </div>

        {/* Bestätigungsdialog für "Neue Liste" */}
        {showConfirmReset && (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
              currentIsLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/40 border-amber-900/60 text-amber-200'
            }`}
          >
            <span>Aktuelle Liste leeren?</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all"
              >
                Ja, leeren
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className={`px-2 py-1 rounded border transition-all ${
                  currentIsLight ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Vorlagenauswahl Popup */}
        {showPresetsMenu && (
          <div
            className={`p-2 rounded-xl border space-y-1.5 text-xs transition-all shadow-md ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-700/50">
              <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                Schnell-Vorlagen
              </span>
              <button
                type="button"
                onClick={() => setShowPresetsMenu(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {CLASSROOM_TODO_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`text-left p-2 rounded-lg border transition-all hover:scale-[1.01] ${
                    currentIsLight
                      ? 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300 text-slate-800'
                      : 'bg-slate-900/50 hover:bg-emerald-950/30 border-slate-700 hover:border-emerald-600 text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">{preset.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fortschrittsanzeige: "2 von 4 erledigt" + Dezent-Leiste */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {progress.total === 0 ? (
                'Keine Aufgaben eingetragen'
              ) : progress.allDone ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Alles erledigt ✓
                </span>
              ) : (
                `${progress.done} von ${progress.total} erledigt`
              )}
            </span>

            {progress.bonusTotal > 0 && !progress.allDone && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ⭐ {progress.bonusDone}/{progress.bonusTotal} Zusatz
              </span>
            )}
          </div>

          {/* Minimaler Fortschrittsbalken */}
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              currentIsLight ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                progress.allDone
                  ? 'bg-emerald-500'
                  : 'bg-indigo-500 dark:bg-indigo-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Aufgabenliste: explizite Seiten statt Scrollen innerhalb des Widgets. */}
      <div className="flex-1 min-h-0 overflow-hidden space-y-2 pr-1 my-1" aria-label={`Aufgaben ${state.items.length ? `${firstVisibleItem + 1} bis ${Math.min(firstVisibleItem + rowsPerPage, state.items.length)} von ${state.items.length}` : 'leer'}`}>
        {state.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <ListTodo size={36} strokeWidth={1.5} className="mb-2 opacity-50" />
            <p className="text-xs font-semibold">Keine Aufgaben für diese Phase</p>
            <p className="text-[11px] opacity-75 mt-0.5">
              Gib unten einen Schritt ein oder wähle eine Vorlage.
            </p>
          </div>
        ) : (
          state.items.slice(firstVisibleItem, firstVisibleItem + rowsPerPage).map((item, visibleIndex) => {
            const index = firstVisibleItem + visibleIndex;
            const isEditing = editingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`group rounded-xl border transition-all p-2 sm:p-2.5 flex items-center gap-2.5 ${
                  item.done
                    ? currentIsLight
                      ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                    : item.isBonus
                    ? currentIsLight
                      ? 'bg-amber-50/50 border-amber-200/90 text-slate-800 shadow-sm'
                      : 'bg-amber-950/20 border-amber-900/40 text-slate-100 shadow-sm'
                    : currentIsLight
                    ? 'bg-white border-slate-200 shadow-sm text-slate-800'
                    : 'bg-slate-800/80 border-slate-700 shadow-sm text-slate-100'
                }`}
              >
                {/* Checkbox (Touch Target min 44px auf Mobile, sonst ansprechend skaliert) */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.done}
                  aria-label={`Aufgabe ${item.text} als ${item.done ? 'offen' : 'erledigt'} markieren`}
                  onClick={() => handleToggleItem(item.id)}
                  className={`shrink-0 ${checkboxSizeClass} rounded-lg border-2 flex items-center justify-center transition-all ${
                    item.done
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : currentIsLight
                      ? 'border-slate-300 hover:border-emerald-500 bg-white'
                      : 'border-slate-600 hover:border-emerald-400 bg-slate-800'
                  }`}
                >
                  {item.done && <Check size={isFullscreen ? 20 : 14} strokeWidth={3} />}
                </button>

                {/* Aufgabentext / Edit-Feld */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingItemText}
                        onChange={e => setEditingItemText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        autoFocus
                        className={`w-full px-2 py-1 rounded text-xs border font-medium outline-none ${
                          currentIsLight
                            ? 'bg-white border-indigo-400 text-slate-900'
                            : 'bg-slate-900 border-indigo-500 text-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="p-1 rounded bg-indigo-600 text-white text-xs font-bold shrink-0"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      {item.isBonus && (
                        <span
                          className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            currentIsLight
                              ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
                              : 'bg-amber-900/60 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          ⭐ Zusatz
                        </span>
                      )}
                      <span
                        onClick={() => handleToggleItem(item.id)}
                        className={`cursor-pointer break-words whitespace-normal leading-snug flex-1 select-text ${itemTextSizeClass} ${
                          item.done ? 'line-through opacity-75' : ''
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bearbeitungs-Werkzeuge (nur im Bearbeitungsmodus sichtbar) */}
                {isEditMode && !isEditing && (
                  <div className="shrink-0 flex items-center gap-1">
                    {/* Sternchen Zusatz Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleBonus(item.id)}
                      className={`p-1.5 rounded transition-all ${
                        item.isBonus
                          ? 'text-amber-500 bg-amber-100/50 dark:bg-amber-950/50'
                          : 'text-slate-400 hover:text-amber-500'
                      }`}
                      title={item.isBonus ? 'Zusatz-Markierung entfernen' : 'Als Zusatzaufgabe kennzeichnen'}
                    >
                      <Star size={13} fill={item.isBonus ? 'currentColor' : 'none'} />
                    </button>

                    {/* Nach oben */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveItem(item.id, 'up')}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25"
                      title="Nach oben verschieben"
                    >
                      <ArrowUp size={13} />
                    </button>

                    {/* Nach unten */}
                    <button
                      type="button"
                      disabled={index === state.items.length - 1}
                      onClick={() => handleMoveItem(item.id, 'down')}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25"
                      title="Nach unten verschieben"
                    >
                      <ArrowDown size={13} />
                    </button>

                    {/* Text bearbeiten */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditingItemText(item.text);
                      }}
                      className="p-1.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Text korrigieren"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Löschen */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Aufgabe löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {pageCount > 1 && (
        <nav aria-label="Aufgabenseiten" className="shrink-0 flex items-center justify-between gap-2 py-1 text-xs font-semibold">
          <button type="button" disabled={visiblePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="min-h-9 rounded-lg border px-3 disabled:opacity-40" aria-label="Vorherige Aufgabenseite">← Zurück</button>
          <span aria-live="polite">Seite {visiblePage + 1} von {pageCount}</span>
          <button type="button" disabled={visiblePage >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            className="min-h-9 rounded-lg border px-3 disabled:opacity-40" aria-label="Nächste Aufgabenseite">Weiter →</button>
        </nav>
      )}

      {/* 3. Footer: Schnelleingabe (Text + Enter) */}
      <div className="shrink-0 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex items-center gap-1.5"
        >
          {/* Zusatzaufgabe Toggle für die nächste Eingabe */}
          <button
            type="button"
            onClick={() => setInputIsBonus(prev => !prev)}
            className={`shrink-0 p-2 rounded-lg border transition-all text-xs flex items-center justify-center ${
              inputIsBonus
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : currentIsLight
                ? 'bg-white text-slate-400 hover:text-amber-500 border-slate-200'
                : 'bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700'
            }`}
            title={inputIsBonus ? 'Als reguläre Aufgabe eintragen' : 'Als ⭐ Zusatzaufgabe kennzeichnen'}
          >
            <Star size={14} fill={inputIsBonus ? 'currentColor' : 'none'} />
          </button>

          {/* Text-Input */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                inputIsBonus
                  ? 'Zusatzschritt eintragen (z.B. Nr. 5 für Schnelle)...'
                  : 'Neuen Schritt hinzufügen (z.B. Seite 24 lesen)...'
              }
              className={`w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border outline-none transition-all placeholder:font-normal placeholder:opacity-50 ${
                currentIsLight
                  ? 'bg-white border-slate-200 focus:border-indigo-400 text-slate-900'
                  : 'bg-slate-800 border-slate-700 focus:border-indigo-500 text-slate-100'
              }`}
            />
          </div>

          {/* Hinzufügen-Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="shrink-0 p-2 sm:px-3 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition-all"
            title="Schritt zur Liste hinzufügen"
          >
            <Plus size={15} />
            {!size.isCompact && <span>Hinzufügen</span>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TodoWidget;
