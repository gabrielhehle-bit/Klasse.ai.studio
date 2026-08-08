import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundaryLogger extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Planungszentrale Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-50 min-h-screen">
          <div className="max-w-3xl mx-auto mt-8 bg-white border border-rose-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 text-rose-600 mb-4">
              <div className="bg-rose-100 p-3 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-bold">Fehler in der Planungszentrale</h2>
            </div>
            <p className="text-slate-600 mb-6 font-medium">
              Beim Laden dieser Ansicht ist ein Problem aufgetreten. Bitte versuche, die Seite neu zu laden.
            </p>
            <div className="bg-slate-900 rounded-2xl p-5 overflow-auto text-sm text-slate-300 font-mono">
              <div className="text-rose-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</div>
              <div className="opacity-80 whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</div>
            </div>
            <button onClick={() => window.location.reload()} className="mt-6 bg-rose-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-rose-700 transition-colors shadow-sm">
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
