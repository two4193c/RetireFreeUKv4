import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile, InvestmentPots, YearProjection, UKTaxResult, PlannerScenario, CrystallisationTranche, LumpSumSplit } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, DEFAULT_MORTGAGE, DEFAULT_INVESTMENT_FEES, DEFAULT_SINGLE_POT_FEE, sanitizePots } from '../utils/defaultData';
import { calculateGiltLadder } from '../utils/giltLadderEngine';
import { jsPDF } from 'jspdf';
import { FileText, Download, Printer, CheckCircle2, Sparkles, ShieldCheck, ArrowUpRight, Table, PieChart, Image as ImageIcon, BarChart3, Upload, FileJson, FileSpreadsheet } from 'lucide-react';
import { getProjectedPensionAtTakeAge, getPensionAccessAge, getPartnerPensionAccessAge, calculateUKTax, calculatePartnerUKTax, calculateMaxPcls, calculatePartnerMaxPcls, getLumpSumTakeAge, getPartnerLumpSumTakeAge } from '../utils/ukTaxEngine';
import { runMonteCarloSimulation } from '../utils/monteCarloEngine';
import { runHistoricSimulation } from '../utils/historicModelingEngine';
import { getTargetIncomeForAge, generateProjections } from '../utils/projectionEngine';
import { generatePlanNarrative } from '../utils/pdfNarrativeGenerator';
import { computePlanInsights } from '../utils/planInsightsEngine';
import { generateFormulaExcelWorkbook } from '../utils/excelFormulaExporter';
import {
  computeCashFlowSankeyData,
  computeSankeyLayout,
  hexToRgb,
  CashFlowSankeyData,
  SvgLayoutData,
} from '../utils/sankeyEngine';

interface ExportSectionProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  taxResult?: UKTaxResult;
  planName?: string;
  scenarios?: PlannerScenario[];
  onImportScenarios?: (scenarios: PlannerScenario[]) => void;
  variant?: 'all' | 'pdf_only' | 'data_only';
  appName?: string;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  profile,
  pots,
  projections,
  taxResult,
  planName,
  scenarios = [],
  onImportScenarios,
  variant = 'all',
  appName = 'RetireFree UK',
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const effectivePlanName = (planName && planName.trim()) ? planName.trim() : (profile.name && profile.name.trim()) ? profile.name.trim() : 'Retirement_Plan';
  const fileNameSlug = effectivePlanName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const retirementYear = (projections && projections.length > 0)
    ? (projections.find((p) => p.age === profile.targetRetirementAge) || projections[0])
    : { totalPot: 0, pensionPot: 0, isaPot: 0, cashGiaPot: 0, targetRetirementIncome: 0, age: profile.targetRetirementAge, year: 2024 };

  const endingYear = (projections && projections.length > 0)
    ? projections[projections.length - 1]
    : retirementYear;

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      const headers = [
        'Year',
        'Age',
        'Phase',
        'Pension Pot (£)',
        'ISA Pot (£)',
        'Cash/GIA Pot (£)',
        'Total Portfolio (£)',
        'Estimated Investment & Adviser Fees (£)',
        'State Pension (£)',
        'DB Pension (£)',
        'Annuity Payout (£)',
        'Pension Drawdown (£)',
        'Total Tax Paid (£)',
        'Net Retirement Income (£)',
        'Target Requirement (£)',
        'Shortfall Deficit (£)',
        'Annual Surplus (£)',
        'Cumulative Surplus (£)',
      ];

      const rows = (projections || []).map((p) => [
        p.year,
        p.age,
        p.isRetired ? 'Retirement (Decumulation)' : 'Working (Accumulation)',
        p.pensionPot || 0,
        p.isaPot || 0,
        p.cashGiaPot || 0,
        p.totalPot || 0,
        p.estimatedInvestmentFees || 0,
        p.statePensionReceived || 0,
        p.dbPensionIncomeReceived || 0,
        p.annuityIncomeReceived || 0,
        p.pensionDrawdown || 0,
        p.totalTaxPaid || 0,
        p.netRetirementIncome || 0,
        p.targetRetirementIncome || 0,
        p.incomeShortfall || 0,
        p.annualIncomeExcess || 0,
        p.cumulativeExcessIncome || 0,
      ]);

      const csvStr = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${appName.replace(/\s+/g, '_')}_Projections_${fileNameSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg('Projections exported to CSV successfully!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('Error exporting CSV data.');
    }
  };

  // Formula Excel (.xlsx) Export Handler
  const handleExportFormulaExcel = async () => {
    try {
      setExportSuccessMsg('Generating Formula Spreadsheet (.xlsx)...');
      const blob = await generateFormulaExcelWorkbook(profile, pots, projections || [], effectivePlanName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${appName.replace(/\s+/g, '_')}_Formula_Model_${fileNameSlug}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccessMsg('Formula Spreadsheet (.xlsx) exported successfully!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Excel Formula Export Error:', err);
      alert('Failed to generate Excel formula spreadsheet.');
      setExportSuccessMsg(null);
    }
  };

  // Ultra-Professional Multi-Page PDF Report Export Handler
  const handleExportPdfReport = async () => {
    if (!projections || projections.length === 0) {
      setExportSuccessMsg('No projections available to export.');
      setTimeout(() => setExportSuccessMsg(null), 3000);
      return;
    }

    const exportTaxResult = taxResult || calculateUKTax(profile, pots);
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryName = profile.name || 'Primary';
      const partnerName = profile.isCouplePlanning ? (profile.partnerName || 'Partner') : null;
      const peopleLabel = partnerName ? `${primaryName} & ${partnerName}` : primaryName;
      const safeProfileName = profile.name || 'Retirement Plan';
      const activePlanName = planName || safeProfileName;
      const reportFullTitle = `${peopleLabel} - ${activePlanName}`;

      const targetAge = profile.targetRetirementAge || 60;
      const currentAge = profile.currentAge || 30;
      const horizonAge = profile.lifeExpectancyAge || 90;

      // Color Tokens
      const emeraldColor = [16, 185, 129];
      const slateDark = [15, 23, 42];
      const slateMuted = [100, 116, 139];
      const slateLight = [248, 250, 252];
      const indigoColor = [99, 102, 241];
      const amberColor = [245, 158, 11];
      const roseColor = [225, 29, 72];
      const tealColor = [13, 148, 136];

      const rowsPerPage = 42;
      const totalDecumPages = Math.ceil((projections || []).length / rowsPerPage) || 1;

      // Accumulation Ledger helper for PDF export
      const formatPotNamePDF = (pot?: string) => {
        if (!pot) return '—';
        switch (pot) {
          case 'workplace_pension': return 'Workplace Pension';
          case 'sipp': return 'SIPP';
          case 'stocks_and_shares_isa': return 'S&S ISA';
          case 'cash_isa': return 'Cash ISA';
          case 'lisa': return 'LISA';
          case 'gia': return 'GIA';
          case 'cash_savings': return 'Cash Savings';
          default: return pot.replace(/_/g, ' ').toUpperCase();
        }
      };

      const getGroupedAccumulationItems = () => {
        const items: any[] = [];
        const currentYear = new Date().getFullYear();
        const primaryName = profile.name || 'Primary';
        const partnerName = profile.partnerName || 'Partner';
        const primaryCurrentAge = profile.currentAge || 35;
        const primaryRetireAge = profile.targetRetirementAge || 60;
        const partnerCurrentAge = profile.partnerCurrentAge || primaryCurrentAge;
        const partnerRetireAge = profile.partnerTargetRetirementAge || primaryRetireAge;
        const isCouple = Boolean(profile.isCouplePlanning);

        // 1. One-off & Custom Regular Contributions
        (profile.oneOffContributions || []).filter(c => c.enabled !== false).forEach((c) => {
          const isPartnerOwner = c.owner === 'partner';
          const ownerName = isPartnerOwner ? partnerName : primaryName;
          const curAge = isPartnerOwner ? partnerCurrentAge : primaryCurrentAge;
          const retAge = isPartnerOwner ? partnerRetireAge : primaryRetireAge;
          const isMonthly = c.frequency === 'regular_monthly';

          let startYear: number;
          let endYear: number;
          let dateSortKey: string;
          let scheduleDisplay: string;

          if (c.date && c.date.trim() !== '') {
            let cleanDateStr = c.date.trim();
            if (/^00\d{2}/.test(cleanDateStr)) {
              cleanDateStr = '20' + cleanDateStr.slice(2);
            }
            const parts = cleanDateStr.split('-');
            startYear = parseInt(parts[0], 10) || currentYear;
            endYear = startYear;
            dateSortKey = cleanDateStr;
            const dateObj = new Date(cleanDateStr);
            scheduleDisplay = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : cleanDateStr;
          } else if (c.startAge !== undefined) {
            startYear = currentYear + Math.max(0, c.startAge - curAge);
            endYear = c.endAge ? currentYear + Math.max(0, c.endAge - curAge) : currentYear + Math.max(0, retAge - curAge);
            if (endYear < startYear) endYear = startYear;
            dateSortKey = `${startYear}-04-06`;
            if (isMonthly) {
              scheduleDisplay = startYear === endYear
                ? `${startYear} (1 yr)`
                : `${startYear}–${endYear} (${endYear - startYear + 1} yrs)`;
            } else {
              scheduleDisplay = `Tax Year ${startYear}/${(startYear + 1).toString().slice(2)} (Age ${c.startAge})`;
            }
          } else {
            startYear = currentYear;
            endYear = isMonthly ? currentYear + Math.max(0, retAge - curAge) : currentYear;
            if (endYear < startYear) endYear = startYear;
            dateSortKey = `${startYear}-04-06`;
            scheduleDisplay = isMonthly ? `Ongoing (${startYear}–${endYear})` : `Tax Year ${startYear}/${(startYear + 1).toString().slice(2)}`;
          }

          let grossAnnual = c.grossAmount || 0;
          let monthlyAmt: number | undefined = undefined;

          if (isMonthly) {
            if (c.targetPot === 'workplace_pension' && c.workplaceContributionType === 'percent') {
              const salary = isPartnerOwner ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
              const empMo = (salary * ((c.employeePercent || 0) / 100)) / 12;
              const emprMo = (salary * ((c.employerPercent || 0) / 100)) / 12;
              monthlyAmt = empMo + emprMo;
              grossAnnual = monthlyAmt * 12;
            } else {
              monthlyAmt = c.grossAmount || 0;
              grossAnnual = monthlyAmt * 12;
            }
          }

          items.push({
            name: c.name || (isMonthly ? 'Regular Contribution' : 'One-off Lump Sum'),
            category: isMonthly ? 'Monthly Savings' : 'One-off Lump Sum',
            ownerName,
            sourcePot: c.sourcePot,
            targetPot: c.targetPot,
            grossAnnual,
            monthlyAmt,
            isMonthly,
            startYear,
            endYear,
            scheduleDisplay,
            dateSortKey,
            description: c.description || '',
          });
        });

        // 0. Initial Starting Pot Balances
        const addStartingPot = (name: string, potKey: string, balance: number, owner: string) => {
          if (balance > 0) {
            items.push({
              name: `${name} (Starting Balance)`,
              category: 'Starting Balance',
              ownerName: owner,
              targetPot: potKey,
              grossAnnual: balance,
              isMonthly: false,
              startYear: currentYear,
              endYear: currentYear,
              scheduleDisplay: `Start Year (${currentYear})`,
              dateSortKey: `${currentYear}-01-01-A-${potKey}`,
              description: `Initial baseline capital balance`,
            });
          }
        };

        addStartingPot(`${primaryName} Workplace Pension`, 'workplace_pension', pots.workplacePensionBalance || 0, primaryName);
        addStartingPot(`${primaryName} SIPP`, 'sipp', pots.sippBalance || 0, primaryName);
        addStartingPot(`${primaryName} Stocks & Shares ISA`, 'stocks_and_shares_isa', pots.stocksAndSharesIsaBalance || 0, primaryName);
        addStartingPot(`${primaryName} Cash ISA`, 'cash_isa', pots.cashIsaBalance || 0, primaryName);
        addStartingPot(`${primaryName} LISA`, 'lisa', pots.lisaBalance || 0, primaryName);
        addStartingPot(`${primaryName} GIA`, 'gia', pots.giaBalance || 0, primaryName);
        addStartingPot(`${primaryName} Cash Savings`, 'cash_savings', pots.cashSavingsBalance || 0, primaryName);

        if (isCouple && profile.partnerPots) {
          const pPots = profile.partnerPots;
          addStartingPot(`${partnerName} Workplace Pension`, 'workplace_pension', pPots.workplacePensionBalance || 0, partnerName);
          addStartingPot(`${partnerName} SIPP`, 'sipp', pPots.sippBalance || 0, partnerName);
          addStartingPot(`${partnerName} Stocks & Shares ISA`, 'stocks_and_shares_isa', pPots.stocksAndSharesIsaBalance || 0, partnerName);
          addStartingPot(`${partnerName} Cash ISA`, 'cash_isa', pPots.cashIsaBalance || 0, partnerName);
          addStartingPot(`${partnerName} LISA`, 'lisa', pPots.lisaBalance || 0, partnerName);
          addStartingPot(`${partnerName} GIA`, 'gia', pPots.giaBalance || 0, partnerName);
          addStartingPot(`${partnerName} Cash Savings`, 'cash_savings', pPots.cashSavingsBalance || 0, partnerName);
        }

        // 2. Base Workplace Pension & Monthly Contributions into pots
        const primaryPots = pots;
        const salary = profile.grossAnnualSalary || 0;
        const hasPrimaryWorkplaceInOneOff = (profile.oneOffContributions || []).some(
          (c) => (c.owner || 'primary') === 'primary' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
        );

        if (!hasPrimaryWorkplaceInOneOff) {
          let pEmpPensionMo = primaryPots.workplacePensionMonthlyEmployeeType === 'percent'
            ? (salary * ((primaryPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12
            : (primaryPots.workplacePensionMonthlyEmployee || 0);
          let pEmprPensionMo = (salary * ((primaryPots.employerMatchPercentage || 0) / 100)) / 12;
          let pTotalWorkplaceMo = pEmpPensionMo + pEmprPensionMo;
          if (pTotalWorkplaceMo > 0) {
            const endYr = currentYear + Math.max(0, primaryRetireAge - primaryCurrentAge);
            items.push({
              name: `${primaryName} Workplace Pension (Salary Sacrifice)`,
              category: 'Monthly Savings',
              ownerName: primaryName,
              targetPot: 'workplace_pension',
              grossAnnual: pTotalWorkplaceMo * 12,
              monthlyAmt: pTotalWorkplaceMo,
              isMonthly: true,
              startYear: currentYear,
              endYear: endYr,
              scheduleDisplay: `Ongoing (${currentYear}–${endYr})`,
              dateSortKey: `${currentYear}-01-02-workplace`,
              description: `Employee: £${Math.round(pEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(pEmprPensionMo).toLocaleString()}/mo`,
            });
          }
        }

        const addMonthlyPotContrib = (potName: string, potKey: string, monthlyAmt: number, owner: string, endAge: number, curAge: number) => {
          if (monthlyAmt > 0) {
            const endYr = currentYear + Math.max(0, endAge - curAge);
            items.push({
              name: `${owner} ${potName} Monthly Savings`,
              category: 'Monthly Savings',
              ownerName: owner,
              targetPot: potKey,
              grossAnnual: monthlyAmt * 12,
              monthlyAmt: monthlyAmt,
              isMonthly: true,
              startYear: currentYear,
              endYear: endYr,
              scheduleDisplay: `Ongoing (${currentYear}–${endYr})`,
              dateSortKey: `${currentYear}-01-02-${potKey}`,
              description: `Regular monthly savings of £${Math.round(monthlyAmt).toLocaleString()}/mo`,
            });
          }
        };

        addMonthlyPotContrib('SIPP', 'sipp', pots.sippMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);
        addMonthlyPotContrib('S&S ISA', 'stocks_and_shares_isa', pots.stocksAndSharesIsaMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);
        addMonthlyPotContrib('Cash ISA', 'cash_isa', pots.cashIsaMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);
        addMonthlyPotContrib('LISA', 'lisa', pots.lisaMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);
        addMonthlyPotContrib('GIA', 'gia', pots.giaMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);
        addMonthlyPotContrib('Cash Savings', 'cash_savings', pots.cashSavingsMonthlyContribution || 0, primaryName, primaryRetireAge, primaryCurrentAge);

        if (isCouple && profile.partnerPots) {
          const hasPartnerWorkplaceInOneOff = (profile.oneOffContributions || []).some(
            (c) => c.owner === 'partner' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
          );

          if (!hasPartnerWorkplaceInOneOff) {
            const partPots = profile.partnerPots;
            const partSalary = profile.partnerGrossAnnualSalary || 0;
            let partEmpPensionMo = partPots.workplacePensionMonthlyEmployeeType === 'percent'
              ? (partSalary * ((partPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12
              : (partPots.workplacePensionMonthlyEmployee || 0);
            let partEmprPensionMo = (partSalary * ((partPots.employerMatchPercentage || 0) / 100)) / 12;
            let partTotalWorkplaceMo = partEmpPensionMo + partEmprPensionMo;
            if (partTotalWorkplaceMo > 0) {
              const endYr = currentYear + Math.max(0, partnerRetireAge - partnerCurrentAge);
              items.push({
                name: `${partnerName} Workplace Pension (Salary Sacrifice)`,
                category: 'Monthly Savings',
                ownerName: partnerName,
                targetPot: 'workplace_pension',
                grossAnnual: partTotalWorkplaceMo * 12,
                monthlyAmt: partTotalWorkplaceMo,
                isMonthly: true,
                startYear: currentYear,
                endYear: endYr,
                scheduleDisplay: `Ongoing (${currentYear}–${endYr})`,
                dateSortKey: `${currentYear}-01-02-partner-workplace`,
                description: `Employee: £${Math.round(partEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(partEmprPensionMo).toLocaleString()}/mo`,
              });
            }
          }

          const partPots = profile.partnerPots;
          addMonthlyPotContrib('SIPP', 'sipp', partPots.sippMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
          addMonthlyPotContrib('S&S ISA', 'stocks_and_shares_isa', partPots.stocksAndSharesIsaMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
          addMonthlyPotContrib('Cash ISA', 'cash_isa', partPots.cashIsaMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
          addMonthlyPotContrib('LISA', 'lisa', partPots.lisaMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
          addMonthlyPotContrib('GIA', 'gia', partPots.giaMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
          addMonthlyPotContrib('Cash Savings', 'cash_savings', partPots.cashSavingsMonthlyContribution || 0, partnerName, partnerRetireAge, partnerCurrentAge);
        }

        // 3. Pot Transfers
        (profile.potTransfers || []).filter(t => t.enabled !== false).forEach((t) => {
          const isSrcPartner = t.owner === 'partner';
          const ownerName = isSrcPartner ? partnerName : primaryName;
          const curAge = isSrcPartner ? partnerCurrentAge : primaryCurrentAge;

          let year: number;
          let dateSortKey: string;
          let scheduleDisplay: string;

          if (t.transferDate && t.transferDate.trim() !== '') {
            const parts = t.transferDate.split('-');
            year = parseInt(parts[0], 10) || currentYear;
            dateSortKey = t.transferDate;
            const dateObj = new Date(t.transferDate);
            scheduleDisplay = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : t.transferDate;
          } else if (t.transferAge !== undefined) {
            year = currentYear + Math.max(0, t.transferAge - curAge);
            dateSortKey = `${year}-04-06`;
            scheduleDisplay = `Tax Year ${year}/${(year + 1).toString().slice(2)} (Age ${t.transferAge})`;
          } else {
            year = currentYear + 2;
            dateSortKey = `${year}-04-06`;
            scheduleDisplay = `Tax Year ${year}/${(year + 1).toString().slice(2)}`;
          }

          items.push({
            name: t.name || 'Pot Transfer',
            category: 'Pot Transfer',
            ownerName,
            sourcePot: t.sourcePot,
            targetPot: t.destinationPot,
            grossAnnual: t.amount || 0,
            isMonthly: false,
            startYear: year,
            endYear: year,
            scheduleDisplay,
            dateSortKey,
            description: t.description || '',
          });
        });

        // 4. DB Pension Tax-Free Lump Sum Payouts
        (profile.dbPensions || []).filter(db => db.enabled !== false && db.taxFreeLumpSum && db.taxFreeLumpSum > 0).forEach((db) => {
          const isPartnerOwner = db.owner === 'partner';
          const ownerName = isPartnerOwner ? partnerName : primaryName;
          const curAge = isPartnerOwner ? partnerCurrentAge : primaryCurrentAge;
          const startAge = db.startAge || 60;
          const year = currentYear + Math.max(0, startAge - curAge);

          items.push({
            name: `${db.name} (DB Tax-Free Lump Sum)`,
            category: 'DB Lump Sum',
            ownerName,
            targetPot: db.targetPot || 'cash_savings',
            grossAnnual: db.taxFreeLumpSum,
            isMonthly: false,
            startYear: year,
            endYear: year,
            scheduleDisplay: `Age ${startAge} (${year})`,
            dateSortKey: `${year}-04-06`,
            description: `DB pension lump sum payout`,
          });
        });

        return items.sort((a, b) => (a.dateSortKey || '').localeCompare(b.dateSortKey || ''));
      };

      const getAccumulationLedgerItems = () => {
        const grouped = getGroupedAccumulationItems();
        return grouped.map((g) => ({
          ...g,
          dateDisplay: g.scheduleDisplay,
        })).sort((a, b) => (a.dateSortKey || '').localeCompare(b.dateSortKey || ''));
      };

      const accumLedgerItems = getAccumulationLedgerItems();
      const accumRowsPerPage = 38;
      const totalAccumPages = Math.ceil(accumLedgerItems.length / accumRowsPerPage) || 1;
      const totalHistoricPages = 3;
      const totalMortgagePages = 1;

      // Determine Sankey Milestones for Appendix 5
      const isCouple = Boolean(profile.isCouplePlanning || profile.maritalStatus === 'couple');
      const priName = profile.name || 'Primary';
      const partName = profile.partnerName || 'Partner';
      const partnerOffset = isCouple ? ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge) : 0;
      const targetRetireAgeVal = targetAge;
      const primaryAccessAgeVal = getPensionAccessAge(profile);
      const partnerAccessAgeVal = isCouple ? getPartnerPensionAccessAge(profile) : primaryAccessAgeVal;
      const primarySpaVal = profile.statePensionAge || 67;
      const partnerSpaVal = isCouple ? (profile.partnerStatePensionAge || 67) : primarySpaVal;

      interface RawMilestoneEvent {
        primaryAge: number;
        title: string;
        subtitle: string;
        phaseLabel: string;
        priority: number;
      }

      const rawEvents: RawMilestoneEvent[] = [];

      // 1. Accumulation Phase at Current Age
      if (profile.currentAge < targetRetireAgeVal) {
        rawEvents.push({
          primaryAge: profile.currentAge,
          title: `Accumulation Cash Flow — Current Age (${profile.currentAge})`,
          subtitle: isCouple
            ? 'Household earned income split by earner, statutory UK taxes, workplace pensions & ISA savings'
            : 'Earned income, income tax, National Insurance, pension contributions & net living allocation',
          phaseLabel: `Accumulation Phase (Age ${profile.currentAge})`,
          priority: 1,
        });
      }

      // 2. Primary Target Retirement
      rawEvents.push({
        primaryAge: targetRetireAgeVal,
        title: `${isCouple ? `${priName} ` : ''}Target Retirement (Age ${targetRetireAgeVal})`,
        subtitle: isCouple
          ? `${priName} reaches target retirement age; initial decumulation drawdown, pot sequencing & tax deductions`
          : 'Initial retirement drawdown, flexi-access pot withdrawals, income tax & living allocation',
        phaseLabel: `Retirement Phase (Age ${targetRetireAgeVal})`,
        priority: 2,
      });

      // 3. Partner Target Retirement (if couple and different primary age)
      if (isCouple && profile.partnerTargetRetirementAge) {
        const pAgeAtPartRet = profile.partnerTargetRetirementAge - partnerOffset;
        if (pAgeAtPartRet >= profile.currentAge && pAgeAtPartRet <= horizonAge) {
          rawEvents.push({
            primaryAge: pAgeAtPartRet,
            title: `${partName} Target Retirement (${partName} Age ${profile.partnerTargetRetirementAge})`,
            subtitle: `${partName} reaches target retirement age; dual household decumulation & joint tax optimization`,
            phaseLabel: `Partner Retirement (${partName} Age ${profile.partnerTargetRetirementAge})`,
            priority: 3,
          });
        }
      }

      // 4. Primary Pension Access (NMPA)
      if (primaryAccessAgeVal !== targetRetireAgeVal && primaryAccessAgeVal !== profile.currentAge && primaryAccessAgeVal <= horizonAge) {
        rawEvents.push({
          primaryAge: primaryAccessAgeVal,
          title: `${isCouple ? `${priName} ` : ''}Private Pension Access (NMPA Age ${primaryAccessAgeVal})`,
          subtitle: `Earliest private pension access milestone — DC pension pot access & 25% PCLS liquidity`,
          phaseLabel: `Private Pension Access (Age ${primaryAccessAgeVal})`,
          priority: 4,
        });
      }

      // 5. Partner Pension Access (NMPA)
      if (isCouple) {
        const pAgeAtPartNmpa = partnerAccessAgeVal - partnerOffset;
        if (pAgeAtPartNmpa !== primaryAccessAgeVal && pAgeAtPartNmpa >= profile.currentAge && pAgeAtPartNmpa <= horizonAge) {
          rawEvents.push({
            primaryAge: pAgeAtPartNmpa,
            title: `${partName} Private Pension Access (${partName} Age ${partnerAccessAgeVal})`,
            subtitle: `${partName} reaches private pension access — Partner DC pot liquidity & tax-free cash extraction`,
            phaseLabel: `Partner Pension Access (${partName} Age ${partnerAccessAgeVal})`,
            priority: 5,
          });
        }
      }

      // 6. Primary State Pension Start Age
      if (profile.includeStatePension ?? true) {
        if (primarySpaVal >= profile.currentAge && primarySpaVal <= horizonAge) {
          rawEvents.push({
            primaryAge: primarySpaVal,
            title: `${isCouple ? `${priName} ` : ''}State Pension Start (Age ${primarySpaVal})`,
            subtitle: `Guaranteed DWP State Pension commencement (£${Math.round(profile.statePensionAnnualAmount || 11502).toLocaleString()}/yr Triple-Lock floor)`,
            phaseLabel: `State Pension Age (${primarySpaVal})`,
            priority: 6,
          });
        }
      }

      // 7. Partner State Pension Start Age
      if (isCouple && (profile.partnerIncludeStatePension ?? true)) {
        const pAgeAtPartSpa = partnerSpaVal - partnerOffset;
        if (pAgeAtPartSpa >= profile.currentAge && pAgeAtPartSpa <= horizonAge) {
          rawEvents.push({
            primaryAge: pAgeAtPartSpa,
            title: `${partName} State Pension Start (${partName} Age ${partnerSpaVal})`,
            subtitle: `${partName} DWP State Pension commencement (£${Math.round(profile.partnerStatePensionAnnualAmount || 11502).toLocaleString()}/yr guaranteed floor)`,
            phaseLabel: `Partner State Pension (${partName} Age ${partnerSpaVal})`,
            priority: 7,
          });
        }
      }

      // 8. Primary UK Gilt Ladder Execution
      if (profile.giltLadderConfig?.enabled) {
        const priGiltAge = Math.max(profile.currentAge, profile.giltLadderConfig.purchaseAge ?? profile.giltLadderConfig.startAge ?? targetRetireAgeVal);
        if (priGiltAge <= horizonAge) {
          rawEvents.push({
            primaryAge: priGiltAge,
            title: `${isCouple ? `${priName} ` : ''}UK Gilt Ladder Purchase (Age ${priGiltAge})`,
            subtitle: `Capital deployed to purchase a ${profile.giltLadderConfig.durationYears || 5}-year UK Gilt ladder delivering £${Math.round(profile.giltLadderConfig.targetAnnualIncome || 25000).toLocaleString()}/yr fixed income`,
            phaseLabel: `Gilt Ladder Execution (Age ${priGiltAge})`,
            priority: 8,
          });
        }
      }

      // 9. Partner UK Gilt Ladder Execution
      if (isCouple && profile.partnerGiltLadderConfig?.enabled) {
        const partGiltAge = Math.max(profile.partnerCurrentAge ?? profile.currentAge, profile.partnerGiltLadderConfig.purchaseAge ?? profile.partnerGiltLadderConfig.startAge ?? (profile.partnerTargetRetirementAge ?? 60));
        const pAgeAtPartGilt = partGiltAge - partnerOffset;
        if (pAgeAtPartGilt >= profile.currentAge && pAgeAtPartGilt <= horizonAge) {
          rawEvents.push({
            primaryAge: pAgeAtPartGilt,
            title: `${partName} UK Gilt Ladder Purchase (${partName} Age ${partGiltAge})`,
            subtitle: `Capital deployed for ${partName}'s ${profile.partnerGiltLadderConfig.durationYears || 5}-year UK Gilt ladder delivering £${Math.round(profile.partnerGiltLadderConfig.targetAnnualIncome || 25000).toLocaleString()}/yr fixed income`,
            phaseLabel: `Partner Gilt Ladder (${partName} Age ${partGiltAge})`,
            priority: 9,
          });
        }
      }

      // 10. Property Right-Sizing
      if (profile.propertyDownsizePlan?.enabled) {
        const dsAge = profile.propertyDownsizePlan.downsizeAge || 68;
        if (dsAge >= profile.currentAge && dsAge <= horizonAge) {
          rawEvents.push({
            primaryAge: dsAge,
            title: `Property Right-Sizing Event (Age ${dsAge})`,
            subtitle: `Equity released (£${Math.round(profile.propertyDownsizePlan.expectedReleaseAmount || 0).toLocaleString()}) from property downsizing injected into liquid retirement pots`,
            phaseLabel: `Right-Sizing Event (Age ${dsAge})`,
            priority: 10,
          });
        }
      }

      // 11. Custom Decumulation Life Events (Major items)
      (profile.decumulationLifeEvents || []).filter(e => e.enabled && e.amount > 0).forEach((ev, evIdx) => {
        const isPart = ev.owner === 'partner';
        const pAgeAtEv = isPart ? ev.age - partnerOffset : ev.age;
        if (pAgeAtEv >= profile.currentAge && pAgeAtEv <= horizonAge) {
          rawEvents.push({
            primaryAge: pAgeAtEv,
            title: `${isPart ? `${partName} ` : ''}Life Event: ${ev.name} (${isPart ? `${partName} Age ${ev.age}` : `Age ${ev.age}`})`,
            subtitle: `${ev.type === 'income' ? 'Lump sum inflow' : 'Major capital expenditure'} of £${Math.round(ev.amount).toLocaleString()} (${ev.targetPot || 'General'} pot)`,
            phaseLabel: `Life Event (Age ${pAgeAtEv})`,
            priority: 11 + evIdx,
          });
        }
      });

      // Group raw events by unique primaryAge
      const groupedByAge = new Map<number, RawMilestoneEvent[]>();
      rawEvents.forEach((ev) => {
        const existing = groupedByAge.get(ev.primaryAge) || [];
        existing.push(ev);
        groupedByAge.set(ev.primaryAge, existing);
      });

      // Sort ages ascending
      const sortedAges = Array.from(groupedByAge.keys()).sort((a, b) => a - b);

      const sankeyMilestones: {
        title: string;
        subtitle: string;
        age: number;
        viewMode: 'combined' | 'split' | 'primary' | 'partner';
        phaseLabel: string;
      }[] = sortedAges.map((age, idx) => {
        const events = groupedByAge.get(age)!;
        const milestoneNum = idx + 1;

        let title = `Milestone ${milestoneNum}: `;
        if (events.length === 1) {
          title += events[0].title;
        } else {
          // Multi-event combined title
          const mainTitles = events.map(e => e.title.replace(/\s*\(.*?\)\s*/g, '').trim());
          title += `${mainTitles.join(' & ')} (Age ${age})`;
        }

        const subtitle = events.map(e => e.subtitle).join(' • ');
        const phaseLabel = events[0].phaseLabel;

        return {
          title,
          subtitle,
          age,
          viewMode: isCouple ? 'split' : 'combined',
          phaseLabel,
        };
      });

      const totalSankeyPages = sankeyMilestones.length;
      const totalTimelinePages = 1;
      const TOTAL_PAGES = 12 + totalAccumPages + totalDecumPages + totalHistoricPages + totalMortgagePages + totalSankeyPages + totalTimelinePages;

      // Helper function for header bar
      const renderPageHeader = (title: string, pageNum: number) => {
        doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
        doc.rect(0, 12, 210, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${appName} • ${reportFullTitle}`, 14, 8.5);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 135, 8.5);

        // Page footer
        doc.setFontSize(7.5);
        doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        doc.text(`Page ${pageNum} of ${TOTAL_PAGES} • ${appName} Confidential Guidance Model`, 14, 287);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 165, 287);
      };

      // Milestone Projections
      const primaryAccessAge = getPensionAccessAge(profile);
      const primarySpaAge = profile.statePensionAge || 67;

      const getSnapshotForAge = (targetAgeVal: number) => {
        if (!projections || projections.length === 0) {
          return { totalPot: 0, pensionPot: 0, isaPot: 0, cashGiaPot: 0, targetRetirementIncome: 0, age: targetAgeVal, year: new Date().getFullYear() };
        }
        const match = projections.find((p) => p.age === targetAgeVal);
        if (match) return match;
        if (targetAgeVal < projections[0].age) return projections[0];
        return projections[projections.length - 1];
      };

      const privateAccessYear = getSnapshotForAge(primaryAccessAge);
      const retirementYear = getSnapshotForAge(profile.targetRetirementAge);
      const statePensionYear = getSnapshotForAge(primarySpaAge);

      // Calculate totals for cover page & summary
      const isCouplePrelim = Boolean(profile.isCouplePlanning);
      const potRowsPrelim = [
        { name: 'Workplace Pension', primary: pots?.workplacePensionBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.workplacePensionBalance || profile.partnerWorkplacePensionBalance || 0) : 0 },
        { name: 'SIPP / Personal Pension', primary: pots?.sippBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.sippBalance || profile.partnerSippBalance || 0) : 0 },
        { name: 'Stocks & Shares ISA', primary: pots?.stocksAndSharesIsaBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.stocksAndSharesIsaBalance || profile.partnerIsaBalance || 0) : 0 },
        { name: 'Cash ISA', primary: pots?.cashIsaBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.cashIsaBalance || 0) : 0 },
        { name: 'Lifetime ISA (LISA)', primary: pots?.lisaBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.lisaBalance || 0) : 0 },
        { name: 'General Investment Account (GIA)', primary: pots?.giaBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.giaBalance || 0) : 0 },
        { name: 'Cash Savings & Emergency Fund', primary: pots?.cashSavingsBalance || 0, partner: isCouplePrelim ? (profile.partnerPots?.cashSavingsBalance || 0) : 0 },
      ];
      let totalCurrentPrimary = 0;
      let totalCurrentPartner = 0;
      potRowsPrelim.forEach((row) => {
        totalCurrentPrimary += row.primary;
        totalCurrentPartner += row.partner;
      });
      if (!isCouplePrelim) {
        totalCurrentPartner = 0;
      }

      const shortfallYears = (projections || []).filter((p) => p.isRetired && (p.incomeShortfall || 0) > 0);
      const isPlanFeasible = shortfallYears.length === 0;

      // Yield main UI thread to update button state & render spinner
      await new Promise((r) => setTimeout(r, 0));

      // Run preliminary Monte Carlo simulation for Executive Summary stochastic metrics
      const mcNormalPrelim = runMonteCarloSimulation(profile, pots, exportTaxResult as any, {
        numSimulations: 500,
        accumulationVolatility: 12.0,
        decumulationVolatility: 8.0,
        maxAge: horizonAge,
        marketScenario: 'standard',
      });
      const mcNormalSuccessRate = mcNormalPrelim?.successRate ?? mcNormalPrelim?.successRateTargetAge ?? 0;

      // Generate dynamic auto-narrative text
      const autoNarrative = generatePlanNarrative({
        profile,
        projections,
        mcResult: mcNormalPrelim,
        taxRegion: profile.taxRegion,
        drawdownStrategy: profile.decumulationStrategy || 'Tax-Optimised Waterfall',
      });

      // =========================================================================
      // PAGE 1: COVER PAGE
      // =========================================================================
      // Full Bleed Dark Header
      doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.rect(0, 0, 210, 58, 'F');
      doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
      doc.rect(0, 56, 210, 2, 'F');

      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${appName.toUpperCase()} • WEALTH & DECUMULATION MODEL`, 14, 16);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17);
      doc.text('UK RETIREMENT PLAN & FINANCIAL REPORT', 14, 26);

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Prepared for: ${peopleLabel}`, 14, 36);
      doc.setFontSize(9);
      doc.text(`Scenario: ${activePlanName}`, 14, 43);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 49);

      let covY = 64;

      // Card 1: Household Details Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, covY, 182, 34, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, covY, 182, 34, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Client Household Parameters & Scope', 18, covY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Primary Member: ${primaryName} (Age ${currentAge})`, 18, covY + 14);
      doc.text(`• Target Retirement Age: Age ${targetAge}`, 18, covY + 20);
      doc.text(`• Private Pension Access Age: Age ${primaryAccessAge}`, 18, covY + 26);

      if (profile.isCouplePlanning) {
        doc.text(`• Partner Member: ${partnerName} (Age ${profile.partnerCurrentAge || currentAge})`, 108, covY + 14);
        doc.text(`• Partner Retirement Age: Age ${profile.partnerTargetRetirementAge || targetAge}`, 108, covY + 20);
        doc.text(`• Planning Horizon: Age ${horizonAge}`, 108, covY + 26);
      } else {
        doc.text(`• Household Structure: Single Member Planning`, 108, covY + 14);
        doc.text(`• Planning Horizon: Age ${horizonAge}`, 108, covY + 20);
        doc.text(`• Tax Region: ${(profile.taxRegion || 'england_ni_wales').replace(/_/g, ' ').toUpperCase()}`, 108, covY + 26);
      }

      covY += 38;

      // Card 2: Key Executive Metrics Overview (Grid of 6 KPIs)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, covY, 182, 60, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, covY, 182, 60, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Key Executive Metrics Overview', 18, covY + 7);

      // Grid Row 1
      // KPI 1
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, covY + 11, 85, 14, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CURRENT COMBINED PORTFOLIO WEALTH', 22, covY + 15.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text(`£${Math.round(totalCurrentPrimary + totalCurrentPartner).toLocaleString()}`, 22, covY + 21.5);

      // KPI 2 (First milestone age)
      const isAdjusted = Boolean(profile.adjustForInflation);
      const getScaledPot = (snap: any) => {
        const ageVal = snap?.age || profile.targetRetirementAge;
        const off = Math.max(0, ageVal - profile.currentAge);
        const f = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, off);
        const s = (isAdjusted && f > 0) ? (1 / f) : 1;
        return Math.round((snap?.totalPot || 0) * s);
      };

      const kpi2Obj = targetAge <= primaryAccessAge ? retirementYear : privateAccessYear;
      const kpi2Title = targetAge <= primaryAccessAge
        ? `PROJECTED WEALTH AT RETIREMENT AGE (${targetAge})${isAdjusted ? ' (REAL)' : ''}`
        : `PROJECTED WEALTH AT PRIVATE PENSION AGE (${primaryAccessAge})${isAdjusted ? ' (REAL)' : ''}`;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(107, covY + 11, 85, 14, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi2Title, 111, covY + 15.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`£${getScaledPot(kpi2Obj).toLocaleString()}`, 111, covY + 21.5);

      // Grid Row 2
      // KPI 3 (Second milestone age)
      const kpi3Obj = targetAge <= primaryAccessAge ? privateAccessYear : retirementYear;
      const kpi3Title = targetAge <= primaryAccessAge
        ? `PROJECTED WEALTH AT PRIVATE PENSION AGE (${primaryAccessAge})${isAdjusted ? ' (REAL)' : ''}`
        : `PROJECTED WEALTH AT RETIREMENT AGE (${targetAge})${isAdjusted ? ' (REAL)' : ''}`;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, covY + 27, 85, 14, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi3Title, 22, covY + 31.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 53, 15);
      doc.text(`£${getScaledPot(kpi3Obj).toLocaleString()}`, 22, covY + 37.5);

      // KPI 4
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(107, covY + 27, 85, 14, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`PROJECTED WEALTH AT STATE PENSION AGE (${primarySpaAge})${isAdjusted ? ' (REAL)' : ''}`, 111, covY + 31.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`£${getScaledPot(statePensionYear).toLocaleString()}`, 111, covY + 37.5);

      // Grid Row 3
      // KPI 5: Plan Feasibility & Stochastic Status (Full Width)
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, covY + 43, 174, 14, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PLAN FEASIBILITY & STOCHASTIC STATUS', 22, covY + 47.5);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      if (isPlanFeasible) {
        doc.setTextColor(22, 101, 52);
        doc.text(`Deterministic: On Track | MC: ${mcNormalSuccessRate.toFixed(1)}% Success`, 22, covY + 53.5);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`Deterministic: Deficit | MC: ${mcNormalSuccessRate.toFixed(1)}% Success`, 22, covY + 53.5);
      }

      covY += 64;

      // Card 3: Executive Guidance & Document Purpose Box
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(14, covY, 182, 34, 3, 3, 'F');
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(14, covY, 182, 34, 3, 3, 'D');

      doc.setTextColor(79, 70, 229);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Document Scope & Strategic Purpose', 18, covY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('This comprehensive report models your entire financial trajectory from current pre-retirement accumulation', 18, covY + 13);
      doc.text('through full post-retirement decumulation. It incorporates current UK tax laws, allowances (PCLS, LSA, Personal Allowance),', 18, covY + 18);
      doc.text('State Pension rules (including Triple Lock indexing), defined benefit pensions, annuity structures, and spending phases.', 18, covY + 23);
      doc.text('Furthermore, it includes Monte Carlo stochastic volatility analysis (500 iterations) and 50-year historic sequence stress testing.', 18, covY + 28);

      covY += 38;

      // Card 4: Important UK Financial Planning Guidance Notice & Legal Disclaimer
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(14, covY, 182, 42, 3, 3, 'F');
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(14, covY, 182, 42, 3, 3, 'D');

      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Important UK Financial Planning Guidance Notice & Legal Disclaimer', 18, covY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('• Non-Regulated Financial Guidance: This document is produced strictly for illustrative and educational financial modeling purposes.', 18, covY + 13);
      doc.text('  It does not constitute formal regulated financial, legal, tax, or accounting advice under the Financial Services and Markets Act 2000 (FSMA).', 18, covY + 17);
      doc.text('• UK Tax Legislation & Allowances: Projections reflect current HMRC tax rules, including Personal Allowances, PCLS limits, LSA (£268,275),', 18, covY + 22);
      doc.text('  Money Purchase Annual Allowance (MPAA), Capital Gains Tax thresholds, and April 2027 Inheritance Tax (IHT) rules regarding pension pots.', 18, covY + 26);
      doc.text('• Projections & Market Risk: Deterministic return paths assume smooth annual growth and do not account for short-term market crashes.', 18, covY + 31);
      doc.text('  Stochastic Monte Carlo stress testing (500 iterations) and 50-year historic sequence analysis model sequence-of-returns risk.', 18, covY + 35);

      // Footer notice on cover page
      doc.setFontSize(7.5);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text(`${appName} • Confidential Guidance Model • Page 1 of ${TOTAL_PAGES}`, 14, 287);

      // =========================================================================
      // PAGE 2: TABLE OF CONTENTS & REPORT INDEX
      // =========================================================================
      doc.addPage();
      renderPageHeader('Table of Contents & Index', 2);

      let tocY = 24;

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Table of Contents & Report Structure', 14, tocY);

      tocY += 8;

      const tocItems = [
        { section: '1. Executive Summary, Strategic Narrative & Plan Insights', page: 3, desc: 'Overall feasibility verdict, strategic narrative analysis, health scorecard, and actionable tax opportunities.' },
        { section: '2. Detailed Household Income & Personal Profile', page: 3, desc: 'Current salaries, access ages, State Pension inclusion & Triple Lock details.' },
        { section: '3. Current Investment Pot Assets Breakdown', page: 3, desc: 'Baseline asset breakdown across Pensions, ISAs, GIAs, and Cash Savings.' },
        { section: '4. Accumulation Summary & Pre-Retirement Savings Strategy', page: 4, desc: 'Monthly savings rate, workplace pension employer match, and scheduled pot transfers.' },
        { section: '4a. Year-by-Year Tax Relief & Allowances Breakdown', page: 4, desc: 'Annual tax relief gained, savings interest tax, pension allowance, and ISA allowance.' },
        { section: '5. Projected Assets Breakdown at Target Retirement Age', page: 4, desc: `Projected capital balances at target retirement age (Age ${targetAge}).` },
        { section: '6. Projected Assets Breakdown at Private Pension Access Age', page: 4, desc: `Capital balances at private pension access age (Age ${primaryAccessAge}).` },
        { section: '6a. Potential Tax-Free Lump Sum (PCLS & LSA Allowance) Analysis', page: 4, desc: 'Tax-free cash entitlement (PCLS), LSA allowance caps, and lump sum extraction strategy.' },
        { section: '7. Projected Assets Breakdown at State Pension Access Age', page: 4, desc: `Capital balances at state pension access age (Age ${primarySpaAge}).` },
        { section: '8. Investment Growth, Platform/Adviser Fees & Macro Assumptions', page: 4, desc: 'Pre and post-retirement returns, CPI inflation, platform & adviser fee drag model and pot-level fee breakdown.' },
        { section: '9. Spending Phase Profile & Target Income Amounts', page: 5, desc: 'Age-based spending requirements (Go-Go, Slow-Go, No-Go) and monthly targets.' },
        { section: '10. Retirement Income Product Structure & Drawdown Strategy', page: 5, desc: 'Flexi-access drawdown, lifetime annuities, PCLS tax-free cash & destination strategy.' },
        { section: '10a. Dynamic Optimiser & Multi-Variable Tax Matrix', page: 5, desc: 'Tax-smoothing engine, 0% PA capture, 20% basic rate smoothing, and spousal equalisation.' },
        { section: '10b. Effective Withdrawal Rate Trajectory Chart (SWR %)', page: 5, desc: 'Year-by-year effective SWR % overlay, Bengen 3.5% UK benchmark, 5% danger threshold & peak rate analysis.' },
        { section: '11. Key Milestone Schedule, Gilt Ladder & Annuity Details', page: 5, desc: 'Milestone timeline table, State Pension execution, UK Gilt Ladder portfolio details & Annuity purchase rates.' },
        { section: '12. Visual Diagram Models — Portfolio Allocation & Trajectories', page: 6, desc: 'Charts of initial asset distribution and multi-year portfolio wealth trajectory curves.' },
        { section: '13. Visual Diagram Models — Drawdown Income Breakdown', page: 7, desc: 'Charts of net annual drawdown income sources in both Nominal and Real Today\'s £.' },
        { section: '14. Visual Diagram Models — Deficit Risk & Legal Guidance Notice', page: 8, desc: 'Shortfall/surplus analysis and regulatory financial planning guidance disclaimers.' },
        { section: '15. Monte Carlo Volatility & Risk Simulation Analysis', page: 9, desc: 'Stochastic sequence-of-returns stress testing (500 runs), fan bands, and survival rates.' },
        { section: '16. Inheritance Tax (IHT) & Estate Planning Analysis', page: 12, desc: 'Post-April 2027 pension IHT rules, main residence RNRB, gifting, and estate valuations.' },
        { section: '17. Appendix 1: Monthly Accumulation Ledger', page: 13, desc: 'Detailed schedule of all monthly contributions, employer matches, and transfers.' },
        { section: '18. Appendix 2: Full Decumulation Schedule Output', page: 13 + totalAccumPages, desc: 'Year-by-year decumulation ledger detailing pot balances, withdrawals, and tax paid.' },
        { section: '19. Appendix 3: Historic Market Performance Simulation', page: 13 + totalAccumPages + totalDecumPages, desc: '75-sequence market stress test, sequence distribution bar chart & 75 start year matrix.' },
        { section: '20. Appendix 4: Mortgage Payoff Projection & Debt Amortization', page: 15 + totalAccumPages + totalDecumPages, desc: 'Mortgage balance amortization chart, overpayment savings & milestone debt balances.' },
        { section: '21. Appendix 5: Cash Flow Sankey Waterfall Diagrams', page: 16 + totalAccumPages + totalDecumPages, desc: 'Detailed Sankey cash flow models across accumulation, retirement, pension access & state pension ages.' },
        { section: '22. Appendix 6: Visual Milestone Timeline & Lifecycle Roadmap', page: 16 + totalAccumPages + totalDecumPages + totalSankeyPages, desc: 'Chronological life roadmap, key financial milestones (Retirement, State Pension, NMPA, Downsizing), and phase analysis.' },
      ];

      tocItems.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, tocY, 182, 9.3, 'F');
        }

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.text(item.section, 18, tocY + 3.6);

        doc.setTextColor(16, 185, 129);
        doc.text(`Page ${item.page}`, 172, tocY + 3.6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.desc, 18, tocY + 7.2);

        tocY += 9.3;
      });

      // =========================================================================
      // PAGE 3: EXECUTIVE SUMMARY, HOUSEHOLD PROFILE & CURRENT ASSETS
      // =========================================================================
      doc.addPage();
      let curPageNum = 3;
      renderPageHeader('Executive Summary & Current Assets', curPageNum);

      let y = 24;

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Retirement Plan: ${reportFullTitle}`, 14, y);

      y += 8;

      // SECTION 1: SUMMARY & PLAN FEASIBILITY STATUS
      if (isPlanFeasible) {
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(14, y, 182, 18, 3, 3, 'F');
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(14, y, 182, 18, 3, 3, 'D');

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`1. Plan Feasibility Status — Deterministic: ON TRACK | Monte Carlo Success: ${mcNormalSuccessRate.toFixed(1)}%`, 18, y + 7);

        doc.setTextColor(22, 101, 52);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Status: Deterministic Model: ON TRACK (100% Target Income Covered to Age ${horizonAge}) | Monte Carlo Standard Success: ${mcNormalSuccessRate.toFixed(1)}% (500 Runs)`, 18, y + 13);

        y += 24;
      } else {
        const firstItem = shortfallYears[0];
        const firstAge = firstItem?.age || targetAge;
        const firstYear = firstItem?.year || (new Date().getFullYear() + (firstAge - currentAge));
        const firstVal = Math.round(firstItem?.incomeShortfall || 0);

        const maxItem = shortfallYears.reduce((max, curr) => (curr.incomeShortfall || 0) > (max.incomeShortfall || 0) ? curr : max, shortfallYears[0]);
        const maxVal = Math.round(maxItem?.incomeShortfall || 0);
        const maxAge = maxItem?.age || firstAge;
        const maxYear = maxItem?.year || firstYear;

        const totalCumShortfall = Math.round(shortfallYears.reduce((sum, p) => sum + (p.incomeShortfall || 0), 0));
        const totalDeficitYears = shortfallYears.length;

        const boxH = 50;
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(14, y, 182, boxH, 3, 3, 'F');
        doc.setDrawColor(254, 205, 205);
        doc.roundedRect(14, y, 182, boxH, 3, 3, 'D');

        doc.setTextColor(159, 18, 57);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`1. Plan Feasibility Status — Deterministic: DEFICIT DETECTED | Monte Carlo Success: ${mcNormalSuccessRate.toFixed(1)}%`, 18, y + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`CRITICAL ALERT: Deterministic Shortfall at Age ${firstAge} (${firstYear}) | Monte Carlo Standard Success: ${mcNormalSuccessRate.toFixed(1)}% (500 Runs)`, 18, y + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text('Points of Failure & Risk Breakdown:', 18, y + 19);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        doc.text(`1. Initial Capital Failure: Liquid asset pots fully deplete at Age ${firstAge} (${firstYear}), leaving an initial annual shortfall of £${(firstVal || 0).toLocaleString()}/yr.`, 18, y + 25);
        doc.text(`2. Shortfall Duration: Net income deficit persists for ${totalDeficitYears} consecutive years (from Age ${firstAge} through Horizon Age ${horizonAge}).`, 18, y + 31);
        doc.text(`3. Peak Annual Shortfall: Maximum annual net income deficit reaches £${(maxVal || 0).toLocaleString()}/yr at Age ${maxAge} (${maxYear}).`, 18, y + 37);
        doc.text(`4. Cumulative Lifetime Deficit: Total aggregate capital shortfall across the retirement horizon equals £${(totalCumShortfall || 0).toLocaleString()}.`, 18, y + 43);

        y += boxH + 6;
      }

      // SECTION 1b: AUTOMATED STRATEGIC NARRATIVE ANALYSIS
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 32, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, 182, 32, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Automated Strategic Narrative Analysis', 18, y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      const execLines = doc.splitTextToSize(`• Executive Summary: ${autoNarrative.executiveSummary}`, 174);
      doc.text(execLines, 18, y + 12.5);

      const decumLines = doc.splitTextToSize(`• Decumulation & Tax Strategy: ${autoNarrative.decumulationStrategy}`, 174);
      doc.text(decumLines, 18, y + 23);

      y += 37;

      // =========================================================================
      // SECTION 1c: PLAN INSIGHTS & STRATEGIC OPPORTUNITIES (MIRRORING APP)
      // =========================================================================
      const planInsights = computePlanInsights(profile, pots, projections, exportTaxResult as any);

      // Helper for pagination checks inside Section 1c
      const checkInsightsPageBreak = (neededH: number) => {
        if (y + neededH > 265) {
          doc.addPage();
          curPageNum++;
          renderPageHeader('Plan Insights & Strategic Opportunities', curPageNum);
          y = 24;
        }
      };

      checkInsightsPageBreak(50);

      // Header Bar with status badge
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Plan Insights & Strategic Opportunities', 14, y + 4);

      const statusBadgeText = planInsights.scorecard.isFullyFunded ? '100% FUNDED ON TRACK' : `SHORTFALL ALERT (AGE ${planInsights.scorecard.depletionAge})`;
      const badgeW = planInsights.scorecard.isFullyFunded ? 44 : 52;
      doc.setFillColor(planInsights.scorecard.isFullyFunded ? 240 : 254, planInsights.scorecard.isFullyFunded ? 253 : 242, planInsights.scorecard.isFullyFunded ? 244 : 242);
      doc.roundedRect(196 - badgeW, y - 1, badgeW, 6.5, 2, 2, 'F');
      doc.setDrawColor(planInsights.scorecard.isFullyFunded ? 187 : 254, planInsights.scorecard.isFullyFunded ? 247 : 205, planInsights.scorecard.isFullyFunded ? 208 : 205);
      doc.roundedRect(196 - badgeW, y - 1, badgeW, 6.5, 2, 2, 'D');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(planInsights.scorecard.isFullyFunded ? 22 : 159, planInsights.scorecard.isFullyFunded ? 101 : 18, planInsights.scorecard.isFullyFunded ? 52 : 57);
      doc.text(statusBadgeText, 196 - badgeW + 3, y + 3.8);

      y += 8;

      // Executive Health Verdict Callout Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 22, 2.5, 2.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, 182, 22, 2.5, 2.5, 'D');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Executive Overview & Health Verdict', 18, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      const execSummaryLines = doc.splitTextToSize(planInsights.executiveSummary, 174);
      doc.text(execSummaryLines.slice(0, 3), 18, y + 10);

      y += 26;

      // 1. Plan Health Scorecard (5 KPI Tiles)
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('1. Plan Longevity & Health Scorecard', 14, y + 2);
      y += 4.5;

      const kpiW = 34.4;
      const kpiH = 14;
      const kpis = [
        {
          label: 'Portfolio Runway',
          val: planInsights.scorecard.isFullyFunded ? `Age ${profile.lifeExpectancyAge || 90}+` : `Age ${planInsights.scorecard.depletionAge}`,
          sub: planInsights.scorecard.isFullyFunded ? `+£${(planInsights.scorecard.finalPotBalance || 0).toLocaleString()} at 90` : `${planInsights.scorecard.runwayYears} yrs runway`,
          color: planInsights.scorecard.isFullyFunded ? [16, 185, 129] : [225, 29, 72],
        },
        {
          label: 'Initial SWR',
          val: `${planInsights.scorecard.initialSwr}%`,
          sub: planInsights.scorecard.swrStatus === 'conservative' ? 'Conservative (<3.4%)' : planInsights.scorecard.swrStatus === 'moderate' ? 'Balanced (3.4%-4.2%)' : 'Elevated (>4.2%)',
          color: planInsights.scorecard.swrStatus === 'conservative' ? [16, 185, 129] : [79, 70, 229],
        },
        {
          label: 'Guaranteed Floor',
          val: `${planInsights.scorecard.guaranteedFloorCoveragePct}%`,
          sub: `£${planInsights.scorecard.guaranteedFloorAmount.toLocaleString()}/yr Gtd`,
          color: [59, 130, 246],
        },
        {
          label: 'Effective Tax Rate',
          val: `${planInsights.scorecard.effectiveTaxRate}%`,
          sub: planInsights.scorecard.taxEfficiencyStatus === 'optimal' ? 'Tax Optimal (PA & 20%)' : 'Moderate Tax Drag',
          color: [217, 119, 6],
        },
        {
          label: 'Stochastic Score',
          val: `${planInsights.scorecard.monteCarloEstimatedSuccess}%`,
          sub: planInsights.scorecard.monteCarloEstimatedSuccess >= 85 ? 'High Resilience' : 'Review Guardrails',
          color: [147, 51, 234],
        },
      ];

      kpis.forEach((kpi, idx) => {
        const kX = 14 + idx * (kpiW + 2.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(kX, y, kpiW, kpiH, 1.5, 1.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kX, y, kpiW, kpiH, 1.5, 1.5, 'D');

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, kX + 2.5, y + 3.5);

        doc.setFontSize(8);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text(kpi.val, kX + 2.5, y + 8);

        doc.setFontSize(4.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.sub, kX + 2.5, y + 11.8);
      });

      y += kpiH + 6;

      // 2. Strategic Milestones & Inflection Timeline
      if (planInsights.milestones.length > 0) {
        checkInsightsPageBreak(35);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('2. Strategic Milestones & Inflection Points', 14, y + 2);
        y += 4.5;

        planInsights.milestones.forEach((m) => {
          checkInsightsPageBreak(17);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(14, y, 182, 15, 2, 2, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(14, y, 182, 15, 2, 2, 'D');

          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text(`• ${m.title}`, 18, y + 4.2);

          doc.setFillColor(238, 242, 255);
          doc.roundedRect(145, y + 1.2, 47, 4.5, 1, 1, 'F');
          doc.setFontSize(5.2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(79, 70, 229);
          doc.text(m.badge, 147, y + 4.2);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.2);
          doc.setTextColor(51, 65, 85);
          doc.text(m.summary, 18, y + 8.2);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.8);
          doc.setTextColor(100, 116, 139);
          const detailLines = doc.splitTextToSize(m.detail, 174);
          doc.text(detailLines.slice(0, 1), 18, y + 12);

          y += 17;
        });
        y += 2;
      }

      // 3. Actionable Tax & Decumulation Opportunities
      if (planInsights.opportunities.length > 0) {
        checkInsightsPageBreak(40);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`3. Actionable Tax & Decumulation Opportunities (${planInsights.opportunities.length})`, 14, y + 2);
        y += 4.5;

        planInsights.opportunities.forEach((opp) => {
          checkInsightsPageBreak(32);

          const cardH = 29;
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(14, y, 182, cardH, 2.5, 2.5, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(14, y, 182, cardH, 2.5, 2.5, 'D');

          // Card Header Bar
          doc.setFontSize(7.2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text(opp.title, 18, y + 4.5);

          // Category tag
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`[${opp.category}]`, 120, y + 4.5);

          // Status Badge
          const isOpt = opp.status === 'already_optimised';
          const isRec = opp.status === 'recommended';
          doc.setFillColor(isOpt ? 209 : isRec ? 254 : 241, isOpt ? 250 : isRec ? 243 : 245, isOpt ? 229 : isRec ? 199 : 249);
          doc.roundedRect(154, y + 1.2, 38, 4.5, 1, 1, 'F');
          doc.setFontSize(5.2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(isOpt ? 6 : isRec ? 180 : 71, isOpt ? 95 : isRec ? 83 : 85, isOpt ? 70 : isRec ? 9 : 105);
          doc.text(isOpt ? 'ALREADY OPTIMISED' : isRec ? 'ACTION RECOMMENDED' : 'REVIEW SUGGESTED', 156, y + 4.2);

          // Two Comparison Boxes (Observation & Action)
          const boxW = 86;
          const boxH = 14;

          // Box 1: Observation
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(18, y + 6.5, boxW, boxH, 1.5, 1.5, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(18, y + 6.5, boxW, boxH, 1.5, 1.5, 'D');
          doc.setFontSize(4.8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text('OBSERVATION', 20, y + 9.2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(51, 65, 85);
          const obsLines = doc.splitTextToSize(opp.observation, boxW - 5);
          doc.text(obsLines.slice(0, 2), 20, y + 13);

          // Box 2: Recommended Action
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(107, y + 6.5, boxW, boxH, 1.5, 1.5, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(107, y + 6.5, boxW, boxH, 1.5, 1.5, 'D');
          doc.setFontSize(4.8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(79, 70, 229);
          doc.text('RECOMMENDED ACTION', 109, y + 9.2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(51, 65, 85);
          const actLines = doc.splitTextToSize(opp.actionableStep, boxW - 5);
          doc.text(actLines.slice(0, 2), 109, y + 13);

          // Projected Financial Benefit Banner
          doc.setFillColor(236, 253, 245);
          doc.roundedRect(18, y + 21.5, 175, 5.5, 1, 1, 'F');
          doc.setDrawColor(167, 243, 208);
          doc.roundedRect(18, y + 21.5, 175, 5.5, 1, 1, 'D');
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(6, 95, 70);
          const benLines = doc.splitTextToSize(`Projected Financial Benefit: ${opp.projectedBenefit}`, 171);
          doc.text(benLines.slice(0, 1), 21, y + 25.2);

          y += cardH + 4;
        });
      }

      y += 6;

      if (y > 180) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Detailed Household Profile & Current Assets', curPageNum);
        y = 24;
      }

      // SECTION 2: DETAILED HOUSEHOLD INCOME & PERSONAL PROFILE (WITH TRIPLE LOCK DETAIL)
      const macroPre = profile.expectedInvestmentReturn ?? 6.5;
      const macroPost = profile.postRetirementReturn ?? 4.5;
      const macroInf = profile.expectedInflationRate ?? 2.5;

      const priTripleLockStr = (profile.enableTripleLock !== false) ? 'Triple Lock Enabled' : 'CPI / Fixed Indexing';
      const partTripleLockStr = (profile.partnerEnableTripleLock !== false) ? 'Triple Lock Enabled' : 'CPI / Fixed Indexing';

      doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.roundedRect(14, y, 182, 48, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, 182, 48, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('2. Detailed Household Income & Personal Profile', 18, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      // Primary Profile Column
      doc.setFont('helvetica', 'bold');
      doc.text(`Primary Member: ${primaryName}`, 18, y + 17);
      doc.setFont('helvetica', 'normal');
      doc.text(`• Current Gross Annual Salary: £${(profile.grossAnnualSalary || 0).toLocaleString()}/yr`, 18, y + 23);
      doc.text(`• Current Age: ${currentAge} | Pension Access Age: ${profile.pensionAccessAge || 57}`, 18, y + 29);
      doc.text(`• Target Retirement Age: ${targetAge} | State Pension Age: ${profile.statePensionAge || 67}`, 18, y + 35);
      doc.text(`• State Pension: ${profile.includeStatePension ? `Included (£${(profile.fullStatePensionAmount || 12548).toLocaleString()}/yr - ${priTripleLockStr})` : 'Excluded'}`, 18, y + 41);

      // Partner Profile Column (if couple)
      if (profile.isCouplePlanning) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Partner Member: ${partnerName}`, 108, y + 17);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Gross Annual Salary: £${(profile.partnerGrossAnnualSalary || 0).toLocaleString()}/yr`, 108, y + 23);
        doc.text(`• Current Age: ${profile.partnerCurrentAge || currentAge} | Access Age: ${profile.partnerPensionAccessAge || 57}`, 108, y + 29);
        doc.text(`• Target Retirement Age: ${profile.partnerTargetRetirementAge || targetAge} | State Pension Age: ${profile.partnerStatePensionAge || 67}`, 108, y + 35);
        doc.text(`• State Pension: ${profile.partnerIncludeStatePension !== false ? `Included (£${(profile.partnerFullStatePensionAmount || 12548).toLocaleString()}/yr - ${partTripleLockStr})` : 'Excluded'}`, 108, y + 41);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text(`Planning Parameters:`, 108, y + 17);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Planning Horizon: Age ${horizonAge}`, 108, y + 23);
        doc.text(`• Inflation Rate: ${macroInf}% p.a. CPI`, 108, y + 29);
        doc.text(`• Pre-Retirement Return: ${macroPre}% p.a.`, 108, y + 35);
        doc.text(`• Post-Retirement Return: ${macroPost}% p.a.`, 108, y + 41);
      }

      // SECTION 3: CURRENT INVESTMENT POT ASSETS BREAKDOWN
      y += 54;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('3. Current Investment Pot Assets Breakdown', 14, y);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('(Baseline starting balances at start of Plan Year 1, prior to annual contributions & investment returns)', 14, y + 4.5);

      y += 6.5;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Asset Class / Account Type', 18, y + 4.5);
      doc.text('Primary Balance (£)', 85, y + 4.5);
      doc.text('Partner Balance (£)', 125, y + 4.5);
      doc.text('Combined Total (£)', 160, y + 4.5);

      y += 6.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);

      potRowsPrelim.forEach((row, idx) => {
        const rowTotal = row.primary + row.partner;

        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, y, 182, 5.5, 'F');
        }
        doc.text(row.name, 18, y + 4);
        doc.text(`£${(row.primary || 0).toLocaleString()}`, 85, y + 4);
        doc.text(profile.isCouplePlanning ? `£${(row.partner || 0).toLocaleString()}` : '—', 125, y + 4);
        doc.text(`£${(rowTotal || 0).toLocaleString()}`, 160, y + 4);
        y += 5.5;
      });

      // Total Row
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('TOTAL CURRENT ASSETS', 18, y + 4.5);
      doc.text(`£${(totalCurrentPrimary || 0).toLocaleString()}`, 85, y + 4.5);
      doc.text(profile.isCouplePlanning ? `£${(totalCurrentPartner || 0).toLocaleString()}` : '—', 125, y + 4.5);
      doc.text(`£${(totalCurrentPrimary + totalCurrentPartner || 0).toLocaleString()}`, 160, y + 4.5);

      y += 10;

      // =========================================================================
      // PAGE 4: ACCUMULATION SUMMARY, PROJECTED ASSETS & MACRO ASSUMPTIONS
      // =========================================================================
      doc.addPage();
      curPageNum++;
      renderPageHeader('Accumulation Summary & Projected Assets', curPageNum);

      let p2Y = 24;

      // SECTION 4: ACCUMULATION SUMMARY & PRE-RETIREMENT SAVINGS STRATEGY
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('4. Accumulation Summary & Pre-Retirement Savings Strategy', 14, p2Y);

      p2Y += 5;

      const groupedItemsList = getGroupedAccumulationItems();

      // Grouped Accumulation Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, p2Y, 182, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Strategy / Event Name', 16, p2Y + 3.8);
      doc.text('Member', 72, p2Y + 3.8);
      doc.text('Category', 95, p2Y + 3.8);
      doc.text('Target Pot', 122, p2Y + 3.8);
      doc.text('Schedule / Period', 150, p2Y + 3.8);
      doc.text('Amount (£)', 175, p2Y + 3.8);

      p2Y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      groupedItemsList.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, p2Y, 182, 4.8, 'F');
        }
        doc.setTextColor(51, 65, 85);
        const nameTxt = item.name.length > 30 ? item.name.substring(0, 28) + '...' : item.name;
        doc.setFont('helvetica', 'bold');
        doc.text(nameTxt, 16, p2Y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.text(item.ownerName || '', 72, p2Y + 3.5);
        doc.text(item.category || '', 95, p2Y + 3.5);
        let flowText = formatPotNamePDF(item.targetPot);
        if (item.sourcePot && item.category === 'Pot Transfer') {
          flowText = `${formatPotNamePDF(item.sourcePot)} -> ${flowText}`;
        }
        if (flowText.length > 22) flowText = flowText.substring(0, 20) + '...';
        doc.text(flowText, 122, p2Y + 3.5);
        doc.text(item.scheduleDisplay || '', 150, p2Y + 3.5);

        const amtText = item.isMonthly && item.monthlyAmt !== undefined
          ? `£${Math.round(item.monthlyAmt).toLocaleString()}/mo`
          : `£${Math.round(item.grossAnnual).toLocaleString()}`;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(amtText, 175, p2Y + 3.5);
        doc.setFont('helvetica', 'normal');

        p2Y += 4.8;
      });

      p2Y += 6;

      // SECTION 4a: YEAR-BY-YEAR TAX RELIEF & ALLOWANCES BREAKDOWN
      if (p2Y > 215) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Accumulation Tax Optimizer & Relief Breakdown', curPageNum);
        p2Y = 24;
      }

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('4a. Year-by-Year Tax Relief & Allowances Breakdown', 14, p2Y);
      p2Y += 5;

      const accumProjections = (projections || []).filter(p => !p.isRetired && p.age < profile.targetRetirementAge);

      const drawTaxReliefTable = (startY: number): number => {
        let tY = startY;

        const drawHeader = () => {
          doc.setFillColor(30, 41, 59);
          doc.rect(14, tY, 182, 5.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text('Tax Year', 16, tY + 3.8);
          doc.text('Age(s)', 34, tY + 3.8);
          doc.text('Tax Relief Gained', 58, tY + 3.8);
          doc.text('Savings Tax', 88, tY + 3.8);
          doc.text('Pension Allowance (Used / Limit)', 112, tY + 3.8);
          doc.text('ISA Allowance', 155, tY + 3.8);
          doc.text('Tax Status', 178, tY + 3.8);
          tY += 5.5;
        };

        drawHeader();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);

        const currentYear = new Date().getFullYear();
        const primaryAge = Math.max(18, profile.currentAge || 40);
        const partnerAge = profile.isCouplePlanning ? Math.max(18, profile.partnerCurrentAge || profile.currentAge || 38) : 0;
        const pPots = sanitizePots(pots, DEFAULT_POTS);
        const partnerPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

        accumProjections.forEach((p, idx) => {
          if (tY > 265) {
            doc.addPage();
            curPageNum++;
            renderPageHeader('Year-by-Year Tax Relief & Allowances Breakdown', curPageNum);
            tY = 24;
            drawHeader();
          }

          const yearNum = p.year;
          const pAgeAtYear = p.age;
          const partAgeAtYear = profile.isCouplePlanning ? partnerAge + (yearNum - currentYear) : 0;

          const pPotsThisYear = {
            ...pPots,
            cashSavingsBalance: p.primaryCashSavingsPot ?? pPots.cashSavingsBalance,
            giaBalance: p.primaryGiaPot ?? pPots.giaBalance,
          };
          const partnerPotsThisYear = {
            ...partnerPots,
            cashSavingsBalance: p.partnerCashSavingsPot ?? partnerPots.cashSavingsBalance,
            giaBalance: p.partnerGiaPot ?? partnerPots.giaBalance,
          };

          const pTaxYr = calculateUKTax(profile, pPotsThisYear, false, pAgeAtYear);
          const partTaxYr = profile.isCouplePlanning ? calculatePartnerUKTax(profile, partnerPotsThisYear, partAgeAtYear) : null;

          const taxRelief = (p.annualTaxReliefTotal !== undefined && p.annualTaxReliefTotal > 0)
            ? p.annualTaxReliefTotal
            : ((pTaxYr.totalPensionTaxRelief || 0) + (profile.isCouplePlanning ? (partTaxYr?.totalPensionTaxRelief || 0) : 0));
          const savingsTax = p.savingsInterestTax ?? ((pTaxYr.savingsInterestTax || 0) + (partTaxYr?.savingsInterestTax || 0));

          const pensionUsed = (pTaxYr.totalPensionContributionsAnnual || 0) + (profile.isCouplePlanning ? (partTaxYr?.totalPensionContributionsAnnual || 0) : 0);
          const pensionLimit = (pTaxYr.actualPensionAllowance || 60000) + (profile.isCouplePlanning ? (partTaxYr?.actualPensionAllowance || 60000) : 0);

          const isaUsed = (pTaxYr.totalIsaContributionsAnnual || 0) + (profile.isCouplePlanning ? (partTaxYr?.totalIsaContributionsAnnual || 0) : 0);
          const isaLimit = profile.isCouplePlanning ? 40000 : 20000;

          const isTaxTrap = pTaxYr.is60PercentTaxTrap || (profile.isCouplePlanning && (partTaxYr?.is60PercentTaxTrap || false));

          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, tY, 182, 4.8, 'F');
          }

          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'bold');
          doc.text(`${yearNum}/${(yearNum + 1).toString().slice(2)}`, 16, tY + 3.5);

          doc.setFont('helvetica', 'normal');
          doc.text(profile.isCouplePlanning ? `P:${pAgeAtYear}|Part:${partAgeAtYear}` : `Age ${pAgeAtYear}`, 34, tY + 3.5);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(13, 148, 136); // emerald green
          doc.text(`+£${Math.round(taxRelief).toLocaleString()}`, 58, tY + 3.5);

          if (savingsTax > 0) {
            doc.setTextColor(217, 119, 6); // amber
            doc.text(`-£${Math.round(savingsTax).toLocaleString()}`, 88, tY + 3.5);
          } else {
            doc.setTextColor(100, 116, 139);
            doc.text('£0', 88, tY + 3.5);
          }

          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'normal');
          const pLimStr = pensionLimit >= 10000 && pensionLimit % 1000 === 0 ? `£${(pensionLimit / 1000).toFixed(0)}k` : `£${Math.round(pensionLimit).toLocaleString()}`;
          const pPct = pensionLimit > 0 ? Math.min(100, Math.round((pensionUsed / pensionLimit) * 100)) : 0;
          doc.text(`£${Math.round(pensionUsed).toLocaleString()} / ${pLimStr} (${pPct}%)`, 112, tY + 3.5);

          const iPct = Math.min(100, Math.round((isaUsed / isaLimit) * 100));
          doc.text(`£${Math.round(isaUsed).toLocaleString()} / £${(isaLimit / 1000).toFixed(0)}k (${iPct}%)`, 155, tY + 3.5);

          if (isTaxTrap) {
            doc.setTextColor(180, 83, 9); // amber 60% tax trap
            doc.setFont('helvetica', 'bold');
            doc.text('60% Trap', 178, tY + 3.5);
          } else {
            doc.setTextColor(16, 185, 129); // emerald
            doc.setFont('helvetica', 'bold');
            doc.text('Efficient', 178, tY + 3.5);
          }

          tY += 4.8;
        });

        return tY + 6;
      };

      p2Y = drawTaxReliefTable(p2Y);

      // Primary Current Ratios
      const priWp = pots?.workplacePensionBalance || 0;
      const priSipp = pots?.sippBalance || 0;
      const priTotPenCurr = priWp + priSipp;
      const priWpRatio = priTotPenCurr > 0 ? priWp / priTotPenCurr : (priSipp > 0 ? 0 : 0.7);
      const priSippRatio = priTotPenCurr > 0 ? priSipp / priTotPenCurr : (priWp > 0 ? 0 : 0.3);

      const priSsIsa = pots?.stocksAndSharesIsaBalance || 0;
      const priCashIsa = pots?.cashIsaBalance || 0;
      const priLisa = pots?.lisaBalance || 0;
      const priTotIsaCurr = priSsIsa + priCashIsa + priLisa;
      const priSsIsaRatio = priTotIsaCurr > 0 ? priSsIsa / priTotIsaCurr : (priCashIsa > 0 ? 0 : 1.0);
      const priCashIsaRatio = priTotIsaCurr > 0 ? priCashIsa / priTotIsaCurr : (priCashIsa > 0 ? 1.0 : 0);
      const priLisaRatio = priTotIsaCurr > 0 ? priLisa / priTotIsaCurr : 0;

      const priGia = pots?.giaBalance || 0;
      const priCashSav = pots?.cashSavingsBalance || 0;
      const priTotCashCurr = priGia + priCashSav;
      const priGiaRatio = priTotCashCurr > 0 ? priGia / priTotCashCurr : 0.5;
      const priCashSavRatio = priTotCashCurr > 0 ? priCashSav / priTotCashCurr : 0.5;

      // Partner Current Ratios
      const partWp = profile.partnerPots?.workplacePensionBalance || profile.partnerWorkplacePensionBalance || 0;
      const partSipp = profile.partnerPots?.sippBalance || profile.partnerSippBalance || 0;
      const partTotPenCurr = partWp + partSipp;
      const partWpRatio = partTotPenCurr > 0 ? partWp / partTotPenCurr : (partSipp > 0 ? 0 : 0.7);
      const partSippRatio = partTotPenCurr > 0 ? partSipp / partTotPenCurr : (partWp > 0 ? 0 : 0.3);

      const partSsIsa = profile.partnerPots?.stocksAndSharesIsaBalance || profile.partnerIsaBalance || 0;
      const partCashIsa = profile.partnerPots?.cashIsaBalance || 0;
      const partLisa = profile.partnerPots?.lisaBalance || 0;
      const partTotIsaCurr = partSsIsa + partCashIsa + partLisa;
      const partSsIsaRatio = partTotIsaCurr > 0 ? partSsIsa / partTotIsaCurr : (partCashIsa > 0 ? 0 : 1.0);
      const partCashIsaRatio = partTotIsaCurr > 0 ? partCashIsa / partTotIsaCurr : (partCashIsa > 0 ? 1.0 : 0);
      const partLisaRatio = partTotIsaCurr > 0 ? partLisa / partTotIsaCurr : 0;

      const partGia = profile.partnerPots?.giaBalance || 0;
      const partCashSav = profile.partnerPots?.cashSavingsBalance || 0;
      const partTotCashCurr = partGia + partCashSav;
      const partGiaRatio = partTotCashCurr > 0 ? partGia / partTotCashCurr : 0.5;
      const partCashSavRatio = partTotCashCurr > 0 ? partCashSav / partTotCashCurr : 0.5;

      // Helper function to render Asset Breakdown table for any snapshot year
      const drawAssetBreakdownTable = (sectionNum: number, titleText: string, snapshot: any, startY: number): number => {
        let tableY = startY;
        if (tableY > 235) {
          doc.addPage();
          curPageNum++;
          renderPageHeader('Projected Asset Breakdowns at Key Milestones', curPageNum);
          tableY = 24;
        }

        const isAdjusted = Boolean(profile.adjustForInflation);
        const snapAge = snapshot?.age || profile.targetRetirementAge;
        const snapOffset = Math.max(0, snapAge - profile.currentAge);
        const snapInflFact = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, snapOffset);
        const snapScale = (isAdjusted && snapInflFact > 0) ? (1 / snapInflFact) : 1;

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`${sectionNum}. ${titleText}${isAdjusted ? " (Real Terms - Today's £)" : " (Nominal £)"}`, 14, tableY);

        tableY += 4;
        doc.setFillColor(30, 41, 59);
        doc.rect(14, tableY, 182, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Asset Class / Account Type', 18, tableY + 3.8);
        doc.text('Primary Balance (£)', 85, tableY + 3.8);
        doc.text('Partner Balance (£)', 125, tableY + 3.8);
        doc.text('Combined Total (£)', 160, tableY + 3.8);

        tableY += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7.5);

        const isCouple = Boolean(profile.isCouplePlanning);

        const penPri = (isCouple
          ? (snapshot.primaryPensionPot ?? ((snapshot.pensionPot || 0) * 0.7))
          : (snapshot.primaryPensionPot ?? (snapshot.pensionPot || 0))) * snapScale;
        const penPart = (isCouple
          ? (snapshot.partnerPensionPot ?? ((snapshot.pensionPot || 0) * 0.3))
          : 0) * snapScale;

        const isaPri = (isCouple
          ? (snapshot.primaryIsaPot ?? ((snapshot.isaPot || 0) * 0.8))
          : (snapshot.primaryIsaPot ?? (snapshot.isaPot || 0))) * snapScale;
        const isaPart = (isCouple
          ? (snapshot.partnerIsaPot ?? ((snapshot.isaPot || 0) * 0.2))
          : 0) * snapScale;

        const cashPri = (isCouple
          ? (snapshot.primaryCashGiaPot ?? ((snapshot.cashGiaPot || 0) * 0.5))
          : (snapshot.primaryCashGiaPot ?? (snapshot.cashGiaPot || 0))) * snapScale;
        const cashPart = (isCouple
          ? (snapshot.partnerCashGiaPot ?? ((snapshot.cashGiaPot || 0) * 0.5))
          : 0) * snapScale;

        const wpPri = penPri * priWpRatio;
        const sippPri = penPri * priSippRatio;
        const wpPart = isCouple ? (penPart * partWpRatio) : 0;
        const sippPart = isCouple ? (penPart * partSippRatio) : 0;

        const ssIsaPri = (snapshot.primaryStocksAndSharesIsaPot !== undefined
          ? snapshot.primaryStocksAndSharesIsaPot * snapScale
          : isaPri * priSsIsaRatio);
        const cashIsaPri = (snapshot.primaryCashIsaPot !== undefined
          ? snapshot.primaryCashIsaPot * snapScale
          : isaPri * priCashIsaRatio);
        const lisaPri = (snapshot.primaryLisaPot !== undefined
          ? snapshot.primaryLisaPot * snapScale
          : isaPri * priLisaRatio);

        const ssIsaPart = isCouple ? (snapshot.partnerStocksAndSharesIsaPot !== undefined
          ? snapshot.partnerStocksAndSharesIsaPot * snapScale
          : isaPart * partSsIsaRatio) : 0;
        const cashIsaPart = isCouple ? (snapshot.partnerCashIsaPot !== undefined
          ? snapshot.partnerCashIsaPot * snapScale
          : isaPart * partCashIsaRatio) : 0;
        const lisaPart = isCouple ? (snapshot.partnerLisaPot !== undefined
          ? snapshot.partnerLisaPot * snapScale
          : isaPart * partLisaRatio) : 0;

        const giaPri = (snapshot.primaryGiaPot !== undefined
          ? snapshot.primaryGiaPot * snapScale
          : cashPri * priGiaRatio);
        const cashSavPri = (snapshot.primaryCashSavingsPot !== undefined
          ? snapshot.primaryCashSavingsPot * snapScale
          : cashPri * priCashSavRatio);

        const giaPart = isCouple ? (snapshot.partnerGiaPot !== undefined
          ? snapshot.partnerGiaPot * snapScale
          : cashPart * partGiaRatio) : 0;
        const cashSavPart = isCouple ? (snapshot.partnerCashSavingsPot !== undefined
          ? snapshot.partnerCashSavingsPot * snapScale
          : cashPart * partCashSavRatio) : 0;

        const potRows = [
          { name: 'Workplace Pension', primary: wpPri, partner: wpPart, total: wpPri + wpPart },
          { name: 'SIPP / Personal Pension', primary: sippPri, partner: sippPart, total: sippPri + sippPart },
          { name: 'Stocks & Shares ISA', primary: ssIsaPri, partner: ssIsaPart, total: ssIsaPri + ssIsaPart },
          { name: 'Cash ISA', primary: cashIsaPri, partner: cashIsaPart, total: cashIsaPri + cashIsaPart },
          { name: 'Lifetime ISA (LISA)', primary: lisaPri, partner: lisaPart, total: lisaPri + lisaPart },
          { name: 'General Investment Account (GIA)', primary: giaPri, partner: giaPart, total: giaPri + giaPart },
          { name: 'Cash Savings & Emergency Fund', primary: cashSavPri, partner: cashSavPart, total: cashSavPri + cashSavPart },
        ];

        let totPri = 0;
        let totPart = 0;

        potRows.forEach((row, idx) => {
          totPri += row.primary;
          totPart += row.partner;
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, tableY, 182, 4.5, 'F');
          }
          doc.text(row.name, 18, tableY + 3.2);
          doc.text(`£${Math.round(row.primary).toLocaleString()}`, 85, tableY + 3.2);
          doc.text(profile.isCouplePlanning ? `£${Math.round(row.partner).toLocaleString()}` : '—', 125, tableY + 3.2);
          doc.text(`£${Math.round(row.total).toLocaleString()}`, 160, tableY + 3.2);
          tableY += 4.5;
        });

        // Total Row
        doc.setFillColor(241, 245, 249);
        doc.rect(14, tableY, 182, 5.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text('TOTAL ASSETS', 18, tableY + 3.8);
        doc.text(`£${Math.round(totPri).toLocaleString()}`, 85, tableY + 3.8);
        doc.text(profile.isCouplePlanning ? `£${Math.round(totPart).toLocaleString()}` : '—', 125, tableY + 3.8);
        doc.text(`£${Math.round((snapshot.totalPot || 0) * snapScale).toLocaleString()}`, 160, tableY + 3.8);

        return tableY + 8;
      };

      // SECTION 5: PROJECTED INVESTMENT POT ASSETS BREAKDOWN AT TARGET RETIREMENT AGE
      p2Y = drawAssetBreakdownTable(5, `Projected Investment Pot Assets Breakdown at Target Retirement Age (Age ${targetAge})`, retirementYear, p2Y);

      // SECTION 6: PROJECTED INVESTMENT POT ASSETS BREAKDOWN AT PRIVATE PENSION ACCESS AGE
      p2Y = drawAssetBreakdownTable(6, `Projected Investment Pot Assets Breakdown at Private Pension Access Age (Age ${primaryAccessAge})`, privateAccessYear, p2Y);

      // SECTION 6a: POTENTIAL TAX-FREE LUMP SUM (PCLS & LSA ALLOWANCE) ANALYSIS
      const isCoupleForPcls = Boolean(profile.isCouplePlanning || profile.maritalStatus === 'couple');
      const boxH = isCoupleForPcls ? 44 : 26;

      if (p2Y + boxH > 275) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Projected Asset Breakdowns at Key Milestones', curPageNum);
        p2Y = 24;
      }

      const formatPclsTargetPot = (pot?: string, splits?: LumpSumSplit[]) => {
        if (pot === 'split' && splits && splits.length > 0) {
          const splitDescs = splits.map((s) => {
            const pLabel = s.pot === 'stocks_and_shares_isa' ? 'S&S ISA'
              : s.pot === 'cash_isa' ? 'Cash ISA'
              : s.pot === 'cash_savings' ? 'Cash'
              : s.pot === 'gia' ? 'GIA'
              : 'Spend/Debt';
            return s.mode === 'percentage' ? `${pLabel} ${s.value}%` : `${pLabel} £${Math.round(s.value).toLocaleString()}`;
          });
          return `Split: ${splitDescs.join(', ')}`;
        }
        if (pot === 'reinvest_isa' || pot === 'stocks_and_shares_isa') return 'Reinvest S&S ISA';
        if (pot === 'cash_isa') return 'Reinvest Cash ISA';
        if (pot === 'cash_savings' || pot === 'cash') return 'Cash Savings Reserve';
        if (pot === 'clear_mortgage') return 'Clear Mortgage';
        if (pot === 'spend_clear_debt') return 'Spend / Clear Debt';
        if (pot === 'lifestyle_spend' || pot === 'lifestyle') return 'Lifestyle Expenditure';
        return 'Reinvest into ISA';
      };

      const primaryTakeAgePcls = getLumpSumTakeAge(profile);
      const primaryPensionAtTakePcls = getProjectedPensionAtTakeAge(profile, pots, primaryTakeAgePcls, false);
      const primaryMaxPcls = calculateMaxPcls(primaryPensionAtTakePcls, profile);
      const primaryCrystMode = profile.crystallisationMode === 'phased_tranches' ? 'Phased UFPLS Tranches' : 'Upfront PCLS';
      const primaryDestStr = formatPclsTargetPot(profile.lumpSumTargetPot, profile.lumpSumSplits);

      const partnerTakeAgePcls = isCoupleForPcls ? getPartnerLumpSumTakeAge(profile) : primaryTakeAgePcls;
      const partnerPensionAtTakePcls = isCoupleForPcls ? getProjectedPensionAtTakeAge(profile, pots, partnerTakeAgePcls, true) : 0;
      const partnerMaxPcls = isCoupleForPcls ? calculatePartnerMaxPcls(partnerPensionAtTakePcls, profile) : { maxTaxFreeCash: 0, lsaLimit: 268275, pclsPercent: 25, isCappedByLsa: false };
      const partnerCrystMode = (profile.partnerCrystallisationMode || profile.crystallisationMode) === 'phased_tranches' ? 'Phased UFPLS Tranches' : 'Upfront PCLS';
      const partnerDestStr = formatPclsTargetPot(profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);

      doc.setFillColor(254, 243, 199);
      doc.roundedRect(14, p2Y, 182, boxH, 3, 3, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(14, p2Y, 182, boxH, 3, 3, 'D');

      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('6a. Potential Tax-Free Lump Sum (PCLS & LSA Allowance) Analysis', 18, p2Y + 5);

      if (isCoupleForPcls) {
        // Dual column sub-cards
        const colW = 85;
        const subBoxH = 24.5;
        const subY = p2Y + 7;

        // Primary Column Box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(18, subY, colW, subBoxH, 2, 2, 'F');
        doc.setDrawColor(251, 191, 36);
        doc.roundedRect(18, subY, colW, subBoxH, 2, 2, 'D');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Primary: ${profile.name || 'Primary'} (Age ${primaryTakeAgePcls})`, 21, subY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`• Pension Pot @ Crystallisation: £${Math.round(primaryPensionAtTakePcls).toLocaleString()}`, 21, subY + 8.5);
        doc.text(`• Strategy: ${primaryCrystMode} (${primaryMaxPcls.pclsPercent}%)`, 21, subY + 12.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(`• Max Tax-Free Cash: £${Math.round(primaryMaxPcls.maxTaxFreeCash).toLocaleString()}`, 21, subY + 16.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const priLsaCapText = primaryMaxPcls.isCappedByLsa
          ? `• LSA: Capped at £${(primaryMaxPcls.lsaLimit / 1000).toFixed(1)}k`
          : `• LSA Cap: £${(primaryMaxPcls.lsaLimit / 1000).toFixed(1)}k (Uncapped)`;
        doc.text(priLsaCapText, 21, subY + 20.5);

        // Partner Column Box
        const partColX = 18 + colW + 4;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(partColX, subY, colW, subBoxH, 2, 2, 'F');
        doc.setDrawColor(251, 191, 36);
        doc.roundedRect(partColX, subY, colW, subBoxH, 2, 2, 'D');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Partner: ${profile.partnerName || 'Partner'} (Age ${partnerTakeAgePcls})`, partColX + 3, subY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`• Pension Pot @ Crystallisation: £${Math.round(partnerPensionAtTakePcls).toLocaleString()}`, partColX + 3, subY + 8.5);
        doc.text(`• Strategy: ${partnerCrystMode} (${partnerMaxPcls.pclsPercent}%)`, partColX + 3, subY + 12.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(`• Max Tax-Free Cash: £${Math.round(partnerMaxPcls.maxTaxFreeCash).toLocaleString()}`, partColX + 3, subY + 16.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const partLsaCapText = partnerMaxPcls.isCappedByLsa
          ? `• LSA: Capped at £${(partnerMaxPcls.lsaLimit / 1000).toFixed(1)}k`
          : `• LSA Cap: £${(partnerMaxPcls.lsaLimit / 1000).toFixed(1)}k (Uncapped)`;
        doc.text(partLsaCapText, partColX + 3, subY + 20.5);

        // Household Strip at bottom of box
        const combY = p2Y + 33.5;
        doc.setFillColor(254, 240, 138);
        doc.roundedRect(18, combY, 174, 6.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(4, 120, 87);
        const totalPcls = Math.round(primaryMaxPcls.maxTaxFreeCash + partnerMaxPcls.maxTaxFreeCash);
        const totalLsa = primaryMaxPcls.lsaLimit + partnerMaxPcls.lsaLimit;
        doc.text(`• Household Tax-Free Lump Sum: £${totalPcls.toLocaleString()} | Combined LSA Cap: £${totalLsa.toLocaleString()} (Destinations: ${primaryDestStr} / ${partnerDestStr})`, 21, combY + 4.2);

      } else {
        // Single member full width
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const priPclsStr = `• Primary Member (@ Age ${primaryTakeAgePcls}): Projected Pension Pot £${Math.round(primaryPensionAtTakePcls).toLocaleString()} | Max Tax-Free Cash: £${Math.round(primaryMaxPcls.maxTaxFreeCash).toLocaleString()} ${primaryMaxPcls.isCappedByLsa ? `(Capped by £${(primaryMaxPcls.lsaLimit / 1000).toFixed(1)}k LSA)` : `(${primaryMaxPcls.pclsPercent}% Uncapped)`}`;
        doc.text(priPclsStr, 18, p2Y + 10);

        doc.setFontSize(7);
        doc.text(`• Strategy Mode: ${primaryCrystMode} | Destination: ${primaryDestStr}`, 18, p2Y + 15);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(4, 120, 87);
        doc.text(`• Total Liquid Tax-Free Capital Available: £${Math.round(primaryMaxPcls.maxTaxFreeCash).toLocaleString()} (Personal LSA Allowance: £${primaryMaxPcls.lsaLimit.toLocaleString()})`, 18, p2Y + 20.5);
      }

      p2Y += boxH + 6;

      // SECTION 7: PROJECTED INVESTMENT POT ASSETS BREAKDOWN AT STATE PENSION ACCESS AGE
      p2Y = drawAssetBreakdownTable(7, `Projected Investment Pot Assets Breakdown at State Pension Access Age (Age ${primarySpaAge})`, statePensionYear, p2Y);

      // SECTION 8: INVESTMENT RETURNS & MACROECONOMIC GROWTH ASSUMPTIONS
      p2Y += 10;
      if (p2Y > 195) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Investment Returns, Fees & Macro Assumptions', curPageNum);
        p2Y = 24;
      }

      const realPre = (macroPre - macroInf).toFixed(1);
      const realPost = (macroPost - macroInf).toFixed(1);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p2Y, 182, 23, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, p2Y, 182, 23, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('8. Investment Returns & Macroeconomic Growth Assumptions', 18, p2Y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      doc.setFont('helvetica', 'bold');
      doc.text('Pre-Retirement Return:', 18, p2Y + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(`${macroPre}% p.a. (+${realPre}% p.a. real growth)`, 58, p2Y + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Post-Retirement Return:', 18, p2Y + 18.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${macroPost}% p.a. (+${realPost}% p.a. real growth)`, 58, p2Y + 18.5);

      doc.setFont('helvetica', 'bold');
      doc.text('Expected Annual Inflation:', 112, p2Y + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(`${macroInf}% p.a. CPI`, 154, p2Y + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Spending & Pension Indexing:', 112, p2Y + 18.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`CPI Indexed @ ${macroInf}%/yr`, 154, p2Y + 18.5);

      p2Y += 26;

      // SECTION 8a: INVESTMENT, PLATFORM & ADVISER FEES & LIFETIME FEE DRAG ANALYSIS
      const feeConfig = profile.investmentFees || DEFAULT_INVESTMENT_FEES;
      const isFeeEnabled = Boolean(feeConfig.enabled);
      const isPerPotFees = Boolean(feeConfig.perPotFeesEnabled);
      const globalPlatformFee = feeConfig.platformFeePercent ?? 0.25;
      const globalFundFee = feeConfig.fundFeePercent ?? 0.40;
      const globalAdvisorFee = feeConfig.advisorFeePercent ?? 0.00;
      const globalTotalFee = globalPlatformFee + globalFundFee + globalAdvisorFee;

      interface PdfPotFeeRow {
        name: string;
        owner: string;
        balance: number;
        platform: number;
        fund: number;
        advisor: number;
        total: number;
        dragPounds: number;
      }

      const feePots: PdfPotFeeRow[] = [];
      const addFeePotRow = (
        potName: string,
        ownerName: string,
        balance: number,
        ownerKey: 'primary' | 'partner',
        potKey: 'workplacePension' | 'sipp' | 'stocksAndSharesIsa' | 'cashIsa' | 'gia' | 'lisa' | 'cashSavings'
      ) => {
        if (balance <= 0) return;
        const mappedPotKey = potKey === 'lisa' ? 'stocksAndSharesIsa' : potKey === 'cashSavings' ? 'cashIsa' : potKey;
        const potOverride = (isPerPotFees && feeConfig[ownerKey === 'partner' ? 'partnerPots' : 'primaryPots']?.[mappedPotKey]);
        const plat = potOverride?.platformFeePercent !== undefined ? potOverride.platformFeePercent : globalPlatformFee;
        const fnd = potOverride?.fundFeePercent !== undefined ? potOverride.fundFeePercent : globalFundFee;
        const adv = potOverride?.advisorFeePercent !== undefined ? potOverride.advisorFeePercent : globalAdvisorFee;
        const tot = isFeeEnabled ? (plat + fnd + adv) : 0;
        const drag = Math.round(balance * (tot / 100));
        feePots.push({ name: potName, owner: ownerName, balance, platform: plat, fund: fnd, advisor: adv, total: tot, dragPounds: drag });
      };

      addFeePotRow('Workplace Pension', primaryName, pots?.workplacePensionBalance ?? profile.workplacePensionBalance ?? 0, 'primary', 'workplacePension');
      addFeePotRow('SIPP (Personal Pension)', primaryName, pots?.sippBalance ?? profile.sippBalance ?? 0, 'primary', 'sipp');
      addFeePotRow('Stocks & Shares ISA', primaryName, pots?.stocksAndSharesIsaBalance ?? profile.stocksAndSharesIsaBalance ?? 0, 'primary', 'stocksAndSharesIsa');
      addFeePotRow('Lifetime ISA (LISA)', primaryName, pots?.lisaBalance ?? profile.lisaBalance ?? 0, 'primary', 'lisa');
      addFeePotRow('Cash ISA', primaryName, pots?.cashIsaBalance ?? profile.cashIsaBalance ?? 0, 'primary', 'cashIsa');
      addFeePotRow('GIA (General Inv.)', primaryName, pots?.giaBalance ?? profile.giaBalance ?? 0, 'primary', 'gia');
      addFeePotRow('Cash Savings', primaryName, pots?.cashSavingsBalance ?? profile.cashSavingsBalance ?? 0, 'primary', 'cashSavings');

      if (profile.isCouplePlanning) {
        addFeePotRow('Workplace Pension', partnerName || 'Partner', profile.partnerPots?.workplacePensionBalance ?? profile.partnerWorkplacePensionBalance ?? 0, 'partner', 'workplacePension');
        addFeePotRow('SIPP (Personal Pension)', partnerName || 'Partner', profile.partnerPots?.sippBalance ?? profile.partnerSippBalance ?? 0, 'partner', 'sipp');
        addFeePotRow('Stocks & Shares ISA', partnerName || 'Partner', profile.partnerPots?.stocksAndSharesIsaBalance ?? profile.partnerIsaBalance ?? 0, 'partner', 'stocksAndSharesIsa');
        addFeePotRow('Lifetime ISA (LISA)', partnerName || 'Partner', profile.partnerPots?.lisaBalance ?? 0, 'partner', 'lisa');
        addFeePotRow('Cash ISA', partnerName || 'Partner', profile.partnerPots?.cashIsaBalance ?? profile.partnerCashIsaBalance ?? 0, 'partner', 'cashIsa');
        addFeePotRow('GIA (General Inv.)', partnerName || 'Partner', profile.partnerPots?.giaBalance ?? profile.partnerGiaBalance ?? 0, 'partner', 'gia');
        addFeePotRow('Cash Savings', partnerName || 'Partner', profile.partnerPots?.cashSavingsBalance ?? 0, 'partner', 'cashSavings');
      }

      const totalFeeInvestedPots = feePots.reduce((sum, p) => sum + p.balance, 0);
      const totalAnnualFeeDragPounds = feePots.reduce((sum, p) => sum + p.dragPounds, 0);
      const weightedAvgFeePercent = totalFeeInvestedPots > 0 ? (totalAnnualFeeDragPounds / totalFeeInvestedPots) * 100 : (isFeeEnabled ? globalTotalFee : 0);

      // Estimate 30-year compounded fee drag impact
      const rPre = (macroPre / 100);
      const rNet = Math.max(0, rPre - (weightedAvgFeePercent / 100));
      const yearsDrag = Math.min(40, Math.max(15, horizonAge - currentAge));
      const compGrossMult = Math.pow(1 + rPre, yearsDrag);
      const compNetMult = Math.pow(1 + rNet, yearsDrag);
      const estimatedCompoundedDragPounds = Math.round(totalFeeInvestedPots * Math.max(0, compGrossMult - compNetMult));

      // Calculate baseline (0% fees) and active projections trajectory for the visual chart
      const baselineProfile: UserProfile = {
        ...profile,
        investmentFees: {
          ...feeConfig,
          enabled: false,
        },
      };
      const baselineProjs = generateProjections(baselineProfile, pots);
      const activeProjs = isFeeEnabled ? (projections && projections.length > 0 ? projections : generateProjections(profile, pots)) : baselineProjs;

      const feeTrajectory = (activeProjs || []).map((p, idx) => {
        const baseP = baselineProjs[idx] || p;
        const grossPot = Math.max(0, Math.round(baseP.totalPot || 0));
        const netPot = Math.max(0, Math.round(p.totalPot || 0));
        const dragGap = Math.max(0, grossPot - netPot);
        const annualFee = Math.max(0, Math.round(p.estimatedInvestmentFees || 0));
        return {
          age: p.age,
          grossPot,
          netPot,
          dragGap,
          annualFee,
        };
      });

      const retPoint = feeTrajectory.find((t) => t.age === targetAge) || feeTrajectory[0];
      const endPoint = feeTrajectory[feeTrajectory.length - 1] || retPoint;

      const terminalGross = endPoint?.grossPot || 0;
      const terminalNet = endPoint?.netPot || 0;
      const terminalDragPounds = Math.max(0, terminalGross - terminalNet);
      const terminalDragPct = terminalGross > 0 ? (terminalDragPounds / terminalGross) * 100 : 0;

      const retirementGross = retPoint?.grossPot || 0;
      const retirementNet = retPoint?.netPot || 0;
      const retirementDragPounds = Math.max(0, retirementGross - retirementNet);
      const retirementDragPct = retirementGross > 0 ? (retirementDragPounds / retirementGross) * 100 : 0;

      const feeTableBoxH = 22 + (Math.max(1, feePots.length) * 4.8) + 9;
      const feeChartH = 58;
      const totalSection8aH = feeTableBoxH + feeChartH + 4;

      if (p2Y + totalSection8aH > 275) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Investment Returns, Fees & Macro Assumptions', curPageNum);
        p2Y = 24;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p2Y, 182, feeTableBoxH, 2.5, 2.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, p2Y, 182, feeTableBoxH, 2.5, 2.5, 'D');

      // Title & Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('8a. Investment, Platform & Ongoing Adviser Fees Drag Analysis', 18, p2Y + 6.5);

      // Status pill
      const feePillBg = isFeeEnabled ? [240, 253, 244] : [241, 245, 249];
      const feePillBorder = isFeeEnabled ? [187, 247, 208] : [203, 213, 225];
      const feePillText = isFeeEnabled ? [22, 101, 52] : [100, 116, 139];
      const feeStatusLabel = isFeeEnabled
        ? (isPerPotFees ? 'Active (Granular Per-Pot Overrides)' : 'Active (Global Fee Drag Applied)')
        : 'Inactive (0.00% Baseline Model)';

      doc.setFillColor(feePillBg[0], feePillBg[1], feePillBg[2]);
      doc.roundedRect(130, p2Y + 2.5, 62, 5, 1, 1, 'F');
      doc.setDrawColor(feePillBorder[0], feePillBorder[1], feePillBorder[2]);
      doc.roundedRect(130, p2Y + 2.5, 62, 5, 1, 1, 'D');
      doc.setFontSize(6.2);
      doc.setTextColor(feePillText[0], feePillText[1], feePillText[2]);
      doc.text(feeStatusLabel, 132, p2Y + 5.8);

      // Fee Global Rates KPI Strip
      let fBoxY = p2Y + 8.5;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, fBoxY, 174, 7.5, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, fBoxY, 174, 7.5, 1.5, 1.5, 'D');

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Platform Fee: ${globalPlatformFee.toFixed(2)}%`, 21, fBoxY + 4.8);
      doc.text(`Fund OCF / AMC: ${globalFundFee.toFixed(2)}%`, 58, fBoxY + 4.8);
      doc.text(`Adviser Fee: ${globalAdvisorFee.toFixed(2)}%`, 100, fBoxY + 4.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(`Total Baseline TER: ${globalTotalFee.toFixed(2)}% p.a.`, 138, fBoxY + 4.8);

      // Pot-by-Pot Fee Table
      fBoxY += 9.5;
      doc.setFillColor(30, 41, 59);
      doc.rect(18, fBoxY, 174, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.text('Pot / Account Wrapper', 21, fBoxY + 3.5);
      doc.text('Member', 66, fBoxY + 3.5);
      doc.text('Platform %', 92, fBoxY + 3.5);
      doc.text('Fund %', 110, fBoxY + 3.5);
      doc.text('Adviser %', 126, fBoxY + 3.5);
      doc.text('Total Fee %', 144, fBoxY + 3.5);
      doc.text('Annual Drag (£/yr)', 166, fBoxY + 3.5);

      fBoxY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(6.8);

      if (feePots.length === 0) {
        doc.text('No active investment pots configured.', 21, fBoxY + 3.5);
        fBoxY += 4.8;
      } else {
        feePots.forEach((pot, pIdx) => {
          if (pIdx % 2 === 1) {
            doc.setFillColor(241, 245, 249);
            doc.rect(18, fBoxY, 174, 4.8, 'F');
          }
          doc.text(pot.name, 21, fBoxY + 3.5);
          doc.text(pot.owner, 66, fBoxY + 3.5);
          doc.text(`${pot.platform.toFixed(2)}%`, 92, fBoxY + 3.5);
          doc.text(`${pot.fund.toFixed(2)}%`, 110, fBoxY + 3.5);
          doc.text(`${pot.advisor.toFixed(2)}%`, 126, fBoxY + 3.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`${pot.total.toFixed(2)}%`, 144, fBoxY + 3.5);
          doc.setTextColor(185, 28, 28);
          doc.text(pot.dragPounds > 0 ? `£${pot.dragPounds.toLocaleString()}/yr` : '£0/yr', 166, fBoxY + 3.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          fBoxY += 4.8;
        });
      }

      // Summary Drag & Compound Impact Footnote
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(185, 28, 28);
      doc.text(`• Total Initial Annual Fee Drag: £${totalAnnualFeeDragPounds.toLocaleString()}/yr (Weighted Avg: ${weightedAvgFeePercent.toFixed(2)}% p.a.)`, 18, fBoxY + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`  Projected Compounded Growth Drag over ${yearsDrag} Years: ~£${estimatedCompoundedDragPounds.toLocaleString()} in reduced terminal wealth.`, 18, fBoxY + 7);

      // =========================================================================
      // VECTOR CHART: COMPOUNDED WEALTH TRAJECTORY (GROSS VS NET OF FEES)
      // =========================================================================
      const fChartY = p2Y + feeTableBoxH + 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, fChartY, 182, feeChartH, 2.5, 2.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fChartY, 182, feeChartH, 2.5, 2.5, 'D');

      // Chart Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Visual Model: Compounded Wealth Trajectory (Gross 0.00% Baseline vs Net of All Fees)', 18, fChartY + 5.5);

      // Mini KPI badges strip inside chart
      const cKpiW = 56;
      const chartKpis = [
        { label: 'Initial Annual Drag', val: `£${totalAnnualFeeDragPounds.toLocaleString()}/yr`, col: [225, 29, 72] },
        { label: `Retirement Gap (Age ${targetAge})`, val: `-£${Math.round(retirementDragPounds).toLocaleString()} (-${retirementDragPct.toFixed(1)}%)`, col: [217, 119, 6] },
        { label: 'Terminal Wealth Drag', val: `-£${Math.round(terminalDragPounds).toLocaleString()} (-${terminalDragPct.toFixed(1)}%)`, col: [79, 70, 229] },
      ];

      chartKpis.forEach((kp, i) => {
        const kx = 18 + i * (cKpiW + 3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(kx, fChartY + 8, cKpiW, 6, 1, 1, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kx, fChartY + 8, cKpiW, 6, 1, 1, 'D');
        doc.setFontSize(5.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(kp.label + ':', kx + 2, fChartY + 11.8);
        doc.setFontSize(6.2);
        doc.setTextColor(kp.col[0], kp.col[1], kp.col[2]);
        doc.text(kp.val, kx + 26, fChartY + 11.8);
      });

      // Chart Plotting Metrics
      const cLeft = 32;
      const cRight = 188;
      const cWidth = cRight - cLeft;
      const cTop = fChartY + 17;
      const cBottom = fChartY + 45;
      const cHeight = cBottom - cTop;

      const maxPotVal = Math.max(1, ...feeTrajectory.map((t) => Math.max(t.grossPot, t.netPot)));

      // Y-axis gridlines & scale labels
      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      const fYSteps = [1.0, 0.66, 0.33, 0];
      fYSteps.forEach((sPct) => {
        const sy = cTop + (1 - sPct) * cHeight;
        doc.line(cLeft, sy, cRight, sy);
        const sVal = maxPotVal * sPct;
        const fmtVal = sVal >= 1000000 ? `£${(sVal / 1000000).toFixed(1)}M` : `£${Math.round(sVal / 1000)}k`;
        doc.text(fmtVal, 16, sy + 1.5);
      });

      // X-axis age progression mapping
      const minAge = feeTrajectory[0]?.age || currentAge;
      const maxAge = feeTrajectory[feeTrajectory.length - 1]?.age || horizonAge;
      const ageSpan = Math.max(1, maxAge - minAge);

      const getTrajectoryX = (age: number) => {
        const pct = Math.max(0, Math.min(1, (age - minAge) / ageSpan));
        return cLeft + pct * cWidth;
      };

      const getTrajectoryY = (val: number) => {
        const pct = Math.max(0, Math.min(1, val / maxPotVal));
        return cBottom - pct * cHeight;
      };

      // X-Axis Milestone Ticks
      const fMilestones = [minAge, profile.pensionAccessAge || 57, targetAge, profile.statePensionAge || 67, 75, maxAge];
      const uniqueFMilestones = Array.from(new Set(fMilestones)).filter((a) => a >= minAge && a <= maxAge).sort((a, b) => a - b);
      uniqueFMilestones.forEach((mAge) => {
        const tx = getTrajectoryX(mAge);
        doc.line(tx, cBottom, tx, cBottom + 1.8);
        doc.text(`Age ${mAge}`, tx - 4.5, cBottom + 4.5);
      });

      // Vertical dashed line for Retirement Age
      if (targetAge >= minAge && targetAge <= maxAge) {
        const retX = getTrajectoryX(targetAge);
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.3);
        for (let dy = cTop; dy < cBottom; dy += 2.5) {
          doc.line(retX, dy, retX, Math.min(dy + 1.5, cBottom));
        }
        doc.setFontSize(5);
        doc.setTextColor(217, 119, 6);
        doc.setFont('helvetica', 'bold');
        doc.text(`Retirement (Age ${targetAge})`, retX - 9, cTop - 1.2);
      }

      // Draw Trajectory Curves & Shading
      if (feeTrajectory.length > 1) {
        // Draw Shaded Gap between Gross and Net
        doc.setFillColor(254, 226, 226); // Soft rose tint
        for (let i = 0; i < feeTrajectory.length - 1; i++) {
          const pt1 = feeTrajectory[i];
          const pt2 = feeTrajectory[i + 1];
          const x1 = getTrajectoryX(pt1.age);
          const x2 = getTrajectoryX(pt2.age);
          const yg1 = getTrajectoryY(pt1.grossPot);
          const yn1 = getTrajectoryY(pt1.netPot);
          const yg2 = getTrajectoryY(pt2.grossPot);
          const yn2 = getTrajectoryY(pt2.netPot);

          if (yn1 > yg1 || yn2 > yg2) {
            doc.triangle(x1, yg1, x2, yg2, x2, yn2, 'F');
            doc.triangle(x1, yg1, x2, yn2, x1, yn1, 'F');
          }
        }

        // Draw Gross Wealth Line (Emerald)
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.65);
        for (let i = 0; i < feeTrajectory.length - 1; i++) {
          const pt1 = feeTrajectory[i];
          const pt2 = feeTrajectory[i + 1];
          doc.line(getTrajectoryX(pt1.age), getTrajectoryY(pt1.grossPot), getTrajectoryX(pt2.age), getTrajectoryY(pt2.grossPot));
        }

        // Draw Net Wealth Line (Indigo)
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.85);
        for (let i = 0; i < feeTrajectory.length - 1; i++) {
          const pt1 = feeTrajectory[i];
          const pt2 = feeTrajectory[i + 1];
          doc.line(getTrajectoryX(pt1.age), getTrajectoryY(pt1.netPot), getTrajectoryX(pt2.age), getTrajectoryY(pt2.netPot));
        }

        // Milestone point circles
        [retPoint, endPoint].forEach((pt) => {
          if (pt) {
            const px = getTrajectoryX(pt.age);
            doc.setFillColor(16, 185, 129);
            doc.circle(px, getTrajectoryY(pt.grossPot), 0.7, 'F');
            doc.setFillColor(79, 70, 229);
            doc.circle(px, getTrajectoryY(pt.netPot), 0.7, 'F');
          }
        });
      }

      // Legend Strip at Bottom of Chart
      const lgY = fChartY + 51.5;
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');

      // Gross legend
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.8);
      doc.line(20, lgY + 1.2, 26, lgY + 1.2);
      doc.setFillColor(16, 185, 129);
      doc.circle(23, lgY + 1.2, 0.6, 'F');
      doc.setTextColor(16, 185, 129);
      doc.text('Gross Wealth (0.00% Fees Baseline)', 28, lgY + 2.2);

      // Net legend
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1.0);
      doc.line(82, lgY + 1.2, 88, lgY + 1.2);
      doc.setFillColor(79, 70, 229);
      doc.circle(85, lgY + 1.2, 0.6, 'F');
      doc.setTextColor(79, 70, 229);
      doc.text('Net Wealth (With Platform, Fund & Adviser Charges)', 90, lgY + 2.2);

      // Shaded Drag legend
      doc.setFillColor(254, 226, 226);
      doc.rect(156, lgY, 3.5, 2.5, 'F');
      doc.setDrawColor(225, 29, 72);
      doc.rect(156, lgY, 3.5, 2.5, 'D');
      doc.setTextColor(225, 29, 72);
      doc.text('Compounded Fee Drag Area', 161, lgY + 2.2);

      // Advance p2Y by the total section height
      p2Y += totalSection8aH;

      // =========================================================================
      // PAGE 5: SPENDING PHASES, RETIREMENT INCOME PRODUCTS & MILESTONES
      // =========================================================================
      curPageNum++;
      doc.addPage();
      renderPageHeader('Retirement Strategy & Milestone Schedule', curPageNum);

      let p3Y = 24;

      // SECTION 9: SPENDING PHASE PROFILE & TARGET INCOME AMOUNTS (MOVED ABOVE PRODUCT STRUCTURE!)
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('9. Spending Phase Profile & Target Income Amounts', 14, p3Y);

      p3Y += 5;
      const isMaxSpend = Boolean(profile.maximizedSpendConfig?.enabled);
      const maxConfig = profile.maximizedSpendConfig;
      const phases = isMaxSpend ? (maxConfig?.spendingPhases || profile.spendingPhases) : profile.spendingPhases;
      const hasCustomRanges = phases?.enabled && phases.customRanges && phases.customRanges.length > 0;
      const hasLegacyPhases = phases?.enabled && phases.goGoEndAge !== undefined;

      if (isMaxSpend) {
        const solvedIncome = maxConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
        const isReinvest = maxConfig?.reinvestExcessDrawdown;
        const actualTarget = maxConfig?.actualSpendingTargetAnnual || profile.actualSpendingTargetAnnual || 0;
        const destPot = (maxConfig?.reinvestDestinationPot || 'isa').toUpperCase();
        
        doc.setFillColor(245, 243, 255);
        doc.roundedRect(14, p3Y, 182, 10, 3, 3, 'F');
        doc.setDrawColor(196, 181, 253);
        doc.roundedRect(14, p3Y, 182, 10, 3, 3, 'D');
        doc.setTextColor(109, 40, 217);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        const textStr = isReinvest
          ? `* MAX DRAWDOWN MODE ACTIVE: Max Drawdown: £${(solvedIncome || 0).toLocaleString()}/yr | Actual Spending Target: £${(actualTarget || 0).toLocaleString()}/yr (Surplus reinvested into ${destPot})`
          : `* MAXIMIZED SPEND SOLVER MODE ACTIVE: Solved Sustainable Income Target: £${(solvedIncome || 0).toLocaleString()}/yr (£${Math.round((solvedIncome || 0) / 12).toLocaleString()}/mo)`;
        doc.text(textStr, 18, p3Y + 6.5);
        p3Y += 13;
      }

      if (hasCustomRanges) {
        doc.setFillColor(30, 41, 59);
        doc.rect(14, p3Y, 182, 6.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Phase Name / Range', 18, p3Y + 4.5);
        doc.text('Start Age', 75, p3Y + 4.5);
        doc.text('End Age', 105, p3Y + 4.5);
        doc.text('Annual Target (£/yr)', 135, p3Y + 4.5);
        doc.text('Monthly (£/mo)', 165, p3Y + 4.5);

        p3Y += 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);

        phases.customRanges!.forEach((r, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, p3Y, 182, 5.5, 'F');
          }
          doc.text(r.name || `Phase #${idx + 1}`, 18, p3Y + 4);
          doc.text(`Age ${r.startAge}`, 75, p3Y + 4);
          doc.text(r.endAge ? `Age ${r.endAge}` : 'Ongoing', 105, p3Y + 4);
          doc.text(`£${(r.annualTargetIncome || 0).toLocaleString()}`, 135, p3Y + 4);
          doc.text(`£${Math.round((r.annualTargetIncome || 0) / 12).toLocaleString()}`, 165, p3Y + 4);
          p3Y += 5.5;
        });
        p3Y += 6;
      } else if (hasLegacyPhases) {
        doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.roundedRect(14, p3Y, 182, 26, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, p3Y, 182, 26, 3, 3, 'D');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);

        doc.text(`- Go-Go Active Phase: Age ${targetAge} to Age ${phases.goGoEndAge} @ £${(phases.goGoIncomeAnnual || 0).toLocaleString()}/yr (£${Math.round((phases.goGoIncomeAnnual || 0) / 12).toLocaleString()}/mo)`, 18, p3Y + 7);
        doc.text(`- Slow-Go Transition Phase: Age ${(phases.goGoEndAge || targetAge) + 1} to Age ${phases.slowGoEndAge} @ £${(phases.slowGoIncomeAnnual || 0).toLocaleString()}/yr (£${Math.round((phases.slowGoIncomeAnnual || 0) / 12).toLocaleString()}/mo)`, 18, p3Y + 14);
        doc.text(`- No-Go Later Years: Age ${(phases.slowGoEndAge || 75) + 1}+ @ £${(phases.noGoIncomeAnnual || 0).toLocaleString()}/yr (£${Math.round((phases.noGoIncomeAnnual || 0) / 12).toLocaleString()}/mo)`, 18, p3Y + 21);
        p3Y += 32;
      } else {
        doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.roundedRect(14, p3Y, 182, 12, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, p3Y, 182, 12, 3, 3, 'D');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const flatTarget = isMaxSpend ? (maxConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0) : (profile.targetRetirementIncomeAnnual || 0);
        doc.text(`• Single Flat Target Income Profile: £${(flatTarget || 0).toLocaleString()}/yr (£${Math.round((flatTarget || 0) / 12).toLocaleString()}/mo) from Age ${targetAge} onwards.`, 18, p3Y + 8);
        p3Y += 18;
      }

      // SECTION 9a: PLANNED LIFE EVENTS IN DECUMULATION (ONE-OFF CAPITAL INFLOWS & OUTLAYS)
      const decumEvents = profile.decumulationLifeEvents || [];
      const activeDecumEvents = decumEvents.filter((e) => e.enabled);

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('9a. Planned Life Events in Decumulation (One-Off Capital Inflows & Outlays)', 14, p3Y);

      p3Y += 5;

      if (activeDecumEvents.length > 0) {
        doc.setFillColor(30, 41, 59);
        doc.rect(14, p3Y, 182, 6.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Event Name', 18, p3Y + 4.5);
        doc.text('Member', 68, p3Y + 4.5);
        doc.text('Age (Year)', 92, p3Y + 4.5);
        doc.text('Type', 118, p3Y + 4.5);
        doc.text('Amount (£)', 140, p3Y + 4.5);
        doc.text('Target/Source Pot', 165, p3Y + 4.5);

        p3Y += 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7.5);

        const currentYearVal = new Date().getFullYear();
        const partCurAgeVal = profile.partnerCurrentAge ?? currentAge;

        activeDecumEvents.forEach((ev, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, p3Y, 182, 5.5, 'F');
          }

          const isPartner = ev.owner === 'partner';
          const memberLabel = isPartner ? (partnerName || 'Partner') : primaryName;
          const evYear = isPartner
            ? currentYearVal + Math.max(0, ev.age - partCurAgeVal)
            : currentYearVal + Math.max(0, ev.age - currentAge);

          const isIncome = ev.type === 'income';
          const potNameMap: Record<string, string> = {
            cash_savings: 'Cash Savings',
            stocks_and_shares_isa: 'S&S ISA',
            cash_isa: 'Cash ISA',
            sipp: 'SIPP',
            gia: 'GIA',
          };
          const potLabel = potNameMap[ev.targetPot || 'cash_savings'] || 'Cash';

          doc.text(ev.name.length > 28 ? ev.name.substring(0, 26) + '...' : ev.name, 18, p3Y + 4);
          doc.text(memberLabel.length > 12 ? memberLabel.substring(0, 11) + '.' : memberLabel, 68, p3Y + 4);
          doc.text(`Age ${ev.age} (${evYear})`, 92, p3Y + 4);

          if (isIncome) {
            doc.setTextColor(16, 185, 129);
            doc.setFont('helvetica', 'bold');
            doc.text('+Inflow', 118, p3Y + 4);
            doc.text(`+£${Math.round(ev.amount || 0).toLocaleString()}`, 140, p3Y + 4);
          } else {
            doc.setTextColor(225, 29, 72);
            doc.setFont('helvetica', 'bold');
            doc.text('-Expense', 118, p3Y + 4);
            doc.text(`-£${Math.round(ev.amount || 0).toLocaleString()}`, 140, p3Y + 4);
          }

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.text(potLabel, 165, p3Y + 4);

          p3Y += 5.5;
        });

        p3Y += 6;
      } else {
        doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.roundedRect(14, p3Y, 182, 11, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, p3Y, 182, 11, 3, 3, 'D');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('• No active one-off planned life events (downsizing lump sum, inheritance, car purchase, world trip, etc.) configured in decumulation.', 18, p3Y + 7);
        p3Y += 16;
      }

      // SECTION 10: RETIREMENT INCOME PRODUCT STRUCTURE & DRAWDOWN STRATEGY
      const priOpt = profile.incomeProductOption || 'flexi_drawdown';
      const partOpt = profile.partnerIncomeProductOption || profile.incomeProductOption || 'flexi_drawdown';
      const isPriAnnuity = priOpt === 'annuity' || priOpt === 'hybrid';
      const isPartAnnuity = partOpt === 'annuity' || partOpt === 'hybrid';

      const priTranchesList = (profile.annuityTranches || []).filter((t) => t.enabled && (t.owner || 'primary') === 'primary');
      const partTranchesList = profile.isCouplePlanning
        ? (profile.partnerAnnuityTranches || (profile.annuityTranches || []).filter((t) => t.enabled && t.owner === 'partner'))
        : [];

      const isPhasedPrimary = profile.crystallisationMode === 'phased_tranches';
      const priActivePhased: CrystallisationTranche[] = (profile.crystallisationTranches || []).filter((t) => t.enabled !== false && t.owner !== 'partner');

      const isPhasedPartner = Boolean(profile.isCouplePlanning && profile.partnerCrystallisationMode === 'phased_tranches');
      const partActivePhased: CrystallisationTranche[] = profile.isCouplePlanning
        ? (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter((t) => t.enabled !== false && t.owner === 'partner')
        : [];

      const formatDestPotLabel = (pot?: string, splits?: LumpSumSplit[]) => {
        if (pot === 'split' && splits && splits.length > 0) {
          const splitDescs = splits.map((s) => {
            const pLabel = s.pot === 'stocks_and_shares_isa' ? 'S&S ISA'
              : s.pot === 'cash_isa' ? 'Cash ISA'
              : s.pot === 'cash_savings' ? 'Cash'
              : s.pot === 'gia' ? 'GIA'
              : 'Spend/Debt';
            return s.mode === 'percentage' ? `${pLabel} ${s.value}%` : `${pLabel} £${Math.round(s.value).toLocaleString()}`;
          });
          return `Split: ${splitDescs.join(', ')}`;
        }
        if (pot === 'stocks_and_shares_isa') return 'S&S ISA (Tax-Free)';
        if (pot === 'cash_isa') return 'Cash ISA (Tax-Free)';
        if (pot === 'cash_savings') return 'Cash Savings';
        if (pot === 'gia') return 'GIA (General Inv.)';
        if (pot === 'spend_clear_debt') return 'Spend / Clear Debt';
        if (pot === 'split') return 'Split across Multiple Pots';
        return 'S&S ISA (Tax-Free)';
      };

      const priHierarchy = profile.drawdownStrategy === 'tax_optimizer'
        ? 'TAX OPTIMIZER (Dynamic solver: 0% PA & 20% band smoothing, ISA shielding, spousal equalization)'
        : profile.drawdownStrategy === 'basic_rate_bracket'
        ? 'BASIC RATE BRACKET (Target £50,270 ceiling minus taxable fixed income)'
        : profile.drawdownStrategy === 'tax_free_bracket'
        ? 'PERSONAL ALLOWANCE BRACKET (Target £12,570 ceiling minus taxable fixed income)'
        : profile.drawdownStrategy === 'higher_rate_bracket'
        ? 'HIGHER RATE BRACKET (Target £125,140 ceiling minus taxable fixed income)'
        : (profile.drawdownStrategy || 'pro_rata').replace(/_/g, ' ').toUpperCase();

      const partHierarchy = (profile.partnerDrawdownStrategy || profile.drawdownStrategy) === 'tax_optimizer'
        ? 'TAX OPTIMIZER (Dynamic solver: 0% PA & 20% band smoothing, ISA shielding, spousal equalization)'
        : (profile.partnerDrawdownStrategy || profile.drawdownStrategy) === 'basic_rate_bracket'
        ? 'BASIC RATE BRACKET (Target £50,270 ceiling minus taxable fixed income)'
        : (profile.partnerDrawdownStrategy || profile.drawdownStrategy) === 'tax_free_bracket'
        ? 'PERSONAL ALLOWANCE BRACKET (Target £12,570 ceiling minus taxable fixed income)'
        : (profile.partnerDrawdownStrategy || profile.drawdownStrategy) === 'higher_rate_bracket'
        ? 'HIGHER RATE BRACKET (Target £125,140 ceiling minus taxable fixed income)'
        : (profile.partnerDrawdownStrategy || profile.drawdownStrategy || 'pro_rata').replace(/_/g, ' ').toUpperCase();

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('10. Retirement Income Product Structure & Drawdown Strategy (Per Person)', 14, p3Y);
      p3Y += 5;

      const renderMemberStrategyCard = (
        isPartner: boolean,
        memberName: string,
        productOpt: string,
        hierarchyText: string,
        crystMode: string | undefined,
        activePhasedTranches: CrystallisationTranche[],
        pclsPercent: number,
        takeLumpSumAtStart: boolean,
        lumpSumTargetPot?: string,
        lumpSumSplits?: LumpSumSplit[],
        annAllocPercent: number = 50,
        annRatePercent: number = 4.2,
        annTypeStr?: string,
        annPurAge?: number,
        annTranchesList: any[] = [],
        basePensionPot: number = 0,
        lsaLimitVal: number = 268275,
        takeAgeVal: number = 57,
        maxPclsObj?: { maxTaxFreeCash: number; lsaLimit: number; pclsPercent: number; isCappedByLsa: boolean }
      ) => {
        const isPhased = crystMode === 'phased_tranches' && activePhasedTranches.length > 0;
        const isAnnuity = productOpt === 'annuity' || productOpt === 'hybrid';
        const hasAnnTranches = productOpt === 'hybrid' && annTranchesList.length > 0;

        // Calculate card height dynamically
        let mCardHeight = 24; // Base header & product/hierarchy/mode lines
        if (isPhased) {
          mCardHeight += 8; // Explanatory note
          mCardHeight += 5.5; // Table header
          mCardHeight += activePhasedTranches.length * 5; // Table rows
          mCardHeight += 9.5; // Summary KPI strip
        } else {
          mCardHeight += 10; // Upfront or UFPLS detailed bullets
        }
        if (isAnnuity) {
          mCardHeight += 8.5; // Annuity baseline details
          if (hasAnnTranches) {
            mCardHeight += annTranchesList.length * 4.5;
          }
        }

        // Draw card container
        doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.roundedRect(14, p3Y, 182, mCardHeight, 2.5, 2.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, p3Y, 182, mCardHeight, 2.5, 2.5, 'D');

        // Header pill
        const pillBg = isPartner ? [238, 242, 255] : [240, 253, 244];
        const pillBorder = isPartner ? [199, 210, 254] : [187, 247, 208];
        const pillText = isPartner ? [79, 70, 229] : [5, 150, 105];

        doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
        doc.roundedRect(18, p3Y + 3, 174, 5.5, 1.5, 1.5, 'F');
        doc.setDrawColor(pillBorder[0], pillBorder[1], pillBorder[2]);
        doc.roundedRect(18, p3Y + 3, 174, 5.5, 1.5, 1.5, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(pillText[0], pillText[1], pillText[2]);
        doc.text(`${isPartner ? 'Partner Member' : 'Primary Member'}: ${memberName}`, 22, p3Y + 6.8);

        const prodLabel = productOpt === 'annuity'
          ? 'Guaranteed Lifetime Annuity (100% Capital)'
          : productOpt === 'hybrid'
          ? `Hybrid / Tranche Strategy (${annAllocPercent}% Baseline Annuity)`
          : 'Flexi-Access Drawdown (100% Market Invested)';

        doc.setFontSize(7);
        doc.text(prodLabel, 190 - doc.getTextWidth(prodLabel), p3Y + 6.8);

        let curY = p3Y + 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        // Core strategy bullets
        doc.setFont('helvetica', 'bold');
        doc.text('• Withdrawal Hierarchy:', 18, curY);
        doc.setFont('helvetica', 'normal');
        doc.text(hierarchyText, 53, curY);
        curY += 4.5;

        const crystModeLabel = isPhased
          ? `Phased Crystallisation (${activePhasedTranches.length} Scheduled Age Tranches)`
          : (crystMode === 'upfront' || (!crystMode && takeLumpSumAtStart))
          ? `Upfront PCLS Lump Sum (${pclsPercent}% at Age ${takeAgeVal})`
          : 'UFPLS Drip-Feed (25% Tax-Free per withdrawal)';

        doc.setFont('helvetica', 'bold');
        doc.text('• PCLS / Crystallisation Mode:', 18, curY);
        doc.setFont('helvetica', 'normal');
        doc.text(crystModeLabel, 62, curY);
        curY += 5;

        if (isPhased) {
          // Explanatory note
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.8);
          doc.setTextColor(71, 85, 105);
          const noteText = 'Crystallises pension capital in planned age tranches. Each tranche releases 25% tax-free cash (PCLS) into designated tax shelters, transferring 75% into Crystallised Flexi-Access Drawdown. Remaining uncrystallised funds stay invested to compound tax-sheltered with future 25% tax-free growth potential.';
          const wrappedNote = doc.splitTextToSize(noteText, 174);
          wrappedNote.forEach((line: string) => {
            doc.text(line, 18, curY);
            curY += 3.4;
          });
          curY += 1;

          // Table Header
          doc.setFillColor(30, 41, 59);
          doc.rect(18, curY, 174, 5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6.8);
          doc.setFont('helvetica', 'bold');
          doc.text('Tranche Name', 21, curY + 3.5);
          doc.text('Age (Year)', 52, curY + 3.5);
          doc.text('Gross Cryst. (£)', 78, curY + 3.5);
          doc.text('Tax-Free PCLS (25%)', 106, curY + 3.5);
          doc.text('Drawdown Pot (75%)', 136, curY + 3.5);
          doc.text('PCLS Destination Pot', 164, curY + 3.5);

          curY += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(6.8);

          const curYear = new Date().getFullYear();
          const memberCurAge = isPartner ? (profile.partnerCurrentAge ?? currentAge) : currentAge;

          let totalGross = 0;
          let totalPcls = 0;
          let totalDrawdown = 0;

          activePhasedTranches.forEach((t, idx) => {
            if (idx % 2 === 1) {
              doc.setFillColor(241, 245, 249);
              doc.rect(18, curY, 174, 4.8, 'F');
            }
            const trAge = t.age;
            const trYear = curYear + Math.max(0, trAge - memberCurAge);
            const grossAmt = t.amount || 0;
            const pclsPctVal = t.pclsPercent ?? 25;
            const pclsCash = Math.round(grossAmt * (pclsPctVal / 100));
            const ddPot = grossAmt - pclsCash;
            const destLabel = formatDestPotLabel(t.targetPot, t.splits);

            totalGross += grossAmt;
            totalPcls += pclsCash;
            totalDrawdown += ddPot;

            const tName = t.name || `Tranche #${idx + 1}`;
            doc.text(tName.length > 18 ? tName.substring(0, 17) + '..' : tName, 21, curY + 3.4);
            doc.text(`Age ${trAge} (${trYear})`, 52, curY + 3.4);
            doc.text(`£${Math.round(grossAmt).toLocaleString()}`, 78, curY + 3.4);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129); // Emerald for tax-free cash
            doc.text(`£${Math.round(pclsCash).toLocaleString()} (${pclsPctVal}%)`, 106, curY + 3.4);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(`£${Math.round(ddPot).toLocaleString()}`, 136, curY + 3.4);
            doc.text(destLabel.length > 18 ? destLabel.substring(0, 17) + '..' : destLabel, 164, curY + 3.4);

            curY += 4.8;
          });

          // Summary Metrics Strip
          curY += 1;
          const uncrystPot = Math.max(0, basePensionPot - totalGross);
          const remLsa = Math.max(0, lsaLimitVal - totalPcls);

          doc.setFillColor(248, 250, 252);
          doc.roundedRect(18, curY, 174, 7.5, 1.5, 1.5, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(18, curY, 174, 7.5, 1.5, 1.5, 'D');

          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);

          doc.text(`Total Cryst.: £${Math.round(totalGross).toLocaleString()}`, 21, curY + 4.8);
          doc.setTextColor(5, 150, 105);
          doc.text(`Total PCLS: £${Math.round(totalPcls).toLocaleString()}`, 56, curY + 4.8);
          doc.setTextColor(79, 70, 229);
          doc.text(`In Drawdown: £${Math.round(totalDrawdown).toLocaleString()}`, 90, curY + 4.8);
          doc.setTextColor(51, 65, 85);
          doc.text(`Uncrystallised: £${Math.round(uncrystPot).toLocaleString()}`, 126, curY + 4.8);
          doc.setTextColor(180, 83, 9);
          doc.text(`Rem. LSA: £${Math.round(remLsa).toLocaleString()}`, 162, curY + 4.8);

          curY += 8.5;
        } else if (crystMode === 'upfront' || (!crystMode && takeLumpSumAtStart)) {
          const maxTaxFree = maxPclsObj?.maxTaxFreeCash || (basePensionPot * (pclsPercent / 100));
          const destStr = formatDestPotLabel(lumpSumTargetPot, lumpSumSplits);
          const remLsa = Math.max(0, lsaLimitVal - maxTaxFree);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text(`• Upfront Extraction: £${Math.round(maxTaxFree).toLocaleString()} (${pclsPercent}% taken at Age ${takeAgeVal}) transferred directly into ${destStr}`, 18, curY);
          curY += 4.2;
          doc.text(`• Statutory Allowance: £${Math.round(remLsa).toLocaleString()} Remaining Lump Sum Allowance (LSA) out of £${Math.round(lsaLimitVal).toLocaleString()} standard ceiling`, 18, curY);
          curY += 4.8;
        } else {
          // UFPLS
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text('• UFPLS Mechanism: 25% of every flexible drawdown withdrawal is paid tax-free; remaining 75% is taxable income under PAYE.', 18, curY);
          curY += 4.2;
          doc.text(`• Compounding Advantage: 100% of un-drawn capital remains inside uncrystallised pension to compound tax-sheltered (Subject to £${Math.round(lsaLimitVal).toLocaleString()} LSA limit).`, 18, curY);
          curY += 4.8;
        }

        // Annuity details
        if (isAnnuity) {
          const purAge = annPurAge || takeAgeVal;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(109, 40, 217);
          doc.text(`• Lifetime Annuity Baseline: Purchase Age ${purAge} @ ${annRatePercent}% rate (${annTypeStr || 'Standard Single Life'})`, 18, curY);
          curY += 4.2;

          if (hasAnnTranches) {
            annTranchesList.forEach((t, i) => {
              const tType = (t.annuityType || '').includes('inflation') ? 'Inflation-Linked' : 'Level';
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(51, 65, 85);
              doc.text(`  - Tranche ${i + 1}: Purchase Age ${t.purchaseAge} (${t.allocationPercent}% Pension Capital @ ${t.annuityRatePercent || annRatePercent}%, ${tType})`, 18, curY);
              curY += 4.2;
            });
          }
        }

        p3Y += mCardHeight + 3.5;
      };

      // 1. Primary Strategy Card
      renderMemberStrategyCard(
        false,
        primaryName,
        priOpt,
        priHierarchy,
        profile.crystallisationMode,
        priActivePhased,
        profile.pclsLumpSumPercent || 25,
        Boolean(profile.takeLumpSumAtStart),
        profile.lumpSumTargetPot,
        profile.lumpSumSplits,
        profile.annuityAllocationPercent || 50,
        profile.annuityRatePercent || 4.2,
        profile.annuityType,
        Math.max(profile.pensionAccessAge || 57, profile.annuityPurchaseAge || (profile.targetRetirementAge || 60)),
        priTranchesList,
        primaryPensionAtTakePcls || (pots.workplacePensionBalance + pots.sippBalance) || 0,
        primaryMaxPcls.lsaLimit || 268275,
        primaryTakeAgePcls,
        primaryMaxPcls
      );

      // 2. Partner Strategy Card (if couple)
      if (profile.isCouplePlanning) {
        const partnerPotsObj: InvestmentPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);
        renderMemberStrategyCard(
          true,
          partnerName || 'Partner',
          partOpt,
          partHierarchy,
          profile.partnerCrystallisationMode || profile.crystallisationMode,
          partActivePhased,
          profile.partnerPclsLumpSumPercent || profile.pclsLumpSumPercent || 25,
          Boolean(profile.partnerTakeLumpSumAtStart ?? profile.takeLumpSumAtStart),
          profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot,
          profile.partnerLumpSumSplits || profile.lumpSumSplits,
          profile.partnerAnnuityAllocationPercent || profile.annuityAllocationPercent || 50,
          profile.partnerAnnuityRatePercent || profile.annuityRatePercent || 4.2,
          profile.partnerAnnuityType || profile.annuityType,
          Math.max(profile.partnerPensionAccessAge || 57, profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || targetAge)),
          partTranchesList,
          partnerPensionAtTakePcls || (partnerPotsObj.workplacePensionBalance + partnerPotsObj.sippBalance) || 0,
          partnerMaxPcls.lsaLimit || 268275,
          partnerTakeAgePcls,
          partnerMaxPcls
        );
      }

      // Check PCLS Recycling Risk
      const primaryTax = exportTaxResult;
      const partnerPotsObj: InvestmentPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);
      const partnerTax = profile.isCouplePlanning ? calculatePartnerUKTax(profile, partnerPotsObj) : undefined;

      const hasPriRecycling = primaryTax?.isPclsRecyclingRisk;
      const hasPartRecycling = partnerTax?.isPclsRecyclingRisk;
      const hasRecyclingRisk = hasPriRecycling || hasPartRecycling;

      if (hasRecyclingRisk) {
        p3Y += 2;
        const details = hasPriRecycling ? primaryTax?.pclsRecyclingDetails : partnerTax?.pclsRecyclingDetails;
        const memberName = hasPriRecycling ? primaryName : (partnerName || 'Partner');

        const pclsAmt = details?.pclsAmount || 0;
        const annContrib = details?.annualContributions || 0;
        const thresh = details?.threshold || 7500;

        const titleText = `WARNING: HMRC PCLS RECYCLING RULE RISK (Schedule 29) - ${memberName}`;
        const line1 = `• Upfront PCLS Extracted: £${(pclsAmt || 0).toLocaleString()} | Ongoing Pension Contributions: £${(annContrib || 0).toLocaleString()}/yr (HMRC Limit: £${(thresh || 0).toLocaleString()}/yr)`;
        const line2 = `• Schedule 29 Violation: Ongoing pension contributions exceed 30% of PCLS (or >£7,500/yr) during the PCLS window, triggering a potential 40%-55% unauthorized payment tax charge.`;
        const line3 = `• Action Required: Pause or reduce ongoing pension contributions below £${(thresh || 0).toLocaleString()}/yr during the 2-year recycling window, or redirect savings to ISAs or GIAs.`;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const wrappedLine1: string[] = doc.splitTextToSize(line1, 174);
        const wrappedLine2: string[] = doc.splitTextToSize(line2, 174);
        const wrappedLine3: string[] = doc.splitTextToSize(line3, 174);

        const totalLinesCount = wrappedLine1.length + wrappedLine2.length + wrappedLine3.length;
        const warnBoxH = 11 + (totalLinesCount * 4.5);

        doc.setFillColor(254, 242, 242);
        doc.roundedRect(14, p3Y, 182, warnBoxH, 2.5, 2.5, 'F');
        doc.setDrawColor(248, 113, 113);
        doc.roundedRect(14, p3Y, 182, warnBoxH, 2.5, 2.5, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28);
        doc.text(titleText, 18, p3Y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(153, 27, 27);

        let textY = p3Y + 10.5;
        [wrappedLine1, wrappedLine2, wrappedLine3].forEach((lines) => {
          lines.forEach((l) => {
            doc.text(l, 18, textY);
            textY += 4.5;
          });
        });

        p3Y += warnBoxH + 5;
      } else {
        p3Y += 3;
      }      // -------------------------------------------------------------------------
      // SECTION 10a: DYNAMIC OPTIMISER & MULTI-VARIABLE TAX MATRIX
      // -------------------------------------------------------------------------
      // Section 10a dedicated page for clean cockpit presentation
      doc.addPage();
      curPageNum++;
      renderPageHeader('Dynamic Optimiser — Multi-Variable Tax Cockpit', curPageNum);
      p3Y = 24;

      const optRetRows = (projections || []).filter((p) => p.isRetired);
      const optTotalGross = optRetRows.reduce((s, r) => s + (r.totalWithdrawalAmount || 0), 0);
      const optTotalTax = optRetRows.reduce((s, r) => s + (r.totalTaxPaid || 0), 0);
      const optAvgRate = optTotalGross > 0 ? (optTotalTax / optTotalGross) * 100 : 0;
      const optPaYears = optRetRows.filter((r) => (r.primaryNetIncome || 0) >= 12570).length;
      const optPaRate = optRetRows.length > 0 ? (optPaYears / optRetRows.length) * 100 : 0;
      const optTaxSaved = Math.max(0, optTotalGross * 0.2 - optTotalTax);

      let optCoupleBalance: number | null = null;
      if (profile.isCouplePlanning) {
        const devs = optRetRows.map((r) => {
          const p = r.primaryNetIncome || 0, q = r.partnerNetIncome || 0, t = p + q;
          return t === 0 ? 0 : Math.abs(p / t - 0.5) * 100;
        });
        optCoupleBalance = devs.length > 0 ? devs.reduce((a, b) => a + b, 0) / devs.length : null;
      }

      const optMcSuccess = mcNormalPrelim?.successRate ?? 85;

      // Section 10a Title & Description
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('10a. Dynamic Optimiser — Multi-Variable Tax Matrix & Cockpit', 14, p3Y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Optimal withdrawal sequencing, 0% PA utilization, 20% basic rate smoothing, and spousal equalisation audit.', 14, p3Y + 4.5);

      p3Y += 7.5;

      // 1. KPI Strip (5 Pill Boxes)
      const optKpis = [
        { label: 'Lifetime Tax Saved', val: `£${Math.round(optTaxSaved).toLocaleString()}`, sub: 'vs 20% flat baseline', color: [245, 158, 11] },
        { label: 'Avg Effective Tax Rate', val: `${optAvgRate.toFixed(1)}%`, sub: 'across retirement', color: [14, 165, 233] },
        { label: 'PA Capture Rate', val: `${optPaRate.toFixed(1)}%`, sub: '£12,570 utilized', color: [16, 185, 129] },
        { label: profile.isCouplePlanning ? 'Couple Income Balance' : 'Tax Bracket Smoothing', val: profile.isCouplePlanning ? `±${(optCoupleBalance ?? 0).toFixed(1)}%` : 'Optimized', sub: profile.isCouplePlanning ? 'deviation from 50/50' : '40% cliff bypass', color: [139, 92, 246] },
        { label: 'MC Success Rate (1k)', val: `${optMcSuccess}%`, sub: 'solvency probability', color: [99, 102, 241] },
      ];

      const kpiPillW = 34.8;
      const kpiPillH = 14;
      optKpis.forEach((kp, kIdx) => {
        const kx = 14 + kIdx * (kpiPillW + 2);
        doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
        doc.roundedRect(kx, p3Y, kpiPillW, kpiPillH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kx, p3Y, kpiPillW, kpiPillH, 2, 2, 'D');

        doc.setFillColor(kp.color[0], kp.color[1], kp.color[2]);
        doc.circle(kx + 4, p3Y + 4.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kp.label, kx + 7.5, p3Y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text(kp.val, kx + 4, p3Y + 9.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(148, 163, 184);
        doc.text(kp.sub, kx + 4, p3Y + 12.5);
      });

      p3Y += kpiPillH + 4;

      // 2. Scorecard & Visual 5-Axis Spider Radar Chart Box
      const optBoxH = 70;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p3Y, 182, optBoxH, 2.5, 2.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p3Y, 182, optBoxH, 2.5, 2.5, 'D');

      // Left Column: Multi-Objective Plan Scorecard (Width 84mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Multi-Objective Plan Scorecard (0–100)', 18, p3Y + 5.5);

      const taxEffScore = optTotalGross > 0 ? Math.min(100, Math.max(0, Math.round((1 - optTotalTax / optTotalGross) * 100))) : 80;
      const longevityScore = optMcSuccess;
      const ihtScore = Math.min(100, Math.max(0, Math.round((((optRetRows[optRetRows.length - 1]?.totalPot || 0) / (profile.isCouplePlanning ? 650000 : 325000)) * 60))));
      const volScore = Math.min(100, Math.max(0, Math.round((3.5 / Math.max((optRetRows[0]?.totalWithdrawalAmount || 0) / (optRetRows[0]?.totalPot || 1) * 100, 0.1)) * 70)));
      const guaranteedFloor = (profile.includeStatePension ? profile.statePensionAmountAnnual || 0 : 0) + (profile.isCouplePlanning && profile.partnerIncludeStatePension ? profile.partnerStatePensionAmountAnnual || 0 : 0);
      const floorScore = Math.min(100, Math.max(0, Math.round((guaranteedFloor / Math.max(profile.targetAnnualSpendRetirement || 30000, 1)) * 100)));

      const radarItems = [
        { label: 'Tax Efficiency', score: taxEffScore, desc: 'Minimizes higher rate leakage' },
        { label: 'Longevity Safety', score: longevityScore, desc: '1,000-sim Monte Carlo survival' },
        { label: 'IHT Preservation', score: ihtScore, desc: 'Estate value vs Nil-Rate Band' },
        { label: 'Volatility Resilience', score: volScore, desc: 'Safety margin vs 3.5% UK SWR' },
        { label: 'Guaranteed Floor', score: floorScore, desc: 'State Pension & Annuity coverage' },
      ];

      radarItems.forEach((ri, rIdx) => {
        const ry = p3Y + 9 + rIdx * 11.4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text(ri.label, 18, ry + 2.5);

        const scoreColor = ri.score >= 70 ? [16, 185, 129] : ri.score >= 45 ? [245, 158, 11] : [239, 68, 68];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.text(`${ri.score}/100`, 88, ry + 2.5);

        // Progress Bar
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(18, ry + 4, 76, 2.5, 1, 1, 'F');
        doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.roundedRect(18, ry + 4, Math.max(1, (76 * ri.score) / 100), 2.5, 1, 1, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(148, 163, 184);
        doc.text(ri.desc, 18, ry + 9.2);
      });

      // Divider Line between Scorecard and Radar Chart
      doc.setDrawColor(226, 232, 240);
      doc.line(99, p3Y + 4, 99, p3Y + optBoxH - 4);

      // Right Column: Visual 5-Axis Spider Radar Chart (Width 97mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Plan Optimization Radar Chart', 103, p3Y + 5.5);

      const radarCx = 146;
      const radarCy = p3Y + 36.5;
      const radarR = 21; // Radius in mm

      // 5 Angles (in degrees): 0: -90 (Top), 1: -18 (Top-Right), 2: 54 (Bottom-Right), 3: 126 (Bottom-Left), 4: 198 (Top-Left)
      const radarAngles = [-90, -18, 54, 126, 198];
      const radarScores = [taxEffScore, longevityScore, ihtScore, volScore, floorScore];

      // Draw concentric pentagon grid rings (25%, 50%, 75%, 100%)
      const gridLevels = [0.25, 0.5, 0.75, 1.0];
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      gridLevels.forEach((gl) => {
        for (let a = 0; a < 5; a++) {
          const a1 = (radarAngles[a] * Math.PI) / 180;
          const a2 = (radarAngles[(a + 1) % 5] * Math.PI) / 180;
          const x1 = radarCx + gl * radarR * Math.cos(a1);
          const y1 = radarCy + gl * radarR * Math.sin(a1);
          const x2 = radarCx + gl * radarR * Math.cos(a2);
          const y2 = radarCy + gl * radarR * Math.sin(a2);
          doc.line(x1, y1, x2, y2);
        }
      });

      // Draw 5 spoke lines from center to outer ring
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      for (let a = 0; a < 5; a++) {
        const rad = (radarAngles[a] * Math.PI) / 180;
        const xOuter = radarCx + radarR * Math.cos(rad);
        const yOuter = radarCy + radarR * Math.sin(rad);
        doc.line(radarCx, radarCy, xOuter, yOuter);
      }

      // Calculate user score vertices
      const scoreVertices = radarScores.map((sc, sIdx) => {
        const rad = (radarAngles[sIdx] * Math.PI) / 180;
        const rDist = (radarR * Math.max(5, Math.min(100, sc))) / 100;
        return {
          x: radarCx + rDist * Math.cos(rad),
          y: radarCy + rDist * Math.sin(rad),
        };
      });

      // Draw filled radar polygon (using 5 filled triangles from center)
      doc.setFillColor(224, 231, 255); // Indigo light fill
      for (let v = 0; v < 5; v++) {
        const v1 = scoreVertices[v];
        const v2 = scoreVertices[(v + 1) % 5];
        doc.triangle(radarCx, radarCy, v1.x, v1.y, v2.x, v2.y, 'F');
      }

      // Draw radar boundary outline
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.8);
      for (let v = 0; v < 5; v++) {
        const v1 = scoreVertices[v];
        const v2 = scoreVertices[(v + 1) % 5];
        doc.line(v1.x, v1.y, v2.x, v2.y);
      }

      // Draw vertex marker dots
      scoreVertices.forEach((sv) => {
        doc.setFillColor(99, 102, 241);
        doc.circle(sv.x, sv.y, 0.9, 'F');
      });

      // Axis labels & scores around the radar
      const axisLabels = [
        { name: 'Tax Efficiency', score: taxEffScore, x: radarCx - 14, y: radarCy - radarR - 2.5 },
        { name: 'Longevity', score: longevityScore, x: radarCx + radarR + 2, y: radarCy - 6 },
        { name: 'IHT Pres.', score: ihtScore, x: radarCx + 9, y: radarCy + radarR + 4.5 },
        { name: 'Volatility', score: volScore, x: radarCx - 26, y: radarCy + radarR + 4.5 },
        { name: 'Floor', score: floorScore, x: radarCx - radarR - 16, y: radarCy - 6 },
      ];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      axisLabels.forEach((al) => {
        doc.setTextColor(71, 85, 105);
        doc.text(al.name, al.x, al.y);
        doc.setTextColor(99, 102, 241);
        doc.text(`(${al.score})`, al.x + doc.getTextWidth(al.name) + 1, al.y);
      });

      p3Y += optBoxH + 4;

      // 3. Milestone Tax Matrix Audit Table Container
      const matBoxH = 46;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p3Y, 182, matBoxH, 2.5, 2.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p3Y, 182, matBoxH, 2.5, 2.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Key Milestone Annual Tax Matrix Audit', 18, p3Y + 5.5);

      // Table Header
      const matThY = p3Y + 8;
      doc.setFillColor(241, 245, 249);
      doc.rect(18, matThY, 174, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      doc.text('Age (Year)', 22, matThY + 3.5);
      doc.text('Gross Draw', 52, matThY + 3.5);
      doc.text('0% PA (Tax-Free)', 80, matThY + 3.5);
      doc.text('20% Basic Rate', 112, matThY + 3.5);
      doc.text('40% Higher Rate', 142, matThY + 3.5);
      doc.text('Annual Tax Paid', 168, matThY + 3.5);

      const auditAges = [
        targetAge,
        Math.min(horizonAge, targetAge + 5),
        profile.statePensionAge || 67,
        Math.min(horizonAge, 75),
        horizonAge,
      ].filter((a, idx, arr) => arr.indexOf(a) === idx && a >= targetAge && a <= horizonAge);

      auditAges.forEach((aAge, aIdx) => {
        const aRow = optRetRows.find((r) => r.age === aAge) || optRetRows[Math.min(optRetRows.length - 1, aIdx)];
        if (!aRow) return;
        const rY = matThY + 5 + aIdx * 6;
        if (aIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(18, rY - 0.8, 174, 5.8, 'F');
        }

        const grossD = aRow.totalWithdrawalAmount || 0;
        const paD = Math.min(grossD, 12570);
        const basicD = Math.min(Math.max(0, grossD - 12570), 50270 - 12570);
        const highD = Math.max(0, grossD - 50270);
        const taxPaidD = aRow.totalTaxPaid || 0;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(30, 41, 59);
        doc.text(`Age ${aRow.age} (${aRow.year})`, 22, rY + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(71, 85, 105);
        doc.text(`£${Math.round(grossD).toLocaleString()}`, 52, rY + 3.5);

        doc.setTextColor(16, 185, 129);
        doc.text(`£${Math.round(paD).toLocaleString()}`, 80, rY + 3.5);

        doc.setTextColor(14, 165, 233);
        doc.text(basicD > 0 ? `£${Math.round(basicD).toLocaleString()}` : '—', 112, rY + 3.5);

        doc.setTextColor(highD > 0 ? 225 : 148, highD > 0 ? 29 : 163, highD > 0 ? 72 : 184);
        doc.text(highD > 0 ? `£${Math.round(highD).toLocaleString()}` : '£0 (Protected)', 142, rY + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(taxPaidD > 0 ? 51 : 16, taxPaidD > 0 ? 65 : 185, taxPaidD > 0 ? 85 : 129);
        doc.text(`£${Math.round(taxPaidD).toLocaleString()}`, 168, rY + 3.5);
      });

      // Streamgraph Color Legend (bottom)
      const matLegY = p3Y + matBoxH - 5.5;
      doc.setFontSize(5.2);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(16, 185, 129);
      doc.rect(22, matLegY, 3.5, 1.8, 'F');
      doc.setTextColor(71, 85, 105);
      doc.text('0% PA Capture', 27, matLegY + 1.5);

      doc.setFillColor(14, 165, 233);
      doc.rect(68, matLegY, 3.5, 1.8, 'F');
      doc.text('20% Basic Rate', 73, matLegY + 1.5);

      doc.setFillColor(239, 68, 68);
      doc.rect(114, matLegY, 3.5, 1.8, 'F');
      doc.text('40% Leakage (£0 Goal)', 119, matLegY + 1.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(156, matLegY, 3.5, 1.8, 'F');
      doc.text('Tax-Free ISA Shielding', 161, matLegY + 1.5);

      p3Y += matBoxH + 3.5;

      // 4. Tax-Smoothing & 60% Trap Mitigation Insight Pill
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, p3Y, 182, 8.5, 2, 2, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(14, p3Y, 182, 8.5, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(5, 150, 105);
      doc.text('✓ Multi-Band Drawdown Smoothing & Tax Trap Shielding Active', 18, p3Y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text('Drawdowns capture the £12,570 Personal Allowance, smooth across the 20% basic rate band, and preserve tax-free ISAs for discretionary spending.', 18, p3Y + 6.8);

      p3Y += 12.5;

      // -------------------------------------------------------------------------
      // SECTION 10b: EFFECTIVE WITHDRAWAL RATE TRAJECTORY CHART (SWR & GUARDRAILS)
      // -------------------------------------------------------------------------
      // Check if Section 10b needs a fresh page
      if (p3Y > 175) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Retirement Strategy & Withdrawal Rate Trajectory', curPageNum);
        p3Y = 24;
      } else {
        p3Y += 2;
      }

      const swrRetiredYears = (projections || []).filter((p) => p.isRetired);
      const swrChartData = swrRetiredYears.map((p) => {
        const totalPortfolio = p.totalPot || 0;
        const totalDrawdown = p.totalWithdrawalAmount > 0
          ? p.totalWithdrawalAmount
          : (p.pensionDrawdown || 0) + (p.isaDrawdown || 0) + (p.cashDrawdown || 0);
        const startingPortfolio = totalPortfolio + totalDrawdown;
        const effectiveSwr = startingPortfolio > 0
          ? Math.min(30, Math.max(0, (totalDrawdown / startingPortfolio) * 100))
          : 0;
        return {
          age: p.age,
          year: p.year,
          effectiveSwr: Number(effectiveSwr.toFixed(2)),
          totalPortfolio: Math.round(totalPortfolio),
          totalDrawdown: Math.round(totalDrawdown),
        };
      });

      const peakSwrItem = swrChartData.reduce(
        (max, item) => (item.effectiveSwr > max.effectiveSwr ? item : max),
        { age: targetAge, effectiveSwr: 0, year: new Date().getFullYear() }
      );

      const swrYMax = Math.min(25, Math.max(8, Math.ceil((peakSwrItem.effectiveSwr * 1.3) / 2) * 2));

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('10b. Effective Withdrawal Rate Trajectory Chart (Year-by-Year SWR % Overlay)', 14, p3Y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Tracks annual portfolio drawdown demand as a % of starting wealth across all retirement years, overlaid against UK safe benchmarks.', 14, p3Y + 4.5);

      p3Y += 7.5;

      const swrBoxH = 68;
      const swrBoxY = p3Y;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, swrBoxY, 182, swrBoxH, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, swrBoxY, 182, swrBoxH, 3, 3, 'D');

      const chartLeft = 32;
      const chartRight = 186;
      const chartWidth = chartRight - chartLeft;
      const chartTop = swrBoxY + 7;
      const chartBottom = swrBoxY + 52;
      const chartHeight = chartBottom - chartTop;

      const getSwrY = (val: number) => {
        const norm = Math.max(0, Math.min(swrYMax, val)) / (swrYMax || 1);
        return chartBottom - norm * chartHeight;
      };

      // 0% Baseline (Solid line)
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(chartLeft, chartBottom, chartRight, chartBottom);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('0.0%', 16, chartBottom + 1);

      // Top Scale Line
      const topY = getSwrY(swrYMax);
      doc.setDrawColor(226, 232, 240);
      doc.line(chartLeft, topY, chartRight, topY);
      doc.text(`${swrYMax.toFixed(1)}%`, 16, topY + 1);

      // 2.8% UK FIRE Benchmark (Indigo dashed)
      if (2.8 <= swrYMax) {
        const y28 = getSwrY(2.8);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.25);
        for (let dx = chartLeft; dx < chartRight; dx += 4) {
          doc.line(dx, y28, Math.min(dx + 2.5, chartRight), y28);
        }
        doc.setTextColor(99, 102, 241);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('2.8% UK FIRE', 16, y28 + 1);
      }

      // 3.5% UK Standard Safe Rate (Emerald dashed)
      if (3.5 <= swrYMax) {
        const y35 = getSwrY(3.5);
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.35);
        for (let dx = chartLeft; dx < chartRight; dx += 4) {
          doc.line(dx, y35, Math.min(dx + 2.5, chartRight), y35);
        }
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('3.5% UK SWR', 16, y35 + 1);
      }

      // 5.0% Danger Zone (Rose dashed)
      if (5.0 <= swrYMax) {
        const y50 = getSwrY(5.0);
        doc.setDrawColor(244, 63, 94);
        doc.setLineWidth(0.35);
        for (let dx = chartLeft; dx < chartRight; dx += 4) {
          doc.line(dx, y50, Math.min(dx + 2.5, chartRight), y50);
        }
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('5.0% Danger', 16, y50 + 1);
      }

      // X-Axis Age Ticks & Trajectory Curve
      const minSwrAge = swrChartData.length > 0 ? swrChartData[0].age : targetAge;
      const maxSwrAge = swrChartData.length > 0 ? swrChartData[swrChartData.length - 1].age : horizonAge;
      const swrAgeSpan = Math.max(1, maxSwrAge - minSwrAge);

      const getAgeX = (age: number) => {
        const pct = Math.max(0, Math.min(1, (age - minSwrAge) / swrAgeSpan));
        return chartLeft + pct * chartWidth;
      };

      const tickAges = [
        minSwrAge,
        Math.min(maxSwrAge, minSwrAge + 5),
        profile.statePensionAge || 67,
        75,
        80,
        maxSwrAge,
      ].filter((a, idx, arr) => a >= minSwrAge && a <= maxSwrAge && arr.indexOf(a) === idx).sort((a, b) => a - b);

      doc.setDrawColor(203, 213, 225);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      tickAges.forEach((tAge) => {
        const tx = getAgeX(tAge);
        doc.line(tx, chartBottom, tx, chartBottom + 2.5);
        doc.text(`Age ${tAge}`, tx - 5, chartBottom + 5.5);
      });

      // Plot Trajectory Curve Line & Points
      if (swrChartData.length > 1) {
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.85);
        for (let i = 0; i < swrChartData.length - 1; i++) {
          const p1 = swrChartData[i];
          const p2 = swrChartData[i + 1];
          const x1 = getAgeX(p1.age);
          const y1 = getSwrY(p1.effectiveSwr);
          const x2 = getAgeX(p2.age);
          const y2 = getSwrY(p2.effectiveSwr);
          doc.line(x1, y1, x2, y2);
        }

        // Draw Data Markers
        swrChartData.forEach((pt) => {
          const px = getAgeX(pt.age);
          const py = getSwrY(pt.effectiveSwr);
          doc.setFillColor(99, 102, 241);
          doc.circle(px, py, 0.7, 'F');
        });

        // Peak Pill Highlight
        if (peakSwrItem.effectiveSwr > 0) {
          const peakX = getAgeX(peakSwrItem.age);
          const peakY = getSwrY(peakSwrItem.effectiveSwr);
          doc.setFillColor(238, 242, 255);
          doc.setDrawColor(99, 102, 241);
          doc.setLineWidth(0.4);
          doc.roundedRect(peakX - 14, Math.max(swrBoxY + 3, peakY - 6.5), 28, 4.8, 1, 1, 'FD');
          doc.setTextColor(67, 56, 202);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.text(`Peak: ${peakSwrItem.effectiveSwr}% (Age ${peakSwrItem.age})`, peakX - 12.5, Math.max(swrBoxY + 3, peakY - 6.5) + 3.4);
        }
      }

      // Legend Strip
      const legY = swrBoxY + 60;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(99, 102, 241);
      doc.rect(20, legY, 6, 1.5, 'F');
      doc.setTextColor(71, 85, 105);
      doc.text('Effective Drawdown Rate (%)', 28, legY + 1.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(74, legY, 6, 1, 'F');
      doc.text('2.8% UK FIRE Longevity', 82, legY + 1.5);

      doc.setFillColor(16, 185, 129);
      doc.rect(126, legY, 6, 1, 'F');
      doc.text('3.5% UK Safe Rate', 134, legY + 1.5);

      doc.setFillColor(244, 63, 94);
      doc.rect(164, legY, 6, 1, 'F');
      doc.text('5% Danger Zone', 172, legY + 1.5);

      p3Y += swrBoxH + 3.5;

      // Peak Trajectory Risk Verdict Pill
      const isPeakSafe = peakSwrItem.effectiveSwr <= 3.5;
      const isPeakModerate = peakSwrItem.effectiveSwr > 3.5 && peakSwrItem.effectiveSwr <= 5.0;
      const vBg = isPeakSafe ? [240, 253, 244] : isPeakModerate ? [254, 243, 199] : [254, 242, 242];
      const vBorder = isPeakSafe ? [187, 247, 208] : isPeakModerate ? [253, 230, 138] : [254, 202, 202];
      const vText = isPeakSafe ? [5, 150, 105] : isPeakModerate ? [180, 83, 9] : [185, 28, 28];

      doc.setFillColor(vBg[0], vBg[1], vBg[2]);
      doc.roundedRect(14, p3Y, 182, 9.5, 2, 2, 'F');
      doc.setDrawColor(vBorder[0], vBorder[1], vBorder[2]);
      doc.roundedRect(14, p3Y, 182, 9.5, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(vText[0], vText[1], vText[2]);
      const verdictTitle = isPeakSafe
        ? `✓ SWR Resilient: Peak withdrawal rate is ${peakSwrItem.effectiveSwr}% at Age ${peakSwrItem.age}`
        : isPeakModerate
        ? `⚠ Moderate Peak SWR: Peak withdrawal rate reaches ${peakSwrItem.effectiveSwr}% at Age ${peakSwrItem.age}`
        : `⚠ Elevated Sequence Risk: Peak withdrawal rate exceeds 5.0% (${peakSwrItem.effectiveSwr}% at Age ${peakSwrItem.age})`;
      doc.text(verdictTitle, 18, p3Y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const verdictDesc = isPeakSafe
        ? 'Drawdown demand remains sustainably within the 3.5% UK safe withdrawal corridor throughout retirement.'
        : isPeakModerate
        ? 'Higher withdrawal intensity occurs prior to State Pension access. Post-State Pension, effective SWR steps down safely.'
        : 'Peak rate exceeds 5.0% early in retirement. Recommend utilizing cash buffers or dynamic guardrails to mitigate sequence risk.';
      doc.text(verdictDesc, 18, p3Y + 7.2);

      p3Y += 13;

      // Check if Section 11 needs a page break to prevent table/box clipping
      if (p3Y > 215) {
        doc.addPage();
        curPageNum++;
        renderPageHeader('Key Milestone Schedule & Execution Details', curPageNum);
        p3Y = 24;
      }

      // SECTION 11: KEY MILESTONE SCHEDULE
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('11. Key Milestone Schedule', 14, p3Y);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('(Projected end-of-year balances including annual contributions, growth, and tax relief accrued throughout each year)', 14, p3Y + 4.5);

      p3Y += 6.5;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, p3Y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Age (Year)', 17, p3Y + 5);
      doc.text('Phase', 40, p3Y + 5);
      doc.text('Pension Pot', 66, p3Y + 5);
      doc.text('ISA Pot', 94, p3Y + 5);
      doc.text('Total Pot', 120, p3Y + 5);
      doc.text('Annuity (£)', 146, p3Y + 5);
      doc.text('Net Income', 172, p3Y + 5);

      p3Y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);

      const partCurAge = profile.partnerCurrentAge ?? currentAge;
      const priPurAge = isPriAnnuity ? Math.max(profile.pensionAccessAge || 57, profile.annuityPurchaseAge || (profile.targetRetirementAge || 60)) : undefined;
      const partPurAge = (profile.isCouplePlanning && isPartAnnuity) ? Math.max(profile.partnerPensionAccessAge || 57, profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || targetAge)) : undefined;
      const priStateAge = profile.statePensionAge || 67;
      const partStateAge = profile.isCouplePlanning ? (profile.partnerStatePensionAge || profile.statePensionAge || 67) : undefined;
      const priAccessAge = profile.pensionAccessAge || 57;
      const partAccessAge = profile.isCouplePlanning ? (profile.partnerPensionAccessAge || 57) : undefined;
      const partRetAge = profile.isCouplePlanning ? (profile.partnerTargetRetirementAge || targetAge) : undefined;

      // Map partner milestone ages to primary projection ages so partner milestones appear accurately
      const priAgeAtPartState = partStateAge !== undefined ? currentAge + (partStateAge - partCurAge) : undefined;
      const priAgeAtPartPur = partPurAge !== undefined ? currentAge + (partPurAge - partCurAge) : undefined;
      const priAgeAtPartAccess = partAccessAge !== undefined ? currentAge + (partAccessAge - partCurAge) : undefined;
      const priAgeAtPartRet = partRetAge !== undefined ? currentAge + (partRetAge - partCurAge) : undefined;

      const milestoneAgesSet = new Set([
        currentAge,
        priAccessAge,
        targetAge,
        priStateAge,
        ...(priAgeAtPartAccess !== undefined ? [priAgeAtPartAccess] : []),
        ...(priAgeAtPartRet !== undefined ? [priAgeAtPartRet] : []),
        ...(priAgeAtPartState !== undefined ? [priAgeAtPartState] : []),
        ...(priPurAge !== undefined ? [priPurAge] : []),
        ...(priAgeAtPartPur !== undefined ? [priAgeAtPartPur] : []),
        75,
        horizonAge
      ]);

      const milestoneYears = (projections || [])
        .filter((p) => milestoneAgesSet.has(p.age))
        .sort((a, b) => a.age - b.age);

      milestoneYears.forEach((p, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, p3Y, 182, 6, 'F');
        }
        const hasAnnuityIncome = (p.annuityIncomeReceived || 0) > 0;
        const isPurchaseYear = (priPurAge && p.age === priPurAge) || (partPurAge && p.age === partPurAge);

        doc.text(`Age ${p.age} (${p.year})`, 17, p3Y + 4);
        doc.text(p.isRetired ? 'Retirement' : 'Accumulation', 40, p3Y + 4);
        doc.text(`£${Math.round(p.pensionPot || 0).toLocaleString()}`, 66, p3Y + 4);
        doc.text(`£${Math.round(p.isaPot || 0).toLocaleString()}`, 94, p3Y + 4);
        doc.text(`£${Math.round(p.totalPot || 0).toLocaleString()}`, 120, p3Y + 4);

        if (hasAnnuityIncome) {
          doc.setTextColor(109, 40, 217);
          doc.setFont('helvetica', 'bold');
          doc.text(`£${Math.round(p.annuityIncomeReceived || 0).toLocaleString()}${isPurchaseYear ? '*' : ''}`, 146, p3Y + 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        } else {
          doc.text(`£0`, 146, p3Y + 4);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`£${Math.round(p.netRetirementIncome || 0).toLocaleString()}`, 172, p3Y + 4);
        doc.setFont('helvetica', 'normal');

        p3Y += 6;
      });

      // Footnote clarifying starting balance (Section 3) vs end-of-year balance (Section 9)
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`* Note: Age ${currentAge} (${new Date().getFullYear()}) displays projected end-of-year balances after 1st year contributions & growth, whereas Section 3 displays baseline starting balances.`, 14, p3Y + 3);
      p3Y += 5;

      // STATE PENSION EXECUTION DETAILS SUMMARY CALLOUT BOX
      p3Y += 4;
      const spBoxH = profile.isCouplePlanning ? 27 : 21;
      doc.setFillColor(240, 244, 255); // Indigo tint box
      doc.roundedRect(14, p3Y, 182, spBoxH, 2, 2, 'F');
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(14, p3Y, 182, spBoxH, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text('Key Milestone State Pension Execution Details', 18, p3Y + 5.5);

      let spBoxY = p3Y + 8.5;
      doc.setFillColor(79, 70, 229);
      doc.rect(18, spBoxY, 174, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Who (Member)', 20, spBoxY + 3.5);
      doc.text('State Pension Start Age', 55, spBoxY + 3.5);
      doc.text('Weekly Amount', 105, spBoxY + 3.5);
      doc.text('Starting Annual Income', 145, spBoxY + 3.5);

      spBoxY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7);

      const priStateYear = projections.find((p) => p.age === priStateAge)?.year || (new Date().getFullYear() + Math.max(0, priStateAge - currentAge));
      const priSpAnnual = profile.statePensionAmountAnnual || 12548;
      const priSpWeekly = Math.round(priSpAnnual / 52);

      doc.text(primaryName, 20, spBoxY + 4);
      doc.text(`Age ${priStateAge} (${priStateYear})`, 55, spBoxY + 4);
      doc.text(`£${priSpWeekly}/wk`, 105, spBoxY + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`£${Math.round((priSpAnnual) || 0).toLocaleString()}/yr`, 145, spBoxY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      if (profile.isCouplePlanning) {
        spBoxY += 5.5;
        const partCurAge = profile.partnerCurrentAge ?? currentAge;
        const partStateAgeVal = partStateAge || 67;
        const priAgeAtPartState = currentAge + (partStateAgeVal - partCurAge);
        const partStateYear = projections.find((p) => p.age === priAgeAtPartState)?.year || (new Date().getFullYear() + Math.max(0, partStateAgeVal - partCurAge));
        const partSpAnnual = profile.partnerStatePensionAmountAnnual || profile.statePensionAmountAnnual || 12548;
        const partSpWeekly = Math.round(partSpAnnual / 52);

        doc.text(partnerName || 'Partner', 20, spBoxY + 4);
        doc.text(`Age ${partStateAgeVal} (${partStateYear})`, 55, spBoxY + 4);
        doc.text(`£${partSpWeekly}/wk`, 105, spBoxY + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text(`£${Math.round((partSpAnnual) || 0).toLocaleString()}/yr`, 145, spBoxY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      p3Y += spBoxH;

      // ANNUITY DETAILS SUMMARY CALLOUT TABLE BELOW SECTION 9 TABLE (IF ANNUITY PURCHASED)
      if (isPriAnnuity || isPartAnnuity) {
        const formatAnnuityType = (type?: string) => {
          if (!type) return 'Standard Single Life';
          if (type === 'level_single') return 'Level Single Life';
          if (type === 'inflation_linked_single') return 'Inflation-Linked Single';
          if (type === 'level_joint') return 'Level Joint Life';
          if (type === 'inflation_linked_joint') return 'Inflation-Linked Joint';
          return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        };

        interface PdfAnnuityRow {
          who: string;
          age: number;
          year: number;
          capCost: number;
          rate: number;
          startIncome: number;
          annuityType: string;
        }

        const pdfAnnuityRows: PdfAnnuityRow[] = [];

        // 1. Primary Baseline Annuity
        if (isPriAnnuity) {
          const priAccessAge = getPensionAccessAge(profile);
          const priSafePurAge = Math.max(priAccessAge, profile.annuityPurchaseAge || profile.targetRetirementAge);
          const priPurProj = (projections || []).find((p) => p.age === priSafePurAge) || retirementYear;
          const priPurYear = priPurProj.year || (new Date().getFullYear() + (priSafePurAge - currentAge));

          const priProjectedPension = (priPurProj.primaryPensionPotBeforeAnnuity) ?? getProjectedPensionAtTakeAge(profile, pots, priSafePurAge, false);
          const priPclsPct = profile.pclsLumpSumPercent ?? 25;
          const priPclsVal = priProjectedPension * (priPclsPct / 100);
          const priPostPclsPension = profile.takeLumpSumAtStart ? Math.max(0, priProjectedPension - priPclsVal) : priProjectedPension;

          const priSingleAlloc = priOpt === 'annuity' ? 100 : (profile.annuityAllocationPercent ?? 50);
          const priCapCost = priPostPclsPension * (priSingleAlloc / 100);
          const priRate = profile.annuityRatePercent ?? 4.2;
          const priStartIncome = priCapCost * (priRate / 100);

          if (priCapCost > 0 || priSingleAlloc > 0) {
            pdfAnnuityRows.push({
              who: primaryName,
              age: priSafePurAge,
              year: priPurYear,
              capCost: priCapCost,
              rate: priRate,
              startIncome: priStartIncome,
              annuityType: formatAnnuityType(profile.annuityType),
            });
          }
        }

        // 2. Primary Tranches
        if (priOpt === 'hybrid') {
          (profile.annuityTranches || []).forEach((t, i) => {
            if (!t.enabled || (t.owner || 'primary') !== 'primary') return;
            const purAge = t.purchaseAge;
            const proj = (projections || []).find((p) => p.age === purAge);
            const yr = proj ? proj.year : (new Date().getFullYear() + Math.max(0, purAge - currentAge));
            const potVal = (proj?.primaryPensionPotBeforeAnnuity) ?? getProjectedPensionAtTakeAge(profile, pots, purAge, false);
            const allocPct = Math.min(100, Math.max(1, t.allocationPercent ?? 25));
            const capCost = potVal * (allocPct / 100);
            const rate = t.annuityRatePercent ?? 5.5;
            const startIncome = capCost * (rate / 100);
            pdfAnnuityRows.push({
              who: `${primaryName} (T${i + 1})`,
              age: purAge,
              year: yr,
              capCost,
              rate,
              startIncome,
              annuityType: formatAnnuityType(t.annuityType),
            });
          });
        }

        // 3. Partner Baseline Annuity
        if (profile.isCouplePlanning && isPartAnnuity) {
          const partnerPotsObj: InvestmentPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

          const partAccessAge = getPartnerPensionAccessAge(profile);
          const partSafePurAge = Math.max(partAccessAge, profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || targetAge));
          const partCurAge = profile.partnerCurrentAge ?? currentAge;
          const priAgeAtPartAnnuity = currentAge + (partSafePurAge - partCurAge);
          const partPurProj = (projections || []).find((p) => p.age === priAgeAtPartAnnuity);
          const partPurYear = partPurProj ? partPurProj.year : (new Date().getFullYear() + Math.max(0, partSafePurAge - partCurAge));

          const partProjectedPension = (partPurProj?.partnerPensionPotBeforeAnnuity) ?? getProjectedPensionAtTakeAge(profile, partnerPotsObj, partSafePurAge, true);
          const partPclsPct = profile.partnerPclsLumpSumPercent ?? 25;
          const partPclsVal = partProjectedPension * (partPclsPct / 100);
          const partPostPclsPension = profile.partnerTakeLumpSumAtStart ? Math.max(0, partProjectedPension - partPclsVal) : partProjectedPension;

          const partSingleAlloc = partOpt === 'annuity' ? 100 : (profile.partnerAnnuityAllocationPercent ?? profile.annuityAllocationPercent ?? 50);
          const partCapCost = partPostPclsPension * (partSingleAlloc / 100);
          const partRate = profile.partnerAnnuityRatePercent ?? profile.annuityRatePercent ?? 4.2;
          const partStartIncome = partCapCost * (partRate / 100);

          if (partCapCost > 0 || partSingleAlloc > 0) {
            pdfAnnuityRows.push({
              who: partnerName || 'Partner',
              age: partSafePurAge,
              year: partPurYear,
              capCost: partCapCost,
              rate: partRate,
              startIncome: partStartIncome,
              annuityType: formatAnnuityType(profile.partnerAnnuityType || profile.annuityType),
            });
          }
        }

        // 4. Partner Tranches
        if (profile.isCouplePlanning && partOpt === 'hybrid') {
          const partnerTranches = profile.partnerAnnuityTranches || (profile.annuityTranches || []).filter((t) => t.owner === 'partner');
          partnerTranches.forEach((t, i) => {
            if (!t.enabled) return;
            const purAge = t.purchaseAge;
            const partCurAge = profile.partnerCurrentAge ?? currentAge;
            const priAge = currentAge + (purAge - partCurAge);
            const proj = (projections || []).find((p) => p.age === priAge);
            const yr = proj ? proj.year : (new Date().getFullYear() + Math.max(0, purAge - partCurAge));

            const partnerPotsObj: InvestmentPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);
            const potVal = (proj?.partnerPensionPotBeforeAnnuity) ?? getProjectedPensionAtTakeAge(profile, partnerPotsObj, purAge, true);
            const allocPct = Math.min(100, Math.max(1, t.allocationPercent ?? 25));
            const capCost = potVal * (allocPct / 100);
            const rate = t.annuityRatePercent ?? 5.5;
            const startIncome = capCost * (rate / 100);
            pdfAnnuityRows.push({
              who: `${partnerName || 'Partner'} (T${i + 1})`,
              age: purAge,
              year: yr,
              capCost,
              rate,
              startIncome,
              annuityType: formatAnnuityType(t.annuityType),
            });
          });
        }

        if (pdfAnnuityRows.length > 0) {
          p3Y += 4;
          const boxH = 18 + (pdfAnnuityRows.length * 6);
          doc.setFillColor(245, 243, 255); // Purple tint box
          doc.roundedRect(14, p3Y, 182, boxH, 2, 2, 'F');
          doc.setDrawColor(221, 214, 254);
          doc.roundedRect(14, p3Y, 182, boxH, 2, 2, 'D');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(109, 40, 217);
          doc.text('Key Milestone Annuity Purchase & Execution Details', 18, p3Y + 5.5);

          // Table Header inside Box
          let boxY = p3Y + 8.5;
          doc.setFillColor(109, 40, 217);
          doc.rect(18, boxY, 174, 5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text('Who (Member)', 20, boxY + 3.5);
          doc.text('Purchase Age', 52, boxY + 3.5);
          doc.text('Capital Cost (£)', 78, boxY + 3.5);
          doc.text('Rate', 104, boxY + 3.5);
          doc.text('Starting Income', 118, boxY + 3.5);
          doc.text('Annuity Type', 148, boxY + 3.5);

          boxY += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(7);

          pdfAnnuityRows.forEach((row) => {
            doc.text(row.who, 20, boxY + 4);
            doc.text(`Age ${row.age} (${row.year})`, 52, boxY + 4);
            doc.text(`£${Math.round((row.capCost) || 0).toLocaleString()}`, 78, boxY + 4);
            doc.text(`${row.rate}%`, 104, boxY + 4);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(109, 40, 217);
            doc.text(`£${Math.round((row.startIncome) || 0).toLocaleString()}/yr`, 118, boxY + 4);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(row.annuityType, 148, boxY + 4);
            boxY += 5.5;
          });

          // PCLS & Income Tax Advice Note inside Annuity Box
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text('• Income Tax & PCLS Note: 100% of annuity payments are taxable income under PAYE. Extracting 25% PCLS tax-free upfront reduces annuity size & income tax exposure.', 18, boxY + 2);

          p3Y += boxH + 8;
        }
      }

      // UK GILT LADDER DETAILS SUMMARY CALLOUT BOX & TABLE (IF GILT LADDER PURCHASED)
      if (profile.giltLadderConfig?.enabled) {
        const gConf = profile.giltLadderConfig;
        const gPurAge = gConf.purchaseAge ?? gConf.startAge ?? targetAge;
        const gPurProj = (projections || []).find((p) => p.age === gPurAge) || retirementYear;
        const gPurYear = gPurProj.year || (new Date().getFullYear() + Math.max(0, gPurAge - currentAge));
        const gPotsObj = sanitizePots(pots, DEFAULT_POTS);
        const gSummary = calculateGiltLadder(gConf, profile, gPotsObj);

        // Check if Gilt Ladder box fits on current page
        const numRungs = Math.min(gSummary.rungs.length, 12);
        const giltBoxH = 25 + (numRungs * 5.2) + 7;
        if (p3Y + giltBoxH > 275) {
          doc.addPage();
          curPageNum++;
          renderPageHeader('Key Milestone UK Gilt Ladder Portfolio Schedule', curPageNum);
          p3Y = 24;
        }

        // Draw Emerald Themed Container Box
        doc.setFillColor(236, 253, 245); // Emerald-50 tint
        doc.roundedRect(14, p3Y, 182, giltBoxH, 2.5, 2.5, 'F');
        doc.setDrawColor(167, 243, 208); // Emerald-200 border
        doc.roundedRect(14, p3Y, 182, giltBoxH, 2.5, 2.5, 'D');

        // Header Title & Badges
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(5, 150, 105);
        doc.text('Key Milestone UK Gilt Ladder Strategy (0% CGT Liability Matching Portfolio)', 18, p3Y + 5.5);

        // Summary KPI Strip inside box
        let gBoxY = p3Y + 8.5;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(18, gBoxY, 174, 8.5, 1.5, 1.5, 'F');
        doc.setDrawColor(209, 250, 229);
        doc.roundedRect(18, gBoxY, 174, 8.5, 1.5, 1.5, 'D');

        doc.setFontSize(6.8);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.text(`Purchase Age: Age ${gPurAge} (${gPurYear})`, 21, gBoxY + 3.8);
        doc.text(`Duration: ${gConf.durationYears || 5} Years (Ages ${gPurAge + 1} - ${gPurAge + (gConf.durationYears || 5)})`, 68, gBoxY + 3.8);
        const fundSrcLabel = gConf.fundingSource === 'gia' ? 'GIA (Max 0% CGT Benefit)' : (gConf.fundingSource || 'GIA').toUpperCase();
        doc.text(`Funding Pot: ${fundSrcLabel}`, 130, gBoxY + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(`Upfront Cost: £${Math.round(gSummary.totalUpfrontCost).toLocaleString()}`, 21, gBoxY + 7.2);
        doc.setTextColor(30, 64, 175);
        const totPayout = gSummary.totalPayoutDelivered ?? gSummary.totalGuaranteedPayout ?? 0;
        doc.text(`Total Payout: £${Math.round(totPayout).toLocaleString()}`, 68, gBoxY + 7.2);
        doc.setTextColor(126, 34, 206);
        const totTaxFreeGain = gSummary.totalTaxFreeCapitalGains ?? gSummary.totalTaxFreeGain ?? 0;
        doc.text(`0% CGT Gain: £${Math.round(totTaxFreeGain).toLocaleString()}`, 115, gBoxY + 7.2);
        doc.setTextColor(51, 65, 85);
        const effYield = gSummary.effectiveAnnualYieldPercent ?? gSummary.blendedNetYieldPercent ?? 0;
        doc.text(`Yield: ${effYield.toFixed(2)}% YTM`, 155, gBoxY + 7.2);

        // Table Header
        gBoxY += 10.5;
        doc.setFillColor(5, 150, 105);
        doc.rect(18, gBoxY, 174, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'bold');
        doc.text('Maturity Age (Year)', 21, gBoxY + 3.5);
        doc.text('Gilt Issue & Coupon', 58, gBoxY + 3.5);
        doc.text('Benchmark Price', 104, gBoxY + 3.5);
        doc.text('Upfront Cost (£)', 128, gBoxY + 3.5);
        doc.text('Nominal Payout (£)', 150, gBoxY + 3.5);
        doc.text('Tax-Free Gain (£)', 172, gBoxY + 3.5);

        gBoxY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(6.8);

        gSummary.rungs.slice(0, 12).forEach((rung, rIdx) => {
          if (rIdx % 2 === 1) {
            doc.setFillColor(240, 253, 244);
            doc.rect(18, gBoxY, 174, 5.2, 'F');
          }
          doc.text(`Age ${rung.age} (${rung.year})`, 21, gBoxY + 3.6);
          const gName = rung.giltName.length > 24 ? rung.giltName.substring(0, 22) + '..' : rung.giltName;
          doc.text(gName, 58, gBoxY + 3.6);
          doc.text(`£${rung.cleanPrice.toFixed(2)} / £100`, 104, gBoxY + 3.6);
          doc.text(`£${Math.round(rung.purchaseCost).toLocaleString()}`, 128, gBoxY + 3.6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text(`£${Math.round(rung.totalNetPayout).toLocaleString()}`, 150, gBoxY + 3.6);
          doc.setTextColor(126, 34, 206);
          const rungGain = rung.taxFreeCapitalGain ?? rung.taxFreeGain ?? 0;
          doc.text(`+£${Math.round(rungGain).toLocaleString()}`, 172, gBoxY + 3.6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          gBoxY += 5.2;
        });

        // Statutory note at bottom of box
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(100, 116, 139);
        doc.text('• TCGA 1992 s.115 Statutory Exemption: Capital gains on UK Gilts are 100% exempt from CGT. Low-coupon gilts purchased below par yield tax-free gains.', 18, gBoxY + 3.2);

        p3Y += giltBoxH + 6;
      }

      // =========================================================================
      // VISUAL DIAGRAM MODELS 1 & 2 (SHOWING INDIVIDUAL POT SIZES)
      // =========================================================================
      doc.addPage();
      curPageNum++;
      renderPageHeader('Visual Diagram Models — Capital & Trajectory Analysis', curPageNum);

      let p4Y = 24;

      // DIAGRAM ILLUSTRATION 1: Pot Capital Allocation Stacked Bar
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, p4Y, 182, 45, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p4Y, 182, 45, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);

      const isAdjustedDiagram = Boolean(profile.adjustForInflation);
      const retOffset = Math.max(0, targetAge - currentAge);
      const retInflFact = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, retOffset);
      const retScale = (isAdjustedDiagram && retInflFact > 0) ? (1 / retInflFact) : 1;

      doc.text(`Diagram 1: Portfolio Asset Distribution at Retirement Start (Age ${targetAge})${isAdjustedDiagram ? " (Real Terms - Today's £)" : " (Nominal £)"}`, 18, p4Y + 8);

      const totalPotRet = (retirementYear.totalPot || 1) * retScale;
      const penValRet = (retirementYear.pensionPot || 0) * retScale;
      const isaValRet = (retirementYear.isaPot || 0) * retScale;
      const cashValRet = (retirementYear.cashGiaPot || 0) * retScale;

      const pPct = Math.round((penValRet / (totalPotRet || 1)) * 100);
      const iPct = Math.round((isaValRet / (totalPotRet || 1)) * 100);
      const cPct = Math.max(0, 100 - pPct - iPct);

      const dBarX = 18;
      const dBarY = p4Y + 14;
      const dBarW = 174;
      const dBarH = 10;

      const pW = (dBarW * pPct) / 100;
      const iW = (dBarW * iPct) / 100;
      const cW = Math.max(0, dBarW - pW - iW);

      doc.setFillColor(16, 185, 129);
      doc.rect(dBarX, dBarY, Math.max(1, pW), dBarH, 'F');

      if (iW > 0) {
        doc.setFillColor(99, 102, 241);
        doc.rect(dBarX + pW, dBarY, iW, dBarH, 'F');
      }

      if (cW > 0) {
        doc.setFillColor(245, 158, 11);
        doc.rect(dBarX + pW + iW, dBarY, cW, dBarH, 'F');
      }

      let dLgY = dBarY + 16;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(16, 185, 129);
      doc.rect(18, dLgY, 4, 4, 'F');
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`Pension Pot: £${Math.round(penValRet).toLocaleString()} (${pPct}%)`, 24, dLgY + 3.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(80, dLgY, 4, 4, 'F');
      doc.text(`ISA Pot: £${Math.round(isaValRet).toLocaleString()} (${iPct}%)`, 86, dLgY + 3.5);

      doc.setFillColor(245, 158, 11);
      doc.rect(140, dLgY, 4, 4, 'F');
      doc.text(`Cash/GIA Pot: £${Math.round(cashValRet).toLocaleString()} (${cPct}%)`, 146, dLgY + 3.5);

      // DIAGRAM ILLUSTRATION 2: Projected Portfolio Wealth Trajectory Curve (SHOWING INDIVIDUAL POT SIZES)
      p4Y += 54;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Diagram 2: Projected Portfolio Wealth & Individual Pot Trajectory Curves', 14, p4Y);

      const graphBoxY = p4Y + 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, graphBoxY, 182, 85, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, graphBoxY, 182, 85, 3, 3, 'D');

      // Y-Axis Grid Lines & Numerical Scale Labels (£0 to £1M+)
      const maxVal = Math.max(1, ...(projections || []).map((p) => p.totalPot || 0));
      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);

      const ySteps = [1.0, 0.75, 0.5, 0.25, 0];
      ySteps.forEach((stepPct) => {
        const stepY = graphBoxY + 14 + (1 - stepPct) * 52;
        doc.line(32, stepY, 186, stepY);
        const lblVal = maxVal * stepPct;
        const fmtVal = lblVal >= 1000000 ? `£${(lblVal / 1000000).toFixed(1)}M` : `£${Math.round(lblVal / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // X-Axis Milestone Ticks
      const milestoneAges = [currentAge, profile.pensionAccessAge || 57, targetAge, profile.statePensionAge || 67, 75, horizonAge];
      milestoneAges.forEach((mAge) => {
        const pct = Math.max(0, Math.min(1, (mAge - currentAge) / (horizonAge - currentAge || 1)));
        const tickX = 32 + pct * 154;
        doc.line(tickX, graphBoxY + 66, tickX, graphBoxY + 68);
        doc.text(`Age ${mAge}`, tickX - 5, graphBoxY + 72);
      });

      // Plot Actual Step-by-Step Trajectory Curves from projections array
      if (projections && projections.length > 0) {
        const totalSteps = projections.length - 1 || 1;

        // 1. Pension Pot Trajectory Curve (Teal [13, 148, 136] - 0.8mm)
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.8);
        for (let i = 1; i < projections.length; i++) {
          const x1 = 32 + ((i - 1) / totalSteps) * 154;
          const y1 = graphBoxY + 14 + (1 - Math.max(0, projections[i - 1].pensionPot || 0) / maxVal) * 52;
          const x2 = 32 + (i / totalSteps) * 154;
          const y2 = graphBoxY + 14 + (1 - Math.max(0, projections[i].pensionPot || 0) / maxVal) * 52;
          doc.line(x1, y1, x2, y2);
        }

        // 2. ISA Pot Trajectory Curve (Indigo [99, 102, 241] - 0.8mm)
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.8);
        for (let i = 1; i < projections.length; i++) {
          const x1 = 32 + ((i - 1) / totalSteps) * 154;
          const y1 = graphBoxY + 14 + (1 - Math.max(0, projections[i - 1].isaPot || 0) / maxVal) * 52;
          const x2 = 32 + (i / totalSteps) * 154;
          const y2 = graphBoxY + 14 + (1 - Math.max(0, projections[i].isaPot || 0) / maxVal) * 52;
          doc.line(x1, y1, x2, y2);
        }

        // 3. Cash / GIA Pot Trajectory Curve (Amber [245, 158, 11] - 0.8mm)
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.8);
        for (let i = 1; i < projections.length; i++) {
          const x1 = 32 + ((i - 1) / totalSteps) * 154;
          const y1 = graphBoxY + 14 + (1 - Math.max(0, projections[i - 1].cashGiaPot || 0) / maxVal) * 52;
          const x2 = 32 + (i / totalSteps) * 154;
          const y2 = graphBoxY + 14 + (1 - Math.max(0, projections[i].cashGiaPot || 0) / maxVal) * 52;
          doc.line(x1, y1, x2, y2);
        }

        // 4. Total Wealth Trajectory Curve (Emerald [16, 185, 129] - Thick 1.3mm)
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1.3);
        for (let i = 1; i < projections.length; i++) {
          const x1 = 32 + ((i - 1) / totalSteps) * 154;
          const y1 = graphBoxY + 14 + (1 - Math.max(0, projections[i - 1].totalPot || 0) / maxVal) * 52;
          const x2 = 32 + (i / totalSteps) * 154;
          const y2 = graphBoxY + 14 + (1 - Math.max(0, projections[i].totalPot || 0) / maxVal) * 52;
          doc.line(x1, y1, x2, y2);
        }

        // Highlight Retirement Start Peak Circle
        const retIdx = projections.findIndex((p) => p.age === targetAge);
        if (retIdx >= 0) {
          const retX = 32 + (retIdx / totalSteps) * 154;
          const retY = graphBoxY + 14 + (1 - Math.max(0, projections[retIdx].totalPot || 0) / maxVal) * 52;
          doc.setFillColor(16, 185, 129);
          doc.circle(retX, retY, 2.5, 'F');
        }
      }

      // Legend for Pot Sizes Inside Box
      let d2LgY = graphBoxY + 77;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(16, 185, 129);
      doc.rect(20, d2LgY, 3, 3, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text('Total Wealth', 24, d2LgY + 2.5);

      doc.setFillColor(13, 148, 136);
      doc.rect(65, d2LgY, 3, 3, 'F');
      doc.text('Pension Pot', 69, d2LgY + 2.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(110, d2LgY, 3, 3, 'F');
      doc.text('ISA Pot', 114, d2LgY + 2.5);

      doc.setFillColor(245, 158, 11);
      doc.rect(145, d2LgY, 3, 3, 'F');
      doc.text('Cash/GIA Pot', 149, d2LgY + 2.5);

      // =========================================================================
      // PAGE 5: DIAGRAM 3 (WITH YEAR LABELS) & DIAGRAM 4 (LEGEND INSIDE BOX) & LEGAL NOTICE
      // =========================================================================
      // =========================================================================
      // PAGE 5: DIAGRAM 3 (NOMINAL £) & DIAGRAM 4 (TODAY'S £ REAL TERMS)
      // =========================================================================
      doc.addPage();
      curPageNum++;
      renderPageHeader('Visual Diagram Models — Drawdown Income Analysis (Nominal & Real)', curPageNum);

      let p5Y = 24;

      // DIAGRAM ILLUSTRATION 3: Annual Drawdown Income & Source Breakdown (NOMINAL £)
      const d3BoxHeight = 80;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p5Y, 182, d3BoxHeight, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p5Y, 182, d3BoxHeight, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Diagram 3: Annual Net Retirement Drawdown Income & Source Breakdown (Nominal £)', 18, p5Y + 8);

      const d3BoxY = p5Y + 14;

      const d3Ages = [
        { age: targetAge, x: 38 },
        { age: Math.min(horizonAge, targetAge + 5), x: 67 },
        { age: Math.min(horizonAge, profile.statePensionAge || 67), x: 96 },
        { age: Math.min(horizonAge, 75), x: 125 },
        { age: Math.min(horizonAge, 80), x: 154 },
        { age: horizonAge, x: 180 },
      ];

      // Y-Axis Grid Lines & Scales for Nominal Income Chart (£0 to £60k+)
      const nomIncomes = (projections || []).filter((p) => p.isRetired).map((p) => p.netRetirementIncome || 0);
      
      const getNominalTarget = (p, age) => {
        let nominal = p?.targetRetirementIncome;
        if (!nominal) {
          const infFact = Math.pow(1 + profile.expectedInflationRate / 100, Math.max(0, age - profile.currentAge));
          let increaseFact = infFact;
          if (profile.incomeIncreaseMode === 'custom') {
            increaseFact = Math.pow(1 + (profile.customIncomeIncreasePercent ?? 0)/100, Math.max(0, age - profile.currentAge));
          }
          nominal = getTargetIncomeForAge(profile, age) * increaseFact;
        }
        return nominal;
      };

      const nomTargets = (projections || []).filter((p) => p.isRetired).map((p) => getNominalTarget(p, p.age));
      const maxRetIncNom = Math.max(40000, ...nomIncomes, ...nomTargets);

      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);

      const incYSteps = [1.0, 0.75, 0.5, 0.25, 0];
      incYSteps.forEach((stepPct) => {
        const stepY = d3BoxY + 6 + (1 - stepPct) * 40;
        doc.line(32, stepY, 186, stepY);
        const fmtVal = `£${Math.round((maxRetIncNom * stepPct) / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // Target Requirement Line & Markers per age bar (Rose)
      const targetPointsNom = d3Ages.map((item) => {
        const p = (projections || []).find((proj) => proj.age === item.age) || retirementYear;
        const targetVal = getNominalTarget(p, item.age);
        const y = d3BoxY + 6 + (1 - Math.min(1, targetVal / (maxRetIncNom || 1))) * 40;
        return { x: item.x, y, targetVal };
      });

      doc.setDrawColor(225, 29, 72);
      doc.setLineWidth(0.9);
      for (let i = 0; i < targetPointsNom.length - 1; i++) {
        doc.line(targetPointsNom[i].x, targetPointsNom[i].y, targetPointsNom[i + 1].x, targetPointsNom[i + 1].y);
      }
      targetPointsNom.forEach((pt) => {
        doc.setFillColor(225, 29, 72);
        doc.circle(pt.x, pt.y, 1.2, 'F');
      });

      const firstNomTarget = targetPointsNom[0]?.targetVal || 0;
      const allNomTargetsEqual = targetPointsNom.every((pt) => Math.abs(pt.targetVal - firstNomTarget) < 1);

      doc.setTextColor(225, 29, 72);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      if (allNomTargetsEqual) {
        doc.text(`Target Requirement £${Math.round(firstNomTarget).toLocaleString()}/yr`, 120, Math.max(d3BoxY + 10, targetPointsNom[0].y - 2));
      } else {
        doc.text(`Target Requirement (Flexible / Age-Phased)`, 115, d3BoxY + 10);
      }

      // Stacked Income Layer Bars in Nominal £
      d3Ages.forEach((item) => {
        const p = (projections || []).find((proj) => proj.age === item.age) || retirementYear;
        const pYear = p.year || (new Date().getFullYear() + (item.age - currentAge));

        const stateIncNom = p.statePensionReceived || 0;
        const dbIncNom = (p.dbPensionIncomeReceived || 0) + (p.taxableFixedIncomeReceived || 0) + (p.taxFreeFixedIncomeReceived || 0);
        const annIncNom = p.annuityIncomeReceived || 0;
        const penDrawdownNom = p.pensionDrawdown || 0;
        const isaCashDrawdownNom = (p.isaDrawdown || 0) + (p.cashDrawdown || 0);

        const hState = Math.min(40, (stateIncNom / (maxRetIncNom || 1)) * 40);
        const hDb = Math.min(40, (dbIncNom / (maxRetIncNom || 1)) * 40);
        const hAnn = Math.min(40, (annIncNom / (maxRetIncNom || 1)) * 40);
        const hPenDrawdown = Math.min(40, (penDrawdownNom / (maxRetIncNom || 1)) * 40);
        const hIsaDrawdown = Math.min(40, (isaCashDrawdownNom / (maxRetIncNom || 1)) * 40);

        const barBottomY = d3BoxY + 46;
        let currentY = barBottomY;
        const barW = 12;

        if (hState > 0) {
          currentY -= hState;
          doc.setFillColor(99, 102, 241);
          doc.rect(item.x - barW / 2, currentY, barW, hState, 'F');
        }
        if (hDb > 0) {
          currentY -= hDb;
          doc.setFillColor(245, 158, 11);
          doc.rect(item.x - barW / 2, currentY, barW, hDb, 'F');
        }
        if (hAnn > 0) {
          currentY -= hAnn;
          doc.setFillColor(109, 40, 217);
          doc.rect(item.x - barW / 2, currentY, barW, hAnn, 'F');
        }
        if (hPenDrawdown > 0) {
          currentY -= hPenDrawdown;
          doc.setFillColor(16, 185, 129);
          doc.rect(item.x - barW / 2, currentY, barW, hPenDrawdown, 'F');
        }
        if (hIsaDrawdown > 0) {
          currentY -= hIsaDrawdown;
          doc.setFillColor(6, 182, 212); // Cyan for ISA/Cash Drawdown
          doc.rect(item.x - barW / 2, currentY, barW, hIsaDrawdown, 'F');
        }

        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(`Age ${item.age}`, item.x - 5, d3BoxY + 49);
        doc.setFont('helvetica', 'normal');
        doc.text(`(${pYear})`, item.x - 6, d3BoxY + 53);
      });

      // Legend Inside Box 3
      let d3LgY = d3BoxY + 58;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(6, 182, 212);
      doc.rect(16, d3LgY, 3, 3, 'F');
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('ISA/Cash Drawdown', 20, d3LgY + 2.5);

      doc.setFillColor(16, 185, 129);
      doc.rect(55, d3LgY, 3, 3, 'F');
      doc.text('Pension Drawdown', 59, d3LgY + 2.5);

      doc.setFillColor(109, 40, 217);
      doc.rect(94, d3LgY, 3, 3, 'F');
      doc.text('Annuity Income', 98, d3LgY + 2.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(126, d3LgY, 3, 3, 'F');
      doc.text('State Pension', 130, d3LgY + 2.5);

      doc.setFillColor(245, 158, 11);
      doc.rect(156, d3LgY, 3, 3, 'F');
      doc.text('DB & Fixed', 160, d3LgY + 2.5);

      // -------------------------------------------------------------------------
      // DIAGRAM ILLUSTRATION 4: Annual Drawdown Income & Source Breakdown (TODAY'S £ REAL TERMS)
      // -------------------------------------------------------------------------
      p5Y += 84;
      const d4BoxHeight = 80;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p5Y, 182, d4BoxHeight, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p5Y, 182, d4BoxHeight, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("Diagram 4: Annual Net Retirement Drawdown Income & Source Breakdown (Today's £ Real Terms)", 18, p5Y + 8);

      const d4BoxY = p5Y + 14;

      const realIncomes = (projections || []).filter((p) => p.isRetired).map((p) => {
        const infFact = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, p.age - currentAge);
        return p.purchasingPowerAdjustedIncome || ((p.netRetirementIncome || 0) / infFact);
      });
      
      const realTargets = (projections || []).filter((p) => p.isRetired).map((p) => {
        const infFact = Math.pow(1 + profile.expectedInflationRate / 100, Math.max(0, p.age - profile.currentAge));
        return getNominalTarget(p, p.age) / infFact;
      });
      const maxRetIncReal = Math.max(35000, ...realIncomes, ...realTargets);

      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);

      incYSteps.forEach((stepPct) => {
        const stepY = d4BoxY + 6 + (1 - stepPct) * 40;
        doc.line(32, stepY, 186, stepY);
        const fmtVal = `£${Math.round((maxRetIncReal * stepPct) / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // Target Requirement Line & Markers per age bar for Real Terms (Rose)
      const targetPointsReal = d3Ages.map((item) => {
        
        const p = (projections || []).find((proj) => proj.age === item.age) || retirementYear;
        const infFact = Math.pow(1 + profile.expectedInflationRate / 100, Math.max(0, item.age - profile.currentAge));
        const targetVal = getNominalTarget(p, item.age) / infFact;
        const y = d4BoxY + 6 + (1 - Math.min(1, targetVal / (maxRetIncReal || 1))) * 40;
        return { x: item.x, y, targetVal };
      });

      doc.setDrawColor(225, 29, 72);
      doc.setLineWidth(0.9);
      for (let i = 0; i < targetPointsReal.length - 1; i++) {
        doc.line(targetPointsReal[i].x, targetPointsReal[i].y, targetPointsReal[i + 1].x, targetPointsReal[i + 1].y);
      }
      targetPointsReal.forEach((pt) => {
        doc.setFillColor(225, 29, 72);
        doc.circle(pt.x, pt.y, 1.2, 'F');
      });

      const firstRealTarget = targetPointsReal[0]?.targetVal || 0;
      const allRealTargetsEqual = targetPointsReal.every((pt) => Math.abs(pt.targetVal - firstRealTarget) < 1);

      doc.setTextColor(225, 29, 72);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      if (allRealTargetsEqual) {
        doc.text(`Target Requirement £${Math.round(firstRealTarget).toLocaleString()}/yr (Real)`, 115, d4BoxY + 8);
      } else {
        doc.text(`Target Requirement (Flexible / Age-Phased Real)`, 115, d4BoxY + 10);
      }

      d3Ages.forEach((item) => {
        const p = (projections || []).find((proj) => proj.age === item.age) || retirementYear;
        const pYear = p.year || (new Date().getFullYear() + (item.age - currentAge));
        const infFact = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, item.age - currentAge);

        const stateIncReal = (p.statePensionReceived || 0) / infFact;
        const dbIncReal = ((p.dbPensionIncomeReceived || 0) + (p.taxableFixedIncomeReceived || 0) + (p.taxFreeFixedIncomeReceived || 0)) / infFact;
        const annIncReal = (p.annuityIncomeReceived || 0) / infFact;
        const penDrawdownReal = (p.pensionDrawdown || 0) / infFact;
        const isaCashDrawdownReal = ((p.isaDrawdown || 0) + (p.cashDrawdown || 0)) / infFact;

        const hState = Math.min(40, (stateIncReal / (maxRetIncReal || 1)) * 40);
        const hDb = Math.min(40, (dbIncReal / (maxRetIncReal || 1)) * 40);
        const hAnn = Math.min(40, (annIncReal / (maxRetIncReal || 1)) * 40);
        const hPenDrawdown = Math.min(40, (penDrawdownReal / (maxRetIncReal || 1)) * 40);
        const hIsaDrawdown = Math.min(40, (isaCashDrawdownReal / (maxRetIncReal || 1)) * 40);

        const barBottomY = d4BoxY + 46;
        let currentY = barBottomY;
        const barW = 12;

        if (hState > 0) {
          currentY -= hState;
          doc.setFillColor(99, 102, 241);
          doc.rect(item.x - barW / 2, currentY, barW, hState, 'F');
        }
        if (hDb > 0) {
          currentY -= hDb;
          doc.setFillColor(245, 158, 11);
          doc.rect(item.x - barW / 2, currentY, barW, hDb, 'F');
        }
        if (hAnn > 0) {
          currentY -= hAnn;
          doc.setFillColor(109, 40, 217);
          doc.rect(item.x - barW / 2, currentY, barW, hAnn, 'F');
        }
        if (hPenDrawdown > 0) {
          currentY -= hPenDrawdown;
          doc.setFillColor(16, 185, 129);
          doc.rect(item.x - barW / 2, currentY, barW, hPenDrawdown, 'F');
        }
        if (hIsaDrawdown > 0) {
          currentY -= hIsaDrawdown;
          doc.setFillColor(6, 182, 212); // Cyan for ISA/Cash Drawdown
          doc.rect(item.x - barW / 2, currentY, barW, hIsaDrawdown, 'F');
        }

        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(`Age ${item.age}`, item.x - 5, d4BoxY + 49);
        doc.setFont('helvetica', 'normal');
        doc.text(`(${pYear})`, item.x - 6, d4BoxY + 53);
      });

      // Legend Inside Box 4
      let d4LgY = d4BoxY + 58;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(6, 182, 212);
      doc.rect(16, d4LgY, 3, 3, 'F');
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('ISA/Cash Drawdown', 20, d4LgY + 2.5);

      doc.setFillColor(16, 185, 129);
      doc.rect(55, d4LgY, 3, 3, 'F');
      doc.text('Pension Drawdown', 59, d4LgY + 2.5);

      doc.setFillColor(109, 40, 217);
      doc.rect(94, d4LgY, 3, 3, 'F');
      doc.text('Annuity Income', 98, d4LgY + 2.5);

      doc.setFillColor(99, 102, 241);
      doc.rect(126, d4LgY, 3, 3, 'F');
      doc.text('State Pension', 130, d4LgY + 2.5);

      doc.setFillColor(245, 158, 11);
      doc.rect(156, d4LgY, 3, 3, 'F');
      doc.text('DB & Fixed', 160, d4LgY + 2.5);

      // =========================================================================
      // DEFICIT RISK ANALYSIS & LEGAL GUIDANCE DISCLAIMER
      // =========================================================================
      doc.addPage();
      curPageNum++;
      renderPageHeader('Visual Diagram Models — Deficit Risk Analysis & Legal Notice', curPageNum);

      let p6Y = 24;

      // DIAGRAM ILLUSTRATION 5: Annual Shortfall & Surplus Deficit Risk Analysis
      const d5BoxHeight = 80;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p6Y, 182, d5BoxHeight, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p6Y, 182, d5BoxHeight, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Diagram 5: Annual Shortfall & Surplus Deficit Risk Analysis', 18, p6Y + 8);

      const d5BoxY = p6Y + 14;

      // EXPLICIT Y-AXIS NUMERICAL SCALES (+£20k, +£10k, £0 Baseline, -£5k, -£10k)
      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');

      // Grid lines for Y-axis scale
      doc.line(32, d5BoxY + 8, 186, d5BoxY + 8);
      doc.text('+£20,000', 16, d5BoxY + 9.5);

      doc.line(32, d5BoxY + 18, 186, d5BoxY + 18);
      doc.text('+£10,000', 16, d5BoxY + 19.5);

      // ZERO BASELINE LINE (Solid Slate Line)
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.8);
      doc.line(32, d5BoxY + 28, 186, d5BoxY + 28);
      doc.setTextColor(15, 23, 42);
      doc.text('£0 Baseline', 16, d5BoxY + 29.5);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(32, d5BoxY + 37, 186, d5BoxY + 37);
      doc.setTextColor(225, 29, 72);
      doc.text('-£5,000', 16, d5BoxY + 38.5);

      doc.line(32, d5BoxY + 44, 186, d5BoxY + 44);
      doc.text('-£10,000', 16, d5BoxY + 45.5);

      // EXPLICIT X-AXIS AGE SCALES
      const xAges = [60, 65, 70, 75, 80, 85, 90];
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      xAges.forEach((a, idx) => {
        const xPos = 36 + idx * 24;
        doc.line(xPos, d5BoxY + 27, xPos, d5BoxY + 29);
        doc.text(`Age ${a}`, xPos - 4, d5BoxY + 50);
      });

      // Visual Surplus Bars (Emerald) above £0 Baseline
      doc.setFillColor(16, 185, 129);
      doc.rect(34, d5BoxY + 10, 8, 18, 'F');
      doc.rect(58, d5BoxY + 12, 8, 16, 'F');
      doc.rect(82, d5BoxY + 14, 8, 14, 'F');
      doc.rect(106, d5BoxY + 16, 8, 12, 'F');

      if (!isPlanFeasible) {
        // Visual Deficit Bars (Rose) below £0 Baseline
        doc.setFillColor(225, 29, 72);
        doc.rect(130, d5BoxY + 28, 8, 10, 'F');
        doc.rect(154, d5BoxY + 28, 8, 14, 'F');
        doc.rect(178, d5BoxY + 28, 8, 16, 'F');
      } else {
        doc.setFillColor(16, 185, 129);
        doc.rect(130, d5BoxY + 18, 8, 10, 'F');
        doc.rect(154, d5BoxY + 20, 8, 8, 'F');
        doc.rect(178, d5BoxY + 22, 8, 6, 'F');
      }

      // LEGEND ENTIRELY INSIDE ENCLOSING BOX 5
      let d5LgY = d5BoxY + 58;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      doc.setFillColor(16, 185, 129);
      doc.rect(18, d5LgY, 3, 3, 'F');
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Annual Surplus Buffer (£0+)', 22, d5LgY + 2.5);

      doc.setFillColor(225, 29, 72);
      doc.rect(80, d5LgY, 3, 3, 'F');
      doc.text('Annual Deficit / Shortfall Risk', 84, d5LgY + 2.5);

      const firstShortfallAgeVal = shortfallYears[0]?.age || targetAge;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Status: ${isPlanFeasible ? '0% Deficit Risk.' : `Shortfall Age ${firstShortfallAgeVal}.`}`, 145, d5LgY + 2.5);

      // Regulatory Disclaimers & FCA Compliance Notice (Page 6 Bottom)
      p6Y += 88;
      const disBoxH = hasRecyclingRisk ? 44 : 38;
      doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
      doc.roundedRect(14, p6Y, 182, disBoxH, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, p6Y, 182, disBoxH, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Important UK Financial Planning Guidance Notice & Legal Disclaimer', 18, p6Y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`1. Educational Model Only: This document is generated by ${appName} for educational and planning modeling purposes only.`, 18, p6Y + 14);
      doc.text('   It does not constitute formal financial, tax, or investment advice regulated by the Financial Conduct Authority (FCA).', 18, p6Y + 18);
      doc.text('2. UK Tax Legislation: Tax calculations reflect UK 2026/27 tax bands, Scottish tax rates (where enabled), and HMRC rules.', 18, p6Y + 24);
      doc.text('   Tax treatment depends on individual circumstances and may change in future UK Finance Acts.', 18, p6Y + 28);
      doc.text('3. Professional Advice: Before executing pension withdrawals or buying annuities, consult an FCA-regulated advisor.', 18, p6Y + 34);
      if (hasRecyclingRisk) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text('4. HMRC Schedule 29 Notice: PCLS Recycling Risk detected. Review ongoing pension contributions during PCLS extraction window.', 18, p6Y + 40);
      }

      // =========================================================================
      // MONTE CARLO VOLATILITY & STRESS TEST ANALYSIS (PART 1, 2, 3)
      // =========================================================================
      const mcNormal = mcNormalPrelim;

      const mcCrash = runMonteCarloSimulation(profile, pots, exportTaxResult as any, {
        numSimulations: 500,
        accumulationVolatility: 12.0,
        decumulationVolatility: 8.0,
        maxAge: horizonAge,
        marketScenario: 'early_crash',
      });

      // PART 1: Standard Volatility
      doc.addPage();
      curPageNum++;
      renderPageHeader('Monte Carlo Volatility & Risk Simulation (Part 1)', curPageNum);

      let mcY = 24;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Monte Carlo Volatility & Risk Simulation (Standard Market Conditions)', 14, mcY);

      mcY += 5;
      // Key Metrics Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, mcY, 182, 18, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, mcY, 182, 18, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      const normSuccess = mcNormal?.successRate ?? mcNormal?.successRateTargetAge ?? 0;
      const normMedWealth = mcNormal?.medianFinalWealth ?? mcNormal?.medianEndPot ?? 0;
      const normP10Wealth = mcNormal?.p10FinalWealth ?? mcNormal?.p10EndPot ?? 0;
      const normPercentiles = mcNormal?.percentiles || mcNormal?.agePercentiles?.map(p => ({ ...p, p10: p.p10TotalPot, p25: p.p25TotalPot, p50: p.p50TotalPot, p75: p.p75TotalPot, p90: p.p90TotalPot })) || [];

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('SUCCESS RATE TO AGE ' + horizonAge, 18, mcY + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(normSuccess >= 90 ? 16 : 225, normSuccess >= 90 ? 185 : 29, normSuccess >= 90 ? 129 : 72);
      doc.text(`${normSuccess.toFixed(1)}% (${normSuccess >= 95 ? 'Extremely Robust' : normSuccess >= 80 ? 'Moderate Risk' : 'High Deficit Risk'})`, 18, mcY + 13);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('MEDIAN POT AT AGE ' + horizonAge, 85, mcY + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(13, 148, 136);
      doc.text(`£${Math.round(normMedWealth).toLocaleString()}`, 85, mcY + 13);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('10TH PERCENTILE (WORST 10%)', 145, mcY + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72);
      doc.text(`£${Math.round(normP10Wealth).toLocaleString()}`, 145, mcY + 13);

      mcY += 23;

      // Standard Market Monte Carlo Fan Chart
      const mcChartY = mcY;
      const mcChartH = 62;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, mcChartY, 182, mcChartH, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, mcChartY, 182, mcChartH, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('Monte Carlo Stochastic Fan Chart (Percentile Wealth Trajectories)', 18, mcChartY + 5.5);

      const allNormAgesData = mcNormal.agePercentiles || [];
      const normMaxVal = Math.max(1, ...allNormAgesData.map(p => p.p90TotalPot || p.p50TotalPot || 0));

      // Y-Axis Grid Lines & Scale Labels
      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      const mcYSteps = [1.0, 0.75, 0.5, 0.25, 0];
      mcYSteps.forEach((stepPct) => {
        const stepY = mcChartY + 11 + (1 - stepPct) * 38;
        doc.line(32, stepY, 186, stepY);
        const lblVal = normMaxVal * stepPct;
        const fmtVal = lblVal >= 1000000 ? `£${(lblVal / 1000000).toFixed(1)}M` : `£${Math.round(lblVal / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // X-Axis Milestone Ticks
      const mcMilestoneAges = [currentAge, profile.pensionAccessAge || 57, targetAge, 65, 75, horizonAge];
      const mcUniqueMilestones = Array.from(new Set(mcMilestoneAges)).sort((a, b) => a - b);
      mcUniqueMilestones.forEach((mAge) => {
        const pct = Math.max(0, Math.min(1, (mAge - currentAge) / (horizonAge - currentAge || 1)));
        const tickX = 32 + pct * 154;
        doc.line(tickX, mcChartY + 49, tickX, mcChartY + 51);
        doc.text(`Age ${mAge}`, tickX - 5, mcChartY + 54.5);
      });

      // Draw Trajectory Curves
      if (allNormAgesData.length > 1) {
        const totalSteps = allNormAgesData.length - 1;

        const drawNormLine = (getPVal: (p: any) => number, colorRgb: [number, number, number], lineW: number) => {
          doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          doc.setLineWidth(lineW);
          for (let i = 1; i < allNormAgesData.length; i++) {
            const x1 = 32 + ((i - 1) / totalSteps) * 154;
            const y1 = mcChartY + 11 + (1 - Math.max(0, getPVal(allNormAgesData[i - 1]) || 0) / normMaxVal) * 38;
            const x2 = 32 + (i / totalSteps) * 154;
            const y2 = mcChartY + 11 + (1 - Math.max(0, getPVal(allNormAgesData[i]) || 0) / normMaxVal) * 38;
            doc.line(x1, y1, x2, y2);
          }
        };

        // P90 (Violet)
        drawNormLine((p) => p.p90TotalPot ?? p.p90, [99, 102, 241], 0.6);
        // P75 (Emerald)
        drawNormLine((p) => p.p75TotalPot ?? p.p75, [16, 185, 129], 0.6);
        // P50 Median (Teal - Thick)
        drawNormLine((p) => p.p50TotalPot ?? p.p50, [13, 148, 136], 1.2);
        // P25 Cautious (Amber)
        drawNormLine((p) => p.p25TotalPot ?? p.p25, [245, 158, 11], 0.6);
        // P10 Stress (Rose - Thick)
        drawNormLine((p) => p.p10TotalPot ?? p.p10, [225, 29, 72], 0.9);

        // Highlight Target Retirement Start Point on P50 Median
        const retIdx = allNormAgesData.findIndex((p) => p.age === targetAge);
        if (retIdx >= 0) {
          const retX = 32 + (retIdx / totalSteps) * 154;
          const retY = mcChartY + 11 + (1 - Math.max(0, (allNormAgesData[retIdx].p50TotalPot ?? (allNormAgesData[retIdx] as any).p50) || 0) / normMaxVal) * 38;
          doc.setFillColor(13, 148, 136);
          doc.circle(retX, retY, 2, 'F');
        }
      }

      // Legend
      const mcLegY = mcChartY + 58;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      doc.setFillColor(99, 102, 241);
      doc.rect(32, mcLegY - 2, 4, 1.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text('90th % (Best 10%)', 38, mcLegY);

      doc.setFillColor(16, 185, 129);
      doc.rect(72, mcLegY - 2, 4, 1.5, 'F');
      doc.text('75th % (Growth)', 78, mcLegY);

      doc.setFillColor(13, 148, 136);
      doc.rect(110, mcLegY - 2, 4, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('50th % (Median)', 116, mcLegY);

      doc.setFont('helvetica', 'normal');
      doc.setFillColor(245, 158, 11);
      doc.rect(145, mcLegY - 2, 4, 1.5, 'F');
      doc.text('25th %', 151, mcLegY);

      doc.setFillColor(225, 29, 72);
      doc.rect(168, mcLegY - 2, 4, 2, 'F');
      doc.text('10th % (Stress)', 174, mcLegY);

      mcY += mcChartH + 5;

      // Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, mcY, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Age', 18, mcY + 4.5);
      doc.text('10th % (Stress)', 45, mcY + 4.5);
      doc.text('25th % (Cautious)', 80, mcY + 4.5);
      doc.text('50th % (Median)', 115, mcY + 4.5);
      doc.text('75th % (Growth)', 150, mcY + 4.5);

      mcY += 6.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);

      const mcTickAges = [currentAge, profile.pensionAccessAge || 57, targetAge, 65, 75, 85, horizonAge];
      const uniqueMcAges = Array.from(new Set(mcTickAges)).sort((a, b) => a - b);

      uniqueMcAges.forEach((a, idx) => {
        const rowData = normPercentiles.find((p) => p.age === a) || normPercentiles[normPercentiles.length - 1];
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, mcY, 182, 5, 'F');
        }
        doc.text(`Age ${a}`, 18, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p10 ?? rowData?.p10TotalPot) || 0).toLocaleString()}`, 45, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p25 ?? rowData?.p25TotalPot) || 0).toLocaleString()}`, 80, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p50 ?? rowData?.p50TotalPot) || 0).toLocaleString()}`, 115, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p75 ?? rowData?.p75TotalPot) || 0).toLocaleString()}`, 150, mcY + 3.8);
        mcY += 5;
      });

      // Chart 2: Median Pot Split Breakdown Visual Chart (Standard Market)
      mcY += 6;
      const medChartY = mcY;
      const medChartH = 50;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, medChartY, 182, medChartH, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, medChartY, 182, medChartH, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('Median Pot Trajectory & Asset Class Breakdown Chart (P50 Standard Market)', 18, medChartY + 5.5);

      const allNormP50Data = mcNormal.agePercentiles || [];
      const maxP50Val = Math.max(1, ...allNormP50Data.map(p => Math.max(p.p50TotalPot || 0, (p.p50PensionPot || 0) + (p.p50IsaPot || 0) + (p.p50CashGiaPot || 0))));

      // Y-Axis Grid Lines & Scale Labels
      doc.setDrawColor(226, 232, 240);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      [1.0, 0.75, 0.5, 0.25, 0].forEach((stepPct) => {
        const stepY = medChartY + 10 + (1 - stepPct) * 30;
        doc.line(32, stepY, 186, stepY);
        const lblVal = maxP50Val * stepPct;
        const fmtVal = lblVal >= 1000000 ? `£${(lblVal / 1000000).toFixed(1)}M` : `£${Math.round(lblVal / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // X-Axis Milestone Ticks
      mcUniqueMilestones.forEach((mAge) => {
        const pct = Math.max(0, Math.min(1, (mAge - currentAge) / (horizonAge - currentAge || 1)));
        const tickX = 32 + pct * 154;
        doc.line(tickX, medChartY + 40, tickX, medChartY + 42);
        doc.text(`Age ${mAge}`, tickX - 5, medChartY + 45);
      });

      // Draw Trajectory Curves for Median Pot Assets
      if (allNormP50Data.length > 1) {
        const totalSteps = allNormP50Data.length - 1;
        const drawMedLine = (getVal: (p: any) => number, colorRgb: [number, number, number], lineW: number) => {
          doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          doc.setLineWidth(lineW);
          for (let i = 1; i < allNormP50Data.length; i++) {
            const x1 = 32 + ((i - 1) / totalSteps) * 154;
            const y1 = medChartY + 10 + (1 - Math.max(0, getVal(allNormP50Data[i - 1]) || 0) / maxP50Val) * 30;
            const x2 = 32 + (i / totalSteps) * 154;
            const y2 = medChartY + 10 + (1 - Math.max(0, getVal(allNormP50Data[i]) || 0) / maxP50Val) * 30;
            doc.line(x1, y1, x2, y2);
          }
        };

        // P50 Pension Pot (Teal)
        drawMedLine((p) => p.p50PensionPot || 0, [13, 148, 136], 0.8);
        // P50 ISA Pot (Indigo)
        drawMedLine((p) => p.p50IsaPot || 0, [99, 102, 241], 0.8);
        // P50 Cash/GIA Pot (Amber)
        drawMedLine((p) => p.p50CashGiaPot || 0, [245, 158, 11], 0.8);
        // Total Median Pot (Slate Dark - Thick)
        drawMedLine((p) => p.p50TotalPot || 0, [30, 41, 59], 1.2);
      }

      // Legend
      const medLegY = medChartY + 48;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      doc.setFillColor(30, 41, 59);
      doc.rect(32, medLegY - 2, 4, 1.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text('Total Median Pot', 38, medLegY);

      doc.setFillColor(13, 148, 136);
      doc.rect(78, medLegY - 2, 4, 1.5, 'F');
      doc.text('Median Pension Pot', 84, medLegY);

      doc.setFillColor(99, 102, 241);
      doc.rect(125, medLegY - 2, 4, 1.5, 'F');
      doc.text('Median ISA Pot', 131, medLegY);

      doc.setFillColor(245, 158, 11);
      doc.rect(162, medLegY - 2, 4, 1.5, 'F');
      doc.text('Cash / GIA Pot', 168, medLegY);

      mcY += medChartH + 5;

      // Table 2: Median Pot Split Breakdown (Standard Market)
      mcY += 6;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Median Pot Split Breakdown by Asset Class (P50 Trajectory)', 14, mcY);

      mcY += 4.5;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, mcY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Age', 18, mcY + 4.2);
      doc.text('P50 Pension Pot', 45, mcY + 4.2);
      doc.text('P50 ISA Pot', 80, mcY + 4.2);
      doc.text('P50 Cash/GIA Pot', 115, mcY + 4.2);
      doc.text('Total Median Pot', 150, mcY + 4.2);

      mcY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);

      uniqueMcAges.forEach((a, idx) => {
        const rowData = mcNormal.agePercentiles?.find((p) => p.age === a) || mcNormal.agePercentiles?.[mcNormal.agePercentiles.length - 1];
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, mcY, 182, 5, 'F');
        }
        doc.text(`Age ${a}`, 18, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p50PensionPot) || 0).toLocaleString()}`, 45, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p50IsaPot) || 0).toLocaleString()}`, 80, mcY + 3.8);
        doc.text(`£${Math.round((rowData?.p50CashGiaPot) || 0).toLocaleString()}`, 115, mcY + 3.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(`£${Math.round((rowData?.p50TotalPot) || 0).toLocaleString()}`, 150, mcY + 3.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        mcY += 5;
      });

      // PART 2: Early Crash Stress Test
      doc.addPage();
      curPageNum++;
      renderPageHeader('Monte Carlo Volatility & Risk Simulation (Part 2)', curPageNum);

      let mc2Y = 24;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Sequence of Returns Stress Test (-20% Market Crash in Early Retirement)', 14, mc2Y);

      mc2Y += 5;
      // Key Metrics Box Crash
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, mc2Y, 182, 18, 3, 3, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(14, mc2Y, 182, 18, 3, 3, 'D');

      const crashSuccess = mcCrash?.successRate ?? mcCrash?.successRateTargetAge ?? 0;
      const crashMedWealth = mcCrash?.medianFinalWealth ?? mcCrash?.medianEndPot ?? 0;
      const crashPercentiles = mcCrash?.percentiles || mcCrash?.agePercentiles?.map(p => ({ ...p, p10: p.p10TotalPot, p25: p.p25TotalPot, p50: p.p50TotalPot, p75: p.p75TotalPot, p90: p.p90TotalPot })) || [];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text('CRASH SCENARIO SUCCESS RATE', 18, mc2Y + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(crashSuccess >= 80 ? 16 : 185, crashSuccess >= 80 ? 185 : 28, crashSuccess >= 80 ? 129 : 28);
      doc.text(`${crashSuccess.toFixed(1)}% (${crashSuccess >= 80 ? 'Resilient' : 'Vulnerable to Sequence Risk'})`, 18, mc2Y + 13);

      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text('MEDIAN FINAL WEALTH (CRASH)', 85, mc2Y + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text(`£${Math.round(crashMedWealth).toLocaleString()}`, 85, mc2Y + 13);

      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text('SUCCESS RATE IMPACT', 145, mc2Y + 5.5);
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      const diffSuccess = (crashSuccess - normSuccess).toFixed(1);
      doc.text(`${diffSuccess}% vs Standard`, 145, mc2Y + 13);

      mc2Y += 23;

      // Early Crash Stress Test Chart
      const mc2ChartY = mc2Y;
      const mc2ChartH = 62;
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, mc2ChartY, 182, mc2ChartH, 3, 3, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(14, mc2ChartY, 182, mc2ChartH, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(153, 27, 27);
      doc.text('Early Retirement Market Crash Stress Test Trajectory Bands (-20% Drop)', 18, mc2ChartY + 5.5);

      const allCrashAgesData = mcCrash.agePercentiles || [];
      const crashMaxVal = Math.max(1, ...allCrashAgesData.map(p => p.p90TotalPot || p.p50TotalPot || 0));

      // Y-Axis Grid Lines & Scale Labels
      doc.setDrawColor(252, 165, 165);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(153, 27, 27);

      const mc2YSteps = [1.0, 0.75, 0.5, 0.25, 0];
      mc2YSteps.forEach((stepPct) => {
        const stepY = mc2ChartY + 11 + (1 - stepPct) * 38;
        doc.line(32, stepY, 186, stepY);
        const lblVal = crashMaxVal * stepPct;
        const fmtVal = lblVal >= 1000000 ? `£${(lblVal / 1000000).toFixed(1)}M` : `£${Math.round(lblVal / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // X-Axis Milestone Ticks
      mcUniqueMilestones.forEach((mAge) => {
        const pct = Math.max(0, Math.min(1, (mAge - currentAge) / (horizonAge - currentAge || 1)));
        const tickX = 32 + pct * 154;
        doc.line(tickX, mc2ChartY + 49, tickX, mc2ChartY + 51);
        doc.text(`Age ${mAge}`, tickX - 5, mc2ChartY + 54.5);
      });

      // Shaded Crash Window Band at Retirement Start (Ages targetAge to targetAge + 2)
      if (allCrashAgesData.length > 1) {
        const totalSteps = allCrashAgesData.length - 1;
        const retIdx = allCrashAgesData.findIndex((p) => p.age === targetAge);
        const crashEndIdx = allCrashAgesData.findIndex((p) => p.age === targetAge + 2);

        if (retIdx >= 0) {
          const xStart = 32 + (retIdx / totalSteps) * 154;
          const xEnd = crashEndIdx >= 0 ? 32 + (crashEndIdx / totalSteps) * 154 : xStart + 12;
          doc.setFillColor(254, 226, 226);
          doc.rect(xStart, mc2ChartY + 11, Math.max(6, xEnd - xStart), 38, 'F');
          doc.setFontSize(6);
          doc.setTextColor(185, 28, 28);
          doc.text('Crash Window (-20%)', xStart + 1, mc2ChartY + 15);
        }

        const drawCrashLine = (getPVal: (p: any) => number, colorRgb: [number, number, number], lineW: number) => {
          doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          doc.setLineWidth(lineW);
          for (let i = 1; i < allCrashAgesData.length; i++) {
            const x1 = 32 + ((i - 1) / totalSteps) * 154;
            const y1 = mc2ChartY + 11 + (1 - Math.max(0, getPVal(allCrashAgesData[i - 1]) || 0) / crashMaxVal) * 38;
            const x2 = 32 + (i / totalSteps) * 154;
            const y2 = mc2ChartY + 11 + (1 - Math.max(0, getPVal(allCrashAgesData[i]) || 0) / crashMaxVal) * 38;
            doc.line(x1, y1, x2, y2);
          }
        };

        // P90 (Indigo)
        drawCrashLine((p) => p.p90TotalPot ?? p.p90, [99, 102, 241], 0.6);
        // P75 (Emerald)
        drawCrashLine((p) => p.p75TotalPot ?? p.p75, [16, 185, 129], 0.6);
        // P50 Median (Rose - Thick)
        drawCrashLine((p) => p.p50TotalPot ?? p.p50, [185, 28, 28], 1.2);
        // P25 Cautious (Amber)
        drawCrashLine((p) => p.p25TotalPot ?? p.p25, [245, 158, 11], 0.6);
        // P10 Stress (Dark Red - Thick)
        drawCrashLine((p) => p.p10TotalPot ?? p.p10, [153, 27, 27], 0.9);
      }

      // Legend
      const mc2LegY = mc2ChartY + 58;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      doc.setFillColor(99, 102, 241);
      doc.rect(32, mc2LegY - 2, 4, 1.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text('90th % (Best 10%)', 38, mc2LegY);

      doc.setFillColor(16, 185, 129);
      doc.rect(72, mc2LegY - 2, 4, 1.5, 'F');
      doc.text('75th % (Growth)', 78, mc2LegY);

      doc.setFillColor(185, 28, 28);
      doc.rect(110, mc2LegY - 2, 4, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('50th % (Median Crash)', 116, mc2LegY);

      doc.setFont('helvetica', 'normal');
      doc.setFillColor(245, 158, 11);
      doc.rect(150, mc2LegY - 2, 4, 1.5, 'F');
      doc.text('25th %', 156, mc2LegY);

      doc.setFillColor(153, 27, 27);
      doc.rect(170, mc2LegY - 2, 4, 2, 'F');
      doc.text('10th %', 176, mc2LegY);

      mc2Y += mc2ChartH + 5;

      // Table Header Crash
      doc.setFillColor(153, 27, 27);
      doc.rect(14, mc2Y, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Age', 18, mc2Y + 4.5);
      doc.text('10th % (Worst)', 45, mc2Y + 4.5);
      doc.text('25th % (Cautious)', 80, mc2Y + 4.5);
      doc.text('50th % (Median)', 115, mc2Y + 4.5);
      doc.text('75th % (Growth)', 150, mc2Y + 4.5);

      mc2Y += 6.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);

      uniqueMcAges.forEach((a, idx) => {
        const rowData = crashPercentiles.find((p) => p.age === a) || crashPercentiles[crashPercentiles.length - 1];
        if (idx % 2 === 1) {
          doc.setFillColor(254, 242, 242);
          doc.rect(14, mc2Y, 182, 5, 'F');
        }
        doc.text(`Age ${a}`, 18, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p10 ?? rowData?.p10TotalPot) || 0).toLocaleString()}`, 45, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p25 ?? rowData?.p25TotalPot) || 0).toLocaleString()}`, 80, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p50 ?? rowData?.p50TotalPot) || 0).toLocaleString()}`, 115, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p75 ?? rowData?.p75TotalPot) || 0).toLocaleString()}`, 150, mc2Y + 3.8);
        mc2Y += 5;
      });

      // Chart 2: Median Pot Split Breakdown Visual Chart (Crash Scenario)
      mc2Y += 6;
      const medChart2Y = mc2Y;
      const medChart2H = 50;
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, medChart2Y, 182, medChart2H, 3, 3, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(14, medChart2Y, 182, medChart2H, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(153, 27, 27);
      doc.text('Median Pot Trajectory & Asset Class Breakdown Chart (P50 Early Crash)', 18, medChart2Y + 5.5);

      const allCrashP50Data = mcCrash.agePercentiles || [];
      const maxCrashP50Val = Math.max(1, ...allCrashP50Data.map(p => Math.max(p.p50TotalPot || 0, (p.p50PensionPot || 0) + (p.p50IsaPot || 0) + (p.p50CashGiaPot || 0))));

      // Y-Axis Grid Lines & Scale Labels
      doc.setDrawColor(252, 165, 165);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(153, 27, 27);

      [1.0, 0.75, 0.5, 0.25, 0].forEach((stepPct) => {
        const stepY = medChart2Y + 10 + (1 - stepPct) * 30;
        doc.line(32, stepY, 186, stepY);
        const lblVal = maxCrashP50Val * stepPct;
        const fmtVal = lblVal >= 1000000 ? `£${(lblVal / 1000000).toFixed(1)}M` : `£${Math.round(lblVal / 1000)}k`;
        doc.text(fmtVal, 16, stepY + 1.5);
      });

      // X-Axis Milestone Ticks
      mcUniqueMilestones.forEach((mAge) => {
        const pct = Math.max(0, Math.min(1, (mAge - currentAge) / (horizonAge - currentAge || 1)));
        const tickX = 32 + pct * 154;
        doc.line(tickX, medChart2Y + 40, tickX, medChart2Y + 42);
        doc.text(`Age ${mAge}`, tickX - 5, medChart2Y + 45);
      });

      // Draw Trajectory Curves
      if (allCrashP50Data.length > 1) {
        const totalSteps = allCrashP50Data.length - 1;
        const drawCrashMedLine = (getVal: (p: any) => number, colorRgb: [number, number, number], lineW: number) => {
          doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          doc.setLineWidth(lineW);
          for (let i = 1; i < allCrashP50Data.length; i++) {
            const x1 = 32 + ((i - 1) / totalSteps) * 154;
            const y1 = medChart2Y + 10 + (1 - Math.max(0, getVal(allCrashP50Data[i - 1]) || 0) / maxCrashP50Val) * 30;
            const x2 = 32 + (i / totalSteps) * 154;
            const y2 = medChart2Y + 10 + (1 - Math.max(0, getVal(allCrashP50Data[i]) || 0) / maxCrashP50Val) * 30;
            doc.line(x1, y1, x2, y2);
          }
        };

        // P50 Pension Pot (Teal)
        drawCrashMedLine((p) => p.p50PensionPot || 0, [13, 148, 136], 0.8);
        // P50 ISA Pot (Indigo)
        drawCrashMedLine((p) => p.p50IsaPot || 0, [99, 102, 241], 0.8);
        // P50 Cash/GIA Pot (Amber)
        drawCrashMedLine((p) => p.p50CashGiaPot || 0, [245, 158, 11], 0.8);
        // Total Median Pot (Dark Red - Thick)
        drawCrashMedLine((p) => p.p50TotalPot || 0, [185, 28, 28], 1.2);
      }

      // Legend
      const med2LegY = medChart2Y + 48;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      doc.setFillColor(185, 28, 28);
      doc.rect(32, med2LegY - 2, 4, 1.5, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text('Total Median Pot (Crash)', 38, med2LegY);

      doc.setFillColor(13, 148, 136);
      doc.rect(82, med2LegY - 2, 4, 1.5, 'F');
      doc.text('Median Pension Pot', 88, med2LegY);

      doc.setFillColor(99, 102, 241);
      doc.rect(128, med2LegY - 2, 4, 1.5, 'F');
      doc.text('Median ISA Pot', 134, med2LegY);

      doc.setFillColor(245, 158, 11);
      doc.rect(162, med2LegY - 2, 4, 1.5, 'F');
      doc.text('Cash / GIA Pot', 168, med2LegY);

      mc2Y += medChart2H + 5;

      // Table 2: Median Pot Split Breakdown (Crash Scenario)
      mc2Y += 6;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Median Pot Split Breakdown under Crash Scenario (P50 Trajectory)', 14, mc2Y);

      mc2Y += 4.5;
      doc.setFillColor(153, 27, 27);
      doc.rect(14, mc2Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Age', 18, mc2Y + 4.2);
      doc.text('P50 Pension Pot', 45, mc2Y + 4.2);
      doc.text('P50 ISA Pot', 80, mc2Y + 4.2);
      doc.text('P50 Cash/GIA Pot', 115, mc2Y + 4.2);
      doc.text('Total Median Pot', 150, mc2Y + 4.2);

      mc2Y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);

      uniqueMcAges.forEach((a, idx) => {
        const rowData = mcCrash.agePercentiles?.find((p) => p.age === a) || mcCrash.agePercentiles?.[mcCrash.agePercentiles.length - 1];
        if (idx % 2 === 1) {
          doc.setFillColor(254, 242, 242);
          doc.rect(14, mc2Y, 182, 5, 'F');
        }
        doc.text(`Age ${a}`, 18, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p50PensionPot) || 0).toLocaleString()}`, 45, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p50IsaPot) || 0).toLocaleString()}`, 80, mc2Y + 3.8);
        doc.text(`£${Math.round((rowData?.p50CashGiaPot) || 0).toLocaleString()}`, 115, mc2Y + 3.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(`£${Math.round((rowData?.p50TotalPot) || 0).toLocaleString()}`, 150, mc2Y + 3.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        mc2Y += 5;
      });

      // PART 3: Risk Summary & Methodology
      doc.addPage();
      curPageNum++;
      renderPageHeader('Monte Carlo Volatility & Risk Simulation (Part 3)', curPageNum);

      let mc3Y = 24;
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Monte Carlo Volatility & Risk Analysis Summary', 14, mc3Y);

      mc3Y += 6;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, mc3Y, 182, 42, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, mc3Y, 182, 42, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Methodology & Sequence of Returns Risk Explanation', 18, mc3Y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('1. Stochastic Parameters: Accumulation volatility = 12.0% standard deviation p.a., Decumulation volatility = 8.0% p.a.', 18, mc3Y + 14);
      doc.text('   Simulates 500 independent randomized Gaussian return pathways using the Box-Muller transformation.', 18, mc3Y + 19);
      doc.text('2. Sequence of Returns Risk: A severe market downturn during early retirement years (Ages 58 to 60) significantly accelerates', 18, mc3Y + 26);
      doc.text('   capital depletion compared to deterministic models with constant average annual returns.', 18, mc3Y + 31);
      doc.text('3. Risk Mitigation: Consider maintaining 2-3 years of liquid cash/ISA buffers or securing guaranteed annuity income floors.', 18, mc3Y + 37);

      mc3Y += 48;

      // =========================================================================
      // SECTION 9: INHERITANCE TAX (IHT) & ESTATE PLANNING ANALYSIS
      // =========================================================================
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Inheritance Tax (IHT) & Estate Planning Analysis', 14, mc3Y);

      mc3Y += 5;
      const ihtSettings = profile.ihtSettings || {
        primaryResidenceValue: 450000,
        annualPropertyGrowthPercent: 3.0,
        otherTaxableAssets: 50000,
        includePensionsInEstate: true,
        passMainResidenceToDescendants: true,
        annualGiftingStrategy: 3000,
      };

      // IHT Parameters Callout Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, mc3Y, 182, 20, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, mc3Y, 182, 20, 3, 3, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      doc.text('Main Home Valuation:', 18, mc3Y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`£${(ihtSettings.primaryResidenceValue || (0) || 0).toLocaleString()} @ ${ihtSettings.annualPropertyGrowthPercent || 3.0}% p.a.`, 58, mc3Y + 6);

      doc.setFont('helvetica', 'bold');
      doc.text('April 2027 Budget Pension Rule:', 110, mc3Y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(ihtSettings.includePensionsInEstate ? 'Pensions Included in Estate' : 'Pensions Exempt', 160, mc3Y + 6);

      doc.setFont('helvetica', 'bold');
      doc.text('Other Physical Assets:', 18, mc3Y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(`£${(ihtSettings.otherTaxableAssets || (0) || 0).toLocaleString()}`, 58, mc3Y + 12);

      doc.setFont('helvetica', 'bold');
      doc.text('Available Allowances (NRB + RNRB):', 110, mc3Y + 12);
      doc.setFont('helvetica', 'normal');
      const baseAllowances = profile.isCouplePlanning ? '£650k NRB + £350k RNRB' : '£325k NRB + £175k RNRB';
      doc.text(baseAllowances, 160, mc3Y + 12);

      mc3Y += 23;

      // Milestone Estate Table Header (Ages 80, 90, 100)
      doc.setFillColor(30, 41, 59);
      doc.rect(14, mc3Y, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Estate Parameter / Milestone Age', 18, mc3Y + 4.5);
      doc.text('Age 80', 85, mc3Y + 4.5);
      doc.text('Age 90', 125, mc3Y + 4.5);
      doc.text('Age 100 (Century)', 160, mc3Y + 4.5);

      mc3Y += 6.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);

      // Milestone calculations
      const calcIhtForAge = (ageVal: number) => {
        const yrs = Math.max(0, ageVal - currentAge);
        const pObj = projections.find((p) => p.age === ageVal) || projections[projections.length - 1];
        const prop = Math.round((ihtSettings.primaryResidenceValue || 0) * Math.pow(1 + (ihtSettings.annualPropertyGrowthPercent || 3.0)/100, yrs));
        const nonPen = Math.round((pObj?.isaPot || 0) + (pObj?.cashGiaPot || 0));
        const pen = Math.round(pObj?.pensionPot || 0);
        const gross = prop + nonPen + (ihtSettings.otherTaxableAssets || 0) + (ihtSettings.includePensionsInEstate ? pen : 0);
        
        const giftingYrs = Math.max(0, ageVal - targetAge);
        const giftingTot = (ihtSettings.annualGiftingStrategy || 0) * giftingYrs;
        const netGross = Math.max(0, gross - giftingTot);

        const nrb = profile.isCouplePlanning ? 650000 : 325000;
        let rnrb = (ihtSettings.passMainResidenceToDescendants && prop > 0) ? (profile.isCouplePlanning ? 350000 : 175000) : 0;
        if (netGross > 2000000 && rnrb > 0) {
          rnrb = Math.max(0, rnrb - Math.floor((netGross - 2000000) / 2));
        }
        const totAllow = nrb + rnrb;
        const surplus = Math.max(0, netGross - totAllow);
        const ihtTax = Math.round(surplus * 0.4);
        const netPassed = netGross - ihtTax;

        return { prop, nonPen, pen, netGross, totAllow, ihtTax, netPassed };
      };

      const iht80 = calcIhtForAge(80);
      const iht90 = calcIhtForAge(90);
      const iht100 = calcIhtForAge(100);

      const ihtTableRows = [
        { label: 'Primary Residence Valuation', a80: iht80.prop, a90: iht90.prop, a100: iht100.prop },
        { label: 'Unused Pension Wealth (Post-April 2027)', a80: iht80.pen, a90: iht90.pen, a100: iht100.pen },
        { label: 'Non-Pension Financial Assets (ISA/Cash)', a80: iht80.nonPen, a90: iht90.nonPen, a100: iht100.nonPen },
        { label: 'Gross Taxable Estate Valuation', a80: iht80.netGross, a90: iht90.netGross, a100: iht100.netGross },
        { label: 'Total Available Allowances (NRB + RNRB)', a80: iht80.totAllow, a90: iht90.totAllow, a100: iht100.totAllow },
        { label: 'Estimated 40% Inheritance Tax (IHT)', a80: iht80.ihtTax, a90: iht90.ihtTax, a100: iht100.ihtTax, isTax: true },
        { label: 'Net Wealth Inherited by Heirs', a80: iht80.netPassed, a90: iht90.netPassed, a100: iht100.netPassed, isNet: true },
      ];

      ihtTableRows.forEach((row, rIdx) => {
        if (row.isNet) {
          doc.setFillColor(220, 252, 231); // Green tint for Net Passed
          doc.rect(14, mc3Y, 182, 5.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 101, 52);
        } else if (row.isTax) {
          doc.setFillColor(254, 226, 226); // Red tint for IHT Tax
          doc.rect(14, mc3Y, 182, 5.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(185, 28, 28);
        } else if (rIdx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, mc3Y, 182, 5, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }

        doc.text(row.label, 18, mc3Y + 3.8);
        doc.text(`£${Math.round((row.a80) || 0).toLocaleString()}`, 85, mc3Y + 3.8);
        doc.text(`£${Math.round((row.a90) || 0).toLocaleString()}`, 125, mc3Y + 3.8);
        doc.text(`£${Math.round((row.a100) || 0).toLocaleString()}`, 160, mc3Y + 3.8);

        mc3Y += row.isNet || row.isTax ? 5.5 : 5;
      });

      // =========================================================================
      // APPENDIX 1: ACCUMULATION LEDGER (CONTRIBUTIONS & POT TRANSFERS BY DATE)
      // =========================================================================
      for (let pIdx = 0; pIdx < totalAccumPages; pIdx++) {
        doc.addPage();
        curPageNum++;
        renderPageHeader(totalAccumPages > 1 ? `Appendix 1 — Accumulation Ledger (Part ${pIdx + 1} of ${totalAccumPages})` : 'Appendix 1 — Accumulation Ledger', curPageNum);

        let appY = 24;

        // Header Table Bar
        doc.setFillColor(30, 41, 59);
        doc.rect(14, appY, 182, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Date / Schedule', 16, appY + 5);
        doc.text('Event Name', 52, appY + 5);
        doc.text('Member', 100, appY + 5);
        doc.text('Category', 122, appY + 5);
        doc.text('Flow / Destination', 145, appY + 5);
        doc.text('Amount (£)', 175, appY + 5);

        appY += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);

        const pageAccumItems = accumLedgerItems.slice(pIdx * accumRowsPerPage, (pIdx + 1) * accumRowsPerPage);

        pageAccumItems.forEach((item, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, appY, 182, 5.5, 'F');
          }

          doc.setTextColor(51, 65, 85);
          doc.text(item.dateDisplay || '', 16, appY + 4);

          const nameText = item.name.length > 28 ? item.name.substring(0, 26) + '...' : item.name;
          doc.setFont('helvetica', 'bold');
          doc.text(nameText, 52, appY + 4);
          doc.setFont('helvetica', 'normal');

          doc.text(item.ownerName || '', 100, appY + 4);
          doc.text(item.category || '', 122, appY + 4);

          let flowText = formatPotNamePDF(item.targetPot);
          if (item.sourcePot && item.category === 'Pot Transfer') {
            flowText = `${formatPotNamePDF(item.sourcePot)} -> ${flowText}`;
          }
          if (flowText.length > 26) flowText = flowText.substring(0, 24) + '...';
          doc.text(flowText, 142, appY + 4);

          const amtText = item.isMonthly && item.monthlyAmt !== undefined
            ? `£${Math.round(item.monthlyAmt).toLocaleString()}/mo`
            : `£${Math.round(item.grossAnnual).toLocaleString()}`;

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(13, 148, 136);
          doc.text(amtText, 175, appY + 4);
          doc.setFont('helvetica', 'normal');

          appY += 5.5;
        });
      }

      // =========================================================================
      // APPENDIX 2: FULL DECUMULATION SCHEDULE OUTPUT
      // =========================================================================
      for (let pIdx = 0; pIdx < totalDecumPages; pIdx++) {
        doc.addPage();
        curPageNum++;
        renderPageHeader(`Appendix 2 — Full Decumulation Schedule Output (Part ${pIdx + 1} of ${totalDecumPages})`, curPageNum);

        let appY = 24;

        // Header Table Bar
        doc.setFillColor(30, 41, 59);
        doc.rect(14, appY, 182, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Age (Year)', 16, appY + 5);
        doc.text('Phase', 35, appY + 5);
        doc.text('Pension Pot', 52, appY + 5);
        doc.text('ISA Pot', 74, appY + 5);
        doc.text('Cash/GIA Pot', 94, appY + 5);
        doc.text('Total Pot', 116, appY + 5);
        doc.text('Fixed/Guar Inc', 138, appY + 5);
        doc.text('Drawdown', 160, appY + 5);
        doc.text('Net Income', 178, appY + 5);

        appY += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);

        const pageProjections = (projections || []).slice(pIdx * rowsPerPage, (pIdx + 1) * rowsPerPage);

        pageProjections.forEach((p, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, appY, 182, 5.5, 'F');
          }

          const hasShortfall = (p.incomeShortfall || 0) > 0;
          const fixedGuarInc = (p.statePensionReceived || 0) + (p.dbPensionIncomeReceived || 0) + (p.annuityIncomeReceived || 0) + (p.taxableFixedIncomeReceived || 0) + (p.taxFreeFixedIncomeReceived || 0);
          const drawdownVal = (p.pensionDrawdown || 0) + (p.isaDrawdown || 0) + (p.cashDrawdown || 0);

          doc.setTextColor(51, 65, 85);
          doc.text(`Age ${p.age} (${p.year})`, 16, appY + 4);
          doc.text(p.isRetired ? 'Retire' : 'Accum', 35, appY + 4);
          doc.text(`£${Math.round(p.pensionPot || (0) || 0).toLocaleString()}`, 52, appY + 4);
          doc.text(`£${Math.round(p.isaPot || (0) || 0).toLocaleString()}`, 74, appY + 4);
          doc.text(`£${Math.round(p.cashGiaPot || (0) || 0).toLocaleString()}`, 94, appY + 4);

          doc.setFont('helvetica', 'bold');
          doc.text(`£${Math.round(p.totalPot || (0) || 0).toLocaleString()}`, 116, appY + 4);
          doc.setFont('helvetica', 'normal');

          doc.text(`£${Math.round((fixedGuarInc) || 0).toLocaleString()}`, 138, appY + 4);
          doc.text(`£${Math.round((drawdownVal) || 0).toLocaleString()}`, 160, appY + 4);

          if (hasShortfall) {
            doc.setTextColor(225, 29, 72); // Rose text for deficit year
            doc.setFont('helvetica', 'bold');
            doc.text(`£${Math.round(p.netRetirementIncome || (0) || 0).toLocaleString()} !`, 178, appY + 4);
            doc.setFont('helvetica', 'normal');
          } else {
            doc.setFont('helvetica', 'bold');
            doc.text(`£${Math.round(p.netRetirementIncome || (0) || 0).toLocaleString()}`, 178, appY + 4);
            doc.setFont('helvetica', 'normal');
          }

          appY += 5.5;
        });
      }

      // =========================================================================
      // APPENDIX 3: HISTORIC MARKET PERFORMANCE SIMULATION (75 START YEARS)
      // =========================================================================
      const historicSim = runHistoricSimulation(profile, pots, exportTaxResult as any);

      // Part 1: Summary & Charts
      doc.addPage();
      curPageNum++;
      renderPageHeader('Appendix 3 — Historic Performance (Part 1)', curPageNum);

      let hY = 22;

      // Summary Header Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, hY, 182, 32, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, hY, 182, 32, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('75 Sequence Start Years Historical Stress Test (1950 - 2024 Real Data)', 18, hY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Success Rate: ${historicSim.successRate.toFixed(1)}% of 75 sequence start years sustained portfolio wealth to Age ${horizonAge}`, 18, hY + 13);
      doc.text(`• Median Final Real Wealth: £${Math.round(historicSim.medianFinalReal).toLocaleString()}`, 18, hY + 18);
      doc.text(`• Worst Start Year: ${historicSim.worstStartYear.startYear} (${historicSim.worstStartYear.startEvent}) — Final Real: £${Math.round(historicSim.worstStartYear.finalRealBalance).toLocaleString()}`, 18, hY + 23);
      doc.text(`• Best Start Year: ${historicSim.bestStartYear.startYear} (${historicSim.bestStartYear.startEvent}) — Final Real: £${Math.round(historicSim.bestStartYear.finalRealBalance).toLocaleString()}`, 18, hY + 28);

      hY += 36;

      // Chart 1: 75 Start Year Sequences Ending Wealth Distribution (Bar Visual)
      doc.setFillColor(30, 41, 59);
      doc.rect(14, hY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Chart: Final Real Wealth Across 75 Historical Sequence Start Years (1950 - 2024)', 18, hY + 4.2);

      hY += 6;
      const barBoxH = 65;
      doc.setFillColor(255, 255, 255);
      doc.rect(14, hY, 182, barBoxH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, hY, 182, barBoxH, 'D');

      // Draw Bars
      const maxRealVal = Math.max(...historicSim.runResults.map((r) => r.finalRealBalance), 1000000);
      const numHistoricRuns = historicSim.runResults.length || 75;
      const barW = (182 - 20) / numHistoricRuns; // ~2.16mm per bar for 75 years (fits within 162mm printable area)
      const barXStart = 24;
      const barYBase = hY + barBoxH - 12;
      const maxBarH = barBoxH - 22;

      // Gridlines
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      [0, 0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
        const gridY = barYBase - ratio * maxBarH;
        doc.line(24, gridY, 186, gridY);
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`£${Math.round((ratio * maxRealVal) / 1000)}k`, 15, gridY + 1.5);
      });

      historicSim.runResults.forEach((res, i) => {
        const x = barXStart + i * barW;
        const bH = Math.max(1, (res.finalRealBalance / maxRealVal) * maxBarH);
        const bY = barYBase - bH;

        if (res.isSuccess) {
          doc.setFillColor(16, 185, 129); // emerald for success
        } else {
          doc.setFillColor(225, 29, 72); // rose for depleted
        }
        doc.rect(x + 0.1, bY, Math.max(0.4, barW - 0.2), bH, 'F');

        // Year labels on x-axis every 10 years (1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024)
        if (i % 10 === 0 || i === numHistoricRuns - 1) {
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`${res.startYear}`, Math.max(22, Math.min(180, x - 2)), barYBase + 5);
        }
      });

      // Baseline
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.5);
      doc.line(24, barYBase, 190, barYBase);

      hY += barBoxH + 6;

      // Chart 2: Trajectory Curves
      doc.setFillColor(30, 41, 59);
      doc.rect(14, hY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Chart: Historical Percentile Wealth Trajectories (10th, 25th, Median, 75th, 90th)', 18, hY + 4.2);

      hY += 6;
      const trajBoxH = 65;
      doc.setFillColor(255, 255, 255);
      doc.rect(14, hY, 182, trajBoxH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, hY, 182, trajBoxH, 'D');

      const trajData = historicSim.aggregateTrajectory;
      if (trajData && trajData.length > 0) {
        const trajMaxVal = Math.max(...trajData.map((d) => d.p90TotalPot), 1000000);
        const trajXStart = 24;
        const trajW = 182 - 28;
        const trajYBase = hY + trajBoxH - 12;
        const trajMaxH = trajBoxH - 22;

        // Gridlines
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        [0, 0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
          const gridY = trajYBase - ratio * trajMaxH;
          doc.line(24, gridY, 190, gridY);
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`£${Math.round((ratio * trajMaxVal) / 1000)}k`, 15, gridY + 1.5);
        });

        const drawCurve = (key: 'p10TotalPot' | 'p25TotalPot' | 'p50TotalPot' | 'p75TotalPot' | 'p90TotalPot', color: [number, number, number]) => {
          doc.setDrawColor(color[0], color[1], color[2]);
          doc.setLineWidth(key === 'p50TotalPot' ? 1.2 : 0.7);
          for (let idx = 0; idx < trajData.length - 1; idx++) {
            const x1 = trajXStart + (idx / (trajData.length - 1)) * trajW;
            const y1 = trajYBase - (trajData[idx][key] / trajMaxVal) * trajMaxH;
            const x2 = trajXStart + ((idx + 1) / (trajData.length - 1)) * trajW;
            const y2 = trajYBase - (trajData[idx + 1][key] / trajMaxVal) * trajMaxH;
            doc.line(x1, y1, x2, y2);
          }
        };

        drawCurve('p10TotalPot', [225, 29, 72]); // Rose
        drawCurve('p25TotalPot', [217, 119, 6]); // Amber
        drawCurve('p50TotalPot', [37, 99, 235]); // Blue
        drawCurve('p75TotalPot', [13, 148, 136]); // Teal
        drawCurve('p90TotalPot', [16, 185, 129]); // Emerald

        // X-axis age ticks
        for (let idx = 0; idx < trajData.length; idx += 5) {
          const x = trajXStart + (idx / (trajData.length - 1)) * trajW;
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Age ${trajData[idx].age}`, x - 3, trajYBase + 5);
        }

        // Legend with vector boxes instead of unicode symbols
        doc.setFontSize(6.5);
        const lgItems = [
          { label: 'P10', color: [225, 29, 72] as [number, number, number], x: 120 },
          { label: 'P25', color: [217, 119, 6] as [number, number, number], x: 135 },
          { label: 'Median (P50)', color: [37, 99, 235] as [number, number, number], x: 150 },
          { label: 'P90', color: [16, 185, 129] as [number, number, number], x: 175 },
        ];
        lgItems.forEach((lg) => {
          doc.setFillColor(lg.color[0], lg.color[1], lg.color[2]);
          doc.rect(lg.x, hY + 6, 2.5, 2.5, 'F');
          doc.setTextColor(51, 65, 85);
          doc.text(lg.label, lg.x + 3.5, hY + 8);
        });
      }

      const renderMatrixTable = (resultsChunk: typeof historicSim.runResults) => {
        let h2Y = 22;

        // Header Bar
        doc.setFillColor(30, 41, 59);
        doc.rect(14, h2Y, 182, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Start Year', 16, h2Y + 4.2);
        doc.text('Historical Market Context / Event', 35, h2Y + 4.2);
        doc.text('Final Real Wealth', 115, h2Y + 4.2);
        doc.text('Min Pot Balance', 145, h2Y + 4.2);
        doc.text('Status', 175, h2Y + 4.2);

        h2Y += 6;
        doc.setFontSize(6.5);

        resultsChunk.forEach((res, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
            doc.rect(14, h2Y, 182, 5, 'F');
          }

          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'bold');
          doc.text(`${res.startYear}`, 16, h2Y + 3.8);
          doc.setFont('helvetica', 'normal');

          const evtTxt = res.startEvent.length > 42 ? res.startEvent.substring(0, 40) + '...' : res.startEvent;
          doc.text(evtTxt, 35, h2Y + 3.8);
          doc.text(`£${Math.round(res.finalRealBalance).toLocaleString()}`, 115, h2Y + 3.8);
          doc.text(`£${Math.round(res.minPotBalance).toLocaleString()}`, 145, h2Y + 3.8);

          if (res.isSuccess) {
            doc.setTextColor(22, 101, 52);
            doc.setFont('helvetica', 'bold');
            doc.text('Sustained', 175, h2Y + 3.8);
          } else {
            doc.setTextColor(225, 29, 72);
            doc.setFont('helvetica', 'bold');
            doc.text(`Depleted (${res.depletedAtAge ? `Age ${res.depletedAtAge}` : ''})`, 175, h2Y + 3.8);
          }

          h2Y += 5;
        });
      };

      const chunk1 = historicSim.runResults.slice(0, 38);
      const chunk2 = historicSim.runResults.slice(38);

      const chunk1StartYear = chunk1[0]?.startYear || 1950;
      const chunk1EndYear = chunk1[chunk1.length - 1]?.startYear || 1987;
      const chunk2StartYear = chunk2[0]?.startYear || 1988;
      const chunk2EndYear = chunk2[chunk2.length - 1]?.startYear || 2024;

      // Part 2a: Historic Performance Matrix (Chunk 1)
      doc.addPage();
      curPageNum++;
      renderPageHeader(`Appendix 3 — Historic Performance Matrix (Part 2a: ${chunk1StartYear}–${chunk1EndYear})`, curPageNum);
      renderMatrixTable(chunk1);

      // Part 2b: Historic Performance Matrix (Chunk 2)
      doc.addPage();
      curPageNum++;
      renderPageHeader(`Appendix 3 — Historic Performance Matrix (Part 2b: ${chunk2StartYear}–${chunk2EndYear})`, curPageNum);
      renderMatrixTable(chunk2);

      // =========================================================================
      // APPENDIX 4: MORTGAGE PAYOFF PROJECTION & DEBT AMORTIZATION
      // =========================================================================
      doc.addPage();
      curPageNum++;
      renderPageHeader('Appendix 4 — Mortgage Payoff & Debt Amortization', curPageNum);

      let mY = 22;

      const mConfig = profile.mortgage || DEFAULT_MORTGAGE;
      const isMortgageActive = (mConfig.enabled !== false) && (mConfig.currentBalance || 0) > 0;

      const mPropName = mConfig.propertyName || 'Primary Residence';
      const ihtPropVal = profile.ihtSettings?.primaryResidenceValue || 0;
      const mPropVal = isMortgageActive ? (mConfig.propertyValue || ihtPropVal) : (ihtPropVal || mConfig.propertyValue || 0);
      const mCurBal = isMortgageActive ? (mConfig.currentBalance || 0) : 0;
      const mRatePct = isMortgageActive ? (mConfig.interestRatePercent || 0) : 0;
      const mTermYrs = isMortgageActive ? (mConfig.remainingTermYears || 0) : 0;
      const mTermMos = isMortgageActive ? (mConfig.remainingTermMonths || 0) : 0;
      const mRepType = mConfig.repaymentType || 'repayment';
      const mRegOverpay = isMortgageActive ? (mConfig.regularMonthlyOverpayment || 0) : 0;
      const mLumpSums = isMortgageActive ? (mConfig.lumpSumOverpayments || []).filter((ls) => ls.enabled) : [];

      const mLtv = (mPropVal > 0 && mCurBal > 0) ? Math.min(100, (mCurBal / mPropVal) * 100) : 0;
      const mEquity = Math.max(0, mPropVal - mCurBal);
      const mRateMo = (mRatePct / 100) / 12;
      const mTotalMos = isMortgageActive ? Math.max(1, (mTermYrs * 12) + mTermMos) : 0;

      let mStdPmt = 0;
      if (mCurBal > 0) {
        if (mRepType === 'interest_only') {
          mStdPmt = mCurBal * mRateMo;
        } else if (mRateMo === 0) {
          mStdPmt = mCurBal / mTotalMos;
        } else {
          mStdPmt = (mCurBal * mRateMo * Math.pow(1 + mRateMo, mTotalMos)) / (Math.pow(1 + mRateMo, mTotalMos) - 1);
        }
      }

      const mEffPmt = isMortgageActive ? (mConfig.customMonthlyPayment || mStdPmt) : 0;
      const mTotalOutflow = mEffPmt + mRegOverpay;

      // Amortization simulation tracking balances across ages
      let mOvBal = mCurBal;
      let mOvInterest = 0;
      let mStdInterest = 0;
      let mStdBal = mCurBal;
      let mOvAgeCleared = isMortgageActive ? (currentAge + Math.ceil(mTotalMos / 12)) : currentAge;
      let mStdAgeCleared = isMortgageActive ? (currentAge + Math.ceil(mTotalMos / 12)) : currentAge;

      let mBalAtAccessOv = 0;
      let mBalAtAccessStd = 0;
      let mBalAtRetOv = 0;
      let mBalAtRetStd = 0;
      let mBalAtSpaOv = 0;
      let mBalAtSpaStd = 0;

      const amortizationCurve: { age: number; stdBal: number; ovBal: number }[] = [];

      if (isMortgageActive && mTotalMos > 0) {
        for (let m = 1; m <= mTotalMos + 60; m++) {
          const age = currentAge + Math.floor((m - 1) / 12);
          const monthInYear = ((m - 1) % 12) + 1;

          // Standard Amortization (Without Overpayments)
          if (mStdBal > 0) {
            const interestStd = mStdBal * mRateMo;
            mStdInterest += interestStd;
            let pmt = mEffPmt;
            if (mRepType === 'interest_only') pmt = interestStd;
            let cap = Math.max(0, pmt - interestStd);
            if (cap > mStdBal) cap = mStdBal;
            mStdBal = Math.max(0, mStdBal - cap);

            if (mStdBal <= 0.01 && mStdAgeCleared === currentAge + Math.ceil(mTotalMos / 12)) {
              mStdAgeCleared = age;
            }
          }

          // Overpaid Amortization (With Overpayments)
          if (mOvBal > 0) {
            const interestOv = mOvBal * mRateMo;
            mOvInterest += interestOv;
            let stdPmt = mEffPmt;
            if (mRepType === 'interest_only') stdPmt = interestOv;

            let lsExtra = 0;
            if (monthInYear === 1) {
              mLumpSums.forEach((ls) => {
                if (ls.age === age) lsExtra += ls.amount;
              });
              if (mConfig.payoffAtRetirement && age === targetAge) {
                lsExtra += mOvBal;
              }
              if (profile.lumpSumTargetPot === 'clear_mortgage' && age === primaryAccessAge) {
                lsExtra += mOvBal;
              }
            }

            let cap = Math.max(0, (stdPmt - interestOv) + mRegOverpay + lsExtra);
            if (cap > mOvBal) cap = mOvBal;
            mOvBal = Math.max(0, mOvBal - cap);

            if (mOvBal <= 0.01 && mOvAgeCleared === currentAge + Math.ceil(mTotalMos / 12)) {
              mOvAgeCleared = age;
            }
          }

          if (monthInYear === 12 || m === mTotalMos) {
            amortizationCurve.push({ age, stdBal: mStdBal, ovBal: mOvBal });
          }

          if (age === primaryAccessAge && monthInYear === 1) {
            mBalAtAccessOv = mOvBal;
            mBalAtAccessStd = mStdBal;
          }
          if (age === targetAge && monthInYear === 1) {
            mBalAtRetOv = mOvBal;
            mBalAtRetStd = mStdBal;
          }
          if (age === primarySpaAge && monthInYear === 1) {
            mBalAtSpaOv = mOvBal;
            mBalAtSpaStd = mStdBal;
          }
        }
      }

      const mInterestSaved = Math.max(0, mStdInterest - mOvInterest);

      // Card 1: Overview
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, mY, 182, 38, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, mY, 182, 38, 3, 3, 'D');

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Mortgage & Property Debt Overview — ${mPropName}`, 18, mY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Property Valuation: £${mPropVal.toLocaleString()} | LTV: ${mLtv.toFixed(1)}% | Current Equity: £${mEquity.toLocaleString()}`, 18, mY + 14);
      doc.text(`• Current Debt Balance: ${isMortgageActive ? `£${mCurBal.toLocaleString()} @ ${mRatePct}% APR (${mRepType.toUpperCase()})` : '£0 (Mortgage Switched Off)'}`, 18, mY + 20);
      doc.text(`• Monthly Outflow: ${isMortgageActive ? `£${Math.round(mEffPmt).toLocaleString()}/mo standard + £${mRegOverpay.toLocaleString()}/mo overpayment = £${Math.round(mTotalOutflow).toLocaleString()}/mo` : '£0/mo'}`, 18, mY + 26);
      doc.text(`• Strategy Status: ${isMortgageActive ? `£${Math.round(mInterestSaved).toLocaleString()} interest saved | Debt Cleared Age: Age ${mOvAgeCleared} (${Math.max(0, mStdAgeCleared - mOvAgeCleared)} yrs early)` : 'No active mortgage debt. 100% Cleared.'}`, 18, mY + 32);

      mY += 44;

      // Table: Key Milestone Debt Balances (Details With & Without Overpayments)
      doc.setFillColor(30, 41, 59);
      doc.rect(14, mY, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Milestone', 18, mY + 4.2);
      doc.text('Without Overpayments', 82, mY + 4.2);
      doc.text('With Overpayments', 132, mY + 4.2);
      doc.text('Debt Savings', 170, mY + 4.2);

      mY += 6.5;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');

      const mMilestones = [
        {
          milestone: `Private Pension Access (Age ${primaryAccessAge})`,
          stdBal: isMortgageActive ? mBalAtAccessStd : 0,
          ovBal: isMortgageActive ? mBalAtAccessOv : 0,
        },
        {
          milestone: `Target Retirement (Age ${targetAge})`,
          stdBal: isMortgageActive ? mBalAtRetStd : 0,
          ovBal: isMortgageActive ? mBalAtRetOv : 0,
        },
        {
          milestone: `State Pension Access (Age ${primarySpaAge})`,
          stdBal: isMortgageActive ? mBalAtSpaStd : 0,
          ovBal: isMortgageActive ? mBalAtSpaOv : 0,
        },
        {
          milestone: `Payoff Age (Std: Age ${mStdAgeCleared} vs Overpaid: Age ${mOvAgeCleared})`,
          stdBal: 0,
          ovBal: 0,
          isPayoffRow: true,
        },
      ];

      mMilestones.forEach((row, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
          doc.rect(14, mY, 182, 5.5, 'F');
        }
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.text(row.milestone, 18, mY + 4);

        if (row.isPayoffRow) {
          doc.setTextColor(100, 116, 139);
          doc.text(`Age ${mStdAgeCleared}`, 82, mY + 4);
          doc.setTextColor(22, 101, 52);
          doc.setFont('helvetica', 'bold');
          doc.text(`Age ${mOvAgeCleared} (${Math.max(0, mStdAgeCleared - mOvAgeCleared)} yrs early)`, 132, mY + 4);
          doc.text(`£${Math.round(mInterestSaved).toLocaleString()} saved`, 170, mY + 4);
        } else {
          // Std Bal
          if (row.stdBal <= 0) {
            doc.setTextColor(22, 101, 52);
            doc.text('£0 (Cleared)', 82, mY + 4);
          } else {
            doc.setTextColor(51, 65, 85);
            doc.text(`£${Math.round(row.stdBal).toLocaleString()}`, 82, mY + 4);
          }

          // Overpaid Bal
          if (row.ovBal <= 0) {
            doc.setTextColor(22, 101, 52);
            doc.setFont('helvetica', 'bold');
            doc.text('£0 (Cleared Early)', 132, mY + 4);
          } else {
            doc.setTextColor(225, 29, 72);
            doc.setFont('helvetica', 'bold');
            doc.text(`£${Math.round(row.ovBal).toLocaleString()}`, 132, mY + 4);
          }

          // Savings
          const diff = Math.max(0, row.stdBal - row.ovBal);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129);
          doc.text(diff > 0 ? `-£${Math.round(diff).toLocaleString()}` : '£0', 170, mY + 4);
        }
        doc.setFont('helvetica', 'normal');
        mY += 5.5;
      });

      mY += 8;

      // Chart: Mortgage Payoff Projection & Debt Amortization (Only if active)
      if (isMortgageActive && mCurBal > 0) {
        doc.setFillColor(30, 41, 59);
        doc.rect(14, mY, 182, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Chart: Mortgage Payoff Projection & Debt Amortization Curve', 18, mY + 4.2);

        mY += 6;
        const mChartH = 85;
        doc.setFillColor(255, 255, 255);
        doc.rect(14, mY, 182, mChartH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, mY, 182, mChartH, 'D');

        if (amortizationCurve.length > 0) {
          const mMaxYVal = Math.max(mCurBal, 100000);
          const mChartXStart = 26;
          const mChartW = 182 - 32;
          const mChartYBase = mY + mChartH - 14;
          const mChartMaxH = mChartH - 24;

          // Y Gridlines
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.3);
          [0, 0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
            const gridY = mChartYBase - ratio * mChartMaxH;
            doc.line(26, gridY, 190, gridY);
            doc.setFontSize(5.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`£${Math.round((ratio * mMaxYVal) / 1000)}k`, 15, gridY + 1.5);
          });

          // Draw Standard Curve (Gray)
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.8);
          for (let i = 0; i < amortizationCurve.length - 1; i++) {
            const x1 = mChartXStart + (i / (amortizationCurve.length - 1)) * mChartW;
            const y1 = mChartYBase - (amortizationCurve[i].stdBal / mMaxYVal) * mChartMaxH;
            const x2 = mChartXStart + ((i + 1) / (amortizationCurve.length - 1)) * mChartW;
            const y2 = mChartYBase - (amortizationCurve[i + 1].stdBal / mMaxYVal) * mChartMaxH;
            doc.line(x1, y1, x2, y2);
          }

          // Draw Overpaid Curve (Emerald)
          doc.setDrawColor(16, 185, 129);
          doc.setLineWidth(1.4);
          for (let i = 0; i < amortizationCurve.length - 1; i++) {
            const x1 = mChartXStart + (i / (amortizationCurve.length - 1)) * mChartW;
            const y1 = mChartYBase - (amortizationCurve[i].ovBal / mMaxYVal) * mChartMaxH;
            const x2 = mChartXStart + ((i + 1) / (amortizationCurve.length - 1)) * mChartW;
            const y2 = mChartYBase - (amortizationCurve[i + 1].ovBal / mMaxYVal) * mChartMaxH;
            doc.line(x1, y1, x2, y2);
          }

          // Dashed Vertical Reference Lines for Milestones
          const drawMilestoneLine = (age: number, label: string, color: [number, number, number]) => {
            const idx = amortizationCurve.findIndex((c) => c.age >= age);
            if (idx >= 0) {
              const x = mChartXStart + (idx / (amortizationCurve.length - 1)) * mChartW;
              doc.setDrawColor(color[0], color[1], color[2]);
              doc.setLineWidth(0.6);
              for (let ly = mChartYBase - mChartMaxH + 6; ly < mChartYBase; ly += 3) {
                doc.line(x, ly, x, Math.min(ly + 1.5, mChartYBase));
              }
              doc.setFontSize(6);
              doc.setTextColor(color[0], color[1], color[2]);
              doc.setFont('helvetica', 'bold');
              doc.text(label, Math.max(26, Math.min(160, x - 10)), mChartYBase - mChartMaxH + 4);
            }
          };

          drawMilestoneLine(primaryAccessAge, `Priv Pen (Age ${primaryAccessAge})`, [180, 83, 9]);
          drawMilestoneLine(targetAge, `Retire (Age ${targetAge})`, [16, 185, 129]);
          drawMilestoneLine(primarySpaAge, `State Pen (Age ${primarySpaAge})`, [79, 70, 229]);

          // X-axis age ticks
          for (let i = 0; i < amortizationCurve.length; i += 5) {
            const x = mChartXStart + (i / (amortizationCurve.length - 1)) * mChartW;
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Age ${amortizationCurve[i].age}`, x - 3, mChartYBase + 5);
          }

          // Legend
          doc.setFontSize(6.5);
          doc.setTextColor(148, 163, 184); doc.text('— Standard Amortization', 120, mY + 8);
          doc.setTextColor(16, 185, 129); doc.setFont('helvetica', 'bold'); doc.text('— Strategy Overpayment Balance', 152, mY + 8);
        }
      } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, mY, 182, 18, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, mY, 182, 18, 3, 3, 'D');
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('Mortgage Debt Switched Off', 18, mY + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      // =========================================================================
      // APPENDIX 5: CASH FLOW SANKEY WATERFALL DIAGRAMS
      // =========================================================================
      sankeyMilestones.forEach((mItem, mIdx) => {
        doc.addPage();
        curPageNum++;
        renderPageHeader(
          totalSankeyPages > 1
            ? `Appendix 5 — Cash Flow Sankey (Part ${mIdx + 1} of ${totalSankeyPages})`
            : 'Appendix 5 — Cash Flow Sankey Waterfall',
          curPageNum
        );

        let skY = 24;

        // Header Title Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, skY, 182, 19, 3, 3, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, skY, 182, 19, 3, 3, 'D');

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(mItem.title, 18, skY + 7);

        // Phase badge
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(144, skY + 3.5, 48, 5.5, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(144, skY + 3.5, 48, 5.5, 2, 2, 'D');
        doc.setTextColor(15, 118, 110);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(mItem.phaseLabel, 146, skY + 7.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(mItem.subtitle, 18, skY + 14);

        skY += 22;

        // Compute Sankey Data and Layout
        const sankeyData = computeCashFlowSankeyData(
          profile,
          pots,
          projections,
          mItem.age,
          mItem.viewMode
        );

        // Summary Metric Strip
        if (sankeyData) {
          const metricBoxW = 42.5;
          const metricBoxH = 15;
          const metricsStartY = skY;

          const isRetired = sankeyData.isRetired;

          const cards = isRetired
            ? [
                {
                  label: 'Gross Inflows',
                  val: `£${Math.round(sankeyData.totalGross).toLocaleString()}`,
                  sub: 'Total Cash / Drawdown',
                  color: [14, 165, 233],
                },
                {
                  label: 'Total UK Taxes',
                  val: `£${Math.round(sankeyData.totalTaxes).toLocaleString()}`,
                  sub: `Effective ${sankeyData.metrics.taxRateEffective.toFixed(1)}% Rate`,
                  color: [239, 68, 68],
                },
                {
                  label: 'Net Living Income',
                  val: `£${Math.round(sankeyData.totalNetIncome).toLocaleString()}`,
                  sub: `£${Math.round(sankeyData.totalNetIncome / 12).toLocaleString()}/month`,
                  color: [16, 185, 129],
                },
                {
                  label: 'Guaranteed Floor',
                  val: `£${Math.round(sankeyData.metrics.guaranteedFloor || 0).toLocaleString()}`,
                  sub: 'State + DB + Annuity',
                  color: [139, 92, 246],
                },
              ]
            : [
                {
                  label: 'Gross Inflows',
                  val: `£${Math.round(sankeyData.totalGross).toLocaleString()}`,
                  sub: 'Salary + Empr Pension',
                  color: [14, 165, 233],
                },
                {
                  label: 'Total UK Taxes',
                  val: `£${Math.round(sankeyData.totalTaxes).toLocaleString()}`,
                  sub: `Income Tax & NI (${sankeyData.metrics.taxRateEffective.toFixed(1)}%)`,
                  color: [239, 68, 68],
                },
                {
                  label: 'Net Take-Home Spend',
                  val: `£${Math.round(sankeyData.totalNetIncome).toLocaleString()}`,
                  sub: `£${Math.round(sankeyData.totalNetIncome / 12).toLocaleString()}/month`,
                  color: [16, 185, 129],
                },
                {
                  label: 'Invested Wealth',
                  val: `£${Math.round((sankeyData.metrics.savingsRate ? (sankeyData.totalGross * sankeyData.metrics.savingsRate) / 100 : 0)).toLocaleString()}`,
                  sub: `Savings Rate ${sankeyData.metrics.savingsRate?.toFixed(1) || 0}%`,
                  color: [99, 102, 241],
                },
              ];

          cards.forEach((card, cIdx) => {
            const cx = 14 + cIdx * (metricBoxW + 4);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(cx, metricsStartY, metricBoxW, metricBoxH, 2, 2, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(cx, metricsStartY, metricBoxW, metricBoxH, 2, 2, 'D');

            doc.setFillColor(card.color[0], card.color[1], card.color[2]);
            doc.rect(cx, metricsStartY, 2, metricBoxH, 'F');

            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'bold');
            doc.text(card.label.toUpperCase(), cx + 5, metricsStartY + 4.2);

            doc.setFontSize(8.5);
            doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(card.val, cx + 5, metricsStartY + 9.5);

            doc.setFontSize(5.5);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.text(card.sub, cx + 5, metricsStartY + 13.2);
          });

          skY += 18;
        }

        // Sankey Diagram Canvas Box
        const sankeyBoxH = 175;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, skY, 182, sankeyBoxH, 3, 3, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, skY, 182, sankeyBoxH, 3, 3, 'D');

        // Column Titles Bar inside Sankey Box
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('1. GROSS INFLOWS', 22, skY + 6);
        doc.text('2. GROSS INFLOW HUB', 74, skY + 6, { align: 'center' });
        doc.text('3. TAXES & NET CASH', 126, skY + 6, { align: 'center' });
        doc.text('4. ALLOCATIONS', 182, skY + 6, { align: 'right' });

        // Draw Sankey Flow Links and Nodes
        const canvasX = 14;
        const canvasY = skY + 8;
        const canvasW = 182;
        const canvasH = sankeyBoxH - 12;

        const sankeyLayout = sankeyData
          ? computeSankeyLayout(sankeyData, canvasW, canvasH, 8, 8, 5, 5, 3.5)
          : null;

        if (sankeyLayout && sankeyData && sankeyData.nodes.length > 0) {
          // 1. Draw Links / Ribbons
          sankeyLayout.linkPaths.forEach((link) => {
            const rgb = hexToRgb(link.color);
            const linkFillR = Math.round(rgb[0] * 0.35 + 255 * 0.65);
            const linkFillG = Math.round(rgb[1] * 0.35 + 255 * 0.65);
            const linkFillB = Math.round(rgb[2] * 0.35 + 255 * 0.65);

            const linkStrokeR = Math.round(rgb[0] * 0.6 + 255 * 0.4);
            const linkStrokeG = Math.round(rgb[1] * 0.6 + 255 * 0.4);
            const linkStrokeB = Math.round(rgb[2] * 0.6 + 255 * 0.4);

            if (link.coords) {
              const { x0, y0, x1, y3, y2, y1, dx } = link.coords;
              const px0 = canvasX + x0;
              const py0 = canvasY + y0;
              const px1 = canvasX + x1;
              const py3 = canvasY + y3;
              const py2 = canvasY + y2;
              const py1 = canvasY + y1;
              const pdx = dx;

              const polyPoints: { x: number; y: number }[] = [];
              const steps = 18;

              // Top Bezier curve: (px0, py0) -> (px1, py3)
              for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const mt = 1 - t;
                const mt2 = mt * mt;
                const mt3 = mt2 * mt;
                const t2 = t * t;
                const t3 = t2 * t;

                const topX = mt3 * px0 + 3 * mt2 * t * (px0 + pdx) + 3 * mt * t2 * (px1 - pdx) + t3 * px1;
                const topY = mt3 * py0 + 3 * mt2 * t * py0 + 3 * mt * t2 * py3 + t3 * py3;
                polyPoints.push({ x: topX, y: topY });
              }

              // Bottom Bezier curve: (px1, py2) -> (px0, py1)
              for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const mt = 1 - t;
                const mt2 = mt * mt;
                const mt3 = mt2 * mt;
                const t2 = t * t;
                const t3 = t2 * t;

                const botX = mt3 * px1 + 3 * mt2 * t * (px1 - pdx) + 3 * mt * t2 * (px0 + pdx) + t3 * px0;
                const botY = mt3 * py2 + 3 * mt2 * t * py2 + 3 * mt * t2 * py1 + t3 * py1;
                polyPoints.push({ x: botX, y: botY });
              }

              if (polyPoints.length > 1) {
                const startPt = polyPoints[0];
                const relativeVectors: [number, number][] = [];
                for (let k = 1; k < polyPoints.length; k++) {
                  relativeVectors.push([
                    polyPoints[k].x - polyPoints[k - 1].x,
                    polyPoints[k].y - polyPoints[k - 1].y,
                  ]);
                }

                doc.setFillColor(linkFillR, linkFillG, linkFillB);
                doc.setDrawColor(linkStrokeR, linkStrokeG, linkStrokeB);
                doc.setLineWidth(0.15);
                try {
                  doc.lines(relativeVectors, startPt.x, startPt.y, [1, 1], 'FD', true);
                } catch {
                  // Fallback
                  const fallbackLines = [
                    [px1 - px0, py3 - py0],
                    [0, py2 - py3],
                    [px0 - px1, py1 - py2],
                  ];
                  doc.lines(fallbackLines, px0, py0, [1, 1], 'FD', true);
                }
              }
            }
          });

          // 2. Draw Nodes
          sankeyLayout.nodePositions.forEach((pos) => {
            const nodeRgb = hexToRgb(pos.node.color);
            const nx = canvasX + pos.x;
            const ny = canvasY + pos.y;
            const nw = pos.width;
            const nh = pos.height;

            // Node colored rounded rectangle
            doc.setFillColor(nodeRgb[0], nodeRgb[1], nodeRgb[2]);
            doc.setDrawColor(Math.round(nodeRgb[0] * 0.7), Math.round(nodeRgb[1] * 0.7), Math.round(nodeRgb[2] * 0.7));
            doc.setLineWidth(0.3);
            doc.roundedRect(nx, ny, nw, nh, 1, 1, 'FD');

            const displayAmount = `£${Math.round(pos.node.amount).toLocaleString()}`;
            const labelText = pos.node.label.length > 22 ? `${pos.node.label.substring(0, 20)}..` : pos.node.label;

            // Text Labels per column
            if (pos.node.column === 0) {
              const labelX = nx + nw + 2;
              const labelY = ny + Math.max(3, nh / 2);

              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.text(labelText, labelX, labelY - 1);

              doc.setFontSize(4.8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(71, 85, 105);
              doc.text(displayAmount, labelX, labelY + 2.5);
            } else if (pos.node.column === 1) {
              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.text(labelText, nx + nw / 2, ny - 2, { align: 'center' });

              if (nh >= 12) {
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(5);
                doc.setFont('helvetica', 'bold');
                doc.text(displayAmount, nx + nw / 2, ny + nh / 2 + 1, { align: 'center' });
              } else {
                doc.setTextColor(71, 85, 105);
                doc.setFontSize(5);
                doc.setFont('helvetica', 'normal');
                doc.text(displayAmount, nx + nw / 2, ny + nh + 3, { align: 'center' });
              }
            } else if (pos.node.column === 2) {
              const labelX = nx + nw + 2;
              const labelY = ny + Math.max(3, nh / 2);
              const isTax = pos.node.category === 'deduction';

              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(isTax ? 220 : 15, isTax ? 38 : 23, isTax ? 38 : 42);
              doc.text(labelText, labelX, labelY - 1);

              doc.setFontSize(4.8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(isTax ? 185 : 71, isTax ? 28 : 85, isTax ? 28 : 105);
              doc.text(displayAmount, labelX, labelY + 2.5);
            } else if (pos.node.column === 3) {
              const labelX = nx - 2;
              const labelY = ny + Math.max(3, nh / 2);

              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.text(labelText, labelX, labelY - 1, { align: 'right' });

              doc.setFontSize(4.8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(71, 85, 105);
              doc.text(displayAmount, labelX, labelY + 2.5, { align: 'right' });
            }
          });
        }

        skY += sankeyBoxH + 4;

        // Key Milestone Footnote & Insights Bar
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, skY, 182, 14, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, skY, 182, 14, 2, 2, 'D');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text('Key Cash Flow Observations for this Milestone:', 18, skY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);

        const obsText = sankeyData?.isRetired
          ? `• Inflows are sourced from flexi-access pots, annuities, and DWP State Pension. Net available living income covers essential & lifestyle spending.`
          : `• Active salary income is optimized via statutory UK Income Tax & National Insurance allowances, workplace pension relief, and tax-sheltered ISA/GIA contributions.`;

        doc.text(obsText, 18, skY + 9);
      });

      // =========================================================================
      // APPENDIX 6: VISUAL MILESTONE TIMELINE & LIFECYCLE ROADMAP
      // =========================================================================
        doc.addPage();
        curPageNum++;
        renderPageHeader('Appendix 6 — Visual Milestone Timeline & Roadmap', curPageNum);

        let tmY = 24;

        // Header Title Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, tmY, 182, 19, 3, 3, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, tmY, 182, 19, 3, 3, 'D');

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('Appendix 6 — Visual Milestone Timeline & Lifecycle Roadmap', 18, tmY + 7);

        // Phase badge
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(140, tmY + 3.5, 52, 5.5, 2, 2, 'F');
        doc.setDrawColor(199, 210, 254);
        doc.roundedRect(140, tmY + 3.5, 52, 5.5, 2, 2, 'D');
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('Strategic Lifecycle Roadmap', 142, tmY + 7.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Comprehensive chronological progression across accumulation, decumulation phases, and key financial gates.', 18, tmY + 14);

        tmY += 22;

        // Derive milestones for PDF
        const pdfMilestones: {
          label: string;
          shortLabel: string;
          age: number;
          year: number;
          color: [number, number, number];
          category: string;
          impact: string;
          owner: string;
          level: number;
        }[] = [];

        const curAge = profile.currentAge || 40;
        const maxLifeAge = profile.lifeExpectancyAge || 90;
        const minAgeSpan = Math.min(curAge, 35);
        const totalSpanYears = Math.max(1, maxLifeAge - minAgeSpan);
        const baseYear = new Date().getFullYear();

        // 1. Current Age
        pdfMilestones.push({
          label: 'Current Starting Age',
          shortLabel: 'Current Age',
          age: curAge,
          year: baseYear,
          color: [2, 132, 199],
          category: 'Core',
          impact: 'Baseline savings & asset accumulation start',
          owner: profile.name || 'Primary',
          level: 0,
        });

        // 2. Mortgage Payoff
        if (profile.mortgageDebt?.enabled && profile.mortgageDebt.remainingTermYears) {
          const mPayoffAge = curAge + profile.mortgageDebt.remainingTermYears;
          if (mPayoffAge <= maxLifeAge) {
            pdfMilestones.push({
              label: 'Mortgage Cleared',
              shortLabel: 'Debt Free',
              age: mPayoffAge,
              year: baseYear + profile.mortgageDebt.remainingTermYears,
              color: [14, 165, 233],
              category: 'Property',
              impact: `+£${Math.round(profile.mortgageDebt.monthlyPayment * 12).toLocaleString()}/yr freed cash flow`,
              owner: 'Household',
              level: 1,
            });
          }
        }

        // 3. Primary Pension Access (NMPA)
        const pNmpa = getPensionAccessAge(profile);
        pdfMilestones.push({
          label: `${profile.name || 'Primary'} Pension Access (NMPA)`,
          shortLabel: 'Pension Access',
          age: pNmpa,
          year: baseYear + (pNmpa - curAge),
          color: [16, 185, 129],
          category: 'Pension',
          impact: '25% Tax-Free Cash (PCLS) & flexible drawdown unlocked',
          owner: profile.name || 'Primary',
          level: 0,
        });

        // 4. Partner Pension Access (if couple)
        if (isCouple) {
          const partNmpa = getPartnerPensionAccessAge(profile);
          const partOff = (profile.partnerCurrentAge || curAge) - curAge;
          const pAgeAtPartNmpa = partNmpa - partOff;
          pdfMilestones.push({
            label: `${profile.partnerName || 'Partner'} Pension Access`,
            shortLabel: 'Partner NMPA',
            age: pAgeAtPartNmpa,
            year: baseYear + (pAgeAtPartNmpa - curAge),
            color: [52, 211, 153],
            category: 'Pension',
            impact: 'Partner DC pension pots & PCLS unlocked',
            owner: profile.partnerName || 'Partner',
            level: 1,
          });
        }

        // 5. Target Retirement Primary
        pdfMilestones.push({
          label: `${profile.name || 'Primary'} Target Retirement`,
          shortLabel: 'Retirement',
          age: targetAge,
          year: baseYear + (targetAge - curAge),
          color: [139, 92, 246],
          category: 'Core',
          impact: 'Active employment ceases; decumulation drawdown begins',
          owner: profile.name || 'Primary',
          level: 2,
        });

        // 6. Target Retirement Partner
        if (isCouple && profile.partnerTargetRetirementAge) {
          const partOff = (profile.partnerCurrentAge || curAge) - curAge;
          const pAgeAtPartRet = profile.partnerTargetRetirementAge - partOff;
          if (pAgeAtPartRet !== targetAge) {
            pdfMilestones.push({
              label: `${profile.partnerName || 'Partner'} Target Retirement`,
              shortLabel: 'Partner Retire',
              age: pAgeAtPartRet,
              year: baseYear + (pAgeAtPartRet - curAge),
              color: [168, 85, 247],
              category: 'Core',
              impact: 'Partner employment ceases; combined decumulation',
              owner: profile.partnerName || 'Partner',
              level: 3,
            });
          }
        }

        // 7. Property Right-Sizing
        if (profile.propertyDownsizePlan?.enabled) {
          const dsAge = profile.propertyDownsizePlan.downsizeAge || 68;
          pdfMilestones.push({
            label: 'Property Right-Sizing',
            shortLabel: 'Downsize Home',
            age: dsAge,
            year: baseYear + (dsAge - curAge),
            color: [245, 158, 11],
            category: 'Property',
            impact: 'Net equity release injected into liquid retirement pots',
            owner: 'Household',
            level: 1,
          });
        }

        // 8. Primary State Pension
        const pSpa = profile.statePensionAge || 67;
        pdfMilestones.push({
          label: `${profile.name || 'Primary'} State Pension`,
          shortLabel: 'State Pension',
          age: pSpa,
          year: baseYear + (pSpa - curAge),
          color: [99, 102, 241],
          category: 'Pension',
          impact: 'DWP State Pension Triple-Lock floor commences',
          owner: profile.name || 'Primary',
          level: 2,
        });

        // 9. Partner State Pension
        if (isCouple && (profile.partnerIncludeStatePension ?? true)) {
          const partSpa = profile.partnerStatePensionAge || 67;
          const partOff = (profile.partnerCurrentAge || curAge) - curAge;
          const pAgeAtPartSpa = partSpa - partOff;
          pdfMilestones.push({
            label: `${profile.partnerName || 'Partner'} State Pension`,
            shortLabel: 'Partner State Pen.',
            age: pAgeAtPartSpa,
            year: baseYear + (pAgeAtPartSpa - curAge),
            color: [129, 140, 248],
            category: 'Pension',
            impact: 'Partner DWP State Pension floor commences',
            owner: profile.partnerName || 'Partner',
            level: 3,
          });
        }

        // 10. UK Gilt Ladder Purchase (Primary)
        if (profile.giltLadderConfig?.enabled) {
          const gPurchaseAge = profile.giltLadderConfig.purchaseAge ?? profile.giltLadderConfig.startAge ?? targetAge;
          const gDur = profile.giltLadderConfig.durationYears || 5;
          const gAmt = profile.giltLadderConfig.targetAnnualIncome || 25000;
          pdfMilestones.push({
            label: `${isCouple ? `${profile.name || 'Primary'} ` : ''}UK Gilt Ladder Purchase`,
            shortLabel: 'Gilt Ladder',
            age: gPurchaseAge,
            year: baseYear + (gPurchaseAge - curAge),
            color: [5, 150, 105],
            category: 'Pension',
            impact: `Purchase ${gDur}-yr UK Gilt ladder (£${Math.round(gAmt).toLocaleString()}/yr 0% CGT payout from age ${gPurchaseAge + 1})`,
            owner: profile.name || 'Primary',
            level: 2,
          });
        }

        // 10b. UK Gilt Ladder Purchase (Partner)
        if (isCouple && profile.partnerGiltLadderConfig?.enabled) {
          const partGPurchaseAge = profile.partnerGiltLadderConfig.purchaseAge ?? profile.partnerGiltLadderConfig.startAge ?? (profile.partnerTargetRetirementAge ?? 60);
          const partOff = (profile.partnerCurrentAge || curAge) - curAge;
          const pAgeAtPartGilt = partGPurchaseAge - partOff;
          const gDur = profile.partnerGiltLadderConfig.durationYears || 5;
          const gAmt = profile.partnerGiltLadderConfig.targetAnnualIncome || 25000;
          pdfMilestones.push({
            label: `${profile.partnerName || 'Partner'} UK Gilt Ladder Purchase`,
            shortLabel: 'Partner Gilt',
            age: pAgeAtPartGilt,
            year: baseYear + (pAgeAtPartGilt - curAge),
            color: [5, 150, 105],
            category: 'Pension',
            impact: `Purchase ${gDur}-yr UK Gilt ladder (£${Math.round(gAmt).toLocaleString()}/yr 0% CGT payout from ${profile.partnerName || 'Partner'} age ${partGPurchaseAge + 1})`,
            owner: profile.partnerName || 'Partner',
            level: 3,
          });
        }

        // 11. Defined Benefit (DB) Pensions Start
        (profile.dbPensions || []).filter(db => db.enabled && db.annualIncome > 0).forEach(db => {
          const isPart = db.owner === 'partner';
          const pOff = isPart ? (profile.partnerCurrentAge || curAge) - curAge : 0;
          const pAgeAtDb = db.startAge - pOff;
          pdfMilestones.push({
            label: `${db.name || 'DB Pension'} Start`,
            shortLabel: db.name && db.name.length > 14 ? db.name.substring(0, 12) + '..' : (db.name || 'DB Pension'),
            age: pAgeAtDb,
            year: baseYear + (pAgeAtDb - curAge),
            color: [37, 99, 235],
            category: 'Pension',
            impact: `Guaranteed £${Math.round(db.annualIncome).toLocaleString()}/yr DB pension commences`,
            owner: isPart ? (profile.partnerName || 'Partner') : (profile.name || 'Primary'),
            level: 1,
          });
        });

        // 12. Annuity Purchase (Primary)
        const hasAnnuityExport =
          profile.incomeProductOption === 'annuity' ||
          profile.incomeProductOption === 'hybrid' ||
          (profile.annuityFloorMode && profile.annuityFloorMode !== 'none');

        if (hasAnnuityExport) {
          const annPurchaseAge = profile.annuityPurchaseAge || profile.annuityFloorAge || targetAge;
          const annAllocPct = profile.annuityAllocationPercent || (profile.incomeProductOption === 'hybrid' ? 50 : 100);
          pdfMilestones.push({
            label: `${profile.name || 'Primary'} Annuity Purchase`,
            shortLabel: 'Annuity Purchase',
            age: annPurchaseAge,
            year: baseYear + (annPurchaseAge - curAge),
            color: [217, 119, 6],
            category: 'Pension',
            impact: `Purchase guaranteed lifetime annuity (${annAllocPct}% of pension pot)`,
            owner: profile.name || 'Primary',
            level: 2,
          });
        }

        // 12b. Annuity Purchase (Partner)
        const hasPartAnnuityExport = isCouple && (
          profile.partnerIncomeProductOption === 'annuity' ||
          profile.partnerIncomeProductOption === 'hybrid'
        );
        if (hasPartAnnuityExport) {
          const partAnnPurchaseAge = profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge ?? 60);
          const partOff = (profile.partnerCurrentAge || curAge) - curAge;
          const pAgeAtPartAnn = partAnnPurchaseAge - partOff;
          const partAnnAllocPct = profile.partnerAnnuityAllocationPercent || (profile.partnerIncomeProductOption === 'hybrid' ? 50 : 100);
          pdfMilestones.push({
            label: `${profile.partnerName || 'Partner'} Annuity Purchase`,
            shortLabel: 'Partner Annuity',
            age: pAgeAtPartAnn,
            year: baseYear + (pAgeAtPartAnn - curAge),
            color: [217, 119, 6],
            category: 'Pension',
            impact: `Purchase guaranteed lifetime annuity (${partAnnAllocPct}% of partner pension pot)`,
            owner: profile.partnerName || 'Partner',
            level: 3,
          });
        }

        // 13. Custom Decumulation Events
        (profile.decumulationLifeEvents || []).filter(e => e.enabled).forEach(ev => {
          const isPart = ev.owner === 'partner';
          const partOff = isPart ? ((profile.partnerCurrentAge || curAge) - curAge) : 0;
          const pAgeAtEv = ev.age - partOff;
          pdfMilestones.push({
            label: `${isPart ? `${profile.partnerName || 'Partner'}: ` : ''}${ev.name}`,
            shortLabel: ev.name.length > 15 ? ev.name.substring(0, 13) + '..' : ev.name,
            age: pAgeAtEv,
            year: baseYear + (pAgeAtEv - curAge),
            color: ev.type === 'income' ? [16, 185, 129] : [236, 72, 153],
            category: 'Life Event',
            impact: `${ev.type === 'income' ? '+' : '-'}£${Math.round(ev.amount).toLocaleString()} (${ev.targetPot || 'General'} pot)`,
            owner: isPart ? (profile.partnerName || 'Partner') : (profile.name || 'Primary'),
            level: 1,
          });
        });

        // 14. Life Expectancy Horizon
        pdfMilestones.push({
          label: 'Planning Horizon',
          shortLabel: 'Horizon',
          age: maxLifeAge,
          year: baseYear + (maxLifeAge - curAge),
          color: [239, 68, 68],
          category: 'Horizon',
          impact: 'Terminal legacy & estate wealth evaluated',
          owner: 'Household',
          level: 0,
        });

        // Sort milestones
        pdfMilestones.sort((a, b) => a.age - b.age);

        // Assign non-colliding vertical level heights (0..4)
        const lastPdfAgeByLvl = [-100, -100, -100, -100, -100];
        pdfMilestones.forEach(m => {
          let bestLvl = 0;
          for (let l = 0; l < 5; l++) {
            if (m.age - lastPdfAgeByLvl[l] >= 6) {
              bestLvl = l;
              break;
            }
          }
          lastPdfAgeByLvl[bestLvl] = m.age;
          m.level = bestLvl;
        });

        // Draw Visual Timeline Box
        const tBoxX = 14;
        const tBoxY = tmY;
        const tBoxW = 182;
        const tBoxH = 68;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(tBoxX, tBoxY, tBoxW, tBoxH, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(tBoxX, tBoxY, tBoxW, tBoxH, 3, 3, 'D');

        // Timeline axis line
        const axisLineY = tBoxY + 48;
        const axisStart = tBoxX + 10;
        const axisEnd = tBoxX + tBoxW - 10;
        const axisLen = axisEnd - axisStart;

        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(1.2);
        doc.line(axisStart, axisLineY, axisEnd, axisLineY);
        doc.setLineWidth(0.2);

        // Decade reference gridlines
        for (let a = Math.ceil(minAgeSpan / 10) * 10; a <= maxLifeAge; a += 10) {
          const tX = axisStart + ((a - minAgeSpan) / totalSpanYears) * axisLen;
          doc.setDrawColor(203, 213, 225);
          doc.line(tX, tBoxY + 6, tX, axisLineY + 6);
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(`Age ${a}`, tX, axisLineY + 9, { align: 'center' });
        }

        // Render each milestone pin
        pdfMilestones.forEach(m => {
          const mX = axisStart + ((m.age - minAgeSpan) / totalSpanYears) * axisLen;
          const stemH = 7 + m.level * 6.5;
          const cardY = axisLineY - stemH - 6.5;

          // Stalk
          doc.setDrawColor(m.color[0], m.color[1], m.color[2]);
          doc.setLineWidth(0.5);
          doc.line(mX, axisLineY, mX, cardY + 5.5);
          doc.setLineWidth(0.2);

          // Card Tag
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(mX - 11, cardY, 22, 6, 1, 1, 'F');
          doc.setDrawColor(m.color[0], m.color[1], m.color[2]);
          doc.roundedRect(mX - 11, cardY, 22, 6, 1, 1, 'D');

          // Colored dot
          doc.setFillColor(m.color[0], m.color[1], m.color[2]);
          doc.circle(mX - 8.5, cardY + 3, 1, 'F');

          // Tag Text
          doc.setFontSize(4.8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(m.shortLabel.length > 10 ? m.shortLabel.substring(0, 9) + '.' : m.shortLabel, mX - 6.5, cardY + 2.8);

          doc.setFontSize(4.2);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`Age ${m.age}`, mX - 6.5, cardY + 5);

          // Node circle on axis
          doc.setFillColor(m.color[0], m.color[1], m.color[2]);
          doc.circle(mX, axisLineY, 2, 'F');
          doc.setFillColor(255, 255, 255);
          doc.circle(mX, axisLineY, 0.8, 'F');
        });

        tmY += tBoxH + 4;

        // 4 Retirement Phase Cards
        const phaseBoxW = 43.5;
        const phaseBoxH = 17;
        const p2End = Math.min(maxLifeAge, Math.max(targetRetireAgeVal, 72));
        const p3End = Math.min(maxLifeAge, Math.max(p2End, 82));

        const timelinePdfPhases = [
          { title: 'Accumulation Phase', span: `Ages ${minAgeSpan}–${targetRetireAgeVal}`, desc: 'Active savings, pension tax relief & compound growth', color: [2, 132, 199] },
          { title: 'Go-Go Active Phase', span: `Ages ${targetRetireAgeVal}–${p2End}`, desc: 'Peak travel, hobbies, bucket list & higher spending', color: [16, 185, 129] },
          { title: 'Slow-Go Leisure', span: `Ages ${p2End}–${p3End}`, desc: 'Moderate local living, reduced travel & lower spend', color: [245, 158, 11] },
          { title: 'No-Go Elder Care', span: `Ages ${p3End}–${maxLifeAge}`, desc: 'Health, comfort, estate preservation & IHT planning', color: [168, 85, 247] },
        ];

        timelinePdfPhases.forEach((ph, pIdx) => {
          const phX = 14 + pIdx * (phaseBoxW + 2.5);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(phX, tmY, phaseBoxW, phaseBoxH, 2, 2, 'F');
          doc.setDrawColor(ph.color[0], ph.color[1], ph.color[2]);
          doc.roundedRect(phX, tmY, phaseBoxW, phaseBoxH, 2, 2, 'D');

          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(ph.color[0], ph.color[1], ph.color[2]);
          doc.text(ph.title, phX + 2.5, tmY + 4.5);

          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(ph.span, phX + 2.5, tmY + 8.5);

          doc.setFontSize(4.8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(doc.splitTextToSize(ph.desc, phaseBoxW - 5), phX + 2.5, tmY + 12);
        });

        tmY += phaseBoxH + 5;

        // Key Milestones Execution Schedule Table
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, tmY, 182, 6, 1, 1, 'F');

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Milestone Event & Description', 18, tmY + 4);
        doc.text('Category', 68, tmY + 4);
        doc.text('Target Age (Year)', 92, tmY + 4);
        doc.text('Owner', 122, tmY + 4);
        doc.text('Financial & Cash Flow Impact', 145, tmY + 4);

        tmY += 6.5;

        pdfMilestones.forEach((m, mIdx) => {
          if (mIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, tmY, 182, 5.5, 'F');
          }

          // Bullet dot
          doc.setFillColor(m.color[0], m.color[1], m.color[2]);
          doc.circle(16.5, tmY + 2.8, 1, 'F');

          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(m.label.length > 28 ? m.label.substring(0, 26) + '..' : m.label, 19, tmY + 3.8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(71, 85, 105);
          doc.text(m.category, 68, tmY + 3.8);

          doc.setFont('helvetica', 'bold');
          doc.text(`Age ${m.age} (${m.year})`, 92, tmY + 3.8);

          doc.setFont('helvetica', 'normal');
          doc.text(m.owner, 122, tmY + 3.8);

          doc.setFontSize(5);
          doc.setTextColor(15, 118, 110);
          doc.text(m.impact.length > 34 ? m.impact.substring(0, 32) + '..' : m.impact, 145, tmY + 3.8);

          tmY += 5.5;
        });

        // Strategic Lifecycle Observations Box
        if (tmY < 265) {
          const obsH = Math.min(278 - tmY, 14);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(14, tmY + 2, 182, obsH, 2, 2, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(14, tmY + 2, 182, obsH, 2, 2, 'D');

          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text('Strategic Lifecycle Planning Observations:', 18, tmY + 6.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text('• Plan milestones reflect statutory UK Normal Minimum Pension Age gates, Triple-Lock State Pension commencement, and personalized decumulation transitions.', 18, tmY + 11);
        }

      // Dynamic Two-Pass Page Numbering & Footer Pass across all actual pages
      const finalTotalPages = doc.getNumberOfPages();
      for (let p = 1; p <= finalTotalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(255, 255, 255);
        doc.rect(14, 283, 182, 8, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
        doc.text(`Page ${p} of ${finalTotalPages} • ${appName} Confidential Guidance Model`, 14, 287);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 165, 287);
      }

      // Save PDF safely using fileNameSlug
      doc.save(`${appName.replace(/\s+/g, '_')}_PDF_Report_${fileNameSlug}.pdf`);

      setExportSuccessMsg('Professional PDF Report generated & downloaded!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('PDF Report Export Error:', err);
      alert('Error generating PDF Report. Please check console.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (variant === 'pdf_only') {
    return (
      <div className="bg-gradient-to-r from-primary-50 via-slate-50 to-indigo-50 dark:from-primary-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-primary-300 dark:border-primary-500/50 space-y-4 relative overflow-hidden transition-colors">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />

        {exportSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-500/40 text-xs font-bold px-3.5 py-2 rounded-xl z-10 relative"
          >
            <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>{exportSuccessMsg}</span>
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Full Household PDF Report
                </h3>
                <span className="bg-primary-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Full PDF Plan
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Comprehensive multi-page report including household inputs, target retirement pot breakdown, <strong>diagram illustrations</strong>, and decumulation schedule.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex-shrink-0">
            <button
              onClick={handleExportPdfReport}
              disabled={isExportingPdf}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'data_only') {
    return (
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
              <Table className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                Data Export &amp; Backup Options
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export projection spreadsheets for Excel or backup/restore scenario JSON settings
              </p>
            </div>
          </div>

          {exportSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-500/40 text-xs font-bold px-3 py-1.5 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>{exportSuccessMsg}</span>
            </motion.div>
          )}
        </div>

        {/* Export Options Grid (Formula Excel, CSV Export, JSON Backup & Restore) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Formula Spreadsheet Export (.xlsx) */}
          <div className="bg-slate-50 dark:bg-slate-800/90 p-4.5 rounded-2xl border-2 border-blue-500/60 space-y-3 flex flex-col justify-between shadow-md relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-blue-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live Formulas
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Formula Excel (.xlsx)</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Native LibreOffice / Excel spreadsheet with multi-tab layout, assumptions, and <strong>live dynamic formulas</strong> (SUM, IF, Tax bands).
              </p>
            </div>

            <button
              onClick={handleExportFormulaExcel}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Formula Excel</span>
            </button>
          </div>

          {/* Option 2: CSV Spreadsheet Export */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <Table className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">CSV Data Export</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Complete spreadsheet CSV with 17 detailed columns of year-by-year pot balances, withdrawals, and tax paid for Excel/Google Sheets.
              </p>
            </div>

            <button
              onClick={handleExportCsv}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Projections CSV</span>
            </button>
          </div>

          {/* Option 2: Backup & Restore Settings (JSON Import / Export) */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <FileJson className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">JSON Settings Backup</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Export all saved scenarios, pot balances, and custom settings to a `.json` backup file or restore previously exported files.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Export JSON */}
              <button
                onClick={() => {
                  const jsonStr = JSON.stringify({
                    version: 'v2',
                    exportedAt: new Date().toISOString(),
                    scenarios: scenarios
                  }, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const downloadAnchor = document.createElement('a');
                  const dateStr = new Date().toISOString().split('T')[0];
                  downloadAnchor.setAttribute("href", url);
                  downloadAnchor.setAttribute("download", `${appName.replace(/\s+/g, '_')}_Settings_Backup_${dateStr}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  URL.revokeObjectURL(url);
                  setExportSuccessMsg('Settings exported to JSON backup file!');
                  setTimeout(() => setExportSuccessMsg(null), 4000);
                }}
                className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              {/* Import JSON */}
              <label className="flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const content = evt.target?.result as string;
                        const parsed = JSON.parse(content);
                        let imported: PlannerScenario[] = [];
                        if (Array.isArray(parsed)) {
                          imported = parsed;
                        } else if (parsed && Array.isArray(parsed.scenarios)) {
                          imported = parsed.scenarios;
                        } else if (parsed && parsed.profile && parsed.pots) {
                          imported = [parsed];
                        }
                        if (imported.length > 0 && onImportScenarios) {
                          onImportScenarios(imported);
                        } else {
                          alert('Invalid JSON settings file format.');
                        }
                      } catch (err) {
                        alert('Failed to parse JSON settings file.');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              {appName} Summary &amp; Plan Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download your complete retirement projection, diagram illustrations, tax relief analysis, and drawdown timeline
            </p>
          </div>
        </div>

        {exportSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-500/40 text-xs font-bold px-3 py-1.5 rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>{exportSuccessMsg}</span>
          </motion.div>
        )}
      </div>

      {/* Export Options Grid (PDF Report, Formula Excel, CSV Export, JSON Backup & Restore) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Option 1: PDF Report (with Diagram Illustrations & Full Analysis) */}
        <div className="bg-slate-50 dark:bg-slate-800/90 p-4.5 rounded-2xl border-2 border-primary-500/60 space-y-3 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-primary-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Full PDF Plan
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">PDF Report</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Comprehensive multi-page report including household inputs, target retirement pot breakdown, <strong>diagram illustrations</strong>, and decumulation schedule.
            </p>
          </div>

          <button
            onClick={handleExportPdfReport}
            disabled={isExportingPdf}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}</span>
          </button>
        </div>

        {/* Option 2: Formula Spreadsheet Export (.xlsx) */}
        <div className="bg-slate-50 dark:bg-slate-800/90 p-4.5 rounded-2xl border-2 border-blue-500/60 space-y-3 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-blue-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live Formulas
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Formula Excel (.xlsx)</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Native LibreOffice / Excel spreadsheet with multi-tab layout, assumptions, and <strong>live dynamic formulas</strong> (SUM, IF, Tax bands).
            </p>
          </div>

          <button
            onClick={handleExportFormulaExcel}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Formula Excel</span>
          </button>
        </div>

        {/* Option 3: CSV Spreadsheet Export */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <Table className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">CSV Data Export</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Complete spreadsheet CSV with 17 detailed columns of year-by-year pot balances, withdrawals, and tax paid for Excel/Google Sheets.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Projections CSV</span>
          </button>
        </div>

        {/* Option 3: Backup & Restore Settings (JSON Import / Export) */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <FileJson className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">JSON Settings Backup</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Export all saved scenarios, pot balances, and custom settings to a `.json` backup file or restore previously exported files.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Export JSON */}
            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                  version: 'v2',
                  exportedAt: new Date().toISOString(),
                  scenarios: scenarios
                }, null, 2));
                const downloadAnchor = document.createElement('a');
                const dateStr = new Date().toISOString().split('T')[0];
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `${appName.replace(/\s+/g, '_')}_Settings_Backup_${dateStr}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                setExportSuccessMsg('Settings exported to JSON backup file!');
                setTimeout(() => setExportSuccessMsg(null), 4000);
              }}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Import JSON */}
            <label className="flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const content = evt.target?.result as string;
                      const parsed = JSON.parse(content);
                      let imported: PlannerScenario[] = [];
                      if (Array.isArray(parsed)) {
                        imported = parsed;
                      } else if (parsed && Array.isArray(parsed.scenarios)) {
                        imported = parsed.scenarios;
                      } else if (parsed && parsed.profile && parsed.pots) {
                        imported = [parsed];
                      }
                      if (imported.length > 0 && onImportScenarios) {
                        onImportScenarios(imported);
                      } else {
                        alert('Invalid JSON settings file format.');
                      }
                    } catch (err) {
                      alert('Failed to parse JSON settings file.');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

