export type UKTaxRegion = 'england_ni_wales' | 'scotland';

export type AppMode = 'basic' | 'advanced';

export type ContributionMethod = 'salary_sacrifice' | 'relief_at_source' | 'net_pay';

export type LsaProtectionType =
  | 'standard'
  | 'fixed_2014'
  | 'fixed_2016'
  | 'individual_2014'
  | 'individual_2016'
  | 'custom';

export type IncomeProductOption = 'flexi_drawdown' | 'annuity' | 'hybrid';

export type AnnuityType =
  | 'level_single'
  | 'inflation_linked_single'
  | 'level_joint'
  | 'inflation_linked_joint';

export type AnnuityDurationOption = 'lifetime' | 'until_age';

export type ExcessReinvestOption =
  | 'none'
  | 'cash'
  | 'isa'
  | 'stocks_and_shares_isa'
  | 'cash_isa'
  | 'gia'
  | 'cash_savings';

export interface AnnuityTranche {
  id: string;
  name?: string;
  owner?: ItemOwner; // 'primary' | 'partner'
  purchaseAge: number; // Age when annuity is bought (e.g. 60, 65, 70)
  allocationPercent: number; // % of remaining pension pot at purchase age
  annuityRatePercent: number; // e.g. 6.0%
  annuityType: AnnuityType;
  durationOption: AnnuityDurationOption; // 'lifetime' or 'until_age'
  durationUntilAge?: number; // e.g. 75
  enabled: boolean;
}

export type ItemOwner = 'primary' | 'partner';

export interface FixedIncomeStream {
  id: string;
  name: string;
  owner?: ItemOwner; // 'primary' | 'partner'
  type: 'taxable' | 'tax_free'; // taxable (e.g. rental/consulting) vs tax-free (e.g. PIP/disability)
  annualAmount: number; // £/year at start age
  startAge: number;
  endAge?: number; // Optional end age (e.g. age 75 or ongoing if empty/undefined)
  inflationLinked: boolean;
  enabled: boolean;
}

export type DbDurationOption = 'lifetime' | 'until_age';

export type DbPensionTargetPot = 'cash_savings' | 'cash_isa' | 'stocks_and_shares_isa' | 'gia' | 'lisa' | 'spend_clear_debt';

export type LumpSumTargetPot = 'stocks_and_shares_isa' | 'cash_isa' | 'cash_savings' | 'gia' | 'spend_clear_debt' | 'split';

export interface LumpSumSplit {
  id: string;
  pot: 'stocks_and_shares_isa' | 'cash_isa' | 'cash_savings' | 'gia' | 'spend_clear_debt';
  mode: 'percentage' | 'amount';
  value: number;
}

export interface DbPension {
  id: string;
  name: string;
  owner?: ItemOwner; // 'primary' | 'partner'
  startAge: number;
  durationOption?: DbDurationOption; // 'lifetime' (default) or 'until_age'
  endAge?: number; // Optional age when DB pension stops (if until_age selected)
  annualIncome: number; // £/year at start age
  taxFreeLumpSum: number; // £ tax-free cash paid at start age
  targetPot?: DbPensionTargetPot;
  inflationLinked: boolean;
  enabled: boolean;
}

export type InvestmentPotType = 
  | 'workplace_pension'
  | 'sipp'
  | 'stocks_and_shares_isa'
  | 'cash_isa'
  | 'lisa'
  | 'gia'
  | 'cash_savings';

export type ContributionFrequency = 'one_off' | 'regular_monthly';

export interface OneOffContribution {
  id: string;
  name: string; // e.g. "Workplace Pension", "SIPP Monthly", "Workplace Bonus", "Property Sale"
  owner?: ItemOwner; // 'primary' | 'partner'
  targetPot: InvestmentPotType;
  frequency?: ContributionFrequency; // 'one_off' (default) | 'regular_monthly'
  grossAmount: number; // Gross lump sum (£) or monthly amount (£/mo)
  date?: string; // Target date for one-off (e.g. '2028-06-15' or YYYY-MM-DD)
  
