import { UserProfile, InvestmentPots, PlannerScenario, PotReturnOverrides, MortgageDebtConfig } from '../types';

export const DEFAULT_PARTNER_POTS: InvestmentPots = {
  // Pension
  workplacePensionBalance: 25000,
  workplacePensionMonthlyEmployee: 0,
  workplacePensionMonthlyEmployeeType: 'percent',
  employerMatchPercentage: 0,
  sippBalance: 10000,
  sippMonthlyContribution: 0,

  // ISA
  stocksAndSharesIsaBalance: 15000,
  stocksAndSharesIsaMonthlyContribution: 0,
  cashIsaBalance: 5000,
  cashIsaMonthlyContribution: 0,
  lisaBalance: 0,
  lisaMonthlyContribution: 0,

  // GIA & Cash
  giaBalance: 0,
  giaMonthlyContribution: 0,
  cashSavingsBalance: 5000,
  cashSavingsMonthlyContribution: 0,
};

export const DEFAULT_IHT_SETTINGS = {
  primaryResidenceValue: 450000,
  annualPropertyGrowthPercent: 3.0,
  otherTaxableAssets: 50000,
  includePensionsInEstate: true,
  passMainResidenceToDescendants: true,
  annualGiftingStrategy: 3000,
  nonPensionBeneficiary: 'spouse' as const,
  charityGiftingPercent: 0,
  businessReliefAssets: 0,
  businessReliefExemptionPercent: 50,
  lifeInsuranceInTrust: 0,
  petGifts: [],
};

export const DEFAULT_CUSTOM_TAX_BANDS = {
  enabled: false,
  personalAllowance: 12570,
  paTaperThreshold: 100000,
  basicRatePercent: 20,
  basicRateThreshold: 37700,
  higherRatePercent: 40,
  higherRateThreshold: 125140,
  additionalRatePercent: 45,

  pensionAnnualAllowance: 60000,
  isaAnnualAllowance: 20000,

  scotStarterRatePercent: 19,
  scotStarterThreshold: 2306,
  scotBasicRatePercent: 20,
  scotBasicThreshold: 13991,
  scotIntermediateRatePercent: 21,
  scotIntermediateThreshold: 31092,
  scotHigherRatePercent: 42,
  scotHigherThreshold: 62430,
  scotAdvancedRatePercent: 45,
  scotAdvancedThreshold: 125140,
  scotTopRatePercent: 48,
};

export const DEFAULT_POT_RETURN_OVERRIDES: PotReturnOverrides = {
  enabled: false,
  workplacePensionReturn: 7.0,
  sippReturn: 7.5,
  stocksAndSharesIsaReturn: 7.5,
  cashIsaReturn: 4.2,
  lisaReturn: 6.5,
  giaReturn: 6.5,
  cashSavingsReturn: 3.5,
};

export const DEFAULT_ASSET_ALLOCATION_SPLIT = {
  enabled: false,
  accumulation: { equity: 80, bond: 15, cash: 5 },
  decumulation: { equity: 40, bond: 50, cash: 10 },
  assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
};

