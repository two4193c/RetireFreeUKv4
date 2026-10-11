import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightSizingCard } from '../RightSizingCard';
import { DEFAULT_PROFILE, DEFAULT_MORTGAGE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('RightSizingCard', () => {
  it('renders collapsed state when downsize plan is disabled', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      propertyDownsizePlan: {
        enabled: false,
        currentPropertyValue: 600000,
        expectedAnnualGrowthRate: 2,
        downsizeAge: 70,
        targetNewPropertyCostToday: 300000,
        sellingCostsPercent: 1.5,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa',
      },
    };

    render(<RightSizingCard profile={profile} onChange={onChange} />);

    expect(screen.getByRole('heading', { name: /Right-Sizing Your Home/i })).toBeInTheDocument();
    expect(screen.getByText(/Model selling your primary residence/i)).toBeInTheDocument();
    
    const toggleSwitch = screen.getByRole('switch', { name: /Enable Downsizing Plan/i });
    expect(toggleSwitch).toBeInTheDocument();
    expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');

    expect(screen.queryByText(/Current Residence/i)).not.toBeInTheDocument();
  });

  it('toggles plan enabled on click', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      propertyDownsizePlan: undefined,
    };

    render(<RightSizingCard profile={profile} onChange={onChange} />);

    const toggleSwitch = screen.getByRole('switch', { name: /Enable Downsizing Plan/i });
    fireEvent.click(toggleSwitch);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0];
    expect(updated.propertyDownsizePlan.enabled).toBe(true);
    expect(updated.propertyDownsizePlan.currentPropertyValue).toBe(650000);
  });

  it('renders inputs and handles changes when enabled', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      expectedInflationRate: 2.5,
      propertyDownsizePlan: {
        enabled: true,
        currentPropertyValue: 500000,
        expectedAnnualGrowthRate: 2.0,
        downsizeAge: 70,
        targetNewPropertyCostToday: 300000,
        sellingCostsPercent: 1.5,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa',
      },
    };

    render(<RightSizingCard profile={profile} onChange={onChange} />);

    expect(screen.getByText('Current Residence')).toBeInTheDocument();
    expect(screen.getByText('The Move')).toBeInTheDocument();

    // Change current property value
    const curValInput = screen.getByDisplayValue('500000');
    fireEvent.change(curValInput, { target: { value: '550000' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.currentPropertyValue).toBe(550000);

    // Change expected annual growth
    onChange.mockClear();
    const growthInput = screen.getByDisplayValue('2');
    fireEvent.change(growthInput, { target: { value: '3.5' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.expectedAnnualGrowthRate).toBe(3.5);

    // Change selling costs percent
    onChange.mockClear();
    const feesInput = screen.getByDisplayValue('1.5');
    fireEvent.change(feesInput, { target: { value: '2.0' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.sellingCostsPercent).toBe(2.0);

    // Change target downsize age
    onChange.mockClear();
    const ageInput = screen.getByDisplayValue('70');
    fireEvent.change(ageInput, { target: { value: '72' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.downsizeAge).toBe(72);

    // Change target new property cost
    onChange.mockClear();
    const newCostInput = screen.getByDisplayValue('300000');
    fireEvent.change(newCostInput, { target: { value: '320000' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.targetNewPropertyCostToday).toBe(320000);

    // Toggle SDLT second home surcharge checkbox
    onChange.mockClear();
    const surchargeCheckbox = screen.getByRole('checkbox', { name: /Apply 3% SDLT Surcharge/i });
    expect(surchargeCheckbox).not.toBeChecked();
    fireEvent.click(surchargeCheckbox);
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.stampDutySecondHomeSurcharge).toBe(true);

    // Change destination pot
    onChange.mockClear();
    const potSelect = screen.getByRole('combobox');
    fireEvent.change(potSelect, { target: { value: 'gia' } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].propertyDownsizePlan.destinationPot).toBe('gia');
  });

  it('calculates live projections correctly including mortgage clearance', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 65,
      expectedInflationRate: 2.0,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        currentBalance: 100000,
        remainingTermYears: 10,
        remainingTermMonths: 0,
        payoffAtRetirement: false,
      },
      propertyDownsizePlan: {
        enabled: true,
        currentPropertyValue: 600000,
        expectedAnnualGrowthRate: 0, // no growth for predictable calculation
        downsizeAge: 65, // 5 years from now
        targetNewPropertyCostToday: 400000,
        sellingCostsPercent: 2.0,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'cash_isa',
      },
    };

    render(<RightSizingCard profile={profile} onChange={onChange} />);

    // Projection age header
    expect(screen.getByText(/Live Projection at Age 65 \(5 years from now\)/i)).toBeInTheDocument();

    // Check Old Home Value: £600,000
    expect(screen.getByText('£600,000')).toBeInTheDocument();

    // Destination pot badge
    expect(screen.getByText('CASH_ISA')).toBeInTheDocument();
    expect(screen.getByText(/Net Equity Released/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary Residence Relief \(PRR\)/i)).toBeInTheDocument();
  });

  it('handles mortgage payoff at retirement before downsize age', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 65,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        currentBalance: 100000,
        remainingTermYears: 20,
        remainingTermMonths: 0,
        payoffAtRetirement: true, // paid off at 65
      },
      propertyDownsizePlan: {
        enabled: true,
        currentPropertyValue: 500000,
        expectedAnnualGrowthRate: 2.0,
        downsizeAge: 70, // >= 65, so outstanding mortgage is 0
        targetNewPropertyCostToday: 300000,
        sellingCostsPercent: 1.5,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'cash',
      },
    };

    render(<RightSizingCard profile={profile} onChange={onChange} />);
    expect(screen.getByText(/Live Projection at Age 70 \(10 years from now\)/i)).toBeInTheDocument();
    expect(screen.getByText('CASH')).toBeInTheDocument();
  });

  it('hides description text in studio mode', () => {
    const onChange = vi.fn();
    render(
      <RightSizingCard
        profile={DEFAULT_PROFILE}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.queryByText(/Model selling your primary residence/i)).not.toBeInTheDocument();
  });
});
