import React from 'react';
import { 
  Briefcase, 
  TrendingDown, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Layers, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const PhasedRetirementGuideCard: React.FC = () => {
  return (
    <div id="card-doc-phasedretirementguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-200/60 dark:border-teal-800/60">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Phased Retirement & Salary Sacrifice Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                Tax Cliff Elimination
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Combining part-time consulting earnings with pension income while eliminating the 60% tax trap via targeted salary sacrifice.
            </p>
          </div>
        </div>
      </div>

      {/* Concept 1: The 60% Tax Trap at £100,000 */}
      <div className="p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-rose-950 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            The Infamous 60% Income Tax Trap (£100k - £125,140)
          </span>
          <span className="text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800">
            Severe Marginal Rate
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          In the UK, for every £2 of adjusted net income earned above <strong>£100,000</strong>, you lose £1 of your £12,570 Personal Allowance. This creates an effective <strong>60% marginal income tax rate</strong> (62% including National Insurance) on earnings between £100,000 and £125,140.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">Without Salary Sacrifice</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Earning £115,000 results in £15,000 being taxed at an effective 60%, leaving you with just <strong>£6,000 net cash</strong> from that £15k slice!</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              With £15,000 Pension Sacrifice
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Sacrificing £15,000 into your pension puts the full <strong>£15,000 intact into your SIPP</strong>, restores your Personal Allowance 100%, and costs only £6k net cash!</p>
          </div>
        </div>
      </div>

      {/* Key UK Tax Cliffs Summary Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-teal-500" />
          <span>Major UK Tax Cliffs to Target with Pension Contributions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              £50,270 Threshold
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Higher Rate Tax (40%) boundary. Sacrificing earnings above £50,270 avoids 40% income tax and preserves 100% of High Income Child Benefit (tapered £60k–£80k).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-rose-500" />
              £100,000 Cliff
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Personal Allowance taper starts. Also causes complete loss of Tax-Free Childcare (£2k/child) and 15/30 hours free childcare schemes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-500" />
              £125,140 Additional Rate
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Personal Allowance is fully lost (£0). Earnings above £125,140 are subject to 45% Additional Rate tax and £0 Personal Savings Allowance.
            </p>
          </div>

        </div>
      </div>

      {/* Phased Retirement Strategy */}
      <div className="p-6 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Benefits of Phased Retirement (Consulting + Partial Drawdown)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white">1. Drastically Lowers Portfolio Drawdown Rate</span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Earning even £15,000–£25,000/year from part-time work or non-executive roles in early retirement drops your portfolio withdrawal rate from 5% down to 1.5%. This virtually eliminates Sequence of Returns Risk during your first 5 years of retirement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/60 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white">2. Tax Allowance Doubling across Spouses</span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Combining £12,570 tax-free earnings each with £12,570 tax-free pension drawdown across a married couple yields <strong>£50,280/year total tax-free household cashflow</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-teal-900 dark:text-teal-300">Modelling Phased Retirement in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the <strong>Profile & Fixed Income Inputs</strong> card, you can add partial employment earnings with an explicit <strong>End Age</strong> (e.g. part-time consulting from age 60 to 65). The projection engine models tax bands and adjusts required portfolio drawdown dynamically.
          </p>
        </div>
      </div>

    </div>
  );
};
