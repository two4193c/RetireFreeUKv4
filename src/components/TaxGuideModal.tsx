import React from 'react';
import { BookOpen, X, ShieldCheck, CheckCircle2, HelpCircle } from 'lucide-react';

interface TaxGuideModalProps {
  onClose: () => void;
}

export const TaxGuideModal: React.FC<TaxGuideModalProps> = ({ onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative my-8 text-xs leading-relaxed text-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="tax-guide-title" className="font-extrabold text-slate-900 text-base">UK Retirement Tax Rules Cheat Sheet</h2>
              <p className="text-xs text-slate-500">Essential UK tax rules, allowances & savings shelters (2024/25)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close tax guide"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          
          {/* Section 1: The 60% Tax Trap */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 text-amber-950">
            <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
              ⚠️ The £100k - £125,140 "60% Tax Trap"
            </h3>
            <p>
              In the UK, your standard Personal Allowance (£12,570) is reduced by £1 for every £2 your Adjusted Net Income exceeds £100,000. This creates an effective <strong>60% marginal tax rate</strong> on income between £100,000 and £125,140 (40% higher rate tax + 20% lost personal allowance).
            </p>
            <p className="font-semibold text-amber-900">
              💡 Solution: Paying pension contributions reduces your Adjusted Net Income £1-for-£1, giving you 60% effective tax relief and restoring your full Personal Allowance!
            </p>
          </div>

          {/* Section 2: Pension Relief Methods */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Pension Relief Mechanisms</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs text-emerald-700">1. Salary Sacrifice</h4>
                <p className="mt-1">
                  Deducted directly from gross salary before Tax & NI. You save Income Tax (20/40/45%) AND Employee National Insurance (8% or 2%). Employer also saves 13.8% Employer NI.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs text-indigo-700">2. Relief at Source (SIPP)</h4>
                <p className="mt-1">
                  You contribute from net pay. The provider automatically adds 20% basic rate tax relief (£80 net becomes £100 gross). Higher/Additional rate taxpayers claim an extra 20%/25% via Self Assessment.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Pension vs ISA */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Pension vs ISA: Key Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold">
                    <th className="p-2 border border-slate-200">Feature</th>
                    <th className="p-2 border border-slate-200">Pension (SIPP / Workplace)</th>
                    <th className="p-2 border border-slate-200">ISA (S&S / Cash / LISA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 font-semibold">Annual Cap</td>
                    <td className="p-2">£60,000 (or 100% earnings)</td>
                    <td className="p-2">£20,000 across all ISAs</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Upfront Benefit</td>
                    <td className="p-2 text-emerald-700 font-bold">20% to 60% Tax Relief</td>
                    <td className="p-2">Post-tax income (25% bonus on LISA)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Access Age</td>
                    <td className="p-2">Age 55 (rising to 57 in 2028)</td>
                    <td className="p-2 text-emerald-700 font-bold">Anytime (LISA age 60)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Withdrawal Tax</td>
                    <td className="p-2">25% Tax-Free, 75% Taxable</td>
                    <td className="p-2 text-emerald-700 font-bold">100% Tax-Free</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: 25% Tax-Free Lump Sum */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <h3 className="font-bold text-slate-800 text-xs">25% Pension Commencement Lump Sum (PCLS)</h3>
            <p>
              You can take up to 25% of your total pension pot tax-free (capped at the Lump Sum Allowance of £268,275). You can take this as a single lump sum upfront at retirement age, or drip-feed tax-free cash alongside drawdowns (UFPLS).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
