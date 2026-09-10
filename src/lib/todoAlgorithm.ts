/**
 * F14 – Aufgaben-Checkliste im Unterricht (widget-todo)
 * Pädagogische Klassen-/Phasen-Checkliste: „Welche Schritte müssen wir in dieser Arbeitsphase erledigen?“
 * 
 * 100% Offline, kein Schülertracking, keine Benotung, vollständige Entkopplung vom Lehrer-Dashboard (kein app.todos).
 */

export interface ClassroomTodoItem {
  id: string;
  text: string;
  done: boolean;
  isBonus?: boolean;
  createdAt?: number;
}

export interface ClassroomTodoState {
  title: string;
  items: ClassroomTodoItem[];
}

export interface TodoPreset {
  id: string;
  title: string;
  description: string;
  items: { text: string; isBonus?: boolean }[];
}

export const CLASSROOM_TODO_PRESETS: readonly TodoPreset[] = [
  {
    id: 'stillarbeit',
    title: 'Stillarbeit',
    description: 'Fokussierte Einzelarbeit',
    items: [
      { text: 'Material bereitlegen (Buch, Heft, Stift)' },
      { text: 'Aufgabe im Buch lösen' },
      { text: 'Ergebnisse selbstständig überprüfen' },
      { text: 'Zusatzaufgabe bearbeiten oder leise lesen', isBonus: true },
    ],
  },
  {
    id: 'partnerarbeit',
    title: 'Partnerarbeit',
    description: 'Austausch & gegenseitige Hilfe',
    items: [
      { text: 'Aufgabe zu zweit durchlesen' },
      { text: 'Lösungsansätze leise besprechen' },
      { text: 'Ergebnisse vergleichen und notieren' },
      { text: 'Partner gegenseitig abfragen', isBonus: true },
    ],
  },
  {
    id: 'stundenabschluss',
    title: 'Aufräumen & Abschluss',
    description: 'Ordnung vor dem Pausengong',
    items: [
      { text: 'Hefte und Arbeitsblätter einpacken' },
      { text: 'Hausübung ins Heft eintragen' },
      { text: 'Tisch & Boden um den Platz säubern' },
      { text: 'Stühle leise hochstellen' },
    ],
  },
] as const;

export const DEFAULT_TODO_ITEMS: readonly ClassroomTodoItem[] = [
  { id: 'todo-init-1', text: 'Material bereitlegen', done: false, isBonus: false },
  { id: 'todo-init-2', text: 'Aufgabe bearbeiten', done: false, isBonus: false },
  { id: 'todo-init-3', text: 'Ergebnisse kontrollieren', done: false, isBonus: false },
  { id: 'todo-init-4', text: 'Zusatzaufgabe lösen', done: false, isBonus: true },
];

/**
 * Erzeugt einen standardmäßigen Ausgangszustand
 */
export function createDefaultTodoState(title: string = 'Arbeitsphase'): ClassroomTodoState {
  return {
    title,
    items: DEFAULT_TODO_ITEMS.map(item => ({ ...item })),
  };
}

/**
 * Berechnet den aktuellen Erledigungsfortschritt
 */
export function calculateTodoProgress(items: ClassroomTodoItem[]) {
  const total = items.length;
  const done = items.filter(item => item.done).length;
  const allDone = total > 0 && done === total;

  const regularItems = items.filter(item => !item.isBonus);
  const bonusItems = items.filter(item => item.isBonus);

  return {
    total,
    done,
    allDone,
    regularTotal: regularItems.length,
    regularDone: regularItems.filter(i => i.done).length,
    bonusTotal: bonusItems.length,
    bonusDone: bonusItems.filter(i => i.done).length,
  };
}

/**
 * Migration bestehender / alter Datenstrukturen (Abwärtskompatibilität ohne Datenverlust)
 */
