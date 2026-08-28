import React, { useState } from 'react';
import { UserProfile, DbPension } from '../types';
import { Building2, Plus, Trash2, ShieldCheck, Banknote, Sparkles, AlertCircle, User, Heart, Users, Pencil } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface DbPensionManagerProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const DbPensionManager: React.FC<DbPensionManagerProps> = ({ profile, onChange, isStudioMode }) => {
  const dbPensions = profile.dbPensions || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');
  
  const [editItem, setEditItem] = useState<DbPension | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const isCouple = Boolean(profile.isCouplePlanning);

  const openAddModal = () => {
    const ownerToAssign = isCouple
      ? activePersonFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    setEditItem({
      id: `db_${Date.now()}`,
      name: `Defined Benefit Scheme ${dbPensions.length + 1}`,
      owner: ownerToAssign,
      startAge: 65,
      annualIncome: 10000,
      taxFreeLumpSum: 30000,
      inflationLinked: true,
      enabled: true,
    });
    setIsAdding(true);
  };

  const openEditModal = (pension: DbPension) => {
    setEditItem({ ...pension });
    setIsAdding(false);
  };

  const handleUpdateDraft = (updates: Partial<DbPension>) => {
    if (editItem) {
      setEditItem({ ...editItem, ...updates });
    }
  };

  const handleSave = () => {
    if (!editItem) return;
    if (isAdding) {
      onChange({
        ...profile,
        dbPensions: [...dbPensions, editItem],
      });
    } else {
      onChange({
        ...profile,
        dbPensions: dbPensions.map(p => p.id === editItem.id ? editItem : p),
      });
    }
    setEditItem(null);
  };

  const handleUpdateDbPension = (id: string, updates: Partial<DbPension>) => {
    const updated = dbPensions.map((p) => (p.id === id ? { ...p, ...updates } : p));
    onChange({
      ...profile,
      dbPensions: updated,
    });
  };

  const handleDeleteDbPension = (id: string) => {
    const updated = dbPensions.filter((p) => p.id !== id);
    onChange({
      ...profile,
      dbPensions: updated,
    });
  };

  const totalActiveDbIncome = dbPensions
    .filter((p) => p.enabled && (isCouple || (p.owner || 'primary') === 'primary'))
    .reduce((acc, p) => acc + p.annualIncome, 0);

  const totalActiveDbLumpSums = dbPensions
    .filter((p) => p.enabled && (isCouple || (p.owner || 'primary') === 'primary'))
    .reduce((acc, p) => acc + p.taxFreeLumpSum, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
              <span>Defined Benefit Pensions</span>
              {!isStudioMode && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  Guaranteed Income
                </span>
              )}
            </h2>
            {!isStudioMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add NHS, Civil Service, Teachers, Armed Forces, or Company Final Salary pensions
              </p>
            )}
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {!isStudioMode && <span>Add DB Pension Scheme</span>}
        </button>
      </div>

      {/* Person Filter Tabs (Couple Planning) */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50/60 dark:bg-slate-800/60 p-2.5 sm:p-1.5 rounded-2xl border border-amber-200/70 dark:border-slate-700 text-xs font-bold gap-2">
          {!isStudioMode && <span className="text-amber-900 dark:text-amber-300 px-1 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold shrink-0">Filter Person:</span>}
          <div className={`grid ${isStudioMode ? "grid-cols-1" : "grid-cols-3"} sm:flex items-center gap-1.5 w-full sm:w-auto`}>
            <button
              onClick={() => setActivePersonFilter('all')}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                activePersonFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">All ({dbPensions.length})</span>
            </button>
            <button
              onClick={() => setActivePersonFilter('primary')}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                activePersonFilter === 'primary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">{profile.name || 'Primary'} ({dbPensions.filter((p) => (p.owner || 'primary') === 'primary').length})</span>
            </button>
            <button
              onClick={() => setActivePersonFilter('partner')}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                activePersonFilter === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-900 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300 shrink-0" />
              <span className="truncate">{profile.partnerName || 'Partner'} ({dbPensions.filter((p) => p.owner === 'partner').length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Metrics Banner */}
      {dbPensions.length > 0 && !isStudioMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Active Schemes</div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{dbPensions.filter(p => p.enabled).length} Active</div>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total DB Annual Income</div>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">£{(totalActiveDbIncome || 0).toLocaleString()}/yr</div>
            </div>
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Total Tax-Free Lump Sums</div>
              <div className="text-xl font-black text-amber-950 dark:text-amber-200 mt-0.5">£{(totalActiveDbLumpSums || 0).toLocaleString()}</div>
            </div>
            <Banknote className="w-6 h-6 text-amber-600 dark:text-amber-400 opacity-80" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {dbPensions.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No Defined Benefit Pensions Added</h3>
            {!isStudioMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                If you have a career average or final salary pension (such as NHS, Civil Service, or Teachers scheme), add it here to incorporate guaranteed retirement income & tax-free cash payouts into your projections.
              </p>
            )}
          </div>
          {!isStudioMode && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-amber-500 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add DB Pension</span>
            </button>
          )}
        </div>
      ) : (
        /* List of DB Pensions (Compact Read-Only) */
        <div className="space-y-3">
          {dbPensions
            .filter((p) => (isCouple ? (activePersonFilter === 'all' || (p.owner || 'primary') === activePersonFilter) : (p.owner || 'primary') === 'primary'))
            .map((pension) => (
              <div key={pension.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                      {pension.name || 'DB Pension'}
                    </span>
                    {!pension.enabled && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5 flex-wrap font-medium">
                    {isCouple && (
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5"/> 
                        {pension.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'}
                      </span>
                    )}
                    {isCouple && <span className="opacity-40">•</span>}
                    <span>Starts Age {pension.startAge}</span>
                    <span className="opacity-40">•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">£{pension.annualIncome?.toLocaleString()}/yr</span>
                    <span className="opacity-40">•</span>
                    <span>£{pension.taxFreeLumpSum?.toLocaleString()} Lump Sum</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <button onClick={() => openEditModal(pension)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteDbPension(pension.id)} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Educational Note */}
      {!isStudioMode && (
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 mt-4">
          <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Defined Benefit vs Defined Contribution:</strong> DB pensions pay a guaranteed index-linked income for life based on salary & service length, unlike DC pensions which depend on investment pot value. The tax-free lump sum reduces required DC drawdown and boosts tax-sheltered ISA/cash reserves upon commencement.
          </p>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {editItem && (
        <ModalShell
          title={isAdding ? 'Add DB Pension' : 'Edit DB Pension'}
          size="lg"
          onSave={handleSave}
          onCancel={() => setEditItem(null)}
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Scheme Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => handleUpdateDraft({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                  placeholder="e.g. NHS Pension"
                />
              </div>
              {profile.isCouplePlanning && (
                <div className="w-full sm:w-48 shrink-0">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
                  <select
                    value={editItem.owner || 'primary'}
                    onChange={(e) => handleUpdateDraft({ owner: e.target.value as 'primary' | 'partner' })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                  >
                    <option value="primary">{profile.name || 'Primary'}</option>
                    <option value="partner">{profile.partnerName || 'Partner'}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Start Age</label>
                <input
                  type="number"
                  min={18} max={100}
                  value={editItem.startAge || ''}
                  onChange={(e) => handleUpdateDraft({ startAge: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Duration</label>
                <select
                  value={editItem.durationOption || 'lifetime'}
                  onChange={(e) => {
                    const dur = e.target.value as 'lifetime' | 'until_age';
                    handleUpdateDraft({
                      durationOption: dur,
                      endAge: dur === 'until_age' ? (editItem.endAge || Math.max(editItem.startAge + 10, 75)) : undefined,
                    });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                >
                  <option value="lifetime">Lifetime</option>
                  <option value="until_age">Until Specific Age</option>
                </select>
              </div>

              {(editItem.durationOption || 'until_age') === 'until_age' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Stops Age</label>
                  <input
                    type="number"
                    min={editItem.startAge || 50} max={100}
                    value={editItem.endAge || ''}
                    onChange={(e) => handleUpdateDraft({ endAge: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Annual Income (£)</label>
                <input
                  type="number"
                  min={0} step={500}
                  value={editItem.annualIncome || ''}
                  onChange={(e) => handleUpdateDraft({ annualIncome: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tax-Free Lump Sum (£)</label>
                <input
                  type="number"
                  min={0} step={1000}
                  value={editItem.taxFreeLumpSum || ''}
                  onChange={(e) => handleUpdateDraft({ taxFreeLumpSum: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Target Pot (Lump Sum)</label>
                <select
                  value={editItem.targetPot || 'cash_savings'}
                  onChange={(e) => handleUpdateDraft({ targetPot: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                >
                  <option value="cash_savings">Cash & Savings</option>
                  <option value="cash_isa">Cash ISA</option>
                  <option value="stocks_and_shares_isa">S&S ISA</option>
                  <option value="gia">GIA</option>
                  <option value="lisa">Lifetime ISA</option>
                  <option value="spend_clear_debt">Spend/Clear Debt</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={editItem.inflationLinked}
                  onChange={(e) => handleUpdateDraft({ inflationLinked: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500"
                />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Inflation-Linked (CPI/RPI)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={editItem.enabled}
                  onChange={(e) => handleUpdateDraft({ enabled: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500"
                />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Enabled in Projections</span>
              </label>
            </div>
          </div>
        </ModalShell>
      )}

    </div>
  );
};
