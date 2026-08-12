import ExcelJS from 'exceljs';
import { UserProfile, InvestmentPots, YearProjection, InvestmentPotType, OneOffContribution, PotTransfer } from '../types';
import { sanitizePots, DEFAULT_PARTNER_POTS } from './defaultData';

function getPotCategoryName(pot: InvestmentPotType): string {
  switch (pot) {
    case 'workplace_pension':
    case 'sipp':
      return 'DC Pensions';
    case 'stocks_and_shares_isa':
    case 'cash_isa':
    case 'lisa':
      return 'ISAs';
    case 'gia':
    case 'cash_savings':
      return 'Cash & GIA';
    default:
      return 'Cash & GIA';
  }
}

function getPotDisplayName(pot: InvestmentPotType): string {
  switch (pot) {
    case 'workplace_pension':
      return 'Workplace Pension';
    case 'sipp':
      return 'SIPP / Private Pension';
    case 'stocks_and_shares_isa':
      return 'Stocks & Shares ISA';
    case 'cash_isa':
      return 'Cash ISA';
    case 'lisa':
      return 'Lifetime ISA (LISA)';
    case 'gia':
      return 'General Investment Account (GIA)';
    case 'cash_savings':
      return 'Cash Savings & Premium Bonds';
    default:
      return pot;
  }
}

function getContributionYear(c: OneOffContribution, primaryAge: number): number {
  const currentYear = new Date().getFullYear();
  if (c.date && c.date.trim() !== '') {
    const parts = c.date.split('-');
    if (parts.length >= 1) {
      const y = parseInt(parts[0], 10);
      if (!isNaN(y)) return y;
    }
  }
  if (c.startAge !== undefined) {
    return currentYear + (c.startAge - primaryAge);
  }
  return currentYear;
}

function getTransferYear(t: PotTransfer, primaryAge: number): number {
  const currentYear = new Date().getFullYear();
  if (t.transferDate && t.transferDate.trim() !== '') {
    const parts = t.transferDate.split('-');
    if (parts.length >= 1) {
      const y = parseInt(parts[0], 10);
      if (!isNaN(y)) return y;
    }
  }
  if (t.transferAge !== undefined && t.transferAge > 0) {
    return currentYear + (t.transferAge - primaryAge);
  }
  return currentYear;
}

/**
 * Calculates baseline annual contribution for a given asset pot and owner,
 * checking both the pot configuration and active regular items in profile.oneOffContributions.
 */
function computeAnnualContributionForPot(
  targetPot: InvestmentPotType,
  owner: 'primary' | 'partner',
  profile: UserProfile,
  pots: InvestmentPots
): number {
  const isCouple = profile.isCouplePlanning || false;
  if (owner === 'partner' && !isCouple) return 0;

  const currentPots = owner === 'partner'
    ? sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS)
    : pots;

  const grossSalary = owner === 'partner'
    ? (profile.partnerGrossAnnualSalary || 0)
    : (profile.grossAnnualSalary || 0);

  const currentAge = owner === 'partner'
    ? (profile.partnerCurrentAge || 50)
    : (profile.currentAge || 50);

  const retireAge = owner === 'partner'
    ? (profile.partnerTargetRetirementAge || 57)
    : (profile.targetRetirementAge || 55);

  // Check profile.oneOffContributions for active regular monthly items or active one-offs
  const activeOneOffs = (profile.oneOffContributions || []).filter((c) => {
    if (!c.enabled) return false;
    const cOwner = c.owner || 'primary';
    return cOwner === owner && c.targetPot === targetPot;
  });

  let totalFromOneOffs = 0;
  let hasRegularInOneOffs = false;

  activeOneOffs.forEach((c) => {
    const isRegular = c.frequency === 'regular_monthly';
    if (isRegular) {
      let startAge = c.startAge ?? currentAge;
      let endAge = c.endAge ?? retireAge;
      if (currentAge >= startAge && currentAge <= endAge && currentAge < retireAge) {
        hasRegularInOneOffs = true;
        if (targetPot === 'workplace_pension') {
          if (c.workplaceContributionType === 'fixed') {
            const emp = (c.employeeMonthlyAmount ?? c.grossAmount ?? 0) * 12;
            const empr = (c.employerMonthlyAmount ?? 0) * 12;
            totalFromOneOffs += emp + empr;
          } else {
            const empPct = c.employeePercent ?? 5;
            const emprPct = c.employerPercent ?? 3;
            totalFromOneOffs += Math.round(grossSalary * ((empPct + emprPct) / 100));
          }
        } else if (targetPot === 'sipp') {
          const rawAmt = (c.grossAmount || 0) * 12;
          totalFromOneOffs += c.sippContributionType === 'gross' ? rawAmt : rawAmt * 1.25;
        } else {
          totalFromOneOffs += (c.grossAmount || 0) * 12;
        }
      }
    } else {
      const evalCalYear = new Date().getFullYear();
      let cYear = evalCalYear;
      if (c.date && c.date.trim() !== '') {
        const parts = c.date.split('-');
        if (parts.length >= 1) {
          const y = parseInt(parts[0], 10);
          if (!isNaN(y)) cYear = y;
        }
      }
      if (cYear === evalCalYear) {
        totalFromOneOffs += c.grossAmount || 0;
      }
    }
  });

  if (hasRegularInOneOffs) {
    return Math.round(totalFromOneOffs);
  }

  // Fallback to baseline pots configuration if no regular items in oneOffContributions
  let baselineFromPot = 0;
  if (currentAge < retireAge) {
    switch (targetPot) {
      case 'workplace_pension': {
        const empType = currentPots.workplacePensionMonthlyEmployeeType || 'percent';
        const empVal = currentPots.workplacePensionMonthlyEmployee || 0;
        const emprVal = currentPots.employerMatchPercentage || 0;
        if (empType === 'percent') {
          baselineFromPot = Math.round(grossSalary * ((empVal + emprVal) / 100));
        } else {
          baselineFromPot = (empVal * 12) + Math.round(grossSalary * (emprVal / 100));
        }
        break;
      }
      case 'sipp': {
        const monthly = currentPots.sippMonthlyContribution || 0;
        const type = currentPots.sippContributionType || 'net';
        const annualRaw = monthly * 12;
        baselineFromPot = type === 'gross' ? annualRaw : annualRaw * 1.25;
        break;
      }
      case 'stocks_and_shares_isa':
        baselineFromPot = (currentPots.stocksAndSharesIsaMonthlyContribution || 0) * 12;
        break;
      case 'cash_isa':
        baselineFromPot = (currentPots.cashIsaMonthlyContribution || 0) * 12;
        break;
      case 'lisa':
        baselineFromPot = currentAge < 50 ? (currentPots.lisaMonthlyContribution || 0) * 12 : 0;
        break;
      case 'gia':
        baselineFromPot = (currentPots.giaMonthlyContribution || 0) * 12;
        break;
      case 'cash_savings':
        baselineFromPot = (currentPots.cashSavingsMonthlyContribution || 0) * 12;
        break;
    }
  }

  return Math.round(baselineFromPot + totalFromOneOffs);
}

