import React from 'react';
import { UserProfile, TaxCalculationResult } from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import { ShieldAlert, AlertTriangle, Landmark, Info, FileText, Lock, Scale, HelpCircle } from 'lucide-react';

interface SummaryCommentsCardProps {
  profile: UserProfile;
  taxResult: TaxCalculationResult;
}

export const SummaryCommentsCard: React.FC<SummaryCommentsCardProps> = ({ profile, taxResult }) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const primaryAccessAge = getPensionAccessAge(profile);
  const partnerAccessAge = isCouple ? getPartnerPensionAccessAge(profile) : 57;

  const isPrimaryEarlyRetire = profile.targetRetirementAge < primaryAccessAge;
  const isPartnerEarlyRetire = isCouple && ((profile.partnerTargetRetirementAge ?? 60) < partnerAccessAge);

  const recyclingDetails = taxResult.pclsRecyclingDetails;
  const isRecyclingRisk = Boolean(taxResult.isPclsRecyclingRisk);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <span>Comments & Regulatory Guidance Notes</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              HMRC Compliance
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Key legal constraints, NMPA pension access rules, PCLS recycling regulations, and estate tax guidance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Note 1: Early Retirement Access Notice (NMPA) */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>1. Early Retirement Access Notice (NMPA Rules)</span>
          </div>
          <p className="text-xs text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
            Under UK Normal Minimum Pension Age (NMPA) laws, private pensions (Workplace & SIPP) cannot be accessed until age <strong>55</strong> (born before 6 Apr 1971) or age <strong>57</strong> (born on or after 6 Apr 1971), unless holding an explicit protected pension age.
          </p>
          {(isPrimaryEarlyRetire || isPartnerEarlyRetire) && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-[11px] font-bold text-amber-800 dark:text-amber-300 space-y-1">
              {isPrimaryEarlyRetire && (
                <p className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Primary: Target retirement at age {profile.targetRetirementAge} requires ISA/Cash bridge funding until NMPA age {primaryAccessAge}.</span>
                </p>
              )}
              {isPartnerEarlyRetire && (
                <p className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Partner: Target retirement at age {profile.partnerTargetRetirementAge ?? 60} requires ISA/Cash bridge funding until NMPA age {partnerAccessAge}.</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Note 2: HMRC PCLS Recycling Warning (Schedule 29 Rule) */}
        <div className={`p-4.5 rounded-2xl border space-y-2 ${
          isRecyclingRisk
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-xs">
              <Scale className={`w-4 h-4 shrink-0 ${isRecyclingRisk ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span>2. HMRC PCLS Recycling Warning (Schedule 29 Rule)</span>
            </div>
            {isRecyclingRisk && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                Active Risk
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed opacity-95">
            Under <strong>Schedule 29 Finance Act 2004 (PTM133800)</strong>, taking 25% Tax-Free Cash (PCLS) and significantly increasing pension contributions is classified as <em>recycling</em>. Standard, pre-existing routine workplace pension contributions maintain baseline levels and do NOT trigger recycling. Recycling charges (up to <strong>55%</strong>) only apply if PCLS is used to fund additional re-contributions exceeding <strong>30% of the PCLS lump sum</strong> and &gt;£7,500.
          </p>
          {isRecyclingRisk && recyclingDetails && (
            <div className="pt-2 border-t border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-900 dark:text-rose-200 space-y-0.5">
              <p>• PCLS Lump Sum: £{(recyclingDetails.pclsAmount || (0) || 0).toLocaleString()}</p>
              <p>• Re-contributed Pension Amount: £{(recyclingDetails.annualContributions || (0) || 0).toLocaleString()}</p>
              <p className="text-rose-600 dark:text-rose-400">• HMRC 30% Recycling Threshold: £{(recyclingDetails.threshold || (0) || 0).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Note 3: Income Tax on Inherited Estates (ISAs vs Pensions) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-xs">
            <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>3. Estate Tax Guidance: ISAs vs Pension Inheritance</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>ISAs:</strong> Inherited completely <strong>Income Tax-free</strong> by beneficiaries (spouses receive Additional Permitted Subscription allowances), but forms part of taxable estate for 40% Inheritance Tax (IHT).
            <br />
            <strong>Pensions:</strong> Inherited <strong>Income Tax-free</strong> if death occurs before age 75. If death occurs at or after age 75, withdrawals are taxed as marginal income. Starting April 2027, unused pension pots will also fall within gross taxable estate for IHT calculations.
          </p>
        </div>

        {/* Note 4: Lump Sum Allowance (LSA) & State Pension Lock */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-xs">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>4. Lump Sum Allowance Cap (£268,275) & State Pension</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Lump Sum Allowance (LSA):</strong> Standard lifetime tax-free cash is capped at <strong>£268,275</strong> per person (unless holding valid HMRC protection certificates). Tax-free cash extractions exceeding available LSA are taxed as income.
            <br />
            <strong>State Pension:</strong> Assumes annual inflation indexing under the UK Triple Lock mechanism (£11,541.40/yr full entitlement in 2026/27).
          </p>
        </div>

      </div>
    </div>
  );
};

