import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  createVault,
  unlockVault,
  unlockVaultWithRecoveryCode,
  MIN_PASSWORD_LENGTH,
  type VaultRecordV1,
} from '../lib/vaultService';
import {
  saveVaultRecord,
  loadVaultRecord,
  setActiveVaultSession,
  getActiveVaultKey,
} from '../lib/vaultStorage';
import {
  rememberTrustedDevice,
  tryUnlockTrustedDevice,
} from '../lib/trustedDeviceVault';
import {
  hasLegacyPlaintextData,
  migrateLegacyStorageToEncrypted,
  isEncryptedLocalState,
} from '../lib/secureStorageService';
import { fetchAccountSyncSnapshot, hasEmailAccountSession } from '../lib/accountSyncService';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';

interface VaultGateProps {
  children: React.ReactNode;
}

export default function VaultGate({ children }: VaultGateProps) {
  const { isVaultUnlocked, unlockAppVault } = useApp();
  const { showToast } = useToast();

  const [gateState, setGateState] = useState<'checking' | 'needs_setup' | 'locked' | 'unlocked'>(() => {
    if (getActiveVaultKey() !== null) return 'unlocked';
    return 'checking';
  });
  const [hasLegacyData, setHasLegacyData] = useState<boolean>(false);

  // Setup Form State
  const [setupStep, setSetupStep] = useState<'password' | 'recovery_code'>('password');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const [tempVaultRecord, setTempVaultRecord] = useState<VaultRecordV1 | null>(null);
  const [tempVaultKey, setTempVaultKey] = useState<CryptoKey | null>(null);
  const [codeConfirmed, setCodeConfirmed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Unlock Form State
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [useRecoveryMode, setUseRecoveryMode] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Status-Check bei App-Start & Statusänderungen
  useEffect(() => {
    let isMounted = true;
    async function checkVaultStatus() {
      try {
        const activeKey = getActiveVaultKey();
        if (activeKey) {
          if (!isVaultUnlocked) {
            await unlockAppVault(activeKey);
          }
          if (isMounted) setGateState('unlocked');
          return;
        }

        const record = await loadVaultRecord();
        const legacyExists = await hasLegacyPlaintextData();

        if (!isMounted) return;
        setHasLegacyData(legacyExists);

        if (!record) {
          // Auf einem neuen Gerät zuerst prüfen, ob zum angemeldeten E-Mail-Konto
          // bereits ein verschlüsselter Tresor auf dem Klassio-Server liegt.
          const hasAccount = await hasEmailAccountSession();
          if (hasAccount) {
            try {
              const remote = await fetchAccountSyncSnapshot();
              if (remote?.vaultRecord) {
                await saveVaultRecord(remote.vaultRecord);
                if (isMounted) {
                  setErrorMessage(null);
                  setGateState('locked');
                }
                return;
              }
            } catch (cloudError) {
              console.error('[AccountSync] Remote-Tresor konnte nicht geprüft werden:', cloudError);
              if (isMounted) {
                setErrorMessage(
                  'Dein verschlüsselter Kontostand konnte gerade nicht vom Server geladen werden. ' +
                  'Zur Sicherheit wird kein neuer Tresor angelegt. Bitte Verbindung prüfen und erneut versuchen.'
                );
                setGateState('checking');
              }
              return;
            }
          }

          setGateState('needs_setup');
          return;
        }

        if (isVaultUnlocked) {
          setGateState('unlocked');
          return;
        }

        const trustedKey = await tryUnlockTrustedDevice(record);
        if (trustedKey) {
          setActiveVaultSession(trustedKey, record);
          const success = await unlockAppVault(trustedKey);
          if (success) {
            if (isMounted) setGateState('unlocked');
            return;
          }
        }

        if (isMounted) setGateState('locked');
      } catch (err: any) {
        console.error('Fehler bei Vault-Status-Prüfung:', err);
        if (!isMounted) return;
        if (err?.code === 'SESSION_STATUS_UNAVAILABLE' || err?.code === 'SESSION_STATUS_INVALID') {
          setErrorMessage(
            'Klassio kann dein E-Mail-Konto gerade nicht erreichen. Zur Sicherheit wird auf diesem Gerät kein neuer Tresor angelegt. Bitte Verbindung prüfen und erneut versuchen.'
          );
          setGateState('checking');
          return;
        }
        setGateState('locked');
      }
    }

    checkVaultStatus();
    return () => {
      isMounted = false;
    };
  }, [isVaultUnlocked, unlockAppVault]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // 1. SETUP: Tresor erstellen (Schritt 1: Passwort prüfen & Schlüssel generieren)
  const handleGenerateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
      triggerShake();
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('Die Passwörter stimmen nicht überein.');
      triggerShake();
      return;
    }

    setIsProcessing(true);
    try {
      // Erzeugt den VaultRecord, den VaultKey (CryptoKey) und den 128-Bit Recovery-Code
      const result = await createVault(password, trustThisDevice);
      setTempVaultRecord(result.vaultRecord);
      setTempVaultKey(result.vaultKey);
      setGeneratedRecoveryCode(result.recoveryCode);
      setSetupStep('recovery_code');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Fehler beim Erstellen des Datentresors.');
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  };

  // 1b. SETUP: Recovery-Code bestätigen & Daten atomar migrieren/speichern
  const handleFinalizeSetup = async () => {
    if (!tempVaultRecord || !tempVaultKey) return;
    if (!codeConfirmed) {
      setErrorMessage('Bitte bestätige, dass du den Wiederherstellungscode gesichert hast.');
      triggerShake();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // 1. VaultRecord persistent in IndexedDB speichern
      await saveVaultRecord(tempVaultRecord);

      // 2. Optional: VaultKey auf diesem persönlichen Gerät verschlüsselt merken.
      // Der aktive Sitzungsschlüssel wird danach wieder nicht exportierbar gehalten.
      let activeVaultKey = tempVaultKey;
      if (trustThisDevice) {
        try {
          activeVaultKey = await rememberTrustedDevice(tempVaultRecord, tempVaultKey);
        } catch (error) {
          console.warn('[Datenschutz] Gerätevertrauen konnte nicht gespeichert werden:', error);
          activeVaultKey = await unlockVault(tempVaultRecord, password, false);
          showToast('Tresor eingerichtet, aber dieses Gerät konnte nicht als vertrauenswürdig gespeichert werden.', 'info');
        }
      }
      setActiveVaultSession(activeVaultKey, tempVaultRecord);

      // 3. Wenn Altdaten vorhanden sind: Atomare Migration durchführen
      if (hasLegacyData) {
        const migrationResult = await migrateLegacyStorageToEncrypted(tempVaultKey);
        if (!migrationResult.success) {
          throw new Error(migrationResult.error || 'Migration der Altdaten fehlgeschlagen.');
        }
        showToast('Bestehende Daten wurden erfolgreich verschlüsselt!', 'success');
      }

      // 4. AppState im React-Kontext entsperren und laden
      await unlockAppVault(activeVaultKey);
      setGateState('unlocked');
      showToast('Datentresor erfolgreich eingerichtet! 🔐', 'success');
    } catch (err: any) {
      console.error('Setup Finalisierung fehlgeschlagen:', err);
      setErrorMessage(err?.message || 'Fehler beim Abschließen der Einrichtung.');
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. UNLOCK: Tresor mit Passwort entsperren
  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!unlockPassword) {
      setErrorMessage('Bitte gib dein Tresor-Passwort ein.');
      triggerShake();
      return;
    }

    setIsProcessing(true);
    try {
      const record = await loadVaultRecord();
      if (!record) {
        throw new Error('Kein gespeicherter Datentresor gefunden.');
      }

      // Entsperren & Schlüssel ableiten (PBKDF2-SHA-256)
      let vaultKey = await unlockVault(record, unlockPassword, trustThisDevice);
      if (trustThisDevice) {
        try {
          vaultKey = await rememberTrustedDevice(record, vaultKey);
        } catch (error) {
          console.warn('[Datenschutz] Gerätevertrauen konnte nicht gespeichert werden:', error);
          vaultKey = await unlockVault(record, unlockPassword, false);
          showToast('Entsperrt, aber dieses Gerät konnte nicht dauerhaft als vertrauenswürdig gespeichert werden.', 'info');
        }
      }

      // Session im flüchtigen RAM aktivieren
      setActiveVaultSession(vaultKey, record);

      // Lokalen verschlüsselten AppState laden & entschlüsseln
      const success = await unlockAppVault(vaultKey);
      if (!success) {
        throw new Error('Die lokalen Daten konnten nicht entschlüsselt werden.');
      }

      setGateState('unlocked');
      showToast('Datentresor entsperrt.', 'info');
    } catch (err: any) {
      console.warn('Unlock fehlgeschlagen:', err);
      if (err?.code === 'DECRYPTION_FAILED' || err?.message?.includes('Passwort')) {
        setErrorMessage('Tresor-Passwort ist nicht korrekt. Bitte erneut versuchen.');
      } else {
        setErrorMessage(err?.message || 'Entsperren fehlgeschlagen.');
      }
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. RECOVERY: Tresor mit 128-Bit Recovery-Code entsperren
  const handleUnlockWithRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recoveryCodeInput.trim()) {
      setErrorMessage('Bitte gib deinen 128-Bit Wiederherstellungscode ein.');
      triggerShake();
      return;
    }

    setIsProcessing(true);
    try {
      const record = await loadVaultRecord();
      if (!record) {
        throw new Error('Kein gespeicherter Datentresor gefunden.');
      }

      let vaultKey = await unlockVaultWithRecoveryCode(record, recoveryCodeInput.trim(), trustThisDevice);
      if (trustThisDevice) {
        try {
          vaultKey = await rememberTrustedDevice(record, vaultKey);
        } catch (error) {
          console.warn('[Datenschutz] Gerätevertrauen konnte nicht gespeichert werden:', error);
          vaultKey = await unlockVaultWithRecoveryCode(record, recoveryCodeInput.trim(), false);
          showToast('Wiederhergestellt, aber dieses Gerät konnte nicht dauerhaft als vertrauenswürdig gespeichert werden.', 'info');
        }
      }
      setActiveVaultSession(vaultKey, record);

      const success = await unlockAppVault(vaultKey);
      if (!success) {
        throw new Error('Die lokalen Daten konnten nicht entschlüsselt werden.');
      }

      setGateState('unlocked');
      showToast('Tresor mit Wiederherstellungscode entsperrt.', 'success');
    } catch (err: any) {
      console.warn('Recovery fehlgeschlagen:', err);
      setErrorMessage('Ungültiger Wiederherstellungscode oder Authentifizierungsfehler.');
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  };

  const copyRecoveryCode = async () => {
    if (!generatedRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(generatedRecoveryCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
      showToast('Wiederherstellungscode in die Zwischenablage kopiert.', 'info');
    } catch {
      showToast('Kopieren fehlgeschlagen. Bitte manuell notieren.', 'error');
    }
  };

  // Wenn der Tresor entsperrt ist, rendern wir die App normal
  if (gateState === 'unlocked') {
    return <>{children}</>;
  }

  // Ladezustand
  if (gateState === 'checking') {
    return (
      <div className="min-h-screen w-full bg-[var(--surface-bg,var(--surface))] flex flex-col items-center justify-center gap-4 px-6 text-center text-[var(--text-primary)]">
        {!errorMessage && <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />}
        <div className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-widest font-semibold">
          {errorMessage ? 'Kontostand nicht erreichbar' : 'Prüfe Datentresor...'}
        </div>
        {errorMessage && (
          <>
            <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
            >
              Erneut versuchen
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--surface-bg,var(--surface))] flex items-center justify-center p-4">
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[var(--surface-card,var(--surface))] border border-[var(--border,var(--border-subtle))] backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 text-[var(--text-primary)]"
      >
        {/* Header-Bereich */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mb-4 shadow-inner">
            {gateState === 'needs_setup' ? (
              <ShieldCheck className="w-7 h-7 text-[var(--accent)]" />
            ) : (
              <Lock className="w-7 h-7 text-[var(--accent)]" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {gateState === 'needs_setup' ? 'Lokalen Datentresor einrichten' : 'Lokaler Datentresor gesperrt'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs leading-relaxed">
            Lokale Schülerdaten werden verschlüsselt gespeichert.
          </p>
        </div>

        {/* Fehlermeldung */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-500 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SETUP FLOW: Erstmalige Einrichtung */}
        {/* ==================================================== */}
        {gateState === 'needs_setup' && setupStep === 'password' && (
          <form onSubmit={handleGenerateVault} className="space-y-4">
            {hasLegacyData && (
              <div className="p-3 bg-[var(--accent-soft)] border border-[var(--accent)]/25 rounded-xl flex items-start gap-2.5 text-[var(--text-primary)] text-xs">
                <FileCheck2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
                <p className="leading-snug">
                  Bestehende lokale Daten gefunden. Sie werden nach der Tresor-Erstellung atomar verschlüsselt.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Tresor-Passwort vergeben
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
                  required
                  className="w-full bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Passwort bestätigen
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Passwort wiederholen"
                required
                className="w-full bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs leading-snug text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Diesem persönlichen Gerät 30 Tage vertrauen.</strong>
                {' '}Dann wird der Tresor nach einem Neuladen automatisch entsperrt. Nur auf einem geschützten eigenen Dienstgerät verwenden.
              </span>
            </label>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full mt-2 bg-[var(--accent)] hover:brightness-110 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Weiter zum Wiederherstellungscode</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* SETUP: Schritt 2 - Recovery Code anzeigen & bestätigen */}
        {gateState === 'needs_setup' && setupStep === 'recovery_code' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-600 dark:text-amber-200 text-xs">
              <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <p className="leading-snug">
                Notiere diesen 128-Bit Wiederherstellungscode sorgfältig. Solltest du dein Passwort vergessen, ist dieser Code der einzige Weg, deinen Tresor wiederherzustellen.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Dein einmaliger Wiederherstellungscode
              </label>
              <div className="bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] rounded-xl p-3 font-mono text-center text-sm font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 select-all break-all">
                {generatedRecoveryCode}
              </div>
              <button
                type="button"
                onClick={copyRecoveryCode}
                className="mt-2 w-full py-1.5 px-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {codeCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{codeCopied ? 'Code kopiert!' : 'In Zwischenablage kopieren'}</span>
              </button>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--text-secondary)] select-none">
                <input
                  type="checkbox"
                  checked={codeConfirmed}
                  onChange={(e) => setCodeConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                />
                <span className="leading-snug">
                  Ich habe den Wiederherstellungscode sicher notiert oder an einem sicheren Ort gespeichert.
                </span>
              </label>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSetupStep('password')}
                className="w-1/3 py-2.5 px-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={handleFinalizeSetup}
                disabled={!codeConfirmed || isProcessing}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Einrichtung abschließen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* UNLOCK FLOW: Tresor entsperren */}
        {/* ==================================================== */}
        {gateState === 'locked' && !useRecoveryMode && (
          <form onSubmit={handleUnlockWithPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Tresor-Passwort
              </label>
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  autoFocus
                  required
                  className="w-full bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs leading-snug text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Auf diesem persönlichen Gerät 30 Tage entsperrt bleiben.</strong>
                {' '}Der Vault-Key wird nur verschlüsselt und mit einem nicht exportierbaren Geräteschlüssel im Browser gespeichert.
              </span>
            </label>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[var(--accent)] hover:brightness-110 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock size={16} />
                  <span>Tresor entsperren</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryMode(true);
                  setErrorMessage(null);
                }}
                className="text-xs text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer"
              >
                Passwort vergessen? Mit Wiederherstellungscode entsperren
              </button>
            </div>
          </form>
        )}

        {/* UNLOCK: Recovery Code Modus */}
        {gateState === 'locked' && useRecoveryMode && (
          <form onSubmit={handleUnlockWithRecoveryCode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Wiederherstellungscode
              </label>
              <input
                type="text"
                value={recoveryCodeInput}
                onChange={(e) => setRecoveryCodeInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                autoFocus
                required
                className="w-full bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-subtle,var(--surface))] border border-[var(--border)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs leading-snug text-[var(--text-secondary)]">
                Diesem persönlichen Gerät nach der Wiederherstellung 30 Tage vertrauen.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryMode(false);
                  setErrorMessage(null);
                }}
                className="w-1/3 py-2.5 px-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Zurück
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-2/3 bg-amber-600 hover:bg-amber-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Mit Code entsperren</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer-Info */}
        <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
            <Shield size={12} className="text-[var(--text-muted)]" />
            AES-GCM-256 · optionales Gerätevertrauen speichert keinen Klartext-Schlüssel
          </span>
        </div>
      </motion.div>
    </div>
  );
}
