import React from 'react';
import { 
  Coins, 
  HelpCircle, 
  Layers, 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  PieChart, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Wallet
} from 'lucide-react';

export const UfplsSmallPotsGuideCard: React.FC = () => {
  return (
    <div id="card-doc-ufplssmallpotsguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200/60 dark:border-purple-800/60">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>UFPLS vs. PCLS & Small Pension Pots Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                Pension Withdrawal Mechanics
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparing Flexi-Access Drawdown (PCLS) with Uncrystallised Funds Pension Lump Sums (UFPLS) and utilizing Small Pots rules without triggering the MPAA.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison: FAD vs UFPLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Flexi-Access Drawdown (FAD) + PCLS */}
        <div className="p-6 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Flexi-Access Drawdown (FAD) + PCLS
            </span>
            <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
              Two-Step Process
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            You crystallise a designated amount of your pension. You receive <strong>25% Tax-Free Cash</strong> (Pension Commencement Lump Sum - PCLS) upfront in your bank, and the remaining <strong>75% moves into a Crystallised Drawdown Pot</strong>.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span><strong>Tax Control:</strong> You can take the 25% tax-free lump sum now and leave the 75% taxable drawdown pot untouched to grow tax-free.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span><strong>MPAA Trigger:</strong> Taking PCLS alone does NOT trigger the Money Purchase Annual Allowance (MPAA). The MPAA is only triggered when you withdraw taxable income from the drawdown pot.</span>
            </div>
          </div>
        </div>

        {/* UFPLS */}
        <div className="p-6 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-900 dark:text-purple-300 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              UFPLS (Uncrystallised Lump Sum)
            </span>
            <span className="text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
              All-In-One Withdrawal
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Each individual withdrawal is paid straight to your bank account. Exactly <strong>25% of the withdrawal is tax-free</strong>, and <strong>75% is taxed as income</strong> at your marginal rate in that tax year.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <span><strong>Simplicity:</strong> No need to manage a separate drawdown sub-account; money leaves uncrystallised pot directly.</span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span><strong>Instant MPAA Trigger:</strong> The very first UFPLS payment immediately triggers the £10,000 MPAA restrictor!</span>
            </div>
          </div>
        </div>

      </div>

      {/* Small Pension Pots Commutation Rules (£10,000 Rule) */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-purple-500" />
          <span>HMRC Small Pension Pots Commutation Rules (£10,000 Limit)</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Under UK tax legislation, if you hold small, orphan pension pots worth <strong>£10,000 or less</strong>, you can cash them out entirely under the <strong>Small Pots Commutation Rules</strong> (25% tax-free, 75% taxable).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Up to 3 Personal Pots</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">You can encash up to <strong>3 separate non-workplace / personal pension pots</strong> under £10k each in your lifetime.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Unlimited Workplace Pots</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Occupational / workplace pension pots under £10,000 can be encashed with <strong>no limit on the number of pots</strong>, provided employer approval is met.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                MPAA Protection Shield
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Crucially, Small Pots encashments do <strong>NOT trigger the £10,000 MPAA</strong>, allowing ongoing £60k annual employer contributions!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Emergency Warning: MPAA & Emergency Tax Code */}
      <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900 dark:text-amber-300">Beware of the First Withdrawal Emergency Tax Code (Month 1 M1 Code)</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Your pension provider is required by HMRC to apply an <strong>Emergency Tax Code on a Month 1 basis</strong> to your first UFPLS or taxable drawdown payment. This often over-taxes initial lump sums by thousands of pounds. You must reclaim overpaid tax via HMRC Form <strong>P55, P53, or P50</strong> within 30 days.
          </p>
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-purple-900 dark:text-purple-300">Modelling Withdrawal Sequences in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the <strong>Advanced Settings & Withdrawal Ordering</strong> card, you can choose whether the engine utilizes <strong>Pro-Rata Tax-Free Cash</strong> (similar to UFPLS) or <strong>PCLS Front-Loading</strong> (crystallising tax-free cash first) to optimize annual income tax brackets.
          </p>
        </div>
      </div>

    </div>
  );
};
