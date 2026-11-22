export function schoolLevel(value: unknown): number {
  return value === 2 || value === 3 || value === 4 ? value : 1;
}
export function GradeSelect({level, change}: {level: number; change: (level: number) => void}) {
  return <label className="inline-flex items-center gap-2 text-sm font-bold">Stufe
    <select className="min-h-11 rounded-lg border border-current/30 bg-transparent px-2" value={level} onChange={e => change(Number(e.target.value))}>
      {[1,2,3,4].map(n => <option className="bg-white text-slate-900" key={n}>{n}</option>)}
    </select>
  </label>;
}
