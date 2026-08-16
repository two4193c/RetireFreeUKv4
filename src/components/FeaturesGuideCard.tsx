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
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const FeaturesGuideCard: React.FC = () => {
  return (
    <div id="card-doc-featuresguide" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-6">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black tracking-wide text-xs uppercase mb-1">
          <Sparkles className="w-4 h-4" />
          <span>App Features & Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Feature Comparison & Capabilities
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          RetireFree UK uniquely occupies the intersection of consumer DIY tools, adviser-grade software, and global FIRE calculators: providing adviser-depth tax modelling in a real-time reactive UI—at zero cost.
        </p>
      </div>

      {/* Feature Matrix */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-500" />
          Competitive Feature Matrix
        </h3>
        
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-700/80">Feature / Capability</th>
                <th className="px-4 py-3 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-slate-200 dark:border-slate-700/80">RetireFree UK</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700/80">UK DIY (e.g. RetireEasy)</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700/80">B2B Adviser (e.g. Voyant)</th>
                <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700/80">US FIRE (e.g. ProjectionLab)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">UK Income Tax (PAYE, NI, ISA)</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Full Bands</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Basic</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Full</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-amber-500 inline mr-1"/> Manual/Generic</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">State Pension & Triple Lock</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Advanced</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Basic</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Yes</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Yes</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">Cash Flow Sankey Diagrams</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Interactive</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">Property Downsizing & Stamp Duty</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Full Routing</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-amber-500 inline mr-1"/> Lump Sum Only</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Yes</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-amber-500 inline mr-1"/> Manual</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">IHT / Estate Planning</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> April '27 Rules</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
                <td className="px-4 py-3"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Full</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">Max Spend Solver</td>
                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/5"><CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-1"/> Genetic Algorithm</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
                <td className="px-4 py-3"><XCircle className="w-4 h-4 text-rose-400 inline mr-1"/> No</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">Monthly Cost</td>
                <td className="px-4 py-3 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/5">Free</td>
                <td className="px-4 py-3">~£8 / mo</td>
                <td className="px-4 py-3">£60+ / mo</td>
                <td className="px-4 py-3">~$20 / mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unique Differentiators */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          RetireFree UK Exclusive Features
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          The following capabilities exist in RetireFree UK and have no direct equivalent in competing UK planning tools.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30 space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Genetic Max Spend Solver
            </h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
              Instead of guessing if your money will last, our algorithmic solver automatically iterates through your cash flow to find the exact maximum sustainable withdrawal ("Die With Zero").
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 space-y-2">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Sankey Cash Flow Diagrams
            </h4>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
              Interactive waterfall diagrams generated for every phase of retirement, visually routing every pound from its source account, through the HMRC tax system, and into your spending budget.
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 space-y-2">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Right-Sizing Equity Routing
            </h4>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
              Models complex property downsizing events, automatically deducting agent fees and SDLT, and letting you inject the released equity directly into specific pots (like ISAs or SIPPs).
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800/30 space-y-2">
            <h4 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <LineChart className="w-4 h-4" /> KPI Impact Slider
            </h4>
            <p className="text-xs text-purple-800/80 dark:text-purple-200/80 leading-relaxed">
              A real-time sliding bar showing exactly how each input change instantly impacts your key metrics (retirement age, pot depletion age, and inheritance value) without reloading.
            </p>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-200 dark:border-indigo-800/30 space-y-2 md:col-span-2">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Live AI-Ready Exports
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
              Download your entire plan as a live Formula Excel (.xlsx) workbook where every cell connects using native Excel formulas. Designed specifically so you can upload it directly to ChatGPT or Claude for a second-opinion critique.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
