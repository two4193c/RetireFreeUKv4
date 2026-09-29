const fs = require('fs');

let path = 'src/App.tsx';
let c = fs.readFileSync(path, 'utf8');

// Normalize newlines
c = c.replace(/\r\n/g, '\n');

// Risk tab patch
const riskTarget = /<div id="card-risk-monte"[\s\S]*?<MonteCarloCard[\s\S]*?<\/div>\n\s*\{appMode === 'advanced' && \(\n\s*<div id="card-risk-historic"/g;

c = c.replace(riskTarget, (match) => {
  return match.replace(
    "{appMode === 'advanced' && (\n                  <div id=\"card-risk-historic\"", 
    `<div id="card-risk-dynamic-spending" className="scroll-mt-24 transition-all duration-300">\n                    <DynamicSpendingCard profile={profile} onChange={handleProfileChange} />\n                  </div>\n                  {appMode === 'advanced' && (\n                  <div id="card-risk-historic"`
  );
});

// Studio mode patch
const studioTarget = /<div id="card-risk-monte"[\s\S]*?<MonteCarloCard[\s\S]*?<\/div>\n\s*<div id="card-risk-historic"/g;

c = c.replace(studioTarget, (match) => {
  return match.replace(
    `<div id="card-risk-historic"`,
    `<div id="card-risk-dynamic-spending" className="scroll-mt-24 transition-all duration-300">\n                        <DynamicSpendingCard profile={profile} onChange={handleProfileChange} />\n                      </div>\n                      <div id="card-risk-historic"`
  );
});

fs.writeFileSync(path, c);
console.log('App patched properly');
