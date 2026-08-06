import React, { useState } from 'react';
import { UserProfile, DbPension } from '../types';
import { Building2, Plus, Trash2, ShieldCheck, Banknote, Sparkles, AlertCircle, User, Heart, Users } from 'lucide-react';

interface DbPensionManagerProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const DbPensionManager: React.FC<DbPensionManagerProps> = ({ profile, onChange }) => {
  const dbPensions = profile.dbPensions || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');

  const isCouple = Boolean(profile.isCouplePlanning);

  const handleAddDbPension = () => {
    const ownerToAssign = isCouple
      ? activePersonFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    const newPension: DbPension = {
      id: `db_${Date.now()}`,
      name: `Defined Benefit Scheme ${dbPensions.length + 1}`,
      owner: ownerToAssign,
      startAge: 65,
      annualIncome: 10000,
      taxFreeLumpSum: 30000,
      inflationLinked: true,
      enabled: true,
    };

    onChange({
      ...profile,
      dbPensions: [...dbPensions, newPension],
    });
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
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                Guaranteed Income
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add NHS, Civil Service, Teachers, Armed Forces, or Company Final Salary pensions
            </p>
          </div>
        </div>

        <button
          onClick={handleAddDbPension}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add DB Pension Scheme</span>
        </button>
      </div>

      {/* Person Filter Tabs (Couple Planning) */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50/60 dark:bg-slate-800/60 p-2.5 sm:p-1.5 rounded-2xl border border-amber-200/70 dark:border-slate-700 text-xs font-bold gap-2">
          <span className="text-amber-900 dark:text-amber-300 px-1 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold shrink-0">Filter Person:</span>
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
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
      {dbPensions.length > 0 && (
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
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              If you have a career average or final salary pension (such as NHS, Civil Service, or Teachers scheme), add it here to incorporate guaranteed retirement income & tax-free cash payouts into your projections.
            </p>
          </div>
          <button
            onClick={handleAddDbPension}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-amber-500 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add DB Pension</span>
          </button>
        </div>
      ) : (
        /* List of DB Pensions */
        <div className="space-y-4">
          {dbPensions
            .filter((p) => (isCouple ? (activePersonFilter === 'all' || (p.owner || 'primary') === activePersonFilter) : (p.owner || 'primary') === 'primary'))
            .map((pension, index) => (
              <div
                key={pension.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  pension.enabled
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
              {/* Card Header & Enable Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-800/50">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <span className="w-6 h-6 rounded-lg bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={pension.name}
                      onChange={(e) => handleUpdateDbPension(pension.id, { name: e.target.value })}
                      onBlur={(e) => {
                        let val = e.target.value.trim();
                        if (!val) val = 'DB Pension Scheme';
                        handleUpdateDbPension(pension.id, { name: val });
                      }}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-amber-300 dark:border-amber-700 focus:border-amber-600 focus:outline-none px-1 py-0.5 w-full min-w-0"
                      placeholder="Scheme Name (e.g. NHS Pension)"
                    />
                  </div>

                  {profile.isCouplePlanning && (
                    <div className="flex items-center gap-1 bg-amber-100/60 dark:bg-slate-800 px-2 py-1 rounded-lg border border-amber-200/80 dark:border-slate-700 shrink-0">
                      <User className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      <select
                        value={pension.owner || 'primary'}
                        onChange={(e) => handleUpdateDbPension(pension.id, { owner: e.target.value as 'primary' | 'partner' })}
                        className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-none truncate"
                      >
                        <option value="primary" className="bg-white dark:bg-slate-900">{profile.name || 'Primary'}</option>
                        <option value="partner" className="bg-white dark:bg-slate-900">{profile.partnerName || 'Partner'}</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pension.enabled}
                      onChange={(e) => handleUpdateDbPension(pension.id, { enabled: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-amber-300 dark:border-amber-700 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>{pension.enabled ? 'Included in Model' : 'Disabled'}</span>
                  </label>

                  <button
                    onClick={() => handleDeleteDbPension(pension.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                    title="Remove DB Pension"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs font-bold">
                {/* Start Age */}
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Start Age</span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">Age {pension.startAge || 0}</span>
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={pension.startAge || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      handleUpdateDbPension(pension.id, { startAge: val });
                    }}
                    onBlur={(e) => {
                      let val = Number(e.target.value);
                      if (isNaN(val) || e.target.value === '') val = 0;
                      val = Math.max(18, Math.min(100, val));
                      handleUpdateDbPension(pension.id, { startAge: val });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Age DB payout commences</p>
                </div>

                {/* Duration & End Age Option */}
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Payout Duration</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {(pension.durationOption || 'lifetime') === 'lifetime' ? 'For Life' : `Stops Age ${pension.endAge || 75}`}
                    </span>
                  </label>
                  <select
                    value={pension.durationOption || 'lifetime'}
                    onChange={(e) => {
                      const dur = e.target.value as 'lifetime' | 'until_age';
                      handleUpdateDbPension(pension.id, {
                        durationOption: dur,
                        endAge: dur === 'until_age' ? (pension.endAge || Math.max(pension.startAge + 10, 75)) : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer text-xs"
                  >
                    <option value="lifetime">Lifetime (For Life)</option>
                    <option value="until_age">Stops at Specified Age</option>
                  </select>

                  {(pension.durationOption || 'until_age') === 'until_age' && (
                    <div className="pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">Stops Age:</span>
                        <input
                          type="number"
                          min={pension.startAge || 50}
                          max={100}
                          value={pension.endAge || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            handleUpdateDbPension(pension.id, { endAge: val });
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleUpdateDbPension(pension.id, { endAge: undefined });
                              return;
                            }
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val < pension.startAge) val = pension.startAge;
                            val = Math.min(100, val);
                            handleUpdateDbPension(pension.id, { endAge: val });
                          }}
                          className="w-full px-2 py-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black text-amber-900 dark:text-amber-200 focus:outline-none"
                          placeholder="e.g. 75"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    {(pension.durationOption || 'lifetime') === 'lifetime' ? 'Paid for member lifetime' : `Ceases at Age ${pension.endAge || 75}`}
                  </p>
                </div>

                {/* Annual Income */}
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Annual DB Income (£/yr)</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Guaranteed</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-medium">£</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={pension.annualIncome || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        handleUpdateDbPension(pension.id, { annualIncome: val as number });
                      }}
                      onBlur={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val) || e.target.value === '') val = 0;
                        handleUpdateDbPension(pension.id, { annualIncome: val });
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Income at start age (today's £)</p>
                </div>

                {/* Tax-Free Lump Sum */}
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Tax-Free Lump Sum (£)</span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">One-Off</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-medium">£</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={pension.taxFreeLumpSum || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        handleUpdateDbPension(pension.id, { taxFreeLumpSum: val as number });
                      }}
                      onBlur={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val) || e.target.value === '') val = 0;
                        handleUpdateDbPension(pension.id, { taxFreeLumpSum: val });
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Tax-free cash paid at start age</p>
                </div>

                {/* Lump Sum Destination */}
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Deposit Destination</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Target Pot</span>
                  </label>
                  <select
                    value={pension.targetPot || 'cash_savings'}
                    onChange={(e) => handleUpdateDbPension(pension.id, { targetPot: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer text-xs"
                  >
                    <option value="cash_savings">Cash & Savings Buffer</option>
                    <option value="cash_isa">Cash ISA</option>
                    <option value="stocks_and_shares_isa">Stocks & Shares ISA</option>
                    <option value="gia">General Investment Account (GIA)</option>
                    <option value="lisa">Lifetime ISA (LISA)</option>
                    <option value="spend_clear_debt">Spend / Clear Debt</option>
                  </select>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Where payout is deposited</p>
                </div>

                {/* Inflation Linking */}
                <div className="space-y-1 flex flex-col justify-between">
                  <label className="text-slate-700 dark:text-slate-300">Inflation Protection</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <input
                      type="checkbox"
                      checked={pension.inflationLinked}
                      onChange={(e) => handleUpdateDbPension(pension.id, { inflationLinked: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {pension.inflationLinked ? 'CPI / RPI Linked' : 'Fixed Nominal'}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Increases with inflation</p>
                </div>
              </div>

              {/* Informational Footer for Scheme */}
              <div className="bg-amber-100/50 dark:bg-amber-950/40 p-2.5 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 font-medium flex items-center justify-between border border-amber-200/50 dark:border-amber-800/40">
                <span>
                  At age <strong>{pension.startAge}</strong>: Starts <strong>£{(pension.annualIncome || 0).toLocaleString()}/yr</strong> guaranteed pension {(pension.durationOption === 'until_age' && pension.endAge) ? `until Age ${pension.endAge} (${pension.endAge - pension.startAge} yrs)` : 'for life'} + <strong>£{(pension.taxFreeLumpSum || 0).toLocaleString()}</strong> tax-free lump sum {
                    pension.targetPot === 'spend_clear_debt' ? 'used to Spend / Clear Debt' :
                    `deposited into ${
                      pension.targetPot === 'stocks_and_shares_isa' ? 'Stocks & Shares ISA' :
                      pension.targetPot === 'cash_isa' ? 'Cash ISA' :
                      pension.targetPot === 'lisa' ? 'Lifetime ISA (LISA)' :
                      pension.targetPot === 'gia' ? 'General Investment Account (GIA)' :
                      'Cash & Savings Buffer'
                    }`
                  }.
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Educational Note */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
        <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Defined Benefit vs Defined Contribution:</strong> DB pensions pay a guaranteed index-linked income for life based on salary & service length, unlike DC pensions which depend on investment pot value. The tax-free lump sum reduces required DC drawdown and boosts tax-sheltered ISA/cash reserves upon commencement.
        </p>
      </div>

    </div>
  );
};
