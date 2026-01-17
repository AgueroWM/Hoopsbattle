import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error instanceof Error 
          ? this.state.error.toString() 
          : JSON.stringify(this.state.error, null, 2);

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-8 text-center font-sans">
            <div className="max-w-lg">
                <div className="text-6xl mb-4">🤕</div>
                <h1 className="text-3xl font-bold text-red-500 mb-4 font-display uppercase italic">Faute technique !</h1>
                <p className="text-gray-400 mb-6">Une erreur est survenue lors du chargement de l'application.</p>
                
                <div className="bg-black/50 p-4 rounded text-left font-mono text-xs mb-6 overflow-auto border border-white/10 text-red-300 whitespace-pre-wrap">
                    {errorMsg}
                </div>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                    Recharger la page
                </button>
            </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default ErrorBoundary;