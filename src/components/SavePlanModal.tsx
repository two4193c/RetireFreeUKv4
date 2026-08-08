import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, FilePlus, Check } from 'lucide-react';
import { PlannerScenario } from '../types';

interface SavePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenario: PlannerScenario;
  existingScenarios: PlannerScenario[];
  onOverwritePlan: (id: string, updatedName: string) => void;
  onSaveAsNewPlan: (newName: string) => void;
}

export const SavePlanModal: React.FC<SavePlanModalProps> = ({
  isOpen,
  onClose,
  activeScenario,
  existingScenarios,
  onOverwritePlan,
  onSaveAsNewPlan,
}) => {
  const [planName, setPlanName] = useState<string>('');
  const [choice, setChoice] = useState<'overwrite' | 'save_as_new'>('overwrite');
  const [duplicateMatch, setDuplicateMatch] = useState<PlannerScenario | null>(null);

  useEffect(() => {
    if (isOpen && activeScenario) {
      setPlanName(activeScenario.name);
      const match = existingScenarios.find(
        (s) => s.id !== activeScenario.id && s.name.trim().toLowerCase() === activeScenario.name.trim().toLowerCase()
      );
      if (match) {
        setDuplicateMatch(match);
        setChoice('overwrite');
      } else {
        setDuplicateMatch(null);
        setChoice('overwrite');
      }
    }
  }, [isOpen, activeScenario, existingScenarios]);

  // Dynamically check name changes in input field
  const currentMatch = existingScenarios.find(
    (s) => s.name.trim().toLowerCase() === planName.trim().toLowerCase()
  );
  const isExistingNameUsed = Boolean(currentMatch);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = planName.trim();
    if (!trimmedName) return;

    if (choice === 'overwrite') {
      const targetId = currentMatch ? currentMatch.id : activeScenario.id;
      onOverwritePlan(targetId, trimmedName);
    } else {
      onSaveAsNewPlan(trimmedName);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Save Retirement Plan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Save current updates or save under a new plan name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input field for Plan Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Plan Name
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. My Primary Plan"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Duplicate Warning Prompt */}
          {isExistingNameUsed && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Matching Plan Found</span>
                <span>A saved plan named "<strong>{currentMatch?.name}</strong>" already exists. Choose whether to overwrite or save as new.</span>
              </div>
            </div>
          )}

          {/* Choice Selection Options */}
          <div className="space-y-2.5 pt-1">
            {/* Option A: Overwrite Existing */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                choice === 'overwrite'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="savePlanChoice"
                value="overwrite"
                checked={choice === 'overwrite'}
                onChange={() => setChoice('overwrite')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isExistingNameUsed ? `Overwrite Existing Plan ("${currentMatch?.name}")` : `Save & Update "${planName}"`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Update and replace the existing saved plan with your latest inputs, rates, and settings.
                </p>
              </div>
            </label>

            {/* Option B: Save as New Plan */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                choice === 'save_as_new'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="savePlanChoice"
                value="save_as_new"
                checked={choice === 'save_as_new'}
                onChange={() => setChoice('save_as_new')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Save as New Plan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Create a separate new plan entry without altering existing saved plans.
                </p>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{choice === 'overwrite' ? 'Save & Overwrite' : 'Save as New Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
