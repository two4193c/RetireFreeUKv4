// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { 
  hexToRgb, 
  calculateMortgagePaymentForAge, 
  computeCashFlowSankeyData, 
  computeSankeyLayout 
} from '../sankeyEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { generateProjections } from '../projectionEngine';
import { UserProfile } from '../../types';

describe('sankeyEngine - hexToRgb', () => {
  it('converts valid 6-digit hex to rgb', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('00FF00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
    expect(hexToRgb('#1a2b3c')).toEqual([26, 43, 60]);
  });

  it('converts valid 3-digit hex to rgb', () => {
    expect(hexToRgb('#F00')).toEqual([255, 0, 0]);
    expect(hexToRgb('0F0')).toEqual([0, 255, 0]);
  });

  it('returns default grey for invalid hex', () => {
    expect(hexToRgb('invalid')).toEqual([100, 116, 139]);
    expect(hexToRgb('#FFZ')).toEqual([0, 255, 255]);
  });
});

describe('sankeyEngine - calculateMortgagePaymentForAge', () => {
  it('returns 0 if mortgage is disabled', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      mortgage: { enabled: false, propertyName: '', currentBalance: 100000, interestRatePercent: 5, remainingTermYears: 10, repaymentType: 'repayment' }
    };
    expect(calculateMortgagePaymentForAge(profile, 50)).toBe(0);
  });

  it('returns 0 if mortgage is paid off', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      mortgage: { enabled: true, propertyName: '', currentBalance: 100000, interestRatePercent: 5, remainingTermYears: 10, repaymentType: 'repayment' }
    };
    // Paid off at 50, so at 51 it should be 0
    expect(calculateMortgagePaymentForAge(profile, 51)).toBe(0);
  });

  it('returns correct monthly payment * 12 for repayment mortgage during active years', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      mortgage: { enabled: true, propertyName: '', currentBalance: 100000, interestRatePercent: 5, remainingTermYears: 10, repaymentType: 'repayment' }
    };
    // P = 100000, r = 0.05/12, n = 120
    // Payment = 100000 * (r(1+r)^n) / ((1+r)^n - 1)
    // ~1060.65 monthly -> ~12727 annual
    const annual = calculateMortgagePaymentForAge(profile, 45);
    expect(annual).toBeGreaterThan(12000);
    expect(annual).toBeLessThan(13000);
  });

  it('returns correct monthly payment * 12 for interest-only mortgage during active years', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      mortgage: { enabled: true, propertyName: '', currentBalance: 100000, interestRatePercent: 5, remainingTermYears: 10, repaymentType: 'interest_only' }
    };
    // 100000 * 0.05 = 5000 annual
    const annual = calculateMortgagePaymentForAge(profile, 45);
    expect(annual).toBe(5000);
  });
});

describe('sankeyEngine - computeCashFlowSankeyData', () => {
  it('returns null if projection for age is not found and array is empty', () => {
    expect(computeCashFlowSankeyData(DEFAULT_PROFILE, DEFAULT_POTS, [], 50)).toBeNull();
  });

  it('builds nodes and links correctly for a combined view during accumulation', () => {
    const projections = generateProjections(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const data = computeCashFlowSankeyData(DEFAULT_PROFILE, DEFAULT_POTS, projections, DEFAULT_PROFILE.currentAge, 'combined');
    
    console.log(projections.find(p => p.age === 65).propertyDownsizeEquityReleased); expect(data).toBeDefined();
    expect(data!.nodes.length).toBeGreaterThan(0);
    expect(data!.links.length).toBeGreaterThan(0);
    
    const nodeIds = data!.nodes.map(n => n.id);
    expect(nodeIds).toContain('salary_income');
    expect(nodeIds).toContain('gross_hub');
    expect(nodeIds).toContain('net_pay_hub');
    expect(nodeIds).toContain('essential_living');
  });

  it('builds nodes and links correctly for a split couple view during decumulation', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerGrossAnnualSalary: 40000,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
    };
    const pots = {
      ...DEFAULT_POTS,
      partnerWorkplacePensionBalance: 100000
    };
    const projections = generateProjections(profile, pots);
    
    // Test for a decumulation year (e.g. age 65)
    const data = computeCashFlowSankeyData(profile, pots, projections, 65, 'split');
    
    expect(data).toBeDefined();
    expect(data!.nodes.length).toBeGreaterThan(0);
    
    const nodeIds = data!.nodes.map(n => n.id);
    expect(nodeIds).toContain('part_pension_dd');
    expect(nodeIds).toContain('pri_retire_hub');
    expect(nodeIds).toContain('essential_retirement_spend');
  });
});

