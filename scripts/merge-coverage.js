const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceDirs = [
  path.join(rootDir, 'coverage', 'tmp-utils'),
  path.join(rootDir, 'coverage', 'tmp-handlers')
];
const destinationDir = path.join(rootDir, '.nyc_output');

fs.mkdirSync(destinationDir, { recursive: true });

for (const sourceDir of sourceDirs) {
  if (!fs.existsSync(sourceDir)) {
    continue;
  }

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const phasePrefix = path.basename(sourceDir).replace(/^tmp-/, '');
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, `${phasePrefix}-${entry.name}`);
    fs.copyFileSync(sourcePath, destinationPath);
  }
}