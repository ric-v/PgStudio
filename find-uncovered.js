const fs = require('fs');
const path = require('path');

const lcovFile = path.join(__dirname, 'coverage/lcov.info');
const lines = fs.readFileSync(lcovFile, 'utf8').split('\n');

let currentFile = null;
let uncovered = {};

lines.forEach(line => {
  if (line.startsWith('SF:')) {
    currentFile = line.substring(3);
    uncovered[currentFile] = [];
  } else if (line.startsWith('DA:')) {
    const parts = line.substring(3).split(',');
    const lineNumber = parseInt(parts[0], 10);
    const count = parseInt(parts[1], 10);
    if (count === 0 && currentFile) {
      uncovered[currentFile].push(lineNumber);
    }
  } else if (line.startsWith('BRDA:')) {
    // branch data: line,block,branch,count
    const parts = line.substring(5).split(',');
    const lineNumber = parseInt(parts[0], 10);
    const branchNumber = parseInt(parts[1], 10);
    const count = parseInt(parts[3], 10);
    if (count === 0 && currentFile) {
      // we could store branch info but skip for now
    }
  } else if (line.startsWith('end_of_record')) {
    currentFile = null;
  }
});

console.log('Uncovered lines per file:');
Object.keys(uncovered).forEach(file => {
  const lines = uncovered[file];
  if (lines.length > 0) {
    console.log(`\n${file}:`);
    console.log(`  Lines: ${lines.join(', ')}`);
  } else {
    console.log(`\n${file}: all lines covered`);
  }
});

// Also compute uncovered branches per file (simplified)
// Re-parse for branch data
const branchLines = fs.readFileSync(lcovFile, 'utf8').split('\n');
let currentFile2 = null;
let uncoveredBranches = {};
branchLines.forEach(line => {
  if (line.startsWith('SF:')) {
    currentFile2 = line.substring(3);
    uncoveredBranches[currentFile2] = [];
  } else if (line.startsWith('BRDA:')) {
    const parts = line.substring(5).split(',');
    const lineNum = parseInt(parts[0], 10);
    const block = parseInt(parts[1], 10);
    const branch = parseInt(parts[2], 10);
    const count = parseInt(parts[3], 10);
    if (count === 0 && currentFile2) {
      uncoveredBranches[currentFile2].push({line: lineNum, block, branch});
    }
  } else if (line.startsWith('end_of_record')) {
    currentFile2 = null;
  }
});

console.log('\n\nUncovered branches per file:');
Object.keys(uncoveredBranches).forEach(file => {
  const branches = uncoveredBranches[file];
  if (branches.length > 0) {
    console.log(`\n${file}:`);
    branches.forEach(b => {
      console.log(`  Line ${b.line}, block ${b.block}, branch ${b.branch}`);
    });
  } else {
    console.log(`\n${file}: all branches covered`);
  }
});