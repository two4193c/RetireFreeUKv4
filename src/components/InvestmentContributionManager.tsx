import React, { useState } from 'react';
import { UserProfile, OneOffContribution, InvestmentPotType, InvestmentContribution } from '../types';
import { Calendar, Plus, Trash2, PiggyBank, Sparkles, Landmark, Coins, ShieldCheck, Info, User, Heart, Users, RefreshCw, Briefcase, Calculator } from 'lucide-react';

interface InvestmentContributionManagerProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const InvestmentContributionManager: React.FC<InvestmentContributionManagerProps> = ({ profile, onChange }) => {
  const contributions = profile.oneOffContributions || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');

  const isCouple = Boolean(profile.isCouplePlanning);

  const getPotLabel = (pot: InvestmentPotType): string => {
    switch (pot) {
      case 'workplace_pension':
        return 'Workplace Pension (Gross)';
      case 'sipp':
        return 'Personal Pension / SIPP (Gross)';
      case 'stocks_and_shares_isa':
        return 'Stocks & Shares ISA';
      case 'cash_isa':
        return 'Cash ISA';
      case 'lisa':
        return 'Lifetime ISA (LISA)';
      case 'gia':
        return 'General Investment Account (GIA)';
      case 'cash_savings':
        return 'Cash Savings';
    }
  };

  const getPotCategory = (pot: InvestmentPotType): 'pension' | 'isa' | 'cash_gia' => {
    if (pot === 'workplace_pension' || pot === 'sipp') return 'pension';
    if (pot === 'stocks_and_shares_isa' || pot === 'cash_isa' || pot === 'lisa') return 'isa';
    return 'cash_gia';
  };

  // Helper to format default dates in YYYY-MM-DD
  const getDefaultDate = (yearsInFuture: number = 2): string => {
    const currentYear = new Date().getFullYear();
    return `${currentYear + yearsInFuture}-04-05`;
  };

