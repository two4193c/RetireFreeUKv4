import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiTaxAdvisorModal } from '../AiTaxAdvisorModal';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { TaxCalculationResult, YearProjection, UserProfile } from '../../types';

import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('AiTaxAdvisorModal', () => {
  const mockTaxResult: TaxCalculationResult = {
    ...calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
    marginalTaxRate: 40,
    totalPensionTaxRelief: 1200,
  };

  const mockProjections: YearProjection[] = [
    {
      age: 60,
      year: 2028,
      isRetired: true,
      totalPot: 500000,
      totalWithdrawalAmount: 20000,
    } as any,
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders modal with initial state, title, and generate button', () => {
    const onClose = vi.fn();
    render(
      <AiTaxAdvisorModal
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={mockProjections}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Gemini AI UK Tax Advisor')).toBeInTheDocument();
    expect(screen.getByText(/Ready to review your UK tax efficiency/i)).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /Generate AI Tax Efficiency Audit/i });
    expect(generateBtn).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByLabelText('Close AI advisor');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows toggling API key settings and saves key to localStorage', () => {
    render(
      <AiTaxAdvisorModal
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={mockProjections}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Optional: Set Custom Gemini API Key/i });
    fireEvent.click(toggleBtn);

    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: 'custom-key-123' } });

    expect(localStorage.getItem('user_gemini_api_key')).toBe('custom-key-123');
  });

  it('generates deterministic tax audit when backend endpoint is unavailable', async () => {
    // Mock fetch rejection to trigger deterministic fallback
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    render(
      <AiTaxAdvisorModal
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={mockProjections}
        onClose={vi.fn()}
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate AI Tax Efficiency Audit/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tax Efficiency Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Key Tax Opportunities/i)).toBeInTheDocument();
      expect(screen.getByText(/Pension vs ISA Allocation Strategy/i)).toBeInTheDocument();
    });

    // Verify Re-run button is present
    const rerunBtn = screen.getByRole('button', { name: /Re-run AI Tax Efficiency Audit/i });
    expect(rerunBtn).toBeInTheDocument();
  });

  it('highlights 60% tax trap and couple planning advice in audit results', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const trapTaxResult: TaxCalculationResult = {
      ...mockTaxResult,
      is60PercentTaxTrap: true,
      taxTrapAmountInBracket: 15000,
      recommendedTaxTrapPensionContribution: 15000,
      marginalTaxRate: 60,
    };

    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Sarah',
    };

    render(
      <AiTaxAdvisorModal
        profile={coupleProfile}
        pots={DEFAULT_POTS}
        taxResult={trapTaxResult}
        projections={mockProjections}
        onClose={vi.fn()}
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate AI Tax Efficiency Audit/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/60% Tax Trap Advice/i)).toBeInTheDocument();
      expect(screen.getByText(/Reclaim 60% tax trap/i)).toBeInTheDocument();
      expect(screen.getByText(/dual tax-free Personal Allowances/i)).toBeInTheDocument();
    });
  });

  it('displays response from remote API when fetch succeeds', async () => {
    const mockApiResponse = {
      taxEfficiencyScore: 92,
      summary: 'AI Evaluated: Outstanding tax allocation structure.',
      keyOpportunities: ['Max out workplace match', 'Use ISA bridge before SIPP'],
      taxTrapAdvice: 'Safe from 60% trap.',
      pensionVsIsaRecommendation: 'Higher rate tax payer should prioritize pensions.',
      drawdownStrategyTips: 'Take 25% tax free cash via phased drawdown.',
      nextSteps: ['Increase salary sacrifice by 3%'],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as any)
    );

    render(
      <AiTaxAdvisorModal
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={mockProjections}
        onClose={vi.fn()}
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate AI Tax Efficiency Audit/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('92')).toBeInTheDocument();
      expect(screen.getByText(/AI Evaluated: Outstanding tax allocation structure/i)).toBeInTheDocument();
      expect(screen.getByText('Max out workplace match')).toBeInTheDocument();
    });
  });
});
