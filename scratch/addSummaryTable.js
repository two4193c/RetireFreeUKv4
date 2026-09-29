const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageArbitrageInsight.tsx', 'utf8');

const endBlock = `             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-200 rounded-sm"></div> Invest Surplus</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-100 rounded-sm"></div> Break Even</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-200 rounded-sm"></div> Overpay Debt</div>
          </div>
        </div>

      </div>
    </div>
  );
};`;

const summaryTableBlock = `             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-200 rounded-sm"></div> Invest Surplus</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-100 rounded-sm"></div> Break Even</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-200 rounded-sm"></div> Overpay Debt</div>
          </div>
        </div>
      </div>

      {/* BOTTOM SUMMARY TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3">Financial Strategy</th>
              <th className="p-3">Assumed Rate</th>
              <th className="p-3 text-right">Final Projected Value</th>
              <th className="p-3 text-right">Net Gain vs Overpaying</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium bg-white dark:bg-slate-900">
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="p-3 font-bold text-amber-600 dark:text-amber-500">Overpay Debt (Guaranteed)</td>
              <td className="p-3 text-slate-500">{effectiveMortgageCost.toFixed(2)}%</td>
              <td className="p-3 text-right font-black text-slate-900 dark:text-white">{formatCurrency(finalOverpay)}</td>
              <td className="p-3 text-right text-slate-400 font-bold">Baseline</td>
            </tr>
            {[
              { label: \`Invest (Low Scenario)\`, rate: Math.max(1, expectedInvestmentReturn - 3), val: chartData[chartData.length - 1][\`Invest (\${Math.max(1, expectedInvestmentReturn - 3)}%)\`] },
              { label: \`Invest (Your Configured)\`, rate: expectedInvestmentReturn, val: chartData[chartData.length - 1][\`Invest (\${expectedInvestmentReturn}%)\`], highlight: true },
              { label: \`Invest (High Scenario)\`, rate: expectedInvestmentReturn + 3, val: chartData[chartData.length - 1][\`Invest (\${expectedInvestmentReturn + 3}%)\`] },
            ].map((row, i) => {
              const gain = row.val - finalOverpay;
              const isPositive = gain > 0;
              return (
                <tr key={i} className={\`hover:bg-slate-50 dark:hover:bg-slate-800/40 \${row.highlight ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}\`}>
                  <td className={\`p-3 font-bold \${row.highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}\`}>
                    {row.label}
                  </td>
                  <td className="p-3 text-slate-500">{row.rate.toFixed(2)}%</td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white">{formatCurrency(row.val)}</td>
                  <td className={\`p-3 text-right font-black \${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}\`}>
                    {isPositive ? '+' : ''}{formatCurrency(gain)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};`;

c = c.replace(endBlock, summaryTableBlock);

fs.writeFileSync('src/components/MortgageArbitrageInsight.tsx', c);
console.log('Added summary table.');
