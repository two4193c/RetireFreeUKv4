import React, { useMemo, useState } from 'react';
import { UserProfile, InvestmentPots, GiltLadderConfig, GiltLadderFundingSource, GiltLadderSummary, YearProjection } from '../types';
import { calculateGiltLadder } from '../utils/giltLadderEngine';
import {
  Banknote,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  User,
  Heart,
  Copy,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
} from 'lucide-react';

interface GiltLadderCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections?: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
  accentColor?: 'emerald' | 'indigo' | 'amber';
}

export const GiltLadderCard: React.FC<GiltLadderCardProps> = ({
  profile,
  pots,
  onChange,
}) => {
  const [activePerson, setActivePerson] = useState<'primary' | 'partner'>('primary');
  const [showRungDetails, setShowRungDetails] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const isCouple = Boolean(profile.isCouplePlanning);

  const defaultPrimaryPurchaseAge = profile.targetRetirementAge || 60;
  const defaultPartnerPurchaseAge = profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60;

  const defaultPrimaryAnnualIncome = profile.targetRetirementIncomeAnnual || 25000;
  const defaultPartnerAnnualIncome = Math.round((profile.targetRetirementIncomeAnnual || 25000) * 0.5);

  const primaryConfig: GiltLadderConfig = useMemo(() => {
    const pAge = profile.giltLadderConfig?.purchaseAge ?? profile.giltLadderConfig?.startAge ?? defaultPrimaryPurchaseAge;
    return (
      profile.giltLadderConfig || {
        enabled: false,
        owner: 'primary',
        purchaseAge: pAge,
        startAge: pAge,
        durationYears: 5,
        targetAnnualIncome: defaultPrimaryAnnualIncome,
        fundingSource: 'gia',
        inflationAdjusted: true,
      }
    );
  }, [profile.giltLadderConfig, defaultPrimaryPurchaseAge, defaultPrimaryAnnualIncome]);

  const partnerConfig: GiltLadderConfig = useMemo(() => {
    const pAge = profile.partnerGiltLadderConfig?.purchaseAge ?? profile.partnerGiltLadderConfig?.startAge ?? defaultPartnerPurchaseAge;
    return (
      profile.partnerGiltLadderConfig || {
        enabled: false,
        owner: 'partner',
        purchaseAge: pAge,
        startAge: pAge,
        durationYears: 5,
        targetAnnualIncome: defaultPartnerAnnualIncome,
        fundingSource: 'gia',
        inflationAdjusted: true,
      }
    );
  }, [profile.partnerGiltLadderConfig, defaultPartnerPurchaseAge, defaultPartnerAnnualIncome]);

  const currentConfig = activePerson === 'partner' ? partnerConfig : primaryConfig;

  const primarySummary: GiltLadderSummary = useMemo(() => {
    return calculateGiltLadder({ ...primaryConfig, owner: 'primary' }, profile, pots);
  }, [primaryConfig, profile, pots]);

  const partnerSummary: GiltLadderSummary = useMemo(() => {
    return calculateGiltLadder({ ...partnerConfig, owner: 'partner' }, profile, pots);
  }, [partnerConfig, profile, pots]);

  const currentSummary = activePerson === 'partner' ? partnerSummary : primarySummary;

  const updateCurrentConfig = (updates: Partial<GiltLadderConfig>) => {
    if (activePerson === 'partner') {
      const updated: GiltLadderConfig = {
        ...partnerConfig,
        owner: 'partner',
        ...updates,
      };
      onChange({
        ...profile,
        partnerGiltLadderConfig: updated,
      });
    } else {
      const updated: GiltLadderConfig = {
        ...primaryConfig,
        owner: 'primary',
        ...updates,
      };
      onChange({
        ...profile,
        giltLadderConfig: updated,
      });
    }
  };

  const handleCopySettings = () => {
    if (activePerson === 'primary') {
      // Copy Primary to Partner
      const copied: GiltLadderConfig = {
        ...primaryConfig,
        owner: 'partner',
        purchaseAge: profile.partnerTargetRetirementAge || primaryConfig.purchaseAge,
        startAge: profile.partnerTargetRetirementAge || primaryConfig.purchaseAge,
      };
      onChange({
        ...profile,
        partnerGiltLadderConfig: copied,
      });
      setCopiedNotification(`Copied ${profile.name || 'Primary'}'s settings to ${profile.partnerName || 'Partner'}`);
    } else {
      // Copy Partner to Primary
      const copied: GiltLadderConfig = {
        ...partnerConfig,
        owner: 'primary',
        purchaseAge: profile.targetRetirementAge || partnerConfig.purchaseAge,
        startAge: profile.targetRetirementAge || partnerConfig.purchaseAge,
      };
      onChange({
        ...profile,
        giltLadderConfig: copied,
      });
      setCopiedNotification(`Copied ${profile.partnerName || 'Partner'}'s settings to ${profile.name || 'Primary'}`);
    }
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const isEnabled = Boolean(currentConfig.enabled);
  const currentPurchaseAge = currentConfig.purchaseAge ?? currentConfig.startAge ?? (activePerson === 'partner' ? defaultPartnerPurchaseAge : defaultPrimaryPurchaseAge);
  const personCurrentAge = activePerson === 'partner' ? (profile.partnerCurrentAge ?? profile.currentAge) : profile.currentAge;
  const personName = activePerson === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');

  const formatGBP = (val: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  // Combined metrics for couple planning
  const bothEnabled = isCouple && primaryConfig.enabled && partnerConfig.enabled;
  const anyEnabled = isCouple && (primaryConfig.enabled || partnerConfig.enabled);
  const combinedUpfrontCost = (primaryConfig.enabled ? primarySummary.totalUpfrontCost : 0) + (partnerConfig.enabled ? partnerSummary.totalUpfrontCost : 0);
  const combinedPayout = (primaryConfig.enabled ? primarySummary.totalPayoutDelivered : 0) + (partnerConfig.enabled ? partnerSummary.totalPayoutDelivered : 0);
  const combinedTaxFreeGains = (primaryConfig.enabled ? primarySummary.totalTaxFreeCapitalGains : 0) + (partnerConfig.enabled ? partnerSummary.totalTaxFreeCapitalGains : 0);

  return (
    <div
      id="gilt_ladder_strategy_card"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 shadow-md shadow-emerald-500/5'
          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isEnabled
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                UK Gilt Ladder Strategy
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                0% CGT Arbitrage
              </span>
              <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                DMO Backed
              </span>
              {isCouple && (
                <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-800">
                  Dual-Person Strategy
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lock in guaranteed, default-free annual cashflows using individual UK Gilts with zero Capital Gains Tax under TCGA 1992 s.115.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="gilt_ladder_enable_toggle"
              checked={isEnabled}
              onChange={(e) => updateCurrentConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isEnabled ? `${personName} Active` : `${personName} Off`}
          </span>
        </div>
      </div>

      {/* Couple Planning Person Selector Tabs */}
      {isCouple && (
        <div className="px-4 sm:px-5 pt-3 pb-2 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="gilt_ladder_select_primary_tab"
              onClick={() => setActivePerson('primary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                activePerson === 'primary'
                  ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                primaryConfig.enabled
                  ? (activePerson === 'primary' ? 'bg-indigo-700 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')
                  : (activePerson === 'primary' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400')
              }`}>
                {primaryConfig.enabled ? `${formatGBP(primaryConfig.targetAnnualIncome)}/yr` : 'Off'}
              </span>
            </button>

            <button
              id="gilt_ladder_select_partner_tab"
              onClick={() => setActivePerson('partner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                activePerson === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{profile.partnerName || 'Partner'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                partnerConfig.enabled
                  ? (activePerson === 'partner' ? 'bg-rose-700 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')
                  : (activePerson === 'partner' ? 'bg-rose-800 text-rose-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400')
              }`}>
                {partnerConfig.enabled ? `${formatGBP(partnerConfig.targetAnnualIncome)}/yr` : 'Off'}
              </span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            id="gilt_ladder_copy_settings_btn"
            onClick={handleCopySettings}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer font-semibold transition-colors"
            title={`Mirror settings from ${activePerson === 'primary' ? (profile.name || 'Primary') : (profile.partnerName || 'Partner')} to partner`}
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Copy to {activePerson === 'primary' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary')}
            </span>
          </button>
        </div>
      )}

      {/* Copy Notification */}
      {copiedNotification && (
        <div className="mx-4 sm:mx-5 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Combined Couple Overview Banner */}
      {isCouple && anyEnabled && (
        <div className="mx-4 sm:mx-5 mt-3 p-3.5 bg-gradient-to-r from-indigo-50/80 via-emerald-50/80 to-teal-50/80 dark:from-indigo-950/40 dark:via-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Couple Gilt Portfolio Totals</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {bothEnabled ? 'Both Primary & Partner ladders active' : `${primaryConfig.enabled ? (profile.name || 'Primary') : (profile.partnerName || 'Partner')} ladder active`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Combined Cost</span>
              <span className="font-black text-slate-900 dark:text-slate-100">{formatGBP(combinedUpfrontCost)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Combined Cashflow</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{formatGBP(combinedPayout)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total 0% CGT Gain</span>
              <span className="font-black text-purple-600 dark:text-purple-400">+{formatGBP(combinedTaxFreeGains)}</span>
            </div>
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Active Person Header */}
          {isCouple && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {activePerson === 'partner' ? <Heart className="w-3.5 h-3.5 text-rose-500" /> : <User className="w-3.5 h-3.5 text-indigo-500" />}
                <span>Configuring {personName}'s Gilt Ladder (Current Age: {personCurrentAge})</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Tax-Exempt Sovereign Bonds
              </span>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Purchase Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Purchase Age</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  Age {currentPurchaseAge}
                </span>
              </label>
              <input
                type="range"
                id={`gilt_ladder_purchase_age_${activePerson}`}
                min={Math.max(50, personCurrentAge)}
                max={80}
                value={currentPurchaseAge}
                onChange={(e) => updateCurrentConfig({ purchaseAge: Number(e.target.value), startAge: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Bonds bought at Age {currentPurchaseAge}; 1st maturity at Age {currentPurchaseAge + 1}
              </span>
            </div>

            {/* Duration Years */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Duration</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {currentConfig.durationYears} Years
                </span>
              </label>
              <select
                id={`gilt_ladder_duration_years_${activePerson}`}
                value={currentConfig.durationYears}
                onChange={(e) => updateCurrentConfig({ durationYears: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={3}>3 Years (Short Bridge)</option>
                <option value={5}>5 Years (Standard Bridge)</option>
                <option value={7}>7 Years (Medium Bridge)</option>
                <option value={10}>10 Years (Extended Bridge)</option>
                <option value={12}>12 Years (Decade+ Bridge)</option>
                <option value={15}>15 Years (Full Decumulation)</option>
              </select>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Maturities: Ages {currentPurchaseAge + 1} to {currentPurchaseAge + (currentConfig.durationYears || 5)}
              </span>
            </div>

            {/* Annual Net Income Requirement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Annual Cashflow Target</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {formatGBP(currentConfig.targetAnnualIncome)}
                </span>
              </label>
              <input
                type="number"
                id={`gilt_ladder_target_income_${activePerson}`}
                step={1000}
                min={1000}
                max={250000}
                value={currentConfig.targetAnnualIncome}
                onChange={(e) => updateCurrentConfig({ targetAnnualIncome: Math.max(1000, Number(e.target.value)) })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Guaranteed cash delivered each year to {personName}
              </span>
            </div>

            {/* Funding Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Funding Source</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {currentConfig.fundingSource === 'gia' ? '✨ Max Tax Gain' : ''}
                </span>
              </label>
              <select
                id={`gilt_ladder_funding_source_${activePerson}`}
                value={currentConfig.fundingSource || 'gia'}
                onChange={(e) => updateCurrentConfig({ fundingSource: e.target.value as GiltLadderFundingSource })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="gia">{personName}'s General Investment Account (GIA)</option>
                <option value="isa">{personName}'s Stocks & Shares / Cash ISA</option>
                <option value="cash">{personName}'s Cash Savings Pot</option>
                <option value="pension">{personName}'s Pension / SIPP Pot</option>
                <option value="blended">Blended ({personName} GIA → Cash → ISA)</option>
              </select>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Pot from which bonds are purchased
              </span>
            </div>
          </div>

          {/* Strategy & Yield Mode Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Strategy Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Gilt Selection Strategy</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Coupon & Price Optimization
                </span>
              </label>
              <select
                id={`gilt_ladder_strategy_mode_${activePerson}`}
                value={currentConfig.strategyMode || 'low_coupon_cgt'}
                onChange={(e) => updateCurrentConfig({ strategyMode: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low_coupon_cgt">Low-Coupon Focus (0.125% - 1.250% - Maximum 0% CGT Gain)</option>
                <option value="benchmark_yield">Benchmark Market Yield (Higher Annual Income Coupons)</option>
                <option value="custom_yield">Custom Yield to Maturity Assumption</option>
              </select>
            </div>

            {/* Custom Yield Input (if custom_yield) or Tax Bracket Info */}
            {currentConfig.strategyMode === 'custom_yield' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Custom Yield-to-Maturity (%)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {(currentConfig.customYieldPercent ?? 4.2).toFixed(2)}%
                  </span>
                </label>
                <input
                  type="number"
                  id={`gilt_ladder_custom_yield_${activePerson}`}
                  step={0.1}
                  min={1}
                  max={10}
                  value={currentConfig.customYieldPercent ?? 4.2}
                  onChange={(e) => updateCurrentConfig({ customYieldPercent: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Tax Bracket Modeling</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Coupon Income Tax
                  </span>
                </label>
                <select
                  id={`gilt_ladder_tax_bracket_${activePerson}`}
                  value={currentConfig.taxBracketOverride || 'auto'}
                  onChange={(e) => updateCurrentConfig({ taxBracketOverride: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="auto">Auto Detect from {personName}'s Gross Salary</option>
                  <option value="basic">Basic Rate (20% Coupon Tax)</option>
                  <option value="higher">Higher Rate (40% Coupon Tax)</option>
                  <option value="additional">Additional Rate (45% Coupon Tax)</option>
                </select>
              </div>
            )}
          </div>

          {/* Key Metric Highlights for this Person */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 block">
                {personName}'s Upfront Cost
              </span>
              <span className="text-lg font-black text-emerald-950 dark:text-emerald-100 block mt-0.5">
                {formatGBP(currentSummary.totalUpfrontCost)}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                Discount to face value
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60">
              <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 block">
                Total Cashflow Delivered
              </span>
              <span className="text-lg font-black text-blue-950 dark:text-blue-100 block mt-0.5">
                {formatGBP(currentSummary.totalPayoutDelivered)}
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5 block">
                {formatGBP(currentSummary.totalPayoutDelivered - currentSummary.totalUpfrontCost)} net gain
              </span>
            </div>

            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60">
              <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 block">
                0% CGT Capital Gain
              </span>
              <span className="text-lg font-black text-purple-950 dark:text-purple-100 block mt-0.5">
                {formatGBP(currentSummary.totalTaxFreeCapitalGains)}
              </span>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 mt-0.5 block">
                100% Tax-Free in GIA
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Average Annual Yield
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                {currentSummary.effectiveAnnualYieldPercent.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Guaranteed Yield-to-Maturity
              </span>
            </div>
          </div>

          {/* Tax Arbitrage Callout */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <strong>Why Gilts beat Cash & GIA Equities:</strong> Under Section 115 of the Taxation of Chargeable Gains Act 1992, UK Gilts are exempt from Capital Gains Tax. Buying low-coupon gilts below par (e.g. at £90) yields a completely tax-free redemption at £100 par, preserving your £3,000 CGT allowance and avoiding higher-rate tax spikes for {personName}.
              </div>
            </div>
          </div>

          {/* Rung Details Accordion for this Person */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRungDetails(!showRungDetails)}
              id={`gilt_ladder_toggle_rungs_btn_${activePerson}`}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>View {currentSummary.rungs.length} Individual Gilt Rungs for {personName}</span>
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
                {showRungDetails ? 'Hide Schedule' : 'Show Schedule'}
                {showRungDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {showRungDetails && (
              <div className="overflow-x-auto p-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-2.5">Year / {personName} Age</th>
                      <th className="py-2 px-2.5">UK Gilt Bond</th>
                      <th className="py-2 px-2.5">Price / £100</th>
                      <th className="py-2 px-2.5">Face Value</th>
                      <th className="py-2 px-2.5">Upfront Cost</th>
                      <th className="py-2 px-2.5">Principal Paid</th>
                      <th className="py-2 px-2.5">Coupons</th>
                      <th className="py-2 px-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-300">
                        Net Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentSummary.rungs.map((rung) => (
                      <tr key={rung.year} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {rung.year} (Age {rung.age})
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{rung.giltName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{rung.isin}</div>
                        </td>
                        <td className="py-2.5 px-2.5 font-medium text-slate-600 dark:text-slate-300">
                          £{rung.cleanPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {formatGBP(rung.nominalRequired)}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {formatGBP(rung.purchaseCost)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300">
                          {formatGBP(rung.maturingPrincipal)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400">
                          {formatGBP(rung.annualCouponCashflow)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatGBP(rung.totalNetPayout)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
