const fs = require('fs'); const json = JSON.parse(fs.readFileSync('src/data/defaultData.ts', 'utf8') ? '{}' : '{}'); 
