import React, { useState } from 'react';
import { UserProfile, FixedIncomeStream } from '../types';
import { Banknote, Plus, Trash2, ShieldCheck, HeartHandshake, Sparkles, AlertCircle, Info, User, Heart, Users } from 'lucide-react';

interface FixedIncomeManagerProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const FixedIncomeManager: React.FC<FixedIncomeManagerProps> = ({ profile, onChange }) => {
  const updateField = (field: keyof UserProfile, value: any) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };
  const streams = profile.fixedIncomeStreams || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');

  const isCouple = Boolean(profile.isCouplePlanning);

  const handleAddStream = (presetType: 'pip' | 'rental' | 'consulting' | 'custom_taxfree' | 'custom_taxable') => {
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
        startAge: profile.targetRetirementAge,
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
        startAge: profile.targetRetirementAge,
        endAge: profile.targetRetirementAge + 10,
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
        startAge: profile.targetRetirementAge,
        endAge: undefined,
        inflationLinked: true,
        enabled: true,
      };
    }

    onChange({
      ...profile,
      fixedIncomeStreams: [...streams, newStream],
    });
  };

  const handleUpdateStream = (id: string, updates: Partial<FixedIncomeStream>) => {
    const updated = streams.map((s) => (s.id === id ? { ...s, ...updates } : s));
    onChange({
      ...profile,
      fixedIncomeStreams: updated,
    });
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
            onClick={() => handleAddStream('pip')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            title="Add PIP (Personal Independence Payment - 100% Tax-Free)"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>+ Add PIP (Tax-Free)</span>
          </button>
          
          <button
            onClick={() => handleAddStream('rental')}
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
        <div className="flex items-center justify-between bg-indigo-50/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-indigo-200/70 dark:border-slate-700 text-xs font-bold">
          <span className="text-indigo-900 dark:text-indigo-300 px-3 text-[11px] uppercase tracking-wider font-extrabold">Filter Person:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActivePersonFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activePersonFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Streams ({streams.length})</span>
            </button>
            <button
              onClick={() => setActivePersonFilter('primary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activePersonFilter === 'primary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-300" />
              <span>{profile.name || 'Primary'} ({streams.filter((s) => (s.owner || 'primary') === 'primary').length})</span>
            </button>
            <button
              onClick={() => setActivePersonFilter('partner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activePersonFilter === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-900 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-slate-700/70'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
              <span>{profile.partnerName || 'Partner'} ({streams.filter((s) => s.owner === 'partner').length})</span>
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
              onClick={() => handleAddStream('pip')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Add Tax-Free PIP Payment</span>
            </button>

            <button
              onClick={() => handleAddStream('rental')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rental / Consulting Income</span>
            </button>
          </div>
        </div>
      ) : (
        /* List of Streams */
        <div className="space-y-4">
          {streams
            .filter((s) => (isCouple ? (activePersonFilter === 'all' || (s.owner || 'primary') === activePersonFilter) : (s.owner || 'primary') === 'primary'))
            .map((stream, index) => {
              const isTaxFree = stream.type === 'tax_free';

            return (
              <div
                key={stream.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  !stream.enabled
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                    : isTaxFree
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                }`}
              >
                {/* Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                        isTaxFree ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200' : 'bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={stream.name}
                      onChange={(e) => handleUpdateStream(stream.id, { name: e.target.value })}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:outline-none px-1 py-0.5"
                      placeholder="Income Name (e.g. PIP Payment)"
                    />

                    {profile.isCouplePlanning && (
                      <select
                        value={stream.owner || 'primary'}
                        onChange={(e) => handleUpdateStream(stream.id, { owner: e.target.value as 'primary' | 'partner' })}
                        className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="primary">{profile.name || 'Primary'}</option>
                        <option value="partner">{profile.partnerName || 'Partner'}</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stream.enabled}
                        onChange={(e) => handleUpdateStream(stream.id, { enabled: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>{stream.enabled ? 'Included in Projections' : 'Disabled'}</span>
                    </label>

                    <button
                      onClick={() => handleDeleteStream(stream.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                      title="Delete stream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stream Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-bold">
                  {/* Tax Status Selector */}
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300">Tax Treatment</label>
                    <select
                      value={stream.type}
                      onChange={(e) => handleUpdateStream(stream.id, { type: e.target.value as 'taxable' | 'tax_free' })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold focus:outline-none focus:ring-2 cursor-pointer ${
                        isTaxFree
                          ? 'bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 focus:ring-emerald-500/20'
                          : 'bg-blue-100/80 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 focus:ring-blue-500/20'
                      }`}
                    >
                      <option value="tax_free">Tax-Free (e.g. PIP, Disability)</option>
                      <option value="taxable">Taxable (e.g. Rental, Consulting)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {isTaxFree ? '100% Tax-Free (PIP/DLA)' : 'Subject to UK Income Tax'}
                    </p>
                  </div>

                  {/* Annual Amount */}
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Annual Income (£/yr)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-medium">£</span>
                      <input
                        type="number"
                        min={0}
                        step={250}
                        value={stream.annualAmount ?? ''}
                        onChange={(e) => handleUpdateStream(stream.id, { annualAmount: e.target.value === '' ? ('' as any) : Math.max(0, Number(e.target.value)) })}
                        onBlur={(e) => {
                          let val = Number(e.target.value);
                          if (isNaN(val) || e.target.value === '') val = 0;
                          handleUpdateStream(stream.id, { annualAmount: val });
                        }}
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Amount in today's money</p>
                  </div>

                  {/* Start Age */}
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300">Start Age</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={stream.startAge || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        handleUpdateStream(stream.id, { startAge: val });
                      }}
                      onBlur={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val) || e.target.value === '') val = 0;
                        if (val <= 0) val = profile.targetRetirementAge || 65;
                        val = Math.max(18, Math.min(100, val));
                        handleUpdateStream(stream.id, { startAge: val });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Age income begins</p>
                  </div>

                  {/* End Age (Optional) */}
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>End Age (Optional)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Blank = Lifelong</span>
                    </label>
                    <input
                      type="number"
                      min={stream.startAge}
                      max={100}
                      value={stream.endAge || ''}
                      placeholder="Lifelong"
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        handleUpdateStream(stream.id, { endAge: val });
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          handleUpdateStream(stream.id, { endAge: undefined });
                          return;
                        }
                        let val = Number(e.target.value);
                        if (isNaN(val)) val = 0;
                        if (val < stream.startAge) val = stream.startAge;
                        val = Math.min(100, val);
                        handleUpdateStream(stream.id, { endAge: val });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Age income ceases</p>
                  </div>

                  {/* Inflation Linking */}
                  <div className="space-y-1 flex flex-col justify-between">
                    <label className="text-slate-700 dark:text-slate-300">Inflation Protection</label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <input
                        type="checkbox"
                        checked={stream.inflationLinked}
                        onChange={(e) => handleUpdateStream(stream.id, { inflationLinked: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                        {stream.inflationLinked ? 'CPI Index-Linked' : 'Fixed Nominal'}
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Grows with annual inflation</p>
                  </div>
                </div>

                {/* Informational Footer for Stream */}
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-medium flex items-center justify-between border ${
                    isTaxFree ? 'bg-emerald-100/60 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' : 'bg-blue-100/60 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40 text-blue-900 dark:text-blue-200'
                  }`}
                >
                  <span>
                    <strong>{stream.name}</strong> pays <strong>£{(stream.annualAmount || 0).toLocaleString()}/yr</strong> ({isTaxFree ? '100% Tax-Free' : 'Taxable'}) from age <strong>{stream.startAge}</strong> {stream.endAge ? `until age ${stream.endAge}` : 'for life'}.
                  </span>
                  <Sparkles className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tax Notice & Guidance */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
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
    </div>
  );
};


