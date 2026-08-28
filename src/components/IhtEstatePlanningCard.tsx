import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots, YearProjection, PetGift } from '../types';
import { DEFAULT_IHT_SETTINGS } from '../utils/defaultData';
import {
  Building2,
  ShieldAlert,
  Heart,
  Coins,
  ArrowUpRight,
  Scale,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Gift,
  LifeBuoy,
  Percent,
  FileText,
  Landmark,
  UserCheck,
  Plus,
  Trash2,
  HelpCircle,
  Award,
  Lock,
  RefreshCw,
  X,
  Edit2,
  Check,
} from 'lucide-react';

interface IhtEstatePlanningCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  projections: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
  hideInputs?: boolean;
}

export const IhtEstatePlanningCard: React.FC<IhtEstatePlanningCardProps> = ({
  isStudioMode,
  profile,
  projections,
  onChange,
  hideInputs = false,
}) => {
  const iht = profile.ihtSettings || DEFAULT_IHT_SETTINGS;
  const isCouple = profile.isCouplePlanning ?? false;

  // Popout modal state for adding / editing PET gifts
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [giftForm, setGiftForm] = useState<{
    recipient: string;
    amount: number;
    yearsAgo: number;
  }>({
    recipient: '',
    amount: 25000,
    yearsAgo: 2,
  });

  const handleUpdateIht = (field: keyof typeof iht, value: any) => {
    onChange({
      ...profile,
      ihtSettings: {
        ...iht,
        [field]: value,
      },
    });
  };

  const handleOpenAddGift = () => {
    setEditingGiftId(null);
    setGiftForm({
      recipient: '',
      amount: 25000,
      yearsAgo: 2,
    });
    setIsGiftModalOpen(true);
  };

  const handleOpenEditGift = (gift: PetGift) => {
    setEditingGiftId(gift.id);
    setGiftForm({
      recipient: gift.recipient,
      amount: gift.amount,
      yearsAgo: gift.yearsAgo,
    });
    setIsGiftModalOpen(true);
  };

  const handleSaveGift = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const recipientText = giftForm.recipient.trim() || 'Beneficiary / Child';
    const amountVal = Math.max(0, Number(giftForm.amount) || 0);
    const yearsAgoVal = Math.max(0, Math.min(10, Number(giftForm.yearsAgo) || 0));

    if (editingGiftId) {
      const updatedGifts = (iht.petGifts || []).map((g) =>
        g.id === editingGiftId
          ? { ...g, recipient: recipientText, amount: amountVal, yearsAgo: yearsAgoVal }
          : g
      );
      handleUpdateIht('petGifts', updatedGifts);
    } else {
      const newGift: PetGift = {
        id: Date.now().toString(),
        recipient: recipientText,
        amount: amountVal,
        yearsAgo: yearsAgoVal,
      };
      const updatedGifts = [...(iht.petGifts || []), newGift];
      handleUpdateIht('petGifts', updatedGifts);
    }
    setIsGiftModalOpen(false);
    setEditingGiftId(null);
  };

  const handleRemovePetGift = (id: string) => {
    const updatedGifts = (iht.petGifts || []).filter((g) => g.id !== id);
    handleUpdateIht('petGifts', updatedGifts);
  };

  const currentAge = profile.currentAge || 35;

  // Calculate estate valuation & IHT liability at milestone ages (80, 90, 100)
  const calculateMilestoneIht = (targetAge: number) => {
    const yearsFromNow = Math.max(0, targetAge - currentAge);

    // Find projection data for target age
    const proj = projections.find((p) => p.age === targetAge) || projections[projections.length - 1];

    // Property compounding: PrimaryResidence * (1 + rate)^years
    const propertyValue = Math.round(
      (iht.primaryResidenceValue || 0) * Math.pow(1 + (iht.annualPropertyGrowthPercent ?? 3.0) / 100, yearsFromNow)
    );

    // Non-pension financial assets (ISA, Cash Savings, GIA) at target age
    const totalIsaPot = Math.round(proj?.isaPot || 0);
    const totalCashGiaPot = Math.round(proj?.cashGiaPot || 0);
    const grossNonPensionWealth = totalIsaPot + totalCashGiaPot;

    // Business Property Relief (AIM ISAs / BPR shares)
    const bprAmount = Math.min(grossNonPensionWealth, iht.businessReliefAssets || 0);
    const bprExemptionPct = (iht.businessReliefExemptionPercent ?? 50) / 100;
    const bprExemptionDeduction = Math.round(bprAmount * bprExemptionPct);
    const taxableNonPensionWealth = Math.max(0, grossNonPensionWealth - bprExemptionDeduction);

    // Pension wealth (Workplace + SIPP) at target age
    const pensionWealth = Math.round(proj?.pensionPot || 0);

    // Other taxable physical assets (BTL, vehicles, art)
    const otherAssets = iht.otherTaxableAssets || 0;

    // Beneficiary Spousal Exemption check for Non-Pension Assets & Property
    const nonPensionBeneficiary = iht.nonPensionBeneficiary || (isCouple ? 'spouse' : 'descendants');
    const isSpouseTransfer = nonPensionBeneficiary === 'spouse' && isCouple;

    // Gross Estate Valuation before deductions & exemptions
    const grossEstateValuation = propertyValue + grossNonPensionWealth + pensionWealth + otherAssets;

    // Non-Pension & Property Taxable Portion
    let taxablePropertyAndAssets = propertyValue + taxableNonPensionWealth + otherAssets;
    if (isSpouseTransfer) {
      // 100% Spousal Exemption applies to non-pension assets & property transferred to surviving spouse!
      taxablePropertyAndAssets = 0;
    }

    // Pension inclusion (April 2027 Budget Rule) - Spousal exemption applies to pensions too!
    const taxablePensionPortion = iht.includePensionsInEstate && !isSpouseTransfer ? pensionWealth : 0;

    // Gross Taxable Estate before annual gifting & PETs
    const grossTaxableEstateBeforeGifting = taxablePropertyAndAssets + taxablePensionPortion;

    // Gross Estate for RNRB Tapering (must be before BPR and Spousal Exemption)
    const grossEstateForTaper = propertyValue + grossNonPensionWealth + otherAssets + (iht.includePensionsInEstate ? pensionWealth : 0);

    // Cumulative Annual Gifting Deduction (£3,000/yr HMRC exemption)
    const retirementAge = profile.targetRetirementAge || 60;
    const giftingYears = Math.max(0, targetAge - retirementAge);
    const cumulativeAnnualGifting = (iht.annualGiftingStrategy || 0) * giftingYears;

    const netTaxableEstateBeforeAllowances = Math.max(0, grossTaxableEstateBeforeGifting - cumulativeAnnualGifting);

    // Calculate Allowances (NRB & RNRB)
    const baseNrb = isCouple ? 650000 : 325000;

    let baseRnrb = 0;
    if (iht.passMainResidenceToDescendants && propertyValue > 0 && !isSpouseTransfer) {
      baseRnrb = isCouple ? 350000 : 175000;

      // HMRC Tapering Rule: RNRB tapers by £1 for every £2 gross estate exceeds £2,000,000
      const taperThreshold = 2000000;
      if (grossEstateForTaper > taperThreshold) {
        const excess = grossEstateForTaper - taperThreshold;
        const reduction = Math.floor(excess / 2);
        baseRnrb = Math.max(0, baseRnrb - reduction);
      }
    }

    const totalAllowances = baseNrb + baseRnrb;

    // Charitable Legacy 10% Rule -> 36% IHT Rate
    const charityPct = iht.charityGiftingPercent || 0;
    const isCharityRateUnlocked = charityPct >= 10;
    const charityDeduction = Math.round(netTaxableEstateBeforeAllowances * (charityPct / 100));

    // Taxable Surplus above allowances & charity deduction
    const taxableSurplus = Math.max(0, netTaxableEstateBeforeAllowances - totalAllowances - charityDeduction);

    // Applicable IHT Tax Rate (36% if 10%+ to charity, else 40%)
    const applicableIhtRate = isCharityRateUnlocked ? 0.36 : 0.40;
    const grossIhtLiability = Math.round(taxableSurplus * applicableIhtRate);

    // Life Insurance Policy in Trust Offset
    const insurancePayout = iht.lifeInsuranceInTrust || 0;
    const netIhtLiability = Math.max(0, grossIhtLiability - insurancePayout);

    // Net Estate passed to beneficiaries / heirs
    const netPassedToHeirs = Math.max(0, grossEstateValuation - netIhtLiability - (grossIhtLiability > 0 ? charityDeduction : 0));

    // Effective Tax Rate
    const effectiveIhtRate = grossEstateValuation > 0 ? ((netIhtLiability / grossEstateValuation) * 100).toFixed(1) : '0.0';

    return {
      age: targetAge,
      year: proj?.year || currentAge + yearsFromNow,
      propertyValue,
      totalIsaPot,
      totalCashGiaPot,
      grossNonPensionWealth,
      bprExemptionDeduction,
      taxableNonPensionWealth,
      pensionWealth,
      otherAssets,
      grossEstateValuation,
      netTaxableEstateBeforeAllowances,
      baseNrb,
      baseRnrb,
      totalAllowances,
      charityDeduction,
      isCharityRateUnlocked,
      taxableSurplus,
      applicableIhtRate,
      grossIhtLiability,
      insurancePayout,
      netIhtLiability,
      netPassedToHeirs,
      effectiveIhtRate,
      cumulativeAnnualGifting,
      isSpouseTransfer,
    };
  };

  const milestone80 = useMemo(() => calculateMilestoneIht(80), [iht, isCouple, currentAge, projections, profile.targetRetirementAge]);
  const milestone90 = useMemo(() => calculateMilestoneIht(90), [iht, isCouple, currentAge, projections, profile.targetRetirementAge]);
  const milestone100 = useMemo(() => calculateMilestoneIht(100), [iht, isCouple, currentAge, projections, profile.targetRetirementAge]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Module Header */}
      <div className={`flex flex-col justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 ${isStudioMode ? "" : "lg:flex-row lg:items-center"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                Inheritance Tax (IHT) & Estate Planning Module
              </h3>
              {!isStudioMode && (
                <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                  April 2027 Budget Rules & Non-Pension Death Benefits
                </span>
              )}
            </div>
            {!isStudioMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project gross estate valuation at Ages 80, 90 & 100, Nil Rate Bands, non-pension asset rules (ISAs, GIAs, Cash), Spousal APS, CGT uplift, and 40% IHT liabilities.
              </p>
            )}
          </div>
        </div>

        {/* Spousal Exemption Indicator */}
        <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 self-start ${isStudioMode ? "" : "lg:self-center"}`}>
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isCouple ? 'Couple Planning (2x Allowances: £1,000,000)' : 'Single Planning (1x Allowance: £500,000)'}
          </span>
        </div>
      </div>

      {/* Estate Valuation & Milestone Comparison Section */}
      <div className="space-y-6">
        {/* Controls Bar for Beneficiary & Exemptions */}
          {!hideInputs && (
            <div className={`bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 grid grid-cols-1 gap-4 text-xs ${isStudioMode ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              
              {/* Primary Residence Current Value */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Primary Residence Value</span>
                  </label>
                  {profile.mortgage?.propertyValue ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateIht('primaryResidenceValue', profile.mortgage?.propertyValue || 0)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      title="Sync value from Mortgage & Debt Manager"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Sync (£{profile.mortgage.propertyValue.toLocaleString()})
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">£</span>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={iht.primaryResidenceValue ?? (profile.mortgage?.propertyValue || 0)}
                    onChange={(e) => handleUpdateIht('primaryResidenceValue', Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 500000"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Current market valuation of your main residence.</p>
              </div>

              {/* Annual Property Growth Rate % */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <span>Property Growth Rate (% p.a.)</span>
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {iht.annualPropertyGrowthPercent ?? 3.0}%
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={iht.annualPropertyGrowthPercent ?? 3.0}
                    onChange={(e) => handleUpdateIht('annualPropertyGrowthPercent', Math.max(0, Number(e.target.value)))}
                    className="w-20 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={iht.annualPropertyGrowthPercent ?? 3.0}
                    onChange={(e) => handleUpdateIht('annualPropertyGrowthPercent', Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Projected annual real estate capital appreciation.</p>
              </div>

              {/* Beneficiary Destination */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <span>Non-Pension & Estate Beneficiary</span>
                </label>
                <select
                  value={iht.nonPensionBeneficiary || (isCouple ? 'spouse' : 'descendants')}
                  onChange={(e) => handleUpdateIht('nonPensionBeneficiary', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                >
                  {isCouple && <option value="spouse">Surviving Spouse (100% Spousal Exemption - 0% IHT)</option>}
                  <option value="descendants">Direct Descendants / Children (Subject to IHT)</option>
                  <option value="mixed">Mixed Beneficiaries / Split Estate</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  {iht.nonPensionBeneficiary === 'spouse' && isCouple
                    ? '100% tax-free spousal transfer applies to non-pension wealth & property.'
                    : 'Standard IHT rules apply after Nil Rate Bands.'}
                </p>
              </div>

              {/* Charitable Legacy 10% Rule */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>Charitable Bequest (% Net Estate)</span>
                  </span>
                  <span className={`font-extrabold ${ (iht.charityGiftingPercent || 0) >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300' }`}>
                    {iht.charityGiftingPercent || 0}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={iht.charityGiftingPercent || 0}
                  onChange={(e) => handleUpdateIht('charityGiftingPercent', Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">0% = Standard 40% Rate</span>
                  {(iht.charityGiftingPercent || 0) >= 10 ? (
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      36% Reduced IHT Rate Unlocked!
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Reach 10% to get 36% IHT rate</span>
                  )}
                </div>
              </div>

              {/* Pass Main Residence to Descendants RNRB */}
              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="flex items-center justify-between cursor-pointer p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Pass Home to Descendants (RNRB)
                  </span>
                  <input
                    type="checkbox"
                    checked={iht.passMainResidenceToDescendants}
                    onChange={(e) => handleUpdateIht('passMainResidenceToDescendants', e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-slate-400">
                  Unlocks £175k/£350k Residence Nil Rate Band.
                </p>
              </div>

            </div>
          )}



          {/* Detailed Milestone Comparison Ledger Table */}
          {!isStudioMode && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Estate Parameter</th>
                    <th className="py-3 px-4">Age 80 ({milestone80.year})</th>
                    <th className="py-3 px-4">Age 90 ({milestone90.year})</th>
                    <th className="py-3 px-4">Age 100 ({milestone100.year})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">Primary Residence Valuation</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone80.propertyValue.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone90.propertyValue.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone100.propertyValue.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">Unused Pension Wealth (Workplace + SIPP)</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone80.pensionWealth.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone90.pensionWealth.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone100.pensionWealth.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">Non-Pension Financial Wealth (ISA/Cash/GIA)</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone80.grossNonPensionWealth.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone90.grossNonPensionWealth.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold">£{milestone100.grossNonPensionWealth.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">Total Available IHT Allowances (NRB + RNRB)</td>
                    <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">£{milestone80.totalAllowances.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">£{milestone90.totalAllowances.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">£{milestone100.totalAllowances.toLocaleString()}</td>
                  </tr>
                  <tr className="font-extrabold bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white">
                    <td className="py-3 px-4">Estimated Inheritance Tax (IHT) Liability</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400">£{milestone80.netIhtLiability.toLocaleString()} ({milestone80.effectiveIhtRate}%)</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400">£{milestone90.netIhtLiability.toLocaleString()} ({milestone90.effectiveIhtRate}%)</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400">£{milestone100.netIhtLiability.toLocaleString()} ({milestone100.effectiveIhtRate}%)</td>
                  </tr>
                  <tr className="font-extrabold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <td className="py-3 px-4">Net Wealth Inherited by Beneficiaries</td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-300">£{milestone80.netPassedToHeirs.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-300">£{milestone90.netPassedToHeirs.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-300">£{milestone100.netPassedToHeirs.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Non-Pension Assets Section */}
        <div className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
          {!isStudioMode && (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3 text-xs">
              <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
                  Non-Pension Asset Estate & Death Benefits Strategy
                </h4>
                <p className="text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  Non-pension assets (ISAs, GIAs, and Cash) behave differently from pensions upon death. While ISAs benefit from Spousal Additional Permitted Subscriptions (APS), GIAs receive a valuable <strong>Death-Bed Capital Gains Tax (CGT) Uplift</strong>, wiping out unrealized gains. Business Property Relief (BPR) can also shelter qualifying AIM ISAs from 40% IHT.
                </p>
              </div>
            </div>
          )}

          {/* Non-Pension Asset Specific Controls */}
          {!hideInputs && (
            <div className={`grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs ${isStudioMode ? "" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              
              {/* Business Relief / AIM ISA Amount */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Business Relief (BPR / AIM ISA) Assets</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    £{(iht.businessReliefAssets || 0).toLocaleString()}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={iht.businessReliefAssets || 0}
                  onChange={(e) => handleUpdateIht('businessReliefAssets', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">AIM-listed ISA shares or qualifying unquoted business assets held 2+ yrs.</p>
              </div>

              {/* BPR Exemption Percentage (Oct 2024 Budget 50% vs 100%) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>BPR Relief Rate (Post-Oct 2024 Reform)</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {iht.businessReliefExemptionPercent ?? 50}% Relief
                  </span>
                </label>
                <select
                  value={iht.businessReliefExemptionPercent ?? 50}
                  onChange={(e) => handleUpdateIht('businessReliefExemptionPercent', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                >
                  <option value={50}>50% Relief (Effective 20% IHT - Oct 2024 Budget Standard)</option>
                  <option value={100}>100% Relief (Under £1m BPR Threshold / Legacy Rules)</option>
                </select>
                <p className="text-[10px] text-slate-400">October 2024 UK Budget introduced 50% BPR relief on AIM shares.</p>
              </div>

              {/* Whole of Life Insurance Policy in Trust */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Life Insurance Written in Trust Payout</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    £{(iht.lifeInsuranceInTrust || 0).toLocaleString()}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={iht.lifeInsuranceInTrust || 0}
                  onChange={(e) => handleUpdateIht('lifeInsuranceInTrust', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400">Sum assured outside estate written in trust to pay HMRC IHT bill.</p>
              </div>

            </div>
          )}

          {/* Asset-by-Asset Breakdown Cards */}
          {!isStudioMode && (
            <div className={`grid grid-cols-1 gap-4 ${isStudioMode ? "" : "md:grid-cols-3"}`}>
              
              {/* Stocks & Shares ISAs */}
              <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">ISAs (S&S, Cash & LISA)</h5>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    Spousal APS
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Valuation at Age 90:</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{milestone90.totalIsaPot.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Spousal Transfer (APS):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Tax-Free</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Non-Spouse Heirs IHT:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">Subject to 40% IHT</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Surviving spouse gets Additional Permitted Subscription (APS) allowance to maintain tax-free wrapper status indefinitely.
                  </div>
                </div>
              </div>

              {/* General Investment Accounts (GIAs) */}
              <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">GIAs & Taxable Accounts</h5>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    CGT Death Uplift
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Valuation at Age 90:</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{milestone90.totalCashGiaPot.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>CGT Wiped On Death:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Wiped (Death Uplift)</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Estate IHT Status:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">Included in Gross Estate</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    All accrued capital gains are wiped out on death under TCGA s62. Heirs inherit at current market value.
                  </div>
                </div>
              </div>

              {/* Cash Savings */}
              <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">Cash Savings & Deposits</h5>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Standard Asset
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Spousal Transfer:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Tax-Free</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Non-Spouse Heirs IHT:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">40% IHT (Above NRB)</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Income Tax Post-Death:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Taxable at Marginal Rate</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Liquid cash forms part of probate. Non-spouse beneficiaries pay standard income tax on post-death interest.
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* 7-Year PET Gifts & Taper Relief Section */}
        <div className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
          {!isStudioMode && (
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 flex items-start gap-3 text-xs">
              <Gift className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200">
                  Potentially Exempt Transfers (PETs) & HMRC 7-Year Rule
                </h4>
                <p className="text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
                  Outright gifts to individuals above the £3,000 annual exemption become Potentially Exempt Transfers (PETs). If you survive 7 years after making the gift, it becomes 100% tax-free. If death occurs between years 3 and 7, <strong>HMRC Taper Relief</strong> reduces the tax charged on the gift.
                </p>
              </div>
            </div>
          )}

          {/* PET Gifts Log & Calculator */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Substantial Non-Pension Gifts Log (Last 7 Years)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record major capital gifts made to children or beneficiaries to calculate remaining IHT taper relief.
                </p>
              </div>

              {!hideInputs && (
                <button
                  type="button"
                  onClick={handleOpenAddGift}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Gift</span>
                </button>
              )}
            </div>

            {(iht.petGifts || []).length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs space-y-2">
                <Gift className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No substantial gifts recorded</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click the <strong>Add Gift</strong> button to log a Potentially Exempt Transfer (PET) and calculate HMRC 7-year taper relief.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-2.5">Gift Recipient / Details</th>
                      <th className="p-2.5">Gift Amount (£)</th>
                      <th className="p-2.5">Years Elapsed</th>
                      <th className="p-2.5">HMRC Taper Relief %</th>
                      <th className="p-2.5">IHT Tax Status</th>
                      {!hideInputs && <th className="p-2.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(iht.petGifts || []).map((g) => {
                      let taperPct = '0% Relief (Full 40% Tax)';
                      let badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';

                      if (g.yearsAgo >= 7) {
                        taperPct = '100% Relief (100% Tax-Free)';
                        badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
                      } else if (g.yearsAgo >= 6) {
                        taperPct = '80% Taper Relief (8% Effective Tax)';
                        badgeColor = 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300';
                      } else if (g.yearsAgo >= 5) {
                        taperPct = '60% Taper Relief (16% Effective Tax)';
                        badgeColor = 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
                      } else if (g.yearsAgo >= 4) {
                        taperPct = '40% Taper Relief (24% Effective Tax)';
                        badgeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
                      } else if (g.yearsAgo >= 3) {
                        taperPct = '20% Taper Relief (32% Effective Tax)';
                        badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
                      }

                      return (
                        <tr key={g.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                            {g.recipient || 'Beneficiary'}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            £{g.amount.toLocaleString()}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">
                            {g.yearsAgo} {g.yearsAgo === 1 ? 'Year' : 'Years'} Ago {g.yearsAgo >= 7 ? '(Exempt)' : ''}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${badgeColor}`}>
                              {taperPct}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium text-slate-600 dark:text-slate-400">
                            {g.yearsAgo >= 7 ? 'Fully Exempt from Estate' : 'Uses NRB Allowance First'}
                          </td>
                          {!hideInputs && (
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGift(g)}
                                  title="Edit gift details"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePetGift(g.id)}
                                  title="Delete gift entry"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Popout Modal Window: Add / Edit Gift */}
        {isGiftModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
              role="dialog"
              aria-modal="true"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {editingGiftId ? 'Edit Non-Pension Gift' : 'Add Non-Pension Capital Gift (PET)'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record capital gifts made within the last 7 years
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveGift} className="p-5 space-y-4">
                {/* Recipient Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Gift Recipient & Purpose
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eldest daughter (house deposit), Son (wedding gift)"
                    value={giftForm.recipient}
                    onChange={(e) => setGiftForm({ ...giftForm, recipient: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Gift Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Gift Amount (£)
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Above £3k annual exemption
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      £
                    </span>
                    <input
                      type="number"
                      min={100}
                      step={1000}
                      required
                      value={giftForm.amount || ''}
                      onChange={(e) => setGiftForm({ ...giftForm, amount: Number(e.target.value) })}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[10000, 25000, 50000, 100000, 250000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGiftForm({ ...giftForm, amount: preset })}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                          giftForm.amount === preset
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        £{preset >= 1000 ? `${preset / 1000}k` : preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Years Elapsed Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Time Elapsed Since Gift Made
                  </label>
                  <select
                    value={giftForm.yearsAgo}
                    onChange={(e) => setGiftForm({ ...giftForm, yearsAgo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={0}>Within last 12 months (0 years ago — 0% Relief / 40% Full Tax)</option>
                    <option value={1}>1 Year Ago (0% Relief / 40% Full Tax)</option>
                    <option value={2}>2 Years Ago (0% Relief / 40% Full Tax)</option>
                    <option value={3}>3 Years Ago (20% Taper Relief — 32% Effective Tax)</option>
                    <option value={4}>4 Years Ago (40% Taper Relief — 24% Effective Tax)</option>
                    <option value={5}>5 Years Ago (60% Taper Relief — 16% Effective Tax)</option>
                    <option value={6}>6 Years Ago (80% Taper Relief — 8% Effective Tax)</option>
                    <option value={7}>7+ Years Ago (100% Relief — 100% Tax-Free Exempt)</option>
                  </select>
                </div>

                {/* Live Taper Relief Calculation Box */}
                {(() => {
                  let reliefText = '0% Taper Relief (40% Standard IHT Tax)';
                  let reliefClass = 'text-rose-600 dark:text-rose-400';
                  let desc = 'Gifts made within 0–3 years before death receive no taper relief and use up Nil Rate Band allowances first.';

                  if (giftForm.yearsAgo >= 7) {
                    reliefText = '100% Taper Relief (100% Tax-Free)';
                    reliefClass = 'text-emerald-600 dark:text-emerald-400';
                    desc = 'This gift has survived the full 7-year HMRC rule and is completely outside your taxable estate.';
                  } else if (giftForm.yearsAgo === 6) {
                    reliefText = '80% Taper Relief (8% Effective IHT Tax)';
                    reliefClass = 'text-teal-600 dark:text-teal-400';
                    desc = 'Year 6 gifts receive 80% HMRC taper relief, reducing IHT tax from 40% down to 8%.';
                  } else if (giftForm.yearsAgo === 5) {
                    reliefText = '60% Taper Relief (16% Effective IHT Tax)';
                    reliefClass = 'text-sky-600 dark:text-sky-400';
                    desc = 'Year 5 gifts receive 60% HMRC taper relief, reducing IHT tax from 40% down to 16%.';
                  } else if (giftForm.yearsAgo === 4) {
                    reliefText = '40% Taper Relief (24% Effective IHT Tax)';
                    reliefClass = 'text-indigo-600 dark:text-indigo-400';
                    desc = 'Year 4 gifts receive 40% HMRC taper relief, reducing IHT tax from 40% down to 24%.';
                  } else if (giftForm.yearsAgo === 3) {
                    reliefText = '20% Taper Relief (32% Effective IHT Tax)';
                    reliefClass = 'text-amber-600 dark:text-amber-400';
                    desc = 'Year 3 gifts receive 20% HMRC taper relief, reducing IHT tax from 40% down to 32%.';
                  }

                  return (
                    <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">HMRC 7-Year Status:</span>
                        <span className={`font-extrabold ${reliefClass}`}>{reliefText}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  );
                })()}

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGiftModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingGiftId ? 'Save Gift Changes' : 'Add Gift to Log'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Death Benefits & Tax Rules Guide Section */}
        {!isStudioMode && (
          <div className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700/80">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Master Guide: Income Tax & Death Benefits Across Asset Types
                </h4>
              </div>

              <div className={`grid grid-cols-1 gap-4 text-xs ${isStudioMode ? "" : "md:grid-cols-2"}`}>
                
                {/* Pensions Column */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      <span>Pensions (SIPP & DC)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      Age 75 Rule
                    </span>
                  </div>
                  
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white">Death Before Age 75:</strong> Beneficiaries can withdraw inherited pension funds <strong className="text-emerald-600 dark:text-emerald-400">100% Tax-Free</strong> for Income Tax (up to £1,073,100 LSDBA limit).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white">Death Age 75 or Older:</strong> Beneficiary withdrawals are taxed as <strong className="text-amber-600 dark:text-amber-400">Income Tax at the beneficiary's marginal rate</strong> (20%, 40%, or 45%).
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>
                        <em>April 2027 Budget Reform:</em> Pension pots become subject to 40% IHT in the estate, followed by marginal Income Tax if drawn post-75.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* ISAs Column */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>ISAs & Cash Savings</span>
                    </span>
                    <span className="text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                      Spousal APS
                    </span>
                  </div>

                  <ul className="space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white">Spousal Transfer (APS):</strong> Surviving spouses receive an <strong className="text-indigo-600 dark:text-indigo-400">Additional Permitted Subscription</strong> allowance, keeping inherited ISAs 100% tax-free indefinitely.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-500 font-bold">•</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white">Non-Spouse Heirs:</strong> <strong className="text-emerald-600 dark:text-emerald-400">No Income Tax</strong> is charged on the inherited capital lump sum upon death, but ISA tax wrapper status ends.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>
                        Subsequent growth, interest, and dividends earned post-distribution outside an ISA wrapper are subject to standard CGT and Income Tax.
                      </span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        )}

    </div>
  );
};
