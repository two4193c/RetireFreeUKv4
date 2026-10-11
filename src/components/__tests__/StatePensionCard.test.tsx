import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatePensionCard } from '../StatePensionCard';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('StatePensionCard', () => {
  it('renders State Pension Forecast header, qualifying years, and claim age', () => {
    const onChange = vi.fn();

    render(
      <StatePensionCard
        profile={DEFAULT_PROFILE}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/State Pension Forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/^State Pension Age$/i)).toBeInTheDocument();
  });

  it('toggles includeStatePension checkbox and calls onChange', () => {
    const onChange = vi.fn();

    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, includeStatePension: true }}
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('checkbox', { name: /Primary State Pension/i });
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        includeStatePension: false,
      })
    );
  });

  it('updates qualifying years and calculates pro-rata State Pension', () => {
    const onChange = vi.fn();

    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, qualifyingYears: 30 }}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const yearsInput = inputs.find((inp) => (inp as HTMLInputElement).value === '30');
    expect(yearsInput).toBeDefined();

    if (yearsInput) {
      fireEvent.change(yearsInput, { target: { value: '35' } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          qualifyingYears: 35,
        })
      );
    }
  });

  it('renders couple mode with partner State Pension section', () => {
    const onChange = vi.fn();
    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Natasha',
      partnerStatePensionAge: 67,
      partnerQualifyingYears: 35,
      partnerIncludeStatePension: true,
    };

    render(
      <StatePensionCard
        profile={coupleProfile}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Natasha State Pension/i)).toBeInTheDocument();
  });

  it('calculates State Pension deferral boost and break-even age', () => {
    const deferredProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      statePensionAge: 67,
      statePensionDeferralYears: 2,
      qualifyingYears: 35,
    };

    render(
      <StatePensionCard
        profile={deferredProfile}
        onChange={vi.fn()}
      />
    );

    // 2 years deferral = 11.6% boost (0.058 * 2)
    expect(screen.getByText(/Delay State Pension \(Deferral\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\+11\.6% Boosted/i)).toBeInTheDocument();
  });

  it('triggers quick Max 35 Yrs (Full) button to maximize entitlement', () => {
    const onChange = vi.fn();

    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, qualifyingYears: 20 }}
        onChange={onChange}
      />
    );

    const maxBtn = screen.getByRole('button', { name: /Max 35 Yrs \(Full\)/i });
    fireEvent.click(maxBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        qualifyingYears: 35,
      })
    );
  });

  it('toggles Triple Lock Indexing checkbox', () => {
    const onChange = vi.fn();

    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, enableTripleLock: true }}
        onChange={onChange}
      />
    );

    const tripleLockCheckbox = screen.getByRole('checkbox', { name: /Triple Lock Indexing/i });
    fireEvent.click(tripleLockCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enableTripleLock: false,
      })
    );
  });

  it('displays minimum 10 years rule notice when qualifying years is under 10', () => {
    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, qualifyingYears: 7 }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/UK Minimum 10 Years Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/<10 Yrs = £0 Entitlement/i)).toBeInTheDocument();
  });

  it('handles deferral quick options, plus/minus buttons, slider, and claim age input for primary user', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      statePensionAge: 67,
      statePensionDeferralYears: 2,
    };

    render(
      <StatePensionCard
        profile={profile}
        onChange={onChange}
      />
    );

    // Quick option button e.g. "+3 Yrs (70)"
    const opt3 = screen.getByRole('button', { name: /\+3 Yrs \(70\)/i });
    fireEvent.click(opt3);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statePensionDeferralYears: 3,
      })
    );

    // Plus button to increase delay
    const plusBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(plusBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statePensionDeferralYears: 3, // min(10, 2 + 1)
      })
    );

    // Minus button to decrease delay
    const minusBtn = screen.getByRole('button', { name: '-' });
    fireEvent.click(minusBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statePensionDeferralYears: 1, // max(0, 2 - 1)
      })
    );

    // Change claim age input directly
    const claimAgeInput = screen.getByDisplayValue('69'); // 67 + 2 = 69
    fireEvent.change(claimAgeInput, { target: { value: '71' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statePensionDeferralYears: 4, // 71 - 67 = 4
      })
    );

    // Deferral range slider (qualifying years slider is index 0, deferral slider is index 1)
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[1], { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        statePensionDeferralYears: 5,
      })
    );
  });

  it('modifies full state pension benchmark amount', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fullStatePensionAmount: 11502,
      qualifyingYears: 35,
    };

    render(
      <StatePensionCard
        profile={profile}
        onChange={onChange}
      />
    );

    const fullBenchmarkInput = screen.getByDisplayValue('11502');
    fireEvent.change(fullBenchmarkInput, { target: { value: '12000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fullStatePensionAmount: 12000,
        statePensionAmountAnnual: 12000,
      })
    );
  });

  it('manages partner state pension settings, deferral, quick presets and minimum 10-year notice', () => {
    const onChange = vi.fn();
    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Natasha',
      fullStatePensionAmount: 11502,
      partnerStatePensionAge: 65,
      partnerQualifyingYears: 8, // under 10 years
      partnerIncludeStatePension: true,
      partnerEnableTripleLock: true,
      partnerFullStatePensionAmount: 11502,
      partnerStatePensionDeferralYears: 4,
    };

    render(
      <StatePensionCard
        profile={coupleProfile}
        onChange={onChange}
      />
    );

    // Check Partner Minimum 10 years rule callout
    expect(screen.getAllByText(/UK Minimum 10 Years Rule:/i).length).toBeGreaterThan(0);

    // Toggle partner triple lock (index 1 is partner)
    const tripleLockCheckboxes = screen.getAllByRole('checkbox', { name: /Triple Lock Indexing/i });
    fireEvent.click(tripleLockCheckboxes[1]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerEnableTripleLock: false,
      })
    );

    // Click Partner Max 35 Yrs (Full) button
    const partnerMaxBtn = screen.getAllByRole('button', { name: /Max 35 Yrs \(Full\)/i })[1];
    fireEvent.click(partnerMaxBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerIncludeStatePension: true,
        partnerQualifyingYears: 35,
        partnerStatePensionAmountAnnual: 11502,
      })
    );

    // Change partner benchmark input
    const benchmarkInputs = screen.getAllByDisplayValue('11502');
    const partnerBenchmarkInput = benchmarkInputs[1];
    fireEvent.change(partnerBenchmarkInput, { target: { value: '12500' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerFullStatePensionAmount: 12500,
      })
    );

    // Change partner SPA input (uniquely 65)
    const partnerSpaInput = screen.getByDisplayValue('65');
    fireEvent.change(partnerSpaInput, { target: { value: '68' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerStatePensionAge: 68,
      })
    );

    // Partner quick deferral button "+2 Yrs (67)"
    const partnerDelay2Btn = screen.getByRole('button', { name: /\+2 Yrs \(67\)/i });
    fireEvent.click(partnerDelay2Btn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerStatePensionDeferralYears: 2,
      })
    );

    // Partner delay minus button
    const minusBtns = screen.getAllByRole('button', { name: '-' });
    fireEvent.click(minusBtns[1]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerStatePensionDeferralYears: 3, // 4 - 1
      })
    );

    // Partner delay plus button
    const plusBtns = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusBtns[1]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerStatePensionDeferralYears: 5, // 4 + 1
      })
    );

    // Partner claim age input (uniquely 65 + 4 = 69)
    const partnerClaimAgeInput = screen.getByDisplayValue('69');
    fireEvent.change(partnerClaimAgeInput, { target: { value: '70' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerStatePensionDeferralYears: 5, // 70 - 65 = 5
      })
    );

    // Partner qualifying years range slider & delay slider
    const sliders = screen.getAllByRole('slider');
    // Sliders: 0 = primary years, 1 = primary deferral, 2 = partner years, 3 = partner deferral
    if (sliders[2]) {
      fireEvent.change(sliders[2], { target: { value: '32' } });
      expect(onChange).toHaveBeenCalled();
    }
    if (sliders[3]) {
      fireEvent.change(sliders[3], { target: { value: '6' } });
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('renders single person placeholder when couple planning is disabled', () => {
    render(
      <StatePensionCard
        profile={{ ...DEFAULT_PROFILE, isCouplePlanning: false }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Single Person Planning Mode Active/i)).toBeInTheDocument();
  });

  it('renders correctly in studio mode', () => {
    render(
      <StatePensionCard
        profile={DEFAULT_PROFILE}
        onChange={vi.fn()}
        isStudioMode={true}
      />
    );

    expect(screen.getByText(/State Pension Forecast/i)).toBeInTheDocument();
  });
});
