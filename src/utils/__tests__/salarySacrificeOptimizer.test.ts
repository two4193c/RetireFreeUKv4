import { describe, it, expect } from 'vitest';
import {
  calculateChildBenefitDetails,
  calculateMarginalRates,
  calculateSalarySacrificeComparison,
  calculateTrapOptimizations,
  CB_FIRST_CHILD_ANNUAL,
  CB_ADDITIONAL_CHILD_ANNUAL,
  HICBC_LOWER_THRESHOLD,
  HICBC_UPPER_THRESHOLD,
} from '../salarySacrificeOptimizer';

describe('salarySacrificeOptimizer', () => {
  describe('Child Benefit & HICBC calculations', () => {
    it('calculates full benefit with 0 clawback below £60,000 threshold', () => {
      const cb = calculateChildBenefitDetails(55000, 2);
      const expectedAnnual = CB_FIRST_CHILD_ANNUAL + CB_ADDITIONAL_CHILD_ANNUAL; // 1331.20 + 881.40 = 2212.60
      expect(cb.annualGrossBenefit).toBeCloseTo(expectedAnnual, 2);
      expect(cb.clawbackPercent).toBe(0);
      expect(cb.clawbackTaxCharge).toBe(0);
      expect(cb.netBenefitRetained).toBeCloseTo(expectedAnnual, 2);
    });

    it('calculates 50% clawback at £70,000 midpoint', () => {
      const cb = calculateChildBenefitDetails(70000, 2);
      const expectedAnnual = CB_FIRST_CHILD_ANNUAL + CB_ADDITIONAL_CHILD_ANNUAL;
      // £10,000 excess / 200 = 50%
      expect(cb.clawbackPercent).toBe(50);
      expect(cb.clawbackTaxCharge).toBeCloseTo(expectedAnnual * 0.5, 2);
      expect(cb.netBenefitRetained).toBeCloseTo(expectedAnnual * 0.5, 2);
    });

    it('calculates 100% clawback at or above £80,000 ceiling', () => {
      const cb = calculateChildBenefitDetails(85000, 1);
      expect(cb.clawbackPercent).toBe(100);
      expect(cb.clawbackTaxCharge).toBeCloseTo(CB_FIRST_CHILD_ANNUAL, 2);
      expect(cb.netBenefitRetained).toBe(0);
    });
  });

  describe('Marginal Rates & Trap Detection', () => {
    it('identifies 60% Personal Allowance trap (+2% NI = 62%) between £100,000 and £125,140', () => {
      const rates = calculateMarginalRates(110000, false, false, 0);
      expect(rates.isInPaTaper).toBe(true);
      expect(rates.incomeTaxRatePercent).toBe(60);
      expect(rates.employeeNiRatePercent).toBe(2);
      expect(rates.totalMarginalRatePercent).toBe(62);
    });

    it('identifies Higher Rate bracket (40% + 2% NI = 42%) between £50,270 and £100,000 without CB', () => {
      const rates = calculateMarginalRates(75000, false, false, 0);
      expect(rates.isInPaTaper).toBe(false);
      expect(rates.incomeTaxRatePercent).toBe(40);
      expect(rates.employeeNiRatePercent).toBe(2);
      expect(rates.totalMarginalRatePercent).toBe(42);
    });

    it('identifies Basic Rate bracket (20% + 8% NI = 28%) between £12,570 and £50,270', () => {
      const rates = calculateMarginalRates(40000, false, false, 0);
      expect(rates.incomeTaxRatePercent).toBe(20);
      expect(rates.employeeNiRatePercent).toBe(8);
      expect(rates.totalMarginalRatePercent).toBe(28);
    });

    it('includes Child Benefit clawback in marginal rate between £60k and £80k', () => {
      const rates = calculateMarginalRates(70000, false, true, 2);
      expect(rates.isInHicbcTaper).toBe(true);
      expect(rates.incomeTaxRatePercent).toBe(40);
      expect(rates.employeeNiRatePercent).toBe(2);
      expect(rates.hicbcClawbackRatePercent).toBeGreaterThan(10);
      expect(rates.totalMarginalRatePercent).toBeGreaterThan(52);
    });
  });

  describe('calculateSalarySacrificeComparison', () => {
    it('calculates employee NI savings and employer NI pass-through accurately', () => {
      // £60,000 salary, £10,000 sacrifice, 13.8% employer NI, 100% pass-through
      const res = calculateSalarySacrificeComparison({
        salary: 60000,
        sacrificeAmount: 10000,
        employerNiRate: 0.138,
        employerPassThroughPercent: 100,
      });

      // Contractual salary goes from 60,000 to 50,000
      // NI on 60,000: (50270 - 12570) * 0.08 + (60000 - 50270) * 0.02 = 3016 + 194.60 = 3210.60
      // NI on 50,000: (50000 - 12570) * 0.08 = 2994.40
      // NI saved: 3210.60 - 2994.40 = 216.20
      expect(res.advantagesOverRas.employeeNiSavedAnnual).toBeCloseTo(216.20, 1);

      // Employer NI pass-through: 10,000 * 0.138 = £1,380
      expect(res.advantagesOverRas.employerBonusAnnual).toBeCloseTo(1380, 2);
      expect(res.salarySacrifice.employerRebateAdded).toBeCloseTo(1380, 2);
      expect(res.salarySacrifice.totalPensionAdded).toBeCloseTo(11380, 2);

      // Total annual advantage over RAS = NI saved (216.20) + Employer bonus (1380) = 1596.20
      expect(res.advantagesOverRas.totalAnnualAdvantage).toBeCloseTo(1596.20, 1);
    });

    it('supports 15.0% Employer NI rate (from April 2025) and partial pass-through (50%)', () => {
      const res = calculateSalarySacrificeComparison({
        salary: 100000,
        sacrificeAmount: 20000,
        employerNiRate: 0.150,
        employerPassThroughPercent: 50,
      });

      // 20,000 * 0.150 = 3,000 employer NI savings. 50% pass-through = 1,500
      expect(res.salarySacrifice.employerRebateAdded).toBeCloseTo(1500, 2);
      expect(res.salarySacrifice.totalPensionAdded).toBeCloseTo(21500, 2);
    });

    it('demonstrates huge efficiency inside 60% Personal Allowance trap (£110,000 -> £100,000)', () => {
      const res = calculateSalarySacrificeComparison({
        salary: 110000,
        sacrificeAmount: 10000,
        employerNiRate: 0.138,
        employerPassThroughPercent: 100,
      });

      // In PA trap, sacrificing £10,000 saves 60% income tax = £6,000
      // Plus 2% NI = £200. Total tax + NI saved = £6,200.
      // Net take-home cost = £10,000 - £6,200 = £3,800.
      expect(res.salarySacrifice.netCostToEmployee).toBeCloseTo(3800, 1);

      // Total pension added = £10,000 + £1,380 employer rebate = £11,380
      expect(res.salarySacrifice.totalPensionAdded).toBeCloseTo(11380, 1);

      // Effective cost per £100 in pension = (3800 / 11380) * 100 = ~£33.39
      expect(res.salarySacrifice.effectiveCostPer100InPension).toBeLessThan(35);

      // Immediate ROI is nearly 200%
      expect(res.advantagesOverRas.immediateRoiPercent).toBeGreaterThan(190);
    });

    it('demonstrates Child Benefit restoration when sacrificing from £75,000 to £60,000', () => {
      const res = calculateSalarySacrificeComparison({
        salary: 75000,
        sacrificeAmount: 15000,
        claimChildBenefit: true,
        childBenefitChildren: 2,
        employerNiRate: 0.138,
        employerPassThroughPercent: 100,
      });

      // Baseline HICBC clawback at 75k is (15000 / 200) = 75%
      expect(res.baseline.childBenefitRetained).toBeLessThan(res.salarySacrifice.childBenefitRetained);
      // At £60,000, 100% child benefit is retained
      expect(res.salarySacrifice.childBenefitRetained).toBeCloseTo(
        CB_FIRST_CHILD_ANNUAL + CB_ADDITIONAL_CHILD_ANNUAL,
        1
      );
    });

    it('computes compound accumulation runway correctly', () => {
      const res = calculateSalarySacrificeComparison({
        salary: 80000,
        sacrificeAmount: 10000,
        employerNiRate: 0.138,
        employerPassThroughPercent: 100,
        yearsToRetirement: 10,
        expectedReturn: 7,
      });

      expect(res.compoundProjection.yearlyBreakdown).toHaveLength(10);
      expect(res.compoundProjection.smartFinalPot).toBeGreaterThan(res.compoundProjection.rasFinalPot);
      expect(res.compoundProjection.extraRetirementWealth).toBeGreaterThan(0);
      expect(res.compoundProjection.totalEmployerBonusInvested).toBeCloseTo(1380 * 10, 1);
    });
  });

  describe('calculateTrapOptimizations', () => {
    it('generates appropriate presets for high earners above £100,000', () => {
      const traps = calculateTrapOptimizations(115000, false, 0, false);
      const paTrap = traps.find((t) => t.id === 'pa_taper');
      expect(paTrap).toBeDefined();
      expect(paTrap?.isApplicable).toBe(true);
      expect(paTrap?.recommendedSacrifice).toBe(15000);
      expect(paTrap?.targetSalary).toBe(100000);
    });

    it('generates Child Benefit preset when claiming with children', () => {
      const traps = calculateTrapOptimizations(72000, true, 2, false);
      const cbTrap = traps.find((t) => t.id === 'child_benefit');
      expect(cbTrap).toBeDefined();
      expect(cbTrap?.isApplicable).toBe(true);
      expect(cbTrap?.recommendedSacrifice).toBe(12000);
      expect(cbTrap?.targetSalary).toBe(60000);
    });
  });
});
