import { describe, it, expect } from 'vitest';
import { generateFormulaExcelWorkbook } from '../excelFormulaExporter';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('excelFormulaExporter comprehensive tests', () => {
  it('generates a full Excel workbook for single person with various drawdown strategies', async () => {
    const strategies: Array<UserProfile['drawdownStrategy']> = [
      'isa_first',
      'pension_first',
      'basic_rate_bracket',
      'tax_free_bracket',
      'higher_rate_bracket',
      'pro_rata',
    ];

    for (const strategy of strategies) {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 58,
        targetRetirementAge: 60,
        isCouplePlanning: false,
        drawdownStrategy: strategy,
        targetRetirementIncomeAnnual: 35000,
        statePensionAge: 67,
        includeStatePension: true,
        grossAnnualSalary: 65000,
        oneOffContributions: [
          {
            id: 'c1',
            name: 'Bonus SIPP',
            targetPot: 'sipp',
            grossAmount: 10000,
            date: '2027-04-10',
            enabled: true,
          },
          {
            id: 'c2',
            name: 'Property Sale Regular',
            targetPot: 'gia',
            frequency: 'regular_monthly',
            grossAmount: 500,
            startAge: 58,
            endAge: 60,
            enabled: true,
          },
        ],
        potTransfers: [
          {
            id: 't1',
            name: 'Move to ISA',
            sourcePot: 'gia',
            destinationPot: 'stocks_and_shares_isa',
            amount: 20000,
            transferDate: '2028-04-06',
            enabled: true,
          },
        ],
      };

      const pots: InvestmentPots = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 300000,
        sippBalance: 150000,
        stocksAndSharesIsaBalance: 80000,
        cashIsaBalance: 20000,
        lisaBalance: 15000,
        giaBalance: 50000,
        cashSavingsBalance: 25000,
      };

      const projections = generateProjections(profile, pots);
      const blob = await generateFormulaExcelWorkbook(profile, pots, projections, `Plan-${strategy}`);

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(10000);
    }
  });

  it('generates workbook for couple with all strategy variations', async () => {
    const coupleStrategies: Array<UserProfile['drawdownStrategy']> = [
      'basic_rate_bracket',
      'tax_free_bracket',
      'higher_rate_bracket',
      'pro_rata',
    ];

    for (const strategy of coupleStrategies) {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 55,
        targetRetirementAge: 60,
        isCouplePlanning: true,
        drawdownStrategy: strategy,
        targetRetirementIncomeAnnual: 50000,
        partnerCurrentAge: 53,
        partnerTargetRetirementAge: 58,
        partnerGrossAnnualSalary: 45000,
        partnerDateOfBirth: '1973-05-10',
        partnerPots: {
          ...DEFAULT_PARTNER_POTS,
          workplacePensionBalance: 180000,
          sippBalance: 60000,
          stocksAndSharesIsaBalance: 40000,
          cashSavingsBalance: 15000,
        },
        oneOffContributions: [
          {
            id: 'cPartner',
            name: 'Partner Lump Sum',
            owner: 'partner',
            targetPot: 'sipp',
            grossAmount: 5000,
            startAge: 55,
            enabled: true,
          },
        ],
        potTransfers: [
          {
            id: 'tCross',
            name: 'Spousal Transfer',
            owner: 'primary',
            destinationOwner: 'partner',
            sourcePot: 'gia',
            destinationPot: 'stocks_and_shares_isa',
            amount: 15000,
            transferAge: 58,
            enabled: true,
          },
        ],
      };

      const pots: InvestmentPots = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 250000,
        sippBalance: 100000,
        stocksAndSharesIsaBalance: 70000,
        giaBalance: 30000,
      };

      const projections = generateProjections(profile, pots);
      const blob = await generateFormulaExcelWorkbook(profile, pots, projections, 'Couple-Plan');

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(15000);
    }
  });
});
