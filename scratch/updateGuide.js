const fs = require('fs');

const path = 'src/components/MortgageGuideCard.tsx';
let c = fs.readFileSync(path, 'utf8');

const target = `      {/* Strategy Section 1: Overpaying vs Investing */}
      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-3">
        <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>The Math: Overpaying Mortgage vs. Pension Salary Sacrifice</span>
        </h3>
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            When deciding whether to overpay your mortgage or contribute more into your pension:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Mortgage Overpayments:</strong> Provide a <em>guaranteed tax-free return</em> equal to your mortgage interest rate (e.g. 5.0% APR). Paying off debt early also eliminates monthly required outflows in retirement.
            </li>
            <li>
              <strong>Pension Salary Sacrifice:</strong> Provides immediate relief from Income Tax (20%, 40%, or 45%) and National Insurance (2%), plus employer match contributions. Higher-rate tax payers often gain an effective 40%+ immediate return on pension contributions.
            </li>
          </ul>
        </div>
      </div>`;

const patch = `      {/* Strategy Section 1: Overpaying vs Investing */}
      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-3">
        <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>The Math: Overpaying Mortgage vs. Pension / ISA Investing</span>
        </h3>
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            When deciding whether to overpay your mortgage or invest your monthly surplus, use the interactive <strong>Overpay vs Invest Arbitrage Strategy</strong> insight on your Dashboard:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Yield Spread Arbitrage:</strong> The engine automatically compares the guaranteed, tax-free interest you save by overpaying your mortgage against the expected net return of investing that same surplus over your remaining mortgage term.
            </li>
            <li>
              <strong>Early Repayment Charges (ERC):</strong> Be aware that overpaying more than your penalty-free threshold (usually 10% of the balance) incurs ERC penalties (typically 1-5%). The Arbitrage engine automatically accounts for ERCs if your planned overpayments exceed this threshold.
            </li>
            <li>
              <strong>Risk vs Guaranteed Return:</strong> While the mathematical arbitrage spread may favor investing in the market (e.g. expected 7% return vs 5% mortgage cost), remember that mortgage overpayments are 100% guaranteed, while investment capital is subject to market volatility.
            </li>
          </ul>
        </div>
      </div>`;

if (c.includes(target)) {
  c = c.replace(target, patch);
  fs.writeFileSync(path, c);
  console.log('Replaced successfully');
} else {
  console.log('Target string not found');
}
