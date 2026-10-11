import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MacroSettingsCard } from '../MacroSettingsCard';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('MacroSettingsCard', () => {
  it('renders default macro rates and real return summary badges', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      expectedInflationRate: 2.5,
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Investment Returns & Macroeconomic Settings')).toBeInTheDocument();
    expect(screen.getByText(/Real Pre-Retire:/i)).toBeInTheDocument();
    expect(screen.getByText('+4.0%')).toBeInTheDocument(); // 6.5 - 2.5 = 4.0
    expect(screen.getByText(/Real Post-Retire:/i)).toBeInTheDocument();
    expect(screen.getByText('+2.0%')).toBeInTheDocument(); // 4.5 - 2.5 = 2.0
  });

  it('applies quick macroeconomic presets correctly', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      expectedInflationRate: 2.5,
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Click Conservative preset
    const conservativeBtn = screen.getByRole('button', { name: /Conservative/i });
    fireEvent.click(conservativeBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInvestmentReturn: 5.0,
        postRetirementReturn: 3.5,
        expectedInflationRate: 2.5,
      })
    );

    // Click Growth / Optimistic preset
    const growthBtn = screen.getByRole('button', { name: /Growth \/ Optimistic/i });
    fireEvent.click(growthBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInvestmentReturn: 8.0,
        postRetirementReturn: 5.5,
        expectedInflationRate: 2.0,
      })
    );

    // Click High Inflation Scenario preset
    const highInfBtn = screen.getByRole('button', { name: /High Inflation Scenario/i });
    fireEvent.click(highInfBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInvestmentReturn: 7.0,
        postRetirementReturn: 5.0,
        expectedInflationRate: 4.0,
      })
    );
  });

  it('updates pre-retirement return, post-retirement return, and inflation rates via number inputs and sliders', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      expectedInflationRate: 2.5,
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Change pre-retirement return
    const preInput = screen.getByLabelText(/Pre-Retirement Return/i);
    fireEvent.change(preInput, { target: { value: '7.5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInvestmentReturn: 7.5,
      })
    );

    // Blur clamping
    fireEvent.blur(preInput, { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInvestmentReturn: 25, // max clamped to 25
      })
    );

    // Change post-retirement return
    const postInput = screen.getByLabelText(/Post-Retirement Return/i);
    fireEvent.change(postInput, { target: { value: '5.2' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        postRetirementReturn: 5.2,
      })
    );

    // Change inflation rate
    const infInput = screen.getByLabelText(/Expected Annual Inflation/i);
    fireEvent.change(infInput, { target: { value: '3.0' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInflationRate: 3.0,
      })
    );
  });

  it('enables Asset Allocation Split and applies portfolio presets', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      assetAllocationSplit: {
        enabled: false,
        accumulation: { equity: 80, bond: 15, cash: 5 },
        decumulation: { equity: 50, bond: 35, cash: 15 },
        assetClassReturns: { equityReturn: 7.0, bondReturn: 3.5, cashReturn: 3.0 },
      },
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Enable AA Split via checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('configures asset class returns and per-pot granular asset allocations when enabled', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      assetAllocationSplit: {
        enabled: true,
        accumulation: { equity: 80, bond: 15, cash: 5 },
        decumulation: { equity: 50, bond: 35, cash: 15 },
        assetClassReturns: { equityReturn: 7.0, bondReturn: 3.5, cashReturn: 3.0 },
        perPotAllocationsEnabled: false,
      },
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Check AA presets are visible
    expect(screen.getByRole('button', { name: /Aggressive Accumulation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Classic 60\/40 Portfolio/i })).toBeInTheDocument();

    // Click 100% Equity preset
    fireEvent.click(screen.getByRole('button', { name: /Classic 60\/40 Portfolio/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          accumulation: { equity: 100, bond: 0, cash: 0 },
          decumulation: { equity: 60, bond: 30, cash: 10 },
        }),
      })
    );

    // Check equity return input
    const equityReturnInput = screen.getByDisplayValue('7');
    fireEvent.change(equityReturnInput, { target: { value: '8.0' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          assetClassReturns: expect.objectContaining({
            equityReturn: 8.0,
          }),
        }),
      })
    );

    // Enable per-pot granular allocations
    const perPotCheckbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(perPotCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          perPotAllocationsEnabled: true,
        }),
      })
    );
  });

  it('renders per-pot granular allocation pots and location presets when enabled', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      assetAllocationSplit: {
        enabled: true,
        accumulation: { equity: 80, bond: 15, cash: 5 },
        decumulation: { equity: 50, bond: 35, cash: 15 },
        assetClassReturns: { equityReturn: 7.0, bondReturn: 3.5, cashReturn: 3.0 },
        perPotAllocationsEnabled: true,
      },
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Should see pot headings
    expect(screen.getByText('Workplace Pension')).toBeInTheDocument();
    expect(screen.getByText('SIPP Pension')).toBeInTheDocument();
    expect(screen.getByText('Stocks & Shares ISA')).toBeInTheDocument();
    expect(screen.getByText('Cash ISA')).toBeInTheDocument();
    expect(screen.getByText('General Investment Account (GIA)')).toBeInTheDocument();

    // Apply 100% Equity ISAs & SIPP preset
    const taxArbitrageBtn = screen.getByRole('button', { name: /100% Equity ISAs & SIPP \(Tax Arbitrage\)/i });
    fireEvent.click(taxArbitrageBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          perPotAllocationsEnabled: true,
          primaryPots: expect.objectContaining({
            sipp: {
              accumulation: { equity: 100, bond: 0, cash: 0 },
              decumulation: { equity: 100, bond: 0, cash: 0 },
            },
          }),
        }),
      })
    );

    // Apply 3-Year Cash Buffer preset
    const cashBufferBtn = screen.getByRole('button', { name: /3-Year Cash Buffer/i });
    fireEvent.click(cashBufferBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          perPotAllocationsEnabled: true,
          primaryPots: expect.objectContaining({
            cashIsa: {
              accumulation: { equity: 0, bond: 0, cash: 100 },
              decumulation: { equity: 0, bond: 0, cash: 100 },
            },
          }),
        }),
      })
    );

    // In Studio Mode
    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.getAllByText('Investment Returns & Macroeconomic Settings')[1]).toBeInTheDocument();
  });

  it('adjusts accumulation and decumulation phase sliders and individual pot phase sliders', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      assetAllocationSplit: {
        enabled: true,
        accumulation: { equity: 80, bond: 15, cash: 5 },
        decumulation: { equity: 50, bond: 35, cash: 15 },
        assetClassReturns: { equityReturn: 7.0, bondReturn: 3.5, cashReturn: 3.0 },
        perPotAllocationsEnabled: true,
        primaryPots: {
          workplacePension: {
            accumulation: { equity: 80, bond: 15, cash: 5 },
            decumulation: { equity: 40, bond: 50, cash: 10 },
          },
        },
      },
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Find all range inputs
    const rangeInputs = screen.getAllByRole('slider');
    expect(rangeInputs.length).toBeGreaterThan(8);

    // Accumulation equity, bond, cash sliders
    fireEvent.change(rangeInputs[3], { target: { value: '70' } });
    expect(onChange).toHaveBeenCalled();

    fireEvent.change(rangeInputs[4], { target: { value: '25' } });
    expect(onChange).toHaveBeenCalled();

    fireEvent.change(rangeInputs[5], { target: { value: '10' } });
    expect(onChange).toHaveBeenCalled();

    // Decumulation equity, bond, cash sliders
    fireEvent.change(rangeInputs[6], { target: { value: '60' } });
    expect(onChange).toHaveBeenCalled();

    fireEvent.change(rangeInputs[7], { target: { value: '30' } });
    expect(onChange).toHaveBeenCalled();

    fireEvent.change(rangeInputs[8], { target: { value: '10' } });
    expect(onChange).toHaveBeenCalled();

    // Per-pot sliders (Workplace Pension, SIPP, etc.)
    if (rangeInputs.length > 9) {
      fireEvent.change(rangeInputs[9], { target: { value: '75' } });
      expect(onChange).toHaveBeenCalled();
    }
    if (rangeInputs.length > 10) {
      fireEvent.change(rangeInputs[10], { target: { value: '20' } });
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('updates bond and cash baseline return yields with change and onBlur clamping', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      assetAllocationSplit: {
        enabled: true,
        accumulation: { equity: 80, bond: 15, cash: 5 },
        decumulation: { equity: 50, bond: 35, cash: 15 },
        assetClassReturns: { equityReturn: 7.0, bondReturn: 3.5, cashReturn: 3.0 },
        perPotAllocationsEnabled: false,
      },
    };

    render(
      <MacroSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Bond return input
    const bondReturnInput = screen.getByDisplayValue('3.5');
    fireEvent.change(bondReturnInput, { target: { value: '4.2' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          assetClassReturns: expect.objectContaining({
            bondReturn: 4.2,
          }),
        }),
      })
    );
    fireEvent.blur(bondReturnInput, { target: { value: '4.2' } });
    expect(onChange).toHaveBeenCalled();

    // Cash return input
    const cashReturnInput = screen.getByDisplayValue('3');
    fireEvent.change(cashReturnInput, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetAllocationSplit: expect.objectContaining({
          assetClassReturns: expect.objectContaining({
            cashReturn: 2.5,
          }),
        }),
      })
    );
    fireEvent.blur(cashReturnInput, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalled();
  });
});

