import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpendingPhasesCard } from '../SpendingPhasesCard';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('SpendingPhasesCard - Retirement Income Requirement & Essential Floor', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    targetRetirementIncomeAnnual: 40000,
    essentialRetirementIncomeAnnual: 26000, // 65% of 40,000
  };

  it('renders the Retirement Income Requirement title and Essential Spending Floor', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    expect(screen.getByText('Retirement Income Requirement')).toBeDefined();
    expect(screen.getByText('Essential Income Floor')).toBeDefined();
    expect(screen.getByText('65% of Target')).toBeDefined();
  });

  it('allows user to change the essential spending floor directly via input', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    const inputs = screen.getAllByRole('spinbutton');
    // Find the essential floor input with value 26000
    const essentialInput = inputs.find((inp) => (inp as HTMLInputElement).value === '26000');
    expect(essentialInput).toBeDefined();

    if (essentialInput) {
      fireEvent.change(essentialInput, { target: { value: '28000' } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          essentialRetirementIncomeAnnual: 28000,
        })
      );
    }
  });

  it('allows user to quickly set essential spending floor using quick percentage buttons', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    // Click 70% button (70% of £40,000 = £28,000)
    const btn70 = screen.getByRole('button', { name: '70%' });
    expect(btn70).toBeDefined();

    fireEvent.click(btn70);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        essentialRetirementIncomeAnnual: 28000,
      })
    );
  });

  it('switches between Flat Annual Spending and Flexible Age-Based Spending', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    const flexBtn = screen.getByRole('button', { name: /Flexible Age-Based Spending/i });
    fireEvent.click(flexBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        spendingPhases: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('applies Go-Go / Slow-Go / No-Go preset when spending phases are enabled', () => {
    const onChange = vi.fn();
    const flexProfile: UserProfile = {
      ...baseProfile,
      spendingPhases: {
        enabled: true,
      },
    };

    render(<SpendingPhasesCard profile={flexProfile} onChange={onChange} />);

    const gogoBtn = screen.getByRole('button', { name: /Go \/ Slow \/ No-Go/i });
    fireEvent.click(gogoBtn);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[0][0];
    expect(updated.spendingPhases.customRanges).toBeDefined();
    expect(updated.spendingPhases.customRanges.length).toBeGreaterThanOrEqual(3);
  });

  it('applies 2-Stage preset and auto-aligns age stages', () => {
    const onChange = vi.fn();
    const flexProfile: UserProfile = {
      ...baseProfile,
      spendingPhases: {
        enabled: true,
      },
    };

    render(<SpendingPhasesCard profile={flexProfile} onChange={onChange} />);

    const twoStageBtn = screen.getByRole('button', { name: /2-Stage/i });
    fireEvent.click(twoStageBtn);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[0][0];
    expect(updated.spendingPhases.customRanges.length).toBe(2);

    const autoAlignBtn = screen.getByRole('button', { name: /Auto-Align Ages/i });
    fireEvent.click(autoAlignBtn);
    expect(onChange).toHaveBeenCalled();
  });

  it('adds and removes custom spending age ranges', () => {
    const onChange = vi.fn();
    const flexProfile: UserProfile = {
      ...baseProfile,
      spendingPhases: {
        enabled: true,
        customRanges: [
          {
            id: 'range-1',
            name: 'Active Stage',
            startAge: 60,
            endAge: 70,
            annualTargetIncome: 40000,
          },
          {
            id: 'range-2',
            name: 'Paced Stage',
            startAge: 71,
            endAge: undefined,
            annualTargetIncome: 30000,
          },
        ],
      },
    };

    render(<SpendingPhasesCard profile={flexProfile} onChange={onChange} />);

    // Add Range
    const addBtn = screen.getByRole('button', { name: /Add Custom Spending Age Range/i });
    fireEvent.click(addBtn);

    expect(onChange).toHaveBeenCalled();
    const afterAdd = onChange.mock.calls[0][0];
    expect(afterAdd.spendingPhases.customRanges.length).toBe(3);

    // Remove Range
    const deleteButtons = screen.getAllByTitle(/Delete Age Range/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalled();
  });

  it('applies early55, decades presets and creates ISA Bridge Years for early retirement', () => {
    const onChange = vi.fn();
    const earlyProfile: UserProfile = {
      ...baseProfile,
      targetRetirementAge: 50,
      spendingPhases: {
        enabled: true,
      },
    };

    const { rerender } = render(<SpendingPhasesCard profile={earlyProfile} onChange={onChange} />);

    // Click Start to Age 55 preset
    const early55Btn = screen.getByRole('button', { name: /Start to Age 55/i });
    fireEvent.click(early55Btn);
    expect(onChange).toHaveBeenCalled();
    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(updated.spendingPhases.customRanges.some((r: any) => r.id === 'preset-1')).toBe(true);

    // Click Decade Step-Downs preset
    const decadesBtn = screen.getByRole('button', { name: /Decade Step-Downs/i });
    fireEvent.click(decadesBtn);
    expect(onChange).toHaveBeenCalled();
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(updated.spendingPhases.customRanges.length).toBe(4);

    // Click Go-Go preset with retirementAge (50) < pensionAccessAge (57)
    const gogoBtn = screen.getByRole('button', { name: /Go \/ Slow \/ No-Go/i });
    fireEvent.click(gogoBtn);
    expect(onChange).toHaveBeenCalled();
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    // Should have ISA Bridge Years
    expect(updated.spendingPhases.customRanges.some((r: any) => r.id === 'preset-isa-bridge')).toBe(true);
  });

  it('handles custom income increase mode and percentage buttons', () => {
    const onChange = vi.fn();
    const customIncreaseProfile: UserProfile = {
      ...baseProfile,
      incomeIncreaseMode: 'custom',
      customIncomeIncreasePercent: 2.5,
    };

    render(<SpendingPhasesCard profile={customIncreaseProfile} onChange={onChange} />);

    // Change custom percentage input
    const customPercentInput = screen.getByDisplayValue('2.5');
    fireEvent.change(customPercentInput, { target: { value: '3.0' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customIncomeIncreasePercent: 3.0,
      })
    );

    // Quick 0% and 1% buttons
    const btn0 = screen.getByRole('button', { name: '0%' });
    fireEvent.click(btn0);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customIncomeIncreasePercent: 0,
      })
    );

    const btn1 = screen.getByRole('button', { name: '1%' });
    fireEvent.click(btn1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customIncomeIncreasePercent: 1,
      })
    );
  });

  it('updates stage range fields including startAge, endAge ongoing, target income, floor, and description', () => {
    const onChange = vi.fn();
    const flexProfile: UserProfile = {
      ...baseProfile,
      spendingPhases: {
        enabled: true,
        customRanges: [
          {
            id: 'range-1',
            name: 'Phase One',
            startAge: 60,
            endAge: 70,
            annualTargetIncome: 40000,
            essentialIncomeFloor: 25000,
            description: 'Initial travel',
          },
          {
            id: 'range-2',
            name: 'Phase Two',
            startAge: 71,
            endAge: undefined,
            annualTargetIncome: 30000,
            essentialIncomeFloor: 20000,
            description: 'Quiet years',
          },
        ],
      },
    };

    render(<SpendingPhasesCard profile={flexProfile} onChange={onChange} />);

    // Phase name input
    const nameInput = screen.getByDisplayValue('Phase One');
    fireEvent.change(nameInput, { target: { value: 'Active Phase' } });
    expect(onChange).toHaveBeenCalled();

    // Start age change & blur
    const startInput = screen.getByDisplayValue('60');
    fireEvent.change(startInput, { target: { value: '62' } });
    fireEvent.blur(startInput, { target: { value: '62' } });
    expect(onChange).toHaveBeenCalled();

    // End age change & blur
    const endInput = screen.getByDisplayValue('70');
    fireEvent.change(endInput, { target: { value: '72' } });
    fireEvent.blur(endInput, { target: { value: '72' } });
    expect(onChange).toHaveBeenCalled();

    // Ongoing checkbox for Phase 1 (currently false)
    const ongoingCheckboxes = screen.getAllByRole('checkbox', { name: /Ongoing/i });
    fireEvent.click(ongoingCheckboxes[0]);
    expect(onChange).toHaveBeenCalled();

    // Annual target income change & blur (using range-target id)
    const targetInput = document.getElementById('range-target-range-1') as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: '45000' } });
    fireEvent.blur(targetInput, { target: { value: '45000' } });
    expect(onChange).toHaveBeenCalled();

    // Essential floor change & blur (using range-floor id)
    const floorInput = document.getElementById('range-floor-range-1') as HTMLInputElement;
    fireEvent.change(floorInput, { target: { value: '26000' } });
    fireEvent.blur(floorInput, { target: { value: '26000' } });
    expect(onChange).toHaveBeenCalled();

    // Notes description input
    const notesInput = screen.getByDisplayValue('Initial travel');
    fireEvent.change(notesInput, { target: { value: 'Global travels' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders correctly in studio mode', () => {
    render(<SpendingPhasesCard profile={baseProfile} onChange={vi.fn()} isStudio={true} />);
    expect(screen.getByText('Retirement Income Requirement')).toBeDefined();
  });
});

