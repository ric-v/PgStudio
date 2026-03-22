const fs = require('fs');
const path = require('path');

const lcovFile = path.join(__dirname, 'coverage/lcov.info');
const lines = fs.readFileSync(lcovFile, 'utf8').split('\n');

let totalLinesFound = 0;
let totalLinesHit = 0;
let totalBranchesFound = 0;
let totalBranchesHit = 0;
let totalFunctionsFound = 0;
let totalFunctionsHit = 0;

let currentFile = null;
let fileLinesFound = 0;
let fileLinesHit = 0;
let fileBranchesFound = 0;
let fileBranchesHit = 0;
let fileFunctionsFound = 0;
let fileFunctionsHit = 0;

const perFileStats = [];

function resetCurrent() {
  fileLinesFound = 0;
  fileLinesHit = 0;
  fileBranchesFound = 0;
  fileBranchesHit = 0;
  fileFunctionsFound = 0;
  fileFunctionsHit = 0;
}

lines.forEach(line => {
  if (line.startsWith('SF:')) {
    currentFile = line.substring(3);
    resetCurrent();
  } else if (line.startsWith('LF:')) {
    fileLinesFound = parseInt(line.substring(3), 10);
  } else if (line.startsWith('LH:')) {
    fileLinesHit = parseInt(line.substring(3), 10);
  } else if (line.startsWith('BRF:')) {
    fileBranchesFound = parseInt(line.substring(4), 10);
  } else if (line.startsWith('BRH:')) {
    fileBranchesHit = parseInt(line.substring(4), 10);
  } else if (line.startsWith('FNF:')) {
    fileFunctionsFound = parseInt(line.substring(4), 10);
  } else if (line.startsWith('FNH:')) {
    fileFunctionsHit = parseInt(line.substring(4), 10);
  } else if (line.startsWith('end_of_record')) {
    if (currentFile) {
      totalLinesFound += fileLinesFound;
      totalLinesHit += fileLinesHit;
      totalBranchesFound += fileBranchesFound;
      totalBranchesHit += fileBranchesHit;
      totalFunctionsFound += fileFunctionsFound;
      totalFunctionsHit += fileFunctionsHit;
      perFileStats.push({
        file: currentFile,
        lines: fileLinesFound ? (fileLinesHit / fileLinesFound * 100) : 100,
        branches: fileBranchesFound ? (fileBranchesHit / fileBranchesFound * 100) : 100,
        functions: fileFunctionsFound ? (fileFunctionsHit / fileFunctionsFound * 100) : 100,
      });
    }
    currentFile = null;
  }
});

console.log('=== Coverage Summary (from lcov.info) ===');
console.log(`Total files: ${perFileStats.length}`);
console.log('');
console.log(`Lines: ${totalLinesHit}/${totalLinesFound} (${(totalLinesHit/totalLinesFound*100).toFixed(2)}%)`);
console.log(`Branches: ${totalBranchesHit}/${totalBranchesFound} (${(totalBranchesHit/totalBranchesFound*100).toFixed(2)}%)`);
console.log(`Functions: ${totalFunctionsHit}/${totalFunctionsFound} (${(totalFunctionsHit/totalFunctionsFound*100).toFixed(2)}%)`);
console.log('');
console.log('Thresholds:');
console.log(`Lines >= 85%: ${(totalLinesHit/totalLinesFound*100).toFixed(2)}% ${totalLinesHit/totalLinesFound*100 >= 85 ? '✓' : '✗'}`);
console.log(`Branches >= 75%: ${(totalBranchesHit/totalBranchesFound*100).toFixed(2)}% ${totalBranchesHit/totalBranchesFound*100 >= 75 ? '✓' : '✗'}`);
console.log(`Statements >= 85%: (same as lines) ${totalLinesHit/totalLinesFound*100 >= 85 ? '✓' : '✗'}`);
console.log(`Functions >= 80%: ${(totalFunctionsHit/totalFunctionsFound*100).toFixed(2)}% ${totalFunctionsHit/totalFunctionsFound*100 >= 80 ? '✓' : '✗'}`);
console.log('');
console.log('Per-file coverage (lines):');
perFileStats.sort((a,b) => a.lines - b.lines);
perFileStats.forEach(stat => {
  console.log(`${stat.file.padEnd(60)} ${stat.lines.toFixed(2)}%`);
});