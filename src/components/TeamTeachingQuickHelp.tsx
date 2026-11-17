import React from 'react';
import type { TeamDeviceAuthorization } from '../hooks/useTeamDeviceAuthorization';

type CheckStep =
  | 'compare'
  | 'different'
  | 'connection'
  | 'from-a'
  | 'from-b'
  | 'problem-a'
  | 'problem-b'
  | 'success';

interface Props {
  sharedClassId?: string;
  serverConfirmed: boolean;
  deviceAuthorization: TeamDeviceAuthorization;
  teamSyncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
}

const describeSync = (status?: Props['teamSyncStatus']): string => {
  switch (status) {
    case 'synced': return 'Team synchronisiert';
    case 'pending': return 'Änderungen noch nicht bestätigt';
    case 'conflict': return 'Unterschiedliche Änderungen';
    case 'error': return 'Verbindung prüfen';
    default: return 'Noch keine Teamverbindung';
  }
};

/**
 * A deliberately manual, read-only two-person check.
 * It never sends test data, changes team membership or declares a backend test successful.
 */
export default function TeamTeachingQuickHelp({
  sharedClassId, serverConfirmed, deviceAuthorization, teamSyncStatus,
}: Props) {
  const [step, setStep] = React.useState<CheckStep>('compare');
  const [showReport, setShowReport] = React.useState(false);
  React.useEffect(() => {
    setStep('compare');
    setShowReport(false);
  }, [sharedClassId]);

  // This is only a short visual comparison, not a password or an access token.
  // Access to the shared class still requires the verified account and device key.
  const teamCode = sharedClassId
    ? sharedClassId.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase()
    : '';
  const canTest = Boolean(
    sharedClassId && serverConfirmed && deviceAuthorization === 'authorized'
    && teamSyncStatus === 'synced',
  );
  const choose = (next: CheckStep) => {
    setStep(next);
    setShowReport(false);
  };
  const deviceMessage = !sharedClassId
    ? 'Auf diesem Gerät ist noch keine gemeinsame Klasse geöffnet. Öffne unter „Mit mir geteilte Klassen“ die vorhandene Klasse. Keine neue erstellen.'
    : deviceAuthorization === 'unauthorized'
    ? 'Dieses Gerät braucht noch eine Freigabe. Hier auf „Freigabe anfordern“ klicken. Die andere Lehrperson bestätigt den Prüfcode.'
    : deviceAuthorization === 'checking' || deviceAuthorization === 'unknown'
      ? 'KLASSIO prüft die Freigabe dieses Geräts. Bitte die Verbindung im Klassenteam prüfen.'
      : !serverConfirmed
        ? 'Die Teamklasse ist noch nicht vom Server bestätigt. Bitte im Klassenteam „Verbindung erneut prüfen“ wählen.'
        : teamSyncStatus === 'conflict'
          ? 'Beide haben unterschiedliche Änderungen. Bitte im Klassenteam „Änderungen zusammenführen“ wählen. Nichts ungeprüft überschreiben.'
          : teamSyncStatus !== 'synced'
            ? 'Bitte warten, bis „Team synchronisiert“ erscheint. Falls das nicht klappt, auf „Jetzt synchronisieren“ klicken.'
            : 'Die Verbindung dieses Geräts ist bereit.';
  const answerA = step === 'problem-a';
  const answerB = step === 'problem-b';
  const report = [
    'KLASSIO Teamtest – Angaben von diesem Gerät',
    'Team-Kurzcode: ' + (teamCode || 'nicht vorhanden'),
    'Team vom Server bestätigt: ' + (serverConfirmed ? 'ja' : 'nein'),
    'Gerätefreigabe: ' + deviceAuthorization,
    'Angezeigter Status: ' + describeSync(teamSyncStatus),
    'Praxistest: ' + (answerA ? 'Änderung von A kam bei B nicht an'
      : answerB ? 'Änderung von B kam bei A nicht an'
        : step === 'different' ? 'Team-Kurzcodes stimmen nicht überein'
          : 'Teamverbindung nicht bestätigt'),
    'Wichtig: Keine Schülerdaten oder Passwörter mitsenden.',
  ].join('\n');

  return (
    <details data-testid="team-help-simple"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <summary className="min-h-11 cursor-pointer text-base font-black text-[var(--text)]">
        Hilfe: Wir sehen nicht dieselbe Klasse
      </summary>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-[var(--text2)]">
        <p>Setzt euch mit beiden Geräten nebeneinander. Ihr braucht <strong>zwei eigene Schul-E-Mail-Adressen</strong>, aber nur <strong>eine gemeinsame Klasse</strong>.</p>

        <div className="space-y-2 rounded-xl bg-[var(--surface2)] p-4">
          <h3 className="font-black text-[var(--text)]">Zuerst gemeinsam einrichten</h3>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><strong>A:</strong> Bestehende Klasse öffnen → „Klassenteam“ → „Diese Klasse gemeinsam nutzen“.</li>
            <li><strong>B:</strong> Mit der eigenen Schulmail in KLASSIO anmelden. <strong>Keine zweite Klasse erstellen.</strong></li>
            <li><strong>A:</strong> B im Klassenteam aus der Liste auswählen.</li>
            <li><strong>B:</strong> „Klasse öffnen“ wählen. Falls eine Gerätefreigabe erscheint, bestätigt A den Prüfcode.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4" data-testid="team-help-identity">
          <p className="font-black text-[var(--text)]">Team-Kurzcode auf diesem Gerät</p>
          <p className="mt-1 font-mono text-xl font-black tracking-[0.12em] text-[var(--text)]" aria-label="Team-Kurzcode">
            {teamCode || 'NOCH KEINER'}
          </p>
          <p className="mt-1 text-xs">Vergleicht die Codes auf beiden Geräten. Der Klassenname allein reicht nicht: Es könnten zwei getrennte Klassen mit gleichem Namen sein.</p>
          <p className="mt-2 text-xs font-semibold">Status dieses Geräts: {describeSync(teamSyncStatus)}</p>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--border)] p-4" aria-live="polite" data-testid="team-help-guided-test">
          {step === 'compare' && (
            <>
              <h3 className="font-black text-[var(--text)]">1. Seht ihr denselben Team-Kurzcode?</h3>
              <p>Schaut bei A und B nach. Sind die Codes gleich?</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => choose(canTest ? 'from-a' : 'connection')}
                  className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Ja, gleich</button>
                <button type="button" onClick={() => choose('different')}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 py-2.5 font-bold text-[var(--text)]">Nein / kein Code</button>
              </div>
            </>
          )}

          {step === 'different' && (
            <>
              <h3 className="font-black text-[var(--text)]">Ihr seid noch nicht in derselben Teamklasse.</h3>
              <p>Öffnet beide „Klassenteam“. A fügt B zur <strong>bestehenden</strong> Klasse hinzu. B öffnet unter „Mit mir geteilte Klassen“ genau diese Klasse. Bitte <strong>keine neue Klasse anlegen und nichts löschen.</strong></p>
              <button type="button" onClick={() => choose('compare')}
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Codes erneut vergleichen</button>
            </>
          )}

          {step === 'connection' && (
            <>
              <h3 className="font-black text-[var(--text)]">Zuerst die Verbindung fertigstellen</h3>
              <p>{deviceMessage}</p>
              <p>Erst wenn auf <strong>beiden</strong> Geräten „Team synchronisiert“ steht, testen wir eine Änderung.</p>
              <button type="button" onClick={() => choose('compare')}
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Erneut prüfen</button>
            </>
          )}

          {step === 'from-a' && (
            <>
              <h3 className="font-black text-[var(--text)]">2. Kommt die Änderung von A bei B an?</h3>
              <p><strong>A</strong> schreibt „TEAMTEST A“ in ein <strong>freies</strong> Feld im Wochenplan und speichert. <strong>B</strong> schaut im selben Wochenplan nach, ohne selbst etwas zu ändern.</p>
              <p>Wartet, bis der Teamstatus den Abgleich bestätigt. Sieht B den Eintrag?</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => choose('from-b')}
                  className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Ja, B sieht es</button>
                <button type="button" onClick={() => choose('problem-a')}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 py-2.5 font-bold text-[var(--text)]">Nein</button>
              </div>
            </>
          )}

          {step === 'from-b' && (
            <>
              <h3 className="font-black text-[var(--text)]">3. Kommt die Änderung von B bei A an?</h3>
              <p><strong>B</strong> schreibt „TEAMTEST B“ in ein <strong>anderes freies</strong> Feld und speichert. <strong>A</strong> schaut nach, ohne selbst etwas zu ändern.</p>
              <p>Sieht A den zweiten Eintrag?</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => choose('success')}
                  className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Ja, A sieht es</button>
                <button type="button" onClick={() => choose('problem-b')}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 py-2.5 font-bold text-[var(--text)]">Nein</button>
              </div>
            </>
          )}

          {(answerA || answerB) && (
            <>
              <h3 className="font-black text-[var(--text)]">Eine Änderung fehlt noch.</h3>
              <p>Auf <strong>beiden</strong> Geräten „Klassenteam“ öffnen und „Jetzt synchronisieren“ wählen. Prüft den Teamstatus. Bei „Konflikt“ bitte die Änderungen vergleichen, <strong>nichts überschreiben.</strong></p>
              <p>Ist der Testeintrag danach immer noch nicht sichtbar, öffnet unten den kurzen Fehlerbericht und schickt ihn an die KLASSIO-Betreuung – ohne Schülerdaten oder Passwörter.</p>
              <button type="button" onClick={() => choose(answerA ? 'from-a' : 'from-b')}
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-bold text-white">Nochmals nachsehen</button>
            </>
          )}

          {step === 'success' && (
            <>
              <h3 className="font-black text-[var(--text)]">Euer Teamtest hat funktioniert.</h3>
              <p>Ihr habt selbst bestätigt, dass die Änderungen in beide Richtungen angekommen sind. Entfernt die beiden TEST-Einträge anschließend und prüft, ob auch das auf beiden Geräten erscheint.</p>
            </>
          )}
        </div>

        {['different', 'connection', 'problem-a', 'problem-b'].includes(step) && (
          <div className="space-y-2">
            <button type="button" onClick={() => setShowReport(value => !value)}
              aria-expanded={showReport}
              className="min-h-11 rounded-lg border border-[var(--border)] px-3 py-2 font-bold text-[var(--text)]">
              {showReport ? 'Fehlerbericht schließen' : 'Kurzen Fehlerbericht anzeigen'}
            </button>
            {showReport && (
              <>
                <p className="text-xs">Diesen Text könnt ihr kopieren und an die KLASSIO-Betreuung schicken. Er enthält keine Schülerdaten.</p>
                <textarea readOnly aria-label="KLASSIO Teamtest Fehlerbericht" rows={8} value={report}
                  onFocus={event => event.currentTarget.select()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3 font-mono text-xs text-[var(--text)]" />
              </>
            )}
          </div>
        )}

        {step !== 'compare' && (
          <button type="button" onClick={() => choose('compare')}
            className="min-h-10 text-sm font-semibold underline underline-offset-4">Test von vorne beginnen</button>
        )}
      </div>
    </details>
  );
}
