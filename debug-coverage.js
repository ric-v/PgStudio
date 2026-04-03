const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, 'coverage/coverage-final.json');
const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const firstFile = Object.keys(coverage)[0];
console.log(firstFile);
const data = coverage[firstFile];
console.log('Statement map keys:', Object.keys(data.s).length);
console.log('Statement counts:', data.s);
console.log('Branch map:', Object.keys(data.b).length);
console.log('Function map:', Object.keys(data.f).length);