export function migrateLegacyTodos(rawSettings: any, legacyTodoList?: any[]): ClassroomTodoState {
  // 1. Bereits neue Struktur vorhanden
  if (rawSettings?.todoState && Array.isArray(rawSettings.todoState.items)) {
    return {
      title: typeof rawSettings.todoState.title === 'string' && rawSettings.todoState.title.trim()
        ? rawSettings.todoState.title.trim()
        : 'Arbeitsphase',
      items: rawSettings.todoState.items.map((item: any, idx: number) => ({
        id: String(item.id || `migrated-${idx}-${Date.now()}`),
        text: String(item.text || '').trim() || `Aufgabe ${idx + 1}`,
        done: Boolean(item.done),
        isBonus: Boolean(item.isBonus || item.priority === 'high' || item.priority === 'bonus'),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      })),
    };
  }

  // 2. Ältere rawSettings.todos Liste vorhanden
  if (Array.isArray(rawSettings?.todos)) {
    return {
      title: typeof rawSettings.title === 'string' && rawSettings.title.trim() ? rawSettings.title.trim() : 'Arbeitsphase',
      items: rawSettings.todos.map((item: any, idx: number) => ({
        id: String(item.id || `migrated-${idx}-${Date.now()}`),
        text: String(item.text || '').trim() || `Aufgabe ${idx + 1}`,
        done: Boolean(item.done),
        isBonus: Boolean(item.isBonus),
        createdAt: Date.now(),
      })),
    };
  }

  // 3. Fallback: von übergeordneter State-Variable `todoList` übergeben
  if (Array.isArray(legacyTodoList) && legacyTodoList.length > 0) {
    return {
      title: 'Arbeitsphase',
      items: legacyTodoList.map((item: any, idx: number) => ({
        id: String(item.id || `legacy-${idx}-${Date.now()}`),
        text: String(item.text || '').trim() || `Aufgabe ${idx + 1}`,
        done: Boolean(item.done),
        isBonus: Boolean(item.isBonus || item.priority === 'high'),
        createdAt: Date.now(),
      })),
    };
  }

  // 4. Neuer Initialzustand
  return createDefaultTodoState();
}

/**
 * Schnelles Hinzufügen einer Aufgabe (Text + Enter)
 */
export function addTodoItem(
  state: ClassroomTodoState,
  text: string,
  isBonus: boolean = false
): ClassroomTodoState {
  const trimmed = text.trim();
  if (!trimmed) return state;

  const newItem: ClassroomTodoItem = {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    done: false,
    isBonus,
    createdAt: Date.now(),
  };

  return {
    ...state,
    items: [...state.items, newItem],
  };
}

/**
 * Umschalten des Erledigt-Status (Toggle erledigt / wieder offen)
 */
export function toggleTodoItem(state: ClassroomTodoState, id: string): ClassroomTodoState {
  return {
    ...state,
    items: state.items.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ),
  };
}

/**
 * Text einer Aufgabe korrigieren / bearbeiten
 */
export function updateTodoText(
  state: ClassroomTodoState,
  id: string,
  newText: string
): ClassroomTodoState {
  const trimmed = newText.trim();
  if (!trimmed) return state;

  return {
    ...state,
    items: state.items.map(item =>
      item.id === id ? { ...item, text: trimmed } : item
    ),
  };
}

/**
 * Aufgabe als Zusatzpunkt markieren oder entmarkieren
 */
export function toggleBonusTodo(state: ClassroomTodoState, id: string): ClassroomTodoState {
  return {
    ...state,
    items: state.items.map(item =>
      item.id === id ? { ...item, isBonus: !item.isBonus } : item
    ),
  };
}

/**
 * Aufgabe löschen
 */
export function deleteTodoItem(state: ClassroomTodoState, id: string): ClassroomTodoState {
  return {
    ...state,
    items: state.items.filter(item => item.id !== id),
  };
}

/**
 * Reihenfolge verschieben (hoch / runter)
 */
export function moveTodoItem(
  state: ClassroomTodoState,
  id: string,
  direction: 'up' | 'down'
): ClassroomTodoState {
  const index = state.items.findIndex(item => item.id === id);
  if (index === -1) return state;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.items.length) return state;

  const newItems = [...state.items];
  const [moved] = newItems.splice(index, 1);
  newItems.splice(targetIndex, 0, moved);

  return {
    ...state,
    items: newItems,
  };
}

/**
 * Liste leeren bzw. neue Aufgabenfolge anlegen
 */
export function resetTodoList(state: ClassroomTodoState, newTitle?: string): ClassroomTodoState {
  return {
    title: newTitle !== undefined ? newTitle : state.title,
    items: [],
  };
}

/**
 * Vorlage anwenden
 */
export function applyTodoPreset(presetId: string): ClassroomTodoState {
  const preset = CLASSROOM_TODO_PRESETS.find(p => p.id === presetId);
  if (!preset) return createDefaultTodoState();

  return {
    title: preset.title,
    items: preset.items.map((it, idx) => ({
      id: `preset-${presetId}-${idx}-${Date.now()}`,
      text: it.text,
      done: false,
      isBonus: Boolean(it.isBonus),
      createdAt: Date.now(),
    })),
  };
}
