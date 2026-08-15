import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  YearProjection,
  UserProfile,
  TaxCalculationResult,
  InvestmentPots,
  AppMode,
} from '../types';
import {
  calculateUKTax,
  calculatePartnerUKTax,
} from '../utils/ukTaxEngine';
import {
  Waves,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  PiggyBank,
  Wallet,
  ShieldCheck,
  Building,
  Coins,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Layers,
  Info,
  SlidersHorizontal,
  DollarSign,
  PieChart,
  Home,
  Heart,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Users,
  User,
  Split,
} from 'lucide-react';

export type CashFlowViewMode = 'combined' | 'split' | 'primary' | 'partner';

interface CashFlowSankeyCardProps {
  projections: YearProjection[];
  profile: UserProfile;
  pots?: InvestmentPots;
  taxResult?: TaxCalculationResult;
  appMode?: AppMode;
  initialViewMode?: CashFlowViewMode;
}

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  amount: number;
  color: string;
  category: 'source' | 'hub' | 'deduction' | 'allocation';
  column: number; // 0: Gross Inflows, 1: Gross/Tax Intermediate, 2: Net Cash / Tax Deductions, 3: Final Allocations
  icon?: any;
}

interface FlowLink {
  sourceId: string;
  targetId: string;
  amount: number;
  color: string;
  label?: string;
}

