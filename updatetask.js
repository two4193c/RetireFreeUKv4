const fs = require('fs');
const file = 'C:/Users/two41/.gemini/antigravity/brain/28e59c90-0bff-4be0-bdf1-2242408cfcc0/task.md';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\[ \]/g, '[x]');
fs.writeFileSync(file, code);
console.log('task.md updated');
