const fs = require('fs');
const lines = fs.readFileSync('coverage/lcov.info', 'utf8').split('\n');
let inProj = false;
let missing = [];
lines.forEach(l => {
  if (l.startsWith('SF:') && l.includes('projectionEngine.ts')) {
    inProj = true;
  } else if (l.startsWith('SF:')) {
    inProj = false;
  }
  if (inProj && l.startsWith('DA:')) {
    const parts = l.substring(3).split(',');
    const lineNum = parseInt(parts[0]);
    const hits = parseInt(parts[1]);
    if (hits === 0) {
      missing.push(lineNum);
    }
  }
});
console.log('Total missing lines:', missing.length);
// group missing lines into ranges
let ranges = [];
let start = missing[0];
let prev = missing[0];
for (let i = 1; i < missing.length; i++) {
  if (missing[i] === prev + 1) {
    prev = missing[i];
  } else {
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = missing[i];
    prev = missing[i];
  }
}
if (missing.length > 0) {
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
}
console.log('Missing ranges:', ranges.join(', '));