  const handleAddContribution = (preset: 'workplace' | 'monthly_sipp' | 'bonus' | 'downsizing' | 'inheritance' | 'custom') => {
    let newContrib: InvestmentContribution;
    const currentYear = new Date().getFullYear();

    const ownerToAssign = isCouple
      ? activePersonFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    const ownerCurrentAge = ownerToAssign === 'partner' ? (profile.partnerCurrentAge || profile.currentAge) : profile.currentAge;
    const ownerRetirementAge = ownerToAssign === 'partner' ? (profile.partnerTargetRetirementAge || profile.targetRetirementAge) : profile.targetRetirementAge;

    if (preset === 'workplace') {
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Workplace Pension Monthly Contribution',
        owner: ownerToAssign,
        targetPot: 'workplace_pension',
        frequency: 'regular_monthly',
        grossAmount: 0,
        startAge: ownerCurrentAge,
        endAge: ownerRetirementAge,
        workplaceContributionType: 'percent',
        employeePercent: 5,
        employerPercent: 3,
        enabled: true,
        description: 'Monthly salary sacrifice / auto-enrolment pension',
      };
    } else if (preset === 'monthly_sipp') {
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Regular Monthly SIPP Savings',
        owner: ownerToAssign,
        targetPot: 'sipp',
        frequency: 'regular_monthly',
        grossAmount: 300,
        startAge: ownerCurrentAge,
        endAge: ownerRetirementAge,
        enabled: true,
        description: 'Monthly personal pension contributions',
      };
    } else if (preset === 'bonus') {
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Workplace Annual Bonus Lump Sum',
        owner: ownerToAssign,
        targetPot: 'sipp',
        frequency: 'one_off',
        grossAmount: 15000,
        date: `${currentYear + 1}-03-31`,
        enabled: true,
        description: 'Gross bonus sacrificed into SIPP prior to tax year end',
      };
    } else if (preset === 'downsizing') {
      const retirementYear = currentYear + Math.max(1, ownerRetirementAge - ownerCurrentAge);
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Property Downsizing Equity Release',
        owner: ownerToAssign,
        targetPot: 'stocks_and_shares_isa',
        frequency: 'one_off',
        grossAmount: 75000,
        date: `${retirementYear}-06-01`,
        enabled: true,
        description: 'Lump sum equity release from property move',
      };
    } else if (preset === 'inheritance') {
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Inheritance / Family Gift',
        owner: ownerToAssign,
        targetPot: 'stocks_and_shares_isa',
        frequency: 'one_off',
        grossAmount: 50000,
        date: `${currentYear + 3}-09-15`,
        enabled: true,
        description: 'Tax-free inheritance capital allocated to investments',
      };
    } else {
      newContrib = {
        id: `contrib_${Date.now()}`,
        name: 'Custom Contribution',
        owner: ownerToAssign,
        targetPot: 'stocks_and_shares_isa',
        frequency: 'regular_monthly',
        grossAmount: 250,
        startAge: ownerCurrentAge,
        endAge: ownerRetirementAge,
        enabled: true,
        description: 'Ongoing monthly investment',
      };
    }

    onChange({
      ...profile,
      oneOffContributions: [...contributions, newContrib],
    });
  };

  const handleUpdateContribution = (id: string, updates: Partial<InvestmentContribution>) => {
    const updated = contributions.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onChange({
      ...profile,
      oneOffContributions: updated,
    });
  };

  const handleDeleteContribution = (id: string) => {
    const updated = contributions.filter((c) => c.id !== id);
    onChange({
      ...profile,
      oneOffContributions: updated,
    });
  };

  // Compute Workplace Pension monthly £ amounts for a contribution item
  const calculateWorkplaceAmounts = (item: InvestmentContribution) => {
    const owner = item.owner || 'primary';
    const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);

    let employeeMonthly = 0;
    let employerMonthly = 0;

    if (item.workplaceContributionType === 'fixed') {
      employeeMonthly = item.employeeMonthlyAmount || item.grossAmount || 0;
      employerMonthly = item.employerMonthlyAmount || 0;
    } else {
      const empPct = item.employeePercent ?? 5;
      const emprPct = item.employerPercent ?? 3;
      employeeMonthly = (salary * (empPct / 100)) / 12;
      employerMonthly = (salary * (emprPct / 100)) / 12;
    }

    const totalMonthly = employeeMonthly + employerMonthly;
    const totalAnnual = totalMonthly * 12;

    return {
      salary,
      employeeMonthly,
      employerMonthly,
      totalMonthly,
      totalAnnual,
    };
  };

  // Metrics calculations
  const activeContribs = contributions.filter((c) => c.enabled && (isCouple || (c.owner || 'primary') === 'primary'));
  const totalLumpSums = activeContribs
    .filter((c) => (c.frequency || 'one_off') === 'one_off')
    .reduce((acc, c) => acc + (c.grossAmount || 0), 0);

  const totalMonthlyRegular = activeContribs
    .filter((c) => c.frequency === 'regular_monthly')
    .reduce((acc, c) => {
      if (c.targetPot === 'workplace_pension') {
        const { totalMonthly } = calculateWorkplaceAmounts(c);
        return acc + totalMonthly;
      }
      return acc + (c.grossAmount || 0);
    }, 0);

  // Helper to compute user age at contribution date
  const computeAgeAtDate = (dateStr?: string): number => {
    if (!dateStr) return profile.currentAge;
    const year = parseInt(dateStr.split('-')[0], 10);
    if (isNaN(year)) return profile.currentAge;
    const yearOffset = year - new Date().getFullYear();
    return Math.max(profile.currentAge, profile.currentAge + yearOffset);
  };

  // Helper to compute UK Tax Year
  const getTaxYearLabel = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year)) return '';

    if (month > 4 || (month === 4 && day >= 6)) {
      return `Tax Year ${year}/${(year + 1).toString().slice(2)}`;
    } else {
      return `Tax Year ${year - 1}/${year.toString().slice(2)}`;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header & Total Summary Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Contributions</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Manage regular monthly contributions and one-off lump sums across your pension, ISA, and investment pots
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Regular Monthly</div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              £{Math.round(totalMonthlyRegular).toLocaleString()} <span className="text-xs font-normal text-slate-400">/mo</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Planned Lump Sums</div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">
              £{totalLumpSums.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Person Filter Tabs (Couple Planning) */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50/60 dark:bg-slate-800/60 p-2.5 sm:p-1.5 rounded-2xl border border-indigo-200/70 dark:border-slate-700 text-xs font-bold gap-2">
          <span className="text-indigo-900 dark:text-indigo-300 px-1 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold shrink-0">Filter Person:</span>
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
              <span className="truncate">All ({contributions.length})</span>
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
              <span className="truncate">{profile.name || 'Primary'} ({contributions.filter((c) => (c.owner || 'primary') === 'primary').length})</span>
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
              <span className="truncate">{profile.partnerName || 'Partner'} ({contributions.filter((c) => c.owner === 'partner').length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Preset Quick Actions */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Presets:</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAddContribution('workplace')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>+ Regular Workplace Pension</span>
          </button>

          <button
            onClick={() => handleAddContribution('monthly_sipp')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>+ Monthly SIPP / ISA Savings</span>
          </button>

          <button
            onClick={() => handleAddContribution('bonus')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Lump Sum Bonus (£15k)</span>
          </button>

          <button
            onClick={() => handleAddContribution('downsizing')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800/60 transition-colors cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>+ Property Sale (£75k)</span>
          </button>

          <button
            onClick={() => handleAddContribution('custom')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* List of Contributions */}
      {contributions.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
          <Coins className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No investment contributions added yet</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Add regular monthly workplace pension contributions, monthly ISA savings, or future lump sum investments above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contributions
            .filter((c) => (isCouple ? (activePersonFilter === 'all' || (c.owner || 'primary') === activePersonFilter) : (c.owner || 'primary') === 'primary'))
            .map((item) => {
              const frequency = item.frequency || 'one_off';
              const potCategory = getPotCategory(item.targetPot);
              const isWorkplace = item.targetPot === 'workplace_pension';
              const ageAtDate = computeAgeAtDate(item.date);
              const taxYearLabel = getTaxYearLabel(item.date);

              const workplaceCalculated = isWorkplace && frequency === 'regular_monthly' ? calculateWorkplaceAmounts(item) : null;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    item.enabled
                      ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-2xs'
                      : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Name & Enable Switch & Person Select */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => handleUpdateContribution(item.id, { enabled: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateContribution(item.id, { name: e.target.value })}
                          placeholder="Contribution Name"
                          className="font-extrabold text-slate-900 dark:text-slate-100 text-sm bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full min-w-0"
                        />
                      </div>

                      {profile.isCouplePlanning && (
                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-100 dark:border-slate-700 shrink-0">
                          <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <select
                            value={item.owner || 'primary'}
                            onChange={(e) => handleUpdateContribution(item.id, { owner: e.target.value as 'primary' | 'partner' })}
                            className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-none truncate"
                          >
                            <option value="primary" className="bg-white dark:bg-slate-900">{profile.name || 'Primary'}</option>
                            <option value="partner" className="bg-white dark:bg-slate-900">{profile.partnerName || 'Partner'}</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Frequency Badge & Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-[10px] font-bold shrink-0">
                      <select
                        value={frequency}
                        onChange={(e) => handleUpdateContribution(item.id, { frequency: e.target.value as 'one_off' | 'regular_monthly' })}
                        className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 font-bold cursor-pointer"
                      >
                        <option value="regular_monthly">Regular Monthly</option>
                        <option value="one_off">One-Off Lump Sum</option>
                      </select>

                      {frequency === 'one_off' && taxYearLabel && (
                        <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                          {taxYearLabel}
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteContribution(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer ml-1"
                        title="Delete contribution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* FORM FIELDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    
                    {/* Target Pot Selector */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Target Investment Pot
                      </label>
                      <select
                        value={item.targetPot}
                        onChange={(e) => handleUpdateContribution(item.id, { targetPot: e.target.value as InvestmentPotType })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="workplace_pension">Workplace Pension</option>
                        <option value="sipp">Personal Pension / SIPP</option>
                        <option value="stocks_and_shares_isa">Stocks & Shares ISA</option>
                        <option value="cash_isa">Cash ISA</option>
                        <option value="lisa">Lifetime ISA (LISA)</option>
                        <option value="gia">General Investment Account (GIA)</option>
                        <option value="cash_savings">Cash Savings</option>
                      </select>
                    </div>

                    {/* SIPP Net vs Gross basis toggle */}
                    {item.targetPot === 'sipp' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          Contribution Basis
                        </label>
                        <select
                          value={item.sippContributionType || 'net'}
                          onChange={(e) => handleUpdateContribution(item.id, { sippContributionType: e.target.value as 'net' | 'gross' })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="net">Net (Out of Pocket Paid)</option>
                          <option value="gross">Gross (Total added to SIPP)</option>
                        </select>
                      </div>
                    )}

                    {/* IF REGULAR MONTHLY AND WORKPLACE PENSION */}
                    {frequency === 'regular_monthly' && isWorkplace ? (
                      <>
                        {/* Workplace Contribution Type (% vs £) */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            Contribution Method
                          </label>
                          <select
                            value={item.workplaceContributionType || 'percent'}
                            onChange={(e) => handleUpdateContribution(item.id, { workplaceContributionType: e.target.value as 'percent' | 'fixed' })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="percent">% Salary Contributions</option>
                            <option value="fixed">£ Monthly Fixed Contributions</option>
                          </select>
                        </div>

                        {/* Start & End Age */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            Start & End Age
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.startAge ?? profile.currentAge}
                              onChange={(e) => handleUpdateContribution(item.id, { startAge: Number(e.target.value) })}
                              className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                              placeholder="Start Age"
                            />
                            <span className="text-slate-400 font-bold text-xs">-</span>
                            <input
                              type="number"
                              value={item.endAge ?? profile.targetRetirementAge}
                              onChange={(e) => handleUpdateContribution(item.id, { endAge: Number(e.target.value) })}
                              className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                              placeholder="End Age"
                            />
                          </div>
                        </div>
                      </>
                    ) : frequency === 'regular_monthly' ? (
                      /* IF REGULAR MONTHLY FOR OTHER POTS (SIPP / ISA) */
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            Monthly Contribution (£/mo)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              step="25"
                              value={item.grossAmount || ''}
                              onChange={(e) => handleUpdateContribution(item.id, { grossAmount: Number(e.target.value) })}
                              placeholder="250"
                              className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            Start & End Age
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.startAge ?? profile.currentAge}
                              onChange={(e) => handleUpdateContribution(item.id, { startAge: Number(e.target.value) })}
                              className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                              placeholder="Start Age"
                            />
                            <span className="text-slate-400 font-bold text-xs">-</span>
                            <input
                              type="number"
                              value={item.endAge ?? profile.targetRetirementAge}
                              onChange={(e) => handleUpdateContribution(item.id, { endAge: Number(e.target.value) })}
                              className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                              placeholder="End Age"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* IF ONE-OFF LUMP SUM */
                      <>
                        {/* Amount Input with Net/Gross contextual label */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {item.targetPot === 'sipp'
                              ? item.sippContributionType === 'gross'
                                ? 'Gross SIPP Amount (£)'
                                : 'Net Out-of-Pocket Amount (£)'
                              : 'Gross Amount (£)'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={item.grossAmount || ''}
                              onChange={(e) => handleUpdateContribution(item.id, { grossAmount: Number(e.target.value) })}
                              placeholder={item.targetPot === 'sipp' ? (item.sippContributionType === 'gross' ? '12500' : '10000') : '10000'}
                              className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Target Date Picker */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            Target Date
                          </label>
                          <input
                            type="date"
                            min={`${new Date().getFullYear()}-01-01`}
                            value={item.date || getDefaultDate(2)}
                            onChange={(e) => handleUpdateContribution(item.id, { date: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                          />
                        </div>
                      </>
                    )}

                  </div>

                  {/* SECOND ROW FOR WORKPLACE PENSION % OR £ INPUTS & COMPUTED MONTHLY £ DISPLAY */}
                  {frequency === 'regular_monthly' && isWorkplace && (
                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/60 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.workplaceContributionType === 'fixed' ? (
                          <>
                            <div>
                              <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                                Employee Monthly (£/mo)
                              </label>
                              <input
                                type="number"
                                step="10"
                                value={item.employeeMonthlyAmount ?? item.grossAmount ?? 250}
                                onChange={(e) => handleUpdateContribution(item.id, { employeeMonthlyAmount: Number(e.target.value), grossAmount: Number(e.target.value) })}
                                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                                Employer Monthly Match (£/mo)
                              </label>
                              <input
                                type="number"
                                step="10"
                                value={item.employerMonthlyAmount ?? 150}
                                onChange={(e) => handleUpdateContribution(item.id, { employerMonthlyAmount: Number(e.target.value) })}
                                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                                Employee Contribution (% of salary)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={item.employeePercent ?? 5}
                                onChange={(e) => handleUpdateContribution(item.id, { employeePercent: Number(e.target.value) })}
                                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                                Employer Match (% of salary)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={item.employerPercent ?? 3}
                                onChange={(e) => handleUpdateContribution(item.id, { employerPercent: Number(e.target.value) })}
                                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* DISPLAY COMPUTED MONTHLY £ AMOUNT VERY CLEARLY */}
                      {workplaceCalculated && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold text-indigo-950 dark:text-indigo-100">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>
                              Calculated Monthly Input ({item.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'} salary £{(workplaceCalculated.salary || 0).toLocaleString()}/yr):
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                              £{Math.round(workplaceCalculated.employeeMonthly).toLocaleString()}/mo
                            </span>
                            <span className="text-slate-400 font-normal text-xs px-1">+</span>
                            <span className="text-indigo-600 dark:text-indigo-300 font-extrabold text-sm">
                              £{Math.round(workplaceCalculated.employerMonthly).toLocaleString()}/mo employer
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 font-black text-sm ml-2">
                              = £{Math.round(workplaceCalculated.totalMonthly).toLocaleString()}/mo total (£{Math.round(workplaceCalculated.totalAnnual).toLocaleString()}/yr)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIPP TAX RELIEF BREAKDOWN (FOR BOTH ONE-OFF LUMP SUM & REGULAR MONTHLY) */}
                  {item.targetPot === 'sipp' && (
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-100">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            UK Pension Tax Relief Breakdown {frequency === 'one_off' ? '(One-Off Lump Sum)' : '(Regular Monthly)'}:
                          </span>
                        </span>
                        <span className="bg-emerald-200/90 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-100 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                          +25% HMRC Relief Added
                        </span>
                      </div>

                      {frequency === 'one_off' ? (
                        /* One-off Lump Sum SIPP breakdown */
                        <div className="space-y-2.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                {item.sippContributionType === 'gross' ? 'Net Out-of-Pocket Cost' : 'Net Paid Out-of-Pocket'}
                              </div>
                              <div className="text-emerald-700 dark:text-emerald-300 font-black text-sm mt-0.5">
                                £{item.sippContributionType === 'gross'
                                  ? Math.round((item.grossAmount || 0) * 0.80).toLocaleString()
                                  : Math.round(item.grossAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-[9.5px] text-slate-400 font-semibold mt-0.5">From net salary / bank account</div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                                + Basic Rate Relief (20%)
                              </div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm mt-0.5">
                                +£{item.sippContributionType === 'gross'
                                  ? Math.round((item.grossAmount || 0) * 0.20).toLocaleString()
                                  : Math.round((item.grossAmount || 0) * 0.25).toLocaleString()}
                              </div>
                              <div className="text-[9.5px] text-emerald-600/80 font-semibold mt-0.5">Claimed & added by provider into SIPP</div>
                            </div>

                            <div className="bg-emerald-600 text-white p-2.5 rounded-lg shadow-2xs">
                              <div className="text-[10px] text-emerald-100 font-bold uppercase">
                                Total Gross Credit to SIPP
                              </div>
                              <div className="font-black text-sm mt-0.5">
                                £{item.sippContributionType === 'gross'
                                  ? Math.round(item.grossAmount || 0).toLocaleString()
                                  : Math.round((item.grossAmount || 0) * 1.25).toLocaleString()}
                              </div>
                              <div className="text-[9.5px] text-emerald-100/90 font-medium mt-0.5">Full capital growing in pension pot</div>
                            </div>
                          </div>

                          {/* Higher & Additional rate tax relief callout */}
                          <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] text-emerald-950 dark:text-emerald-100 leading-relaxed flex items-start gap-2">
                            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-extrabold text-emerald-900 dark:text-emerald-300">Higher & Additional Rate Taxpayers: </strong>
                              If you pay 40% Income Tax, claim an extra 20% (<strong className="font-black">£{Math.round((item.grossAmount || 0) * (item.sippContributionType === 'gross' ? 0.20 : 0.25)).toLocaleString()}</strong>) rebate via Self Assessment or tax code change. If 45% tax, claim an extra 25% (<strong className="font-black">£{Math.round((item.grossAmount || 0) * (item.sippContributionType === 'gross' ? 0.25 : 0.3125)).toLocaleString()}</strong>). Total effective tax relief is 40%–45%!
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Regular Monthly SIPP breakdown */
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          {item.sippContributionType === 'gross' ? (
                            <>
                              <span className="text-slate-600 dark:text-slate-300">
                                SIPP Gross Input: <strong className="text-indigo-700 dark:text-indigo-300">£{(item.grossAmount || 0).toLocaleString()}/mo</strong> (£{((item.grossAmount || 0) * 12).toLocaleString()}/yr)
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                Basic Relief: +£{Math.round((item.grossAmount || 0) * 0.20).toLocaleString()}/mo
                              </span>
                              <span className="text-slate-700 dark:text-slate-200">
                                Net Out-of-Pocket: <strong className="text-emerald-600">£{Math.round((item.grossAmount || 0) * 0.80).toLocaleString()}/mo</strong>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-600 dark:text-slate-300">
                                Net Out-of-Pocket: <strong className="text-emerald-600">£{(item.grossAmount || 0).toLocaleString()}/mo</strong> (£{((item.grossAmount || 0) * 12).toLocaleString()}/yr)
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                +25% Basic Relief: +£{Math.round((item.grossAmount || 0) * 0.25).toLocaleString()}/mo
                              </span>
                              <span className="text-indigo-700 dark:text-indigo-300">
                                SIPP Gross Input: <strong>£{Math.round((item.grossAmount || 0) * 1.25).toLocaleString()}/mo</strong> (£{Math.round((item.grossAmount || 0) * 15).toLocaleString()}/yr)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DISPLAY MONTHLY TOTAL FOR OTHER REGULAR CONTRIBUTIONS (ISA / GIA / Cash) */}
                  {frequency === 'regular_monthly' && item.targetPot !== 'sipp' && !isWorkplace && (
                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/50 space-y-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          Annualized Investment Input:
                        </span>
                        <span>
                          £{((item.grossAmount || 0) * 12).toLocaleString()}/year ({item.startAge ?? profile.currentAge} to {item.endAge ?? profile.targetRetirementAge})
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
        </div>
      )}

      {/* Summary Footer Callout */}
      {contributions.length > 0 && (
        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Regular monthly inputs and lump sum investments are automatically factored into your tax calculations, retirement cash flows, and projection timeline.
          </span>
        </div>
      )}

    </div>
  );
};

// Re-export OneOffContributionManager as an alias for compatibility
export const OneOffContributionManager = InvestmentContributionManager;