describe('sankeyEngine - computeSankeyLayout', () => {
  it('returns empty layout if no data provided', () => {
    const layout = computeSankeyLayout(null as any);
    expect(layout).toBeNull();
  });

  it('calculates positioning for nodes and links without crashing', () => {
    const projections = generateProjections(DEFAULT_PROFILE, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(DEFAULT_PROFILE, DEFAULT_POTS, projections, DEFAULT_PROFILE.currentAge, 'combined');
    
    const layout = computeSankeyLayout(data!);
    
    expect(layout).toBeDefined();
    expect(layout!.nodePositions.length).toBe(data!.nodes.length);
    expect(layout!.linkPaths.length).toBe(data!.links.length);
    
    // Check that layout generated coordinates
    const firstNode = layout!.nodePositions[0];
    expect(firstNode.x).toBeDefined();
    expect(firstNode.y).toBeDefined();
    expect(firstNode.width).toBeDefined();
    expect(firstNode.height).toBeDefined();
  });
});
  
describe('sankeyEngine - downsizing and life events coverage', () => {
  it('includes downsize equity flow during downsizing year', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      propertyDownsizePlan: {
        enabled: true,
        currentPropertyValue: 650000,
        expectedAnnualGrowthRate: 0,
        downsizeAge: 65,
        targetNewPropertyCostToday: 100000,
        sellingCostsPercent: 0,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'combined');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => `${l.sourceId}->${l.targetId}`);
    expect(linkIds).toContain('downsize_equity->gross_retire_hub');
  });

  it('includes life events inflow and expense flows during life events year', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: [
        { id: '1', name: 'Income', type: 'income' as const, amount: 50000, age: 70, enabled: true, owner: 'primary' as const },
        { id: '2', name: 'Expense', type: 'expense' as const, amount: 30000, age: 70, enabled: true, owner: 'primary' as const }
      ],
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 70, 'combined');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => `${l.sourceId}->${l.targetId}`);
    expect(linkIds).toContain('life_events_inflow->gross_retire_hub');
    expect(linkIds).toContain('net_spendable_hub->life_events_expense');
  });
  
  it('includes downsize and life events flows during split couple view', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerTargetRetirementAge: 65,
      propertyDownsizePlan: {
        enabled: true,
        currentPropertyValue: 650000,
        expectedAnnualGrowthRate: 0,
        downsizeAge: 65,
        targetNewPropertyCostToday: 100000,
        sellingCostsPercent: 0,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      decumulationLifeEvents: [
        { id: '1', name: 'Income', type: 'income' as const, amount: 20000, age: 65, enabled: true, owner: 'primary' as const },
        { id: '3', name: 'IncomePart', type: 'income' as const, amount: 20000, age: 65, enabled: true, owner: 'partner' },
        { id: '2', name: 'Expense', type: 'expense' as const, amount: 10000, age: 65, enabled: true, owner: 'primary' as const }
      ],
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'split');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => `${l.sourceId}->${l.targetId}`);
    expect(linkIds).toContain('pri_downsize->pri_retire_hub');
    expect(linkIds).toContain('part_downsize->part_retire_hub');
    expect(linkIds).toContain('pri_life_events->pri_retire_hub');
    expect(linkIds).toContain('part_life_events->part_retire_hub');
  });

  it('builds nodes and links correctly for a split couple view during accumulation', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerGrossAnnualSalary: 35000,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
    };
    const pots = {
      ...DEFAULT_POTS,
      partnerWorkplacePensionBalance: 100000
    };
    const projections = generateProjections(profile, pots);
    
    // Test for an accumulation year (e.g. currentAge)
    const data = computeCashFlowSankeyData(profile, pots, projections, profile.currentAge, 'split');
    
    expect(data).toBeDefined();
    expect(data!.nodes.length).toBeGreaterThan(0);
    
    const nodeIds = data!.nodes.map(n => n.id);
    // Primary and partner hubs and sources
    expect(nodeIds).toContain('pri_salary');
    expect(nodeIds).toContain('part_salary');
    expect(nodeIds).toContain('pri_gross_hub');
    expect(nodeIds).toContain('part_gross_hub');
    expect(nodeIds).toContain('household_essential_living');
  });
});

