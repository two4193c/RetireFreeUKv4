import React from 'react';
import { UserProfile, PropertyDownsizePlan } from '../types';
import { calculateUKStampDuty } from '../utils/ukTaxEngine';
import {
  Home,
  Percent,
  Calendar,
  DollarSign,
  MapPin,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface RightSizingCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

const DEFAULT_DOWNSIZE_PLAN: PropertyDownsizePlan = {
  enabled: false,
  currentPropertyValue: 650000,
  expectedAnnualGrowthRate: 2.5,
  downsizeAge: 75,
  targetNewPropertyCostToday: 350000,
  sellingCostsPercent: 1.5,
  stampDutySecondHomeSurcharge: false,
  destinationPot: 'isa',
};

export const RightSizingCard: React.FC<RightSizingCardProps> = ({ profile, onChange }) => {
  const plan = profile.propertyDownsizePlan || DEFAULT_DOWNSIZE_PLAN;

  const updatePlan = (updates: Partial<PropertyDownsizePlan>) => {
    onChange({
      ...profile,
      propertyDownsizePlan: { ...plan, ...updates },
    });
  };

  const handleToggle = () => updatePlan({ enabled: !plan.enabled });

  // Calculate live estimations
  const yearsToDownsize = Math.max(0, plan.downsizeAge - profile.currentAge);
  
  // Future property value (nominal)
  const estimatedFutureValue = plan.currentPropertyValue * Math.pow(1 + (plan.expectedAnnualGrowthRate / 100), yearsToDownsize);
  
  // Target cost inflated
  const assumedInflation = profile.expectedInflationRate ?? 2.5;
  const estimatedNewPropertyCost = plan.targetNewPropertyCostToday * Math.pow(1 + (assumedInflation / 100), yearsToDownsize);
  
  // SDLT
  const estimatedSdlt = calculateUKStampDuty(estimatedNewPropertyCost, plan.stampDutySecondHomeSurcharge);
  
  // Selling fees
  const estimatedSellingFees = estimatedFutureValue * (plan.sellingCostsPercent / 100);

  // Mortgage to clear
  let outstandingMortgage = 0;
  if (profile.mortgage?.enabled) {
    const totalTermMonths = (profile.mortgage.remainingTermYears * 12) + (profile.mortgage.remainingTermMonths || 0);
    const monthsPassed = yearsToDownsize * 12;
    if (monthsPassed < totalTermMonths && !(profile.mortgage.payoffAtRetirement && plan.downsizeAge >= profile.targetRetirementAge)) {
      const ratioRemaining = 1 - (monthsPassed / totalTermMonths);
      outstandingMortgage = profile.mortgage.currentBalance * Math.max(0, ratioRemaining);
    }
  }

  const estimatedNetEquity = estimatedFutureValue - estimatedNewPropertyCost - estimatedSdlt - estimatedSellingFees - outstandingMortgage;

  const formatCurrency = (val: number) => `£${Math.round(val).toLocaleString()}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Home className="w-6 h-6" />
            </div>
            Right-Sizing Your Home
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm sm:text-base max-w-2xl">
            Model selling your primary residence to release equity. We calculate future property growth, moving costs, and UK Stamp Duty.
          </p>
        </div>

        <button
          onClick={handleToggle}
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            plan.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
          }`}
          role="switch"
          aria-checked={plan.enabled}
        >
          <span className="sr-only">Enable Downsizing Plan</span>
          <span
            className={`pointer-events-none absolute left-0.5 inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out ${
              plan.enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {plan.enabled && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Property Details */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                <Home className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Current Residence</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Current Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">£</span>
                  <input
                    type="number"
                    value={plan.currentPropertyValue || ''}
                    onChange={(e) => updatePlan({ currentPropertyValue: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Expected Annual Growth
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={plan.expectedAnnualGrowthRate || ''}
                    onChange={(e) => updatePlan({ expectedAnnualGrowthRate: Number(e.target.value) })}
                    className="w-full pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-400" /> Selling & Legal Fees
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={plan.sellingCostsPercent || ''}
                    onChange={(e) => updatePlan({ sellingCostsPercent: Number(e.target.value) })}
                    className="w-full pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Estate agent and solicitor fees as % of sale price.</p>
              </div>
            </div>

            {/* Downsize Plan Details */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">The Move</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Planned Downsize Age
                </label>
                <input
                  type="number"
                  value={plan.downsizeAge || ''}
                  onChange={(e) => updatePlan({ downsizeAge: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Target Cost of New Home (Today's Money)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">£</span>
                  <input
                    type="number"
                    value={plan.targetNewPropertyCostToday || ''}
                    onChange={(e) => updatePlan({ targetNewPropertyCostToday: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">This will be inflated automatically to the downsize year.</p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={plan.stampDutySecondHomeSurcharge}
                    onChange={(e) => updatePlan({ stampDutySecondHomeSurcharge: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Apply 3% SDLT Surcharge</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Toggle if keeping original home</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Inject Net Equity Into
                </label>
                <select
                  value={plan.destinationPot}
                  onChange={(e) => updatePlan({ destinationPot: e.target.value as 'isa' | 'gia' | 'cash' | 'cash_isa' })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-slate-900 dark:text-white font-medium appearance-none"
                >
                  <option value="isa">Stocks & Shares ISA</option>
                  <option value="cash_isa">Cash ISA</option>
                  <option value="gia">General Investment Account (GIA)</option>
                  <option value="cash">Cash Savings Account</option>
                </select>
              </div>

            </div>
          </div>

          {/* Live Estimate Panel */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-black text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Live Projection at Age {plan.downsizeAge} ({yearsToDownsize} years from now)
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Old Home Value</div>
                  <div className="font-black text-slate-900 dark:text-white">{formatCurrency(estimatedFutureValue)}</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">New Home Cost</div>
                  <div className="font-black text-slate-900 dark:text-white">{formatCurrency(estimatedNewPropertyCost)}</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Stamp Duty (SDLT)</div>
                  <div className="font-black text-red-600 dark:text-red-400">{formatCurrency(estimatedSdlt)}</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Selling Fees</div>
                  <div className="font-black text-red-600 dark:text-red-400">{formatCurrency(estimatedSellingFees)}</div>
                </div>
              </div>

              <div className="bg-emerald-600 dark:bg-emerald-500 text-white p-4 rounded-xl shadow-md flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-0.5">Net Equity Released</div>
                  <div className="text-2xl font-black">{formatCurrency(estimatedNetEquity)}</div>
                </div>
                <ArrowRight className="w-6 h-6 text-emerald-200" />
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-0.5">Injected Into</div>
                  <div className="text-lg font-black">{plan.destinationPot.toUpperCase()}</div>
                </div>
              </div>
              
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Note: Primary Residence Relief (PRR) ensures this equity is released 100% free of Capital Gains Tax.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
