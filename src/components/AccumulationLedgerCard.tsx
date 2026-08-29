import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, InvestmentPots, OneOffContribution, PotTransfer, DbPension, InvestmentPotType } from '../types';
import { calculateUKTax, calculatePartnerUKTax } from '../utils/ukTaxEngine';
import {
  Calendar,
  ArrowRightLeft,
  PiggyBank,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ArrowUpDown,
  Sparkles,
  Info,
  Coins,
  ShieldCheck,
  Landmark,
  User,
  Heart,
  Layers,
  Clock,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';

interface AccumulationLedgerCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChange?: (updatedProfile: UserProfile) => void;
}

export type LedgerCategory = 'all' | 'contribution' | 'transfer';
export type LedgerOwnerFilter = 'all' | 'primary' | 'partner';
export type LedgerSortOrder = 'asc' | 'desc';

export interface LedgerItem {
  id: string;
  sourceType: 'one_off_contrib' | 'regular_contrib' | 'base_monthly_saving' | 'pot_transfer' | 'db_lump_sum';
  category: 'contribution' | 'transfer';
  name: string;
  owner: 'primary' | 'partner';
  ownerName: string;
  destinationOwner?: 'primary' | 'partner';
  destinationOwnerName?: string;
  sourcePot?: string;
  targetPot: string;
  grossAmount: number; // £ lump sum, transfer amount, or annual contribution
  monthlyAmount?: number; // £/mo if applicable
  frequency: 'one_off' | 'regular_monthly' | 'lump_sum';
  dateSortKey: string; // YYYY-MM-DD for precise sorting
  dateDisplay: string;
  year?: number;
  age?: number;
  enabled: boolean;
  description?: string;
  taxReliefEstimate?: number; // Estimated tax relief for pension contributions
  originalRef?: OneOffContribution | PotTransfer | DbPension;
}

function getPotName(pot?: string): string {
  if (!pot) return 'Unknown Pot';
  switch (pot) {
    case 'workplace_pension':
      return 'Workplace Pension';
    case 'sipp':
      return 'SIPP (Personal Pension)';
    case 'stocks_and_shares_isa':
      return 'Stocks & Shares ISA';
    case 'cash_isa':
      return 'Cash ISA';
    case 'lisa':
      return 'Lifetime ISA (LISA)';
    case 'gia':
      return 'General Investment Account (GIA)';
    case 'cash_savings':
      return 'Cash & Savings Buffer';
    default:
      return pot;
  }
}