export const DEFAULT_MORTGAGE: MortgageDebtConfig = {
  enabled: true,
  propertyName: 'Primary Residence',
  propertyValue: 450000,
  currentBalance: 220000,
  interestRatePercent: 4.5,
  remainingTermYears: 20,
  remainingTermMonths: 0,
  repaymentType: 'repayment',
  regularMonthlyOverpayment: 150,
  lumpSumOverpayments: [],
  payoffAtRetirement: false,
  payoffSourcePot: 'pension_lump_sum',
  deductFromRetirementIncome: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  dateOfBirth: '1989-06-15', // Currently ~35 years old
  currentAge: 35,
  targetRetirementAge: 60,
  lifeExpectancyAge: 90,
  statePensionAge: 67,
  includeStatePension: true,
  enableTripleLock: true,
  statePensionAmountAnnual: 12547.6,
  fullStatePensionAmount: 12547.6,
  qualifyingYears: 35, // 2026/27 full new State Pension (£241.30/wk) // 2024/25 full new State Pension
  grossAnnualSalary: 65000,

  // Couple Planning Defaults
  isCouplePlanning: false,
  partnerName: 'Partner',
  partnerDateOfBirth: '1989-06-15',
  partnerCurrentAge: 35,
  partnerTargetRetirementAge: 60,
  partnerStatePensionAge: 67,
  partnerIncludeStatePension: true,
  partnerEnableTripleLock: true,
  partnerStatePensionAmountAnnual: 12547.6,
  partnerFullStatePensionAmount: 12547.6,
  partnerQualifyingYears: 35,
  partnerGrossAnnualSalary: 35000,
  partnerWorkplacePensionBalance: 25000,
  partnerSippBalance: 10000,
  partnerIsaBalance: 15000,
  partnerPots: DEFAULT_PARTNER_POTS,

  taxRegion: 'england_ni_wales',
  customTaxBands: DEFAULT_CUSTOM_TAX_BANDS,
  pensionContributionMethod: 'salary_sacrifice',
  targetRetirementIncomeAnnual: 32000, // in today's money
  spendingPhases: {
    enabled: false,
    goGoEndAge: 74,
    goGoIncomeAnnual: 35000,
    slowGoEndAge: 84,
    slowGoIncomeAnnual: 28000,
    noGoIncomeAnnual: 22000,
  },
  expectedInflationRate: 2.5,
  adjustForInflation: false,
  indexTaxBands: true,
  expectedInvestmentReturn: 6.5,
  postRetirementReturn: 4.5,
  pclsLumpSumPercent: 25,
  takeLumpSumAtStart: false,
  lumpSumTiming: 'access_age',
  lsaProtectionType: 'standard',
  customLsaAllowance: 268275,
  protectedPensionAccessAge: undefined,
  drawdownStrategy: 'isa_first',
  incomeProductOption: 'flexi_drawdown',
  annuityAllocationPercent: 50,
  annuityType: 'inflation_linked_single',
  annuityRatePercent: 4.2,
  annuityDurationOption: 'lifetime',
  annuityDurationUntilAge: 75,
  annuityTranches: [],
  partnerIncomeProductOption: 'flexi_drawdown',
  partnerAnnuityAllocationPercent: 50,
  partnerAnnuityType: 'inflation_linked_single',
  partnerAnnuityRatePercent: 4.2,
  partnerAnnuityDurationOption: 'lifetime',
  partnerAnnuityDurationUntilAge: 75,
  partnerAnnuityTranches: [],
  dbPensions: [],
  fixedIncomeStreams: [],
  oneOffContributions: [],
  decumulationLifeEvents: [],
  ihtSettings: DEFAULT_IHT_SETTINGS,
  potReturnOverrides: DEFAULT_POT_RETURN_OVERRIDES,
  mortgage: DEFAULT_MORTGAGE,
  assetAllocationSplit: DEFAULT_ASSET_ALLOCATION_SPLIT,
};

export const DEFAULT_POTS: InvestmentPots = {
  // Pension
  workplacePensionBalance: 45000,
  workplacePensionMonthlyEmployee: 0,
  workplacePensionMonthlyEmployeeType: 'percent',
  employerMatchPercentage: 0,
  sippBalance: 15000,
  sippMonthlyContribution: 0,

  // ISA
  stocksAndSharesIsaBalance: 25000,
  stocksAndSharesIsaMonthlyContribution: 0,
  cashIsaBalance: 8000,
  cashIsaMonthlyContribution: 0,
  lisaBalance: 4000,
  lisaMonthlyContribution: 0,

  // GIA & Cash
  giaBalance: 0,
  giaMonthlyContribution: 0,
  cashSavingsBalance: 12000,
  cashSavingsMonthlyContribution: 0,
};