  // For Regular Monthly Contributions:
  startAge?: number; // e.g. 30
  endAge?: number;   // e.g. 60
  
  // For Workplace Pension Contributions (% vs £):
  workplaceContributionType?: 'percent' | 'fixed'; // 'percent' (default) or 'fixed' (£)
  employeePercent?: number; // e.g. 5 (%)
  employerPercent?: number; // e.g. 3 (%)
  employeeMonthlyAmount?: number; // e.g. £250
  employerMonthlyAmount?: number; // e.g. £150
  
  // For SIPP Pension Contributions (Net out-of-pocket vs Gross into pot):
  sippContributionType?: 'net' | 'gross'; // 'net' (out of pocket + 25% tax relief) or 'gross' (total into pension)

  enabled: boolean;
  description?: string;
}

export type NonPensionPotType = InvestmentPotType;

export type DestinationPotType = InvestmentPotType;

export interface PotTransfer {
  id: string;
  name: string;
  owner?: ItemOwner; // 'primary' | 'partner' (Source pot owner)
  sourcePot: NonPensionPotType;
  destinationOwner?: ItemOwner; // 'primary' | 'partner' (Destination pot owner)
  destinationPot: DestinationPotType;
  amount: number; // £ transfer amount
  transferDate?: string; // Target date e.g. '2028-04-06' or YYYY-MM-DD / year '2028'
  transferAge?: number; // Target age for transfer e.g. 50
  enabled: boolean;
  description?: string;
}

export type LifeEventType = 'income' | 'expense';

export type LifeEventPotTarget = 'cash_savings' | 'stocks_and_shares_isa' | 'cash_isa' | 'sipp' | 'gia';

export interface DecumulationLifeEvent {
  id: string;
  name: string; // e.g. "Property Downsizing Lump Sum", "Inheritance Received", "World Tour Trip", "New Car Purchase", "Home Renovation", "Gift to Children"
  owner?: ItemOwner; // 'primary' | 'partner'
  type: LifeEventType; // 'income' (+ cash added to pot) | 'expense' (- cash drawn from pot)
  amount: number; // £ in today's money
  age: number; // Age when event occurs (e.g. 68)
  targetPot?: LifeEventPotTarget; // Target pot for incoming cash or source pot to draw from
  inflationLinked?: boolean; // Scales with CPI inflation to target age (default true)
  enabled: boolean;
  description?: string;
}

export type InvestmentContribution = OneOffContribution;

export interface SpendingAgeRange {
  id: string;
  name: string; // e.g. "Early Active Retirement", "Mortgage Paid Off", "Late Care / No-Go"
  startAge: number;
  endAge?: number; // undefined or null for ongoing (e.g. 85+)
  annualTargetIncome: number; // £/year in today's money
  description?: string;
}

export interface SpendingPhasesConfig {
  enabled: boolean;
  // Legacy 3-phase fields for backward compatibility
  goGoEndAge?: number;
  goGoIncomeAnnual?: number;
  slowGoEndAge?: number;
  slowGoIncomeAnnual?: number;
  noGoIncomeAnnual?: number;

  // Flexible custom age ranges
  customRanges?: SpendingAgeRange[];
}

export interface MaximizedSpendConfig {
  enabled: boolean;
  targetAnnualIncome: number;
  bridgeAnnualIncome?: number;
  spendingPattern?: 'uniform' | 'proportional_phases' | 'front_loaded';
  targetEndAge?: number;
  targetLegacyBuffer?: number;
  spendingPhases?: SpendingPhasesConfig;
  phaseIncomes?: {
    goGoIncome?: number;
    slowGoIncome?: number;
    noGoIncome?: number;
  };
  baselineTargetAnnualIncome?: number;
  baselineSpendingPhases?: SpendingPhasesConfig;
}

