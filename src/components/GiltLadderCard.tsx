import React, { useMemo, useState } from 'react';
import { UserProfile, InvestmentPots, GiltLadderConfig, GiltLadderFundingSource, GiltLadderSummary } from '../types';
import { calculateGiltLadder, UK_GILT_DATABASE } from '../utils/giltLadderEngine';
import {
  ShieldCheck,
  Percent,
  TrendingUp,
  Coins,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Banknote,
  Award,
  ArrowRight,
} from 'lucide-react';

interface GiltLadderCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChange: (updatedProfile: UserProfile) => void;
  accentColor?: 'emerald' | 'indigo' | 'amber';
}

export const GiltLadderCard: React.FC<GiltLadderCardProps> = ({
  profile,
  pots,
  onChange,
  accentColor = 'emerald',
}) => {
  const [showRungDetails, setShowRungDetails] = useState(false);
  const [showEducationalModal, setShowEducationalModal] = useState(false);

  const defaultStartAge = profile.targetRetirementAge || 60;
  const defaultAnnualIncome = profile.desiredRetirementIncomeAnnual || 25000;

  const currentConfig: GiltLadderConfig = useMemo(() => {
    return (
      profile.giltLadderConfig || {
        enabled: false,
        startAge: defaultStartAge,
        durationYears: 5,
        targetAnnualIncome: defaultAnnualIncome,
        fundingSource: 'gia',
        inflationAdjusted: true,
      }
    );
  }, [profile.giltLadderConfig, defaultStartAge, defaultAnnualIncome]);

  const summary: GiltLadderSummary = useMemo(() => {
    return calculateGiltLadder(currentConfig, profile, pots);
  }, [currentConfig, profile, pots]);

  const updateConfig = (updates: Partial<GiltLadderConfig>) => {
    const updated: GiltLadderConfig = {
      ...currentConfig,
      ...updates,
    };
    onChange({
      ...profile,
      giltLadderConfig: updated,
    });
  };

  const isEnabled = currentConfig.enabled;

  const formatGBP = (val: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

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
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isEnabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      {isEnabled && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Start Age</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  Age {currentConfig.startAge}
                </span>
              </label>
              <input
                type="range"
                id="gilt_ladder_start_age"
                min={Math.max(50, profile.currentAge)}
                max={80}
                value={currentConfig.startAge}
                onChange={(e) => updateConfig({ startAge: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Ladder begins paying at retirement
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
                id="gilt_ladder_duration_years"
                value={currentConfig.durationYears}
                onChange={(e) => updateConfig({ durationYears: Number(e.target.value) })}
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
                Ages {currentConfig.startAge} to {currentConfig.startAge + currentConfig.durationYears - 1}
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
                id="gilt_ladder_target_income"
                step={1000}
                min={5000}
                max={250000}
                value={currentConfig.targetAnnualIncome}
                onChange={(e) => updateConfig({ targetAnnualIncome: Math.max(1000, Number(e.target.value)) })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Guaranteed cash delivered each year
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
                id="gilt_ladder_funding_source"
                value={currentConfig.fundingSource || 'gia'}
                onChange={(e) => updateConfig({ fundingSource: e.target.value as GiltLadderFundingSource })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="gia">General Investment Account (GIA)</option>
                <option value="isa">Stocks & Shares / Cash ISA</option>
                <option value="cash">Cash Savings Pot</option>
                <option value="pension">Pension / SIPP Pot</option>
                <option value="blended">Blended (GIA → Cash → ISA)</option>
              </select>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Pot from which bonds are purchased
              </span>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 block">
                Total Upfront Cost
              </span>
              <span className="text-lg font-black text-emerald-950 dark:text-emerald-100 block mt-0.5">
                {formatGBP(summary.totalUpfrontCost)}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                Discount to face value
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60">
              <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 block">
                Total Cashflow Secured
              </span>
              <span className="text-lg font-black text-blue-950 dark:text-blue-100 block mt-0.5">
                {formatGBP(summary.totalPayoutDelivered)}
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5 block">
                {formatGBP(summary.totalPayoutDelivered - summary.totalUpfrontCost)} net gain
              </span>
            </div>

            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60">
              <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 block">
                0% CGT Capital Gain
              </span>
              <span className="text-lg font-black text-purple-950 dark:text-purple-100 block mt-0.5">
                {formatGBP(summary.totalTaxFreeCapitalGains)}
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
                {summary.effectiveAnnualYieldPercent.toFixed(2)}%
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
                <strong>Why Gilts beat Cash & GIA Equities:</strong> Under Section 115 of the Taxation of Chargeable Gains Act 1992, UK Gilts are exempt from Capital Gains Tax. Buying low-coupon gilts below par (e.g. at £90) yields a completely tax-free redemption at £100 par, preserving your £3,000 CGT allowance and avoiding higher-rate tax spikes.
              </div>
            </div>
          </div>

          {/* Rung Details Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRungDetails(!showRungDetails)}
              id="gilt_ladder_toggle_rungs_btn"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>View {summary.rungs.length} Individual Gilt Ladder Rungs</span>
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
                {showRungDetails ? 'Hide Details' : 'Show Schedule'}
                {showRungDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {showRungDetails && (
              <div className="overflow-x-auto p-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-2.5">Year / Age</th>
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
                    {summary.rungs.map((rung) => (
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
