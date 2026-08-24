const fs = require('fs');
const path = 'C:\\Users\\two41\\.gemini\\antigravity\\brain\\28e59c90-0bff-4be0-bdf1-2242408cfcc0\\logic_issues.md';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/- \[ \] \*\*Issue 5:/, '- [x] ? **FIXED** Issue 5:');
content = content.replace(/- \[ \] \*\*Issue 6:/, '- [x] ? **FIXED** Issue 6:');
content = content.replace(/- \[ \] \*\*Issue 7:/, '- [x] ? **FIXED** Issue 7:');
content = content.replace(/- \[ \] \*\*Issue 8:/, '- [x] ? **FIXED** Issue 8:');
content = content.replace(/- \[ \] \*\*Issue 9:/, '- [x] ? **FIXED** Issue 9:');

fs.writeFileSync(path, content);