export type DrawdownStrategy =
  | 'isa_first'
  | 'cash_first'
  | 'pension_first'
  | 'pro_rata'
  | 'tax_free_bracket'
  | 'basic_rate_bracket'
  | 'higher_rate_bracket'
  | 'annuity'
  | 'hybrid_annuity';

export interface CustomTaxBandOverrides {
  enabled: boolean;
  personalAllowance: number; // default 12570
  paTaperThreshold: number; // default 100000
  basicRatePercent: number; // default 20 (%)
  basicRateThreshold: number; // default 37700 (taxable band width)
  higherRatePercent: number; // default 40 (%)
  higherRateThreshold: number; // default 125140 (gross limit)
  additionalRatePercent: number; // default 45 (%)

  // Pension & ISA allowance overrides
  pensionAnnualAllowance?: number; // default 60000
  isaAnnualAllowance?: number; // default 20000

  // Optional Scottish tax band overrides
  scotStarterRatePercent?: number; // default 19 (%)
  scotStarterThreshold?: number; // default 2306
  scotBasicRatePercent?: number; // default 20 (%)
  scotBasicThreshold?: number; // default 13991
  scotIntermediateRatePercent?: number; // default 21 (%)
  scotIntermediateThreshold?: number; // default 31092
  scotHigherRatePercent?: number; // default 42 (%)
  scotHigherThreshold?: number; // default 62430
  scotAdvancedRatePercent?: number; // default 45 (%)
  scotAdvancedThreshold?: number; // default 125140
  scotTopRatePercent?: number; // default 48 (%)
}

export interface UserProfile {
  name?: string;
  dateOfBirth: string; // e.g. '1988-05-15'
  currentAge: number;
  targetRetirementAge: number;
  lifeExpectancyAge?: number;
  statePensionAge: number;
  includeStatePension: boolean;
  enableTripleLock?: boolean;
  statePensionAmountAnnual: number;
  fullStatePensionAmount?: number;
  qualifyingYears?: number;
  grossAnnualSalary: number;
  hasTriggeredMpaa?: boolean;
  carryForwardAllowance?: number;

  // Couple / Joint Retirement Planning
  isCouplePlanning?: boolean;
  enableMarriageAllowance?: boolean;
  partnerName?: string;
  partnerDateOfBirth?: string;
  partnerCurrentAge?: number;
  partnerTargetRetirementAge?: number;
  partnerStatePensionAge?: number;
  partnerLifeExpectancyAge?: number;
  partnerIncludeStatePension?: boolean;
  partnerEnableTripleLock?: boolean;
  partnerStatePensionAmountAnnual?: number;
  partnerFullStatePensionAmount?: number;
  partnerQualifyingYears?: number;
  partnerGrossAnnualSalary?: number;
  partnerHasTriggeredMpaa?: boolean;
  partnerCarryForwardAllowance?: number;
  partnerTaxRegion?: UKTaxRegion;
  partnerPensionContributionMethod?: ContributionMethod;
  partnerWorkplacePensionBalance?: number;
  partnerSippBalance?: number;
  partnerIsaBalance?: number;
  partnerPots?: InvestmentPots;

  taxRegion: UKTaxRegion;
  customTaxBands?: CustomTaxBandOverrides;
  pensionContributionMethod: ContributionMethod;
  targetRetirementIncomeAnnual: number; // in today's money
  spendingPhases?: SpendingPhasesConfig; // Go-Go, Slow-Go, No-Go age-based spending requirements
  maximizedSpendConfig?: MaximizedSpendConfig; // Separate income requirement configuration calculated by Max Spend Solver
  expectedInflationRate: number; // percentage e.g. 2.5
  adjustForInflation?: boolean; // Global Real Terms (Today's £) vs Nominal Terms toggle
  indexTaxBands?: boolean; // Index Income Tax bands & Personal Allowance with CPI inflation (default true)
  expectedInvestmentReturn: number; // percentage pre-retirement e.g. 6.5
  postRetirementReturn: number; // percentage post-retirement e.g. 4.5
  
