import React, { useState, useMemo } from 'react';
import { UserProfile, MortgageDebtConfig, LumpSumOverpayment, MortgageRepaymentType } from '../types';
import { DEFAULT_MORTGAGE } from '../utils/defaultData';
import { getPensionAccessAge } from '../utils/ukTaxEngine';
import {
  Home,
  Percent,
  Calendar,
  DollarSign,
  TrendingDown,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  PiggyBank,
  PieChart,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';

interface MortgageDebtCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const MortgageDebtCard: React.FC<MortgageDebtCardProps> = ({ profile, onChange }) => {
  const mortgage: MortgageDebtConfig = profile.mortgage || DEFAULT_MORTGAGE;

  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'inputs' | 'overpayments' | 'table'>('chart');
  const [quickOverpaymentSlider, setQuickOverpaymentSlider] = useState<number>(mortgage.regularMonthlyOverpayment || 0);
  const [showAddLumpSumModal, setShowAddLumpSumModal] = useState<boolean>(false);
  const [newLumpSumName, setNewLumpSumName] = useState<string>('Tax-Free Cash Lump Sum');
  const [newLumpSumAge, setNewLumpSumAge] = useState<number>(profile.targetRetirementAge);
  const [newLumpSumAmount, setNewLumpSumAmount] = useState<number>(50000);

  // Update Mortgage helper
  const updateMortgage = (updates: Partial<MortgageDebtConfig>) => {
    onChange({
      ...profile,
      mortgage: {
        ...mortgage,
        ...updates,
      },
    });
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return `£${Math.round(val).toLocaleString()}`;
  };

  // Calculate standard monthly payment (PMT formula)
  const calculatedStandardMonthlyPayment = useMemo(() => {
    const P = mortgage.currentBalance;
    if (P <= 0) return 0;
    const r = (mortgage.interestRatePercent / 100) / 12;
    const n = Math.max(1, (mortgage.remainingTermYears * 12) + (mortgage.remainingTermMonths || 0));

    if (mortgage.repaymentType === 'interest_only') {
      return P * r;
    }

    if (r === 0) return P / n;
    return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [mortgage]);

  const effectiveMonthlyPayment = mortgage.customMonthlyPayment || calculatedStandardMonthlyPayment;

  // Loan to Value (LTV) Ratio
  const ltvPercent = useMemo(() => {
    const propVal = mortgage.enabled
      ? (mortgage.propertyValue || profile.ihtSettings?.primaryResidenceValue || 0)
      : (profile.ihtSettings?.primaryResidenceValue || mortgage.propertyValue || 0);
    if (propVal <= 0) return 0;
    return Math.min(100, (mortgage.currentBalance / propVal) * 100);
  }, [mortgage.currentBalance, mortgage.propertyValue, mortgage.enabled, profile.ihtSettings]);

  // Comprehensive Month-by-Month Amortization Engine
  const simulationResults = useMemo(() => {
    const currentAge = profile.currentAge;
    const currentYear = new Date().getFullYear();
    const balance = Math.max(0, mortgage.currentBalance);
    const rateMonthly = (mortgage.interestRatePercent / 100) / 12;
    const totalTermMonths = (mortgage.remainingTermYears * 12) + (mortgage.remainingTermMonths || 0);
    const maxMonths = Math.max(12, totalTermMonths + 120);

    // Standard run (no overpayments)
    let stdBal = balance;
    let stdTotalInterest = 0;
    let stdMonths = 0;
    const stdSchedule: { month: number; year: number; age: number; startBal: number; interest: number; capital: number; endBal: number }[] = [];

    for (let m = 1; m <= maxMonths && stdBal > 0.01; m++) {
      stdMonths = m;
      const age = currentAge + Math.floor((m - 1) / 12);
      const year = currentYear + Math.floor((m - 1) / 12);
      const interest = stdBal * rateMonthly;
      stdTotalInterest += interest;

      let payment = effectiveMonthlyPayment;
      if (mortgage.repaymentType === 'interest_only') {
        payment = interest; // balance never decays unless term ends
      }

      let capital = Math.max(0, payment - interest);
      if (capital > stdBal) {
        capital = stdBal;
        payment = interest + capital;
      }

      const endBal = Math.max(0, stdBal - capital);
      stdSchedule.push({ month: m, year, age, startBal: stdBal, interest, capital, endBal });
      stdBal = endBal;

      if (mortgage.repaymentType === 'interest_only' && m >= totalTermMonths) {
        break; // Balloon repayment at term end
      }
    }

    // Overpaid run (includes regular overpayment + lump sums + retirement payoff)
    let ovBal = balance;
    let ovTotalInterest = 0;
    let ovMonths = 0;
    const ovSchedule: { month: number; year: number; age: number; startBal: number; interest: number; regularPayment: number; overpayment: number; totalPayment: number; capital: number; endBal: number }[] = [];

    const lumpSums = mortgage.lumpSumOverpayments || [];

    for (let m = 1; m <= maxMonths && ovBal > 0.01; m++) {
      ovMonths = m;
      const age = currentAge + Math.floor((m - 1) / 12);
      const monthInYear = ((m - 1) % 12) + 1;
      const year = currentYear + Math.floor((m - 1) / 12);

      const interest = ovBal * rateMonthly;
      ovTotalInterest += interest;

      let stdPmt = effectiveMonthlyPayment;
      if (mortgage.repaymentType === 'interest_only') {
        stdPmt = interest;
      }

      // Overpayments
      let extraMonthly = mortgage.regularMonthlyOverpayment || 0;
      
      // Check lump sums at exact age
      let lumpSumExtra = 0;
      if (monthInYear === 1) { // Apply at start of age year
        lumpSums.forEach((ls) => {
          if (ls.enabled && ls.age === age) {
            lumpSumExtra += ls.amount;
          }
        });
      }

      const totalOverpayment = extraMonthly + lumpSumExtra;
      const regularCapital = Math.max(0, stdPmt - interest);
      let capital = Math.min(ovBal, regularCapital + totalOverpayment);
      
      let actualTotalPayment = interest + capital;
      let actualRegularPayment = Math.min(stdPmt, interest + capital);
      let actualOverpayment = Math.max(0, actualTotalPayment - actualRegularPayment);

      const endBal = Math.max(0, ovBal - capital);
      ovSchedule.push({
        month: m,
        year,
        age,
        startBal: ovBal,
        interest,
        regularPayment: actualRegularPayment,
        overpayment: actualOverpayment,
        totalPayment: actualTotalPayment,
        capital,
        endBal,
      });

      ovBal = endBal;
      if (ovBal <= 0.01) break;

      // For Interest-Only, overpayments stop when the balloon payment is due at term end
      if (mortgage.repaymentType === 'interest_only' && m >= totalTermMonths) {
        break;
      }
    }

    // Aggregate Yearly Data for Charts & Tables
    const yearlyMap = new Map<number, {
      age: number;
      year: number;
      stdStartBalance: number;
      stdEndBalance: number;
      stdInterest: number;
      stdCapital: number;
      ovStartBalance: number;
      ovEndBalance: number;
      ovInterest: number;
      ovCapital: number;
      ovOverpayments: number;
      propertyValue: number;
      ltv: number;
    }>();

    // Standard schedule year grouping
    stdSchedule.forEach((s) => {
      const existing = yearlyMap.get(s.age) || {
        age: s.age,
        year: s.year,
        stdStartBalance: s.startBal,
        stdEndBalance: s.endBal,
        stdInterest: 0,
        stdCapital: 0,
        ovStartBalance: 0,
        ovEndBalance: 0,
        ovInterest: 0,
        ovCapital: 0,
        ovOverpayments: 0,
        propertyValue: mortgage.propertyValue * Math.pow(1.03, s.age - currentAge),
        ltv: 0,
      };
      existing.stdEndBalance = s.endBal;
      existing.stdInterest += s.interest;
      existing.stdCapital += s.capital;
      yearlyMap.set(s.age, existing);
    });

    // Overpaid schedule year grouping
    ovSchedule.forEach((s) => {
      const existing = yearlyMap.get(s.age) || {
        age: s.age,
        year: s.year,
        stdStartBalance: 0,
        stdEndBalance: 0,
        stdInterest: 0,
        stdCapital: 0,
        ovStartBalance: s.startBal,
        ovEndBalance: s.endBal,
        ovInterest: 0,
        ovCapital: 0,
        ovOverpayments: 0,
        propertyValue: mortgage.propertyValue * Math.pow(1.03, s.age - currentAge),
        ltv: 0,
      };
      if (s.month % 12 === 1 || existing.ovStartBalance === 0) {
        existing.ovStartBalance = s.startBal;
      }
      existing.ovEndBalance = s.endBal;
      existing.ovInterest += s.interest;
      existing.ovCapital += s.capital;
      existing.ovOverpayments += s.overpayment;
      existing.ltv = existing.propertyValue > 0 ? (s.endBal / existing.propertyValue) * 100 : 0;
      yearlyMap.set(s.age, existing);
    });

    const yearlyData = Array.from(yearlyMap.values()).sort((a, b) => a.age - b.age);

    const isInterestOnly = mortgage.repaymentType === 'interest_only';
    const termEndAge = currentAge + mortgage.remainingTermYears;
    const termEndYear = currentYear + mortgage.remainingTermYears;

    const stdPayoffAge = currentAge + Math.floor(stdMonths / 12);
    const ovPayoffAge = isInterestOnly 
      ? termEndAge 
      : currentAge + Math.floor(ovMonths / 12);

    const monthsSaved = Math.max(0, stdMonths - ovMonths);
    const yearsSaved = Math.round((monthsSaved / 12) * 10) / 10;
    const interestSaved = Math.max(0, stdTotalInterest - ovTotalInterest);

    // Interest-only balloon details at term end
    const lastStd = stdSchedule[stdSchedule.length - 1];
    const lastOv = ovSchedule[ovSchedule.length - 1];
    const stdBalloonPayment = isInterestOnly ? (lastStd ? lastStd.endBal : balance) : 0;
    const ovBalloonPayment = isInterestOnly ? (lastOv ? lastOv.endBal : 0) : 0;
    const balloonReduction = Math.max(0, stdBalloonPayment - ovBalloonPayment);
    const balloonPaidOffEarly = isInterestOnly && ovBalloonPayment <= 0.01;

    const clearedBeforeRetirement = isInterestOnly 
      ? (termEndAge <= profile.targetRetirementAge || balloonPaidOffEarly)
      : (ovPayoffAge <= profile.targetRetirementAge);

    const retirementData = yearlyData.find((d) => d.age === profile.targetRetirementAge);
    const balanceAtRetirement = !clearedBeforeRetirement && retirementData
      ? retirementData.ovStartBalance
      : 0;

    const monthlyPaymentInRetirement = effectiveMonthlyPayment + (mortgage.regularMonthlyOverpayment || 0);
    const annualPaymentInRetirement = monthlyPaymentInRetirement * 12;

    return {
      stdMonths,
      stdPayoffAge,
      stdTotalInterest,
      ovMonths,
      ovPayoffAge,
      ovTotalInterest,
      monthsSaved,
      yearsSaved,
      interestSaved,
      yearlyData,
      clearedBeforeRetirement,
      balanceAtRetirement,
      monthlyPaymentInRetirement,
      annualPaymentInRetirement,
      isInterestOnly,
      termEndAge,
      termEndYear,
      stdBalloonPayment,
      ovBalloonPayment,
      balloonReduction,
      balloonPaidOffEarly,
    };
  }, [mortgage, profile.currentAge, profile.targetRetirementAge, effectiveMonthlyPayment]);

  // Handle adding lump sum overpayment
  const handleAddLumpSum = () => {
    if (newLumpSumAmount <= 0) return;
    const newEntry: LumpSumOverpayment = {
      id: `lump_${Date.now()}`,
      name: newLumpSumName,
      age: newLumpSumAge,
      amount: newLumpSumAmount,
      enabled: true,
    };
    updateMortgage({
      lumpSumOverpayments: [...(mortgage.lumpSumOverpayments || []), newEntry],
    });
    setShowAddLumpSumModal(false);
  };

  const handleToggleLumpSum = (id: string) => {
    updateMortgage({
      lumpSumOverpayments: (mortgage.lumpSumOverpayments || []).map((ls) =>
        ls.id === id ? { ...ls, enabled: !ls.enabled } : ls
      ),
    });
  };

  const handleDeleteLumpSum = (id: string) => {
    updateMortgage({
      lumpSumOverpayments: (mortgage.lumpSumOverpayments || []).filter((ls) => ls.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* STANDALONE PLANNING FUNCTION DISCLAIMER CARD */}
      <div className="bg-gradient-to-r from-blue-500/10 via-slate-500/5 to-amber-500/10 border border-blue-500/20 dark:border-blue-400/20 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-start gap-3.5">
        <div className="p-2.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Standalone Planning Sandbox
            </h3>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Informational Guidance Only
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            The <strong>Mortgage Debt</strong> tab is a dedicated, standalone planning function. Its output is designed to provide guidance and scenario modeling (such as overpayments vs balloon payments) to help shape your overall plan.
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            <em>Note:</em> Calculations in this module operate independently and are not integrated into or automatically deducted from other tabs or core retirement projections.
          </p>
        </div>
      </div>

      {/* CARD 1: MORTGAGE & RATE INPUTS (AT TOP OF PAGE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mortgage & Property Debt Inputs
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Primary Property
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your current property value, outstanding debt, interest rate, and term details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mortgage.enabled}
                onChange={(e) => updateMortgage({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mortgage.enabled ? 'Mortgage Active' : 'No Active Mortgage'}
              </span>
            </label>
          </div>
        </div>

        {!mortgage.enabled ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <Building className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Mortgage Module Currently Disabled
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Enable the mortgage module above if you own property with a mortgage or plan to model mortgage clearance prior to retirement.
            </p>
            <button
              onClick={() => updateMortgage({ enabled: true })}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span>Enable Mortgage Module</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property & Debt Basics */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span>Property & Debt Parameters</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Property Name / Label
                    </label>
                    <input
                      type="text"
                      value={mortgage.propertyName}
                      onChange={(e) => updateMortgage({ propertyName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                      placeholder="e.g. Primary Residence"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Current Property Market Value (£)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">£</span>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={mortgage.propertyValue}
                        onChange={(e) => updateMortgage({ propertyValue: Math.max(0, Number(e.target.value)) })}
                        className="w-full pl-7 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Outstanding Mortgage Balance (£)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">£</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={mortgage.currentBalance}
                        onChange={(e) => updateMortgage({ currentBalance: Math.max(0, Number(e.target.value)) })}
                        className="w-full pl-7 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white text-primary-600 dark:text-primary-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Mortgage Repayment Type
                    </label>
                    <select
                      value={mortgage.repaymentType}
                      onChange={(e) => updateMortgage({ repaymentType: e.target.value as MortgageRepaymentType })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="repayment">Repayment (Capital & Interest)</option>
                      <option value="interest_only">Interest-Only</option>
                    </select>
                  </div>

                  {mortgage.repaymentType === 'interest_only' && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2 text-amber-950 dark:text-amber-200">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Interest-Only Balloon Payment Details</span>
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          Due Age {simulationResults.termEndAge} ({simulationResults.termEndYear})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-amber-500/20 text-[11px]">
                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium">Standard Balloon (No Overpay):</div>
                          <div className="font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(simulationResults.stdBalloonPayment)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium">Overpaid Balloon (With Overpay):</div>
                          <div className="font-black text-primary-600 dark:text-primary-400">{formatCurrency(simulationResults.ovBalloonPayment)}</div>
                        </div>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Standard payments of <strong>{formatCurrency(calculatedStandardMonthlyPayment)}/mo</strong> pay interest only. Monthly overpayments (<strong>+{formatCurrency(mortgage.regularMonthlyOverpayment || 0)}/mo</strong>) pay down principal directly, reducing your final balloon payment by <strong className="text-primary-600 dark:text-primary-400">{formatCurrency(simulationResults.balloonReduction)}</strong>. Overpayments stop at Age {simulationResults.termEndAge} when the balloon payment falls due.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rate & Term Setup */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-500" />
                  <span>Interest Rate & Term Settings</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Interest Rate (% APR)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        step={0.1}
                        value={mortgage.interestRatePercent}
                        onChange={(e) => updateMortgage({ interestRatePercent: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Remaining Years
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={mortgage.remainingTermYears}
                        onChange={(e) => updateMortgage({ remainingTermYears: Math.max(1, Number(e.target.value)) })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Extra Months
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={11}
                        value={mortgage.remainingTermMonths || 0}
                        onChange={(e) => updateMortgage({ remainingTermMonths: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Custom Monthly Payment Override (£/mo)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">£</span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        placeholder={`Auto calculated: £${Math.round(calculatedStandardMonthlyPayment)}`}
                        value={mortgage.customMonthlyPayment || ''}
                        onChange={(e) =>
                          updateMortgage({
                            customMonthlyPayment: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                          })
                        }
                        className="w-full pl-7 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Leave empty to use formula payment (£{Math.round(calculatedStandardMonthlyPayment)}/mo).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Live Parameters Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-medium block">Standard Payment:</span>
                  {mortgage.repaymentType === 'interest_only' && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                      Interest-Only (Balloon: {formatCurrency(simulationResults.ovBalloonPayment)} vs {formatCurrency(simulationResults.stdBalloonPayment)} std)
                    </span>
                  )}
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white text-right">
                  {formatCurrency(calculatedStandardMonthlyPayment)}/mo
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current LTV Ratio:</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                  {ltvPercent.toFixed(1)}% LTV
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Current Home Equity:</span>
                <span className="font-extrabold text-primary-600 dark:text-primary-400">
                  {formatCurrency(Math.max(0, mortgage.propertyValue - mortgage.currentBalance))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CARD 2: OVERPAYMENT STRATEGY (AFTER INPUTS CARD) */}
      {mortgage.enabled && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mortgage Overpayment Strategy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Accelerate mortgage clearance with regular monthly overpayments or scheduled lump sums.
                </p>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-xs text-slate-500 font-medium block">Total Interest Saved</span>
              <span className="text-sm font-black text-primary-600 dark:text-primary-400">
                {formatCurrency(simulationResults.interestSaved)} ({simulationResults.yearsSaved} yrs saved)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Regular Monthly Overpayment */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Regular Monthly Overpayment</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Additional monthly payment paid on top of your standard mortgage repayment.
              </p>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">£</span>
                <input
                  type="number"
                  min={0}
                  step={25}
                  value={mortgage.regularMonthlyOverpayment}
                  onChange={(e) => updateMortgage({ regularMonthlyOverpayment: Math.max(0, Number(e.target.value)) })}
                  className="w-full pl-7 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white text-amber-600 dark:text-amber-400 text-sm"
                />
              </div>

              {/* Slider simulator */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>Quick Slider</span>
                  <span className="text-primary-600 dark:text-primary-400 font-bold">
                    £{mortgage.regularMonthlyOverpayment}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1500}
                  step={25}
                  value={mortgage.regularMonthlyOverpayment}
                  onChange={(e) => updateMortgage({ regularMonthlyOverpayment: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                             <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
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
                </div>
              </div>
            </div>

            {/* Scheduled Lump Sum Overpayments List */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-primary-500" />
                      <span>Scheduled Lump Sum Overpayments</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Add future lump sums from inheritance, bonus, or asset sales.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddLumpSumModal(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Lump Sum</span>
                  </button>
                </div>

                {(!mortgage.lumpSumOverpayments || mortgage.lumpSumOverpayments.length === 0) ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No custom lump sum overpayments added yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {mortgage.lumpSumOverpayments.map((ls) => (
                      <div
                        key={ls.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={ls.enabled}
                            onChange={() => handleToggleLumpSum(ls.id)}
                            className="w-4 h-4 text-amber-500 rounded cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{ls.name}</div>
                            <div className="text-[11px] text-slate-500">
                              Age {ls.age} ({new Date().getFullYear() + (ls.age - profile.currentAge)})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-black text-primary-600 dark:text-primary-400">
                            {formatCurrency(ls.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteLumpSum(ls.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD 3: MORTGAGE PAYOFF PROJECTION & AMORTIZATION (BOTTOM OF PAGE) */}
      {mortgage.enabled && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mortgage Payoff Projection & Debt Amortization
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare debt payoff trajectories and inspect year-by-year capital reduction.
                </p>
              </div>
            </div>
          </div>

          {/* Retirement Timeline Banner Alert */}
          <div
            className={`p-4 md:p-5 rounded-xl border ${
              simulationResults.clearedBeforeRetirement
                ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800/60 text-primary-900 dark:text-primary-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {simulationResults.clearedBeforeRetirement ? (
                <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2.5 w-full">
                <div className="font-bold text-sm">
                  {simulationResults.isInterestOnly ? (
                    simulationResults.termEndAge <= profile.targetRetirementAge ? (
                      `Interest-Only Term Ends at Age ${simulationResults.termEndAge} (${profile.targetRetirementAge - simulationResults.termEndAge} Years BEFORE Retirement)`
                    ) : (
                      `Interest-Only Mortgage Extends ${simulationResults.termEndAge - profile.targetRetirementAge} Years Into Retirement!`
                    )
                  ) : (
                    simulationResults.clearedBeforeRetirement
                      ? `Mortgage Cleared ${profile.targetRetirementAge - simulationResults.ovPayoffAge} Years BEFORE Retirement!`
                      : `Mortgage Extends ${simulationResults.ovPayoffAge - profile.targetRetirementAge} Years Into Retirement!`
                  )}
                </div>

                {simulationResults.isInterestOnly ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200/80 dark:border-amber-800/80 text-xs">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Standard Balloon (No Overpay):</div>
                        <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          {formatCurrency(simulationResults.stdBalloonPayment)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Overpaid Balloon (At Age {simulationResults.termEndAge}):</div>
                        <div className="text-base font-black text-primary-600 dark:text-primary-400 mt-0.5">
                          {formatCurrency(simulationResults.ovBalloonPayment)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Balloon Lump Sum Savings:</div>
                        <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          -{formatCurrency(simulationResults.balloonReduction)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-950 dark:text-amber-100 font-medium leading-relaxed space-y-1.5">
                      <div>
                        <strong>💡 Overpayment Mechanism:</strong> Your overpayments pay down mortgage principal directly, shrinking the final balloon payment from {formatCurrency(simulationResults.stdBalloonPayment)} to <strong>{formatCurrency(simulationResults.ovBalloonPayment)}</strong> at Age {simulationResults.termEndAge} ({simulationResults.termEndYear}). Overpayments stop when the balloon payment falls due at Age {simulationResults.termEndAge}.
                      </div>
                      {simulationResults.termEndAge <= profile.targetRetirementAge ? (
                        <div className="text-[11px] text-primary-700 dark:text-primary-300 font-semibold pt-1 border-t border-amber-500/20">
                          ✓ Once the {formatCurrency(simulationResults.ovBalloonPayment)} balloon payment is settled at Age {simulationResults.termEndAge}, your mortgage is fully cleared before retirement at Age {profile.targetRetirementAge}.
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold pt-1 border-t border-amber-500/20">
                          ⚠️ <strong>Retirement Budget Adjustment Prompt:</strong> Adjust your retirement cash flow target to cover interest of {formatCurrency(simulationResults.monthlyPaymentInRetirement)}/mo until Age {simulationResults.termEndAge}, plus the final balloon payment of {formatCurrency(simulationResults.ovBalloonPayment)}.
                        </div>
                      )}
                    </div>
                  </div>
                ) : simulationResults.clearedBeforeRetirement ? (
                  <p className="text-xs leading-relaxed opacity-90">
                    Under your current strategy, your mortgage is fully paid off at Age {simulationResults.ovPayoffAge} (Year {new Date().getFullYear() + (simulationResults.ovPayoffAge - profile.currentAge)}), leaving 100% of your retirement cash flow free!
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-rose-200/80 dark:border-rose-800/80 text-xs">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Remaining Mortgage Balance at Retirement (Age {profile.targetRetirementAge}):</div>
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          {formatCurrency(simulationResults.balanceAtRetirement)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Active Mortgage Duration in Retirement:</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                          Age {profile.targetRetirementAge} to Age {simulationResults.ovPayoffAge} ({simulationResults.ovPayoffAge - profile.targetRetirementAge} yrs)
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-950 dark:text-rose-100 font-medium leading-relaxed">
                      <strong>⚠️ Retirement Budget Adjustment Prompt:</strong> Because your mortgage extends into retirement, your annual retirement income target needs to be adjusted upwards by <span className="font-black text-rose-900 dark:text-white underline">{formatCurrency(simulationResults.annualPaymentInRetirement)}/year</span> ({formatCurrency(simulationResults.monthlyPaymentInRetirement)}/month) during these {simulationResults.ovPayoffAge - profile.targetRetirementAge} years to cover ongoing mortgage repayments. Please ensure your target income in your retirement strategy includes these debt payments.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Monthly Outlay */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Monthly Outlay</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(effectiveMonthlyPayment + mortgage.regularMonthlyOverpayment)}
                <span className="text-xs font-normal text-slate-500 ml-1">/mo</span>
              </div>
              {mortgage.repaymentType === 'interest_only' ? (
                <div className="text-[11px] pt-1 space-y-0.5 border-t border-slate-200/60 dark:border-slate-700/60 mt-1">
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
                    <span>Balloon (With Overpay):</span>
                    <span className="font-black text-primary-600 dark:text-primary-400">{formatCurrency(simulationResults.ovBalloonPayment)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                    <span>Std: {formatCurrency(simulationResults.stdBalloonPayment)}</span>
                    <span className="text-amber-600 dark:text-amber-400">Due Age {simulationResults.termEndAge}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>Standard: {formatCurrency(effectiveMonthlyPayment)}</span>
                  {mortgage.regularMonthlyOverpayment > 0 && (
                    <span className="text-primary-600 dark:text-primary-400 font-bold">
                      +{formatCurrency(mortgage.regularMonthlyOverpayment)} overpay
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* KPI 2: Term / Balloon Due Age */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>{simulationResults.isInterestOnly ? 'Balloon Due Age' : 'Projected Payoff Age'}</span>
                <Zap className="w-4 h-4 text-primary-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                <span>Age {simulationResults.ovPayoffAge}</span>
                {simulationResults.yearsSaved > 0 && (
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded-md">
                    -{simulationResults.yearsSaved} yrs
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                {simulationResults.isInterestOnly
                  ? `Term ends in ${mortgage.remainingTermYears} yrs (${simulationResults.termEndYear})`
                  : `Standard term: Age ${simulationResults.stdPayoffAge}`}
              </div>
            </div>

            {/* KPI 3: Total Interest Saved */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Interest Saved</span>
                <PiggyBank className="w-4 h-4 text-primary-500" />
              </div>
              <div className="text-xl font-black text-primary-600 dark:text-primary-400">
                {formatCurrency(simulationResults.interestSaved)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Interest paid: {formatCurrency(simulationResults.ovTotalInterest)} (vs {formatCurrency(simulationResults.stdTotalInterest)})
              </div>
            </div>

            {/* KPI 4: Balloon Payment or Retirement Debt */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>{simulationResults.isInterestOnly ? 'Final Balloon Due' : `Debt at Age ${profile.targetRetirementAge}`}</span>
                <Home className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {simulationResults.isInterestOnly ? (
                  <span className="text-primary-600 dark:text-primary-400 font-black">
                    {formatCurrency(simulationResults.ovBalloonPayment)}
                  </span>
                ) : simulationResults.clearedBeforeRetirement ? (
                  <span className="text-primary-600 dark:text-primary-400 font-black">£0 (Cleared)</span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-black">
                    {formatCurrency(simulationResults.balanceAtRetirement)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                {simulationResults.isInterestOnly
                  ? `Saved -${formatCurrency(simulationResults.balloonReduction)} vs std`
                  : simulationResults.clearedBeforeRetirement
                  ? 'Paid off before retirement'
                  : `+${formatCurrency(simulationResults.annualPaymentInRetirement)}/yr in retirement`}
              </div>
            </div>
          </div>

          {/* Toggle between Chart and Amortization Table */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('chart')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'chart'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Debt Amortization Chart</span>
              </button>
              <button
                onClick={() => setActiveSubTab('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'table'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Annual Amortization Table</span>
              </button>
            </div>
          </div>

          {/* CHART VIEW */}
          {activeSubTab !== 'table' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Comparing standard mortgage payoff curve vs overpayment strategy curve by age.
                </span>
                <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400 inline-block"></span> Standard Balance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Overpaid Balance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-primary-500 border-t border-dashed inline-block"></span> Retire (Age {profile.targetRetirementAge})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-purple-500 border-t border-dashed inline-block"></span> Private Pension Access (Age {getPensionAccessAge(profile)})
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={simulationResults.yearlyData}
                    margin={{ top: 15, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorOv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="age" stroke="#888888" fontSize={11} tickLine={false} label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => {
                        const dataKey = item?.dataKey || name;
                        const displayName =
                          dataKey === 'stdEndBalance' || name === 'Standard Balance'
                            ? 'Standard Balance'
                            : 'Overpaid Balance';
                        return [formatCurrency(Number(val) || 0), displayName];
                      }}
                      labelFormatter={(age) => `Age ${age}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      x={profile.targetRetirementAge}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `Retire (Age ${profile.targetRetirementAge})`, fill: '#10b981', fontSize: 11, position: 'top' }}
                    />
                    <ReferenceLine
                      x={getPensionAccessAge(profile)}
                      stroke="#8b5cf6"
                      strokeDasharray="4 4"
                      label={{ value: `Private Pension Access (Age ${getPensionAccessAge(profile)})`, fill: '#8b5cf6', fontSize: 11, position: 'bottom' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stdEndBalance"
                      name="Standard Balance"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorStd)"
                    />
                    <Area
                      type="monotone"
                      dataKey="ovEndBalance"
                      name="Overpaid Balance"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOv)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TABLE VIEW */}
          {activeSubTab === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Yearly breakdown of capital reduction, interest charges, and remaining balance.</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Total Term: {simulationResults.ovMonths} months ({simulationResults.yearsSaved} yrs saved)
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Age</th>
                      <th className="p-3">Year</th>
                      <th className="p-3 text-right">Start Balance</th>
                      <th className="p-3 text-right">Interest Paid</th>
                      <th className="p-3 text-right">Capital Paid</th>
                      <th className="p-3 text-right">Overpayments</th>
                      <th className="p-3 text-right">End Balance</th>
                      <th className="p-3 text-right">LTV %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {simulationResults.yearlyData.map((row) => (
                      <tr
                        key={row.age}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          row.age === profile.targetRetirementAge
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold'
                            : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>Age {row.age}</span>
                          {row.age === profile.targetRetirementAge && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-md">Retire</span>
                          )}
                          {simulationResults.isInterestOnly && row.age === simulationResults.termEndAge && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-600 text-white rounded-md font-bold">
                              Balloon Due ({formatCurrency(simulationResults.ovBalloonPayment)})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">{row.year}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(row.ovStartBalance)}
                        </td>
                        <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.ovInterest)}
                        </td>
                        <td className="p-3 text-right text-slate-800 dark:text-slate-200">
                          {formatCurrency(row.ovCapital)}
                        </td>
                        <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                          {row.ovOverpayments > 0 ? formatCurrency(row.ovOverpayments) : '-'}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(row.ovEndBalance)}
                        </td>
                        <td className="p-3 text-right text-slate-500 font-semibold">
                          {row.ltv.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Lump Sum Modal */}
      {showAddLumpSumModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              <span>Add One-Off Lump Sum Overpayment</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Overpayment Description</label>
                <input
                  type="text"
                  value={newLumpSumName}
                  onChange={(e) => setNewLumpSumName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Age for Lump Sum</label>
                <input
                  type="number"
                  min={profile.currentAge}
                  max={85}
                  value={newLumpSumAge}
                  onChange={(e) => setNewLumpSumAge(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lump Sum Amount (£)</label>
                <input
                  type="number"
                  min={1000}
                  step={5000}
                  value={newLumpSumAmount}
                  onChange={(e) => setNewLumpSumAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-primary-600 dark:text-primary-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddLumpSumModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLumpSum}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Save Overpayment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
