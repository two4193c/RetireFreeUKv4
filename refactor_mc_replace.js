const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\monteCarloEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const getNetStr = "const getNetFromSpecificDraws = (priG: number, partG: number) => {";
const getNetIdx = code.indexOf(getNetStr);

const endStr = "if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {";
const endIdx = code.indexOf(endStr);

console.log({getNetIdx, endIdx});

const replacement = fs.readFileSync('scratch_replace_mc.txt', 'utf8');

let newCode = code.substring(0, getNetIdx) + replacement + "\n      // Partner Mortality Inheritance\n      " + code.substring(endIdx);
fs.writeFileSync(file, newCode);
console.log('done monteCarloEngine');