  // Defined Benefit (DB) Pensions
  dbPensions?: DbPension[];

  // Additional Fixed Income Streams (e.g. PIP, Rental Income, Annuities)
  fixedIncomeStreams?: FixedIncomeStream[];

  // One-Off Gross Lump Sum Contributions to Investment Pots
  oneOffContributions?: OneOffContribution[];

  // Investment Pot Transfers (e.g. ISA to SIPP, Bed & ISA, Cross-Spouse Transfers)
  potTransfers?: PotTransfer[];

  // Life Events in Decumulation (One-off planned post-retirement income/expenses e.g. property downsizing, inheritance, buying a car, world trip)
  decumulationLifeEvents?: DecumulationLifeEvent[];

  // Tax-Free Cash (PCLS) & Lump Sum Allowance (LSA)
  pclsLumpSumPercent: number; // Standard 25% or scheme protected %
  takeLumpSumAtStart: boolean; // Take tax-free lump sum upfront or drip feed via UFPLS
  lumpSumTiming?: 'access_age' | 'custom'; // Age timing option: age private pension is accessed vs custom
  lumpSumCustomAge?: number;
  lsaProtectionType: LsaProtectionType;
  customLsaAllowance?: number;
  // Private Pension Access Age (NMPA or Scheme / Protected Age e.g. 50, 55, 57, 58)
  pensionAccessAge?: number;
  protectedPensionAccessAge?: number; // e.g. protected age 50 or 55 override
  lumpSumTargetPot?: LumpSumTargetPot;
  lumpSumSplits?: LumpSumSplit[];

  // Partner Tax-Free Cash (PCLS) & Lump Sum Allowance (LSA)
  partnerPclsLumpSumPercent?: number;
  partnerTakeLumpSumAtStart?: boolean;
  partnerLumpSumTiming?: 'access_age' | 'custom';
  partnerLumpSumCustomAge?: number;
  partnerLsaProtectionType?: LsaProtectionType;
  partnerCustomLsaAllowance?: number;
  partnerPensionAccessAge?: number;
  partnerProtectedPensionAccessAge?: number;
  partnerLumpSumTargetPot?: LumpSumTargetPot;
  partnerLumpSumSplits?: LumpSumSplit[];
  
  // Drawdown & Income Options
  drawdownStrategy: DrawdownStrategy;
  partnerDrawdownStrategy?: DrawdownStrategy;
  incomeProductOption: IncomeProductOption; // 'flexi_drawdown' | 'annuity' | 'hybrid'
  annuityAllocationPercent: number; // % of pension pot used to buy annuity (e.g. 50% or 100%)
  annuityPurchaseAge?: number; // Target age to purchase annuity (defaults to targetRetirementAge or pensionAccessAge)
  annuityType: AnnuityType;
  annuityRatePercent: number; // e.g. 6.0% for level single, 4.0% for inflation-linked
  annuityDurationOption?: AnnuityDurationOption; // 'lifetime' | 'until_age'
  annuityDurationUntilAge?: number; // e.g. 75
  annuityTranches?: AnnuityTranche[]; // Multiple annuity purchases at different ages
  annuityExcessReinvestOption?: ExcessReinvestOption; // 'none' | 'cash' | 'isa'

  // Partner Income Product & Annuity Options
  partnerIncomeProductOption?: IncomeProductOption;
  partnerAnnuityAllocationPercent?: number;
  partnerAnnuityPurchaseAge?: number;
  partnerAnnuityType?: AnnuityType;
  partnerAnnuityRatePercent?: number;
  partnerAnnuityDurationOption?: AnnuityDurationOption;
  partnerAnnuityDurationUntilAge?: number;
  partnerAnnuityTranches?: AnnuityTranche[];
  partnerAnnuityExcessReinvestOption?: ExcessReinvestOption;

