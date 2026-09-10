export interface TafelCommand {
  id: string;
  classId: string;
  open: boolean;
  createdAt: number;
}

export function createTafelCommand(classId: string, open: boolean): TafelCommand {
  return { id: crypto.randomUUID(), classId, open, createdAt: Date.now() };
}

/** Stored open flags are not user actions. Only a new command for this classroom applies. */
export function shouldApplyTafelCommand(command: TafelCommand | undefined, classId: string, enteredAt: number, lastId: string | undefined, now = Date.now()): boolean {
  return !!command && command.id !== lastId && command.classId === classId &&
    command.createdAt >= enteredAt && command.createdAt <= now + 30_000 &&
    now - command.createdAt <= 30_000;
}
