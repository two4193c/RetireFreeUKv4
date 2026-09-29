const fs = require('fs');

let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

// 1. Add owner to interface
c = c.replace(
  'projectedBenefit: string;\n}',
  "projectedBenefit: string;\n  owner: 'Household' | 'Primary' | 'Partner';\n}"
);

// 2. Add owner to opp 1-3 helpers
c = c.replace(/opportunities\.push\(\{/g, (match, offset) => {
  // Let's manually replace all occurrences by searching for title context or id
  return match; // do nothing globally here
});

fs.writeFileSync('src/utils/planInsightsEngine.ts', c);

// Let's just use regex to insert owner into all push calls
let lines = c.split('\n');
let insidePush = false;
let currentId = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('opportunities.push({')) {
    insidePush = true;
    currentId = '';
  }
  if (insidePush && lines[i].includes("id: '")) {
    const idMatch = lines[i].match(/id:\s*[`']([^`']+)['`]/);
    if (idMatch) {
      currentId = idMatch[1];
    } else if (lines[i].includes("`tax_trap")) {
      currentId = 'tax_trap';
    } else if (lines[i].includes("`salary_sacrifice")) {
      currentId = 'salary_sacrifice';
    } else if (lines[i].includes("`state_pension")) {
      currentId = 'state_pension';
    }
  }
  
  if (insidePush && lines[i].includes('projectedBenefit:')) {
    let ownerStr = "'Household'";
    if (currentId.includes('_primary')) ownerStr = "'Primary'";
    else if (currentId.includes('_partner')) ownerStr = "'Partner'";
    else if (currentId.includes('tax_trap')) ownerStr = "ownerPrefix === 'primary' ? 'Primary' : 'Partner'";
    else if (currentId.includes('salary_sacrifice')) ownerStr = "ownerPrefix === 'primary' ? 'Primary' : 'Partner'";
    else if (currentId.includes('state_pension')) ownerStr = "ownerPrefix === 'primary' ? 'Primary' : 'Partner'";
    
    // Check for lsa cap explicit
    if (currentId === 'lsa_cap_monitoring_primary') ownerStr = "'Primary'";
    if (currentId === 'lsa_cap_monitoring_partner') ownerStr = "'Partner'";

    lines.splice(i + 1, 0, `        owner: ${ownerStr},`);
    insidePush = false;
  }
}

fs.writeFileSync('src/utils/planInsightsEngine.ts', lines.join('\n'));
console.log('Done modifying planInsightsEngine.ts');
