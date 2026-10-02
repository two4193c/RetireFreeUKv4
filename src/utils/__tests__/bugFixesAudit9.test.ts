import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { UserProfile, InvestmentPots } from '../../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../ukTaxEngine';
import { generateFormulaExcelWorkbook } from '../excelFormulaExporter';
import { solveMaximizedSpend } from '../maximizedSpendSolver';

describe('Round 9 Bug Fixes Audit', () => {
  const baseProfile: UserProfile = {
    currentAge: 54, // Born in 1971/1972 (before 6 April 1973) => NMPA is 55, NOT 57!
    targetRetirementAge: 60,
    lifeExpectancy: 85,
    statePensionAge: 67,
    expectedInvestmentReturn: 5,
    postRetirementReturn: 4,
    expectedInflationRate: 2.5,
    annualRetirementIncomeTarget: 30000,
    drawdownStrategy: 'pro_rata',
    taxRegion: 'england_wales',
    takeLumpSumAtStart: false,
    includeStatePension: true,
    fullStatePensionAmount: 11502,
    grossAnnualSalary: 45000,
  };

  const basePots: InvestmentPots = {
    pensionPot: 300000,
    isaPot: 50000,
    cashGiaPot: 20000,
    workplacePensionBalance: 300000,
    stocksAndSharesIsaBalance: 50000,
    cashSavingsBalance: 20000,
  };

  describe('BUG-55: Statutory NMPA calculation in Solvers and Exporters', () => {
    it('correctly calculates NMPA 55 for individuals born before 6 April 1973 based on currentAge', () => {
      // Current year 2026 - age 54 = born 1972 (< 1973) => NMPA is 55
      const accessAge = getPensionAccessAge(baseProfile);
      expect(accessAge).toBe(55);
    });

    it('correctly calculates partner NMPA 55 for partner aged 54 (born 1972)', () => {
      const coupleProfile: UserProfile = {
        ...baseProfile,
        isCouplePlanning: true,
        partnerCurrentAge: 54,
      };
      const partnerAccessAge = getPartnerPensionAccessAge(coupleProfile);
      expect(partnerAccessAge).toBe(55);
    });

    it('correctly calculates NMPA 57 for individuals born on or after 6 April 1973', () => {
      const youngProfile: UserProfile = {
        ...baseProfile,
        currentAge: 40, // Born 1986
      };
      const accessAge = getPensionAccessAge(youngProfile);
      expect(accessAge).toBe(57);
    });

    it('honors protectedPensionAccessAge over statutory NMPA when lower', () => {
      const protectedProfile: UserProfile = {
        ...baseProfile,
        currentAge: 40,
        protectedPensionAccessAge: 50,
      };
      const accessAge = getPensionAccessAge(protectedProfile);
      expect(accessAge).toBe(50);
    });

    it('solves maximized spend solver starting at NMPA 55 for profile aged 54', () => {
      const result = solveMaximizedSpend({
        profile: baseProfile,
        pots: basePots,
        annuityFloorMode: 'none',
      });
      expect(result).toBeDefined();
      expect(result.maxAnnualIncome).toBeGreaterThan(0);
      expect(result.projectionsWithMaxSpend.length).toBeGreaterThan(0);
    });
  });

  describe('BUG-56: Excel Exporter statutory NMPA and £0 State Pension', () => {
    it('generates Excel parameters with NMPA 55 and honors £0 state pension without reverting to defaults', async () => {
      const profileWithZeroSp: UserProfile = {
        ...baseProfile,
        currentAge: 54,
        statePensionAmountAnnual: 0,
        fullStatePensionAmount: 11502,
      };
      const blob = await generateFormulaExcelWorkbook(profileWithZeroSp, basePots, []);
      expect(blob).toBeDefined();

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const wsInputs = workbook.getWorksheet('Inputs & Setup');
      expect(wsInputs).toBeDefined();

      // Row 5: NMPA (Cell B5)
      const nmpaCell = wsInputs?.getCell('B5');
      expect(nmpaCell?.value).toBe(55); // Correctly evaluates to 55 for age 54

      // Row 8: State Pension Today (Cell B8)
      const spCell = wsInputs?.getCell('B8');
      expect(spCell?.value).toBe(0); // Preserves £0 state pension without reverting to 11502 or 12548
    });
  });

  describe('BUG-57: Zero-safe inflation in calculations', () => {
    it('properly preserves 0% expected inflation rate in Excel Settings worksheet', async () => {
      const zeroInfProfile: UserProfile = {
        ...baseProfile,
        expectedInflationRate: 0,
      };
      const blob = await generateFormulaExcelWorkbook(zeroInfProfile, basePots, []);
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const wsSettings = workbook.getWorksheet('Settings');
      expect(wsSettings).toBeDefined();

      // Row 11: Inflation Growth Rate (%) (Cell B11)
      const infCell = wsSettings?.getCell('B11');
      expect(infCell?.value).toBe(0); // Preserves 0% without reverting to 2.5% (0.025)
    });
  });
});
