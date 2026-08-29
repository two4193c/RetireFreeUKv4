import React from 'react';
import { Percent, CheckCircle2, ArrowRight, ShieldCheck, AlertTriangle, Scale, DollarSign, TrendingUp, Globe } from 'lucide-react';

export const FourPercentRuleGuideCard: React.FC = () => {
  return (
    <div id="card-doc-fourpercentguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>The 4% Rule vs. UK Reality Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                UK Withdrawal Benchmarks
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Why US Trinity Study rules overstate safe withdrawal rates for UK investors, and realistic UK SWR benchmarks
            </p>
          </div>
        </div>
      </div>

      {/* Origins of the 4% Rule */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
          <Globe className="w-5 h-5 text-indigo-500" />
          <span>Origins of the 4% Rule (Bengen 1994 & Trinity Study)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          In 1994, financial planner Bill Bengen analyzed US market data (1926–1992) and concluded that withdrawing <strong>4% of initial portfolio value in Year 1</strong>, adjusted annually for inflation, survived all 30-year historical periods without running out of money. The 1998 Trinity Study reinforced this finding using a 50/50 US Stock/Bond mix.
        </p>
      </div>

      {/* Why UK Reality Requires Lower Safe Withdrawal Rates */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>4 Key Reasons Why the 4% Rule Overstates UK Safety</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
            <h4 className="font-bold text-amber-900 dark:text-amber-300">1. Higher UK Inflation Volatility</h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Historically, UK RPI/CPI inflation has suffered sharper spikes (e.g. 1970s & 2022–2023) than US CPI. High early inflation forces larger cash withdrawals during market dips, accelerating sequence risk.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
            <h4 className="font-bold text-amber-900 dark:text-amber-300">2. Total Investment Fee Drag (0.50% – 0.75%)</h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Bengen assumed 0% fees. UK investors pay platform fees (0.15%–0.45%), OCF fund charges (0.10%–0.40%), and adviser fees. A 0.75% fee drag reduces a nominal 4% SWR down to an effective <strong>3.25% net SWR</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
            <h4 className="font-bold text-amber-900 dark:text-amber-300">3. Lower Historical UK Domestic Equity Returns</h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              US equities (S&P 500) were the global outperformer of the 20th century. UK equities (FTSE All-Share) delivered lower real annualized returns, reducing historical portfolio survival rates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
            <h4 className="font-bold text-amber-900 dark:text-amber-300">4. UK Tax Leakage & PCLS Rules</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              While 25% of UK pension withdrawals are tax-free (PCLS), the remaining 75% is taxed as income. Gross withdrawals must be higher to achieve net target spending unless funded by tax-free ISAs.
            </p>
          </div>
        </div>
      </div>

      {/* Realistic UK SWR Benchmarks */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
          <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Realistic UK Safe Withdrawal Rate (SWR) Benchmarks</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">3.2% – 3.5% SWR</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Standard 30-Year Retirement (Age 60 to 90)</strong>. Accounting for UK fees (0.5%) and global equity diversification.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">2.8% – 3.2% SWR</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Early Retirement / FIRE (40+ Year Horizon)</strong>. Extra buffer required for extended decumulation windows.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">4.0% – 4.5% SWR</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Dynamic Guardrail Strategy</strong>. Safe when paired with Guyton-Klinger rules (cutting spending by 10% in bad years).
            </p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-primary-900 dark:text-primary-300">Testing SWR in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>Maximized Spend Solver</strong> modal (under Baseline Inputs) or run a <strong>Monte Carlo Stress Test</strong> to stress test your personal withdrawal rate against 500+ simulated market paths and 100+ years of UK market history!
          </p>
        </div>
      </div>

    </div>
  );
};
