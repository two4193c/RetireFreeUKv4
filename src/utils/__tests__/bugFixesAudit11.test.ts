import { describe, it, expect } from 'vitest';
import { aggregateIncome, calculatePartnerUKTax } from '../ukTaxEngine';
import { computePlanInsights } from '../planInsightsEngine';
import { calculateMortgagePaymentForAge } from '../sankeyEngine';
import { solveTaxOptimalAnnualDrawdown } from '../taxOptimizerSolver';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_POTS, DEFAULT_PARTNER_POTS, DEFAULT_PROFILE } from '../defaultData';

describe('Audit Round 11 Regression Tests (BUG-65 to BUG-69)', () => {
  // --------------------------------------------------------------------------
  // BUG-65: ukTaxEngine.ts aggregateIncome undefined includeStatePension & salary fallback
  // --------------------------------------------------------------------------
  describe('BUG-65: ukTaxEngine aggregateIncome state pension & partner salary fallback', () => {
    it('includes state pension when includeStatePension and partnerIncludeStatePension are undefined', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 68,
        statePensionAge: 67,
        partnerCurrentAge: 68,
        partnerStatePensionAge: 67,
        isCouplePlanning: true,
        // intentionally omit includeStatePension and partnerIncludeStatePension
        includeStatePension: undefined,
        partnerIncludeStatePension: undefined,
      };

      const primaryAgg = aggregateIncome(profile, false, 68);
      expect(primaryAgg.statePensionIncome).toBeGreaterThan(0);

      const partnerAgg = aggregateIncome(profile, true, 68);
      expect(partnerAgg.statePensionIncome).toBeGreaterThan(0);
    });

    it('falls back to grossAnnualSalary when partnerGrossAnnualSalary is undefined in partner tax', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 50,
        partnerCurrentAge: 50,
        targetRetirementAge: 65,
        partnerTargetRetirementAge: 65,
        grossAnnualSalary: 45000,
        partnerGrossAnnualSalary: undefined,
        isCouplePlanning: true,
      };

      const partnerTax = calculatePartnerUKTax(profile, DEFAULT_PARTNER_POTS, 50);
      expect(partnerTax.grossIncome).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // BUG-66: planInsightsEngine.ts Milestone B2 partner State Pension deferral
  // --------------------------------------------------------------------------
  describe('BUG-66: planInsightsEngine Milestone B2 partner State Pension deferral', () => {
    it('correctly adds partnerStatePensionDeferralYears to Milestone B2 partner SPA', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        partnerCurrentAge: 60,
        targetRetirementAge: 65,
        partnerTargetRetirementAge: 65,
        isCouplePlanning: true,
        includeStatePension: true,
        partnerIncludeStatePension: true,
        partnerStatePensionAge: 67,
        partnerStatePensionDeferralYears: 3, // Defer to 70
        partnerPclsLumpSumPercent: 0, // Test zero-safety
      };

      const insights = computePlanInsights(profile, DEFAULT_POTS);
      const partnerMilestone = insights.milestones.find((m) => m.type === 'state_pension' && m.title.includes('Partner'));
      expect(partnerMilestone).toBeDefined();
      expect(partnerMilestone?.title).toContain('Age 70');
      expect(partnerMilestone?.age).toBe(70);
    });
  });

  // --------------------------------------------------------------------------
  // BUG-67: sankeyEngine.ts mortgage payment with 0% interest rate
  // --------------------------------------------------------------------------
  describe('BUG-67: sankeyEngine mortgage payment with 0% interest rate', () => {
    it('returns exact capital repayment without NaN when mortgage interestRatePercent is 0%', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 40,
        targetRetirementAge: 60,
        mortgage: {
          enabled: true,
          currentBalance: 120000,
          remainingTermYears: 10,
          remainingTermMonths: 0,
          interestRatePercent: 0, // 0% interest loan
          repaymentType: 'repayment',
          propertyValue: 300000,
          payoffAtRetirement: false,
        },
      };

      const payment = calculateMortgagePaymentForAge(profile, 45);
      expect(payment).toBeGreaterThan(0);
      expect(isNaN(payment)).toBe(false);
      // £120k / 10 years = £12,000/year
      expect(payment).toBeCloseTo(12000, 0);
    });
  });

  // --------------------------------------------------------------------------
  // BUG-68: taxOptimizerSolver.ts partner access age fallback & custom Scottish bands
  // --------------------------------------------------------------------------
  describe('BUG-68 & BUG-69: taxOptimizerSolver partner access age and Scottish thresholds', () => {
    it('falls back partnerPensionAccessAge to pensionAccessAge when omitted', () => {
      const input = {
        age: 55,
        partnerAge: 55,
        pensionAccessAge: 55, // NMPA 55 for someone born <= 1972
        // partnerPensionAccessAge omitted
        netIncomeNeeded: 20000,
        primaryTaxableGuaranteed: 0,
        partnerTaxableGuaranteed: 0,
        primaryTaxFreeGuaranteed: 0,
        partnerTaxFreeGuaranteed: 0,
        primaryMaxLsa: 268275,
        partnerMaxLsa: 268275,
        primaryCumulativeTaxFreeDrawn: 0,
        partnerCumulativeTaxFreeDrawn: 0,
        pots: {
          primaryUncrystallisedPot: 0,
          primaryCrystallisedPot: 0,
          partnerUncrystallisedPot: 200000,
          partnerCrystallisedPot: 0,
          primarySsIsaPot: 0,
          primaryCashIsaPot: 0,
          primaryLisaPot: 0,
          partnerSsIsaPot: 0,
          partnerCashIsaPot: 0,
          primaryCashGiaPot: 0,
          partnerCashGiaPot: 0,
          partnerLisaPot: 0,
        },
        inflationFactor: 1,
        isScottishTax: false,
        isPartnerScottishTax: false,
        indexTaxBands: false,
        isCouple: true,
        remainingRetirementYears: 25,
      };

      const result = solveTaxOptimalAnnualDrawdown(input);
      // Since partner is age 55 and partnerPensionAccessAge defaulted to pensionAccessAge (55), partner can access pension
      expect(result.partnerGrossPensionDraw).toBeGreaterThan(0);
    });

    it('respects customTaxBands Scottish intermediate threshold override', () => {
      const input = {
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 35000,
        primaryTaxableGuaranteed: 0,
        partnerTaxableGuaranteed: 0,
        primaryTaxFreeGuaranteed: 0,
        partnerTaxFreeGuaranteed: 0,
        primaryMaxLsa: 268275,
        partnerMaxLsa: 268275,
        primaryCumulativeTaxFreeDrawn: 0,
        partnerCumulativeTaxFreeDrawn: 0,
        pots: {
          primaryUncrystallisedPot: 300000,
          primaryCrystallisedPot: 0,
          partnerUncrystallisedPot: 0,
          partnerCrystallisedPot: 0,
          primarySsIsaPot: 0,
          primaryCashIsaPot: 0,
          primaryLisaPot: 0,
          partnerSsIsaPot: 0,
          partnerCashIsaPot: 0,
          primaryCashGiaPot: 0,
          partnerCashGiaPot: 0,
        },
        inflationFactor: 1,
        isScottishTax: true,
        isPartnerScottishTax: false,
        indexTaxBands: false,
        isCouple: false,
        remainingRetirementYears: 25,
        customTaxBands: {
          enabled: true,
          personalAllowance: 15000,
          scotIntermediateThreshold: 35000,
        },
      };

      const result = solveTaxOptimalAnnualDrawdown(input);
      expect(result.totalNetIncomeAchieved).toBeGreaterThanOrEqual(35000);
      expect(result.primaryGrossPensionDraw).toBeGreaterThan(0);
    });
  });
});
