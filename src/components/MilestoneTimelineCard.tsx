import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  InvestmentPots,
  YearProjection,
  DecumulationLifeEvent,
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
  Clock,
  Heart,
  Plane,
  Gift,
  Layers,
  AlertCircle,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface MilestoneTimelineCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
}

export interface TimelineMilestone {
  id: string;
  key: string;
  label: string;
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
}

export const MilestoneTimelineCard: React.FC<MilestoneTimelineCardProps> = ({
  profile,
  pots,
  projections,
  onChange,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const currentAge = profile.currentAge || 40;
  const currentYear = new Date().getFullYear();
  const maxHorizon = profile.lifeExpectancyAge || 90;
  const minHorizon = Math.min(currentAge, 35);
  const totalYearsSpan = Math.max(1, maxHorizon - minHorizon);

  // Derive key milestones
  const milestones: TimelineMilestone[] = useMemo(() => {
    const list: TimelineMilestone[] = [];

    // 1. Current Age (Start of Plan)
    list.push({
      id: 'ms-start',
      key: 'start',
      label: 'Current Age',
      category: 'core',
      age: currentAge,
      year: currentYear,
      color: '#0284c7', // sky-600
      icon: Clock,
      description: 'Starting point of financial plan and active accumulation.',
      isEditable: false,
      badge: 'Active Now',
    });

    // 2. Mortgage Payoff (if configured)
    if (profile.mortgageDebt?.enabled && profile.mortgageDebt.remainingTermYears) {
      const payoffAge = currentAge + profile.mortgageDebt.remainingTermYears;
      if (payoffAge <= maxHorizon) {
        list.push({
          id: 'ms-mortgage-payoff',
          key: 'mortgage_payoff',
          label: 'Mortgage Cleared',
          category: 'property',
          age: payoffAge,
          year: currentYear + profile.mortgageDebt.remainingTermYears,
          color: '#0ea5e9', // cyan-500
          icon: Home,
          description: `Standard mortgage term concludes, freeing up £${Math.round(profile.mortgageDebt.monthlyPayment * 12).toLocaleString()}/yr of cash flow.`,
          isEditable: false,
          badge: 'Debt-Free',
        });
      }
    }

    // 3. Primary Pension Access (NMPA)
    const primaryNmpa = getPensionAccessAge(profile);
    list.push({
      id: 'ms-primary-nmpa',
      key: 'primary_nmpa',
      label: `${profile.name || 'Primary'} Pension Access (NMPA)`,
      category: 'pension',
      age: primaryNmpa,
      year: currentYear + (primaryNmpa - currentAge),
      color: '#10b981', // emerald-500
      icon: Coins,
      description: `Normal Minimum Pension Age (${primaryNmpa}) reached. 25% Tax-Free Cash (PCLS) & flexible drawdown unlocked.`,
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
        category: 'pension',
        age: primaryAgeAtPartnerNmpa,
        year: currentYear + (primaryAgeAtPartnerNmpa - currentAge),
        color: '#34d399', // emerald-400
        icon: Coins,
        description: `${profile.partnerName || 'Partner'} reaches pension access age (${partnerNmpa}). Partner SIPP/DC pots unlocked.`,
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
      category: 'core',
      age: targetRetire,
      year: currentYear + (targetRetire - currentAge),
      color: '#8b5cf6', // violet-500
      icon: Flag,
      description: `Primary earner leaves employment and enters decumulation phase. Active portfolio drawdown begins.`,
      isEditable: true,
      minAge: Math.max(currentAge, 45),
      maxAge: 75,
      badge: 'Target Retirement',
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
          category: 'core',
          age: primaryAgeAtPartnerRetire,
          year: currentYear + (primaryAgeAtPartnerRetire - currentAge),
          color: '#a855f7', // purple-500
          icon: Flag,
          description: `${profile.partnerName || 'Partner'} retires at partner age ${profile.partnerTargetRetirementAge}. Combined household fully retired.`,
          isEditable: true,
          minAge: Math.max(currentAge, 45),
          maxAge: 75,
          badge: 'Partner Retirement',
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
      });
    }

    // 8. Primary State Pension Age
    const primarySpa = profile.statePensionAge || 67;
    list.push({
      id: 'ms-primary-spa',
      key: 'primary_spa',
      label: `${profile.name || 'Primary'} State Pension`,
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

    // 10. Custom Decumulation Life Events
    (profile.decumulationLifeEvents || [])
      .filter((e) => e.enabled)
      .forEach((event) => {
        const isIncome = event.type === 'income';
        list.push({
          id: `ms-event-${event.id}`,
          key: `event_${event.id}`,
          label: event.name,
          category: 'life_event',
          age: event.age,
          year: currentYear + (event.age - currentAge),
          color: isIncome ? '#10b981' : '#ec4899', // emerald for inflow, pink for outflow
          icon: isIncome ? TrendingUp : Plane,
          description: `${isIncome ? 'Capital Inflow' : 'One-Off Expenditure'} of £${Math.round(event.amount).toLocaleString()} (${event.targetPot || 'General'} pot).`,
          isEditable: true,
          minAge: currentAge,
          maxAge: maxHorizon,
          amount: event.amount,
          type: event.type,
          badge: isIncome ? '+ Inflow' : '- Outflow',
          owner: event.owner,
        });
      });

    // 11. Life Expectancy Horizon
    list.push({
      id: 'ms-horizon',
      key: 'horizon',
      label: 'Life Expectancy (Horizon)',
      category: 'horizon',
      age: maxHorizon,
      year: currentYear + (maxHorizon - currentAge),
      color: '#ef4444', // rose-500
      icon: Heart,
      description: `Plan planning horizon age (${maxHorizon}). Target terminal legacy wealth evaluated.`,
      isEditable: true,
      minAge: 75,
      maxAge: 105,
      badge: 'Planning Horizon',
    });

    // Sort chronologically by age
    return list.sort((a, b) => a.age - b.age);
  }, [profile, currentAge, currentYear, maxHorizon, isCouple]);

  // Active selected milestone
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    milestones.find((m) => m.key === 'target_retire')?.id || milestones[0]?.id
  );

  const activeMilestone = useMemo(() => {
    return milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];
  }, [milestones, selectedMilestoneId]);

  // Projected data for selected milestone age
  const milestoneProjection = useMemo(() => {
    if (!activeMilestone) return null;
    return projections.find((p) => p.age === activeMilestone.age) || null;
  }, [projections, activeMilestone]);

  // Handler to adjust milestone age
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
      onChange({ ...profile, lifeExpectancyAge: clampedAge });
    } else if (milestone.key.startsWith('event_')) {
      const eventId = milestone.key.replace('event_', '');
      const updatedEvents = (profile.decumulationLifeEvents || []).map((e) =>
        e.id === eventId ? { ...e, age: clampedAge } : e
      );
      onChange({ ...profile, decumulationLifeEvents: updatedEvents });
    }
  };

  // Helper to calculate X percentage position on timeline
  const getPercentPosition = (age: number) => {
    const pct = ((age - minHorizon) / totalYearsSpan) * 100;
    return Math.max(2, Math.min(98, pct));
  };

  // Retirement phases definitions for background bands
  const targetRetireAge = profile.targetRetirementAge || 60;
  const phase1End = targetRetireAge;
  const phase2End = Math.min(maxHorizon, Math.max(phase1End, 72));
  const phase3End = Math.min(maxHorizon, Math.max(phase2End, 82));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Visual Interactive Milestone Timeline
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full">
                Interactive Demo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any milestone to inspect its financial impact or adjust dates with the stepper controls. Changes immediately recalculate your forecast.
            </p>
          </div>
        </div>

        {/* Quick summary chip */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>{milestones.length} Milestones Plotted</span>
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div className="relative pt-8 pb-4 px-2 sm:px-4 select-none">
        {/* Phase Background Bands */}
        <div className="h-10 w-full rounded-2xl overflow-hidden flex shadow-inner border border-slate-200/80 dark:border-slate-700/60 opacity-90">
          {/* 1. Accumulation Phase */}
          <div
            style={{ width: `${Math.max(5, getPercentPosition(phase1End) - getPercentPosition(minHorizon))}%` }}
            className="bg-linear-to-r from-sky-500/20 to-blue-500/20 dark:from-sky-950/50 dark:to-blue-950/50 border-r border-blue-300/40 dark:border-blue-700/40 flex items-center justify-center px-2 relative group"
            title={`Accumulation Phase: Ages ${minHorizon} to ${phase1End}`}
          >
            <span className="text-[10px] font-extrabold tracking-tight text-blue-700 dark:text-blue-300 truncate">
              Accumulation ({minHorizon}–{phase1End})
            </span>
          </div>

          {/* 2. Go-Go Active Retirement */}
          <div
            style={{ width: `${Math.max(5, getPercentPosition(phase2End) - getPercentPosition(phase1End))}%` }}
            className="bg-linear-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-950/50 dark:to-teal-950/50 border-r border-emerald-300/40 dark:border-emerald-700/40 flex items-center justify-center px-2 group"
            title={`Go-Go Active Phase: Ages ${phase1End} to ${phase2End}`}
          >
            <span className="text-[10px] font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300 truncate">
              Go-Go Active ({phase1End}–{phase2End})
            </span>
          </div>

          {/* 3. Slow-Go Leisure */}
          <div
            style={{ width: `${Math.max(5, getPercentPosition(phase3End) - getPercentPosition(phase2End))}%` }}
            className="bg-linear-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-950/50 dark:to-orange-950/50 border-r border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center px-2 group"
            title={`Slow-Go Leisure Phase: Ages ${phase2End} to ${phase3End}`}
          >
            <span className="text-[10px] font-extrabold tracking-tight text-amber-700 dark:text-amber-300 truncate">
              Slow-Go ({phase2End}–{phase3End})
            </span>
          </div>

          {/* 4. No-Go Elder Care */}
          <div
            style={{ width: `${Math.max(5, 100 - getPercentPosition(phase3End))}%` }}
            className="bg-linear-to-r from-purple-500/20 to-rose-500/20 dark:from-purple-950/50 dark:to-rose-950/50 flex items-center justify-center px-2 group"
            title={`No-Go Elder Care Phase: Ages ${phase3End} to ${maxHorizon}`}
          >
            <span className="text-[10px] font-extrabold tracking-tight text-purple-700 dark:text-purple-300 truncate">
              No-Go ({phase3End}–{maxHorizon})
            </span>
          </div>
        </div>

        {/* Central Axis Line */}
        <div className="relative h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full my-6">
          {/* Milestone Node Markers */}
          {milestones.map((m) => {
            const leftPct = getPercentPosition(m.age);
            const isSelected = m.id === selectedMilestoneId;
            const IconComponent = m.icon;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMilestoneId(m.id)}
                style={{ left: `${leftPct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer transition-all duration-200 z-10"
              >
                {/* Node Pill Tag on Hover / Selected */}
                <div
                  className={`absolute -top-9 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-md transition-all duration-200 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-105 opacity-100 ring-2 ring-indigo-500'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-85 group-hover:opacity-100 group-hover:scale-105'
                  }`}
                >
                  <span className="mr-1">{m.label.split(' ')[0]}</span>
                  <span className="font-extrabold">Age {m.age}</span>
                </div>

                {/* Glowing Circular Node */}
                <div
                  style={{ backgroundColor: m.color }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-200 ${
                    isSelected
                      ? 'scale-125 ring-4 ring-indigo-400/40 dark:ring-indigo-500/60 shadow-lg'
                      : 'group-hover:scale-115'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Calendar Year Tag below */}
                <span className="absolute -bottom-5 text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {m.year}
                </span>
              </button>
            );
          })}
        </div>

        {/* Age Scale Ticks */}
        <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
          <span>Age {minHorizon} ({currentYear - (currentAge - minHorizon)})</span>
          <span>Age 50</span>
          <span>Age 60</span>
          <span>Age 70</span>
          <span>Age 80</span>
          <span>Age {maxHorizon} ({currentYear + (maxHorizon - currentAge)})</span>
        </div>
      </div>

      {/* Selected Milestone Inspector & Live Adjuster Panel */}
      {activeMilestone && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: activeMilestone.color }}
                className="p-2.5 rounded-xl text-white shadow-xs"
              >
                <activeMilestone.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {activeMilestone.label}
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {activeMilestone.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeMilestone.description}
                </p>
              </div>
            </div>

            {/* Live Age Adjuster Buttons */}
            {activeMilestone.isEditable ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-auto">
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
              <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
                Fixed Rule (Age {activeMilestone.age})
              </div>
            )}
          </div>

          {/* Financial Metrics at this Milestone */}
          {milestoneProjection ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Total Pot Value
                </span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  £{Math.round(milestoneProjection.totalPot || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  ISA + SIPP + Cash/GIA
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Net Living Cash
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  £{Math.round(milestoneProjection.netRetirementIncome || milestoneProjection.netIncomeReceived || 0).toLocaleString()}/yr
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  £{Math.round((milestoneProjection.netRetirementIncome || milestoneProjection.netIncomeReceived || 0) / 12).toLocaleString()}/mo spendable
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Guaranteed Floor
                </span>
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

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Annual Tax Liability
                </span>
                <span className="text-base font-black text-rose-500 dark:text-rose-400">
                  £{Math.round(milestoneProjection.totalTaxPaid || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Income Tax &amp; NI
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
    </div>
  );
};
