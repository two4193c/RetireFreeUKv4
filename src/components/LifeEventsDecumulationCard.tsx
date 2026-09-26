import React, { useState } from 'react';
import { UserProfile, DecumulationLifeEvent, LifeEventType, LifeEventPotTarget, ItemOwner, InvestmentPots, YearProjection } from '../types';
import { MilestoneTimelineCard } from './MilestoneTimelineCard';
import { ModalShell } from './ModalShell';
import {
  Sparkles,
  Calendar,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Home,
  Gift,
  Car,
  Plane,
  Wrench,
  User,
  Users,
  Info,
  Banknote,
  DollarSign,
  Heart,
  HelpCircle,
  Pencil,
  CreditCard,
  Wallet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface LifeEventsDecumulationCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  pots?: InvestmentPots;
  projections?: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
}

const POT_TARGET_OPTIONS: { value: LifeEventPotTarget; label: string }[] = [
  { value: 'cash_savings', label: 'Cash Savings Account' },
  { value: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA' },
  { value: 'cash_isa', label: 'Cash ISA' },
  { value: 'sipp', label: 'SIPP / Pension Pot' },
  { value: 'gia', label: 'General Investment Account (GIA)' },
];

export interface PotBalanceBreakdown {
  currentBalance: number;
  projectedBalance: number;
  effectiveAvailable: number;
  allLiquidCurrent: number;
  allLiquidProjected: number;
  allLiquidEffective: number;
  potLabel: string;
}

const getPotLabel = (target: LifeEventPotTarget): string => {
  switch (target) {
    case 'cash_savings': return 'Cash Savings Account';
    case 'stocks_and_shares_isa': return 'Stocks & Shares ISA';
    case 'cash_isa': return 'Cash ISA';
    case 'sipp': return 'SIPP / Pension Pot';
    case 'gia': return 'General Investment Account (GIA)';
    default: return 'Selected Pot';
  }
};

export const LifeEventsDecumulationCard: React.FC<LifeEventsDecumulationCardProps> = ({
  profile,
  pots,
  projections,
  onChange,
  isStudioMode,
}) => {
  const events = profile.decumulationLifeEvents || [];
  const isCouple = Boolean(profile.isCouplePlanning);
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<'all' | 'primary' | 'partner'>('all');
  const [editItem, setEditItem] = useState<DecumulationLifeEvent | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const getPotBalanceInfo = (
    owner: ItemOwner,
    targetPot: LifeEventPotTarget,
    targetAge: number,
    editingEventId?: string
  ): PotBalanceBreakdown => {
    const isPartner = owner === 'partner';

    // Current Pot Balances Today
    const primaryCash = pots?.cashSavingsBalance ?? 0;
    const primarySsIsa = pots?.stocksAndSharesIsaBalance ?? 0;
    const primaryCashIsa = pots?.cashIsaBalance ?? 0;
    const primarySipp = (pots?.sippBalance ?? 0) + (pots?.workplacePensionBalance ?? 0);
    const primaryGia = pots?.giaBalance ?? 0;

    const partnerPots = profile.partnerPots;
    const partnerCash = partnerPots?.cashSavingsBalance ?? 0;
    const partnerSsIsa = partnerPots?.stocksAndSharesIsaBalance ?? (profile.partnerIsaBalance ?? 0);
    const partnerCashIsa = partnerPots?.cashIsaBalance ?? 0;
    const partnerSipp = (partnerPots?.sippBalance ?? (profile.partnerSippBalance ?? 0)) +
                        (partnerPots?.workplacePensionBalance ?? (profile.partnerWorkplacePensionBalance ?? 0));
    const partnerGia = partnerPots?.giaBalance ?? 0;

    let currentBalance = 0;
    if (isPartner) {
      if (targetPot === 'cash_savings') currentBalance = partnerCash;
      else if (targetPot === 'stocks_and_shares_isa') currentBalance = partnerSsIsa;
      else if (targetPot === 'cash_isa') currentBalance = partnerCashIsa;
      else if (targetPot === 'sipp') currentBalance = partnerSipp;
      else if (targetPot === 'gia') currentBalance = partnerGia;
    } else {
      if (targetPot === 'cash_savings') currentBalance = primaryCash;
      else if (targetPot === 'stocks_and_shares_isa') currentBalance = primarySsIsa;
      else if (targetPot === 'cash_isa') currentBalance = primaryCashIsa;
      else if (targetPot === 'sipp') currentBalance = primarySipp;
      else if (targetPot === 'gia') currentBalance = primaryGia;
    }

    const allLiquidCurrent = isPartner
      ? (partnerCash + partnerSsIsa + partnerCashIsa + partnerGia)
      : (primaryCash + primarySsIsa + primaryCashIsa + primaryGia);

    // Projected Balance at Target Age
    const primaryCurrentAge = profile.currentAge || 50;
    const partnerCurrentAge = profile.partnerCurrentAge ?? profile.currentAge ?? 50;
    const partnerAgeDiff = partnerCurrentAge - primaryCurrentAge;
    const primaryAgeToLookup = isPartner ? (targetAge - partnerAgeDiff) : targetAge;

    const projRow = projections?.find((p) => p.age === primaryAgeToLookup);

    let projectedBalance = currentBalance;
    let allLiquidProjected = allLiquidCurrent;

    if (projRow) {
      let projCash = isPartner ? (projRow.partnerCashSavingsPot ?? 0) : (projRow.primaryCashSavingsPot ?? projRow.cashSavingsPot ?? 0);
      let projSsIsa = isPartner ? (projRow.partnerStocksAndSharesIsaPot ?? 0) : (projRow.primaryStocksAndSharesIsaPot ?? (projRow.stocksAndSharesIsaPot ?? 0));
      let projCashIsa = isPartner ? (projRow.partnerCashIsaPot ?? 0) : (projRow.primaryCashIsaPot ?? (projRow.cashIsaPot ?? 0));
      let projSipp = isPartner ? (projRow.partnerPensionPot ?? 0) : (projRow.primaryPensionPot ?? (projRow.pensionPot ?? 0));
      let projGia = isPartner ? (projRow.partnerGiaPot ?? 0) : (projRow.primaryGiaPot ?? (projRow.giaPot ?? 0));

      // If editing an existing event, add back the event's amount so the pot isn't seen as depleted by the event being edited
      if (editingEventId) {
        const existingEvt = (profile.decumulationLifeEvents || []).find((e) => e.id === editingEventId);
        if (existingEvt && existingEvt.enabled && existingEvt.type === 'expense' && existingEvt.age === targetAge) {
          const addBack = Number(existingEvt.amount) || 0;
          const evtPot = existingEvt.targetPot || 'cash_savings';
          if (evtPot === 'cash_savings') projCash += addBack;
          else if (evtPot === 'stocks_and_shares_isa') projSsIsa += addBack;
          else if (evtPot === 'cash_isa') projCashIsa += addBack;
          else if (evtPot === 'sipp') projSipp += addBack;
          else if (evtPot === 'gia') projGia += addBack;
        }
      }

      if (targetPot === 'cash_savings') projectedBalance = projCash;
      else if (targetPot === 'stocks_and_shares_isa') projectedBalance = projSsIsa;
      else if (targetPot === 'cash_isa') projectedBalance = projCashIsa;
      else if (targetPot === 'sipp') projectedBalance = projSipp;
      else if (targetPot === 'gia') projectedBalance = projGia;

      allLiquidProjected = projCash + projSsIsa + projCashIsa + projGia;
    }

    const effectiveAvailable = Math.max(0, Math.round(projectedBalance));
    const allLiquidEffective = Math.max(0, Math.round(allLiquidProjected));

    return {
      currentBalance: Math.max(0, Math.round(currentBalance)),
      projectedBalance: Math.max(0, Math.round(projectedBalance)),
      effectiveAvailable,
      allLiquidCurrent: Math.max(0, Math.round(allLiquidCurrent)),
      allLiquidProjected: Math.max(0, Math.round(allLiquidProjected)),
      allLiquidEffective,
      potLabel: getPotLabel(targetPot),
    };
  };

  const openAddModal = (
    presetType: 'downsizing' | 'inheritance' | 'car' | 'trip' | 'renovation' | 'gift' | 'debt' | 'custom'
  ) => {
    const ownerToAssign: ItemOwner = isCouple
      ? activeOwnerFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    const defaultRetAge = profile.targetRetirementAge || 60;
    let newEvent: DecumulationLifeEvent;

    switch (presetType) {
      case 'downsizing':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Property Downsizing Lump Sum',
          owner: ownerToAssign,
          type: 'income',
          amount: 100000,
          age: Math.min(85, defaultRetAge + 8),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Equity released from downsizing primary residence in mid-retirement',
        };
        break;
      case 'inheritance':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Inheritance Received',
          owner: ownerToAssign,
          type: 'income',
          amount: 50000,
          age: Math.min(85, defaultRetAge + 10),
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: true,
          enabled: true,
          description: 'Expected inheritance legacy payment',
        };
        break;
      case 'car':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'New Vehicle Purchase',
          owner: ownerToAssign,
          type: 'expense',
          amount: 25000,
          age: Math.min(85, defaultRetAge + 2),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'One-off car replacement or electric vehicle upgrade',
        };
        break;
      case 'trip':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'World Trip / Bucket List Holiday',
          owner: ownerToAssign,
          type: 'expense',
          amount: 15000,
          age: Math.min(85, defaultRetAge + 1),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Special celebratory retirement travel or extended cruise',
        };
        break;
      case 'renovation':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Home Improvement / Adaptations',
          owner: ownerToAssign,
          type: 'expense',
          amount: 20000,
          age: Math.min(85, defaultRetAge + 5),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Kitchen/bathroom renovation or accessibility adaptations',
        };
        break;
      case 'gift':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Gift to Children / Family Support',
          owner: ownerToAssign,
          type: 'expense',
          amount: 30000,
          age: Math.min(85, defaultRetAge + 7),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'House deposit contribution or grandchild education support',
        };
        break;
      case 'debt':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Debt/Mortgage Payoff',
          owner: ownerToAssign,
          type: 'expense',
          amount: 50000,
          age: defaultRetAge,
          targetPot: 'cash_savings',
          inflationLinked: false,
          enabled: true,
          description: 'Lump sum payoff of remaining mortgage or debt balance at retirement',
        };
        break;
      case 'custom':
      default:
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Custom Life Event',
          owner: ownerToAssign,
          type: 'expense',
          amount: 10000,
          age: defaultRetAge,
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: '',
        };
    }

    setEditItem(newEvent);
    setIsAdding(true);
    setModalError(null);
  };

  const handleSaveModal = () => {
    if (!editItem) return;
    if (!editItem.name.trim()) {
      setModalError('Please enter an event name.');
      return;
    }
    if (editItem.amount <= 0) {
      setModalError('Please enter an amount greater than £0.');
      return;
    }
    if (editItem.type === 'expense') {
      const bal = getPotBalanceInfo(editItem.owner || 'primary', editItem.targetPot || 'cash_savings', editItem.age, isAdding ? undefined : editItem.id);
      if (editItem.amount > bal.effectiveAvailable) {
        if (!editItem.allowWaterfall) {
          setModalError(`Cannot save: Expense of £${editItem.amount.toLocaleString()} exceeds available pot balance of £${bal.effectiveAvailable.toLocaleString()} in ${bal.potLabel}. Please reduce the amount, select another pot, or enable waterfall overflow.`);
          return;
        }
        if (editItem.allowWaterfall && editItem.amount > bal.allLiquidEffective) {
          setModalError(`Cannot save: Expense of £${editItem.amount.toLocaleString()} exceeds total liquid assets across all pots (£${bal.allLiquidEffective.toLocaleString()}).`);
          return;
        }
      }
    }

    setModalError(null);
    let updated: DecumulationLifeEvent[];
    if (isAdding) {
      updated = [...events, editItem];
    } else {
      updated = events.map((e) => (e.id === editItem.id ? editItem : e));
    }
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
    setEditItem(null);
    setIsAdding(false);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
  };

  // Filtered view
  const filteredEvents = events.filter((e) => {
    if (!isCouple || activeOwnerFilter === 'all') return true;
    return (e.owner || 'primary') === activeOwnerFilter;
  });

  const activeEvents = events.filter((e) => e.enabled);
  const totalInflows = activeEvents
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalOutflows = activeEvents
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netImpact = totalInflows - totalOutflows;

  const underfundedEventsCount = activeEvents.filter((e) => {
    if (e.type !== 'expense') return false;
    const bal = getPotBalanceInfo(e.owner || 'primary', e.targetPot || 'cash_savings', e.age, e.id);
    return !e.allowWaterfall && e.amount > bal.effectiveAvailable;
  }).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Life Events
            </h2>
            {!isStudioMode && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {activeEvents.length} Active {activeEvents.length === 1 ? 'Event' : 'Events'}
              </span>
            )}
          </div>
          {!isStudioMode && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              Model one-off planned expenses or income in retirement—such as property downsizing lump sums, inheritances, buying a vehicle, world trips, home renovations, or gifting to family—and see their direct impact on your lifetime projection graph.
            </p>
          )}
        </div>

        {/* Couple Owner Filter */}
        {isCouple && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveOwnerFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeOwnerFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveOwnerFilter('primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeOwnerFilter === 'primary'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
            </button>
            <button
              onClick={() => setActiveOwnerFilter('partner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeOwnerFilter === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{profile.partnerName || 'Partner'}</span>
            </button>
          </div>
        )}
      </div>

      {underfundedEventsCount > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">
            <strong>Pot Balance Alert:</strong> {underfundedEventsCount} planned expense {underfundedEventsCount === 1 ? 'event exceeds' : 'events exceed'} the available pot balance. Please review the highlighted {underfundedEventsCount === 1 ? 'event' : 'events'} below.
          </span>
        </div>
      )}

      {isStudioMode ? (
      <div className="flex justify-start">
        <button
          onClick={() => openAddModal('custom')}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>
    ) : (
      <div className="preset-action-wrapper">
        {/* Preset Action Buttons */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          Quick-Add Planned Life Events
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
          <button
            onClick={() => openAddModal('downsizing')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-300 dark:hover:border-primary-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-primary-600 dark:text-primary-400">
              <Home className="w-4 h-4" />
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 block">
                Downsizing
              </span>
              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
                +£100k (Income)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('inheritance')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-300 dark:hover:border-primary-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-primary-600 dark:text-primary-400">
              <Gift className="w-4 h-4" />
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 block">
                Inheritance
              </span>
              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
                +£50k (Income)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('car')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Car className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                New Vehicle
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£25k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('trip')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Plane className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                World Trip
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£15k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('debt')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Debt Payoff
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£50k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('renovation')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Wrench className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Renovation
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£20k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('gift')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Gift className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Gift to Family
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£30k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('custom')}
            className="p-2.5 rounded-xl border border-dashed border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-all text-left flex flex-col justify-between group cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between w-full text-purple-600 dark:text-purple-400">
              <Plus className="w-4 h-4" />
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                Custom Event
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                Add Event
              </span>
            </div>
          </button>
        </div>
      </div>

     
      </div>
    )}
    {/* KPI Summary Banner */}
      {activeEvents.length > 0 && !isStudioMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
              Total Decumulation Inflows
            </span>
            <div className="text-base font-extrabold text-primary-600 dark:text-primary-400">
              +£{totalInflows.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Total Decumulation Outflows
            </span>
            <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              -£{totalOutflows.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-purple-500" />
              Net Portfolio Lifetime Impact
            </span>
            <div
              className={`text-base font-extrabold ${
                netImpact >= 0
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netImpact >= 0 ? `+£${netImpact.toLocaleString()}` : `-£${Math.abs(netImpact).toLocaleString()}`}
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No Life Events Planned Yet
          </h3>
          {!isStudioMode && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Click one of the quick-add presets above to model property downsizing, inheritance, car purchases, or world trips.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const isIncome = event.type === 'income';
            const balInfo = getPotBalanceInfo(event.owner || 'primary', event.targetPot || 'cash_savings', event.age, event.id);
            const hasShortfall = !isIncome && event.enabled && (event.amount > balInfo.effectiveAvailable) && !event.allowWaterfall;
            const hasWaterfallWarning = !isIncome && event.enabled && event.allowWaterfall && (event.amount > balInfo.effectiveAvailable);

            return (
              <div
                key={event.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  event.enabled
                    ? hasShortfall
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                      : isIncome
                        ? 'bg-primary-50/30 dark:bg-primary-950/10 border-primary-200/80 dark:border-primary-900/60'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    hasShortfall
                      ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400'
                      : isIncome
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    {hasShortfall ? <AlertTriangle className="w-5 h-5" /> : isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{event.name}</h4>
                      {!event.enabled && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 rounded">Disabled</span>
                      )}
                      {hasShortfall && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Exceeds Pot Balance (£{Number(event.amount).toLocaleString()} vs £{balInfo.effectiveAvailable.toLocaleString()} in {balInfo.potLabel})
                        </span>
                      )}
                      {hasWaterfallWarning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                          <Info className="w-3 h-3 text-amber-600" />
                          Waterfall: £{balInfo.effectiveAvailable.toLocaleString()} from {balInfo.potLabel}, overflow to other liquid pots
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      Age {event.age} • £{Number(event.amount).toLocaleString()} from {balInfo.potLabel} {isCouple && `• ${event.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({ ...event });
                      setIsAdding(false);
                      setModalError(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Edit event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Remove event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editItem && (() => {
        const balanceInfo = getPotBalanceInfo(
          editItem.owner || 'primary',
          editItem.targetPot || 'cash_savings',
          editItem.age,
          isAdding ? undefined : editItem.id
        );

        const isExceeding = editItem.type === 'expense' && editItem.amount > balanceInfo.effectiveAvailable;
        const shortfall = isExceeding ? Math.max(0, editItem.amount - balanceInfo.effectiveAvailable) : 0;
        const canWaterfallCover = balanceInfo.allLiquidEffective >= editItem.amount;

        // Suggest another pot with sufficient available balance
        const otherPotSuggestion = isExceeding
          ? POT_TARGET_OPTIONS
              .filter((opt) => opt.value !== (editItem.targetPot || 'cash_savings'))
              .map((opt) => {
                const b = getPotBalanceInfo(editItem.owner || 'primary', opt.value, editItem.age, isAdding ? undefined : editItem.id);
                return { value: opt.value, label: opt.label, effectiveAvailable: b.effectiveAvailable };
              })
              .filter((opt) => opt.effectiveAvailable >= editItem.amount)
              .sort((a, b) => b.effectiveAvailable - a.effectiveAvailable)[0]
          : null;

        const isSaveDisabled =
          !editItem.name.trim() ||
          editItem.amount <= 0 ||
          (editItem.type === 'expense' && (
            (balanceInfo.effectiveAvailable === 0 && !editItem.allowWaterfall) ||
            (isExceeding && (!editItem.allowWaterfall || !canWaterfallCover))
          ));

        return (
          <ModalShell
            title={isAdding ? 'Add Life Event' : 'Edit Life Event'}
            onSave={handleSaveModal}
            onCancel={() => {
              setEditItem(null);
              setIsAdding(false);
              setModalError(null);
            }}
            saveLabel={isAdding ? 'Add Event' : 'Save Changes'}
            saveDisabled={isSaveDisabled}
          >
            <div className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Enabled</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editItem.enabled}
                    onChange={(e) => setEditItem({ ...editItem, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-purple-600 rounded-full"></div>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Event Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => {
                    setModalError(null);
                    setEditItem({ ...editItem, name: e.target.value });
                  }}
                  className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setEditItem({ ...editItem, type: 'income' });
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        editItem.type === 'income'
                          ? 'bg-primary-100 border-primary-300 text-primary-800 dark:bg-primary-900/40 dark:border-primary-700 dark:text-primary-300'
                          : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setEditItem({ ...editItem, type: 'expense' });
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        editItem.type === 'expense'
                          ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-300'
                          : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      Expense
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Amount (£)</label>
                  <input
                    type="number"
                    min="0"
                    value={editItem.amount}
                    onChange={(e) => {
                      setModalError(null);
                      setEditItem({ ...editItem, amount: Math.max(0, Number(e.target.value)) });
                    }}
                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Age</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={profile.currentAge || 0}
                    max={profile.lifeExpectancyAge || 90}
                    value={editItem.age}
                    onChange={(e) => {
                      setModalError(null);
                      setEditItem({ ...editItem, age: Number(e.target.value) });
                    }}
                    className="flex-1 accent-purple-600 cursor-pointer"
                  />
                  <span className="text-sm font-bold w-12 text-center">{editItem.age}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Pot</label>
                <select
                  value={editItem.targetPot || 'cash_savings'}
                  onChange={(e) => {
                    setModalError(null);
                    setEditItem({ ...editItem, targetPot: e.target.value as LifeEventPotTarget });
                  }}
                  className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {POT_TARGET_OPTIONS.map((opt) => {
                    const b = getPotBalanceInfo(editItem.owner || 'primary', opt.value, editItem.age, isAdding ? undefined : editItem.id);
                    return (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — £{b.effectiveAvailable.toLocaleString('en-GB')} available at Age {editItem.age} (Today: £{b.currentBalance.toLocaleString('en-GB')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Pot Balance & Affordability Check Card */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                editItem.type === 'income'
                  ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200'
                  : isExceeding
                    ? editItem.allowWaterfall && canWaterfallCover
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pot Balance Check • {balanceInfo.potLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    {editItem.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 text-xs">
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Current Balance (Today)</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      £{balanceInfo.currentBalance.toLocaleString('en-GB')}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Available at Age {editItem.age}</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      £{balanceInfo.effectiveAvailable.toLocaleString('en-GB')}
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {editItem.type === 'expense' ? (
                  <div className="mt-3 space-y-2">
                    {balanceInfo.effectiveAvailable === 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Pot Empty:</strong> {balanceInfo.potLabel} has £0 available at Age {editItem.age}. An expense cannot be drawn from an empty pot.
                          </div>
                        </div>
                        {otherPotSuggestion && (
                          <button
                            type="button"
                            onClick={() => setEditItem({ ...editItem, targetPot: otherPotSuggestion.value })}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs cursor-pointer"
                          >
                            Switch to {otherPotSuggestion.label} (£{otherPotSuggestion.effectiveAvailable.toLocaleString()})
                          </button>
                        )}
                      </div>
                    ) : isExceeding ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Pot Balance Exceeded:</strong> Requested expense of £{editItem.amount.toLocaleString()} exceeds available {balanceInfo.potLabel} balance (£{balanceInfo.effectiveAvailable.toLocaleString()}) by <span className="font-bold underline text-rose-800 dark:text-rose-200">£{shortfall.toLocaleString()}</span>.
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditItem({ ...editItem, amount: balanceInfo.effectiveAvailable })}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs cursor-pointer"
                          >
                            Cap Expense to Pot Balance (£{balanceInfo.effectiveAvailable.toLocaleString()})
                          </button>

                          {otherPotSuggestion && (
                            <button
                              type="button"
                              onClick={() => setEditItem({ ...editItem, targetPot: otherPotSuggestion.value })}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs cursor-pointer"
                            >
                              Switch to {otherPotSuggestion.label} (£{otherPotSuggestion.effectiveAvailable.toLocaleString()})
                            </button>
                          )}
                        </div>

                        {/* Waterfall Fallback Option */}
                        <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 mt-2">
                          <label className="flex items-start gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(editItem.allowWaterfall)}
                              onChange={(e) => setEditItem({ ...editItem, allowWaterfall: e.target.checked })}
                              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 mt-0.5 cursor-pointer"
                            />
                            <span>
                              Allow drawing remaining shortfall (£{shortfall.toLocaleString()}) from other liquid pots (Waterfall)
                            </span>
                          </label>

                          {editItem.allowWaterfall && (
                            <div className="mt-1.5 pl-6 text-[11px] leading-relaxed">
                              {canWaterfallCover ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                  ✓ Total liquid wealth (£{balanceInfo.allLiquidEffective.toLocaleString()}) is sufficient. £{balanceInfo.effectiveAvailable.toLocaleString()} will come from {balanceInfo.potLabel}, and £{shortfall.toLocaleString()} will overflow to other liquid pots.
                                </span>
                              ) : (
                                <span className="text-rose-700 dark:text-rose-300 font-semibold">
                                  ✗ Insufficient liquid assets: Across all liquid pots combined (£{balanceInfo.allLiquidEffective.toLocaleString()}), there is still a £{(editItem.amount - balanceInfo.allLiquidEffective).toLocaleString()} deficit.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Affordability Check Passed:</strong> £{(balanceInfo.effectiveAvailable - editItem.amount).toLocaleString()} will remain in {balanceInfo.potLabel} after this expense.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-start gap-2 text-xs font-medium text-blue-800 dark:text-blue-300">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cash Inflow:</strong> £{editItem.amount.toLocaleString()} will be deposited into {balanceInfo.potLabel} at Age {editItem.age}.
                    </div>
                  </div>
                )}
              </div>

              {isCouple && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Owner</label>
                  <select
                    value={editItem.owner || 'primary'}
                    onChange={(e) => {
                      setModalError(null);
                      setEditItem({ ...editItem, owner: e.target.value as ItemOwner });
                    }}
                    className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="primary">{profile.name || 'Primary Person'}</option>
                    <option value="partner">{profile.partnerName || 'Partner'}</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editItem.inflationLinked ?? true}
                    onChange={(e) => setEditItem({ ...editItem, inflationLinked: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Scale with CPI Inflation</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Description</label>
                <textarea
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                  placeholder="Add notes or details..."
                />
              </div>
            </div>
          </ModalShell>
        );
      })()}

      {!isStudioMode && pots && projections && ( <MilestoneTimelineCard profile={profile} pots={pots} projections={projections} onChange={onChange} isEmbedded={true} /> )}
    </div>
  );
};
