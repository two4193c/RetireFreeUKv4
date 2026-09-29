const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageDebtCard.tsx', 'utf8');

c = c.replace(
  "import { DEFAULT_MORTGAGE } from '../utils/defaultData';",
  "import { DEFAULT_MORTGAGE } from '../utils/defaultData';\nimport { MortgageArbitrageInsight } from './MortgageArbitrageInsight';"
);

c = c.replace(
  `          )}
        </div>
      )}

      {/* Add Lump Sum Modal */}`,
  `          )}
        </div>
      )}

      <MortgageArbitrageInsight profile={profile} />

      {/* Add Lump Sum Modal */}`
);

fs.writeFileSync('src/components/MortgageDebtCard.tsx', c);
console.log('Injected Arbitrage Insight component');
