import React from 'react';
import { BookOpen, ShieldCheck, CheckCircle2, HelpCircle, AlertTriangle, Lightbulb, Percent, Coins, Landmark, Calendar, Scale, ArrowRight } from 'lucide-react';

export const TaxGuideCard: React.FC = () => {
  return (
    <div id="card-other-taxrules" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200 dark:border-emerald-800">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Official Reference Guide
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">• 2024/25 & 2025/26</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              UK Retirement Tax Rules Cheat Sheet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Essential UK tax bands, allowances, savings shelters, and tax relief mechanisms
            </p>
          </div>
        </div>
      </div>

      {/* Quick Summary Grid of Allowances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Personal Allowance</span>
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">£12,570</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">0% Income Tax Rate</div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Pension Annual Allowance</span>
            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">£60,000</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Or 100% of UK Earnings</div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>ISA Annual Allowance</span>
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">£20,000</div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">100% Tax-Free Growth</div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Lump Sum Allowance (LSA)</span>
            <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">£268,275</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">Max Lifetime Tax-Free Cash</div>
        </div>
      </div>

      {/* Section 1: The 60% Tax Trap Box */}
      <div className="p-5 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border border-amber-200/90 dark:border-amber-800/60 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-amber-950 dark:text-amber-200 text-base">
            The £100,000 – £125,140 "60% Marginal Tax Trap"
          </h3>
        </div>
        
        <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
          In the UK, your standard Personal Allowance (£12,570) is reduced by <strong>£1 for every £2</strong> your Adjusted Net Income exceeds £100,000. Because you pay 40% Higher Rate Tax while losing 20% worth of tax-free allowance at the same time, this creates an effective <strong>60% marginal tax rate</strong> on earnings between £100,000 and £125,140.
        </p>

        <div className="p-3.5 bg-amber-100/60 dark:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800/80 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-100">
          <Lightbulb className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div>
            <strong>Pension Fix:</strong> Making gross pension contributions reduces your Adjusted Net Income £1-for-£1. For example, contributing £10,000 gross to a SIPP or salary sacrifice pension restores £5,000 of Personal Allowance and saves £4,000 in tax — giving an effective 60% tax relief (£10,000 in your pension costs only £4,000 net)!
          </div>
        </div>
      </div>

      {/* Section 2: Income Tax Bands Table */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>UK Income Tax Bands (Rest of UK)</span>
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Tax Band</th>
                <th className="p-3">Taxable Income Range</th>
                <th className="p-3">Income Tax Rate</th>
                <th className="p-3">Effective Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr className="bg-white dark:bg-slate-900">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Personal Allowance</td>
                <td className="p-3">£0 – £12,570</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">0%</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Tax-free income threshold</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Basic Rate</td>
                <td className="p-3">£12,571 – £50,270</td>
                <td className="p-3 font-bold text-blue-600 dark:text-blue-400">20%</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Standard 20% tax relief on pension contributions</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Higher Rate</td>
                <td className="p-3">£50,271 – £125,140</td>
                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">40%</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Claim extra 20% relief via Self Assessment / SIPP</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Additional Rate</td>
                <td className="p-3">Over £125,140</td>
                <td className="p-3 font-bold text-rose-600 dark:text-rose-400">45%</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Claim extra 25% relief; subject to Tapered Annual Allowance if threshold income &gt; £200k</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Pension Relief Mechanisms */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Pension Tax Relief Mechanisms</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-emerald-900 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>1. Salary Sacrifice (Salary Exchange)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Deducted directly from gross salary before Income Tax and National Insurance are computed.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Saves Income Tax (20%, 40%, or 45%)</li>
              <li>Saves Employee National Insurance (8% or 2%)</li>
              <li>Employer saves 13.8% Employer NI (often passed back as extra contribution)</li>
            </ul>
          </div>

          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-indigo-900 dark:text-indigo-300 text-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>2. Relief at Source (SIPP & Personal Pensions)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Paid from net income. Provider automatically claims 20% basic rate tax relief from HMRC.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>£80 net payment automatically becomes £100 gross in your pension</li>
              <li>Higher Rate taxpayers claim an extra £20 back via Self Assessment</li>
              <li>Additional Rate taxpayers claim an extra £25 back via Self Assessment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 4: Pension vs ISA Comparison Matrix */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>Pension vs. ISA: Key Comparison</span>
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Feature</th>
                <th className="p-3">Pension (SIPP / Workplace)</th>
                <th className="p-3">ISA (S&S / Cash / LISA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr className="bg-white dark:bg-slate-900">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Annual Cap</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">£60,000 (or 100% earnings)</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">£20,000 total across all ISAs</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Upfront Relief</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">20% to 60% Income Tax + NI relief</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Post-tax income (25% bonus on LISA up to £1k/yr)</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Growth & Income</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Tax-free growth & dividends</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Tax-free growth & dividends</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Access Age</td>
                <td className="p-3 text-amber-700 dark:text-amber-300 font-bold">Age 55 (rising to 57 in April 2028)</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Anytime (LISA penalty-free at age 60)</td>
              </tr>
              <tr className="bg-white dark:bg-slate-900">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Withdrawal Tax</td>
                <td className="p-3">25% Tax-Free lump sum; 75% taxed as income</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">100% Tax-Free withdrawals</td>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="p-3 font-extrabold text-slate-900 dark:text-white">Inheritance Tax (IHT)</td>
                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">Generally outside estate for IHT</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Forms part of taxable estate for IHT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: PCLS & Decumulation Rules */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs text-slate-700 dark:text-slate-300">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Tax-Free Lump Sum (PCLS) & Money Purchase Annual Allowance (MPAA)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">PCLS (Pension Commencement Lump Sum)</h4>
            <p className="leading-relaxed">
              You can access up to <strong>25% of your total pension value tax-free</strong>, capped at the Lump Sum Allowance (LSA) of <strong>£268,275</strong>. The remaining 75% is placed into Flexi-Access Drawdown or used to buy an Annuity.
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold font-amber-900 text-amber-700 dark:text-amber-400 text-xs">⚠️ MPAA Trigger Warning</h4>
            <p className="leading-relaxed">
              Once you take your first taxable income payment flexibly from a defined contribution pension, you trigger the <strong>Money Purchase Annual Allowance (MPAA)</strong>. This reduces your future pension contribution cap from £60,000 down to <strong>£10,000/year</strong>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