  // Inheritance Tax (IHT) & Estate Planning Module Settings
  ihtSettings?: IhtEstateSettings;

  // Pot-Specific Growth Rate Overrides (Custom Yield Per Account Type)
  potReturnOverrides?: PotReturnOverrides;

  // Mortgage & Property Debt Module Settings
  mortgage?: MortgageDebtConfig;

  // Asset Allocation Split for Accumulation & Decumulation
  assetAllocationSplit?: AssetAllocationSplit;

  // Investment, Platform & Adviser Fees (Fee Drag Model)
  investmentFees?: InvestmentFeeConfig;
}

export interface SinglePotFeeConfig {
  platformFeePercent: number; // e.g. 0.25 (%)
  fundFeePercent: number;     // e.g. 0.40 (%) OCF / AMC
  advisorFeePercent: number;  // e.g. 0.00 (%)
}

export interface PerPersonPotFees {
  workplacePension?: SinglePotFeeConfig;
  sipp?: SinglePotFeeConfig;
  stocksAndSharesIsa?: SinglePotFeeConfig;
  cashIsa?: SinglePotFeeConfig;
  gia?: SinglePotFeeConfig;
}

export interface InvestmentFeeConfig {
  enabled: boolean;
  platformFeePercent: number; // e.g. 0.25 (%) global default
  fundFeePercent: number;     // e.g. 0.40 (%) global default OCF / AMC
  advisorFeePercent: number;  // e.g. 0.00 (%) global default

  // Per-pot & per-person granular fee overrides
  perPotFeesEnabled?: boolean;
  primaryPots?: PerPersonPotFees;
  partnerPots?: PerPersonPotFees;
}

export interface AssetAllocationConfig {
  equity: number; // e.g. 80 (%)
  bond: number;   // e.g. 15 (%)
  cash: number;   // e.g. 5 (%)
}

export interface AssetClassReturns {
  equityReturn: number; // e.g. 8.0 (% p.a.)
  bondReturn: number;   // e.g. 4.0 (% p.a.)
  cashReturn: number;   // e.g. 2.0 (% p.a.)
}

export interface AssetAllocationSplit {
  enabled: boolean;
  accumulation: AssetAllocationConfig;
  decumulation: AssetAllocationConfig;
  assetClassReturns: AssetClassReturns;
}

export type MortgageRepaymentType = 'repayment' | 'interest_only';

export interface LumpSumOverpayment {
  id: string;
  name: string;
  age: number; // Age when lump sum paid (e.g. 50 or 55)
  amount: number; // £ lump sum
  source?: 'cash_savings' | 'isa' | 'pension_lump_sum' | 'custom';
  enabled: boolean;
}

export interface MortgageDebtConfig {
  enabled: boolean;
  propertyName: string; // e.g. "Primary Residence"
  propertyValue: number; // Current property market value (£)
  currentBalance: number; // Outstanding mortgage debt balance (£)
  interestRatePercent: number; // Annual interest rate APR (%)
  remainingTermYears: number; // Remaining mortgage term in years
  remainingTermMonths?: number; // Remaining mortgage term extra months
  repaymentType: MortgageRepaymentType; // 'repayment' | 'interest_only'
  customMonthlyPayment?: number; // Optional manual payment override (£/mo)

  // Overpayments & Early Payoff Strategy
  regularMonthlyOverpayment: number; // Regular extra overpayment (£/mo)
  lumpSumOverpayments?: LumpSumOverpayment[]; // Specific age lump sum overpayments
  
  // Retirement Lump Sum Payoff Strategy
  payoffAtRetirement: boolean; // Pay off remaining mortgage balance at target retirement age
  payoffSourcePot?: 'pension_lump_sum' | 'cash_savings' | 'stocks_and_shares_isa' | 'cash_isa';

