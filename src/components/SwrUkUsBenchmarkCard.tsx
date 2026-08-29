import React, { useState } from 'react';
import { Globe, CheckCircle2, ArrowRight, ShieldCheck, Scale, DollarSign, Percent, AlertTriangle } from 'lucide-react';

export const SwrUkUsBenchmarkCard: React.FC = () => {
  const [selectedRegime, setSelectedRegime] = useState<'us' | 'uk' | 'global'>('uk');

  return (
    <div id="card-swr-uk-us-benchmark" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-800/60">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Bengen (US) vs. UK Domestic Market Benchmark</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                Regional Comparison
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparing Trinity Study (US) SWR rules against UK domestic market returns and fees
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Regime Selector */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedRegime('uk')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedRegime === 'uk'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🇬🇧 UK Domestic Portfolio (FTSE / UK Gilts)
        </button>

        <button
          type="button"
          onClick={() => setSelectedRegime('us')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedRegime === 'us'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🇺🇸 US Bengen / Trinity (S&P 500 / US Treasuries)
        </button>

        <button
          type="button"
          onClick={() => setSelectedRegime('global')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedRegime === 'global'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🌐 Global Diversified (MSCI World / Global Bonds)
        </button>
      </div>

      {/* Regime Cards Grid */}
      {selectedRegime === 'uk' && (
        <div className="p-6 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-blue-900 dark:text-blue-300">🇬🇧 UK Domestic Return Regime Benchmark</h4>
            <span className="text-sm font-black px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded-lg">Recommended SWR: 3.2% – 3.5%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">UK Fee Drag Impact</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                UK platform (0.25%) + fund fees (0.25%) drag nominal returns down by 0.50%–0.75%/year.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">UK Inflation Volatility</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Higher historical inflation spikes require larger cash buffers to prevent selling equities low.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">UK Tax Leakage</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                PCLS (25% tax-free) cushions tax, but 75% pension income is taxed at marginal income rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedRegime === 'us' && (
        <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-300">🇺🇸 US Bengen / Trinity Study Benchmark</h4>
            <span className="text-sm font-black px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 rounded-lg">Historical SWR: 4.0%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">0% Fee Assumption</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Bengen assumed zero investment fees and zero advisory fees in the original 1994 paper.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">US Market Outperformance</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                20th century US equities delivered superior real returns (~6.8% CAGR) compared to rest-of-world.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">No FX Currency Drag</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                US retirees spend USD from USD assets, with zero foreign exchange volatility.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedRegime === 'global' && (
        <div className="p-6 rounded-2xl bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200/80 dark:border-primary-800/80 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-primary-900 dark:text-primary-300">🌐 Global Diversified Portfolio Benchmark</h4>
            <span className="text-sm font-black px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-200 rounded-lg">Recommended SWR: 3.5% – 3.8%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">MSCI World Diversification</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Spreads single-country economic risks across 1,500+ global companies.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">Currency Hedging Control</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Holding GBP-hedged global bond allocations removes currency risk from baseline income.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white">Optimal Sweet Spot</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Delivers consistent portfolio survival across 30-year retirement windows.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
