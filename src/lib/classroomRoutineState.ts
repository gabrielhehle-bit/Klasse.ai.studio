/** Reconcile a persisted fair round with today's actual class roster. */
export function reconcileFairCallRound(raw: Record<string, any>, scopeKey: string, presentIds: string[], rosterIds: string[] = presentIds) {
  const present = [...new Set(presentIds)];
  const roster = new Set(rosterIds);
  const valid = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && roster.has(id)))] : [];
  const sameScope = !raw.roundScope || raw.roundScope === scopeKey;
  const calledIds = sameScope ? valid(raw.calledIds) : [];
  const pausedIds = sameScope ? valid(raw.pausedIds).filter(id => !calledIds.includes(id)) : [];
  const remainingIds = sameScope ? valid(raw.remainingIds).filter(id => !calledIds.includes(id)) : [];
  for (const id of present) if (!calledIds.includes(id) && !remainingIds.includes(id)) remainingIds.push(id);
  const currentId = sameScope && calledIds.includes(raw.currentId) ? raw.currentId as string : null;
  return { calledIds, pausedIds, remainingIds, currentId, roundScope: scopeKey };
}

export function isFairCallRoundComplete(calledIds: string[], remainingIds: string[], presentIds: string[]) {
  return presentIds.length > 0 && !remainingIds.some(id => presentIds.includes(id)) && presentIds.every(id => calledIds.includes(id));
}
