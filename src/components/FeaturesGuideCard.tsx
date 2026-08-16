import React from 'react';
import { 
  Sparkles, 
  Calculator, 
  LineChart, 
  Activity, 
  FileText, 
  Zap, 
  Home, 
  ShieldCheck,
  Bot,
  PieChart
} from 'lucide-react';

export const FeaturesGuideCard: React.FC = () => {
  return (
    <div id="card-doc-featuresguide" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-6">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black tracking-wide text-xs uppercase mb-1">
          <Sparkles className="w-4 h-4" />
          <span>App Features & Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Comprehensive Feature Overview
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Discover all the advanced tools, calculators, and visualisations available in RetireFree UK.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Core Tax Engine */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>UK Tax & Legislation Engine</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Natively understands UK PAYE, National Insurance, ISAs, SIPPs, the State Pension Triple Lock, PCLS tax-free cash rules, Dividend Tax, and Capital Gains Tax.
          </p>
        </div>

        {/* Max Spend Solver */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Genetic Max Spend Solver</span>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
            Automatically calculates the exact maximum sustainable withdrawal using an iterative algorithm ("Die With Zero"), solving for the absolute most you can spend without running out of money.
          </p>
        </div>

        {/* Dynamic Optimiser */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Dynamic Optimiser & Radar</span>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
            Multi-objective scorecard evaluating your plan across Tax Efficiency, Legacy, Longevity, Lifestyle, and Liquidity. Features a 5-axis Radar Chart and detailed Tax Matrix.
          </p>
        </div>

        {/* Cash Flow Sankey Diagrams */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100">
            <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Cash Flow Sankey Diagrams</span>
          </div>
          <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
            Interactive waterfall diagrams showing every pound flowing from its source, through the tax system, and into its final allocation for every phase of your retirement.
          </p>
        </div>

        {/* Right-Sizing */}
        <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800/30 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100">
            <Home className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>Right-Sizing & Property Strategy</span>
          </div>
          <p className="text-xs text-rose-800/80 dark:text-rose-200/80 leading-relaxed">
            Full property downsizing module with automated stamp duty calculation, selling costs, and direct equity routing to chosen investment pots.
          </p>
        </div>

        {/* Monte Carlo */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800/30 space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-100">
            <LineChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Monte Carlo & Historical Stress Testing</span>
          </div>
          <p className="text-xs text-purple-800/80 dark:text-purple-200/80 leading-relaxed">
            Run 1,000+ stochastic simulations to view the P10/P50/P90 probability cones, or stress-test your plan against real historical market crashes (e.g. Dot-Com, 2008).
          </p>
        </div>

        {/* AI Advisor */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Bot className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span>AI Tax Advisor & Smart Insights</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Context-aware AI assistant that reads your live plan and provides UK-specific tax optimisation guidance, alerting you to pension recycling risks and CGT harvesting windows.
          </p>
        </div>

        {/* Exporting */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span>PDF Reports & Live Excel Export</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate 20+ page illustrated PDF adviser-style reports, or export your entire plan as a live Formula Excel (.xlsx) workbook for further manual modelling.
          </p>
        </div>

        {/* Estate & IHT */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span>Estate & April 2027 IHT Planning</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Full inheritance tax modelling including NRB, RNRB, taper relief, and the newly announced April 2027 rules bringing pensions into the estate.
          </p>
        </div>

      </div>
    </div>
  );
};
