const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Remove it from the primary block
code = code.replace(
  `        const parseAnnuityTypeConfig = (typeStr = '') => {
          const isInflationLinked = typeStr.includes('inflation_linked');
          let fixedEscalationRate = undefined;
          if (typeStr.includes('_3')) fixedEscalationRate = 0.03;
          else if (typeStr.includes('_5')) fixedEscalationRate = 0.05;
          return { isInflationLinked, fixedEscalationRate };
        };`,
  ``
);

// Add it to the top of the function
code = code.replace(
  `let pclsTaken = false;`,
  `const parseAnnuityTypeConfig = (typeStr = '') => {
      const isInflationLinked = typeStr.includes('inflation_linked');
      let fixedEscalationRate = undefined;
      if (typeStr.includes('_3')) fixedEscalationRate = 0.03;
      else if (typeStr.includes('_5')) fixedEscalationRate = 0.05;
      return { isInflationLinked, fixedEscalationRate };
    };\n    let pclsTaken = false;`
);

fs.writeFileSync(file, code);
