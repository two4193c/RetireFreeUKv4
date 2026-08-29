import React, { useState } from 'react';
import { PlannerScenario } from '../types';
import {
  FolderKanban,
  Save,
  Plus,
  Download,
  Upload,
  Check,
  Layers,
  Trash2,
  Pencil,
  Copy,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileJson,
  CheckCircle2,
} from 'lucide-react';

interface PlanManagementCardProps {
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onSaveScenario: () => void;
  onNewScenario: () => void;
  onRequestDeleteScenario: (id: string, name: string) => void;
  onRenameScenario: (id: string, newName: string) => void;
  onOpenManagePlans?: () => void;
  onImportScenarios: (scenarios: PlannerScenario[]) => void;
}

export const PlanManagementCard: React.FC<PlanManagementCardProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onSaveScenario,
  onNewScenario,
  onRequestDeleteScenario,
  onRenameScenario,
  onOpenManagePlans,
  onImportScenarios,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  const handleStartRename = (s: PlannerScenario) => {
    setEditingId(s.id);
    setEditingName(s.name);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      onRenameScenario(id, trimmed);
    }
    setEditingId(null);
  };

  const handleSaveActivePlan = () => {
    onSaveScenario();
    setSaveSuccessMsg(`Successfully saved plan "${activeScenario?.name || 'Active Plan'}"`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            version: 'v2',
            exportedAt: new Date().toISOString(),
            scenarios: scenarios,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `RetireFree_UK_Settings_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        let imported: PlannerScenario[] = [];

        if (Array.isArray(parsed)) {
          imported = parsed;
        } else if (parsed && Array.isArray(parsed.scenarios)) {
          imported = parsed.scenarios;
        } else if (parsed && parsed.profile && parsed.pots) {
          imported = [parsed];
        }

        if (imported.length > 0) {
          onImportScenarios(imported);
          setImportSuccessMsg(`Successfully imported ${imported.length} retirement plan scenario(s).`);
          setTimeout(() => setImportSuccessMsg(null), 4000);
        } else {
          setImportErrorMsg('Invalid JSON format: No valid scenario objects found.');
        }
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
        setImportErrorMsg('Failed to parse JSON file. Please ensure it is valid JSON data.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-4 bg-primary-50 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 rounded-2xl text-xs font-bold text-primary-800 dark:text-primary-200 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Card 1: All Saved Plans Overview & Operations */}
      <div id="card-plan-mgmt-overview" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Plan Management
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage, rename, switch between, or create new plan variations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewScenario}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {scenarios.map((s) => {
            const isActive = s.id === activeScenarioId;
            const isEditing = editingId === s.id;

            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'border-primary-500/80 bg-primary-50/40 dark:bg-primary-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Info & Inline Rename */}
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
                        className="px-3 py-1.5 text-sm font-bold bg-white dark:bg-slate-900 border border-primary-500 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(s.id)}
                        className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors cursor-pointer"
                        title="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {s.name}
                        </h4>
                        {isActive && (
                          <span className="px-2.5 py-0.5 bg-primary-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1">
                            <Save className="w-3 h-3" />
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Salary £{(Number(s.profile?.grossAnnualSalary) || 0).toLocaleString()}</span>
                        <span>•</span>
                        <span>Retirement Age {s.profile?.targetRetirementAge ?? 60}</span>
                        <span>•</span>
                        <span>Target Spend £{(Number(s.profile?.targetAnnualSpendNet) || 0).toLocaleString()}/yr</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Plan Row Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!isActive ? (
                    <button
                      onClick={() => onSelectScenario(s.id)}
                      className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Switch to Plan</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Loaded</span>
                    </span>
                  )}

                  {scenarios.length > 1 && (
                    <button
                      onClick={() => onRequestDeleteScenario(s.id, s.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                      title="Remove plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: JSON Backup & Migration */}
      <div id="card-plan-mgmt-json" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                JSON Configuration Backup & Import
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export all your saved plan parameters as a standard JSON snapshot or restore previous backups.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {importErrorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300">
            {importErrorMsg}
          </div>
        )}
        {importSuccessMsg && (
          <div className="p-3 bg-primary-50 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 rounded-2xl text-xs font-bold text-primary-800 dark:text-primary-200">
            {importSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export JSON Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-sm">
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Export JSON Backup</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Download a clean JSON file containing all {scenarios.length} retirement scenario definitions, pot balances, and tax settings.
              </p>
            </div>

            <button
              onClick={handleExportJson}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File (.json)</span>
            </button>
          </div>

          {/* Import JSON Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-sm">
                <Upload className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span>Import JSON Backup</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload a previously saved `.json` file to restore your plans or import custom scenario configurations.
              </p>
            </div>

            <label className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Select & Import JSON File</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleJsonFileUpload}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
