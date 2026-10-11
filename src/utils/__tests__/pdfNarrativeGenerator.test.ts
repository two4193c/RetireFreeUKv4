import { describe, it, expect } from 'vitest';
import { generatePlanNarrative } from '../pdfNarrativeGenerator';
import { DEFAULT_PROFILE } from '../defaultData';
import { UserProfile, YearProjection } from '../../types';

describe('pdfNarrativeGenerator - generatePlanNarrative', () => {
  const mockProjectionsFeasible: YearProjection[] = [
    {
      age: 60,
      year: 2046,
      isRetired: true,
      totalPot: 500000,
      pensionPot: 300000,
      pclsTaxFreeDrawnThisYear: 75000,
      incomeShortfall: 0,
    } as unknown as YearProjection,
    {
      age: 65,
      year: 2051,
      isRetired: true,
      totalPot: 420000,
      incomeShortfall: 0,
    } as unknown as YearProjection,
    {
      age: 85,
      year: 2071,
      isRetired: true,
      totalPot: 150000,
      incomeShortfall: 0,
    } as unknown as YearProjection,
  ];

  const mockProjectionsShortfall: YearProjection[] = [
    {
      age: 60,
      year: 2046,
      isRetired: true,
      totalPot: 200000,
      incomeShortfall: 0,
    } as unknown as YearProjection,
    {
      age: 72,
      year: 2058,
      isRetired: true,
      totalPot: 0,
      incomeShortfall: 15000,
    } as unknown as YearProjection,
    {
      age: 73,
      year: 2059,
      isRetired: true,
      totalPot: 0,
      incomeShortfall: 16000,
    } as unknown as YearProjection,
  ];

  it('generates executive summary and decumulation narrative for a feasible plan with Monte Carlo and PCLS', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 35000,
      taxRegion: 'scotland',
      isCouplePlanning: true,
    };

    const mcResult = {
      simulationsRun: 500,
      successRate: 92,
      p50EndBalance: 250000,
      p10EndBalance: 50000,
      p90EndBalance: 650000,
    };

    const ihtState = {
      primaryResidenceValue: 400000,
      passMainResidenceToDescendants: true,
      annualGiftingStrategy: 3000,
      includePensionsInEstate: true,
    };

    const narrative = generatePlanNarrative({
      profile,
      projections: mockProjectionsFeasible,
      mcResult,
      ihtState,
      drawdownStrategy: 'tax_efficient_waterfall',
    });

    expect(narrative.executiveSummary).toContain('demonstrates strong long-term sustainability');
    expect(narrative.executiveSummary).toContain('92% probability of success');
    expect(narrative.executiveSummary).toContain('joint income streams and combined tax allowances');

    expect(narrative.decumulationStrategy).toContain('tax efficient waterfall');
    expect(narrative.decumulationStrategy).toContain('Tax-Free Lump Sum (PCLS) of £75,000');
    expect(narrative.decumulationStrategy).toContain('Scottish tax bands');

    expect(narrative.stochasticRisk).toContain('median (p50) projected portfolio balance is £250,000');
    expect(narrative.stochasticRisk).toContain('residual portfolio balance of £50,000 is preserved');

    expect(narrative.estateTaxSummary).toContain('Nil-Rate Band (NRB) of £650,000');
    expect(narrative.estateTaxSummary).toContain('Residence Nil-Rate Band (RNRB) of £350,000');
    expect(narrative.estateTaxSummary).toContain('gifting strategy of £3,000/year');
    expect(narrative.estateTaxSummary).toContain('April 2027');
  });

  it('generates narrative for plan shortfall with p10 depletion and uncrystallised funds', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      taxRegion: 'england_ni_wales',
      isCouplePlanning: false,
      takeLumpSumAtStart: false,
    };

    const mcResult = {
      simulationsRun: 1000,
      successRate: 64,
      p50EndBalance: 120000,
      p10EndBalance: 0, // depleted
      p90EndBalance: 400000,
    };

    const ihtState = {
      primaryResidenceValue: 0,
      passMainResidenceToDescendants: false,
      annualGiftingStrategy: 0,
      includePensionsInEstate: false,
    };

    const narrative = generatePlanNarrative({
      profile,
      projections: mockProjectionsShortfall,
      mcResult,
      ihtState,
    });

    expect(narrative.executiveSummary).toContain('projects a potential capital shortfall beginning at age 72');
    expect(narrative.executiveSummary).toContain('64% probability');

    expect(narrative.decumulationStrategy).toContain('Uncrystallised funds remain invested to maximize compounding growth');
    expect(narrative.decumulationStrategy).toContain('Rest of UK (RUK) tax bands');

    expect(narrative.stochasticRisk).toContain('assets are depleted before age');

    expect(narrative.estateTaxSummary).toContain('Nil-Rate Band (NRB) of £325,000');
    expect(narrative.estateTaxSummary).toContain('Uncrystallised pensions are currently excluded from the taxable estate');
  });

  it('handles empty Monte Carlo and IHT fallback narratives smoothly', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 65,
    };

    const narrative = generatePlanNarrative({
      profile,
      projections: mockProjectionsFeasible,
    });

    expect(narrative.stochasticRisk).toContain('Deterministic projections assume a steady investment return profile');
    expect(narrative.estateTaxSummary).toContain('Inheritance tax analysis projects total estate wealth transfer');
  });
});
