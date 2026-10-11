import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HistoricModelingCard } from '../HistoricModelingCard';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('HistoricModelingCard', () => {
  const mockProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    currentAge: 55,
    targetRetirementAge: 60,
    lifeExpectancyAge: 85,
    targetRetirementIncomeAnnual: 30000,
  };

  const mockPots: InvestmentPots = {
    ...DEFAULT_POTS,
    cashSavingsBalance: 40000,
    stocksAndSharesIsaBalance: 150000,
    cashIsaBalance: 20000,
    sippBalance: 400000,
    workplacePensionBalance: 100000,
  };

  const mockTaxResult = calculateUKTax(mockProfile, mockPots);

  it('renders card title, KPI summary cards (success rate, worst, best start year)', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Historic Market Data Modeling/i)).toBeInTheDocument();
    expect(screen.getByText('1950 – 2024')).toBeInTheDocument();
    expect(screen.getByText('Worst Start Year')).toBeInTheDocument();
    expect(screen.getByText('Best Start Year')).toBeInTheDocument();
    expect(screen.getByText('Historic Success Rate')).toBeInTheDocument();
  });

  it('allows toggling between Real (Today\'s £) and Nominal (Future £)', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    const nominalBtn = screen.getByRole('button', { name: "Future £ (Nominal)" });
    fireEvent.click(nominalBtn);
    expect(nominalBtn.className).toContain('font-bold');

    const realBtn = screen.getByRole('button', { name: "Today's £ (Real)" });
    fireEvent.click(realBtn);
    expect(realBtn.className).toContain('font-bold');
  });

  it('handles changing success threshold presets', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    const preserve100kBtn = screen.getByRole('button', { name: 'Preserve £100k' });
    fireEvent.click(preserve100kBtn);
    expect(preserve100kBtn.className).toContain('bg-amber-500');

    const preserve50kBtn = screen.getByRole('button', { name: 'Preserve £50k' });
    fireEvent.click(preserve50kBtn);
    expect(preserve50kBtn.className).toContain('bg-amber-500');

    const dieWithZeroBtn = screen.getByRole('button', { name: 'Die With Zero (>£0)' });
    fireEvent.click(dieWithZeroBtn);
    expect(dieWithZeroBtn.className).toContain('bg-amber-500');
  });

  it('allows adjusting asset allocation sliders', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    const sliders = screen.getAllByRole('slider');
    // Equity slider is first slider
    fireEvent.change(sliders[0], { target: { value: '60' } });
    expect(screen.getAllByText(/60%/).length).toBeGreaterThan(0);
  });

  it('switches between tabs: trajectories, matrix, table, market data', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    // Default tab is sequences_chart with subview toggle
    const barBtn = screen.getByRole('button', { name: 'Ending Wealth Bar Plot' });
    fireEvent.click(barBtn);
    expect(barBtn.className).toContain('font-bold');

    // Switch to Trajectories tab
    const trajBtn = screen.getByRole('button', { name: /Historical Trajectories Chart/i });
    fireEvent.click(trajBtn);
    expect(screen.getByText(/Showing Median \(50th\), 90th Best, 10th Worst paths/i)).toBeInTheDocument();

    // Switch to Matrix Heatmap tab
    const matrixBtn = screen.getByRole('button', { name: /75 Start Years Matrix/i });
    fireEvent.click(matrixBtn);
    expect(screen.getByText(/Click any of the 75 historical start year tiles/i)).toBeInTheDocument();

    // Switch to Table tab
    const tableBtn = screen.getByRole('button', { name: /Start Year Breakdown Table/i });
    fireEvent.click(tableBtn);
    expect(screen.getByPlaceholderText(/Search year or event/i)).toBeInTheDocument();

    // Search table
    const searchInput = screen.getByPlaceholderText(/Search year or event/i);
    fireEvent.change(searchInput, { target: { value: '1973' } });
    expect(screen.getAllByText('1973').length).toBeGreaterThan(0);

    // Switch to Market Dataset tab
    const dataBtn = screen.getByRole('button', { name: /75-Year Market Dataset/i });
    fireEvent.click(dataBtn);
    expect(screen.getByText(/Stored UK & Global Market Dataset/i)).toBeInTheDocument();
  });

  it('clicks Crisis Year shortcut buttons to focus a specific historical sequence', () => {
    render(
      <HistoricModelingCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        onChange={vi.fn()}
      />
    );

    const dotComBtn = screen.getByRole('button', { name: "'00 Dot-Com" });
    fireEvent.click(dotComBtn);
    expect(dotComBtn.className).toContain('bg-pink-500');

    const oilShockBtn = screen.getByRole('button', { name: "'73 Oil Shock" });
    fireEvent.click(oilShockBtn);
    expect(oilShockBtn.className).toContain('bg-pink-500');
  });
});
