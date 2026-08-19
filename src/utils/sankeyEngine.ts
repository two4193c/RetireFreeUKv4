import { UserProfile, InvestmentPots, YearProjection, UKTaxResult } from '../types';
import { calculateUKTax, calculatePartnerUKTax, getPensionAccessAge, getPartnerPensionAccessAge } from './ukTaxEngine';
import { getTargetIncomeForAge } from './projectionEngine';
import { DEFAULT_POTS, DEFAULT_PARTNER_POTS } from './defaultData';

export type CashFlowViewMode = 'combined' | 'split' | 'primary' | 'partner';

export interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  amount: number;
  color: string;
  category: 'source' | 'hub' | 'deduction' | 'allocation';
  column: number; // 0: Gross Inflows, 1: Hubs, 2: Net Cash/Deductions, 3: Final Allocations
}

export interface FlowLink {
  sourceId: string;
  targetId: string;
  amount: number;
  color: string;
  label?: string;
}

export interface CashFlowSankeyData {
  age: number;
  year: number;
  isRetired: boolean;
  viewMode: CashFlowViewMode;
  totalGross: number;
  totalTaxes: number;
  totalNetIncome: number;
  totalAllocated: number;
  nodes: FlowNode[];
  links: FlowLink[];
  metrics: {
    taxRateEffective: number;
    savingsRate?: number;
    guaranteedFloor?: number;
    portfolioDrawdown?: number;
    netIncome: number;
    essentialSpend: number;
    discretionarySpend: number;
    reinvestedExcess?: number;
    mortgageSpend: number;
    shortfall?: number;
  };
}

export interface SvgLayoutData {
  width: number;
  height: number;
  nodePositions: { x: number; y: number; width: number; height: number; node: FlowNode }[];
  linkPaths: {
    id: string;
    sourceId: string;
    targetId: string;
    amount: number;
    color: string;
    path: string;
    sourceName: string;
    targetName: string;
    coords?: {
      x0: number;
      y0: number;
      x1: number;
      y3: number;
      y2: number;
      y1: number;
      dx: number;
    };
  }[];
}

