import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StrategySummaryCard } from '../StrategySummaryCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('StrategySummaryCard', () => {
  it('renders DC Pension PCLS and Defined Benefit scheme lump sum details clearly', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      dateOfBirth: '1975-05-10', // NMPA 57
      currentAge: 50,
      targetRetirementAge: 60,
      dbPensions: [
        {
          id: 'db1',
          name: 'NHS Final Salary',
          owner: 'primary' as const,
          startAge: 65,
          annualIncome: 12000,
          taxFreeLumpSum: 36000,
          targetPot: 'cash_savings' as const,
          inflationLinked: true,
          enabled: true,
        },
      ],
    };
    const pots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 200000,
      stocksAndSharesIsaBalance: 50000,
    };
    const taxResult = calculateUKTax(profile, pots);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={pots}
        taxResult={taxResult}
      />
    );

    // Verify DC Pension PCLS label is explicit
    expect(screen.getByText(/DC Pension PCLS \(SIPP \/ Workplace\):/i)).toBeInTheDocument();
    expect(screen.getByText(/DC Pension Access Age \(NMPA\):/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Age 57/i).length).toBeGreaterThan(0);

    // Verify Defined Benefit section is clearly rendered with its own start age 65
    expect(screen.getByText(/Defined Benefit \(DB\) Schemes & Lump Sums/i)).toBeInTheDocument();
    expect(screen.getByText(/NHS Final Salary/i)).toBeInTheDocument();
    expect(screen.getByText(/Starts Age 65/i)).toBeInTheDocument();
    expect(screen.getByText(/£36,000 at Age 65/i)).toBeInTheDocument();
    expect(screen.getByText(/Paid at Scheme Start Age \(Independent of DC Age 57\)/i)).toBeInTheDocument();
  });
});
