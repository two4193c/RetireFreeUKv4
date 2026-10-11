import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SummaryModal, SummaryModalSubTab } from '../SummaryModal';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { TaxCalculationResult, YearProjection } from '../../types';

import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('SummaryModal', () => {
  const mockTaxResult: TaxCalculationResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);

  const mockProjections: YearProjection[] = [
    {
      age: 60,
      year: 2028,
      isRetired: true,
      totalPot: 500000,
      pensionPot: 350000,
      isaPot: 100000,
      cashGiaPot: 50000,
      netRetirementIncome: 25000,
      grossIncome: 28000,
      taxPaid: 3000,
      totalWithdrawalAmount: 25000,
      potDepleted: false,
    } as any,
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    profile: DEFAULT_PROFILE,
    pots: DEFAULT_POTS,
    projections: mockProjections,
    taxResult: mockTaxResult,
    onChange: vi.fn(),
    onOpenMaximizedSpendModal: vi.fn(),
  };

  it('returns null when isOpen is false', () => {
    const { container } = render(<SummaryModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders executive summary dashboard with tabs', () => {
    render(<SummaryModal {...defaultProps} initialSubTab="all" />);

    expect(screen.getByText('Executive Summary Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Studio Pop-Out')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Full Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plan Insights/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strategy Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Projections Chart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stress Testing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /IHT Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guidance Notes/i })).toBeInTheDocument();
  });

  it('switches between different sub-tabs', () => {
    render(<SummaryModal {...defaultProps} initialSubTab="insights" />);

    // Switch to Strategy Dashboard
    const stratTabBtn = screen.getByRole('button', { name: /Strategy Dashboard/i });
    fireEvent.click(stratTabBtn);

    // Switch to Projections Chart
    const chartTabBtn = screen.getByRole('button', { name: /Projections Chart/i });
    fireEvent.click(chartTabBtn);

    // Switch to Stress Testing
    const stressTabBtn = screen.getByRole('button', { name: /Stress Testing/i });
    fireEvent.click(stressTabBtn);

    // Switch to IHT Summary
    const ihtTabBtn = screen.getByRole('button', { name: /IHT Summary/i });
    fireEvent.click(ihtTabBtn);

    // Switch to Guidance Notes
    const notesTabBtn = screen.getByRole('button', { name: /Guidance Notes/i });
    fireEvent.click(notesTabBtn);
    expect(screen.getByText(/Comments & Regulatory Guidance Notes/i)).toBeInTheDocument();
  });

  it('handles closing via header button, footer button, Escape key, and backdrop click', () => {
    const onClose = vi.fn();
    render(<SummaryModal {...defaultProps} onClose={onClose} />);

    // Header close button
    const closeBtns = screen.getAllByRole('button', { name: /Close/i });
    fireEvent.click(closeBtns[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Footer close button
    fireEvent.click(closeBtns[1]);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);

    // Backdrop click
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(4);
  });
});
