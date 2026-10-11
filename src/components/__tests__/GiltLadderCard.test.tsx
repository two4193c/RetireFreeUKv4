import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GiltLadderCard } from '../GiltLadderCard';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('GiltLadderCard', () => {
  it('renders disabled state and allows enabling the gilt ladder strategy', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      giltLadderConfig: {
        enabled: false,
        owner: 'primary',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 25000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
    };

    render(
      <GiltLadderCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('UK Gilt Ladder Strategy')).toBeInTheDocument();
    expect(screen.getByText('0% CGT Arbitrage')).toBeInTheDocument();
    expect(screen.getByText(/Primary Off/i)).toBeInTheDocument();

    // Toggle on
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giltLadderConfig: expect.objectContaining({
          enabled: true,
          owner: 'primary',
        }),
      })
    );
  });

  it('renders configuration inputs and allows modifying duration, target income, funding source and strategy mode', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 30000,
      giltLadderConfig: {
        enabled: true,
        owner: 'primary',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 30000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
    };

    render(
      <GiltLadderCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Primary Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Purchase Age/i)).toBeInTheDocument();
    expect(screen.getByText(/Duration/i)).toBeInTheDocument();

    // Change duration select
    const durationSelect = document.getElementById('gilt_ladder_duration_years_primary') as HTMLSelectElement;
    fireEvent.change(durationSelect, { target: { value: '7' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giltLadderConfig: expect.objectContaining({
          durationYears: 7,
        }),
      })
    );

    // Change target annual cashflow
    const targetIncomeInput = document.getElementById('gilt_ladder_target_income_primary') as HTMLInputElement;
    fireEvent.change(targetIncomeInput, { target: { value: '35000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giltLadderConfig: expect.objectContaining({
          targetAnnualIncome: 35000,
        }),
      })
    );

    // Change funding source
    const fundingSelect = document.getElementById('gilt_ladder_funding_source_primary') as HTMLSelectElement;
    fireEvent.change(fundingSelect, { target: { value: 'isa' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giltLadderConfig: expect.objectContaining({
          fundingSource: 'isa',
        }),
      })
    );

    // Switch strategy mode to custom_yield
    const strategySelect = document.getElementById('gilt_ladder_strategy_mode_primary') as HTMLSelectElement;
    fireEvent.change(strategySelect, { target: { value: 'custom_yield' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giltLadderConfig: expect.objectContaining({
          strategyMode: 'custom_yield',
        }),
      })
    );
  });

  it('renders key metric summary cards and toggles individual gilt rungs accordion table', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      giltLadderConfig: {
        enabled: true,
        owner: 'primary',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 20000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
    };

    render(
      <GiltLadderCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Highlights
    expect(screen.getByText(/Total Cashflow Delivered/i)).toBeInTheDocument();
    expect(screen.getByText(/0% CGT Capital Gain/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Annual Yield/i)).toBeInTheDocument();

    // Toggle individual gilt rungs table
    const accordionBtn = screen.getByRole('button', { name: /View .* Individual Gilt Rungs/i });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(accordionBtn);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('UK Gilt Bond')).toBeInTheDocument();
    expect(screen.getByText('Net Payout')).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(accordionBtn);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('supports couple planning dual-person ladders and mirror settings copy', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Morgan',
      partnerName: 'Taylor',
      currentAge: 55,
      partnerCurrentAge: 53,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
      giltLadderConfig: {
        enabled: true,
        owner: 'primary',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 25000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
      partnerGiltLadderConfig: {
        enabled: false,
        owner: 'partner',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 15000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
    };

    render(
      <GiltLadderCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Couple tabs
    const morganTab = document.getElementById('gilt_ladder_select_primary_tab') as HTMLButtonElement;
    const taylorTab = document.getElementById('gilt_ladder_select_partner_tab') as HTMLButtonElement;
    expect(morganTab).toBeInTheDocument();
    expect(taylorTab).toBeInTheDocument();

    // Couple overview banner
    expect(screen.getByText('Couple Gilt Portfolio Totals')).toBeInTheDocument();

    // Copy Morgan's settings to Taylor
    const copyBtn = screen.getByRole('button', { name: /Copy to Taylor/i });
    fireEvent.click(copyBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerGiltLadderConfig: expect.objectContaining({
          owner: 'partner',
          targetAnnualIncome: 25000,
          durationYears: 5,
        }),
      })
    );

    // Switch to Partner tab
    fireEvent.click(taylorTab);

    expect(screen.getByText(/Taylor Off/i)).toBeInTheDocument();
  });

  it('renders cleanly in Studio Mode', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      giltLadderConfig: {
        enabled: false,
        owner: 'primary',
        purchaseAge: 60,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 20000,
        fundingSource: 'gia',
        inflationAdjusted: true,
      },
    };

    render(
      <GiltLadderCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('UK Gilt Ladder Strategy')).toBeInTheDocument();
    // Badges like "0% CGT Arbitrage" should not be rendered in studio mode
    expect(screen.queryByText('0% CGT Arbitrage')).not.toBeInTheDocument();
  });
});
