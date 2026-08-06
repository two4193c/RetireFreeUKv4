import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots, PotTransfer, NonPensionPotType, DestinationPotType } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from '../utils/defaultData';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  User,
  Heart,
  TrendingUp,
  AlertCircle,
  Coins,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface PotTransferManagerProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
  pots: InvestmentPots;
}

const NON_PENSION_POTS: { value: NonPensionPotType; label: string; icon: string }[] = [
  { value: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA', icon: '📈' },
  { value: 'cash_isa', label: 'Cash ISA', icon: '🏦' },
  { value: 'lisa', label: 'Lifetime ISA (LISA)', icon: '⭐' },
  { value: 'gia', label: 'General Investment Account (GIA)', icon: '💼' },
  { value: 'cash_savings', label: 'High-Yield Cash Savings', icon: '💵' },
];

const DESTINATION_POTS: { value: DestinationPotType; label: string; icon: string }[] = [
  { value: 'sipp', label: 'SIPP (Personal Pension)', icon: '🛡️' },
  { value: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA', icon: '📈' },
  { value: 'cash_isa', label: 'Cash ISA', icon: '🏦' },
  { value: 'lisa', label: 'Lifetime ISA (LISA)', icon: '⭐' },
  { value: 'gia', label: 'General Investment Account (GIA)', icon: '💼' },
  { value: 'cash_savings', label: 'High-Yield Cash Savings', icon: '💵' },
];

// Helper to get pot label
function getPotLabel(potType: string): string {
  if (potType === 'workplace_pension') return 'Workplace Pension';
  if (potType === 'sipp') return 'SIPP (Personal Pension)';
  if (potType === 'stocks_and_shares_isa') return 'Stocks & Shares ISA';
  if (potType === 'cash_isa') return 'Cash ISA';
  if (potType === 'lisa') return 'Lifetime ISA (LISA)';
  if (potType === 'gia') return 'General Investment Account (GIA)';
  if (potType === 'cash_savings') return 'High-Yield Cash Savings';
  return potType;
}

// Helper to simulate projected pot balance at target year
function getProjectedPotBalance(
  profile: UserProfile,
  pots: InvestmentPots,
  owner: 'primary' | 'partner',
  potType: string,
  targetYear: number,
  transferDate?: string,
  currentTransferId?: string
): number {
  const currentYear = new Date().getFullYear();
  const isCouple = Boolean(profile.isCouplePlanning);
  const pPots = sanitizePots(pots, DEFAULT_POTS);
  const partPots = sanitizePots(profile.partnerPots, {
    ...DEFAULT_PARTNER_POTS,
    sippBalance: profile.partnerSippBalance ?? DEFAULT_PARTNER_POTS.sippBalance,
  });

  const selectedPots = owner === 'partner' && isCouple ? partPots : pPots;

  let balance = 0;
  let monthlyContrib = 0;

  if (potType === 'workplace_pension') {
    balance = selectedPots.workplacePensionBalance || 0;
    const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
    if (selectedPots.workplacePensionMonthlyEmployeeType === 'percent') {
      monthlyContrib = (salary * ((selectedPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12;
    } else {
      monthlyContrib = selectedPots.workplacePensionMonthlyEmployee || 0;
    }
    monthlyContrib += (salary * ((selectedPots.employerMatchPercentage || 0) / 100)) / 12;
  } else if (potType === 'sipp') {
    balance = selectedPots.sippBalance || 0;
    monthlyContrib = selectedPots.sippMonthlyContribution || 0;
  } else if (potType === 'stocks_and_shares_isa') {
    balance = selectedPots.stocksAndSharesIsaBalance || 0;
    monthlyContrib = selectedPots.stocksAndSharesIsaMonthlyContribution || 0;
  } else if (potType === 'cash_isa') {
    balance = selectedPots.cashIsaBalance || 0;
    monthlyContrib = selectedPots.cashIsaMonthlyContribution || 0;
  } else if (potType === 'lisa') {
    balance = selectedPots.lisaBalance || 0;
    monthlyContrib = selectedPots.lisaMonthlyContribution || 0;
  } else if (potType === 'gia') {
    balance = selectedPots.giaBalance || 0;
    monthlyContrib = selectedPots.giaMonthlyContribution || 0;
  } else if (potType === 'cash_savings') {
    balance = selectedPots.cashSavingsBalance || 0;
    monthlyContrib = selectedPots.cashSavingsMonthlyContribution || 0;
  }

  // Determine annual growth rate
  const overrides = profile.potReturnOverrides;
  let rate = profile.expectedInvestmentReturn / 100;
  if (overrides?.enabled) {
    if (potType === 'workplace_pension') rate = (overrides.workplacePensionReturn || 7.0) / 100;
    else if (potType === 'sipp') rate = (overrides.sippReturn || 7.5) / 100;
    else if (potType === 'stocks_and_shares_isa') rate = (overrides.stocksAndSharesIsaReturn || 7.5) / 100;
    else if (potType === 'cash_isa') rate = (overrides.cashIsaReturn || 4.2) / 100;
    else if (potType === 'lisa') rate = (overrides.lisaReturn || 6.5) / 100;
    else if (potType === 'gia') rate = (overrides.giaReturn || 6.5) / 100;
    else if (potType === 'cash_savings') rate = (overrides.cashSavingsReturn || 3.5) / 100;
  }

  const primaryAge = profile.currentAge || 35;
  const partnerAge = profile.partnerCurrentAge || primaryAge;
  const ownerBaseAge = owner === 'partner' ? partnerAge : primaryAge;

  const potTransfers = profile.potTransfers || [];

  // Helper to check if another transfer `t` occurred BEFORE current transfer in year `yr`
  const isOtherTransferBefore = (t: PotTransfer, yr: number) => {
    if (!t.enabled || t.id === currentTransferId) return false;
    const srcOwner = t.owner || 'primary';
    const dstOwner = t.destinationOwner || srcOwner;
    if (!isCouple && (srcOwner === 'partner' || dstOwner === 'partner')) return false;

    let tYear: number | undefined;
    if (t.transferDate) {
      const parsed = parseInt(t.transferDate.split('-')[0], 10);
      if (!isNaN(parsed)) tYear = parsed;
    } else if (t.transferAge !== undefined && t.transferAge > 0) {
      const tOwnerAge = srcOwner === 'partner' ? partnerAge : primaryAge;
      tYear = currentYear + (t.transferAge - tOwnerAge);
    }

    if (tYear === undefined) return false;
    if (tYear !== yr) return false;

    if (yr === targetYear) {
      if (t.transferDate && transferDate) {
        if (t.transferDate < transferDate) return true;
        if (t.transferDate > transferDate) return false;
      }
      const idxT = potTransfers.findIndex((p) => p.id === t.id);
      const idxCurrent = potTransfers.findIndex((p) => p.id === currentTransferId);
      if (idxT !== -1 && idxCurrent !== -1) {
        return idxT < idxCurrent;
      }
      return false;
    }

    return true;
  };

  // Simulate year by year from currentYear up to targetYear inclusive
  for (let yr = currentYear; yr <= targetYear; yr++) {
    const isTargetYr = yr === targetYear;
    const currentEvalAge = ownerBaseAge + (yr - currentYear);

    // Prior years get full annual growth and monthly contributions; target year gets annual monthly contributions
    if (!isTargetYr) {
      balance = balance * (1 + rate) + (monthlyContrib * 12) * (1 + rate / 2);
    } else {
      balance += (monthlyContrib * 12);
    }

    // Add one-off & custom regular contributions for this pot in year yr
    (profile.oneOffContributions || []).forEach((c) => {
      if (!c.enabled) return;
      const cOwner = c.owner || 'primary';
      if (cOwner !== owner || c.targetPot !== potType) return;

      if (c.frequency === 'regular_monthly') {
        const startAge = c.startAge ?? 18;
        const endAge = c.endAge ?? 100;
        if (currentEvalAge >= startAge && currentEvalAge <= endAge) {
          let annual = (c.grossAmount || 0) * 12;
          if (c.targetPot === 'workplace_pension') {
            const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
            if (c.workplaceContributionType === 'fixed') {
              annual = ((c.employeeMonthlyAmount ?? c.grossAmount ?? 0) + (c.employerMonthlyAmount ?? 0)) * 12;
            } else {
              annual = salary * (((c.employeePercent ?? 5) + (c.employerPercent ?? 3)) / 100);
            }
          } else if (c.targetPot === 'sipp' && c.sippContributionType !== 'gross') {
            annual *= 1.25;
          } else if (c.targetPot === 'lisa') {
            annual += Math.min(annual, 4000) * 0.25;
          }
          if (!isTargetYr) {
            balance += annual * (1 + rate / 2);
          } else {
            balance += annual;
          }
        }
      } else {
        // One-off lump sum
        let cYear: number | undefined;
        if (c.date) {
          const parsed = parseInt(c.date.split('-')[0], 10);
          if (!isNaN(parsed)) cYear = parsed;
        }
        if (cYear === yr) {
          if (isTargetYr && transferDate && c.date) {
            if (c.date <= transferDate) {
              let gross = c.grossAmount || 0;
              if (c.targetPot === 'sipp') {
                gross = c.sippContributionType === 'gross' ? gross : gross * 1.25;
              } else if (c.targetPot === 'lisa') {
                gross += Math.min(gross, 4000) * 0.25;
              }
              balance += gross;
            }
          } else {
            let gross = c.grossAmount || 0;
            if (c.targetPot === 'sipp') {
              gross = c.sippContributionType === 'gross' ? gross : gross * 1.25;
            } else if (c.targetPot === 'lisa') {
              gross += Math.min(gross, 4000) * 0.25;
            }
            balance += gross;
          }
        }
      }
    });

    // Account for other transfers occurring in this year `yr`
    potTransfers.forEach((t) => {
      if (isOtherTransferBefore(t, yr)) {
        const srcOwner = t.owner || 'primary';
        const dstOwner = t.destinationOwner || srcOwner;
        const amt = t.amount || 0;

        if (srcOwner === owner && t.sourcePot === potType) {
          balance = Math.max(0, balance - amt);
        }
        if (dstOwner === owner && t.destinationPot === potType) {
          let added = amt;
          if (t.destinationPot === 'sipp') added *= 1.25;
          else if (t.destinationPot === 'lisa') added += Math.min(added, 4000) * 0.25;
          balance += added;
        }
      }
    });
  }

  return Math.max(0, balance);
}

export const PotTransferManager: React.FC<PotTransferManagerProps> = ({
  profile,
  onChange,
  pots,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const transfers = profile.potTransfers || [];

  const primaryName = profile.name || 'Primary';
  const partnerName = profile.partnerName || 'Partner';

  const currentYear = new Date().getFullYear();

  const sortedTransfers = useMemo(() => {
    return [...transfers]
      .filter((t) => isCouple || ((t.owner || 'primary') === 'primary' && (t.destinationOwner || t.owner || 'primary') === 'primary'))
      .sort((a, b) => {
        const getSortInfo = (t: PotTransfer) => {
          const srcOwner = t.owner || 'primary';
          const baseAge = srcOwner === 'partner' ? (profile.partnerCurrentAge || profile.currentAge || 35) : (profile.currentAge || 35);

          let targetYear = currentYear;
          let sortKey = '';

          if (t.transferDate && t.transferDate.trim() !== '') {
            const yr = parseInt(t.transferDate.split('-')[0], 10);
            if (!isNaN(yr)) targetYear = yr;
            sortKey = t.transferDate;
          } else if (t.transferAge !== undefined && t.transferAge > 0) {
            targetYear = currentYear + (t.transferAge - baseAge);
            sortKey = `${targetYear}-01-01`;
          } else {
            targetYear = currentYear + 1;
            sortKey = `${targetYear}-01-01`;
          }

          return { targetYear, sortKey };
        };

        const infoA = getSortInfo(a);
        const infoB = getSortInfo(b);

        if (infoA.targetYear !== infoB.targetYear) {
          return infoA.targetYear - infoB.targetYear;
        }
        if (infoA.sortKey !== infoB.sortKey) {
          return infoA.sortKey.localeCompare(infoB.sortKey);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [transfers, profile.currentAge, profile.partnerCurrentAge, currentYear, isCouple]);

  const handleAddTransfer = (preset?: 'isa_to_sipp' | 'gia_to_isa' | 'cash_to_isa' | 'couple_isa' | 'couple_sipp') => {
    let newTransfer: PotTransfer;

    if (preset === 'isa_to_sipp') {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: 'ISA to SIPP Pension Top-Up',
        owner: 'primary',
        sourcePot: 'stocks_and_shares_isa',
        destinationOwner: 'primary',
        destinationPot: 'sipp',
        amount: 10000,
        transferDate: `${currentYear + 2}-04-06`,
        enabled: true,
        description: 'Transfer from Stocks & Shares ISA to SIPP to gain 20%+ pension tax relief.',
      };
    } else if (preset === 'gia_to_isa') {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: 'Bed & ISA (GIA to ISA)',
        owner: 'primary',
        sourcePot: 'gia',
        destinationOwner: 'primary',
        destinationPot: 'stocks_and_shares_isa',
        amount: 20000,
        transferDate: `${currentYear + 1}-04-06`,
        enabled: true,
        description: 'Utilize annual £20,000 ISA allowance by moving taxable GIA funds into S&S ISA.',
      };
    } else if (preset === 'cash_to_isa') {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: 'Cash Savings to Cash ISA',
        owner: 'primary',
        sourcePot: 'cash_savings',
        destinationOwner: 'primary',
        destinationPot: 'cash_isa',
        amount: 5000,
        transferDate: `${currentYear + 1}-04-06`,
        enabled: true,
        description: 'Move cash savings into tax-free Cash ISA.',
      };
    } else if (preset === 'couple_isa') {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: `Cross-Spouse ISA Transfer (${primaryName} -> ${partnerName})`,
        owner: 'primary',
        sourcePot: 'stocks_and_shares_isa',
        destinationOwner: 'partner',
        destinationPot: 'stocks_and_shares_isa',
        amount: 10000,
        transferDate: `${currentYear + 1}-04-06`,
        enabled: true,
        description: `Move funds from ${primaryName}'s ISA to ${partnerName}'s ISA to make full use of couple ISA allowances.`,
      };
    } else if (preset === 'couple_sipp') {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: `Cross-Spouse Pension Contribution (${primaryName} GIA -> ${partnerName} SIPP)`,
        owner: 'primary',
        sourcePot: 'gia',
        destinationOwner: 'partner',
        destinationPot: 'sipp',
        amount: 10000,
        transferDate: `${currentYear + 1}-04-06`,
        enabled: true,
        description: `Contribute from ${primaryName}'s GIA into ${partnerName}'s SIPP for tax efficiency.`,
      };
    } else {
      newTransfer = {
        id: `transfer_${Date.now()}`,
        name: 'Custom Pot Transfer',
        owner: 'primary',
        sourcePot: 'stocks_and_shares_isa',
        destinationOwner: 'primary',
        destinationPot: 'sipp',
        amount: 5000,
        transferDate: `${currentYear + 1}-04-06`,
        enabled: true,
        description: 'Scheduled capital transfer between investment accounts.',
      };
    }

    onChange({
      ...profile,
      potTransfers: [...transfers, newTransfer],
    });
  };

  const handleUpdateTransfer = (id: string, updates: Partial<PotTransfer>) => {
    const updated = transfers.map((t) => (t.id === id ? { ...t, ...updates } : t));
    onChange({
      ...profile,
      potTransfers: updated,
    });
  };

  const handleDeleteTransfer = (id: string) => {
    const updated = transfers.filter((t) => t.id !== id);
    onChange({
      ...profile,
      potTransfers: updated,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
              <span>Investment Transfers</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                Non-Pension → Other Pots
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transfer capital from non-pension pots (ISAs, GIAs, Cash) into SIPPs or other pots {isCouple && 'between spouses'} to optimize tax allowances before retirement.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleAddTransfer()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Pot Transfer</span>
        </button>
      </div>

      {/* Quick Preset Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Quick Strategy Presets
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAddTransfer('isa_to_sipp')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ISA → SIPP Top-Up (+25% Relief)</span>
          </button>

          <button
            onClick={() => handleAddTransfer('gia_to_isa')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bed & ISA (GIA → ISA)</span>
          </button>

          <button
            onClick={() => handleAddTransfer('cash_to_isa')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cash Savings → Cash ISA</span>
          </button>

          {isCouple && (
            <>
              <button
                onClick={() => handleAddTransfer('couple_isa')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 dark:bg-pink-950/50 hover:bg-pink-100 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 text-xs font-semibold rounded-xl transition-all border border-pink-200/60 dark:border-pink-800/60 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-pink-500" />
                <span>Spouse ISA Transfer ({primaryName} → {partnerName})</span>
              </button>

              <button
                onClick={() => handleAddTransfer('couple_sipp')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl transition-all border border-purple-200/60 dark:border-purple-800/60 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                <span>Spouse Pension Top-Up ({primaryName} GIA → {partnerName} SIPP)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transfer List */}
      {sortedTransfers.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80">
          <ArrowRightLeft className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Investment Pot Transfers Configured</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Create a scheduled transfer to shift capital between your ISAs, GIAs, Cash Savings, and SIPPs before retirement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Scheduled Transfers ({sortedTransfers.length})
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-500" />
              Sorted chronologically by execution date / target age
            </span>
          </div>
          {sortedTransfers.map((transfer) => {
            const srcOwner = transfer.owner || 'primary';
            const dstOwner = transfer.destinationOwner || srcOwner;

            // Calculate transfer target year
            let targetYear = currentYear;
            if (transfer.transferDate) {
              const yr = parseInt(transfer.transferDate.split('-')[0], 10);
              if (!isNaN(yr)) targetYear = yr;
            } else if (transfer.transferAge !== undefined && transfer.transferAge > 0) {
              const baseAge = srcOwner === 'partner' ? (profile.partnerCurrentAge || profile.currentAge || 35) : (profile.currentAge || 35);
              targetYear = currentYear + (transfer.transferAge - baseAge);
            }

            // Calculate projected balances at target transfer year BEFORE transfer
            const srcBalanceBefore = getProjectedPotBalance(profile, pots, srcOwner, transfer.sourcePot, targetYear, transfer.transferDate, transfer.id);
            const dstBalanceBefore = getProjectedPotBalance(profile, pots, dstOwner, transfer.destinationPot, targetYear, transfer.transferDate, transfer.id);

            const requestedAmount = transfer.amount || 0;
            const actualTransferred = Math.min(requestedAmount, srcBalanceBefore);
            const srcBalanceAfter = Math.max(0, srcBalanceBefore - actualTransferred);

            let amountAddedToDst = actualTransferred;
            let taxReliefAmount = 0;
            if (transfer.destinationPot === 'sipp') {
              taxReliefAmount = actualTransferred * 0.25;
              amountAddedToDst = actualTransferred + taxReliefAmount;
            } else if (transfer.destinationPot === 'lisa') {
              taxReliefAmount = Math.min(actualTransferred, 4000) * 0.25;
              amountAddedToDst = actualTransferred + taxReliefAmount;
            }

            const dstBalanceAfter = dstBalanceBefore + amountAddedToDst;

            const isInsufficienFunds = requestedAmount > srcBalanceBefore && srcBalanceBefore > 0;
            const isZeroFunds = srcBalanceBefore <= 0;

            const srcOwnerName = srcOwner === 'partner' ? partnerName : primaryName;
            const dstOwnerName = dstOwner === 'partner' ? partnerName : primaryName;

            const primaryAgeAtTransfer = (profile.currentAge || 35) + (targetYear - currentYear);
            const partnerAgeAtTransfer = (profile.partnerCurrentAge || profile.currentAge || 35) + (targetYear - currentYear);

            return (
              <div
                key={transfer.id}
                className={`p-5 rounded-2xl border transition-all ${
                  transfer.enabled
                    ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Top Bar: Name, Enabled Toggle, Delete */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="text"
                        value={transfer.name}
                        onChange={(e) => handleUpdateTransfer(transfer.id, { name: e.target.value })}
                        className="font-bold text-sm text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-emerald-500 outline-none px-1 py-0.5 w-full sm:max-w-xs"
                        placeholder="Transfer Name"
                      />
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={transfer.enabled}
                          onChange={(e) => handleUpdateTransfer(transfer.id, { enabled: e.target.checked })}
                          className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 cursor-pointer"
                        />
                        <span>{transfer.enabled ? 'Active' : 'Disabled'}</span>
                      </label>

                      <button
                        onClick={() => handleDeleteTransfer(transfer.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete Transfer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    
                    {/* Source Pot Selection */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>Source Pot (Non-Pension)</span>
                        {isCouple && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">
                            {srcOwnerName}
                          </span>
                        )}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-1">
                        {isCouple && (
                          <select
                            value={srcOwner}
                            onChange={(e) =>
                              handleUpdateTransfer(transfer.id, { owner: e.target.value as 'primary' | 'partner' })
                            }
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto shrink-0"
                          >
                            <option value="primary">{primaryName}</option>
                            <option value="partner">{partnerName}</option>
                          </select>
                        )}
                        <select
                          value={transfer.sourcePot}
                          onChange={(e) =>
                            handleUpdateTransfer(transfer.id, {
                              sourcePot: e.target.value as NonPensionPotType,
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {NON_PENSION_POTS.map((pot) => (
                            <option key={pot.value} value={pot.value}>
                              {pot.icon} {pot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Destination Pot Selection */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>Destination Pot</span>
                        {isCouple && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                            {dstOwnerName}
                          </span>
                        )}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-1">
                        {isCouple && (
                          <select
                            value={dstOwner}
                            onChange={(e) =>
                              handleUpdateTransfer(transfer.id, {
                                destinationOwner: e.target.value as 'primary' | 'partner',
                              })
                            }
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto shrink-0"
                          >
                            <option value="primary">{primaryName}</option>
                            <option value="partner">{partnerName}</option>
                          </select>
                        )}
                        <select
                          value={transfer.destinationPot}
                          onChange={(e) =>
                            handleUpdateTransfer(transfer.id, {
                              destinationPot: e.target.value as DestinationPotType,
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {DESTINATION_POTS.map((pot) => (
                            <option key={pot.value} value={pot.value}>
                              {pot.icon} {pot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400">Transfer Amount (£)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">£</span>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={transfer.amount || ''}
                          onChange={(e) =>
                            handleUpdateTransfer(transfer.id, { amount: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl pl-7 pr-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Target Date / Year */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400">Transfer Date / Year</label>
                      <input
                        type="date"
                        min={`${currentYear}-01-01`}
                        value={
                          transfer.transferDate || `${currentYear + 1}-04-06`
                        }
                        onChange={(e) => handleUpdateTransfer(transfer.id, { transferDate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                  </div>

                  {/* DISPLAY BANNER: SOURCE POT BALANCE ON TRANSFER DATE & NEW DESTINATION BALANCE */}
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-md transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">
                          Transfer Execution Date: <strong className="text-slate-900 dark:text-white">{transfer.transferDate || `${targetYear}-04-06`}</strong> (Tax Year {targetYear}/{(targetYear + 1).toString().slice(2)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isCouple ? (
                          <span>{primaryName} Age {primaryAgeAtTransfer} | {partnerName} Age {partnerAgeAtTransfer}</span>
                        ) : (
                          <span>Age {primaryAgeAtTransfer}</span>
                        )}
                      </div>
                    </div>

                    {/* Source vs Destination Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* SOURCE POT BOX */}
                      <div className="bg-white dark:bg-slate-950/80 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-rose-100 dark:border-rose-900/30">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span>📤 Source Pot</span>
                            <span className="text-slate-500 dark:text-slate-400 font-normal">({srcOwnerName})</span>
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{getPotLabel(transfer.sourcePot)}</span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-slate-600 dark:text-slate-400">
                            <span>Balance on Transfer Date (Before):</span>
                            <strong className="text-slate-900 dark:text-white sm:text-right">£{Math.round(srcBalanceBefore).toLocaleString()}</strong>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-rose-600 dark:text-rose-400 font-bold">
                            <span>Transfer Amount Deducted:</span>
                            <span className="sm:text-right">-£{Math.round(actualTransferred).toLocaleString()}</span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-slate-800 dark:text-slate-200 font-bold pt-1.5 border-t border-slate-200 dark:border-slate-800">
                            <span>Remaining Source Balance:</span>
                            <strong className="text-amber-600 dark:text-amber-300 sm:text-right">£{Math.round(srcBalanceAfter).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* DESTINATION POT BOX */}
                      <div className="bg-white dark:bg-slate-950/80 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span>📥 Destination Pot</span>
                            <span className="text-slate-500 dark:text-slate-400 font-normal">({dstOwnerName})</span>
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{getPotLabel(transfer.destinationPot)}</span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-slate-600 dark:text-slate-400">
                            <span>Balance on Transfer Date (Before):</span>
                            <strong className="text-slate-900 dark:text-white sm:text-right">£{Math.round(dstBalanceBefore).toLocaleString()}</strong>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="shrink-0">Transferred Amount Added:</span>
                            <div className="sm:text-right">
                              <span>+£{Math.round(amountAddedToDst).toLocaleString()}</span>
                              {transfer.destinationPot === 'sipp' && taxReliefAmount > 0 && (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-300 font-normal">
                                  (net £{Math.round(actualTransferred).toLocaleString()} + £{Math.round(taxReliefAmount).toLocaleString()} tax relief)
                                </span>
                              )}
                              {transfer.destinationPot === 'lisa' && taxReliefAmount > 0 && (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-300 font-normal">
                                  (net £{Math.round(actualTransferred).toLocaleString()} + £{Math.round(taxReliefAmount).toLocaleString()} LISA bonus)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 text-slate-800 dark:text-slate-200 font-bold pt-1.5 border-t border-slate-200 dark:border-slate-800">
                            <span>New Balance on Transfer Date:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-right">£{Math.round(dstBalanceAfter).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Insufficient funds warning if requested amount exceeds projected source balance */}
                    {isInsufficienFunds && (
                      <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs rounded-xl font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Requested transfer (£{requestedAmount.toLocaleString()}) exceeds the projected source pot balance (£{Math.round(srcBalanceBefore).toLocaleString()}). Only available balance £{Math.round(actualTransferred).toLocaleString()} will be transferred.
                        </span>
                      </div>
                    )}

                    {isZeroFunds && (
                      <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs rounded-xl font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          Projected source pot balance is £0 on the selected date. Increase monthly contributions or adjust the date.
                        </span>
                      </div>
                    )}

                    {/* SIPP Tax Relief Bonus Banner */}
                    {transfer.destinationPot === 'sipp' && actualTransferred > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 text-xs rounded-xl gap-2.5">
                        <div className="flex items-center gap-2 font-semibold flex-1 min-w-0">
                          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                          <span className="leading-snug">
                            SIPP Pension Top-Up: Transfer of £{Math.round(actualTransferred).toLocaleString()} qualifies for 20%+ UK Pension Tax Relief!
                          </span>
                        </div>
                        <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-indigo-100 dark:bg-indigo-900/90 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700/80 shrink-0 self-start sm:self-auto text-center">
                          +£{Math.round(actualTransferred * 0.25).toLocaleString()} Basic Relief Added
                        </span>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
