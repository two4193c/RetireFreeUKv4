const fs = require('fs');

const sankeyTestFile = 'src/utils/__tests__/sankeyEngine.test.ts';
let sankeyContent = fs.readFileSync(sankeyTestFile, 'utf8');

// I need to replace the entire 'sankeyEngine - downsizing and life events coverage' block.
const updatedBlock = `
describe('sankeyEngine - downsizing and life events coverage', () => {
  it('includes downsize equity flow during downsizing year', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      propertyDownsizing: {
        enabled: true,
        currentPropertyValue: 650000,
        expectedAnnualGrowthRate: 2.5,
        downsizeAge: 65,
        targetNewPropertyCostToday: 500000,
        sellingCostsPercent: 0,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'combined');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => \`\${l.sourceId}->\${l.targetId}\`);
    expect(linkIds).toContain('downsize_equity->gross_retire_hub');
  });

  it('includes life events inflow and expense flows during life events year', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: [
        { id: '1', name: 'Income', type: 'income', amount: 50000, age: 70, enabled: true },
        { id: '2', name: 'Expense', type: 'expense', amount: 30000, age: 70, enabled: true }
      ],
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 70, 'combined');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => \`\${l.sourceId}->\${l.targetId}\`);
    expect(linkIds).toContain('life_events_inflow->gross_retire_hub');
    expect(linkIds).toContain('net_spendable_hub->life_events_expense');
  });
  
  it('includes downsize and life events flows during split couple view', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerTargetRetirementAge: 65,
      propertyDownsizing: {
        enabled: true,
        currentPropertyValue: 650000,
        expectedAnnualGrowthRate: 0,
        downsizeAge: 65,
        targetNewPropertyCostToday: 500000,
        sellingCostsPercent: 0,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      decumulationLifeEvents: [
        { id: '1', name: 'Income', type: 'income', amount: 20000, age: 65, enabled: true },
        { id: '2', name: 'Expense', type: 'expense', amount: 10000, age: 65, enabled: true }
      ],
      targetRetirementAge: 65
    };
    const projections = generateProjections(profile, DEFAULT_POTS);
    const data = computeCashFlowSankeyData(profile, DEFAULT_POTS, projections, 65, 'split');
    
    expect(data).toBeDefined();
    const linkIds = data.links.map(l => \`\${l.sourceId}->\${l.targetId}\`);
    expect(linkIds).toContain('downsize_equity->pri_gross_hub');
    expect(linkIds).toContain('downsize_equity->part_gross_hub');
  });
});
`;

sankeyContent = sankeyContent.replace(/describe\('sankeyEngine - downsizing and life events coverage'[\s\S]*\}\);/, updatedBlock.trim());
fs.writeFileSync(sankeyTestFile, sankeyContent);

console.log('Fixed sankey tests');
