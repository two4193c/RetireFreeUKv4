import ExcelJS from 'exceljs';
import { UserProfile, InvestmentPots, YearProjection, InvestmentPotType, OneOffContribution, PotTransfer, LumpSumTargetPot, LumpSumSplit } from '../types';
import { sanitizePots, DEFAULT_PARTNER_POTS } from './defaultData';
import { getEffectiveDecumulationReturn } from './assetAllocation';
import {
  getLsaLimit,
  getPartnerLsaLimit,
  getLumpSumTakeAge,
  getPartnerLumpSumTakeAge,
  getProjectedPensionAtTakeAge,
  allocateLumpSumToPots,
} from './ukTaxEngine';

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

function getStrategyLabel(strategy?: string): string {
  switch (strategy) {
    case 'isa_first': return 'ISA / Tax-Free Pots First';
    case 'cash_first': return 'Cash / Savings First';
    case 'pension_first': return 'Pension / Taxable First';
    case 'pro_rata': return 'Pro-Rata Balanced';
    case 'tax_free_bracket': return 'Tax-Free Personal Allowance First (£12,570)';
    case 'basic_rate_bracket': return 'Basic Rate Tax Bracket First (£50,270)';
    case 'higher_rate_bracket': return 'Higher Rate Tax Bracket First (£125,140)';
    case 'annuity': return 'Guaranteed Annuity Purchase';
    case 'hybrid_annuity': return 'Hybrid Annuity & Flexi-Drawdown';
    default: return 'ISA / Tax-Free Pots First';
  }
}