function getPotBadgeColor(pot?: string): string {
  if (!pot) return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  if (pot === 'workplace_pension' || pot === 'sipp') {
    return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40';
  }
  if (pot === 'stocks_and_shares_isa' || pot === 'cash_isa' || pot === 'lisa') {
    return 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200/60 dark:border-primary-800/40';
  }
  return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export type LedgerExpandMode = 'grouped' | 'annual' | 'monthly';

export const AccumulationLedgerCard: React.FC<AccumulationLedgerCardProps> = ({
  profile,
  pots,
  onChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<LedgerCategory>('all');
  const [ownerFilter, setOwnerFilter] = useState<LedgerOwnerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<LedgerSortOrder>('asc');
  const [showDisabled, setShowDisabled] = useState(true);
  const [expandMode, setExpandMode] = useState<LedgerExpandMode>('annual');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const isCouple = Boolean(profile.isCouplePlanning);
  const primaryName = profile.name || 'Primary';
  const partnerName = profile.partnerName || 'Partner';
  const currentYear = new Date().getFullYear();
  const primaryCurrentAge = profile.currentAge || 35;
  const primaryRetireAge = profile.targetRetirementAge || 60;
  const partnerCurrentAge = profile.partnerCurrentAge || primaryCurrentAge;
  const partnerRetireAge = profile.partnerTargetRetirementAge || primaryRetireAge;

  const primaryTaxResult = useMemo(() => calculateUKTax(profile, pots), [profile, pots]);
  const partnerTaxResult = useMemo(() => isCouple ? calculatePartnerUKTax(profile, profile.partnerPots) : null, [profile, isCouple]);

  // Compile all ledger items
  const ledgerItems = useMemo<LedgerItem[]>(() => {
    const items: LedgerItem[] = [];

    // 1. One-off & Custom Regular Contributions
    (profile.oneOffContributions || []).forEach((c) => {
      const isPartnerOwner = c.owner === 'partner';
      const owner = isPartnerOwner ? 'partner' : 'primary';
      const ownerName = isPartnerOwner ? partnerName : primaryName;
      const curAge = isPartnerOwner ? partnerCurrentAge : primaryCurrentAge;
      const retAge = isPartnerOwner ? partnerRetireAge : primaryRetireAge;

      const isMonthly = c.frequency === 'regular_monthly';

      let startYear: number;
      let endYear: number;

      if (c.date && c.date.trim() !== '') {
        const parts = c.date.split('-');
        startYear = parseInt(parts[0], 10) || currentYear;
        endYear = startYear;
      } else if (c.startAge !== undefined) {
        startYear = currentYear + Math.max(0, c.startAge - curAge);
        endYear = isMonthly
          ? (c.endAge !== undefined ? currentYear + Math.max(0, c.endAge - curAge) : currentYear + Math.max(0, retAge - curAge - 1))
          : startYear;
      } else {
        startYear = currentYear;
        endYear = isMonthly ? currentYear + Math.max(0, retAge - curAge - 1) : currentYear;
      }

      if (!isMonthly && startYear < currentYear) {
        return; // Exclude past transaction dates from accumulation schedule
      }
      if (isMonthly && startYear < currentYear) {
        startYear = currentYear;
      }

      if (endYear < startYear) endYear = startYear;

      let grossAnnual = c.grossAmount || 0;
      let monthlyAmt: number | undefined = undefined;

      if (isMonthly) {
        if (c.targetPot === 'workplace_pension' && c.workplaceContributionType === 'percent') {
          const salary = isPartnerOwner ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
          const empMo = (salary * ((c.employeePercent || 0) / 100)) / 12;
          const emprMo = (salary * ((c.employerPercent || 0) / 100)) / 12;
          monthlyAmt = empMo + emprMo;
          grossAnnual = monthlyAmt * 12;
        } else if (c.targetPot === 'sipp') {
          monthlyAmt = c.grossAmount || 0;
          if (c.sippContributionType === 'gross') {
            grossAnnual = monthlyAmt * 12;
          } else {
            grossAnnual = monthlyAmt * 1.25 * 12;
          }
        } else {
          monthlyAmt = c.grossAmount || 0;
          grossAnnual = monthlyAmt * 12;
        }
      } else {
        if (c.targetPot === 'sipp' && c.sippContributionType !== 'gross') {
          grossAnnual = (c.grossAmount || 0) * 1.25;
        }
      }

      // Estimate tax relief for personal pensions (SIPP)
      let taxRelief: number | undefined = undefined;
      let itemDescription = c.description;

      if (c.targetPot === 'sipp' && grossAnnual > 0) {
        if (isMonthly) {
          if (c.sippContributionType === 'gross') {
            taxRelief = grossAnnual * 0.20;
            const netMo = Math.round((c.grossAmount || 0) * 0.80);
            itemDescription = itemDescription 
              ? `${itemDescription} (Gross basis: £${c.grossAmount}/mo → £${netMo}/mo net out-of-pocket)`
              : `Gross SIPP input: £${c.grossAmount}/mo (Net out-of-pocket: £${netMo}/mo)`;
          } else {
            taxRelief = (c.grossAmount || 0) * 0.25 * 12;
            const grossMo = Math.round((c.grossAmount || 0) * 1.25);
            itemDescription = itemDescription
              ? `${itemDescription} (Net basis: £${c.grossAmount}/mo out-of-pocket → £${grossMo}/mo total into SIPP)`
              : `Net SIPP out-of-pocket: £${c.grossAmount}/mo (+25% tax relief → £${grossMo}/mo into SIPP)`;
          }
        } else {
          const rawAmt = c.grossAmount || 0;
          if (c.sippContributionType === 'gross') {
            taxRelief = rawAmt * 0.20;
            const netPaid = Math.round(rawAmt * 0.80);
            itemDescription = itemDescription
              ? `${itemDescription} (Gross lump sum: £${rawAmt.toLocaleString()} → £${netPaid.toLocaleString()} net out-of-pocket)`
              : `Gross SIPP lump sum: £${rawAmt.toLocaleString()} (Net out-of-pocket: £${netPaid.toLocaleString()})`;
          } else {
            taxRelief = rawAmt * 0.25;
            const totalGross = Math.round(rawAmt * 1.25);
            itemDescription = itemDescription
              ? `${itemDescription} (Net paid: £${rawAmt.toLocaleString()} → +£${Math.round(rawAmt * 0.25).toLocaleString()} tax relief = £${totalGross.toLocaleString()} into SIPP)`
              : `Net SIPP lump sum out-of-pocket: £${rawAmt.toLocaleString()} (+25% tax relief → £${totalGross.toLocaleString()} total into SIPP)`;
          }
        }
      }

      if (isMonthly && endYear >= startYear) {
        if (expandMode === 'monthly') {
          const taxYearMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
          for (let y = startYear; y <= endYear; y++) {
            const ageForYear = curAge + (y - currentYear);
            for (const m of taxYearMonths) {
              const mYear = m <= 3 ? y + 1 : y;
              const mStr = m < 10 ? `0${m}` : `${m}`;
              const dateSortKey = `${mYear}-${mStr}-01`;
              const dateDisplay = `${MONTH_NAMES[m - 1]} ${mYear} (Age ${ageForYear})`;

              items.push({
                id: `${c.id}_m_${mYear}_${mStr}`,
                sourceType: 'regular_contrib',
                category: 'contribution',
                name: c.name || 'Regular Monthly Contribution',
                owner,
                ownerName,
                targetPot: c.targetPot,
                grossAmount: monthlyAmt || (grossAnnual / 12),
                monthlyAmount: monthlyAmt,
                frequency: 'regular_monthly',
                dateSortKey,
                dateDisplay,
                year: y,
                age: ageForYear,
                enabled: c.enabled,
                description: itemDescription,
                taxReliefEstimate: taxRelief ? taxRelief / 12 : undefined,
                originalRef: c,
              });
            }
          }
        } else if (expandMode === 'annual') {
          for (let y = startYear; y <= endYear; y++) {
            const ageForYear = curAge + (y - currentYear);
            const dateSortKey = `${y}-04-06`;
            const dateDisplay = `Tax Year ${y}/${(y + 1).toString().slice(2)} (Age ${ageForYear})`;

            items.push({
              id: `${c.id}_year_${y}`,
              sourceType: 'regular_contrib',
              category: 'contribution',
              name: c.name || 'Regular Monthly Contribution',
              owner,
              ownerName,
              targetPot: c.targetPot,
              grossAmount: grossAnnual,
              monthlyAmount: monthlyAmt,
              frequency: 'regular_monthly',
              dateSortKey,
              dateDisplay,
              year: y,
              age: ageForYear,
              enabled: c.enabled,
              description: itemDescription,
              taxReliefEstimate: taxRelief,
              originalRef: c,
            });
          }
        } else {
          let dateSortKey: string;
          let dateDisplay: string;
          if (c.date && c.date.trim() !== '') {
            dateSortKey = c.date;
            const dateObj = new Date(c.date);
            dateDisplay = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : c.date;
          } else if (c.startAge !== undefined) {
            dateSortKey = `${startYear}-04-06`;
            const startAgeVal = c.startAge;
            const endAgeVal = c.endAge || retAge;
            dateDisplay = `${startYear}–${endYear} (Ages ${startAgeVal}–${endAgeVal})`;
          } else {
            dateSortKey = `${startYear}-04-06`;
            dateDisplay = `${startYear}–${endYear} (Ages ${curAge}–${retAge})`;
          }

          items.push({
            id: c.id,
            sourceType: 'regular_contrib',
            category: 'contribution',
            name: c.name || 'Regular Contribution',
            owner,
            ownerName,
            targetPot: c.targetPot,
            grossAmount: grossAnnual,
            monthlyAmount: monthlyAmt,
            frequency: 'regular_monthly',
            dateSortKey,
            dateDisplay,
            year: startYear,
            age: c.startAge ?? curAge,
            enabled: c.enabled,
            description: itemDescription,
            taxReliefEstimate: taxRelief,
            originalRef: c,
          });
        }
      } else {
        let dateSortKey: string;
        let dateDisplay: string;
        if (c.date && c.date.trim() !== '') {
          dateSortKey = c.date;
          const dateObj = new Date(c.date);
          dateDisplay = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : c.date;
        } else if (c.startAge !== undefined) {
          dateSortKey = `${startYear}-04-06`;
          dateDisplay = `Tax Year ${startYear}/${(startYear + 1).toString().slice(2)} (Age ${c.startAge})`;
        } else {
          dateSortKey = `${startYear}-04-06`;
          dateDisplay = `Tax Year ${startYear}/${(startYear + 1).toString().slice(2)}`;
        }

        items.push({
          id: c.id,
          sourceType: 'one_off_contrib',
          category: 'contribution',
          name: c.name || 'One-off Lump Sum Contribution',
          owner,
          ownerName,
          targetPot: c.targetPot,
          grossAmount: grossAnnual,
          monthlyAmount: monthlyAmt,
          frequency: 'one_off',
          dateSortKey,
          dateDisplay,
          year: startYear,
          age: c.startAge ?? curAge,
          enabled: c.enabled,
          description: itemDescription,
          taxReliefEstimate: taxRelief,
          originalRef: c,
        });
      }
    });

    // 2. Base Workplace Pension from Pot State (only if not already in oneOffContributions)
    const primaryPots = pots;
    const salary = profile.grossAnnualSalary || 0;
    
    const hasPrimaryWorkplaceInOneOff = (profile.oneOffContributions || []).some(
      (c) => (c.owner || 'primary') === 'primary' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
    );

    if (!hasPrimaryWorkplaceInOneOff) {
      let pEmpPensionMo = 0;
      if (primaryPots.workplacePensionMonthlyEmployeeType === 'percent') {
        pEmpPensionMo = (salary * ((primaryPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12;
      } else {
        pEmpPensionMo = primaryPots.workplacePensionMonthlyEmployee || 0;
      }
      const pEmprPensionMo = (salary * ((primaryPots.employerMatchPercentage || 0) / 100)) / 12;
      const pTotalWorkplaceMo = pEmpPensionMo + pEmprPensionMo;
      if (pTotalWorkplaceMo > 0) {
        const startYr = currentYear;
        const endYr = currentYear + Math.max(0, primaryRetireAge - primaryCurrentAge - 1);

        if (endYr >= startYr) {
          if (expandMode === 'monthly') {
            const taxYearMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
            for (let y = startYr; y <= endYr; y++) {
              const ageVal = primaryCurrentAge + (y - currentYear);
              for (const m of taxYearMonths) {
                const mYear = m <= 3 ? y + 1 : y;
                const mStr = m < 10 ? `0${m}` : `${m}`;
                const dateSortKey = `${mYear}-${mStr}-01`;
                const dateDisplay = `${MONTH_NAMES[m - 1]} ${mYear} (Age ${ageVal})`;

                items.push({
                  id: `base_primary_workplace_m_${mYear}_${mStr}`,
                  sourceType: 'base_monthly_saving',
                  category: 'contribution',
                  name: `${primaryName} Workplace Pension (Salary Sacrifice)`,
                  owner: 'primary',
                  ownerName: primaryName,
                  targetPot: 'workplace_pension',
                  grossAmount: pTotalWorkplaceMo,
                  monthlyAmount: pTotalWorkplaceMo,
                  frequency: 'regular_monthly',
                  dateSortKey,
                  dateDisplay,
                  year: y,
                  age: ageVal,
                  enabled: true,
                  description: `Employee: £${Math.round(pEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(pEmprPensionMo).toLocaleString()}/mo`,
                });
              }
            }
          } else if (expandMode === 'annual') {
            for (let y = startYr; y <= endYr; y++) {
              const ageVal = primaryCurrentAge + (y - currentYear);
              items.push({
                id: `base_primary_workplace_yr_${y}`,
                sourceType: 'base_monthly_saving',
                category: 'contribution',
                name: `${primaryName} Workplace Pension (Salary Sacrifice)`,
                owner: 'primary',
                ownerName: primaryName,
                targetPot: 'workplace_pension',
                grossAmount: pTotalWorkplaceMo * 12,
                monthlyAmount: pTotalWorkplaceMo,
                frequency: 'regular_monthly',
                dateSortKey: `${y}-01-01`,
                dateDisplay: `Tax Year ${y}/${(y + 1).toString().slice(2)} (Age ${ageVal})`,
                year: y,
                age: ageVal,
                enabled: true,
                description: `Employee: £${Math.round(pEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(pEmprPensionMo).toLocaleString()}/mo`,
              });
            }
          } else {
            items.push({
              id: 'base_primary_workplace',
              sourceType: 'base_monthly_saving',
              category: 'contribution',
              name: `${primaryName} Workplace Pension (Salary Sacrifice)`,
              owner: 'primary',
              ownerName: primaryName,
              targetPot: 'workplace_pension',
              grossAmount: pTotalWorkplaceMo * 12,
              monthlyAmount: pTotalWorkplaceMo,
              frequency: 'regular_monthly',
              dateSortKey: `${currentYear}-01-01`,
              dateDisplay: `Ongoing (${currentYear}–${endYr + 1})`,
              year: currentYear,
              age: primaryCurrentAge,
              enabled: true,
              description: `Employee: £${Math.round(pEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(pEmprPensionMo).toLocaleString()}/mo`,
            });
          }
        }
      }
    }

    // Partner Base Workplace Pension if couple planning
    if (isCouple && profile.partnerPots) {
      const hasPartnerWorkplaceInOneOff = (profile.oneOffContributions || []).some(
        (c) => c.owner === 'partner' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
      );

      if (!hasPartnerWorkplaceInOneOff) {
        const partPots = profile.partnerPots;
        const partSalary = profile.partnerGrossAnnualSalary || 0;

        let partEmpPensionMo = 0;
        if (partPots.workplacePensionMonthlyEmployeeType === 'percent') {
          partEmpPensionMo = (partSalary * ((partPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12;
        } else {
          partEmpPensionMo = partPots.workplacePensionMonthlyEmployee || 0;
        }
        const partEmprPensionMo = (partSalary * ((partPots.employerMatchPercentage || 0) / 100)) / 12;
        const partTotalWorkplaceMo = partEmpPensionMo + partEmprPensionMo;
        if (partTotalWorkplaceMo > 0) {
          const startYr = currentYear;
          const endYr = currentYear + Math.max(0, partnerRetireAge - partnerCurrentAge - 1);

          if (endYr >= startYr) {
            if (expandMode === 'monthly') {
              const taxYearMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
              for (let y = startYr; y <= endYr; y++) {
                const ageVal = partnerCurrentAge + (y - currentYear);
                for (const m of taxYearMonths) {
                  const mYear = m <= 3 ? y + 1 : y;
                  const mStr = m < 10 ? `0${m}` : `${m}`;
                  const dateSortKey = `${mYear}-${mStr}-01`;
                  const dateDisplay = `${MONTH_NAMES[m - 1]} ${mYear} (Age ${ageVal})`;

                  items.push({
                    id: `base_partner_workplace_m_${mYear}_${mStr}`,
                    sourceType: 'base_monthly_saving',
                    category: 'contribution',
                    name: `${partnerName} Workplace Pension (Salary Sacrifice)`,
                    owner: 'partner',
                    ownerName: partnerName,
                    targetPot: 'workplace_pension',
                    grossAmount: partTotalWorkplaceMo,
                    monthlyAmount: partTotalWorkplaceMo,
                    frequency: 'regular_monthly',
                    dateSortKey,
                    dateDisplay,
                    year: y,
                    age: ageVal,
                    enabled: true,
                    description: `Employee: £${Math.round(partEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(partEmprPensionMo).toLocaleString()}/mo`,
                  });
                }
              }
            } else if (expandMode === 'annual') {
              for (let y = startYr; y <= endYr; y++) {
                const ageVal = partnerCurrentAge + (y - currentYear);
                items.push({
                  id: `base_partner_workplace_yr_${y}`,
                  sourceType: 'base_monthly_saving',
                  category: 'contribution',
                  name: `${partnerName} Workplace Pension (Salary Sacrifice)`,
                  owner: 'partner',
                  ownerName: partnerName,
                  targetPot: 'workplace_pension',
                  grossAmount: partTotalWorkplaceMo * 12,
                  monthlyAmount: partTotalWorkplaceMo,
                  frequency: 'regular_monthly',
                  dateSortKey: `${y}-01-01`,
                  dateDisplay: `Tax Year ${y}/${(y + 1).toString().slice(2)} (Age ${ageVal})`,
                  year: y,
                  age: ageVal,
                  enabled: true,
                  description: `Employee: £${Math.round(partEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(partEmprPensionMo).toLocaleString()}/mo`,
                });
              }
            } else {
              items.push({
                id: 'base_partner_workplace',
                sourceType: 'base_monthly_saving',
                category: 'contribution',
                name: `${partnerName} Workplace Pension (Salary Sacrifice)`,
                owner: 'partner',
                ownerName: partnerName,
                targetPot: 'workplace_pension',
                grossAmount: partTotalWorkplaceMo * 12,
                monthlyAmount: partTotalWorkplaceMo,
                frequency: 'regular_monthly',
                dateSortKey: `${currentYear}-01-01`,
                dateDisplay: `Ongoing (${currentYear}–${endYr + 1})`,
                year: currentYear,
                age: partnerCurrentAge,
                enabled: true,
                description: `Employee: £${Math.round(partEmpPensionMo).toLocaleString()}/mo | Employer match: £${Math.round(partEmprPensionMo).toLocaleString()}/mo`,
              });
            }
          }
        }
      }
    }

    // 3. Pot Transfers
    (profile.potTransfers || []).forEach((t) => {
      const isSrcPartner = t.owner === 'partner';
      const isDstPartner = t.destinationOwner === 'partner';
      const owner = isSrcPartner ? 'partner' : 'primary';
      const ownerName = isSrcPartner ? partnerName : primaryName;
      const dstOwner = isDstPartner ? 'partner' : 'primary';
      const dstOwnerName = isDstPartner ? partnerName : primaryName;
      const curAge = isSrcPartner ? partnerCurrentAge : primaryCurrentAge;

      let year: number;
      let dateSortKey: string;
      let dateDisplay: string;

      if (t.transferDate && t.transferDate.trim() !== '') {
        const parts = t.transferDate.split('-');
        year = parseInt(parts[0], 10) || currentYear;
        dateSortKey = t.transferDate;
        const dateObj = new Date(t.transferDate);
        dateDisplay = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : t.transferDate;
      } else if (t.transferAge !== undefined) {
        year = currentYear + Math.max(0, t.transferAge - curAge);
        dateSortKey = `${year}-04-06`;
        dateDisplay = `Tax Year ${year}/${(year + 1).toString().slice(2)} (Age ${t.transferAge})`;
      } else {
        year = currentYear + 2;
        dateSortKey = `${year}-04-06`;
        dateDisplay = `Tax Year ${year}/${(year + 1).toString().slice(2)}`;
      }

      if (year < currentYear) {
        return; // Exclude past transfers from accumulation schedule
      }

      let taxReliefEstimate: number | undefined = undefined;
      let transferDesc = t.description;

      const amt = t.amount || 0;
      if (t.destinationPot === 'sipp' && amt > 0) {
        taxReliefEstimate = amt * 0.25;
        const totalCredited = Math.round(amt * 1.25);
        const reliefAmt = Math.round(amt * 0.25);
        transferDesc = transferDesc
          ? `${transferDesc} (+25% Govt Tax Relief: +£${reliefAmt.toLocaleString()} → £${totalCredited.toLocaleString()} total into SIPP)`
          : `Net transfer: £${amt.toLocaleString()} (+25% Govt Tax Relief: +£${reliefAmt.toLocaleString()} → £${totalCredited.toLocaleString()} total into SIPP)`;
      } else if (t.destinationPot === 'lisa' && amt > 0) {
        const lisaBonus = Math.min(amt, 4000) * 0.25;
        if (lisaBonus > 0) {
          taxReliefEstimate = lisaBonus;
          const totalCredited = Math.round(amt + lisaBonus);
          transferDesc = transferDesc
            ? `${transferDesc} (+25% LISA Bonus: +£${Math.round(lisaBonus).toLocaleString()} → £${totalCredited.toLocaleString()} total into LISA)`
            : `Net transfer: £${amt.toLocaleString()} (+25% LISA Bonus: +£${Math.round(lisaBonus).toLocaleString()} → £${totalCredited.toLocaleString()} total into LISA)`;
        }
      }

      items.push({
        id: t.id,
        sourceType: 'pot_transfer',
        category: 'transfer',
        name: t.name || 'Pot Transfer',
        owner,
        ownerName,
        destinationOwner: dstOwner,
        destinationOwnerName: dstOwnerName,
        sourcePot: t.sourcePot,
        targetPot: t.destinationPot,
        grossAmount: amt,
        frequency: 'lump_sum',
        dateSortKey,
        dateDisplay,
        year,
        age: t.transferAge,
        enabled: t.enabled,
        description: transferDesc,
        taxReliefEstimate,
        originalRef: t,
      });
    });

    // 4. DB Pension Tax-Free Lump Sum Payouts
    (profile.dbPensions || []).forEach((db) => {
      if (db.taxFreeLumpSum && db.taxFreeLumpSum > 0) {
        const isPartnerOwner = db.owner === 'partner';
        const owner = isPartnerOwner ? 'partner' : 'primary';
        const ownerName = isPartnerOwner ? partnerName : primaryName;
        const curAge = isPartnerOwner ? partnerCurrentAge : primaryCurrentAge;
        const startAge = db.startAge || 60;
        const year = currentYear + Math.max(0, startAge - curAge);

        items.push({
          id: `db_lump_${db.id}`,
          sourceType: 'db_lump_sum',
          category: 'contribution',
          name: `${db.name} (Tax-Free Lump Sum Payout)`,
          owner,
          ownerName,
          targetPot: db.targetPot || 'cash_savings',
          grossAmount: db.taxFreeLumpSum,
          frequency: 'one_off',
          dateSortKey: `${year}-04-06`,
          dateDisplay: `Age ${startAge} (${year})`,
          year,
          age: startAge,
          enabled: db.enabled,
          description: `DB pension commencement lump sum paid directly into ${getPotName(db.targetPot || 'cash_savings')}`,
          originalRef: db,
        });
      }
    });

    return items;
  }, [
    profile,
    pots,
    isCouple,
    primaryName,
    partnerName,
    currentYear,
    primaryCurrentAge,
    primaryRetireAge,
    partnerCurrentAge,
    partnerRetireAge,
    expandMode,
  ]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    return ledgerItems
      .filter((item) => {
        if (!showDisabled && !item.enabled) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (ownerFilter !== 'all' && item.owner !== ownerFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesDesc = (item.description || '').toLowerCase().includes(q);
          const matchesPot = getPotName(item.targetPot).toLowerCase().includes(q) || (item.sourcePot ? getPotName(item.sourcePot).toLowerCase().includes(q) : false);
          if (!matchesName && !matchesDesc && !matchesPot) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.dateSortKey || '';
        const dateB = b.dateSortKey || '';
        const comp = dateA.localeCompare(dateB);
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [ledgerItems, categoryFilter, ownerFilter, searchQuery, sortOrder, showDisabled]);

  // Reset page on filter/expand changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, ownerFilter, searchQuery, sortOrder, showDisabled, expandMode]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage, ITEMS_PER_PAGE]);

  // Aggregate stats
  const stats = useMemo(() => {
    let activeOneOffTotal = 0;
    let activeMonthlyTotal = 0;
    let activeTransfersTotal = 0;

    const seenMonthlyStreams = new Set<string>();

    ledgerItems.forEach((item) => {
      if (!item.enabled) return;
      if (item.category === 'transfer') {
        activeTransfersTotal += item.grossAmount;
      } else if (item.frequency === 'regular_monthly' && item.monthlyAmount) {
        const streamKey = item.originalRef ? item.originalRef.id : item.id.split('_yr_')[0].split('_year_')[0].split('_m_')[0];
        if (!seenMonthlyStreams.has(streamKey)) {
          seenMonthlyStreams.add(streamKey);
          activeMonthlyTotal += item.monthlyAmount;
        }
      } else {
        activeOneOffTotal += item.grossAmount;
      }
    });

    return {
      activeOneOffTotal,
      activeMonthlyTotal,
      activeTransfersTotal,
      totalEvents: ledgerItems.filter((i) => i.enabled).length,
    };
  }, [ledgerItems]);

  // Handle toggling enabled state for items
  const handleToggleItem = (item: LedgerItem) => {
    if (!onChange) return;

    if (item.sourceType === 'one_off_contrib' || item.sourceType === 'regular_contrib') {
      const origId = item.originalRef ? item.originalRef.id : item.id.split('_year_')[0].split('_m_')[0];
      const updated = (profile.oneOffContributions || []).map((c) =>
        c.id === origId ? { ...c, enabled: !c.enabled } : c
      );
      onChange({ ...profile, oneOffContributions: updated });
    } else if (item.sourceType === 'pot_transfer') {
      const origId = item.originalRef ? item.originalRef.id : item.id;
      const updated = (profile.potTransfers || []).map((t) =>
        t.id === origId ? { ...t, enabled: !t.enabled } : t
      );
      onChange({ ...profile, potTransfers: updated });
    } else if (item.sourceType === 'db_lump_sum') {
      const dbId = item.id.replace('db_lump_', '');
      const updated = (profile.dbPensions || []).map((db) =>
        db.id === dbId ? { ...db, enabled: !db.enabled } : db
      );
      onChange({ ...profile, dbPensions: updated });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 rounded-xl text-primary-600 dark:text-primary-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Accumulation Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chronological log of all ongoing contributions, one-off lump sums, DB pension lump sums, and pot transfers.
          </p>
        </div>

        {/* View Mode Segmented Control & Quick Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="grid grid-cols-3 sm:flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto">
            <button
              onClick={() => setExpandMode('grouped')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                expandMode === 'grouped'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Group into multi-year range summaries"
            >
              Grouped
            </button>
            <button
              onClick={() => setExpandMode('annual')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                expandMode === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Expand into annual tax year line items"
            >
              Annual Items
            </button>
            <button
              onClick={() => setExpandMode('monthly')}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                expandMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Expand into individual monthly line items"
            >
              Monthly Items
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex-1 sm:flex-initial"
              title="Toggle Date Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span>{sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}</span>
            </button>

            <button
              onClick={() => setShowDisabled((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex-1 sm:flex-initial ${
                showDisabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40'
              }`}
            >
              {showDisabled ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
              <span>{showDisabled ? 'Showing Inactive' : 'Active Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-primary-50/50 dark:bg-primary-950/20 p-3.5 rounded-xl border border-primary-100 dark:border-primary-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400">
            Total Monthly Rate
          </div>
          <div className="text-lg font-black text-primary-950 dark:text-primary-100 mt-0.5">
            £{Math.round(stats.activeMonthlyTotal).toLocaleString()}
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">/mo</span>
          </div>
          <div className="text-[10px] text-primary-600/80 dark:text-primary-400/70 mt-0.5">
            £{Math.round(stats.activeMonthlyTotal * 12).toLocaleString()}/yr regular
          </div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            One-Off Contributions
          </div>
          <div className="text-lg font-black text-blue-950 dark:text-blue-100 mt-0.5">
            £{Math.round(stats.activeOneOffTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400/70 mt-0.5">
            Lump sums & DB payouts
          </div>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Pot Transfers Planned
          </div>
          <div className="text-lg font-black text-purple-950 dark:text-purple-100 mt-0.5">
            £{Math.round(stats.activeTransfersTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/70 mt-0.5">
            Reallocations between pots
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Ledger Events
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            {stats.totalEvents} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            In accumulation schedule
          </div>
        </div>
      </div>

      {/* Pension Annual Allowance Review Box */}
      <div className="p-3.5 sm:p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-800/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b sm:border-b-0 border-purple-200/40 dark:border-purple-800/40">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="font-extrabold text-xs text-purple-950 dark:text-purple-100 uppercase tracking-wider">
              Pension Annual Allowance Review (2025/26)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
            HMRC Limit: 100% earnings (max £60k, min £3.6k)
          </span>
        </div>

        <div className={`grid grid-cols-1 ${isCouple ? 'md:grid-cols-2' : ''} gap-3`}>
          {/* Primary Allowance */}
          {primaryTaxResult && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>{primaryName}'s Pension Allowance</span>
                <span className="text-purple-700 dark:text-purple-300 font-extrabold text-[11px] bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60 self-start sm:self-auto">
                  Actual: £{Math.round(primaryTaxResult.actualPensionAllowance).toLocaleString()}/yr
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-2 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg text-[10px]">
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Actual Allowance</span>
                  <span className="font-extrabold text-purple-900 dark:text-purple-200 text-[11px] sm:text-xs">
                    £{Math.round(primaryTaxResult.actualPensionAllowance).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Statutory Cap</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    £{primaryTaxResult.pensionAnnualAllowanceLimit.toLocaleString()}
                    {primaryTaxResult.pensionAnnualAllowanceLimit < 60000 && <span className="text-amber-600 dark:text-amber-400 text-[9px] ml-0.5 block sm:inline">(Tapered)</span>}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Relevant Earnings</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    £{Math.round(primaryTaxResult.eligibleEarnings).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    primaryTaxResult.exceedsEligibleIncome
                      ? 'bg-amber-500'
                      : primaryTaxResult.exceedsAnnualAllowanceOnly
                      ? 'bg-amber-500'
                      : 'bg-purple-600 dark:bg-purple-400'
                  }`}
                  style={{ width: `${Math.min(100, primaryTaxResult.actualPensionAllowance > 0 ? (primaryTaxResult.pensionAnnualAllowanceUsed / primaryTaxResult.actualPensionAllowance) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>
                  Used: £{Math.round(primaryTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}
                  {' • '}
                  {primaryTaxResult.exceedsEligibleIncome
                    ? 'Exceeds Relevant Earnings'
                    : primaryTaxResult.exceedsAnnualAllowanceOnly
                    ? 'Exceeds Statutory Cap'
                    : `Remaining Actual: £${Math.round(primaryTaxResult.actualPensionAllowanceRemaining).toLocaleString()}`}
                </span>
                {primaryTaxResult.pensionBasicRateTaxRelief > 0 && (
                  <span className="text-primary-600 dark:text-primary-400 font-bold">
                    Basic Tax Relief: +£{Math.round(primaryTaxResult.pensionBasicRateTaxRelief).toLocaleString()}/yr
                  </span>
                )}
              </div>

              {/* Warning: Exceeds Eligible Income */}
              {primaryTaxResult.exceedsEligibleIncome && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800/80 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Review Required: Contributions Exceed Actual Allowance (Relevant Earnings)</span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Annual pension contributions (£{Math.round(primaryTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}) exceed your Actual Allowance based on eligible UK earnings (£{Math.round(primaryTaxResult.actualPensionAllowance).toLocaleString()}). HMRC tax relief on personal pension contributions is capped at 100% of your relevant UK earnings (or £3,600 if higher). Please review your contributions as excess amounts will not qualify for tax relief.
                  </p>
                </div>
              )}

              {/* Warning: Exceeds Annual Allowance but under Eligible Income (Carry Forward Warning) */}
              {primaryTaxResult.exceedsAnnualAllowanceOnly && (
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800/80 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Annual Allowance Limit Exceeded — Carry Forward Notice</span>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                    Annual pension contributions (£{Math.round(primaryTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}) exceed the statutory annual allowance limit of £{Math.round(primaryTaxResult.pensionAnnualAllowanceLimit).toLocaleString()}, but are within your eligible UK earnings (£{Math.round(primaryTaxResult.eligibleEarnings).toLocaleString()}). You can utilize Carry Forward of unused pension allowances from the 3 previous tax years (2022/23, 2023/24, 2024/25) to avoid an Annual Allowance tax charge.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Partner Allowance */}
          {isCouple && partnerTaxResult && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>{partnerName}'s Pension Allowance</span>
                <span className="text-purple-700 dark:text-purple-300 font-extrabold text-[11px] bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60 self-start sm:self-auto">
                  Actual: £{Math.round(partnerTaxResult.actualPensionAllowance).toLocaleString()}/yr
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-2 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg text-[10px]">
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Actual Allowance</span>
                  <span className="font-extrabold text-purple-900 dark:text-purple-200 text-[11px] sm:text-xs">
                    £{Math.round(partnerTaxResult.actualPensionAllowance).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Statutory Cap</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    £{partnerTaxResult.pensionAnnualAllowanceLimit.toLocaleString()}
                    {partnerTaxResult.pensionAnnualAllowanceLimit < 60000 && <span className="text-amber-600 dark:text-amber-400 text-[9px] ml-0.5 block sm:inline">(Tapered)</span>}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium truncate">Relevant Earnings</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    £{Math.round(partnerTaxResult.eligibleEarnings).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    partnerTaxResult.exceedsEligibleIncome
                      ? 'bg-amber-500'
                      : partnerTaxResult.exceedsAnnualAllowanceOnly
                      ? 'bg-amber-500'
                      : 'bg-purple-600 dark:bg-purple-400'
                  }`}
                  style={{ width: `${Math.min(100, partnerTaxResult.actualPensionAllowance > 0 ? (partnerTaxResult.pensionAnnualAllowanceUsed / partnerTaxResult.actualPensionAllowance) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>
                  Used: £{Math.round(partnerTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}
                  {' • '}
                  {partnerTaxResult.exceedsEligibleIncome
                    ? 'Exceeds Relevant Earnings'
                    : partnerTaxResult.exceedsAnnualAllowanceOnly
                    ? 'Exceeds Statutory Cap'
                    : `Remaining Actual: £${Math.round(partnerTaxResult.actualPensionAllowanceRemaining).toLocaleString()}`}
                </span>
                {partnerTaxResult.pensionBasicRateTaxRelief > 0 && (
                  <span className="text-primary-600 dark:text-primary-400 font-bold">
                    Basic Tax Relief: +£{Math.round(partnerTaxResult.pensionBasicRateTaxRelief).toLocaleString()}/yr
                  </span>
                )}
              </div>

              {/* Partner Warning: Exceeds Eligible Income */}
              {partnerTaxResult.exceedsEligibleIncome && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800/80 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Review Required: Partner Contributions Exceed Actual Allowance (Relevant Earnings)</span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Partner annual pension contributions (£{Math.round(partnerTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}) exceed Actual Allowance based on eligible UK earnings (£{Math.round(partnerTaxResult.actualPensionAllowance).toLocaleString()}). HMRC tax relief on personal pension contributions is capped at 100% of relevant earnings (or £3,600 if higher). Please review partner contributions as excess amounts will not qualify for tax relief.
                  </p>
                </div>
              )}

              {/* Partner Warning: Exceeds Annual Allowance but under Eligible Income (Carry Forward Warning) */}
              {partnerTaxResult.exceedsAnnualAllowanceOnly && (
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800/80 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Partner Annual Allowance Limit Exceeded — Carry Forward Notice</span>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                    Partner annual pension contributions (£{Math.round(partnerTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}) exceed the statutory annual allowance limit of £{Math.round(partnerTaxResult.pensionAnnualAllowanceLimit).toLocaleString()}, but are within eligible UK earnings (£{Math.round(partnerTaxResult.eligibleEarnings).toLocaleString()}). Carry Forward of unused pension allowances from the 3 previous tax years (2022/23, 2023/24, 2024/25) can be utilized to avoid an Annual Allowance tax charge.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
        {/* Category Tabs */}
        <div className="grid grid-cols-3 sm:flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
              categoryFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({ledgerItems.length})
          </button>
          <button
            onClick={() => setCategoryFilter('contribution')}
            className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
              categoryFilter === 'contribution'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Contribs ({ledgerItems.filter((i) => i.category === 'contribution').length})
          </button>
          <button
            onClick={() => setCategoryFilter('transfer')}
            className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
              categoryFilter === 'transfer'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Transfers ({ledgerItems.filter((i) => i.category === 'transfer').length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Owner Filter (If Couple) */}
          {isCouple && (
            <div className="grid grid-cols-3 sm:flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs w-full sm:w-auto">
              <button
                onClick={() => setOwnerFilter('all')}
                className={`px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                  ownerFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setOwnerFilter('primary')}
                className={`px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                  ownerFilter === 'primary'
                    ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {primaryName}
              </button>
              <button
                onClick={() => setOwnerFilter('partner')}
                className={`px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer text-center truncate ${
                  ownerFilter === 'partner'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {partnerName}
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table / List */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No events in accumulation ledger matching filters.</p>
            <p className="text-xs text-slate-400">Add contributions or pot transfers in the section tabs above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedItems.map((item) => {
              const isTransfer = item.category === 'transfer';
              const isDbLump = item.sourceType === 'db_lump_sum';
              const isBase = item.sourceType === 'base_monthly_saving';
              const isOneOff = item.frequency === 'one_off' || item.frequency === 'lump_sum';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 ${
                    !item.enabled
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-60'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Date & Core Details */}
                  <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
                    {/* Date Badge */}
                    <div className="shrink-0 text-center bg-slate-100 dark:bg-slate-800/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 min-w-[72px] sm:min-w-[100px]">
                      <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.year ? `Year ${item.year}` : 'Date'}</span>
                      </div>
                      <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 leading-tight">
                        {item.dateDisplay}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-words">
                          {item.name}
                        </span>

                        {/* Owner Tag */}
                        {isCouple && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                              item.owner === 'partner'
                                ? 'bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                : 'bg-primary-100/70 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                            }`}
                          >
                            <User className="w-2.5 h-2.5 shrink-0" />
                            {item.ownerName}
                          </span>
                        )}

                        {/* Event Category Tag */}
                        {isTransfer ? (
                          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                            <ArrowRightLeft className="w-2.5 h-2.5 shrink-0" />
                            Pot Transfer
                          </span>
                        ) : isDbLump ? (
                          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40">
                            <Coins className="w-2.5 h-2.5 shrink-0" />
                            DB Lump Sum
                          </span>
                        ) : isOneOff ? (
                          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                            <PiggyBank className="w-2.5 h-2.5 shrink-0" />
                            One-off Lump Sum
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-primary-100/70 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/40">
                            <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                            Monthly Savings
                          </span>
                        )}
                      </div>

                      {/* Source -> Destination Pot Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {isTransfer && item.sourcePot ? (
                          <>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">From:</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border ${getPotBadgeColor(item.sourcePot)}`}>
                              {getPotName(item.sourcePot)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-purple-500 shrink-0" />
                            <span className="text-slate-500 dark:text-slate-400 font-medium">To:</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border ${getPotBadgeColor(item.targetPot)}`}>
                              {getPotName(item.targetPot)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Target Pot:</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold border ${getPotBadgeColor(item.targetPot)}`}>
                              {getPotName(item.targetPot)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Description / Tax Relief Note */}
                      {(item.description || item.taxReliefEstimate) && (
                        <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.description && <span className="leading-tight">{item.description}</span>}
                          {item.taxReliefEstimate && item.taxReliefEstimate > 0 && (
                            <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold">
                              <Sparkles className="w-3 h-3 text-primary-500 shrink-0" />
                              +£{Math.round(item.taxReliefEstimate).toLocaleString()}{expandMode === 'monthly' ? '/mo' : '/yr'} Govt Tax Relief
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Action Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800 w-full md:w-auto">
                    {/* Amount Display */}
                    <div className="text-left md:text-right">
                      {expandMode === 'monthly' && !isTransfer && !isOneOff ? (
                        <div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100">
                            £{Math.round(item.grossAmount).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Monthly Payment
                          </div>
                        </div>
                      ) : item.monthlyAmount ? (
                        <div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100">
                            £{Math.round(item.monthlyAmount).toLocaleString()}
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/mo</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            (£{Math.round(item.grossAmount).toLocaleString()}/yr)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-base font-black text-slate-900 dark:text-slate-100">
                            £{Math.round(item.grossAmount).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isTransfer ? 'Transfer Amount' : 'Gross Lump Sum'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enable/Disable Toggle for non-base items */}
                    {!isBase && onChange ? (
                      <button
                        onClick={() => handleToggleItem(item)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          item.enabled
                            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 text-primary-600 hover:bg-primary-100'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={item.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {item.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="p-2 text-primary-500 opacity-60" title="Core plan baseline contribution">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-center sm:text-left">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary-600 shrink-0" />
          <span>
            Events are automatically processed in chronological order during retirement projection calculations.
          </span>
        </div>
        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
          {filteredItems.length} of {ledgerItems.length} items shown
        </span>
      </div>
    </div>
  );
};
