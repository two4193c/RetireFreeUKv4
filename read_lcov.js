const fs = require('fs');
const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
const fileCov = Object.values(cov).find(c => c.path.includes('projectionEngine.ts'));

const uncovered = [];
for (const [statementId, count] of Object.entries(fileCov.s)) {
  if (count === 0) {
    const loc = fileCov.statementMap[statementId];
    uncovered.push(loc.start.line);
  }
}
uncovered.sort((a, b) => a - b);

// group consecutive lines
const groups = [];
let current = [uncovered[0]];
for (let i = 1; i < uncovered.length; i++) {
  if (uncovered[i] === uncovered[i - 1] + 1 || uncovered[i] === uncovered[i - 1]) {
    current.push(uncovered[i]);
  } else {
    groups.push(current);
    current = [uncovered[i]];
  }
}
groups.push(current);

const ranges = groups.map(g => g.length > 1 ? `${g[0]}-${g[g.length - 1]}` : `${g[0]}`);
console.log(ranges.join(', '));