export const PRESET_SCENARIOS: PlannerScenario[] = [
  {
    id: 'preset_standard',
    name: 'Balanced Mid-Career (£65k Salary)',
    updatedAt: new Date().toISOString(),
    profile: DEFAULT_PROFILE,
    pots: DEFAULT_POTS,
  },
  {
    id: 'preset_tax_trap',
    name: 'High Earner (£115k Tax Trap Escape)',
    updatedAt: new Date().toISOString(),
    profile: {
      ...DEFAULT_PROFILE,
      dateOfBirth: '1982-03-20',
      currentAge: 42,
      targetRetirementAge: 57,
      grossAnnualSalary: 115000,
      pensionContributionMethod: 'salary_sacrifice',
      targetRetirementIncomeAnnual: 48000,
      lsaProtectionType: 'standard',
    },
    pots: {
      ...DEFAULT_POTS,
      workplacePensionBalance: 120000,
      workplacePensionMonthlyEmployee: 0,
      employerMatchPercentage: 0,
      sippBalance: 35000,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaBalance: 65000,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashSavingsBalance: 25000,
    },
  },
  {
    id: 'preset_young_starter',
    name: 'Early Career Starter (£38k Salary)',
    updatedAt: new Date().toISOString(),
    profile: {
      ...DEFAULT_PROFILE,
      dateOfBirth: '1998-11-10',
      currentAge: 26,
      targetRetirementAge: 62,
      grossAnnualSalary: 38000,
      targetRetirementIncomeAnnual: 26000,
    },
    pots: {
      ...DEFAULT_POTS,
      workplacePensionBalance: 12000,
      workplacePensionMonthlyEmployee: 0,
      employerMatchPercentage: 0,
      sippBalance: 0,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaBalance: 8000,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaBalance: 3000,
      cashIsaMonthlyContribution: 0,
      lisaBalance: 4000,
      lisaMonthlyContribution: 0,
      cashSavingsBalance: 6000,
    },
  },
];

export function sanitizePots(
  pots?: Partial<InvestmentPots> | null,
  defaultFallback: InvestmentPots = DEFAULT_POTS
): InvestmentPots {
  if (!pots || typeof pots !== 'object') return { ...defaultFallback };
  return {
    workplacePensionBalance: Number(pots.workplacePensionBalance ?? defaultFallback.workplacePensionBalance) || 0,
    workplacePensionMonthlyEmployee: Number(pots.workplacePensionMonthlyEmployee ?? defaultFallback.workplacePensionMonthlyEmployee) || 0,
    workplacePensionMonthlyEmployeeType: pots.workplacePensionMonthlyEmployeeType || defaultFallback.workplacePensionMonthlyEmployeeType || 'percent',
    employerMatchPercentage: Number(pots.employerMatchPercentage ?? defaultFallback.employerMatchPercentage) || 0,
    sippBalance: Number(pots.sippBalance ?? defaultFallback.sippBalance) || 0,
    sippMonthlyContribution: Number(pots.sippMonthlyContribution ?? defaultFallback.sippMonthlyContribution) || 0,
    stocksAndSharesIsaBalance: Number(pots.stocksAndSharesIsaBalance ?? defaultFallback.stocksAndSharesIsaBalance) || 0,
    stocksAndSharesIsaMonthlyContribution: Number(pots.stocksAndSharesIsaMonthlyContribution ?? defaultFallback.stocksAndSharesIsaMonthlyContribution) || 0,
    cashIsaBalance: Number(pots.cashIsaBalance ?? defaultFallback.cashIsaBalance) || 0,
    cashIsaMonthlyContribution: Number(pots.cashIsaMonthlyContribution ?? defaultFallback.cashIsaMonthlyContribution) || 0,
    lisaBalance: Number(pots.lisaBalance ?? defaultFallback.lisaBalance) || 0,
    lisaMonthlyContribution: Number(pots.lisaMonthlyContribution ?? defaultFallback.lisaMonthlyContribution) || 0,
    giaBalance: Number(pots.giaBalance ?? defaultFallback.giaBalance) || 0,
    giaMonthlyContribution: Number(pots.giaMonthlyContribution ?? defaultFallback.giaMonthlyContribution) || 0,
    cashSavingsBalance: Number(pots.cashSavingsBalance ?? defaultFallback.cashSavingsBalance) || 0,
    cashSavingsMonthlyContribution: Number(pots.cashSavingsMonthlyContribution ?? defaultFallback.cashSavingsMonthlyContribution) || 0,
  };
}

