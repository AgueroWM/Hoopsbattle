import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, we'd log this to Sentry or similar
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || 'Unknown error';

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-8 font-sans">
            <div className="max-w-lg text-center">
                <div className="text-6xl mb-4">🤕</div>
                <h1 className="text-3xl font-bold text-red-500 mb-4 font-display uppercase italic">
                    Faute technique !
                </h1>
                <p className="text-gray-400 mb-6">
                    Le match est suspendu momentanément.
                </p>
                
                <div className="bg-black/50 p-4 rounded text-left font-mono text-xs mb-6 overflow-auto border border-white/10 text-red-300">
                    {errorMsg}
                </div>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="btn-primary"
                >
                    Recharger le jeu
                </button>
            </div>
        </div>
      );
    }
    return this.props.children;
  }
}
