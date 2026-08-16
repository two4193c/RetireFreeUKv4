import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Info,
  DollarSign,
  Wallet,
  X,
} from 'lucide-react';

interface MilestoneTimelineCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
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
}

interface PositionedMilestone extends TimelineMilestone {
  anchorX: number; // Pixel X position on the axis
  labelX: number;  // Pixel X position for the callout card
  labelY: number;  // Pixel Y position for the callout card
  level: number;   // 0 (lowest top), 1 (mid top), 2 (highest top)
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  const [activeCategory, setActiveCategory] = useState<MilestoneCategory>('all');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('ms-target-retire');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventAge, setNewEventAge] = useState(65);
  const [newEventType, setNewEventType] = useState<LifeEventType>('expense');
  const [newEventAmount, setNewEventAmount] = useState(15000);
  const [newEventOwner, setNewEventOwner] = useState<'primary' | 'partner'>('primary');

  // Measure container width responsively
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

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
      description: 'Starting point of financial plan and active accumulation.',
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
          shortLabel: 'Mortgage Paid',
          category: 'property',
          age: payoffAge,
          year: currentYear + profile.mortgageDebt.remainingTermYears,
          color: '#0ea5e9', // cyan-500
          icon: Home,
          description: `Mortgage cleared, freeing up £${Math.round(profile.mortgageDebt.monthlyPayment * 12).toLocaleString()}/yr of spendable cash.`,
          isEditable: false,
          badge: 'Debt Free',
          owner: 'joint',
        });
      }
    }

    // 3. Primary Pension Access (NMPA)
    const primaryNmpa = getPensionAccessAge(profile);
    list.push({
      id: 'ms-primary-nmpa',
      key: 'primary_nmpa',
      label: `${profile.name || 'Primary'} Pension Access (NMPA)`,
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
        shortLabel: 'Partner NMPA',
        category: 'pension',
        age: primaryAgeAtPartnerNmpa,
        year: currentYear + (primaryAgeAtPartnerNmpa - currentAge),
        color: '#34d399', // emerald-400
        icon: Coins,
        description: `${profile.partnerName || 'Partner'} reaches pension access age (${partnerNmpa}). Partner pots accessible.`,
        isEditable: false,
        badge: 'Partner Access',
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
      description: `Primary earner leaves employment and enters decumulation. Active portfolio drawdown begins.`,
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

    // 10. Custom Decumulation Life Events
    (profile.decumulationLifeEvents || [])
      .filter((e) => e.enabled)
      .forEach((event) => {
        const isIncome = event.type === 'income';
        list.push({
          id: `ms-event-${event.id}`,
          key: `event_${event.id}`,
          label: event.name,
          shortLabel: event.name.length > 16 ? `${event.name.substring(0, 14)}...` : event.name,
          category: 'life_event',
          age: event.age,
          year: currentYear + (event.age - currentAge),
          color: isIncome ? '#10b981' : '#ec4899', // emerald for inflow, pink for outflow
          icon: isIncome ? TrendingUp : Plane,
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

    // 11. Life Expectancy Horizon
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
      description: `Plan planning horizon age (${maxHorizon}). Terminal legacy wealth evaluated.`,
      isEditable: true,
      minAge: 75,
      maxAge: 105,
      badge: 'Horizon',
      owner: 'joint',
    });

    return list.sort((a, b) => a.age - b.age);
  }, [profile, currentAge, currentYear, maxHorizon, isCouple]);

  // Filtered milestones based on category
  const filteredMilestones = useMemo(() => {
    if (activeCategory === 'all') return allMilestones;
    return allMilestones.filter((m) => m.category === activeCategory);
  }, [allMilestones, activeCategory]);

  // COLLISION RESOLUTION ALGORITHM FOR ZERO OVERLAP:
  // We distribute labels across 3 vertical levels in the top zone.
  // We calculate exact pixel positions and resolve any horizontal conflicts.
  const positionedMilestones = useMemo<PositionedMilestone[]>(() => {
    const padX = 24;
    const usableWidth = Math.max(300, containerWidth - padX * 2);
    const labelCardWidth = 118; // approx width of badge in px
    const minCardGap = 8;       // minimum gap between cards

    // Level Y positions from the axis (going upwards)
    // Level 0: 38px above axis
    // Level 1: 82px above axis
    // Level 2: 126px above axis
    const levelYOffsets = [38, 82, 126];

    // Compute ideal anchor X for each milestone
    const rawPositioned: PositionedMilestone[] = filteredMilestones.map((m) => {
      const pct = Math.max(0, Math.min(1, (m.age - minHorizon) / totalYearsSpan));
      const anchorX = padX + pct * usableWidth;
      return {
        ...m,
        anchorX,
        labelX: anchorX - labelCardWidth / 2,
        labelY: 38,
        level: 0,
      };
    });

    // Sort by anchorX
    rawPositioned.sort((a, b) => a.anchorX - b.anchorX);

    // Multi-pass Level Assignment & Horizontal Shift
    const rows: PositionedMilestone[][] = [[], [], []];

    rawPositioned.forEach((m) => {
      // Find the best row that has space or minimum overlap
      let assignedRow = 0;
      let minRowConflict = Infinity;

      for (let r = 0; r < 3; r++) {
        const lastInRow = rows[r][rows[r].length - 1];
        if (!lastInRow) {
          assignedRow = r;
          break;
        }
        const distance = m.anchorX - (lastInRow.labelX + labelCardWidth);
        if (distance >= minCardGap) {
          assignedRow = r;
          break;
        } else {
          const overlap = (lastInRow.labelX + labelCardWidth + minCardGap) - m.anchorX;
          if (overlap < minRowConflict) {
            minRowConflict = overlap;
            assignedRow = r;
          }
        }
      }

      // Assign to row
      m.level = assignedRow;
      m.labelY = levelYOffsets[assignedRow];

      // If overlapping with previous card in this row, shift right
      const lastCardInRow = rows[assignedRow][rows[assignedRow].length - 1];
      if (lastCardInRow) {
        const minAllowedX = lastCardInRow.labelX + labelCardWidth + minCardGap;
        if (m.labelX < minAllowedX) {
          m.labelX = minAllowedX;
        }
      }

      // Clamp within container
      m.labelX = Math.max(padX / 2, Math.min(containerWidth - labelCardWidth - padX / 2, m.labelX));

      rows[assignedRow].push(m);
    });

    return rawPositioned;
  }, [filteredMilestones, containerWidth, minHorizon, totalYearsSpan]);

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
      onChange({ ...profile, lifeExpectancyAge: clampedAge });
    } else if (milestone.key.startsWith('event_')) {
      const eventId = milestone.key.replace('event_', '');
      const updatedEvents = (profile.decumulationLifeEvents || []).map((e) =>
        e.id === eventId ? { ...e, age: clampedAge } : e
      );
      onChange({ ...profile, decumulationLifeEvents: updatedEvents });
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

  // Retirement phases definitions for background bands
  const targetRetireAge = profile.targetRetirementAge || 60;
  const phase1End = targetRetireAge;
  const phase2End = Math.min(maxHorizon, Math.max(phase1End, 72));
  const phase3End = Math.min(maxHorizon, Math.max(phase2End, 82));

  // Helper for phase width %
  const getPhasePct = (age: number) => {
    return Math.max(0, Math.min(100, ((age - minHorizon) / totalYearsSpan) * 100));
  };

  // SVG Canvas dimensions
  const canvasHeight = 220; // top labels zone + axis
  const axisY = 175;        // Y coordinate of the central axis line

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Visual Milestone Timeline
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-full">
                Collision-Free Roadmap
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive life milestones mapped across retirement phases. Live steppers instantly recalculate your forecast.
            </p>
          </div>
        </div>

        {/* Action Controls & Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Milestone Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>

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

      {/* Main Collision-Free Interactive Timeline Canvas */}
      <div
        ref={containerRef}
        className="relative bg-slate-50/70 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 select-none space-y-3"
      >
        {/* SVG Canvas for Axis & Leader Stems */}
        <div style={{ height: `${canvasHeight}px` }} className="relative w-full overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ height: `${canvasHeight}px` }}>
            <defs>
              <linearGradient id="axisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                <stop offset="35%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Central Axis Line */}
            <line
              x1="20"
              y1={axisY}
              x2={containerWidth - 20}
              y2={axisY}
              stroke="url(#axisGrad)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* SVG Connector Stalks (from label bottom to axis node) */}
            {positionedMilestones.map((m) => {
              const isSelected = m.id === activeMilestone.id;
              const cardBottomY = axisY - m.labelY;
              const cardCenterX = m.labelX + 59; // half of 118px card width

              // Draw smooth bezier curve or stepped stalk
              const midY = (cardBottomY + axisY) / 2;
              const pathData = `M ${cardCenterX} ${cardBottomY} C ${cardCenterX} ${midY}, ${m.anchorX} ${midY}, ${m.anchorX} ${axisY}`;

              return (
                <path
                  key={`stem-${m.id}`}
                  d={pathData}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeDasharray={isSelected ? 'none' : '3,3'}
                  opacity={isSelected ? 1 : 0.65}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* HTML Positioned Callout Badges (Top Zone) */}
          {positionedMilestones.map((m) => {
            const isSelected = m.id === activeMilestone.id;
            const topY = axisY - m.labelY - 28; // 28px card height

            return (
              <button
                key={`badge-${m.id}`}
                type="button"
                onClick={() => setSelectedMilestoneId(m.id)}
                style={{
                  left: `${m.labelX}px`,
                  top: `${topY}px`,
                  width: '118px',
                }}
                className={`absolute h-7 px-2 rounded-xl text-[10px] font-bold whitespace-nowrap shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-between z-20 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-105 ring-2 ring-indigo-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:scale-102'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    style={{ backgroundColor: m.color }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <span className="truncate">{m.shortLabel}</span>
                </div>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1 py-0.5 rounded text-[9px] shrink-0 ml-1">
                  {m.age}
                </span>
              </button>
            );
          })}

          {/* HTML Interactive Axis Pin Nodes */}
          {positionedMilestones.map((m) => {
            const isSelected = m.id === activeMilestone.id;
            const IconComponent = m.icon;

            return (
              <button
                key={`node-${m.id}`}
                type="button"
                onClick={() => setSelectedMilestoneId(m.id)}
                style={{
                  left: `${m.anchorX}px`,
                  top: `${axisY}px`,
                  backgroundColor: m.color,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 cursor-pointer z-30 ${
                  isSelected
                    ? 'w-7 h-7 scale-120 ring-4 ring-indigo-400/50 dark:ring-indigo-500/70 shadow-lg'
                    : 'w-5 h-5 hover:scale-115'
                }`}
                title={`${m.label} (Age ${m.age})`}
              >
                <IconComponent className={isSelected ? 'w-4 h-4' : 'w-3 h-3'} />
              </button>
            );
          })}
        </div>

        {/* Retirement Phases Band (Cleanly Positioned BELOW the Axis) */}
        <div className="space-y-1 pt-1">
          <div className="h-7 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-200/80 dark:border-slate-700/60 opacity-90">
            {/* Accumulation */}
            <div
              style={{ width: `${Math.max(5, getPhasePct(phase1End) - getPhasePct(minHorizon))}%` }}
              className="bg-sky-500/20 dark:bg-sky-950/60 border-r border-blue-300/40 dark:border-blue-700/40 flex items-center justify-center px-1"
            >
              <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 truncate">
                Accumulation (Age {minHorizon}–{phase1End})
              </span>
            </div>

            {/* Go-Go Active */}
            <div
              style={{ width: `${Math.max(5, getPhasePct(phase2End) - getPhasePct(phase1End))}%` }}
              className="bg-emerald-500/20 dark:bg-emerald-950/60 border-r border-emerald-300/40 dark:border-emerald-700/40 flex items-center justify-center px-1"
            >
              <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 truncate">
                Go-Go Active ({phase1End}–{phase2End})
              </span>
            </div>

            {/* Slow-Go Leisure */}
            <div
              style={{ width: `${Math.max(5, getPhasePct(phase3End) - getPhasePct(phase2End))}%` }}
              className="bg-amber-500/20 dark:bg-amber-950/60 border-r border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center px-1"
            >
              <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-300 truncate">
                Slow-Go ({phase2End}–{phase3End})
              </span>
            </div>

            {/* No-Go Elder Care */}
            <div
              style={{ width: `${Math.max(5, 100 - getPhasePct(phase3End))}%` }}
              className="bg-purple-500/20 dark:bg-purple-950/60 flex items-center justify-center px-1"
            >
              <span className="text-[9px] font-extrabold text-purple-700 dark:text-purple-300 truncate">
                No-Go ({phase3End}–{maxHorizon})
              </span>
            </div>
          </div>

          {/* Age Scale Reference Ticks */}
          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 pt-1">
            <span>Age {minHorizon} ({currentYear - (currentAge - minHorizon)})</span>
            <span>Age 50 ({currentYear + (50 - currentAge)})</span>
            <span>Age 60 ({currentYear + (60 - currentAge)})</span>
            <span>Age 70 ({currentYear + (70 - currentAge)})</span>
            <span>Age 80 ({currentYear + (80 - currentAge)})</span>
            <span>Age {maxHorizon} ({currentYear + (maxHorizon - currentAge)})</span>
          </div>
        </div>
      </div>

      {/* Selected Milestone Inspector & Live Stepper Controls */}
      {activeMilestone && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-5 animate-fade-in">
          {/* Title & Live Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700/60 pb-4">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: activeMilestone.color }}
                className="p-3 rounded-2xl text-white shadow-xs"
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
                    className="p-2 rounded-xl text-white shrink-0"
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