export async function generateFormulaExcelWorkbook(
  profile: UserProfile,
  pots: InvestmentPots,
  projections: YearProjection[],
  planName?: string
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RetireFree UK Engine';
  workbook.created = new Date();
  workbook.calcProperties = {
    fullCalcOnLoad: true,
  };

  const isCouple = profile.isCouplePlanning || false;
  const partnerPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

  // ==========================================
  // STYLING & COLORS
  // ==========================================
  const cyanFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF06B6D4' }, // Cyan 500
  };

  const purpleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B5CF6' }, // Purple 500
  };

  const blueFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Blue 600
  };

  const emeraldFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }, // Emerald 500
  };

  const darkSlateFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };

  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }, // Slate 50
  };

  const sectionHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }, // Slate 200
  };

  const fontWhiteBold: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const fontSectionHeader: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FF1E293B' },
  };

  const fontBold: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
  };

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  // ==========================================
  // SHEET 1: Inputs & Setup (Master Configuration)
  // ==========================================
  const wsInputs = workbook.addWorksheet('Inputs & Setup');
  wsInputs.columns = [
    { header: 'Parameter / Asset Holding', key: 'a', width: 36 },
    { header: 'YOU Value (£)', key: 'b', width: 22 },
    { header: 'YOU Contrib (£/yr)', key: 'c', width: 22 },
    { header: 'PARTNER Value (£)', key: 'd', width: 22 },
    { header: 'PARTNER Contrib (£/yr)', key: 'e', width: 22 },
    { header: 'Household Total / Notes', key: 'f', width: 36 },
  ];

  // Row 1: Title Banner
  const titleRow = wsInputs.getRow(1);
  titleRow.height = 32;
  titleRow.getCell(1).value = `RETIREFREE UK - MASTER FORMULA MODEL (${planName || 'Current Plan'})`;
  titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = darkSlateFill;
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsInputs.mergeCells('A1:F1');

  wsInputs.addRow([]); // Row 2 Blank

  // --- SECTION 1: GLOBAL CONTROL & TAX PARAMETERS ---
  wsInputs.addRow(['1. UK TAX BANDS & MACRO PARAMETERS', '', '', '', '', 'Standard UK April Tax Rules']);
  const s1Row = wsInputs.getRow(3);
  s1Row.height = 24;
  s1Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const currentYear = new Date().getFullYear();
  wsInputs.addRow(['Current Tax Year', currentYear, '', '', '', 'Benchmark start year (Cell B4)']); // Row 4
  wsInputs.addRow(['Personal Tax Allowance (£)', 12570, '', '', '', 'Tax-free income allowance (Cell B5)']); // Row 5
  wsInputs.addRow(['Basic Rate Tax Band Threshold (£)', 50270, '', '', '', '20% Tax Band Ceiling (Cell B6)']); // Row 6
  wsInputs.addRow(['Higher Rate Tax Band Threshold (£)', 125140, '', '', '', '40% Tax Band Ceiling (Cell B7)']); // Row 7
  wsInputs.addRow(['Lump Sum Allowance LSA Cap (£)', 268275, '', '', '', '25% Tax-free PCLS limit (Cell B8)']); // Row 8

  // Apply explicit formats for Section 1
  wsInputs.getCell('B4').numFmt = '0'; // Year formatted as plain integer
  wsInputs.getCell('B5').numFmt = '£#,##0';
  wsInputs.getCell('B6').numFmt = '£#,##0';
  wsInputs.getCell('B7').numFmt = '£#,##0';
  wsInputs.getCell('B8').numFmt = '£#,##0';

  wsInputs.addRow([]); // Row 9 Blank

  // --- SECTION 2: MACRO & ASSET GROWTH ASSUMPTIONS ---
  wsInputs.addRow(['2. ASSET GROWTH & MACRO RATES (%)', '', '', '', '', 'Annual Nominal Growth Rates']);
  const s2Row = wsInputs.getRow(10);
  s2Row.height = 24;
  s2Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  wsInputs.addRow(['Inflation Growth Rate (%)', (profile.expectedInflationRate || 2.5) / 100, '', '', '', 'CPI Annual Inflation Index (Cell B11)']); // Row 11
  wsInputs.addRow(['DC Pension Asset Growth Rate (%)', (profile.expectedInvestmentReturn || 5.0) / 100, '', '', '', 'Net Annual Growth Rate (Cell B12)']); // Row 12
  wsInputs.addRow(['ISA Investment Growth Rate (%)', (profile.expectedInvestmentReturn || 5.0) / 100, '', '', '', 'Net Annual Growth Rate (Cell B13)']); // Row 13
  wsInputs.addRow(['Cash & Savings Growth Rate (%)', 0.030, '', '', '', 'Net Cash Interest Rate (Cell B14)']); // Row 14
  wsInputs.addRow(['State Pension Triple Lock Growth (%)', 0.025, '', '', '', 'Annual State Pension Index (Cell B15)']); // Row 15

  for (let r = 11; r <= 15; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0.00%';
  }

  wsInputs.addRow([]); // Row 16 Blank

  // --- SECTION 3: PERSONAL PROFILE & AGES ---
  wsInputs.addRow(['3. PERSONAL PROFILE & AGES', 'YOU', '', 'PARTNER', '', 'Age Benchmark Targets']);
  const s3Row = wsInputs.getRow(17);
  s3Row.height = 24;
  s3Row.eachCell((cell) => {
    cell.fill = purpleFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryNmpa = profile.protectedPensionAccessAge || profile.pensionAccessAge || 57;
  const partnerNmpa = profile.partnerProtectedPensionAccessAge || profile.partnerPensionAccessAge || 57;

  wsInputs.addRow(['Current Age', profile.currentAge || 50, '', isCouple ? (profile.partnerCurrentAge || 50) : 0, '', 'Cells B18 & D18']); // Row 18
  wsInputs.addRow(['Normal Minimum Pension Access Age (NMPA)', primaryNmpa, '', isCouple ? partnerNmpa : 0, '', 'Cells B19 & D19']); // Row 19
  wsInputs.addRow(['Target Retirement Age', profile.targetRetirementAge || 55, '', isCouple ? (profile.partnerTargetRetirementAge || 57) : 0, '', 'Cells B20 & D20']); // Row 20
  wsInputs.addRow(['State Pension Start Age (SPA)', profile.statePensionAge || 67, '', isCouple ? (profile.partnerStatePensionAge || 67) : 67, '', 'Cells B21 & D21']); // Row 21
  wsInputs.addRow(['State Pension Today (£/yr)', profile.statePensionAmountAnnual || 12548, '', isCouple ? (profile.partnerStatePensionAmountAnnual || 12548) : 0, '', 'Cells B22 & D22']); // Row 22

  for (let r = 18; r <= 21; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0';
    wsInputs.getCell(`D${r}`).numFmt = '0';
  }
  wsInputs.getCell('B22').numFmt = '£#,##0';
  wsInputs.getCell('D22').numFmt = '£#,##0';

  wsInputs.addRow([]); // Row 23 Blank

  // --- SECTION 4: INDIVIDUAL LIQUID ASSETS & ANNUAL TOP-UPS ---
  wsInputs.addRow(['4. LIQUID ASSET POTS & TOP-UPS', 'YOU Value (£)', 'YOU Contrib (£/yr)', 'PARTNER Value (£)', 'PARTNER Contrib (£/yr)', 'Household Total']);
  const s4Row = wsInputs.getRow(24);
  s4Row.height = 26;
  s4Row.eachCell((cell) => {
    cell.fill = cyanFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Calculate YOU annual contributions from pots + oneOffContributions
  const primaryWorkplaceAnnual = computeAnnualContributionForPot('workplace_pension', 'primary', profile, pots);
  const primarySippAnnual = computeAnnualContributionForPot('sipp', 'primary', profile, pots);
  const primarySnsIsaAnnual = computeAnnualContributionForPot('stocks_and_shares_isa', 'primary', profile, pots);
  const primaryCashIsaAnnual = computeAnnualContributionForPot('cash_isa', 'primary', profile, pots);
  const primaryLisaAnnual = computeAnnualContributionForPot('lisa', 'primary', profile, pots);
  const primaryGiaAnnual = computeAnnualContributionForPot('gia', 'primary', profile, pots);
  const primaryCashSavingsAnnual = computeAnnualContributionForPot('cash_savings', 'primary', profile, pots);

  // Calculate PARTNER annual contributions from partnerPots + oneOffContributions
  const partnerWorkplaceAnnual = computeAnnualContributionForPot('workplace_pension', 'partner', profile, pots);
  const partnerSippAnnual = computeAnnualContributionForPot('sipp', 'partner', profile, pots);
  const partnerSnsIsaAnnual = computeAnnualContributionForPot('stocks_and_shares_isa', 'partner', profile, pots);
  const partnerCashIsaAnnual = computeAnnualContributionForPot('cash_isa', 'partner', profile, pots);
  const partnerLisaAnnual = computeAnnualContributionForPot('lisa', 'partner', profile, pots);
  const partnerGiaAnnual = computeAnnualContributionForPot('gia', 'partner', profile, pots);
  const partnerCashSavingsAnnual = computeAnnualContributionForPot('cash_savings', 'partner', profile, pots);

  const primaryTotalBal = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0) + (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.lisaBalance || 0) + (pots.giaBalance || 0) + (pots.cashSavingsBalance || 0);
  const primaryTotalAnnual = primaryWorkplaceAnnual + primarySippAnnual + primarySnsIsaAnnual + primaryCashIsaAnnual + primaryLisaAnnual + primaryGiaAnnual + primaryCashSavingsAnnual;

  const partnerTotalBal = isCouple ? ((partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0) + (partnerPots.stocksAndSharesIsaBalance || 0) + (partnerPots.cashIsaBalance || 0) + (partnerPots.lisaBalance || 0) + (partnerPots.giaBalance || 0) + (partnerPots.cashSavingsBalance || 0)) : 0;
  const partnerTotalAnnual = partnerWorkplaceAnnual + partnerSippAnnual + partnerSnsIsaAnnual + partnerCashIsaAnnual + partnerLisaAnnual + partnerGiaAnnual + partnerCashSavingsAnnual;

  // Row 25: Workplace Pension
  wsInputs.addRow([
    'Workplace Pension (Employer / Workplace)',
    pots.workplacePensionBalance || 0,
    primaryWorkplaceAnnual,
    isCouple ? (partnerPots.workplacePensionBalance || 0) : 0,
    partnerWorkplaceAnnual,
    '',
  ]);
  wsInputs.getCell('F25').value = { formula: 'B25+D25', result: (pots.workplacePensionBalance || 0) + (isCouple ? (partnerPots.workplacePensionBalance || 0) : 0) };

  // Row 26: SIPP Pension (DC 1)
  wsInputs.addRow([
    'Pension DC 1 (SIPP / Private Pension)',
    pots.sippBalance || 0,
    primarySippAnnual,
    isCouple ? (partnerPots.sippBalance || 0) : 0,
    partnerSippAnnual,
    '',
  ]);
  wsInputs.getCell('F26').value = { formula: 'B26+D26', result: (pots.sippBalance || 0) + (isCouple ? (partnerPots.sippBalance || 0) : 0) };

  // Row 27: Stocks & Shares ISA
  wsInputs.addRow([
    'Stocks & Shares ISA (Investment Platforms)',
    pots.stocksAndSharesIsaBalance || 0,
    primarySnsIsaAnnual,
    isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0,
    partnerSnsIsaAnnual,
    '',
  ]);
  wsInputs.getCell('F27').value = { formula: 'B27+D27', result: (pots.stocksAndSharesIsaBalance || 0) + (isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0) };

  // Row 28: Cash ISA
  wsInputs.addRow([
    'Cash ISA',
    pots.cashIsaBalance || 0,
    primaryCashIsaAnnual,
    isCouple ? (partnerPots.cashIsaBalance || 0) : 0,
    partnerCashIsaAnnual,
    '',
  ]);
  wsInputs.getCell('F28').value = { formula: 'B28+D28', result: (pots.cashIsaBalance || 0) + (isCouple ? (partnerPots.cashIsaBalance || 0) : 0) };

  // Row 29: Lifetime ISA (LISA)
  wsInputs.addRow([
    'Lifetime ISA (LISA)',
    pots.lisaBalance || 0,
    primaryLisaAnnual,
    isCouple ? (partnerPots.lisaBalance || 0) : 0,
    partnerLisaAnnual,
    '',
  ]);
  wsInputs.getCell('F29').value = { formula: 'B29+D29', result: (pots.lisaBalance || 0) + (isCouple ? (partnerPots.lisaBalance || 0) : 0) };

  // Row 30: General Investment Account (GIA)
  wsInputs.addRow([
    'General Investment Account (GIA)',
    pots.giaBalance || 0,
    primaryGiaAnnual,
    isCouple ? (partnerPots.giaBalance || 0) : 0,
    partnerGiaAnnual,
    '',
  ]);
  wsInputs.getCell('F30').value = { formula: 'B30+D30', result: (pots.giaBalance || 0) + (isCouple ? (partnerPots.giaBalance || 0) : 0) };

  // Row 31: Cash Savings & Premium Bonds
  wsInputs.addRow([
    'Cash Savings & Premium Bonds',
    pots.cashSavingsBalance || 0,
    primaryCashSavingsAnnual,
    isCouple ? (partnerPots.cashSavingsBalance || 0) : 0,
    partnerCashSavingsAnnual,
    '',
  ]);
  wsInputs.getCell('F31').value = { formula: 'B31+D31', result: (pots.cashSavingsBalance || 0) + (isCouple ? (partnerPots.cashSavingsBalance || 0) : 0) };

  // Row 32: TOTAL LIQUID ASSETS ROW
  wsInputs.addRow(['TOTAL ASSETS & ANNUAL TOP-UPS', '', '', '', '', '']);
  const totAssetsRow = wsInputs.getRow(32);
  totAssetsRow.height = 24;
  totAssetsRow.font = fontBold;
  wsInputs.getCell('B32').value = { formula: 'SUM(B25:B31)', result: primaryTotalBal };
  wsInputs.getCell('C32').value = { formula: 'SUM(C25:C31)', result: primaryTotalAnnual };
  wsInputs.getCell('D32').value = { formula: 'SUM(D25:D31)', result: partnerTotalBal };
  wsInputs.getCell('E32').value = { formula: 'SUM(E25:E31)', result: partnerTotalAnnual };
  wsInputs.getCell('F32').value = { formula: 'B32+D32', result: primaryTotalBal + partnerTotalBal };

  for (let r = 25; r <= 32; r++) {
    for (const col of ['B', 'C', 'D', 'E', 'F']) {
      wsInputs.getCell(`${col}${r}`).numFmt = '£#,##0';
    }
  }

  wsInputs.addRow([]); // Row 33 Blank

  // --- SECTION 5: COMBINED POT CATEGORY TOTALS ---
  wsInputs.addRow(['5. COMBINED POT CATEGORY TOTALS', 'Household Total (£)', 'YOU (£)', 'PARTNER (£)', '', 'Formula Summary Mapping']);
  const s5Row = wsInputs.getRow(34);
  s5Row.height = 24;
  s5Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  // Row 35: Category Header Row
  wsInputs.addRow(['Category Name', 'Household Sum', 'YOU Subtotal', 'PARTNER Subtotal', '', 'Schedule Mapping']);

  const primaryPensionBal = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0);
  const partnerPensionBal = isCouple ? ((partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0)) : 0;
  const primaryPensionAnnual = primaryWorkplaceAnnual + primarySippAnnual;
  const partnerPensionAnnual = partnerWorkplaceAnnual + partnerSippAnnual;

  const primaryIsaBal = (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.lisaBalance || 0);
  const partnerIsaBal = isCouple ? ((partnerPots.stocksAndSharesIsaBalance || 0) + (partnerPots.cashIsaBalance || 0) + (partnerPots.lisaBalance || 0)) : 0;
  const primaryIsaAnnual = primarySnsIsaAnnual + primaryCashIsaAnnual + primaryLisaAnnual;
  const partnerIsaAnnual = partnerSnsIsaAnnual + partnerCashIsaAnnual + partnerLisaAnnual;

  const primaryCashBal = (pots.giaBalance || 0) + (pots.cashSavingsBalance || 0);
  const partnerCashBal = isCouple ? ((partnerPots.giaBalance || 0) + (partnerPots.cashSavingsBalance || 0)) : 0;
  const primaryCashAnnual = primaryGiaAnnual + primaryCashSavingsAnnual;
  const partnerCashAnnual = partnerGiaAnnual + partnerCashSavingsAnnual;

  // Row 36: DC Pensions Total (Workplace + SIPP)
  wsInputs.addRow(['DC Pensions Balance Total', '', '', '', '', 'Mapped to Schedule Pension Balances']);
  wsInputs.getCell('C36').value = { formula: 'B25+B26', result: primaryPensionBal };
  wsInputs.getCell('D36').value = { formula: 'D25+D26', result: partnerPensionBal };
  wsInputs.getCell('B36').value = { formula: 'C36+D36', result: primaryPensionBal + partnerPensionBal };

  // Row 37: Annual DC Pension Contributions
  wsInputs.addRow(['Annual DC Pension Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C37').value = { formula: 'C25+C26', result: primaryPensionAnnual };
  wsInputs.getCell('D37').value = { formula: 'E25+E26', result: partnerPensionAnnual };
  wsInputs.getCell('B37').value = { formula: 'C37+D37', result: primaryPensionAnnual + partnerPensionAnnual };

  // Row 38: ISA Investments Total (S&S ISA + Cash ISA + LISA)
  wsInputs.addRow(['ISA Investments Balance Total', '', '', '', '', 'Mapped to Schedule ISA Balances']);
  wsInputs.getCell('C38').value = { formula: 'B27+B28+B29', result: primaryIsaBal };
  wsInputs.getCell('D38').value = { formula: 'D27+D28+D29', result: partnerIsaBal };
  wsInputs.getCell('B38').value = { formula: 'C38+D38', result: primaryIsaBal + partnerIsaBal };

  // Row 39: Annual ISA Contributions
  wsInputs.addRow(['Annual ISA Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C39').value = { formula: 'C27+C28+C29', result: primaryIsaAnnual };
  wsInputs.getCell('D39').value = { formula: 'E27+E28+E29', result: partnerIsaAnnual };
  wsInputs.getCell('B39').value = { formula: 'C39+D39', result: primaryIsaAnnual + partnerIsaAnnual };

  // Row 40: Cash & GIA Total (GIA + Cash Savings)
  wsInputs.addRow(['Cash & GIA Balance Total', '', '', '', '', 'Mapped to Cash Buffer Balances']);
  wsInputs.getCell('C40').value = { formula: 'B30+B31', result: primaryCashBal };
  wsInputs.getCell('D40').value = { formula: 'D30+D31', result: partnerCashBal };
  wsInputs.getCell('B40').value = { formula: 'C40+D40', result: primaryCashBal + partnerCashBal };

  // Row 41: Annual Cash & GIA Contributions
  wsInputs.addRow(['Annual Cash & GIA Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C41').value = { formula: 'C30+C31', result: primaryCashAnnual };
  wsInputs.getCell('D41').value = { formula: 'E30+E31', result: partnerCashAnnual };
  wsInputs.getCell('B41').value = { formula: 'C41+D41', result: primaryCashAnnual + partnerCashAnnual };

  for (let r = 36; r <= 41; r++) {
    for (const col of ['B', 'C', 'D']) {
      wsInputs.getCell(`${col}${r}`).numFmt = '£#,##0';
    }
  }

  wsInputs.addRow([]); // Row 42 Blank

  // --- SECTION 6: PHASED RETIREMENT DRAWDOWN TARGETS ---
  wsInputs.addRow(['6. PHASED INCOME SPENDING TARGETS', 'Start Age', 'End Age', 'Net Target (£/yr)', '', 'Phased Spending Requirements']);
  const s6Row = wsInputs.getRow(43);
  s6Row.height = 24;
  s6Row.eachCell((cell) => {
    cell.fill = blueFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const spendingPhases = profile.spendingPhases;
  const isPhasesEnabled = spendingPhases?.enabled;
  const baseTargetNet = profile.targetRetirementIncomeAnnual || 35000;

  const goGoStartAge = profile.targetRetirementAge || 52;
  const goGoEndAge = isPhasesEnabled && spendingPhases?.goGoEndAge ? spendingPhases.goGoEndAge : 66;
  const goGoIncome = isPhasesEnabled && spendingPhases?.goGoIncomeAnnual ? spendingPhases.goGoIncomeAnnual : Math.round(baseTargetNet * 1.15);

  const slowGoStartAge = goGoEndAge + 1;
  const slowGoEndAge = isPhasesEnabled && spendingPhases?.slowGoEndAge ? spendingPhases.slowGoEndAge : 75;
  const slowGoIncome = isPhasesEnabled && spendingPhases?.slowGoIncomeAnnual ? spendingPhases.slowGoIncomeAnnual : baseTargetNet;

  const noGoStartAge = slowGoEndAge + 1;
  const noGoEndAge = 120;
  const noGoIncome = isPhasesEnabled && spendingPhases?.noGoIncomeAnnual ? spendingPhases.noGoIncomeAnnual : Math.round(baseTargetNet * 0.75);

  // Row 44: GO GO Phase
  wsInputs.addRow(['GO-GO Phase (Active Lifestyle)', goGoStartAge, goGoEndAge, goGoIncome, '', 'Cell D44']);
  // Row 45: Slow GO Phase
  wsInputs.addRow(['Slow-GO Phase (Moderate Lifestyle)', slowGoStartAge, slowGoEndAge, slowGoIncome, '', 'Cell D45']);
  // Row 46: No GO Phase
  wsInputs.addRow(['No-GO Phase (Passive / Care)', noGoStartAge, noGoEndAge, noGoIncome, '', 'Cell D46']);

  for (let r = 44; r <= 46; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0';
    wsInputs.getCell(`C${r}`).numFmt = '0';
    wsInputs.getCell(`D${r}`).numFmt = '£#,##0';
  }

  wsInputs.addRow([]); // Row 47 Blank

  // --- SECTION 7: FIXED INCOME (DB PENSIONS) ---
  wsInputs.addRow(['7. FIXED INCOME (DB PENSIONS)', 'Start Age', 'End Age', 'YOU Annual (£)', 'PARTNER Annual (£)', 'Indexation & Notes']);
  const s7Row = wsInputs.getRow(48);
  s7Row.height = 24;
  s7Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const primaryDbList = (profile.dbPensions || []).filter((db) => db.enabled && db.owner !== 'partner');
  const partnerDbList = (profile.dbPensions || []).filter((db) => db.enabled && db.owner === 'partner');

  const primaryDb1 = primaryDbList[0];
  const partnerDb1 = partnerDbList[0];

  const primaryDbStartAge = primaryDb1 ? primaryDb1.startAge : 60;
  const primaryDbAmount = primaryDb1 ? primaryDb1.annualIncome : 0;

  const partnerDbStartAge = partnerDb1 ? partnerDb1.startAge : 60;
  const partnerDbAmount = partnerDb1 ? partnerDb1.annualIncome : 0;

  // Row 49: DB Pension 1
  wsInputs.addRow(['Defined Benefit Pension (DB 1)', primaryDbStartAge, 120, primaryDbAmount, partnerDbAmount, 'Cell D49 & E49']);
  // Row 50: Additional Fixed Income / Rental
  wsInputs.addRow(['Part-Time Work / Rental / Fixed Income', 50, 60, 0, 0, 'Cell D50 & E50']);

  for (let r = 49; r <= 50; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0';
    wsInputs.getCell(`C${r}`).numFmt = '0';
    wsInputs.getCell(`D${r}`).numFmt = '£#,##0';
    wsInputs.getCell(`E${r}`).numFmt = '£#,##0';
  }

  // --- SECTION 8: ONE-OFF LUMP SUM CONTRIBUTIONS ---
  wsInputs.addRow([]); // Row 51 Blank
  wsInputs.addRow(['8. ONE-OFF LUMP SUM CONTRIBUTIONS', 'Owner', 'Target Category', 'Execution Year', 'Out-of-Pocket (£)', 'SIPP Relief (£)', 'Gross Inflow (£)']);
  const s8Row = wsInputs.getRow(52);
  s8Row.height = 24;
  s8Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const activeOneOffs = (profile.oneOffContributions || []).filter(
    (c) => c.enabled !== false && c.frequency !== 'regular_monthly'
  );

  const oneOffStartRow = 54;
  if (activeOneOffs.length > 0) {
    activeOneOffs.forEach((c) => {
      const cOwner = c.owner === 'partner' ? 'PARTNER' : 'YOU';
      const cat = getPotCategoryName(c.targetPot);
      const cYear = getContributionYear(c, profile.currentAge || 50);
      const rawAmt = c.grossAmount || 0;
      let outOfPocket = rawAmt;
      let relief = 0;
      if (c.targetPot === 'sipp') {
        if (c.sippContributionType === 'gross') {
          outOfPocket = Math.round(rawAmt * 0.8);
          relief = Math.round(rawAmt * 0.2);
        } else {
          outOfPocket = rawAmt;
          relief = Math.round(rawAmt * 0.25);
        }
      }
      const nextR = wsInputs.lastRow!.number + 1;
      wsInputs.addRow([
        c.name || 'One-Off Contribution',
        cOwner,
        cat,
        cYear,
        outOfPocket,
        relief,
        { formula: `E${nextR}+F${nextR}`, result: outOfPocket + relief }
      ]);
      const currRow = wsInputs.lastRow!;
      currRow.getCell(4).numFmt = '0';
      currRow.getCell(5).numFmt = '£#,##0';
      currRow.getCell(6).numFmt = '£#,##0';
      currRow.getCell(7).numFmt = '£#,##0';
    });
  } else {
    wsInputs.addRow(['No active one-off contributions', 'N/A', 'N/A', 2099, 0, 0, 0]);
    const currRow = wsInputs.lastRow!;
    currRow.getCell(4).numFmt = '0';
    currRow.getCell(5).numFmt = '£#,##0';
    currRow.getCell(6).numFmt = '£#,##0';
    currRow.getCell(7).numFmt = '£#,##0';
  }
  const oneOffEndRow = wsInputs.lastRow!.number;

  // Row total for One-Off Contributions
  wsInputs.addRow([
    'TOTAL ONE-OFF CONTRIBUTIONS',
    '',
    '',
    '',
    { formula: `SUM(E${oneOffStartRow}:E${oneOffEndRow})`, result: 0 },
    { formula: `SUM(F${oneOffStartRow}:F${oneOffEndRow})`, result: 0 },
    { formula: `SUM(G${oneOffStartRow}:G${oneOffEndRow})`, result: 0 }
  ]);
  const oneOffTotRow = wsInputs.lastRow!;
  oneOffTotRow.font = fontBold;
  oneOffTotRow.getCell(5).numFmt = '£#,##0';
  oneOffTotRow.getCell(6).numFmt = '£#,##0';
  oneOffTotRow.getCell(7).numFmt = '£#,##0';

  wsInputs.addRow([]); // Blank row

  // --- SECTION 9: POT TRANSFERS & CROSS-POT MOVEMENTS ---
  const transfersHeaderRow = wsInputs.lastRow!.number + 1;
  wsInputs.addRow(['9. POT TRANSFERS & CROSS-POT MOVEMENTS', 'Source Pot', 'Destination Pot', 'Execution Year', 'Source Category', 'Dest Category', 'Outflow (£)', 'SIPP Relief (£)', 'Inflow (£)']);
  const s9Row = wsInputs.getRow(transfersHeaderRow);
  s9Row.height = 24;
  s9Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const activeTransfers = (profile.potTransfers || []).filter((t) => t.enabled !== false);
  const transfersStartRow = transfersHeaderRow + 1;

  if (activeTransfers.length > 0) {
    activeTransfers.forEach((t) => {
      const srcOwnerStr = t.owner === 'partner' ? 'PARTNER' : 'YOU';
      const dstOwnerStr = (t.destinationOwner || t.owner) === 'partner' ? 'PARTNER' : 'YOU';
      const srcStr = `${srcOwnerStr} - ${getPotDisplayName(t.sourcePot)}`;
      const dstStr = `${dstOwnerStr} - ${getPotDisplayName(t.destinationPot)}`;
      const tYear = getTransferYear(t, profile.currentAge || 50);
      const srcCat = getPotCategoryName(t.sourcePot);
      const dstCat = getPotCategoryName(t.destinationPot);
      const amt = t.amount || 0;
      const relief = (t.destinationPot === 'sipp' && t.sourcePot !== 'sipp' && t.sourcePot !== 'workplace_pension') ? Math.round(amt * 0.25) : 0;
      const targetRowNum = wsInputs.lastRow!.number + 1;

      wsInputs.addRow([
        t.name || 'Pot Transfer',
        srcStr,
        dstStr,
        tYear,
        srcCat,
        dstCat,
        amt,
        relief,
        { formula: `G${targetRowNum}+H${targetRowNum}`, result: amt + relief }
      ]);
      const currRow = wsInputs.lastRow!;
      currRow.getCell(4).numFmt = '0';
      currRow.getCell(7).numFmt = '£#,##0';
      currRow.getCell(8).numFmt = '£#,##0';
      currRow.getCell(9).numFmt = '£#,##0';
    });
  } else {
    wsInputs.addRow(['No active pot transfers', 'N/A', 'N/A', 2099, 'N/A', 'N/A', 0, 0, 0]);
    const currRow = wsInputs.lastRow!;
    currRow.getCell(4).numFmt = '0';
    currRow.getCell(7).numFmt = '£#,##0';
    currRow.getCell(8).numFmt = '£#,##0';
    currRow.getCell(9).numFmt = '£#,##0';
  }
  const transfersEndRow = wsInputs.lastRow!.number;

  // Row total for Transfers
  wsInputs.addRow([
    'TOTAL POT TRANSFERS',
    '',
    '',
    '',
    '',
    '',
    { formula: `SUM(G${transfersStartRow}:G${transfersEndRow})`, result: 0 },
    { formula: `SUM(H${transfersStartRow}:H${transfersEndRow})`, result: 0 },
    { formula: `SUM(I${transfersStartRow}:I${transfersEndRow})`, result: 0 }
  ]);
  const transfersTotRow = wsInputs.lastRow!;
  transfersTotRow.font = fontBold;
  transfersTotRow.getCell(7).numFmt = '£#,##0';
  transfersTotRow.getCell(8).numFmt = '£#,##0';
  transfersTotRow.getCell(9).numFmt = '£#,##0';

  // Format borders on wsInputs
  wsInputs.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) {
      row.eachCell((cell) => {
        cell.border = borderThin;
      });
    }
  });


  // ==========================================
  // SHEET 2: Contributions (Dedicated Contribution Schedule)
  // ==========================================
  const wsContrib = workbook.addWorksheet('Contributions');

  // Title Row (Row 1)
  const contribTitle = wsContrib.getRow(1);
  contribTitle.height = 32;
  contribTitle.getCell(1).value = `RETIREFREE UK - CONTRIBUTION SCHEDULE & ACCUMULATION TOP-UPS`;
  contribTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  contribTitle.getCell(1).fill = emeraldFill;
  contribTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsContrib.mergeCells('A1:G1');

  wsContrib.addRow([]); // Row 2 Blank

  // Section 1 Header (Row 3): Contribution Summary Table
  wsContrib.addRow(['1. BASELINE CONTRIBUTION BREAKDOWN BY ASSET POT', 'YOU Monthly (£/mo)', 'YOU Annual (£/yr)', 'PARTNER Monthly (£/mo)', 'PARTNER Annual (£/yr)', 'Household Monthly (£/mo)', 'Household Annual (£/yr)']);
  const cSec1Row = wsContrib.getRow(3);
  cSec1Row.height = 24;
  cSec1Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Rows 4 - 10: Individual Pot Contribution Breakdown
  wsContrib.addRow(['Workplace Pension', { formula: "='Inputs & Setup'!C25/12", result: primaryWorkplaceAnnual / 12 }, { formula: "='Inputs & Setup'!C25", result: primaryWorkplaceAnnual }, { formula: "='Inputs & Setup'!E25/12", result: partnerWorkplaceAnnual / 12 }, { formula: "='Inputs & Setup'!E25", result: partnerWorkplaceAnnual }, { formula: '=B4+D4', result: (primaryWorkplaceAnnual + partnerWorkplaceAnnual) / 12 }, { formula: '=C4+E4', result: primaryWorkplaceAnnual + partnerWorkplaceAnnual }]);
  wsContrib.addRow(['Private Pension / SIPP', { formula: "='Inputs & Setup'!C26/12", result: primarySippAnnual / 12 }, { formula: "='Inputs & Setup'!C26", result: primarySippAnnual }, { formula: "='Inputs & Setup'!E26/12", result: partnerSippAnnual / 12 }, { formula: "='Inputs & Setup'!E26", result: partnerSippAnnual }, { formula: '=B5+D5', result: (primarySippAnnual + partnerSippAnnual) / 12 }, { formula: '=C5+E5', result: primarySippAnnual + partnerSippAnnual }]);
  wsContrib.addRow(['Stocks & Shares ISA', { formula: "='Inputs & Setup'!C27/12", result: primarySnsIsaAnnual / 12 }, { formula: "='Inputs & Setup'!C27", result: primarySnsIsaAnnual }, { formula: "='Inputs & Setup'!E27/12", result: partnerSnsIsaAnnual / 12 }, { formula: "='Inputs & Setup'!E27", result: partnerSnsIsaAnnual }, { formula: '=B6+D6', result: (primarySnsIsaAnnual + partnerSnsIsaAnnual) / 12 }, { formula: '=C6+E6', result: primarySnsIsaAnnual + partnerSnsIsaAnnual }]);
  wsContrib.addRow(['Cash ISA', { formula: "='Inputs & Setup'!C28/12", result: primaryCashIsaAnnual / 12 }, { formula: "='Inputs & Setup'!C28", result: primaryCashIsaAnnual }, { formula: "='Inputs & Setup'!E28/12", result: partnerCashIsaAnnual / 12 }, { formula: "='Inputs & Setup'!E28", result: partnerCashIsaAnnual }, { formula: '=B7+D7', result: (primaryCashIsaAnnual + partnerCashIsaAnnual) / 12 }, { formula: '=C7+E7', result: primaryCashIsaAnnual + partnerCashIsaAnnual }]);
  wsContrib.addRow(['Lifetime ISA (LISA)', { formula: "='Inputs & Setup'!C29/12", result: primaryLisaAnnual / 12 }, { formula: "='Inputs & Setup'!C29", result: primaryLisaAnnual }, { formula: "='Inputs & Setup'!E29/12", result: partnerLisaAnnual / 12 }, { formula: "='Inputs & Setup'!E29", result: partnerLisaAnnual }, { formula: '=B8+D8', result: (primaryLisaAnnual + partnerLisaAnnual) / 12 }, { formula: '=C8+E8', result: primaryLisaAnnual + partnerLisaAnnual }]);
  wsContrib.addRow(['General Investment Account (GIA)', { formula: "='Inputs & Setup'!C30/12", result: primaryGiaAnnual / 12 }, { formula: "='Inputs & Setup'!C30", result: primaryGiaAnnual }, { formula: "='Inputs & Setup'!E30/12", result: partnerGiaAnnual / 12 }, { formula: "='Inputs & Setup'!E30", result: partnerGiaAnnual }, { formula: '=B9+D9', result: (primaryGiaAnnual + partnerGiaAnnual) / 12 }, { formula: '=C9+E9', result: primaryGiaAnnual + partnerGiaAnnual }]);
  wsContrib.addRow(['Cash Savings & Premium Bonds', { formula: "='Inputs & Setup'!C31/12", result: primaryCashSavingsAnnual / 12 }, { formula: "='Inputs & Setup'!C31", result: primaryCashSavingsAnnual }, { formula: "='Inputs & Setup'!E31/12", result: partnerCashSavingsAnnual / 12 }, { formula: "='Inputs & Setup'!E31", result: partnerCashSavingsAnnual }, { formula: '=B10+D10', result: (primaryCashSavingsAnnual + partnerCashSavingsAnnual) / 12 }, { formula: '=C10+E10', result: primaryCashSavingsAnnual + partnerCashSavingsAnnual }]);

  // Row 11: Total Base Contributions
  wsContrib.addRow(['TOTAL BASELINE TOP-UPS', '', '', '', '', '', '']);
  const cTotRow = wsContrib.getRow(11);
  cTotRow.height = 24;
  cTotRow.font = fontBold;
  wsContrib.getCell('B11').value = { formula: 'SUM(B4:B10)', result: primaryTotalAnnual / 12 };
  wsContrib.getCell('C11').value = { formula: 'SUM(C4:C10)', result: primaryTotalAnnual };
  wsContrib.getCell('D11').value = { formula: 'SUM(D4:D10)', result: partnerTotalAnnual / 12 };
  wsContrib.getCell('E11').value = { formula: 'SUM(E4:E10)', result: partnerTotalAnnual };
  wsContrib.getCell('F11').value = { formula: 'SUM(F4:F10)', result: (primaryTotalAnnual + partnerTotalAnnual) / 12 };
  wsContrib.getCell('G11').value = { formula: 'SUM(G4:G10)', result: primaryTotalAnnual + partnerTotalAnnual };

  // Format Rows 4-11
  for (let r = 4; r <= 11; r++) {
    const row = wsContrib.getRow(r);
    row.eachCell((cell, colNumber) => {
      cell.border = borderThin;
      if (colNumber >= 2) {
        cell.numFmt = '£#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  }

  wsContrib.addRow([]); // Row 12 Blank

  // Section 2 Header (Row 13): Year-by-Year Contribution Schedule
  wsContrib.addRow(['2. YEAR-BY-YEAR CONTRIBUTION PROJECTION SCHEDULE']);
  const cSec2Header = wsContrib.getRow(13);
  cSec2Header.height = 24;
  cSec2Header.getCell(1).fill = sectionHeaderFill;
  cSec2Header.getCell(1).font = fontSectionHeader;

  // Row 14: Table Headers
  const contribHeaders = [
    'Year',
    'Age YOU',
    'Age PARTNER',
    'Status',
    'Workplace YOU (£)',
    'SIPP YOU (£)',
    'Total DC Pension YOU (£)',
    'S&S ISA YOU (£)',
    'Cash ISA YOU (£)',
    'LISA YOU (£)',
    'Total ISAs YOU (£)',
    'GIA YOU (£)',
    'Cash Savings YOU (£)',
    'Total Cash/GIA YOU (£)',
    'Total YOU Annual (£)',
    'Workplace PARTNER (£)',
    'SIPP PARTNER (£)',
    'Total DC Pension PARTNER (£)',
    'Total ISAs PARTNER (£)',
    'Total Cash/GIA PARTNER (£)',
    'Total PARTNER Annual (£)',
    'Household Total Regular (£)',
    'One-Off Lump Sums Inflow (£)',
    'Pot Transfers Outflow (£)',
    'Pot Transfers Inflow (£)',
    'Net Total Annual Capital Inflow (£)',
  ];

  wsContrib.addRow(contribHeaders); // Row 14
  const cHeaderRow = wsContrib.getRow(14);
  cHeaderRow.height = 26;
  cHeaderRow.eachCell((cell) => {
    cell.fill = emeraldFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsContrib.columns = [
    { width: 10 }, // Year
    { width: 12 }, // Age YOU
    { width: 14 }, // Age PARTNER
    { width: 16 }, // Status
    { width: 18 }, // Workplace YOU
    { width: 16 }, // SIPP YOU
    { width: 22 }, // Total DC Pension YOU
    { width: 18 }, // S&S ISA YOU
    { width: 16 }, // Cash ISA YOU
    { width: 16 }, // LISA YOU
    { width: 18 }, // Total ISAs YOU
    { width: 16 }, // GIA YOU
    { width: 20 }, // Cash Savings YOU
    { width: 22 }, // Total Cash/GIA YOU
    { width: 22 }, // Total YOU Annual
    { width: 20 }, // Workplace PARTNER
    { width: 18 }, // SIPP PARTNER
    { width: 24 }, // Total DC Pension PARTNER
    { width: 22 }, // Total ISAs PARTNER
    { width: 22 }, // Total Cash/GIA PARTNER
    { width: 24 }, // Total PARTNER Annual
    { width: 26 }, // Household Total Regular
    { width: 28 }, // One-Off Lump Sums Inflow
    { width: 24 }, // Pot Transfers Outflow
    { width: 24 }, // Pot Transfers Inflow
    { width: 30 }, // Net Total Annual Capital Inflow
  ];

  const projectYears = Math.max(projections.length, 36);

  for (let idx = 0; idx < projectYears; idx++) {
    const rowNum = idx + 15; // Row 15 is year 0

    const yearFormula = `'Inputs & Setup'!$B$4 + ${idx}`;
    const ageYouFormula = `'Inputs & Setup'!$B$18 + ${idx}`;
    const agePartnerFormula = `'Inputs & Setup'!$D$18 + ${idx}`;
    const statusFormula = `IF(B${rowNum}<'Inputs & Setup'!$B$20, "Accumulation", "Retirement")`;

    // YOU Pot Contributions (0 if in Retirement phase)
    const wpYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$25, 0)`;
    const sippYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$26, 0)`;
    const totalDcYouFormula = `E${rowNum}+F${rowNum}`;

    const snsIsaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$27, 0)`;
    const cashIsaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$28, 0)`;
    const lisaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$29, 0)`;
    const totalIsaYouFormula = `H${rowNum}+I${rowNum}+J${rowNum}`;

    const giaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$30, 0)`;
    const cashSavYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$31, 0)`;
    const totalCashGiaYouFormula = `L${rowNum}+M${rowNum}`;

    const totalYouAnnualFormula = `G${rowNum}+K${rowNum}+N${rowNum}`;

    // PARTNER Pot Contributions
    const wpPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$25, 0)`;
    const sippPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$26, 0)`;
    const totalDcPartnerFormula = `P${rowNum}+Q${rowNum}`;

    const totalIsaPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$27+'Inputs & Setup'!$E$28+'Inputs & Setup'!$E$29, 0)`;
    const totalCashGiaPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$30+'Inputs & Setup'!$E$31, 0)`;

    const totalPartnerAnnualFormula = `R${rowNum}+S${rowNum}+T${rowNum}`;
    const totalHouseholdAnnualFormula = `O${rowNum}+U${rowNum}`;

    const oneOffFormula = `SUMIFS('Inputs & Setup'!$G$${oneOffStartRow}:$G$${oneOffEndRow}, 'Inputs & Setup'!$D$${oneOffStartRow}:$D$${oneOffEndRow}, A${rowNum})`;
    const transferOutFormula = `SUMIFS('Inputs & Setup'!$G$${transfersStartRow}:$G$${transfersEndRow}, 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;
    const transferInFormula = `SUMIFS('Inputs & Setup'!$I$${transfersStartRow}:$I$${transfersEndRow}, 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;
    const netCapitalInflowFormula = `V${rowNum}+W${rowNum}+Y${rowNum}-X${rowNum}`;

    const proj = projections[idx];
    const isRetired = proj ? proj.isRetired : ((profile.currentAge || 50) + idx >= (profile.targetRetirementAge || 55));

    const householdAnnualContribResult = proj
      ? proj.annualContributionTotal
      : (isRetired ? 0 : (primaryTotalAnnual + partnerTotalAnnual));

    const addedRow = wsContrib.addRow([
      { formula: yearFormula, result: proj ? proj.year : currentYear + idx },
      { formula: ageYouFormula, result: proj ? proj.age : (profile.currentAge || 50) + idx },
      { formula: agePartnerFormula, result: proj ? ((profile.partnerCurrentAge || 50) + idx) : ((profile.partnerCurrentAge || 50) + idx) },
      { formula: statusFormula, result: isRetired ? 'Retirement' : 'Accumulation' },
      { formula: wpYouFormula, result: isRetired ? 0 : primaryWorkplaceAnnual },
      { formula: sippYouFormula, result: isRetired ? 0 : primarySippAnnual },
      { formula: totalDcYouFormula, result: isRetired ? 0 : (primaryWorkplaceAnnual + primarySippAnnual) },
      { formula: snsIsaYouFormula, result: isRetired ? 0 : primarySnsIsaAnnual },
      { formula: cashIsaYouFormula, result: isRetired ? 0 : primaryCashIsaAnnual },
      { formula: lisaYouFormula, result: isRetired ? 0 : primaryLisaAnnual },
      { formula: totalIsaYouFormula, result: isRetired ? 0 : (primarySnsIsaAnnual + primaryCashIsaAnnual + primaryLisaAnnual) },
      { formula: giaYouFormula, result: isRetired ? 0 : primaryGiaAnnual },
      { formula: cashSavYouFormula, result: isRetired ? 0 : primaryCashSavingsAnnual },
      { formula: totalCashGiaYouFormula, result: isRetired ? 0 : (primaryGiaAnnual + primaryCashSavingsAnnual) },
      { formula: totalYouAnnualFormula, result: isRetired ? 0 : primaryTotalAnnual },
      { formula: wpPartnerFormula, result: isRetired ? 0 : partnerWorkplaceAnnual },
      { formula: sippPartnerFormula, result: isRetired ? 0 : partnerSippAnnual },
      { formula: totalDcPartnerFormula, result: isRetired ? 0 : (partnerWorkplaceAnnual + partnerSippAnnual) },
      { formula: totalIsaPartnerFormula, result: isRetired ? 0 : partnerIsaAnnual },
      { formula: totalCashGiaPartnerFormula, result: isRetired ? 0 : partnerCashAnnual },
      { formula: totalPartnerAnnualFormula, result: isRetired ? 0 : partnerTotalAnnual },
      { formula: totalHouseholdAnnualFormula, result: householdAnnualContribResult },
      { formula: oneOffFormula, result: 0 },
      { formula: transferOutFormula, result: 0 },
      { formula: transferInFormula, result: 0 },
      { formula: netCapitalInflowFormula, result: householdAnnualContribResult },
    ]);

    addedRow.height = 20;
    addedRow.eachCell((cell, colNum) => {
      cell.border = borderThin;
      if (idx % 2 === 1) {
        cell.fill = zebraFill;
      }
      if (colNum >= 5) {
        cell.numFmt = '£#,##0';
      }
      cell.alignment = { vertical: 'middle', horizontal: colNum <= 4 ? 'center' : 'right' };
    });
  }


  // ==========================================
  // SHEET 3: Schedule (Full Accumulation & Decumulation Schedule)
  // ==========================================
  const wsSched = workbook.addWorksheet('Schedule');

  const headers = [
    'Year',
    'Age YOU',
    'Age PARTNER',
    'Status',
    'Annual Contributions (£)',
    'Net Income Target (£)',
    'State Pension YOU (£)',
    'State Pension PARTNER (£)',
    'DB Pension Income (£)',
    'PCLS Tax-Free Drawdown (£)',
    'Taxable Pension Drawdown (£)',
    'Total Taxable Income (£)',
    'UK Income Tax Paid (£)',
    'Net Income Received (£)',
    'DC Pension Balance (£)',
    'ISA Investment Balance (£)',
    'Cash & GIA Balance (£)',
    'Total Portfolio Wealth (£)',
  ];

  wsSched.addRow(headers);
  const schedHeader = wsSched.getRow(1);
  schedHeader.height = 28;
  schedHeader.eachCell((cell) => {
    cell.fill = blueFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsSched.columns = [
    { width: 10 }, // Year
    { width: 12 }, // Age YOU
    { width: 14 }, // Age PARTNER
    { width: 18 }, // Status
    { width: 22 }, // Annual Contributions
    { width: 24 }, // Net Target Requirement
    { width: 22 }, // State YOU
    { width: 22 }, // State PARTNER
    { width: 20 }, // DB Income
    { width: 24 }, // PCLS Drawdown
    { width: 24 }, // Taxable Pension Drawdown
    { width: 22 }, // Total Taxable Income
    { width: 20 }, // UK Tax Paid
    { width: 22 }, // Net Income
    { width: 24 }, // Pension Balance
    { width: 24 }, // ISA Balance
    { width: 22 }, // Cash Balance
    { width: 26 }, // Total Portfolio
  ];

  for (let idx = 0; idx < projectYears; idx++) {
    const rowNum = idx + 2; // Row 2 is year 0
    const prevRowNum = rowNum - 1;
    const contribRowNum = idx + 15; // Corresponding row in 'Contributions' sheet

    // Year
    const yearFormula = `'Inputs & Setup'!$B$4 + ${idx}`;

    // Age YOU (B18)
    const ageYouFormula = `'Inputs & Setup'!$B$18 + ${idx}`;

    // Age PARTNER (D18)
    const agePartnerFormula = `'Inputs & Setup'!$D$18 + ${idx}`;

    // Status (B20 is Target Retirement Age)
    const statusFormula = `IF(B${rowNum}<'Inputs & Setup'!$B$20, "Accumulation", "Retirement")`;

    // Annual Contributions (referenced from Contributions Sheet Column Z)
    const annualContribFormula = `'Contributions'!Z${contribRowNum}`;

    // Target Requirement (0 during Accumulation, indexed for inflation during Retirement)
    const targetReqFormula = `IF(D${rowNum}="Accumulation", 0, IF(AND(B${rowNum}>='Inputs & Setup'!$B$44, B${rowNum}<='Inputs & Setup'!$C$44), 'Inputs & Setup'!$D$44, IF(AND(B${rowNum}>='Inputs & Setup'!$B$45, B${rowNum}<='Inputs & Setup'!$C$45), 'Inputs & Setup'!$D$45, IF(AND(B${rowNum}>='Inputs & Setup'!$B$46, B${rowNum}<='Inputs & Setup'!$C$46), 'Inputs & Setup'!$D$46, 0))) * ((1 + 'Inputs & Setup'!$B$11)^(${idx})))`;

    // State Pension YOU (SPA is B21, State Pension Today is B22, Triple Lock is B15)
    const stateYouFormula = `IF(B${rowNum}>='Inputs & Setup'!$B$21, 'Inputs & Setup'!$B$22 * ((1 + 'Inputs & Setup'!$B$15)^(${idx})), 0)`;

    // State Pension PARTNER
    const statePartnerFormula = isCouple
      ? `IF(C${rowNum}>='Inputs & Setup'!$D$21, 'Inputs & Setup'!$D$22 * ((1 + 'Inputs & Setup'!$B$15)^(${idx})), 0)`
      : '0';

    // DB Fixed Income
    const dbFormula = `IF(AND(B${rowNum}>='Inputs & Setup'!$B$49, B${rowNum}<='Inputs & Setup'!$C$49), 'Inputs & Setup'!$D$49, 0) + IF(AND(C${rowNum}>='Inputs & Setup'!$B$49, C${rowNum}<='Inputs & Setup'!$C$49), 'Inputs & Setup'!$E$49, 0) + IF(AND(B${rowNum}>='Inputs & Setup'!$B$50, B${rowNum}<='Inputs & Setup'!$C$50), 'Inputs & Setup'!$D$50, 0) + IF(AND(C${rowNum}>='Inputs & Setup'!$B$50, C${rowNum}<='Inputs & Setup'!$C$50), 'Inputs & Setup'!$E$50, 0)`;

    // PCLS Tax-Free Drawdown
    const pclsVal = projections[idx]?.pensionDrawdownTaxFree || 0;

    // Taxable Pension Drawdown
    const taxableDrawdownVal = projections[idx]?.pensionDrawdown || 0;

    // Total Taxable Income
    const totalTaxableFormula = `G${rowNum}+H${rowNum}+I${rowNum}+K${rowNum}`;

    // UK Income Tax Paid (referencing Personal Allowance B5 and Basic Threshold B6)
    const taxPaidFormula = `IF(L${rowNum}>'Inputs & Setup'!$B$5, MAX(0, MIN(L${rowNum}-'Inputs & Setup'!$B$5, 'Inputs & Setup'!$B$6-'Inputs & Setup'!$B$5)*0.20) + MAX(0, L${rowNum}-'Inputs & Setup'!$B$6)*0.40, 0)`;

    // Net Income Received
    const netIncomeFormula = `IF(D${rowNum}="Accumulation", 0, L${rowNum}-M${rowNum}+J${rowNum})`;

    const pIn = `SUMIFS('Inputs & Setup'!$G$${oneOffStartRow}:$G$${oneOffEndRow}, 'Inputs & Setup'!$C$${oneOffStartRow}:$C$${oneOffEndRow}, "DC Pensions", 'Inputs & Setup'!$D$${oneOffStartRow}:$D$${oneOffEndRow}, A${rowNum})`;
    const pTrIn = `SUMIFS('Inputs & Setup'!$I$${transfersStartRow}:$I$${transfersEndRow}, 'Inputs & Setup'!$F$${transfersStartRow}:$F$${transfersEndRow}, "DC Pensions", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;
    const pTrOut = `SUMIFS('Inputs & Setup'!$G$${transfersStartRow}:$G$${transfersEndRow}, 'Inputs & Setup'!$E$${transfersStartRow}:$E$${transfersEndRow}, "DC Pensions", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;

    const isaIn = `SUMIFS('Inputs & Setup'!$G$${oneOffStartRow}:$G$${oneOffEndRow}, 'Inputs & Setup'!$C$${oneOffStartRow}:$C$${oneOffEndRow}, "ISAs", 'Inputs & Setup'!$D$${oneOffStartRow}:$D$${oneOffEndRow}, A${rowNum})`;
    const isaTrIn = `SUMIFS('Inputs & Setup'!$I$${transfersStartRow}:$I$${transfersEndRow}, 'Inputs & Setup'!$F$${transfersStartRow}:$F$${transfersEndRow}, "ISAs", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;
    const isaTrOut = `SUMIFS('Inputs & Setup'!$G$${transfersStartRow}:$G$${transfersEndRow}, 'Inputs & Setup'!$E$${transfersStartRow}:$E$${transfersEndRow}, "ISAs", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;

    const cashIn = `SUMIFS('Inputs & Setup'!$G$${oneOffStartRow}:$G$${oneOffEndRow}, 'Inputs & Setup'!$C$${oneOffStartRow}:$C$${oneOffEndRow}, "Cash & GIA", 'Inputs & Setup'!$D$${oneOffStartRow}:$D$${oneOffEndRow}, A${rowNum})`;
    const cashTrIn = `SUMIFS('Inputs & Setup'!$I$${transfersStartRow}:$I$${transfersEndRow}, 'Inputs & Setup'!$F$${transfersStartRow}:$F$${transfersEndRow}, "Cash & GIA", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;
    const cashTrOut = `SUMIFS('Inputs & Setup'!$G$${transfersStartRow}:$G$${transfersEndRow}, 'Inputs & Setup'!$E$${transfersStartRow}:$E$${transfersEndRow}, "Cash & GIA", 'Inputs & Setup'!$D$${transfersStartRow}:$D$${transfersEndRow}, A${rowNum})`;

    // DC Pension Balance (referencing Growth B12 & Contributions from 'Contributions' sheet)
    let pensionBalFormula: string;
    if (idx === 0) {
      pensionBalFormula = `MAX(0, 'Inputs & Setup'!$B$36 * (1 + 'Inputs & Setup'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    } else {
      pensionBalFormula = `MAX(0, O${prevRowNum} * (1 + 'Inputs & Setup'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    }

    // ISA Balance (referencing Growth B13 & Contributions from 'Contributions' sheet)
    let isaBalFormula: string;
    if (idx === 0) {
      isaBalFormula = `MAX(0, 'Inputs & Setup'!$B$38 * (1 + 'Inputs & Setup'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    } else {
      isaBalFormula = `MAX(0, P${prevRowNum} * (1 + 'Inputs & Setup'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    }

    // Cash & GIA Balance (referencing Interest B14 & Contributions from 'Contributions' sheet)
    let cashBalFormula: string;
    if (idx === 0) {
      cashBalFormula = `MAX(0, 'Inputs & Setup'!$B$40 * (1 + 'Inputs & Setup'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
    } else {
      cashBalFormula = `MAX(0, Q${prevRowNum} * (1 + 'Inputs & Setup'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
    }

    // Total Portfolio Wealth
    const totalWealthFormula = `O${rowNum}+P${rowNum}+Q${rowNum}`;

    const proj = projections[idx];

    const addedRow = wsSched.addRow([
      { formula: yearFormula, result: proj ? proj.year : currentYear + idx },
      { formula: ageYouFormula, result: proj ? proj.age : (profile.currentAge || 50) + idx },
      { formula: agePartnerFormula, result: proj ? ((profile.partnerCurrentAge || 50) + idx) : ((profile.partnerCurrentAge || 50) + idx) },
      { formula: statusFormula, result: proj?.isRetired ? 'Retirement' : 'Accumulation' },
      { formula: annualContribFormula, result: proj ? proj.annualContributionTotal : (proj?.isRetired ? 0 : (primaryTotalAnnual + partnerTotalAnnual)) },
      { formula: targetReqFormula, result: proj?.isRetired ? (proj?.targetRetirementIncome || baseTargetNet) : 0 },
      { formula: stateYouFormula, result: proj?.statePensionReceived || 0 },
      { formula: statePartnerFormula, result: proj?.partnerStatePensionReceived || 0 },
      { formula: dbFormula, result: proj?.dbPensionIncomeReceived || 0 },
      pclsVal,
      taxableDrawdownVal,
      { formula: totalTaxableFormula, result: (proj?.statePensionReceived || 0) + (proj?.dbPensionIncomeReceived || 0) + taxableDrawdownVal },
      { formula: taxPaidFormula, result: proj?.totalTaxPaid || 0 },
      { formula: netIncomeFormula, result: proj?.isRetired ? (proj?.netRetirementIncome || 0) : 0 },
      { formula: pensionBalFormula, result: proj?.pensionPot || 0 },
      { formula: isaBalFormula, result: proj?.isaPot || 0 },
      { formula: cashBalFormula, result: proj?.cashGiaPot || 0 },
      { formula: totalWealthFormula, result: proj?.totalPot || 0 },
    ]);

    addedRow.height = 20;
    addedRow.eachCell((cell, colNum) => {
      cell.border = borderThin;
      if (idx % 2 === 1) {
        cell.fill = zebraFill;
      }
      if (colNum >= 5) {
        cell.numFmt = '£#,##0';
      }
      cell.alignment = { vertical: 'middle', horizontal: colNum <= 4 ? 'center' : 'right' };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
