import React, { useMemo } from 'react';
import { UserProfile } from '../types';
import { TrendingUp, CheckCircle2, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props {
  profile: UserProfile;
}

export const MortgageArbitrageInsight: React.FC<Props> = ({ profile }) => {
  const mortgage = profile.mortgage;
  if (!mortgage || !mortgage.enabled || mortgage.currentBalance <= 0) return null;

  const interestRate = mortgage.interestRatePercent || 0;
  
  const expectedInvestmentReturn = profile.potReturnOverrides?.enabled 
    ? (profile.potReturnOverrides.stocksAndSharesIsaReturn || 5.0)
    : (profile.postRetirementReturn || 5.0);

  const annualOverpayment = (mortgage.regularMonthlyOverpayment || 0) * 12;
  const penaltyFreeAllowance = mortgage.ercEnabled ? mortgage.currentBalance * ((mortgage.ercThresholdPercent || 10) / 100) : Infinity;
  
  const incursERC = mortgage.ercEnabled && annualOverpayment > penaltyFreeAllowance;
  const effectiveMortgageCost = incursERC 
    ? interestRate + (mortgage.ercPercent || 0) 
    : interestRate;

  const isBetterToInvest = expectedInvestmentReturn > effectiveMortgageCost;
  const netSpread = expectedInvestmentReturn - effectiveMortgageCost;

  // Base timeframe on mortgage term (max 25 years to keep chart readable)
  const mortgageYears = mortgage.remainingTermYears || 10;
  const years = Math.max(1, mortgageYears);

  const rMort = (effectiveMortgageCost / 100) / 12;
  const rConfig = (expectedInvestmentReturn / 100) / 12;
  const rLow = (Math.max(1, expectedInvestmentReturn - 3) / 100) / 12;
  const rHigh = ((expectedInvestmentReturn + 3) / 100) / 12;

  const lumpSums = mortgage.lumpSumOverpayments || [];
  const hasLumpSumsWithinTerm = lumpSums.some(ls => ls.enabled && ls.age >= profile.currentAge && ls.age <= profile.currentAge + years);
  const isHypothetical = (mortgage.regularMonthlyOverpayment || 0) === 0 && !hasLumpSumsWithinTerm;
  const monthlySurplus = isHypothetical ? 500 : (mortgage.regularMonthlyOverpayment || 0);

  const chartData = [];
  let overpayBal = 0, configBal = 0, lowBal = 0, highBal = 0;

  // Starting year 0
  chartData.push({
    year: `Yr 0`,
    'Overpay (Guaranteed)': 0,
    [`Invest (${expectedInvestmentReturn}%)`]: 0,
    [`Invest (${Math.max(1, expectedInvestmentReturn - 3)}%)`]: 0,
    [`Invest (${expectedInvestmentReturn + 3}%)`]: 0,
  });

  for(let y = 1; y <= years; y++) {
    const currentAge = profile.currentAge + y - 1; // Age at the start of this year

    // 1. Compound existing balances for 12 months
    overpayBal = overpayBal * Math.pow(1 + rMort, 12);
    configBal = configBal * Math.pow(1 + rConfig, 12);
    lowBal = lowBal * Math.pow(1 + rLow, 12);
    highBal = highBal * Math.pow(1 + rHigh, 12);

    // 2. Add the future value of the 12 monthly payments made during this year
    if (monthlySurplus > 0) {
      overpayBal += rMort === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rMort, 12) - 1) / rMort);
      configBal += rConfig === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rConfig, 12) - 1) / rConfig);
      lowBal += rLow === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rLow, 12) - 1) / rLow);
      highBal += rHigh === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rHigh, 12) - 1) / rHigh);
    }

    // 3. Add any lump sums scheduled for this age (added at end of year for simplicity)
    const yearLumpSums = lumpSums.filter(ls => ls.enabled && ls.age === currentAge).reduce((sum, ls) => sum + ls.amount, 0);
    if (yearLumpSums > 0 && !isHypothetical) {
      overpayBal += yearLumpSums;
      configBal += yearLumpSums;
      lowBal += yearLumpSums;
      highBal += yearLumpSums;
    }

    chartData.push({
      year: `Yr ${y}`,
      'Overpay (Guaranteed)': Math.round(overpayBal),
      [`Invest (${expectedInvestmentReturn}%)`]: Math.round(configBal),
      [`Invest (${Math.max(1, expectedInvestmentReturn - 3)}%)`]: Math.round(lowBal),
      [`Invest (${expectedInvestmentReturn + 3}%)`]: Math.round(highBal),
    });
  }

  const finalOverpay = chartData[chartData.length - 1]['Overpay (Guaranteed)'];
  const finalInvest = chartData[chartData.length - 1][`Invest (${expectedInvestmentReturn}%)`];
  const difference = Math.abs(finalInvest - finalOverpay);

  const formatCurrency = (val: number) => '£' + val.toLocaleString();

  // Custom tooltip for light/dark mode support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-3 text-xs min-w-[200px]">
          <p className="font-bold text-slate-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
                <span className="font-bold text-slate-900 dark:text-white">£{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Heatmap Data (Mortgage vs Invest)
  const mortRates = [2, 3, 4, 5, 6, 7];
  const invRates = [3, 4, 5, 6, 7, 8, 9];

  // Pre-calculate the final values for all rates to render in the heatmap
  const getFV = (rate: number) => {
    let bal = 0;
    const r = (rate / 100) / 12;
    for(let y = 1; y <= years; y++) {
      const currentAgeLoop = profile.currentAge + y - 1;
      bal = bal * Math.pow(1 + r, 12);
      if (monthlySurplus > 0) {
        bal += r === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + r, 12) - 1) / r);
      }
      const yearLumpSums = lumpSums.filter(ls => ls.enabled && ls.age === currentAgeLoop).reduce((sum, ls) => sum + ls.amount, 0);
      if (yearLumpSums > 0 && !isHypothetical) {
        bal += yearLumpSums;
      }
    }
    return bal;
  };

  const overpayVals = new Map();
  mortRates.forEach(mr => overpayVals.set(mr, getFV(mr)));
  
  const investVals = new Map();
  invRates.forEach(ir => investVals.set(ir, getFV(ir)));

  const formatK = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1000) return `£${(absVal / 1000).toFixed(1)}k`;
    return `£${Math.round(absVal)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Overpay vs Invest Arbitrage Strategy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Is it mathematically better to overpay your mortgage or invest the surplus?
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COL: Insight & Chart */}
        <div className="space-y-4">
          <div className={isBetterToInvest ? 'p-4 rounded-xl border bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60' : 'p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'}>
            <div className="flex items-start gap-3">
              {isBetterToInvest ? <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              <div>
                <h3 className={isBetterToInvest ? 'font-bold text-sm text-indigo-900 dark:text-indigo-200' : 'font-bold text-sm text-amber-900 dark:text-amber-200'}>
                  {isBetterToInvest ? 'Investing Captures the Yield Spread' : 'Overpaying Guarantees the Best Return'}
                </h3>
                <p className={isBetterToInvest ? 'text-xs mt-1.5 text-indigo-700 dark:text-indigo-300' : 'text-xs mt-1.5 text-amber-700 dark:text-amber-300'}>
                  Your effective mortgage cost is <strong>{effectiveMortgageCost.toFixed(2)}%</strong> 
                  {incursERC ? ` (includes ${mortgage.ercPercent}% ERC penalty for exceeding overpayment threshold)` : ''}. 
                  Meanwhile, your expected tax-free investment return is <strong>{expectedInvestmentReturn.toFixed(2)}%</strong>. 
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Verdict:</span>
                  <span className="text-xs font-bold px-2.5 py-1.5 rounded-md bg-white/60 dark:bg-black/20">
                    {isBetterToInvest 
                      ? `Invest surplus to generate an extra £${Math.round(difference).toLocaleString()} over ${years} years.`
                      : `Overpay debt to save an extra £${Math.round(difference).toLocaleString()} over ${years} years.`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">
              {years}-Year Trajectory of {isHypothetical ? 'a Hypothetical £500/mo' : (monthlySurplus > 0 ? `Your £${monthlySurplus}/mo` : 'Your Lump Sum')} Surplus
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="year" fontSize={10} tickLine={false} stroke="#888888" />
                  <YAxis fontSize={10} tickLine={false} stroke="#888888" tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} width={45} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Overpay (Guaranteed)" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey={`Invest (${expectedInvestmentReturn}%)`} stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey={`Invest (${Math.max(1, expectedInvestmentReturn - 3)}%)`} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey={`Invest (${expectedInvestmentReturn + 3}%)`} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Heatmap */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Net Yield Arbitrage Heatmap (Value Gain/Loss over {years} Years)
          </h4>
          <p className="text-[10px] text-slate-500 mb-4">
            Green cells mean investing wins. Red cells mean overpaying debt wins. Values show total absolute gain (+£X) vs loss (-£X) by investing.
          </p>
          
          <div className="overflow-x-auto grow flex items-center justify-center">
            <table className="w-full text-[10px] text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">Mort \ Inv</th>
                  {invRates.map(ir => (
                    <th key={ir} className="p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {ir}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mortRates.map(mr => (
                  <tr key={mr}>
                    <td className="p-1.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {mr}%
                    </td>
                    {invRates.map(ir => {
                      const spread = ir - mr;
                      const valInvest = investVals.get(ir) || 0;
                      const valOverpay = overpayVals.get(mr) || 0;
                      const gain = valInvest - valOverpay;
                      
                      let bgClass = "bg-slate-50 dark:bg-slate-900";
                      if (spread >= 3) bgClass = "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100";
                      else if (spread >= 1) bgClass = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200";
                      else if (spread > 0) bgClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300";
                      else if (spread <= -3) bgClass = "bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100";
                      else if (spread <= -1) bgClass = "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200";
                      else if (spread < 0) bgClass = "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300";

                      // Highlight the cell that matches the user's actual configuration
                      const isCurrentMatch = Math.round(effectiveMortgageCost) === mr && Math.round(expectedInvestmentReturn) === ir;
                      if (isCurrentMatch) {
                        bgClass += " ring-2 ring-indigo-500 font-black scale-105 shadow-sm relative z-10";
                      }

                      return (
                        <td key={ir} className={`p-1.5 border border-slate-200 dark:border-slate-700 transition-all ${bgClass}`}>
                          <div className="flex flex-col gap-0.5">
                            <span className="opacity-60 text-[8px] leading-none">{spread > 0 ? '+' : ''}{spread}%</span>
                            <span className="font-bold leading-none tracking-tight">{gain > 0 ? '+' : (gain < 0 ? '-' : '')}{formatK(gain)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[9px] text-slate-500 font-medium">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-200 rounded-sm"></div> Invest Surplus</div>
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
              { label: `Invest (Low Scenario)`, rate: Math.max(1, expectedInvestmentReturn - 3), val: chartData[chartData.length - 1][`Invest (${Math.max(1, expectedInvestmentReturn - 3)}%)`] },
              { label: `Invest (Your Configured)`, rate: expectedInvestmentReturn, val: chartData[chartData.length - 1][`Invest (${expectedInvestmentReturn}%)`], highlight: true },
              { label: `Invest (High Scenario)`, rate: expectedInvestmentReturn + 3, val: chartData[chartData.length - 1][`Invest (${expectedInvestmentReturn + 3}%)`] },
            ].map((row, i) => {
              const gain = row.val - finalOverpay;
              const isPositive = gain > 0;
              return (
                <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${row.highlight ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                  <td className={`p-3 font-bold ${row.highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {row.label}
                  </td>
                  <td className="p-3 text-slate-500">{row.rate.toFixed(2)}%</td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white">{formatCurrency(row.val)}</td>
                  <td className={`p-3 text-right font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
};
