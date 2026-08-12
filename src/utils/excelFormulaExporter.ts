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
      return 'Cash Savings';
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
      const startAge = c.startAge ?? currentAge;
      const endAge = c.endAge ?? retireAge;
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
  // SHEET 1: Inputs & Setup (Master Inputs & Current Pot Balances)
  // ==========================================
  const wsInputs = workbook.addWorksheet('Inputs & Setup');
  wsInputs.columns = [
    { header: 'Parameter / Asset Holding', key: 'a', width: 38 },
    { header: 'YOU Value (£)', key: 'b', width: 22 },
    { header: 'PARTNER Value (£)', key: 'c', width: 22 },
    { header: 'Household Total (£)', key: 'd', width: 28 },
  ];

  // Row 1: Title Banner
  const titleRow = wsInputs.getRow(1);
  titleRow.height = 32;
  titleRow.getCell(1).value = `RETIREFREE UK - MASTER INPUTS & SETUP (${planName || 'Current Plan'})`;
  titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = darkSlateFill;
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsInputs.mergeCells('A1:D1');

  wsInputs.addRow([]); // Row 2 Blank

  // --- SECTION 1: PERSONAL PROFILE & AGES ---
  wsInputs.addRow(['1. PERSONAL PROFILE & AGES', 'YOU', 'PARTNER', 'Notes / Cell Reference']); // Row 3
  const s1Row = wsInputs.getRow(3);
  s1Row.height = 24;
  s1Row.eachCell((cell) => {
    cell.fill = purpleFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryNmpa = profile.protectedPensionAccessAge || profile.pensionAccessAge || 57;
  const partnerNmpa = profile.partnerProtectedPensionAccessAge || profile.partnerPensionAccessAge || 57;

  wsInputs.addRow(['Current Age', profile.currentAge || 50, isCouple ? (profile.partnerCurrentAge || 50) : 0, 'Cell B4 (YOU) & Cell C4 (PARTNER)']); // Row 4
  wsInputs.addRow(['Normal Minimum Pension Access Age (NMPA)', primaryNmpa, isCouple ? partnerNmpa : 0, 'Cell B5 (YOU) & Cell C5 (PARTNER)']); // Row 5
  wsInputs.addRow(['Target Retirement Age', profile.targetRetirementAge || 55, isCouple ? (profile.partnerTargetRetirementAge || 57) : 0, 'Cell B6 (YOU) & Cell C6 (PARTNER)']); // Row 6
  wsInputs.addRow(['State Pension Start Age (SPA)', profile.statePensionAge || 67, isCouple ? (profile.partnerStatePensionAge || 67) : 67, 'Cell B7 (YOU) & Cell C7 (PARTNER)']); // Row 7
  wsInputs.addRow(['State Pension Today (£/yr)', profile.statePensionAmountAnnual || 12548, isCouple ? (profile.partnerStatePensionAmountAnnual || 12548) : 0, 'Cell B8 (YOU) & Cell C8 (PARTNER)']); // Row 8

  for (let r = 4; r <= 7; r++) {
    wsInputs.getCell(`B${r}`).numFmt = '0';
    wsInputs.getCell(`C${r}`).numFmt = '0';
  }
  wsInputs.getCell('B8').numFmt = '£#,##0';
  wsInputs.getCell('C8').numFmt = '£#,##0';

  wsInputs.addRow([]); // Row 9 Blank

  // --- SECTION 2: LIQUID ASSET POTS (CURRENT BALANCES) ---
  wsInputs.addRow(['2. LIQUID ASSET POTS', 'YOU Value (£)', 'PARTNER Value (£)', 'Household Total (£)']); // Row 10
  const s2Row = wsInputs.getRow(10);
  s2Row.height = 26;
  s2Row.eachCell((cell) => {
    cell.fill = cyanFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryTotalBal = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0) + (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.lisaBalance || 0) + (pots.giaBalance || 0) + (pots.cashSavingsBalance || 0);
  const partnerTotalBal = isCouple ? ((partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0) + (partnerPots.stocksAndSharesIsaBalance || 0) + (partnerPots.cashIsaBalance || 0) + (partnerPots.lisaBalance || 0) + (partnerPots.giaBalance || 0) + (partnerPots.cashSavingsBalance || 0)) : 0;

  // Row 11: Workplace Pension
  wsInputs.addRow([
    'Workplace Pension (Employer / Workplace)',
    pots.workplacePensionBalance || 0,
    isCouple ? (partnerPots.workplacePensionBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D11').value = { formula: 'B11+C11', result: (pots.workplacePensionBalance || 0) + (isCouple ? (partnerPots.workplacePensionBalance || 0) : 0) };

  // Row 12: SIPP / Private Pension
  wsInputs.addRow([
    'SIPP / Private Pension',
    pots.sippBalance || 0,
    isCouple ? (partnerPots.sippBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D12').value = { formula: 'B12+C12', result: (pots.sippBalance || 0) + (isCouple ? (partnerPots.sippBalance || 0) : 0) };

  // Row 13: Stocks & Shares ISA
  wsInputs.addRow([
    'Stocks & Shares ISA (Investment Platforms)',
    pots.stocksAndSharesIsaBalance || 0,
    isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D13').value = { formula: 'B13+C13', result: (pots.stocksAndSharesIsaBalance || 0) + (isCouple ? (partnerPots.stocksAndSharesIsaBalance || 0) : 0) };

  // Row 14: Cash ISA
  wsInputs.addRow([
    'Cash ISA',
    pots.cashIsaBalance || 0,
    isCouple ? (partnerPots.cashIsaBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D14').value = { formula: 'B14+C14', result: (pots.cashIsaBalance || 0) + (isCouple ? (partnerPots.cashIsaBalance || 0) : 0) };

  // Row 15: Lifetime ISA (LISA)
  wsInputs.addRow([
    'Lifetime ISA (LISA)',
    pots.lisaBalance || 0,
    isCouple ? (partnerPots.lisaBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D15').value = { formula: 'B15+C15', result: (pots.lisaBalance || 0) + (isCouple ? (partnerPots.lisaBalance || 0) : 0) };

  // Row 16: General Investment Account (GIA)
  wsInputs.addRow([
    'General Investment Account (GIA)',
    pots.giaBalance || 0,
    isCouple ? (partnerPots.giaBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D16').value = { formula: 'B16+C16', result: (pots.giaBalance || 0) + (isCouple ? (partnerPots.giaBalance || 0) : 0) };

  // Row 17: Cash Savings
  wsInputs.addRow([
    'Cash Savings',
    pots.cashSavingsBalance || 0,
    isCouple ? (partnerPots.cashSavingsBalance || 0) : 0,
    '',
  ]);
  wsInputs.getCell('D17').value = { formula: 'B17+C17', result: (pots.cashSavingsBalance || 0) + (isCouple ? (partnerPots.cashSavingsBalance || 0) : 0) };

  // Row 18: TOTAL LIQUID ASSET BALANCES
  wsInputs.addRow(['TOTAL LIQUID ASSET BALANCES', '', '', '']);
  const totAssetsRow = wsInputs.getRow(18);
  totAssetsRow.height = 24;
  totAssetsRow.font = fontBold;
  wsInputs.getCell('B18').value = { formula: 'SUM(B11:B17)', result: primaryTotalBal };
  wsInputs.getCell('C18').value = { formula: 'SUM(C11:C17)', result: partnerTotalBal };
  wsInputs.getCell('D18').value = { formula: 'B18+C18', result: primaryTotalBal + partnerTotalBal };

  for (let r = 11; r <= 18; r++) {
    for (const col of ['B', 'C', 'D']) {
      wsInputs.getCell(`${col}${r}`).numFmt = '£#,##0';
    }
  }

  wsInputs.addRow([]); // Row 19 Blank

  // --- SECTION 3: CURRENT POT CATEGORY TOTALS ---
  wsInputs.addRow(['3. CURRENT POT CATEGORY TOTALS', 'Household Total (£)', 'YOU (£)', 'PARTNER (£)']); // Row 20
  const s3Row = wsInputs.getRow(20);
  s3Row.height = 24;
  s3Row.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const primaryPensionBal = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0);
  const partnerPensionBal = isCouple ? ((partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0)) : 0;

  const primaryIsaBal = (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.lisaBalance || 0);
  const partnerIsaBal = isCouple ? ((partnerPots.stocksAndSharesIsaBalance || 0) + (partnerPots.cashIsaBalance || 0) + (partnerPots.lisaBalance || 0)) : 0;

  const primaryCashBal = (pots.giaBalance || 0) + (pots.cashSavingsBalance || 0);
  const partnerCashBal = isCouple ? ((partnerPots.giaBalance || 0) + (partnerPots.cashSavingsBalance || 0)) : 0;

  // Row 21: DC Pensions Total (Workplace + SIPP)
  wsInputs.addRow(['DC Pensions Balance Total', '', '', '']);
  wsInputs.getCell('C21').value = { formula: 'B11+B12', result: primaryPensionBal };
  wsInputs.getCell('D21').value = { formula: 'C11+C12', result: partnerPensionBal };
  wsInputs.getCell('B21').value = { formula: 'C21+D21', result: primaryPensionBal + partnerPensionBal };

  // Row 22: ISA Investments Total (S&S ISA + Cash ISA + LISA)
  wsInputs.addRow(['ISA Investments Balance Total', '', '', '']);
  wsInputs.getCell('C22').value = { formula: 'B13+B14+B15', result: primaryIsaBal };
  wsInputs.getCell('D22').value = { formula: 'C13+C14+C15', result: partnerIsaBal };
  wsInputs.getCell('B22').value = { formula: 'C22+D22', result: primaryIsaBal + partnerIsaBal };

  // Row 23: Cash & GIA Total (GIA + Cash Savings)
  wsInputs.addRow(['Cash & GIA Balance Total', '', '', '']);
  wsInputs.getCell('C23').value = { formula: 'B16+B17', result: primaryCashBal };
  wsInputs.getCell('D23').value = { formula: 'C16+C17', result: partnerCashBal };
  wsInputs.getCell('B23').value = { formula: 'C23+D23', result: primaryCashBal + partnerCashBal };

  // Row 24: TOTAL CURRENT POT BALANCES
  wsInputs.addRow(['TOTAL CURRENT POT BALANCES', '', '', '']);
  wsInputs.getCell('C24').value = { formula: 'C21+C22+C23', result: primaryTotalBal };
  wsInputs.getCell('D24').value = { formula: 'D21+D22+D23', result: partnerTotalBal };
  wsInputs.getCell('B24').value = { formula: 'B21+B22+B23', result: primaryTotalBal + partnerTotalBal };

  const totBalsRow = wsInputs.getRow(24);
  totBalsRow.font = fontBold;

  for (let r = 21; r <= 24; r++) {
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
  // SHEET 2: Regular Contributions (Dedicated Top-Ups Breakdown)
  // ==========================================
  const wsRegContrib = workbook.addWorksheet('Regular Contributions');
  wsRegContrib.columns = [
    { header: 'Asset Pot Name / Description', key: 'a', width: 38 },
    { header: 'YOU Monthly (£/mo)', key: 'b', width: 20 },
    { header: 'YOU Annual (£/yr)', key: 'c', width: 20 },
    { header: 'PARTNER Monthly (£/mo)', key: 'd', width: 22 },
    { header: 'PARTNER Annual (£/yr)', key: 'e', width: 22 },
    { header: 'Household Monthly (£/mo)', key: 'f', width: 24 },
    { header: 'Household Annual (£/yr)', key: 'g', width: 24 },
  ];

  // Title Banner
  const regTitle = wsRegContrib.getRow(1);
  regTitle.height = 32;
  regTitle.getCell(1).value = `RETIREFREE UK - REGULAR ANNUAL & MONTHLY CONTRIBUTIONS`;
  regTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  regTitle.getCell(1).fill = emeraldFill;
  regTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsRegContrib.mergeCells('A1:G1');

  wsRegContrib.addRow([]); // Row 2 Blank

  // Section 1 Header
  wsRegContrib.addRow(['1. BASELINE REGULAR TOP-UPS BY ASSET POT', 'YOU Monthly (£/mo)', 'YOU Annual (£/yr)', 'PARTNER Monthly (£/mo)', 'PARTNER Annual (£/yr)', 'Household Monthly (£/mo)', 'Household Annual (£/yr)']); // Row 3
  const rcS1 = wsRegContrib.getRow(3);
  rcS1.height = 24;
  rcS1.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const primaryWorkplaceAnnual = computeAnnualContributionForPot('workplace_pension', 'primary', profile, pots);
  const primarySippAnnual = computeAnnualContributionForPot('sipp', 'primary', profile, pots);
  const primarySnsIsaAnnual = computeAnnualContributionForPot('stocks_and_shares_isa', 'primary', profile, pots);
  const primaryCashIsaAnnual = computeAnnualContributionForPot('cash_isa', 'primary', profile, pots);
  const primaryLisaAnnual = computeAnnualContributionForPot('lisa', 'primary', profile, pots);
  const primaryGiaAnnual = computeAnnualContributionForPot('gia', 'primary', profile, pots);
  const primaryCashSavingsAnnual = computeAnnualContributionForPot('cash_savings', 'primary', profile, pots);

  const partnerWorkplaceAnnual = computeAnnualContributionForPot('workplace_pension', 'partner', profile, pots);
  const partnerSippAnnual = computeAnnualContributionForPot('sipp', 'partner', profile, pots);
  const partnerSnsIsaAnnual = computeAnnualContributionForPot('stocks_and_shares_isa', 'partner', profile, pots);
  const partnerCashIsaAnnual = computeAnnualContributionForPot('cash_isa', 'partner', profile, pots);
  const partnerLisaAnnual = computeAnnualContributionForPot('lisa', 'partner', profile, pots);
  const partnerGiaAnnual = computeAnnualContributionForPot('gia', 'partner', profile, pots);
  const partnerCashSavingsAnnual = computeAnnualContributionForPot('cash_savings', 'partner', profile, pots);

  const primaryTotalAnnual = primaryWorkplaceAnnual + primarySippAnnual + primarySnsIsaAnnual + primaryCashIsaAnnual + primaryLisaAnnual + primaryGiaAnnual + primaryCashSavingsAnnual;
  const partnerTotalAnnual = partnerWorkplaceAnnual + partnerSippAnnual + partnerSnsIsaAnnual + partnerCashIsaAnnual + partnerLisaAnnual + partnerGiaAnnual + partnerCashSavingsAnnual;

  // Rows 4-10: Baseline Pot Top-Ups
  wsRegContrib.addRow(['Workplace Pension (Employer & Employee)', Math.round(primaryWorkplaceAnnual / 12), primaryWorkplaceAnnual, Math.round(partnerWorkplaceAnnual / 12), partnerWorkplaceAnnual, '', '']); // Row 4
  wsRegContrib.addRow(['SIPP / Private Pension', Math.round(primarySippAnnual / 12), primarySippAnnual, Math.round(partnerSippAnnual / 12), partnerSippAnnual, '', '']); // Row 5
  wsRegContrib.addRow(['Stocks & Shares ISA', Math.round(primarySnsIsaAnnual / 12), primarySnsIsaAnnual, Math.round(partnerSnsIsaAnnual / 12), partnerSnsIsaAnnual, '', '']); // Row 6
  wsRegContrib.addRow(['Cash ISA', Math.round(primaryCashIsaAnnual / 12), primaryCashIsaAnnual, Math.round(partnerCashIsaAnnual / 12), partnerCashIsaAnnual, '', '']); // Row 7
  wsRegContrib.addRow(['Lifetime ISA (LISA)', Math.round(primaryLisaAnnual / 12), primaryLisaAnnual, Math.round(partnerLisaAnnual / 12), partnerLisaAnnual, '', '']); // Row 8
  wsRegContrib.addRow(['General Investment Account (GIA)', Math.round(primaryGiaAnnual / 12), primaryGiaAnnual, Math.round(partnerGiaAnnual / 12), partnerGiaAnnual, '', '']); // Row 9
  wsRegContrib.addRow(['Cash Savings', Math.round(primaryCashSavingsAnnual / 12), primaryCashSavingsAnnual, Math.round(partnerCashSavingsAnnual / 12), partnerCashSavingsAnnual, '', '']); // Row 10

  for (let r = 4; r <= 10; r++) {
    wsRegContrib.getCell(`F${r}`).value = { formula: `B${r}+D${r}` };
    wsRegContrib.getCell(`G${r}`).value = { formula: `C${r}+E${r}` };
  }

  // Row 11: Total Summary Row
  wsRegContrib.addRow(['TOTAL BASELINE REGULAR TOP-UPS', '', '', '', '', '', '']); // Row 11
  const rcTotRow = wsRegContrib.getRow(11);
  rcTotRow.font = fontBold;
  wsRegContrib.getCell('B11').value = { formula: 'SUM(B4:B10)', result: Math.round(primaryTotalAnnual / 12) };
  wsRegContrib.getCell('C11').value = { formula: 'SUM(C4:C10)', result: primaryTotalAnnual };
  wsRegContrib.getCell('D11').value = { formula: 'SUM(D4:D10)', result: Math.round(partnerTotalAnnual / 12) };
  wsRegContrib.getCell('E11').value = { formula: 'SUM(E4:E10)', result: partnerTotalAnnual };
  wsRegContrib.getCell('F11').value = { formula: 'SUM(F4:F10)', result: Math.round((primaryTotalAnnual + partnerTotalAnnual) / 12) };
  wsRegContrib.getCell('G11').value = { formula: 'SUM(G4:G10)', result: primaryTotalAnnual + partnerTotalAnnual };

  for (let r = 4; r <= 11; r++) {
    const row = wsRegContrib.getRow(r);
    row.eachCell((cell, colNumber) => {
      cell.border = borderThin;
      if (colNumber >= 2) {
        cell.numFmt = '£#,##0';
      }
    });
  }

  wsRegContrib.addRow([]); // Row 12 Blank

  // Section 2: Detailed Item Breakdown
  wsRegContrib.addRow(['2. REGULAR CONTRIBUTION ITEMS & DETAILED BREAKDOWN', 'Owner', 'Target Pot', 'Start Age', 'End Age', 'Monthly (£/mo)', 'Annual (£/yr)']); // Row 13
  const rcS2 = wsRegContrib.getRow(13);
  rcS2.height = 24;
  rcS2.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const activeRegularItems = (profile.oneOffContributions || []).filter(
    (c) => c.enabled !== false && c.frequency === 'regular_monthly'
  );

  if (activeRegularItems.length > 0) {
    activeRegularItems.forEach((c) => {
      const cOwner = c.owner === 'partner' ? 'PARTNER' : 'YOU';
      const cat = getPotDisplayName(c.targetPot);
      const mAmt = c.grossAmount || 0;
      const aAmt = mAmt * 12;
      const nextR = wsRegContrib.lastRow!.number + 1;
      wsRegContrib.addRow([
        c.name || 'Regular Contribution',
        cOwner,
        cat,
        c.startAge || (cOwner === 'PARTNER' ? (profile.partnerCurrentAge || 50) : (profile.currentAge || 50)),
        c.endAge || (cOwner === 'PARTNER' ? (profile.partnerTargetRetirementAge || 57) : (profile.targetRetirementAge || 55)),
        mAmt,
        { formula: `F${nextR}*12`, result: aAmt }
      ]);
    });
  } else {
    wsRegContrib.addRow(['Workplace Pension Top-Up', 'YOU', 'Workplace Pension', profile.currentAge || 50, profile.targetRetirementAge || 55, Math.round(primaryWorkplaceAnnual / 12), primaryWorkplaceAnnual]);
  }

  // Pre-fill template rows up to Row 30
  const curRegRows = wsRegContrib.lastRow!.number;
  for (let r = curRegRows + 1; r <= 30; r++) {
    const nextR = r;
    wsRegContrib.addRow(['Custom Regular Item (Optional)', 'YOU', 'SIPP / Private Pension', 50, 55, 0, { formula: `F${nextR}*12`, result: 0 }]);
  }

  for (let r = 14; r <= 30; r++) {
    const row = wsRegContrib.getRow(r);
    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '0';
    row.getCell(6).numFmt = '£#,##0';
    row.getCell(7).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


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

  const activeDbs = (profile.dbPensions || []).filter((db) => db.enabled !== false);
  const activeFixedStreams = (profile.fixedIncomeStreams || []).filter((fs) => fs.enabled !== false);

  if (activeDbs.length > 0 || activeFixedStreams.length > 0) {
    activeDbs.forEach((db) => {
      const cOwner = db.owner === 'partner' ? 'PARTNER' : 'YOU';
      wsFixed.addRow([
        db.name || `Defined Benefit Pension (${cOwner})`,
        cOwner,
        db.startAge || 60,
        db.endAge || 120,
        db.annualIncome || 0,
        db.inflationLinked ? 'CPI Indexed' : 'Level Pension Income'
      ]);
    });
    activeFixedStreams.forEach((fs) => {
      const cOwner = fs.owner === 'partner' ? 'PARTNER' : 'YOU';
      wsFixed.addRow([
        fs.name || `Fixed Income Stream (${cOwner})`,
        cOwner,
        fs.startAge || 60,
        fs.endAge || 120,
        fs.annualAmount || 0,
        fs.inflationLinked ? 'CPI Indexed' : 'Level Fixed Stream'
      ]);
    });
  } else {
    wsFixed.addRow(['Defined Benefit Pension (YOU)', 'YOU', 60, 120, 0, 'No active DB pension recorded']);
    wsFixed.addRow(['Defined Benefit Pension (PARTNER)', 'PARTNER', 60, 120, 0, 'No active partner DB pension']);
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
  // SHEET 7: Contributions (Year-by-Year Schedule)
  // ==========================================
  const wsContrib = workbook.addWorksheet('Contributions');

  // Title Row (Row 1)
  const contribTitle = wsContrib.getRow(1);
  contribTitle.height = 32;
  contribTitle.getCell(1).value = `RETIREFREE UK - CONTRIBUTION PROJECTION SCHEDULE`;
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

  // Rows 4 - 10: Reference Regular Contributions Sheet
  wsContrib.addRow(['Workplace Pension', { formula: "='Regular Contributions'!B4", result: Math.round(primaryWorkplaceAnnual / 12) }, { formula: "='Regular Contributions'!C4", result: primaryWorkplaceAnnual }, { formula: "='Regular Contributions'!D4", result: Math.round(partnerWorkplaceAnnual / 12) }, { formula: "='Regular Contributions'!E4", result: partnerWorkplaceAnnual }, { formula: '=B4+D4', result: Math.round((primaryWorkplaceAnnual + partnerWorkplaceAnnual) / 12) }, { formula: '=C4+E4', result: primaryWorkplaceAnnual + partnerWorkplaceAnnual }]);
  wsContrib.addRow(['SIPP / Private Pension', { formula: "='Regular Contributions'!B5", result: Math.round(primarySippAnnual / 12) }, { formula: "='Regular Contributions'!C5", result: primarySippAnnual }, { formula: "='Regular Contributions'!D5", result: Math.round(partnerSippAnnual / 12) }, { formula: "='Regular Contributions'!E5", result: partnerSippAnnual }, { formula: '=B5+D5', result: Math.round((primarySippAnnual + partnerSippAnnual) / 12) }, { formula: '=C5+E5', result: primarySippAnnual + partnerSippAnnual }]);
  wsContrib.addRow(['Stocks & Shares ISA', { formula: "='Regular Contributions'!B6", result: Math.round(primarySnsIsaAnnual / 12) }, { formula: "='Regular Contributions'!C6", result: primarySnsIsaAnnual }, { formula: "='Regular Contributions'!D6", result: Math.round(partnerSnsIsaAnnual / 12) }, { formula: "='Regular Contributions'!E6", result: partnerSnsIsaAnnual }, { formula: '=B6+D6', result: Math.round((primarySnsIsaAnnual + partnerSnsIsaAnnual) / 12) }, { formula: '=C6+E6', result: primarySnsIsaAnnual + partnerSnsIsaAnnual }]);
  wsContrib.addRow(['Cash ISA', { formula: "='Regular Contributions'!B7", result: Math.round(primaryCashIsaAnnual / 12) }, { formula: "='Regular Contributions'!C7", result: primaryCashIsaAnnual }, { formula: "='Regular Contributions'!D7", result: Math.round(partnerCashIsaAnnual / 12) }, { formula: "='Regular Contributions'!E7", result: partnerCashIsaAnnual }, { formula: '=B7+D7', result: Math.round((primaryCashIsaAnnual + partnerCashIsaAnnual) / 12) }, { formula: '=C7+E7', result: primaryCashIsaAnnual + partnerCashIsaAnnual }]);
  wsContrib.addRow(['Lifetime ISA (LISA)', { formula: "='Regular Contributions'!B8", result: Math.round(primaryLisaAnnual / 12) }, { formula: "='Regular Contributions'!C8", result: primaryLisaAnnual }, { formula: "='Regular Contributions'!D8", result: Math.round(partnerLisaAnnual / 12) }, { formula: "='Regular Contributions'!E8", result: partnerLisaAnnual }, { formula: '=B8+D8', result: Math.round((primaryLisaAnnual + partnerLisaAnnual) / 12) }, { formula: '=C8+E8', result: primaryLisaAnnual + partnerLisaAnnual }]);
  wsContrib.addRow(['General Investment Account (GIA)', { formula: "='Regular Contributions'!B9", result: Math.round(primaryGiaAnnual / 12) }, { formula: "='Regular Contributions'!C9", result: primaryGiaAnnual }, { formula: "='Regular Contributions'!D9", result: Math.round(partnerGiaAnnual / 12) }, { formula: "='Regular Contributions'!E9", result: partnerGiaAnnual }, { formula: '=B9+D9', result: Math.round((primaryGiaAnnual + partnerGiaAnnual) / 12) }, { formula: '=C9+E9', result: primaryGiaAnnual + partnerGiaAnnual }]);
  wsContrib.addRow(['Cash Savings', { formula: "='Regular Contributions'!B10", result: Math.round(primaryCashSavingsAnnual / 12) }, { formula: "='Regular Contributions'!C10", result: primaryCashSavingsAnnual }, { formula: "='Regular Contributions'!D10", result: Math.round(partnerCashSavingsAnnual / 12) }, { formula: "='Regular Contributions'!E10", result: partnerCashSavingsAnnual }, { formula: '=B10+D10', result: Math.round((primaryCashSavingsAnnual + partnerCashSavingsAnnual) / 12) }, { formula: '=C10+E10', result: primaryCashSavingsAnnual + partnerCashSavingsAnnual }]);

  // Row 11: Total Base Contributions
  wsContrib.addRow(['TOTAL BASELINE TOP-UPS', '', '', '', '', '', '']);
  const cTotRow = wsContrib.getRow(11);
  cTotRow.height = 24;
  cTotRow.font = fontBold;
  wsContrib.getCell('B11').value = { formula: 'SUM(B4:B10)', result: Math.round(primaryTotalAnnual / 12) };
  wsContrib.getCell('C11').value = { formula: 'SUM(C4:C10)', result: primaryTotalAnnual };
  wsContrib.getCell('D11').value = { formula: 'SUM(D4:D10)', result: Math.round(partnerTotalAnnual / 12) };
  wsContrib.getCell('E11').value = { formula: 'SUM(E4:E10)', result: partnerTotalAnnual };
  wsContrib.getCell('F11').value = { formula: 'SUM(F4:F10)', result: Math.round((primaryTotalAnnual + partnerTotalAnnual) / 12) };
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
    const contribRowNum = idx + 15;
    const schedRowNum = idx + 2;

    const cYear = `='Schedule'!A${schedRowNum}`;
    const cAgeYou = `='Schedule'!B${schedRowNum}`;
    const cAgePartner = `='Schedule'!C${schedRowNum}`;
    const cStatus = `='Schedule'!D${schedRowNum}`;

    // Contributions formulas during Accumulation
    const cWorkplaceYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$4, 0)`;
    const cSippYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$5, 0)`;
    const cDcPensionYou = `E${contribRowNum}+F${contribRowNum}`;

    const cSnsIsaYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$6, 0)`;
    const cCashIsaYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$7, 0)`;
    const cLisaYou = `IF(AND(B${contribRowNum}<'Inputs & Setup'!$B$6, B${contribRowNum}<50), 'Regular Contributions'!$C$8, 0)`;
    const cTotalIsaYou = `H${contribRowNum}+I${contribRowNum}+J${contribRowNum}`;

    const cGiaYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$9, 0)`;
    const cCashSavingsYou = `IF(B${contribRowNum}<'Inputs & Setup'!$B$6, 'Regular Contributions'!$C$10, 0)`;
    const cTotalCashGiaYou = `L${contribRowNum}+M${contribRowNum}`;

    const cTotalYouAnnual = `G${contribRowNum}+K${contribRowNum}+N${contribRowNum}`;

    // Partner Contributions
    const cWorkplacePartner = isCouple ? `IF(C${contribRowNum}<'Inputs & Setup'!$D$6, 'Regular Contributions'!$E$4, 0)` : '0';
    const cSippPartner = isCouple ? `IF(C${contribRowNum}<'Inputs & Setup'!$D$6, 'Regular Contributions'!$E$5, 0)` : '0';
    const cDcPensionPartner = `P${contribRowNum}+Q${contribRowNum}`;
    const cTotalIsaPartner = isCouple ? `IF(C${contribRowNum}<'Inputs & Setup'!$D$6, 'Regular Contributions'!$E$6+'Regular Contributions'!$E$7+'Regular Contributions'!$E$8, 0)` : '0';
    const cTotalCashGiaPartner = isCouple ? `IF(C${contribRowNum}<'Inputs & Setup'!$D$6, 'Regular Contributions'!$E$9+'Regular Contributions'!$E$10, 0)` : '0';
    const cTotalPartnerAnnual = `R${contribRowNum}+S${contribRowNum}+T${contribRowNum}`;

    const cHouseholdRegular = `O${contribRowNum}+U${contribRowNum}`;

    // Capital Flow Summaries from One-Offs and Pot Transfers
    const cOneOffInflow = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$D$4:$D$50, A${contribRowNum})`;
    const cTransferOutflow = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$D$4:$D$50, A${contribRowNum})`;
    const cTransferInflow = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$D$4:$D$50, A${contribRowNum})`;
    const cNetCapitalInflow = `V${contribRowNum}+W${contribRowNum}-X${contribRowNum}+Y${contribRowNum}`;

    wsContrib.addRow([
      { formula: cYear, result: (profile.currentAge || 50) + idx },
      { formula: cAgeYou, result: (profile.currentAge || 50) + idx },
      { formula: cAgePartner, result: isCouple ? ((profile.partnerCurrentAge || 50) + idx) : 0 },
      { formula: cStatus, result: ((profile.currentAge || 50) + idx) < (profile.targetRetirementAge || 55) ? 'Accumulation' : 'Retirement' },
      { formula: cWorkplaceYou, result: primaryWorkplaceAnnual },
      { formula: cSippYou, result: primarySippAnnual },
      { formula: cDcPensionYou, result: primaryWorkplaceAnnual + primarySippAnnual },
      { formula: cSnsIsaYou, result: primarySnsIsaAnnual },
      { formula: cCashIsaYou, result: primaryCashIsaAnnual },
      { formula: cLisaYou, result: primaryLisaAnnual },
      { formula: cTotalIsaYou, result: primarySnsIsaAnnual + primaryCashIsaAnnual + primaryLisaAnnual },
      { formula: cGiaYou, result: primaryGiaAnnual },
      { formula: cCashSavingsYou, result: primaryCashSavingsAnnual },
      { formula: cTotalCashGiaYou, result: primaryGiaAnnual + primaryCashSavingsAnnual },
      { formula: cTotalYouAnnual, result: primaryTotalAnnual },
      { formula: cWorkplacePartner, result: partnerWorkplaceAnnual },
      { formula: cSippPartner, result: partnerSippAnnual },
      { formula: cDcPensionPartner, result: partnerWorkplaceAnnual + partnerSippAnnual },
      { formula: cTotalIsaPartner, result: partnerSnsIsaAnnual + partnerCashIsaAnnual + partnerLisaAnnual },
      { formula: cTotalCashGiaPartner, result: partnerGiaAnnual + partnerCashSavingsAnnual },
      { formula: cTotalPartnerAnnual, result: partnerTotalAnnual },
      { formula: cHouseholdRegular, result: primaryTotalAnnual + partnerTotalAnnual },
      { formula: cOneOffInflow, result: 0 },
      { formula: cTransferOutflow, result: 0 },
      { formula: cTransferInflow, result: 0 },
      { formula: cNetCapitalInflow, result: primaryTotalAnnual + partnerTotalAnnual },
    ]);

    const row = wsContrib.getRow(contribRowNum);
    row.getCell(1).numFmt = '0';
    row.getCell(2).numFmt = '0';
    row.getCell(3).numFmt = '0';
    row.getCell(4).alignment = { horizontal: 'center' };

    for (let c = 5; c <= 26; c++) {
      row.getCell(c).numFmt = '£#,##0';
    }
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 8: Schedule (Master Projections Table)
  // ==========================================
  const wsSched = workbook.addWorksheet('Schedule');

  // Title Banner
  const schedTitle = wsSched.getRow(1);
  schedTitle.height = 32;
  schedTitle.getCell(1).value = `RETIREFREE UK - MASTER PROJECTION SCHEDULE`;
  schedTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  schedTitle.getCell(1).fill = darkSlateFill;
  schedTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsSched.mergeCells('A1:R1');

  const headers = [
    'Year',
    'Age YOU',
    'Age PARTNER',
    'Status',
    'Annual Contributions (£)',
    'Target Requirement (£)',
    'State Pension YOU (£)',
    'State Pension PARTNER (£)',
    'DB & Fixed Income (£)',
    'PCLS Tax-Free Drawdown (£)',
    'Taxable Pension Drawdown (£)',
    'Total Taxable Income (£)',
    'UK Tax Paid (£)',
    'Net Income Received (£)',
    'DC Pension Balance (£)',
    'ISA Balance (£)',
    'Cash & GIA Balance (£)',
    'Total Portfolio Wealth (£)',
  ];

  wsSched.addRow(headers); // Row 2
  const sHeaderRow = wsSched.getRow(2);
  sHeaderRow.height = 26;
  sHeaderRow.eachCell((cell) => {
    cell.fill = darkSlateFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsSched.columns = [
    { width: 10 }, // Year
    { width: 12 }, // Age YOU
    { width: 14 }, // Age PARTNER
    { width: 16 }, // Status
    { width: 22 }, // Annual Contributions
    { width: 22 }, // Target Requirement
    { width: 22 }, // State Pension YOU
    { width: 24 }, // State Pension PARTNER
    { width: 22 }, // DB & Fixed Income
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
    const rowNum = idx + 3; // Row 3 is year 0 (since title is Row 1, header is Row 2)
    const prevRowNum = rowNum - 1;
    const contribRowNum = idx + 15; // Corresponding row in 'Contributions' sheet

    // Year (Settings B4 is Current Tax Year)
    const yearFormula = `'Settings'!$B$4 + ${idx}`;

    // Age YOU (B4 in Inputs & Setup)
    const ageYouFormula = `'Inputs & Setup'!$B$4 + ${idx}`;

    // Age PARTNER (C4 in Inputs & Setup)
    const agePartnerFormula = `'Inputs & Setup'!$C$4 + ${idx}`;

    // Status (B6 in Inputs & Setup is Target Retirement Age YOU)
    const statusFormula = `IF(B${rowNum}<'Inputs & Setup'!$B$6, "Accumulation", "Retirement")`;

    // Annual Contributions (referenced from Contributions Sheet Column Z)
    const annualContribFormula = `'Contributions'!Z${contribRowNum}`;

    // Target Requirement (0 during Accumulation, indexed for inflation during Retirement)
    const targetReqFormula = `IF(D${rowNum}="Accumulation", 0, IF(AND(B${rowNum}>='Phased Income'!$B$4, B${rowNum}<='Phased Income'!$C$4), 'Phased Income'!$D$4, IF(AND(B${rowNum}>='Phased Income'!$B$5, B${rowNum}<='Phased Income'!$C$5), 'Phased Income'!$D$5, IF(AND(B${rowNum}>='Phased Income'!$B$6, B${rowNum}<='Phased Income'!$C$6), 'Phased Income'!$D$6, 0))) * ((1 + 'Settings'!$B$11)^(${idx})))`;

    // State Pension YOU (SPA is B7, State Pension Today is B8 in Inputs & Setup, Triple Lock is B15 in Settings)
    const stateYouFormula = `IF(B${rowNum}>='Inputs & Setup'!$B$7, 'Inputs & Setup'!$B$8 * ((1 + 'Settings'!$B$15)^(${idx})), 0)`;

    // State Pension PARTNER (SPA is C7, State Pension Today is C8 in Inputs & Setup)
    const statePartnerFormula = isCouple
      ? `IF(C${rowNum}>='Inputs & Setup'!$C$7, 'Inputs & Setup'!$C$8 * ((1 + 'Settings'!$B$15)^(${idx})), 0)`
      : '0';

    // DB & Fixed Income (dynamically sums active streams for YOU and PARTNER from Fixed Income sheet rows 4 to 25)
    const dbFormula = `SUMPRODUCT(('Fixed Income'!$E$4:$E$25) * ((('Fixed Income'!$B$4:$B$25="YOU") * (B${rowNum}>='Fixed Income'!$C$4:$C$25) * (B${rowNum}<='Fixed Income'!$D$4:$D$25)) + (('Fixed Income'!$B$4:$B$25="PARTNER") * (C${rowNum}>='Fixed Income'!$C$4:$C$25) * (C${rowNum}<='Fixed Income'!$D$4:$D$25))))`;

    // PCLS Tax-Free Drawdown
    const pclsVal = projections[idx]?.pensionDrawdownTaxFree || 0;

    // Taxable Pension Drawdown
    const taxableDrawdownVal = projections[idx]?.pensionDrawdown || 0;

    // Total Taxable Income
    const totalTaxableFormula = `G${rowNum}+H${rowNum}+I${rowNum}+K${rowNum}`;

    // UK Income Tax Paid (referencing Settings Personal Allowance B5 and Basic Threshold B6)
    const taxPaidFormula = `IF(L${rowNum}>'Settings'!$B$5, MAX(0, MIN(L${rowNum}-'Settings'!$B$5, 'Settings'!$B$6-'Settings'!$B$5)*0.20) + MAX(0, L${rowNum}-'Settings'!$B$6)*0.40, 0)`;

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

    // DC Pension Balance (referencing Settings Growth B12 & Household DC Pensions Total B21 in Inputs & Setup)
    let pensionBalFormula: string;
    if (idx === 0) {
      pensionBalFormula = `MAX(0, 'Inputs & Setup'!$B$21 * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    } else {
      pensionBalFormula = `MAX(0, O${prevRowNum} * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + 'Contributions'!R${contribRowNum} + (${pIn}) + (${pTrIn}) - (${pTrOut}) - J${rowNum} - K${rowNum})`;
    }

    // ISA Balance (referencing Settings Growth B13 & Household ISA Total B22 in Inputs & Setup)
    let isaBalFormula: string;
    if (idx === 0) {
      isaBalFormula = `MAX(0, 'Inputs & Setup'!$B$22 * (1 + 'Settings'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    } else {
      isaBalFormula = `MAX(0, P${prevRowNum} * (1 + 'Settings'!$B$13) + 'Contributions'!K${contribRowNum} + 'Contributions'!S${contribRowNum} + (${isaIn}) + (${isaTrIn}) - (${isaTrOut}))`;
    }

    // Cash & GIA Balance (referencing Settings Interest B14 & Household Cash Total B23 in Inputs & Setup)
    let cashBalFormula: string;
    if (idx === 0) {
      cashBalFormula = `MAX(0, 'Inputs & Setup'!$B$23 * (1 + 'Settings'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
    } else {
      cashBalFormula = `MAX(0, Q${prevRowNum} * (1 + 'Settings'!$B$14) + 'Contributions'!N${contribRowNum} + 'Contributions'!T${contribRowNum} + (${cashIn}) + (${cashTrIn}) - (${cashTrOut}))`;
    }

    // Total Portfolio Wealth
    const totalWealthFormula = `O${rowNum}+P${rowNum}+Q${rowNum}`;

    const proj = projections[idx];

    wsSched.addRow([
      { formula: yearFormula, result: (profile.currentAge || 50) + idx },
      { formula: ageYouFormula, result: (profile.currentAge || 50) + idx },
      { formula: agePartnerFormula, result: isCouple ? ((profile.partnerCurrentAge || 50) + idx) : 0 },
      { formula: statusFormula, result: ((profile.currentAge || 50) + idx) < (profile.targetRetirementAge || 55) ? 'Accumulation' : 'Retirement' },
      { formula: annualContribFormula, result: primaryTotalAnnual + partnerTotalAnnual },
      { formula: targetReqFormula, result: proj?.targetIncome || baseTargetNet },
      { formula: stateYouFormula, result: proj?.statePensionAnnual || 0 },
      { formula: statePartnerFormula, result: proj?.partnerStatePensionAnnual || 0 },
      { formula: dbFormula, result: proj?.dbPensionIncome || 0 },
      pclsVal,
      taxableDrawdownVal,
      { formula: totalTaxableFormula, result: (proj?.statePensionAnnual || 0) + (proj?.partnerStatePensionAnnual || 0) + (proj?.dbPensionIncome || 0) + taxableDrawdownVal },
      { formula: taxPaidFormula, result: proj?.totalTaxPaid || 0 },
      { formula: netIncomeFormula, result: proj?.netIncomeReceived || 0 },
      { formula: pensionBalFormula, result: proj ? (proj.workplacePensionBalance + proj.sippBalance + proj.partnerWorkplacePensionBalance + proj.partnerSippBalance) : primaryPensionBal },
      { formula: isaBalFormula, result: proj ? (proj.stocksAndSharesIsaBalance + proj.cashIsaBalance + proj.lisaBalance + proj.partnerStocksAndSharesIsaBalance + proj.partnerCashIsaBalance + proj.partnerLisaBalance) : primaryIsaBal },
      { formula: cashBalFormula, result: proj ? (proj.giaBalance + proj.cashSavingsBalance + proj.partnerGiaBalance + proj.partnerCashSavingsBalance) : primaryCashBal },
      { formula: totalWealthFormula, result: proj ? proj.totalWealth : primaryTotalBal + partnerTotalBal },
    ]);

    const row = wsSched.getRow(rowNum);
    row.getCell(1).numFmt = '0';
    row.getCell(2).numFmt = '0';
    row.getCell(3).numFmt = '0';
    row.getCell(4).alignment = { horizontal: 'center' };

    for (let c = 5; c <= 18; c++) {
      row.getCell(c).numFmt = '£#,##0';
    }
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 9: Settings (Moved to Last Sheet in List)
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

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
