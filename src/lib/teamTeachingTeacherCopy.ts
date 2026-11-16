import type { TeacherTeamNextAction } from './teacherTeamSetup';

export type TeacherClassRole = 'owner' | 'editor' | 'viewer';

/** Short, factual permission text; never expose the internal role identifiers to teachers. */
export function teacherClassPermission(role: TeacherClassRole): string {
  switch (role) {
    case 'owner': return 'Du verwaltest diese gemeinsame Klasse und kannst sie bearbeiten.';
    case 'editor': return 'Du kannst diese gemeinsame Klasse bearbeiten.';
    case 'viewer': return 'Du kannst die gemeinsame Klasse ansehen, aber nicht bearbeiten.';
  }
}

/** Explain the next concrete step without treating pending or conflicting changes as synced. */
export function teacherClassWorkingStatus(action: TeacherTeamNextAction): string {
  switch (action) {
    case 'ready':
      return 'Die gemeinsame Klasse ist auf diesem Gerät bestätigt. Änderungen werden automatisch abgeglichen.';
    case 'colleague-first-login':
      return 'Deine Klasse ist freigegeben. Es fehlt noch die Anmeldung der zweiten Lehrperson.';
    case 'add-colleague':
      return 'Deine Klasse ist freigegeben. Wähle jetzt die zweite Lehrperson aus.';
    case 'compare-versions':
      return 'Es gibt Änderungen, die noch nicht gemeinsam bestätigt sind. Bitte den Abgleich prüfen.';
    case 'resolve-conflict':
      return 'Die Klasse wurde an mehreren Stellen geändert. Nichts wird automatisch überschrieben.';
    case 'await-device':
      return 'Deine Gerätefreigabe steht noch aus. Eine berechtigte Teamlehrperson muss sie bestätigen.';
    case 'request-device':
      return 'Dieses Gerät darf die Klasse noch nicht öffnen. Bitte eine Freigabe anfordern.';
    case 'checking-device':
      return 'KLASSIO prüft die Freigabe für dieses Gerät.';
    case 'check-connection':
      return 'Die gemeinsame Klasse ist bekannt, aber die Verbindung ist noch nicht bestätigt.';
    case 'reconnect':
      return 'Bitte die vorhandene gemeinsame Klasse erneut öffnen – keine zweite Klasse anlegen.';
    case 'join-invited':
      return 'Du wurdest eingeladen. Öffne die vorhandene gemeinsame Klasse.';
    case 'activate':
      return 'Die Klasse wird noch nicht gemeinsam genutzt.';
    case 'choose-class':
      return 'Bitte zuerst eine Klasse auswählen.';
    case 'sign-in':
      return 'Bitte mit deiner eigenen Schulmail anmelden.';
  }
}