function getAnnuityTypeLabel(type?: string): string {
  switch (type) {
    case 'level_single': return 'Level Single Life';
    case 'inflation_linked_single': return 'Inflation-Linked Single Life (CPI)';
    case 'fixed_escalation_single_3': return 'Fixed 3% Escalating Single Life';
    case 'fixed_escalation_single_5': return 'Fixed 5% Escalating Single Life';
    case 'level_joint_50': return 'Level Joint Life (50% Spouse Benefit)';
    case 'level_joint_100': return 'Level Joint Life (100% Spouse Benefit)';
    case 'inflation_linked_joint_50': return 'Inflation-Linked Joint (50% Spouse Benefit)';
    case 'inflation_linked_joint_100': return 'Inflation-Linked Joint (100% Spouse Benefit)';
    default: return type ? String(type) : 'Inflation-Linked Single Life (CPI)';
  }
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
  const projectYears = Math.max(projections.length, 36);
  const primaryPensionBal = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0);
  const partnerPensionBal = isCouple ? ((partnerPots.workplacePensionBalance || 0) + (partnerPots.sippBalance || 0)) : 0;

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

  // Rows 4-10: Baseline Pot Top-Ups with dynamic SUMIFS formulas linked to Section 2
  const potRowConfigs = [
    { label: 'Workplace Pension (Employer & Employee)', pVal: primaryWorkplaceAnnual, ptVal: partnerWorkplaceAnnual },
    { label: 'SIPP / Private Pension', pVal: primarySippAnnual, ptVal: partnerSippAnnual },
    { label: 'Stocks & Shares ISA', pVal: primarySnsIsaAnnual, ptVal: partnerSnsIsaAnnual },
    { label: 'Cash ISA', pVal: primaryCashIsaAnnual, ptVal: partnerCashIsaAnnual },
    { label: 'Lifetime ISA (LISA)', pVal: primaryLisaAnnual, ptVal: partnerLisaAnnual },
    { label: 'General Investment Account (GIA)', pVal: primaryGiaAnnual, ptVal: partnerGiaAnnual },
    { label: 'Cash Savings', pVal: primaryCashSavingsAnnual, ptVal: partnerCashSavingsAnnual },
  ];

  potRowConfigs.forEach(({ label, pVal, ptVal }, idx) => {
    const r = idx + 4;
    const catSearch = label.split(' ')[0] === 'Workplace' ? 'Workplace Pension' : label.split(' ')[0] === 'SIPP' ? 'SIPP / Private Pension' : label.split(' ')[0] === 'Stocks' ? 'Stocks & Shares ISA' : label.split(' ')[0] === 'Cash' && label.includes('ISA') ? 'Cash ISA' : label.split(' ')[0] === 'Lifetime' ? 'Lifetime ISA (LISA)' : label.split(' ')[0] === 'General' ? 'General Investment Account (GIA)' : 'Cash Savings';
    wsRegContrib.addRow([
      label,
      { formula: `SUMIFS(F$14:F$30, B$14:B$30, "YOU", C$14:C$30, "${catSearch}")`, result: Math.round(pVal / 12) },
      { formula: `SUMIFS(G$14:G$30, B$14:B$30, "YOU", C$14:C$30, "${catSearch}")`, result: pVal },
      { formula: `SUMIFS(F$14:F$30, B$14:B$30, "PARTNER", C$14:C$30, "${catSearch}")`, result: Math.round(ptVal / 12) },
      { formula: `SUMIFS(G$14:G$30, B$14:B$30, "PARTNER", C$14:C$30, "${catSearch}")`, result: ptVal },
      { formula: `B${r}+D${r}`, result: Math.round((pVal + ptVal) / 12) },
      { formula: `C${r}+E${r}`, result: pVal + ptVal }
    ]);
  });

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

  const primaryCurrentAge = profile.currentAge || 50;
  const primaryRetireAge = profile.targetRetirementAge || 55;
  const partnerCurrentAge = profile.partnerCurrentAge || 50;
  const partnerRetireAge = profile.partnerTargetRetirementAge || 57;

  const potTypesList: { key: InvestmentPotType; label: string }[] = [
    { key: 'workplace_pension', label: 'Workplace Pension' },
    { key: 'sipp', label: 'SIPP / Private Pension' },
    { key: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA' },
    { key: 'cash_isa', label: 'Cash ISA' },
    { key: 'lisa', label: 'Lifetime ISA (LISA)' },
    { key: 'gia', label: 'General Investment Account (GIA)' },
    { key: 'cash_savings', label: 'Cash Savings' },
  ];

  const activeRegularItems = (profile.oneOffContributions || []).filter(
    (c) => c.enabled !== false && c.frequency === 'regular_monthly'
  );

  interface RegContribRecord {
    name: string;
    ownerStr: 'YOU' | 'PARTNER';
    potLabel: string;
    startAge: number;
    endAge: number;
    monthlyAmt: number;
    annualAmt: number;
  }

  const regRows: RegContribRecord[] = [];

  potTypesList.forEach(({ key, label }) => {
    const items = activeRegularItems.filter((c) => (c.owner || 'primary') === 'primary' && c.targetPot === key);
    if (items.length > 0) {
      items.forEach((c) => {
        let mAmt = c.grossAmount || 0;
        if (key === 'workplace_pension') {
          if (c.workplaceContributionType === 'fixed') {
            mAmt = (c.employeeMonthlyAmount ?? c.grossAmount ?? 0) + (c.employerMonthlyAmount ?? 0);
          } else {
            const grossSalary = profile.grossAnnualSalary || 0;
            const empPct = c.employeePercent ?? 5;
            const emprPct = c.employerPercent ?? 3;
            mAmt = Math.round((grossSalary * ((empPct + emprPct) / 100)) / 12);
          }
        } else if (key === 'sipp') {
          const rawM = c.grossAmount || 0;
          mAmt = c.sippContributionType === 'gross' ? rawM : Math.round(rawM * 1.25);
        }
        regRows.push({
          name: c.name || `${label} Item`,
          ownerStr: 'YOU',
          potLabel: label,
          startAge: c.startAge ?? primaryCurrentAge,
          endAge: c.endAge ?? primaryRetireAge,
          monthlyAmt: mAmt,
          annualAmt: mAmt * 12,
        });
      });
    } else {
      const baseAnnual = computeAnnualContributionForPot(key, 'primary', profile, pots);
      if (baseAnnual > 0) {
        regRows.push({
          name: `${label} Top-Up`,
          ownerStr: 'YOU',
          potLabel: label,
          startAge: primaryCurrentAge,
          endAge: primaryRetireAge,
          monthlyAmt: Math.round(baseAnnual / 12),
          annualAmt: baseAnnual,
        });
      }
    }
  });

  if (isCouple) {
    potTypesList.forEach(({ key, label }) => {
      const items = activeRegularItems.filter((c) => c.owner === 'partner' && c.targetPot === key);
      if (items.length > 0) {
        items.forEach((c) => {
          let mAmt = c.grossAmount || 0;
          if (key === 'workplace_pension') {
            if (c.workplaceContributionType === 'fixed') {
              mAmt = (c.employeeMonthlyAmount ?? c.grossAmount ?? 0) + (c.employerMonthlyAmount ?? 0);
            } else {
              const grossSalary = profile.partnerGrossAnnualSalary || 0;
              const empPct = c.employeePercent ?? 5;
              const emprPct = c.employerPercent ?? 3;
              mAmt = Math.round((grossSalary * ((empPct + emprPct) / 100)) / 12);
            }
          } else if (key === 'sipp') {
            const rawM = c.grossAmount || 0;
            mAmt = c.sippContributionType === 'gross' ? rawM : Math.round(rawM * 1.25);
          }
          regRows.push({
            name: c.name || `${label} Item (Partner)`,
            ownerStr: 'PARTNER',
            potLabel: label,
            startAge: c.startAge ?? partnerCurrentAge,
            endAge: c.endAge ?? partnerRetireAge,
            monthlyAmt: mAmt,
            annualAmt: mAmt * 12,
          });
        });
      } else {
        const baseAnnual = computeAnnualContributionForPot(key, 'partner', profile, pots);
        if (baseAnnual > 0) {
          regRows.push({
            name: `${label} Top-Up (Partner)`,
            ownerStr: 'PARTNER',
            potLabel: label,
            startAge: partnerCurrentAge,
            endAge: partnerRetireAge,
            monthlyAmt: Math.round(baseAnnual / 12),
            annualAmt: baseAnnual,
          });
        }
      }
    });
  }

  let sec2RowIdx = 14;
  regRows.forEach((r) => {
    const nextR = sec2RowIdx;
    wsRegContrib.addRow([
      r.name,
      r.ownerStr,
      r.potLabel,
      r.startAge,
      r.endAge,
      r.monthlyAmt,
      { formula: `F${nextR}*12`, result: r.annualAmt },
    ]);
    sec2RowIdx++;
  });

  // Pre-fill template rows up to Row 30
  while (sec2RowIdx <= 30) {
    const nextR = sec2RowIdx;
    wsRegContrib.addRow(['Custom Regular Item (Optional)', 'YOU', 'SIPP / Private Pension', 50, 55, 0, { formula: `F${nextR}*12`, result: 0 }]);
    sec2RowIdx++;
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
  // SHEET 3: Fixed Income (DB Pensions & Annuities)
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
  // SHEET 6: Tax Free Lump Sums & Phased Crystallisation (Split Pots & LSA)
  // ==========================================
  const wsPcls = workbook.addWorksheet('Tax Free Lump Sums');
  wsPcls.columns = [
    { header: 'Owner', key: 'a', width: 14 },
    { header: 'Lump Sum Event / Description', key: 'b', width: 34 },
    { header: 'Access / Lump Sum Age', key: 'c', width: 22 },
    { header: 'Execution Year', key: 'd', width: 16 },
    { header: 'PCLS Percentage (%)', key: 'e', width: 20 },
    { header: 'Lump Sum Strategy', key: 'f', width: 30 },
    { header: 'LSA Allowance Limit (£)', key: 'g', width: 24 },
    { header: 'Destination Pot Description', key: 'h', width: 34 },
    { header: 'Total Crystallised / Gross (£)', key: 'i', width: 26 },
    { header: 'Tax-Free PCLS Cash (£)', key: 'j', width: 24 },
    { header: 'Allocated to ISAs (£)', key: 'k', width: 22 },
    { header: 'Allocated to Cash & GIA (£)', key: 'l', width: 24 },
    { header: 'Spent / Clear Debt (£)', key: 'm', width: 22 },
    { header: 'Notes / Scheme Protection', key: 'n', width: 44 },
  ];

  // Title Banner
  const pclsTitle = wsPcls.getRow(1);
  pclsTitle.height = 32;
  pclsTitle.getCell(1).value = `RETIREFREE UK - TAX-FREE CASH (PCLS), PHASED CRYSTALLISATION (SPLIT POTS) & LSA ALLOCATION`;
  pclsTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pclsTitle.getCell(1).fill = purpleFill;
  pclsTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsPcls.mergeCells('A1:N1');

  wsPcls.addRow([]); // Row 2 Blank

  // Table Header
  wsPcls.addRow([
    'Owner',
    'Lump Sum Event / Description',
    'Access / Lump Sum Age',
    'Execution Year',
    'PCLS Percentage (%)',
    'Lump Sum Strategy',
    'LSA Allowance Limit (£)',
    'Destination Pot Description',
    'Total Crystallised / Gross (£)',
    'Tax-Free PCLS Cash (£)',
    'Allocated to ISAs (£)',
    'Allocated to Cash & GIA (£)',
    'Spent / Clear Debt (£)',
    'Notes / Scheme Protection',
  ]); // Row 3
  const pclsHeadRow = wsPcls.getRow(3);
  pclsHeadRow.height = 26;
  pclsHeadRow.eachCell((cell) => {
    cell.fill = purpleFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const getPclsDestStr = (targetPot?: LumpSumTargetPot, splits?: LumpSumSplit[]) => {
    if (targetPot === 'split' && splits && splits.length > 0) {
      const parts = splits.map((s) => {
        const valStr = s.mode === 'percentage' ? `${s.value}%` : `£${s.value.toLocaleString()}`;
        const potLabel = (s.pot === 'stocks_and_shares_isa' || s.pot === 'cash_isa') ? 'ISA'
          : s.pot === 'gia' ? 'GIA'
          : s.pot === 'spend_clear_debt' ? 'Spend/Debt'
          : 'Cash';
        return `${potLabel} (${valStr})`;
      });
      return `Split: ${parts.join(', ')}`;
    }
    if (targetPot === 'stocks_and_shares_isa' || targetPot === 'cash_isa') return 'ISAs';
    if (targetPot === 'gia') return 'General Investment Account';
    if (targetPot === 'spend_clear_debt') return 'Spend / Clear Debt';
    if (targetPot === 'split') return 'Split Across Pots';
    return 'Cash Savings';
  };

  const primaryLsaLimit = getLsaLimit(profile);
  const partnerLsaLimit = getPartnerLsaLimit(profile);
  const primaryPclsAge = getLumpSumTakeAge(profile);
  const primaryPclsYear = (new Date().getFullYear()) + Math.max(0, primaryPclsAge - primaryCurrentAge);
  const isPhasedPrimary = profile.crystallisationMode === 'phased_tranches';

  let primaryEstPcls = 0;
  let primaryEstGross = 0;
  let primaryAlloc = { toIsa: 0, toGia: 0, toCashSavings: 0, toCashGia: 0, spentOrDebt: 0 };

  // 1. Phased Crystallisation Tranches (Split Pot Tracking)
  const activeTranchesPrimary = isPhasedPrimary
    ? (profile.crystallisationTranches || []).filter(t => t.enabled !== false && t.owner !== 'partner')
    : [];
  activeTranchesPrimary.forEach((t) => {
    const tAge = t.age || 57;
    const tYear = (new Date().getFullYear()) + Math.max(0, tAge - primaryCurrentAge);
    const tGross = t.amount || 0;
    const tPct = (t.pclsPercent ?? 25) / 100;
    const tPcls = Math.round(tGross * tPct);
    const tCrystDrawdown = Math.max(0, tGross - tPcls);
    const tDest = getPclsDestStr(t.targetPot as any, t.splits);
    const tAlloc = allocateLumpSumToPots(tPcls, t.targetPot as any, t.splits);

    primaryEstGross += tGross;
    primaryEstPcls += tPcls;
    primaryAlloc.toIsa += tAlloc.toIsa;
    primaryAlloc.toCashGia += tAlloc.toCashGia;
    primaryAlloc.spentOrDebt += tAlloc.spentOrDebt;

    wsPcls.addRow([
      'YOU',
      t.name || `Phased Crystallisation Tranche (Age ${tAge})`,
      tAge,
      tYear,
      tPct,
      'Phased Crystallisation (Split Pot)',
      primaryLsaLimit,
      tDest,
      tGross,
      tPcls,
      tAlloc.toIsa,
      tAlloc.toCashGia,
      tAlloc.spentOrDebt,
      `Split Pot: £${tPcls.toLocaleString()} PCLS + £${tCrystDrawdown.toLocaleString()} Crystallised Pot`,
    ]);
  });

  // If not phased, add Upfront PCLS if configured
  if (!isPhasedPrimary) {
    const primaryPclsPct = (profile.pclsLumpSumPercent ?? 25) / 100;
    const primaryTakeUpfront = profile.crystallisationMode === 'upfront' || (!profile.crystallisationMode && profile.takeLumpSumAtStart);
    const primaryPclsStrat = primaryTakeUpfront ? 'Take Upfront at Access Age' : 'Drip-Feed / UFPLS';
    const primaryPclsDestStr = getPclsDestStr(profile.lumpSumTargetPot, profile.lumpSumSplits);

    const primaryProj = projections.find((p) => p.age === primaryPclsAge);
    const primaryProjectedPension = primaryProj
      ? (primaryProj.primaryPensionPotBeforePcls ?? (primaryProj.primaryPensionPotBeforeAnnuity ?? primaryProj.primaryPensionPot))
      : getProjectedPensionAtTakeAge(profile, pots, primaryPclsAge, false);

    const maxPclsCalc = Math.min(primaryLsaLimit, Math.round(primaryProjectedPension * primaryPclsPct));
    primaryEstPcls = primaryTakeUpfront ? maxPclsCalc : 0;
    primaryEstGross = primaryTakeUpfront ? Math.min(primaryProjectedPension, maxPclsCalc / (primaryPclsPct || 0.25)) : 0;
    primaryAlloc = allocateLumpSumToPots(primaryEstPcls, profile.lumpSumTargetPot, profile.lumpSumSplits);

    const primaryProtAge = profile.protectedPensionAccessAge;
    const primaryNote = profile.lsaProtectionType && profile.lsaProtectionType !== 'standard'
      ? `LSA Protection: ${profile.lsaProtectionType} (£${primaryLsaLimit.toLocaleString()})`
      : primaryProtAge
      ? `Protected Access Age ${primaryProtAge} | Standard £268,275 LSA`
      : 'Standard UK £268,275 LSA Cap';

    wsPcls.addRow([
      'YOU',
      'Primary Tax-Free Cash (PCLS)',
      primaryPclsAge,
      primaryPclsYear,
      primaryPclsPct,
      primaryPclsStrat,
      primaryLsaLimit,
      primaryPclsDestStr,
      primaryEstGross,
      primaryEstPcls,
      primaryAlloc.toIsa,
      primaryAlloc.toCashGia,
      primaryAlloc.spentOrDebt,
      primaryNote,
    ]);
  }

  // Partner Tranches / Upfront PCLS
  let partnerEstGross = 0;
  let partnerEstPcls = 0;
  let partnerAlloc = { toIsa: 0, toGia: 0, toCashSavings: 0, toCashGia: 0, spentOrDebt: 0 };

  if (isCouple) {
    const partnerCurrentAge = profile.partnerCurrentAge || profile.currentAge || 50;
    const partnerAgeOffset = partnerCurrentAge - (profile.currentAge || 50);
    const isPhasedPartner = profile.partnerCrystallisationMode === 'phased_tranches';
    const partnerActiveTranches = isPhasedPartner
      ? (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter(t => t.enabled !== false && t.owner === 'partner')
      : [];

    partnerActiveTranches.forEach((t) => {
      const tAge = t.age || 57;
      const tYear = (new Date().getFullYear()) + Math.max(0, tAge - partnerCurrentAge);
      const tGross = t.amount || 0;
      const tPct = (t.pclsPercent ?? 25) / 100;
      const tPcls = Math.round(tGross * tPct);
      const tCrystDrawdown = Math.max(0, tGross - tPcls);
      const tDest = getPclsDestStr((t.targetPot || profile.partnerLumpSumTargetPot) as any, t.splits || profile.partnerLumpSumSplits);
      const tAlloc = allocateLumpSumToPots(tPcls, (t.targetPot || profile.partnerLumpSumTargetPot) as any, t.splits || profile.partnerLumpSumSplits);

      partnerEstGross += tGross;
      partnerEstPcls += tPcls;
      partnerAlloc.toIsa += tAlloc.toIsa;
      partnerAlloc.toCashGia += tAlloc.toCashGia;
      partnerAlloc.spentOrDebt += tAlloc.spentOrDebt;

      wsPcls.addRow([
        'PARTNER',
        t.name || `Partner Phased Crystallisation Tranche (Age ${tAge})`,
        tAge,
        tYear,
        tPct,
        'Phased Crystallisation (Split Pot)',
        partnerLsaLimit,
        tDest,
        tGross,
        tPcls,
        tAlloc.toIsa,
        tAlloc.toCashGia,
        tAlloc.spentOrDebt,
        `Split Pot: £${tPcls.toLocaleString()} PCLS + £${tCrystDrawdown.toLocaleString()} Crystallised Pot`,
      ]);
    });

    if (!isPhasedPartner) {
      const partnerPclsAge = getPartnerLumpSumTakeAge(profile);
      const partnerPclsYear = (new Date().getFullYear()) + Math.max(0, partnerPclsAge - partnerCurrentAge);
      const partnerPclsPct = (profile.partnerPclsLumpSumPercent ?? 25) / 100;
      const partnerTakeUpfront = profile.partnerCrystallisationMode === 'upfront' || (!profile.partnerCrystallisationMode && (profile.partnerTakeLumpSumAtStart ?? profile.takeLumpSumAtStart));
      const partnerPclsStrat = partnerTakeUpfront ? 'Take Upfront at Access Age' : 'Drip-Feed / UFPLS';
      const partnerPclsDestStr = getPclsDestStr(profile.partnerLumpSumTargetPot, profile.partnerLumpSumSplits);

      const partnerProj = projections.find((p) => (p.age + partnerAgeOffset) === partnerPclsAge);
      const partnerProjectedPension = partnerProj
        ? (partnerProj.partnerPensionPotBeforePcls ?? (partnerProj.partnerPensionPotBeforeAnnuity ?? partnerProj.partnerPensionPot))
        : getProjectedPensionAtTakeAge(profile, partnerPots, partnerPclsAge, true);

      const partnerMaxPcls = Math.min(partnerLsaLimit, Math.round(partnerProjectedPension * partnerPclsPct));
      partnerEstPcls = partnerTakeUpfront ? partnerMaxPcls : 0;
      partnerEstGross = partnerTakeUpfront ? Math.min(partnerProjectedPension, partnerMaxPcls / (partnerPclsPct || 0.25)) : 0;
      partnerAlloc = allocateLumpSumToPots(partnerEstPcls, profile.partnerLumpSumTargetPot, profile.partnerLumpSumSplits);

      const partnerProtAge = profile.partnerProtectedPensionAccessAge;
      const partnerNote = profile.partnerLsaProtectionType && profile.partnerLsaProtectionType !== 'standard'
        ? `LSA Protection: ${profile.partnerLsaProtectionType} (£${partnerLsaLimit.toLocaleString()})`
        : partnerProtAge
        ? `Protected Access Age ${partnerProtAge} | Standard £268,275 LSA`
        : 'Standard UK £268,275 LSA Cap';

      wsPcls.addRow([
        'PARTNER',
        'Partner Tax-Free Cash (PCLS)',
        partnerPclsAge,
        partnerPclsYear,
        partnerPclsPct,
        partnerPclsStrat,
        partnerLsaLimit,
        partnerPclsDestStr,
        partnerEstGross,
        partnerEstPcls,
        partnerAlloc.toIsa,
        partnerAlloc.toCashGia,
        partnerAlloc.spentOrDebt,
        partnerNote,
      ]);
    }
  }

  // Defined Benefit Pension Lump Sums (if configured in App Settings)
  let dbGrossTotal = 0;
  let dbLumpSumTotal = 0;
  let dbIsaTotal = 0;
  let dbCashTotal = 0;
  let dbDebtTotal = 0;

  (profile.dbPensions || []).forEach((db) => {
    if (db.enabled !== false && db.taxFreeLumpSum && db.taxFreeLumpSum > 0) {
      const isPartnerDb = db.owner === 'partner';
      if (isPartnerDb && !isCouple) return;

      const dbOwner = isPartnerDb ? 'PARTNER' : 'YOU';
      const dbOwnerCurrentAge = isPartnerDb ? (profile.partnerCurrentAge || profile.currentAge || 50) : (profile.currentAge || 50);
      const dbAge = db.startAge || 60;
      const dbYear = (new Date().getFullYear()) + Math.max(0, dbAge - dbOwnerCurrentAge);
      const dbLsa = isPartnerDb ? getPartnerLsaLimit(profile) : primaryLsaLimit;
      const dbDest = getPclsDestStr(db.targetPot as any);
      const dbAlloc = allocateLumpSumToPots(db.taxFreeLumpSum, db.targetPot as any, undefined);

      dbGrossTotal += db.taxFreeLumpSum;
      dbLumpSumTotal += db.taxFreeLumpSum;
      dbIsaTotal += dbAlloc.toIsa;
      dbCashTotal += dbAlloc.toCashGia;
      dbDebtTotal += dbAlloc.spentOrDebt;

      wsPcls.addRow([
        dbOwner,
        `${db.name || 'Defined Benefit Pension'} (DB Lump Sum)`,
        dbAge,
        dbYear,
        'N/A',
        'DB Scheme Lump Sum',
        dbLsa,
        dbDest,
        db.taxFreeLumpSum,
        db.taxFreeLumpSum,
        dbAlloc.toIsa,
        dbAlloc.toCashGia,
        dbAlloc.spentOrDebt,
        'Defined Benefit Commutation Tax-Free Lump Sum',
      ]);
    }
  });

  // Pre-fill extra empty template rows up to Row 20
  const currentPclsRows = wsPcls.lastRow!.number;
  for (let r = currentPclsRows + 1; r <= 20; r++) {
    wsPcls.addRow([
      'YOU',
      'Extra Scheme PCLS / Tranche (Optional)',
      57,
      2099,
      0.25,
      'Take Upfront at Access Age',
      268275,
      'Cash Savings',
      0,
      0,
      0,
      0,
      0,
      'User Added Custom Scheme',
    ]);
  }

  // Summary Total Row
  wsPcls.addRow([
    'TOTAL TAX-FREE LUMP SUMS & TRANCHES',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    { formula: 'SUM(I4:I20)', result: primaryEstGross + partnerEstGross + dbGrossTotal },
    { formula: 'SUM(J4:J20)', result: primaryEstPcls + partnerEstPcls + dbLumpSumTotal },
    { formula: 'SUM(K4:K20)', result: primaryAlloc.toIsa + partnerAlloc.toIsa + dbIsaTotal },
    { formula: 'SUM(L4:L20)', result: primaryAlloc.toCashGia + partnerAlloc.toCashGia + dbCashTotal },
    { formula: 'SUM(M4:M20)', result: primaryAlloc.spentOrDebt + partnerAlloc.spentOrDebt + dbDebtTotal },
    '',
  ]);
  const pclsTotRow = wsPcls.lastRow!;
  pclsTotRow.font = fontBold;

  for (let r = 4; r <= 21; r++) {
    const row = wsPcls.getRow(r);
    row.getCell(3).numFmt = '0';
    row.getCell(4).numFmt = '0';
    if (typeof row.getCell(5).value === 'number') {
      row.getCell(5).numFmt = '0.00%';
    }
    row.getCell(7).numFmt = '£#,##0';
    row.getCell(9).numFmt = '£#,##0';
    row.getCell(10).numFmt = '£#,##0';
    row.getCell(11).numFmt = '£#,##0';
    row.getCell(12).numFmt = '£#,##0';
    row.getCell(13).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }


  // ==========================================
  // SHEET 7: Annuity (Guaranteed Annuity Details)
  // ==========================================
  const wsAnnuity = workbook.addWorksheet('Annuity');
  wsAnnuity.columns = [
    { header: 'Owner', key: 'a', width: 14 },
    { header: 'Annuity Contract / Source', key: 'b', width: 34 },
    { header: 'Income Strategy Mode', key: 'c', width: 28 },
    { header: 'Target Purchase Age', key: 'd', width: 20 },
    { header: 'Execution Tax Year', key: 'e', width: 18 },
    { header: 'Allocation (%)', key: 'f', width: 18 },
    { header: 'Capital Allocated / Price (£)', key: 'g', width: 26 },
    { header: 'Annuity Rate (%)', key: 'h', width: 18 },
    { header: 'Initial Annual Income (£/yr)', key: 'i', width: 24 },
    { header: 'Annuity Type & Indexing', key: 'j', width: 34 },
    { header: 'Payment Term / Duration', key: 'k', width: 24 },
    { header: 'Excess Reinvestment', key: 'l', width: 22 },
    { header: 'Purchase Status', key: 'm', width: 28 },
  ];

  // Title Banner
  const annuityTitle = wsAnnuity.getRow(1);
  annuityTitle.height = 32;
  annuityTitle.getCell(1).value = `RETIREFREE UK - GUARANTEED ANNUITY PURCHASE & INCOME DETAILS`;
  annuityTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  annuityTitle.getCell(1).fill = blueFill;
  annuityTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsAnnuity.mergeCells('A1:M1');

  wsAnnuity.addRow([]); // Row 2 Blank

  // Section 1 Header: Configured Annuity Contracts
  wsAnnuity.addRow([
    'Owner',
    'Annuity Contract / Source',
    'Income Strategy Mode',
    'Target Purchase Age',
    'Execution Tax Year',
    'Allocation (%)',
    'Capital Allocated / Price (£)',
    'Annuity Rate (%)',
    'Initial Annual Income (£/yr)',
    'Annuity Type & Indexing',
    'Payment Term / Duration',
    'Excess Reinvestment',
    'Purchase Status',
  ]); // Row 3
  const annHeadRow = wsAnnuity.getRow(3);
  annHeadRow.height = 26;
  annHeadRow.eachCell((cell) => {
    cell.fill = blueFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Calculate Primary Annuity Parameters
  const primAnnuityAge = profile.annuityPurchaseAge || profile.targetRetirementAge || 65;
  const primExecYear = new Date().getFullYear() + Math.max(0, primAnnuityAge - profile.currentAge);
  const primOpt = profile.incomeProductOption || 'flexi_drawdown';
  const primIsAnnuity = primOpt === 'annuity' || primOpt === 'hybrid';
  const primAllocPct = primIsAnnuity ? (profile.annuityAllocationPercent || 50) / 100 : 0;
  const primRatePct = (profile.annuityRatePercent || 4.2) / 100;

  // Look for primary annuity purchase in projections
  const primPurchaseProj = projections.find(p => p.annuityPurchasedThisYear || (p.annuityCapitalAllocated && p.annuityCapitalAllocated > 0))
    || projections.find(p => (p.primaryAnnuityIncomeReceived || 0) > 0 || (p.annuityIncomeReceived || 0) > 0);
  const primCapAllocated = primPurchaseProj?.annuityCapitalAllocated
    || (primAllocPct > 0 ? Math.round(primaryPensionBal * primAllocPct) : 0);
  const primInitialIncome = Math.round(primCapAllocated * primRatePct);

  // Add Primary Annuity Row (Row 4)
  wsAnnuity.addRow([
    'YOU',
    'Primary Pension Guaranteed Annuity',
    primOpt === 'annuity' ? 'Full Guaranteed Annuity' : primOpt === 'hybrid' ? 'Hybrid Drawdown & Annuity' : 'Flexi-Drawdown (No Annuity)',
    primAnnuityAge,
    primExecYear,
    primAllocPct,
    primCapAllocated,
    primRatePct,
    { formula: 'G4*H4', result: primInitialIncome },
    getAnnuityTypeLabel(profile.annuityType),
    profile.annuityDurationOption === 'until_age' ? `Fixed Term (Until Age ${profile.annuityDurationUntilAge || 75})` : 'Lifetime Guaranteed',
    profile.annuityExcessReinvestOption === 'cash' ? 'Cash & Savings' : profile.annuityExcessReinvestOption === 'none' ? 'Spend / General Income' : 'ISA Pot',
    primIsAnnuity ? 'Purchased / Active' : 'Not Purchased (Flexi-Drawdown)',
  ]);

  let lastSummaryRow = 4;

  // Add Partner Annuity Row if couple (Row 5)
  if (isCouple) {
    const partOpt = profile.partnerIncomeProductOption || profile.incomeProductOption || 'flexi_drawdown';
    const partAnnuityAge = profile.partnerAnnuityPurchaseAge || profile.partnerTargetRetirementAge || profile.targetRetirementAge || 65;
    const partExecYear = new Date().getFullYear() + Math.max(0, partAnnuityAge - (profile.partnerCurrentAge || profile.currentAge));
    const partIsAnnuity = partOpt === 'annuity' || partOpt === 'hybrid';
    const partAllocPct = partIsAnnuity ? (profile.partnerAnnuityAllocationPercent || profile.annuityAllocationPercent || 50) / 100 : 0;
    const partRatePct = (profile.partnerAnnuityRatePercent || profile.annuityRatePercent || 4.2) / 100;
    const partCapAllocated = partAllocPct > 0 && partnerPensionBal > 0 ? Math.round(partnerPensionBal * partAllocPct) : 0;
    const partInitialIncome = Math.round(partCapAllocated * partRatePct);

    lastSummaryRow++;
    wsAnnuity.addRow([
      'PARTNER',
      'Partner Pension Guaranteed Annuity',
      partOpt === 'annuity' ? 'Full Guaranteed Annuity' : partOpt === 'hybrid' ? 'Hybrid Drawdown & Annuity' : 'Flexi-Drawdown (No Annuity)',
      partAnnuityAge,
      partExecYear,
      partAllocPct,
      partCapAllocated,
      partRatePct,
      { formula: `G${lastSummaryRow}*H${lastSummaryRow}`, result: partInitialIncome },
      getAnnuityTypeLabel(profile.partnerAnnuityType || profile.annuityType),
      profile.partnerAnnuityDurationOption === 'until_age' ? `Fixed Term (Until Age ${profile.partnerAnnuityDurationUntilAge || 75})` : 'Lifetime Guaranteed',
      'ISA Pot',
      partIsAnnuity ? 'Purchased / Active' : 'Not Purchased (Flexi-Drawdown)',
    ]);
  }

  // Add Custom Tranches if defined
  const activeTranches = (profile.annuityTranches || []).filter(t => t.enabled !== false);
  activeTranches.forEach((t) => {
    lastSummaryRow++;
    const tOwner = t.owner === 'partner' ? 'PARTNER' : 'YOU';
    const tAge = t.purchaseAge || 65;
    const tYear = new Date().getFullYear() + Math.max(0, tAge - (t.owner === 'partner' ? (profile.partnerCurrentAge || profile.currentAge) : profile.currentAge));
    const tAllocPct = (t.allocationPercent || 50) / 100;
    const tOwnerPot = t.owner === 'partner' ? partnerPensionBal : primaryPensionBal;
    const tAmount = Math.round(tOwnerPot * tAllocPct);
    const tRatePct = (t.annuityRatePercent || 4.2) / 100;
    const tIncome = Math.round(tAmount * tRatePct);

    wsAnnuity.addRow([
      tOwner,
      t.name || `Custom Annuity Tranche (${tOwner})`,
      'Hybrid Tranche Purchase',
      tAge,
      tYear,
      tAllocPct,
      tAmount,
      tRatePct,
      { formula: `G${lastSummaryRow}*H${lastSummaryRow}`, result: tIncome },
      getAnnuityTypeLabel(t.annuityType || profile.annuityType),
      'Lifetime Guaranteed',
      'ISA Pot',
      'Purchased / Active',
    ]);
  });

  let sec1LastDataRow = lastSummaryRow;

  // Check if any annuity was purchased or active
  const hasAnnuityPurchased = primIsAnnuity || (isCouple && (profile.partnerIncomeProductOption === 'annuity' || profile.partnerIncomeProductOption === 'hybrid')) || activeTranches.length > 0 || projections.some(p => (p.annuityIncomeReceived || 0) > 0 || (p.annuityCapitalAllocated || 0) > 0);

  if (!hasAnnuityPurchased) {
    lastSummaryRow++;
    wsAnnuity.addRow([
      'NOTICE:',
      'No guaranteed annuity purchase has been selected for this retirement plan. 100% of pension funds are managed via flexible drawdown.',
      '', '', '', '', '', '', '', '', '', '', ''
    ]);
    const noticeRow = wsAnnuity.getRow(lastSummaryRow);
    noticeRow.font = { name: 'Calibri', size: 11, italic: true, bold: true, color: { argb: 'FF475569' } };
    wsAnnuity.mergeCells(`B${lastSummaryRow}:M${lastSummaryRow}`);
    sec1LastDataRow = lastSummaryRow;
  }

  // Format Section 1 rows
  for (let r = 4; r <= lastSummaryRow; r++) {
    const row = wsAnnuity.getRow(r);
    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '0';
    row.getCell(6).numFmt = '0.00%';
    row.getCell(7).numFmt = '£#,##0';
    row.getCell(8).numFmt = '0.00%';
    row.getCell(9).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });
  }

  lastSummaryRow += 2; // Spacing before Section 2

  // Section 2: Year-by-Year Annuity Income & Capital Allocation Timeline
  wsAnnuity.addRow([
    'ANNUAL ANNUITY INCOME & CAPITAL ALLOCATION TIMELINE',
    '', '', '', '', '', '', '', '', '', '', '', ''
  ]); // Header row
  const section2TitleRow = wsAnnuity.getRow(lastSummaryRow);
  section2TitleRow.height = 26;
  section2TitleRow.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  wsAnnuity.mergeCells(`A${lastSummaryRow}:M${lastSummaryRow}`);

  lastSummaryRow++;
  wsAnnuity.addRow([
    'Tax Year',
    'Age YOU',
    'Age PARTNER',
    'Annuity Event / Status',
    'Primary Annuity Income (£/yr)',
    'Partner Annuity Income (£/yr)',
    'Total Annual Annuity Income (£/yr)',
    'Capital Allocated in Year (£)',
    'Cumulative Capital Converted (£)',
    'Reinvestment Notes',
    '', '', ''
  ]); // Section 2 Table Header
  const s2HeadRow = wsAnnuity.getRow(lastSummaryRow);
  s2HeadRow.height = 24;
  s2HeadRow.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const timelineStartRow = lastSummaryRow + 1;
  let currentTimelineRow = timelineStartRow;
  let cumCapAllocated = 0;

  for (let idx = 0; idx < projectYears; idx++) {
    const p = projections[idx];
    const yearVal = new Date().getFullYear() + idx;
    const ageYouVal = profile.currentAge + idx;
    const agePartnerVal = isCouple ? ((profile.partnerCurrentAge || profile.currentAge) + idx) : 'N/A';

    const capAllocatedVal = p?.annuityCapitalAllocated || 0;
    const primIncVal = p?.primaryAnnuityIncomeReceived || (!isCouple ? (p?.annuityIncomeReceived || 0) : 0);
    const partIncVal = p?.partnerAnnuityIncomeReceived || 0;
    const totalIncVal = p?.annuityIncomeReceived || (primIncVal + partIncVal);
    
    cumCapAllocated += capAllocatedVal;

    let eventStatusStr = 'No Annuity Income';
    if (capAllocatedVal > 0) {
      eventStatusStr = `Annuity Purchased (£${capAllocatedVal.toLocaleString()})`;
    } else if (totalIncVal > 0) {
      eventStatusStr = 'Active Guaranteed Income';
    }

    let notesStr = 'N/A';
    if (totalIncVal > 0) {
      notesStr = profile.annuityExcessReinvestOption === 'cash' ? 'Reinvested to Cash' : profile.annuityExcessReinvestOption === 'none' ? 'General Lifestyle Income' : 'Reinvested to ISA';
    }

    const rowNum = currentTimelineRow;
    const primIncFormula = `SUMPRODUCT((I$4:I$${sec1LastDataRow}) * (A$4:A$${sec1LastDataRow}="YOU") * (D$4:D$${sec1LastDataRow}<=B${rowNum}) * IF(ISNUMBER(SEARCH("Inflation", J$4:J$${sec1LastDataRow})), (1+'Settings'!$B$11)^${idx}, 1))`;
    const partIncFormula = isCouple ? `SUMPRODUCT((I$4:I$${sec1LastDataRow}) * (A$4:A$${sec1LastDataRow}="PARTNER") * (D$4:D$${sec1LastDataRow}<=C${rowNum}) * IF(ISNUMBER(SEARCH("Inflation", J$4:J$${sec1LastDataRow})), (1+'Settings'!$B$11)^${idx}, 1))` : '0';
    const capAllocatedFormula = `SUMIFS(G$4:G$${sec1LastDataRow}, E$4:E$${sec1LastDataRow}, A${rowNum})`;

    wsAnnuity.addRow([
      yearVal,
      ageYouVal,
      agePartnerVal,
      eventStatusStr,
      { formula: primIncFormula, result: primIncVal },
      { formula: partIncFormula, result: partIncVal },
      { formula: `E${rowNum}+F${rowNum}`, result: totalIncVal },
      { formula: capAllocatedFormula, result: capAllocatedVal },
      { formula: `SUM(H$${timelineStartRow}:H${rowNum})`, result: cumCapAllocated },
      notesStr,
      '', '', ''
    ]);

    const row = wsAnnuity.getRow(rowNum);
    row.getCell(1).numFmt = '0';
    row.getCell(2).numFmt = '0';
    if (isCouple) row.getCell(3).numFmt = '0';
    row.getCell(5).numFmt = '£#,##0';
    row.getCell(6).numFmt = '£#,##0';
    row.getCell(7).numFmt = '£#,##0';
    row.getCell(8).numFmt = '£#,##0';
    row.getCell(9).numFmt = '£#,##0';
    row.eachCell((cell) => { cell.border = borderThin; });

    currentTimelineRow++;
  }

  // Total Summary Row for Timeline
  const timelineEndRow = currentTimelineRow - 1;
  wsAnnuity.addRow([
    'TOTAL CUMULATIVE ANNUITY INCOME',
    '', '', '',
    { formula: `SUM(E${timelineStartRow}:E${timelineEndRow})` },
    { formula: `SUM(F${timelineStartRow}:F${timelineEndRow})` },
    { formula: `SUM(G${timelineStartRow}:G${timelineEndRow})` },
    { formula: `SUM(H${timelineStartRow}:H${timelineEndRow})` },
    '', '', '', '', ''
  ]);
  const totTimelineRow = wsAnnuity.getRow(currentTimelineRow);
  totTimelineRow.font = fontBold;
  totTimelineRow.getCell(5).numFmt = '£#,##0';
  totTimelineRow.getCell(6).numFmt = '£#,##0';
  totTimelineRow.getCell(7).numFmt = '£#,##0';
  totTimelineRow.getCell(8).numFmt = '£#,##0';
  totTimelineRow.eachCell((cell) => { cell.border = borderThin; });


  // ==========================================
  // SHEET 8: Income Requirements (Spending Targets)
  // ==========================================
  const wsPhased = workbook.addWorksheet('Income Requirements');
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
  phasedTitle.getCell(1).value = `RETIREFREE UK - INCOME REQUIREMENTS & SPENDING TARGETS`;
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

  // Helper to extract active phased income spending targets
  const phasedRanges = (() => {
    const retAge = profile.targetRetirementAge || 60;
    const baseTarget = profile.targetRetirementIncomeAnnual || 35000;

    if (profile.maximizedSpendConfig?.enabled) {
      const maxConfig = profile.maximizedSpendConfig;
      const phases = maxConfig.spendingPhases;
      if (phases?.enabled) {
        if (phases.customRanges && phases.customRanges.length > 0) {
          return phases.customRanges.map((r, i) => ({
            name: r.name || `Phase ${i + 1}`,
            startAge: r.startAge ?? retAge,
            endAge: r.endAge ?? 120,
            incomeAnnual: r.annualTargetIncome ?? baseTarget,
            notes: r.description || 'Maximized Spend Custom Phase',
          }));
        }
        if (phases.goGoEndAge !== undefined && phases.goGoIncomeAnnual !== undefined) {
          const goGoEnd = phases.goGoEndAge || 74;
          const slowGoEnd = phases.slowGoEndAge || 84;
          return [
            { name: 'GO-GO Phase (Active Lifestyle)', startAge: retAge, endAge: goGoEnd, incomeAnnual: phases.goGoIncomeAnnual ?? baseTarget, notes: 'Primary Active Retirement Spending' },
            { name: 'Slow-GO Phase (Moderate Lifestyle)', startAge: goGoEnd + 1, endAge: slowGoEnd, incomeAnnual: phases.slowGoIncomeAnnual ?? baseTarget, notes: 'Mid-Retirement Travel & Leisure' },
            { name: 'No-GO Phase (Passive / Care)', startAge: slowGoEnd + 1, endAge: 120, incomeAnnual: phases.noGoIncomeAnnual ?? baseTarget, notes: 'Late Retirement / Essential Care' },
          ];
        }
      }
      const maxTarget = maxConfig.targetAnnualIncome || baseTarget;
      return [
        { name: 'Maximized Target Income', startAge: retAge, endAge: 120, incomeAnnual: maxTarget, notes: 'Flat Target Income Requirement' },
      ];
    }

    const sp = profile.spendingPhases;
    if (sp?.enabled) {
      if (sp.customRanges && sp.customRanges.length > 0) {
        return sp.customRanges.map((r, i) => ({
          name: r.name || `Phase ${i + 1}`,
          startAge: r.startAge ?? retAge,
          endAge: r.endAge ?? 120,
          incomeAnnual: r.annualTargetIncome ?? baseTarget,
          notes: r.description || 'Custom Spending Phase',
        }));
      }
      if (sp.goGoEndAge !== undefined && sp.goGoIncomeAnnual !== undefined) {
        const goGoEnd = sp.goGoEndAge || 74;
        const slowGoEnd = sp.slowGoEndAge || 84;
        return [
          { name: 'GO-GO Phase (Active Lifestyle)', startAge: retAge, endAge: goGoEnd, incomeAnnual: sp.goGoIncomeAnnual, notes: 'Primary Active Retirement Spending' },
          { name: 'Slow-GO Phase (Moderate Lifestyle)', startAge: goGoEnd + 1, endAge: slowGoEnd, incomeAnnual: sp.slowGoIncomeAnnual ?? baseTarget, notes: 'Mid-Retirement Travel & Leisure' },
          { name: 'No-GO Phase (Passive / Care)', startAge: slowGoEnd + 1, endAge: 120, incomeAnnual: sp.noGoIncomeAnnual ?? baseTarget, notes: 'Late Retirement / Essential Care' },
        ];
      }
    }

    if (sp?.customRanges && sp.customRanges.length > 0) {
      return sp.customRanges.map((r, i) => ({
        name: r.name || `Phase ${i + 1}`,
        startAge: r.startAge ?? retAge,
        endAge: r.endAge ?? 120,
        incomeAnnual: r.annualTargetIncome ?? baseTarget,
        notes: r.description || 'Custom Spending Phase',
      }));
    }

    return [
      { name: 'Target Retirement Income', startAge: retAge, endAge: 120, incomeAnnual: baseTarget, notes: 'Flat Net Annual Target Income' },
    ];
  })();

  phasedRanges.forEach((r) => {
    wsPhased.addRow([r.name, r.startAge, r.endAge, r.incomeAnnual, r.notes]);
  });

  const curPhasedRows = wsPhased.lastRow!.number;
  for (let r = curPhasedRows + 1; r <= 20; r++) {
    wsPhased.addRow([`Additional Phase ${r - 3} (Optional)`, 999, 999, 0, 'User Added Custom Phase']);
  }

  for (let r = 4; r <= 20; r++) {
    const row = wsPhased.getRow(r);
    row.getCell(2).numFmt = '0';
    row.getCell(3).numFmt = '0';
    row.getCell(4).numFmt = '£#,##0';
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

  const netCapitalInflowsList: number[] = [];

  for (let idx = 0; idx < projectYears; idx++) {
    const contribRowNum = idx + 15;
    const schedRowNum = idx + 3;

    const cYear = `='Ledger'!A${schedRowNum}`;
    const cAgeYou = `='Ledger'!B${schedRowNum}`;
    const cAgePartner = `='Ledger'!C${schedRowNum}`;
    const cStatus = `='Ledger'!D${schedRowNum}`;

    const calYear = (new Date().getFullYear()) + idx;
    const curAgeYouVal = primaryCurrentAge + idx;
    const curAgePartnerVal = partnerCurrentAge + idx;

    // Contributions formulas checking Start Age & End Age from Regular Contributions Sheet
    const cWorkplaceYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="Workplace Pension") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cSippYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="SIPP / Private Pension") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cDcPensionYou = `E${contribRowNum}+F${contribRowNum}`;

    const cSnsIsaYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="Stocks & Shares ISA") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cCashIsaYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="Cash ISA") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cLisaYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="Lifetime ISA (LISA)") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30) * (B${contribRowNum}<50))`;
    const cTotalIsaYou = `H${contribRowNum}+I${contribRowNum}+J${contribRowNum}`;

    const cGiaYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="General Investment Account (GIA)") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cCashSavingsYou = `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="YOU") * ('Regular Contributions'!$C$14:$C$30="Cash Savings") * (B${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (B${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`;
    const cTotalCashGiaYou = `L${contribRowNum}+M${contribRowNum}`;

    const cTotalYouAnnual = `G${contribRowNum}+K${contribRowNum}+N${contribRowNum}`;

    // Partner Contributions
    const cWorkplacePartner = isCouple
      ? `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="PARTNER") * ('Regular Contributions'!$C$14:$C$30="Workplace Pension") * (C${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (C${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`
      : '0';
    const cSippPartner = isCouple
      ? `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="PARTNER") * ('Regular Contributions'!$C$14:$C$30="SIPP / Private Pension") * (C${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (C${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`
      : '0';
    const cDcPensionPartner = `P${contribRowNum}+Q${contribRowNum}`;
    const cTotalIsaPartner = isCouple
      ? `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="PARTNER") * (('Regular Contributions'!$C$14:$C$30="Stocks & Shares ISA") + ('Regular Contributions'!$C$14:$C$30="Cash ISA") + ('Regular Contributions'!$C$14:$C$30="Lifetime ISA (LISA)")) * (C${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (C${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`
      : '0';
    const cTotalCashGiaPartner = isCouple
      ? `SUMPRODUCT(('Regular Contributions'!$G$14:$G$30) * ('Regular Contributions'!$B$14:$B$30="PARTNER") * (('Regular Contributions'!$C$14:$C$30="General Investment Account (GIA)") + ('Regular Contributions'!$C$14:$C$30="Cash Savings")) * (C${contribRowNum}>='Regular Contributions'!$D$14:$D$30) * (C${contribRowNum}<='Regular Contributions'!$E$14:$E$30))`
      : '0';
    const cTotalPartnerAnnual = `R${contribRowNum}+S${contribRowNum}+T${contribRowNum}`;

    const cHouseholdRegular = `O${contribRowNum}+U${contribRowNum}`;

    // Capital Flow Summaries from One-Offs and Pot Transfers
    const cOneOffInflow = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$D$4:$D$50, A${contribRowNum})`;
    const cTransferOutflow = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$D$4:$D$50, A${contribRowNum})`;
    const cTransferInflow = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$D$4:$D$50, A${contribRowNum})`;
    const cNetCapitalInflow = `V${contribRowNum}+W${contribRowNum}-X${contribRowNum}+Y${contribRowNum}`;

    // Compute exact dynamic results for this year:
    const resWorkplaceYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'Workplace Pension' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resSippYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'SIPP / Private Pension' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resDcPensionYou = resWorkplaceYou + resSippYou;

    const resSnsIsaYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'Stocks & Shares ISA' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resCashIsaYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'Cash ISA' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resLisaYou = curAgeYouVal < 50 ? regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'Lifetime ISA (LISA)' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0) : 0;
    const resTotalIsaYou = resSnsIsaYou + resCashIsaYou + resLisaYou;

    const resGiaYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'General Investment Account (GIA)' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resCashSavingsYou = regRows.filter((r) => r.ownerStr === 'YOU' && r.potLabel === 'Cash Savings' && curAgeYouVal >= r.startAge && curAgeYouVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0);
    const resTotalCashGiaYou = resGiaYou + resCashSavingsYou;

    const resTotalYouAnnual = resDcPensionYou + resTotalIsaYou + resTotalCashGiaYou;

    const resWorkplacePartner = isCouple ? regRows.filter((r) => r.ownerStr === 'PARTNER' && r.potLabel === 'Workplace Pension' && curAgePartnerVal >= r.startAge && curAgePartnerVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0) : 0;
    const resSippPartner = isCouple ? regRows.filter((r) => r.ownerStr === 'PARTNER' && r.potLabel === 'SIPP / Private Pension' && curAgePartnerVal >= r.startAge && curAgePartnerVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0) : 0;
    const resDcPensionPartner = resWorkplacePartner + resSippPartner;

    const resTotalIsaPartner = isCouple ? regRows.filter((r) => r.ownerStr === 'PARTNER' && ['Stocks & Shares ISA', 'Cash ISA', 'Lifetime ISA (LISA)'].includes(r.potLabel) && curAgePartnerVal >= r.startAge && curAgePartnerVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0) : 0;
    const resTotalCashGiaPartner = isCouple ? regRows.filter((r) => r.ownerStr === 'PARTNER' && ['General Investment Account (GIA)', 'Cash Savings'].includes(r.potLabel) && curAgePartnerVal >= r.startAge && curAgePartnerVal <= r.endAge).reduce((s, r) => s + r.annualAmt, 0) : 0;
    const resTotalPartnerAnnual = resDcPensionPartner + resTotalIsaPartner + resTotalCashGiaPartner;

    const resHouseholdRegular = resTotalYouAnnual + resTotalPartnerAnnual;

    const yearOneOffs = activeOneOffs.filter((c) => getContributionYear(c, primaryCurrentAge) === calYear);
    const resOneOffInflow = yearOneOffs.reduce((sum, c) => {
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
      return sum + outOfPocket + relief;
    }, 0);

    const yearTransfers = activeTransfers.filter((t) => getTransferYear(t, primaryCurrentAge) === calYear);
    const resTransferOutflow = yearTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const resTransferInflow = yearTransfers.reduce((sum, t) => {
      const amt = t.amount || 0;
      const relief = (t.destinationPot === 'sipp' && t.sourcePot !== 'sipp' && t.sourcePot !== 'workplace_pension') ? Math.round(amt * 0.25) : 0;
      return sum + amt + relief;
    }, 0);

    const resNetCapitalInflow = resHouseholdRegular + resOneOffInflow - resTransferOutflow + resTransferInflow;
    netCapitalInflowsList.push(resNetCapitalInflow);

    wsContrib.addRow([
      { formula: cYear, result: calYear },
      { formula: cAgeYou, result: curAgeYouVal },
      { formula: cAgePartner, result: isCouple ? curAgePartnerVal : 0 },
      { formula: cStatus, result: curAgeYouVal < (profile.targetRetirementAge || 55) ? 'Accumulation' : 'Retirement' },
      { formula: cWorkplaceYou, result: resWorkplaceYou },
      { formula: cSippYou, result: resSippYou },
      { formula: cDcPensionYou, result: resDcPensionYou },
      { formula: cSnsIsaYou, result: resSnsIsaYou },
      { formula: cCashIsaYou, result: resCashIsaYou },
      { formula: cLisaYou, result: resLisaYou },
      { formula: cTotalIsaYou, result: resTotalIsaYou },
      { formula: cGiaYou, result: resGiaYou },
      { formula: cCashSavingsYou, result: resCashSavingsYou },
      { formula: cTotalCashGiaYou, result: resTotalCashGiaYou },
      { formula: cTotalYouAnnual, result: resTotalYouAnnual },
      { formula: cWorkplacePartner, result: resWorkplacePartner },
      { formula: cSippPartner, result: resSippPartner },
      { formula: cDcPensionPartner, result: resDcPensionPartner },
      { formula: cTotalIsaPartner, result: resTotalIsaPartner },
      { formula: cTotalCashGiaPartner, result: resTotalCashGiaPartner },
      { formula: cTotalPartnerAnnual, result: resTotalPartnerAnnual },
      { formula: cHouseholdRegular, result: resHouseholdRegular },
      { formula: cOneOffInflow, result: resOneOffInflow },
      { formula: cTransferOutflow, result: resTransferOutflow },
      { formula: cTransferInflow, result: resTransferInflow },
      { formula: cNetCapitalInflow, result: resNetCapitalInflow },
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
  // SHEET 8: Ledger (Master Projections Table with Split Pot Tracking)
  // ==========================================
  const wsSched = workbook.addWorksheet('Ledger');

  // Title Banner
  const schedTitle = wsSched.getRow(1);
  schedTitle.height = 32;
  schedTitle.getCell(1).value = `RETIREFREE UK - MASTER PROJECTION LEDGER (SPLIT POT TRACKING)`;
  schedTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  schedTitle.getCell(1).fill = darkSlateFill;
  schedTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  wsSched.mergeCells('A1:AJ1');

  const headers = [
    'Year',
    'Age YOU',
    'Age PARTNER',
    'Status',
    'Annual Contributions (£)',
    'Target Requirement (£)',
    'State Pension YOU (£)',
    'State Pension PARTNER (£)',
    'DB & Fixed Income YOU (£)',
    'DB & Fixed Income PARTNER (£)',
    'Crystallised Tranche YOU (£)',
    'Crystallised Tranche PARTNER (£)',
    'PCLS Tax-Free Cash YOU (£)',
    'PCLS Tax-Free Cash PARTNER (£)',
    'Taxable Pension Drawdown YOU (£)',
    'Taxable Pension Drawdown PARTNER (£)',
    'Total Taxable Income YOU (£)',
    'Total Taxable Income PARTNER (£)',
    'UK Tax Paid YOU (£)',
    'UK Tax Paid PARTNER (£)',
    'Net Income Received YOU (£)',
    'Net Income Received PARTNER (£)',
    'Household Net Income (£)',
    'DC Uncrystallised Pot YOU (£)',
    'DC Crystallised Drawdown Pot YOU (£)',
    'DC Total Pension Pot YOU (£)',
    'ISA Balance YOU (£)',
    'Cash & GIA Balance YOU (£)',
    'Total Portfolio Wealth YOU (£)',
    'DC Uncrystallised Pot PARTNER (£)',
    'DC Crystallised Drawdown Pot PARTNER (£)',
    'DC Total Pension Pot PARTNER (£)',
    'ISA Balance PARTNER (£)',
    'Cash & GIA Balance PARTNER (£)',
    'Total Portfolio Wealth PARTNER (£)',
    'Household Total Wealth (£)',
  ];

  wsSched.addRow(headers); // Row 2
  const sHeaderRow = wsSched.getRow(2);
  sHeaderRow.height = 26;
  sHeaderRow.eachCell((cell) => {
    cell.fill = darkSlateFill;
    cell.font = fontWhiteBold;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsSched.columns = headers.map(h => ({ width: Math.max(12, h.length + 2) }));
  wsSched.columns[0].width = 10; // Year
  wsSched.columns[1].width = 12; // Age YOU
  wsSched.columns[2].width = 14; // Age PARTNER
  wsSched.columns[3].width = 16; // Status

  const initPensionYou = primaryPensionBal;
  const initIsaYou = primaryIsaBal;
  const initCashYou = primaryCashBal;

  const initPensionPartner = partnerPensionBal;
  const initIsaPartner = partnerIsaBal;
  const initCashPartner = partnerCashBal;

  for (let idx = 0; idx < projectYears; idx++) {
    const rowNum = idx + 3; 
    const prevRowNum = rowNum - 1;
    const contribRowNum = idx + 15; 

    const yearFormula = `'Settings'!$B$4 + ${idx}`;
    const ageYouFormula = `'Inputs & Setup'!$B$4 + ${idx}`;
    const agePartnerFormula = `'Inputs & Setup'!$C$4 + ${idx}`;

    const statusFormula = isCouple
      ? `IF(AND(B${rowNum}>='Inputs & Setup'!$B$6, C${rowNum}>='Inputs & Setup'!$C$6), "Retirement", IF(OR(B${rowNum}>='Inputs & Setup'!$B$6, C${rowNum}>='Inputs & Setup'!$C$6), "Partial Retirement", "Accumulation"))`
      : `IF(B${rowNum}<'Inputs & Setup'!$B$6, "Accumulation", "Retirement")`;

    const annualContribFormula = `'Contributions'!V${contribRowNum} + 'Contributions'!W${contribRowNum} - 'Contributions'!X${contribRowNum} + 'Contributions'!Y${contribRowNum}`;

    const targetReqFormula = `IF(D${rowNum}="Accumulation", 0, IF(SUMPRODUCT(('Income Requirements'!$D$4:$D$20) * (B${rowNum}>='Income Requirements'!$B$4:$B$20) * (B${rowNum}<='Income Requirements'!$C$4:$C$20)) > 0, SUMPRODUCT(('Income Requirements'!$D$4:$D$20) * (B${rowNum}>='Income Requirements'!$B$4:$B$20) * (B${rowNum}<='Income Requirements'!$C$4:$C$20)), 'Income Requirements'!$D$4) * ((1 + 'Settings'!$B$11)^(${idx})))`;

    const stateYouFormula = `IF(B${rowNum}>='Inputs & Setup'!$B$7, 'Inputs & Setup'!$B$8 * ((1 + 'Settings'!$B$15)^(${idx})), 0)`;
    const statePartnerFormula = isCouple
      ? `IF(C${rowNum}>='Inputs & Setup'!$C$7, 'Inputs & Setup'!$C$8 * ((1 + 'Settings'!$B$15)^(${idx})), 0)`
      : '0';

    const dbYouFormula = `SUMPRODUCT(('Fixed Income'!$E$4:$E$25) * ('Fixed Income'!$B$4:$B$25="YOU") * (B${rowNum}>='Fixed Income'!$C$4:$C$25) * (B${rowNum}<='Fixed Income'!$D$4:$D$25) * IF('Fixed Income'!$F$4:$F$25="CPI Indexed", (1+'Settings'!$B$11)^${idx}, 1))`;
    const dbPartnerFormula = isCouple ? `SUMPRODUCT(('Fixed Income'!$E$4:$E$25) * ('Fixed Income'!$B$4:$B$25="PARTNER") * (C${rowNum}>='Fixed Income'!$C$4:$C$25) * (C${rowNum}<='Fixed Income'!$D$4:$D$25) * IF('Fixed Income'!$F$4:$F$25="CPI Indexed", (1+'Settings'!$B$11)^${idx}, 1))` : '0';

    // Previous Pot Balances
    const prevUncrystYouRef = idx === 0 ? initPensionYou : `X${prevRowNum}`;
    const prevCrystYouRef = idx === 0 ? 0 : `Y${prevRowNum}`;
    const prevIsaYouRef = idx === 0 ? initIsaYou : `AA${prevRowNum}`;
    const prevCashYouRef = idx === 0 ? initCashYou : `AB${prevRowNum}`;

    const prevUncrystPartnerRef = idx === 0 ? initPensionPartner : `AD${prevRowNum}`;
    const prevCrystPartnerRef = idx === 0 ? 0 : `AE${prevRowNum}`;
    const prevIsaPartnerRef = idx === 0 ? initIsaPartner : `AG${prevRowNum}`;
    const prevCashPartnerRef = idx === 0 ? initCashPartner : `AH${prevRowNum}`;

    // Crystallised Tranches & PCLS Cash (Looked up from Sheet 6)
    const crystTrancheYouFormula = `SUMIFS('Tax Free Lump Sums'!$I$4:$I$25, 'Tax Free Lump Sums'!$A$4:$A$25, "YOU", 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum})`;
    const crystTranchePartnerFormula = isCouple ? `SUMIFS('Tax Free Lump Sums'!$I$4:$I$25, 'Tax Free Lump Sums'!$A$4:$A$25, "PARTNER", 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum})` : '0';

    const pclsCashYouFormula = `SUMIFS('Tax Free Lump Sums'!$J$4:$J$25, 'Tax Free Lump Sums'!$A$4:$A$25, "YOU", 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum})`;
    const pclsCashPartnerFormula = isCouple ? `SUMIFS('Tax Free Lump Sums'!$J$4:$J$25, 'Tax Free Lump Sums'!$A$4:$A$25, "PARTNER", 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum})` : '0';

    const strategy = profile.drawdownStrategy || 'isa_first';
    
    // Taxable Drawdown from Pension / Crystallised Drawdown Pot (Col O & P)
    // When filling a tax band (tax-free, basic, higher), accesses up to the band ceiling ('Settings'!$B$5, $B$6, $B$7) minus taxable fixed income (State Pension & DB pensions)
    let taxableDrawdownYouFormula = '';
    if (strategy === 'basic_rate_bracket') {
      taxableDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystYouRef} + (K${rowNum} - M${rowNum}) + (${prevUncrystYouRef} * 0.75)), MAX(0, 'Settings'!$B$6 - (G${rowNum} + I${rowNum}))))`;
    } else if (strategy === 'tax_free_bracket') {
      taxableDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystYouRef} + (K${rowNum} - M${rowNum}) + (${prevUncrystYouRef} * 0.75)), MAX(0, 'Settings'!$B$5 - (G${rowNum} + I${rowNum}))))`;
    } else if (strategy === 'higher_rate_bracket') {
      taxableDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystYouRef} + (K${rowNum} - M${rowNum}) + (${prevUncrystYouRef} * 0.75)), MAX(0, 'Settings'!$B$7 - (G${rowNum} + I${rowNum}))))`;
    } else {
      taxableDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystYouRef} + (K${rowNum} - M${rowNum}) + (${prevUncrystYouRef} * 0.75)), MAX(0, F${rowNum} - (G${rowNum} + I${rowNum} + M${rowNum})) / 0.8))`;
    }

    let taxableDrawdownPartnerFormula = '0';
    if (isCouple) {
      if (strategy === 'basic_rate_bracket') {
        taxableDrawdownPartnerFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystPartnerRef} + (L${rowNum} - N${rowNum}) + (${prevUncrystPartnerRef} * 0.75)), MAX(0, 'Settings'!$B$6 - (H${rowNum} + J${rowNum}))))`;
      } else if (strategy === 'tax_free_bracket') {
        taxableDrawdownPartnerFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystPartnerRef} + (L${rowNum} - N${rowNum}) + (${prevUncrystPartnerRef} * 0.75)), MAX(0, 'Settings'!$B$5 - (H${rowNum} + J${rowNum}))))`;
      } else if (strategy === 'higher_rate_bracket') {
        taxableDrawdownPartnerFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystPartnerRef} + (L${rowNum} - N${rowNum}) + (${prevUncrystPartnerRef} * 0.75)), MAX(0, 'Settings'!$B$7 - (H${rowNum} + J${rowNum}))))`;
      } else {
        taxableDrawdownPartnerFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCrystPartnerRef} + (L${rowNum} - N${rowNum}) + (${prevUncrystPartnerRef} * 0.75)), MAX(0, (F${rowNum}/2) - (H${rowNum} + J${rowNum} + N${rowNum})) / 0.8))`;
      }
    }

    const totalTaxableYouFormula = `G${rowNum} + I${rowNum} + O${rowNum}`;
    const totalTaxablePartnerFormula = `H${rowNum} + J${rowNum} + P${rowNum}`;

    const taxPaidYouFormula = `IF(Q${rowNum}>'Settings'!$B$5, MAX(0, MIN(Q${rowNum}-'Settings'!$B$5, 'Settings'!$B$6-'Settings'!$B$5)*0.20) + MAX(0, MIN(Q${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, Q${rowNum}-'Settings'!$B$7)*0.45, 0)`;
    const taxPaidPartnerFormula = isCouple ? `IF(R${rowNum}>'Settings'!$B$5, MAX(0, MIN(R${rowNum}-'Settings'!$B$5, 'Settings'!$B$6-'Settings'!$B$5)*0.20) + MAX(0, MIN(R${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, R${rowNum}-'Settings'!$B$7)*0.45, 0)` : '0';

    const netIncomeYouFormula = `IF(D${rowNum}="Accumulation", 0, Q${rowNum} - S${rowNum} + M${rowNum})`;
    const netIncomePartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, R${rowNum} - T${rowNum} + N${rowNum})` : '0';
    const householdNetIncomeFormula = `U${rowNum} + V${rowNum}`;

    const remainingShortfallYouFormula = `MAX(0, F${rowNum} - (U${rowNum}))`;
    const remainingShortfallPartnerFormula = isCouple ? `MAX(0, (F${rowNum}/2) - (V${rowNum}))` : '0';

    let isaDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevIsaYouRef}), ${remainingShortfallYouFormula}))`;
    let cashDrawdownYouFormula = `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCashYouRef}), MAX(0, ${remainingShortfallYouFormula} - MIN(MAX(0, ${prevIsaYouRef}), ${remainingShortfallYouFormula}))))`;

    let isaDrawdownPartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevIsaPartnerRef}), ${remainingShortfallPartnerFormula}))` : '0';
    let cashDrawdownPartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCashPartnerRef}), MAX(0, ${remainingShortfallPartnerFormula} - MIN(MAX(0, ${prevIsaPartnerRef}), ${remainingShortfallPartnerFormula}))))` : '0';

    const pInYou = `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$C$4:$C$50, "DC Pensions", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}, 'One-Off Contributions'!$B$4:$B$50, "YOU")`;
    const pTrInYou = `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$F$4:$F$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum}, 'Pot Transfers'!$L$4:$L$50, "YOU")`;
    const pTrOutYou = `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$E$4:$E$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum}, 'Pot Transfers'!$J$4:$J$50, "YOU")`;

    const pInPartner = isCouple ? `SUMIFS('One-Off Contributions'!$G$4:$G$50, 'One-Off Contributions'!$C$4:$C$50, "DC Pensions", 'One-Off Contributions'!$D$4:$D$50, A${rowNum}, 'One-Off Contributions'!$B$4:$B$50, "PARTNER")` : '0';
    const pTrInPartner = isCouple ? `SUMIFS('Pot Transfers'!$I$4:$I$50, 'Pot Transfers'!$F$4:$F$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum}, 'Pot Transfers'!$L$4:$L$50, "PARTNER")` : '0';
    const pTrOutPartner = isCouple ? `SUMIFS('Pot Transfers'!$G$4:$G$50, 'Pot Transfers'!$E$4:$E$50, "DC Pensions", 'Pot Transfers'!$D$4:$D$50, A${rowNum}, 'Pot Transfers'!$J$4:$J$50, "PARTNER")` : '0';

    const pclsToIsaYou = `SUMIFS('Tax Free Lump Sums'!$K$4:$K$25, 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum}, 'Tax Free Lump Sums'!$A$4:$A$25, "YOU")`;
    const pclsToCashYou = `SUMIFS('Tax Free Lump Sums'!$L$4:$L$25, 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum}, 'Tax Free Lump Sums'!$A$4:$A$25, "YOU")`;

    const pclsToIsaPartner = isCouple ? `SUMIFS('Tax Free Lump Sums'!$K$4:$K$25, 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum}, 'Tax Free Lump Sums'!$A$4:$A$25, "PARTNER")` : '0';
    const pclsToCashPartner = isCouple ? `SUMIFS('Tax Free Lump Sums'!$L$4:$L$25, 'Tax Free Lump Sums'!$D$4:$D$25, A${rowNum}, 'Tax Free Lump Sums'!$A$4:$A$25, "PARTNER")` : '0';

    // Separate Uncrystallised Pot and Crystallised Drawdown Pot
    const uncrystPensionBalYouFormula = `MAX(0, (${prevUncrystYouRef} - K${rowNum}) * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + (${pInYou}) + (${pTrInYou}) - (${pTrOutYou}))`;
    const crystPensionBalYouFormula = `MAX(0, (${prevCrystYouRef} + (K${rowNum} - M${rowNum}) - O${rowNum}) * (1 + 'Settings'!$B$12))`;
    const totalPensionBalYouFormula = `X${rowNum} + Y${rowNum}`;

    const reinvestDest = profile.annuityExcessReinvestOption || profile.reinvestDestinationPot || profile.maximizedSpendConfig?.reinvestDestinationPot || 'stocks_and_shares_isa';
    const isReinvestIsa = reinvestDest === 'isa' || reinvestDest === 'stocks_and_shares_isa' || reinvestDest === 'cash_isa';
    const isReinvestCashGia = reinvestDest === 'gia' || reinvestDest === 'cash' || reinvestDest === 'cash_savings';

    const surplusToIsaYou = isReinvestIsa 
      ? (isCouple 
          ? `+ IF(W${rowNum}>F${rowNum}, ((W${rowNum}-F${rowNum})*0.5) * (1 + 'Settings'!$B$13 * 0.5), 0)`
          : `+ IF(U${rowNum}>F${rowNum}, (U${rowNum}-F${rowNum}) * (1 + 'Settings'!$B$13 * 0.5), 0)`)
      : '';
    const surplusToCashYou = isReinvestCashGia 
      ? (isCouple 
          ? `+ IF(W${rowNum}>F${rowNum}, ((W${rowNum}-F${rowNum})*0.5) * (1 + 'Settings'!$B$14 * 0.5), 0)`
          : `+ IF(U${rowNum}>F${rowNum}, (U${rowNum}-F${rowNum}) * (1 + 'Settings'!$B$14 * 0.5), 0)`)
      : '';

    const surplusToIsaPartner = (isCouple && isReinvestIsa) 
      ? `+ IF(W${rowNum}>F${rowNum}, ((W${rowNum}-F${rowNum})*0.5) * (1 + 'Settings'!$B$13 * 0.5), 0)` 
      : '';
    const surplusToCashPartner = (isCouple && isReinvestCashGia) 
      ? `+ IF(W${rowNum}>F${rowNum}, ((W${rowNum}-F${rowNum})*0.5) * (1 + 'Settings'!$B$14 * 0.5), 0)` 
      : '';

    const isaBalYouFormula = `MAX(0, (${prevIsaYouRef} - (${isaDrawdownYouFormula})) * (1 + 'Settings'!$B$13) + 'Contributions'!K${contribRowNum} + (${pclsToIsaYou}) ${surplusToIsaYou})`;
    const cashBalYouFormula = `MAX(0, (${prevCashYouRef} - (${cashDrawdownYouFormula})) * (1 + 'Settings'!$B$14) + 'Contributions'!N${contribRowNum} + (${pclsToCashYou}) ${surplusToCashYou})`;
    const totalWealthYouFormula = `Z${rowNum} + AA${rowNum} + AB${rowNum}`;

    const uncrystPensionBalPartnerFormula = isCouple ? `MAX(0, (${prevUncrystPartnerRef} - L${rowNum}) * (1 + 'Settings'!$B$12) + 'Contributions'!R${contribRowNum} + (${pInPartner}) + (${pTrInPartner}) - (${pTrOutPartner}))` : '0';
    const crystPensionBalPartnerFormula = isCouple ? `MAX(0, (${prevCrystPartnerRef} + (L${rowNum} - N${rowNum}) - P${rowNum}) * (1 + 'Settings'!$B$12))` : '0';
    const totalPensionBalPartnerFormula = isCouple ? `AD${rowNum} + AE${rowNum}` : '0';

    const isaBalPartnerFormula = isCouple ? `MAX(0, (${prevIsaPartnerRef} - (${isaDrawdownPartnerFormula})) * (1 + 'Settings'!$B$13) + 'Contributions'!S${contribRowNum} + (${pclsToIsaPartner}) ${surplusToIsaPartner})` : '0';
    const cashBalPartnerFormula = isCouple ? `MAX(0, (${prevCashPartnerRef} - (${cashDrawdownPartnerFormula})) * (1 + 'Settings'!$B$14) + 'Contributions'!T${contribRowNum} + (${pclsToCashPartner}) ${surplusToCashPartner})` : '0';
    const totalWealthPartnerFormula = `AF${rowNum} + AG${rowNum} + AH${rowNum}`;

    const householdWealthFormula = `AC${rowNum} + AI${rowNum}`;

    const proj = projections[idx];

    wsSched.addRow([
      { formula: yearFormula, result: (profile.currentAge || 50) + idx },
      { formula: ageYouFormula, result: (profile.currentAge || 50) + idx },
      { formula: agePartnerFormula, result: isCouple ? ((profile.partnerCurrentAge || 50) + idx) : 0 },
      { formula: statusFormula, result: ((profile.currentAge || 50) + idx) < (profile.targetRetirementAge || 55) ? 'Accumulation' : 'Retirement' },
      { formula: annualContribFormula, result: netCapitalInflowsList[idx] ?? (primaryTotalAnnual + partnerTotalAnnual) },
      { formula: targetReqFormula, result: proj?.targetRetirementIncome ?? (profile.targetRetirementIncomeAnnual || 35000) },
      { formula: stateYouFormula, result: proj?.primaryStatePensionReceived ?? proj?.statePensionReceived ?? 0 },
      { formula: statePartnerFormula, result: proj?.partnerStatePensionReceived ?? 0 },
      { formula: dbYouFormula, result: proj?.primaryDbPensionIncomeReceived ?? proj?.dbPensionIncomeReceived ?? 0 },
      { formula: dbPartnerFormula, result: proj?.partnerDbPensionIncomeReceived ?? 0 },
      { formula: crystTrancheYouFormula, result: proj?.primaryCrystallisedThisYear ?? 0 },
      { formula: crystTranchePartnerFormula, result: proj?.partnerCrystallisedThisYear ?? 0 },
      { formula: pclsCashYouFormula, result: (proj?.primaryPensionDrawdownTaxFree ?? proj?.pensionDrawdownTaxFree ?? 0) },
      { formula: pclsCashPartnerFormula, result: (proj?.partnerPensionDrawdownTaxFree ?? 0) },
      { formula: taxableDrawdownYouFormula, result: (proj?.primaryPensionDrawdownTaxable ?? proj?.pensionDrawdownTaxable ?? (proj?.primaryPensionDrawdown ?? proj?.pensionDrawdown ?? 0)) },
      { formula: taxableDrawdownPartnerFormula, result: (proj?.partnerPensionDrawdownTaxable ?? (proj?.partnerPensionDrawdown ?? 0)) },
      { formula: totalTaxableYouFormula, result: ((proj?.primaryStatePensionReceived ?? proj?.statePensionReceived ?? 0) + (proj?.primaryDbPensionIncomeReceived ?? proj?.dbPensionIncomeReceived ?? 0) + (proj?.primaryTaxableFixedIncomeReceived ?? 0) + (proj?.primaryAnnuityIncomeReceived ?? 0) + (proj?.primaryPensionDrawdownTaxable ?? proj?.pensionDrawdownTaxable ?? (proj?.primaryPensionDrawdown ?? proj?.pensionDrawdown ?? 0))) },
      { formula: totalTaxablePartnerFormula, result: ((proj?.partnerStatePensionReceived ?? 0) + (proj?.partnerDbPensionIncomeReceived ?? 0) + (proj?.partnerTaxableFixedIncomeReceived ?? 0) + (proj?.partnerAnnuityIncomeReceived ?? 0) + (proj?.partnerPensionDrawdownTaxable ?? (proj?.partnerPensionDrawdown ?? 0))) },
      { formula: taxPaidYouFormula, result: proj?.primaryTaxPaid ?? proj?.totalTaxPaid ?? 0 },
      { formula: taxPaidPartnerFormula, result: proj?.partnerTaxPaid ?? 0 },
      { formula: netIncomeYouFormula, result: proj?.primaryNetIncome ?? proj?.netRetirementIncome ?? 0 },
      { formula: netIncomePartnerFormula, result: proj?.partnerNetIncome ?? 0 },
      { formula: householdNetIncomeFormula, result: proj?.netRetirementIncome ?? 0 },
      { formula: uncrystPensionBalYouFormula, result: proj ? (proj.primaryUncrystallisedPot ?? proj.primaryPensionPot ?? proj.pensionPot) : initPensionYou },
      { formula: crystPensionBalYouFormula, result: proj ? (proj.primaryCrystallisedPot ?? 0) : 0 },
      { formula: totalPensionBalYouFormula, result: proj ? (proj.primaryPensionPot ?? proj.pensionPot) : initPensionYou },
      { formula: isaBalYouFormula, result: proj ? (proj.primaryIsaPot ?? proj.isaPot) : initIsaYou },
      { formula: cashBalYouFormula, result: proj ? (proj.primaryCashGiaPot ?? proj.cashGiaPot) : initCashYou },
      { formula: totalWealthYouFormula, result: proj ? (proj.primaryTotalPot ?? proj.totalPot) : (initPensionYou + initIsaYou + initCashYou) },
      { formula: uncrystPensionBalPartnerFormula, result: proj ? (proj.partnerUncrystallisedPot ?? proj.partnerPensionPot ?? 0) : initPensionPartner },
      { formula: crystPensionBalPartnerFormula, result: proj ? (proj.partnerCrystallisedPot ?? 0) : 0 },
      { formula: totalPensionBalPartnerFormula, result: proj ? (proj.partnerPensionPot ?? 0) : initPensionPartner },
      { formula: isaBalPartnerFormula, result: proj ? (proj.partnerIsaPot ?? 0) : initIsaPartner },
      { formula: cashBalPartnerFormula, result: proj ? (proj.partnerCashGiaPot ?? 0) : initCashPartner },
      { formula: totalWealthPartnerFormula, result: proj ? (proj.partnerTotalPot ?? 0) : (initPensionPartner + initIsaPartner + initCashPartner) },
      { formula: householdWealthFormula, result: proj ? proj.totalPot : (initPensionYou + initIsaYou + initCashYou + initPensionPartner + initIsaPartner + initCashPartner) },
    ]);

    const row = wsSched.getRow(rowNum);
    row.getCell(1).numFmt = '0';
    row.getCell(2).numFmt = '0';
    row.getCell(3).numFmt = '0';
    row.getCell(4).alignment = { horizontal: 'center' };

    for (let c = 5; c <= 36; c++) {
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

  const netPensionDecumRate = getEffectiveDecumulationReturn(profile.postRetirementReturn ?? 4.5, profile.assetAllocationSplit, profile.investmentFees) / 100;
  const netIsaDecumRate = netPensionDecumRate;
  const netCashDecumRate = Math.min(0.035, Math.max(0.01, (profile.expectedInflationRate || 2.5) / 100 + 0.005));

  wsSettings.addRow(['Inflation Growth Rate (%)', (profile.expectedInflationRate || 2.5) / 100, '% / year', 'CPI Annual Inflation Index (Cell B11)']); // Row 11
  wsSettings.addRow(['DC Pension Asset Growth Rate (%)', netPensionDecumRate, '% / year', 'Net Annual Decumulation Growth (Cell B12)']); // Row 12
  wsSettings.addRow(['ISA Investment Growth Rate (%)', netIsaDecumRate, '% / year', 'Net Annual Decumulation Growth (Cell B13)']); // Row 13
  wsSettings.addRow(['Cash & Savings Growth Rate (%)', netCashDecumRate, '% / year', 'Net Cash Interest Rate (Cell B14)']); // Row 14
  wsSettings.addRow(['State Pension Triple Lock Growth (%)', 0.025, '% / year', 'Annual State Pension Index (Cell B15)']); // Row 15

  for (let r = 11; r <= 15; r++) {
    wsSettings.getCell(`B${r}`).numFmt = '0.00%';
  }

  wsSettings.addRow([]); // Row 16 Blank

  // --- SECTION 3: DRAWDOWN STRATEGY & DECUMULATION CONFIGURATION ---
  wsSettings.addRow(['3. DRAWDOWN STRATEGY & DECUMULATION CONFIGURATION', '', '', 'Active Decumulation Strategy']); // Row 17
  const setS3 = wsSettings.getRow(17);
  setS3.height = 24;
  setS3.eachCell((cell) => {
    cell.fill = sectionHeaderFill;
    cell.font = fontSectionHeader;
    cell.alignment = { vertical: 'middle' };
  });

  const primaryStratLabel = getStrategyLabel(profile.drawdownStrategy);
  const partnerStratLabel = isCouple ? getStrategyLabel(profile.partnerDrawdownStrategy || profile.drawdownStrategy) : 'N/A';

  wsSettings.addRow(['Primary Drawdown Strategy', primaryStratLabel, 'YOU', 'Selected Decumulation Mode']); // Row 18
  wsSettings.addRow(['Partner Drawdown Strategy', partnerStratLabel, isCouple ? 'PARTNER' : 'N/A', 'Selected Decumulation Mode']); // Row 19

  wsSettings.eachRow((row, rowNumber) => {
    if (rowNumber >= 4 && rowNumber !== 9 && rowNumber !== 16) {
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
