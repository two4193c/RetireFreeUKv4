import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdvancedSettingsCard } from '../AdvancedSettingsCard';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('AdvancedSettingsCard', () => {
  it('renders default settings badges and allows toggling tax bands indexing between indexed and frozen', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      indexTaxBands: true,
    };

    render(
      <AdvancedSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Tax Bands: Indexed')).toBeInTheDocument();
    expect(screen.getByText('Default HMRC Tax Bands')).toBeInTheDocument();
    expect(screen.getByText('Flat Growth Rate')).toBeInTheDocument();

    // Click Frozen (Fiscal Drag) button
    const frozenBtn = screen.getByRole('button', { name: /Frozen \(Fiscal Drag\)/i });
    fireEvent.click(frozenBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        indexTaxBands: false,
      })
    );

    // Click Indexed (Default) button
    const indexedBtn = screen.getByRole('button', { name: /Indexed \(Default\)/i });
    fireEvent.click(indexedBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        indexTaxBands: true,
      })
    );
  });

  it('enables and edits custom rUK income tax bands and resets to HMRC defaults', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      taxRegion: 'england_ni_wales',
      customTaxBands: {
        enabled: true,
        personalAllowance: 12570,
        paTaperThreshold: 100000,
        basicRateThreshold: 37700,
        basicRatePercent: 20,
        higherRateThreshold: 125140,
        higherRatePercent: 40,
        additionalRatePercent: 45,
        pensionAnnualAllowance: 60000,
        isaAnnualAllowance: 20000,
      },
    };

    render(
      <AdvancedSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Custom Overrides Active')).toBeInTheDocument();
    expect(screen.getByText(/rUK \(England\/NI\/Wales\) Income Tax Bands Override/i)).toBeInTheDocument();

    // Edit personal allowance
    const paInput = screen.getByDisplayValue('12570');
    fireEvent.change(paInput, { target: { value: '15000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTaxBands: expect.objectContaining({
          personalAllowance: 15000,
        }),
      })
    );

    // Edit Basic Rate %
    const basicRateInput = screen.getByDisplayValue('20');
    fireEvent.change(basicRateInput, { target: { value: '18' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTaxBands: expect.objectContaining({
          basicRatePercent: 18,
        }),
      })
    );

    // Edit Statutory Pension AA
    const pensionAaInput = screen.getByDisplayValue('60000');
    fireEvent.change(pensionAaInput, { target: { value: '50000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTaxBands: expect.objectContaining({
          pensionAnnualAllowance: 50000,
        }),
      })
    );

    // Click Reset to HMRC Defaults
    const resetBtn = screen.getByRole('button', { name: /Reset to HMRC Defaults/i });
    fireEvent.click(resetBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTaxBands: expect.objectContaining({
          enabled: true,
          personalAllowance: 12570,
        }),
      })
    );
  });

  it('renders Scottish tax bands overrides when taxRegion is scotland', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      taxRegion: 'scotland',
      customTaxBands: {
        enabled: true,
        personalAllowance: 12570,
        paTaperThreshold: 100000,
        basicRateThreshold: 37700,
        basicRatePercent: 20,
        higherRateThreshold: 125140,
        higherRatePercent: 40,
        additionalRatePercent: 45,
        scotStarterRatePercent: 19,
        scotBasicRatePercent: 20,
        scotIntermediateRatePercent: 21,
        scotHigherRatePercent: 42,
        scotAdvancedRatePercent: 45,
        scotTopRatePercent: 48,
      },
    };

    render(
      <AdvancedSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Scottish Income Tax Bands Override/i)).toBeInTheDocument();
    expect(screen.getByText('Starter Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Intermediate Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Advanced Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Top Rate (%)')).toBeInTheDocument();

    // Edit Scottish starter rate
    const starterInput = screen.getByDisplayValue('19');
    fireEvent.change(starterInput, { target: { value: '18.5' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTaxBands: expect.objectContaining({
          scotStarterRatePercent: 18.5,
        }),
      })
    );
  });

  it('enables pot-specific growth rate overrides and updates account yield rates', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      potReturnOverrides: {
        enabled: true,
        workplacePensionReturn: 7.0,
        sippReturn: 7.8,
        stocksAndSharesIsaReturn: 7.5,
        cashIsaReturn: 4.2,
        lisaReturn: 6.5,
        giaReturn: 6.5,
        cashSavingsReturn: 3.5,
      },
    };

    render(
      <AdvancedSettingsCard
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Pot Growth Overrides Active')).toBeInTheDocument();
    expect(screen.getByText(/Pot-Specific Growth Rate Overrides/i)).toBeInTheDocument();
    expect(screen.getByText('Workplace Pension')).toBeInTheDocument();
    expect(screen.getByText('SIPP / Personal Pension')).toBeInTheDocument();
    expect(screen.getByText('Cash Savings & High-Yield Accounts')).toBeInTheDocument();

    // Edit SIPP return
    const sippInput = screen.getByDisplayValue('7.8');
    fireEvent.change(sippInput, { target: { value: '8.2' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potReturnOverrides: expect.objectContaining({
          sippReturn: 8.2,
        }),
      })
    );

    // Edit Cash ISA return
    const cashIsaInput = screen.getByDisplayValue('4.2');
    fireEvent.change(cashIsaInput, { target: { value: '4.5' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potReturnOverrides: expect.objectContaining({
          cashIsaReturn: 4.5,
        }),
      })
    );
  });
});
