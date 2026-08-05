import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Check, Pencil, Copy, Calendar, ArrowRight } from 'lucide-react';
import { PlannerScenario } from '../types';

interface ManagePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onRequestDeleteScenario: (id: string, name: string) => void;
  onNewScenario: () => void;
  onRenameScenario: (id: string, newName: string) => void;
}

export const ManagePlansModal: React.FC<ManagePlansModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onRequestDeleteScenario,
  onNewScenario,
  onRenameScenario,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  if (!isOpen) return null;

  const handleStartRename = (scenario: PlannerScenario) => {
    setEditingId(scenario.id);
    setEditingName(scenario.name);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      onRenameScenario(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Retirement Plans</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View, switch, rename, or remove your saved plans ({scenarios.length})</p>
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

        {/* Plans List */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {scenarios.map((s) => {
            const isActive = s.id === activeScenarioId;
            const isEditing = editingId === s.id;

            return (
              <div
                key={s.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Plan Info / Inline Name Edit */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(s.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="px-3 py-1 text-sm font-bold bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(s.id)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                        title="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {s.name}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                            Active Plan
                          </span>
                        )}
                        <button
                          onClick={() => handleStartRename(s)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                          title="Rename plan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Salary £{(Number(s.profile?.grossAnnualSalary) || 0).toLocaleString()}</span>
                        <span>•</span>
                        <span>Retire Age {s.profile?.targetRetirementAge ?? 60}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                  {!isActive && (
                    <button
                      onClick={() => {
                        onSelectScenario(s.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Switch to Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onRequestDeleteScenario(s.id, s.name)}
                    className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title={`Remove plan "${s.name}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onNewScenario();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
