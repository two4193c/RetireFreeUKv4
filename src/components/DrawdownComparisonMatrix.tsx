import React, { useState } from 'react';
import { UserProfile, InvestmentPots, YearProjection, DrawdownStrategy } from '../types';
import { 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  Percent, 
  Sparkles, 
  User, 
  Heart,
  HelpCircle,
  TrendingDown,
  Info
} from 'lucide-react';

interface DrawdownComparisonMatrixProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections?: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
}

export const DrawdownComparisonMatrix: React.FC<DrawdownComparisonMatrixProps> = ({
  profile,
  pots,
  projections,
  onChange,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [selectedPerson, setSelectedPerson] = useState<'primary' | 'partner'>('primary');

  const currentStrategy: DrawdownStrategy = (
    selectedPerson === 'partner' 
      ? (profile.partnerDrawdownStrategy || profile.drawdownStrategy || 'isa_first')
      : (profile.drawdownStrategy || 'isa_first')
  );

  const takeLumpSumAtStart = selectedPerson === 'partner' 
    ? Boolean(profile.partnerTakeLumpSumAtStart)
    : Boolean(profile.takeLumpSumAtStart);

  const pclsPct = selectedPerson === 'partner'
    ? (profile.partnerPclsLumpSumPercent ?? 25)
    : (profile.pclsLumpSumPercent ?? 25);

  const personName = selectedPerson === 'partner' 
    ? (profile.partnerName || 'Partner')
    : (profile.name || 'Primary Person');

  const handleSelectStrategy = (strat: DrawdownStrategy) => {
    if (selectedPerson === 'partner') {
      onChange({
        ...profile,
        partnerDrawdownStrategy: strat,
      });
    } else {
      onChange({
        ...profile,
        drawdownStrategy: strat,
      });
    }
  };

  const strategies: {
    id: DrawdownStrategy;
    title: string;
    tagline: string;
    hierarchy: string;
    targetTaxBand: string;
    maxMarginalTax: string;
    pclsUfplsImpact: string;
    bestFor: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
  }[] = [
    {
      id: 'tax_free_bracket',
      title: 'Tax-Free Allowance Fill',
      tagline: '0% Income Tax Guarantee',
      hierarchy: 'Pension (up to £12.57k) → ISA → Cash',
      targetTaxBand: 'Personal Allowance (£12,570 / yr)',
      maxMarginalTax: '0% (Zero Tax Paid on Pension)',
      pclsUfplsImpact: takeLumpSumAtStart 
        ? 'PCLS Upfront: Draw £12,570 gross pension (100% taxable, 0% tax paid). Surplus income drawn from tax-free ISA.'
        : 'UFPLS Drip-Feed: Draw £16,760 gross pension (£12,570 taxable @ 0% tax + £4,190 tax-free cash) = £16,760 tax-free total!',
      bestFor: 'Absolute tax minimization by guaranteeing zero income tax paid on pension withdrawals.',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-300 dark:border-emerald-700/60',
    },
    {
      id: 'basic_rate_bracket',
      title: 'Basic Rate Band Fill',
      tagline: 'Max 20% Tax Cap',
      hierarchy: 'Pension (up to £50.27k) → ISA → Cash',
      targetTaxBand: 'Basic Rate Threshold (£50,270 / yr)',
      maxMarginalTax: '20% (Basic Rate Cap)',
      pclsUfplsImpact: takeLumpSumAtStart 
        ? 'PCLS Upfront: Draw pension up to £50,270 taxable income (max 20% tax). Surplus drawn from tax-free ISA.'
        : 'UFPLS Drip-Feed: Draw up to £67,026 gross pension (£50,270 taxable @ 20% max + £16,756 tax-free cash).',
      bestFor: 'Moderate to high retirement income needs without triggering 40% Higher Rate tax.',
      badgeBg: 'bg-teal-100 dark:bg-teal-950/80',
      badgeText: 'text-teal-800 dark:text-teal-300',
      borderColor: 'border-teal-300 dark:border-teal-700/60',
    },
    {
      id: 'higher_rate_bracket',
      title: 'Higher Rate Band Fill',
      tagline: 'Max 40% Tax Cap',
      hierarchy: 'Pension (up to £125.14k) → ISA → Cash',
      targetTaxBand: 'Higher Rate Threshold (£125,140 / yr)',
      maxMarginalTax: '40% (Capped before 45% & PA Taper)',
      pclsUfplsImpact: takeLumpSumAtStart 
        ? 'PCLS Upfront: Draw pension up to £125,140 taxable income (prevents 45% top rate & 60% £100k PA taper trap).'
        : 'UFPLS Drip-Feed: Draw up to £166,853 gross pension (£125,140 taxable + £41,713 tax-free cash).',
      bestFor: 'Substantial annual income targets in retirement while capping top-tier tax charges.',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
      badgeText: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-300 dark:border-amber-700/60',
    },
    {
      id: 'isa_first',
      title: 'ISA & Cash First',
      tagline: 'Preserve Pension Tax Shelter',
      hierarchy: 'Cash/GIA → ISA → Pension',
      targetTaxBand: 'Defer pension until ISAs exhausted',
      maxMarginalTax: '0% Early / Variable Late',
      pclsUfplsImpact: 'Preserves pension pot to compound tax-free for as long as possible. Excellent for IHT planning.',
      bestFor: 'Delaying tax liability in early retirement and preserving pension for beneficiaries under IHT rules.',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950/80',
      badgeText: 'text-indigo-800 dark:text-indigo-300',
      borderColor: 'border-indigo-300 dark:border-indigo-700/60',
    },
    {
      id: 'cash_first',
      title: 'Cash Buffer First',
      tagline: 'Non-Tax-Sheltered First',
      hierarchy: 'Cash/GIA → ISA → Pension',
      targetTaxBand: 'Spend down taxable cash assets',
      maxMarginalTax: '0% Capital Drawdown',
      pclsUfplsImpact: 'Clears taxable cash and GIA assets first before touching tax-sheltered ISAs or Pensions.',
      bestFor: 'Investors with significant cash reserves or GIA holdings seeking to reduce taxable assets first.',
      badgeBg: 'bg-sky-100 dark:bg-sky-950/80',
      badgeText: 'text-sky-800 dark:text-sky-300',
      borderColor: 'border-sky-300 dark:border-sky-700/60',
    },
    {
      id: 'pension_first',
      title: 'Pension First',
      tagline: 'Full Pension Drawdown',
      hierarchy: 'Pension → ISA → Cash',
      targetTaxBand: 'Draws full required income from pension',
      maxMarginalTax: '20% to 40%+',
      pclsUfplsImpact: takeLumpSumAtStart 
        ? 'PCLS Upfront: 100% of pension drawdown is taxable income.'
        : 'UFPLS Drip-Feed: Each draw is 25% tax-free cash / 75% taxable income.',
      bestFor: 'Depleting pension assets early (e.g. before age 75 or IHT rule changes) while keeping ISAs intact.',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
      badgeText: 'text-purple-800 dark:text-purple-300',
      borderColor: 'border-purple-300 dark:border-purple-700/60',
    },
    {
      id: 'pro_rata',
      title: 'Pro Rata Balanced',
      tagline: 'Equal Asset Depletion',
      hierarchy: 'Proportional across Pension, ISA, Cash',
      targetTaxBand: 'Blended across pots',
      maxMarginalTax: 'Blended Tax Rate',
      pclsUfplsImpact: 'Withdraws proportionally from all pots each year to maintain asset allocation and balance tax exposure.',
      bestFor: 'Simple, steady depletion across all asset classes without favoring one pot over another.',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-300 dark:border-slate-700',
    },
  ];

  return (
    <div id="drawdown-matrix-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Draw Down Comparison Matrix
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Comparative matrix evaluating remaining pot drawdown sequences, tax bracket filling thresholds, and tax-free lump sum (PCLS vs UFPLS) impact.
            </p>
          </div>
        </div>

        {/* Couple Person Toggle */}
        {isCouple && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
            <button
              onClick={() => setSelectedPerson('primary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                selectedPerson === 'primary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
            </button>
            <button
              onClick={() => setSelectedPerson('partner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                selectedPerson === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{profile.partnerName || 'Partner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tax-Free Lump Sum (PCLS vs UFPLS) Active Context Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-indigo-100 to-slate-100 dark:from-indigo-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Active Lump Sum Mode for {personName}:
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
              takeLumpSumAtStart 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40' 
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
            }`}>
              {takeLumpSumAtStart 
                ? (pclsPct < 25 ? `Upfront ${pclsPct}% PCLS (+ Remaining Drip-Feed)` : 'Upfront 25% PCLS Taken') 
                : 'Phased UFPLS Drip-Feed'}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            Current Active Strategy: <strong className="text-slate-900 dark:text-white font-mono">{strategies.find((s) => s.id === currentStrategy)?.title || 'ISA First'}</strong>
          </div>
        </div>

        <div className="text-xs text-slate-700 dark:text-indigo-100/90 leading-relaxed bg-white/80 dark:bg-white/5 p-3 rounded-lg border border-indigo-100 dark:border-white/10">
          {takeLumpSumAtStart ? (
            pclsPct < 25 ? (
              <p>
                <strong>Partial PCLS Upfront ({pclsPct}%):</strong> You extracted {pclsPct}% tax-free cash upfront. The remaining {25 - pclsPct}% tax-free entitlement stays in your uncrystallised pension pot, and <strong>is automatically drawn tax-free (25% tax-free portion) on subsequent annual drawdowns</strong> until your Lump Sum Allowance (£268,275) is reached.
              </p>
            ) : (
              <p>
                <strong>PCLS Upfront Active (Full 25%):</strong> Because your full 25% tax-free lump sum is extracted upfront at retirement, <strong>100% of future pension drawdowns are taxable income</strong>. Filling your Personal Allowance (£12,570) requires drawing £12,570 gross pension (0% tax). Surplus required income is drawn tax-free from ISAs.
              </p>
            )
          ) : (
            <p>
              <strong>UFPLS Drip-Feed Active:</strong> Because tax-free cash is un-crystallised, <strong>each pension withdrawal is 25% tax-free cash and 75% taxable income</strong>. To fill your £12,570 Personal Allowance, you can draw <strong>£16,760 gross pension</strong> (£12,570 taxable @ 0% tax + £4,190 tax-free cash), receiving <strong>£16,760 total cash 100% tax-free!</strong>
            </p>
          )}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strat) => {
          const isActive = currentStrategy === strat.id;
          return (
            <div
              key={strat.id}
              className={`flex flex-col justify-between rounded-xl p-4 border transition-all ${
                isActive
                  ? `${strat.borderColor} bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-500/30 shadow-sm`
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider mb-1 ${strat.badgeBg} ${strat.badgeText}`}>
                      {strat.tagline}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {strat.title}
                    </h4>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-indigo-500" />
                      <span>Withdrawal Hierarchy:</span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      {strat.hierarchy}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      <div className="text-slate-500 dark:text-slate-400 font-bold">Tax Band Target:</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{strat.targetTaxBand}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      <div className="text-slate-500 dark:text-slate-400 font-bold">Max Marginal Tax:</div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400">{strat.maxMarginalTax}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                      <Info className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>PCLS / UFPLS Impact:</span>
                    </div>
                    <p className="leading-relaxed">
                      {strat.pclsUfplsImpact}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    <strong>Best For:</strong> {strat.bestFor}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {isActive ? (
                  <div className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span>Selected Strategy</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectStrategy(strat.id)}
                    className="w-full py-2 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-800 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300 rounded-xl font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer shadow-xs"
                  >
                    Select {strat.title}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