// Calculate annual mortgage payment at a given age
export function calculateMortgagePaymentForAge(profile: UserProfile, age: number): number {
  const mortgage = profile.mortgage;
  if (!mortgage || mortgage.enabled === false) return 0;

  const startAge = profile.currentAge;
  const termYears = mortgage.remainingTermYears + (mortgage.remainingTermMonths || 0) / 12;
  const endAge = startAge + termYears;

  if (mortgage.payoffAtRetirement && age >= profile.targetRetirementAge) {
    return 0; // Cleared at retirement
  }

  if (age >= startAge && age < endAge) {
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
}

// Core Sankey Flow computation function
export function computeCashFlowSankeyData(
  profile: UserProfile,
  pots: InvestmentPots | undefined,
  projections: YearProjection[],
  age: number,
  viewMode: CashFlowViewMode = 'split',
  customEssentialFloor?: number
): CashFlowSankeyData | null {
  const selectedProjection = projections.find((p) => p.age === age) || projections[0];
  if (!selectedProjection) return null;

  const p = selectedProjection;
  const isCouple = Boolean(profile.isCouplePlanning);
  const activeViewMode: CashFlowViewMode = isCouple ? viewMode : 'combined';
  const primaryName = profile.name || 'Primary';
  const partnerName = profile.partnerName || 'Partner';

  const defaultCombinedEssentialFloor = Math.round(((profile.targetRetirementIncomeAnnual || 30000) * 0.65) / 500) * 500;
  const combinedEssentialFloor = customEssentialFloor ?? defaultCombinedEssentialFloor;

  const inflationFactor = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, p.age - profile.currentAge);
  const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
  const partnerAge = p.age + partnerAgeDiff;

  const adjustInflation = profile.adjustForInflation ?? false;
  const formatGBP = (val: number) => `£${Math.round(val).toLocaleString()}`;
  const mortgagePaymentAnnual = calculateMortgagePaymentForAge(profile, p.age);

  if (!p.isRetired) {
    // ==========================================
    // ACCUMULATION PHASE CASH FLOW
    // ==========================================
    const priSalary = (profile.grossAnnualSalary || 0) * (adjustInflation ? 1 : inflationFactor);
    const partSalary = isCouple ? (profile.partnerGrossAnnualSalary || 0) * (adjustInflation ? 1 : inflationFactor) : 0;
    const totalSalary = priSalary + partSalary;

    const priTax = calculateUKTax(profile, pots || DEFAULT_POTS, false, p.age);
    const partTax = isCouple ? calculatePartnerUKTax(profile, profile.partnerPots || DEFAULT_PARTNER_POTS) : null;

    const priEmpPension = priTax.employeePensionContributionsAnnual || 0;
    const priEmprPension = priTax.employerPensionContributionsAnnual || 0;
    const priPensionTotal = priEmpPension + priEmprPension;
    const priIsaContribs = priTax.totalIsaContributionsAnnual || 0;
    const priCashGiaContribs = priTax.totalCashGiaContributionsAnnual || 0;
    const priIncomeTax = priTax.totalIncomeTax;
    const priNI = priTax.totalNationalInsurance;
    const priNetTakeHome = Math.max(0, priTax.netTakeHomePay - priIsaContribs - priCashGiaContribs);

    const partEmpPension = partTax?.employeePensionContributionsAnnual || 0;
    const partEmprPension = partTax?.employerPensionContributionsAnnual || 0;
    const partPensionTotal = partEmpPension + partEmprPension;
    const partIsaContribs = partTax?.totalIsaContributionsAnnual || 0;
    const partCashGiaContribs = partTax?.totalCashGiaContributionsAnnual || 0;
    const partIncomeTax = partTax ? partTax.totalIncomeTax : 0;
    const partNI = partTax ? partTax.totalNationalInsurance : 0;
    const partNetTakeHome = Math.max(0, (partTax?.netTakeHomePay || 0) - partIsaContribs - partCashGiaContribs);

    const isIndividualShare = isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner');
    const effectiveEssentialFloor = isIndividualShare ? combinedEssentialFloor / 2 : combinedEssentialFloor;
    const inflatedEssentialTarget = adjustInflation ? effectiveEssentialFloor : (effectiveEssentialFloor * inflationFactor);

    const nodes: FlowNode[] = [];
    const links: FlowLink[] = [];

    if (activeViewMode === 'split' && isCouple) {
      // SPLIT VIEW MODE: COMBINED HOUSEHOLD DATA SPLIT BY PERSON
      const priGross = priSalary + priEmprPension;
      const partGross = partSalary + partEmprPension;
      const totalGrossIncome = priGross + partGross;
      const totalTaxAndNI = priIncomeTax + priNI + partIncomeTax + partNI;
      const totalSavingsInvested = priPensionTotal + partPensionTotal + priIsaContribs + partIsaContribs + priCashGiaContribs + partCashGiaContribs;

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

      // Column 0: Sources
      if (priSalary > 0) {
        nodes.push({
          id: 'pri_salary',
          label: `${primaryName} Gross Salary`,
          sublabel: `PAYE (Age ${p.age})`,
          amount: priSalary,
          color: '#0284c7',
          category: 'source',
          column: 0,
        });
      }
      if (priEmprPension > 0) {
        nodes.push({
          id: 'pri_empr_pension',
          label: `${primaryName} Employer Match`,
          sublabel: 'Workplace Pension Top-up',
          amount: priEmprPension,
          color: '#10b981',
          category: 'source',
          column: 0,
        });
      }
      if (partSalary > 0) {
        nodes.push({
          id: 'part_salary',
          label: `${partnerName} Gross Salary`,
          sublabel: `PAYE (Age ${partnerAge})`,
          amount: partSalary,
          color: '#38bdf8',
          category: 'source',
          column: 0,
        });
      }
      if (partEmprPension > 0) {
        nodes.push({
          id: 'part_empr_pension',
          label: `${partnerName} Employer Match`,
          sublabel: 'Workplace Pension Top-up',
          amount: partEmprPension,
          color: '#34d399',
          category: 'source',
          column: 0,
        });
      }

      // Column 1: Gross Inflow Hubs
      nodes.push({
        id: 'pri_gross_hub',
        label: `${primaryName} Gross Inflows`,
        sublabel: 'Salary & Employer Top-up',
        amount: priGross,
        color: '#6366f1',
        category: 'hub',
        column: 1,
      });
      if (priSalary > 0) links.push({ sourceId: 'pri_salary', targetId: 'pri_gross_hub', amount: priSalary, color: '#0284c7' });
      if (priEmprPension > 0) links.push({ sourceId: 'pri_empr_pension', targetId: 'pri_gross_hub', amount: priEmprPension, color: '#10b981' });

      nodes.push({
        id: 'part_gross_hub',
        label: `${partnerName} Gross Inflows`,
        sublabel: 'Salary & Employer Top-up',
        amount: partGross,
        color: '#8b5cf6',
        category: 'hub',
        column: 1,
      });
      if (partSalary > 0) links.push({ sourceId: 'part_salary', targetId: 'part_gross_hub', amount: partSalary, color: '#38bdf8' });
      if (partEmprPension > 0) links.push({ sourceId: 'part_empr_pension', targetId: 'part_gross_hub', amount: partEmprPension, color: '#34d399' });

      // Column 2: Tax Deductions & Net Take-Home
      if (priIncomeTax > 0) {
        nodes.push({
          id: 'pri_income_tax',
          label: `${primaryName} Income Tax`,
          sublabel: 'PAYE Income Tax',
          amount: priIncomeTax,
          color: '#ef4444',
          category: 'deduction',
          column: 2,
        });
        links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_income_tax', amount: priIncomeTax, color: '#ef4444' });
      }
      if (priNI > 0) {
        nodes.push({
          id: 'pri_ni_tax',
          label: `${primaryName} National Insurance`,
          sublabel: 'Class 1 Contributions',
          amount: priNI,
          color: '#f97316',
          category: 'deduction',
          column: 2,
        });
        links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_ni_tax', amount: priNI, color: '#f97316' });
      }

      const priNetSpendableHubAmount = priNetTakeHome + priIsaContribs + priCashGiaContribs;
      nodes.push({
        id: 'pri_net_hub',
        label: `${primaryName} Take-Home Pay`,
        sublabel: 'Net disposable salary',
        amount: priNetSpendableHubAmount,
        color: '#14b8a6',
        category: 'hub',
        column: 2,
      });
      links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_net_hub', amount: priNetSpendableHubAmount, color: '#14b8a6' });

      if (partIncomeTax > 0) {
        nodes.push({
          id: 'part_income_tax',
          label: `${partnerName} Income Tax`,
          sublabel: 'PAYE Income Tax',
          amount: partIncomeTax,
          color: '#f43f5e',
          category: 'deduction',
          column: 2,
        });
        links.push({ sourceId: 'part_gross_hub', targetId: 'part_income_tax', amount: partIncomeTax, color: '#f43f5e' });
      }
      if (partNI > 0) {
        nodes.push({
          id: 'part_ni_tax',
          label: `${partnerName} National Insurance`,
          sublabel: 'Class 1 Contributions',
          amount: partNI,
          color: '#fb923c',
          category: 'deduction',
          column: 2,
        });
        links.push({ sourceId: 'part_gross_hub', targetId: 'part_ni_tax', amount: partNI, color: '#fb923c' });
      }

      const partNetSpendableHubAmount = partNetTakeHome + partIsaContribs + partCashGiaContribs;
      nodes.push({
        id: 'part_net_hub',
        label: `${partnerName} Take-Home Pay`,
        sublabel: 'Net disposable salary',
        amount: partNetSpendableHubAmount,
        color: '#06b6d4',
        category: 'hub',
        column: 2,
      });
      links.push({ sourceId: 'part_gross_hub', targetId: 'part_net_hub', amount: partNetSpendableHubAmount, color: '#06b6d4' });

      // Column 3: Allocations
      if (priPensionTotal > 0) {
        nodes.push({
          id: 'pri_pension_savings',
          label: `${primaryName} Pension Savings`,
          sublabel: 'Workplace & SIPP Inflows',
          amount: priPensionTotal,
          color: '#10b981',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'pri_gross_hub', targetId: 'pri_pension_savings', amount: priPensionTotal, color: '#10b981' });
      }
      if (partPensionTotal > 0) {
        nodes.push({
          id: 'part_pension_savings',
          label: `${partnerName} Pension Savings`,
          sublabel: 'Workplace & SIPP Inflows',
          amount: partPensionTotal,
          color: '#34d399',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'part_gross_hub', targetId: 'part_pension_savings', amount: partPensionTotal, color: '#34d399' });
      }

      if (priIsaContribs > 0) {
        nodes.push({
          id: 'pri_isa_savings',
          label: `${primaryName} ISA / LISA`,
          sublabel: 'Stocks & Shares / Cash ISA',
          amount: priIsaContribs,
          color: '#8b5cf6',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'pri_net_hub', targetId: 'pri_isa_savings', amount: priIsaContribs, color: '#8b5cf6' });
      }
      if (priCashGiaContribs > 0) {
        nodes.push({
          id: 'pri_cash_gia_savings',
          label: `${primaryName} Cash / GIA`,
          sublabel: 'General Account & Cash',
          amount: priCashGiaContribs,
          color: '#f59e0b',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'pri_net_hub', targetId: 'pri_cash_gia_savings', amount: priCashGiaContribs, color: '#f59e0b' });
      }

      if (partIsaContribs > 0) {
        nodes.push({
          id: 'part_isa_savings',
          label: `${partnerName} ISA / LISA`,
          sublabel: 'Stocks & Shares / Cash ISA',
          amount: partIsaContribs,
          color: '#a855f7',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'part_net_hub', targetId: 'part_isa_savings', amount: partIsaContribs, color: '#a855f7' });
      }
      if (partCashGiaContribs > 0) {
        nodes.push({
          id: 'part_cash_gia_savings',
          label: `${partnerName} Cash / GIA`,
          sublabel: 'General Account & Cash',
          amount: partCashGiaContribs,
          color: '#fbbf24',
          category: 'allocation',
          column: 3,
        });
        links.push({ sourceId: 'part_net_hub', targetId: 'part_cash_gia_savings', amount: partCashGiaContribs, color: '#fbbf24' });
      }

      if (totalMortgageAlloc > 0) {
        nodes.push({
          id: 'household_mortgage',
          label: 'Household Mortgage Repayment',
          sublabel: 'Capital & Interest Debt Repayment',
          amount: totalMortgageAlloc,
          color: '#0ea5e9',
          category: 'allocation',
          column: 3,
        });
        if (priMortgageAlloc > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'household_mortgage', amount: priMortgageAlloc, color: '#0ea5e9' });
        if (partMortgageAlloc > 0) links.push({ sourceId: 'part_net_hub', targetId: 'household_mortgage', amount: partMortgageAlloc, color: '#38bdf8' });
      }

      if (essentialLiving > 0) {
        const isFloorMet = totalRemaining >= inflatedEssentialTarget;
        nodes.push({
          id: 'household_essential_living',
          label: 'Household Essential Floor',
          sublabel: `Target: ${formatGBP(inflatedEssentialTarget)} (${isFloorMet ? '100% Met' : `${Math.round((totalRemaining / Math.max(1, inflatedEssentialTarget)) * 100)}% Met`})`,
          amount: essentialLiving,
          color: '#059669',
          category: 'allocation',
          column: 3,
        });
        if (priEssential > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'household_essential_living', amount: priEssential, color: '#059669' });
        if (partEssential > 0) links.push({ sourceId: 'part_net_hub', targetId: 'household_essential_living', amount: partEssential, color: '#10b981' });
      }

      if (discretionaryLiving > 0) {
        nodes.push({
          id: 'household_discretionary_living',
          label: 'Household Discretionary Spend',
          sublabel: 'Surplus lifestyle (leisure, travel, dining)',
          amount: discretionaryLiving,
          color: '#ec4899',
          category: 'allocation',
          column: 3,
        });
        if (priDiscretionary > 0) links.push({ sourceId: 'pri_net_hub', targetId: 'household_discretionary_living', amount: priDiscretionary, color: '#ec4899' });
        if (partDiscretionary > 0) links.push({ sourceId: 'part_net_hub', targetId: 'household_discretionary_living', amount: partDiscretionary, color: '#f472b6' });
      }

      return {
        age: p.age,
        year: p.year,
        isRetired: false,
        viewMode: 'split',
        totalGross: totalGrossIncome,
        totalTaxes: totalTaxAndNI,
        totalNetIncome: priNetSpendableHubAmount + partNetSpendableHubAmount,
        totalAllocated: totalGrossIncome,
        nodes,
        links,
        metrics: {
          taxRateEffective: totalGrossIncome > 0 ? (totalTaxAndNI / totalGrossIncome) * 100 : 0,
          savingsRate: totalGrossIncome > 0 ? (totalSavingsInvested / totalGrossIncome) * 100 : 0,
          netIncome: priNetTakeHome + partNetTakeHome,
          essentialSpend: essentialLiving,
          discretionarySpend: discretionaryLiving,
          mortgageSpend: totalMortgageAlloc,
        },
      };
    }

    // Combined or Single accumulation
    const curSalary = activeViewMode === 'partner' ? partSalary : activeViewMode === 'primary' ? priSalary : totalSalary;
    const curEmpPension = activeViewMode === 'partner' ? partEmpPension : activeViewMode === 'primary' ? priEmpPension : (priEmpPension + partEmpPension);
    const curEmprPension = activeViewMode === 'partner' ? partEmprPension : activeViewMode === 'primary' ? priEmprPension : (priEmprPension + partEmprPension);
    const curPensionContribs = curEmpPension + curEmprPension;
    const curIsaContribs = activeViewMode === 'partner' ? partIsaContribs : activeViewMode === 'primary' ? priIsaContribs : (priIsaContribs + partIsaContribs);
    const curCashGiaContribs = activeViewMode === 'partner' ? partCashGiaContribs : activeViewMode === 'primary' ? priCashGiaContribs : (priCashGiaContribs + partCashGiaContribs);
    const curIncomeTax = activeViewMode === 'partner' ? partIncomeTax : activeViewMode === 'primary' ? priIncomeTax : (priIncomeTax + partIncomeTax);
    const curNI = activeViewMode === 'partner' ? partNI : activeViewMode === 'primary' ? priNI : (priNI + partNI);
    const curNetTakeHome = activeViewMode === 'partner' ? partNetTakeHome : activeViewMode === 'primary' ? priNetTakeHome : (priNetTakeHome + partNetTakeHome);

    const totalGrossIncome = curSalary + curEmprPension;
    const totalTaxAndNI = curIncomeTax + curNI;
    const totalSavingsInvested = curPensionContribs + curIsaContribs + curCashGiaContribs;

    const personMortgageShare = (isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner'))
      ? (totalSalary > 0 ? (curSalary / totalSalary) * mortgagePaymentAnnual : mortgagePaymentAnnual * 0.5)
      : mortgagePaymentAnnual;
    const mortgageAlloc = Math.min(curNetTakeHome, personMortgageShare);
    const remainingLifestyle = Math.max(0, curNetTakeHome - mortgageAlloc);
    const essentialLiving = Math.min(remainingLifestyle, inflatedEssentialTarget);
    const discretionaryLiving = Math.max(0, remainingLifestyle - essentialLiving);

    // Column 0: Sources
    if (curSalary > 0) {
      nodes.push({
        id: 'salary_income',
        label: isCouple && activeViewMode === 'combined' ? 'Combined Gross Salary' : activeViewMode === 'partner' ? `${partnerName} Gross Salary` : isCouple ? `${primaryName} Gross Salary` : 'Gross Employment Salary',
        sublabel: 'PAYE Taxable Employment Income',
        amount: curSalary,
        color: '#0284c7',
        category: 'source',
        column: 0,
      });
    }
    if (curEmprPension > 0) {
      nodes.push({
        id: 'empr_pension_inflow',
        label: isCouple && activeViewMode === 'combined' ? 'Employer Contributions (Both)' : 'Employer Pension Top-up',
        sublabel: 'Direct Company Workplace Contribution',
        amount: curEmprPension,
        color: '#10b981',
        category: 'source',
        column: 0,
      });
    }

    // Column 1 Hub: Gross Hub
    nodes.push({
      id: 'gross_hub',
      label: activeViewMode === 'combined' ? 'Total Gross Inflows' : `${activeViewMode === 'primary' ? primaryName : partnerName} Gross Inflows`,
      sublabel: 'Gross Salary & Employer Inflows',
      amount: totalGrossIncome,
      color: '#6366f1',
      category: 'hub',
      column: 1,
    });
    if (curSalary > 0) links.push({ sourceId: 'salary_income', targetId: 'gross_hub', amount: curSalary, color: '#0284c7' });
    if (curEmprPension > 0) links.push({ sourceId: 'empr_pension_inflow', targetId: 'gross_hub', amount: curEmprPension, color: '#10b981' });

    // Column 2: Tax Deductions
    if (curIncomeTax > 0) {
      nodes.push({
        id: 'income_tax',
        label: 'Income Tax (PAYE)',
        sublabel: 'HMRC Income Tax Liability',
        amount: curIncomeTax,
        color: '#ef4444',
        category: 'deduction',
        column: 2,
      });
      links.push({ sourceId: 'gross_hub', targetId: 'income_tax', amount: curIncomeTax, color: '#ef4444' });
    }
    if (curNI > 0) {
      nodes.push({
        id: 'ni_tax',
        label: 'National Insurance (Class 1)',
        sublabel: 'UK Social Security Contribution',
        amount: curNI,
        color: '#f97316',
        category: 'deduction',
        column: 2,
      });
      links.push({ sourceId: 'gross_hub', targetId: 'ni_tax', amount: curNI, color: '#f97316' });
    }

    if (curPensionContribs > 0) {
      nodes.push({
        id: 'pension_savings',
        label: activeViewMode === 'combined' && isCouple ? 'Pension Contributions (Both)' : 'Pension Investments',
        sublabel: 'Workplace & SIPP Inflows',
        amount: curPensionContribs,
        color: '#10b981',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'gross_hub', targetId: 'pension_savings', amount: curPensionContribs, color: '#10b981' });
    }

    // Column 2 Hub: Net Disposable Pay
    nodes.push({
      id: 'net_pay_hub',
      label: activeViewMode === 'combined' ? 'Net Take-Home Cashflow' : `${activeViewMode === 'primary' ? primaryName : partnerName} Take-Home`,
      sublabel: 'After Tax & NI deductions',
      amount: curNetTakeHome + curIsaContribs + curCashGiaContribs,
      color: '#14b8a6',
      category: 'hub',
      column: 2,
    });
    links.push({
      sourceId: 'gross_hub',
      targetId: 'net_pay_hub',
      amount: curNetTakeHome + curIsaContribs + curCashGiaContribs,
      color: '#14b8a6',
    });

    // Column 3 Allocations
    if (curIsaContribs > 0) {
      nodes.push({
        id: 'isa_savings',
        label: 'ISA & LISA Contributions',
        sublabel: 'Stocks & Shares, Cash ISA, LISA',
        amount: curIsaContribs,
        color: '#8b5cf6',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_pay_hub', targetId: 'isa_savings', amount: curIsaContribs, color: '#8b5cf6' });
    }
    if (curCashGiaContribs > 0) {
      nodes.push({
        id: 'cash_gia_savings',
        label: 'GIA & Cash Savings',
        sublabel: 'High-Yield Cash & General Account',
        amount: curCashGiaContribs,
        color: '#f59e0b',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_pay_hub', targetId: 'cash_gia_savings', amount: curCashGiaContribs, color: '#f59e0b' });
    }
    if (mortgageAlloc > 0) {
      nodes.push({
        id: 'mortgage_pay',
        label: isCouple && activeViewMode !== 'combined' ? 'Mortgage Share Repayment' : 'Mortgage Repayment',
        sublabel: 'Capital & Interest Debt Clearance',
        amount: mortgageAlloc,
        color: '#0ea5e9',
        category: 'allocation',
        column: 3,
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
        color: '#059669',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_pay_hub', targetId: 'essential_living', amount: essentialLiving, color: '#059669' });
    }
    if (discretionaryLiving > 0) {
      nodes.push({
        id: 'discretionary_living',
        label: isCouple && activeViewMode !== 'combined' ? 'Discretionary Lifestyle Share' : 'Discretionary Lifestyle',
        sublabel: 'Surplus above essential floor (leisure, travel)',
        amount: discretionaryLiving,
        color: '#ec4899',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_pay_hub', targetId: 'discretionary_living', amount: discretionaryLiving, color: '#ec4899' });
    }

    return {
      age: p.age,
      year: p.year,
      isRetired: false,
      viewMode: activeViewMode,
      totalGross: totalGrossIncome,
      totalTaxes: totalTaxAndNI,
      totalNetIncome: curNetTakeHome + curIsaContribs + curCashGiaContribs,
      totalAllocated: totalGrossIncome,
      nodes,
      links,
      metrics: {
        taxRateEffective: totalGrossIncome > 0 ? (totalTaxAndNI / totalGrossIncome) * 100 : 0,
        savingsRate: totalGrossIncome > 0 ? (totalSavingsInvested / totalGrossIncome) * 100 : 0,
        netIncome: curNetTakeHome,
        essentialSpend: essentialLiving,
        discretionarySpend: discretionaryLiving,
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
    const priGiltLadder = p.giltLadderIncomeReceived ?? 0;
    const priTaxableFixed = p.primaryTaxableFixedIncomeReceived ?? (isCouple ? ((p.taxableFixedIncomeReceived || 0) * 0.5) : (p.taxableFixedIncomeReceived || 0));
    const priTaxFreeFixed = p.primaryTaxFreeFixedIncomeReceived ?? (isCouple ? ((p.taxFreeFixedIncomeReceived || 0) * 0.5) : (p.taxFreeFixedIncomeReceived || 0));
    const priPensionDrawdownTaxable = p.primaryPensionDrawdownTaxable ?? (isCouple ? ((p.pensionDrawdownTaxable || 0) * 0.5) : (p.pensionDrawdownTaxable || 0));
    const priPensionDrawdownTaxFree = p.primaryPensionDrawdownTaxFree ?? (isCouple ? ((p.pensionDrawdownTaxFree || 0) * 0.5) : (p.pensionDrawdownTaxFree || 0));
    const priPensionDrawdownTotal = p.primaryPensionDrawdown ?? (priPensionDrawdownTaxable + priPensionDrawdownTaxFree);
    const priIsaDrawdown = p.primaryIsaDrawdown ?? (isCouple ? ((p.isaDrawdown || 0) * 0.5) : (p.isaDrawdown || 0));
    const priCashDrawdown = p.primaryCashDrawdown ?? (isCouple ? ((p.cashDrawdown || 0) * 0.5) : (p.cashDrawdown || 0));
    const priLifeEventsInc = p.lifeEventsIncome || 0;
    const priDownsizeInc = p.propertyDownsizeEquityReleased ? (isCouple ? p.propertyDownsizeEquityReleased * 0.5 : p.propertyDownsizeEquityReleased) : 0;
    const priTaxPaid = p.primaryTaxPaid ?? (isCouple ? ((p.totalTaxPaid || 0) * 0.5) : (p.totalTaxPaid || 0));

    const priGrossTotal =
      priStatePension +
      priDbPension +
      priAnnuity +
      priGiltLadder +
      priTaxableFixed +
      priTaxFreeFixed +
      priLifeEventsInc +
      priDownsizeInc +
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
    const partDownsizeInc = isCouple && p.propertyDownsizeEquityReleased ? p.propertyDownsizeEquityReleased * 0.5 : 0;
    const partTaxPaid = isCouple ? (p.partnerTaxPaid || 0) : 0;

    const partGrossTotal =
      partStatePension +
      partDbPension +
      partAnnuity +
      partTaxableFixed +
      partTaxFreeFixed +
      partLifeEventsInc +
      partDownsizeInc +
      partPensionDrawdownTotal +
      partIsaDrawdown +
      partCashDrawdown;
    const partNetTotal = Math.max(0, partGrossTotal - partTaxPaid);

    const nodes: FlowNode[] = [];
    const links: FlowLink[] = [];

    if (activeViewMode === 'split' && isCouple) {
      // SPLIT RETIREMENT DECUMULATION
      const totalGrossRetire = priGrossTotal + partGrossTotal;
      const totalTaxPaid = priTaxPaid + partTaxPaid;
      const totalNetRetire = priNetTotal + partNetTotal;

      const priMortgageShare = mortgagePaymentAnnual * 0.5;
      const partMortgageShare = mortgagePaymentAnnual * 0.5;
      const priMortgageAlloc = Math.min(priNetTotal, priMortgageShare);
      const partMortgageAlloc = Math.min(partNetTotal, partMortgageShare);
      const totalMortgageAlloc = priMortgageAlloc + partMortgageAlloc;

      const priSpendable = Math.max(0, priNetTotal - priMortgageAlloc);
      const partSpendable = Math.max(0, partNetTotal - partMortgageAlloc);
      const totalSpendable = priSpendable + partSpendable;

      const annualExcess = (p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0);
      const reinvestSurplus = Math.min(totalSpendable, annualExcess);
      const priReinvest = totalSpendable > 0 ? (priSpendable / totalSpendable) * reinvestSurplus : 0;
      const partReinvest = totalSpendable > 0 ? (partSpendable / totalSpendable) * reinvestSurplus : 0;

      const lifeEventsExpense = p.lifeEventsExpense || 0;
      const availableLiving = Math.max(0, totalSpendable - reinvestSurplus - lifeEventsExpense);
      const priLifeEventsAlloc = totalSpendable > 0 ? (priSpendable / totalSpendable) * lifeEventsExpense : 0;
      const partLifeEventsAlloc = totalSpendable > 0 ? (partSpendable / totalSpendable) * lifeEventsExpense : 0;

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
        });
      }
      if (priGiltLadder > 0) {
        nodes.push({
          id: 'pri_gilt_ladder',
          label: `${primaryName} Gilt Ladder`,
          sublabel: 'Maturing Gilts & Net Coupons',
          amount: priGiltLadder,
          color: '#059669',
          category: 'source',
          column: 0,
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
        });
      }
      if (priDownsizeInc > 0) {
        nodes.push({
          id: 'pri_downsize',
          label: `${primaryName} Right-Sizing`,
          sublabel: 'Equity Released',
          amount: priDownsizeInc,
          color: '#d97706',
          category: 'source',
          column: 0,
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
        });
      }
      if (partDownsizeInc > 0) {
        nodes.push({
          id: 'part_downsize',
          label: `${partnerName} Right-Sizing`,
          sublabel: 'Equity Released',
          amount: partDownsizeInc,
          color: '#d97706',
          category: 'source',
          column: 0,
        });
      }

      // Column 1: Gross Inflow Hubs
      nodes.push({
        id: 'pri_retire_hub',
        label: `${primaryName} Gross Inflows`,
        sublabel: `Total Inflows (Age ${p.age})`,
        amount: priGrossTotal,
        color: '#3b82f6',
        category: 'hub',
        column: 1,
      });
      if (priStatePension > 0) links.push({ sourceId: 'pri_state_pension', targetId: 'pri_retire_hub', amount: priStatePension, color: '#8b5cf6' });
      if (priDbPension > 0) links.push({ sourceId: 'pri_db_pension', targetId: 'pri_retire_hub', amount: priDbPension, color: '#0284c7' });
      if (priAnnuity > 0) links.push({ sourceId: 'pri_annuity', targetId: 'pri_retire_hub', amount: priAnnuity, color: '#ec4899' });
      if (priGiltLadder > 0) links.push({ sourceId: 'pri_gilt_ladder', targetId: 'pri_retire_hub', amount: priGiltLadder, color: '#059669' });
      if (priTaxableFixed + priTaxFreeFixed > 0) links.push({ sourceId: 'pri_fixed', targetId: 'pri_retire_hub', amount: priTaxableFixed + priTaxFreeFixed, color: '#0d9488' });
      if (priPensionDrawdownTotal > 0) links.push({ sourceId: 'pri_pension_dd', targetId: 'pri_retire_hub', amount: priPensionDrawdownTotal, color: '#10b981' });
      if (priIsaDrawdown > 0) links.push({ sourceId: 'pri_isa_dd', targetId: 'pri_retire_hub', amount: priIsaDrawdown, color: '#6366f1' });
      if (priCashDrawdown > 0) links.push({ sourceId: 'pri_cash_dd', targetId: 'pri_retire_hub', amount: priCashDrawdown, color: '#f59e0b' });
      if (priLifeEventsInc > 0) links.push({ sourceId: 'pri_life_events', targetId: 'pri_retire_hub', amount: priLifeEventsInc, color: '#06b6d4' });
      if (priDownsizeInc > 0) links.push({ sourceId: 'pri_downsize', targetId: 'pri_retire_hub', amount: priDownsizeInc, color: '#d97706' });

      nodes.push({
        id: 'part_retire_hub',
        label: `${partnerName} Gross Inflows`,
        sublabel: `Total Inflows (Age ${partnerAge})`,
        amount: partGrossTotal,
        color: '#6366f1',
        category: 'hub',
        column: 1,
      });
      if (partStatePension > 0) links.push({ sourceId: 'part_state_pension', targetId: 'part_retire_hub', amount: partStatePension, color: '#a855f7' });
      if (partDbPension > 0) links.push({ sourceId: 'part_db_pension', targetId: 'part_retire_hub', amount: partDbPension, color: '#38bdf8' });
      if (partAnnuity > 0) links.push({ sourceId: 'part_annuity', targetId: 'part_retire_hub', amount: partAnnuity, color: '#f472b6' });
      if (partTaxableFixed + partTaxFreeFixed > 0) links.push({ sourceId: 'part_fixed', targetId: 'part_retire_hub', amount: partTaxableFixed + partTaxFreeFixed, color: '#2dd4bf' });
      if (partPensionDrawdownTotal > 0) links.push({ sourceId: 'part_pension_dd', targetId: 'part_retire_hub', amount: partPensionDrawdownTotal, color: '#34d399' });
      if (partIsaDrawdown > 0) links.push({ sourceId: 'part_isa_dd', targetId: 'part_retire_hub', amount: partIsaDrawdown, color: '#818cf8' });
      if (partCashDrawdown > 0) links.push({ sourceId: 'part_cash_dd', targetId: 'part_retire_hub', amount: partCashDrawdown, color: '#fbbf24' });
      if (partDownsizeInc > 0) links.push({ sourceId: 'part_downsize', targetId: 'part_retire_hub', amount: partDownsizeInc, color: '#d97706' });

      // Column 2: Tax Deductions & Spendable Hubs
      if (priTaxPaid > 0) {
        nodes.push({
          id: 'pri_income_tax_decum',
          label: `${primaryName} HMRC Tax`,
          sublabel: `${((priTaxPaid / Math.max(1, priGrossTotal)) * 100).toFixed(1)}% tax rate`,
          amount: priTaxPaid,
          color: '#ef4444',
          category: 'deduction',
          column: 2,
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
        });
        if (priEssential > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'essential_retirement_spend', amount: priEssential, color: '#059669' });
        if (partEssential > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'essential_retirement_spend', amount: partEssential, color: '#10b981' });
      }

      if (lifeEventsExpense > 0) {
        nodes.push({
          id: 'life_events_expense',
          label: 'Life Events Capital',
          sublabel: p.decumulationLifeEventsSummary || 'One-off capital expenses',
          amount: lifeEventsExpense,
          color: '#f59e0b',
          category: 'allocation',
          column: 3,
        });
        const priLifeEventsAlloc = totalSpendable > 0 ? (priSpendable / totalSpendable) * lifeEventsExpense : 0;
        const partLifeEventsAlloc = totalSpendable > 0 ? (partSpendable / totalSpendable) * lifeEventsExpense : 0;
        if (priLifeEventsAlloc > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'life_events_expense', amount: priLifeEventsAlloc, color: '#f59e0b' });
        if (partLifeEventsAlloc > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'life_events_expense', amount: partLifeEventsAlloc, color: '#fbbf24' });
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
        });
        if (priReinvest > 0) links.push({ sourceId: 'pri_net_spendable', targetId: 'reinvested_surplus', amount: priReinvest, color: '#a855f7' });
        if (partReinvest > 0) links.push({ sourceId: 'part_net_spendable', targetId: 'reinvested_surplus', amount: partReinvest, color: '#c084fc' });
      }

      return {
        age: p.age,
        year: p.year,
        isRetired: true,
        viewMode: 'split',
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
    let statePension = p.statePensionReceived || 0;
    let dbPension = p.dbPensionIncomeReceived || 0;
    let annuity = p.annuityIncomeReceived || 0;
    let giltLadder = p.giltLadderIncomeReceived || 0;
    let taxableFixed = p.taxableFixedIncomeReceived || 0;
    let taxFreeFixed = p.taxFreeFixedIncomeReceived || 0;
    let pensionDrawdownTaxable = p.pensionDrawdownTaxable || 0;
    let pensionDrawdownTaxFree = p.pensionDrawdownTaxFree || 0;
    let pensionDrawdownTotal = p.pensionDrawdown || (pensionDrawdownTaxable + pensionDrawdownTaxFree);
    let isaDrawdown = p.isaDrawdown || 0;
    let cashDrawdown = p.cashDrawdown || 0;
    let lifeEventsInc = p.lifeEventsIncome || 0;
    let downsizeInc = p.propertyDownsizeEquityReleased || 0;
    let totalTaxPaid = p.totalTaxPaid || 0;
    let netRetirementIncome = p.netRetirementIncome || 0;
    let shortfall = p.incomeShortfall || 0;

    if (isCouple) {
      if (activeViewMode === 'primary') {
        statePension = priStatePension;
        dbPension = priDbPension;
        annuity = priAnnuity;
        giltLadder = priGiltLadder;
        taxableFixed = priTaxableFixed;
        taxFreeFixed = priTaxFreeFixed;
        pensionDrawdownTaxable = priPensionDrawdownTaxable;
        pensionDrawdownTaxFree = priPensionDrawdownTaxFree;
        pensionDrawdownTotal = priPensionDrawdownTotal;
        isaDrawdown = priIsaDrawdown;
        cashDrawdown = priCashDrawdown;
        lifeEventsInc = priLifeEventsInc;
        downsizeInc = priDownsizeInc;
        totalTaxPaid = priTaxPaid;
        netRetirementIncome = priNetTotal;
      } else if (activeViewMode === 'partner') {
        statePension = partStatePension;
        dbPension = partDbPension;
        annuity = partAnnuity;
        giltLadder = 0;
        taxableFixed = partTaxableFixed;
        taxFreeFixed = partTaxFreeFixed;
        pensionDrawdownTaxable = partPensionDrawdownTaxable;
        pensionDrawdownTaxFree = partPensionDrawdownTaxFree;
        pensionDrawdownTotal = partPensionDrawdownTotal;
        isaDrawdown = partIsaDrawdown;
        cashDrawdown = partCashDrawdown;
        lifeEventsInc = partLifeEventsInc;
        downsizeInc = partDownsizeInc;
        totalTaxPaid = partTaxPaid;
        netRetirementIncome = partNetTotal;
      }
    }

    const totalGrossRetirementInflows =
      statePension +
      dbPension +
      annuity +
      giltLadder +
      taxableFixed +
      taxFreeFixed +
      pensionDrawdownTotal +
      isaDrawdown +
      cashDrawdown +
      downsizeInc +
      lifeEventsInc;

    const personMortgageShare = (isCouple && (activeViewMode === 'primary' || activeViewMode === 'partner'))
      ? mortgagePaymentAnnual * 0.5
      : mortgagePaymentAnnual;
    const mortgageAlloc = Math.min(netRetirementIncome, personMortgageShare);
    const spendableAfterMortgage = Math.max(0, netRetirementIncome - mortgageAlloc);

    const annualExcess = activeViewMode === 'combined'
      ? ((p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0))
      : (isCouple ? (((p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0)) * 0.5) : ((p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0)));
    let reinvestSurplus = Math.min(spendableAfterMortgage, annualExcess);
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
        color: '#8b5cf6',
        category: 'source',
        column: 0,
      });
    }
    if (dbPension > 0) {
      nodes.push({
        id: 'db_pension',
        label: activeViewMode !== 'combined' ? `${currentPersonName} DB Pension` : 'Defined Benefit (DB) Pension',
        sublabel: 'Final/Average Salary Scheme',
        amount: dbPension,
        color: '#0284c7',
        category: 'source',
        column: 0,
      });
    }
    if (annuity > 0) {
      nodes.push({
        id: 'annuity_income',
        label: activeViewMode !== 'combined' ? `${currentPersonName} Annuity` : 'Lifetime Annuity Income',
        sublabel: 'Guaranteed Lifetime Floor',
        amount: annuity,
        color: '#ec4899',
        category: 'source',
        column: 0,
      });
    }
    if (giltLadder > 0) {
      nodes.push({
        id: 'gilt_ladder_income',
        label: activeViewMode !== 'combined' ? `${currentPersonName} Gilt Ladder` : 'UK Gilt Ladder Income',
        sublabel: 'Maturing Gilts & Net Coupons',
        amount: giltLadder,
        color: '#059669',
        category: 'source',
        column: 0,
      });
    }
    if (taxableFixed + taxFreeFixed > 0) {
      nodes.push({
        id: 'fixed_other_income',
        label: activeViewMode !== 'combined' ? `${currentPersonName} Fixed Incomes` : 'Other Fixed Incomes',
        sublabel: 'Property, PIP, Royalties, etc.',
        amount: taxableFixed + taxFreeFixed,
        color: '#0d9488',
        category: 'source',
        column: 0,
      });
    }
    if (pensionDrawdownTotal > 0) {
      nodes.push({
        id: 'pension_drawdown',
        label: activeViewMode !== 'combined' ? `${currentPersonName} Pension Drawdown` : 'Private Pension / SIPP Drawdown',
        sublabel: `Taxable: ${formatGBP(pensionDrawdownTaxable)} | Tax-Free: ${formatGBP(pensionDrawdownTaxFree)}`,
        amount: pensionDrawdownTotal,
        color: '#10b981',
        category: 'source',
        column: 0,
      });
    }
    if (isaDrawdown > 0) {
      nodes.push({
        id: 'isa_drawdown',
        label: activeViewMode !== 'combined' ? `${currentPersonName} ISA Drawdown` : 'Tax-Free ISA Drawdown',
        sublabel: 'Stocks & Shares / Cash ISA',
        amount: isaDrawdown,
        color: '#6366f1',
        category: 'source',
        column: 0,
      });
    }
    if (cashDrawdown > 0) {
      nodes.push({
        id: 'cash_drawdown',
        label: activeViewMode !== 'combined' ? `${currentPersonName} Cash/GIA Drawdown` : 'Cash & GIA Capital Drawdown',
        sublabel: 'Cash Buffer & Unsheltered Pot',
        amount: cashDrawdown,
        color: '#f59e0b',
        category: 'source',
        column: 0,
      });
    }
    if (lifeEventsInc > 0) {
      nodes.push({
        id: 'life_events_inflow',
        label: 'Life Events & Capital Inflow',
        sublabel: p.decumulationLifeEventsSummary || 'Downsizing, Inheritance, Sale',
        amount: lifeEventsInc,
        color: '#06b6d4',
        category: 'source',
        column: 0,
      });
    }
    if (downsizeInc > 0) {
      nodes.push({
        id: 'downsize_equity',
        label: 'Right-Sizing Equity',
        sublabel: 'Equity released from home',
        amount: downsizeInc,
        color: '#d97706',
        category: 'source',
        column: 0,
      });
    }

    // Column 1 Hub: Gross Hub
    nodes.push({
      id: 'gross_retire_hub',
      label: activeViewMode === 'combined' ? 'Total Gross Inflow' : `${currentPersonName} Gross Inflow`,
      sublabel: 'Sum of pensions, annuities & drawdowns',
      amount: totalGrossRetirementInflows,
      color: '#3b82f6',
      category: 'hub',
      column: 1,
    });
    if (statePension > 0) links.push({ sourceId: 'state_pension', targetId: 'gross_retire_hub', amount: statePension, color: '#8b5cf6' });
    if (dbPension > 0) links.push({ sourceId: 'db_pension', targetId: 'gross_retire_hub', amount: dbPension, color: '#0284c7' });
    if (annuity > 0) links.push({ sourceId: 'annuity_income', targetId: 'gross_retire_hub', amount: annuity, color: '#ec4899' });
    if (giltLadder > 0) links.push({ sourceId: 'gilt_ladder_income', targetId: 'gross_retire_hub', amount: giltLadder, color: '#059669' });
    if (taxableFixed + taxFreeFixed > 0) links.push({ sourceId: 'fixed_other_income', targetId: 'gross_retire_hub', amount: taxableFixed + taxFreeFixed, color: '#0d9488' });
    if (pensionDrawdownTotal > 0) links.push({ sourceId: 'pension_drawdown', targetId: 'gross_retire_hub', amount: pensionDrawdownTotal, color: '#10b981' });
    if (isaDrawdown > 0) links.push({ sourceId: 'isa_drawdown', targetId: 'gross_retire_hub', amount: isaDrawdown, color: '#6366f1' });
    if (cashDrawdown > 0) links.push({ sourceId: 'cash_drawdown', targetId: 'gross_retire_hub', amount: cashDrawdown, color: '#f59e0b' });
    if (lifeEventsInc > 0) links.push({ sourceId: 'life_events_inflow', targetId: 'gross_retire_hub', amount: lifeEventsInc, color: '#06b6d4' });
    if (downsizeInc > 0) links.push({ sourceId: 'downsize_equity', targetId: 'gross_retire_hub', amount: downsizeInc, color: '#d97706' });

    // Column 2: Tax Deductions
    if (totalTaxPaid > 0) {
      nodes.push({
        id: 'tax_deduction',
        label: isCouple && activeViewMode === 'combined' ? 'HMRC Income Tax (Both)' : 'HMRC Income Tax',
        sublabel: `${((totalTaxPaid / Math.max(1, totalGrossRetirementInflows)) * 100).toFixed(1)}% effective tax rate`,
        amount: totalTaxPaid,
        color: '#ef4444',
        category: 'deduction',
        column: 2,
      });
      links.push({ sourceId: 'gross_retire_hub', targetId: 'tax_deduction', amount: totalTaxPaid, color: '#ef4444' });
    }

    // Column 2 Hub: Net Spendable
    nodes.push({
      id: 'net_spendable_hub',
      label: activeViewMode === 'combined' ? 'Net Spendable Income' : `${currentPersonName} Net Spendable`,
      sublabel: 'Post-tax usable retirement cashflow',
      amount: netRetirementIncome,
      color: '#10b981',
      category: 'hub',
      column: 2,
    });
    links.push({ sourceId: 'gross_retire_hub', targetId: 'net_spendable_hub', amount: netRetirementIncome, color: '#10b981' });

    // Column 3 Allocations
    if (mortgageAlloc > 0) {
      nodes.push({
        id: 'retirement_mortgage',
        label: isCouple && activeViewMode !== 'combined' ? 'Mortgage Share Payment' : 'Ongoing Mortgage Payment',
        sublabel: 'Active mortgage term in retirement',
        amount: mortgageAlloc,
        color: '#0ea5e9',
        category: 'allocation',
        column: 3,
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
        color: '#059669',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_spendable_hub', targetId: 'essential_retirement_spend', amount: essentialLiving, color: '#059669' });
    }
    if (discretionaryLiving > 0) {
      nodes.push({
        id: 'discretionary_retirement_spend',
        label: isCouple && activeViewMode !== 'combined' ? 'Discretionary Lifestyle Share' : 'Discretionary Lifestyle Spend',
        sublabel: 'Surplus for leisure, dining, travel & gifts',
        amount: discretionaryLiving,
        color: '#ec4899',
        category: 'allocation',
        column: 3,
      });
      links.push({ sourceId: 'net_spendable_hub', targetId: 'discretionary_retirement_spend', amount: discretionaryLiving, color: '#ec4899' });
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
      });
      links.push({ sourceId: 'net_spendable_hub', targetId: 'reinvested_surplus', amount: reinvestSurplus, color: '#a855f7' });
    }

    return {
      age: p.age,
      year: p.year,
      isRetired: true,
      viewMode: activeViewMode,
      totalGross: totalGrossRetirementInflows,
      totalTaxes: totalTaxPaid,
      totalNetIncome: netRetirementIncome,
      totalAllocated: totalGrossRetirementInflows,
      nodes,
      links,
      metrics: {
        taxRateEffective: totalGrossRetirementInflows > 0 ? (totalTaxPaid / totalGrossRetirementInflows) * 100 : 0,
        guaranteedFloor: statePension + dbPension + annuity + giltLadder,
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
}

// Compute 2D coordinate layout for PDF or SVG rendering
export function computeSankeyLayout(
  flowData: CashFlowSankeyData,
  boxWidth: number = 960,
  boxHeight: number = 480,
  paddingX: number = 40,
  paddingY: number = 30,
  nodeWidth: number = 24,
  customMinNodeHeight?: number,
  customGap?: number
): SvgLayoutData | null {
  if (!flowData || flowData.nodes.length === 0) return null;

  // Group nodes by column (0, 1, 2, 3)
  const columns: FlowNode[][] = [[], [], [], []];
  flowData.nodes.forEach((node) => {
    if (columns[node.column]) {
      columns[node.column].push(node);
    }
  });

  const colXPositions = [
    paddingX,
    paddingX + (boxWidth - 2 * paddingX) * 0.30,
    paddingX + (boxWidth - 2 * paddingX) * 0.62,
    boxWidth - paddingX - nodeWidth,
  ];

  // Compute max column total
  const colTotals = columns.map((col) => col.reduce((sum, n) => sum + n.amount, 0));
  const maxColTotal = Math.max(...colTotals, 1);

  const availableHeight = boxHeight - 2 * paddingY;
  const minNodeHeight = customMinNodeHeight ?? Math.max(4, Math.round(boxHeight * 0.035));
  const gap = customGap ?? Math.max(2.5, Math.round(boxHeight * 0.025));

  // Calculate Y positions for nodes in each column
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number; node: FlowNode }>();

  columns.forEach((col, colIdx) => {
    const colTotal = colTotals[colIdx];
    const gapCount = Math.max(0, col.length - 1);
    const totalGaps = gapCount * gap;
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

      curY += nodeH + gap;
    });
  });

  // Calculate link ribbons with smooth cubic bezier curves
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
      coords: {
        x0,
        y0,
        x1,
        y3,
        y2,
        y1,
        dx,
      },
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    width: boxWidth,
    height: boxHeight,
    nodePositions: Array.from(nodePositions.values()),
    linkPaths,
  };
}

// Convert hex color to RGB tuple
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [100, 116, 139];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