  // Budget Integration
  deductFromRetirementIncome: boolean; // Deduct active mortgage payment from retirement net income if still active
}

export interface PotReturnOverrides {
  enabled: boolean; // Enable custom growth rates per pot
  workplacePensionReturn: number; // e.g. 7.0% p.a.
  sippReturn: number; // e.g. 7.5% p.a.
  stocksAndSharesIsaReturn: number; // e.g. 7.5% p.a.
  cashIsaReturn: number; // e.g. 4.2% p.a.
  lisaReturn: number; // e.g. 6.5% p.a.
  giaReturn: number; // e.g. 6.5% p.a.
  cashSavingsReturn: number; // e.g. 3.5% p.a. (High-Yield Cash Savings)
}

export interface PetGift {
  id: string;
  amount: number;
  yearsAgo: number; // 0 to 7 years
  recipient: string;
}

export interface IhtEstateSettings {
  primaryResidenceValue: number; // Main home value e.g. £450,000
  annualPropertyGrowthPercent: number; // e.g. 3.0% p.a.
  otherTaxableAssets: number; // BTL, art, physical assets e.g. £50,000
  includePensionsInEstate: boolean; // Post-April 2027 UK Budget rule (default: true)
  passMainResidenceToDescendants: boolean; // Claim RNRB (£175k / £350k) toggle (default: true)
  annualGiftingStrategy: number; // Annual tax-free gifting e.g. £3,000/yr

  // Non-Pension Estate & Death Benefits Enhancements
  nonPensionBeneficiary?: 'spouse' | 'descendants' | 'mixed';
  charityGiftingPercent?: number; // e.g. 0% to 20%. If >= 10% of net estate, IHT rate drops from 40% to 36%
  businessReliefAssets?: number; // AIM ISAs / BPR qualifying shares
  businessReliefExemptionPercent?: number; // 50% (post-Oct 2024 budget) or 100%
  lifeInsuranceInTrust?: number; // Whole of Life policy in trust payout to cover IHT
  petGifts?: PetGift[]; // Substantial gifts made in last 7 years
}

export interface InvestmentPots {
  // Pension Pots
  workplacePensionBalance: number;
  workplacePensionMonthlyEmployee: number; // Employee % or £
  workplacePensionMonthlyEmployeeType: 'percent' | 'fixed';
  employerMatchPercentage: number; // Employer matching %
  sippBalance: number;
  sippMonthlyContribution: number;
  sippContributionType?: 'net' | 'gross'; // 'net' (out-of-pocket + 25% tax relief) or 'gross' (total in pot)

  // ISA Pots
  stocksAndSharesIsaBalance: number;
  stocksAndSharesIsaMonthlyContribution: number;
  cashIsaBalance: number;
  cashIsaMonthlyContribution: number;
  lisaBalance: number;
  lisaMonthlyContribution: number;

  // GIA & Cash
  giaBalance: number;
  giaMonthlyContribution: number;
  cashSavingsBalance: number;
  cashSavingsMonthlyContribution: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  effectiveGrossIncomeAfterSacrifice: number;
  personalAllowance: number;
  adjustedNetIncome: number;
  
  // Tax & NI breakdown
  totalIncomeTax: number;
  totalNationalInsurance: number;
  netTakeHomePay: number;
  marginalTaxRate: number; // e.g. 20, 40, 45, 60 (tax trap)
  
  // Pension relief details
  totalPensionContributionsAnnual: number;
  regularPensionContributionsAnnual?: number;
  employeePensionContributionsAnnual: number;
  employerPensionContributionsAnnual: number;
  pensionBasicRateTaxRelief: number; // Automatically added in relief_at_source
  pensionHigherRateTaxReliefClaimable: number; // Extra relief via self assessment
  totalPensionTaxRelief: number;
  salarySacrificeNicSavedEmployee: number;
  annualAllowanceCharge?: number;
  salarySacrificeNicSavedEmployer: number;
  
