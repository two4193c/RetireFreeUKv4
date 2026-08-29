import React from 'react';
import { Briefcase, CheckCircle2, ArrowRight, ShieldCheck, Building2, TrendingUp, Sparkles, DollarSign, Percent, AlertTriangle, FileText } from 'lucide-react';

export const SelfEmployedGuideCard: React.FC = () => {
  return (
    <div id="card-doc-selfemployedguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200/60 dark:border-amber-800/60">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Self-Employed Retirement & Tax Efficiency Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                UK Sole Trader & Director
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Optimizing pensions, Corporation Tax, Dividend Tax, and National Insurance for self-employed individuals
            </p>
          </div>
        </div>
      </div>

      {/* Business Structure Comparison: Sole Trader vs Ltd Co Director */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sole Trader Card */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <span>Sole Trader (Unincorporated)</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Personal SIPP Tax Relief</h4>
              <p className="leading-relaxed">
                Contributions made from personal income automatically receive <strong>20% basic rate tax relief</strong> added by your SIPP provider. Higher (40%) and Additional (45%) rate relief is claimed via your annual Self Assessment tax return.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white">National Insurance Rules</h4>
              <p className="leading-relaxed">
                Personal pension contributions reduce your taxable income for Income Tax, but do not reduce Class 4 National Insurance liabilities.
              </p>
            </div>
          </div>
        </div>

        {/* Limited Company Director Card */}
        <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
            <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Limited Company Director (Incorporated)</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1">
              <h4 className="font-bold text-amber-900 dark:text-amber-300">Direct Employer Contributions (Gold Standard)</h4>
              <p className="leading-relaxed">
                Your Ltd Co pays contributions <strong>directly from the business bank account into your SIPP</strong>. This is an allowable business expense, reducing <strong>Corporation Tax by 19%–25%</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1">
              <h4 className="font-bold text-amber-900 dark:text-amber-300">Zero Dividend & NI Tax Drag</h4>
              <p className="leading-relaxed">
                Direct employer contributions bypass Dividend Tax (up to 39.35%) and Income Tax completely, offering huge compounding advantages over extracting dividends first.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ltd Co Director Tax Comparison Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary-500" />
          <span>Director Extraction Math: £10,000 Profit Extraction Comparison</span>
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Extraction Method</th>
                <th className="p-3.5">Corporation Tax (25%)</th>
                <th className="p-3.5">Personal Tax / Dividend Tax</th>
                <th className="p-3.5">Net Amount into Pension/Pocket</th>
                <th className="p-3.5">Tax Efficiency Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">1. Direct Ltd Co SIPP Contribution</td>
                <td className="p-3.5 font-bold text-primary-600 dark:text-primary-400">£0 (Deductible Expense)</td>
                <td className="p-3.5 font-bold text-primary-600 dark:text-primary-400">£0 (Zero Income/Dividend Tax)</td>
                <td className="p-3.5 font-bold text-primary-600 dark:text-primary-400">£10,000 in SIPP</td>
                <td className="p-3.5 font-bold text-primary-600 dark:text-primary-400">100% (Maximum Efficiency)</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">2. Dividend Extract → Personal SIPP (Higher Rate)</td>
                <td className="p-3.5">£2,500 Corp Tax paid</td>
                <td className="p-3.5">£2,530 Dividend Tax (33.75%)</td>
                <td className="p-3.5 font-bold text-amber-600">£6,212 in SIPP (After relief)</td>
                <td className="p-3.5 text-amber-600 font-bold">62.1% (Loss to Tax Drag)</td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">3. Salary Extract → Personal SIPP (Higher Rate)</td>
                <td className="p-3.5">£0 (Salary deductible)</td>
                <td className="p-3.5">£4,000 Income Tax + £200 NI</td>
                <td className="p-3.5">£5,800 Net Cash</td>
                <td className="p-3.5 text-slate-400">58.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Managing Volatile Income & Pension Carry Forward */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Managing Income Volatility with Pension Carry Forward</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Self-employed earnings are naturally variable. In high-profit years, you can use <strong>Pension Carry Forward rules</strong> to contribute more than the current year's £60,000 annual allowance by utilizing unused allowances from the <strong>3 previous tax years</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Max £200k+ Single Contribution</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If you had a SIPP open in previous years but made minimal contributions, you could potentially inject up to £180,000–£240,000 in a single bumper profit year.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Carry Forward Order Rule</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Current year (£60k) allowance is used first, followed by the oldest available tax year (3 years ago), working forward chronologically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1.5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300">HMRC Wholly & Exclusively Test</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Director pension contributions must pass the HMRC "wholly and exclusively for trade" test and be commercially reasonable for work performed.
            </p>
          </div>
        </div>
      </div>

      {/* State Pension National Insurance Protection */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-primary-500" />
          <span>Protecting Your State Pension Record as Self-Employed</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          You need <strong>35 qualifying National Insurance years</strong> for the full New State Pension (£11,502.40/yr). Ltd Co Directors usually pay a small salary above the Lower Earnings Limit (£6,396/yr) to gain a qualifying NI year with 0% actual NI tax paid. Sole traders gain qualifying years through Class 2/4 NI contributions. Check your record on gov.uk for any missing years that can be filled via Voluntary Class 3 NI contributions.
        </p>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-primary-900 dark:text-primary-300">Modelling Self-Employed Contributions in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>SIPP Monthly & One-Off Contributions Manager</strong> (under Baseline Inputs) to model ongoing or one-off Ltd Co employer pension injections, and see their direct impact on your retirement capital trajectory.
          </p>
        </div>
      </div>

    </div>
  );
};
