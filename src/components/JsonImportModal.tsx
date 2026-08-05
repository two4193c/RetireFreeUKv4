import React, { useState, useEffect } from 'react';
import { X, FileJson, CheckCircle2, AlertTriangle, ArrowRight, Layers, Copy, RefreshCw, Plus } from 'lucide-react';
import { PlannerScenario } from '../types';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importedScenarios: PlannerScenario[];
  currentScenarios: PlannerScenario[];
  onImport: (updatedScenarios: PlannerScenario[], activeIdToSet?: string) => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  importedScenarios,
  currentScenarios,
  onImport,
}) => {
  const [importMode, setImportMode] = useState<'all' | 'single'>('all');
  const [selectedSingleIndex, setSelectedSingleIndex] = useState<number>(0);
  const [customPlanName, setCustomPlanName] = useState<string>('');
  const [conflictAction, setConflictAction] = useState<'overwrite' | 'rename'>('rename');

  useEffect(() => {
    if (importedScenarios.length > 0) {
      setImportMode(importedScenarios.length === 1 ? 'single' : 'all');
      setSelectedSingleIndex(0);
      const first = importedScenarios[0];
      if (first) {
        setCustomPlanName(`${first.name || 'Imported Plan'} (Imported)`);
      }
    }
  }, [importedScenarios]);

  if (!isOpen || importedScenarios.length === 0) return null;

  const selectedPlan = importedScenarios[selectedSingleIndex] || importedScenarios[0];

  // Check if selected single plan conflicts with current loaded scenarios
  const existingConflict = currentScenarios.find(
    (s) => s.id === selectedPlan.id || s.name.trim().toLowerCase() === selectedPlan.name.trim().toLowerCase()
  );

  // Update default custom name whenever selected plan changes
  const handleSelectSinglePlan = (idx: number) => {
    setSelectedSingleIndex(idx);
    const plan = importedScenarios[idx];
    if (plan) {
      setCustomPlanName(`${plan.name || 'Imported Plan'} (Imported)`);
    }
  };

  // Execute Import Single Plan
  const handleImportSingle = () => {
    if (!selectedPlan) return;

    if (existingConflict) {
      if (conflictAction === 'overwrite') {
        // Overwrite existing plan with matching id or name
        const updated = currentScenarios.map((s) =>
          s.id === existingConflict.id || s.name.trim().toLowerCase() === existingConflict.name.trim().toLowerCase()
            ? { ...selectedPlan, id: existingConflict.id, updatedAt: new Date().toISOString() }
            : s
        );
        onImport(updated, existingConflict.id);
      } else {
        // Import as new with custom name
        const newId = `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newScenario: PlannerScenario = {
          ...selectedPlan,
          id: newId,
          name: customPlanName.trim() || `${selectedPlan.name} (Imported)`,
          updatedAt: new Date().toISOString(),
        };
        onImport([...currentScenarios, newScenario], newId);
      }
    } else {
      // Add as new plan
      const newScenario: PlannerScenario = {
        ...selectedPlan,
        updatedAt: new Date().toISOString(),
      };
      onImport([...currentScenarios, newScenario], selectedPlan.id);
    }
    onClose();
  };

  // Execute Import All Plans
  const handleImportAll = (allAction: 'replace' | 'overwrite' | 'merge') => {
    if (allAction === 'replace') {
      onImport(importedScenarios, importedScenarios[0]?.id);
    } else if (allAction === 'overwrite') {
      const mergedMap = new Map<string, PlannerScenario>();
      currentScenarios.forEach((s) => mergedMap.set(s.id, s));
      importedScenarios.forEach((s) => mergedMap.set(s.id, s));
      const result = Array.from(mergedMap.values());
      onImport(result, importedScenarios[0]?.id);
    } else {
      // Merge & keep all (rename duplicates)
      const existingNames = new Set(currentScenarios.map((s) => s.name.trim().toLowerCase()));
      const newScenarios = importedScenarios.map((s) => {
        let finalName = s.name;
        let finalId = s.id;
        if (existingNames.has(s.name.trim().toLowerCase()) || currentScenarios.some((c) => c.id === s.id)) {
          finalName = `${s.name} (Imported)`;
          finalId = `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
        return {
          ...s,
          id: finalId,
          name: finalName,
          updatedAt: new Date().toISOString(),
        };
      });
      onImport([...currentScenarios, ...newScenarios], newScenarios[0]?.id);
    }
    onClose();
  };

  const conflictsInImportAll = importedScenarios.filter((imp) =>
    currentScenarios.some((cur) => cur.id === imp.id || cur.name.trim().toLowerCase() === imp.name.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                Import Settings & Plans
              </h3>
              <p className="text-xs text-slate-400">
                Found <span className="font-bold text-indigo-300">{importedScenarios.length} plan(s)</span> in backup file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Import Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              Import Selection Option
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-900/70 rounded-xl border border-slate-700/70">
              <button
                type="button"
                onClick={() => setImportMode('all')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  importMode === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                Import All ({importedScenarios.length} Plans)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('single')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  importMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Copy className="w-4 h-4" />
                Import a Single Plan
              </button>
            </div>
          </div>

          {/* MODE 1: IMPORT ALL PLANS */}
          {importMode === 'all' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/60 space-y-2">
                <div className="text-xs font-bold text-slate-300">Plans included in backup:</div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {importedScenarios.map((plan, idx) => {
                    const isConflict = currentScenarios.some(
                      (c) => c.id === plan.id || c.name.trim().toLowerCase() === plan.name.trim().toLowerCase()
                    );
                    return (
                      <div
                        key={plan.id || idx}
                        className="flex items-center justify-between text-xs px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700/50"
                      >
                        <span className="font-semibold text-slate-200">{plan.name}</span>
                        {isConflict ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Already Loaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            New Plan
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {conflictsInImportAll.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block text-amber-200">
                      {conflictsInImportAll.length} plan(s) already exist in your loaded plans list.
                    </span>
                    Choose how to handle the conflicts below.
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleImportAll('merge')}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Keep All & Add as New Plans (Auto-rename duplicates)
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {conflictsInImportAll.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleImportAll('overwrite')}
                    className="w-full py-2.5 px-4 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-bold text-xs rounded-xl transition-all flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      Overwrite Existing Conflicts
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleImportAll('replace')}
                  className="w-full py-2.5 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-between"
                >
                  <span>Replace Entire Plan List with Backup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: IMPORT A SINGLE PLAN */}
          {importMode === 'single' && (
            <div className="space-y-4">
              {/* Select Plan Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Plan to Import:
                </label>
                <select
                  value={selectedSingleIndex}
                  onChange={(e) => handleSelectSinglePlan(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {importedScenarios.map((plan, idx) => (
                    <option key={plan.id || idx} value={idx}>
                      {plan.name} ({plan.profile?.currentAge ? `Age ${plan.profile.currentAge}` : 'Plan'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Conflict Detection Banner & Decision Options */}
              {existingConflict ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-100 text-sm">
                        Plan Already Loaded!
                      </span>
                      A plan named <strong className="text-white">"{existingConflict.name}"</strong> is already in your active plan list.
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-amber-500/20">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 block">
                      Conflict Action:
                    </label>
                    <div className="space-y-2">
                      {/* Option A: Overwrite */}
                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        conflictAction === 'overwrite'
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="conflictAction"
                          checked={conflictAction === 'overwrite'}
                          onChange={() => setConflictAction('overwrite')}
                          className="mt-1 accent-amber-400"
                        />
                        <div className="text-xs">
                          <span className="font-bold block text-white">Overwrite Existing Plan</span>
                          <span className="text-[11px] text-slate-400">
                            Replaces "{existingConflict.name}" with the imported settings.
                          </span>
                        </div>
                      </label>

                      {/* Option B: Rename & Import as New */}
                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        conflictAction === 'rename'
                          ? 'bg-indigo-600/20 border-indigo-400 text-white'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="conflictAction"
                          checked={conflictAction === 'rename'}
                          onChange={() => setConflictAction('rename')}
                          className="mt-1 accent-indigo-400"
                        />
                        <div className="text-xs space-y-2 w-full">
                          <div>
                            <span className="font-bold block text-white">Provide New Plan Name (Import as Copy)</span>
                            <span className="text-[11px] text-slate-400">
                              Keep the existing plan intact and import this as a new separate plan.
                            </span>
                          </div>

                          {conflictAction === 'rename' && (
                            <div className="pt-1">
                              <label className="text-[10px] font-bold text-indigo-300 block mb-1">
                                New Plan Name for Import:
                              </label>
                              <input
                                type="text"
                                value={customPlanName}
                                onChange={(e) => setCustomPlanName(e.target.value)}
                                placeholder="Enter custom plan name..."
                                className="w-full px-3 py-1.5 bg-slate-900 border border-indigo-500/50 rounded-lg text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No conflicts detected. This plan will be added as a new plan.</span>
                </div>
              )}

              {/* Single Import Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleImportSingle}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {existingConflict
                    ? conflictAction === 'overwrite'
                      ? `Overwrite "${existingConflict.name}" & Import`
                      : `Import as "${customPlanName || selectedPlan.name}"`
                    : `Import "${selectedPlan.name}"`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
