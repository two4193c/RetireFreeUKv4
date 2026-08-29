import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Edit3, Layers, Check } from 'lucide-react';
import { PlannerScenario } from '../types';

export interface ConflictPlanInfo {
  existingScenarioId: string;
  planName: string;
}

interface DuplicateVariantConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  basePlanName: string;
  conflictingPlans: ConflictPlanInfo[];
  allProposedVariantNames: string[];
  onReplaceExisting: () => void;
  onCreateWithNewBaseName: (newBaseName: string) => void;
}

export const DuplicateVariantConflictModal: React.FC<DuplicateVariantConflictModalProps> = ({
  isOpen,
  onClose,
  basePlanName,
  conflictingPlans,
  allProposedVariantNames,
  onReplaceExisting,
  onCreateWithNewBaseName,
}) => {
  const [newBaseName, setNewBaseName] = useState<string>(`${basePlanName} (New)`);
  const [choice, setChoice] = useState<'replace' | 'new_name'>('replace');

  useEffect(() => {
    if (isOpen) {
      setNewBaseName(`${basePlanName} Copy`);
      setChoice('replace');
    }
  }, [isOpen, basePlanName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (choice === 'replace') {
      onReplaceExisting();
    } else {
      const trimmed = newBaseName.trim();
      if (trimmed) {
        onCreateWithNewBaseName(trimmed);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Duplicate Strategy Plans Found</h2>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                Strategy variant plans already exist for "{basePlanName}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Conflicting Plans List */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Matching Existing Plans ({conflictingPlans.length}):
          </span>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {conflictingPlans.map((conflict, idx) => (
              <div
                key={conflict.existingScenarioId || idx}
                className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <span className="truncate">{conflict.planName}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded shrink-0">
                  Will match
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              How would you like to handle existing variant plans?
            </span>

            {/* Option A: Replace / Overwrite */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                choice === 'replace'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="duplicateChoice"
                value="replace"
                checked={choice === 'replace'}
                onChange={() => setChoice('replace')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Replace Existing Plans
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Update and overwrite existing matching strategy plans with recalculated values from "{basePlanName}".
                </p>
              </div>
            </label>

            {/* Option B: Provide new base plan name */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                choice === 'new_name'
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="duplicateChoice"
                value="new_name"
                checked={choice === 'new_name'}
                onChange={() => setChoice('new_name')}
                className="mt-1 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Create New Suite with Custom Base Name
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Keep existing plans intact and create a brand new set of variants under a different plan prefix.
                </p>

                {choice === 'new_name' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Base Plan Name Prefix:
                    </label>
                    <input
                      type="text"
                      value={newBaseName}
                      onChange={(e) => setNewBaseName(e.target.value)}
                      placeholder="e.g. Plan 1 (V2)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={choice === 'new_name'}
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Proceed</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