  // ISA & Lisa details
  totalIsaContributionsAnnual: number;
  regularIsaContributionsAnnual?: number;
  regularSsIsaContributionsAnnual?: number;
  regularCashIsaContributionsAnnual?: number;
  regularLisaContributionsAnnual?: number;
  lisaGovernmentBonusAnnual: number;
  totalCashGiaContributionsAnnual?: number;
  regularCashGiaContributionsAnnual?: number;
  regularGiaContributionsAnnual?: number;
  regularCashSavingsContributionsAnnual?: number;
  
  // Warnings & Optimization
  is60PercentTaxTrap: boolean;
  taxTrapAmountInBracket: number;
  recommendedTaxTrapPensionContribution: number;
  
  // One-Off Contributions included in current tax year
  oneOffPensionContributionsGross?: number;
  oneOffIsaContributionsGross?: number;

  // Allowance checks
  eligibleEarnings: number;
  pensionAnnualAllowanceUsed: number;
  pensionAnnualAllowanceLimit: number; // standard £60,000 or tapered
  thresholdIncome: number; // For £200,000 threshold income test
  adjustedIncome: number; // For £260,000 adjusted income test
  isTaperedAnnualAllowance: boolean; // True if threshold > £200k AND adjusted > £260k
  taperedReduction: number; // Amount allowance reduced from £60,000
  actualPensionAllowance: number; // Income-adjusted allowance: Math.min(pensionAnnualAllowanceLimit, eligibleEarnings)
  pensionAnnualAllowanceRemaining: number;
  actualPensionAllowanceRemaining: number;
  exceedsEligibleIncome: boolean;
  exceedsAnnualAllowanceOnly: boolean;
  isaAllowanceUsed: number;
  isaAllowanceLimit: number; // £20,000
  isaAllowanceRemaining: number;
  lisaAllowanceUsed: number;
  lisaAllowanceLimit: number; // £4,000
  lisaAllowanceRemaining: number;

  // PCLS & LSA (Lump Sum Allowance) details
  maxTaxFreeCashCurrentBalance: number;
  projectedPensionAtAccessAge: number;
  maxTaxFreeCashAtAccessAge: number;
  lsaLimit: number;
  pensionAccessAge: number; // 55 or 57 based on DOB / NMPA rules
  isNmpaRestricted: boolean; // Born on/after 6 April 1971 -> age 57
  isRetirementBeforeAccessAge: boolean; // Warning if targetRetirementAge < pensionAccessAge

  // HMRC PCLS Recycling Rule Warning (Schedule 29 Finance Act 2004)
  isPclsRecyclingRisk: boolean;
  pclsRecyclingDetails?: {
    pclsAmount: number;
    annualContributions: number;
    threshold: number;
    recyclingReason: string;
  };

  // Personal Savings Allowance (PSA) & Savings Interest Tax
  savingsInterestEarned: number;
  personalSavingsAllowance: number; // £1,000 (Basic Rate), £500 (Higher Rate), £0 (Additional Rate)
  taxableSavingsInterest: number;
  savingsInterestTax: number;
  savingsInterestTaxRate: number; // e.g. 0.20, 0.40, 0.45
}

export type UKTaxResult = TaxCalculationResult;

export interface YearProjection {
  year: number;
  age: number;
  isRetired: boolean;
  pensionPot: number;
  isaPot: number;
  stocksAndSharesIsaPot?: number;
  cashIsaPot?: number;
  lisaPot?: number;
  cashGiaPot: number;
  giaPot?: number;
  cashSavingsPot?: number;
  totalPot: number;

