import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportSection } from '../ExportSection';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { YearProjection, PlannerScenario } from '../../types';

describe('ExportSection', () => {
  const mockProjections: YearProjection[] = [
    {
      year: 2026,
      age: 58,
      isRetired: false,
      pensionPot: 300000,
      isaPot: 100000,
      cashGiaPot: 50000,
      totalPot: 450000,
      estimatedInvestmentFees: 2000,
      statePensionReceived: 0,
      dbPensionIncomeReceived: 0,
      annuityIncomeReceived: 0,
      pensionDrawdown: 0,
      totalTaxPaid: 8000,
      netRetirementIncome: 0,
      targetRetirementIncome: 30000,
    } as any,
    {
      year: 2028,
      age: 60,
      isRetired: true,
      pensionPot: 320000,
      isaPot: 90000,
      cashGiaPot: 45000,
      totalPot: 455000,
      estimatedInvestmentFees: 2100,
      statePensionReceived: 0,
      dbPensionIncomeReceived: 0,
      annuityIncomeReceived: 0,
      pensionDrawdown: 20000,
      totalTaxPaid: 2500,
      netRetirementIncome: 25000,
      targetRetirementIncome: 30000,
    } as any,
  ];

  const mockScenarios: PlannerScenario[] = [
    {
      id: 'scen-1',
      name: 'Baseline Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01T10:00:00Z',
    },
  ];

  let createObjectURLMock: any;
  let revokeObjectURLMock: any;

  beforeEach(() => {
    createObjectURLMock = vi.fn(() => 'blob:mock-export-url');
    revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
  });

  it('renders export options grid with full controls', () => {
    render(
      <ExportSection
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        projections={mockProjections}
        scenarios={mockScenarios}
      />
    );

    expect(screen.getByText(/Summary & Plan Export/i)).toBeInTheDocument();
    expect(screen.getByText('PDF Report')).toBeInTheDocument();
    expect(screen.getByText('Formula Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('CSV Data Export')).toBeInTheDocument();
    expect(screen.getByText('JSON Settings Backup')).toBeInTheDocument();
  });

  it('exports projections CSV file on click', () => {
    render(
      <ExportSection
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        projections={mockProjections}
        scenarios={mockScenarios}
      />
    );

    const csvBtn = screen.getByRole('button', { name: /Export Projections CSV/i });
    fireEvent.click(csvBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('exports JSON settings backup on click', () => {
    render(
      <ExportSection
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        projections={mockProjections}
        scenarios={mockScenarios}
      />
    );

    const exportJsonBtn = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportJsonBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('imports JSON backup file via file input', async () => {
    const onImportScenarios = vi.fn();
    render(
      <ExportSection
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        projections={mockProjections}
        scenarios={mockScenarios}
        onImportScenarios={onImportScenarios}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const jsonBlob = new File([JSON.stringify(mockScenarios)], 'backup.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [jsonBlob] } });

    await waitFor(() => {
      expect(onImportScenarios).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'scen-1' })])
      );
    });
  });

  it('renders data_only variant properly', () => {
    render(
      <ExportSection
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        projections={mockProjections}
        scenarios={mockScenarios}
        variant="data_only"
      />
    );

    expect(screen.getByText(/Data Export & Backup Options/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Projections CSV/i })).toBeInTheDocument();
  });
});
