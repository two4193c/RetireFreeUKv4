import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlannerScenario, UserProfile, YearProjection, InvestmentPots } from '../types';
import { calculateUKTax, calculateMaxPcls, calculatePartnerMaxPcls, getLumpSumTakeAge, getPartnerLumpSumTakeAge, getProjectedPensionAtTakeAge } from '../utils/ukTaxEngine';
import { generateProjections, getTargetIncomeForAge } from '../utils/projectionEngine';
import { DEFAULT_IHT_SETTINGS, DEFAULT_POTS, sanitizePots, sanitizeProfile } from '../utils/defaultData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { runMonteCarloSimulation } from '../utils/monteCarloEngine';
import { runHistoricSimulation } from '../utils/historicModelingEngine';
import {
  ArrowRightLeft,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  X,
  AlertTriangle,
  Layers,
  Award,
  Landmark,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PieChart,
  Calendar,
  DollarSign,
  Users,
  User,
  Zap,
  Activity,
  Download,
  RefreshCw,
  LineChart as LineChartIcon,
  Scale,
  Building2,
  Heart,
  Coins,
  Filter,
  Dices,
  History,
  FileText,
} from 'lucide-react';

interface ScenarioComparerProps {
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  scenarioAId?: string;
  scenarioBId?: string;
  onSelectScenarioA?: (id: string) => void;
  onSelectScenarioB?: (id: string) => void;
  onClose: () => void;
}

interface GuaranteedStreamItem {
  id: string;
  name: string;
  owner: 'Primary' | 'Partner';
  startAge: number;
  startYear: number;
  annualAmount: number;
  indexing: string;
}

