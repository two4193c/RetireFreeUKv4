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
  // SHEET 1: Settings (Macro Assumptions & Tax Parameters)
  // ==========================================
  const wsSettings = workbook.addWorksheet('Settings');
  wsSettings.columns = [
    { header: 'Parameter / Macro Rate', key: 'a', width: 42 },
    { header: 'Value / Rate', key: 'b', width: 22 },
    { header: 'Unit / Format', key: 'c', width: 20 },
    { header: 'Notes & Policy Reference', key: 'd', width: 45 },
  ];

  // Title Banner
  const settingsTitle = wsSettings.getRow(1);
  settingsTitle.height = 32;
  settingsTitle.getCell(1).value = `RETIREFREE UK - MACRO ASSUMPTIONS & TAX SETTINGS (${planName || 'Current Plan'})`;
  settingsTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  settingsTitle.getCell(1).fill = darkSlateFill;
  settingsTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsSettings.mergeCells('A1:D1');

  wsSettings.addRow([]); // Row 2 Blank

  // --- SECTION 1: UK TAX BANDS & MACRO PARAMETERS ---
  wsSettings.addRow(['1. UK TAX BANDS & MACRO PARAMETERS', '', '', 'Standard UK Tax Rules']);
  const setS1 = wsSettings.getRow(3);
  setS1.height = 24;
  setS1.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const currentYear = new Date().getFullYear();
  wsSettings.addRow(['Current Tax Year', currentYear, 'Year', 'Benchmark start year (Cell B4)']); // Row 4
  wsSettings.addRow(['Personal Tax Allowance (£)', 12570, '£ / year', 'Tax-free income allowance (Cell B5)']); // Row 5
  wsSettings.addRow(['Basic Rate Tax Band Threshold (£)', 50270, '£ / year', '20% Tax Band Ceiling (Cell B6)']); // Row 6
  wsSettings.addRow(['Higher Rate Tax Band Threshold (£)', 125140, '£ / year', '40% Tax Band Ceiling (Cell B7)']); // Row 7
  wsSettings.addRow(['Lump Sum Allowance LSA Cap (£)', 268275, '£ Lifetime', '25% Tax-free PCLS limit (Cell B8)']); // Row 8

  wsSettings.getCell('B4').numFmt = '0';
  wsSettings.getCell('B5').numFmt = '£#,##0';
  wsSettings.getCell('B6').numFmt = '£#,##0';
  wsSettings.getCell('B7').numFmt = '£#,##0';
  wsSettings.getCell('B8').numFmt = '£#,##0';

  wsSettings.addRow([]); // Row 9 Blank

  // --- SECTION 2: ASSET GROWTH & MACRO RATES (%) ---
  wsSettings.addRow(['2. ASSET GROWTH & MACRO RATES (%)', '', '', 'Annual Nominal Growth Assumptions']);
  const setS2 = wsSettings.getRow(10);
  setS2.height = 24;
  setS2.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  wsSettings.addRow(['Inflation Growth Rate (%)', (profile.expectedInflationRate || 2.5) / 100, '% / year', 'CPI Annual Inflation Index (Cell B11)']); // Row 11
  wsSettings.addRow(['DC Pension Asset Growth Rate (%)', (profile.expectedInvestmentReturn || 5.0) / 100, '% / year', 'Net Annual Growth Rate (Cell B12)']); // Row 12
  wsSettings.addRow(['ISA Investment Growth Rate (%)', (profile.expectedInvestmentReturn || 5.0) / 100, '% / year', 'Net Annual Growth Rate (Cell B13)']); // Row 13
  wsSettings.addRow(['Cash & Savings Growth Rate (%)', 0.030, '% / year', 'Net Cash Interest Rate (Cell B14)']); // Row 14
  wsSettings.addRow(['State Pension Triple Lock Growth (%)', 0.025, '% / year', 'Annual State Pension Index (Cell B15)']); // Row 15

  for (let r = 11; r <= 15; r++) {
    wsSettings.getCell(`B${r}`).numFmt = '0.00%';
  }

  wsSettings.eachRow((row, rowNumber) => {
    if (rowNumber >= 4 && rowNumber !== 9) {
      row.eachCell((cell) => {
        cell.border = borderThin;
      });
    }
  });


  // ==========================================
  // SHEET 2: Inputs & Setup (Master Inputs & Current Pot Balances)
  // ==========================================
  const wsInputs = workbook.addWorksheet('Inputs & Setup');
  wsInputs.columns = [
    { header: 'Parameter / Asset Holding', key: 'a', width: 38 },
    { header: 'YOU Value (£)', key: 'b', width: 22 },
    { header: 'YOU Contrib (£/yr)', key: 'c', width: 22 },
    { header: 'PARTNER Value (£)', key: 'd', width: 22 },
    { header: 'PARTNER Contrib (£/yr)', key: 'e', width: 22 },
    { header: 'Household Total / Notes', key: 'f', width: 36 },
  ];

  // Row 1: Title Banner
  const titleRow = wsInputs.getRow(1);
  titleRow.height = 32;
  titleRow.getCell(1).value = `RETIREFREE UK - MASTER INPUTS & SETUP (${planName || 'Current Plan'})`;
  titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = darkSlateFill;
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsInputs.mergeCells('A1:F1');

  wsInputs.addRow([]); // Row 2 Blank

  // --- SECTION 1: PERSONAL PROFILE & AGES ---
  wsInputs.addRow(['1. PERSONAL PROFILE & AGES', 'YOU', '', 'PARTNER', '', 'Age Benchmark Targets']);
  const s1Row = wsInputs.getRow(3);
  s1Row.height = 24;
  s1Row.eachCell((cell) => {
    cell.fill = purpleFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryNmpa = profile.protectedPensionAccessAge || profile.pensionAccessAge || 57;
  const partnerNmpa = profile.partnerProtectedPensionAccessAge || profile.partnerPensionAccessAge || 57;

  wsInputs.addRow(['Current Age', profile.currentAge || 50, '', isCouple ? (profile.partnerCurrentAge || 50) : 0, '', 'Cells B4 & D4']); // Row 4
  wsInputs.addRow(['Normal Minimum Pension Access Age (NMPA)', primaryNmpa, '', isCouple ? partnerNmpa : 0, '', 'Cells B5 & D5']); // Row 5
  wsInputs.addRow(['Target Retirement Age', profile.targetRetirementAge || 55, '', isCouple ? (profile.partnerTargetRetirementAge || 57) : 0, '', 'Cells B6 & D6']); // Row 6
  wsInputs.addRow(['State Pension Start Age (SPA)', profile.statePensionAge || 67, '', isCouple ? (profile.partnerStatePensionAge || 67) : 67, '', 'Cells B7 & D7']); // Row 7
  wsInputs.addRow(['State Pension Today (£/yr)', profile.statePensionAmountAnnual || 12548, '', isCouple ? (profile.partnerStatePensionAmountAnnual || 12548) : 0, '', 'Cells B8 & D8']); // Row 8

  for (let r = 4; r <= 7; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0';
    wsInputs.getCell(`D${r}`).numFmt = '0';
  }
  wsInputs.getCell('B8').numFmt = '£#,##0';
  wsInputs.getCell('D8').numFmt = '£#,##0';

  wsInputs.addRow([]); // Row 9 Blank

  // --- SECTION 2: INDIVIDUAL LIQUID ASSETS & ANNUAL TOP-UPS ---
  wsInputs.addRow(['2. LIQUID ASSET POTS & TOP-UPS', 'YOU Value (£)', 'YOU Contrib (£/yr)', 'PARTNER Value (£)', 'PARTNER Contrib (£/yr)', 'Household Total']);
  const s2Row = wsInputs.getRow(10);
  s2Row.height = 26;
  s2Row.eachCell((cell) => {
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

  // Row 11: Workplace Pension
  wsInputs.addRow([
    'Workplace Pension (Employer / Workplace)',
    pots.workplacePensionBalance || 0,
    primaryWorkplaceAnnual,
    isCouple ? (partnerPots.workplacePensionBalance || 0) : 0,
    partnerWorkplaceAnnual,
    '',
  ]);
  wsInputs.getCell('F11').value = { formula: 'B11+D11', result: (pots.workplacePensionBalance || 0) + (isCouple ? (partnerPots.workplacePensionBalance || 0) : 0) };

  // Row 12: SIPP Pension (DC 1)
  wsInputs.addRow([
    'Pension DC 1 (SIPP / Private Pension)',
    pots.sippBalance || 0,
    primarySippAnnual,
    isCouple ? (partnerPots.sippBalance || 0) : 0,
    partnerSippAnnual,
    '',
  ]);
  wsInputs.getCell('F12').value = { formula: 'B12+D12', result: (pots.sippBalance || 0) + (isCouple ? (partnerPots.sippBalance || 0) : 0) };

  // Row 13: Stocks & Shares ISA
  wsInputs.addRow([
    'Stocks & Shares ISA (Investment Platforms)',
    pots.stocksAndSharesIsaBalance || 0,
    primarySnsIsaAnnual,
    isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0,
    partnerSnsIsaAnnual,
    '',
  ]);
  wsInputs.getCell('F13').value = { formula: 'B13+D13', result: (pots.stocksAndSharesIsaBalance || 0) + (isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0) };

  // Row 14: Cash ISA
  wsInputs.addRow([
    'Cash ISA',
    pots.cashIsaBalance || 0,
    primaryCashIsaAnnual,
    isCouple ? (partnerPots.cashIsaBalance || 0) : 0,
    partnerCashIsaAnnual,
    '',
  ]);
  wsInputs.getCell('F14').value = { formula: 'B14+D14', result: (pots.cashIsaBalance || 0) + (isCouple ? (partnerPots.cashIsaBalance || 0) : 0) };

  // Row 15: Lifetime ISA (LISA)
  wsInputs.addRow([
    'Lifetime ISA (LISA)',
    pots.lisaBalance || 0,
    primaryLisaAnnual,
    isCouple ? (partnerPots.lisaBalance || 0) : 0,
    partnerLisaAnnual,
    '',
  ]);
  wsInputs.getCell('F15').value = { formula: 'B15+D15', result: (pots.lisaBalance || 0) + (isCouple ? (partnerPots.lisaBalance || 0) : 0) };

  // Row 16: General Investment Account (GIA)
  wsInputs.addRow([
    'General Investment Account (GIA)',
    pots.giaBalance || 0,
    primaryGiaAnnual,
    isCouple ? (partnerPots.giaBalance || 0) : 0,
    partnerGiaAnnual,
    '',
  ]);
  wsInputs.getCell('F16').value = { formula: 'B16+D16', result: (pots.giaBalance || 0) + (isCouple ? (partnerPots.giaBalance || 0) : 0) };

  // Row 17: Cash Savings & Premium Bonds
  wsInputs.addRow([
    'Cash Savings & Premium Bonds',
    pots.cashSavingsBalance || 0,
    primaryCashSavingsAnnual,
    isCouple ? (partnerPots.cashSavingsBalance || 0) : 0,
    partnerCashSavingsAnnual,
    '',
  ]);
  wsInputs.getCell('F17').value = { formula: 'B17+D17', result: (pots.cashSavingsBalance || 0) + (isCouple ? (partnerPots.cashSavingsBalance || 0) : 0) };

  // Row 18: TOTAL LIQUID ASSETS ROW
  wsInputs.addRow(['TOTAL ASSETS & ANNUAL TOP-UPS', '', '', '', '', '']);
  const totAssetsRow = wsInputs.getRow(18);
  totAssetsRow.height = 24;
  totAssetsRow.font = fontBold;
  wsInputs.getCell('B18').value = { formula: 'SUM(B11:B17)', result: primaryTotalBal };
  wsInputs.getCell('C18').value = { formula: 'SUM(C11:C17)', result: primaryTotalAnnual };
  wsInputs.getCell('D18').value = { formula: 'SUM(D11:D17)', result: partnerTotalBal };
  wsInputs.getCell('E18').value = { formula: 'SUM(E11:E17)', result: partnerTotalAnnual };
  wsInputs.getCell('F18').value = { formula: 'B18+D18', result: primaryTotalBal + partnerTotalBal };

  for (let r = 11; r <= 18; r++) {
    for (const col of ['B', 'C', 'D', 'E', 'F']) {
      wsInputs.getCell(`${col}${r}`).numFmt = '£#,##0';
    }
  }

  wsInputs.addRow([]); // Row 19 Blank

  // --- SECTION 3: CURRENT POT CATEGORY TOTALS ---
  wsInputs.addRow(['3. CURRENT POT CATEGORY TOTALS', 'Household Total (£)', 'YOU (£)', 'PARTNER (£)', '', 'Formula Summary Mapping']);
  const s3Row = wsInputs.getRow(20);
  s3Row.height = 24;
  s3Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

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

  // Row 21: DC Pensions Total (Workplace + SIPP)
  wsInputs.addRow(['DC Pensions Balance Total', '', '', '', '', 'Mapped to Schedule Pension Balances']);
  wsInputs.getCell('C21').value = { formula: 'B11+B12', result: primaryPensionBal };
  wsInputs.getCell('D21').value = { formula: 'D11+D12', result: partnerPensionBal };
  wsInputs.getCell('B21').value = { formula: 'C21+D21', result: primaryPensionBal + partnerPensionBal };

  // Row 22: Annual DC Pension Contributions
  wsInputs.addRow(['Annual DC Pension Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C22').value = { formula: 'C11+C12', result: primaryPensionAnnual };
  wsInputs.getCell('D22').value = { formula: 'E11+E12', result: partnerPensionAnnual };
  wsInputs.getCell('B22').value = { formula: 'C22+D22', result: primaryPensionAnnual + partnerPensionAnnual };

  // Row 23: ISA Investments Total (S&S ISA + Cash ISA + LISA)
  wsInputs.addRow(['ISA Investments Balance Total', '', '', '', '', 'Mapped to Schedule ISA Balances']);
  wsInputs.getCell('C23').value = { formula: 'B13+B14+B15', result: primaryIsaBal };
  wsInputs.getCell('D23').value = { formula: 'D13+D14+D15', result: partnerIsaBal };
  wsInputs.getCell('B23').value = { formula: 'C23+D23', result: primaryIsaBal + partnerIsaBal };

  // Row 24: Annual ISA Contributions
  wsInputs.addRow(['Annual ISA Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C24').value = { formula: 'C13+C14+C15', result: primaryIsaAnnual };
  wsInputs.getCell('D24').value = { formula: 'E13+E14+E15', result: partnerIsaAnnual };
  wsInputs.getCell('B24').value = { formula: 'C24+D24', result: primaryIsaAnnual + partnerIsaAnnual };

  // Row 25: Cash & GIA Total (GIA + Cash Savings)
  wsInputs.addRow(['Cash & GIA Balance Total', '', '', '', '', 'Mapped to Cash Buffer Balances']);
  wsInputs.getCell('C25').value = { formula: 'B16+B17', result: primaryCashBal };
  wsInputs.getCell('D25').value = { formula: 'D16+D17', result: partnerCashBal };
  wsInputs.getCell('B25').value = { formula: 'C25+D25', result: primaryCashBal + partnerCashBal };

  // Row 26: Annual Cash & GIA Contributions
  wsInputs.addRow(['Annual Cash & GIA Contributions', '', '', '', '', 'Mapped to Accumulation Phase Top-ups']);
  wsInputs.getCell('C26').value = { formula: 'C16+C17', result: primaryCashAnnual };
  wsInputs.getCell('D26').value = { formula: 'E16+E17', result: partnerCashAnnual };
  wsInputs.getCell('B26').value = { formula: 'C26+D26', result: primaryCashAnnual + partnerCashAnnual };

  // Row 27: TOTAL CURRENT POT BALANCES
  wsInputs.addRow(['TOTAL CURRENT POT BALANCES', '', '', '', '', 'Sum of DC Pensions, ISAs, Cash & GIA']);
  wsInputs.getCell('C27').value = { formula: 'C21+C23+C25', result: primaryTotalBal };
  wsInputs.getCell('D27').value = { formula: 'D21+D23+D25', result: partnerTotalBal };
  wsInputs.getCell('B27').value = { formula: 'B21+B23+B25', result: primaryTotalBal + partnerTotalBal };

  // Row 28: TOTAL ANNUAL CONTRIBUTIONS
  wsInputs.addRow(['TOTAL ANNUAL REGULAR TOP-UPS', '', '', '', '', 'Sum of DC, ISA, and Cash Annual Contributions']);
  wsInputs.getCell('C28').value = { formula: 'C22+C24+C26', result: primaryTotalAnnual };
  wsInputs.getCell('D28').value = { formula: 'D22+D24+D26', result: partnerTotalAnnual };
  wsInputs.getCell('B28').value = { formula: 'B22+B24+B26', result: primaryTotalAnnual + partnerTotalAnnual };

  const totBalsRow = wsInputs.getRow(27);
  totBalsRow.font = fontBold;
  const totContribsRow = wsInputs.getRow(28);
  totContribsRow.font = fontBold;

  for (let r = 21; r <= 28; r++) {
    for (const col of ['B', 'C', 'D']) {
      wsInputs.getCell(`${col}${r}`).numFmt = '£#,##0';
    }
  }

  // Format borders on wsInputs
  wsInputs.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) {
      row.eachCell((cell) => {
        cell.border = borderThin;
      });
    }
  });


  // ==========================================
  // SHEET 3: Phased Income (Spending Targets)
  // ==========================================
  const wsPhased = workbook.addWorksheet('Phased Income');
  wsPhased.columns = [
    { header: 'Phase Name / Description', key: 'a', width: 38 },
    { header: 'Start Age', key: 'b', width: 16 },
    { header: 'End Age', key: 'c', width: 16 },
    { header: 'Net Target (£/yr)', key: 'd', width: 22 },
    { header: 'Description / Lifestyle Notes', key: 'e', width: 45 },
  ];

  // Title Banner
  const phasedTitle = wsPhased.getRow(1);
  phasedTitle.height = 32;
  phasedTitle.getCell(1).value = `RETIREFREE UK - PHASED INCOME SPENDING TARGETS`;
  phasedTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  phasedTitle.getCell(1).fill = blueFill;
  phasedTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsPhased.mergeCells('A1:E1');

  wsPhased.addRow([]); // Row 2 Blank

  // Table Header
  wsPhased.addRow(['Phase Name / Description', 'Start Age', 'End Age', 'Net Target (£/yr)', 'Description / Lifestyle Notes']); // Row 3
  const pHeadRow = wsPhased.getRow(3);
  pHeadRow.height = 26;
  pHeadRow.eachCell((cell) => {
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

  // Default active phases
  wsPhased.addRow(['GO-GO Phase (Active Lifestyle)', goGoStartAge, goGoEndAge, goGoIncome, 'Primary Active Retirement Spending']); // Row 4
  wsPhased.addRow(['Slow-GO Phase (Moderate Lifestyle)', slowGoStartAge, slowGoEndAge, slowGoIncome, 'Mid-Retirement Travel & Leisure']); // Row 5
  wsPhased.addRow(['No-GO Phase (Passive / Care)', noGoStartAge, noGoEndAge, noGoIncome, 'Late Retirement / Essential Care']); // Row 6

  // Add extra template rows for user additions
  for (let r = 7; r <= 20; r++) {
    wsPhased.addRow([`Additional Phase ${r - 6} (Optional)`, 999, 999, 0, 'User Added Custom Phase']);
  }

  for (let r = 4; r <= 20; r++) {
    const row = wsPhased.getRow(r);
    row.getCell(2).numFmt = '0';
    row.getCell(3).numFmt = '0';
    row.getCell(4).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 4: Fixed Income (DB Pensions & Annuities)
  // ==========================================
  const wsFixed = workbook.addWorksheet('Fixed Income');
  wsFixed.columns = [
    { header: 'Description / Income Source', key: 'a', width: 38 },
    { header: 'Owner', key: 'b', width: 16 },
    { header: 'Start Age', key: 'c', width: 14 },
    { header: 'End Age', key: 'd', width: 14 },
    { header: 'Annual Amount (£/yr)', key: 'e', width: 22 },
    { header: 'Indexation & Notes', key: 'f', width: 38 },
  ];

  // Title Banner
  const fixedTitle = wsFixed.getRow(1);
  fixedTitle.height = 32;
  fixedTitle.getCell(1).value = `RETIREFREE UK - FIXED INCOME & DEFINED BENEFIT PENSIONS`;
  fixedTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  fixedTitle.getCell(1).fill = sectionHeaderFill;
  fixedTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsFixed.mergeCells('A1:F1');

  wsFixed.addRow([]); // Row 2 Blank

  // Table Header
  wsFixed.addRow(['Description / Income Source', 'Owner', 'Start Age', 'End Age', 'Annual Amount (£/yr)', 'Indexation & Notes']); // Row 3
  const fHeadRow = wsFixed.getRow(3);
  fHeadRow.height = 26;
  fHeadRow.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryDbList = (profile.dbPensions || []).filter((db) => db.enabled && db.owner !== 'partner');
  const partnerDbList = (profile.dbPensions || []).filter((db) => db.enabled && db.owner === 'partner');

  if (primaryDbList.length > 0 || partnerDbList.length > 0) {
    primaryDbList.forEach((db) => {
      wsFixed.addRow([
        db.name || 'Defined Benefit Pension (YOU)',
        'YOU',
        db.startAge || 60,
        120,
        db.annualIncome || 0,
        db.inflationLinked ? 'CPI Indexed' : 'Level Pension Income'
      ]);
    });
    partnerDbList.forEach((db) => {
      wsFixed.addRow([
        db.name || 'Defined Benefit Pension (PARTNER)',
        'PARTNER',
        db.startAge || 60,
        120,
        db.annualIncome || 0,
        db.inflationLinked ? 'CPI Indexed' : 'Level Pension Income'
      ]);
    });
  } else {
    wsFixed.addRow(['Defined Benefit Pension 1', 'YOU', 60, 120, 0, 'No active DB pension recorded']);
    wsFixed.addRow(['Defined Benefit Pension 2', 'PARTNER', 60, 120, 0, 'No active partner DB pension']);
  }

  // Pre-fill extra empty template rows up to Row 25
  const currentFixedRows = wsFixed.lastRow!.number;
  for (let r = currentFixedRows + 1; r <= 25; r++) {
    wsFixed.addRow(['Extra Fixed Income / Rental (Optional)', 'YOU', 99, 120, 0, 'User Added Custom Stream']);
  }

  // Summary total row
  wsFixed.addRow(['TOTAL FIXED ANNUAL INCOME', '', '', '', { formula: 'SUM(E4:E25)', result: 0 }, 'All Active Fixed Streams']);
  const fixedTotRow = wsFixed.lastRow!;
  fixedTotRow.font = fontBold;

  for (let r = 4; r <= 26; r++) {
    const row = wsFixed.getRow(r);
    row.getCell(3).numFmt = '0';
    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 5: One-Off Contributions
  // ==========================================
  const wsOneOff = workbook.addWorksheet('One-Off Contributions');
  wsOneOff.columns = [
    { header: 'Description / Contribution Name', key: 'a', width: 38 },
    { header: 'Owner', key: 'b', width: 14 },
    { header: 'Target Category', key: 'c', width: 22 },
    { header: 'Execution Year', key: 'd', width: 16 },
    { header: 'Out-of-Pocket (£)', key: 'e', width: 20 },
    { header: 'SIPP Relief (£)', key: 'f', width: 18 },
    { header: 'Gross Inflow (£)', key: 'g', width: 20 },
    { header: 'Target Pot Key', key: 'h', width: 24 },
  ];

  // Title Banner
  const oneOffTitle = wsOneOff.getRow(1);
  oneOffTitle.height = 32;
  oneOffTitle.getCell(1).value = `RETIREFREE UK - ONE-OFF LUMP SUM CONTRIBUTIONS`;
  oneOffTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  oneOffTitle.getCell(1).fill = sectionHeaderFill;
  oneOffTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsOneOff.mergeCells('A1:H1');

  wsOneOff.addRow([]); // Row 2 Blank

  // Table Header
  wsOneOff.addRow(['Description / Contribution Name', 'Owner', 'Target Category', 'Execution Year', 'Out-of-Pocket (£)', 'SIPP Relief (£)', 'Gross Inflow (£)', 'Target Pot Key']); // Row 3
  const oHeadRow = wsOneOff.getRow(3);
  oHeadRow.height = 26;
  oHeadRow.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const activeOneOffs = (profile.oneOffContributions || []).filter(
    (c) => c.enabled !== false && c.frequency !== 'regular_monthly'
  );

  let sumOneOffE = 0;
  let sumOneOffF = 0;
  let sumOneOffG = 0;

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
      const grossInf = outOfPocket + relief;
      sumOneOffE += outOfPocket;
      sumOneOffF += relief;
      sumOneOffG += grossInf;

      const nextR = wsOneOff.lastRow!.number + 1;
      wsOneOff.addRow([
        c.name || 'One-Off Contribution',
        cOwner,
        cat,
        cYear,
        outOfPocket,
        relief,
        { formula: `E${nextR}+F${nextR}`, result: grossInf },
        c.targetPot
      ]);
    });
  } else {
    wsOneOff.addRow(['No active one-off contributions', 'YOU', 'DC Pensions', 2099, 0, 0, 0, 'none']);
  }

  // Pre-fill extra empty template rows up to Row 50
  const currentOneOffRows = wsOneOff.lastRow!.number;
  for (let r = currentOneOffRows + 1; r <= 50; r++) {
    const nextR = r;
    wsOneOff.addRow(['Extra Lump Sum Item (Optional)', 'YOU', 'DC Pensions', 2099, 0, 0, { formula: `E${nextR}+F${nextR}`, result: 0 }, 'none']);
  }

  // Row 51: Summary Total Row
  wsOneOff.addRow([
    'TOTAL ONE-OFF CONTRIBUTIONS',
    '',
    '',
    '',
    { formula: 'SUM(E4:E50)', result: sumOneOffE },
    { formula: 'SUM(F4:F50)', result: sumOneOffF },
    { formula: 'SUM(G4:G50)', result: sumOneOffG },
    ''
  ]);
  const oneOffTotRow = wsOneOff.lastRow!;
  oneOffTotRow.font = fontBold;

  for (let r = 4; r <= 51; r++) {
    const row = wsOneOff.getRow(r);
    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '£#,##0';
    row.getCell(6).numFmt = '£#,##0';
    row.getCell(7).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 6: Pot Transfers
  // ==========================================
  const wsTransfers = workbook.addWorksheet('Pot Transfers');
  wsTransfers.columns = [
    { header: 'Transfer Name', key: 'a', width: 32 },
    { header: 'Source Description', key: 'b', width: 32 },
    { header: 'Dest Description', key: 'c', width: 32 },
    { header: 'Execution Year', key: 'd', width: 16 },
    { header: 'Source Category', key: 'e', width: 22 },
    { header: 'Dest Category', key: 'f', width: 22 },
    { header: 'Outflow (£)', key: 'g', width: 18 },
    { header: 'SIPP Relief (£)', key: 'h', width: 18 },
    { header: 'Inflow (£)', key: 'i', width: 18 },
    { header: 'Source Owner', key: 'j', width: 16 },
    { header: 'Source Pot Key', key: 'k', width: 22 },
    { header: 'Dest Owner', key: 'l', width: 16 },
    { header: 'Dest Pot Key', key: 'm', width: 22 },
  ];

  // Title Banner
  const transfersTitle = wsTransfers.getRow(1);
  transfersTitle.height = 32;
  transfersTitle.getCell(1).value = `RETIREFREE UK - POT TRANSFERS & CROSS-POT MOVEMENTS`;
  transfersTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  transfersTitle.getCell(1).fill = sectionHeaderFill;
  transfersTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsTransfers.mergeCells('A1:M1');

  wsTransfers.addRow([]); // Row 2 Blank

  // Table Header
  wsTransfers.addRow([
    'Transfer Name',
    'Source Description',
    'Dest Description',
    'Execution Year',
    'Source Category',
    'Dest Category',
    'Outflow (£)',
    'SIPP Relief (£)',
    'Inflow (£)',
    'Source Owner',
    'Source Pot Key',
    'Dest Owner',
    'Dest Pot Key'
  ]); // Row 3
  const tHeadRow = wsTransfers.getRow(3);
  tHeadRow.height = 26;
  tHeadRow.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const activeTransfers = (profile.potTransfers || []).filter((t) => t.enabled !== false);

  let sumTrG = 0;
  let sumTrH = 0;
  let sumTrI = 0;

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
      const inf = amt + relief;

      sumTrG += amt;
      sumTrH += relief;
      sumTrI += inf;

      const targetRowNum = wsTransfers.lastRow!.number + 1;

      wsTransfers.addRow([
        t.name || 'Pot Transfer',
        srcStr,
        dstStr,
        tYear,
        srcCat,
        dstCat,
        amt,
        relief,
        { formula: `G${targetRowNum}+H${targetRowNum}`, result: inf },
        srcOwnerStr,
        t.sourcePot,
        dstOwnerStr,
        t.destinationPot
      ]);
    });
  } else {
    wsTransfers.addRow(['No active pot transfers', 'N/A', 'N/A', 2099, 'N/A', 'N/A', 0, 0, 0, 'YOU', 'none', 'YOU', 'none']);
  }

  // Pre-fill extra empty template rows up to Row 50
  const currentTransferRows = wsTransfers.lastRow!.number;
  for (let r = currentTransferRows + 1; r <= 50; r++) {
    const nextR = r;
    wsTransfers.addRow(['Extra Transfer Item (Optional)', 'YOU - Cash Savings', 'YOU - SIPP', 2099, 'Cash & GIA', 'DC Pensions', 0, 0, { formula: `G${nextR}+H${nextR}`, result: 0 }, 'YOU', 'cash_savings', 'YOU', 'sipp']);
  }

  // Row 51: Summary Total Row
  wsTransfers.addRow([
    'TOTAL POT TRANSFERS',
    '',
    '',
    '',
    '',
    '',
    { formula: 'SUM(G4:G50)', result: sumTrG },
    { formula: 'SUM(H4:H50)', result: sumTrH },
    { formula: 'SUM(I4:I50)', result: sumTrI },
    '',
    '',
    '',
    ''
  ]);
  const transfersTotRow = wsTransfers.lastRow!;
  transfersTotRow.font = fontBold;

  for (let r = 4; r <= 51; r++) {
    const row = wsTransfers.getRow(r);
    row.getCell(4).numFmt = '0';
    row.getCell(7).numFmt = '£#,##0';
    row.getCell(8).numFmt = '£#,##0';
    row.getCell(9).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


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
  wsContrib.addRow(['Workplace Pension', { formula: "='Inputs & Setup'!C13/12", result: primaryWorkplaceAnnual / 12 }, { formula: "='Inputs & Setup'!C13", result: primaryWorkplaceAnnual }, { formula: "='Inputs & Setup'!E13/12", result: partnerWorkplaceAnnual / 12 }, { formula: "='Inputs & Setup'!E13", result: partnerWorkplaceAnnual }, { formula: '=B4+D4', result: (primaryWorkplaceAnnual + partnerWorkplaceAnnual) / 12 }, { formula: '=C4+E4', result: primaryWorkplaceAnnual + partnerWorkplaceAnnual }]);
  wsContrib.addRow(['Private Pension / SIPP', { formula: "='Inputs & Setup'!C14/12", result: primarySippAnnual / 12 }, { formula: "='Inputs & Setup'!C14", result: primarySippAnnual }, { formula: "='Inputs & Setup'!E14/12", result: partnerSippAnnual / 12 }, { formula: "='Inputs & Setup'!E14", result: partnerSippAnnual }, { formula: '=B5+D5', result: (primarySippAnnual + partnerSippAnnual) / 12 }, { formula: '=C5+E5', result: primarySippAnnual + partnerSippAnnual }]);
  wsContrib.addRow(['Stocks & Shares ISA', { formula: "='Inputs & Setup'!C15/12", result: primarySnsIsaAnnual / 12 }, { formula: "='Inputs & Setup'!C15", result: primarySnsIsaAnnual }, { formula: "='Inputs & Setup'!E15/12", result: partnerSnsIsaAnnual / 12 }, { formula: "='Inputs & Setup'!E15", result: partnerSnsIsaAnnual }, { formula: '=B6+D6', result: (primarySnsIsaAnnual + partnerSnsIsaAnnual) / 12 }, { formula: '=C6+E6', result: primarySnsIsaAnnual + partnerSnsIsaAnnual }]);
  wsContrib.addRow(['Cash ISA', { formula: "='Inputs & Setup'!C16/12", result: primaryCashIsaAnnual / 12 }, { formula: "='Inputs & Setup'!C16", result: primaryCashIsaAnnual }, { formula: "='Inputs & Setup'!E16/12", result: partnerCashIsaAnnual / 12 }, { formula: "='Inputs & Setup'!E16", result: partnerCashIsaAnnual }, { formula: '=B7+D7', result: (primaryCashIsaAnnual + partnerCashIsaAnnual) / 12 }, { formula: '=C7+E7', result: primaryCashIsaAnnual + partnerCashIsaAnnual }]);
  wsContrib.addRow(['Lifetime ISA (LISA)', { formula: "='Inputs & Setup'!C17/12", result: primaryLisaAnnual / 12 }, { formula: "='Inputs & Setup'!C17", result: primaryLisaAnnual }, { formula: "='Inputs & Setup'!E17/12", result: partnerLisaAnnual / 12 }, { formula: "='Inputs & Setup'!E17", result: partnerLisaAnnual }, { formula: '=B8+D8', result: (primaryLisaAnnual + partnerLisaAnnual) / 12 }, { formula: '=C8+E8', result: primaryLisaAnnual + partnerLisaAnnual }]);
  wsContrib.addRow(['General Investment Account (GIA)', { formula: "='Inputs & Setup'!C18/12", result: primaryGiaAnnual / 12 }, { formula: "='Inputs & Setup'!C18", result: primaryGiaAnnual }, { formula: "='Inputs & Setup'!E18/12", result: partnerGiaAnnual / 12 }, { formula: "='Inputs & Setup'!E18", result: partnerGiaAnnual }, { formula: '=B9+D9', result: (primaryGiaAnnual + partnerGiaAnnual) / 12 }, { formula: '=C9+E9', result: primaryGiaAnnual + partnerGiaAnnual }]);
  wsContrib.addRow(['Cash Savings & Premium Bonds', { formula: "='Inputs & Setup'!C19/12", result: primaryCashSavingsAnnual / 12 }, { formula: "='Inputs & Setup'!C19", result: primaryCashSavingsAnnual }, { formula: "='Inputs & Setup'!E19/12", result: partnerCashSavingsAnnual / 12 }, { formula: "='Inputs & Setup'!E19", result: partnerCashSavingsAnnual }, { formula: '=B10+D10', result: (primaryCashSavingsAnnual + partnerCashSavingsAnnual) / 12 }, { formula: '=C10+E10', result: primaryCashSavingsAnnual + partnerCashSavingsAnnual }]);

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

  // Helper to compute exact pot inflows/outflows for pre-calculated result values
  const computePotFlows = (owner: 'primary' | 'partner', potKey: InvestmentPotType, yearVal: number, isRetired: boolean) => {
    let base = 0;
    if (!isRetired) {
      if (owner === 'primary') {
        switch (potKey) {
          case 'workplace_pension': base = primaryWorkplaceAnnual; break;
          case 'sipp': base = primarySippAnnual; break;
          case 'stocks_and_shares_isa': base = primarySnsIsaAnnual; break;
          case 'cash_isa': base = primaryCashIsaAnnual; break;
          case 'lisa': base = primaryLisaAnnual; break;
          case 'gia': base = primaryGiaAnnual; break;
          case 'cash_savings': base = primaryCashSavingsAnnual; break;
        }
      } else {
        switch (potKey) {
          case 'workplace_pension': base = partnerWorkplaceAnnual; break;
          case 'sipp': base = partnerSippAnnual; break;
          case 'stocks_and_shares_isa':
          case 'cash_isa':
          case 'lisa': base = partnerIsaAnnual; break;
          case 'gia':
          case 'cash_savings': base = partnerCashAnnual; break;
        }
      }
    }

    let oneOff = 0;
    activeOneOffs.forEach((c) => {
      const cOwner = c.owner === 'partner' ? 'partner' : 'primary';
      if (cOwner === owner && c.targetPot === potKey) {
        const cYear = getContributionYear(c, profile.currentAge || 50);
        if (cYear === yearVal) {
          const rawAmt = c.grossAmount || 0;
          if (c.targetPot === 'sipp') {
            oneOff += c.sippContributionType === 'gross' ? rawAmt : Math.round(rawAmt * 1.25);
          } else {
            oneOff += rawAmt;
          }
        }
      }
    });

    let transferIn = 0;
    activeTransfers.forEach((t) => {
      const dstOwner = (t.destinationOwner || t.owner) === 'partner' ? 'partner' : 'primary';
      if (dstOwner === owner && t.destinationPot === potKey) {
        const tYear = getTransferYear(t, profile.currentAge || 50);
        if (tYear === yearVal) {
          const amt = t.amount || 0;
          const relief = (t.destinationPot === 'sipp' && t.sourcePot !== 'sipp' && t.sourcePot !== 'workplace_pension') ? Math.round(amt * 0.25) : 0;
          transferIn += amt + relief;
        }
      }
    });

    let transferOut = 0;
    activeTransfers.forEach((t) => {
      const srcOwner = t.owner === 'partner' ? 'partner' : 'primary';
      if (srcOwner === owner && t.sourcePot === potKey) {
        const tYear = getTransferYear(t, profile.currentAge || 50);
        if (tYear === yearVal) {
          transferOut += t.amount || 0;
        }
      }
    });

    return { base, oneOff, transferIn, transferOut, net: base + oneOff + transferIn - transferOut };
  };

  for (let idx = 0; idx < projectYears; idx++) {
    const rowNum = idx + 15; // Row 15 is year 0
    const evalYearVal = currentYear + idx;

    const yearFormula = `'Inputs & Setup'!$B$4 + ${idx}`;
    const ageYouFormula = `'Inputs & Setup'!$B$5 + ${idx}`;
    const agePartnerFormula = `'Inputs & Setup'!$D$5 + ${idx}`;
    const statusFormula = `IF(B${rowNum}<'Inputs & Setup'!$B$9, "Accumulation", "Retirement")`;

    const proj = projections[idx];
    const isRetiredYou = proj ? proj.isRetired : ((profile.currentAge || 50) + idx >= (profile.targetRetirementAge || 55));
    const isRetiredPartner = proj ? ((profile.partnerCurrentAge || 50) + idx >= (profile.partnerTargetRetirementAge || 57)) : ((profile.partnerCurrentAge || 50) + idx >= (profile.partnerTargetRetirementAge || 57));

    // YOU Pot Contribution Formulas (Base Regular + One-Off Inflow + Transfer Inflow - Transfer Outflow)
    const wpYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$13, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "workplace_pension", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "workplace_pension", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "workplace_pension", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const sippYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$14, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "sipp", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "sipp", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "sipp", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalDcYouFormula = `E${rowNum}+F${rowNum}`;

    const snsIsaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$15, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "stocks_and_shares_isa", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "stocks_and_shares_isa", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "stocks_and_shares_isa", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const cashIsaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$16, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "cash_isa", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "cash_isa", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "cash_isa", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const lisaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$17, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "lisa", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "lisa", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "lisa", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalIsaYouFormula = `H${rowNum}+I${rowNum}+J${rowNum}`;

    const giaYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$18, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "gia", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "gia", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "gia", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const cashSavYouFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$19, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "YOU", 'One-Off Contributions'!$H$4:$H$50, "cash_savings", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "YOU", 'Pot Transfers'!$M$4:$M$50, "cash_savings", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "YOU", 'Pot Transfers'!$K$4:$K$50, "cash_savings", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalCashGiaYouFormula = `L${rowNum}+M${rowNum}`;

    const totalYouAnnualFormula = `G${rowNum}+K${rowNum}+N${rowNum}`;

    // PARTNER Pot Contribution Formulas
    const wpPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$13, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "PARTNER", 'One-Off Contributions'!$H$4:$H$50, "workplace_pension", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "PARTNER", 'Pot Transfers'!$M$4:$M$50, "workplace_pension", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "PARTNER", 'Pot Transfers'!$K$4:$K$50, "workplace_pension", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const sippPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$14, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "PARTNER", 'One-Off Contributions'!$H$4:$H$50, "sipp", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "PARTNER", 'Pot Transfers'!$M$4:$M$50, "sipp", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "PARTNER", 'Pot Transfers'!$K$4:$K$50, "sipp", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalDcPartnerFormula = `P${rowNum}+Q${rowNum}`;

    const totalIsaPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$15+'Inputs & Setup'!$E$16+'Inputs & Setup'!$E$17, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "PARTNER", 'One-Off Contributions'!$C$4:$C$50, "ISAs", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "PARTNER", 'Pot Transfers'!$F$4:$F$50, "ISAs", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "PARTNER", 'Pot Transfers'!$E$4:$E$50, "ISAs", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalCashGiaPartnerFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$E$18+'Inputs & Setup'!$E$19, 0) + SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$B$4:$B$50, "PARTNER", 'One-Off Contributions'!$C$4:$C$50, "Cash & GIA", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}) + SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$L$4:$L$50, "PARTNER", 'Pot Transfers'!$F$4:$F$50, "Cash & GIA", 'Pot Transfers'!$D$4:$D$50, A${rowNum}) - SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$J$4:$J$50, "PARTNER", 'Pot Transfers'!$E$4:$E$50, "Cash & GIA", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const totalPartnerAnnualFormula = `R${rowNum}+S${rowNum}+T${rowNum}`;

    const totalHouseholdRegularFormula = `IF(D${rowNum}="Accumulation", 'Inputs & Setup'!$C$28+'Inputs & Setup'!$D$28, 0)`;

    const oneOffFormula = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$D$4:$D$50, A${rowNum})`;
    const transferOutFormula = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;
    const transferInFormula = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;
    const netCapitalInflowFormula = `O${rowNum}+U${rowNum}`;

    // Compute exact numerical pre-calculated result values for row cells
    const wpYouRes = computePotFlows('primary', 'workplace_pension', evalYearVal, isRetiredYou).net;
    const sippYouRes = computePotFlows('primary', 'sipp', evalYearVal, isRetiredYou).net;
    const dcYouRes = wpYouRes + sippYouRes;

    const snsIsaYouRes = computePotFlows('primary', 'stocks_and_shares_isa', evalYearVal, isRetiredYou).net;
    const cashIsaYouRes = computePotFlows('primary', 'cash_isa', evalYearVal, isRetiredYou).net;
    const lisaYouRes = computePotFlows('primary', 'lisa', evalYearVal, isRetiredYou).net;
    const isaYouRes = snsIsaYouRes + cashIsaYouRes + lisaYouRes;

    const giaYouRes = computePotFlows('primary', 'gia', evalYearVal, isRetiredYou).net;
    const cashSavYouRes = computePotFlows('primary', 'cash_savings', evalYearVal, isRetiredYou).net;
    const cashGiaYouRes = giaYouRes + cashSavYouRes;

    const youTotalRes = dcYouRes + isaYouRes + cashGiaYouRes;

    const wpPartnerRes = computePotFlows('partner', 'workplace_pension', evalYearVal, isRetiredPartner).net;
    const sippPartnerRes = computePotFlows('partner', 'sipp', evalYearVal, isRetiredPartner).net;
    const dcPartnerRes = wpPartnerRes + sippPartnerRes;

    const snsIsaPartnerRes = computePotFlows('partner', 'stocks_and_shares_isa', evalYearVal, isRetiredPartner).net;
    const cashIsaPartnerRes = computePotFlows('partner', 'cash_isa', evalYearVal, isRetiredPartner).net;
    const lisaPartnerRes = computePotFlows('partner', 'lisa', evalYearVal, isRetiredPartner).net;
    const isaPartnerRes = snsIsaPartnerRes + cashIsaPartnerRes + lisaPartnerRes;

    const giaPartnerRes = computePotFlows('partner', 'gia', evalYearVal, isRetiredPartner).net;
    const cashSavPartnerRes = computePotFlows('partner', 'cash_savings', evalYearVal, isRetiredPartner).net;
    const cashGiaPartnerRes = giaPartnerRes + cashSavPartnerRes;

    const partnerTotalRes = dcPartnerRes + isaPartnerRes + cashGiaPartnerRes;

    const householdRegularRes = (isRetiredYou ? 0 : primaryTotalAnnual) + (isRetiredPartner ? 0 : partnerTotalAnnual);

    // Sum total one-offs and transfers for the year
    let oneOffYearRes = 0;
    activeOneOffs.forEach((c) => {
      const cYear = getContributionYear(c, profile.currentAge || 50);
      if (cYear === evalYearVal) {
        const rawAmt = c.grossAmount || 0;
        oneOffYearRes += c.targetPot === 'sipp' ? (c.sippContributionType === 'gross' ? rawAmt : Math.round(rawAmt * 1.25)) : rawAmt;
      }
    });

    let transferOutYearRes = 0;
    let transferInYearRes = 0;
    activeTransfers.forEach((t) => {
      const tYear = getTransferYear(t, profile.currentAge || 50);
      if (tYear === evalYearVal) {
        const amt = t.amount || 0;
        const relief = (t.destinationPot === 'sipp' && t.sourcePot !== 'sipp' && t.sourcePot !== 'workplace_pension') ? Math.round(amt * 0.25) : 0;
        transferOutYearRes += amt;
        transferInYearRes += amt + relief;
      }
    });

    const netCapitalInflowRes = youTotalRes + partnerTotalRes;

    const addedRow = wsContrib.addRow([
      { formula: yearFormula, result: proj ? proj.year : evalYearVal },
      { formula: ageYouFormula, result: proj ? proj.age : (profile.currentAge || 50) + idx },
      { formula: agePartnerFormula, result: proj ? ((profile.partnerCurrentAge || 50) + idx) : ((profile.partnerCurrentAge || 50) + idx) },
      { formula: statusFormula, result: isRetiredYou ? 'Retirement' : 'Accumulation' },
      { formula: wpYouFormula, result: wpYouRes },
      { formula: sippYouFormula, result: sippYouRes },
      { formula: totalDcYouFormula, result: dcYouRes },
      { formula: snsIsaYouFormula, result: snsIsaYouRes },
      { formula: cashIsaYouFormula, result: cashIsaYouRes },
      { formula: lisaYouFormula, result: lisaYouRes },
      { formula: totalIsaYouFormula, result: isaYouRes },
      { formula: giaYouFormula, result: giaYouRes },
      { formula: cashSavYouFormula, result: cashSavYouRes },
      { formula: totalCashGiaYouFormula, result: cashGiaYouRes },
      { formula: totalYouAnnualFormula, result: youTotalRes },
      { formula: wpPartnerFormula, result: wpPartnerRes },
      { formula: sippPartnerFormula, result: sippPartnerRes },
      { formula: totalDcPartnerFormula, result: dcPartnerRes },
      { formula: totalIsaPartnerFormula, result: isaPartnerRes },
      { formula: totalCashGiaPartnerFormula, result: cashGiaPartnerRes },
      { formula: totalPartnerAnnualFormula, result: partnerTotalRes },
      { formula: totalHouseholdRegularFormula, result: householdRegularRes },
      { formula: oneOffFormula, result: oneOffYearRes },
      { formula: transferOutFormula, result: transferOutYearRes },
      { formula: transferInFormula, result: transferInYearRes },
      { formula: netCapitalInflowFormula, result: netCapitalInflowRes },
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

    // Age YOU (B5 in Inputs & Setup)
    const ageYouFormula = `'Inputs & Setup'!$B$5 + ${idx}`;

    // Age PARTNER (D5 in Inputs & Setup)
    const agePartnerFormula = `'Inputs & Setup'!$D$5 + ${idx}`;

    // Status (B9 in Inputs & Setup is Target Retirement Age)
    const statusFormula = `IF(B${rowNum}<'Inputs & Setup'!$B$9, "Accumulation", "Retirement")`;

    // Annual Contributions (referenced from Contributions Sheet Column Z)
    const annualContribFormula = `'Contributions'!Z${contribRowNum}`;

    // Target Requirement (0 during Accumulation, indexed for inflation during Retirement)
    const targetReqFormula = `IF(D${rowNum}="Accumulation", 0, IF(AND(B${rowNum}>='Phased Income'!$B$4, B${rowNum}<='Phased Income'!$C$4), 'Phased Income'!$D$4, IF(AND(B${rowNum}>='Phased Income'!$B$5, B${rowNum}<='Phased Income'!$C$5), 'Phased Income'!$D$5, IF(AND(B${rowNum}>='Phased Income'!$B$6, B${rowNum}<='Phased Income'!$C$6), 'Phased Income'!$D$6, 0))) * ((1 + 'Settings'!$B$6)^(${idx})))`;

    // State Pension YOU (SPA is B10, State Pension Today is B11 in Inputs & Setup, Triple Lock is B7 in Settings)
    const stateYouFormula = `IF(B${rowNum}>='Inputs & Setup'!$B$10, 'Inputs & Setup'!$B$11 * ((1 + 'Settings'!$B$7)^(${idx})), 0)`;

    // State Pension PARTNER
    const statePartnerFormula = isCouple
      ? `IF(C${rowNum}>='Inputs & Setup'!$D$10, 'Inputs & Setup'!$D$11 * ((1 + 'Settings'!$B$7)^(${idx})), 0)`
      : '0';

    // DB Fixed Income (referencing Fixed Income worksheet)
    const dbFormula = `IF(AND(B${rowNum}>='Fixed Income'!$B$4, B${rowNum}<='Fixed Income'!$C$4), 'Fixed Income'!$D$4, 0) + IF(AND(C${rowNum}>='Fixed Income'!$B$4, C${rowNum}<='Fixed Income'!$C$4), 'Fixed Income'!$E$4, 0) + IF(AND(B${rowNum}>='Fixed Income'!$B$5, B${rowNum}<='Fixed Income'!$C$5), 'Fixed Income'!$D$5, 0) + IF(AND(C${rowNum}>='Fixed Income'!$B$5, C${rowNum}<='Fixed Income'!$C$5), 'Fixed Income'!$E$5, 0)`;

    // PCLS Tax-Free Drawdown
    const pclsVal = projections[idx]?.pensionDrawdownTaxFree || 0;

    // Taxable Pension Drawdown
    const taxableDrawdownVal = projections[idx]?.pensionDrawdown || 0;

    // Total Taxable Income
    const totalTaxableFormula = `G${rowNum}+H${rowNum}+I${rowNum}+K${rowNum}`;

    // UK Income Tax Paid (referencing Settings Personal Allowance B3 and Basic Threshold B4, tax rates B10 & B11)
    const taxPaidFormula = `IF(L${rowNum}>'Settings'!$B$3, MAX(0, MIN(L${rowNum}-'Settings'!$B$3, 'Settings'!$B$4-'Settings'!$B$3)*'Settings'!$B$10) + MAX(0, L${rowNum}-'Settings'!$B$4)*'Settings'!$B$11, 0)`;

    // Net Income Received
    const netIncomeFormula = `IF(D${rowNum}="Accumulation", 0, L${rowNum}-M${rowNum}+J${rowNum})`;

    const pIn = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$C$4:$C$50, "DC Pensions", 'One-Off Contributions'!$D$4:$D$50, A${rowNum})`;
    const pTrIn = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$F$4:$F$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;
    const pTrOut = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$E$4:$E$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const isaIn = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$C$4:$C$50, "ISAs", 'One-Off Contributions'!$D$4:$D$50, A${rowNum})`;
    const isaTrIn = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$F$4:$F$50, "ISAs", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;
    const isaTrOut = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$E$4:$E$50, "ISAs", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    const cashIn = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$C$4:$C$50, "Cash & GIA", 'One-Off Contributions'!$D$4:$D$50, A${rowNum})`;
    const cashTrIn = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$F$4:$F$50, "Cash & GIA", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;
    const cashTrOut = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$E$4:$E$50, "Cash & GIA", 'Pot Transfers'!$D$4:$D$50, A${rowNum})`;

    // DC Pension Balance (referencing Settings Growth B12 & Contributions from 'Contributions' sheet)
    let pensionBalFormula: string;
    if (idx === 0) {
      pensionBalFormula = `MAX(0, 'Inputs & Setup'!$B$21 * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    } else {
      pensionBalFormula = `MAX(0, O${prevRowNum} * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    }

    // ISA Balance (referencing Settings Growth B13 & Contributions from 'Contributions' sheet)
    let isaBalFormula: string;
    if (idx === 0) {
      isaBalFormula = `MAX(0, 'Inputs & Setup'!$B$23 * (1 + 'Settings'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    } else {
      isaBalFormula = `MAX(0, P${prevRowNum} * (1 + 'Settings'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    }

    // Cash & GIA Balance (referencing Settings Interest B14 & Contributions from 'Contributions' sheet)
    let cashBalFormula: string;
    if (idx === 0) {
      cashBalFormula = `MAX(0, 'Inputs & Setup'!$B$25 * (1 + 'Settings'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
    } else {
      cashBalFormula = `MAX(0, Q${prevRowNum} * (1 + 'Settings'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
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
