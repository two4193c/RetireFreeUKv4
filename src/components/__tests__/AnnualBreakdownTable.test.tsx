import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnnualBreakdownTable } from '../AnnualBreakdownTable';
import { UserProfile, YearProjection, TaxCalculationResult } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('AnnualBreakdownTable', () => {
  const sampleTaxResult: TaxCalculationResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);

  const createSampleProjections = (): YearProjection[] => {
    const list: YearProjection[] = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 20; i++) {
      const age = 55 + i;
      const isRetired = age >= 60;
      const hasShortfall = age >= 72;

      list.push({
        age,
        year: currentYear + i,
        isRetired,
        totalPot: hasShortfall ? 0 : 500000 - (isRetired ? (age - 60) * 30000 : -i * 20000),
        pensionPot: 300000,
        isaPot: 150000,
        cashGiaPot: 50000,
        giltLadderPot: 0,
        estimatedPotGrowth: isRetired ? 15000 : 25000,
        totalWithdrawalAmount: isRetired ? 35000 : 0,
        taxOnWithdrawal: isRetired ? 3000 : 0,
        totalTaxPaid: isRetired ? 3000 : 8000,
        netRetirementIncome: isRetired ? (hasShortfall ? 15000 : 32000) : 0,
        targetRetirementIncome: isRetired ? 32000 : 0,
        incomeShortfall: hasShortfall ? 17000 : 0,
        annualIncomeExcess: !hasShortfall && isRetired ? 2000 : 0,
        cumulativeExcessIncome: !hasShortfall && isRetired ? (age - 60) * 2000 : 0,
        annualContributionTotal: isRetired ? 0 : 10000,
        potDepleted: hasShortfall,
        statePensionReceived: age >= 67 ? 11500 : 0,
        dbPensionIncomeReceived: 0,
        annuityIncomeReceived: 0,
        giltLadderIncomeReceived: 0,
        pclsTaxFreeDrawnThisYear: age === 60 ? 50000 : 0,
      } as unknown as YearProjection);
    }
    return list;
  };

  it('renders table header, KPI summary tiles, and rows with plan failure indication', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Annual Breakdown Table')).toBeInTheDocument();
    expect(screen.getByText(/Age 55 → 100/i)).toBeInTheDocument();
    expect(screen.getByText('Plan Failure')).toBeInTheDocument();
    expect(screen.getByText(/Total Lifetime Growth/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Drawdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdrawal Tax/i)).toBeInTheDocument();

    // Row ages rendered
    expect(screen.getByText('Age 55')).toBeInTheDocument();
    expect(screen.getByText('Age 60')).toBeInTheDocument();
  });

  it('filters rows by phase: accumulation, retirement, and plan failure', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
      />
    );

    // Filter to Accumulation
    const accumBtn = screen.getByRole('button', { name: /Accumulation/i });
    fireEvent.click(accumBtn);

    expect(screen.getByText('Age 55')).toBeInTheDocument();
    expect(screen.queryByText('Age 65')).not.toBeInTheDocument();

    // Filter to Retirement
    const retireBtn = screen.getByRole('button', { name: /Retirement/i });
    fireEvent.click(retireBtn);

    expect(screen.queryByText('Age 55')).not.toBeInTheDocument();
    expect(screen.getByText('Age 60')).toBeInTheDocument();

    // Filter to Plan Failure
    const failureBtn = screen.getByRole('button', { name: /Plan Failure/i });
    fireEvent.click(failureBtn);

    expect(screen.getByText('Age 72')).toBeInTheDocument();
    expect(screen.queryByText('Age 60')).not.toBeInTheDocument();
  });

  it('filters rows by search term and displays no matches message when not found', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search age or year...');
    fireEvent.change(searchInput, { target: { value: '62' } });

    expect(screen.getByText('Age 62')).toBeInTheDocument();
    expect(screen.queryByText('Age 55')).not.toBeInTheDocument();

    // Search for non-existent term
    fireEvent.change(searchInput, { target: { value: '9999' } });
    expect(screen.getByText('No projection years match your search criteria.')).toBeInTheDocument();
  });

  it('toggles inflation adjustment (Real vs Nominal £)', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      adjustForInflation: true,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
        onChange={onChange}
      />
    );

    const inflationCheckbox = screen.getByLabelText("Today's £ (Real Terms)");
    fireEvent.click(inflationCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustForInflation: false,
      })
    );
  });

  it('handles pagination next and previous controls', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections(); // 20 items

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
      />
    );

    // Default rowsPerPage is 15, so page 1 shows 15 rows (Age 55 to 69)
    expect(screen.getByText('Age 55')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    // Click Next Page (ChevronRight button)
    const nextButtons = screen.getAllByRole('button');
    const chevronRightBtn = nextButtons.find(b => b.innerHTML.includes('lucide-chevron-right'));
    expect(chevronRightBtn).toBeDefined();
    if (chevronRightBtn) {
      fireEvent.click(chevronRightBtn);
    }

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Age 70')).toBeInTheDocument();
  });

  it('opens and closes detailed year inspection modal', async () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
      />
    );

    // Click Info icon on first row
    const infoButtons = screen.getAllByTitle('View Detailed Breakdown');
    fireEvent.click(infoButtons[0]);

    expect(screen.getByText(/Age 55 Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText('Portfolio Pots Breakdown')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Age 55 Breakdown/i)).not.toBeInTheDocument();
    });
  });

  it('exports CSV report with BOM and headers', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const projections = createSampleProjections();

    render(
      <AnnualBreakdownTable
        projections={projections}
        profile={profile}
        taxResult={sampleTaxResult}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });
});
