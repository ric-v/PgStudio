import { globSync } from 'glob';
import Mocha from 'mocha';
import * as fs from 'fs';
import * as path from 'path';

export function run(): Promise<void> {
  const reporter = process.env.MOCHA_REPORTER || 'spec';
  const junitPath =
    process.env.MOCHA_FILE ||
    path.join(__dirname, '..', '..', '..', 'test-results', 'e2e-junit.xml');
  if (reporter === 'mocha-junit-reporter') {
    fs.mkdirSync(path.dirname(junitPath), { recursive: true });
  }

  const mochaOpts: ConstructorParameters<typeof Mocha>[0] = {
    ui: 'bdd',
    color: true,
    timeout: 120_000,
    reporter
  };
  if (reporter === 'mocha-junit-reporter') {
    mochaOpts.reporterOptions = { mochaFile: junitPath };
  }
  const mocha = new Mocha(mochaOpts);
  const testsRoot = path.resolve(__dirname, '.');
  const files = globSync('**/*.test.js', { cwd: testsRoot });
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
