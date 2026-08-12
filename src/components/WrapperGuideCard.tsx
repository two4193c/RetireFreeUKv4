import React from 'react';
import { Wallet, CheckCircle2, ArrowRight, ShieldCheck, TrendingUp, Sparkles, AlertTriangle, Layers, Percent } from 'lucide-react';

export const WrapperGuideCard: React.FC = () => {
  return (
    <div id="card-doc-wrapperguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Workplace Pension, SIPP & ISA Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                UK Tax Wrappers
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative analysis of Workplace Pensions, SIPPs, ISAs, and LISAs to optimize savings efficiency
            </p>
          </div>
        </div>
      </div>

      {/* Wrapper Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Feature</th>
              <th className="p-3.5">Workplace Pension</th>
              <th className="p-3.5">SIPP (Self-Invested)</th>
              <th className="p-3.5">Stocks & Shares ISA</th>
              <th className="p-3.5">Lifetime ISA (LISA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Upfront Tax Relief</td>
              <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">20%–45% + NI Savings (Salary Sac)</td>
              <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">20%–45% (Basic via provider, HRT via tax return)</td>
              <td className="p-3.5 text-slate-400">None (After-tax funds)</td>
              <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">25% Govt Bonus (Up to £1,000/yr)</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Employer Matching</td>
              <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">Yes (Auto-enrolment min 3%, often higher)</td>
              <td className="p-3.5 text-slate-400">No (Except Director contributions)</td>
              <td className="p-3.5 text-slate-400">No</td>
              <td className="p-3.5 text-slate-400">No</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Annual Allowance</td>
              <td className="p-3.5">£60,000 (Combined employee + employer)</td>
              <td className="p-3.5">£60,000 (Shares same AA as workplace)</td>
              <td className="p-3.5">£20,000 per tax year</td>
              <td className="p-3.5">£4,000 (Counts towards £20k ISA limit)</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Access Age</td>
              <td className="p-3.5">Age 57 (NMPA from 2028)</td>
              <td className="p-3.5">Age 57 (NMPA from 2028)</td>
              <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Anytime (No age restriction)</td>
              <td className="p-3.5">Age 60 (Or 25% penalty before 60)</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Withdrawal Tax</td>
              <td className="p-3.5">25% Tax-Free (PCLS), 75% Taxable Income</td>
              <td className="p-3.5">25% Tax-Free (PCLS), 75% Taxable Income</td>
              <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">100% Tax-Free</td>
              <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">100% Tax-Free after age 60</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="p-3.5 font-bold text-slate-900 dark:text-white">Same-Year Flexibility</td>
              <td className="p-3.5 text-slate-400">No (Locked in pension)</td>
              <td className="p-3.5 text-slate-400">No (Locked in pension)</td>
              <td className="p-3.5 text-cyan-600 dark:text-cyan-400 font-bold">Yes (Flexible ISA: Replace in same tax year)</td>
              <td className="p-3.5 text-slate-400">No (25% penalty on early replacement)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Optimal Contribution Waterfall */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>The Optimal Contribution Hierarchy (Savings Waterfall)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center">1</span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Max Employer Match</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Always contribute enough to your Workplace Pension to claim 100% of your employer's matching contribution. This is an instant 100% return.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black text-xs flex items-center justify-center">2</span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Eliminate Tax Traps</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              High earners (£100k–£125k) should use Salary Sacrifice or SIPP contributions to reduce taxable salary below £100k, avoiding the 60% marginal tax rate.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-xs flex items-center justify-center">3</span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Fill ISA Bridge</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              If planning early retirement (before age 57), build your Stocks & Shares ISA (£20,000/yr allowance) to fund the bridge years prior to pension access age.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center">4</span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Uncapped SIPP Top-Up</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Utilize remaining £60,000 Annual Allowance via a low-cost SIPP to access wider investment choices (individual stocks, ETFs, commercial property).
            </p>
          </div>
        </div>
      </div>

      {/* Salary Sacrifice Deep Dive */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
        <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
          <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Why Salary Sacrifice Beats Personal Pension / SIPP for Employees</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Under Salary Sacrifice (Smart Pensions), you formally reduce your gross salary in exchange for employer pension contributions. This saves <strong>Employee National Insurance (8% basic rate / 2% higher rate)</strong> in addition to Income Tax, and allows employers to pass back their <strong>13.8% Employer NI savings</strong> into your pension pot.
        </p>
      </div>

      {/* Lifetime ISA (LISA) Deep Dive */}
      <div className="p-6 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-300 font-bold text-sm">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Lifetime ISA (LISA): Rules, 25% Government Bonus & Penalty Rules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60 space-y-1.5">
            <h4 className="font-bold text-purple-900 dark:text-purple-300">25% Government Bonus</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Save up to <strong>£4,000 per tax year</strong> (counts towards £20k ISA limit) and receive an instant 25% government bonus (up to <strong>£1,000/year free cash</strong>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60 space-y-1.5">
            <h4 className="font-bold text-purple-900 dark:text-purple-300">Age Eligibility Rules</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Must be opened between ages <strong>18 and 39</strong>. You can continue contributing and claiming bonuses until your 50th birthday.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60 space-y-1.5">
            <h4 className="font-bold text-purple-900 dark:text-purple-300">Tax-Free Access & Penalty</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Withdraw 100% tax-free from <strong>age 60</strong> or for first home purchase (up to £450k). Early unauthorized withdrawals incur a <strong>25% penalty charge</strong> (net ~6.25% capital loss).
            </p>
          </div>
        </div>

        {/* When to Use a LISA Decision Guide */}
        <div className="pt-2 space-y-3 border-t border-purple-200/60 dark:border-purple-900/60">
          <h4 className="font-bold text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wider">Strategic Decision Guide: When Should You Use a LISA?</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Green: When to use */}
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>🟢 Optimal Use Cases (Use LISA)</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                <li><strong>First-time homebuyers (under £450k)</strong>: Unbeatable 25% free bonus for home deposit.</li>
                <li><strong>Basic Rate (20%) taxpayers saving for retirement</strong>: 25% bonus equals basic pension tax relief, but pays out <strong>100% TAX-FREE at age 60</strong> (vs 75% taxable pension income).</li>
                <li><strong>Self-employed Basic Rate taxpayers</strong>: Gives equal top-up to pension relief, with zero HMRC tax code drag after 60.</li>
              </ul>
            </div>

            {/* Red: When NOT to use */}
            <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>🔴 Sub-Optimal Use Cases (Avoid LISA)</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                <li><strong>When employer offers pension matching</strong>: 100% employer match far beats 25% LISA bonus.</li>
                <li><strong>Higher (40%) or Additional (45%) Rate taxpayers</strong>: 40%–45% pension tax relief significantly beats 25% LISA.</li>
                <li><strong>Salary Sacrifice available</strong>: Saving Employee NI (8%/2%) + Employer NI (13.8%) makes pension superior.</li>
                <li><strong>Retiring before age 60</strong>: Locked until 60; early access triggers 25% penalty. Use standard ISA for pre-57 bridge.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Flexible ISA Rules & Strategic Liquidity Deep Dive */}
      <div className="p-6 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-cyan-900 dark:text-cyan-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>Flexible ISA Rules: Same-Tax-Year Cash Replacements & Liquidity Buffer</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Introduced by HMRC in April 2016, <strong>Flexible ISAs</strong> allow investors to withdraw cash from their ISA and replace it within the <strong>same tax year (6 April – 5 April)</strong> without the replacement counting towards their £20,000 annual ISA allowance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-900/60 space-y-2">
            <h4 className="font-bold text-cyan-900 dark:text-cyan-300">How Same-Year Replacement Works</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If you contribute £20,000 into a Flexible ISA in May, withdraw £8,000 in August for a short-term cash need, you can repay the £8,000 back into your ISA prior to <strong>5 April</strong> of the same tax year without exceeding your annual limit.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-900/60 space-y-2">
            <h4 className="font-bold text-cyan-900 dark:text-cyan-300">Provider & Wrapper Eligibility</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Flexibility is optional for providers. Supported by major platforms for <strong>Cash ISAs and Stocks & Shares ISAs</strong>. <strong>NOT allowed for Lifetime ISAs (LISA) or Junior ISAs (JISA)</strong>. Always verify if your platform offers Flexible ISA rules.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-900/60 space-y-2">
            <h4 className="font-bold text-cyan-900 dark:text-cyan-300">FIRE & Retirement Strategy</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Serves as a <strong>tactical emergency cash reserve</strong>. You can fund unexpected major life expenses (e.g. house repairs, car purchase, bridge income) from ISA cash without permanently destroying tax-free allowance capacity.
            </p>
          </div>
        </div>
      </div>

      {/* Innovative Finance ISA (IFISA) & Junior ISA (JISA) Deep Dive */}
      <div className="p-6 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-teal-900 dark:text-teal-300 font-bold text-sm">
          <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>Innovative Finance ISA (IFISA) & Junior ISA (JISA) Deep Dive</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Innovative Finance ISA */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-900 dark:text-teal-300 text-sm">Innovative Finance ISA (IFISA)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">Counts in £20k Limit</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Allows UK taxpayers to invest in <strong>peer-to-peer (P2P) loans, property crowdfunding debentures, and corporate bonds</strong> with 100% tax-free interest and capital returns.
            </p>
            <div className="space-y-1.5 pt-1 border-t border-teal-100 dark:border-teal-900/40">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-teal-600 dark:text-teal-400">• Allowance:</span> Shares the annual <strong>£20,000 ISA limit</strong> across Cash, Stocks & Shares, LISA, and IFISA.
              </div>
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-rose-600 dark:text-rose-400">• FSCS Warning:</span> <strong>NOT covered by the Financial Services Compensation Scheme (FSCS)</strong>. Borrower defaults can result in permanent capital loss.
              </div>
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-teal-600 dark:text-teal-400">• Role in Planning:</span> Niche wrapper for targeted high-yield fixed income, but illiquid and higher risk than Cash/Index ISAs.
              </div>
            </div>
          </div>

          {/* Junior ISA */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-900 dark:text-teal-300 text-sm">Junior ISA (JISA)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Separate £9,000 Allowance</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              A tax-free long-term savings and investment vehicle for UK children under 18, available as either <strong>Cash JISA</strong> or <strong>Stocks & Shares JISA</strong>.
            </p>
            <div className="space-y-1.5 pt-1 border-t border-teal-100 dark:border-teal-900/40">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">• Allowance:</span> <strong>£9,000 per child per tax year</strong>. This is <em>completely separate</em> from parents' £20k ISA limit.
              </div>
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-teal-600 dark:text-teal-400">• Access & Ownership:</span> Locked until the child turns <strong>18</strong>, when it automatically converts into an adult ISA under their sole ownership.
              </div>
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-teal-600 dark:text-teal-400">• Role in Planning:</span> Powerful for multi-generational wealth transfers, compounding wealth tax-free for children/grandchildren early.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Coupon Gilts & Gilt Ladder Strategy */}
      <div className="p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Low Coupon UK Treasury Gilts & Gilt Ladder Strategy (CGT-Free Income Bridge)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Under UK tax legislation (TCGA 1992 section 115), <strong>UK Treasury Gilts are 100% exempt from Capital Gains Tax (CGT)</strong>. This creates a powerful tax strategy for investments held outside ISAs/Pensions in General Investment Accounts (GIAs).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 space-y-2">
            <h4 className="font-bold text-blue-900 dark:text-blue-300">The Low-Coupon Discount Mechanism</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Buying low-coupon gilts (e.g. 0.125% TN24 or 1.25% TG27) trading at a discount (e.g. £88 per £100 par value) means virtually all of the Yield to Maturity (YTM) comes from <strong>CGT-free capital growth upon redemption at £100 par</strong>, with minimal taxable annual coupon interest.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 space-y-2">
            <h4 className="font-bold text-blue-900 dark:text-blue-300">Building a Gilt Ladder Bridge</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Purchasing a staggered ladder of gilts maturing in 1, 2, 3, 4, and 5 years provides predictable, government-backed, CGT-free annual capital redemptions to fund living expenses before private pension access age (57).
            </p>
          </div>
        </div>
      </div>

      {/* VCT & EIS Advanced Venture Tax Reliefs (Bottom of Page) */}
      <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
          <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Advanced Venture Tax Reliefs: VCT, EIS & SEIS (High Net Worth Tax Efficiency)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          For high earners who have maxed out their pension (£60k) and ISA (£20k) allowances, government-backed venture schemes offer significant Income Tax and Inheritance Tax mitigations in exchange for investing in early-stage UK growth companies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-900 dark:text-amber-300">VCT (Venture Capital Trusts)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">30% Relief</span>
            </div>
            <ul className="text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong>30% upfront Income Tax relief</strong> up to £200,000/yr (5-year holding period)</li>
              <li><strong>100% Tax-Free Dividends</strong> (no income tax drag)</li>
              <li><strong>100% CGT-Free growth</strong> on disposal</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-900 dark:text-amber-300">EIS (Enterprise Investment)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">30% Relief</span>
            </div>
            <ul className="text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong>30% upfront Income Tax relief</strong> up to £1,000,000/yr (3-year holding period)</li>
              <li><strong>CGT Deferral Relief</strong> (defer existing capital gains)</li>
              <li><strong>100% IHT Exemption</strong> via Business Relief after 2 years</li>
              <li><strong>Loss Relief</strong> offset against income tax rate</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-900 dark:text-amber-300">SEIS (Seed EIS)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">50% Relief</span>
            </div>
            <ul className="text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong>50% upfront Income Tax relief</strong> up to £200,000/yr</li>
              <li><strong>50% CGT Reinvestment Exemption</strong> on capital gains</li>
              <li>Targeted at seed-stage startup investments</li>
            </ul>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Wrapper Efficiency in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Navigate to the <strong>ISA vs Pension Efficiency</strong> card (under Baseline Inputs) or the <strong>Drawdown Strategy Planner</strong> (under Strategy) to see how different drawdown sequences (ISA First vs Pension First) impact your lifetime tax drag and net wealth.
          </p>
        </div>
      </div>

    </div>
  );
};
