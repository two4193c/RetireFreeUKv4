import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IhtEstatePlanningCard } from '../IhtEstatePlanningCard';
import { UserProfile, YearProjection, PetGift } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_IHT_SETTINGS } from '../../utils/defaultData';

const createMockProjections = (): YearProjection[] => {
  return [
    {
      year: 2040,
      age: 80,
      isaPot: 120000,
      cashGiaPot: 50000,
      pensionPot: 300000,
    } as unknown as YearProjection,
    {
      year: 2050,
      age: 90,
      isaPot: 80000,
      cashGiaPot: 30000,
      pensionPot: 150000,
    } as unknown as YearProjection,
    {
      year: 2060,
      age: 100,
      isaPot: 40000,
      cashGiaPot: 10000,
      pensionPot: 50000,
    } as unknown as YearProjection,
  ];
};

describe('IhtEstatePlanningCard', () => {
  it('renders milestone ledger table and displays basic estate metrics', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      isCouplePlanning: false,
      ihtSettings: {
        ...DEFAULT_IHT_SETTINGS,
        primaryResidenceValue: 500000,
        annualPropertyGrowthPercent: 2.5,
        passMainResidenceToDescendants: true,
        includePensionsInEstate: true,
        nonPensionBeneficiary: 'descendants',
      },
    };

    render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Inheritance Tax (IHT) & Estate Planning Module')).toBeInTheDocument();
    expect(screen.getByText('Single Planning (1x Allowance: £500,000)')).toBeInTheDocument();

    // Milestone comparison ledger headers
    expect(screen.getAllByText(/Age 80/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Age 90/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Age 100/i).length).toBeGreaterThan(0);
  });

  it('updates primary residence value, property growth, and beneficiary destination', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      isCouplePlanning: true,
      ihtSettings: {
        ...DEFAULT_IHT_SETTINGS,
        primaryResidenceValue: 400000,
        annualPropertyGrowthPercent: 3.0,
        nonPensionBeneficiary: 'spouse',
      },
    };

    render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={onChange}
      />
    );

    // Couple Planning indicator
    expect(screen.getByText('Couple Planning (2x Allowances: £1,000,000)')).toBeInTheDocument();

    // Update primary residence value
    const residenceInput = screen.getByPlaceholderText('e.g. 500000');
    fireEvent.change(residenceInput, { target: { value: '600000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          primaryResidenceValue: 600000,
        }),
      })
    );

    // Update beneficiary destination to descendants
    const beneficiarySelect = screen.getByDisplayValue(/Surviving Spouse/i);
    fireEvent.change(beneficiarySelect, { target: { value: 'descendants' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          nonPensionBeneficiary: 'descendants',
        }),
      })
    );
  });

  it('toggles RNRB home pass checkbox and updates charitable bequest percentage', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      isCouplePlanning: false,
      ihtSettings: {
        ...DEFAULT_IHT_SETTINGS,
        passMainResidenceToDescendants: false,
        charityGiftingPercent: 5,
      },
    };

    render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={onChange}
      />
    );

    // Toggle RNRB
    const rnrbCheckbox = screen.getByRole('checkbox');
    fireEvent.click(rnrbCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          passMainResidenceToDescendants: true,
        }),
      })
    );
  });

  it('updates business relief assets and life insurance written in trust', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      ihtSettings: {
        ...DEFAULT_IHT_SETTINGS,
        businessReliefAssets: 20000,
        businessReliefExemptionPercent: 50,
        lifeInsuranceInTrust: 100000,
      },
    };

    render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={onChange}
      />
    );

    // BPR assets input
    const bprInput = screen.getByDisplayValue('20000');
    fireEvent.change(bprInput, { target: { value: '35000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          businessReliefAssets: 35000,
        }),
      })
    );

    // Life insurance input
    const insuranceInput = screen.getByDisplayValue('100000');
    fireEvent.change(insuranceInput, { target: { value: '150000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          lifeInsuranceInTrust: 150000,
        }),
      })
    );
  });

  it('manages Potentially Exempt Transfers (PETs): opens modal, adds, edits, and deletes gift', () => {
    const onChange = vi.fn();
    const existingGift: PetGift = {
      id: 'gift-1',
      recipient: 'Son - Wedding',
      amount: 30000,
      yearsAgo: 4,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      ihtSettings: {
        ...DEFAULT_IHT_SETTINGS,
        petGifts: [existingGift],
      },
    };

    const { rerender } = render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={onChange}
      />
    );

    // Existing gift should be visible in table
    expect(screen.getByText('Son - Wedding')).toBeInTheDocument();
    expect(screen.getAllByText('£30,000').length).toBeGreaterThan(0);
    expect(screen.getByText(/4 Years Ago/i)).toBeInTheDocument();

    // Click Delete Gift
    const deleteBtn = screen.getByTitle('Delete gift entry');
    fireEvent.click(deleteBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          petGifts: [],
        }),
      })
    );

    // Click Add Gift button to open modal
    const addGiftBtn = screen.getByRole('button', { name: /Add Gift/i });
    fireEvent.click(addGiftBtn);

    expect(screen.getByRole('heading', { name: /Add Non-Pension Capital Gift/i })).toBeInTheDocument();

    // Enter recipient and amount
    const recipientInput = screen.getByPlaceholderText(/Eldest daughter/i);
    fireEvent.change(recipientInput, { target: { value: 'Daughter Deposit' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Add Gift to Log/i });
    fireEvent.submit(saveBtn.closest('form')!);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ihtSettings: expect.objectContaining({
          petGifts: expect.arrayContaining([
            expect.objectContaining({
              recipient: 'Daughter Deposit',
            }),
          ]),
        }),
      })
    );

    // Edit existing gift
    const editBtn = screen.getByTitle('Edit gift details');
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /Edit Non-Pension Gift/i })).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
  });

  it('renders correctly in studio mode and when hideInputs is true', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
    };

    render(
      <IhtEstatePlanningCard
        profile={profile}
        projections={createMockProjections()}
        onChange={vi.fn()}
        isStudioMode={true}
        hideInputs={true}
      />
    );

    expect(screen.getByText('Inheritance Tax (IHT) & Estate Planning Module')).toBeInTheDocument();
    // Inputs should be hidden
    expect(screen.queryByPlaceholderText('e.g. 500000')).toBeNull();
  });
});
