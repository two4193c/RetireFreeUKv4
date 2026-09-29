const fs = require('fs');

let c = fs.readFileSync('src/components/MortgageDebtCard.tsx', 'utf8');

const oldERC = `<div className="text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/50 space-y-1">
                  <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <span>Annual Penalty-Free Allowance (10%)</span>
                    <span>{formatCurrency(mortgage.currentBalance * 0.1)}/yr</span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    Most fixed rate UK mortgages allow up to 10% of balance per year penalty-free overpayment ({formatCurrency((mortgage.regularMonthlyOverpayment * 12))}/yr planned).
                  </p>
                </div>`;

const newERC = `<div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Early Repayment Charge (ERC)
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mortgage.ercEnabled || false}
                        onChange={(e) => updateMortgage({ ercEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  {mortgage.ercEnabled && (
                    <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/50">
                      <div>
                        <label className="block text-[10px] text-amber-900 dark:text-amber-200 font-semibold mb-1">
                          ERC Penalty (%)
                        </label>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={mortgage.ercPercent ?? 2.0}
                          onChange={(e) => updateMortgage({ ercPercent: Number(e.target.value) })}
                          className="w-full p-1.5 rounded-lg border border-amber-300/50 dark:border-amber-700/50 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-900 dark:text-amber-200 font-semibold mb-1">
                          Threshold (Penalty-Free %)
                        </label>
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={mortgage.ercThresholdPercent ?? 10}
                          onChange={(e) => updateMortgage({ ercThresholdPercent: Number(e.target.value) })}
                          className="w-full p-1.5 rounded-lg border border-amber-300/50 dark:border-amber-700/50 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                      <div className="col-span-2 text-[10px] text-amber-700 dark:text-amber-300 flex justify-between font-medium">
                        <span>Penalty-Free Allow: {formatCurrency(mortgage.currentBalance * ((mortgage.ercThresholdPercent ?? 10) / 100))}/yr</span>
                        <span>Planned Overpay: {formatCurrency(mortgage.regularMonthlyOverpayment * 12)}/yr</span>
                      </div>
                    </div>
                  )}
                </div>`;

if(c.includes(oldERC)) {
  c = c.replace(oldERC, newERC);
  fs.writeFileSync('src/components/MortgageDebtCard.tsx', c);
  console.log('Successfully replaced ERC UI section in MortgageDebtCard.tsx');
} else {
  console.log('Could not find old ERC string.');
}
