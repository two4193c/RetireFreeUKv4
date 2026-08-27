import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { YearProjection, UserProfile, InvestmentPots, AppMode } from '../types';
import { getTargetIncomeForAge, generateProjections } from '../utils/projectionEngine';
import { calculateUKTax, getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import { DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../utils/defaultData';
import { AlertTriangle, CheckCircle2, ShieldAlert, Info, ArrowUpRight, Users, User, Heart, PieChart, Wallet, Calendar, Clock, Sparkles, ArrowRight, Check } from 'lucide-react';

interface ProjectionChartProps {
  projections: YearProjection[];
  profile: UserProfile;
  pots?: InvestmentPots;
  onChange?: (updatedProfile: UserProfile) => void;
  onOpenMaximizedSpendModal?: () => void;
  showAllCharts?: boolean;
  appMode?: AppMode;
}

export const ProjectionChart: React.FC<ProjectionChartProps> = ({ projections, profile, pots, onChange, onOpenMaximizedSpendModal, showAllCharts = false, appMode = 'basic' }) => {
  const isStudioMode = appMode === 'studio';
  const [chartMode, setChartMode] = useState<'pots' | 'income' | 'shortfall'>('pots');
  const [potChartType, setPotChartType] = useState<'area' | 'line'>('area');
  const [portfolioViewMode, setPortfolioViewMode] = useState<'combined' | 'primary' | 'partner'>('combined');
  const adjustInflation = profile.adjustForInflation ?? false;

  const potKeys = {
    pension: 'pensionPot',
    ssIsa: 'stocksAndSharesIsaPot',
    cashIsa: 'cashIsaPot',
    lisa: 'lisaPot',
    isa: 'isaPot',
    cash: 'cashGiaPot',
    gilt: 'giltLadderPot',
    total: 'totalPot',
    pensionName: portfolioViewMode === 'combined' ? 'Pension Pot' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} Pension` : `${profile.partnerName || 'Partner'} Pension`,
    ssIsaName: portfolioViewMode === 'combined' ? 'Stocks & Shares ISA' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} S&S ISA` : `${profile.partnerName || 'Partner'} S&S ISA`,
    cashIsaName: portfolioViewMode === 'combined' ? 'Cash ISA' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} Cash ISA` : `${profile.partnerName || 'Partner'} Cash ISA`,
    lisaName: portfolioViewMode === 'combined' ? 'Lifetime ISA (LISA)' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} LISA` : `${profile.partnerName || 'Partner'} LISA`,
    isaName: portfolioViewMode === 'combined' ? 'ISA Pot (Total)' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} ISA Total` : `${profile.partnerName || 'Partner'} ISA Total`,
    cashName: portfolioViewMode === 'combined' ? 'Cash & GIA' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} Cash & GIA` : `${profile.partnerName || 'Partner'} Cash & GIA`,
    giltName: portfolioViewMode === 'combined' ? 'UK Gilt Ladder Pot (0% CGT)' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} Gilt Ladder` : `${profile.partnerName || 'Partner'} Gilt Ladder`,
    totalName: portfolioViewMode === 'combined' ? 'Total Portfolio Balance' : portfolioViewMode === 'primary' ? `${profile.name || 'Primary'} Total` : `${profile.partnerName || 'Partner'} Total`,
  };
  const [showAnnuitiesInPotBreakdown, setShowAnnuitiesInPotBreakdown] = useState(true);

  // Format large currency numbers cleanly (£k, £M)
  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${val}`;
  };

  const retirementYear = projections.find((p) => p.age === profile.targetRetirementAge);
  const statePensionYear = projections.find((p) => p.age === profile.statePensionAge);
  const depletedYear = projections.find((p) => p.potDepleted);

  // State Pension milestone age calculations for Primary and Partner
  const isCouple = Boolean(profile.isCouplePlanning);
  const primarySpEnabled = profile.includeStatePension ?? true;
  const partnerSpEnabled = isCouple && (profile.partnerIncludeStatePension ?? true);
  const primarySpa = profile.statePensionAge || 67;
  const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
  const partnerSpaPrimaryAge = (profile.partnerStatePensionAge || 67) - partnerAgeDiff;
  const isSameSpaYear = primarySpEnabled && partnerSpEnabled && (primarySpa === partnerSpaPrimaryAge);

  const primaryRetireAge = profile.targetRetirementAge || 60;
  const partnerRetirePrimaryAge = (profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60) - partnerAgeDiff;
  const isSameRetireYear = isCouple && (primaryRetireAge === partnerRetirePrimaryAge);

  // Private Pension Access Age calculations for Primary and Partner
  const primaryAccessAge = getPensionAccessAge(profile);
  const partnerAccessAgeRaw = getPartnerPensionAccessAge(profile);
  const partnerAccessPrimaryAge = partnerAccessAgeRaw - partnerAgeDiff;
  const isSameAccessYear = isCouple && (primaryAccessAge === partnerAccessPrimaryAge);

  // Shortfall & Plan Failure analysis
  const retirementProjections = projections.filter((p) => p.isRetired);
  const shortfallYears = retirementProjections.filter((p) => (p.incomeShortfall || 0) > 0);
  const firstShortfallYear = shortfallYears[0];
  const hasPlanFailure = shortfallYears.length > 0;

  const {
    maxAnnualShortfall,
    totalLifetimeShortfall,
    displayedRetirementPot,
    combinedTotalPotAtRetirement,
    combinedPensionPotAtRetirement,
    combinedIsaPotAtRetirement,
    combinedSsIsaPotAtRetirement,
    combinedCashIsaPotAtRetirement,
    combinedLisaPotAtRetirement,
    combinedCashGiaPotAtRetirement,
    primaryTotalPotAtRetirement,
    primaryPensionPotAtRetirement,
    primaryIsaPotAtRetirement,
    primarySsIsaPotAtRetirement,
    primaryCashIsaPotAtRetirement,
    primaryLisaPotAtRetirement,
    primaryCashGiaPotAtRetirement,
    partnerTotalPotAtRetirement,
    partnerPensionPotAtRetirement,
    partnerIsaPotAtRetirement,
    partnerSsIsaPotAtRetirement,
    partnerCashIsaPotAtRetirement,
    partnerLisaPotAtRetirement,
    partnerCashGiaPotAtRetirement,
    primarySharePct,
    partnerSharePct,
    retirementAnnuityIncome,
    retirementAnnuityCapital,
    maxAnnuityIncomeAcrossTimeline,
    hasPurchasedAnnuity,
    hasAnySsIsa,
    hasAnyCashIsa,
    hasAnyLisa,
    hasAnyGilt,
  } = useMemo(() => {
    const maxShortfall = shortfallYears.length > 0
      ? Math.max(...shortfallYears.map((p) => p.incomeShortfall || 0))
      : 0;

    const totalShortfall = shortfallYears.reduce((sum, p) => sum + (p.incomeShortfall || 0), 0);

    const offset = Math.max(0, profile.targetRetirementAge - profile.currentAge);
    const inflFactor = Math.pow(1 + profile.expectedInflationRate / 100, offset);
    const rawScale = adjustInflation ? (inflFactor > 0 ? 1 / inflFactor : 1) : 1;
    const scale = isFinite(rawScale) && !isNaN(rawScale) ? rawScale : 1;

    const rawPot = retirementYear?.totalPot || 0;
    const dispPot = Math.round(adjustInflation && inflFactor > 0 ? rawPot / inflFactor : rawPot);

    const combTotal = Math.round((retirementYear?.totalPot || 0) * scale);
    const combPension = Math.round((retirementYear?.pensionPot || 0) * scale);
    const combIsa = Math.round((retirementYear?.isaPot || 0) * scale);
    const combSsIsa = Math.round((retirementYear?.stocksAndSharesIsaPot || 0) * scale);
    const combCashIsa = Math.round((retirementYear?.cashIsaPot || 0) * scale);
    const combLisa = Math.round((retirementYear?.lisaPot || 0) * scale);
    const combCashGia = Math.round((retirementYear?.cashGiaPot || 0) * scale);

    const retAnnIncome = Math.round((retirementYear?.annuityIncomeReceived || 0) * scale);
    const retAnnCap = Math.round((retirementYear?.annuityCapitalAllocated || 0) * scale);
    const maxAnnIncome = Math.round(Math.max(0, ...projections.map((p) => (p.annuityIncomeReceived || 0) * (adjustInflation ? (1 / Math.pow(1 + (profile.expectedInflationRate ?? 2.5) / 100, p.age - profile.currentAge)) : 1))));
    const hasPurchased = retAnnIncome > 0 || retAnnCap > 0 || maxAnnIncome > 0;

    const priTotal = Math.round(((retirementYear?.primaryTotalPot ?? retirementYear?.totalPot) || 0) * scale);
    const priPension = Math.round(((retirementYear?.primaryPensionPot ?? retirementYear?.pensionPot) || 0) * scale);
    const priIsa = Math.round(((retirementYear?.primaryIsaPot ?? retirementYear?.isaPot) || 0) * scale);
    const priSsIsa = Math.round((retirementYear?.primaryStocksAndSharesIsaPot || 0) * scale);
    const priCashIsa = Math.round((retirementYear?.primaryCashIsaPot || 0) * scale);
    const priLisa = Math.round((retirementYear?.primaryLisaPot || 0) * scale);
    const priCash = Math.round(((retirementYear?.primaryCashGiaPot ?? retirementYear?.cashGiaPot) || 0) * scale);

    const partTotal = Math.round((retirementYear?.partnerTotalPot || 0) * scale);
    const partPension = Math.round((retirementYear?.partnerPensionPot || 0) * scale);
    const partIsa = Math.round((retirementYear?.partnerIsaPot || 0) * scale);
    const partSsIsa = Math.round((retirementYear?.partnerStocksAndSharesIsaPot || 0) * scale);
    const partCashIsa = Math.round((retirementYear?.partnerCashIsaPot || 0) * scale);
    const partLisa = Math.round((retirementYear?.partnerLisaPot || 0) * scale);
    const partCash = Math.round((retirementYear?.partnerCashGiaPot || 0) * scale);

    const priShare = combTotal > 0 ? (priTotal / combTotal) * 100 : 100;
    const partShare = combTotal > 0 ? (partTotal / combTotal) * 100 : 0;

    const activePotsObj = pots || DEFAULT_POTS;
    const partnerPotsObj = profile.partnerPots || DEFAULT_PARTNER_POTS;

    const hasSsIsa = (portfolioViewMode === 'partner' ? partnerPotsObj.stocksAndSharesIsaBalance > 0 : activePotsObj.stocksAndSharesIsaBalance > 0) || projections.some((p) =>
      portfolioViewMode === 'combined'
        ? (p.stocksAndSharesIsaPot || 0) > 0
        : portfolioViewMode === 'primary'
        ? (p.primaryStocksAndSharesIsaPot || 0) > 0
        : (p.partnerStocksAndSharesIsaPot || 0) > 0
    );
    const hasCashIsa = (portfolioViewMode === 'partner' ? partnerPotsObj.cashIsaBalance > 0 : activePotsObj.cashIsaBalance > 0) || projections.some((p) =>
      portfolioViewMode === 'combined'
        ? (p.cashIsaPot || 0) > 0
        : portfolioViewMode === 'primary'
        ? (p.primaryCashIsaPot || 0) > 0
        : (p.partnerCashIsaPot || 0) > 0
    );
    const hasLisa = (portfolioViewMode === 'partner' ? partnerPotsObj.lisaBalance > 0 : activePotsObj.lisaBalance > 0) || projections.some((p) =>
      portfolioViewMode === 'combined'
        ? (p.lisaPot || 0) > 0
        : portfolioViewMode === 'primary'
        ? (p.primaryLisaPot || 0) > 0
        : (p.partnerLisaPot || 0) > 0
    );

    const hasGilt = (portfolioViewMode === 'partner' ? false : (profile.giltLadderConfig?.enabled ?? false)) || projections.some((p) =>
      portfolioViewMode === 'combined'
        ? (p.giltLadderPot || 0) > 0
        : portfolioViewMode === 'primary'
        ? (p.primaryGiltLadderPot || 0) > 0
        : false
    );

    return {
      maxAnnualShortfall: maxShortfall,
      totalLifetimeShortfall: totalShortfall,
      displayedRetirementPot: dispPot,
      combinedTotalPotAtRetirement: combTotal,
      combinedPensionPotAtRetirement: combPension,
      combinedIsaPotAtRetirement: combIsa,
      combinedSsIsaPotAtRetirement: combSsIsa,
      combinedCashIsaPotAtRetirement: combCashIsa,
      combinedLisaPotAtRetirement: combLisa,
      combinedCashGiaPotAtRetirement: combCashGia,
      primaryTotalPotAtRetirement: priTotal,
      primaryPensionPotAtRetirement: priPension,
      primaryIsaPotAtRetirement: priIsa,
      primarySsIsaPotAtRetirement: priSsIsa,
      primaryCashIsaPotAtRetirement: priCashIsa,
      primaryLisaPotAtRetirement: priLisa,
      primaryCashGiaPotAtRetirement: priCash,
      partnerTotalPotAtRetirement: partTotal,
      partnerPensionPotAtRetirement: partPension,
      partnerIsaPotAtRetirement: partIsa,
      partnerSsIsaPotAtRetirement: partSsIsa,
      partnerCashIsaPotAtRetirement: partCashIsa,
      partnerLisaPotAtRetirement: partLisa,
      partnerCashGiaPotAtRetirement: partCash,
      primarySharePct: priShare,
      partnerSharePct: partShare,
      retirementAnnuityIncome: retAnnIncome,
      retirementAnnuityCapital: retAnnCap,
      maxAnnuityIncomeAcrossTimeline: maxAnnIncome,
      hasPurchasedAnnuity: hasPurchased,
      hasAnySsIsa: hasSsIsa,
      hasAnyCashIsa: hasCashIsa,
      hasAnyLisa: hasLisa,
      hasAnyGilt: hasGilt,
    };
  }, [shortfallYears, profile, adjustInflation, retirementYear, projections, portfolioViewMode, pots]);

  const targetIncomeGoal = useMemo(() => {
    const baseTarget = getTargetIncomeForAge(profile, profile.targetRetirementAge) || profile.targetRetirementIncomeAnnual || profile.targetIncome || 0;
    if (adjustInflation) {
      return Math.round(baseTarget);
    } else {
      const yearOffset = Math.max(0, profile.targetRetirementAge - profile.currentAge);
      const inflationFactor = Math.pow(1 + (profile.expectedInflationRate || 0) / 100, yearOffset);
      return Math.round(baseTarget * inflationFactor);
    }
  }, [profile, adjustInflation]);

  // Delayed Retirement Feasibility Analysis Engine
  const delayedRetirementAnalysis = useMemo(() => {
    if (!hasPlanFailure) return null;

    const currentRetAge = profile.targetRetirementAge;
    const maxTestAge = Math.min(85, Math.max(75, currentRetAge + 15));
    const activePots = pots || DEFAULT_POTS;

    interface DelayCandidate {
      testAge: number;
      delayYears: number;
      partnerTestAge?: number;
      isSuccessful: boolean;
      shortfallYearsCount: number;
      totalLifetimeShortfall: number;
      maxAnnualShortfall: number;
      firstShortfallAge?: number;
      retirementPot: number;
    }

    const candidates: DelayCandidate[] = [];

    for (let testAge = currentRetAge + 1; testAge <= maxTestAge; testAge++) {
      const delayYears = testAge - currentRetAge;
      const partnerTestAge = (profile.isCouplePlanning && profile.partnerTargetRetirementAge)
        ? profile.partnerTargetRetirementAge + delayYears
        : profile.partnerTargetRetirementAge;

      const candidateProfile: UserProfile = {
        ...profile,
        targetRetirementAge: testAge,
        partnerTargetRetirementAge: partnerTestAge,
      };

      const candTax = calculateUKTax(candidateProfile, activePots);
      const candProjections = generateProjections(candidateProfile, activePots, candTax);

      const retiredYears = candProjections.filter((p) => p.isRetired);
      const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 1);
      const totShortfall = retiredYears.reduce((sum, p) => sum + (p.incomeShortfall || 0), 0);
      const maxShortfall = shortfalls.length > 0 ? Math.max(...shortfalls.map((p) => p.incomeShortfall || 0)) : 0;
      const firstShortfall = shortfalls[0]?.age;

      const retYearObj = candProjections.find((p) => p.age === testAge);
      const offset = testAge - profile.currentAge;
      const inflFactor = Math.pow(1 + profile.expectedInflationRate / 100, offset);
      const scale = adjustInflation ? 1 / inflFactor : 1;
      const retPot = Math.round((retYearObj?.totalPot || 0) * scale);

      candidates.push({
        testAge,
        delayYears,
        partnerTestAge,
        isSuccessful: shortfalls.length === 0,
        shortfallYearsCount: shortfalls.length,
        totalLifetimeShortfall: totShortfall,
        maxAnnualShortfall: maxShortfall,
        firstShortfallAge: firstShortfall,
        retirementPot: retPot,
      });
    }

    const firstSuccessful = candidates.find((c) => c.isSuccessful);
    const sortedByShortfall = [...candidates].sort((a, b) => a.totalLifetimeShortfall - b.totalLifetimeShortfall);
    const bestPartial = sortedByShortfall[0];

    return {
      candidates,
      firstSuccessful,
      bestPartial,
      maxTestAge,
    };
  }, [hasPlanFailure, profile, pots, adjustInflation]);



  // Prepare chart data
  const chartData = React.useMemo(() => {
    return projections.map((p) => {
      const yearOffset = p.age - profile.currentAge;
      const inflationFactor = Math.pow(1 + profile.expectedInflationRate / 100, yearOffset);
      const scale = adjustInflation ? 1 / inflationFactor : 1;

      const rawTarget = getTargetIncomeForAge(profile, p.age) * (adjustInflation ? 1 : inflationFactor);
      const targetIncome = Math.round(rawTarget);
      const totalIncome = Math.round(p.netRetirementIncome * scale);
      const incomeShortfall = Math.round((p.incomeShortfall || 0) * scale);
      const annualIncomeExcess = Math.round((p.annualIncomeExcess || 0) * scale);
      const cumulativeExcessIncome = Math.round((p.cumulativeExcessIncome || 0) * scale);

      // Determine drawdown & income values according to portfolioViewMode
      let statePension = Math.round(p.statePensionReceived * scale);
      let dbPensionIncome = Math.round((p.dbPensionIncomeReceived || 0) * scale);
      let annuityIncome = Math.round((p.annuityIncomeReceived || 0) * scale);
      let taxableFixedIncome = Math.round((p.taxableFixedIncomeReceived || 0) * scale);
      let taxFreeFixedIncome = Math.round((p.taxFreeFixedIncomeReceived || 0) * scale);
      let pensionDrawdown = Math.round(p.pensionDrawdown * scale);
      let pensionDrawdownTaxFree = Math.round((p.pensionDrawdownTaxFree || 0) * scale);
      let pensionDrawdownTaxable = Math.round((p.pensionDrawdownTaxable || 0) * scale);
      let isaDrawdown = Math.round(p.isaDrawdown * scale);
      let cashDrawdown = Math.round(p.cashDrawdown * scale);
      let displayTotalIncome = totalIncome;
      let displayTargetIncome = targetIncome;

      if (portfolioViewMode === 'primary') {
        statePension = Math.round((p.primaryStatePensionReceived ?? p.statePensionReceived) * scale);
        dbPensionIncome = Math.round((p.primaryDbPensionIncomeReceived ?? p.dbPensionIncomeReceived ?? 0) * scale);
        annuityIncome = Math.round((p.primaryAnnuityIncomeReceived ?? p.annuityIncomeReceived ?? 0) * scale);
        taxableFixedIncome = Math.round((p.primaryTaxableFixedIncomeReceived ?? p.taxableFixedIncomeReceived ?? 0) * scale);
        taxFreeFixedIncome = Math.round((p.primaryTaxFreeFixedIncomeReceived ?? p.taxFreeFixedIncomeReceived ?? 0) * scale);
        pensionDrawdown = Math.round((p.primaryPensionDrawdown ?? p.pensionDrawdown) * scale);
        pensionDrawdownTaxFree = Math.round((p.primaryPensionDrawdownTaxFree ?? p.pensionDrawdownTaxFree ?? 0) * scale);
        pensionDrawdownTaxable = Math.round((p.primaryPensionDrawdownTaxable ?? p.pensionDrawdownTaxable ?? 0) * scale);
        isaDrawdown = Math.round((p.primaryIsaDrawdown ?? p.isaDrawdown) * scale);
        cashDrawdown = Math.round((p.primaryCashDrawdown ?? p.cashDrawdown) * scale);
        displayTotalIncome = Math.round((p.primaryNetRetirementIncome ?? p.netRetirementIncome) * scale);
        displayTargetIncome = profile.isCouplePlanning ? Math.round(targetIncome / 2) : targetIncome;
      } else if (portfolioViewMode === 'partner') {
        statePension = Math.round((p.partnerStatePensionReceived || 0) * scale);
        dbPensionIncome = Math.round((p.partnerDbPensionIncomeReceived || 0) * scale);
        annuityIncome = Math.round((p.partnerAnnuityIncomeReceived || 0) * scale);
        taxableFixedIncome = Math.round((p.partnerTaxableFixedIncomeReceived || 0) * scale);
        taxFreeFixedIncome = Math.round((p.partnerTaxFreeFixedIncomeReceived || 0) * scale);
        pensionDrawdown = Math.round((p.partnerPensionDrawdown || 0) * scale);
        pensionDrawdownTaxFree = Math.round((p.partnerPensionDrawdownTaxFree || 0) * scale);
        pensionDrawdownTaxable = Math.round((p.partnerPensionDrawdownTaxable || 0) * scale);
        isaDrawdown = Math.round((p.partnerIsaDrawdown || 0) * scale);
        cashDrawdown = Math.round((p.partnerCashDrawdown || 0) * scale);
        displayTotalIncome = Math.round((p.partnerNetRetirementIncome || 0) * scale);
        displayTargetIncome = profile.isCouplePlanning ? Math.round(targetIncome / 2) : targetIncome;
      }

      let activePensionPot = Math.round(p.pensionPot * scale);
      let activeSsIsaPot = Math.round((p.stocksAndSharesIsaPot || 0) * scale);
      let activeCashIsaPot = Math.round((p.cashIsaPot || 0) * scale);
      let activeLisaPot = Math.round((p.lisaPot || 0) * scale);
      let activeIsaPot = Math.round(p.isaPot * scale);
      let activeCashGiaPot = Math.round(p.cashGiaPot * scale);
      let activeGiltLadderPot = Math.round((p.giltLadderPot || 0) * scale);
      let activeTotalPot = Math.round(p.totalPot * scale);

      if (portfolioViewMode === 'primary') {
        activePensionPot = Math.round((p.primaryPensionPot ?? p.pensionPot) * scale);
        activeSsIsaPot = Math.round((p.primaryStocksAndSharesIsaPot || 0) * scale);
        activeCashIsaPot = Math.round((p.primaryCashIsaPot || 0) * scale);
        activeLisaPot = Math.round((p.primaryLisaPot || 0) * scale);
        activeIsaPot = Math.round((p.primaryIsaPot ?? p.isaPot) * scale);
        activeCashGiaPot = Math.round((p.primaryCashGiaPot ?? p.cashGiaPot) * scale);
        activeGiltLadderPot = Math.round((p.primaryGiltLadderPot ?? p.giltLadderPot ?? 0) * scale);
        activeTotalPot = Math.round((p.primaryTotalPot ?? p.totalPot) * scale);
      } else if (portfolioViewMode === 'partner') {
        activePensionPot = Math.round((p.partnerPensionPot || 0) * scale);
        activeSsIsaPot = Math.round((p.partnerStocksAndSharesIsaPot || 0) * scale);
        activeCashIsaPot = Math.round((p.partnerCashIsaPot || 0) * scale);
        activeLisaPot = Math.round((p.partnerLisaPot || 0) * scale);
        activeIsaPot = Math.round((p.partnerIsaPot || 0) * scale);
        activeCashGiaPot = Math.round((p.partnerCashGiaPot || 0) * scale);
        activeGiltLadderPot = 0;
        activeTotalPot = Math.round((p.partnerTotalPot || 0) * scale);
      }

      const displayIncomeShortfall = Math.max(0, displayTargetIncome - displayTotalIncome);

      return {
        age: p.age,
        year: p.year,
        isRetired: p.isRetired,
        pensionPot: activePensionPot,
        isaPot: activeIsaPot,
        stocksAndSharesIsaPot: activeSsIsaPot,
        cashIsaPot: activeCashIsaPot,
        lisaPot: activeLisaPot,
        cashGiaPot: activeCashGiaPot,
        giltLadderPot: activeGiltLadderPot,
        totalPot: activeTotalPot,

        primaryPensionPot: Math.round((p.primaryPensionPot ?? p.pensionPot) * scale),
        primaryIsaPot: Math.round((p.primaryIsaPot ?? p.isaPot) * scale),
        primaryStocksAndSharesIsaPot: Math.round((p.primaryStocksAndSharesIsaPot || 0) * scale),
        primaryCashIsaPot: Math.round((p.primaryCashIsaPot || 0) * scale),
        primaryLisaPot: Math.round((p.primaryLisaPot || 0) * scale),
        primaryCashGiaPot: Math.round((p.primaryCashGiaPot ?? p.cashGiaPot) * scale),
        primaryGiltLadderPot: Math.round((p.primaryGiltLadderPot ?? p.giltLadderPot ?? 0) * scale),
        primaryTotalPot: Math.round((p.primaryTotalPot ?? p.totalPot) * scale),

        partnerPensionPot: Math.round((p.partnerPensionPot || 0) * scale),
        partnerIsaPot: Math.round((p.partnerIsaPot || 0) * scale),
        partnerStocksAndSharesIsaPot: Math.round((p.partnerStocksAndSharesIsaPot || 0) * scale),
        partnerCashIsaPot: Math.round((p.partnerCashIsaPot || 0) * scale),
        partnerLisaPot: Math.round((p.partnerLisaPot || 0) * scale),
        partnerCashGiaPot: Math.round((p.partnerCashGiaPot || 0) * scale),
        partnerTotalPot: Math.round((p.partnerTotalPot || 0) * scale),

        statePension,
        dbPensionIncome,
        annuityIncome,
        giltLadderIncome: Math.round((p.giltLadderIncomeReceived || 0) * scale),
        taxableFixedIncome,
        taxFreeFixedIncome,
        pensionDrawdown,
        pensionDrawdownTaxFree,
        pensionDrawdownTaxable,
        isaDrawdown,
        cashDrawdown,
        totalIncome: displayTotalIncome,
        targetIncome: displayTargetIncome,
        incomeShortfall: displayIncomeShortfall,
        annualIncomeExcess,
        cumulativeExcessIncome,
        totalTaxPaid: Math.round((p.totalTaxPaid || 0) * scale),
        incomeRequirementMet: p.isRetired ? displayIncomeShortfall <= 0 : true,
      };
    });
  }, [projections, profile, adjustInflation, portfolioViewMode]);

  const renderDrawdownIncomeTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const sources = [
      {
        name: 'State Pension',
        amount: data.statePension || 0,
        color: '#8b5cf6',
        badge: 'Guaranteed',
        type: 'state_pension',
      },
      {
        name: 'Defined Benefit (DB) Pension',
        amount: data.dbPensionIncome || 0,
        color: '#d97706',
        badge: 'Guaranteed',
        type: 'db_pension',
      },
      {
        name: 'Guaranteed Annuity Income',
        amount: data.annuityIncome || 0,
        color: '#ec4899',
        badge: 'Guaranteed Floor',
        type: 'annuity',
      },
      {
        name: 'UK Gilt Ladder Payout (0% CGT)',
        amount: data.giltLadderIncome || 0,
        color: '#0d9488',
        badge: '0% CGT Exempt',
        type: 'gilt_ladder',
      },
      {
        name: 'Tax-Free Fixed Income',
        amount: data.taxFreeFixedIncome || 0,
        color: '#14b8a6',
        badge: 'Tax-Free',
        type: 'fixed_tax_free',
      },
      {
        name: 'Taxable Fixed Income',
        amount: data.taxableFixedIncome || 0,
        color: '#2563eb',
        badge: 'Taxable',
        type: 'fixed_taxable',
      },
      {
        name: 'Pension Drawdown (25% Tax-Free)',
        amount: data.pensionDrawdownTaxFree || 0,
        color: '#34d399',
        badge: 'Tax-Free PCLS',
        type: 'pension_tax_free',
      },
      {
        name: 'Pension Drawdown (Taxable)',
        amount: data.pensionDrawdownTaxable || 0,
        color: '#059669',
        badge: 'Taxable Income',
        type: 'pension_taxable',
      },
      {
        name: 'ISA Drawdown',
        amount: data.isaDrawdown || 0,
        color: '#6366f1',
        badge: 'Tax-Free ISA',
        type: 'isa',
      },
      {
        name: 'Cash & GIA Drawdown',
        amount: data.cashDrawdown || 0,
        color: '#f59e0b',
        badge: 'Capital / GIA',
        type: 'cash',
      },
    ].filter((s) => s.amount > 0);

    if (sources.filter((s) => s.type.startsWith('pension_')).length === 0 && (data.pensionDrawdown || 0) > 0) {
      sources.push({
        name: 'Pension Drawdown',
        amount: data.pensionDrawdown,
        color: '#10b981',
        badge: 'Flexi-Access',
        type: 'pension_fallback',
      });
    }

    const hasShortfall = (data.incomeShortfall || 0) > 0;
    const hasSurplus = (data.annualIncomeExcess || 0) > 0;
    const totalFunding = sources.reduce((acc, s) => acc + s.amount, 0);

    return (
      <div className="bg-white dark:bg-slate-900 opacity-100 p-4 rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 text-xs space-y-3 min-w-[290px] max-w-[350px] z-50 pointer-events-none">
        {/* Header */}
        <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Age {data.age}</span>
            <span className="text-slate-500 dark:text-slate-400 font-bold ml-1.5">({data.year})</span>
          </div>
          {hasShortfall ? (
            <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-md font-black border border-rose-300 dark:border-rose-800">
              🚨 Deficit: -£{Math.round(data.incomeShortfall).toLocaleString()}/yr
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md font-black border border-emerald-300 dark:border-emerald-800">
              ✅ Target Met
            </span>
          )}
        </div>

        {/* Target & Total Net Summary */}
        <div className="bg-slate-100 dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold">
            <span>Target Requirement:</span>
            <span className="font-bold text-slate-900 dark:text-white">£{Math.round(data.targetIncome || 0).toLocaleString()}/yr</span>
          </div>
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
            <span>Total Net Income Achieved:</span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">£{Math.round(data.totalIncome || 0).toLocaleString()}/yr</span>
          </div>
          {hasSurplus && (
            <div className="flex justify-between items-center font-bold text-teal-700 dark:text-teal-300 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Annual Surplus:</span>
              <span>+£{Math.round(data.annualIncomeExcess).toLocaleString()}/yr</span>
            </div>
          )}
          {data.totalTaxPaid > 0 && (
            <div className="flex justify-between items-center font-medium text-slate-500 dark:text-slate-400 text-[10px] pt-0.5">
              <span>Est. Tax Liability Paid:</span>
              <span>-£{Math.round(data.totalTaxPaid).toLocaleString()}/yr</span>
            </div>
          )}
        </div>

        {/* Detailed Income Sources & Amounts Breakdown */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <span>Income Sources & Amounts:</span>
            <span>{sources.length} {sources.length === 1 ? 'Source' : 'Sources'}</span>
          </div>

          {sources.length > 0 ? (
            <div className="space-y-1.5">
              {sources.map((s, idx) => {
                const pct = totalFunding > 0 ? ((s.amount / totalFunding) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                          {s.badge} • {pct}% of total
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-black text-slate-900 dark:text-white text-xs">
                      £{Math.round(s.amount).toLocaleString()}<span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">/yr</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-2 text-center text-slate-500 dark:text-slate-400 italic text-[11px] bg-slate-100 dark:bg-slate-800 rounded-lg">
              No active income streams drawn
            </div>
          )}
        </div>

        {/* Shortfall Deficit Callout */}
        {hasShortfall && (
          <div className="p-2 bg-rose-100 dark:bg-rose-950 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-extrabold text-[11px] flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              Unmet Income Shortfall:
            </span>
            <span className="text-rose-700 dark:text-rose-300 font-black">
              -£{Math.round(data.incomeShortfall).toLocaleString()}/yr
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors"
    >
      {/* Chart Header */}
      {!isStudioMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Age {profile.currentAge} to {projections[projections.length - 1]?.age || 100} deterministic trajectory
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Retire: Age {primaryRetireAge} {isCouple && `(Partner: ${profile.partnerTargetRetirementAge || 60})`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-extrabold border border-sky-200 dark:border-sky-800/80">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Private Pension Access: Age {primaryAccessAge} {isCouple && `(Partner: ${partnerAccessAgeRaw})`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold border border-purple-200 dark:border-purple-800/80">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              State Pension: Age {primarySpa} {isCouple && `(Partner: ${profile.partnerStatePensionAge || 67})`}
            </span>
          </div>
        </div>
      )}

      {/* OVERVIEW SECTION AT TOP (PLAN STATUS & RISK COMMENT) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
        {/* Section Title */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
              Deterministic Overview & Plan Status
            </h3>
          </div>
          {!isStudioMode && (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Smoothed Growth ({profile.expectedInvestmentReturn ?? 6.5}% Pre / {profile.postRetirementReturn ?? 4.5}% Post-Ret, CPI {profile.expectedInflationRate ?? 2.5}%)
            </span>
          )}
        </div>

        {/* Plan Status Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            hasPlanFailure
              ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
              : 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                hasPlanFailure
                  ? 'bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                  : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              }`}
            >
              {hasPlanFailure ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Plan Status:
                </span>
                <span
                  className={`text-sm font-black ${
                    hasPlanFailure ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {hasPlanFailure
                    ? `PLAN DEFICIT DETECTED (Age ${firstShortfallYear?.age}+)`
                    : 'ON TRACK (100% Target Met)'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                {hasPlanFailure
                  ? `Your projected income falls short of your £${targetIncomeGoal.toLocaleString()}/yr target starting at Age ${firstShortfallYear?.age} (${firstShortfallYear?.year}). Max deficit: £${Math.round(maxAnnualShortfall || 0).toLocaleString()}/yr.`
                  : `Your projected retirement income meets or exceeds your £${targetIncomeGoal.toLocaleString()}/yr target requirement every year from Age ${profile.targetRetirementAge} through Age 100.`}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right self-end sm:self-center">
            <span
              className={`text-xs font-black px-3 py-1.5 rounded-xl inline-block ${
                hasPlanFailure
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {hasPlanFailure ? 'Action Required' : '100% Feasible'}
            </span>
          </div>
        </div>

        {/* Overview Key Metrics Grid */}
        {!isStudioMode && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                Target Age {profile.targetRetirementAge} Pot
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(displayedRetirementPot)}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {adjustInflation ? "Real Terms (Today's £)" : "Nominal £"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                Target Income Goal
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                £{targetIncomeGoal.toLocaleString()}/yr
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {adjustInflation ? "Real Terms (Today's £)" : "Nominal £"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                Pension Asset Share
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {retirementYear?.totalPot
                  ? `${Math.round((retirementYear.pensionPot / retirementYear.totalPot) * 100)}%`
                  : '0%'}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Tax-deferred portion
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                ISA Asset Share
              </div>
              <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {retirementYear?.totalPot
                  ? `${Math.round((retirementYear.isaPot / retirementYear.totalPot) * 100)}%`
                  : '0%'}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Tax-free shelter portion
              </p>
            </div>
          </div>
        )}

        {/* Comment Regarding Risk */}
        {!isStudioMode && (
          <div className="bg-amber-50/90 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Deterministic Model Risk &amp; Volatility Consideration</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-900/90 dark:text-amber-200/90">
              <strong>Important Risk Note:</strong> This deterministic projection assumes smooth, constant annual return trajectories ({profile.expectedInvestmentReturn ?? 6.5}% p.a. pre-retirement growth, {profile.postRetirementReturn ?? 4.5}% p.a. post-retirement growth, and {profile.expectedInflationRate ?? 2.5}% p.a. CPI inflation). It does not reflect market volatility, sequence of returns risk (the danger of market downturns early in retirement), or macroeconomic shocks. To stress-test your plan against market fluctuations, market crashes, and 1,000+ stochastic scenarios, navigate to the <strong>Risk &amp; Monte Carlo</strong> tab.
            </p>
          </div>
        )}
      </div>

      {/* PLAN FEASIBILITY & FAILURE HIGHLIGHT BANNER */}
      {hasPlanFailure && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-800/90 rounded-2xl p-4 sm:p-5 text-rose-950 dark:text-rose-100 shadow-sm space-y-3"
        >
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-200 flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-rose-900 dark:text-rose-100">
                    PLAN FAILURE DETECTED: Income Target Cannot Be Achieved
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-200/90 mt-0.5">
                  Your projected retirement income falls short of your target requirement starting at{' '}
                  <strong className="font-bold underline">Age {firstShortfallYear?.age} ({firstShortfallYear?.year})</strong>.
                </p>
              </div>
            </div>

            {!showAllCharts && (
              <button
                onClick={() => setChartMode('shortfall')}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>View Shortfall Chart</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-rose-200/80 dark:border-rose-800/60 text-xs">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 uppercase">First Deficit Age</div>
              <div className="text-sm font-extrabold text-rose-900 dark:text-rose-100 mt-0.5">
                Age {firstShortfallYear?.age} ({firstShortfallYear?.year})
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 uppercase">Max Annual Shortfall</div>
              <div className="text-sm font-extrabold text-rose-900 dark:text-rose-100 mt-0.5">
                -£{Math.round((maxAnnualShortfall) || 0).toLocaleString()}/yr
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 uppercase">Lifetime Income Deficit</div>
              <div className="text-sm font-extrabold text-rose-900 dark:text-rose-100 mt-0.5">
                -£{Math.round((totalLifetimeShortfall) || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* DELAYED RETIREMENT FEASIBILITY ANALYSIS */}
          {delayedRetirementAnalysis && (
            <div className="pt-3 border-t border-rose-200/80 dark:border-rose-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-rose-950 dark:text-rose-100 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Delayed Retirement Feasibility Solver</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </h4>
                    <p className="text-[11px] text-rose-800/90 dark:text-rose-200/80">
                      Evaluates whether postponing retirement gives your pots more time to accumulate and compound to achieve 100% success.
                    </p>
                  </div>
                </div>
              </div>

              {/* RECOMMENDED DELAY RESOLUTION CALLOUT */}
              {delayedRetirementAnalysis.firstSuccessful ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700/80 rounded-xl p-3.5 text-emerald-950 dark:text-emerald-100 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                          Plan Success Solution Found
                        </span>
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Delaying to Age {delayedRetirementAnalysis.firstSuccessful.testAge} eliminates 100% of shortfall
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed">
                        Retiring at <strong className="font-bold underline text-emerald-700 dark:text-emerald-300">Age {delayedRetirementAnalysis.firstSuccessful.testAge}</strong> (a delay of <strong>+{delayedRetirementAnalysis.firstSuccessful.delayYears} yr{delayedRetirementAnalysis.firstSuccessful.delayYears > 1 ? 's' : ''}</strong>) increases your projected retirement pot from <strong>£{displayedRetirementPot.toLocaleString()}</strong> to <strong>£{delayedRetirementAnalysis.firstSuccessful.retirementPot.toLocaleString()}</strong>, achieving <strong>100% plan success with £0 lifetime deficit</strong> through Age 100.
                        {profile.isCouplePlanning && delayedRetirementAnalysis.firstSuccessful.partnerTestAge && (
                          <span> (Partner retirement age shifts from Age {profile.partnerTargetRetirementAge || 60} to Age {delayedRetirementAnalysis.firstSuccessful.partnerTestAge}).</span>
                        )}
                      </p>
                    </div>

                    {onChange && (
                      <button
                        type="button"
                        onClick={() => {
                          const succ = delayedRetirementAnalysis.firstSuccessful;
                          if (!succ) return;
                          onChange({
                            ...profile,
                            targetRetirementAge: succ.testAge,
                            partnerTargetRetirementAge: profile.isCouplePlanning && profile.partnerTargetRetirementAge
                              ? profile.partnerTargetRetirementAge + succ.delayYears
                              : profile.partnerTargetRetirementAge,
                          });
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer border border-emerald-500"
                      >
                        <Check className="w-4 h-4" />
                        <span>Apply Age {delayedRetirementAnalysis.firstSuccessful.testAge} Plan</span>
                      </button>
                    )}
                  </div>

                  {/* Quick metric breakdown pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/80 text-[11px]">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Original Target</div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                        Age {profile.targetRetirementAge} (Failed)
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Successful Target</div>
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Age {delayedRetirementAnalysis.firstSuccessful.testAge} (+{delayedRetirementAnalysis.firstSuccessful.delayYears}y)
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Pot at Retirement</div>
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        £{delayedRetirementAnalysis.firstSuccessful.retirementPot.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Lifetime Deficit</div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        £0 (100% On Track)
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 text-amber-950 dark:text-amber-100 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                      Partial Improvement
                    </span>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Delaying up to Age {delayedRetirementAnalysis.maxTestAge} reduces deficit by {Math.round((1 - (delayedRetirementAnalysis.bestPartial?.totalLifetimeShortfall || 0) / (totalLifetimeShortfall || 1)) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                    Delaying retirement alone to Age <strong>{delayedRetirementAnalysis.bestPartial?.testAge}</strong> lowers your total lifetime deficit from <strong>£{Math.round(totalLifetimeShortfall).toLocaleString()}</strong> down to <strong>£{Math.round(delayedRetirementAnalysis.bestPartial?.totalLifetimeShortfall || 0).toLocaleString()}</strong>.
                    To fully resolve the remaining shortfall, consider combining a delayed retirement age with a modest increase in monthly savings or a lower target income.
                  </p>
                  {onChange && delayedRetirementAnalysis.bestPartial && (
                    <button
                      type="button"
                      onClick={() => {
                        const best = delayedRetirementAnalysis.bestPartial;
                        if (!best) return;
                        onChange({
                          ...profile,
                          targetRetirementAge: best.testAge,
                          partnerTargetRetirementAge: profile.isCouplePlanning && profile.partnerTargetRetirementAge
                            ? profile.partnerTargetRetirementAge + best.delayYears
                            : profile.partnerTargetRetirementAge,
                        });
                      }}
                      className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Set Retirement Age to Age {delayedRetirementAnalysis.bestPartial.testAge}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* YEAR-BY-YEAR DELAY OPTION SIMULATOR GRID */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                  <span>Explore Candidate Retirement Delay Scenarios (+1 to +10 years):</span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300">Click any age card to switch target age</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {delayedRetirementAnalysis.candidates.slice(0, 10).map((cand) => {
                    const isRec = cand.testAge === delayedRetirementAnalysis.firstSuccessful?.testAge;
                    return (
                      <button
                        key={`delay-cand-${cand.testAge}`}
                        type="button"
                        onClick={() => {
                          if (onChange) {
                            onChange({
                              ...profile,
                              targetRetirementAge: cand.testAge,
                              partnerTargetRetirementAge: profile.isCouplePlanning && profile.partnerTargetRetirementAge
                                ? profile.partnerTargetRetirementAge + cand.delayYears
                                : profile.partnerTargetRetirementAge,
                            });
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isRec
                            ? 'bg-emerald-100/90 dark:bg-emerald-950/90 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/30'
                            : cand.isSuccessful
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                            : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 hover:border-amber-400'
                        }`}
                      >
                        {isRec && (
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase">
                            Optimal
                          </div>
                        )}
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                          Age {cand.testAge} <span className="text-[10px] text-slate-500 font-normal">(+{cand.delayYears}y)</span>
                        </div>
                        <div className="text-[10px] font-bold mt-0.5 text-slate-600 dark:text-slate-300">
                          Pot: {formatCurrency(cand.retirementPot)}
                        </div>
                        <div className="mt-1">
                          {cand.isSuccessful ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% On Track
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded-md">
                              -{formatCurrency(Math.round(cand.totalLifetimeShortfall))} deficit
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* RETIREMENT START POT BREAKDOWN (PRIMARY & PARTNER) */}
      {!isStudioMode && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                Retirement Start Pot Breakdown (Age {profile.targetRetirementAge} / {retirementYear?.year || ''})
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {hasPurchasedAnnuity && (
                <label className="flex items-center gap-1.5 text-xs text-pink-700 dark:text-pink-300 font-extrabold bg-pink-50 dark:bg-pink-950/80 px-2.5 py-1 rounded-xl border border-pink-200 dark:border-pink-800/80 cursor-pointer shadow-2xs">
                  <input
                    type="checkbox"
                    checked={showAnnuitiesInPotBreakdown}
                    onChange={(e) => setShowAnnuitiesInPotBreakdown(e.target.checked)}
                    className="w-3.5 h-3.5 text-pink-600 rounded border-pink-300 focus:ring-pink-500 cursor-pointer"
                  />
                  <span>🌸 Display Purchased Annuity</span>
                </label>
              )}
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Total Capital: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-xs">£{(displayedRetirementPot || 0).toLocaleString()}</strong> ({adjustInflation ? "Real Terms" : "Nominal"})
              </span>
            </div>
          </div>

          {profile.isCouplePlanning ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {/* Combined Household Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">Combined Household</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    100% Total
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  £{(combinedTotalPotAtRetirement || 0).toLocaleString()}
                </div>
                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Pension Pot
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(combinedPensionPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      ISA Pot
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(combinedIsaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Cash / GIA Pot
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(combinedCashGiaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  {showAnnuitiesInPotBreakdown && hasPurchasedAnnuity && (
                    <div className="flex justify-between items-center text-pink-700 dark:text-pink-300 pt-1 border-t border-pink-100 dark:border-pink-950 font-bold">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-pink-500" />
                        Guaranteed Annuity
                      </span>
                      <span className="font-extrabold text-pink-600 dark:text-pink-400">
                        £{(retirementAnnuityIncome || maxAnnuityIncomeAcrossTimeline || 0).toLocaleString()}/yr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Primary User Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">{profile.name || 'Primary User'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    {(primarySharePct || 0).toFixed(0)}% Share
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100">
                  £{(primaryTotalPotAtRetirement || 0).toLocaleString()}
                </div>
                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Pension Pot</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(primaryPensionPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">ISA Pot Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(primaryIsaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  {(primarySsIsaPotAtRetirement > 0 || primaryCashIsaPotAtRetirement > 0 || primaryLisaPotAtRetirement > 0) && (
                    <div className="pl-2 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between"><span>S&S ISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(primarySsIsaPotAtRetirement || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Cash ISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(primaryCashIsaPotAtRetirement || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>LISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(primaryLisaPotAtRetirement || 0).toLocaleString()}</span></div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Cash / GIA Pot</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(primaryCashGiaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  {showAnnuitiesInPotBreakdown && hasPurchasedAnnuity && (profile.incomeProductOption === 'annuity' || profile.incomeProductOption === 'hybrid') && (
                    <div className="flex justify-between items-center text-pink-700 dark:text-pink-300 pt-1 border-t border-pink-100 dark:border-pink-950 font-bold">
                      <span className="font-bold">Annuity Payout</span>
                      <span className="font-extrabold text-pink-600 dark:text-pink-400">
                        £{(retirementAnnuityIncome || maxAnnuityIncomeAcrossTimeline || 0).toLocaleString()}/yr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Partner Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                    <span className="font-bold text-xs text-rose-950 dark:text-rose-200">{profile.partnerName || 'Partner'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                    {(partnerSharePct || 0).toFixed(0)}% Share
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-950 dark:text-rose-100">
                  £{(partnerTotalPotAtRetirement || 0).toLocaleString()}
                </div>
                <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Pension Pot</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(partnerPensionPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">ISA Pot Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(partnerIsaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  {(partnerSsIsaPotAtRetirement > 0 || partnerCashIsaPotAtRetirement > 0 || partnerLisaPotAtRetirement > 0) && (
                    <div className="pl-2 border-l-2 border-rose-200 dark:border-rose-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between"><span>S&S ISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(partnerSsIsaPotAtRetirement || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Cash ISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(partnerCashIsaPotAtRetirement || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>LISA:</span><span className="font-semibold text-slate-700 dark:text-slate-300">£{(partnerLisaPotAtRetirement || 0).toLocaleString()}</span></div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Cash / GIA Pot</span>
                    <span className="font-bold text-slate-900 dark:text-white">£{(partnerCashGiaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  {showAnnuitiesInPotBreakdown && hasPurchasedAnnuity && (profile.partnerIncomeProductOption === 'annuity' || profile.partnerIncomeProductOption === 'hybrid') && (
                    <div className="flex justify-between items-center text-pink-700 dark:text-pink-300 pt-1 border-t border-pink-100 dark:border-pink-950 font-bold">
                      <span className="font-bold">Annuity Payout</span>
                      <span className="font-extrabold text-pink-600 dark:text-pink-400">Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single User Breakdown */
            <div className={`grid grid-cols-1 ${showAnnuitiesInPotBreakdown && hasPurchasedAnnuity ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3.5`}>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Workplace & SIPP Pension</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  £{(combinedPensionPotAtRetirement || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {combinedTotalPotAtRetirement > 0 ? `${((combinedPensionPotAtRetirement / combinedTotalPotAtRetirement) * 100).toFixed(1)}% of total portfolio` : '0%'}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-1.5">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Total ISA Portfolio</span>
                  </span>
                  <span className="text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                    {combinedTotalPotAtRetirement > 0 ? `${((combinedIsaPotAtRetirement / combinedTotalPotAtRetirement) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  £{(combinedIsaPotAtRetirement || 0).toLocaleString()}
                </div>

                {/* Sub-breakdown of ISA types */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>📈 Stocks & Shares ISA:</span>
                    <span className="font-bold">£{(combinedSsIsaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>🏦 Cash ISA:</span>
                    <span className="font-bold">£{(combinedCashIsaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>🎁 Lifetime ISA (LISA):</span>
                    <span className="font-bold">£{(combinedLisaPotAtRetirement || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Unsheltered Cash & GIA</span>
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  £{(combinedCashGiaPotAtRetirement || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {combinedTotalPotAtRetirement > 0 ? `${((combinedCashGiaPotAtRetirement / combinedTotalPotAtRetirement) * 100).toFixed(1)}% of total portfolio` : '0%'}
                </div>
              </div>

              {showAnnuitiesInPotBreakdown && hasPurchasedAnnuity && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-pink-200 dark:border-pink-800/80 space-y-1">
                  <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span>Guaranteed Annuity Stream</span>
                  </div>
                  <div className="text-xl font-extrabold text-pink-600 dark:text-pink-400">
                    £{(retirementAnnuityIncome || maxAnnuityIncomeAcrossTimeline || 0).toLocaleString()}/yr
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {retirementAnnuityCapital > 0 ? `£${(retirementAnnuityCapital || 0).toLocaleString()} pension capital converted` : 'Guaranteed income for life'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CHART RENDERING CONTAINER */}
      {showAllCharts ? (
        <div className="space-y-8 pt-2">
          {/* Chart 1: Portfolio Trajectory */}
          <div className="space-y-2 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>1. Portfolio Trajectory (£)</span>
              </h4>
              <div className="flex gap-2 self-start sm:self-auto">
                {profile.isCouplePlanning && (
                  <div className="bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-600/50">
                    <button type="button" onClick={() => setPortfolioViewMode('combined')} className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${portfolioViewMode === 'combined' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>Combined</button>
                    <button type="button" onClick={() => setPortfolioViewMode('primary')} className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${portfolioViewMode === 'primary' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>Primary</button>
                    <button type="button" onClick={() => setPortfolioViewMode('partner')} className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${portfolioViewMode === 'partner' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>Partner</button>
                  </div>
                )}
                <div className="bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-600/50">
                <button
                  type="button"
                  onClick={() => setPotChartType('area')}
                  className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                    potChartType === 'area'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Stacked Area
                </button>
                <button
                  type="button"
                  onClick={() => setPotChartType('line')}
                  className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                    potChartType === 'line'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Line Chart
                </button>
              </div>
              </div>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {potChartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pensionGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="ssIsaGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="cashIsaGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="lisaGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="cashGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="giltGradAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]}
                      labelFormatter={(label) => `Age ${label}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', opacity: 1 }}
                      wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    {isSameRetireYear || !isCouple ? (
                      <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                    ) : (
                      <>
                        <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                        <ReferenceLine x={partnerRetirePrimaryAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                      </>
                    )}
                    {isSameAccessYear ? (
                      <ReferenceLine x={primaryAccessAge} stroke="#0284c7" strokeDasharray="3 3" label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }} />
                    ) : (
                      <>
                        <ReferenceLine x={primaryAccessAge} stroke="#0284c7" strokeDasharray="3 3" label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }} />
                        {isCouple && (
                          <ReferenceLine x={partnerAccessPrimaryAge} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }} />
                        )}
                      </>
                    )}
                    {isSameSpaYear ? (
                      <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                    ) : (
                      <>
                        {primarySpEnabled && (
                          <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                        )}
                        {partnerSpEnabled && (
                          <ReferenceLine x={partnerSpaPrimaryAge} stroke="#ec4899" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                        )}
                      </>
                    )}
                    <Area type="monotone" dataKey={potKeys.pension} name={potKeys.pensionName} stackId="1" stroke="#10b981" fill="url(#pensionGradAll)" />
                    {hasAnySsIsa && (
                      <Area type="monotone" dataKey={potKeys.ssIsa} name={potKeys.ssIsaName} stackId="1" stroke="#6366f1" fill="url(#ssIsaGradAll)" />
                    )}
                    {hasAnyCashIsa && (
                      <Area type="monotone" dataKey={potKeys.cashIsa} name={potKeys.cashIsaName} stackId="1" stroke="#3b82f6" fill="url(#cashIsaGradAll)" />
                    )}
                    {hasAnyLisa && (
                      <Area type="monotone" dataKey={potKeys.lisa} name={potKeys.lisaName} stackId="1" stroke="#a855f7" fill="url(#lisaGradAll)" />
                    )}
                    <Area type="monotone" dataKey={potKeys.cash} name={potKeys.cashName} stackId="1" stroke="#f59e0b" fill="url(#cashGradAll)" />
                    {hasAnyGilt && (
                      <Area type="monotone" dataKey={potKeys.gilt} name={potKeys.giltName} stackId="1" stroke="#0d9488" fill="url(#giltGradAll)" />
                    )}
                    {hasPurchasedAnnuity && portfolioViewMode === 'combined' && (
                      <Line type="stepAfter" dataKey="annuityIncome" name="🌸 Guaranteed Annuity Floor (£/yr)" stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    )}
                    {portfolioViewMode === 'combined' && (
                      <Line type="monotone" dataKey="cumulativeExcessIncome" name="Cumulative Income Surplus (£)" stroke="#0d9488" strokeWidth={2.5} strokeDasharray="3 3" dot={false} />
                    )}
                  </AreaChart>
                ) : (
                  <ComposedChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]}
                      labelFormatter={(label) => `Age ${label}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', opacity: 1 }}
                      wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    {isSameRetireYear || !isCouple ? (
                      <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                    ) : (
                      <>
                        <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                        <ReferenceLine x={partnerRetirePrimaryAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                      </>
                    )}
                    {isSameAccessYear ? (
                      <ReferenceLine x={primaryAccessAge} stroke="#0284c7" strokeDasharray="3 3" label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }} />
                    ) : (
                      <>
                        <ReferenceLine x={primaryAccessAge} stroke="#0284c7" strokeDasharray="3 3" label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }} />
                        {isCouple && (
                          <ReferenceLine x={partnerAccessPrimaryAge} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }} />
                        )}
                      </>
                    )}
                    {isSameSpaYear ? (
                      <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                    ) : (
                      <>
                        {primarySpEnabled && (
                          <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                        )}
                        {partnerSpEnabled && (
                          <ReferenceLine x={partnerSpaPrimaryAge} stroke="#ec4899" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                        )}
                      </>
                    )}
                    <Line type="monotone" dataKey={potKeys.total} name={potKeys.totalName} stroke="#0284c7" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey={potKeys.pension} name={potKeys.pensionName} stroke="#10b981" strokeWidth={2.5} dot={false} />
                    {hasAnySsIsa && (
                      <Line type="monotone" dataKey={potKeys.ssIsa} name={potKeys.ssIsaName} stroke="#6366f1" strokeWidth={2.5} dot={false} />
                    )}
                    {hasAnyCashIsa && (
                      <Line type="monotone" dataKey={potKeys.cashIsa} name={potKeys.cashIsaName} stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    )}
                    {hasAnyLisa && (
                      <Line type="monotone" dataKey={potKeys.lisa} name={potKeys.lisaName} stroke="#a855f7" strokeWidth={2.5} dot={false} />
                    )}
                    <Line type="monotone" dataKey={potKeys.cash} name={potKeys.cashName} stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                    {hasAnyGilt && (
                      <Line type="monotone" dataKey={potKeys.gilt} name={potKeys.giltName} stroke="#0d9488" strokeWidth={2.5} dot={false} />
                    )}
                    {hasPurchasedAnnuity && portfolioViewMode === 'combined' && (
                      <Line type="stepAfter" dataKey="annuityIncome" name="🌸 Guaranteed Annuity Floor (£/yr)" stroke="#ec4899" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                    )}
                    {portfolioViewMode === 'combined' && (
                      <Line type="monotone" dataKey="cumulativeExcessIncome" name="Cumulative Income Surplus (£)" stroke="#0d9488" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    )}
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Drawdown Income Breakdown */}
          <div className="space-y-2 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>2. Drawdown Income Breakdown (£/yr)</span>
              </h4>
              {profile.isCouplePlanning && (
                <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-700 self-start sm:self-auto">
                  <button type="button" onClick={() => setPortfolioViewMode('combined')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'combined' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Combined</button>
                  <button type="button" onClick={() => setPortfolioViewMode('primary')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'primary' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Primary ({profile.name || 'Primary'})</button>
                  <button type="button" onClick={() => setPortfolioViewMode('partner')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'partner' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Partner ({profile.partnerName || 'Partner'})</button>
                </div>
              )}
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.filter((d) => d.isRetired)} margin={{ top: 20, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={renderDrawdownIncomeTooltip} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0, boxShadow: 'none', zIndex: 1000, pointerEvents: 'none' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="statePension" name="State Pension" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="dbPensionIncome" name="Defined Benefit (DB) Pension" stackId="a" fill="#d97706" />
                  <Bar dataKey="annuityIncome" name="Guaranteed Annuity Income" stackId="a" fill="#ec4899" />
                  <Bar dataKey="taxFreeFixedIncome" name="Tax-Free Fixed Income" stackId="a" fill="#14b8a6" />
                  <Bar dataKey="taxableFixedIncome" name="Taxable Fixed Income" stackId="a" fill="#2563eb" />
                  <Bar dataKey="pensionDrawdownTaxFree" name="Pension Drawdown (Tax-Free)" stackId="a" fill="#34d399" />
                  <Bar dataKey="pensionDrawdownTaxable" name="Pension Drawdown (Taxable)" stackId="a" fill="#059669" />
                  <Bar dataKey="isaDrawdown" name="ISA Drawdown (Tax-Free)" stackId="a" fill="#6366f1" />
                  <Bar dataKey="cashDrawdown" name="Cash/GIA Drawdown" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="incomeShortfall" name="Income Shortfall Gap" stackId="a" fill="#f43f5e" />
                  <Line type="monotone" dataKey="targetIncome" name="Target Income Requirement" stroke="#e11d48" strokeWidth={3} strokeDasharray="6 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Annual Shortfall / Deficit */}
          <div className="space-y-2 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <h4 className="font-extrabold text-xs text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>3. Annual Income Shortfall / Deficit (£/yr)</span>
            </h4>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.filter((d) => d.isRetired)} margin={{ top: 20, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]}
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', opacity: 1 }}
                    wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="incomeShortfall" name="Annual Income Shortfall / Deficit (£)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="targetIncome" name="Target Income Requirement" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div id="portfolio-trajectory-chart-container" className="h-96 w-full pt-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 transition-colors flex flex-col">
          {chartMode === 'pots' && (
            <div className="flex items-center justify-between px-2 pt-1 pb-2 mb-1 border-b border-slate-200/60 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Portfolio Trajectory
                </span>
              </div>
              <div className="flex gap-2">
                {profile.isCouplePlanning && (
                  <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-700">
                    <button type="button" onClick={() => setPortfolioViewMode('combined')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'combined' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Combined</button>
                    <button type="button" onClick={() => setPortfolioViewMode('primary')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'primary' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Primary ({profile.name || 'Primary'})</button>
                    <button type="button" onClick={() => setPortfolioViewMode('partner')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'partner' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Partner ({profile.partnerName || 'Partner'})</button>
                  </div>
                )}
                <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPotChartType('area')}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    potChartType === 'area'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Stacked Area
                </button>
                <button
                  type="button"
                  onClick={() => setPotChartType('line')}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    potChartType === 'line'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Line Chart
                </button>
              </div>
              </div>
            </div>
          )}
          {chartMode === 'income' && (
            <div className="flex items-center justify-between px-2 pt-1 pb-2 mb-1 border-b border-slate-200/60 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Drawdown Income Breakdown (£/yr)
                </span>
              </div>
              {profile.isCouplePlanning && (
                <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[11px] font-bold border border-slate-300/50 dark:border-slate-700">
                  <button type="button" onClick={() => setPortfolioViewMode('combined')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'combined' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Combined</button>
                  <button type="button" onClick={() => setPortfolioViewMode('primary')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'primary' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Primary ({profile.name || 'Primary'})</button>
                  <button type="button" onClick={() => setPortfolioViewMode('partner')} className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'partner' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Partner ({profile.partnerName || 'Partner'})</button>
                </div>
              )}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={chartMode + '-' + potChartType + (adjustInflation ? '-real' : '-nominal')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full flex-1 min-h-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'pots' ? (
                  potChartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pensionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="ssIsaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="cashIsaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="lisaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="giltGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                      <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0]?.payload;
                          if (!data) return null;

                          return (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 min-w-[210px]">
                              <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                <span>Age {data.age} ({data.year})</span>
                                {data.isRetired && (
                                  data.incomeShortfall > 0 ? (
                                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800">
                                      🚨 Plan Failure
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black border border-emerald-200 dark:border-emerald-800">
                                      ✅ On Track
                                    </span>
                                  )
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <span>Pension Pot:</span>
                                  <span className="font-bold">£{(data[potKeys.pension] || 0).toLocaleString()}</span>
                                </div>
                                {data[potKeys.ssIsa] > 0 && (
                                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                                    <span>S&S ISA:</span>
                                    <span className="font-bold">£{(data[potKeys.ssIsa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data[potKeys.cashIsa] > 0 && (
                                  <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                                    <span>Cash ISA:</span>
                                    <span className="font-bold">£{(data[potKeys.cashIsa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data[potKeys.lisa] > 0 && (
                                  <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold">
                                    <span>LISA:</span>
                                    <span className="font-bold">£{(data[potKeys.lisa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                                  <span>Cash/GIA:</span>
                                  <span className="font-bold">£{(data[potKeys.cash] || 0).toLocaleString()}</span>
                                </div>
                                {data[potKeys.gilt] > 0 && (
                                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-semibold">
                                    <span>🏛️ Gilt Ladder Pot:</span>
                                    <span className="font-bold">£{(data[potKeys.gilt] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data.giltLadderIncome > 0 && (
                                  <div className="flex justify-between text-teal-700 dark:text-teal-300 font-bold">
                                    <span>🏛️ Gilt Payout Received:</span>
                                    <span className="font-bold">+£{(data.giltLadderIncome || 0).toLocaleString()} (0% CGT)</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span>Total Pot:</span>
                                  <span>£{(data[potKeys.total] || 0).toLocaleString()}</span>
                                </div>
                                {data.annuityIncome > 0 && (
                                  <div className="flex justify-between text-pink-600 dark:text-pink-400 font-extrabold pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span>🌸 Guaranteed Annuity Floor:</span>
                                    <span>£{(data.annuityIncome || 0).toLocaleString()}/yr</span>
                                  </div>
                                )}
                                {data.cumulativeExcessIncome > 0 && (
                                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span>Cumulative Income Surplus:</span>
                                    <span>+£{(data.cumulativeExcessIncome || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data.isRetired && (
                                  <>
                                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <span>Income Target Req:</span>
                                      <span className="font-bold">£{(data.targetIncome || 0).toLocaleString()}/yr</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-500 font-semibold">
                                      <span>Net Income Received:</span>
                                      <span className="font-bold">£{(data.totalIncome || 0).toLocaleString()}/yr</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {data.isRetired && data.incomeShortfall > 0 && (
                                <div className="pt-1.5 border-t border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold">
                                  Income Deficit: -£{(data.incomeShortfall || 0).toLocaleString()}/yr
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                      {isSameRetireYear || !isCouple ? (
                        <ReferenceLine
                          x={primaryRetireAge}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                        />
                      ) : (
                        <>
                          <ReferenceLine
                            x={primaryRetireAge}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                          />
                          <ReferenceLine
                            x={partnerRetirePrimaryAge}
                            stroke="#059669"
                            strokeDasharray="4 4"
                            label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                          />
                        </>
                      )}

                      {isSameAccessYear ? (
                        <ReferenceLine
                          x={primaryAccessAge}
                          stroke="#0284c7"
                          strokeDasharray="3 3"
                          label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                        />
                      ) : (
                        <>
                          <ReferenceLine
                            x={primaryAccessAge}
                            stroke="#0284c7"
                            strokeDasharray="3 3"
                            label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                          />
                          {isCouple && (
                            <ReferenceLine
                              x={partnerAccessPrimaryAge}
                              stroke="#38bdf8"
                              strokeDasharray="3 3"
                              label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                            />
                          )}
                        </>
                      )}

                      {isSameSpaYear ? (
                        <ReferenceLine
                          x={primarySpa}
                          stroke="#8b5cf6"
                          strokeDasharray="4 4"
                          label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                        />
                      ) : (
                        <>
                          {primarySpEnabled && (
                            <ReferenceLine
                              x={primarySpa}
                              stroke="#8b5cf6"
                              strokeDasharray="4 4"
                              label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                            />
                          )}
                          {partnerSpEnabled && (
                            <ReferenceLine
                              x={partnerSpaPrimaryAge}
                              stroke="#ec4899"
                              strokeDasharray="4 4"
                              label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                            />
                          )}
                        </>
                      )}

                      <Area type="monotone" dataKey={potKeys.pension} name="Pension Pot" stackId="1" stroke="#10b981" fill="url(#pensionGradient)" />
                      {hasAnySsIsa && (
                        <Area type="monotone" dataKey={potKeys.ssIsa} name={potKeys.ssIsaName} stackId="1" stroke="#6366f1" fill="url(#ssIsaGradient)" />
                      )}
                      {hasAnyCashIsa && (
                        <Area type="monotone" dataKey={potKeys.cashIsa} name={potKeys.cashIsaName} stackId="1" stroke="#3b82f6" fill="url(#cashIsaGradient)" />
                      )}
                      {hasAnyLisa && (
                        <Area type="monotone" dataKey={potKeys.lisa} name={potKeys.lisaName} stackId="1" stroke="#a855f7" fill="url(#lisaGradient)" />
                      )}
                      <Area type="monotone" dataKey={potKeys.cash} name="Cash & GIA" stackId="1" stroke="#f59e0b" fill="url(#cashGradient)" />
                      {hasAnyGilt && (
                        <Area type="monotone" dataKey={potKeys.gilt} name={potKeys.giltName} stackId="1" stroke="#0d9488" fill="url(#giltGradient)" />
                      )}
                      {hasPurchasedAnnuity && (
                        <Line type="stepAfter" dataKey="annuityIncome" name="🌸 Guaranteed Annuity Floor (£/yr)" stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                      )}
                      <Line type="monotone" dataKey="cumulativeExcessIncome" name="Cumulative Income Surplus (£)" stroke="#0d9488" strokeWidth={2.5} strokeDasharray="3 3" dot={false} />
                    </AreaChart>
                  ) : (
                    <ComposedChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                      <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0]?.payload;
                          if (!data) return null;

                          return (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 min-w-[210px]">
                              <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                <span>Age {data.age} ({data.year})</span>
                                {data.isRetired && (
                                  data.incomeShortfall > 0 ? (
                                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800">
                                      🚨 Plan Failure
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black border border-emerald-200 dark:border-emerald-800">
                                      ✅ On Track
                                    </span>
                                  )
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-sky-600 dark:text-sky-400 font-extrabold pb-1 border-b border-slate-100 dark:border-slate-800">
                                  <span>Total Portfolio Balance:</span>
                                  <span>£{(data[potKeys.total] || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                                  <span>Pension Pot:</span>
                                  <span className="font-bold">£{(data[potKeys.pension] || 0).toLocaleString()}</span>
                                </div>
                                {data[potKeys.ssIsa] > 0 && (
                                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                                    <span>S&S ISA:</span>
                                    <span className="font-bold">£{(data[potKeys.ssIsa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data[potKeys.cashIsa] > 0 && (
                                  <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                                    <span>Cash ISA:</span>
                                    <span className="font-bold">£{(data[potKeys.cashIsa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data[potKeys.lisa] > 0 && (
                                  <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold">
                                    <span>LISA:</span>
                                    <span className="font-bold">£{(data[potKeys.lisa] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                                  <span>Cash / GIA:</span>
                                  <span className="font-bold">£{(data[potKeys.cash] || 0).toLocaleString()}</span>
                                </div>
                                {data[potKeys.gilt] > 0 && (
                                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-semibold">
                                    <span>🏛️ Gilt Ladder Pot:</span>
                                    <span className="font-bold">£{(data[potKeys.gilt] || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data.giltLadderIncome > 0 && (
                                  <div className="flex justify-between text-teal-700 dark:text-teal-300 font-bold">
                                    <span>🏛️ Gilt Payout Received:</span>
                                    <span className="font-bold">+£{(data.giltLadderIncome || 0).toLocaleString()} (0% CGT)</span>
                                  </div>
                                )}
                                {data.annuityIncome > 0 && (
                                  <div className="flex justify-between text-pink-600 dark:text-pink-400 font-extrabold pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span>🌸 Guaranteed Annuity Floor:</span>
                                    <span>£{(data.annuityIncome || 0).toLocaleString()}/yr</span>
                                  </div>
                                )}
                                {data.cumulativeExcessIncome > 0 && (
                                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span>Cumulative Income Surplus:</span>
                                    <span>+£{(data.cumulativeExcessIncome || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                {data.isRetired && (
                                  <>
                                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <span>Income Target Req:</span>
                                      <span className="font-bold">£{(data.targetIncome || 0).toLocaleString()}/yr</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-500 font-semibold">
                                      <span>Net Income Received:</span>
                                      <span className="font-bold">£{(data.totalIncome || 0).toLocaleString()}/yr</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {data.isRetired && data.incomeShortfall > 0 && (
                                <div className="pt-1.5 border-t border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold">
                                  Income Deficit: -£{(data.incomeShortfall || 0).toLocaleString()}/yr
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                      {isSameRetireYear || !isCouple ? (
                        <ReferenceLine
                          x={primaryRetireAge}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                        />
                      ) : (
                        <>
                          <ReferenceLine
                            x={primaryRetireAge}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                          />
                          <ReferenceLine
                            x={partnerRetirePrimaryAge}
                            stroke="#059669"
                            strokeDasharray="4 4"
                            label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                          />
                        </>
                      )}

                      {isSameAccessYear ? (
                        <ReferenceLine
                          x={primaryAccessAge}
                          stroke="#0284c7"
                          strokeDasharray="3 3"
                          label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                        />
                      ) : (
                        <>
                          <ReferenceLine
                            x={primaryAccessAge}
                            stroke="#0284c7"
                            strokeDasharray="3 3"
                            label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                          />
                          {isCouple && (
                            <ReferenceLine
                              x={partnerAccessPrimaryAge}
                              stroke="#38bdf8"
                              strokeDasharray="3 3"
                              label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                            />
                          )}
                        </>
                      )}

                      {isSameSpaYear ? (
                        <ReferenceLine
                          x={primarySpa}
                          stroke="#8b5cf6"
                          strokeDasharray="4 4"
                          label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                        />
                      ) : (
                        <>
                          {primarySpEnabled && (
                            <ReferenceLine
                              x={primarySpa}
                              stroke="#8b5cf6"
                              strokeDasharray="4 4"
                              label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                            />
                          )}
                          {partnerSpEnabled && (
                            <ReferenceLine
                              x={partnerSpaPrimaryAge}
                              stroke="#ec4899"
                              strokeDasharray="4 4"
                              label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                            />
                          )}
                        </>
                      )}

                      <Line type="monotone" dataKey={potKeys.total} name="Total Portfolio Balance" stroke="#0284c7" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey={potKeys.pension} name="Pension Pot" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      {hasAnySsIsa && (
                        <Line type="monotone" dataKey={potKeys.ssIsa} name={potKeys.ssIsaName} stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      )}
                      {hasAnyCashIsa && (
                        <Line type="monotone" dataKey={potKeys.cashIsa} name={potKeys.cashIsaName} stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      )}
                      {hasAnyLisa && (
                        <Line type="monotone" dataKey={potKeys.lisa} name={potKeys.lisaName} stroke="#a855f7" strokeWidth={2.5} dot={false} />
                      )}
                      <Line type="monotone" dataKey={potKeys.cash} name="Cash & GIA" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                      {hasAnyGilt && (
                        <Line type="monotone" dataKey={potKeys.gilt} name={potKeys.giltName} stroke="#0d9488" strokeWidth={2.5} dot={false} />
                      )}
                      {hasPurchasedAnnuity && (
                        <Line type="stepAfter" dataKey="annuityIncome" name="🌸 Guaranteed Annuity Floor (£/yr)" stroke="#ec4899" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                      )}
                      <Line type="monotone" dataKey="cumulativeExcessIncome" name="Cumulative Income Surplus (£)" stroke="#0d9488" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    </ComposedChart>
                  )
                ) : chartMode === 'income' ? (
                  <ComposedChart data={chartData.filter((d) => d.isRetired)} margin={{ top: 30, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={renderDrawdownIncomeTooltip} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0, boxShadow: 'none', zIndex: 1000, pointerEvents: 'none' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                    <Bar dataKey="statePension" name="State Pension" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="dbPensionIncome" name="Defined Benefit (DB) Pension" stackId="a" fill="#d97706" />
                    <Bar dataKey="annuityIncome" name="Guaranteed Annuity Income" stackId="a" fill="#ec4899" />
                    <Bar dataKey="giltLadderIncome" name="UK Gilt Ladder Payout (0% CGT)" stackId="a" fill="#0d9488" />
                    <Bar dataKey="taxFreeFixedIncome" name="Tax-Free Fixed Income (e.g. PIP)" stackId="a" fill="#14b8a6" />
                    <Bar dataKey="taxableFixedIncome" name="Taxable Fixed Income (e.g. Rental)" stackId="a" fill="#2563eb" />
                    <Bar dataKey="pensionDrawdownTaxFree" name="Pension Drawdown (Tax-Free)" stackId="a" fill="#34d399" />
                    <Bar dataKey="pensionDrawdownTaxable" name="Pension Drawdown (Taxable)" stackId="a" fill="#059669" />
                    <Bar dataKey="isaDrawdown" name="ISA Drawdown (Tax-Free)" stackId="a" fill="#6366f1" />
                    <Bar dataKey="cashDrawdown" name="Cash/GIA Drawdown" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="incomeShortfall" name="Income Shortfall Gap" stackId="a" fill="#f43f5e" />

                    {/* Target Income Requirement Line Overlay */}
                    <Line
                      type="monotone"
                      dataKey="targetIncome"
                      name="Target Income Requirement"
                      stroke="#e11d48"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="annualIncomeExcess"
                      name="Annual Income Surplus (£/yr)"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={chartData.filter((d) => d.isRetired)} margin={{ top: 30, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0, boxShadow: 'none', zIndex: 1000, pointerEvents: 'none' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        if (!data) return null;

                        return (
                          <div className="bg-white dark:bg-slate-900 opacity-100 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 min-w-[220px]">
                            <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                              <span>Retirement Age {data.age} ({data.year})</span>
                              {data.incomeShortfall > 0 ? (
                                <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800">
                                  🚨 Shortfall: £{(data.incomeShortfall || 0).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black border border-emerald-200 dark:border-emerald-800">
                                  ✅ Target Met
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                                <span>Target Income Target:</span>
                                <span>£{(data.targetIncome || 0).toLocaleString()}/yr</span>
                              </div>
                              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                <span>Achieved Net Income:</span>
                                <span>£{(data.totalIncome || 0).toLocaleString()}/yr</span>
                              </div>
                              <div className="flex justify-between font-extrabold text-rose-600 dark:text-rose-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span>Annual Deficit / Shortfall:</span>
                                <span>-£{(data.incomeShortfall || 0).toLocaleString()}/yr</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                    <Bar dataKey="incomeShortfall" name="Annual Income Shortfall / Deficit (£)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="targetIncome"
                      name="Target Income Requirement"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* View Mode & Inflation Controls (Positioned After Chart) */}
      {!showAllCharts ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 flex-wrap">
            <button
              onClick={() => setChartMode('pots')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartMode === 'pots'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Portfolio Trajectory (£)
            </button>
            <button
              onClick={() => setChartMode('income')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartMode === 'income'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Drawdown Income (£/yr)
            </button>
            <button
              onClick={() => setChartMode('shortfall')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'shortfall'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Shortfall (£/yr)</span>
              {hasPlanFailure && (
                <span className="bg-rose-200 text-rose-900 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                  {shortfallYears.length}
                </span>
              )}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <input
              type="checkbox"
              checked={adjustInflation}
              onChange={(e) => onChange?.({ ...profile, adjustForInflation: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <span>Today's £ (Real Terms)</span>
          </label>
        </div>
      ) : (
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <input
              type="checkbox"
              checked={adjustInflation}
              onChange={(e) => onChange?.({ ...profile, adjustForInflation: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <span>Today's £ (Real Terms)</span>
          </label>
        </div>
      )}
    </motion.div>
  );
};

