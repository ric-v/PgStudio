const fs = require('fs');
const path = require('path');

const targets = [
  path.resolve(__dirname, '..', '.nyc_output'),
  path.resolve(__dirname, '..', 'coverage', 'tmp'),
  path.resolve(__dirname, '..', 'coverage', 'tmp-utils'),
  path.resolve(__dirname, '..', 'coverage', 'tmp-handlers')
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}