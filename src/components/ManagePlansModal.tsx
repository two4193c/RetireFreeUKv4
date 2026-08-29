import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  FolderKanban,
  FileJson,
  Plus,
  Trash2,
  Check,
  Pencil,
  Calendar,
  ArrowRight,
  ArrowUpDown,
  Download,
  Upload,
  Copy,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Save,
} from 'lucide-react';
import { PlannerScenario } from '../types';

export type PlanSortOption = 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc' | 'custom';
export type ManagePlansTab = 'overview' | 'json_backup';

interface ManagePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onRequestDeleteScenario: (id: string, name: string) => void;
  onNewScenario: () => void;
  onRenameScenario: (id: string, newName: string) => void;
  onDuplicateScenario?: (id: string) => void;
  onImportScenarios?: (scenarios: PlannerScenario[]) => void;
  onOpenResetPresets?: () => void;
  initialTab?: ManagePlansTab;
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
  onDuplicateScenario,
  onImportScenarios,
  onOpenResetPresets,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<ManagePlansTab>(initialTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [sortBy, setSortBy] = useState<PlanSortOption>('updated_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditingId(null);
      setSearchQuery('');
      setImportStatusMsg(null);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingId, onClose]);

  const sortedAndFilteredScenarios = useMemo(() => {
    let list = [...scenarios];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.profile?.grossAnnualSalary && String(s.profile.grossAnnualSalary).includes(q)) ||
          (s.profile?.targetRetirementAge && String(s.profile.targetRetirementAge).includes(q))
      );
    }

    switch (sortBy) {
      case 'updated_desc':
        return list.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });
      case 'updated_asc':
        return list.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeA - timeB;
        });
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      case 'name_desc':
        return list.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' }));
      case 'custom':
      default:
        return list;
    }
  }, [scenarios, sortBy, searchQuery]);

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

  const handleExportSingleScenario = (scenario: PlannerScenario) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify([scenario], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `retirefree_plan_${scenario.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportAllJson = () => {
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
    downloadAnchor.setAttribute('download', `RetireFree_UK_Full_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const processJsonText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      let imported: PlannerScenario[] = [];

      if (Array.isArray(parsed)) {
        imported = parsed;
      } else if (parsed && Array.isArray(parsed.scenarios)) {
        imported = parsed.scenarios;
      } else if (parsed && parsed.profile && parsed.pots) {
        imported = [parsed];
      }

      if (imported.length > 0 && onImportScenarios) {
        onImportScenarios(imported);
        setImportStatusMsg({
          type: 'success',
          message: `Loaded ${imported.length} scenario(s). Opening import & merge preview...`,
        });
      } else {
        setImportStatusMsg({
          type: 'error',
          message: 'Invalid JSON file: No valid retirement scenario definitions found.',
        });
      }
    } catch (err) {
      console.error('Failed to parse JSON file:', err);
      setImportStatusMsg({
        type: 'error',
        message: 'Failed to parse JSON file. Please ensure the file contains valid JSON data.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processJsonText(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processJsonText(text);
    };
    reader.readAsText(file);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div
      id="modal-plan-management"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-2xl shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Plan Management &amp; JSON Backup
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  Pop-Out Window
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch active plans, create variations, or export/import complete JSON workspaces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Dual Tabs Pill Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Plans ({scenarios.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json_backup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'json_backup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON Backup &amp; Import</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: PLAN MANAGEMENT */}
        {activeTab === 'overview' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search plans by name, salary, age..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label
                  htmlFor="plan-sort-select-modal"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>Sort:</span>
                </label>
                <select
                  id="plan-sort-select-modal"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as PlanSortOption)}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer shadow-2xs"
                >
                  <option value="updated_desc">Last Updated (Newest)</option>
                  <option value="updated_asc">Last Updated (Oldest)</option>
                  <option value="name_asc">Plan Name (A → Z)</option>
                  <option value="name_desc">Plan Name (Z → A)</option>
                  <option value="custom">Default Order</option>
                </select>

                <button
                  onClick={() => {
                    onClose();
                    onNewScenario();
                  }}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Plan</span>
                </button>
              </div>
            </div>

            {/* Plans Scrollable List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {sortedAndFilteredScenarios.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <FolderKanban className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No matching plans found
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Try clearing your search query or create a new plan scenario.
                  </p>
                </div>
              ) : (
                sortedAndFilteredScenarios.map((s) => {
                  const isActive = s.id === activeScenarioId;
                  const isEditing = editingId === s.id;
                  const updatedDateStr = formatDate(s.updatedAt);

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-primary-500/80 bg-primary-50/40 dark:bg-primary-950/20 shadow-xs'
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
                              className="px-3 py-1 text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-primary-500 rounded-xl text-slate-900 dark:text-white focus:outline-none flex-1 max-w-sm"
                            />
                            <button
                              onClick={() => handleSaveRename(s.id)}
                              className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors cursor-pointer"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {s.name}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Active Plan
                                </span>
                              )}
                              <button
                                onClick={() => handleStartRename(s)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                title="Rename plan"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                              <span>Salary £{(Number(s.profile?.grossAnnualSalary) || 0).toLocaleString()}</span>
                              <span>•</span>
                              <span>Retire Age {s.profile?.targetRetirementAge ?? 60}</span>
                              <span>•</span>
                              <span>Target Spend £{(Number(s.profile?.targetAnnualSpendNet) || 0).toLocaleString()}/yr</span>
                              {updatedDateStr && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                    <Calendar className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                                    {updatedDateStr}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectScenario(s.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Switch to Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-[11px] font-bold rounded-xl flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Loaded</span>
                          </span>
                        )}

                        {onDuplicateScenario && (
                          <button
                            onClick={() => onDuplicateScenario(s.id)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-colors cursor-pointer"
                            title={`Duplicate plan "${s.name}"`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleExportSingleScenario(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                          title={`Export plan "${s.name}" as JSON`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {scenarios.length > 1 && (
                          <button
                            onClick={() => onRequestDeleteScenario(s.id, s.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title={`Remove plan "${s.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: JSON BACKUP & IMPORT */}
        {activeTab === 'json_backup' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
            {importStatusMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                  importStatusMsg.type === 'success'
                    ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-300 dark:border-primary-800 text-primary-800 dark:text-primary-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {importStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{importStatusMsg.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Export Backup Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <span>Export JSON Workspace Backup</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Download a full JSON snapshot of all {scenarios.length} retirement scenarios, pot balances, target spending profiles, and tax overrides.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">Included Plans:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{scenarios.length} scenarios</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Format:</span>
                      <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">Standard v2 JSON</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExportAllJson}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download All Plans (.json)</span>
                  </button>
                </div>
              </div>

              {/* 2. Import Backup Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                    <div className="p-1.5 bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-lg">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span>Import JSON Backup</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Restore previously exported scenarios or upload custom JSON files. You will preview and confirm merge or overwrite options before saving.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag &amp; Drop JSON file here
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      or click to browse files from your computer
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Presets Restore Box */}
            {onOpenResetPresets && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Reset to Standard UK Scenario Presets</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70">
                    Restore the default suite of UK scenario templates (Standard Retirement, FIRE Early, Expat QROPS, and Couple planning).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenResetPresets();
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs shrink-0 self-end sm:self-center"
                >
                  Reset Presets
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">
              Esc
            </kbd>
            <span>to close</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

