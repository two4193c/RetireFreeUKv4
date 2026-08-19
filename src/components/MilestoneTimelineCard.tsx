import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  InvestmentPots,
  YearProjection,
  DecumulationLifeEvent,
  LifeEventType,
} from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import {
  Calendar,
  Sparkles,
  Home,
  Coins,
  ShieldCheck,
  Building,
  Flag,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Heart,
  Plane,
  Gift,
  Layers,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Filter,
  Trash2,
  Pencil,
  Info,
  DollarSign,
  Wallet,
  X,
  Sun,
  Compass,
  HeartHandshake,
  Zap,
  Award,
  Banknote,
} from 'lucide-react';

interface MilestoneTimelineCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  onChange?: (updatedProfile: UserProfile) => void;
  onEditEvent?: (eventId: string) => void;
  isEmbedded?: boolean;
}

export type MilestoneCategory = 'all' | 'core' | 'pension' | 'property' | 'life_event';

export interface TimelineMilestone {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  category: 'core' | 'property' | 'pension' | 'life_event' | 'horizon';
  age: number;
  year: number;
  color: string;
  icon: React.ElementType;
  description: string;
  isEditable: boolean;
  minAge?: number;
  maxAge?: number;
  amount?: number;
  type?: 'income' | 'expense' | 'milestone';
  badge?: string;
  owner?: 'primary' | 'partner' | 'joint';
  level?: number;
}

