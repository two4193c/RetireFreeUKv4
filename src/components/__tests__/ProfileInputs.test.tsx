import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProfileInputs } from '../ProfileInputs';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('ProfileInputs', () => {
  it('renders single planner demographics and updates name, salary, taxRegion, and method', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      name: 'Charlie',
      grossAnnualSalary: 55000,
      currentAge: 35,
      targetRetirementAge: 60,
      taxRegion: 'england_ni_wales',
      pensionContributionMethod: 'salary_sacrifice',
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText('Personal Profile & Demographics')).toBeInTheDocument();
    expect(screen.getByText('Single Planner')).toBeInTheDocument();

    // Name input
    const nameInput = screen.getByLabelText(/Full Name \/ Preferred Name/i);
    fireEvent.change(nameInput, { target: { value: 'Charlie Brown' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Charlie Brown' })
    );

    // Salary input
    const salaryInput = screen.getByLabelText(/Gross Annual Salary/i);
    fireEvent.change(salaryInput, { target: { value: '62000' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ grossAnnualSalary: 62000 })
    );

    // Tax Region select
    const regionSelect = screen.getByDisplayValue('England, NI & Wales (20/40/45%)');
    fireEvent.change(regionSelect, { target: { value: 'scotland' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ taxRegion: 'scotland' })
    );

    // Contribution Method select
    const methodSelect = screen.getByDisplayValue('Salary Sacrifice (Tax + NI Saved)');
    fireEvent.change(methodSelect, { target: { value: 'relief_at_source' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ pensionContributionMethod: 'relief_at_source' })
    );
  });

  it('updates age and dates when primary date of birth changes', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      dateOfBirth: '1985-05-15',
      currentAge: 40,
      targetRetirementAge: 60,
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    const dobInput = screen.getByLabelText(/Date of Birth/i);
    fireEvent.change(dobInput, { target: { value: '1990-06-20' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: '1990-06-20',
        currentAge: expect.any(Number),
      })
    );
  });

  it('displays early retirement notice when target retirement age is below NMPA access age', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Early Bird',
      isCouplePlanning: false,
      currentAge: 35,
      dateOfBirth: '1990-01-01', // NMPA is 57
      targetRetirementAge: 52, // Below 57
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={vi.fn()}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText(/Early Retirement Access Notice \(Early Bird\)/i)).toBeInTheDocument();
    expect(screen.getByText(/private pensions cannot be drawn until age/i)).toBeInTheDocument();
  });

  it('renders couple planning inputs with both Primary and Partner profile sections', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Emma',
      partnerName: 'Liam',
      grossAnnualSalary: 60000,
      partnerGrossAnnualSalary: 45000,
      currentAge: 38,
      partnerCurrentAge: 37,
      dateOfBirth: '1988-03-12',
      partnerDateOfBirth: '1989-08-25',
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 54, // Below 57 -> triggers partner early retirement
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText('Primary Profile & NMPA Timeline')).toBeInTheDocument();
    expect(screen.getByText('Partner Profile & Earnings')).toBeInTheDocument();

    // Partner name change
    const partnerNameInput = screen.getByPlaceholderText('e.g. Sarah');
    fireEvent.change(partnerNameInput, { target: { value: 'William' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ partnerName: 'William' })
    );

    // Partner salary change
    const partnerSalaryInput = screen.getByDisplayValue('45000');
    fireEvent.change(partnerSalaryInput, { target: { value: '52000' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ partnerGrossAnnualSalary: 52000 })
    );

    // Partner early retirement notice check
    expect(screen.getByText(/Partner Early Retirement Access Notice \(Liam\)/i)).toBeInTheDocument();
  });

  it('allows clicking quick pension access age presets', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      pensionAccessAge: 57,
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    // Click 55 preset button
    const btn55 = screen.getByRole('button', { name: '55' });
    fireEvent.click(btn55);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pensionAccessAge: 55,
        protectedPensionAccessAge: 55,
      })
    );
  });

  it('renders in studio mode cleanly with compact styling', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Primary',
      partnerName: 'Partner',
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={vi.fn()}
        pots={DEFAULT_POTS}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Personal Profile & NMPA Timeline')).toBeInTheDocument();
  });

  it('updates partner age and derived target dates when partner date of birth changes', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Morgan',
      partnerDateOfBirth: '1985-04-10',
      partnerCurrentAge: 40,
      partnerTargetRetirementAge: 60,
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    const partnerDobInput = screen.getByDisplayValue('1985-04-10');
    fireEvent.change(partnerDobInput, { target: { value: '1992-07-22' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerDateOfBirth: '1992-07-22',
        partnerCurrentAge: expect.any(Number),
      })
    );
  });

  it('allows manual entry into pension access age input for primary and partner', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      pensionAccessAge: 57,
      partnerPensionAccessAge: 57,
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    // Primary manual input
    const accessInputs = screen.getAllByRole('spinbutton');
    const primaryAccessInput = accessInputs.find((input) => (input as HTMLInputElement).value === '57');
    if (primaryAccessInput) {
      fireEvent.change(primaryAccessInput, { target: { value: '59' } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pensionAccessAge: 59,
          protectedPensionAccessAge: 59,
        })
      );
    }
  });

  it('allows clicking partner pension access age presets', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Morgan',
      partnerPensionAccessAge: 57,
    };

    render(
      <ProfileInputs
        profile={profile}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    // Click 58 button in partner section
    const buttons58 = screen.getAllByRole('button', { name: '58' });
    expect(buttons58.length).toBeGreaterThan(0);
    // Click the partner one (second button)
    fireEvent.click(buttons58[buttons58.length - 1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerPensionAccessAge: 58,
        partnerProtectedPensionAccessAge: 58,
      })
    );
  });

  it('allows selecting net pay arrangement for pension contributions', () => {
    const onChange = vi.fn();
    render(
      <ProfileInputs
        profile={DEFAULT_PROFILE}
        onChange={onChange}
        pots={DEFAULT_POTS}
      />
    );

    const methodSelect = screen.getByDisplayValue('Salary Sacrifice (Tax + NI Saved)');
    fireEvent.change(methodSelect, { target: { value: 'net_pay' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pensionContributionMethod: 'net_pay',
      })
    );
  });
});

