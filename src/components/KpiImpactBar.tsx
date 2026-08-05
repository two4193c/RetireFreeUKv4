import React, { useMemo } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { TrendingUp, ShieldAlert, Sparkles, Target, Clock, Zap } from 'lucide-react';

interface KpiImpactBarProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections: YearProjection[];
  onOptimizeTaxTrap: (additionalAmount: number, target?: 'primary' | 'partner') => void;
}

export const KpiImpactBar: React.FC<KpiImpactBarProps> = ({
  profile,
  pots,
  taxResult,
  projections = [],
  onOptimizeTaxTrap,
}) => {
  const currentAge = profile.currentAge || 35;
  const targetRetirementAge = profile.targetRetirementAge || 60;

  // Find projection at retirement age safely
  const { projectedPotAtRetirement, depletionAge, incomeCoveragePercent } = useMemo(() => {
    if (!projections || projections.length === 0) {
      return { projectedPotAtRetirement: 0, depletionAge: null, incomeCoveragePercent: 100 };
    }

    const retirementProj = projections.find((p) => p.age === targetRetirementAge) || projections[projections.length - 1];
    const potAtRetire = retirementProj ? retirementProj.totalPot : 0;

    const depletedYr = projections.find((p) => p.potDepleted);
    const depAge = depletedYr ? depletedYr.age : null;

    const targetIncome = profile.targetRetirementIncomeAnnual || 30000;
    const retirementNetIncome = retirementProj ? retirementProj.netRetirementIncome : 0;
    const coverage = targetIncome > 0 ? Math.min(100, Math.round((retirementNetIncome / targetIncome) * 100)) : 100;

    return {
      projectedPotAtRetirement: potAtRetire,
      depletionAge: depAge,
      incomeCoveragePercent: coverage,
    };
  }, [projections, targetRetirementAge, profile.targetRetirementIncomeAnnual]);

  const isTaxTrapActive = taxResult?.is60PercentTaxTrap ?? false;
  const taxTrapRecommendedContribution = taxResult?.recommendedTaxTrapPensionContribution || 0;

  return (
    <div
      role="region"
      aria-label="Key performance indicators"
      className="sticky top-0 z-30 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white py-2.5 px-4 shadow-lg transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left Stats Group */}
        <div className="flex items-center gap-6 overflow-x-auto py-1 no-scrollbar">
          
          {/* Pot at Retirement */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Pot at Age {targetRetirementAge}
              </div>
              <div className="font-extrabold text-sm text-emerald-400">
                £{Math.round((projectedPotAtRetirement) || 0).toLocaleString()}
              </div>
            </div>
          </div>



          <div className="w-px h-6 bg-slate-800 shrink-0" />

          {/* Pot Sustainability / Depletion Age */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
              !depletionAge ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Pot Sustainability
              </div>
              <div className={`font-extrabold text-sm ${!depletionAge ? 'text-sky-400' : 'text-rose-400'}`}>
                {!depletionAge ? 'Sustainable (95+)' : `Depletes at Age ${depletionAge}`}
              </div>
            </div>
          </div>

        </div>

        {/* Right Callouts / Quick Tax Trap Action */}
        <div className="flex items-center gap-3 shrink-0">
          {isTaxTrapActive && taxTrapRecommendedContribution > 0 ? (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-xl px-3 py-1 text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="text-[11px] font-bold">
                60% Tax Trap Active (£{((taxResult?.adjustedNetIncome || 100000) - 100000).toLocaleString()} excess)
              </div>
              <button
                onClick={() => onOptimizeTaxTrap(taxTrapRecommendedContribution, 'primary')}
                className="ml-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-2.5 py-0.5 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>Fix Now</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-xl">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tax Model 2024/25 Active</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