export const MilestoneTimelineCard: React.FC<MilestoneTimelineCardProps> = ({
  profile,
  pots,
  projections,
  onChange,
  onEditEvent,
  isEmbedded = false,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const currentAge = profile.currentAge || 40;
  const currentYear = new Date().getFullYear();
  const maxHorizon = profile.lifeExpectancyAge || 90;
  const minHorizon = Math.min(currentAge, 35);
  const totalYearsSpan = Math.max(1, maxHorizon - minHorizon);

  const [activeCategory, setActiveCategory] = useState<MilestoneCategory>('all');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('ms-target-retire');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventAge, setNewEventAge] = useState(65);
  const [newEventType, setNewEventType] = useState<LifeEventType>('expense');
  const [newEventAmount, setNewEventAmount] = useState(15000);
  const [newEventOwner, setNewEventOwner] = useState<'primary' | 'partner'>('primary');

  // Derive all milestones
  const allMilestones: TimelineMilestone[] = useMemo(() => {
    const list: TimelineMilestone[] = [];

    // 1. Current Age (Start of Plan)
    list.push({
      id: 'ms-start',
      key: 'start',
      label: 'Current Age',
      shortLabel: 'Current Age',
      category: 'core',
      age: currentAge,
      year: currentYear,
      color: '#0284c7', // sky-600
      icon: Clock,
      description: 'Starting point of financial plan and active wealth accumulation.',
      isEditable: false,
      badge: 'Active Now',
      owner: 'primary',
    });

    // 2. Mortgage Payoff (if configured)
    if (profile.mortgageDebt?.enabled && profile.mortgageDebt.remainingTermYears) {
      const payoffAge = currentAge + profile.mortgageDebt.remainingTermYears;
      if (payoffAge <= maxHorizon) {
        list.push({
          id: 'ms-mortgage-payoff',
          key: 'mortgage_payoff',
          label: 'Mortgage Cleared',
          shortLabel: 'Mortgage Free',
          category: 'property',
          age: payoffAge,
          year: currentYear + profile.mortgageDebt.remainingTermYears,
          color: '#0ea5e9', // cyan-500
          icon: Home,
          description: `Mortgage term ends, releasing £${Math.round(profile.mortgageDebt.monthlyPayment * 12).toLocaleString()}/yr of debt payments.`,
          isEditable: false,
          badge: 'Debt-Free',
          owner: 'joint',
        });
      }
    }

    // 3. Primary Pension Access (NMPA)
    const primaryNmpa = getPensionAccessAge(profile);
    list.push({
      id: 'ms-primary-nmpa',
      key: 'primary_nmpa',
      label: `${profile.name || 'Primary'} Pension Access`,
      shortLabel: 'Pension Access',
      category: 'pension',
      age: primaryNmpa,
      year: currentYear + (primaryNmpa - currentAge),
      color: '#10b981', // emerald-500
      icon: Coins,
      description: `Normal Minimum Pension Age (${primaryNmpa}). 25% Tax-Free Cash (PCLS) & flexible drawdown unlocked.`,
      isEditable: false,
      badge: 'PCLS Unlocked',
      owner: 'primary',
    });

    // 4. Partner Pension Access (NMPA)
    if (isCouple) {
      const partnerNmpa = getPartnerPensionAccessAge(profile);
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      const primaryAgeAtPartnerNmpa = partnerNmpa - partnerOffset;
      list.push({
        id: 'ms-partner-nmpa',
        key: 'partner_nmpa',
        label: `${profile.partnerName || 'Partner'} Pension Access`,
        shortLabel: 'Partner Access',
        category: 'pension',
        age: primaryAgeAtPartnerNmpa,
        year: currentYear + (primaryAgeAtPartnerNmpa - currentAge),
        color: '#34d399', // emerald-400
        icon: Coins,
        description: `${profile.partnerName || 'Partner'} reaches pension access age (${partnerNmpa}). SIPP/DC pots accessible.`,
        isEditable: false,
        badge: 'Partner NMPA',
        owner: 'partner',
      });
    }

    // 5. Target Retirement Age (Primary)
    const targetRetire = profile.targetRetirementAge || 60;
    list.push({
      id: 'ms-target-retire',
      key: 'target_retire',
      label: `${profile.name || 'Primary'} Retirement`,
      shortLabel: 'Retirement',
      category: 'core',
      age: targetRetire,
      year: currentYear + (targetRetire - currentAge),
      color: '#8b5cf6', // violet-500
      icon: Flag,
      description: `Primary earner retires and enters decumulation. Active portfolio drawdown begins.`,
      isEditable: true,
      minAge: Math.max(currentAge, 45),
      maxAge: 75,
      badge: 'Target Retire',
      owner: 'primary',
    });

    // 6. Target Retirement Age (Partner)
    if (isCouple && profile.partnerTargetRetirementAge) {
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      const primaryAgeAtPartnerRetire = profile.partnerTargetRetirementAge - partnerOffset;
      if (primaryAgeAtPartnerRetire !== targetRetire) {
        list.push({
          id: 'ms-partner-retire',
          key: 'partner_retire',
          label: `${profile.partnerName || 'Partner'} Retirement`,
          shortLabel: 'Partner Retire',
          category: 'core',
          age: primaryAgeAtPartnerRetire,
          year: currentYear + (primaryAgeAtPartnerRetire - currentAge),
          color: '#a855f7', // purple-500
          icon: Flag,
          description: `${profile.partnerName || 'Partner'} retires at partner age ${profile.partnerTargetRetirementAge}. Household fully retired.`,
          isEditable: true,
          minAge: Math.max(currentAge, 45),
          maxAge: 75,
          badge: 'Partner Retire',
          owner: 'partner',
        });
      }
    }

    // 7. Property Right-Sizing / Downsizing
    if (profile.propertyDownsizePlan?.enabled) {
      const dsAge = profile.propertyDownsizePlan.downsizeAge || 68;
      list.push({
        id: 'ms-downsizing',
        key: 'downsize',
        label: 'Right-Sizing Home',
        shortLabel: 'Downsize Home',
        category: 'property',
        age: dsAge,
        year: currentYear + (dsAge - currentAge),
        color: '#f59e0b', // amber-500
        icon: Building,
        description: `Sell property and move to rightsized home. Net equity released is injected into chosen retirement pots.`,
        isEditable: true,
        minAge: Math.max(currentAge, 50),
        maxAge: 85,
        badge: 'Equity Release',
        owner: 'joint',
      });
    }

    // 8. Primary State Pension Age
    const primarySpa = profile.statePensionAge || 67;
    list.push({
      id: 'ms-primary-spa',
      key: 'primary_spa',
      label: `${profile.name || 'Primary'} State Pension`,
      shortLabel: 'State Pension',
      category: 'pension',
      age: primarySpa,
      year: currentYear + (primarySpa - currentAge),
      color: '#6366f1', // indigo-500
      icon: ShieldCheck,
      description: `Guaranteed DWP State Pension commences (Triple-Lock indexed). Reduces reliance on private pot drawdowns.`,
      isEditable: true,
      minAge: 65,
      maxAge: 72,
      badge: 'State Pension',
      owner: 'primary',
    });

    // 9. Partner State Pension Age
    if (isCouple) {
      const partnerSpa = profile.partnerStatePensionAge || 67;
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      const primaryAgeAtPartnerSpa = partnerSpa - partnerOffset;
      if (primaryAgeAtPartnerSpa !== primarySpa) {
        list.push({
          id: 'ms-partner-spa',
          key: 'partner_spa',
          label: `${profile.partnerName || 'Partner'} State Pension`,
          shortLabel: 'Partner State Pension',
          category: 'pension',
          age: primaryAgeAtPartnerSpa,
          year: currentYear + (primaryAgeAtPartnerSpa - currentAge),
          color: '#818cf8', // indigo-400
          icon: ShieldCheck,
          description: `${profile.partnerName || 'Partner'} DWP State Pension commences at partner age ${partnerSpa}.`,
          isEditable: true,
          minAge: 65,
          maxAge: 72,
          badge: 'Partner State Pension',
          owner: 'partner',
        });
      }
    }

    // 10. UK Gilt Ladder Purchase (if enabled)
    if (profile.giltLadderConfig?.enabled) {
      const gPurchaseAge = profile.giltLadderConfig.purchaseAge ?? profile.giltLadderConfig.startAge ?? targetRetire;
      const gDuration = profile.giltLadderConfig.durationYears || 5;
      const gTarget = profile.giltLadderConfig.targetAnnualIncome || 25000;
      list.push({
        id: 'ms-gilt-ladder',
        key: 'gilt_purchase',
        label: 'UK Gilt Ladder Purchase',
        shortLabel: 'Gilt Ladder',
        category: 'pension',
        age: gPurchaseAge,
        year: currentYear + (gPurchaseAge - currentAge),
        color: '#059669', // emerald-600
        icon: Banknote,
        description: `Deploy capital into a ${gDuration}-year UK Gilt Ladder portfolio (£${Math.round(gTarget).toLocaleString()}/yr net income from age ${gPurchaseAge + 1} to ${gPurchaseAge + gDuration}). 0% Capital Gains Tax.`,
        isEditable: true,
        minAge: Math.max(currentAge, 50),
        maxAge: 80,
        badge: 'Gilt Purchase',
        owner: 'primary',
      });
    }

    // 11. Defined Benefit (DB) Pensions Start Dates
    (profile.dbPensions || [])
      .filter((db) => db.enabled && db.annualIncome > 0)
      .forEach((db, idx) => {
        const isPartner = db.owner === 'partner';
        const partnerOffset = isPartner ? (profile.partnerCurrentAge || currentAge) - currentAge : 0;
        const primaryAgeAtStart = db.startAge - partnerOffset;
        list.push({
          id: `ms-db-pension-${db.id || idx}`,
          key: `db_pension_${db.id || idx}`,
          label: `${db.name || 'Defined Benefit Pension'}`,
          shortLabel: db.name && db.name.length > 15 ? `${db.name.substring(0, 13)}...` : (db.name || 'DB Pension'),
          category: 'pension',
          age: primaryAgeAtStart,
          year: currentYear + (primaryAgeAtStart - currentAge),
          color: '#2563eb', // blue-600
          icon: Building,
          description: `Guaranteed Defined Benefit pension commences, paying £${Math.round(db.annualIncome).toLocaleString()}/yr${db.taxFreeLumpSum ? ` with £${Math.round(db.taxFreeLumpSum).toLocaleString()} tax-free lump sum` : ''}${db.inflationLinked ? ' (CPI inflation-linked)' : ' (fixed)'}.`,
          isEditable: true,
          minAge: Math.max(currentAge, 50),
          maxAge: 75,
          badge: 'DB Pension',
          owner: db.owner || 'primary',
        });
      });

    // 12. Guaranteed Annuity Purchase (Primary)
    const hasPrimaryAnnuity =
      profile.incomeProductOption === 'annuity' ||
      profile.incomeProductOption === 'hybrid' ||
      (profile.annuityFloorMode && profile.annuityFloorMode !== 'none');

    if (hasPrimaryAnnuity) {
      const annAge = profile.annuityPurchaseAge || profile.annuityFloorAge || targetRetire;
      const annRate = profile.annuityRatePercent || 6.0;
      const annAlloc = profile.annuityAllocationPercent || (profile.incomeProductOption === 'hybrid' ? 50 : 100);
      list.push({
        id: 'ms-annuity-purchase',
        key: 'annuity_purchase',
        label: `${profile.name || 'Primary'} Annuity Purchase`,
        shortLabel: 'Annuity Purchase',
        category: 'pension',
        age: annAge,
        year: currentYear + (annAge - currentAge),
        color: '#d97706', // amber-600
        icon: ShieldCheck,
        description: `Purchase guaranteed lifetime annuity (${annAlloc}% of pension pot at ${annRate}% benchmark rate) securing stable lifetime floor income.`,
        isEditable: true,
        minAge: Math.max(currentAge, 55),
        maxAge: 85,
        badge: 'Annuity',
        owner: 'primary',
      });
    }

    // Annuity Tranches (if custom tranches defined)
    (profile.annuityTranches || [])
      .filter((t) => t.enabled)
      .forEach((tranche, idx) => {
        const isPartner = tranche.owner === 'partner';
        const partnerOffset = isPartner ? (profile.partnerCurrentAge || currentAge) - currentAge : 0;
        const primaryAgeAtPurchase = tranche.purchaseAge - partnerOffset;
        list.push({
          id: `ms-annuity-tranche-${tranche.id || idx}`,
          key: `annuity_tranche_${tranche.id || idx}`,
          label: `${tranche.name || 'Annuity Tranche'}`,
          shortLabel: tranche.name && tranche.name.length > 15 ? `${tranche.name.substring(0, 13)}...` : (tranche.name || 'Annuity Tranche'),
          category: 'pension',
          age: primaryAgeAtPurchase,
          year: currentYear + (primaryAgeAtPurchase - currentAge),
          color: '#b45309', // amber-700
          icon: ShieldCheck,
          description: `Purchase guaranteed annuity tranche (${tranche.allocationPercent}% of pension pot at age ${tranche.purchaseAge}).`,
          isEditable: true,
          minAge: Math.max(currentAge, 55),
          maxAge: 85,
          badge: 'Annuity Tranche',
          owner: tranche.owner || 'primary',
        });
      });

    // Partner Annuity (if couple mode and partner has annuity enabled)
    if (isCouple && (profile.partnerIncomeProductOption === 'annuity' || profile.partnerIncomeProductOption === 'hybrid')) {
      const partnerRetire = profile.partnerTargetRetirementAge || targetRetire;
      const partnerAnnAge = profile.partnerAnnuityPurchaseAge || partnerRetire;
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      const primaryAgeAtPartnerAnn = partnerAnnAge - partnerOffset;
      list.push({
        id: 'ms-partner-annuity-purchase',
        key: 'partner_annuity_purchase',
        label: `${profile.partnerName || 'Partner'} Annuity Purchase`,
        shortLabel: 'Partner Annuity',
        category: 'pension',
        age: primaryAgeAtPartnerAnn,
        year: currentYear + (primaryAgeAtPartnerAnn - currentAge),
        color: '#f59e0b', // amber-500
        icon: ShieldCheck,
        description: `${profile.partnerName || 'Partner'} purchases guaranteed lifetime annuity (${profile.partnerAnnuityAllocationPercent || 100}% of partner pension pot).`,
        isEditable: true,
        minAge: Math.max(currentAge, 55),
        maxAge: 85,
        badge: 'Partner Annuity',
        owner: 'partner',
      });
    }

    // 13. Custom Decumulation Life Events
    (profile.decumulationLifeEvents || [])
      .filter((e) => e.enabled)
      .forEach((event) => {
        const isIncome = event.type === 'income';
        list.push({
          id: `ms-event-${event.id}`,
          key: `event_${event.id}`,
          label: event.name,
          shortLabel: event.name.length > 15 ? `${event.name.substring(0, 13)}...` : event.name,
          category: 'life_event',
          age: event.age,
          year: currentYear + (event.age - currentAge),
          color: isIncome ? '#10b981' : '#ec4899', // emerald for inflow, pink for outflow
          icon: isIncome ? TrendingUp : TrendingDown,
          description: `${isIncome ? 'Capital Inflow' : 'One-off Expenditure'} of £${Math.round(event.amount).toLocaleString()} (${event.targetPot || 'General'} pot).`,
          isEditable: true,
          minAge: currentAge,
          maxAge: maxHorizon,
          amount: event.amount,
          type: event.type,
          badge: isIncome ? '+ Inflow' : '- Outflow',
          owner: event.owner || 'primary',
        });
      });

    // 14. Life Expectancy Horizon
    list.push({
      id: 'ms-horizon',
      key: 'horizon',
      label: 'Life Expectancy',
      shortLabel: 'Horizon',
      category: 'horizon',
      age: maxHorizon,
      year: currentYear + (maxHorizon - currentAge),
      color: '#ef4444', // rose-500
      icon: Heart,
      description: `Plan planning horizon age (${maxHorizon}). Terminal wealth evaluated.`,
      isEditable: true,
      minAge: 75,
      maxAge: 105,
      badge: 'Horizon',
      owner: 'joint',
    });

    const sorted = list.sort((a, b) => a.age - b.age);

    // Exact non-overlapping level assignment algorithm:
    // Finds the lowest vertical level (0..4) that has at least 7 years of horizontal separation
    const minClearanceYears = 7;
    const lastAgeByLevel = [-100, -100, -100, -100, -100];

    return sorted.map((m) => {
      let chosenLevel = 0;
      let maxSep = -1;
      let fallbackLevel = 0;

      for (let lvl = 0; lvl < 5; lvl++) {
        const sep = m.age - lastAgeByLevel[lvl];
        if (sep >= minClearanceYears) {
          chosenLevel = lvl;
          break;
        }
        if (sep > maxSep) {
          maxSep = sep;
          fallbackLevel = lvl;
        }
        if (lvl === 4) {
          chosenLevel = fallbackLevel;
        }
      }

      lastAgeByLevel[chosenLevel] = m.age;
      return { ...m, level: chosenLevel };
    });
  }, [profile, currentAge, currentYear, maxHorizon, isCouple]);

  // Filtered milestones based on category
  const filteredMilestones = useMemo(() => {
    if (activeCategory === 'all') return allMilestones;
    return allMilestones.filter((m) => m.category === activeCategory);
  }, [allMilestones, activeCategory]);

  const activeMilestone = useMemo(() => {
    return (
      allMilestones.find((m) => m.id === selectedMilestoneId) ||
      allMilestones.find((m) => m.key === 'target_retire') ||
      allMilestones[0]
    );
  }, [allMilestones, selectedMilestoneId]);

  // Projection snapshot for active milestone
  const milestoneProjection = useMemo(() => {
    if (!activeMilestone) return null;
    return projections.find((p) => p.age === activeMilestone.age) || null;
  }, [projections, activeMilestone]);

  // Update handler
  const handleUpdateAge = (milestone: TimelineMilestone, newAge: number) => {
    const clampedAge = Math.max(
      milestone.minAge ?? currentAge,
      Math.min(milestone.maxAge ?? 100, newAge)
    );

    if (milestone.key === 'target_retire') {
      onChange({ ...profile, targetRetirementAge: clampedAge });
    } else if (milestone.key === 'partner_retire') {
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      onChange({ ...profile, partnerTargetRetirementAge: clampedAge + partnerOffset });
    } else if (milestone.key === 'downsize') {
      if (profile.propertyDownsizePlan) {
        onChange({
          ...profile,
          propertyDownsizePlan: {
            ...profile.propertyDownsizePlan,
            downsizeAge: clampedAge,
          },
        });
      }
    } else if (milestone.key === 'primary_spa') {
      onChange({ ...profile, statePensionAge: clampedAge });
    } else if (milestone.key === 'partner_spa') {
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      onChange({ ...profile, partnerStatePensionAge: clampedAge + partnerOffset });
    } else if (milestone.key === 'horizon') {
      if (onChange) onChange({ ...profile, lifeExpectancyAge: clampedAge });
    } else if (milestone.key === 'gilt_purchase') {
      if (onChange && profile.giltLadderConfig) {
        onChange({
          ...profile,
          giltLadderConfig: {
            ...profile.giltLadderConfig,
            purchaseAge: clampedAge,
            startAge: clampedAge,
          },
        });
      }
    } else if (milestone.key.startsWith('db_pension_')) {
      const dbId = milestone.key.replace('db_pension_', '');
      const updatedDb = (profile.dbPensions || []).map((db, idx) => {
        if (db.id === dbId || String(idx) === dbId) {
          const isPartner = db.owner === 'partner';
          const partnerOffset = isPartner ? (profile.partnerCurrentAge || currentAge) - currentAge : 0;
          return { ...db, startAge: clampedAge + partnerOffset };
        }
        return db;
      });
      if (onChange) onChange({ ...profile, dbPensions: updatedDb });
    } else if (milestone.key === 'annuity_purchase') {
      if (onChange) {
        onChange({
          ...profile,
          annuityPurchaseAge: clampedAge,
          annuityFloorAge: profile.annuityFloorAge ? clampedAge : undefined,
        });
      }
    } else if (milestone.key === 'partner_annuity_purchase') {
      const partnerOffset = (profile.partnerCurrentAge || currentAge) - currentAge;
      if (onChange) onChange({ ...profile, partnerAnnuityPurchaseAge: clampedAge + partnerOffset });
    } else if (milestone.key.startsWith('annuity_tranche_')) {
      const trancheId = milestone.key.replace('annuity_tranche_', '');
      const updatedTranches = (profile.annuityTranches || []).map((t, idx) => {
        if (t.id === trancheId || String(idx) === trancheId) {
          const isPartner = t.owner === 'partner';
          const partnerOffset = isPartner ? (profile.partnerCurrentAge || currentAge) - currentAge : 0;
          return { ...t, purchaseAge: clampedAge + partnerOffset };
        }
        return t;
      });
      if (onChange) onChange({ ...profile, annuityTranches: updatedTranches });
    } else if (milestone.key.startsWith('event_')) {
      const eventId = milestone.key.replace('event_', '');
      const updatedEvents = (profile.decumulationLifeEvents || []).map((e) =>
        e.id === eventId ? { ...e, age: clampedAge } : e
      );
      if (onChange) onChange({ ...profile, decumulationLifeEvents: updatedEvents });
    }
  };

  // Add new event handler
  const handleCreateNewEvent = () => {
    if (!newEventName.trim()) return;

    const newEvent: DecumulationLifeEvent = {
      id: `event_${Date.now()}`,
      name: newEventName.trim(),
      age: newEventAge,
      type: newEventType,
      amount: newEventAmount,
      owner: newEventOwner,
      enabled: true,
      inflationLinked: true,
    };

    const updated = [...(profile.decumulationLifeEvents || []), newEvent];
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });

    setNewEventName('');
    setIsAddModalOpen(false);
  };

  // Delete event handler
  const handleDeleteEvent = (milestone: TimelineMilestone) => {
    if (!milestone.key.startsWith('event_')) return;
    const eventId = milestone.key.replace('event_', '');
    const updated = (profile.decumulationLifeEvents || []).filter((e) => e.id !== eventId);
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
  };

  // Helper for percentage position on timeline
  const getPercentPosition = (age: number) => {
    const pct = ((age - minHorizon) / totalYearsSpan) * 100;
    return Math.max(3, Math.min(97, pct));
  };

  // Retirement phases definitions for background bands
  const targetRetireAge = profile.targetRetirementAge || 60;
  const phase1End = targetRetireAge;
  const phase2End = Math.min(maxHorizon, Math.max(phase1End, 72));
  const phase3End = Math.min(maxHorizon, Math.max(phase2End, 82));

  // Key reference years for background ruler ticks
  const rulerTicks = useMemo(() => {
    const ticks: { age: number; year: number; pct: number }[] = [];
    for (let a = Math.ceil(minHorizon / 10) * 10; a <= maxHorizon; a += 10) {
      ticks.push({
        age: a,
        year: currentYear + (a - currentAge),
        pct: getPercentPosition(a),
      });
    }
    return ticks;
  }, [minHorizon, maxHorizon, currentAge, currentYear]);

  return (
    <div className={
      isEmbedded 
        ? "space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800" 
        : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6"
    }>
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-sm shadow-indigo-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Visual Milestone Timeline
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                Interactive Map
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live roadmap of your financial lifecycle. Click pins to inspect cash flow impacts or adjust target dates in real-time.
            </p>
          </div>
        </div>

        {/* Action Controls & Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({allMilestones.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('core')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'core'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retirement
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('pension')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'pension'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pensions
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('property')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'property'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Property
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('life_event')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'life_event'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Events
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div className="relative bg-slate-50/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 pt-56 pb-8 px-4 sm:px-8 select-none space-y-8 overflow-hidden shadow-inner">
        {/* Subtle Background Vertical Ruler Guides */}
        <div className="absolute inset-0 pointer-events-none">
          {rulerTicks.map((t) => (
            <div
              key={`grid-${t.age}`}
              style={{ left: `${t.pct}%` }}
              className="absolute top-0 bottom-0 border-r border-slate-200/40 dark:border-slate-800/40"
            />
          ))}
        </div>

        {/* Central Horizontal Track Line with Upright Map Pins */}
        <div className="relative h-2.5 bg-linear-to-r from-sky-500 via-indigo-500 via-amber-500 to-rose-500 rounded-full my-6 shadow-sm shadow-indigo-500/20">
          {filteredMilestones.map((m) => {
            const leftPct = getPercentPosition(m.age);
            const isSelected = m.id === activeMilestone.id;
            const IconComponent = m.icon;
            const lvl = m.level ?? 0;

            // Exact pixel-perfect vertical clearances (48px separation between each level)
            const bottomPx = 18 + lvl * 48;
            const stemHeightPx = 18 + lvl * 48;

            return (
              <div
                key={m.id}
                style={{ left: `${leftPct}%` }}
                className="absolute top-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              >
                {/* Vertical Solid Connector Stalk */}
                <div
                  style={{
                    backgroundColor: m.color,
                    height: `${stemHeightPx}px`,
                  }}
                  className={`absolute bottom-2.5 w-0.5 opacity-80 transition-all ${
                    isSelected ? 'w-1 opacity-100 shadow-sm' : ''
                  }`}
                />

                {/* Upright Milestone Card Tag */}
                <button
                  type="button"
                  onClick={() => setSelectedMilestoneId(m.id)}
                  style={{
                    bottom: `${bottomPx}px`,
                  }}
                  className={`absolute p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-md transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5 border ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-110 ring-2 ring-indigo-500 shadow-xl border-transparent z-30'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:scale-105 z-20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{ backgroundColor: m.color }}
                      className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900"
                    />
                    <span className="truncate max-w-[130px]">{m.shortLabel}</span>
                  </div>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded text-[9.5px]">
                    Age {m.age} • {m.year}
                  </span>

                  {/* Downward Pointer Triangle */}
                  <div
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white border-transparent'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  />
                </button>

                {/* Glowing Axis Circular Pin Node */}
                <button
                  type="button"
                  onClick={() => setSelectedMilestoneId(m.id)}
                  style={{ backgroundColor: m.color }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 cursor-pointer z-30 ring-2 ring-white dark:ring-slate-900 ${
                    isSelected
                      ? 'scale-125 ring-4 ring-indigo-400/50 dark:ring-indigo-500/70 shadow-indigo-500/40 shadow-lg'
                      : 'hover:scale-115'
                  }`}
                  title={`${m.label} (Age ${m.age})`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </button>

                {/* Year Label below node */}
                <span className="absolute top-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {m.year}
                </span>
              </div>
            );
          })}
        </div>

        {/* 4 Connected Visual Retirement Phase Cards (Elevated UI) */}
        <div className="space-y-2 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {/* Phase 1: Accumulation */}
            <div className="p-3 rounded-2xl bg-linear-to-br from-sky-50 to-blue-50/50 dark:from-sky-950/40 dark:to-blue-950/20 border border-sky-200/80 dark:border-sky-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Accumulation
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                Ages {minHorizon} – {phase1End}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Active savings &amp; maximum compound growth.
              </p>
            </div>

            {/* Phase 2: Go-Go Active */}
            <div className="p-3 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Go-Go Active
                </span>
                <Sun className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                Ages {phase1End} – {phase2End}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Peak travel, leisure, bucket lists &amp; lifestyle.
              </p>
            </div>

            {/* Phase 3: Slow-Go Leisure */}
            <div className="p-3 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Slow-Go Leisure
                </span>
                <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                Ages {phase2End} – {phase3End}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Moderate living, local hobbies &amp; reduced spend.
              </p>
            </div>

            {/* Phase 4: No-Go Elder Care */}
            <div className="p-3 rounded-2xl bg-linear-to-br from-purple-50 to-rose-50/50 dark:from-purple-950/40 dark:to-rose-950/20 border border-purple-200/80 dark:border-purple-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  No-Go Care
                </span>
                <HeartHandshake className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                Ages {phase3End} – {maxHorizon}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Health, comfort, estate preservation &amp; IHT.
              </p>
            </div>
          </div>

          {/* Age Scale Reference Ticks */}
          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 pt-1">
            {rulerTicks.map((t) => (
              <span key={`tick-${t.age}`}>
                Age {t.age} ({t.year})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Add Milestone Button (Moved below timeline chart) */}
      <div className="flex justify-center -mt-2 mb-4">
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Milestone Event</span>
        </button>
      </div>

      {/* Selected Milestone Inspector & Live Stepper Controls */}
      {activeMilestone && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-5 animate-fade-in">
          {/* Title & Live Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700/60 pb-4">
            <div className="flex items-center gap-3.5">
              <div
                style={{ backgroundColor: activeMilestone.color }}
                className="p-3 rounded-2xl text-white shadow-sm"
              >
                <activeMilestone.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {activeMilestone.label}
                  </h4>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {activeMilestone.badge}
                  </span>
                  {activeMilestone.owner && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 capitalize">
                      {activeMilestone.owner}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeMilestone.description}
                </p>
              </div>
            </div>

            {/* Live Age Stepper Controls & Delete Option */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeMilestone.key.startsWith('event_') && onEditEvent && (
                <button
                  type="button"
                  onClick={() => onEditEvent(activeMilestone.key.replace('event_', ''))}
                  className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer"
                  title="Edit Custom Life Event"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {activeMilestone.key.startsWith('event_') && (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(activeMilestone)}
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                  title="Delete Custom Life Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {activeMilestone.isEditable ? (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
                    Target Age:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateAge(activeMilestone, activeMilestone.age - 1)}
                    disabled={activeMilestone.age <= (activeMilestone.minAge ?? currentAge)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Decrease Age by 1 Year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 px-2 min-w-8 text-center">
                    {activeMilestone.age}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateAge(activeMilestone, activeMilestone.age + 1)}
                    disabled={activeMilestone.age >= (activeMilestone.maxAge ?? 100)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Increase Age by 1 Year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Fixed Statutory Rule (Age {activeMilestone.age})
                </div>
              )}
            </div>
          </div>

          {/* Milestone Financial Projection Impact Cards */}
          {milestoneProjection ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Total Pot Assets
                  </span>
                  <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  £{Math.round(milestoneProjection.totalPot || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  ISA + SIPP + Cash/GIA
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Net Living Income
                  </span>
                  <Coins className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  £{Math.round(milestoneProjection.netRetirementIncome || milestoneProjection.netIncomeReceived || 0).toLocaleString()}/yr
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  £{Math.round((milestoneProjection.netRetirementIncome || milestoneProjection.netIncomeReceived || 0) / 12).toLocaleString()}/mo spendable
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Guaranteed Floor
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  £{Math.round(
                    (milestoneProjection.statePensionReceived || 0) +
                    (milestoneProjection.dbPensionIncomeReceived || 0) +
                    (milestoneProjection.annuityIncomeReceived || 0)
                  ).toLocaleString()}/yr
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  State + DB + Annuity
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Annual UK Tax
                  </span>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span className="text-base font-black text-rose-500 dark:text-rose-400">
                  £{Math.round(milestoneProjection.totalTaxPaid || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  HMRC Income Tax &amp; NI
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 italic">
              Projection data for Age {activeMilestone.age} is outside the active simulation range.
            </div>
          )}
        </div>
      )}

      {/* Grid of All Milestones for Quick Scanning */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Roadmap Milestones List
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Click any milestone card to inspect &amp; adjust
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMilestones.map((m) => {
            const isSelected = m.id === activeMilestone.id;
            const IconComponent = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMilestoneId(m.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    style={{ backgroundColor: m.color }}
                    className="p-2 rounded-xl text-white shrink-0 shadow-2xs"
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      {m.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {m.badge} • Year {m.year}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block">
                    Age {m.age}
                  </span>
                  {m.amount && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      £{Math.round(m.amount).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Milestone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Add Life Milestone Event
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. World Tour Cruise, Wedding, Inheritance"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Age
                  </label>
                  <input
                    type="number"
                    min={currentAge}
                    max={maxHorizon}
                    value={newEventAge}
                    onChange={(e) => setNewEventAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Event Type
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as LifeEventType)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="expense">Expense (- Outflow)</option>
                    <option value="income">Income (+ Inflow)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount (£ in today's money)
                </label>
                <input
                  type="number"
                  step={1000}
                  value={newEventAmount}
                  onChange={(e) => setNewEventAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {isCouple && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Owner
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewEventOwner('primary')}
                      className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                        newEventOwner === 'primary'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {profile.name || 'Primary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventOwner('partner')}
                      className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                        newEventOwner === 'partner'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {profile.partnerName || 'Partner'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewEvent}
                disabled={!newEventName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Save Milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
