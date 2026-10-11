import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SummaryCommentsCard } from '../SummaryCommentsCard';
import { UserProfile, TaxCalculationResult } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('SummaryCommentsCard', () => {
  const baseTaxResult: TaxCalculationResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);

  it('renders standard regulatory notes without early retirement or recycling warnings', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
      isCouplePlanning: false,
    };

    render(<SummaryCommentsCard profile={profile} taxResult={baseTaxResult} />);

    expect(screen.getByText('Comments & Regulatory Guidance Notes')).toBeInTheDocument();
    expect(screen.getByText('HMRC Compliance')).toBeInTheDocument();
    expect(screen.getByText('1. Early Retirement Access Notice (NMPA Rules)')).toBeInTheDocument();
    expect(screen.getByText('2. HMRC PCLS Recycling Warning (Schedule 29 Rule)')).toBeInTheDocument();
    expect(screen.getByText('3. Estate Tax Guidance: ISAs vs Pension Inheritance')).toBeInTheDocument();
    expect(screen.getByText('4. Lump Sum Allowance Cap (£268,275) & State Pension')).toBeInTheDocument();

    expect(screen.queryByText(/requires ISA\/Cash bridge funding/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Active Risk')).not.toBeInTheDocument();
  });

  it('renders bridge funding warnings when retirement age precedes NMPA access age for primary and partner', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 52,
      isCouplePlanning: true,
      partnerTargetRetirementAge: 54,
    };

    render(<SummaryCommentsCard profile={profile} taxResult={baseTaxResult} />);

    expect(screen.getByText(/Primary: Target retirement at age 52 requires ISA\/Cash bridge funding/i)).toBeInTheDocument();
    expect(screen.getByText(/Partner: Target retirement at age 54 requires ISA\/Cash bridge funding/i)).toBeInTheDocument();
  });

  it('renders active risk badge and PCLS recycling details when recycling risk is detected', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 62,
    };

    const taxResultWithRecycling: TaxCalculationResult = {
      ...baseTaxResult,
      isPclsRecyclingRisk: true,
      pclsRecyclingDetails: {
        pclsAmount: 60000,
        annualContributions: 25000,
        threshold: 18000,
        recyclingReason: 'Contributions significantly increased above 30% threshold',
      },
    };

    render(<SummaryCommentsCard profile={profile} taxResult={taxResultWithRecycling} />);

    expect(screen.getByText('Active Risk')).toBeInTheDocument();
    expect(screen.getByText('• PCLS Lump Sum: £60,000')).toBeInTheDocument();
    expect(screen.getByText('• Re-contributed Pension Amount: £25,000')).toBeInTheDocument();
    expect(screen.getByText('• HMRC 30% Recycling Threshold: £18,000')).toBeInTheDocument();
  });
});