export const ScenarioComparer: React.FC<ScenarioComparerProps> = ({
  scenarios,
  activeScenarioId,
  scenarioAId: propScenarioAId,
  scenarioBId: propScenarioBId,
  onSelectScenarioA,
  onSelectScenarioB,
  onClose,
}) => {
  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);

  const [localAId, setLocalAId] = useState<string>(activeScenarioId);
  const [localBId, setLocalBId] = useState<string>(
    scenarios.find((s) => s.id !== activeScenarioId)?.id || activeScenarioId
  );

  // Scenario C state (defaults to false, only compares 2 scenarios by default)
  const [showScenarioC, setShowScenarioC] = useState(false);
  const [scenarioCId, setScenarioCId] = useState<string>(
    scenarios.find((s) => s.id !== activeScenarioId && s.id !== (propScenarioBId || localBId))?.id || activeScenarioId
  );

  const scenarioAId = propScenarioAId || localAId;
  const scenarioBId = propScenarioBId || localBId;

  const setScenarioAId = (id: string) => {
    if (onSelectScenarioA) {
      onSelectScenarioA(id);
    } else {
      setLocalAId(id);
    }
  };

  const setScenarioBId = (id: string) => {
    if (onSelectScenarioB) {
      onSelectScenarioB(id);
    } else {
      setLocalBId(id);
    }
  };

  const [showFullLedgerDelta, setShowFullLedgerDelta] = useState(false);
  const [chartMetric, setChartMetric] = useState<'wealth' | 'income' | 'tax' | 'guaranteed'>('wealth');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [isRealTodayPounds, setIsRealTodayPounds] = useState(false);

  const rawScenarioA = scenarios.find((s) => s.id === scenarioAId) || scenarios[0];
  const rawScenarioB = scenarios.find((s) => s.id === scenarioBId) || scenarios[1] || scenarios[0];
  const rawScenarioC = scenarios.find((s) => s.id === scenarioCId) || scenarios[2] || scenarios[0];

  const scenarioA = useMemo(() => ({
    ...rawScenarioA,
    profile: sanitizeProfile(rawScenarioA?.profile),
    pots: sanitizePots(rawScenarioA?.pots, DEFAULT_POTS),
  }), [rawScenarioA]);

  const scenarioB = useMemo(() => ({
    ...rawScenarioB,
    profile: sanitizeProfile(rawScenarioB?.profile),
    pots: sanitizePots(rawScenarioB?.pots, DEFAULT_POTS),
  }), [rawScenarioB]);

  const scenarioC = useMemo(() => ({
    ...rawScenarioC,
    profile: sanitizeProfile(rawScenarioC?.profile),
    pots: sanitizePots(rawScenarioC?.pots, DEFAULT_POTS),
  }), [rawScenarioC]);

  const taxA = useMemo(() => calculateUKTax(scenarioA.profile, scenarioA.pots), [scenarioA]);
  const projA = useMemo(() => generateProjections(scenarioA.profile, scenarioA.pots, taxA), [scenarioA, taxA]);

  const taxB = useMemo(() => calculateUKTax(scenarioB.profile, scenarioB.pots), [scenarioB]);
  const projB = useMemo(() => generateProjections(scenarioB.profile, scenarioB.pots, taxB), [scenarioB, taxB]);

  const taxC = useMemo(() => (showScenarioC ? calculateUKTax(scenarioC.profile, scenarioC.pots) : null), [showScenarioC, scenarioC]);
  const projC = useMemo(() => {
    if (!showScenarioC || !taxC) return [];
    return generateProjections(scenarioC.profile, scenarioC.pots, taxC);
  }, [showScenarioC, scenarioC, taxC]);

  const currentAge = scenarioA.profile.currentAge || 50;
  const targetAgeA = scenarioA.profile.targetRetirementAge || 60;
  const targetAgeB = scenarioB.profile.targetRetirementAge || 60;

  const retA = projA.find((p) => p.age === targetAgeA) || projA[0];
  const retB = projB.find((p) => p.age === targetAgeB) || projB[0];

  const depA = projA.find((p) => p.potDepleted);
  const depB = projB.find((p) => p.potDepleted);

  // Helper for annuity type formatting
  const formatAnnuityType = (type?: string) => {
    switch (type) {
      case 'level_single': return 'Level Single Life';
      case 'inflation_linked_single': return 'Inflation-Linked Single Life';
      case 'level_joint_50': return 'Joint Life (50% Partner Continuation)';
      case 'inflation_linked_joint_50': return 'Inflation-Linked Joint Life (50%)';
      default: return 'Inflation-Linked Single Life';
    }
  };

  // Helper for drawdown strategy formatting
  const formatStrategy = (strat?: string) => {
    switch (strat) {
      case 'isa_first': return 'ISA First (Tax-Free Bridge)';
      case 'cash_first': return 'Cash Buffer First';
      case 'pension_first': return 'Pension First (Taxable Drawdown)';
      case 'pro_rata': return 'Pro-Rata Balanced Drawdown';
      case 'tax_free_bracket': return 'Fill Tax-Free Allowance (£12.57k)';
      case 'basic_rate_bracket': return 'Fill Basic Rate Band (£50.27k)';
      case 'higher_rate_bracket': return 'Fill Higher Rate Band (£125.14k)';
      default: return 'ISA First (Tax-Free Bridge)';
    }
  };

  // Helper for formatting currency
  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '£0';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) return `${sign}£${(absVal / 1000000).toFixed(2)}M`;
    if (absVal >= 1000) return `${sign}£${Math.round((absVal) || 0).toLocaleString()}`;
    return `${sign}£${Math.round(absVal)}`;
  };

  // Itemized Guaranteed Income Streams (Item, Age, Year, Amount for Primary & Partner)
  const getItemizedGuaranteedStreams = (profile: UserProfile, pots: InvestmentPots): GuaranteedStreamItem[] => {
    const items: GuaranteedStreamItem[] = [];
    const currentYear = new Date().getFullYear();
    const primaryCurrentAge = profile.currentAge || 50;
    const partnerCurrentAge = profile.partnerCurrentAge || primaryCurrentAge;

    // 1. Primary State Pension
    if (profile.includeStatePension) {
      const stateAge = profile.statePensionAge || 67;
      const startYear = currentYear + (stateAge - primaryCurrentAge);
      const amount = profile.statePensionAmountAnnual || 12547.6;
      items.push({
        id: 'pri_state',
        name: 'State Pension',
        owner: 'Primary',
        startAge: stateAge,
        startYear,
        annualAmount: amount,
        indexing: 'Triple Lock / CPI',
      });
    }

    // 2. Partner State Pension
    if (profile.isCouplePlanning && (profile.partnerIncludeStatePension ?? true)) {
      const partStateAge = profile.partnerStatePensionAge || 67;
      const startYear = currentYear + (partStateAge - partnerCurrentAge);
      const amount = profile.partnerStatePensionAmountAnnual || 12547.6;
      items.push({
        id: 'part_state',
        name: 'State Pension',
        owner: 'Partner',
        startAge: partStateAge,
        startYear,
        annualAmount: amount,
        indexing: 'Triple Lock / CPI',
      });
    }

    // 3. Primary Annuity
    if (profile.incomeProductOption === 'annuity' || profile.incomeProductOption === 'hybrid') {
      const purAge = profile.annuityPurchaseAge || profile.targetRetirementAge;
      const startYear = currentYear + (purAge - primaryCurrentAge);
      const rate = (profile.annuityRatePercent || 4.2) / 100;
      const alloc = profile.incomeProductOption === 'annuity' ? 1.0 : (profile.annuityAllocationPercent ?? 50) / 100;
      const totalPen = pots.workplacePensionBalance + pots.sippBalance;
      const estAnnuity = totalPen * alloc * rate;

      if (estAnnuity > 0) {
        items.push({
          id: 'pri_annuity',
          name: `Annuity Payout (${formatAnnuityType(profile.annuityType)})`,
          owner: 'Primary',
          startAge: purAge,
          startYear,
          annualAmount: estAnnuity,
          indexing: (profile.annuityType || '').includes('inflation') ? 'Inflation-Linked (CPI)' : 'Level / Flat',
        });
      }

      if (profile.incomeProductOption === 'hybrid') {
        (profile.annuityTranches || []).forEach((t, idx) => {
          if (t.enabled && (t.owner || 'primary') === 'primary') {
            const tAge = t.purchaseAge;
            const tYear = currentYear + (tAge - primaryCurrentAge);
            const tRate = (t.annuityRatePercent || 4.2) / 100;
            const tAlloc = (t.allocationPercent ?? 25) / 100;
            const tEstAmount = totalPen * (1 - alloc) * tAlloc * tRate;

            items.push({
              id: `pri_tranche_${t.id || idx}`,
              name: `Tranche Annuity #${idx + 1} (${formatAnnuityType(t.annuityType)})`,
              owner: 'Primary',
              startAge: tAge,
              startYear: tYear,
              annualAmount: tEstAmount,
              indexing: (t.annuityType || '').includes('inflation') ? 'Inflation-Linked (CPI)' : 'Level / Flat',
            });
          }
        });
      }
    }

    // 4. Partner Annuity
    if (profile.isCouplePlanning && (profile.partnerIncomeProductOption === 'annuity' || profile.partnerIncomeProductOption === 'hybrid')) {
      const partPurAge = profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || profile.targetRetirementAge);
      const startYear = currentYear + (partPurAge - partnerCurrentAge);
      const rate = (profile.partnerAnnuityRatePercent || profile.annuityRatePercent || 4.2) / 100;
      const alloc = profile.partnerIncomeProductOption === 'annuity' ? 1.0 : (profile.partnerAnnuityAllocationPercent ?? 50) / 100;
      const partnerPots: Partial<InvestmentPots> = profile.partnerPots || {};
      const totalPen = (partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0);
      const estAnnuity = totalPen * alloc * rate;

      if (estAnnuity > 0) {
        items.push({
          id: 'part_annuity',
          name: `Partner Annuity (${formatAnnuityType(profile.partnerAnnuityType || profile.annuityType)})`,
          owner: 'Partner',
          startAge: partPurAge,
          startYear,
          annualAmount: estAnnuity,
          indexing: (profile.partnerAnnuityType || profile.annuityType || '').includes('inflation') ? 'Inflation-Linked (CPI)' : 'Level / Flat',
        });
      }

      if (profile.partnerIncomeProductOption === 'hybrid') {
        const partnerTranches = profile.partnerAnnuityTranches || (profile.annuityTranches || []).filter((t) => t.owner === 'partner');
        partnerTranches.forEach((t, idx) => {
          if (t.enabled) {
            const tAge = t.purchaseAge;
            const tYear = currentYear + (tAge - partnerCurrentAge);
            const tRate = (t.annuityRatePercent || 4.2) / 100;
            const tAlloc = (t.allocationPercent ?? 25) / 100;
            const tEstAmount = totalPen * (1 - alloc) * tAlloc * tRate;

            items.push({
              id: `part_tranche_${t.id || idx}`,
              name: `Partner Tranche Annuity #${idx + 1} (${formatAnnuityType(t.annuityType)})`,
              owner: 'Partner',
              startAge: tAge,
              startYear: tYear,
              annualAmount: tEstAmount,
              indexing: (t.annuityType || '').includes('inflation') ? 'Inflation-Linked (CPI)' : 'Level / Flat',
            });
          }
        });
      }
    }

    // 5. DB Pensions
    (profile.dbPensions || []).filter((db) => db.enabled).forEach((db, i) => {
      const isPart = db.owner === 'partner';
      const ownerAge = isPart ? partnerCurrentAge : primaryCurrentAge;
      const startYear = currentYear + (db.startAge - ownerAge);
      items.push({
        id: `db_${i}`,
        name: `DB Pension: ${db.name || 'Defined Benefit'}`,
        owner: isPart ? 'Partner' : 'Primary',
        startAge: db.startAge,
        startYear,
        annualAmount: db.annualIncome,
        indexing: db.inflationLinked ? 'Inflation-Linked (CPI)' : 'Level / Flat',
      });
    });

    // 6. Fixed Income Streams
    (profile.fixedIncomeStreams || []).filter((s) => s.enabled).forEach((s, i) => {
      const isPart = s.owner === 'partner';
      const ownerAge = isPart ? partnerCurrentAge : primaryCurrentAge;
      const startYear = currentYear + (s.startAge - ownerAge);
      items.push({
        id: `fix_${i}`,
        name: `Fixed Income: ${s.name || 'Stream'}`,
        owner: isPart ? 'Partner' : 'Primary',
        startAge: s.startAge,
        startYear,
        annualAmount: s.annualAmount,
        indexing: s.inflationLinked ? 'Inflation-Linked (CPI)' : 'Level / Flat',
      });
    });

    return items;
  };

  // Calculate Guaranteed Income Floor totals
  const calcGuaranteedFloor = (proj: YearProjection[], profile: UserProfile, evalAge: number) => {
    const p = proj.find((item) => item.age === evalAge) || proj[0];
    if (!p) return { totalFloor: 0, state: 0, db: 0, annuity: 0, target: 0, coveragePct: 0 };

    const state = p.statePensionReceived || 0;
    const db = p.dbPensionIncomeReceived || 0;
    const annuity = p.annuityIncomeReceived || 0;
    const fixedTaxable = p.taxableFixedIncomeReceived || 0;
    const fixedTaxFree = p.taxFreeFixedIncomeReceived || 0;

    const totalFloor = state + db + annuity + fixedTaxable + fixedTaxFree;
    const target = getTargetIncomeForAge(profile, evalAge);
    const coveragePct = target > 0 ? Math.min(100, Math.round((totalFloor / target) * 100)) : 100;

    return { totalFloor, state, db, annuity, target, coveragePct };
  };

  const streamsA = useMemo(() => getItemizedGuaranteedStreams(scenarioA.profile, scenarioA.pots), [scenarioA]);
  const streamsB = useMemo(() => getItemizedGuaranteedStreams(scenarioB.profile, scenarioB.pots), [scenarioB]);
  const streamsC = useMemo(() => showScenarioC ? getItemizedGuaranteedStreams(scenarioC.profile, scenarioC.pots) : [], [showScenarioC, scenarioC]);

  const floorStateA = calcGuaranteedFloor(projA, scenarioA.profile, scenarioA.profile.statePensionAge || 67);
  const floorStateB = calcGuaranteedFloor(projB, scenarioB.profile, scenarioB.profile.statePensionAge || 67);
  const floorStateC = showScenarioC ? calcGuaranteedFloor(projC, scenarioC.profile, scenarioC.profile.statePensionAge || 67) : null;

  const targetAgeC = scenarioC.profile.targetRetirementAge || 60;
  const retC = projC.find((p) => p.age === targetAgeC) || projC[0];
  const depC = projC.find((p) => p.potDepleted);

  // Helper to compute Estate IHT for a scenario & target age
  const calcScenarioIht = (scenario: PlannerScenario, proj: YearProjection[], targetAge: number) => {
    const iht = scenario.profile.ihtSettings || DEFAULT_IHT_SETTINGS;
    const isCouple = scenario.profile.isCouplePlanning ?? false;
    const cAge = scenario.profile.currentAge || 35;
    const yearsFromNow = Math.max(0, targetAge - cAge);
    const p = proj.find((item) => item.age === targetAge) || proj[proj.length - 1];

    const propertyValue = Math.round(
      (iht.primaryResidenceValue || 0) * Math.pow(1 + (iht.annualPropertyGrowthPercent || 3.0) / 100, yearsFromNow)
    );
    const nonPensionWealth = Math.round((p?.isaPot || 0) + (p?.cashGiaPot || 0));
    const pensionWealth = Math.round(p?.pensionPot || 0);
    const otherAssets = iht.otherTaxableAssets || 0;

    const grossEstateBeforeGifting =
      propertyValue + nonPensionWealth + otherAssets + (iht.includePensionsInEstate ? pensionWealth : 0);

    const retirementAge = scenario.profile.targetRetirementAge || 60;
    const giftingYears = Math.max(0, targetAge - retirementAge);
    const cumulativeGifting = (iht.annualGiftingStrategy || 0) * giftingYears;
    const grossEstate = Math.max(0, grossEstateBeforeGifting - cumulativeGifting);

    const baseNrb = isCouple ? 650000 : 325000;
    let baseRnrb = 0;
    if (iht.passMainResidenceToDescendants && propertyValue > 0) {
      baseRnrb = isCouple ? 350000 : 175000;
      const taperThreshold = 2000000;
      if (grossEstate > taperThreshold) {
        const excess = grossEstate - taperThreshold;
        const reduction = Math.floor(excess / 2);
        baseRnrb = Math.max(0, baseRnrb - reduction);
      }
    }

    const totalAllowances = baseNrb + baseRnrb;
    const taxableSurplus = Math.max(0, grossEstate - totalAllowances);
    const ihtLiability = Math.round(taxableSurplus * 0.4);
    const netPassedToHeirs = grossEstate - ihtLiability;
    const effectiveIhtRate = grossEstate > 0 ? ((ihtLiability / grossEstate) * 100).toFixed(1) : '0.0';

    return {
      propertyValue,
      nonPensionWealth,
      pensionWealth,
      grossEstate,
      totalAllowances,
      taxableSurplus,
      ihtLiability,
      netPassedToHeirs,
      effectiveIhtRate,
      includePensionsInEstate: iht.includePensionsInEstate,
      annualGiftingStrategy: iht.annualGiftingStrategy || 0,
      primaryResidenceValue: iht.primaryResidenceValue || 0,
      annualPropertyGrowthPercent: iht.annualPropertyGrowthPercent || 3.0,
    };
  };

  const iht80A = calcScenarioIht(scenarioA, projA, 80);
  const iht90A = calcScenarioIht(scenarioA, projA, 90);
  const iht100A = calcScenarioIht(scenarioA, projA, 100);

  const iht80B = calcScenarioIht(scenarioB, projB, 80);
  const iht90B = calcScenarioIht(scenarioB, projB, 90);
  const iht100B = calcScenarioIht(scenarioB, projB, 100);

  const iht80C = showScenarioC ? calcScenarioIht(scenarioC, projC, 80) : null;
  const iht90C = showScenarioC ? calcScenarioIht(scenarioC, projC, 90) : null;
  const iht100C = showScenarioC ? calcScenarioIht(scenarioC, projC, 100) : null;

  // Helper for PCLS Tax-Free Lump Sum Metric calculation
  const getPclsMetrics = (
    profile: UserProfile,
    pots: InvestmentPots,
    projections: YearProjection[]
  ) => {
    const isCouple = profile.isCouplePlanning;

    // Primary
    const primaryTakeAge = getLumpSumTakeAge(profile);
    const primaryProj = projections.find((p) => p.age === primaryTakeAge);
    const primaryPensionPotAtTake = primaryProj?.primaryPensionPotBeforePcls ?? primaryProj?.primaryPensionPot ?? getProjectedPensionAtTakeAge(profile, pots, primaryTakeAge, false);
    const primaryPcls = calculateMaxPcls(primaryPensionPotAtTake, profile);

    // Partner
    let partnerTakeAge = primaryTakeAge;
    let partnerPensionPotAtTake = 0;
    let partnerPcls = { maxTaxFreeCash: 0, lsaLimit: 268275, pclsPercent: 25, isCappedByLsa: false };

    if (isCouple) {
      partnerTakeAge = getPartnerLumpSumTakeAge(profile);
      const partnerProj = projections.find((p) => p.age === partnerTakeAge);
      partnerPensionPotAtTake = partnerProj?.partnerPensionPotBeforePcls ?? partnerProj?.partnerPensionPot ?? getProjectedPensionAtTakeAge(profile, pots, partnerTakeAge, true);
      partnerPcls = calculatePartnerMaxPcls(partnerPensionPotAtTake, profile);
    }

    const combinedPensionPotAtTake = primaryPensionPotAtTake + partnerPensionPotAtTake;
    const combinedMaxTaxFreeCash = primaryPcls.maxTaxFreeCash + partnerPcls.maxTaxFreeCash;
    const combinedUncappedPcls = (primaryPensionPotAtTake * (primaryPcls.pclsPercent / 100)) + (isCouple ? (partnerPensionPotAtTake * (partnerPcls.pclsPercent / 100)) : 0);

    return {
      primaryTakeAge,
      primaryPensionPotAtTake,
      primaryMaxTaxFreeCash: primaryPcls.maxTaxFreeCash,
      primaryLsaLimit: primaryPcls.lsaLimit,
      primaryUncapped: primaryPensionPotAtTake * (primaryPcls.pclsPercent / 100),
      primaryIsCapped: primaryPcls.isCappedByLsa,

      isCouple,
      partnerTakeAge,
      partnerPensionPotAtTake,
      partnerMaxTaxFreeCash: partnerPcls.maxTaxFreeCash,
      partnerLsaLimit: partnerPcls.lsaLimit,
      partnerUncapped: partnerPensionPotAtTake * (partnerPcls.pclsPercent / 100),
      partnerIsCapped: partnerPcls.isCappedByLsa,

      combinedPensionPotAtTake,
      combinedUncappedPcls,
      combinedMaxTaxFreeCash,

      primaryTiming: profile.lumpSumTiming || 'at_access_age',
      primaryDestination: profile.lumpSumTargetPot || 'reinvest_isa',
    };
  };

  const formatPclsTiming = (timing?: string) => {
    switch (timing) {
      case 'at_access_age': return 'At Pension Access Age';
      case 'at_retirement_age': return 'At Target Retirement Age';
      case 'custom': return 'At Custom Take Age';
      case 'phased': return 'Phased Annual UFPLS / Drawdown';
      default: return 'At Pension Access Age';
    }
  };

  const formatPclsDestination = (dest?: string) => {
    switch (dest) {
      case 'reinvest_isa': return 'Reinvest into ISA / Cash Pot';
      case 'clear_mortgage': return 'Clear Mortgage / Property Debt';
      case 'spend_lifestyle': return 'Lifestyle / Capital Expenditure';
      case 'leave_in_pension': return 'Retain in Pension Tax-Free Component';
      default: return 'Reinvest into ISA / Cash Pot';
    }
  };

  const pclsA = getPclsMetrics(scenarioA.profile, scenarioA.pots, projA);
  const pclsB = getPclsMetrics(scenarioB.profile, scenarioB.pots, projB);
  const pclsC = showScenarioC ? getPclsMetrics(scenarioC.profile, scenarioC.pots, projC) : null;

  // Key Milestone Ages comparison (ADDED AGE 100)
  const milestoneAges = Array.from(
    new Set([
      scenarioA.profile.pensionAccessAge || 57,
      targetAgeA,
      targetAgeB,
      ...(showScenarioC ? [targetAgeC] : []),
      scenarioA.profile.statePensionAge || 67,
      80,
      90,
      100
    ])
  ).sort((a, b) => a - b).filter((a) => a >= currentAge);

  const milestoneComparison = milestoneAges.map((age) => {
    const pA = projA.find((p) => p.age === age);
    const pB = projB.find((p) => p.age === age);
    const pC = showScenarioC ? projC.find((p) => p.age === age) : null;

    const potA = pA ? (pA.totalPot || 0) : 0;
    const potB = pB ? (pB.totalPot || 0) : 0;
    const potC = pC ? (pC.totalPot || 0) : 0;
    const diff = potB - potA;

    return {
      age,
      year: new Date().getFullYear() + (age - currentAge),
      potA,
      penA: pA?.pensionPot || 0,
      isaA: pA?.isaPot || 0,
      cashA: pA?.cashGiaPot || 0,
      incA: pA?.netRetirementIncome || 0,
      potB,
      penB: pB?.pensionPot || 0,
      isaB: pB?.isaPot || 0,
      cashB: pB?.cashGiaPot || 0,
      incB: pB?.netRetirementIncome || 0,
      potC,
      penC: pC?.pensionPot || 0,
      isaC: pC?.isaPot || 0,
      cashC: pC?.cashGiaPot || 0,
      incC: pC?.netRetirementIncome || 0,
      diff,
    };
  });

  // CSV Export Handler
  const handleExportComparisonCSV = () => {
    const headers = [
      'Age',
      'Year',
      `Total Wealth - ${scenarioA.name} (£)`,
      `Net Income - ${scenarioA.name} (£/yr)`,
      `Total Wealth - ${scenarioB.name} (£)`,
      `Net Income - ${scenarioB.name} (£/yr)`,
      ...(showScenarioC
        ? [`Total Wealth - ${scenarioC.name} (£)`, `Net Income - ${scenarioC.name} (£/yr)`]
        : ['Wealth Delta (B - A) (£)']),
    ];

    const rows = milestoneComparison.map((m) =>
      [
        m.age,
        m.year,
        Math.round(m.potA),
        Math.round(m.incA),
        Math.round(m.potB),
        Math.round(m.incB),
        ...(showScenarioC ? [Math.round(m.potC), Math.round(m.incC)] : [Math.round(m.diff)]),
      ].join(',')
    );
    const csvStr = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scenario_comparison_${scenarioA.name}_vs_${scenarioB.name}${showScenarioC ? '_vs_' + scenarioC.name : ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Lifetime tax calculations for KPI Delta Cards & Tax Efficiency Scorecard
  const lifetimeTaxA = useMemo(() => projA.reduce((sum, p) => sum + (p.totalTaxPaid || 0), 0), [projA]);
  const lifetimeTaxB = useMemo(() => projB.reduce((sum, p) => sum + (p.totalTaxPaid || 0), 0), [projB]);
  const lifetimeTaxC = useMemo(() => showScenarioC ? projC.reduce((sum, p) => sum + (p.totalTaxPaid || 0), 0) : 0, [showScenarioC, projC]);

  // Dynamic Chart Data for Overlaid Comparison Chart based on selected metric
  const chartData = useMemo(() => {
    const ages = Array.from(
      new Set([
        ...projA.map((p) => p.age),
        ...projB.map((p) => p.age),
        ...(showScenarioC ? projC.map((p) => p.age) : []),
      ])
    ).sort((a, b) => a - b);

    return ages.map((age) => {
      const pA = projA.find((p) => p.age === age);
      const pB = projB.find((p) => p.age === age);
      const pC = showScenarioC ? projC.find((p) => p.age === age) : null;

      const getValue = (p: YearProjection | null | undefined, infRate: number = 2.5) => {
        if (!p) return 0;
        let rawVal = 0;
        if (chartMetric === 'wealth') rawVal = p.totalPot || 0;
        else if (chartMetric === 'income') rawVal = p.netRetirementIncome || 0;
        else if (chartMetric === 'tax') rawVal = p.totalTaxPaid || 0;
        else if (chartMetric === 'guaranteed') {
          rawVal =
            (p.statePensionReceived || 0) +
            (p.dbPensionIncomeReceived || 0) +
            (p.annuityIncomeReceived || 0) +
            (p.taxableFixedIncomeReceived || 0) +
            (p.taxFreeFixedIncomeReceived || 0);
        } else rawVal = p.totalPot || 0;

        if (isRealTodayPounds && p.age > currentAge) {
          const years = p.age - currentAge;
          const factor = Math.pow(1 + infRate / 100, years);
          return Math.round(rawVal / factor);
        }
        return Math.round(rawVal);
      };

      const item: Record<string, any> = {
        age,
        year: new Date().getFullYear() + (age - currentAge),
        [scenarioA.name]: getValue(pA, scenarioA.profile.expectedInflationRate || 2.5),
        [scenarioB.name]: getValue(pB, scenarioB.profile.expectedInflationRate || 2.5),
      };

      if (showScenarioC) {
        item[scenarioC.name] = getValue(pC, scenarioC.profile.expectedInflationRate || 2.5);
      }

      return item;
    });
  }, [projA, projB, projC, showScenarioC, currentAge, scenarioA.name, scenarioB.name, scenarioC.name, chartMetric, isRealTodayPounds]);

  // Executive Summary & Milestone Wealth Calculations
  const pot75A = projA.find((p) => p.age === 75)?.totalPot || 0;
  const pot75B = projB.find((p) => p.age === 75)?.totalPot || 0;
  const pot75C = showScenarioC ? projC.find((p) => p.age === 75)?.totalPot || 0 : 0;

  const pot85A = projA.find((p) => p.age === 85)?.totalPot || 0;
  const pot85B = projB.find((p) => p.age === 85)?.totalPot || 0;
  const pot85C = showScenarioC ? projC.find((p) => p.age === 85)?.totalPot || 0 : -Infinity;

  const candidatePots = [
    { scenario: scenarioA, pot: pot85A, dep: depA },
    { scenario: scenarioB, pot: pot85B, dep: depB },
    ...(showScenarioC ? [{ scenario: scenarioC, pot: pot85C, dep: depC }] : []),
  ];

  const sortedCandidates = [...candidatePots].sort((a, b) => b.pot - a.pot);
  const winnerCandidate = sortedCandidates[0];
  const runnerUpCandidate = sortedCandidates[1];
  const winnerName = winnerCandidate.scenario.name;
  const diffFromRunnerUp = Math.max(0, winnerCandidate.pot - runnerUpCandidate.pot);

  // Dimension Winners for Recommendations Scorecard
  // 1. Longevity & Wealth Preservation Winner
  const longevityWinnerName = sortedCandidates[0].scenario.name;
  // 2. Tax Efficiency Winner (Lowest lifetime tax paid)
  const taxCandidates = [
    { name: scenarioA.name, tax: lifetimeTaxA },
    { name: scenarioB.name, tax: lifetimeTaxB },
    ...(showScenarioC ? [{ name: scenarioC.name, tax: lifetimeTaxC }] : []),
  ].sort((a, b) => a.tax - b.tax);
  const taxWinnerName = taxCandidates[0].name;

  // 3. Inheritance & Estate Protection Winner (Highest Net Estate at Age 85)
  const ihtA85 = calcScenarioIht(scenarioA, projA, 85);
  const ihtB85 = calcScenarioIht(scenarioB, projB, 85);
  const ihtC85 = showScenarioC ? calcScenarioIht(scenarioC, projC, 85) : null;
  const estateCandidates = [
    { name: scenarioA.name, netEstate: ihtA85.netPassedToHeirs },
    { name: scenarioB.name, netEstate: ihtB85.netPassedToHeirs },
    ...(showScenarioC && ihtC85 ? [{ name: scenarioC.name, netEstate: ihtC85.netPassedToHeirs }] : []),
  ].sort((a, b) => b.netEstate - a.netEstate);
  const estateWinnerName = estateCandidates[0].name;

  // Monte Carlo & Historic Market Data simulations for comparison
  const mcSimA = useMemo(() => {
    if (!taxA) return null;
    return runMonteCarloSimulation(scenarioA.profile, scenarioA.pots, taxA, {
      numSimulations: 300,
      accumulationVolatility: 12.0,
      decumulationVolatility: 8.0,
      maxAge: Math.min(100, scenarioA.profile.lifeExpectancyAge || 95),
      stressedReturnDropPercent: 2.0,
      crashStartAge: scenarioA.profile.targetRetirementAge,
      crashDurationYears: 2,
      crashYearDropsPercent: [30, 15],
    });
  }, [scenarioA, taxA]);

  const mcSimB = useMemo(() => {
    if (!taxB) return null;
    return runMonteCarloSimulation(scenarioB.profile, scenarioB.pots, taxB, {
      numSimulations: 300,
      accumulationVolatility: 12.0,
      decumulationVolatility: 8.0,
      maxAge: Math.min(100, scenarioB.profile.lifeExpectancyAge || 95),
      stressedReturnDropPercent: 2.0,
      crashStartAge: scenarioB.profile.targetRetirementAge,
      crashDurationYears: 2,
      crashYearDropsPercent: [30, 15],
    });
  }, [scenarioB, taxB]);

  const mcSimC = useMemo(() => {
    if (!showScenarioC || !taxC) return null;
    return runMonteCarloSimulation(scenarioC.profile, scenarioC.pots, taxC, {
      numSimulations: 300,
      accumulationVolatility: 12.0,
      decumulationVolatility: 8.0,
      maxAge: Math.min(100, scenarioC.profile.lifeExpectancyAge || 95),
      stressedReturnDropPercent: 2.0,
      crashStartAge: scenarioC.profile.targetRetirementAge,
      crashDurationYears: 2,
      crashYearDropsPercent: [30, 15],
    });
  }, [showScenarioC, scenarioC, taxC]);

  // Historic 75-Year Sequence Simulations
  const historicA = useMemo(() => {
    if (!taxA) return null;
    return runHistoricSimulation(scenarioA.profile, scenarioA.pots, taxA, 95, {
      equityPercent: 70,
      bondPercent: 20,
      cashPercent: 10,
    });
  }, [scenarioA, taxA]);

  const historicB = useMemo(() => {
    if (!taxB) return null;
    return runHistoricSimulation(scenarioB.profile, scenarioB.pots, taxB, 95, {
      equityPercent: 70,
      bondPercent: 20,
      cashPercent: 10,
    });
  }, [scenarioB, taxB]);

  const historicC = useMemo(() => {
    if (!showScenarioC || !taxC) return null;
    return runHistoricSimulation(scenarioC.profile, scenarioC.pots, taxC, 95, {
      equityPercent: 70,
      bondPercent: 20,
      cashPercent: 10,
    });
  }, [showScenarioC, scenarioC, taxC]);

  // 4-Dimensional Radar Scores (0 to 100)
  const scoreLongevityA = Math.round(mcSimA?.successRate ?? (depA ? Math.max(10, Math.round((depA.age / 95) * 100)) : 95));
  const scoreLongevityB = Math.round(mcSimB?.successRate ?? (depB ? Math.max(10, Math.round((depB.age / 95) * 100)) : 95));
  const scoreLongevityC = showScenarioC ? Math.round(mcSimC?.successRate ?? (depC ? Math.max(10, Math.round((depC.age / 95) * 100)) : 95)) : 0;

  const grossA = projA.reduce((sum, p) => sum + (p.grossIncome || 0), 0);
  const grossB = projB.reduce((sum, p) => sum + (p.grossIncome || 0), 0);
  const grossC = showScenarioC ? projC.reduce((sum, p) => sum + (p.grossIncome || 0), 0) : 0;

  const taxRateA = grossA > 0 ? (lifetimeTaxA / grossA) * 100 : 0;
  const taxRateB = grossB > 0 ? (lifetimeTaxB / grossB) * 100 : 0;
  const taxRateC = grossC > 0 ? (lifetimeTaxC / grossC) * 100 : 0;

  const scoreTaxA = Math.min(100, Math.max(10, Math.round(100 - taxRateA * 2)));
  const scoreTaxB = Math.min(100, Math.max(10, Math.round(100 - taxRateB * 2)));
  const scoreTaxC = Math.min(100, Math.max(10, Math.round(100 - taxRateC * 2)));

  const maxEstate = Math.max(ihtA85.netPassedToHeirs, ihtB85.netPassedToHeirs, ihtC85?.netPassedToHeirs || 0, 1);
  const scoreEstateA = Math.min(100, Math.max(10, Math.round((ihtA85.netPassedToHeirs / maxEstate) * 100)));
  const scoreEstateB = Math.min(100, Math.max(10, Math.round((ihtB85.netPassedToHeirs / maxEstate) * 100)));
  const scoreEstateC = showScenarioC && ihtC85 ? Math.min(100, Math.max(10, Math.round((ihtC85.netPassedToHeirs / maxEstate) * 100))) : 0;

  const scoreFloorA = Math.min(100, Math.round(floorStateA.coveragePct));
  const scoreFloorB = Math.min(100, Math.round(floorStateB.coveragePct));
  const scoreFloorC = Math.min(100, Math.round(floorStateC?.coveragePct || 0));

  const radarData = [
    {
      dimension: 'Capital Longevity',
      [scenarioA.name]: scoreLongevityA,
      [scenarioB.name]: scoreLongevityB,
      ...(showScenarioC ? { [scenarioC.name]: scoreLongevityC } : {}),
      fullMark: 100,
    },
    {
      dimension: 'Tax Efficiency',
      [scenarioA.name]: scoreTaxA,
      [scenarioB.name]: scoreTaxB,
      ...(showScenarioC ? { [scenarioC.name]: scoreTaxC } : {}),
      fullMark: 100,
    },
    {
      dimension: 'Estate & IHT Shield',
      [scenarioA.name]: scoreEstateA,
      [scenarioB.name]: scoreEstateB,
      ...(showScenarioC ? { [scenarioC.name]: scoreEstateC } : {}),
      fullMark: 100,
    },
    {
      dimension: 'Floor Safety',
      [scenarioA.name]: scoreFloorA,
      [scenarioB.name]: scoreFloorB,
      ...(showScenarioC ? { [scenarioC.name]: scoreFloorC } : {}),
      fullMark: 100,
    },
  ];

  // Guaranteed Income Safety Floor Winner
  const floorCandidates = [
    { name: scenarioA.name, cov: floorStateA.coveragePct },
    { name: scenarioB.name, cov: floorStateB.coveragePct },
    ...(showScenarioC && floorStateC ? [{ name: scenarioC.name, cov: floorStateC.coveragePct }] : []),
  ].sort((a, b) => b.cov - a.cov);
  const floorWinnerName = floorCandidates[0].name;

  const scenariosToCompare = [scenarioA, scenarioB, ...(showScenarioC ? [scenarioC] : [])];

  const scoreLongA = scoreLongevityA;
  const scoreLongB = scoreLongevityB;
  const scoreLongC = scoreLongevityC;

  const scoreA = Math.round((scoreLongevityA + scoreTaxA + scoreEstateA + scoreFloorA) / 4);
  const scoreB = Math.round((scoreLongevityB + scoreTaxB + scoreEstateB + scoreFloorB) / 4);
  const scoreC = showScenarioC ? Math.round((scoreLongevityC + scoreTaxC + scoreEstateC + scoreFloorC) / 4) : 0;

  const overallCandidates = [
    { name: scenarioA.name, score: scoreA },
    { name: scenarioB.name, score: scoreB },
    ...(showScenarioC ? [{ name: scenarioC.name, score: scoreC }] : []),
  ].sort((x, y) => y.score - x.score);

  const leadingWinnerName = overallCandidates[0].name;
  const leadingWinnerScore = overallCandidates[0].score;

  // Pure jsPDF Vector Comparison PDF Export Handler (100% Reliable, Zero Canvas Errors)
  const handleExportComparisonPDF = async () => {
    try {
      setIsExportingPdf(true);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const margin = 14;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - margin * 2;

      // Color Palette
      const darkSlate = [15, 23, 42];
      const emeraldAccent = [16, 185, 129];
      const mutedSlate = [100, 116, 139];
      const lightBg = [248, 250, 252];
      const borderSlate = [226, 232, 240];

      let y = 14;

      // Helper Header Bar
      const addHeader = (title: string, subtitle?: string) => {
        pdf.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.rect(0, 0, pageWidth, 12, 'F');
        pdf.setFillColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
        pdf.rect(0, 10, pageWidth, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`RetireFree UK • ${title}`, margin, 7.5);
        if (subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.text(subtitle, pageWidth - margin - pdf.getTextWidth(subtitle), 7.5);
        }
      };

      addHeader('Multi-Dimensional Scenario Comparison Report', 'Executive Trade-Off Summary');
      y = 18;

      // Title Banner
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Scenario Trade-Off & Longevity Comparison', margin, y);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')} • Comparing ${scenariosToCompare.length} Plan Variants`, margin, y + 4.5);

      y += 10;

      // Executive Winner Banner Box
      pdf.setFillColor(236, 253, 245);
      pdf.setDrawColor(167, 243, 208);
      pdf.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      pdf.setTextColor(6, 78, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXECUTIVE TAKEAWAY & RECOMMENDED STRATEGY:', margin + 4, y + 6);
      pdf.setFontSize(10);
      pdf.text(`Leading Plan: ${leadingWinnerName}`, margin + 4, y + 12);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${leadingWinnerName} achieves the highest overall trade-off score (${leadingWinnerScore}/100) across Longevity, Tax, Estate, and Safety Floor.`, margin + 4, y + 16.5);

      y += 24;

      // Section 1: 4-Dimensional Trade-Off Scorecard
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('1. Multi-Dimensional Trade-Off Scorecard & Category Winners', margin, y);
      y += 5;

      const cardWidth = (contentWidth - 6) / 2;
      const cardHeight = 22;

      // Dimension 1: Longevity
      pdf.setFillColor(236, 253, 245);
      pdf.setDrawColor(167, 243, 208);
      pdf.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
      pdf.setTextColor(6, 78, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Capital Longevity Winner', margin + 3, y + 6);
      pdf.setFontSize(10);
      pdf.text(`${longevityWinnerName} (${scoreLongA} pts vs ${scoreLongB} pts)`, margin + 3, y + 13);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Highest remaining wealth cushion at Age 95.', margin + 3, y + 18);

      // Dimension 2: Tax Efficiency
      pdf.setFillColor(238, 242, 255);
      pdf.setDrawColor(199, 210, 254);
      pdf.roundedRect(margin + cardWidth + 6, y, cardWidth, cardHeight, 2, 2, 'FD');
      pdf.setTextColor(49, 46, 129);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tax Efficiency Winner', margin + cardWidth + 9, y + 6);
      pdf.setFontSize(10);
      pdf.text(`${taxWinnerName} (${scoreTaxA} pts vs ${scoreTaxB} pts)`, margin + cardWidth + 9, y + 13);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Lowest effective tax rate & HMRC drag.', margin + cardWidth + 9, y + 18);

      y += cardHeight + 4;

      // Dimension 3: Estate & IHT Shield
      pdf.setFillColor(250, 245, 255);
      pdf.setDrawColor(233, 213, 255);
      pdf.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
      pdf.setTextColor(88, 28, 135);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Estate & IHT Shield Winner', margin + 3, y + 6);
      pdf.setFontSize(10);
      pdf.text(`${estateWinnerName} (${scoreEstateA} pts vs ${scoreEstateB} pts)`, margin + 3, y + 13);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Largest net estate passed to heirs at Age 85.', margin + 3, y + 18);

      // Dimension 4: Floor Safety
      pdf.setFillColor(254, 243, 199);
      pdf.setDrawColor(253, 230, 138);
      pdf.roundedRect(margin + cardWidth + 6, y, cardWidth, cardHeight, 2, 2, 'FD');
      pdf.setTextColor(120, 53, 15);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Guaranteed Floor Safety Winner', margin + cardWidth + 9, y + 6);
      pdf.setFontSize(10);
      pdf.text(`${floorWinnerName} (${scoreFloorA}% vs ${scoreFloorB}%)`, margin + cardWidth + 9, y + 13);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Highest DB/State/Annuity target coverage.', margin + cardWidth + 9, y + 18);

      y += cardHeight + 8;

      // Page overflow guard before Table 1
      if (y > 220) {
        pdf.addPage();
        addHeader(`${scenarioA.name} vs ${scenarioB.name}`, 'Milestone Projections');
        y = 20;
      }

      // Table 1: Milestone Wealth Projections
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('2. Portfolio Wealth & Net Income Milestones to Age 100', margin, y);
      y += 5;

      // Table Header
      pdf.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Age (Year)', margin + 3, y + 5);
      pdf.text(`${scenarioA.name} Wealth`, margin + 35, y + 5);
      pdf.text(`${scenarioB.name} Wealth`, margin + 85, y + 5);
      if (showScenarioC) {
        pdf.text(`${scenarioC.name} Wealth`, margin + 135, y + 5);
      } else {
        pdf.text('Wealth Delta (B - A)', margin + 135, y + 5);
      }
      y += 7;

      milestoneComparison.forEach((m, idx) => {
        pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        pdf.rect(margin, y, contentWidth, 6, 'F');
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.line(margin, y + 6, margin + contentWidth, y + 6);

        pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Age ${m.age} (${m.year})`, margin + 3, y + 4.5);
        pdf.text(`£${Math.round(m.potA).toLocaleString()} (£${Math.round(m.incA).toLocaleString()}/yr)`, margin + 35, y + 4.5);
        pdf.text(`£${Math.round(m.potB).toLocaleString()} (£${Math.round(m.incB).toLocaleString()}/yr)`, margin + 85, y + 4.5);

        if (showScenarioC) {
          pdf.text(`£${Math.round(m.potC).toLocaleString()} (£${Math.round(m.incC).toLocaleString()}/yr)`, margin + 135, y + 4.5);
        } else {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(m.diff >= 0 ? 16 : 225, m.diff >= 0 ? 185 : 29, m.diff >= 0 ? 129 : 72);
          pdf.text(`${m.diff >= 0 ? '+' : ''}£${Math.round(m.diff).toLocaleString()}`, margin + 135, y + 4.5);
        }
        y += 6;
      });

      y += 8;

      // Section 3: Risk-Adjusted Longevity & Stress Benchmark
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. Risk-Adjusted Stress Benchmark (Monte Carlo & 75-Year Historic Backtest)', margin, y);
      y += 5;

      // Table Header
      pdf.setFillColor(88, 28, 135);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Stress Test Metric', margin + 3, y + 5);
      pdf.text(scenarioA.name, margin + 70, y + 5);
      pdf.text(scenarioB.name, margin + 115, y + 5);
      if (showScenarioC) pdf.text(scenarioC.name, margin + 155, y + 5);
      y += 7;

      // Row 1: Monte Carlo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, y, contentWidth, 8, 'F');
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Monte Carlo Success Rate (300 Runs)', margin + 3, y + 5.5);
      pdf.text(`${mcSimA ? mcSimA.successRate + '%' : 'N/A'} (Med: £${Math.round(mcSimA?.medianEndPot || 0).toLocaleString()})`, margin + 70, y + 5.5);
      pdf.text(`${mcSimB ? mcSimB.successRate + '%' : 'N/A'} (Med: £${Math.round(mcSimB?.medianEndPot || 0).toLocaleString()})`, margin + 115, y + 5.5);
      if (showScenarioC) {
        pdf.text(`${mcSimC ? mcSimC.successRate + '%' : 'N/A'} (Med: £${Math.round(mcSimC?.medianEndPot || 0).toLocaleString()})`, margin + 155, y + 5.5);
      }
      y += 8;

      // Row 2: Historic 75-Year
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentWidth, 8, 'F');
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('75-Year Historic Backtest (1950-2024)', margin + 3, y + 5.5);
      pdf.text(`${historicA ? historicA.successRate + '%' : 'N/A'} (Worst Yr: ${historicA?.worstStartYear?.startYear ?? 'N/A'})`, margin + 70, y + 5.5);
      pdf.text(`${historicB ? historicB.successRate + '%' : 'N/A'} (Worst Yr: ${historicB?.worstStartYear?.startYear ?? 'N/A'})`, margin + 115, y + 5.5);
      if (showScenarioC) {
        pdf.text(`${historicC ? historicC.successRate + '%' : 'N/A'} (Worst Yr: ${historicC?.worstStartYear?.startYear ?? 'N/A'})`, margin + 155, y + 5.5);
      }
      y += 8;

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      pdf.text('RetireFree UK v2 — Professional Strategic Retirement Comparison Document', margin, pageHeight - 10);

      const safeNameA = scenarioA.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeNameB = scenarioB.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`RetireFree_UK_Comparison_${safeNameA}_vs_${safeNameB}${showScenarioC ? '_vs_' + scenarioC.name.replace(/[^a-zA-Z0-9_-]/g, '_') : ''}.pdf`);
      setExportSuccessMsg('Comparison PDF report exported successfully!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('PDF Comparison Export Error:', err);
      alert('Error generating PDF comparison report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div ref={containerRef} className="scroll-mt-20 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border-2 border-indigo-500/30 dark:border-indigo-500/40 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <span>Side-by-Side Strategy & Product Comparer</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/80 whitespace-nowrap">
                Institutional Benchmark
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Granular comparison of Primary & Partner parameters, flexible age-based income, and wealth to Age 100
            </p>
          </div>
        </div>

        {/* Top Actions: Swap, Inflation Toggle, Export CSV & Close */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => {
              setScenarioAId(scenarioBId);
              setScenarioBId(scenarioAId);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            title="Swap Scenario A and Scenario B"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Swap A ↔ B</span>
          </button>
          <button
            onClick={() => setIsRealTodayPounds(!isRealTodayPounds)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
              isRealTodayPounds
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle between future nominal £ and inflation-adjusted today's purchasing power"
          >
            <Coins className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{isRealTodayPounds ? 'Today’s Real £' : 'Future Nominal £'}</span>
          </button>
          <button
            onClick={() => setShowScenarioC(!showScenarioC)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border whitespace-nowrap ${
              showScenarioC
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showScenarioC ? 'Remove 3rd Scenario' : '+ Add 3rd Scenario'}</span>
          </button>
          <button
            onClick={handleExportComparisonCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportComparisonPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer whitespace-nowrap shadow-sm disabled:opacity-50"
          >
            {isExportingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Scenario Selectors (2 by default, 3 when showScenarioC is enabled) */}
      <div className={`grid grid-cols-1 ${showScenarioC ? 'lg:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        {/* Scenario A */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 dark:bg-slate-400" />
            <span>Scenario A (Baseline Plan):</span>
          </label>
          <select
            value={scenarioAId}
            onChange={(e) => setScenarioAId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-indigo-500 cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scenario B */}
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
          <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span>Scenario B (Comparison Plan):</span>
          </label>
          <select
            value={scenarioBId}
            onChange={(e) => setScenarioBId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold text-indigo-950 dark:text-indigo-100 focus:ring-indigo-500 cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Scenario C */}
        {showScenarioC && (
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>Scenario C (3rd Option):</span>
              </div>
              <button
                type="button"
                onClick={() => setShowScenarioC(false)}
                className="text-[10px] text-rose-600 font-bold hover:underline"
              >
                Remove
              </button>
            </label>
            <select
              value={scenarioCId}
              onChange={(e) => setScenarioCId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-950 dark:text-emerald-100 focus:ring-emerald-500 cursor-pointer"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* AUTOMATED EXECUTIVE SUMMARY & WINNER CALLOUT BANNER */}
      <div className="bg-gradient-to-br from-indigo-50 via-indigo-100 to-slate-50 dark:from-indigo-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white rounded-3xl p-5 shadow-lg border border-indigo-200 dark:border-indigo-700/60 space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-400/20 border border-amber-300 dark:border-amber-400/40 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                Executive Benchmark Takeaway
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Leading Strategy:</span>
                <span className="text-amber-700 dark:text-amber-300 font-black px-2.5 py-1 rounded-xl bg-amber-100/90 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 whitespace-normal break-words inline-block">
                  {winnerName}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/80 dark:bg-white/10 px-3.5 py-1.5 rounded-2xl border border-indigo-200 dark:border-white/10 text-xs whitespace-nowrap shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">
              {diffFromRunnerUp > 0
                ? `+${formatCurrency(diffFromRunnerUp)} Lead @ Age 85`
                : 'Identical Wealth Trajectory'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-700 dark:text-indigo-100/90 leading-relaxed">
          {showScenarioC ? (
            <>
              Comparing 3 scenarios at Age 85: <strong>{scenarioA.name}</strong> (£{Math.round((pot85A) || 0).toLocaleString()}), <strong>{scenarioB.name}</strong> (£{Math.round((pot85B) || 0).toLocaleString()}), and <strong>{scenarioC.name}</strong> (£{Math.round((pot85C) || 0).toLocaleString()}). <strong>{winnerName}</strong> leads with the highest portfolio wealth.
            </>
          ) : diffFromRunnerUp > 0 ? (
            <>
              <strong>{winnerCandidate.scenario.name}</strong> achieves a higher portfolio balance than <strong>{runnerUpCandidate.scenario.name}</strong> by <strong>£{Math.round((diffFromRunnerUp) || 0).toLocaleString()}</strong> at Age 85 (£{Math.round((winnerCandidate.pot) || 0).toLocaleString()} vs £{Math.round((runnerUpCandidate.pot) || 0).toLocaleString()}).
            </>
          ) : (
            <>
              Both scenarios exhibit identical net wealth outcomes under the configured parameters.
            </>
          )}
          {candidatePots.some((c) => c.dep) ? (
            <span className="block mt-1 font-semibold text-amber-800 dark:text-amber-200">
              ⚠️ Longevity Alert: {candidatePots.map((c) => `${c.scenario.name}: ${c.dep ? `Depletes at Age ${c.dep.age}` : 'Sustained past 95'}`).join(' | ')}.
            </span>
          ) : (
            <span className="block mt-1 text-emerald-700 dark:text-emerald-300 font-semibold">
              ✓ All evaluated plans maintain positive portfolio balances past Age 90.
            </span>
          )}
        </p>
      </div>

      {/* FEATURE 3: ENHANCED KPI DELTA CARDS & SIDE-BY-SIDE MILESTONES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Age 75 Net Wealth */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Portfolio Wealth @ Age 75
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {formatCurrency(pot75A)}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              B: {formatCurrency(pot75B)}
            </div>
          </div>
          {pot75B !== pot75A && (
            <div className={`text-[10px] font-extrabold px-2 py-1 rounded-md inline-block whitespace-nowrap ${pot75B > pot75A ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              {pot75B > pot75A ? `+${formatCurrency(pot75B - pot75A)} (+${pot75A > 0 ? ((pot75B - pot75A) / pot75A * 100).toFixed(1) : 0}%)` : `-${formatCurrency(pot75A - pot75B)}`} in Scenario B
            </div>
          )}
        </div>

        {/* Card 2: Age 85 Net Wealth */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Portfolio Wealth @ Age 85
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {formatCurrency(pot85A > 0 ? pot85A : 0)}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              B: {formatCurrency(pot85B > 0 ? pot85B : 0)}
            </div>
          </div>
          {pot85B !== pot85A && (
            <div className={`text-[10px] font-extrabold px-2 py-1 rounded-md inline-block whitespace-nowrap ${pot85B > pot85A ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              {pot85B > pot85A ? `+${formatCurrency(pot85B - pot85A)} (+${pot85A > 0 ? ((pot85B - pot85A) / pot85A * 100).toFixed(1) : 0}%)` : `-${formatCurrency(pot85A - pot85B)}`} in Scenario B
            </div>
          )}
        </div>

        {/* Card 3: Lifetime Income Tax Friction */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Lifetime Tax Paid (Total)
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {formatCurrency(lifetimeTaxA)}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              B: {formatCurrency(lifetimeTaxB)}
            </div>
          </div>
          {lifetimeTaxB !== lifetimeTaxA && (
            <div className={`text-[10px] font-extrabold px-2 py-1 rounded-md inline-block whitespace-nowrap ${lifetimeTaxB < lifetimeTaxA ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
              {lifetimeTaxB < lifetimeTaxA ? `✓ Save ${formatCurrency(lifetimeTaxA - lifetimeTaxB)} Tax in B` : `+${formatCurrency(lifetimeTaxB - lifetimeTaxA)} Tax in B`}
            </div>
          )}
        </div>

        {/* Card 4: Net Estate to Heirs @ Age 85 */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Net Estate to Heirs @ Age 85
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {formatCurrency(ihtA85.netPassedToHeirs)}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              B: {formatCurrency(ihtB85.netPassedToHeirs)}
            </div>
          </div>
          {ihtB85.netPassedToHeirs !== ihtA85.netPassedToHeirs && (
            <div className={`text-[10px] font-extrabold px-2 py-1 rounded-md inline-block whitespace-nowrap ${ihtB85.netPassedToHeirs > ihtA85.netPassedToHeirs ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              {ihtB85.netPassedToHeirs > ihtA85.netPassedToHeirs ? `+${formatCurrency(ihtB85.netPassedToHeirs - ihtA85.netPassedToHeirs)} Estate in B` : `-${formatCurrency(ihtA85.netPassedToHeirs - ihtB85.netPassedToHeirs)} Estate in B`}
            </div>
          )}
        </div>
      </div>

      {/* FEATURE 1: OVERLAID TRAJECTORY COMPARISON CHART WITH INTERACTIVE METRIC SELECTOR */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
              {chartMetric === 'wealth' && 'Portfolio Wealth Trajectory (£) — Age ' + currentAge + ' to 100'}
              {chartMetric === 'income' && 'Annual Net Retirement Income (£/yr) — Age ' + currentAge + ' to 100'}
              {chartMetric === 'tax' && 'Annual Income Tax Paid (£/yr) — Age ' + currentAge + ' to 100'}
              {chartMetric === 'guaranteed' && 'Guaranteed Income Floor (£/yr) — Age ' + currentAge + ' to 100'}
            </h3>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 self-start md:self-auto">
            <button
              onClick={() => setChartMetric('wealth')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                chartMetric === 'wealth'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              💰 Wealth Trajectory
            </button>
            <button
              onClick={() => setChartMetric('income')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                chartMetric === 'income'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              💵 Net Income
            </button>
            <button
              onClick={() => setChartMetric('tax')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                chartMetric === 'tax'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              🏛️ Tax Paid
            </button>
            <button
              onClick={() => setChartMetric('guaranteed')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                chartMetric === 'guaranteed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              🛡️ Guaranteed Floor
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <span className="w-3 h-1 bg-slate-600 rounded-full inline-block" />
            {scenarioA.name}
          </span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <span className="w-3 h-1 bg-indigo-600 rounded-full inline-block" />
            {scenarioB.name}
          </span>
          {showScenarioC && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-1 bg-emerald-600 rounded-full inline-block" />
              {scenarioC.name}
            </span>
          )}
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(val) => (val >= 1000000 ? `£${(val / 1000000).toFixed(1)}M` : `£${(val / 1000).toFixed(0)}k`)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(val: number) => [
                  `£${Math.round(val || 0).toLocaleString()}`,
                  chartMetric === 'wealth' ? 'Total Wealth' : chartMetric === 'income' ? 'Annual Net Income' : chartMetric === 'tax' ? 'Income Tax Paid' : 'Guaranteed Floor'
                ]}
                labelFormatter={(label) => `Age ${label}`}
              />
              <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey={scenarioA.name}
                stroke="#64748b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey={scenarioB.name}
                stroke="#6366f1"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{ r: 6 }}
              />
              {showScenarioC && (
                <Line
                  type="monotone"
                  dataKey={scenarioC.name}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FEATURE 4: MULTI-DIMENSIONAL SCENARIO RECOMMENDATION & TRADE-OFF SCORECARD */}
      <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-3xl border border-indigo-200 dark:border-indigo-800/60 space-y-4 shadow-xl transition-colors">
        <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800/60 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
              Multi-Dimensional Scenario Recommendation & Trade-Off Scorecard
            </h3>
          </div>
          <span className="text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-800/80 px-2.5 py-1 rounded-full text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
            4-Dimensional Assessment
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Dimension 1: Longevity */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Capital Longevity</span>
              </div>
              <div className="flex items-start gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 rounded-xl text-xs border border-emerald-200 dark:border-emerald-800/80">
                <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 font-extrabold text-emerald-900 dark:text-emerald-200 whitespace-normal break-words">
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mr-1.5">Winner:</span>
                  {longevityWinnerName}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200">{longevityWinnerName}</strong> maintains the highest net asset cushion at Age 85/90, offering the strongest longevity shield against drawdown depletion.
            </p>
          </div>

          {/* Dimension 2: Tax Efficiency */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Tax Efficiency</span>
              </div>
              <div className="flex items-start gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2.5 py-1.5 rounded-xl text-xs border border-indigo-200 dark:border-indigo-800/80">
                <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="min-w-0 font-extrabold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words">
                  <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 mr-1.5">Winner:</span>
                  {taxWinnerName}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200">{taxWinnerName}</strong> minimizes cumulative retirement HMRC income tax friction (total tax {formatCurrency(taxCandidates[0].tax)}), leaving higher net spendable cash.
            </p>
          </div>

          {/* Dimension 3: Inheritance & Estate Protection */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Estate & IHT Shield</span>
              </div>
              <div className="flex items-start gap-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2.5 py-1.5 rounded-xl text-xs border border-purple-200 dark:border-purple-800/80">
                <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="min-w-0 font-extrabold text-purple-950 dark:text-purple-200 whitespace-normal break-words">
                  <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 mr-1.5">Winner:</span>
                  {estateWinnerName}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200">{estateWinnerName}</strong> passes the largest net estate to beneficiaries at Age 85 ({formatCurrency(estateCandidates[0].netEstate)}) after accounting for 40% UK IHT thresholds.
            </p>
          </div>

          {/* Dimension 4: Guaranteed Floor Protection */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Floor Safety</span>
              </div>
              <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 rounded-xl text-xs border border-amber-200 dark:border-amber-800/80">
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 font-extrabold text-amber-950 dark:text-amber-200 whitespace-normal break-words">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 mr-1.5">Winner:</span>
                  {floorWinnerName}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200">{floorWinnerName}</strong> secures the highest guaranteed floor coverage ({floorCandidates[0].cov}% of target expenditure covered by DB/State/Annuity streams).
            </p>
          </div>
        </div>

        {/* VISUAL TRADE-OFF SPIDER / RADAR CHART */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Visual Trade-Off Spider / Radar Profile (0–100 Scale)</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Outer perimeter = 100 Max Score
            </span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#cbd5e1" opacity={0.6} />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name={scenarioA.name} dataKey={scenarioA.name} stroke="#64748b" fill="#64748b" fillOpacity={0.25} />
                <Radar name={scenarioB.name} dataKey={scenarioB.name} stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                {showScenarioC && (
                  <Radar name={scenarioC.name} dataKey={scenarioC.name} stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                )}
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 1: KEY STRUCTURAL DIFFERENCES DETAILED FOR PRIMARY & PARTNER */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>1. Key Structural Differences Detailed for Primary & Partner</span>
          </h3>
          <button
            onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showOnlyDifferences
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showOnlyDifferences ? 'Showing Differences Only (Active)' : 'Filter: Show Differences Only'}</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">Structural Parameter</th>
                <th className="py-3 px-4 text-slate-900 dark:text-slate-100">{scenarioA.name}</th>
                <th className="py-3 px-4 text-indigo-700 dark:text-indigo-300">{scenarioB.name}</th>
                {showScenarioC && (
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-300">{scenarioC.name}</th>
                )}
                <th className="py-3 px-4 text-slate-600 dark:text-slate-400">Strategic Alignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              
              {/* Couple vs Single Planning Mode */}
              {(!showOnlyDifferences || (scenarioA.profile.isCouplePlanning !== scenarioB.profile.isCouplePlanning || (showScenarioC && scenarioA.profile.isCouplePlanning !== scenarioC.profile.isCouplePlanning))) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Planning Mode</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {scenarioA.profile.isCouplePlanning ? 'Couple Dual Planning' : 'Single Individual Planning'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {scenarioB.profile.isCouplePlanning ? 'Couple Dual Planning' : 'Single Individual Planning'}
                    </span>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {scenarioC.profile.isCouplePlanning ? 'Couple Dual Planning' : 'Single Individual Planning'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    {scenarioA.profile.isCouplePlanning === scenarioB.profile.isCouplePlanning ? 'Matching household model' : 'Couple vs Single Household Shift'}
                  </td>
                </tr>
              )}

              {/* Primary Member Details */}
              {(!showOnlyDifferences || (scenarioA.profile.targetRetirementAge !== scenarioB.profile.targetRetirementAge || scenarioA.profile.grossAnnualSalary !== scenarioB.profile.grossAnnualSalary || (showScenarioC && (scenarioA.profile.targetRetirementAge !== scenarioC.profile.targetRetirementAge || scenarioA.profile.grossAnnualSalary !== scenarioC.profile.grossAnnualSalary)))) && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Primary Member Details</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold">{scenarioA.profile.name || 'Primary'} (Age {scenarioA.profile.currentAge})</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Retire Age: {scenarioA.profile.targetRetirementAge} | Access: {scenarioA.profile.pensionAccessAge || 57} | State: {scenarioA.profile.statePensionAge || 67}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Gross Salary: £{(scenarioA.profile.grossAnnualSalary || 0).toLocaleString()}/yr
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-indigo-950 dark:text-indigo-100">{scenarioB.profile.name || 'Primary'} (Age {scenarioB.profile.currentAge})</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Retire Age: {scenarioB.profile.targetRetirementAge} | Access: {scenarioB.profile.pensionAccessAge || 57} | State: {scenarioB.profile.statePensionAge || 67}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Gross Salary: £{(scenarioB.profile.grossAnnualSalary || 0).toLocaleString()}/yr
                    </div>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-950 dark:text-emerald-100">{scenarioC.profile.name || 'Primary'} (Age {scenarioC.profile.currentAge})</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Retire Age: {scenarioC.profile.targetRetirementAge} | Access: {scenarioC.profile.pensionAccessAge || 57} | State: {scenarioC.profile.statePensionAge || 67}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Gross Salary: £{(scenarioC.profile.grossAnnualSalary || 0).toLocaleString()}/yr
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Primary timeline & salary parameters
                  </td>
                </tr>
              )}

              {/* Partner Member Details */}
              {(!showOnlyDifferences || (scenarioA.profile.partnerTargetRetirementAge !== scenarioB.profile.partnerTargetRetirementAge || scenarioA.profile.partnerGrossAnnualSalary !== scenarioB.profile.partnerGrossAnnualSalary || (showScenarioC && (scenarioA.profile.partnerTargetRetirementAge !== scenarioC.profile.partnerTargetRetirementAge || scenarioA.profile.partnerGrossAnnualSalary !== scenarioC.profile.partnerGrossAnnualSalary)))) && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Partner Member Details</span>
                  </td>
                  <td className="py-3 px-4">
                    {scenarioA.profile.isCouplePlanning ? (
                      <div>
                        <div className="font-bold">{scenarioA.profile.partnerName || 'Partner'} (Age {scenarioA.profile.partnerCurrentAge || scenarioA.profile.currentAge})</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Retire Age: {scenarioA.profile.partnerTargetRetirementAge || scenarioA.profile.targetRetirementAge} | Access: {scenarioA.profile.partnerPensionAccessAge || 57} | State: {scenarioA.profile.partnerStatePensionAge || 67}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          Gross Salary: £{(scenarioA.profile.partnerGrossAnnualSalary || 0).toLocaleString()}/yr
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not Applicable (Single Mode)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {scenarioB.profile.isCouplePlanning ? (
                      <div>
                        <div className="font-bold text-indigo-950 dark:text-indigo-100">{scenarioB.profile.partnerName || 'Partner'} (Age {scenarioB.profile.partnerCurrentAge || scenarioB.profile.currentAge})</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Retire Age: {scenarioB.profile.partnerTargetRetirementAge || scenarioB.profile.targetRetirementAge} | Access: {scenarioB.profile.partnerPensionAccessAge || 57} | State: {scenarioB.profile.partnerStatePensionAge || 67}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                          Gross Salary: £{(scenarioB.profile.partnerGrossAnnualSalary || 0).toLocaleString()}/yr
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not Applicable (Single Mode)</span>
                    )}
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      {scenarioC.profile.isCouplePlanning ? (
                        <div>
                          <div className="font-bold text-emerald-950 dark:text-emerald-100">{scenarioC.profile.partnerName || 'Partner'} (Age {scenarioC.profile.partnerCurrentAge || scenarioC.profile.currentAge})</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Retire Age: {scenarioC.profile.partnerTargetRetirementAge || scenarioC.profile.targetRetirementAge} | Access: {scenarioC.profile.partnerPensionAccessAge || 57} | State: {scenarioC.profile.partnerStatePensionAge || 67}
                          </div>
                          <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                            Gross Salary: £{(scenarioC.profile.partnerGrossAnnualSalary || 0).toLocaleString()}/yr
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Applicable (Single Mode)</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Partner timeline & salary parameters
                  </td>
                </tr>
              )}

              {/* Initial Starting Wealth & Pots */}
              {(!showOnlyDifferences || (
                ((scenarioA.pots.workplacePensionBalance || 0) + (scenarioA.pots.sippBalance || 0) + (scenarioA.pots.stocksAndSharesIsaBalance || 0) + (scenarioA.pots.cashGiaBalance || 0)) !==
                ((scenarioB.pots.workplacePensionBalance || 0) + (scenarioB.pots.sippBalance || 0) + (scenarioB.pots.stocksAndSharesIsaBalance || 0) + (scenarioB.pots.cashGiaBalance || 0)) ||
                (showScenarioC && ((scenarioA.pots.workplacePensionBalance || 0) + (scenarioA.pots.sippBalance || 0) + (scenarioA.pots.stocksAndSharesIsaBalance || 0) + (scenarioA.pots.cashGiaBalance || 0)) !==
                  ((scenarioC.pots.workplacePensionBalance || 0) + (scenarioC.pots.sippBalance || 0) + (scenarioC.pots.stocksAndSharesIsaBalance || 0) + (scenarioC.pots.cashGiaBalance || 0)))
              )) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Initial Wealth Pots</td>
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100">
                      £{(((scenarioA.pots.workplacePensionBalance || 0) + (scenarioA.pots.sippBalance || 0) + (scenarioA.pots.stocksAndSharesIsaBalance || 0) + (scenarioA.pots.cashGiaBalance || 0))).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pensions: £{(((scenarioA.pots.workplacePensionBalance || 0) + (scenarioA.pots.sippBalance || 0))).toLocaleString()} | ISA: £{(scenarioA.pots.stocksAndSharesIsaBalance || 0).toLocaleString()} | Cash: £{(scenarioA.pots.cashGiaBalance || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-indigo-950 dark:text-indigo-100">
                      £{(((scenarioB.pots.workplacePensionBalance || 0) + (scenarioB.pots.sippBalance || 0) + (scenarioB.pots.stocksAndSharesIsaBalance || 0) + (scenarioB.pots.cashGiaBalance || 0))).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pensions: £{(((scenarioB.pots.workplacePensionBalance || 0) + (scenarioB.pots.sippBalance || 0))).toLocaleString()} | ISA: £{(scenarioB.pots.stocksAndSharesIsaBalance || 0).toLocaleString()} | Cash: £{(scenarioB.pots.cashGiaBalance || 0).toLocaleString()}
                    </div>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-emerald-950 dark:text-emerald-100">
                        £{(((scenarioC.pots.workplacePensionBalance || 0) + (scenarioC.pots.sippBalance || 0) + (scenarioC.pots.stocksAndSharesIsaBalance || 0) + (scenarioC.pots.cashGiaBalance || 0))).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Pensions: £{(((scenarioC.pots.workplacePensionBalance || 0) + (scenarioC.pots.sippBalance || 0))).toLocaleString()} | ISA: £{(scenarioC.pots.stocksAndSharesIsaBalance || 0).toLocaleString()} | Cash: £{(scenarioC.pots.cashGiaBalance || 0).toLocaleString()}
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Starting asset capital allocation
                  </td>
                </tr>
              )}

              {/* Monthly Contributions Rate */}
              {(!showOnlyDifferences || (
                ((scenarioA.profile.monthlyPensionContribution || 0) + (scenarioA.profile.monthlyIsaContribution || 0)) !==
                ((scenarioB.profile.monthlyPensionContribution || 0) + (scenarioB.profile.monthlyIsaContribution || 0)) ||
                (showScenarioC && ((scenarioA.profile.monthlyPensionContribution || 0) + (scenarioA.profile.monthlyIsaContribution || 0)) !==
                  ((scenarioC.profile.monthlyPensionContribution || 0) + (scenarioC.profile.monthlyIsaContribution || 0)))
              )) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Monthly Contribution Rates</td>
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100">
                      £{(((scenarioA.profile.monthlyPensionContribution || 0) + (scenarioA.profile.monthlyIsaContribution || 0))).toLocaleString()}/pm
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pension: £{(scenarioA.profile.monthlyPensionContribution || 0).toLocaleString()} | ISA: £{(scenarioA.profile.monthlyIsaContribution || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-indigo-950 dark:text-indigo-100">
                      £{(((scenarioB.profile.monthlyPensionContribution || 0) + (scenarioB.profile.monthlyIsaContribution || 0))).toLocaleString()}/pm
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Pension: £{(scenarioB.profile.monthlyPensionContribution || 0).toLocaleString()} | ISA: £{(scenarioB.profile.monthlyIsaContribution || 0).toLocaleString()}
                    </div>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-emerald-950 dark:text-emerald-100">
                        £{(((scenarioC.profile.monthlyPensionContribution || 0) + (scenarioC.profile.monthlyIsaContribution || 0))).toLocaleString()}/pm
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Pension: £{(scenarioC.profile.monthlyPensionContribution || 0).toLocaleString()} | ISA: £{(scenarioC.profile.monthlyIsaContribution || 0).toLocaleString()}
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Monthly savings & accumulation speed
                  </td>
                </tr>
              )}

              {/* Product Strategy Primary & Partner */}
              {(!showOnlyDifferences || (
                scenarioA.profile.incomeProductOption !== scenarioB.profile.incomeProductOption ||
                scenarioA.profile.partnerIncomeProductOption !== scenarioB.profile.partnerIncomeProductOption ||
                (showScenarioC && (scenarioA.profile.incomeProductOption !== scenarioC.profile.incomeProductOption || scenarioA.profile.partnerIncomeProductOption !== scenarioC.profile.partnerIncomeProductOption))
              )) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Income Product Strategy</td>
                  <td className="py-3 px-4">
                    <div>Primary: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{scenarioA.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                    {scenarioA.profile.isCouplePlanning && (
                      <div className="mt-1">Partner: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{scenarioA.profile.partnerIncomeProductOption || scenarioA.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div>Primary: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">{scenarioB.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                    {scenarioB.profile.isCouplePlanning && (
                      <div className="mt-1">Partner: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">{scenarioB.profile.partnerIncomeProductOption || scenarioB.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                    )}
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <div>Primary: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{scenarioC.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                      {scenarioC.profile.isCouplePlanning && (
                        <div className="mt-1">Partner: <strong className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">{scenarioC.profile.partnerIncomeProductOption || scenarioC.profile.incomeProductOption || 'flexi_drawdown'}</strong></div>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Decumulation product selection
                  </td>
                </tr>
              )}

              {/* Drawdown Strategy */}
              {(!showOnlyDifferences || (
                scenarioA.profile.drawdownStrategy !== scenarioB.profile.drawdownStrategy ||
                (showScenarioC && scenarioA.profile.drawdownStrategy !== scenarioC.profile.drawdownStrategy)
              )) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Drawdown Asset Sequencing</td>
                  <td className="py-3 px-4 font-semibold">{formatStrategy(scenarioA.profile.drawdownStrategy)}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-700 dark:text-indigo-300">{formatStrategy(scenarioB.profile.drawdownStrategy)}</td>
                  {showScenarioC && (
                    <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-300">{formatStrategy(scenarioC.profile.drawdownStrategy)}</td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Asset depletion sequence
                  </td>
                </tr>
              )}

              {/* Target Net Income Requirement & Flexible Spending */}
              {(!showOnlyDifferences || (
                scenarioA.profile.targetRetirementIncomeAnnual !== scenarioB.profile.targetRetirementIncomeAnnual ||
                scenarioA.profile.enableFlexibleSpending !== scenarioB.profile.enableFlexibleSpending ||
                (showScenarioC && (scenarioA.profile.targetRetirementIncomeAnnual !== scenarioC.profile.targetRetirementIncomeAnnual || scenarioA.profile.enableFlexibleSpending !== scenarioC.profile.enableFlexibleSpending))
              )) && (
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                    <div>Target Net Income Requirement</div>
                    <div className="text-[10px] text-slate-400 font-normal">Reflects Flexible Age-Based Spending</div>
                  </td>
                  <td className="py-3 px-4">
                    {scenarioA.profile.enableFlexibleSpending ? (
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          Go-Go Phase: £{(scenarioA.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Slow-Go (75–84): £{Math.round((scenarioA.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioA.profile.slowGoSpendingPercent ?? 80) / 100)).toLocaleString()}/yr ({scenarioA.profile.slowGoSpendingPercent ?? 80}%)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          No-Go (85+): £{Math.round((scenarioA.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioA.profile.noGoSpendingPercent ?? 65) / 100)).toLocaleString()}/yr ({scenarioA.profile.noGoSpendingPercent ?? 65}%)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          £{(scenarioA.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                        </div>
                        <div className="text-[10px] text-slate-400 italic">Flat Target (Unindexed/Indexed)</div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {scenarioB.profile.enableFlexibleSpending ? (
                      <div className="space-y-1">
                        <div className="font-extrabold text-indigo-950 dark:text-indigo-100">
                          Go-Go Phase: £{(scenarioB.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Slow-Go (75–84): £{Math.round((scenarioB.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioB.profile.slowGoSpendingPercent ?? 80) / 100)).toLocaleString()}/yr ({scenarioB.profile.slowGoSpendingPercent ?? 80}%)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          No-Go (85+): £{Math.round((scenarioB.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioB.profile.noGoSpendingPercent ?? 65) / 100)).toLocaleString()}/yr ({scenarioB.profile.noGoSpendingPercent ?? 65}%)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-extrabold text-indigo-950 dark:text-indigo-100">
                          £{(scenarioB.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                        </div>
                        <div className="text-[10px] text-slate-400 italic">Flat Target (Unindexed/Indexed)</div>
                      </div>
                    )}
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      {scenarioC.profile.enableFlexibleSpending ? (
                        <div className="space-y-1">
                          <div className="font-extrabold text-emerald-950 dark:text-emerald-100">
                            Go-Go Phase: £{(scenarioC.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Slow-Go (75–84): £{Math.round((scenarioC.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioC.profile.slowGoSpendingPercent ?? 80) / 100)).toLocaleString()}/yr ({scenarioC.profile.slowGoSpendingPercent ?? 80}%)
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            No-Go (85+): £{Math.round((scenarioC.profile.targetRetirementIncomeAnnual || 32000) * ((scenarioC.profile.noGoSpendingPercent ?? 65) / 100)).toLocaleString()}/yr ({scenarioC.profile.noGoSpendingPercent ?? 65}%)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-extrabold text-emerald-950 dark:text-emerald-100">
                            £{(scenarioC.profile.targetRetirementIncomeAnnual || 32000).toLocaleString()}/yr
                          </div>
                          <div className="text-[10px] text-slate-400 italic">Flat Target (Unindexed/Indexed)</div>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    {scenarioA.profile.enableFlexibleSpending || scenarioB.profile.enableFlexibleSpending || scenarioC.profile.enableFlexibleSpending
                      ? 'Flexible age-based spending model active'
                      : 'Standard flat income target model'}
                  </td>
                </tr>
              )}

              {/* Pre-Retirement Investment Return */}
              {(!showOnlyDifferences || (
                scenarioA.profile.expectedInvestmentReturn !== scenarioB.profile.expectedInvestmentReturn ||
                (showScenarioC && scenarioA.profile.expectedInvestmentReturn !== scenarioC.profile.expectedInvestmentReturn)
              )) && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Pre-Retirement Investment Return</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{scenarioA.profile.expectedInvestmentReturn ?? 6.5}% p.a.</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Real: +{((scenarioA.profile.expectedInvestmentReturn ?? 6.5) - (scenarioA.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{scenarioB.profile.expectedInvestmentReturn ?? 6.5}% p.a.</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Real: +{((scenarioB.profile.expectedInvestmentReturn ?? 6.5) - (scenarioB.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                    </span>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{scenarioC.profile.expectedInvestmentReturn ?? 6.5}% p.a.</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Real: +{((scenarioC.profile.expectedInvestmentReturn ?? 6.5) - (scenarioC.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Pre-retirement accumulation growth
                  </td>
                </tr>
              )}

              {/* Post-Retirement Investment Return */}
              {(!showOnlyDifferences || (
                scenarioA.profile.postRetirementReturn !== scenarioB.profile.postRetirementReturn ||
                (showScenarioC && scenarioA.profile.postRetirementReturn !== scenarioC.profile.postRetirementReturn)
              )) && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Post-Retirement Investment Return</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{scenarioA.profile.postRetirementReturn ?? 4.5}% p.a.</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Real: +{((scenarioA.profile.postRetirementReturn ?? 4.5) - (scenarioA.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{scenarioB.profile.postRetirementReturn ?? 4.5}% p.a.</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Real: +{((scenarioB.profile.postRetirementReturn ?? 4.5) - (scenarioB.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                    </span>
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{scenarioC.profile.postRetirementReturn ?? 4.5}% p.a.</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Real: +{((scenarioC.profile.postRetirementReturn ?? 4.5) - (scenarioC.profile.expectedInflationRate ?? 2.5)).toFixed(1)}% p.a.
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Post-retirement decumulation growth
                  </td>
                </tr>
              )}

              {/* Expected Inflation Rate */}
              {(!showOnlyDifferences || (
                scenarioA.profile.expectedInflationRate !== scenarioB.profile.expectedInflationRate ||
                (showScenarioC && scenarioA.profile.expectedInflationRate !== scenarioC.profile.expectedInflationRate)
              )) && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Expected Annual CPI Inflation</td>
                  <td className="py-3 px-4 font-bold text-amber-700 dark:text-amber-400">
                    {scenarioA.profile.expectedInflationRate ?? 2.5}% p.a.
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-700 dark:text-amber-400">
                    {scenarioB.profile.expectedInflationRate ?? 2.5}% p.a.
                  </td>
                  {showScenarioC && (
                    <td className="py-3 px-4 font-bold text-amber-700 dark:text-amber-400">
                      {scenarioC.profile.expectedInflationRate ?? 2.5}% p.a.
                    </td>
                  )}
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                    CPI inflation indexing
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: ITEMIZED GUARANTEED INCOME FLOORS FOR PRIMARY & PARTNER */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>2. Itemized Guaranteed Income Floors (Primary & Partner Details)</span>
        </h3>

        <div className={`grid grid-cols-1 ${showScenarioC ? 'lg:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
          
          {/* Scenario A Guaranteed Floor Itemized Table */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{scenarioA.name} — Guaranteed Income Streams</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${floorStateA.coveragePct >= 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                {floorStateA.coveragePct}% Floor Coverage @ Age 67
              </span>
            </div>

            {streamsA.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">No guaranteed income streams configured.</div>
            ) : (
              <div className="space-y-2">
                {streamsA.map((item) => (
                  <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${item.owner === 'Partner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'}`}>
                          {item.owner}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Start: Age {item.startAge} ({item.startYear}) | {item.indexing}
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-right">
                      {formatCurrency(item.annualAmount)}/yr
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">Total Guaranteed Floor @ State Age (67):</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(floorStateA.totalFloor)}/yr</span>
            </div>
          </div>

          {/* Scenario B Guaranteed Floor Itemized Table */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2">
              <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-100">{scenarioB.name} — Guaranteed Income Streams</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${floorStateB.coveragePct >= 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                {floorStateB.coveragePct}% Floor Coverage @ Age 67
              </span>
            </div>

            {streamsB.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">No guaranteed income streams configured.</div>
            ) : (
              <div className="space-y-2">
                {streamsB.map((item) => (
                  <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${item.owner === 'Partner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'}`}>
                          {item.owner}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Start: Age {item.startAge} ({item.startYear}) | {item.indexing}
                      </div>
                    </div>
                    <div className="font-extrabold text-indigo-950 dark:text-indigo-100 text-right">
                      {formatCurrency(item.annualAmount)}/yr
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-800 text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-300">Total Guaranteed Floor @ State Age (67):</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(floorStateB.totalFloor)}/yr</span>
            </div>
          </div>

          {/* Scenario C Guaranteed Floor Itemized Table */}
          {showScenarioC && floorStateC && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2">
                <span className="font-extrabold text-xs text-emerald-950 dark:text-emerald-100">{scenarioC.name} — Guaranteed Income Streams</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${floorStateC.coveragePct >= 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                  {floorStateC.coveragePct}% Floor Coverage @ Age 67
                </span>
              </div>

              {streamsC.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No guaranteed income streams configured.</div>
              ) : (
                <div className="space-y-2">
                  {streamsC.map((item) => (
                    <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${item.owner === 'Partner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'}`}>
                            {item.owner}
                          </span>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Start: Age {item.startAge} ({item.startYear}) | {item.indexing}
                        </div>
                      </div>
                      <div className="font-extrabold text-emerald-950 dark:text-emerald-100 text-right">
                        {formatCurrency(item.annualAmount)}/yr
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">Total Guaranteed Floor @ State Age (67):</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(floorStateC.totalFloor)}/yr</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SECTION 3: WEALTH BREAKDOWN AT KEY MILESTONE AGES (INCLUDES AGE 100) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>3. Portfolio Wealth Breakdown at Key Milestone Ages (57, Start, 67, 80, 90, Age 100)</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            {showScenarioC ? '3-Plan Side-by-Side Milestone Matrix' : `Delta = ${scenarioB.name} - ${scenarioA.name}`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">Milestone Age (Year)</th>
                <th className="py-3 px-4 text-slate-900 dark:text-slate-100">{scenarioA.name} Wealth & Pots</th>
                <th className="py-3 px-4 text-indigo-700 dark:text-indigo-300">{scenarioB.name} Wealth & Pots</th>
                {showScenarioC && (
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-300">{scenarioC.name} Wealth & Pots</th>
                )}
                <th className="py-3 px-4 text-right">{showScenarioC ? 'Annual Income Comparison' : 'Wealth Delta (£)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {milestoneComparison.map((m) => (
                <tr key={m.age} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Age {m.age} ({m.year})</span>
                      {m.age === 100 && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Century Horizon
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {m.age === 100 ? 'Age 100 Century Longevity' : m.age === targetAgeA ? 'Retirement Start A' : m.age === 67 ? 'State Pension Age' : m.age === 57 ? 'Pension Access Age' : m.age === 90 ? 'Late Retirement (90)' : `Age ${m.age}`}
                    </div>
                  </td>

                  {/* Scenario A Pots */}
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {formatCurrency(m.potA)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                        Pension: {formatCurrency(m.penA)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                        ISA: {formatCurrency(m.isaA)}
                      </span>
                      {m.cashA > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                          Cash: {formatCurrency(m.cashA)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Scenario B Pots */}
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-indigo-950 dark:text-indigo-100 text-sm">
                      {formatCurrency(m.potB)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                        Pension: {formatCurrency(m.penB)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                        ISA: {formatCurrency(m.isaB)}
                      </span>
                      {m.cashB > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                          Cash: {formatCurrency(m.cashB)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Scenario C Pots */}
                  {showScenarioC && (
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-emerald-950 dark:text-emerald-100 text-sm">
                        {formatCurrency(m.potC)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                          Pension: {formatCurrency(m.penC)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                          ISA: {formatCurrency(m.isaC)}
                        </span>
                        {m.cashC > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                            Cash: {formatCurrency(m.cashC)}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Wealth Difference / Income Details */}
                  <td className="py-3.5 px-4 text-right">
                    {showScenarioC ? (
                      <div className="text-[11px] font-bold space-y-0.5 text-right">
                        <div>A: {formatCurrency(m.incA)}/yr</div>
                        <div className="text-indigo-600 dark:text-indigo-400">B: {formatCurrency(m.incB)}/yr</div>
                        <div className="text-emerald-600 dark:text-emerald-400">C: {formatCurrency(m.incC)}/yr</div>
                      </div>
                    ) : (
                      <span className={`font-extrabold text-xs px-2.5 py-1 rounded-xl border ${m.diff > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : m.diff < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'}`}>
                        {m.diff > 0 ? '+' : ''}{formatCurrency(m.diff)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: POTENTIAL TAX-FREE LUMP SUM (PCLS & LSA) COMPARISON */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>4. Potential Tax-Free Lump Sum (PCLS & LSA Allowance) Comparison</span>
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            HMRC 25% PCLS & £268.3k LSA Cap
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">PCLS Parameter / Metric</th>
                <th className="py-3 px-4 text-slate-900 dark:text-slate-100">{scenarioA.name}</th>
                <th className="py-3 px-4 text-indigo-700 dark:text-indigo-300">{scenarioB.name}</th>
                {showScenarioC && (
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-300">{scenarioC.name}</th>
                )}
                <th className="py-3 px-4 text-slate-600 dark:text-slate-400 text-right">{showScenarioC ? 'Comparison' : 'Tax-Free Delta'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              
              {/* Primary Pension Balance at Take Age */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                  <div>Primary Pension Balance @ Take Age</div>
                  <div className="text-[10px] text-slate-400 font-normal">Projected pot at Age {pclsA.primaryTakeAge}</div>
                </td>
                <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                  {formatCurrency(pclsA.primaryPensionPotAtTake)}
                </td>
                <td className="py-3 px-4 font-extrabold text-indigo-950 dark:text-indigo-100">
                  {formatCurrency(pclsB.primaryPensionPotAtTake)}
                </td>
                {showScenarioC && pclsC && (
                  <td className="py-3 px-4 font-extrabold text-emerald-950 dark:text-emerald-100">
                    {formatCurrency(pclsC.primaryPensionPotAtTake)}
                  </td>
                )}
                <td className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400">
                  {formatCurrency(pclsB.primaryPensionPotAtTake - pclsA.primaryPensionPotAtTake)} pot diff
                </td>
              </tr>

              {/* Primary Max Tax-Free Cash */}
              <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <div>Primary Potential Max Tax-Free Cash</div>
                  <div className="text-[10px] text-slate-400 font-normal">Min(25% Pension Pot, LSA £{(pclsA.primaryLsaLimit/1000).toFixed(1)}k)</div>
                </td>
                <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                  {formatCurrency(pclsA.primaryMaxTaxFreeCash)}
                  {pclsA.primaryIsCapped && (
                    <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                  )}
                </td>
                <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                  {formatCurrency(pclsB.primaryMaxTaxFreeCash)}
                  {pclsB.primaryIsCapped && (
                    <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                  )}
                </td>
                {showScenarioC && pclsC && (
                  <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                    {formatCurrency(pclsC.primaryMaxTaxFreeCash)}
                    {pclsC.primaryIsCapped && (
                      <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4 text-right">
                  {!showScenarioC && (
                    <span className={`font-extrabold text-xs px-2.5 py-1 rounded-xl border ${pclsB.primaryMaxTaxFreeCash - pclsA.primaryMaxTaxFreeCash > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : pclsB.primaryMaxTaxFreeCash - pclsA.primaryMaxTaxFreeCash < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'}`}>
                      {pclsB.primaryMaxTaxFreeCash - pclsA.primaryMaxTaxFreeCash > 0 ? '+' : ''}{formatCurrency(pclsB.primaryMaxTaxFreeCash - pclsA.primaryMaxTaxFreeCash)}
                    </span>
                  )}
                </td>
              </tr>

              {/* Partner Pension & PCLS if couple */}
              {pclsA.isCouple && (
                <>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      <div>Partner Pension Balance @ Take Age</div>
                      <div className="text-[10px] text-slate-400 font-normal">Projected pot at Age {pclsA.partnerTakeAge}</div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(pclsA.partnerPensionPotAtTake)}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-indigo-950 dark:text-indigo-100">
                      {formatCurrency(pclsB.partnerPensionPotAtTake)}
                    </td>
                    {showScenarioC && pclsC && (
                      <td className="py-3 px-4 font-extrabold text-emerald-950 dark:text-emerald-100">
                        {formatCurrency(pclsC.partnerPensionPotAtTake)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400">
                      {formatCurrency(pclsB.partnerPensionPotAtTake - pclsA.partnerPensionPotAtTake)} pot diff
                    </td>
                  </tr>

                  <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <div>Partner Potential Max Tax-Free Cash</div>
                      <div className="text-[10px] text-slate-400 font-normal">Min(25% Pension Pot, LSA £{(pclsA.partnerLsaLimit/1000).toFixed(1)}k)</div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                      {formatCurrency(pclsA.partnerMaxTaxFreeCash)}
                      {pclsA.partnerIsCapped && (
                        <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                      {formatCurrency(pclsB.partnerMaxTaxFreeCash)}
                      {pclsB.partnerIsCapped && (
                        <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                      )}
                    </td>
                    {showScenarioC && pclsC && (
                      <td className="py-3 px-4 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                        {formatCurrency(pclsC.partnerMaxTaxFreeCash)}
                        {pclsC.partnerIsCapped && (
                          <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400">Capped by LSA Limit</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      {!showScenarioC && (
                        <span className={`font-extrabold text-xs px-2.5 py-1 rounded-xl border ${pclsB.partnerMaxTaxFreeCash - pclsA.partnerMaxTaxFreeCash > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : pclsB.partnerMaxTaxFreeCash - pclsA.partnerMaxTaxFreeCash < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'}`}>
                          {pclsB.partnerMaxTaxFreeCash - pclsA.partnerMaxTaxFreeCash > 0 ? '+' : ''}{formatCurrency(pclsB.partnerMaxTaxFreeCash - pclsA.partnerMaxTaxFreeCash)}
                        </span>
                      )}
                    </td>
                  </tr>
                </>
              )}

              {/* Household Combined Max Tax-Free Cash */}
              <tr className="bg-emerald-500/10 dark:bg-emerald-950/30 font-bold border-t border-b border-emerald-200 dark:border-emerald-800">
                <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Combined Household Tax-Free Lump Sum</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Total liquid 0% tax cash available at access ages</div>
                </td>
                <td className="py-3 px-4 font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  {formatCurrency(pclsA.combinedMaxTaxFreeCash)}
                </td>
                <td className="py-3 px-4 font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  {formatCurrency(pclsB.combinedMaxTaxFreeCash)}
                </td>
                {showScenarioC && pclsC && (
                  <td className="py-3 px-4 font-black text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatCurrency(pclsC.combinedMaxTaxFreeCash)}
                  </td>
                )}
                <td className="py-3 px-4 text-right">
                  {!showScenarioC && (
                    <span className={`font-black text-xs px-2.5 py-1 rounded-xl border ${pclsB.combinedMaxTaxFreeCash - pclsA.combinedMaxTaxFreeCash > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' : pclsB.combinedMaxTaxFreeCash - pclsA.combinedMaxTaxFreeCash < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800'}`}>
                      {pclsB.combinedMaxTaxFreeCash - pclsA.combinedMaxTaxFreeCash > 0 ? '+' : ''}{formatCurrency(pclsB.combinedMaxTaxFreeCash - pclsA.combinedMaxTaxFreeCash)}
                    </span>
                  )}
                </td>
              </tr>

              {/* Strategy & Destination */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                  <div>PCLS Timing & Destination Strategy</div>
                  <div className="text-[10px] text-slate-400 font-normal">Planned usage for lump sum withdrawal</div>
                </td>
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                  <div className="font-bold text-[11px]">{formatPclsTiming(pclsA.primaryTiming)}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{formatPclsDestination(pclsA.primaryDestination)}</div>
                </td>
                <td className="py-3 px-4 text-indigo-900 dark:text-indigo-200">
                  <div className="font-bold text-[11px]">{formatPclsTiming(pclsB.primaryTiming)}</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">{formatPclsDestination(pclsB.primaryDestination)}</div>
                </td>
                {showScenarioC && pclsC && (
                  <td className="py-3 px-4 text-emerald-900 dark:text-emerald-200">
                    <div className="font-bold text-[11px]">{formatPclsTiming(pclsC.primaryTiming)}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">{formatPclsDestination(pclsC.primaryDestination)}</div>
                  </td>
                )}
                <td className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400">
                  Tax-free capital deployment
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: INHERITANCE TAX (IHT) & ESTATE PLANNING BENCHMARK */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-500" />
            <span>5. Inheritance Tax (IHT) & Estate Planning Benchmark</span>
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
            April 2027 Budget Rules
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">Estate Milestone / Parameter</th>
                <th className="py-3 px-4 text-slate-900 dark:text-slate-100">{scenarioA.name}</th>
                <th className="py-3 px-4 text-indigo-700 dark:text-indigo-300">{scenarioB.name}</th>
                {showScenarioC && (
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-300">{scenarioC.name}</th>
                )}
                <th className="py-3 px-4 text-slate-600 dark:text-slate-400">HMRC Policy & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              
              {/* Age 80 IHT Estate */}
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                  <div>Estate Valuation & IHT @ Age 80</div>
                  <div className="text-[10px] text-slate-400 font-normal">Property + Savings + Pensions (if 2027 rule)</div>
                </td>
                <td className={`py-3.5 px-4 ${estateWinnerName === scenarioA.name ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700' : ''}`}>
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">Gross: {formatCurrency(iht80A.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht80A.ihtLiability)} ({iht80A.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht80A.netPassedToHeirs)}
                  </div>
                </td>
                <td className={`py-3.5 px-4 ${estateWinnerName === scenarioB.name ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700' : ''}`}>
                  <div className="font-extrabold text-indigo-950 dark:text-indigo-100">Gross: {formatCurrency(iht80B.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht80B.ihtLiability)} ({iht80B.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht80B.netPassedToHeirs)}
                  </div>
                </td>
                {showScenarioC && iht80C && (
                  <td className={`py-3.5 px-4 ${estateWinnerName === scenarioC.name ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700' : ''}`}>
                    <div className="font-extrabold text-emerald-950 dark:text-emerald-100">Gross: {formatCurrency(iht80C.grossEstate)}</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                      Est. 40% IHT: {formatCurrency(iht80C.ihtLiability)} ({iht80C.effectiveIhtRate}%)
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Net to Heirs: {formatCurrency(iht80C.netPassedToHeirs)}
                    </div>
                  </td>
                )}
                <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">
                  Allowances: £{(iht80A.totalAllowances / 1000).toFixed(0)}k NRB+RNRB
                </td>
              </tr>

              {/* Age 90 IHT Estate */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                  <div>Estate Valuation & IHT @ Age 90</div>
                  <div className="text-[10px] text-slate-400 font-normal">Mid-Decumulation Longevity Stage</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">Gross: {formatCurrency(iht90A.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht90A.ihtLiability)} ({iht90A.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht90A.netPassedToHeirs)}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-indigo-950 dark:text-indigo-100">Gross: {formatCurrency(iht90B.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht90B.ihtLiability)} ({iht90B.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht90B.netPassedToHeirs)}
                  </div>
                </td>
                {showScenarioC && iht90C && (
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-emerald-950 dark:text-emerald-100">Gross: {formatCurrency(iht90C.grossEstate)}</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                      Est. 40% IHT: {formatCurrency(iht90C.ihtLiability)} ({iht90C.effectiveIhtRate}%)
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Net to Heirs: {formatCurrency(iht90C.netPassedToHeirs)}
                    </div>
                  </td>
                )}
                <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">
                  Late retirement estate liability
                </td>
              </tr>

              {/* Age 100 IHT Estate */}
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <span>Estate Valuation & IHT @ Age 100</span>
                    <div className="text-[10px] text-slate-400 font-normal">Century Horizon Legacy</div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">Gross: {formatCurrency(iht100A.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht100A.ihtLiability)} ({iht100A.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht100A.netPassedToHeirs)}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-indigo-950 dark:text-indigo-100">Gross: {formatCurrency(iht100B.grossEstate)}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    Est. 40% IHT: {formatCurrency(iht100B.ihtLiability)} ({iht100B.effectiveIhtRate}%)
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Net to Heirs: {formatCurrency(iht100B.netPassedToHeirs)}
                  </div>
                </td>
                {showScenarioC && iht100C && (
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-emerald-950 dark:text-emerald-100">Gross: {formatCurrency(iht100C.grossEstate)}</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                      Est. 40% IHT: {formatCurrency(iht100C.ihtLiability)} ({iht100C.effectiveIhtRate}%)
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Net to Heirs: {formatCurrency(iht100C.netPassedToHeirs)}
                    </div>
                  </td>
                )}
                <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">
                  Century end-of-life wealth transfer
                </td>
              </tr>

              {/* Pensions Taxed in Estate (April 2027 Rule) */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Pensions Taxed in Estate (April 2027 Rule)</td>
                <td className="py-3 px-4">
                  <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${iht80A.includePensionsInEstate ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                    {iht80A.includePensionsInEstate ? 'Included (40% Taxed)' : 'Exempt (Legacy Pre-2027)'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${iht80B.includePensionsInEstate ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                    {iht80B.includePensionsInEstate ? 'Included (40% Taxed)' : 'Exempt (Legacy Pre-2027)'}
                  </span>
                </td>
                {showScenarioC && iht80C && (
                  <td className="py-3 px-4">
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${iht80C.includePensionsInEstate ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                      {iht80C.includePensionsInEstate ? 'Included (40% Taxed)' : 'Exempt (Legacy Pre-2027)'}
                    </span>
                  </td>
                )}
                <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                  HMRC April 2027 budget reform setting
                </td>
              </tr>

              {/* Primary Residence & Growth */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Primary Residence & Property Growth</td>
                <td className="py-3 px-4 font-semibold">
                  £{(iht80A.primaryResidenceValue || (0) || 0).toLocaleString()} (+{iht80A.annualPropertyGrowthPercent}% p.a.)
                </td>
                <td className="py-3 px-4 font-semibold text-indigo-700 dark:text-indigo-300">
                  £{(iht80B.primaryResidenceValue || (0) || 0).toLocaleString()} (+{iht80B.annualPropertyGrowthPercent}% p.a.)
                </td>
                {showScenarioC && iht80C && (
                  <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-300">
                    £{(iht80C.primaryResidenceValue || (0) || 0).toLocaleString()} (+{iht80C.annualPropertyGrowthPercent}% p.a.)
                  </td>
                )}
                <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                  RNRB main residence allowance basis
                </td>
              </tr>

              {/* Annual Gifting Strategy */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Annual Gifting Strategy (£/yr)</td>
                <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-300">
                  £{(iht80A.annualGiftingStrategy || (0) || 0).toLocaleString()}/yr
                </td>
                <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-300">
                  £{(iht80B.annualGiftingStrategy || (0) || 0).toLocaleString()}/yr
                </td>
                {showScenarioC && iht80C && (
                  <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-300">
                    £{(iht80C.annualGiftingStrategy || (0) || 0).toLocaleString()}/yr
                  </td>
                )}
                <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                  Annual gifting exemption (£3k/yr allowance)
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 6: RISK-ADJUSTED LONGEVITY & STRESS BENCHMARK (MONTE CARLO & 75-YEAR BACKTEST) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Dices className="w-4 h-4 text-purple-500" />
            <span>6. Risk-Adjusted Longevity & Stress Benchmark (Monte Carlo & 75-Year Backtest)</span>
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
            Sequence of Returns & Volatility Stress
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">Risk & Stress Parameter / Metric</th>
                <th className="py-3 px-4 text-slate-900 dark:text-slate-100">{scenarioA.name}</th>
                <th className="py-3 px-4 text-indigo-700 dark:text-indigo-300">{scenarioB.name}</th>
                {showScenarioC && (
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-300">{scenarioC.name}</th>
                )}
                <th className="py-3 px-4 text-slate-600 dark:text-slate-400">Risk Winner / Takeaway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              
              {/* Monte Carlo Success Rate */}
              <tr className="bg-purple-50/40 dark:bg-purple-950/20">
                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Dices className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Monte Carlo Success Rate (300 Runs)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">% of random market trials avoiding pot depletion</div>
                </td>
                <td className={`py-3 px-4 ${mcSimA && mcSimB && (mcSimA.successRate >= mcSimB.successRate) && (!mcSimC || mcSimA.successRate >= mcSimC.successRate) ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700 shadow-2xs' : ''}`}>
                  <div className="text-sm font-black">{mcSimA ? `${mcSimA.successRate}%` : 'N/A'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Median Pot: {formatCurrency(mcSimA?.medianEndPot || 0)}</div>
                </td>
                <td className={`py-3 px-4 ${mcSimA && mcSimB && (mcSimB.successRate >= mcSimA.successRate) && (!mcSimC || mcSimB.successRate >= mcSimC.successRate) ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700 shadow-2xs' : ''}`}>
                  <div className="text-sm font-black">{mcSimB ? `${mcSimB.successRate}%` : 'N/A'}</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Median Pot: {formatCurrency(mcSimB?.medianEndPot || 0)}</div>
                </td>
                {showScenarioC && (
                  <td className={`py-3 px-4 ${mcSimA && mcSimB && mcSimC && (mcSimC.successRate >= mcSimA.successRate) && (mcSimC.successRate >= mcSimB.successRate) ? 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-black border border-emerald-300 dark:border-emerald-700 shadow-2xs' : ''}`}>
                    <div className="text-sm font-black">{mcSimC ? `${mcSimC.successRate}%` : 'N/A'}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Median Pot: {formatCurrency(mcSimC?.medianEndPot || 0)}</div>
                  </td>
                )}
                <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                  Winner: {longevityWinnerName} ({Math.max(mcSimA?.successRate || 0, mcSimB?.successRate || 0, mcSimC?.successRate || 0)}% Success)
                </td>
              </tr>

              {/* 75-Year Historic Backtest Success Rate */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>75-Year Historic Market Backtest (1950–2024)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">% of real 75-year historic market sequences surviving</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{historicA ? `${historicA.successRate}%` : 'N/A'} Success</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Worst Start Year: {historicA?.worstStartYear?.startYear ?? 'N/A'}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-extrabold text-sm text-indigo-950 dark:text-indigo-100">{historicB ? `${historicB.successRate}%` : 'N/A'} Success</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Worst Start Year: {historicB?.worstStartYear?.startYear ?? 'N/A'}</div>
                </td>
                {showScenarioC && (
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100">{historicC ? `${historicC.successRate}%` : 'N/A'} Success</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Worst Start Year: {historicC?.worstStartYear?.startYear ?? 'N/A'}</div>
                  </td>
                )}
                <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                  75 historical sequence runs
                </td>
              </tr>

              {/* Worst Historic Sequence Run Outcome */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Worst Historic Run Outcome (e.g. 1973 Crash)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Depletion age or final wealth under worst historical crash</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-xs">
                    {historicA?.worstStartYear?.depletedAtAge ? `Depletes at Age ${historicA.worstStartYear.depletedAtAge}` : `Final: ${formatCurrency(historicA?.worstStartYear?.finalRealBalance || 0)}`}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-xs text-indigo-700 dark:text-indigo-300">
                    {historicB?.worstStartYear?.depletedAtAge ? `Depletes at Age ${historicB.worstStartYear.depletedAtAge}` : `Final: ${formatCurrency(historicB?.worstStartYear?.finalRealBalance || 0)}`}
                  </div>
                </td>
                {showScenarioC && (
                  <td className="py-3 px-4">
                    <div className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                      {historicC?.worstStartYear?.depletedAtAge ? `Depletes at Age ${historicC.worstStartYear.depletedAtAge}` : `Final: ${formatCurrency(historicC?.worstStartYear?.finalRealBalance || 0)}`}
                    </div>
                  </td>
                )}
                <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                  Worst-case historic stress test
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 7: FUND LONGEVITY & TAX RELIEF SUMMARY */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Tax Relief Gained */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Annual Tax Relief Gained:</span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">A: £{(taxA?.totalPensionTaxRelief || (0) || 0).toLocaleString()}</span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">B: £{(taxB?.totalPensionTaxRelief || (0) || 0).toLocaleString()}</span>
            {showScenarioC && taxC && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">C: £{(taxC.totalPensionTaxRelief || (0) || 0).toLocaleString()}</span>
            )}
          </div>
          {!showScenarioC && taxA && taxB && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
              Delta: +£{((taxB.totalPensionTaxRelief || 0) - (taxA.totalPensionTaxRelief || (0)) || 0).toLocaleString()}/yr
            </span>
          )}
        </div>

        {/* Retirement Start Total Pot */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Retirement Wealth Peak:</span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">A: {formatCurrency(retA?.totalPot)}</span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">B: {formatCurrency(retB?.totalPot)}</span>
            {showScenarioC && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">C: {formatCurrency(retC?.totalPot)}</span>
            )}
          </div>
        </div>

        {/* Longevity */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Portfolio Fund Longevity:</span>
          <div className="text-xs font-extrabold space-y-0.5">
            <div className="text-slate-900 dark:text-slate-100">{scenarioA.name}: {depA ? `Depletes at Age ${depA.age}` : 'Sustained 100+'}</div>
            <div className="text-indigo-600 dark:text-indigo-400">{scenarioB.name}: {depB ? `Depletes at Age ${depB.age}` : 'Sustained 100+'}</div>
            {showScenarioC && (
              <div className="text-emerald-600 dark:text-emerald-400">{scenarioC.name}: {depC ? `Depletes at Age ${depC.age}` : 'Sustained 100+'}</div>
            )}
          </div>
        </div>

      </div>

      {/* FULL LEDGER STEP-BY-STEP COMPARISON TOGGLE */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowFullLedgerDelta(!showFullLedgerDelta)}
          className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
        >
          <span>{showFullLedgerDelta ? 'Hide Full Annual Step-by-Step Ledger Delta' : 'View Full Annual Step-by-Step Ledger Delta'}</span>
          {showFullLedgerDelta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFullLedgerDelta && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Age (Year)</th>
                  <th className="py-2.5 px-3">{scenarioA.name} Wealth</th>
                  <th className="py-2.5 px-3">{scenarioB.name} Wealth</th>
                  {showScenarioC && <th className="py-2.5 px-3">{scenarioC.name} Wealth</th>}
                  {!showScenarioC && <th className="py-2.5 px-3 text-right">Wealth Delta</th>}
                  <th className="py-2.5 px-3">{scenarioA.name} Net Inc</th>
                  <th className="py-2.5 px-3">{scenarioB.name} Net Inc</th>
                  {showScenarioC && <th className="py-2.5 px-3">{scenarioC.name} Net Inc</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {projA.map((pA) => {
                  const pB = projB.find((p) => p.age === pA.age) || pA;
                  const pC = showScenarioC ? projC.find((p) => p.age === pA.age) || pA : null;
                  const delta = (pB.totalPot || 0) - (pA.totalPot || 0);

                  return (
                    <tr key={pA.age} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-bold">Age {pA.age} ({pA.year})</td>
                      <td className="py-2 px-3">{formatCurrency(pA.totalPot)}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(pB.totalPot)}</td>
                      {showScenarioC && pC && (
                        <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(pC.totalPot)}</td>
                      )}
                      {!showScenarioC && (
                        <td className={`py-2 px-3 text-right font-bold ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                        </td>
                      )}
                      <td className="py-2 px-3">{formatCurrency(pA.netRetirementIncome)}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(pB.netRetirementIncome)}</td>
                      {showScenarioC && pC && (
                        <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(pC.netRetirementIncome)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

