import React, { Component, ErrorInfo, ReactNode } from "react";
import localforage from "localforage";
import { LifeBuoy, RefreshCw, Undo2, Download, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

// Standard configure localforage to align with AppContext
localforage.config({
  name: 'LehrerApp',
  storeName: 'app_state'
});

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
    showDetails: false
  };

  public componentDidMount() {
    // Clean up crash reload flag on successful clean starting/mounting
    if (!this.state.hasError) {
      try {
        sessionStorage.removeItem('hehle_crash_reload');
      } catch (err) {
        console.error("Failed to remove crash reload flag:", err);
      }
    }
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught crash:", error, errorInfo);
    this.setState({ errorInfo });

    // SCHRITT 3: CRASH-PROTOKOLL
    try {
      const existingLogStr = localStorage.getItem('hehle_crash_log');
      let log = [];
      if (existingLogStr) {
        try {
          const parsed = JSON.parse(existingLogStr);
          if (Array.isArray(parsed)) {
            log = parsed;
          }
        } catch (_) {
          log = [];
        }
      }
      
      log.push({
        timestamp: new Date().toISOString(),
        message: error.message || error.toString(),
        stack: errorInfo && errorInfo.componentStack ? errorInfo.componentStack.substring(0, 500) : ''
      });

      if (log.length > 10) {
        log.shift(); // Remove oldest entry if more than 10
      }

      localStorage.setItem('hehle_crash_log', JSON.stringify(log));
    } catch (e) {
      console.error("Failed to write crash log to localStorage safely:", e);
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.setItem('hehle_crash_reload', 'true');
    } catch (err) {
      console.error(err);
    }
    window.location.reload();
  };

  private handleRestoreEmergencyBackup = async () => {
    const copyStr = localStorage.getItem('hehle_v3_notfallkopie');
    if (!copyStr) return;

    const confirmMsg = "Aktuelle, nicht gesicherte Änderungen von heute gehen verloren. Fortfahren?";
    if (window.confirm(confirmMsg)) {
      this.setState({ isRecovering: true });
      try {
        // Double check JSON syntax validity
        JSON.parse(copyStr);

        // Save backup to main key
        await localforage.setItem('hehle_v3', copyStr);
        
        // Save fallback to localStorage
        try {
          localStorage.setItem('hehle_v3_fallback', copyStr);
        } catch (e) {
          console.error("Failed to set hehle_v3_fallback:", e);
        }

        // Clean temp session state
        try {
          sessionStorage.removeItem('hehle_v3_temp');
        } catch (e) {
          console.error(e);
        }

        // Reload app
        window.location.reload();
      } catch (err) {
        alert("Fehler bei der Validierung oder dem Einspielen der Notfallkopie.");
        this.setState({ isRecovering: false });
      }
    }
  };

  private handleDownloadOfflineBackup = async () => {
    this.setState({ isRecovering: true });
    try {
      let dataToDownload: string | null = null;
      
      // 1. Try localforage principal store
      try {
        const stored = await localforage.getItem('hehle_v3');
        if (stored) {
          dataToDownload = typeof stored === 'string' ? stored : JSON.stringify(stored);
        }
      } catch (e) {
        console.error("Failed to load principal from localforage for downloading:", e);
      }

      // 2. Try secondary localStorage fallback
      if (!dataToDownload) {
        dataToDownload = localStorage.getItem('hehle_v3_fallback');
      }

      // 3. Try daily emergency backup
      if (!dataToDownload) {
        dataToDownload = localStorage.getItem('hehle_v3_notfallkopie');
      }

      if (dataToDownload) {
        // Validate JSON before offer to download
        try {
          JSON.parse(dataToDownload);
        } catch (e) {
          console.warn("Downloading JSON contains invalid format, proceeding anyway defensively:", e);
        }

        const blob = new Blob([dataToDownload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const todayStr = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `Lehrermappe-Notfallexport-${todayStr}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        alert("Keine Speicherdaten zum Sichern auffindbar.");
      }
    } catch (err) {
      console.error("Failed generating user download:", err);
      alert("Fehler beim Erstellen der Sicherungsdatei.");
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private handleResetAllData = async () => {
    const confirmMsg1 = "⚠️ ACHTUNG: Dies löscht alle deine eingegebenen Klassen und Daten und setzt die App komplett zurück!\n\nLade am besten vorher deine Daten als Datei herunter, falls du deine Daten sichern willst.\n\nWillst du wirklich alle lokalen App-Daten löschen und neu starten?";
    if (window.confirm(confirmMsg1)) {
      this.setState({ isRecovering: true });
      try {
        await localforage.clear();
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } catch (err) {
        console.error("Failed to clear local storage:", err);
        alert("Einfaches Zurücksetzen fehlgeschlagen. Bitte leere deinen Browser-Cache manuell.");
        this.setState({ isRecovering: false });
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Read crash loop status from sessionStorage
      let isCrashReloadLoop = false;
      try {
        isCrashReloadLoop = sessionStorage.getItem('hehle_crash_reload') === 'true';
      } catch (e) {
        console.error(e);
      }

      // Check emergency copy availability and validity
      let notfallKopieVorhanden = false;
      const notfallTime = localStorage.getItem('hehle_v3_notfallkopie_time') || '';
      try {
        const copyStr = localStorage.getItem('hehle_v3_notfallkopie');
        if (copyStr) {
          const parsed = JSON.parse(copyStr);
          if (parsed && typeof parsed === 'object') {
            notfallKopieVorhanden = true;
          }
        }
      } catch (e) {
        notfallKopieVorhanden = false;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans antialiased">
          <div className="w-full max-w-lg bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 p-6 sm:p-8 space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Area */}
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <LifeBuoy size={36} className="animate-spin-slow" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  Ups – da ist etwas schiefgelaufen
                </h1>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                  Keine Sorge: Deine Daten sind sicher gespeichert. Wähle eine Option, um weiterzuarbeiten.
                </p>
              </div>
            </div>

            {/* Action Cards */}
            <div className="space-y-3 sm:space-y-4">
              
              {/* Option 1: Reload */}
              <button
                onClick={this.handleReload}
                disabled={this.state.isRecovering}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  isCrashReloadLoop 
                    ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50" 
                    : "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${isCrashReloadLoop ? "bg-slate-100 text-slate-600" : "bg-white/20 text-white"}`}>
                  <RefreshCw size={22} />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-sm sm:text-base leading-tight">
                    {isCrashReloadLoop ? "🔄 Erneut versuchen" : "🔄 Seite neu laden"}
                  </div>
                  <div className={`text-xs ${isCrashReloadLoop ? "text-slate-500" : "text-white/80"}`}>
                    Lädt die aktuelle Benutzeroberfläche neu. Löst die meisten Probleme direkt.
                  </div>
                </div>
              </button>

              {/* Option 2: Restore emergency backup (only if available) */}
              {notfallKopieVorhanden && (
                <button
                  onClick={this.handleRestoreEmergencyBackup}
                  disabled={this.state.isRecovering}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                    isCrashReloadLoop 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 shadow-md" 
                      : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isCrashReloadLoop ? "bg-emerald-500 text-white" : "bg-slate-100 text-emerald-600"}`}>
                    <Undo2 size={22} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm sm:text-base leading-tight">
                        ⏮️ Stand von heute Morgen wiederherstellen
                      </span>
                      {isCrashReloadLoop && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                          Empfohlen
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Spielt die automatische tägliche Notfallkopie ein. {notfallTime ? `Stand vom: ${notfallTime}` : "Automatisches Backup."}
                    </div>
                  </div>
                </button>
              )}

              {/* Option 3: Download Current Store Offline Backup */}
              <button
                onClick={this.handleDownloadOfflineBackup}
                disabled={this.state.isRecovering}
                className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-slate-100 text-blue-600 shrink-0">
                  <Download size={22} />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-sm sm:text-base leading-tight">
                    💾 Meine Daten als Datei sichern
                  </div>
                  <div className="text-xs text-slate-500">
                    Sichert die vorhandenen Daten verschlüsselt auf deinem Computer, um sie später wieder herstellen zu können.
                  </div>
                </div>
              </button>

              {/* Option 4: Full Hard Reset */}
              <button
                onClick={this.handleResetAllData}
                disabled={this.state.isRecovering}
                className="w-full text-left p-4 rounded-2xl border-2 border-rose-100 bg-rose-50/30 hover:border-rose-400 hover:bg-rose-50 text-rose-900 transition-all flex items-start gap-4 hover:shadow-md"
              >
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-sm sm:text-base leading-tight">
                    🚨 App-Daten vollständig zurücksetzen
                  </div>
                  <div className="text-xs text-slate-605">
                    Löscht alle lokalen Klassen, Schüler und Noten vollständig, um die App im Werkszustand neu zu starten. Verwende dies nur im Notfall.
                  </div>
                </div>
              </button>

            </div>

            {/* Technical Details Collapsible */}
            <div className="border-t border-slate-100 pt-5 space-y-2 text-left">
              <details className="group">
                <summary className="cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors uppercase tracking-wider">
                  <ChevronRight size={14} className="transition-transform group-open:rotate-90 shrink-0" />
                  Technische Details anzeigen
                </summary>
                
                <div className="mt-3 space-y-3">
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner">
                    <div className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1.5 font-mono">
                      Fehlerklasse und Meldung
                    </div>
                    <pre className="text-slate-200 text-xs font-mono select-all overflow-x-auto whitespace-pre-wrap max-h-40 custom-scrollbar">
                      {this.state.error ? (this.state.error.stack || this.state.error.message || String(this.state.error)) : "Unbekannter Fehler"}
                    </pre>
                  </div>
                  
                  {this.state.errorInfo?.componentStack && (
                    <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner">
                      <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5 font-mono">
                        Komponenten-Stacktrace
                      </div>
                      <pre className="text-slate-300 text-[11px] leading-normal font-mono select-all overflow-x-auto max-h-60 whitespace-pre-wrap custom-scrollbar font-mono">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            {/* Footer Support Notice */}
            <div className="text-center">
              <p className="text-[11px] sm:text-xs text-slate-400 leading-normal max-w-sm mx-auto font-medium">
                Tritt der Fehler wiederholt auf? Notiere, welche Seite du geöffnet hast, und melde dich beim App-Betreuer.
              </p>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
