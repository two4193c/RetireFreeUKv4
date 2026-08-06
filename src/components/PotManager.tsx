import React, { useState } from 'react';
import { UserProfile, InvestmentPots, UKTaxResult } from '../types';
import { Landmark, PiggyBank, Coins, User, Heart, Users, ArrowRight, Briefcase, Sparkles, Gift } from 'lucide-react';

interface PotManagerProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChange: (updatedPots: InvestmentPots) => void;
  taxResult?: UKTaxResult;
  partnerPots?: InvestmentPots;
  onPartnerPotsChange?: (updatedPartnerPots: InvestmentPots) => void;
  onProfileChange?: (updatedProfile: UserProfile) => void;
}

export const PotManager: React.FC<PotManagerProps> = ({
  profile,
  pots,
  onChange,
  taxResult,
  partnerPots,
  onPartnerPotsChange,
  onProfileChange,
}) => {
  const [activePerson, setActivePerson] = useState<'primary' | 'partner'>('primary');
  const [activeTab, setActiveTab] = useState<'pension' | 'isa' | 'cash_gia'>('pension');

  const isCouple = Boolean(profile.isCouplePlanning);

  // Fallback partner pots structure
  const fallbackPartnerPots: InvestmentPots = partnerPots || profile.partnerPots || {
    workplacePensionBalance: profile.partnerWorkplacePensionBalance || 0,
    workplacePensionMonthlyEmployee: 0,
    workplacePensionMonthlyEmployeeType: 'percent',
    employerMatchPercentage: 0,
    sippBalance: profile.partnerSippBalance || 0,
    sippMonthlyContribution: 0,
    stocksAndSharesIsaBalance: profile.partnerIsaBalance || 0,
    stocksAndSharesIsaMonthlyContribution: 0,
    cashIsaBalance: 0,
    cashIsaMonthlyContribution: 0,
    lisaBalance: 0,
    lisaMonthlyContribution: 0,
    giaBalance: 0,
    giaMonthlyContribution: 0,
    cashSavingsBalance: 0,
    cashSavingsMonthlyContribution: 0,
  };

  // Currently viewed pots based on active tab
  const currentPots = activePerson === 'partner' ? fallbackPartnerPots : pots;

  const updateField = (field: keyof InvestmentPots, value: any) => {
    const newPots = {
      ...currentPots,
      [field]: value,
    };

    if (activePerson === 'partner') {
      if (onPartnerPotsChange) {
        onPartnerPotsChange(newPots);
      } else if (onProfileChange) {
        onProfileChange({
          ...profile,
          partnerPots: newPots,
          partnerWorkplacePensionBalance: newPots.workplacePensionBalance,
          partnerSippBalance: newPots.sippBalance,
          partnerIsaBalance: newPots.stocksAndSharesIsaBalance,
        });
      }
    } else {
      onChange(newPots);
    }
  };

  // Primary Pot Balances
  const primaryPensionBal = pots.workplacePensionBalance + pots.sippBalance;
  const primaryIsaBal = pots.stocksAndSharesIsaBalance + pots.cashIsaBalance + pots.lisaBalance;
  const primaryCashGiaBal = pots.giaBalance + pots.cashSavingsBalance;
  const primaryTotalBal = primaryPensionBal + primaryIsaBal + primaryCashGiaBal;

  // Partner Pot Balances
  const partnerPensionBal = fallbackPartnerPots.workplacePensionBalance + fallbackPartnerPots.sippBalance;
  const partnerIsaBal = fallbackPartnerPots.stocksAndSharesIsaBalance + fallbackPartnerPots.cashIsaBalance + fallbackPartnerPots.lisaBalance;
  const partnerCashGiaBal = fallbackPartnerPots.giaBalance + fallbackPartnerPots.cashSavingsBalance;
  const partnerTotalBal = partnerPensionBal + partnerIsaBal + partnerCashGiaBal;

  // Combined Totals
  const combinedTotalBal = isCouple ? primaryTotalBal + partnerTotalBal : primaryTotalBal;

  // Currently viewed person stats (for tabs)
  const totalPensionBalance = currentPots.workplacePensionBalance + currentPots.sippBalance;
  const totalIsaBalance = currentPots.stocksAndSharesIsaBalance + currentPots.cashIsaBalance + currentPots.lisaBalance;
  const totalCashGiaBalance = currentPots.giaBalance + currentPots.cashSavingsBalance;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Investment Pots Balance</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isCouple 
              ? 'Enter starting balances for household pension, ISA, and investment accounts'
              : 'Enter current starting balances for your UK pension and investment tax shelters'}
          </p>
        </div>

        {/* Quick Person Switcher */}
        {isCouple && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-2">Editing:</span>
            <button
              type="button"
              onClick={() => setActivePerson('primary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                activePerson === 'primary'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{profile?.name || 'Primary'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePerson('partner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                activePerson === 'partner'
                  ? 'bg-rose-500 text-white shadow-xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activePerson === 'partner' ? 'fill-white' : 'text-rose-500 fill-rose-500'}`} />
              <span>{profile?.partnerName || 'Partner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* PORTFOLIO SUMMARY CARDS: COMBINED, PRIMARY, & PARTNER */}
      {isCouple ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Combined Household Portfolio */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-slate-950 text-slate-900 dark:text-white border border-emerald-200 dark:border-slate-800 shadow-md space-y-2 relative overflow-hidden transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Combined Household Starting Balance
              </span>
              <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Joint Total
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                £{(combinedTotalBal || 0).toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
              <span>Pensions: £{(primaryPensionBal + partnerPensionBal || 0).toLocaleString()}</span>
              <span>ISAs: £{(primaryIsaBal + partnerIsaBal || 0).toLocaleString()}</span>
              <span>Cash/GIA: £{(primaryCashGiaBal + partnerCashGiaBal || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Primary Portfolio */}
          <div
            onClick={() => setActivePerson('primary')}
            className={`p-4 rounded-2xl transition-all cursor-pointer border space-y-2 relative ${
              activePerson === 'primary'
                ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/30 shadow-xs'
                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{profile?.name || 'Primary Portfolio'}</span>
              </span>
              {activePerson === 'primary' ? (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Editing Now
                </span>
              ) : (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5">
                  Edit <ArrowRight className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                £{(primaryTotalBal || 0).toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Pension: £{(primaryPensionBal || 0).toLocaleString()}</span>
              <span>ISA: £{(primaryIsaBal || 0).toLocaleString()}</span>
              <span>Cash/GIA: £{(primaryCashGiaBal || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 3: Partner Portfolio */}
          <div
            onClick={() => setActivePerson('partner')}
            className={`p-4 rounded-2xl transition-all cursor-pointer border space-y-2 relative ${
              activePerson === 'partner'
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/30 shadow-xs'
                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>{profile?.partnerName || 'Partner Portfolio'}</span>
              </span>
              {activePerson === 'partner' ? (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Editing Now
                </span>
              ) : (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-0.5">
                  Edit <ArrowRight className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                £{(partnerTotalBal || 0).toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Pension: £{(partnerPensionBal || 0).toLocaleString()}</span>
              <span>ISA: £{(partnerIsaBal || 0).toLocaleString()}</span>
              <span>Cash/GIA: £{(partnerCashGiaBal || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Single User Portfolio Summary Bar */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Portfolio Balance</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              £{(primaryTotalBal || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pension Pots Total</div>
            <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
              £{(primaryPensionBal || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ISA & Cash Total</div>
            <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400">
              £{(primaryIsaBal + primaryCashGiaBal || 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Pot Category Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl max-w-fit border border-slate-200/50 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('pension')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
            activeTab === 'pension'
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Workplace & SIPP Balances</span>
          <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${activeTab === 'pension' ? 'bg-emerald-500 dark:bg-emerald-950 text-slate-950 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            £{(totalPensionBalance || 0).toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('isa')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
            activeTab === 'isa'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Tax-Free ISA Balances</span>
          <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${activeTab === 'isa' ? 'bg-indigo-500 dark:bg-indigo-950 text-white dark:text-indigo-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            £{(totalIsaBalance || 0).toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cash_gia')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
            activeTab === 'cash_gia'
              ? 'bg-slate-900 dark:bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Cash & GIA Balances</span>
          <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${activeTab === 'cash_gia' ? 'bg-amber-500 dark:bg-amber-950 text-slate-950 dark:text-amber-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            £{(totalCashGiaBalance || 0).toLocaleString()}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: PENSIONS */}
      {activeTab === 'pension' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Workplace Pension Balance */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Workplace Pension Starting Balance
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.workplacePensionBalance || ''}
                  onChange={(e) => updateField('workplacePensionBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* SIPP / Personal Pension Starting Balance */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  SIPP / Personal Pension Starting Balance
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.sippBalance || ''}
                  onChange={(e) => updateField('sippBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ISAs */}
      {activeTab === 'isa' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stocks & Shares ISA */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Stocks & Shares ISA Starting Balance</span>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.stocksAndSharesIsaBalance || ''}
                  onChange={(e) => updateField('stocksAndSharesIsaBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Cash ISA */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Cash ISA Starting Balance</span>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.cashIsaBalance || ''}
                  onChange={(e) => updateField('cashIsaBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Lifetime ISA (LISA) */}
            <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">Lifetime ISA (LISA) Starting Balance</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.lisaBalance || ''}
                  onChange={(e) => updateField('lisaBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CASH & GIA */}
      {activeTab === 'cash_gia' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Investment Account (GIA) */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">General Investment Account (GIA) Starting Balance</span>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.giaBalance || ''}
                  onChange={(e) => updateField('giaBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Emergency Cash Savings */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Cash Savings Starting Balance</span>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Starting Balance (£)</label>
                <input
                  type="number"
                  value={currentPots.cashSavingsBalance || ''}
                  onChange={(e) => updateField('cashSavingsBalance', Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
