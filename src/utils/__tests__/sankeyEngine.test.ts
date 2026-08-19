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
    
    expect(data).toBeDefined();
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
    expect(nodeIds).toContain('pri_pension_dd');
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
