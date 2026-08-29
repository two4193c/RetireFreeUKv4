import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Info,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Coins,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Receipt,
  PiggyBank,
  Percent,
} from 'lucide-react';
import {
  PERSONAL_ALLOWANCE,
  PA_TAPER_THRESHOLD,
  PA_TAPER_CEILING,
  RUK_BASIC_RATE,
  RUK_BASIC_THRESHOLD,
  RUK_HIGHER_RATE,
  RUK_ADDITIONAL_THRESHOLD,
  RUK_ADDITIONAL_RATE,
} from '../config/ukTaxRates';

interface AnnuityPclsTaxAdviceCardProps {
  profile: UserProfile;
  person?: 'primary' | 'partner';
  projectedPot: number;
  purchaseAge: number;
  annuityRate: number;
  pclsPercent?: number;
  takeLumpSumAtStart: boolean;
  onToggleTakeLumpSum?: (takeLumpSum: boolean) => void;
}

export const AnnuityPclsTaxAdviceCard: React.FC<AnnuityPclsTaxAdviceCardProps> = ({
  profile,
  person = 'primary',
  projectedPot,
  purchaseAge,
  annuityRate,
  pclsPercent = 25,
  takeLumpSumAtStart,
  onToggleTakeLumpSum,
}) => {
  const [showTaxDetails, setShowTaxDetails] = useState(false);

  const isPartner = person === 'partner';
  const personName = isPartner ? profile.partnerName || 'Partner' : profile.name || 'Primary';

  // State Pension & DB Pensions
  const statePensionAge = isPartner ? profile.partnerStatePensionAge || 67 : profile.statePensionAge || 67;
  const isStatePensionActive = purchaseAge >= statePensionAge;
  const statePensionIncome = isStatePensionActive
    ? isPartner
      ? profile.partnerStatePensionAmount || 11975
      : profile.statePensionAmount || 11975
    : 0;

  const dbPensionIncome = isPartner
    ? profile.partnerDbPensionAmount || 0
    : profile.dbPensionAmount || 0;

  // 1. SCENARIO A: Taking 25% PCLS Tax-Free Lump Sum Upfront
  const pclsAmount = Math.round(projectedPot * (pclsPercent / 100));
  const postPclsPot = Math.max(0, projectedPot - pclsAmount);
  const annualAnnuityWithPcls = Math.round(postPclsPot * (annuityRate / 100));
  const monthlyAnnuityWithPcls = Math.round(annualAnnuityWithPcls / 12);

  const totalTaxableIncomeWithPcls = annualAnnuityWithPcls + statePensionIncome + dbPensionIncome;

  // Compute Income Tax on Scenario A
  const calculateIncomeTax = (grossIncome: number) => {
    let personalAllowance = PERSONAL_ALLOWANCE;
    // PA Taper Rule (£1 lost for every £2 over £100,000)
    if (grossIncome > PA_TAPER_THRESHOLD) {
      const excess = grossIncome - PA_TAPER_THRESHOLD;
      personalAllowance = Math.max(0, personalAllowance - excess / 2);
    }

    const taxableAmount = Math.max(0, grossIncome - personalAllowance);
    let tax = 0;

    if (taxableAmount > 0) {
      const basicBand = Math.min(taxableAmount, RUK_BASIC_THRESHOLD);
      tax += basicBand * RUK_BASIC_RATE;

      const remainingTaxable = Math.max(0, taxableAmount - basicBand);
      const higherBand = Math.min(
        remainingTaxable,
        RUK_ADDITIONAL_THRESHOLD - RUK_BASIC_THRESHOLD - personalAllowance
      );
      tax += higherBand * RUK_HIGHER_RATE;

      const additionalBand = Math.max(0, remainingTaxable - higherBand);
      tax += additionalBand * RUK_ADDITIONAL_RATE;
    }

    return Math.round(tax);
  };

  const estTaxWithPcls = calculateIncomeTax(totalTaxableIncomeWithPcls);
  const netAnnuityWithPcls = annualAnnuityWithPcls - Math.min(estTaxWithPcls, annualAnnuityWithPcls);

  // 2. SCENARIO B: Buy Annuity with 100% Pension Pot (No PCLS Taken)
  const annualAnnuity100 = Math.round(projectedPot * (annuityRate / 100));
  const monthlyAnnuity100 = Math.round(annualAnnuity100 / 12);

  const totalTaxableIncome100 = annualAnnuity100 + statePensionIncome + dbPensionIncome;
  const estTax100 = calculateIncomeTax(totalTaxableIncome100);
  const netAnnuity100 = annualAnnuity100 - Math.min(estTax100, annualAnnuity100);

  // Comparison Metrics
  const extraGrossAnnuity100 = annualAnnuity100 - annualAnnuityWithPcls;
  const extraTaxPaid100 = estTax100 - estTaxWithPcls;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/60 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-white tracking-tight">
                Annuity & 25% Tax-Free Lump Sum (PCLS) Income Tax Advice
              </h4>
              <span className="bg-primary-500/20 text-primary-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-primary-500/30 uppercase">
                Tax Optimization
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Tax analysis for {personName} purchasing an annuity at Age {purchaseAge} with projected pension pot of £{projectedPot.toLocaleString()}.
            </p>
          </div>
        </div>

        {/* Current Selection Pill */}
        <div className="flex items-center gap-2 bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-700 text-xs shrink-0 self-start sm:self-center">
          <span className="text-indigo-300 font-semibold">Current Selection:</span>
          <span className={`font-black ${takeLumpSumAtStart ? 'text-primary-400' : 'text-amber-400'}`}>
            {takeLumpSumAtStart ? '25% PCLS Taken Upfront' : '100% Pot to Annuity (No PCLS)'}
          </span>
        </div>
      </div>

      {/* Side-by-Side Scenario Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Scenario A: 25% PCLS Taken Upfront */}
        <div
          className={`p-4 rounded-xl border transition-all space-y-3 ${
            takeLumpSumAtStart
              ? 'bg-primary-950/40 border-primary-500/50 ring-1 ring-primary-500/30'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
            <div>
              <span className="text-xs font-black uppercase text-primary-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Option A: Take 25% Tax-Free Cash Upfront</span>
              </span>
              <span className="text-[10px] text-slate-400">Recommended Tax-Shield Strategy</span>
            </div>
            {onToggleTakeLumpSum && !takeLumpSumAtStart && (
              <button
                onClick={() => onToggleTakeLumpSum(true)}
                className="text-[10px] font-extrabold bg-primary-600 hover:bg-primary-500 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                Select Option A
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-primary-900/30 p-2 rounded-lg border border-primary-700/40">
              <span className="text-primary-200 font-semibold">100% Tax-Free Lump Sum (PCLS):</span>
              <span className="font-extrabold text-primary-300 text-sm">£{pclsAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Remaining Pension Capital (75%):</span>
              <span className="font-bold text-white">£{postPclsPot.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Gross Annual Annuity Payout:</span>
              <span className="font-extrabold text-white">£{annualAnnuityWithPcls.toLocaleString()} / yr</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Gross Monthly Income:</span>
              <span className="font-semibold text-slate-200">£{monthlyAnnuityWithPcls.toLocaleString()} / mo</span>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex justify-between text-slate-300">
              <span>Combined Gross Taxable Income:</span>
              <span className="font-bold text-amber-300">£{totalTaxableIncomeWithPcls.toLocaleString()} / yr</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Estimated Annual Income Tax:</span>
              <span className="font-bold text-rose-400">£{estTaxWithPcls.toLocaleString()} / yr</span>
            </div>

            <div className="p-2.5 bg-primary-900/20 rounded-lg text-[11px] text-primary-200/90 leading-relaxed border border-primary-800/40">
              💡 <strong>Tax Benefit:</strong> 100% of the £{pclsAmount.toLocaleString()} lump sum is extracted with 0% Income Tax. You can deposit it into an ISA (£20k/yr) to generate completely tax-free income for life!
            </div>
          </div>
        </div>

        {/* Scenario B: 100% Pot to Annuity (No PCLS) */}
        <div
          className={`p-4 rounded-xl border transition-all space-y-3 ${
            !takeLumpSumAtStart
              ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
            <div>
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Option B: 100% Pot to Annuity (No PCLS)</span>
              </span>
              <span className="text-[10px] text-slate-400">Max Guaranteed Income (100% Taxable)</span>
            </div>
            {onToggleTakeLumpSum && takeLumpSumAtStart && (
              <button
                onClick={() => onToggleTakeLumpSum(false)}
                className="text-[10px] font-extrabold bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                Select Option B
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-700">
              <span className="text-slate-400 font-semibold">100% Tax-Free Lump Sum (PCLS):</span>
              <span className="font-extrabold text-slate-400 text-sm">£0</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Total Pension Capital Used (100%):</span>
              <span className="font-bold text-white">£{projectedPot.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Gross Annual Annuity Payout:</span>
              <span className="font-extrabold text-white">£{annualAnnuity100.toLocaleString()} / yr</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Gross Monthly Income:</span>
              <span className="font-semibold text-slate-200">£{monthlyAnnuity100.toLocaleString()} / mo</span>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex justify-between text-slate-300">
              <span>Combined Gross Taxable Income:</span>
              <span className="font-bold text-amber-300">£{totalTaxableIncome100.toLocaleString()} / yr</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Estimated Annual Income Tax:</span>
              <span className="font-bold text-rose-400">£{estTax100.toLocaleString()} / yr</span>
            </div>

            <div className="p-2.5 bg-amber-900/20 rounded-lg text-[11px] text-amber-200/90 leading-relaxed border border-amber-800/40">
              ⚠️ <strong>Tax Trap Warning:</strong> Although gross income is £{extraGrossAnnuity100.toLocaleString()}/yr higher, <strong>100% of this extra payout is subject to Income Tax</strong> (costing £{extraTaxPaid100.toLocaleString()}/yr extra in tax)!
            </div>
          </div>
        </div>

      </div>

      {/* Actionable Advice & Guidance Callout Accordion */}
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
        <button
          onClick={() => setShowTaxDetails(!showTaxDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-indigo-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Key Tax Principles When Taking an Annuity with Tax-Free Lump Sum</span>
          </span>
          <span className="text-[11px] underline">
            {showTaxDetails ? 'Hide Detailed Advice ▲' : 'Show Detailed Advice ▼'}
          </span>
        </button>

        {showTaxDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700 text-xs text-slate-200 leading-relaxed">
            
            {/* Advice 1 */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700 space-y-1">
              <h5 className="font-extrabold text-indigo-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                <span>1. State Pension & Personal Allowance</span>
              </h5>
              <p className="text-[11px] text-slate-300">
                The UK State Pension (£11,975/yr in 2026/27) consumes £11,975 of your £12,570 Personal Allowance. This leaves only <strong>£595/yr</strong> of tax-free allowance. Almost 100% of your annuity income will be taxed at 20% Basic Rate or 40% Higher Rate under PAYE. Taking 25% PCLS tax-free upfront shields 25% of your wealth from Income Tax.
              </p>
            </div>

            {/* Advice 2 */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700 space-y-1">
              <h5 className="font-extrabold text-primary-300 flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-primary-400" />
                <span>2. The ISA Income Tax Shelter</span>
              </h5>
              <p className="text-[11px] text-slate-300">
                Tax-free lump sum cash (PCLS) extracted from your pension can be transferred into a Stocks & Shares ISA (£20,000 annual allowance). Dividends, capital growth, and withdrawals from an ISA are <strong>100% tax-free</strong> and do NOT count towards your UK Income Tax brackets.
              </p>
            </div>

            {/* Advice 3 */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700 space-y-1">
              <h5 className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Preventing 40% Tax & 60% Taper Traps</span>
              </h5>
              <p className="text-[11px] text-slate-300">
                If your combined taxable income (Annuity + State Pension + DB Pensions) exceeds £50,270, income above this limit is taxed at 40%. Over £100,000, you lose £1 of Personal Allowance for every £2 earned (effective 60% tax). Reducing annuity size by taking 25% PCLS upfront prevents pushing yourself into these punitive tax bands.
              </p>
            </div>

            {/* Advice 4 */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700 space-y-1">
              <h5 className="font-extrabold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>4. HMRC Schedule 29 Recycling Rule Warning</span>
              </h5>
              <p className="text-[11px] text-slate-300">
                If you take 25% tax-free PCLS, do NOT use the lump sum to fund a significant increase in pension contributions (&gt;30% of PCLS or &gt;£7,500). Standard routine workplace contributions from salary are exempt, but direct re-contributions trigger unauthorised payment tax charges up to <strong>55%</strong> (Schedule 29 / PTM133800).
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
