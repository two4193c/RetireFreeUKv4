const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageDebtCard.tsx', 'utf8');

if (!c.includes('<MortgageArbitrageInsight profile={profile} />')) {
  c = c.replace(
    '{/* Add Lump Sum Modal */}',
    '<MortgageArbitrageInsight profile={profile} />\n\n      {/* Add Lump Sum Modal */}'
  );
  fs.writeFileSync('src/components/MortgageDebtCard.tsx', c);
  console.log('Successfully injected <MortgageArbitrageInsight />');
} else {
  console.log('Already injected.');
}
