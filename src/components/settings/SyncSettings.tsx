import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Check, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  QrCode,
  Copy,
  Lock,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  startSyncSession,
  stopSyncSession,
  connectSyncSession,
  createSyncUrl,
  parseSyncHash,
  getActiveEncodedSessionKey,
} from '../../lib/syncService';

interface SyncSettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SyncSettings({
  app,
  setApp,
  showToast
}: SyncSettingsProps) {
  const [syncCode, setSyncCode] = useState('');
  const [sessionKeyInput, setSessionKeyInput] = useState('');
  const [isSyncConnecting, setIsSyncConnecting] = useState(false);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  const boardSettings = app.boardSettings || {};
  const isActiveHost = !!boardSettings.activeSyncCode && !boardSettings.isRemoteController;
  const isActiveRemote = !!boardSettings.activeSyncCode && !!boardSettings.isRemoteController;
  const activeKey = getActiveEncodedSessionKey() || '';
  const currentSyncUrl = boardSettings.activeSyncCode && activeKey
    ? createSyncUrl(boardSettings.activeSyncCode, activeKey)
    : '';

  const handleCreateSync = async () => {
    try {
      const { code, syncUrl } = await startSyncSession(app);
      setApp((p: any) => ({
        ...p,
        boardSettings: {
          ...p.boardSettings,
          activeSyncCode: code,
          isRemoteController: false
        }
      }));
      showToast(`Zero-Knowledge Smartboard-Sitzung gestartet! Code: ${code}`, 'success');
    } catch (e: any) {
      console.error("Failed to start sync session:", e);
      showToast('Sitzung konnte nicht gestartet werden: ' + (e.message || ''), 'error');
    }
  };

  const handleConnectRemote = async () => {
    let code = syncCode.trim().toUpperCase();
    let key = sessionKeyInput.trim();

    // Erkennt, ob der Nutzer einen kompletten Kopplungslink eingefügt hat
    if (code.includes('#') || code.includes('sync=')) {
      const parsed = parseSyncHash(code);
      if (parsed) {
        code = parsed.code;
        key = parsed.encodedKey;
      }
    }

    if (code.length !== 6) {
      setSyncErrorMsg("Bitte einen gültigen 6-stelligen Code eingeben.");
      return;
    }

    if (!key) {
      setSyncErrorMsg("Sitzungsschlüssel erforderlich! Scanne den QR-Code am Smartboard oder füge den Link/Key ein.");
      return;
    }

    setIsSyncConnecting(true);
    setSyncErrorMsg(null);

    try {
      const { decryptedState } = await connectSyncSession(code, key);
      setApp({
        ...decryptedState,
        boardSettings: {
          ...decryptedState.boardSettings,
          activeSyncCode: code,
          isRemoteController: true
        }
      });
      showToast("Erfolgreich als sichere Fernbedienung gekoppelt!", "success");
    } catch (e: any) {
      setSyncErrorMsg("Kopplung fehlgeschlagen: " + (e.message || "Code ungültig oder abgelaufen"));
      showToast("Kopplung fehlgeschlagen. Bitte Code & Key prüfen.", "error");
    } finally {
      setIsSyncConnecting(false);
    }
  };

  const handleEndSync = async () => {
    const code = boardSettings.activeSyncCode;
    await stopSyncSession(code);
    setSyncCode('');
    setSessionKeyInput('');
    setSyncErrorMsg(null);
    setApp((p: any) => ({
      ...p,
      boardSettings: {
        ...p.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined
      }
    }));
    showToast("Sitzung erfolgreich beendet.", "info");
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Zero-Knowledge Live-Fernbedienung & Smartboard-Kopplung</h2>
            <p className="text-xs text-slate-500 font-medium">Steuere deine App kabellos vom Smartphone aus, während das Smartboard das Board anzeigt.</p>
          </div>
        </div>

        <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-100 text-teal-800 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <Lock size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <span>
            <strong>Zero-Knowledge Ende-zu-Ende-Verschlüsselung (Modul B4):</strong> Der Server speichert ausschließlich opaken Chiffretext. Weder Schülerdaten noch Schlüssel landen im Klartext auf dem Server.
          </span>
        </div>
      </div>

      {/* Sync Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: Host Smartboard */}
        <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Option A: Dieses Gerät als Smartboard freigeben
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Erzeugt eine Ende-zu-Ende verschlüsselte Sitzung. Scanne den QR-Code mit der Handy-Kamera, um dich direkt zu verbinden.
            </p>
          </div>

          <div className="pt-2">
            {isActiveHost ? (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} /> Smartboard-Host aktiv
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-[0.625rem] font-black rounded-md">Verschlüsselt</span>
                </div>

                <div className="text-2xl font-mono font-black text-indigo-950 tracking-widest text-center py-2 bg-white rounded-xl border border-indigo-100">
                  {boardSettings.activeSyncCode}
                </div>

                {currentSyncUrl && (
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 flex flex-col items-center justify-center space-y-2">
                    <QRCodeCanvas value={currentSyncUrl} size={150} level="M" />
                    <span className="text-[0.6875rem] font-bold text-slate-500">Mit Smartphone-Kamera scannen</span>
                  </div>
                )}

                {currentSyncUrl && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentSyncUrl);
                      showToast("Verschlüsselter Kopplungs-Link kopiert!", "success");
                    }}
                    className="w-full h-9 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy size={13} /> Link mit Sitzungsschlüssel kopieren
                  </button>
                )}

                <button
                  onClick={handleEndSync}
                  className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Sitzung beenden
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateSync}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Verschlüsselten Kopplungs-Code erstellen
              </button>
            )}
          </div>
        </div>

        {/* Option B: Remote Controller */}
        <div className="bg-white rounded-[2.5rem] border border-stone-200/80 p-6 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-teal-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Option B: Als Fernbedienung koppeln
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Scanne am besten direkt den QR-Code am Smartboard, oder gib den 6-stelligen Code und Sitzungsschlüssel ein.
            </p>
          </div>

          <div className="pt-2">
            {isActiveRemote ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} /> Als Fernbedienung verbunden
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[0.625rem] font-black rounded-md font-mono">
                    {boardSettings.activeSyncCode}
                  </span>
                </div>
                <button
                  onClick={handleEndSync}
                  className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Fernbedienung trennen
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={syncCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSyncCode(val);
                      if (val.includes('#') || val.includes('sync=')) {
                        const parsed = parseSyncHash(val);
                        if (parsed) {
                          setSyncCode(parsed.code);
                          setSessionKeyInput(parsed.encodedKey);
                        }
                      }
                      if (syncErrorMsg) setSyncErrorMsg(null);
                    }}
                    placeholder="Code (z.B. X8J9P1) oder Link einfügen"
                    disabled={isSyncConnecting}
                    className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl text-center text-xs font-mono font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <input
                    type="password"
                    value={sessionKeyInput}
                    onChange={(e) => {
                      setSessionKeyInput(e.target.value);
                      if (syncErrorMsg) setSyncErrorMsg(null);
                    }}
                    placeholder="Sitzungsschlüssel (bei QR-Scan automatisch)"
                    disabled={isSyncConnecting}
                    className="w-full h-11 px-4 bg-slate-50 border border-stone-200 rounded-xl text-center text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  disabled={isSyncConnecting || !syncCode.trim()}
                  onClick={handleConnectRemote}
                  className={`w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    syncCode.trim() && !isSyncConnecting
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'
                      : 'bg-stone-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSyncConnecting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Verschlüsselt Verbinden</span>
                </button>

                {syncErrorMsg && (
                  <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{syncErrorMsg}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
