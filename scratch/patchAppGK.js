const fs = require('fs');

let path = 'src/App.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/import \{ MonteCarloCard \} from '\.\/components\/MonteCarloCard';/, "import { MonteCarloCard } from './components/MonteCarloCard';\nimport { DynamicSpendingCard } from './components/DynamicSpendingCard';");

const targetRisk = `                  <div id="card-risk-monte" className="scroll-mt-24 transition-all duration-300">
                    <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} appMode={appMode} />
                  </div>
                  {appMode === 'advanced' && (
                    <div id="card-risk-historic" className="scroll-mt-24 transition-all duration-300">`;

const patchRisk = `                  <div id="card-risk-monte" className="scroll-mt-24 transition-all duration-300">
                    <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} appMode={appMode} />
                  </div>
                  <div id="card-risk-dynamic-spending" className="scroll-mt-24 transition-all duration-300">
                    <DynamicSpendingCard profile={profile} onChange={handleProfileChange} />
                  </div>
                  {appMode === 'advanced' && (
                    <div id="card-risk-historic" className="scroll-mt-24 transition-all duration-300">`;

c = c.replace(targetRisk, patchRisk);

const targetStudio = `                      <div id="card-risk-monte" className="scroll-mt-24 transition-all duration-300">
                        <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} appMode={appMode} />
                      </div>
                      <div id="card-risk-historic" className="scroll-mt-24 transition-all duration-300">`;

const patchStudio = `                      <div id="card-risk-monte" className="scroll-mt-24 transition-all duration-300">
                        <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} appMode={appMode} />
                      </div>
                      <div id="card-risk-dynamic-spending" className="scroll-mt-24 transition-all duration-300">
                        <DynamicSpendingCard profile={profile} onChange={handleProfileChange} />
                      </div>
                      <div id="card-risk-historic" className="scroll-mt-24 transition-all duration-300">`;

c = c.replace(targetStudio, patchStudio);

fs.writeFileSync(path, c);
console.log('App patched');
