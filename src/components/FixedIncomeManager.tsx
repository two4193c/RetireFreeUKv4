import React, { useState } from 'react';
import { UserProfile, FixedIncomeStream } from '../types';
import { Banknote, Plus, Trash2, ShieldCheck, HeartHandshake, Sparkles, AlertCircle, Info, User, Heart, Users, Pencil } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface FixedIncomeManagerProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const FixedIncomeManager: React.FC<FixedIncomeManagerProps> = ({ profile, onChange ,
  isStudioMode}) => {
  const streams = profile.fixedIncomeStreams || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');

  const [editItem, setEditItem] = useState<FixedIncomeStream | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const isCouple = Boolean(profile.isCouplePlanning);

  const openAddModal = (presetType: 'pip' | 'rental' | 'consulting' | 'custom_taxfree' | 'custom_taxable') => {
    let newStream: FixedIncomeStream;

    const ownerToAssign = isCouple
      ? activePersonFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    if (presetType === 'pip') {
      newStream = {
        id: `fixed_${Date.now()}`,
        name: 'Personal Independence Payment (PIP)',
        owner: ownerToAssign,
        type: 'tax_free',
        annualAmount: 8900, // standard PIP higher rate benchmark
        startAge: profile.currentAge,
        endAge: undefined,
        inflationLinked: true,
        enabled: true,
      };
    } else if (presetType === 'rental') {
      newStream = {
        id: `fixed_${Date.now()}`,
        name: 'Rental Property Income',
        owner: ownerToAssign,
        type: 'taxable',
        annualAmount: 12000,
        startAge: profile.targetRetirementAge || 65,
        endAge: undefined,
        inflationLinked: true,
        enabled: true,
      };
    } else if (presetType === 'consulting') {
      newStream = {
        id: `fixed_${Date.now()}`,
        name: 'Part-Time / Consulting Income',
        owner: ownerToAssign,
        type: 'taxable',
        annualAmount: 15000,
        startAge: profile.targetRetirementAge || 65,
        endAge: (profile.targetRetirementAge || 65) + 10,
        inflationLinked: true,
        enabled: true,
      };
    } else if (presetType === 'custom_taxfree') {
      newStream = {
        id: `fixed_${Date.now()}`,
        name: 'Tax-Free Benefit / Grant',
        owner: ownerToAssign,
        type: 'tax_free',
        annualAmount: 5000,
        startAge: profile.currentAge,
        endAge: undefined,
        inflationLinked: true,
        enabled: true,
      };
    } else {
      newStream = {
        id: `fixed_${Date.now()}`,
        name: 'Custom Taxable Income',
        owner: ownerToAssign,
        type: 'taxable',
        annualAmount: 6000,
        startAge: profile.targetRetirementAge || 65,
        endAge: undefined,
        inflationLinked: true,
        enabled: true,
      };
    }

    setEditItem(newStream);
    setIsAdding(true);
  };

  const openEditModal = (stream: FixedIncomeStream) => {
    setEditItem({ ...stream });
    setIsAdding(false);
  };

  const handleUpdateDraft = (updates: Partial<FixedIncomeStream>) => {
    if (editItem) {
      setEditItem({ ...editItem, ...updates });
    }
  };

  const handleSave = () => {
    if (!editItem) return;
    if (isAdding) {
      onChange({
        ...profile,
        fixedIncomeStreams: [...streams, editItem],
      });
    } else {
      onChange({
        ...profile,
        fixedIncomeStreams: streams.map(s => s.id === editItem.id ? editItem : s),
      });
    }
    setEditItem(null);
  };

  const handleDeleteStream = (id: string) => {
    const updated = streams.filter((s) => s.id !== id);
    onChange({
      ...profile,
      fixedIncomeStreams: updated,
    });
  };

  const activeStreams = streams.filter((s) => s.enabled && (isCouple || (s.owner || 'primary') === 'primary'));
  const totalTaxFreeIncome = activeStreams
    .filter((s) => s.type === 'tax_free')
    .reduce((acc, s) => acc + s.annualAmount, 0);

  const totalTaxableIncome = activeStreams
    .filter((s) => s.type === 'taxable')
    .reduce((acc, s) => acc + s.annualAmount, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
              <span>Fixed Income & Disability Benefits</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                Taxable & Tax-Free PIP
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add Personal Independence Payment (PIP), disability benefits, rental income, or consulting fees
            </p>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openAddModal('pip')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            title="Add PIP (Personal Independence Payment - 100% Tax-Free)"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>+ Add PIP (Tax-Free)</span>
          </button>
          
          <button
            onClick={() => openAddModal('rental')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            title="Add Taxable Income (e.g. Rental, Consulting)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Taxable Income</span>
          </button>
        </div>
      </div>

      {/* Person Filter Tabs (Couple Planning) */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50/60 dark:bg-slate-800/60 p-2.5 sm:p-1.5 rounded-2xl border border-indigo-200/70 dark:border-slate-700 text-xs font-bold gap-2">
          {!isStudioMode && <span className="text-indigo-900 dark:text-indigo-300 px-1 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold shrink-0">Filter Person:</span>}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActivePersonFilter('all')}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                activePersonFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">All ({streams.length})</span>
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
              <span className="truncate">{profile.name || 'Primary'} ({streams.filter((s) => (s.owner || 'primary') === 'primary').length})</span>
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
              <span className="truncate">{profile.partnerName || 'Partner'} ({streams.filter((s) => s.owner === 'partner').length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      {streams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Streams</div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{activeStreams.length} Active</div>
            </div>
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 opacity-80" />
          </div>

          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <span>Tax-Free Income (e.g. PIP)</span>
                <span className="text-[9px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded font-black">0% Tax</span>
              </div>
              <div className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">£{(totalTaxFreeIncome || 0).toLocaleString()}/yr</div>
            </div>
            <HeartHandshake className="w-6 h-6 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>

          <div className="bg-blue-50/80 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Taxable Fixed Income</div>
              <div className="text-xl font-black text-blue-950 dark:text-blue-200 mt-0.5">£{(totalTaxableIncome || 0).toLocaleString()}/yr</div>
            </div>
            <Banknote className="w-6 h-6 text-blue-600 dark:text-blue-400 opacity-80" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {streams.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No Fixed Income Streams Added</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Add non-pension fixed income streams like Personal Independence Payment (PIP), Attendance Allowance, rental property income, or part-time consulting.
            </p>
          </div>
          
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => openAddModal('pip')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Add Tax-Free PIP Payment</span>
            </button>

            <button
              onClick={() => openAddModal('rental')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rental / Consulting Income</span>
            </button>
          </div>
        </div>
      ) : (
        /* List of Streams (Compact Read-Only) */
        <div className="space-y-3">
          {streams
            .filter((s) => (isCouple ? (activePersonFilter === 'all' || (s.owner || 'primary') === activePersonFilter) : (s.owner || 'primary') === 'primary'))
            .map((stream) => {
              const isTaxFree = stream.type === 'tax_free';
              return (
                <div key={stream.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {stream.name || 'Fixed Income'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isTaxFree ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                        {isTaxFree ? 'Tax-Free' : 'Taxable'}
                      </span>
                      {!stream.enabled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5 flex-wrap font-medium">
                      {isCouple && (
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5"/> 
                          {stream.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'}
                        </span>
                      )}
                      {isCouple && <span className="opacity-40">•</span>}
                      <span>Ages {stream.startAge} - {stream.endAge || 'Life'}</span>
                      <span className="opacity-40">•</span>
                      <span className={`${isTaxFree ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'} font-bold`}>
                        £{stream.annualAmount?.toLocaleString()}/yr
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <button onClick={() => openEditModal(stream)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteStream(stream.id)} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
          })}
        </div>
      )}

      {/* Tax Notice & Guidance */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mt-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>UK Tax Guidance for Personal Independence Payment (PIP) & Fixed Income</span>
        </div>
        <p className="pl-6 text-slate-500 dark:text-slate-400 leading-relaxed">
          • <strong>Tax-Free Income (PIP / DLA / Attendance Allowance):</strong> Personal Independence Payment is completely tax-free under UK tax rules and is not counted towards your Personal Allowance. In this retirement model, PIP offsets your required drawdown goal £1-for-£ with zero income tax liability.
          <br />
          • <strong>Taxable Fixed Income (Rental / Freelance / Consulting):</strong> Property rental and freelance earnings are subject to standard UK Income Tax rules and absorb available Personal Allowance before pension drawdown tax calculations.
        </p>
      </div>

      {/* Modal for Add / Edit */}
      {editItem && (
        <ModalShell
          title={isAdding ? 'Add Fixed Income' : 'Edit Fixed Income'}
          size="lg"
          onSave={handleSave}
          onCancel={() => setEditItem(null)}
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Income Stream Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => handleUpdateDraft({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="e.g. PIP Payment"
                />
              </div>
              {profile.isCouplePlanning && (
                <div className="w-full sm:w-48 shrink-0">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
                  <select
                    value={editItem.owner || 'primary'}
                    onChange={(e) => handleUpdateDraft({ owner: e.target.value as 'primary' | 'partner' })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  >
                    <option value="primary">{profile.name || 'Primary'}</option>
                    <option value="partner">{profile.partnerName || 'Partner'}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tax Treatment</label>
                <select
                  value={editItem.type}
                  onChange={(e) => handleUpdateDraft({ type: e.target.value as 'taxable' | 'tax_free' })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                >
                  <option value="tax_free">Tax-Free (e.g. PIP, Disability)</option>
                  <option value="taxable">Taxable (e.g. Rental, Consulting)</option>
                </select>
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Annual Income (£/yr)</label>
                <input
                  type="number"
                  min={0} step={250}
                  value={editItem.annualAmount || ''}
                  onChange={(e) => handleUpdateDraft({ annualAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Start Age</label>
                <input
                  type="number"
                  min={18} max={100}
                  value={editItem.startAge || ''}
                  onChange={(e) => handleUpdateDraft({ startAge: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>End Age</span>
                  <span className="font-normal text-[10px] text-slate-500">(Optional / Blank = Life)</span>
                </label>
                <input
                  type="number"
                  min={editItem.startAge || 18} max={100}
                  placeholder="Lifelong"
                  value={editItem.endAge || ''}
                  onChange={(e) => handleUpdateDraft({ endAge: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:font-normal"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={editItem.inflationLinked}
                  onChange={(e) => handleUpdateDraft({ inflationLinked: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Inflation-Linked (CPI Index)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={editItem.enabled}
                  onChange={(e) => handleUpdateDraft({ enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
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
