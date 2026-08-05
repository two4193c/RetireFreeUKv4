import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { PlannerScenario } from '../types';

export interface PlanErrorBoundaryProps {
  key?: React.Key;
  activeScenario?: PlannerScenario;
  onDeleteScenario: (id: string) => void;
  onResetPlanData?: (id: string) => void;
  children: React.ReactNode;
}

export interface PlanErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PlanErrorBoundary extends React.Component<PlanErrorBoundaryProps, PlanErrorBoundaryState> {
  declare props: PlanErrorBoundaryProps;
  declare state: PlanErrorBoundaryState;
  declare setState: React.Component<PlanErrorBoundaryProps, PlanErrorBoundaryState>['setState'];

  constructor(props: PlanErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): PlanErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Plan ErrorBoundary caught an error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: PlanErrorBoundaryProps) {
    if (prevProps.activeScenario?.id !== this.props.activeScenario?.id) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  private handleRemove = () => {
    if (this.props.activeScenario) {
      this.props.onDeleteScenario(this.props.activeScenario.id);
      this.setState({ hasError: false, error: null });
    }
  };

  private handleReset = () => {
    if (this.props.activeScenario && this.props.onResetPlanData) {
      this.props.onResetPlanData(this.props.activeScenario.id);
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      const planName = this.props.activeScenario?.name || 'Current Plan';

      return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-rose-200 dark:border-rose-900/60 max-w-3xl mx-auto my-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Plan Could Not Be Loaded
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              An unexpected error occurred while loading or rendering calculations for <strong className="text-slate-900 dark:text-white font-bold">"{planName}"</strong>. This is usually caused by corrupted plan settings or invalid input data.
            </p>
          </div>

          {this.state.error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/50 text-left font-mono text-xs text-rose-800 dark:text-rose-300 overflow-x-auto max-h-36">
              <span className="font-bold block mb-1">Error Technical Detail:</span>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRemove}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove This Plan</span>
            </button>

            {this.props.onResetPlanData && (
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Plan to Defaults</span>
              </button>
            )}

            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Loading</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