  // Primary vs Partner Pot Breakdown
  primaryPensionPot?: number;
  primaryPensionPotBeforeAnnuity?: number;
  primaryPensionPotBeforePcls?: number;
  primaryIsaPot?: number;
  primaryStocksAndSharesIsaPot?: number;
  primaryCashIsaPot?: number;
  primaryLisaPot?: number;
  primaryCashGiaPot?: number;
  primaryGiaPot?: number;
  primaryCashSavingsPot?: number;
  primaryTotalPot?: number;
  partnerPensionPot?: number;
  partnerPensionPotBeforeAnnuity?: number;
  partnerPensionPotBeforePcls?: number;
  partnerIsaPot?: number;
  partnerStocksAndSharesIsaPot?: number;
  partnerCashIsaPot?: number;
  partnerLisaPot?: number;
  partnerCashGiaPot?: number;
  partnerGiaPot?: number;
  partnerCashSavingsPot?: number;
  partnerTotalPot?: number;
  // Primary vs Partner Income & Drawdown Breakdown
  primaryStatePensionReceived?: number;
  primaryDbPensionIncomeReceived?: number;
  primaryAnnuityIncomeReceived?: number;
  primaryTaxableFixedIncomeReceived?: number;
  primaryTaxFreeFixedIncomeReceived?: number;
  primaryPensionDrawdown?: number;
  primaryPensionDrawdownTaxFree?: number;
  primaryPensionDrawdownTaxable?: number;
  primaryIsaDrawdown?: number;
  primaryCashDrawdown?: number;
  primaryNetRetirementIncome?: number;

  partnerStatePensionReceived?: number;
  partnerDbPensionIncomeReceived?: number;
  partnerAnnuityIncomeReceived?: number;
  partnerTaxableFixedIncomeReceived?: number;
  partnerTaxFreeFixedIncomeReceived?: number;
  partnerPensionDrawdown?: number;
  partnerPensionDrawdownTaxFree?: number;
  partnerPensionDrawdownTaxable?: number;
  partnerIsaDrawdown?: number;
  partnerCashDrawdown?: number;
  partnerNetRetirementIncome?: number;

  estimatedPotGrowth: number;
  estimatedInvestmentFees?: number;
  annualContributionTotal: number;
  oneOffContributionsReceived?: number;
  lifeEventsIncome?: number;
  lifeEventsExpense?: number;
  decumulationLifeEventsSummary?: string;
  annualTaxReliefTotal: number;
  statePensionReceived: number;
  dbPensionIncomeReceived?: number;
  dbTaxFreeLumpSumReceived?: number;
  taxableFixedIncomeReceived?: number;
  taxFreeFixedIncomeReceived?: number;
  pensionDrawdown: number;
  pensionDrawdownTaxFree?: number;
  pensionDrawdownTaxable?: number;
  annuityIncomeReceived: number;
  annuityCapitalAllocated?: number;
  annuityPurchasedThisYear?: boolean;
  isaDrawdown: number;
  cashDrawdown: number;
  totalWithdrawalAmount: number;
  taxOnWithdrawal: number;
  totalTaxPaid: number;
  savingsInterestTax?: number;
  primarySavingsInterestTax?: number;
  partnerSavingsInterestTax?: number;
  personalSavingsAllowanceUsed?: number;
  netRetirementIncome: number;
  purchasingPowerAdjustedIncome: number;
  targetRetirementIncome?: number;
  incomeShortfall?: number;
  annualIncomeExcess?: number;
  cumulativeExcessIncome?: number;
  incomeRequirementMet?: boolean;
  potDepleted: boolean;
  depletionAge?: number;
  canAccessPension: boolean; // false if age < pensionAccessAge
}

export interface PlannerScenario {
  id: string;
  name: string;
  updatedAt: string;
  profile: UserProfile;
  pots: InvestmentPots;
}

export interface GeminiAnalysisResponse {
  summary: string;
  taxEfficiencyScore: number; // 0 - 100
  keyOpportunities: string[];
  taxTrapAdvice: string;
  pensionVsIsaRecommendation: string;
  drawdownStrategyTips: string;
  nextSteps: string[];
}