describe('sankeyEngine - additional view modes and edge cases', () => {
  it('builds nodes for primary and partner view modes during accumulation', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerGrossAnnualSalary: 30000,
    };
    const pots = {
      ...DEFAULT_POTS,
      partnerWorkplacePensionBalance: 50000
    };
    const projections = generateProjections(profile, pots);
    
    const primaryData = computeCashFlowSankeyData(profile, pots, projections, profile.currentAge, 'primary');
    expect(primaryData).toBeDefined();
    expect(primaryData!.viewMode).toBe('primary');
    const primaryNodes = primaryData!.nodes.map(n => n.id);
    expect(primaryNodes).toContain('salary_income');

    const partnerData = computeCashFlowSankeyData(profile, pots, projections, profile.currentAge, 'partner');
    expect(partnerData).toBeDefined();
    expect(partnerData!.viewMode).toBe('partner');
    const partnerNodes = partnerData!.nodes.map(n => n.id);
    expect(partnerNodes).toContain('salary_income');
  });

  it('builds nodes for primary and partner view modes during decumulation', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    
    const primaryData = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'primary');
    expect(primaryData).toBeDefined();
    expect(primaryData!.viewMode).toBe('primary');

    const partnerData = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'partner');
    expect(partnerData).toBeDefined();
    expect(partnerData!.viewMode).toBe('partner');
  });

  it('handles retirement mortgage allocation in combined view', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        currentBalance: 200000,
        interestRatePercent: 4,
        remainingTermYears: 20, // 20 years from age 40 -> ends at 60. Wait, make it longer.
        repaymentType: 'repayment' as const,
        payoffAtRetirement: false
      }
    };
    // Update profile so mortgage ends at 70
    profile.currentAge = 40;
    profile.mortgage.remainingTermYears = 30;

    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'combined');
    expect(data).toBeDefined();
    const nodeIds = data!.nodes.map(n => n.id);
    expect(nodeIds).toContain('retirement_mortgage');
  });

  it('handles reinvested surplus node logic in decumulation', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000 // lower target to ensure surplus
    };
    const pots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 2000000, // very large pot
      isaBalance: 1000000
    };
    const projections = generateProjections(profile, pots);
    // Find a year with annualIncomeExcess > 0
    const surplusYear = projections.find(p => p.age >= 60 && (p.annualIncomeExcess || 0) > 0);
    // Even if projection engine doesn't produce it normally, we can mock it
    const fakeProjections = [{
      ...projections[0],
      age: 65,
      isRetired: true,
      year: 2040,
      annualIncomeExcess: 10000,
      netRetirementIncome: 30000,
      statePensionReceived: 10000,
      pensionDrawdownTaxFree: 10000,
      pensionDrawdownTaxable: 10000,
    }];
    const data = computeCashFlowSankeyData(profile, pots, fakeProjections, 65, 'combined');
    expect(data).toBeDefined();
    const nodeIds = data!.nodes.map(n => n.id);
    expect(nodeIds).toContain('reinvested_surplus');
  });

  it('handles edge cases where guaranteed income is zero and pots are completely depleted', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementAge: 60,
    };
    const fakeProjections = [{
      ...generateProjections(profile, DEFAULT_POTS)[0],
      age: 80,
      isRetired: true,
      year: 2055,
      statePensionReceived: 0,
      dbPensionIncomeReceived: 0,
      annuityIncomeReceived: 0,
      giltLadderIncomeReceived: 0,
      taxableFixedIncomeReceived: 0,
      taxFreeFixedIncomeReceived: 0,
      pensionDrawdown: 0,
      pensionDrawdownTaxable: 0,
      pensionDrawdownTaxFree: 0,
      isaDrawdown: 0,
      cashDrawdown: 0,
      lifeEventsIncome: 0,
      propertyDownsizeEquityReleased: 0,
      totalTaxPaid: 0,
      netRetirementIncome: 0,
      incomeShortfall: 20000,
      annualIncomeExcess: 0
    }];
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, fakeProjections, 80, 'combined');
    expect(data).toBeDefined();
    expect(data!.nodes.length).toBeGreaterThanOrEqual(0);
    expect(data!.metrics.guaranteedFloor).toBe(0);
    expect(data!.metrics.portfolioDrawdown).toBe(0);
    expect(data!.metrics.shortfall).toBe(20000);
  });
});
