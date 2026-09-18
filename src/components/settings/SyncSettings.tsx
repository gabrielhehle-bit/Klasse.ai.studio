import React, { useState } from 'react';
import { CheckCircle2, Smartphone, WifiOff } from 'lucide-react';
import { stopSyncSession } from '../../lib/syncService';

interface SyncSettingsProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SyncSettings({
  app,
  setApp,
  showToast,
}: SyncSettingsProps) {
  const [isEnding, setIsEnding] = useState(false);
  const boardSettings = app.boardSettings || {};
  const isActive = !!boardSettings.activeSyncCode;
  const isRemote = !!boardSettings.isRemoteController;

  const handleEndSync = async () => {
    if (!boardSettings.activeSyncCode || isEnding) return;
    setIsEnding(true);
    try {
      await stopSyncSession(boardSettings.activeSyncCode);
    } catch {
      // A temporary classroom connection may already have expired server-side.
    } finally {
      setApp((prev: any) => ({
        ...prev,
        boardSettings: {
          ...prev.boardSettings,
          activeSyncCode: undefined,
          isRemoteController: undefined,
          remoteLastActiveTs: undefined,
        },
      }));
      setIsEnding(false);
      showToast('Handy-Verbindung beendet.', 'info');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">Handy-Fernbedienung</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
              Die Handy-Verbindung startest du direkt im Lehrercockpit. Dort auf „Handy“ tippen und den QR-Code mit dem Smartphone scannen.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {isActive ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <div>
                  <div className="text-sm font-black text-slate-800">
                    {isRemote ? 'Dieses Gerät ist als Handy verbunden' : 'Handy-Verbindung aktiv'}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">
                    Verbindungscode {boardSettings.activeSyncCode}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEndSync}
                disabled={isEnding}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {isEnding ? 'Wird beendet …' : 'Verbindung beenden'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <WifiOff size={18} className="text-slate-400" />
              <div>
                <div className="text-sm font-black text-slate-700">Kein Handy verbunden</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">
                  Eine neue Verbindung wird bei Bedarf im Lehrercockpit gestartet.
                </div>
              </div>
            </div>
          )}
        </div>

        {!isRemote && (
          <button
            type="button"
            onClick={() => setApp((prev: any) => ({ ...prev, currentPage: 'cockpit' }))}
            className="mt-4 h-11 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700"
          >
            Lehrercockpit öffnen
          </button>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Die Verbindung ist nur für die laufende Unterrichtssitzung gedacht. Die übertragenen Daten bleiben geschützt; technische Details musst du dafür nicht verwalten.
        </p>
      </div>
    </div>
  );
}
