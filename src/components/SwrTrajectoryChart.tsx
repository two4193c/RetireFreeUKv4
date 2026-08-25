import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { LineChart, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { YearProjection, UserProfile } from '../types';

interface SwrTrajectoryChartProps {
  projections: YearProjection[];
  profile: UserProfile;
}

export const SwrTrajectoryChart: React.FC<SwrTrajectoryChartProps> = ({ projections, profile }) => {
  // Transform projections into year-by-year effective SWR trajectory data
  const chartData = projections
    .filter((p) => p.isRetired)
    .map((p) => {
      // Use totalPot (the correct field from YearProjection)
      const totalPortfolio = p.totalPot || 0;

      // Use totalWithdrawalAmount (the authoritative engine-computed drawdown figure),
      // falling back to the sum of individual drawdown components
      const totalDrawdown = p.totalWithdrawalAmount > 0
        ? p.totalWithdrawalAmount
        : (p.pensionDrawdown || 0) + (p.isaDrawdown || 0) + (p.cashDrawdown || 0);

      const startingPortfolio = totalPortfolio + totalDrawdown;
      const effectiveSwr = startingPortfolio > 0 ? Math.min(30, Math.max(0, (totalDrawdown / startingPortfolio) * 100)) : 0;

      return {
        age: p.age,
        year: p.year,
        effectiveSwr: Number(effectiveSwr.toFixed(2)),
        totalPortfolio: Math.round(totalPortfolio),
        totalDrawdown: Math.round(totalDrawdown),
      };
    });

  // Calculate peak SWR age
  const peakSwrItem = chartData.reduce(
    (max, item) => (item.effectiveSwr > max.effectiveSwr ? item : max),
    { age: 0, effectiveSwr: 0 }
  );

  // Compute a sensible Y-axis max (at least 10%, or 2× peak SWR rounded up)
  const yAxisMax = Math.min(30, Math.max(10, Math.ceil((peakSwrItem.effectiveSwr * 1.3) / 2) * 2));

  return (
    <div id="card-swr-trajectory-chart" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Effective Withdrawal Rate Trajectory Chart</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Year-by-Year % Overlay
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracking how your effective portfolio withdrawal rate evolves throughout retirement
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              unit="%"
              domain={[0, yAxisMax]}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                      <p className="font-bold border-b border-slate-700 pb-1">Age {data.age} ({data.year})</p>
                      <p className="text-emerald-400 font-extrabold">Effective SWR: {data.effectiveSwr}%</p>
                      <p className="text-slate-300">Portfolio Capital: £{data.totalPortfolio.toLocaleString()}</p>
                      <p className="text-slate-300">Annual Drawdown: £{data.totalDrawdown.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            
            {/* UK FIRE Reference Line (2.8%) */}
            <ReferenceLine y={2.8} label={{ value: '2.8% UK FIRE', fill: '#6366f1', fontSize: 10, position: 'right' }} stroke="#6366f1" strokeDasharray="4 4" />

            {/* UK Standard SWR Reference Line (3.5%) */}
            <ReferenceLine y={3.5} label={{ value: '3.5% UK Standard', fill: '#10b981', fontSize: 10, position: 'right' }} stroke="#10b981" strokeDasharray="5 5" />
            
            {/* 5% Danger Reference Line */}
            <ReferenceLine y={5.0} label={{ value: '5% Danger Zone', fill: '#f43f5e', fontSize: 10, position: 'right' }} stroke="#f43f5e" strokeDasharray="5 5" />

            <Line
              type="monotone"
              dataKey="effectiveSwr"
              name="Effective Withdrawal Rate (%)"
              stroke="#6366f1"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Peak Trajectory Warning */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Peak Effective Withdrawal Rate:</span>
        </div>
        <span className={`font-black px-3 py-1 rounded-lg ${peakSwrItem.effectiveSwr > 6 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
          {peakSwrItem.effectiveSwr}% at Age {peakSwrItem.age}
        </span>
      </div>

    </div>
  );
};
