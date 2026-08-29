import React from 'react';
import { Percent, CheckCircle2, ArrowRight, Shield, TrendingUp, AlertTriangle, RefreshCw, Scale } from 'lucide-react';

export const DynamicWithdrawalGuideCard: React.FC = () => {
  return (
    <div id="card-doc-dynamicguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200/60 dark:border-purple-800/60">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Dynamic Withdrawal Rules & Guardrails Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                Guyton-Klinger Rules
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adaptive withdrawal strategies that respond dynamically to market downturns and portfolio gains
            </p>
          </div>
        </div>
      </div>

      {/* Static 4% Rule vs Dynamic Guardrails Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Flaws of Static 4% Rule</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The traditional 4% rule assumes you blindly increase annual withdrawals by inflation regardless of portfolio performance. During severe market crashes early in retirement, this rigid approach accelerates capital depletion.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-3">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-sm">
            <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Power of Dynamic Guardrails</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Guyton-Klinger Guardrails adjust annual spending dynamically based on portfolio health. Making small 10% spending cuts after bad market years prevents portfolio exhaustion and extends longevity by 5–10 years!
          </p>
        </div>
      </div>

      {/* Guyton-Klinger Core Rules Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-purple-500" />
          <span>The 4 Core Guyton-Klinger Rules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">1. Capital Preservation Rule (Lower Guardrail)</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If your current withdrawal rate exceeds your initial withdrawal rate by 20% due to market drops, <strong>reduce your annual spending target by 10%</strong> to preserve capital.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">2. Prosperity Rule (Upper Guardrail)</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If strong market gains reduce your withdrawal rate by 20% below your initial rate, <strong>increase your annual spending target by 10%</strong> to enjoy your wealth.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">3. Portfolio Management Rule</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Withdrawals are taken first from overperforming asset classes (rebalancing), preserving underperforming growth assets during market corrections.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">4. Inflation Rule</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Skip annual inflation adjustments to spending in years following a negative portfolio total return.
            </p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-primary-900 dark:text-primary-300">Modelling Variable Spending in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>Retirement Income Requirement (Spending Phases)</strong> card (under Strategy) to configure flexible spending stages (e.g. Go-Go 60–75, Slow-Go 75–85, No-Go 85+), matching real-world retirement spending curves.
          </p>
        </div>
      </div>

    </div>
  );
};
