const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, 'coverage/coverage-final.json');
const c8rc = JSON.parse(fs.readFileSync(path.join(__dirname, '.c8rc.json'), 'utf8'));

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
const includePatterns = c8rc.include;

function matchesPattern(filePath, pattern) {
  // Convert glob pattern to regex (simplified) - handle ** and *
  // Escape dots
  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLESTAR>>>/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

const files = Object.keys(coverage);
console.log('All files:', files.map(f => f.replace(__dirname, '')));
const includedFiles = files.filter(file => {
  const relative = path.relative(__dirname, file);
  const match = includePatterns.some(pattern => {
    const matched = matchesPattern(relative, pattern);
    if (matched) console.log(`Matched ${relative} with ${pattern}`);
    return matched;
  });
  return match;
});

console.log(`Total files: ${files.length}`);
console.log(`Included files: ${includedFiles.length}`);

let totalStatements = 0;
let coveredStatements = 0;
let totalBranches = 0;
let coveredBranches = 0;
let totalFunctions = 0;
let coveredFunctions = 0;
let totalLines = 0;
let coveredLines = 0;

includedFiles.forEach(file => {
  const data = coverage[file];
  // statements
  const statementMap = data.s;
  Object.keys(statementMap).forEach(key => {
    totalStatements++;
    if (statementMap[key] > 0) coveredStatements++;
  });
  // branches
  const branchMap = data.b;
  Object.keys(branchMap).forEach(key => {
    const counts = branchMap[key];
    counts.forEach(count => {
      totalBranches++;
      if (count > 0) coveredBranches++;
    });
  });
  // functions
  const fnMap = data.f;
  Object.keys(fnMap).forEach(key => {
    totalFunctions++;
    if (fnMap[key] > 0) coveredFunctions++;
  });
  // lines - we need to compute from statement coverage (simplification)
  // line coverage is not directly stored; we can approximate using statement map
  // but c8 uses statement coverage as line coverage.
  // We'll skip line coverage for now.
});

console.log('\nCoverage:');
console.log(`Statements: ${coveredStatements}/${totalStatements} (${(coveredStatements/totalStatements*100).toFixed(2)}%)`);
console.log(`Branches: ${coveredBranches}/${totalBranches} (${(coveredBranches/totalBranches*100).toFixed(2)}%)`);
console.log(`Functions: ${coveredFunctions}/${totalFunctions} (${(coveredFunctions/totalFunctions*100).toFixed(2)}%)`);
console.log(`Lines (approx): ${coveredStatements}/${totalStatements} (${(coveredStatements/totalStatements*100).toFixed(2)}%)`);

// Also compute per-file coverage for debugging
console.log('\nPer-file coverage (statements):');
includedFiles.forEach(file => {
  const data = coverage[file];
  const s = data.s;
  let total = Object.keys(s).length;
  let covered = Object.values(s).filter(v => v > 0).length;
  console.log(`${path.basename(file)}: ${covered}/${total} (${(covered/total*100).toFixed(2)}%)`);
});