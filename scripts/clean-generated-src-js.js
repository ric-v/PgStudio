#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function removeGeneratedFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let removedCount = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removedCount += removeGeneratedFiles(fullPath);
      continue;
    }

    if (entry.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.js.map'))) {
      fs.unlinkSync(fullPath);
      removedCount += 1;
    }
  }

  return removedCount;
}

const srcDir = path.join(process.cwd(), 'src');
const removedCount = removeGeneratedFiles(srcDir);

if (removedCount > 0) {
  console.log(`Removed ${removedCount} generated file(s) from src`);
}