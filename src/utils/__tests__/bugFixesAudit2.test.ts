import { describe, it, expect } from 'vitest';
import { calculateTaxEfficientSavingsCrossover } from '../taxEfficientSavingsEngine';
import { solveTaxOptimalAnnualDrawdown } from '../taxOptimizerSolver';
import { calculateTrapOptimizations } from '../salarySacrificeOptimizer';
import { getScopeEvaluationInputs } from '../maximizedSpendSolver';
import { generatePlanNarrative } from '../pdfNarrativeGenerator';
import { getCouponTaxRate } from '../giltLadderEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile } from '../../types';

describe('Audit Round 2 Bug Fixes (BUG-11 through BUG-17)', () => {
  describe('BUG-11: taxEfficientSavingsEngine band threshold and NI rate accuracy', () => {
    it('accurately identifies £40k earner in rUK as Basic Rate (20%) not Higher Rate (40%)', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 35,
        targetRetirementAge: 60,
        grossAnnualSalary: 40000,
        taxRegion: 'england_ni_wales',
        pensionContributionMethod: 'salary_sacrifice',
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      expect(result.currentMarginalTaxRate).toBe(20);
      // At £40k, salary is below the £50,270 UEL, so employee NI is 8%, giving 28% total relief
      expect(result.ageBreakdowns[0].taxReliefPercent).toBe(28);
    });

    it('accurately treats sub-Personal Allowance salary (£5k) in Scotland as 0% tax', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 35,
        targetRetirementAge: 60,
        grossAnnualSalary: 5000,
        taxRegion: 'scotland',
        pensionContributionMethod: 'relief_at_source',
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      expect(result.currentMarginalTaxRate).toBe(0);
    });

    it('accurately identifies £50k Scottish earner as Higher Rate (42%)', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 35,
        targetRetirementAge: 60,
        grossAnnualSalary: 50000,
        taxRegion: 'scotland',
        pensionContributionMethod: 'salary_sacrifice',
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      expect(result.currentMarginalTaxRate).toBe(42);
      // Below £50,270 UEL, employee NI is 8%, giving 42% + 8% = 50% upfront relief
      expect(result.ageBreakdowns[0].taxReliefPercent).toBe(50);
    });
  });

  describe('BUG-12: taxOptimizerSolver pot depletion fallback', () => {
    it('draws remaining available pension pot when pots are low rather than returning 0 extra', () => {
      const input = {
        age: 70,
        pensionAccessAge: 57,
        netIncomeNeeded: 45000,
        primaryTaxableGuaranteed: 10000,
        partnerTaxableGuaranteed: 0,
        primaryTaxFreeGuaranteed: 0,
        partnerTaxFreeGuaranteed: 0,
        primaryMaxLsa: 268275,
        partnerMaxLsa: 268275,
        primaryCumulativeTaxFreeDrawn: 50000,
        partnerCumulativeTaxFreeDrawn: 0,
        pots: {
          primaryUncrystallisedPot: 0,
          primaryCrystallisedPot: 8000, // Small remaining pot
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
        inflationFactor: 1.0,
        isScottishTax: false,
        isPartnerScottishTax: false,
        indexTaxBands: true,
        isCouple: false,
        remainingRetirementYears: 15,
      };

      const result = solveTaxOptimalAnnualDrawdown(input);
      // Pot should be drawn to its maximum available £8,000, not left at £0
      expect(result.primaryGrossPensionDraw).toBe(8000);
      expect(result.netPensionProduced).toBeGreaterThan(0);
    });
  });

  describe('BUG-13: salarySacrificeOptimizer Scottish trap buster presets', () => {
    it('calculates 69.5% relief for Scottish Personal Allowance taper trap buster', () => {
      const traps = calculateTrapOptimizations(115000, false, 0, true);
      const paTrap = traps.find((t) => t.id === 'pa_taper');
      expect(paTrap).toBeDefined();
      expect(paTrap?.marginalRateSavedPercent).toBe(69.5);
      expect(paTrap?.badge).toContain('69.5%');
    });

    it('targets £43,662 Scottish Higher Rate threshold for Scottish resident earning £48,000', () => {
      const traps = calculateTrapOptimizations(48000, false, 0, true);
      const hrTrap = traps.find((t) => t.id === 'higher_rate');
      expect(hrTrap).toBeDefined();
      expect(hrTrap?.isApplicable).toBe(true);
      expect(hrTrap?.targetSalary).toBe(43662);
      expect(hrTrap?.recommendedSacrifice).toBe(48000 - 43662);
      // Between £43,662 and £50,270 in Scotland: 42% tax + 8% NI = 50% relief
      expect(hrTrap?.marginalRateSavedPercent).toBe(50);
    });
  });

  describe('BUG-14: maximizedSpendSolver couple partner scope isolation', () => {
    it('does not leak primary custom state pension into partner evaluation profile', () => {
      const profileInput: UserProfile = {
        ...DEFAULT_PROFILE,
        isCouplePlanning: true,
        statePensionAmountAnnual: 4500, // Custom primary amount
        partnerStatePensionAmountAnnual: undefined, // Partner uses default/qualifying years
        partnerQualifyingYears: 35,
        partnerCurrentAge: 52,
        partnerTargetRetirementAge: 60,
      };

      const { evalProfile } = getScopeEvaluationInputs(profileInput, DEFAULT_POTS, 'partner');
      expect(evalProfile.statePensionAmountAnnual).toBeUndefined();
      expect(evalProfile.qualifyingYears).toBe(35);
      expect(evalProfile.isCouplePlanning).toBe(false);
    });
  });

  describe('BUG-16: pdfNarrativeGenerator target retirement income fallback', () => {
    it('uses profile.targetRetirementIncomeAnnual when maximizedSpendConfig is inactive', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        targetRetirementAge: 60,
        targetRetirementIncomeAnnual: 55000,
        maximizedSpendConfig: undefined,
      };

      const narrative = generatePlanNarrative({
        profile,
        projections: [],
      });

      expect(narrative.executiveSummary).toContain('£55,000');
      expect(narrative.executiveSummary).not.toContain('£30,000');
    });
  });

  describe('BUG-15: excelFormulaExporter uses STATE_PENSION_FULL_ANNUAL default', () => {
    it('generates Excel workbook blob without throwing and references correct State Pension defaults', async () => {
      const { generateFormulaExcelWorkbook } = await import('../excelFormulaExporter');
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        statePensionAmountAnnual: 0,
        fullStatePensionAmount: undefined,
      };

      const blob = await generateFormulaExcelWorkbook(profile, DEFAULT_POTS, []);
      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(1000);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('BUG-17: giltLadderEngine 0% coupon tax for sub-Personal Allowance income', () => {
    it('returns 0.0 coupon tax rate for gross salary <= £12,570', () => {
      const zeroSalaryRate = getCouponTaxRate('gia', 'auto', 0);
      expect(zeroSalaryRate).toBe(0.0);

      const subPaSalaryRate = getCouponTaxRate('gia', 'auto', 10000);
      expect(subPaSalaryRate).toBe(0.0);

      const basicSalaryRate = getCouponTaxRate('gia', 'auto', 30000);
      expect(basicSalaryRate).toBe(0.20);
    });
  });
});
