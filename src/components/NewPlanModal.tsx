import React, { useState, useEffect } from 'react';
import { X, Copy, FilePlus, Sparkles, Zap, Flame, Layers } from 'lucide-react';
import { PlannerScenario } from '../types';

interface NewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onCreatePlan: (mode: 'blank' | 'clone' | 'max_spender' | 'variants', cloneSourceId?: string, customName?: string) => void;
}

export const NewPlanModal: React.FC<NewPlanModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenarioId,
  onCreatePlan,
}) => {
  const [creationMode, setCreationMode] = useState<'clone' | 'max_spender' | 'variants' | 'blank'>('clone');
  const [cloneSourceId, setCloneSourceId] = useState<string>(activeScenarioId);
  const [planName, setPlanName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCloneSourceId(activeScenarioId || (scenarios[0]?.id ?? ''));
      setCreationMode('clone');
      const count = scenarios.length + 1;
      setPlanName(`Plan ${count}`);
    }
  }, [isOpen, activeScenarioId, scenarios]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreatePlan(creationMode, cloneSourceId, planName.trim() || `Plan ${scenarios.length + 1}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create New Retirement Plan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose how you want to initialize your new plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Plan Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Plan Name
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Fire at 55, Aggressive ISA, etc."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Creation Mode Options */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Initialization Method
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Clone existing plan */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  creationMode === 'clone'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="creationMode"
                  value="clone"
                  checked={creationMode === 'clone'}
                  onChange={() => setCreationMode('clone')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Clone Single Plan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Copy all current salaries, pot balances, contribution rates, and settings from a target plan.
                  </p>
                </div>
              </label>

              {/* Option 2: Clone Strategy Variants (including Max Spender) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  creationMode === 'variants'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="creationMode"
                  value="variants"
                  checked={creationMode === 'variants'}
                  onChange={() => setCreationMode('variants')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Clone Strategy Variants (includes Max Spender)
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md">
                      Suite of 5 Plans
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate plan variations comparing Tax-Free Fill, Basic Rate Fill, ISA First, Pension First, and Max Spender side-by-side.
                  </p>
                </div>
              </label>

              {/* Option 3: Max Spender Plan */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  creationMode === 'max_spender'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="creationMode"
                  value="max_spender"
                  checked={creationMode === 'max_spender'}
                  onChange={() => setCreationMode('max_spender')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Max Spender Plan (Die With Zero Solver)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically solve for the maximum sustainable annual spend that consumes all assets precisely by your target age.
                  </p>
                </div>
              </label>

              {/* Option 4: Blank Plan */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  creationMode === 'blank'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="creationMode"
                  value="blank"
                  checked={creationMode === 'blank'}
                  onChange={() => setCreationMode('blank')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Blank Plan (Zeroed Balances)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Start fresh with all savings, pensions, ISAs, and monthly contributions set to £0.
                  </p>
                </div>
              </label>
            </div>

            {/* Source Plan Select (for clone, max_spender, variants) */}
            {creationMode !== 'blank' && (
              <div className="pt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Select Base / Source Plan:
                </label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.id === activeScenarioId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Create Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