export const CashFlowSankeyCard: React.FC<CashFlowSankeyCardProps> = ({
  projections,
  profile,
  pots,
  taxResult,
  appMode = 'basic',
  initialViewMode = 'combined',
}) => {
  // Select initial age (default to target retirement age or current age)
  const defaultAge = profile.targetRetirementAge || (projections[0]?.age ?? 60);
  const [selectedAge, setSelectedAge] = useState<number>(defaultAge);
  const defaultCombinedEssentialFloor = useMemo(() => {
    const target = profile.targetRetirementIncomeAnnual || 30000;
    return Math.round((target * 0.65) / 500) * 500;
  }, [profile.targetRetirementIncomeAnnual]);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [combinedEssentialFloor, setCombinedEssentialFloor] = useState<number>(defaultCombinedEssentialFloor); // Numerical essential floor in today's £
  const [viewMode, setViewMode] = useState<CashFlowViewMode>(initialViewMode);

  // Dynamic theme tracking for SVG rendering and light/dark styling
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    updateTheme();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isCouple = Boolean(profile.isCouplePlanning);
  const activeViewMode: CashFlowViewMode = isCouple ? viewMode : 'combined';
  const primaryName = profile.name || 'Primary';
  const partnerName = profile.partnerName || 'Partner';

  // Find the selected projection
  const selectedProjection = useMemo(() => {
    const found = projections.find((p) => p.age === selectedAge);
    return found || projections[0] || null;
  }, [projections, selectedAge]);

  const isRetired = selectedProjection ? selectedProjection.isRetired : false;
  const adjustInflation = profile.adjustForInflation ?? false;

  // Format currency helper
  const formatGBP = (val: number) => `£${Math.round(val).toLocaleString()}`;
  const formatGBPFull = (val: number) => `£${Math.round(val).toLocaleString('en-GB')}`;

  // Pre-calculate mortgage payment for the selected projection year
  const mortgagePaymentAnnual = useMemo(() => {
    if (!profile.mortgage || !profile.mortgage.enabled) return 0;
    const mortgage = profile.mortgage;
    const currentAge = profile.currentAge;
    const termYears = mortgage.remainingTermYears + (mortgage.remainingTermMonths ? mortgage.remainingTermMonths / 12 : 0);
    const startAge = currentAge;
    const endAge = currentAge + termYears;

    if (mortgage.payoffAtRetirement && selectedAge >= (profile.targetRetirementAge || 60)) {
      return 0; // Cleared at retirement
    }

    if (selectedAge >= startAge && selectedAge < endAge) {
      if (mortgage.customMonthlyPayment) {
        return (mortgage.customMonthlyPayment + (mortgage.regularMonthlyOverpayment || 0)) * 12;
      }
      const P = mortgage.currentBalance;
      const r = (mortgage.interestRatePercent / 100) / 12;
      const n = Math.max(1, mortgage.remainingTermYears * 12 + (mortgage.remainingTermMonths || 0));
      let pmt = 0;
      if (mortgage.repaymentType === 'interest_only') {
        pmt = P * r;
      } else {
        pmt = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
      return (pmt + (mortgage.regularMonthlyOverpayment || 0)) * 12;
    }
    return 0;
  }, [profile.mortgage, profile.currentAge, profile.targetRetirementAge, selectedAge]);

  // Compute detailed financial flows for the selected projection year
  const flowData = useMemo(() => {
    if (!selectedProjection) return null;

    const p = selectedProjection;
    const inflationFactor = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, p.age - profile.currentAge);
    const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
    const partnerAge = p.age + partnerAgeDiff;

    if (!p.isRetired) {
      // ==========================================
      // ACCUMULATION PHASE CASH FLOW (SALARY & ACCUMULATION)
      // ==========================================
      const priSalary = (profile.grossAnnualSalary || 0) * (adjustInflation ? 1 : inflationFactor);
      const partSalary = isCouple ? (profile.partnerGrossAnnualSalary || 0) * (adjustInflation ? 1 : inflationFactor) : 0;
      const totalSalary = priSalary + partSalary;

      // Calculate annual tax and deductions for this year
      const priTax = calculateUKTax(profile, pots || profile.pots, false, p.age);
      const partTax = isCouple ? calculatePartnerUKTax(profile, profile.partnerPots || profile.pots) : null;

      const priEmpPension = (priTax.employeePensionContributionsAnnual || 0);
      const priEmprPension = (priTax.employerPensionContributionsAnnual || 0);
      const priPensionTotal = priEmpPension + priEmprPension;
      const priIsaContribs = (priTax.totalIsaContributionsAnnual || 0);
      const priCashGiaContribs = (priTax.totalCashGiaContributionsAnnual || 0);
      const priIncomeTax = priTax.totalIncomeTax;
      const priNI = priTax.totalNationalInsurance;
      const priNetTakeHome = Math.max(0, priTax.netTakeHomePay - priIsaContribs - priCashGiaContribs);

      const partEmpPension = (partTax?.employeePensionContributionsAnnual || 0);
      const partEmprPension = (partTax?.employerPensionContributionsAnnual || 0);
      const partPensionTotal = partEmpPension + partEmprPension;
      const partIsaContribs = (partTax?.totalIsaContributionsAnnual || 0);
      const partCashGiaContribs = (partTax?.totalCashGiaContributionsAnnual || 0);
      const partIncomeTax = partTax ? partTax.totalIncomeTax : 0;
      const partNI = partTax ? partTax.totalNationalInsurance : 0;
      const partNetTakeHome = Math.max(0, (partTax?.netTakeHomePay || 0) - partIsaContribs - partCashGiaContribs);

      const isIndividualShare = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
      const effectiveEssentialFloor = isIndividualShare ? combinedEssentialFloor / 2 : combinedEssentialFloor;
      const inflatedEssentialTarget = adjustInflation ? effectiveEssentialFloor : (effectiveEssentialFloor * inflationFactor);

      const nodes: FlowNode[] = [];
      const links: FlowLink[] = [];

      if (activeViewMode === 'split' && isCouple) {
        // ====================================================
        // SPLIT VIEW MODE: COMBINED HOUSEHOLD DATA SPLIT BY PERSON
        // ====================================================
        const priGross = priSalary + priEmprPension;
        const partGross = partSalary + partEmprPension;
        const totalGrossIncome = priGross + partGross;
        const totalTaxAndNI = priIncomeTax + priNI + partIncomeTax + partNI;
        const totalSavingsInvested = priPensionTotal + partPensionTotal + priIsaContribs + partIsaContribs + priCashGiaContribs + partCashGiaContribs;

        // Mortgage shares
        const priMortgageShare = totalSalary > 0 ? (priSalary / totalSalary) * mortgagePaymentAnnual : mortgagePaymentAnnual * 0.5;
        const partMortgageShare = totalSalary > 0 ? (partSalary / totalSalary) * mortgagePaymentAnnual : mortgagePaymentAnnual * 0.5;
        const priMortgageAlloc = Math.min(priNetTakeHome, priMortgageShare);
        const partMortgageAlloc = Math.min(partNetTakeHome, partMortgageShare);
        const totalMortgageAlloc = priMortgageAlloc + partMortgageAlloc;

        const priRemaining = Math.max(0, priNetTakeHome - priMortgageAlloc);
        const partRemaining = Math.max(0, partNetTakeHome - partMortgageAlloc);
        const totalRemaining = priRemaining + partRemaining;

        const essentialLiving = Math.min(totalRemaining, inflatedEssentialTarget);
        const priEssential = totalRemaining > 0 ? (priRemaining / totalRemaining) * essentialLiving : 0;
        const partEssential = totalRemaining > 0 ? (partRemaining / totalRemaining) * essentialLiving : 0;

        const discretionaryLiving = Math.max(0, totalRemaining - essentialLiving);
        const priDiscretionary = totalRemaining > 0 ? (priRemaining / totalRemaining) * discretionaryLiving : 0;
        const partDiscretionary = totalRemaining > 0 ? (partRemaining / totalRemaining) * discretionaryLiving : 0;

        // Column 0: Sources (Split by person)
        if (priSalary > 0) {
          nodes.push({
            id: 'pri_salary',
            label: `${primaryName} Gross Salary`,
            sublabel: `PAYE (Age ${p.age})`,
            amount: priSalary,
            color: '#0284c7', // sky-600
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (priEmprPension > 0) {
          nodes.push({
            id: 'pri_empr_pension',
            label: `${primaryName} Employer Match`,
            sublabel: 'Workplace Pension Top-up',
            amount: priEmprPension,
            color: '#10b981', // emerald-500
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }
        if (partSalary > 0) {
          nodes.push({
            id: 'part_salary',
            label: `${partnerName} Gross Salary`,
            sublabel: `PAYE (Age ${partnerAge})`,
            amount: partSalary,
            color: '#38bdf8', // sky-400
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (partEmprPension > 0) {
          nodes.push({
            id: 'part_empr_pension',
            label: `${partnerName} Employer Match`,
            sublabel: 'Workplace Pension Top-up',
            amount: partEmprPension,
            color: '#34d399', // emerald-400
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }

        // Column 1: Gross Inflow Hubs (Split by person)
        nodes.push({
          id: 'pri_gross_hub',
          label: `${primaryName} Gross Inflows`,
          sublabel: `Salary & Employer Top-up`,
          amount: priGross,
          color: '#6366f1', // indigo-500
          category: 'hub',
          column: 1,
          icon: Coins,
        });
        if (priSalary > 0) links.push({ sourceId: 'pri_salary', targetId: 'pri_gross_hub', amount: priSalary, color: '#0284c7' });
        if (priEmprPension > 0) links.push({ sourceId: 'pri_empr_pension', targetId: 'pri_gross_hub', amount: priEmprPension, color: '#10b981' });

        nodes.push({
          id: 'part_gross_hub',
          label: `${partnerName} Gross Inflows`,
          sublabel: `Salary & Employer Top-up`,
          amount: partGross,
          color: '#8b5cf6', // purple-500
          category: 'hub',
          column: 1,
          icon: Coins,
        });
        if (partSalary > 0) links.push({ sourceId: 'part_salary', targetId: 'part_gross_hub', amount: partSalary, color: '#38bdf8' });
        if (partEmprPension > 0) links.push({ sourceId: 'part_empr_pension', targetId: 'part_gross_hub', amount: partEmprPension, color: '#34d399' });

        // Column 2: Tax Deductions & Net Take-Home (Split by person)
        if (priIncomeTax > 0) {
          nodes.push({
            id: 'pri_income_tax',
            label: `${primaryName} Income Tax`,
            sublabel: `PAYE Income Tax`,
            amount: priIncomeTax,
            color: '#ef4444',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_income_tax', amount: priIncomeTax, color: '#ef4444' });
        }
        if (priNI > 0) {
          nodes.push({
            id: 'pri_ni_tax',
            label: `${primaryName} National Insurance`,
            sublabel: `Class 1 Contributions`,
            amount: priNI,
            color: '#f97316',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_ni_tax', amount: priNI, color: '#f97316' });
        }

        const priNetSpendableHubAmount = priNetTakeHome + priIsaContribs + priCashGiaContribs;
        nodes.push({
          id: 'pri_net_hub',
          label: `${primaryName} Take-Home Pay`,
          sublabel: `Net disposable salary`,
          amount: priNetSpendableHubAmount,
          color: '#14b8a6', // teal-500
          category: 'hub',
          column: 2,
          icon: Wallet,
        });
        links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_net_hub', amount: priNetSpendableHubAmount, color: '#14b8a6' });

        if (partIncomeTax > 0) {
          nodes.push({
            id: 'part_income_tax',
            label: `${partnerName} Income Tax`,
            sublabel: `PAYE Income Tax`,
            amount: partIncomeTax,
            color: '#f43f5e',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'part_gross_hub', targetId: 'part_income_tax', amount: partIncomeTax, color: '#f43f5e' });
        }
        if (partNI > 0) {
          nodes.push({
            id: 'part_ni_tax',
            label: `${partnerName} National Insurance`,
            sublabel: `Class 1 Contributions`,
            amount: partNI,
            color: '#fb923c',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'part_gross_hub', targetId: 'part_ni_tax', amount: partNI, color: '#fb923c' });
        }

        const partNetSpendableHubAmount = partNetTakeHome + partIsaContribs + partCashGiaContribs;
        nodes.push({
          id: 'part_net_hub',
          label: `${partnerName} Take-Home Pay`,
          sublabel: `Net disposable salary`,
          amount: partNetSpendableHubAmount,
          color: '#06b6d4', // cyan-500
          category: 'hub',
          column: 2,
          icon: Wallet,
        });
        links.push({ sourceId: 'part_gross_hub', targetId: 'part_net_hub', amount: partNetSpendableHubAmount, color: '#06b6d4' });

        // Column 3: Allocations
        if (priPensionTotal > 0) {
          nodes.push({
            id: 'pri_pension_savings',
            label: `${primaryName} Pension Savings`,
            sublabel: `Workplace & SIPP Inflows`,
            amount: priPensionTotal,
            color: '#10b981',
            category: 'allocation',
            column: 3,
            icon: PiggyBank,
          });
          links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_pension_savings', amount: priPensionTotal, color: '#10b981' });
        }
        if (partPensionTotal > 0) {
          nodes.push({
            id: 'part_pension_savings',
            label: `${partnerName} Pension Savings`,
            sublabel: `Workplace & SIPP Inflows`,
            amount: partPensionTotal,
            color: '#34d399',
            category: 'allocation',
            column: 3,
            icon: PiggyBank,
          });
          links.push({ sourceId: 'part_gross_hub', targetId: 'part_pension_savings', amount: partPensionTotal, color: '#34d399' });
        }

        if (priIsaContribs > 0) {
          nodes.push({
            id: 'pri_isa_savings',
            label: `${primaryName} ISA / LISA`,
            sublabel: `Stocks & Shares / Cash ISA`,
            amount: priIsaContribs,
            color: '#8b5cf6',
            category: 'allocation',
            column: 3,
            icon: TrendingUp,
          });
          links.push({ sourceId: 'pri_net_hub', targetId: 'pri_isa_savings', amount: priIsaContribs, color: '#8b5cf6' });
        }
        if (priCashGiaContribs > 0) {
          nodes.push({
            id: 'pri_cash_gia_savings',
            label: `${primaryName} Cash / GIA`,
            sublabel: `General Account & Cash`,
            amount: priCashGiaContribs,
            color: '#f59e0b',
            category: 'allocation',
            column: 3,
            icon: Coins,
          });
          links.push({ sourceId: 'pri_net_hub', targetId: 'pri_cash_gia_savings', amount: priCashGiaContribs, color: '#f59e0b' });
        }

        if (partIsaContribs > 0) {
          nodes.push({
            id: 'part_isa_savings',
            label: `${partnerName} ISA / LISA`,
            sublabel: `Stocks & Shares / Cash ISA`,
            amount: partIsaContribs,
            color: '#a855f7',
            category: 'allocation',
            column: 3,
            icon: TrendingUp,
          });
          links.push({ sourceId: 'part_net_hub', targetId: 'part_isa_savings', amount: partIsaContribs, color: '#a855f7' });
        }
        if (partCashGiaContribs > 0) {
          nodes.push({
            id: 'part_cash_gia_savings',
            label: `${partnerName} Cash / GIA`,
            sublabel: `General Account & Cash`,
            amount: partCashGiaContribs,
            color: '#fbbf24',
            category: 'allocation',
            column: 3,
            icon: Coins,
          });
          links.push({ sourceId: 'part_net_hub', targetId: 'part_cash_gia_savings', amount: partCashGiaContribs, color: '#fbbf24' });
        }

        if (totalMortgageAlloc > 0) {
          nodes.push({
            id: 'mortgage_pay',
            label: 'Mortgage Repayment',
            sublabel: 'Joint Debt Clearance',
            amount: totalMortgageAlloc,
            color: '#0ea5e9',
            category: 'allocation',
            column: 3,
            icon: Home,
          });
          if (priMortgageAlloc > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'mortgage_pay', amount: priMortgageAlloc, color: '#0ea5e9' });
          if (partMortgageAlloc > 0) links.push({ sourceId: 'part_net_hub', targetId: 'mortgage_pay', amount: partMortgageAlloc, color: '#38bdf8' });
        }

        if (essentialLiving > 0) {
          const isFloorMet = totalRemaining >= inflatedEssentialTarget;
          nodes.push({
            id: 'essential_living',
            label: 'Household Essential Floor',
            sublabel: `Target: ${formatGBP(inflatedEssentialTarget)} (${isFloorMet ? '100% Met' : `${Math.round((totalRemaining / Math.max(1, inflatedEssentialTarget)) * 100)}% Met`})`,
            amount: essentialLiving,
            color: '#059669',
            category: 'allocation',
            column: 3,
            icon: ShieldCheck,
          });
          if (priEssential > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'essential_living', amount: priEssential, color: '#059669' });
          if (partEssential > 0) links.push({ sourceId: 'part_net_hub', targetId: 'essential_living', amount: partEssential, color: '#10b981' });
        }

        if (discretionaryLiving > 0) {
          nodes.push({
            id: 'discretionary_living',
            label: 'Household Discretionary Lifestyle',
            sublabel: 'Surplus leisure & travel budget',
            amount: discretionaryLiving,
            color: '#ec4899',
            category: 'allocation',
            column: 3,
            icon: Heart,
          });
          if (priDiscretionary > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'discretionary_living', amount: priDiscretionary, color: '#ec4899' });
          if (partDiscretionary > 0) links.push({ sourceId: 'part_net_hub', targetId: 'discretionary_living', amount: partDiscretionary, color: '#f472b6' });
        }

        return {
          isRetired: false,
          totalGross: totalGrossIncome,
          totalTaxes: totalTaxAndNI,
          totalNetIncome: priNetSpendableHubAmount + partNetSpendableHubAmount,
          totalAllocated: totalGrossIncome,
          nodes,
          links,
          metrics: {
            taxRateEffective: totalGrossIncome > 0 ? (totalTaxAndNI / totalGrossIncome) * 100 : 0,
            savingsRate: totalGrossIncome > 0 ? (totalSavingsInvested / totalGrossIncome) * 100 : 0,
            takeHomePay: priNetTakeHome + partNetTakeHome,
            pensionInflows: priPensionTotal + partPensionTotal,
            isaInflows: priIsaContribs + partIsaContribs,
            livingSpend: essentialLiving + discretionaryLiving,
            mortgageSpend: totalMortgageAlloc,
          },
        };
      }

      // Selected View Mode Values (Combined / Primary / Partner)
      let curSalary = totalSalary;
      let curEmprPension = priEmprPension + partEmprPension;
      let curIncomeTax = priIncomeTax + partIncomeTax;
      let curNI = priNI + partNI;
      let curPensionContribs = priPensionTotal + partPensionTotal;
      let curIsaContribs = priIsaContribs + partIsaContribs;
      let curCashGiaContribs = priCashGiaContribs + partCashGiaContribs;
      let curNetTakeHome = priNetTakeHome + partNetTakeHome;
      let curMortgageShare = mortgagePaymentAnnual;

      if (activeViewMode === 'primary') {
        curSalary = priSalary;
        curEmprPension = priEmprPension;
        curIncomeTax = priIncomeTax;
        curNI = priNI;
        curPensionContribs = priPensionTotal;
        curIsaContribs = priIsaContribs;
        curCashGiaContribs = priCashGiaContribs;
        curNetTakeHome = priNetTakeHome;
        curMortgageShare = isCouple && totalSalary > 0
          ? (priSalary / totalSalary) * mortgagePaymentAnnual
          : mortgagePaymentAnnual;
      } else if (activeViewMode === 'partner') {
        curSalary = partSalary;
        curEmprPension = partEmprPension;
        curIncomeTax = partIncomeTax;
        curNI = partNI;
        curPensionContribs = partPensionTotal;
        curIsaContribs = partIsaContribs;
        curCashGiaContribs = partCashGiaContribs;
        curNetTakeHome = partNetTakeHome;
        curMortgageShare = totalSalary > 0
          ? (partSalary / totalSalary) * mortgagePaymentAnnual
          : (mortgagePaymentAnnual * 0.5);
      }

      const totalGrossIncome = curSalary + curEmprPension;
      const totalTaxAndNI = curIncomeTax + curNI;
      const totalSavingsInvested = curPensionContribs + curIsaContribs + curCashGiaContribs;

      const mortgageAlloc = Math.min(curNetTakeHome, curMortgageShare);
      const remainingLifestyle = Math.max(0, curNetTakeHome - mortgageAlloc);

      const essentialLiving = Math.min(remainingLifestyle, inflatedEssentialTarget);
      const discretionaryLiving = Math.max(0, remainingLifestyle - essentialLiving);

      // Column 0: Gross Inflow Sources
      if (activeViewMode === 'combined') {
        if (priSalary > 0) {
          nodes.push({
            id: 'pri_salary',
            label: isCouple ? `${primaryName} Gross Salary` : 'Gross Employment Salary',
            sublabel: `PAYE Earnings (Age ${p.age})`,
            amount: priSalary,
            color: '#0284c7', // sky-600
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (partSalary > 0) {
          nodes.push({
            id: 'part_salary',
            label: `${partnerName} Gross Salary`,
            sublabel: `PAYE Earnings (Age ${partnerAge})`,
            amount: partSalary,
            color: '#38bdf8', // sky-400
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (curEmprPension > 0) {
          nodes.push({
            id: 'empr_pension_topup',
            label: 'Employer Pension Match',
            sublabel: isCouple ? 'Combined Employer Co-contributions' : 'Direct Employer Co-contribution',
            amount: curEmprPension,
            color: '#10b981', // emerald-500
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }
      } else {
        const ownerName = activeViewMode === 'primary' ? primaryName : partnerName;
        const currentPersonAge = activeViewMode === 'primary' ? p.age : partnerAge;

        if (curSalary > 0) {
          nodes.push({
            id: `${activeViewMode}_salary`,
            label: `${ownerName} Gross Salary`,
            sublabel: `PAYE Earnings (Age ${currentPersonAge})`,
            amount: curSalary,
            color: '#0284c7',
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (curEmprPension > 0) {
          nodes.push({
            id: `${activeViewMode}_empr_pension`,
            label: `${ownerName} Employer Match`,
            sublabel: 'Direct Employer Co-contribution',
            amount: curEmprPension,
            color: '#10b981',
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }
      }

      // Column 1: Intermediate Gross Hub
      const hubLabel = activeViewMode === 'combined'
        ? 'Total Gross Household Inflows'
        : `${activeViewMode === 'primary' ? primaryName : partnerName} Gross Inflows`;

      nodes.push({
        id: 'gross_hub',
        label: hubLabel,
        sublabel: activeViewMode === 'combined' ? 'Income & Employer Top-ups' : `Individual Gross Earnings & Match`,
        amount: totalGrossIncome,
        color: '#6366f1', // indigo-500
        category: 'hub',
        column: 1,
        icon: Coins,
      });

      // Links from Sources -> Gross Hub
      if (activeViewMode === 'combined') {
        if (priSalary > 0) links.push({ sourceId: 'pri_salary', targetId: 'gross_hub', amount: priSalary, color: '#0284c7' });
        if (partSalary > 0) links.push({ sourceId: 'part_salary', targetId: 'gross_hub', amount: partSalary, color: '#38bdf8' });
        if (curEmprPension > 0) links.push({ sourceId: 'empr_pension_topup', targetId: 'gross_hub', amount: curEmprPension, color: '#10b981' });
      } else {
        if (curSalary > 0) links.push({ sourceId: `${activeViewMode}_salary`, targetId: 'gross_hub', amount: curSalary, color: '#0284c7' });
        if (curEmprPension > 0) links.push({ sourceId: `${activeViewMode}_empr_pension`, targetId: 'gross_hub', amount: curEmprPension, color: '#10b981' });
      }

      // Column 2: Intermediate Split (Taxes vs Net Disposable vs Pension Pre-tax)
      if (curIncomeTax > 0) {
        nodes.push({
          id: 'income_tax',
          label: activeViewMode === 'combined' && isCouple ? 'HMRC Income Tax (Both)' : 'HMRC Income Tax',
          sublabel: `${((curIncomeTax / Math.max(1, totalGrossIncome)) * 100).toFixed(1)}% effective rate`,
          amount: curIncomeTax,
          color: '#ef4444', // red-500
          category: 'deduction',
          column: 2,
          icon: Receipt,
        });
        links.push({ sourceId: 'gross_hub', targetId: 'income_tax', amount: curIncomeTax, color: '#ef4444' });
      }

      if (curNI > 0) {
        nodes.push({
          id: 'ni_tax',
          label: 'National Insurance (Class 1)',
          sublabel: 'UK Social Security Contribution',
          amount: curNI,
          color: '#f97316', // orange-500
          category: 'deduction',
          column: 2,
          icon: Receipt,
        });
        links.push({ sourceId: 'gross_hub', targetId: 'ni_tax', amount: curNI, color: '#f97316' });
      }

      if (curPensionContribs > 0) {
        nodes.push({
          id: 'pension_savings',
          label: activeViewMode === 'combined' && isCouple ? 'Pension Contributions (Both)' : 'Pension Investments',
          sublabel: 'Workplace & SIPP Inflows',
          amount: curPensionContribs,
          color: '#10b981', // emerald-500
          category: 'allocation',
          column: 3,
          icon: PiggyBank,
        });
        links.push({ sourceId: 'gross_hub', targetId: 'pension_savings', amount: curPensionContribs, color: '#10b981' });
      }

      // Column 2 Hub: Net Disposable Pay
      nodes.push({
        id: 'net_pay_hub',
        label: activeViewMode === 'combined' ? 'Net Take-Home Cashflow' : `${activeViewMode === 'primary' ? primaryName : partnerName} Take-Home`,
        sublabel: 'After Tax & NI deductions',
        amount: curNetTakeHome + curIsaContribs + curCashGiaContribs,
        color: '#14b8a6', // teal-500
        category: 'hub',
        column: 2,
        icon: Wallet,
      });
      links.push({
        sourceId: 'gross_hub',
        targetId: 'net_pay_hub',
        amount: curNetTakeHome + curIsaContribs + curCashGiaContribs,
        color: '#14b8a6',
      });

      // Column 3: Final Outgoing Allocations
      if (curIsaContribs > 0) {
        nodes.push({
          id: 'isa_savings',
          label: 'ISA & LISA Contributions',
          sublabel: 'Stocks & Shares, Cash ISA, LISA',
          amount: curIsaContribs,
          color: '#8b5cf6', // purple-500
          category: 'allocation',
          column: 3,
          icon: TrendingUp,
        });
        links.push({ sourceId: 'net_pay_hub', targetId: 'isa_savings', amount: curIsaContribs, color: '#8b5cf6' });
      }

      if (curCashGiaContribs > 0) {
        nodes.push({
          id: 'cash_gia_savings',
          label: 'GIA & Cash Savings',
          sublabel: 'High-Yield Cash & General Account',
          amount: curCashGiaContribs,
          color: '#f59e0b', // amber-500
          category: 'allocation',
          column: 3,
          icon: Coins,
        });
        links.push({ sourceId: 'net_pay_hub', targetId: 'cash_gia_savings', amount: curCashGiaContribs, color: '#f59e0b' });
      }

      if (mortgageAlloc > 0) {
        nodes.push({
          id: 'mortgage_pay',
          label: isCouple && activeViewMode !== 'combined' ? 'Mortgage Share Repayment' : 'Mortgage Repayment',
          sublabel: 'Capital & Interest Debt Clearance',
          amount: mortgageAlloc,
          color: '#0ea5e9', // sky-500
          category: 'allocation',
          column: 3,
          icon: Home,
        });
        links.push({ sourceId: 'net_pay_hub', targetId: 'mortgage_pay', amount: mortgageAlloc, color: '#0ea5e9' });
      }

      if (essentialLiving > 0) {
        const isFloorMet = remainingLifestyle >= inflatedEssentialTarget;
        nodes.push({
          id: 'essential_living',
          label: isCouple && activeViewMode !== 'combined' ? 'Essential Living Share' : 'Essential Living Floor',
          sublabel: `Target: ${formatGBP(inflatedEssentialTarget)} (${isFloorMet ? '100% Met' : `${Math.round((remainingLifestyle / Math.max(1, inflatedEssentialTarget)) * 100)}% Met`})`,
          amount: essentialLiving,
          color: '#059669', // emerald-600
          category: 'allocation',
          column: 3,
          icon: ShieldCheck,
        });
        links.push({ sourceId: 'net_pay_hub', targetId: 'essential_living', amount: essentialLiving, color: '#059669' });
      }

      if (discretionaryLiving > 0) {
        nodes.push({
          id: 'discretionary_living',
          label: isCouple && activeViewMode !== 'combined' ? 'Discretionary Lifestyle Share' : 'Discretionary Lifestyle',
          sublabel: `Surplus above essential floor (leisure, travel)`,
          amount: discretionaryLiving,
          color: '#ec4899', // pink-500
          category: 'allocation',
          column: 3,
          icon: Heart,
        });
        links.push({ sourceId: 'net_pay_hub', targetId: 'discretionary_living', amount: discretionaryLiving, color: '#ec4899' });
      }

      return {
        isRetired: false,
        totalGross: totalGrossIncome,
        totalTaxes: totalTaxAndNI,
        totalNetIncome: curNetTakeHome + curIsaContribs + curCashGiaContribs,
        totalAllocated: totalGrossIncome,
        nodes,
        links,
        metrics: {
          taxRateEffective: totalGrossIncome > 0 ? (totalTaxAndNI / totalGrossIncome) * 100 : 0,
          savingsRate: totalGrossIncome > 0 ? (totalSavingsInvested / totalGrossIncome) * 100 : 0,
          takeHomePay: curNetTakeHome,
          pensionInflows: curPensionContribs,
          isaInflows: curIsaContribs,
          livingSpend: essentialLiving + discretionaryLiving,
          mortgageSpend: mortgageAlloc,
        },
      };
    } else {
      // ==========================================
      // DECUMULATION PHASE CASH FLOW (RETIREMENT DRAWDOWN)
      // ==========================================
      const isIndividualShare = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
      const effectiveEssentialFloor = isIndividualShare ? combinedEssentialFloor / 2 : combinedEssentialFloor;
      const inflatedEssentialTarget = adjustInflation ? effectiveEssentialFloor : (effectiveEssentialFloor * inflationFactor);

      // Primary components
      const priStatePension = p.primaryStatePensionReceived ?? p.statePensionReceived ?? 0;
      const priDbPension = p.primaryDbPensionIncomeReceived ?? p.dbPensionIncomeReceived ?? 0;
      const priAnnuity = p.primaryAnnuityIncomeReceived ?? p.annuityIncomeReceived ?? 0;
      const priTaxableFixed = p.primaryTaxableFixedIncomeReceived ?? (isCouple ? ((p.taxableFixedIncomeReceived || 0) * 0.5) : (p.taxableFixedIncomeReceived || 0));
      const priTaxFreeFixed = p.primaryTaxFreeFixedIncomeReceived ?? (isCouple ? ((p.taxFreeFixedIncomeReceived || 0) * 0.5) : (p.taxFreeFixedIncomeReceived || 0));
      const priPensionDrawdownTaxable = p.primaryPensionDrawdownTaxable ?? (isCouple ? ((p.pensionDrawdownTaxable || 0) * 0.5) : (p.pensionDrawdownTaxable || 0));
      const priPensionDrawdownTaxFree = p.primaryPensionDrawdownTaxFree ?? (isCouple ? ((p.pensionDrawdownTaxFree || 0) * 0.5) : (p.pensionDrawdownTaxFree || 0));
      const priPensionDrawdownTotal = p.primaryPensionDrawdown ?? (priPensionDrawdownTaxable + priPensionDrawdownTaxFree);
      const priIsaDrawdown = p.primaryIsaDrawdown ?? (isCouple ? ((p.isaDrawdown || 0) * 0.5) : (p.isaDrawdown || 0));
      const priCashDrawdown = p.primaryCashDrawdown ?? (isCouple ? ((p.cashDrawdown || 0) * 0.5) : (p.cashDrawdown || 0));
      const priLifeEventsInc = p.lifeEventsIncome || 0;
      const priTaxPaid = p.primaryTaxPaid ?? (isCouple ? ((p.totalTaxPaid || 0) * 0.5) : (p.totalTaxPaid || 0));

      const priGrossTotal =
        priStatePension +
        priDbPension +
        priAnnuity +
        priTaxableFixed +
        priTaxFreeFixed +
        priLifeEventsInc +
        priPensionDrawdownTotal +
        priIsaDrawdown +
        priCashDrawdown;
      const priNetTotal = Math.max(0, priGrossTotal - priTaxPaid);

      // Partner components
      const partStatePension = isCouple ? (p.partnerStatePensionReceived || 0) : 0;
      const partDbPension = isCouple ? (p.partnerDbPensionIncomeReceived || 0) : 0;
      const partAnnuity = isCouple ? (p.partnerAnnuityIncomeReceived || 0) : 0;
      const partTaxableFixed = isCouple ? (p.partnerTaxableFixedIncomeReceived || 0) : 0;
      const partTaxFreeFixed = isCouple ? (p.partnerTaxFreeFixedIncomeReceived || 0) : 0;
      const partPensionDrawdownTaxable = isCouple ? (p.partnerPensionDrawdownTaxable || 0) : 0;
      const partPensionDrawdownTaxFree = isCouple ? (p.partnerPensionDrawdownTaxFree || 0) : 0;
      const partPensionDrawdownTotal = isCouple ? (p.partnerPensionDrawdown ?? (partPensionDrawdownTaxable + partPensionDrawdownTaxFree)) : 0;
      const partIsaDrawdown = isCouple ? (p.partnerIsaDrawdown || 0) : 0;
      const partCashDrawdown = isCouple ? (p.partnerCashDrawdown || 0) : 0;
      const partLifeEventsInc = 0;
      const partTaxPaid = isCouple ? (p.partnerTaxPaid || 0) : 0;

      const partGrossTotal =
        partStatePension +
        partDbPension +
        partAnnuity +
        partTaxableFixed +
        partTaxFreeFixed +
        partLifeEventsInc +
        partPensionDrawdownTotal +
        partIsaDrawdown +
        partCashDrawdown;
      const partNetTotal = Math.max(0, partGrossTotal - partTaxPaid);

      const nodes: FlowNode[] = [];
      const links: FlowLink[] = [];

      if (activeViewMode === 'split' && isCouple) {
        // ====================================================
        // SPLIT VIEW MODE: COMBINED RETIREMENT SPLIT BY PERSON
        // ====================================================
        const totalGrossRetire = priGrossTotal + partGrossTotal;
        const totalTaxPaid = priTaxPaid + partTaxPaid;
        const totalNetRetire = priNetTotal + partNetTotal;

        // Mortgage split
        const priMortgageShare = mortgagePaymentAnnual * 0.5;
        const partMortgageShare = mortgagePaymentAnnual * 0.5;
        const priMortgageAlloc = Math.min(priNetTotal, priMortgageShare);
        const partMortgageAlloc = Math.min(partNetTotal, partMortgageShare);
        const totalMortgageAlloc = priMortgageAlloc + partMortgageAlloc;

        const priSpendable = Math.max(0, priNetTotal - priMortgageAlloc);
        const partSpendable = Math.max(0, partNetTotal - partMortgageAlloc);
        const totalSpendable = priSpendable + partSpendable;

        const annualExcess = p.annualIncomeExcess || 0;
        const reinvestSurplus = Math.min(totalSpendable, annualExcess);
        const priReinvest = totalSpendable > 0 ? (priSpendable / totalSpendable) * reinvestSurplus : 0;
        const partReinvest = totalSpendable > 0 ? (partSpendable / totalSpendable) * reinvestSurplus : 0;

        const availableLiving = Math.max(0, totalSpendable - reinvestSurplus);
        const essentialLiving = Math.min(availableLiving, inflatedEssentialTarget);
        const priEssential = availableLiving > 0 ? (priSpendable / totalSpendable) * essentialLiving : 0;
        const partEssential = availableLiving > 0 ? (partSpendable / totalSpendable) * essentialLiving : 0;

        const discretionaryLiving = Math.max(0, availableLiving - essentialLiving);
        const priDiscretionary = availableLiving > 0 ? (priSpendable / totalSpendable) * discretionaryLiving : 0;
        const partDiscretionary = availableLiving > 0 ? (partSpendable / totalSpendable) * discretionaryLiving : 0;

        // Column 0: Primary Retirement Sources
        if (priStatePension > 0) {
          nodes.push({
            id: 'pri_state_pension',
            label: `${primaryName} State Pension`,
            sublabel: 'CPI Triple-Lock',
            amount: priStatePension,
            color: '#8b5cf6',
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (priDbPension > 0) {
          nodes.push({
            id: 'pri_db_pension',
            label: `${primaryName} DB Pension`,
            sublabel: 'Guaranteed DB Scheme',
            amount: priDbPension,
            color: '#0284c7',
            category: 'source',
            column: 0,
            icon: ShieldCheck,
          });
        }
        if (priAnnuity > 0) {
          nodes.push({
            id: 'pri_annuity',
            label: `${primaryName} Annuity`,
            sublabel: 'Lifetime Annuity Income',
            amount: priAnnuity,
            color: '#ec4899',
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }
        if (priTaxableFixed + priTaxFreeFixed > 0) {
          nodes.push({
            id: 'pri_fixed',
            label: `${primaryName} Fixed Income`,
            sublabel: 'Other Fixed Incomes',
            amount: priTaxableFixed + priTaxFreeFixed,
            color: '#0d9488',
            category: 'source',
            column: 0,
            icon: Coins,
          });
        }
        if (priPensionDrawdownTotal > 0) {
          nodes.push({
            id: 'pri_pension_dd',
            label: `${primaryName} Pension Drawdown`,
            sublabel: `Taxable: ${formatGBP(priPensionDrawdownTaxable)} | Free: ${formatGBP(priPensionDrawdownTaxFree)}`,
            amount: priPensionDrawdownTotal,
            color: '#10b981',
            category: 'source',
            column: 0,
            icon: PiggyBank,
          });
        }
        if (priIsaDrawdown > 0) {
          nodes.push({
            id: 'pri_isa_dd',
            label: `${primaryName} ISA Drawdown`,
            sublabel: 'Tax-Free ISA Pot',
            amount: priIsaDrawdown,
            color: '#6366f1',
            category: 'source',
            column: 0,
            icon: TrendingUp,
          });
        }
        if (priCashDrawdown > 0) {
          nodes.push({
            id: 'pri_cash_dd',
            label: `${primaryName} Cash Drawdown`,
            sublabel: 'Cash & GIA Capital',
            amount: priCashDrawdown,
            color: '#f59e0b',
            category: 'source',
            column: 0,
            icon: Wallet,
          });
        }
        if (priLifeEventsInc > 0) {
          nodes.push({
            id: 'pri_life_events',
            label: `${primaryName} Life Event`,
            sublabel: p.decumulationLifeEventsSummary || 'Downsizing / Lump Sum',
            amount: priLifeEventsInc,
            color: '#06b6d4',
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }

        // Column 0: Partner Retirement Sources
        if (partStatePension > 0) {
          nodes.push({
            id: 'part_state_pension',
            label: `${partnerName} State Pension`,
            sublabel: 'CPI Triple-Lock',
            amount: partStatePension,
            color: '#a855f7',
            category: 'source',
            column: 0,
            icon: Building,
          });
        }
        if (partDbPension > 0) {
          nodes.push({
            id: 'part_db_pension',
            label: `${partnerName} DB Pension`,
            sublabel: 'Guaranteed DB Scheme',
            amount: partDbPension,
            color: '#38bdf8',
            category: 'source',
            column: 0,
            icon: ShieldCheck,
          });
        }
        if (partAnnuity > 0) {
          nodes.push({
            id: 'part_annuity',
            label: `${partnerName} Annuity`,
            sublabel: 'Lifetime Annuity Income',
            amount: partAnnuity,
            color: '#f472b6',
            category: 'source',
            column: 0,
            icon: Sparkles,
          });
        }
        if (partTaxableFixed + partTaxFreeFixed > 0) {
          nodes.push({
            id: 'part_fixed',
            label: `${partnerName} Fixed Income`,
            sublabel: 'Other Fixed Incomes',
            amount: partTaxableFixed + partTaxFreeFixed,
            color: '#2dd4bf',
            category: 'source',
            column: 0,
            icon: Coins,
          });
        }
        if (partPensionDrawdownTotal > 0) {
          nodes.push({
            id: 'part_pension_dd',
            label: `${partnerName} Pension Drawdown`,
            sublabel: `Taxable: ${formatGBP(partPensionDrawdownTaxable)} | Free: ${formatGBP(partPensionDrawdownTaxFree)}`,
            amount: partPensionDrawdownTotal,
            color: '#34d399',
            category: 'source',
            column: 0,
            icon: PiggyBank,
          });
        }
        if (partIsaDrawdown > 0) {
          nodes.push({
            id: 'part_isa_dd',
            label: `${partnerName} ISA Drawdown`,
            sublabel: 'Tax-Free ISA Pot',
            amount: partIsaDrawdown,
            color: '#818cf8',
            category: 'source',
            column: 0,
            icon: TrendingUp,
          });
        }
        if (partCashDrawdown > 0) {
          nodes.push({
            id: 'part_cash_dd',
            label: `${partnerName} Cash Drawdown`,
            sublabel: 'Cash & GIA Capital',
            amount: partCashDrawdown,
            color: '#fbbf24',
            category: 'source',
            column: 0,
            icon: Wallet,
          });
        }

        // Column 1: Gross Inflow Hubs (Split by person)
        nodes.push({
          id: 'pri_retire_hub',
          label: `${primaryName} Gross Inflows`,
          sublabel: `Total Inflows (Age ${p.age})`,
          amount: priGrossTotal,
          color: '#3b82f6',
          category: 'hub',
          column: 1,
          icon: Coins,
        });
        if (priStatePension > 0) links.push({ sourceId: 'pri_state_pension', targetId: 'pri_retire_hub', amount: priStatePension, color: '#8b5cf6' });
        if (priDbPension > 0) links.push({ sourceId: 'pri_db_pension', targetId: 'pri_retire_hub', amount: priDbPension, color: '#0284c7' });
        if (priAnnuity > 0) links.push({ sourceId: 'pri_annuity', targetId: 'pri_retire_hub', amount: priAnnuity, color: '#ec4899' });
        if (priTaxableFixed + priTaxFreeFixed > 0) links.push({ sourceId: 'pri_fixed', targetId: 'pri_retire_hub', amount: priTaxableFixed + priTaxFreeFixed, color: '#0d9488' });
        if (priPensionDrawdownTotal > 0) links.push({ sourceId: 'pri_pension_dd', targetId: 'pri_retire_hub', amount: priPensionDrawdownTotal, color: '#10b981' });
        if (priIsaDrawdown > 0) links.push({ sourceId: 'pri_isa_dd', targetId: 'pri_retire_hub', amount: priIsaDrawdown, color: '#6366f1' });
        if (priCashDrawdown > 0) links.push({ sourceId: 'pri_cash_dd', targetId: 'pri_retire_hub', amount: priCashDrawdown, color: '#f59e0b' });
        if (priLifeEventsInc > 0) links.push({ sourceId: 'pri_life_events', targetId: 'pri_retire_hub', amount: priLifeEventsInc, color: '#06b6d4' });

        nodes.push({
          id: 'part_retire_hub',
          label: `${partnerName} Gross Inflows`,
          sublabel: `Total Inflows (Age ${partnerAge})`,
          amount: partGrossTotal,
          color: '#6366f1',
          category: 'hub',
          column: 1,
          icon: Coins,
        });
        if (partStatePension > 0) links.push({ sourceId: 'part_state_pension', targetId: 'part_retire_hub', amount: partStatePension, color: '#a855f7' });
        if (partDbPension > 0) links.push({ sourceId: 'part_db_pension', targetId: 'part_retire_hub', amount: partDbPension, color: '#38bdf8' });
        if (partAnnuity > 0) links.push({ sourceId: 'part_annuity', targetId: 'part_retire_hub', amount: partAnnuity, color: '#f472b6' });
        if (partTaxableFixed + partTaxFreeFixed > 0) links.push({ sourceId: 'part_fixed', targetId: 'part_retire_hub', amount: partTaxableFixed + partTaxFreeFixed, color: '#2dd4bf' });
        if (partPensionDrawdownTotal > 0) links.push({ sourceId: 'part_pension_dd', targetId: 'part_retire_hub', amount: partPensionDrawdownTotal, color: '#34d399' });
        if (partIsaDrawdown > 0) links.push({ sourceId: 'part_isa_dd', targetId: 'part_retire_hub', amount: partIsaDrawdown, color: '#818cf8' });
        if (partCashDrawdown > 0) links.push({ sourceId: 'part_cash_dd', targetId: 'part_retire_hub', amount: partCashDrawdown, color: '#fbbf24' });

        // Column 2: Tax Deductions & Spendable Hubs (Split by person)
        if (priTaxPaid > 0) {
          nodes.push({
            id: 'pri_income_tax_decum',
            label: `${primaryName} HMRC Tax`,
            sublabel: `${((priTaxPaid / Math.max(1, priGrossTotal)) * 100).toFixed(1)}% tax rate`,
            amount: priTaxPaid,
            color: '#ef4444',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'pri_retire_hub', targetId: 'pri_income_tax_decum', amount: priTaxPaid, color: '#ef4444' });
        }
        nodes.push({
          id: 'pri_net_spendable',
          label: `${primaryName} Net Spendable`,
          sublabel: 'Post-tax retirement cash',
          amount: priNetTotal,
          color: '#10b981',
          category: 'hub',
          column: 2,
          icon: Wallet,
        });
        links.push({ sourceId: 'pri_retire_hub', targetId: 'pri_net_spendable', amount: priNetTotal, color: '#10b981' });

        if (partTaxPaid > 0) {
          nodes.push({
            id: 'part_income_tax_decum',
            label: `${partnerName} HMRC Tax`,
            sublabel: `${((partTaxPaid / Math.max(1, partGrossTotal)) * 100).toFixed(1)}% tax rate`,
            amount: partTaxPaid,
            color: '#f43f5e',
            category: 'deduction',
            column: 2,
            icon: Receipt,
          });
          links.push({ sourceId: 'part_retire_hub', targetId: 'part_income_tax_decum', amount: partTaxPaid, color: '#f43f5e' });
        }
        nodes.push({
          id: 'part_net_spendable',
          label: `${partnerName} Net Spendable`,
          sublabel: 'Post-tax retirement cash',
          amount: partNetTotal,
          color: '#06b6d4',
          category: 'hub',
          column: 2,
          icon: Wallet,
        });
        links.push({ sourceId: 'part_retire_hub', targetId: 'part_net_spendable', amount: partNetTotal, color: '#06b6d4' });

        // Column 3: Outgoing Allocations
        if (totalMortgageAlloc > 0) {
          nodes.push({
            id: 'retirement_mortgage',
            label: 'Ongoing Mortgage Payment',
            sublabel: 'Active mortgage term in retirement',
            amount: totalMortgageAlloc,
            color: '#0ea5e9',
            category: 'allocation',
            column: 3,
            icon: Home,
          });
          if (priMortgageAlloc > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'retirement_mortgage', amount: priMortgageAlloc, color: '#0ea5e9' });
          if (partMortgageAlloc > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'retirement_mortgage', amount: partMortgageAlloc, color: '#38bdf8' });
        }

        if (essentialLiving > 0) {
          const isFloorMet = totalSpendable >= inflatedEssentialTarget;
          nodes.push({
            id: 'essential_retirement_spend',
            label: 'Household Essential Floor',
            sublabel: `Target: ${formatGBP(inflatedEssentialTarget)} (${isFloorMet ? '100% Covered' : `${Math.round((totalSpendable / Math.max(1, inflatedEssentialTarget)) * 100)}% Covered`})`,
            amount: essentialLiving,
            color: '#059669',
            category: 'allocation',
            column: 3,
            icon: ShieldCheck,
          });
          if (priEssential > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'essential_retirement_spend', amount: priEssential, color: '#059669' });
          if (partEssential > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'essential_retirement_spend', amount: partEssential, color: '#10b981' });
        }

        if (discretionaryLiving > 0) {
          nodes.push({
            id: 'discretionary_retirement_spend',
            label: 'Household Discretionary Spend',
            sublabel: 'Leisure, dining, travel & gifting',
            amount: discretionaryLiving,
            color: '#ec4899',
            category: 'allocation',
            column: 3,
            icon: Heart,
          });
          if (priDiscretionary > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'discretionary_retirement_spend', amount: priDiscretionary, color: '#ec4899' });
          if (partDiscretionary > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'discretionary_retirement_spend', amount: partDiscretionary, color: '#f472b6' });
        }

        if (reinvestSurplus > 0) {
          nodes.push({
            id: 'reinvested_surplus',
            label: 'Re-invested Drawdown Surplus',
            sublabel: 'Surplus re-allocated to ISA / GIA portfolio',
            amount: reinvestSurplus,
            color: '#a855f7',
            category: 'allocation',
            column: 3,
            icon: TrendingUp,
          });
          if (priReinvest > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'reinvested_surplus', amount: priReinvest, color: '#a855f7' });
          if (partReinvest > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'reinvested_surplus', amount: partReinvest, color: '#c084fc' });
        }

        return {
          isRetired: true,
          totalGross: totalGrossRetire,
          totalTaxes: totalTaxPaid,
          totalNetIncome: totalNetRetire,
          totalAllocated: totalGrossRetire,
          nodes,
          links,
          metrics: {
            taxRateEffective: totalGrossRetire > 0 ? (totalTaxPaid / totalGrossRetire) * 100 : 0,
            guaranteedFloor: priStatePension + priDbPension + priAnnuity + partStatePension + partDbPension + partAnnuity,
            portfolioDrawdown: priPensionDrawdownTotal + priIsaDrawdown + priCashDrawdown + partPensionDrawdownTotal + partIsaDrawdown + partCashDrawdown,
            netIncome: totalNetRetire,
            essentialSpend: essentialLiving,
            discretionarySpend: discretionaryLiving,
            reinvestedExcess: reinvestSurplus,
            mortgageSpend: totalMortgageAlloc,
            shortfall: p.incomeShortfall || 0,
          },
        };
      }

      // Default: Combined / Primary / Partner
      let statePension = (p.statePensionReceived || 0);
      let dbPension = (p.dbPensionIncomeReceived || 0);
      let annuity = (p.annuityIncomeReceived || 0);
      let taxableFixed = (p.taxableFixedIncomeReceived || 0);
      let taxFreeFixed = (p.taxFreeFixedIncomeReceived || 0);
      let lifeEventsInc = (p.lifeEventsIncome || 0);

      let pensionDrawdownTaxable = (p.pensionDrawdownTaxable || 0);
      let pensionDrawdownTaxFree = (p.pensionDrawdownTaxFree || 0);
      let pensionDrawdownTotal = (p.pensionDrawdown ?? (pensionDrawdownTaxable + pensionDrawdownTaxFree));

      let isaDrawdown = (p.isaDrawdown || 0);
      let cashDrawdown = (p.cashDrawdown || 0);
      let totalTaxPaid = (p.totalTaxPaid || p.taxOnWithdrawal || 0);
      let curMortgageShare = mortgagePaymentAnnual;

      if (activeViewMode === 'primary') {
        statePension = priStatePension;
        dbPension = priDbPension;
        annuity = priAnnuity;
        taxableFixed = priTaxableFixed;
        taxFreeFixed = priTaxFreeFixed;
        pensionDrawdownTaxable = priPensionDrawdownTaxable;
        pensionDrawdownTaxFree = priPensionDrawdownTaxFree;
        pensionDrawdownTotal = priPensionDrawdownTotal;
        isaDrawdown = priIsaDrawdown;
        cashDrawdown = priCashDrawdown;
        lifeEventsInc = priLifeEventsInc;
        totalTaxPaid = priTaxPaid;
        curMortgageShare = isCouple ? mortgagePaymentAnnual * 0.5 : mortgagePaymentAnnual;
      } else if (activeViewMode === 'partner') {
        statePension = partStatePension;
        dbPension = partDbPension;
        annuity = partAnnuity;
        taxableFixed = partTaxableFixed;
        taxFreeFixed = partTaxFreeFixed;
        pensionDrawdownTaxable = partPensionDrawdownTaxable;
        pensionDrawdownTaxFree = partPensionDrawdownTaxFree;
        pensionDrawdownTotal = partPensionDrawdownTotal;
        isaDrawdown = partIsaDrawdown;
        cashDrawdown = partCashDrawdown;
        lifeEventsInc = 0;
        totalTaxPaid = partTaxPaid;
        curMortgageShare = mortgagePaymentAnnual * 0.5;
      }

      const totalGrossRetirementInflows =
        statePension +
        dbPension +
        annuity +
        taxableFixed +
        taxFreeFixed +
        lifeEventsInc +
        pensionDrawdownTotal +
        isaDrawdown +
        cashDrawdown;

      const netRetirementIncome = Math.max(0, totalGrossRetirementInflows - totalTaxPaid);

      // Allocation of net retirement cash
      const annualExcess = activeViewMode === 'combined'
        ? (p.annualIncomeExcess || 0)
        : (isCouple ? ((p.annualIncomeExcess || 0) * 0.5) : (p.annualIncomeExcess || 0));
      const shortfall = activeViewMode === 'combined'
        ? (p.incomeShortfall || 0)
        : (isCouple ? ((p.incomeShortfall || 0) * 0.5) : (p.incomeShortfall || 0));

      // Deduct mortgage if still active in retirement
      const mortgageAlloc = Math.min(netRetirementIncome, curMortgageShare);
      const spendableAfterMortgage = Math.max(0, netRetirementIncome - mortgageAlloc);

      let reinvestSurplus = annualExcess;
      let availableForLiving = Math.max(0, spendableAfterMortgage - reinvestSurplus);

      if (availableForLiving <= 0 && spendableAfterMortgage > 0) {
        availableForLiving = spendableAfterMortgage;
        reinvestSurplus = 0;
      }

      const essentialLiving = Math.min(availableForLiving, inflatedEssentialTarget);
      const discretionaryLiving = Math.max(0, availableForLiving - essentialLiving);

      const currentPersonName = activeViewMode === 'primary' ? primaryName : activeViewMode === 'partner' ? partnerName : 'Household';

      // Column 0: Gross Retirement Inflows
      if (statePension > 0) {
        nodes.push({
          id: 'state_pension',
          label: isCouple && activeViewMode === 'combined'
            ? 'State Pension (Household)'
            : activeViewMode === 'partner'
            ? `${partnerName} State Pension`
            : isCouple ? `${primaryName} State Pension` : 'UK State Pension',
          sublabel: 'CPI Triple-Lock Guaranteed',
          amount: statePension,
          color: '#8b5cf6', // purple-500
          category: 'source',
          column: 0,
          icon: Building,
        });
      }

      if (dbPension > 0) {
        nodes.push({
          id: 'db_pension',
          label: activeViewMode !== 'combined' ? `${currentPersonName} DB Pension` : 'Defined Benefit (DB) Pension',
          sublabel: 'Final/Average Salary Scheme',
          amount: dbPension,
          color: '#0284c7', // sky-600
          category: 'source',
          column: 0,
          icon: ShieldCheck,
        });
      }

      if (annuity > 0) {
        nodes.push({
          id: 'annuity_income',
          label: activeViewMode !== 'combined' ? `${currentPersonName} Annuity` : 'Lifetime Annuity Income',
          sublabel: 'Guaranteed Lifetime Floor',
          amount: annuity,
          color: '#ec4899', // pink-500
          category: 'source',
          column: 0,
          icon: Sparkles,
        });
      }

      if (taxableFixed + taxFreeFixed > 0) {
        nodes.push({
          id: 'fixed_other_income',
          label: activeViewMode !== 'combined' ? `${currentPersonName} Fixed Incomes` : 'Other Fixed Incomes',
          sublabel: 'Property, PIP, Royalties, etc.',
          amount: taxableFixed + taxFreeFixed,
          color: '#0d9488', // teal-600
          category: 'source',
          column: 0,
          icon: Coins,
        });
      }

      if (pensionDrawdownTotal > 0) {
        nodes.push({
          id: 'pension_drawdown',
          label: activeViewMode !== 'combined' ? `${currentPersonName} Pension Drawdown` : 'Private Pension / SIPP Drawdown',
          sublabel: `Taxable: ${formatGBP(pensionDrawdownTaxable)} | Tax-Free: ${formatGBP(pensionDrawdownTaxFree)}`,
          amount: pensionDrawdownTotal,
          color: '#10b981', // emerald-500
          category: 'source',
          column: 0,
          icon: PiggyBank,
        });
      }

      if (isaDrawdown > 0) {
        nodes.push({
          id: 'isa_drawdown',
          label: activeViewMode !== 'combined' ? `${currentPersonName} ISA Drawdown` : 'Tax-Free ISA Drawdown',
          sublabel: 'Stocks & Shares / Cash ISA',
          amount: isaDrawdown,
          color: '#6366f1', // indigo-500
          category: 'source',
          column: 0,
          icon: TrendingUp,
        });
      }

      if (cashDrawdown > 0) {
        nodes.push({
          id: 'cash_drawdown',
          label: activeViewMode !== 'combined' ? `${currentPersonName} Cash/GIA Drawdown` : 'Cash & GIA Capital Drawdown',
          sublabel: 'Cash Buffer & Unsheltered Pot',
          amount: cashDrawdown,
          color: '#f59e0b', // amber-500
          category: 'source',
          column: 0,
          icon: Wallet,
        });
      }

      if (lifeEventsInc > 0) {
        nodes.push({
          id: 'life_events_inflow',
          label: 'Decumulation Life Event Inflow',
          sublabel: p.decumulationLifeEventsSummary || 'Property Downsizing / Inheritance',
          amount: lifeEventsInc,
          color: '#06b6d4', // cyan-500
          category: 'source',
          column: 0,
          icon: Sparkles,
        });
      }

      // Column 1: Gross Inflows Hub
      const hubRetireLabel = activeViewMode === 'combined'
        ? 'Total Gross Income & Drawdowns'
        : `${currentPersonName} Gross Inflows & Drawdowns`;

      nodes.push({
        id: 'gross_retirement_hub',
        label: hubRetireLabel,
        sublabel: activeViewMode === 'partner' ? `Total Inflows for Age ${partnerAge}` : `Total Inflows for Age ${p.age}`,
        amount: totalGrossRetirementInflows,
        color: '#3b82f6', // blue-500
        category: 'hub',
        column: 1,
        icon: Coins,
      });

      // Links 0 -> 1
      if (statePension > 0) links.push({ sourceId: 'state_pension', targetId: 'gross_retirement_hub', amount: statePension, color: '#8b5cf6' });
      if (dbPension > 0) links.push({ sourceId: 'db_pension', targetId: 'gross_retirement_hub', amount: dbPension, color: '#0284c7' });
      if (annuity > 0) links.push({ sourceId: 'annuity_income', targetId: 'gross_retirement_hub', amount: annuity, color: '#ec4899' });
      if (taxableFixed + taxFreeFixed > 0) links.push({ sourceId: 'fixed_other_income', targetId: 'gross_retirement_hub', amount: taxableFixed + taxFreeFixed, color: '#0d9488' });
      if (pensionDrawdownTotal > 0) links.push({ sourceId: 'pension_drawdown', targetId: 'gross_retirement_hub', amount: pensionDrawdownTotal, color: '#10b981' });
      if (isaDrawdown > 0) links.push({ sourceId: 'isa_drawdown', targetId: 'gross_retirement_hub', amount: isaDrawdown, color: '#6366f1' });
      if (cashDrawdown > 0) links.push({ sourceId: 'cash_drawdown', targetId: 'gross_retirement_hub', amount: cashDrawdown, color: '#f59e0b' });
      if (lifeEventsInc > 0) links.push({ sourceId: 'life_events_inflow', targetId: 'gross_retirement_hub', amount: lifeEventsInc, color: '#06b6d4' });

      // Column 2: Tax Deductions vs Net Cash
      if (totalTaxPaid > 0) {
        nodes.push({
          id: 'hmrc_income_tax_decum',
          label: activeViewMode === 'combined' && isCouple ? 'HMRC Income Tax (Both)' : 'HMRC Income Tax Liability',
          sublabel: `${((totalTaxPaid / Math.max(1, totalGrossRetirementInflows)) * 100).toFixed(1)}% effective tax`,
          amount: totalTaxPaid,
          color: '#ef4444', // red-500
          category: 'deduction',
          column: 2,
          icon: Receipt,
        });
        links.push({ sourceId: 'gross_retirement_hub', targetId: 'hmrc_income_tax_decum', amount: totalTaxPaid, color: '#ef4444' });
      }

      nodes.push({
        id: 'net_spendable_hub',
        label: activeViewMode === 'combined' ? 'Net Spendable Retirement Cash' : `${currentPersonName} Net Spendable Cash`,
        sublabel: 'Available after all UK tax obligations',
        amount: netRetirementIncome,
        color: '#10b981', // emerald-500
        category: 'hub',
        column: 2,
        icon: Wallet,
      });
      links.push({ sourceId: 'gross_retirement_hub', targetId: 'net_spendable_hub', amount: netRetirementIncome, color: '#10b981' });

      // Column 3: Final Outgoing Allocations
      if (mortgageAlloc > 0) {
        nodes.push({
          id: 'retirement_mortgage',
          label: isCouple && activeViewMode !== 'combined' ? 'Mortgage Share Payment' : 'Ongoing Mortgage Payment',
          sublabel: 'Active mortgage term in retirement',
          amount: mortgageAlloc,
          color: '#0ea5e9', // sky-500
          category: 'allocation',
          column: 3,
          icon: Home,
        });
        links.push({ sourceId: 'net_spendable_hub', targetId: 'retirement_mortgage', amount: mortgageAlloc, color: '#0ea5e9' });
      }

      if (essentialLiving > 0) {
        const isFloorMet = availableForLiving >= inflatedEssentialTarget;
        nodes.push({
          id: 'essential_retirement_spend',
          label: isCouple && activeViewMode !== 'combined' ? 'Essential Living Share' : 'Essential Living Floor',
          sublabel: `Target: ${formatGBP(inflatedEssentialTarget)} (${isFloorMet ? '100% Covered' : `${Math.round((availableForLiving / Math.max(1, inflatedEssentialTarget)) * 100)}% Covered`})`,
          amount: essentialLiving,
          color: '#059669', // emerald-600
          category: 'allocation',
          column: 3,
          icon: ShieldCheck,
        });
        links.push({ sourceId: 'net_spendable_hub', targetId: 'essential_retirement_spend', amount: essentialLiving, color: '#059669' });
      }

      if (discretionaryLiving > 0) {
        nodes.push({
          id: 'discretionary_retirement_spend',
          label: isCouple && activeViewMode !== 'combined' ? 'Discretionary Lifestyle Share' : 'Discretionary Lifestyle Spend',
          sublabel: `Surplus for leisure, dining, travel & gifts`,
          amount: discretionaryLiving,
          color: '#ec4899', // pink-500
          category: 'allocation',
          column: 3,
          icon: Heart,
        });
        links.push({ sourceId: 'net_spendable_hub', targetId: 'discretionary_retirement_spend', amount: discretionaryLiving, color: '#ec4899' });
      }

      if (reinvestSurplus > 0) {
        nodes.push({
          id: 'reinvested_surplus',
          label: 'Re-invested Drawdown Surplus',
          sublabel: 'Surplus re-allocated to ISA / GIA portfolio',
          amount: reinvestSurplus,
          color: '#a855f7', // purple-500
          category: 'allocation',
          column: 3,
          icon: TrendingUp,
        });
        links.push({ sourceId: 'net_spendable_hub', targetId: 'reinvested_surplus', amount: reinvestSurplus, color: '#a855f7' });
      }

      return {
        isRetired: true,
        totalGross: totalGrossRetirementInflows,
        totalTaxes: totalTaxPaid,
        totalNetIncome: netRetirementIncome,
        totalAllocated: totalGrossRetirementInflows,
        nodes,
        links,
        metrics: {
          taxRateEffective: totalGrossRetirementInflows > 0 ? (totalTaxPaid / totalGrossRetirementInflows) * 100 : 0,
          guaranteedFloor: statePension + dbPension + annuity,
          portfolioDrawdown: pensionDrawdownTotal + isaDrawdown + cashDrawdown,
          netIncome: netRetirementIncome,
          essentialSpend: essentialLiving,
          discretionarySpend: discretionaryLiving,
          reinvestedExcess: reinvestSurplus,
          mortgageSpend: mortgageAlloc,
          shortfall,
        },
      };
    }
  }, [selectedProjection, profile, pots, adjustInflation, mortgagePaymentAnnual, combinedEssentialFloor, activeViewMode, isCouple, primaryName, partnerName]);

  // Layout calculations for custom responsive SVG Sankey
  const svgLayout = useMemo(() => {
    if (!flowData || flowData.nodes.length === 0) return null;

    const width = 960;
    const height = 480;
    const paddingX = 40;
    const paddingY = 30;
    const nodeWidth = 24;

    // Group nodes by column (0, 1, 2, 3)
    const columns: FlowNode[][] = [[], [], [], []];
    flowData.nodes.forEach((node) => {
      if (columns[node.column]) {
        columns[node.column].push(node);
      }
    });

    const colXPositions = [
      paddingX,
      paddingX + (width - 2 * paddingX) * 0.32,
      paddingX + (width - 2 * paddingX) * 0.65,
      width - paddingX - nodeWidth,
    ];

    // Compute max column total
    const colTotals = columns.map((col) => col.reduce((sum, n) => sum + n.amount, 0));
    const maxColTotal = Math.max(...colTotals, 1);

    const availableHeight = height - 2 * paddingY;
    const minNodeHeight = 18;

    // Calculate Y positions for nodes in each column
    const nodePositions = new Map<string, { x: number; y: number; width: number; height: number; node: FlowNode }>();

    columns.forEach((col, colIdx) => {
      const colTotal = colTotals[colIdx];
      const gapCount = Math.max(0, col.length - 1);
      const totalGaps = gapCount * 14;
      const usableColHeight = availableHeight - totalGaps;

      let curY = paddingY + Math.max(0, (availableHeight - (usableColHeight * (colTotal / maxColTotal) + totalGaps)) / 2);

      col.forEach((node) => {
        const rawH = colTotal > 0 ? (node.amount / maxColTotal) * usableColHeight : minNodeHeight;
        const nodeH = Math.max(minNodeHeight, rawH);

        nodePositions.set(node.id, {
          x: colXPositions[colIdx],
          y: curY,
          width: nodeWidth,
          height: nodeH,
          node,
        });

        curY += nodeH + 14;
      });
    });

    // Calculate link ribbons with smooth cubic bezier curves
    // Track cumulative source and target offsets on nodes
    const sourceOffsets = new Map<string, number>();
    const targetOffsets = new Map<string, number>();

    const linkPaths = flowData.links.map((link, idx) => {
      const srcPos = nodePositions.get(link.sourceId);
      const tgtPos = nodePositions.get(link.targetId);

      if (!srcPos || !tgtPos) return null;

      const srcCurOffset = sourceOffsets.get(link.sourceId) || 0;
      const tgtCurOffset = targetOffsets.get(link.targetId) || 0;

      const linkSrcH = srcPos.node.amount > 0 ? (link.amount / srcPos.node.amount) * srcPos.height : 2;
      const linkTgtH = tgtPos.node.amount > 0 ? (link.amount / tgtPos.node.amount) * tgtPos.height : 2;

      const y0 = srcPos.y + srcCurOffset;
      const y1 = srcPos.y + srcCurOffset + linkSrcH;
      const y2 = tgtPos.y + tgtCurOffset + linkTgtH;
      const y3 = tgtPos.y + tgtCurOffset;

      const x0 = srcPos.x + srcPos.width;
      const x1 = tgtPos.x;

      sourceOffsets.set(link.sourceId, srcCurOffset + linkSrcH);
      targetOffsets.set(link.targetId, tgtCurOffset + linkTgtH);

      const dx = (x1 - x0) * 0.5;

      const pathData = `
        M ${x0} ${y0}
        C ${x0 + dx} ${y0}, ${x1 - dx} ${y3}, ${x1} ${y3}
        L ${x1} ${y2}
        C ${x1 - dx} ${y2}, ${x0 + dx} ${y1}, ${x0} ${y1}
        Z
      `;

      return {
        id: `link-${link.sourceId}-${link.targetId}-${idx}`,
        sourceId: link.sourceId,
        targetId: link.targetId,
        amount: link.amount,
        color: link.color,
        path: pathData,
        sourceName: srcPos.node.label,
        targetName: tgtPos.node.label,
      };
    }).filter(Boolean);

    return {
      width,
      height,
      nodePositions: Array.from(nodePositions.values()),
      linkPaths,
    };
  }, [flowData]);

  // Quick milestone age jumps
  const milestoneAges = useMemo(() => {
    const ages: { age: number; label: string; type: 'current' | 'retire' | 'spa' | 'late' }[] = [
      { age: profile.currentAge, label: `Now (${profile.currentAge})`, type: 'current' },
    ];

    if (profile.targetRetirementAge && profile.targetRetirementAge !== profile.currentAge) {
      ages.push({ age: profile.targetRetirementAge, label: `Retire (${profile.targetRetirementAge})`, type: 'retire' });
    }

    const spa = profile.statePensionAge || 67;
    if (spa && spa !== profile.targetRetirementAge && spa !== profile.currentAge) {
      ages.push({ age: spa, label: `State Pension (${spa})`, type: 'spa' });
    }

    if (profile.targetRetirementAge && profile.targetRetirementAge + 10 < 100) {
      const midRetire = profile.targetRetirementAge + 10;
      ages.push({ age: midRetire, label: `Age ${midRetire}`, type: 'late' });
    }

    return ages;
  }, [profile]);

  return (
    <div id="card-cashflow-sankey" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 shadow-2xs">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Interactive Cash Flow Waterfall & Sankey Diagram
              </h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isRetired
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {isRetired ? `Decumulation Phase (Age ${selectedAge})` : `Accumulation Phase (Age ${selectedAge})`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visualizing how gross inflows map through UK tax deductions and distribute into essential living, lifestyle, debt, and re-invested wealth.
            </p>
          </div>
        </div>

        {/* View Mode Toggle for Couples */}
        {isCouple && (
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'combined'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Combined</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('primary')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'primary'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{primaryName}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('partner')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'partner'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{partnerName}</span>
            </button>
          </div>
        )}
      </div>

      {/* TOP KPI WATERFALL SUMMARY STRIP */}
      {flowData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>
                1. {isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner')
                  ? `${activeViewMode === 'primary' ? primaryName : partnerName} Inflow`
                  : activeViewMode === 'split'
                  ? 'Combined Inflow (Split)'
                  : 'Total Gross Inflow'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-900 dark:text-sky-100">
              {formatGBP(flowData.totalGross)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate">
              {flowData.isRetired ? 'State, DB, Pension & Drawdowns' : 'Salary & Employer match'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>
                2. {isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner')
                  ? `${activeViewMode === 'primary' ? primaryName : partnerName} Tax & NI`
                  : activeViewMode === 'split'
                  ? 'Total Tax & NI (Split)'
                  : 'Total Tax & NI Deducted'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
              -{formatGBP(flowData.totalTaxes)}
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-bold truncate">
              {flowData.metrics.taxRateEffective.toFixed(1)}% Effective Tax Rate
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>
                3. {isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner')
                  ? `${activeViewMode === 'primary' ? primaryName : partnerName} Net Cash`
                  : activeViewMode === 'split'
                  ? 'Net Spendable Cash (Split)'
                  : 'Net Spendable Cash'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {formatGBP(flowData.totalNetIncome)}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
              {flowData.isRetired ? 'Net lifestyle & mortgage cash' : 'Net take-home pay'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5" />
              <span>4. Wealth Re-invested</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100">
              {formatGBP(flowData.isRetired ? flowData.metrics.reinvestedExcess : (flowData.metrics.pensionInflows + flowData.metrics.isaInflows))}
            </div>
            <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium truncate">
              {flowData.isRetired ? 'Unspent drawdown surplus' : `${flowData.metrics.savingsRate.toFixed(0)}% savings rate`}
            </div>
          </div>
        </div>
      )}

      {/* SANKEY VISUALIZATION CANVAS */}
      <div className="relative bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-md dark:shadow-2xl transition-colors">
        {/* Column Headers */}
        <div className="grid grid-cols-4 gap-2 pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="pl-2">1. Gross Inflows</div>
          <div className="text-center">2. Total Gross Hub</div>
          <div className="text-center">3. Tax Deductions & Net Cash</div>
          <div className="text-right pr-2">4. Outgoing Allocations</div>
        </div>

        {/* Interactive SVG Canvas */}
        {svgLayout ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgLayout.width} ${svgLayout.height}`}
              className="w-full h-auto min-w-[700px] select-none"
              style={{ maxHeight: '520px' }}
            >
              <defs>
                {/* Linear gradients for ribbons */}
                {svgLayout.linkPaths.map((link) => {
                  if (!link) return null;
                  const srcNode = flowData?.nodes.find((n) => n.id === link.sourceId);
                  const tgtNode = flowData?.nodes.find((n) => n.id === link.targetId);
                  const c1 = srcNode?.color || '#38bdf8';
                  const c2 = tgtNode?.color || '#818cf8';

                  return (
                    <linearGradient
                      key={`grad-${link.id}`}
                      id={`grad-${link.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={c1} stopOpacity={isDark ? 0.65 : 0.45} />
                      <stop offset="100%" stopColor={c2} stopOpacity={isDark ? 0.65 : 0.45} />
                    </linearGradient>
                  );
                })}
              </defs>

              {/* Draw Link Ribbons */}
              <g className="links">
                {svgLayout.linkPaths.map((link) => {
                  if (!link) return null;
                  const isHovered =
                    hoveredLinkId === link.id ||
                    hoveredNodeId === link.sourceId ||
                    hoveredNodeId === link.targetId;

                  return (
                    <path
                      key={link.id}
                      d={link.path}
                      fill={`url(#grad-${link.id})`}
                      opacity={hoveredNodeId || hoveredLinkId ? (isHovered ? (isDark ? 0.95 : 0.85) : (isDark ? 0.15 : 0.08)) : (isDark ? 0.6 : 0.42)}
                      stroke={isHovered ? (isDark ? '#ffffff' : '#0f172a') : 'none'}
                      strokeWidth={isHovered ? (isDark ? 1.5 : 2) : 0}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredLinkId(link.id)}
                      onMouseLeave={() => setHoveredLinkId(null)}
                    >
                      <title>{`${link.sourceName} ➔ ${link.targetName}: ${formatGBP(link.amount)}`}</title>
                    </path>
                  );
                })}
              </g>

              {/* Draw Nodes */}
              <g className="nodes">
                {svgLayout.nodePositions.map(({ x, y, width, height, node }) => {
                  const isHovered = hoveredNodeId === node.id;
                  const isConnected =
                    hoveredLinkId &&
                    flowData?.links.some(
                      (l) =>
                        l.sourceId === node.id &&
                        hoveredLinkId.includes(l.sourceId) &&
                        hoveredLinkId.includes(l.targetId)
                    );

                  return (
                    <g
                      key={`node-${node.id}`}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Node Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        rx={6}
                        fill={node.color}
                        stroke={isHovered ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#1e293b' : '#cbd5e1')}
                        strokeWidth={isHovered ? 2.5 : 1}
                        className="transition-all duration-150 drop-shadow-sm"
                      />

                      {/* Node Label Text */}
                      {node.column === 0 && (
                        <text
                          x={x + width + 8}
                          y={y + height / 2}
                          dominantBaseline="middle"
                          fill={isDark ? '#f8fafc' : '#0f172a'}
                          fontSize="11"
                          fontWeight="700"
                        >
                          <tspan x={x + width + 8} dy="-4" fontWeight="800">
                            {node.label}
                          </tspan>
                          <tspan x={x + width + 8} dy="13" fill={isDark ? '#94a3b8' : '#475569'} fontSize="10" fontWeight="600">
                            {formatGBP(node.amount)}
                          </tspan>
                        </text>
                      )}

                      {node.column === 1 && (
                        <text
                          x={x + width / 2}
                          y={y - 10}
                          textAnchor="middle"
                          fill={isDark ? '#f8fafc' : '#0f172a'}
                          fontSize="11"
                          fontWeight="800"
                        >
                          {node.label} ({formatGBP(node.amount)})
                        </text>
                      )}

                      {node.column === 2 && (
                        <text
                          x={x + width / 2}
                          y={y + height + 14}
                          textAnchor="middle"
                          fill={isDark ? '#f8fafc' : '#0f172a'}
                          fontSize="11"
                          fontWeight="800"
                        >
                          {node.label}: {formatGBP(node.amount)}
                        </text>
                      )}

                      {node.column === 3 && (
                        <text
                          x={x - 8}
                          y={y + height / 2}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fill={isDark ? '#f8fafc' : '#0f172a'}
                          fontSize="11"
                          fontWeight="700"
                        >
                          <tspan x={x - 8} dy="-4" fontWeight="800">
                            {node.label}
                          </tspan>
                          <tspan x={x - 8} dy="13" fill={isDark ? '#cbd5e1' : '#475569'} fontSize="10" fontWeight="600">
                            {formatGBP(node.amount)}
                          </tspan>
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 italic text-sm">
            No active cash flow recorded for Age {selectedAge}
          </div>
        )}

        {/* Hover inspection pill banner */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>
              {hoveredNodeId ? (
                <>
                  Inspecting Node:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {flowData?.nodes.find((n) => n.id === hoveredNodeId)?.label}
                  </strong>{' '}
                  ({formatGBP(flowData?.nodes.find((n) => n.id === hoveredNodeId)?.amount || 0)})
                </>
              ) : (
                'Hover any node or flowing ribbon to highlight exact cash trajectory'
              )}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {adjustInflation ? "Real Terms (Today's £)" : 'Nominal Inflated Terms'}
          </div>
        </div>
      </div>

      {/* PROJECTION YEAR & TIMELINE CONTROLS (LOCATED DIRECTLY BELOW DIAGRAM) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Main Year Stepper & Slider */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Year Stepper Box */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAge((prev) => Math.max(projections[0]?.age || profile.currentAge, prev - 1))}
                disabled={selectedAge <= (projections[0]?.age || profile.currentAge)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none shadow-2xs border border-slate-200/60 dark:border-slate-700 cursor-pointer transition-colors"
                title="Previous Year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 text-center min-w-[120px]">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Projection Year</div>
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 justify-center">
                  <span>Age {selectedAge}</span>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">({selectedProjection?.year || ''})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAge((prev) => Math.min(projections[projections.length - 1]?.age || 100, prev + 1))}
                disabled={selectedAge >= (projections[projections.length - 1]?.age || 100)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none shadow-2xs border border-slate-200/60 dark:border-slate-700 cursor-pointer transition-colors"
                title="Next Year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline Scrubber Slider */}
            <div className="flex-1 min-w-[180px] sm:min-w-[220px] bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                Age {projections[0]?.age || profile.currentAge}
              </span>
              <input
                type="range"
                min={projections[0]?.age || profile.currentAge}
                max={projections[projections.length - 1]?.age || 100}
                value={selectedAge}
                onChange={(e) => setSelectedAge(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                Age {projections[projections.length - 1]?.age || 100}
              </span>
            </div>
          </div>

          {/* Essential Floor Numerical Control */}
          <div className="flex items-center gap-2 sm:gap-3 self-stretch lg:self-auto bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs justify-between lg:justify-start flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <Scale className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-slate-600 dark:text-slate-300 font-semibold">
                Essential Floor:
              </span>
              {isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner') && (
                <span className="text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60">
                  ½ share
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const isInd = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
                  const step = isInd ? 500 : 1000;
                  const currentVal = isInd ? combinedEssentialFloor / 2 : combinedEssentialFloor;
                  const nextVal = Math.max(0, currentVal - step);
                  if (isInd) {
                    setCombinedEssentialFloor(nextVal * 2);
                  } else {
                    setCombinedEssentialFloor(nextVal);
                  }
                }}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
                title="Decrease Essential Floor"
              >
                -
              </button>

              <div className="relative flex items-center">
                <span className="absolute left-2 text-slate-400 font-bold text-xs pointer-events-none">£</span>
                <input
                  type="number"
                  step={isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner') ? 250 : 500}
                  min={0}
                  max={200000}
                  value={Math.round(isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner') ? combinedEssentialFloor / 2 : combinedEssentialFloor)}
                  onChange={(e) => {
                    const isInd = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
                    const num = Math.max(0, Number(e.target.value) || 0);
                    if (isInd) {
                      setCombinedEssentialFloor(num * 2);
                    } else {
                      setCombinedEssentialFloor(num);
                    }
                  }}
                  className="w-20 sm:w-22 pl-5 pr-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-right font-extrabold text-teal-600 dark:text-teal-400 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const isInd = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
                  const step = isInd ? 500 : 1000;
                  const currentVal = isInd ? combinedEssentialFloor / 2 : combinedEssentialFloor;
                  const nextVal = currentVal + step;
                  if (isInd) {
                    setCombinedEssentialFloor(nextVal * 2);
                  } else {
                    setCombinedEssentialFloor(nextVal);
                  }
                }}
                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
                title="Increase Essential Floor"
              >
                +
              </button>

              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                /yr
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Quick Jumps */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Timeline Milestones:</span>
          </span>
          {milestoneAges.map((m) => (
            <button
              key={`milestone-${m.age}`}
              type="button"
              onClick={() => setSelectedAge(m.age)}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                selectedAge === m.age
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* DETAILED CATEGORY WATERFALL BREAKDOWN CARDS */}
      {flowData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Gross Inflows Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>1. Inflow Sources ({flowData.nodes.filter((n) => n.column === 0).length})</span>
              </h4>
              <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                {formatGBP(flowData.totalGross)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {flowData.nodes.filter((n) => n.column === 0).map((node) => {
                const pct = flowData.totalGross > 0 ? ((node.amount / flowData.totalGross) * 100).toFixed(1) : '0';
                return (
                  <div key={node.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{node.label}</div>
                        <div className="text-[10px] text-slate-500">{node.sublabel}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900 dark:text-white">{formatGBP(node.amount)}</div>
                      <div className="text-[10px] text-slate-400">{pct}% share</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Tax Deductions & Leaks */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>2. UK Tax Obligations</span>
              </h4>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                {flowData.totalTaxes > 0 ? `-${formatGBP(flowData.totalTaxes)}` : '£0 (0% Tax Free)'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {flowData.nodes.filter((n) => n.category === 'deduction').length > 0 ? (
                flowData.nodes.filter((n) => n.category === 'deduction').map((node) => (
                  <div key={node.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{node.label}</div>
                        <div className="text-[10px] text-slate-500">{node.sublabel}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-black text-rose-600 dark:text-rose-400">
                      -{formatGBP(node.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
                  🎉 100% Tax-Free Year (Shielded via Personal Allowance & ISA Drawdowns)
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Outgoing Allocations Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>3. Outgoing Allocations</span>
              </h4>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {formatGBP(flowData.nodes.filter((n) => n.column === 3).reduce((sum, n) => sum + n.amount, 0))}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {flowData.nodes.filter((n) => n.column === 3).map((node) => (
                <div key={node.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{node.label}</div>
                      <div className="text-[10px] text-slate-500">{node.sublabel}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-black text-slate-900 dark:text-white">
                    {formatGBP(node.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
