const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, 'coverage/coverage-final.json');
const c8rc = JSON.parse(fs.readFileSync(path.join(__dirname, '.c8rc.json'), 'utf8'));

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const files = Object.keys(coverage);

let totalStatements = 0;
let coveredStatements = 0;
let totalBranches = 0;
let coveredBranches = 0;
let totalFunctions = 0;
let coveredFunctions = 0;

const perFileStats = [];

files.forEach(file => {
  const data = coverage[file];
  // statements
  const s = data.s;
  let fileStatements = 0;
  let fileCoveredStatements = 0;
  Object.keys(s).forEach(key => {
    fileStatements++;
    totalStatements++;
    if (s[key] > 0) {
      fileCoveredStatements++;
      coveredStatements++;
    }
  });
  // branches
  const b = data.b;
  let fileBranches = 0;
  let fileCoveredBranches = 0;
  Object.keys(b).forEach(key => {
    const counts = b[key];
    counts.forEach(count => {
      fileBranches++;
      totalBranches++;
      if (count > 0) {
        fileCoveredBranches++;
        coveredBranches++;
      }
    });
  });
  // functions
  const f = data.f;
  let fileFunctions = 0;
  let fileCoveredFunctions = 0;
  Object.keys(f).forEach(key => {
    fileFunctions++;
    totalFunctions++;
    if (f[key] > 0) {
      fileCoveredFunctions++;
      coveredFunctions++;
    }
  });
  // lines: approximate using statements (c8 uses statement map for lines)
  // We'll compute line coverage as statements coverage per file
  perFileStats.push({
    file: path.relative(__dirname, file),
    statements: fileCoveredStatements / fileStatements * 100,
    branches: fileBranches ? fileCoveredBranches / fileBranches * 100 : 100,
    functions: fileFunctions ? fileCoveredFunctions / fileFunctions * 100 : 100,
  });
});

console.log('=== Coverage Summary ===');
console.log(`Total files: ${files.length}`);
console.log('');
console.log(`Statements: ${coveredStatements}/${totalStatements} (${(coveredStatements/totalStatements*100).toFixed(2)}%)`);
console.log(`Branches: ${coveredBranches}/${totalBranches} (${(coveredBranches/totalBranches*100).toFixed(2)}%)`);
console.log(`Functions: ${coveredFunctions}/${totalFunctions} (${(coveredFunctions/totalFunctions*100).toFixed(2)}%)`);
console.log(`Lines (approx): ${coveredStatements}/${totalStatements} (${(coveredStatements/totalStatements*100).toFixed(2)}%)`);
console.log('');
console.log('Thresholds:');
console.log(`Lines >= 85%: ${(coveredStatements/totalStatements*100).toFixed(2)}% ${coveredStatements/totalStatements*100 >= 85 ? '✓' : '✗'}`);
console.log(`Branches >= 75%: ${(coveredBranches/totalBranches*100).toFixed(2)}% ${coveredBranches/totalBranches*100 >= 75 ? '✓' : '✗'}`);
console.log(`Statements >= 85%: ${(coveredStatements/totalStatements*100).toFixed(2)}% ${coveredStatements/totalStatements*100 >= 85 ? '✓' : '✗'}`);
console.log(`Functions >= 80%: ${(coveredFunctions/totalFunctions*100).toFixed(2)}% ${coveredFunctions/totalFunctions*100 >= 80 ? '✓' : '✗'}`);
console.log('');
console.log('Per-file coverage (statements):');
perFileStats.sort((a,b) => a.statements - b.statements);
perFileStats.forEach(stat => {
  console.log(`${stat.file.padEnd(60)} ${stat.statements.toFixed(2)}%`);
});