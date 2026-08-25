import React, { useState } from 'react';
import { UserProfile, OneOffContribution, InvestmentPotType, InvestmentContribution } from '../types';
import { Calendar, Plus, Trash2, PiggyBank, Sparkles, Landmark, Coins, ShieldCheck, Info, User, Heart, Users, RefreshCw, Briefcase, Calculator, Pencil } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface InvestmentContributionManagerProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const InvestmentContributionManager: React.FC<InvestmentContributionManagerProps> = ({ profile, onChange, isStudioMode }) => {
  const contributions = profile.oneOffContributions || [];
  const [activePersonFilter, setActivePersonFilter] = useState<'all' | 'primary' | 'partner'>('all');
  const [editItem, setEditItem] = useState<InvestmentContribution | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const isCouple = Boolean(profile.isCouplePlanning);

  const getPotLabel = (pot: InvestmentPotType): string => {
    switch (pot) {
      case 'workplace_pension': return 'Workplace Pension (Gross)';
      case 'sipp': return 'Personal Pension / SIPP (Gross)';
      case 'stocks_and_shares_isa': return 'Stocks & Shares ISA';
      case 'cash_isa': return 'Cash ISA';
      case 'lisa': return 'Lifetime ISA (LISA)';
      case 'gia': return 'General Investment Account (GIA)';
      case 'cash_savings': return 'Cash Savings';
    }
  };

  const getPotCategory = (pot: InvestmentPotType): 'pension' | 'isa' | 'cash_gia' => {
    if (pot === 'workplace_pension' || pot === 'sipp') return 'pension';
    if (pot === 'stocks_and_shares_isa' || pot === 'cash_isa' || pot === 'lisa') return 'isa';
    return 'cash_gia';
  };

  const getDefaultDate = (yearsInFuture: number = 2): string => {
    const currentYear = new Date().getFullYear();
    return `${currentYear + yearsInFuture}-04-05`;
  };

  // Build the draft object for a given preset, then open the modal
  const openAddModal = (preset: 'workplace' | 'monthly_sipp' | 'bonus' | 'downsizing' | 'inheritance' | 'custom') => {
    const currentYear = new Date().getFullYear();
    const ownerToAssign = isCouple
      ? activePersonFilter === 'partner' ? 'partner' : 'primary'
      : 'primary';
    const ownerCurrentAge = ownerToAssign === 'partner' ? (profile.partnerCurrentAge || profile.currentAge) : profile.currentAge;
    const ownerRetirementAge = ownerToAssign === 'partner' ? (profile.partnerTargetRetirementAge || profile.targetRetirementAge) : profile.targetRetirementAge;

    let draft: InvestmentContribution;

    if (preset === 'workplace') {
      draft = {
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
      draft = {
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
      draft = {
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
      draft = {
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
      draft = {
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
      draft = {
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

    setIsAdding(true);
    setEditItem(draft);
  };

  const openEditModal = (item: InvestmentContribution) => {
    setIsAdding(false);
    setEditItem({ ...item });
  };

  const handleSave = () => {
    if (!editItem) return;
    if (isAdding) {
      onChange({ ...profile, oneOffContributions: [...contributions, editItem] });
    } else {
      onChange({
        ...profile,
        oneOffContributions: contributions.map((c) => c.id === editItem.id ? editItem : c),
      });
    }
    setEditItem(null);
  };

  const updateDraft = (updates: Partial<InvestmentContribution>) => {
    setEditItem((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const handleDeleteContribution = (id: string) => {
    onChange({ ...profile, oneOffContributions: contributions.filter((c) => c.id !== id) });
  };

  // Compute Workplace Pension monthly £ amounts
  const calculateWorkplaceAmounts = (item: InvestmentContribution) => {
    const owner = item.owner || 'primary';
    const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
    let employeeMonthly = 0, employerMonthly = 0;
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
    return { salary, employeeMonthly, employerMonthly, totalMonthly, totalAnnual: totalMonthly * 12 };
  };

  // Metrics
  const activeContribs = contributions.filter((c) => c.enabled && (isCouple || (c.owner || 'primary') === 'primary'));
  const totalLumpSums = activeContribs.filter((c) => (c.frequency || 'one_off') === 'one_off').reduce((acc, c) => acc + (c.grossAmount || 0), 0);
  const totalMonthlyRegular = activeContribs.filter((c) => c.frequency === 'regular_monthly').reduce((acc, c) => {
    if (c.targetPot === 'workplace_pension') return acc + calculateWorkplaceAmounts(c).totalMonthly;
    return acc + (c.grossAmount || 0);
  }, 0);

  const computeAgeAtDate = (dateStr?: string): number => {
    if (!dateStr) return profile.currentAge;
    const year = parseInt(dateStr.split('-')[0], 10);
    if (isNaN(year)) return profile.currentAge;
    return Math.max(profile.currentAge, profile.currentAge + (year - new Date().getFullYear()));
  };

  const getTaxYearLabel = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return '';
    const year = parseInt(parts[0], 10), month = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
    if (isNaN(year)) return '';
    if (month > 4 || (month === 4 && day >= 6)) return `Tax Year ${year}/${(year + 1).toString().slice(2)}`;
    return `Tax Year ${year - 1}/${year.toString().slice(2)}`;
  };

  const filteredContribs = contributions.filter((c) =>
    isCouple ? (activePersonFilter === 'all' || (c.owner || 'primary') === activePersonFilter) : (c.owner || 'primary') === 'primary'
  );

  // For modal form, derived from editItem
  const modalFreq = editItem?.frequency || 'one_off';
  const modalIsWorkplace = editItem?.targetPot === 'workplace_pension';
  const modalWorkplaceCalc = editItem && modalIsWorkplace && modalFreq === 'regular_monthly' ? calculateWorkplaceAmounts(editItem) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">

      {/* Header */}
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
        {!isStudioMode && (
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
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">£{totalLumpSums.toLocaleString()}</div>
          </div>
        
      </div>
    )}
    </div>
    {/* Person Filter Tabs */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50/60 dark:bg-slate-800/60 p-2.5 sm:p-1.5 rounded-2xl border border-indigo-200/70 dark:border-slate-700 text-xs font-bold gap-2">
          {!isStudioMode && <span className="text-indigo-900 dark:text-indigo-300 px-1 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold shrink-0">Filter Person:</span>}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'primary', 'partner'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActivePersonFilter(f)}
                className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                  activePersonFilter === f
                    ? f === 'partner' ? 'bg-rose-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
                    : f === 'partner' ? 'text-rose-900 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-slate-700/70'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-100/70 dark:hover:bg-slate-700/70'
                }`}
              >
                {f === 'all' ? <Users className="w-3.5 h-3.5 shrink-0" /> : f === 'primary' ? <User className="w-3.5 h-3.5 shrink-0" /> : <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-300 shrink-0" />}
                <span className="truncate">
                  {f === 'all' ? `All (${contributions.length})` : f === 'primary' ? `${profile.name || 'Primary'} (${contributions.filter(c => (c.owner || 'primary') === 'primary').length})` : `${profile.partnerName || 'Partner'} (${contributions.filter(c => c.owner === 'partner').length})`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isStudioMode && ( <div className="space-y-2">
        {/* Quick Presets */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Presets:</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => openAddModal('workplace')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer">
            <Briefcase className="w-3.5 h-3.5" /><span>+ Regular Workplace Pension</span>
          </button>
          <button onClick={() => openAddModal('monthly_sipp')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /><span>+ Monthly SIPP / ISA Savings</span>
          </button>
          <button onClick={() => openAddModal('bonus')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" /><span>+ Lump Sum Bonus (£15k)</span>
          </button>
          <button onClick={() => openAddModal('downsizing')} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800/60 transition-colors cursor-pointer">
            <Landmark className="w-3.5 h-3.5" /><span>+ Property Sale (£75k)</span>
          </button>
          <button onClick={() => openAddModal('custom')} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ml-auto">
            <Plus className="w-3.5 h-3.5" /><span>Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* Contribution List */}
      </div>)} 
      {filteredContribs.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
          <Coins className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No investment contributions added yet</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Add regular monthly workplace pension contributions, monthly ISA savings, or future lump sum investments above!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContribs.map((item) => {
            const frequency = item.frequency || 'one_off';
            const isWorkplace = item.targetPot === 'workplace_pension';
            const taxYearLabel = getTaxYearLabel(item.date);
            const ownerName = item.owner === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                  item.enabled
                    ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-55'
                }`}
              >
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      frequency === 'regular_monthly'
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}>
                      {frequency === 'regular_monthly' ? 'Monthly' : 'One-Off'}
                    </span>
                    {!item.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Disabled</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                    <span>{getPotLabel(item.targetPot)}</span>
                    {isCouple && <span className="font-medium text-indigo-600 dark:text-indigo-400">{ownerName}</span>}
                    {frequency === 'regular_monthly' ? (
                      isWorkplace ? (
                        <span>Age {item.startAge ?? '?'} – {item.endAge ?? '?'} · Employee {item.workplaceContributionType === 'percent' ? `${item.employeePercent ?? 5}%` : `£${item.employeeMonthlyAmount ?? 0}/mo`} + Employer {item.workplaceContributionType === 'percent' ? `${item.employerPercent ?? 3}%` : `£${item.employerMonthlyAmount ?? 0}/mo`}</span>
                      ) : (
                        <span>Age {item.startAge ?? '?'} – {item.endAge ?? '?'} · £{(item.grossAmount || 0).toLocaleString()}/mo</span>
                      )
                    ) : (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.date || 'No date'} {taxYearLabel && `(${taxYearLabel})`} · £{(item.grossAmount || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-all cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteContribution(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Footer */}
      {contributions.length > 0 && (
        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Regular monthly inputs and lump sum investments are automatically factored into your tax calculations, retirement cash flows, and projection timeline.</span>
        </div>
      )}

      {/* ===== MODAL ===== */}
      {editItem && (
        <ModalShell
          title={isAdding ? 'Add Contribution' : 'Edit Contribution'}
          subtitle={isAdding ? 'Set up a new pension, ISA or lump sum contribution' : `Editing: ${editItem.name}`}
          onSave={handleSave}
          onCancel={() => setEditItem(null)}
          saveLabel={isAdding ? 'Add Contribution' : 'Save Changes'}
          size="lg"
        >
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contribution Name</label>
            <input
              type="text"
              value={editItem.name}
              onChange={(e) => updateDraft({ name: e.target.value })}
              placeholder="e.g. Workplace Pension"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner (couple only) */}
            {isCouple && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Owner</label>
                <select
                  value={editItem.owner || 'primary'}
                  onChange={(e) => updateDraft({ owner: e.target.value as 'primary' | 'partner' })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="primary">{profile.name || 'Primary'}</option>
                  <option value="partner">{profile.partnerName || 'Partner'}</option>
                </select>
              </div>
            )}

            {/* Frequency */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Frequency</label>
              <select
                value={modalFreq}
                onChange={(e) => updateDraft({ frequency: e.target.value as 'one_off' | 'regular_monthly' })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="regular_monthly">Regular Monthly</option>
                <option value="one_off">One-Off Lump Sum</option>
              </select>
            </div>

            {/* Target Pot */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Investment Pot</label>
              <select
                value={editItem.targetPot}
                onChange={(e) => updateDraft({ targetPot: e.target.value as InvestmentPotType })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="workplace_pension">Workplace Pension</option>
                <option value="sipp">Personal Pension / SIPP</option>
                <option value="stocks_and_shares_isa">Stocks &amp; Shares ISA</option>
                <option value="cash_isa">Cash ISA</option>
                <option value="lisa">Lifetime ISA (LISA)</option>
                <option value="gia">General Investment Account (GIA)</option>
                <option value="cash_savings">Cash Savings</option>
              </select>
            </div>

            {/* SIPP: Net vs Gross */}
            {editItem.targetPot === 'sipp' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">SIPP Contribution Basis</label>
                <select
                  value={editItem.sippContributionType || 'net'}
                  onChange={(e) => updateDraft({ sippContributionType: e.target.value as 'net' | 'gross' })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="net">Net (Out of Pocket Paid)</option>
                  <option value="gross">Gross (Total added to SIPP)</option>
                </select>
              </div>
            )}
          </div>

          {/* Workplace pension: contribution method + start/end age */}
          {modalFreq === 'regular_monthly' && modalIsWorkplace && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/60 space-y-3">
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Workplace Pension Settings</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contribution Method</label>
                  <select
                    value={editItem.workplaceContributionType || 'percent'}
                    onChange={(e) => updateDraft({ workplaceContributionType: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                  >
                    <option value="percent">% Salary Contributions</option>
                    <option value="fixed">£ Monthly Fixed Contributions</option>
                  </select>
                </div>

                {editItem.workplaceContributionType === 'fixed' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee Monthly (£/mo)</label>
                      <input type="number" step="10" value={editItem.employeeMonthlyAmount ?? editItem.grossAmount ?? 250}
                        onChange={(e) => updateDraft({ employeeMonthlyAmount: Number(e.target.value), grossAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employer Monthly Match (£/mo)</label>
                      <input type="number" step="10" value={editItem.employerMonthlyAmount ?? 150}
                        onChange={(e) => updateDraft({ employerMonthlyAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee % of Salary</label>
                      <input type="number" step="0.5" value={editItem.employeePercent ?? 5}
                        onChange={(e) => updateDraft({ employeePercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employer Match % of Salary</label>
                      <input type="number" step="0.5" value={editItem.employerPercent ?? 3}
                        onChange={(e) => updateDraft({ employerPercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                    </div>
                  </>
                )}
              </div>

              {/* Calculated monthly display */}
              {modalWorkplaceCalc && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold text-indigo-950 dark:text-indigo-100">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Calculated ({editItem.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'} salary £{(modalWorkplaceCalc.salary || 0).toLocaleString()}/yr):</span>
                  </div>
                  <span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">£{Math.round(modalWorkplaceCalc.employeeMonthly).toLocaleString()}/mo</span>
                    <span className="text-slate-400 px-1">+</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-extrabold">£{Math.round(modalWorkplaceCalc.employerMonthly).toLocaleString()}/mo employer</span>
                    <span className="text-slate-600 dark:text-slate-300 font-black ml-2">= £{Math.round(modalWorkplaceCalc.totalMonthly).toLocaleString()}/mo (£{Math.round(modalWorkplaceCalc.totalAnnual).toLocaleString()}/yr)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Regular monthly non-workplace: amount + age range */}
          {modalFreq === 'regular_monthly' && !modalIsWorkplace && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Amount (£/mo)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">£</span>
                  <input type="number" min="0" step="25" value={editItem.grossAmount || ''}
                    onChange={(e) => updateDraft({ grossAmount: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Age</label>
                <input type="number" value={editItem.startAge ?? profile.currentAge}
                  onChange={(e) => updateDraft({ startAge: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Age</label>
                <input type="number" value={editItem.endAge ?? profile.targetRetirementAge}
                  onChange={(e) => updateDraft({ endAge: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Workplace monthly: age range */}
          {modalFreq === 'regular_monthly' && modalIsWorkplace && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Age</label>
                <input type="number" value={editItem.startAge ?? profile.currentAge}
                  onChange={(e) => updateDraft({ startAge: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Age</label>
                <input type="number" value={editItem.endAge ?? profile.targetRetirementAge}
                  onChange={(e) => updateDraft({ endAge: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>
          )}

          {/* One-off: amount + date */}
          {modalFreq === 'one_off' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {editItem.targetPot === 'sipp'
                    ? editItem.sippContributionType === 'gross' ? 'Gross SIPP Amount (£)' : 'Net Out-of-Pocket Amount (£)'
                    : 'Gross Amount (£)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">£</span>
                  <input type="number" min="0" step="500" value={editItem.grossAmount || ''}
                    onChange={(e) => updateDraft({ grossAmount: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Date</label>
                <input type="date" min={`${new Date().getFullYear()}-01-01`}
                  value={editItem.date || getDefaultDate(2)}
                  onChange={(e) => updateDraft({ date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer" />
              </div>
            </div>
          )}

          {/* SIPP Tax Relief Panel (read-only info) */}
          {editItem.targetPot === 'sipp' && (editItem.grossAmount || 0) > 0 && (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-100">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  UK Pension Tax Relief Breakdown
                </span>
                <span className="bg-emerald-200/90 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-100 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">+25% HMRC Relief</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Net Paid</div>
                  <div className="text-emerald-700 dark:text-emerald-300 font-black text-sm mt-0.5">
                    £{editItem.sippContributionType === 'gross' ? Math.round((editItem.grossAmount || 0) * 0.80).toLocaleString() : Math.round(editItem.grossAmount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">+ 20% Relief</div>
                  <div className="text-emerald-600 font-black text-sm mt-0.5">
                    +£{editItem.sippContributionType === 'gross' ? Math.round((editItem.grossAmount || 0) * 0.20).toLocaleString() : Math.round((editItem.grossAmount || 0) * 0.25).toLocaleString()}
                  </div>
                </div>
                <div className="bg-emerald-600 text-white p-2.5 rounded-lg shadow-2xs">
                  <div className="text-[10px] text-emerald-100 font-bold uppercase">Gross in SIPP</div>
                  <div className="font-black text-sm mt-0.5">
                    £{editItem.sippContributionType === 'gross' ? Math.round(editItem.grossAmount || 0).toLocaleString() : Math.round((editItem.grossAmount || 0) * 1.25).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enabled toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <input type="checkbox" checked={editItem.enabled}
              onChange={(e) => updateDraft({ enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {editItem.enabled ? 'Included in projections' : 'Disabled (excluded from model)'}
            </span>
          </label>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes / Description (optional)</label>
            <textarea
              value={editItem.description || ''}
              onChange={(e) => updateDraft({ description: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>
        </ModalShell>
      )}
    </div>
  );
};

// Re-export alias for compatibility
export const OneOffContributionManager = InvestmentContributionManager;