export function sanitizeProfile(profile?: Partial<UserProfile> | null): UserProfile {
  const base = { ...DEFAULT_PROFILE, ...(profile || {}) };

  // Calculate State Pension dynamically from qualifying years (max 35 years = £12,547.60, min 10 years required)
  const fullSpPrimary = base.fullStatePensionAmount ?? 12547.60;
  const qYears = base.qualifyingYears ?? 35;
  const computedSp = qYears >= 10 ? Math.round((Math.min(35, Math.max(0, qYears)) / 35) * fullSpPrimary * 100) / 100 : 0;

  const fullSpPartner = base.partnerFullStatePensionAmount ?? 12547.60;
  const partnerQYears = base.partnerQualifyingYears ?? 35;
  const computedPartnerSp = partnerQYears >= 10 ? Math.round((Math.min(35, Math.max(0, partnerQYears)) / 35) * fullSpPartner * 100) / 100 : 0;

  const tripleLockVal = base.enableTripleLock ?? true;
  return {
    ...base,
    enableTripleLock: tripleLockVal,
    partnerEnableTripleLock: base.partnerEnableTripleLock ?? tripleLockVal,
    qualifyingYears: qYears,
    fullStatePensionAmount: fullSpPrimary,
    statePensionAmountAnnual: qYears < 10 ? 0 : (base.statePensionAmountAnnual ?? computedSp),
    partnerQualifyingYears: partnerQYears,
    partnerFullStatePensionAmount: fullSpPartner,
    partnerStatePensionAmountAnnual: partnerQYears < 10 ? 0 : (base.partnerStatePensionAmountAnnual ?? computedPartnerSp),
    partnerPots: sanitizePots(base.partnerPots, DEFAULT_PARTNER_POTS),
    mortgage: {
      ...DEFAULT_MORTGAGE,
      ...(base.mortgage || {}),
    },
  };
}


export const ZERO_POTS: InvestmentPots = {
  workplacePensionBalance: 0,
  workplacePensionMonthlyEmployee: 0,
  workplacePensionMonthlyEmployeeType: 'percent',
  employerMatchPercentage: 0,
  sippBalance: 0,
  sippMonthlyContribution: 0,
  stocksAndSharesIsaBalance: 0,
  stocksAndSharesIsaMonthlyContribution: 0,
  cashIsaBalance: 0,
  cashIsaMonthlyContribution: 0,
  lisaBalance: 0,
  lisaMonthlyContribution: 0,
  giaBalance: 0,
  giaMonthlyContribution: 0,
  cashSavingsBalance: 0,
  cashSavingsMonthlyContribution: 0,
};

export function createBlankScenario(id: string, name: string): PlannerScenario {
  return {
    id,
    name,
    updatedAt: new Date().toISOString(),
    profile: {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 0,
      targetRetirementIncomeAnnual: 0,
      qualifyingYears: 0,
      statePensionAmountAnnual: 0,
      partnerGrossAnnualSalary: 0,
      partnerQualifyingYears: 0,
      partnerStatePensionAmountAnnual: 0,
      partnerWorkplacePensionBalance: 0,
      partnerSippBalance: 0,
      partnerIsaBalance: 0,
      partnerPots: ZERO_POTS,
      dbPensions: [],
      fixedIncomeStreams: [],
      oneOffContributions: [],
    },
    pots: ZERO_POTS,
  };
}














