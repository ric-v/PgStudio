import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  getPgPassFilePath,
  pgPassFileDescription,
  pgPassFileExists,
  resolvePgPassPassword,
  resolvePgPassPasswordAsync
} from '../../utils/pgPassUtils';

describe('pgPassUtils', () => {
  const originalEnv = { ...process.env };
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    process.env = { ...originalEnv };
  });

  it('getPgPassFilePath uses PGPASSFILE when set', () => {
    process.env.PGPASSFILE = '/tmp/custom.pgpass';
    expect(getPgPassFilePath()).to.equal('/tmp/custom.pgpass');
  });

  it('getPgPassFilePath uses ~/.pgpass on Unix when PGPASSFILE unset', () => {
    delete process.env.PGPASSFILE;
    sandbox.stub(process, 'platform').value('linux');
    expect(getPgPassFilePath()).to.equal(path.join(os.homedir(), '.pgpass'));
  });

  it('getPgPassFilePath uses APPDATA postgresql path on Windows', () => {
    delete process.env.PGPASSFILE;
    sandbox.stub(process, 'platform').value('win32');
    process.env.APPDATA = 'C:\\Users\\x\\AppData\\Roaming';
    expect(getPgPassFilePath()).to.equal(
      path.join(process.env.APPDATA, 'postgresql', 'pgpass.conf')
    );
  });

  it('pgPassFileDescription annotates env override', () => {
    process.env.PGPASSFILE = '/x';
    expect(pgPassFileDescription()).to.contain('PGPASSFILE');
  });

  it('pgPassFileDescription describes Windows path when not using PGPASSFILE', () => {
    delete process.env.PGPASSFILE;
    sandbox.stub(process, 'platform').value('win32');
    process.env.APPDATA = 'C:\\Roaming';
    expect(pgPassFileDescription()).to.contain('Windows');
  });

  it('pgPassFileDescription describes Unix path when not using PGPASSFILE', () => {
    delete process.env.PGPASSFILE;
    sandbox.stub(process, 'platform').value('linux');
    expect(pgPassFileDescription()).to.contain('Unix');
  });

  it('resolvePgPassPassword matches wildcard port', () => {
    const file = path.join(os.tmpdir(), `pgpass-${Date.now()}.txt`);
    fs.writeFileSync(file, 'localhost:*:mydb:myuser:secretpass\n', { mode: 0o600 });
    process.env.PGPASSFILE = file;
    expect(resolvePgPassPassword('localhost', 5432, 'mydb', 'myuser')).to.equal('secretpass');
    fs.unlinkSync(file);
  });

  it('resolvePgPassPassword matches wildcard host and string port', () => {
    const file = path.join(os.tmpdir(), `pgpass-${Date.now()}.txt`);
    fs.writeFileSync(file, '*:5432:mydb:myuser:pw\n', { mode: 0o600 });
    process.env.PGPASSFILE = file;
    expect(resolvePgPassPassword('any.host', '5432', 'mydb', 'myuser')).to.equal('pw');
    fs.unlinkSync(file);
  });

  it('resolvePgPassPassword skips comments and blank lines', () => {
    const file = path.join(os.tmpdir(), `pgpass-${Date.now()}.txt`);
    fs.writeFileSync(
      file,
      '\n# comment\n\nlocalhost:5432:mydb:myuser:good\n',
      { mode: 0o600 }
    );
    process.env.PGPASSFILE = file;
    expect(resolvePgPassPassword('localhost', 5432, 'mydb', 'myuser')).to.equal('good');
    fs.unlinkSync(file);
  });

  it('resolvePgPassPassword skips malformed lines and returns undefined when no match', () => {
    const file = path.join(os.tmpdir(), `pgpass-${Date.now()}.txt`);
    fs.writeFileSync(file, 'too:few:fields\nlocalhost:5432:mydb:myuser:ok\n', { mode: 0o600 });
    process.env.PGPASSFILE = file;
    expect(resolvePgPassPassword('other', 5432, 'mydb', 'myuser')).to.equal(undefined);
    expect(resolvePgPassPassword('localhost', 5432, 'mydb', 'myuser')).to.equal('ok');
    fs.unlinkSync(file);
  });

  it('resolvePgPassPassword handles escaped colon in password', () => {
    const file = path.join(os.tmpdir(), `pgpass-${Date.now()}.txt`);
    fs.writeFileSync(file, 'localhost:5432:mydb:myuser:pa\\:ss\\:word\n', { mode: 0o600 });
    process.env.PGPASSFILE = file;
    expect(resolvePgPassPassword('localhost', 5432, 'mydb', 'myuser')).to.equal('pa:ss:word');
    fs.unlinkSync(file);
  });

  it('resolvePgPassPassword returns undefined for missing file', () => {
    process.env.PGPASSFILE = path.join(os.tmpdir(), `missing-${Date.now()}.pgpass`);
    expect(resolvePgPassPassword('h', 1, 'd', 'u')).to.equal(undefined);
  });

  it('resolvePgPassPasswordAsync wraps sync resolver', async () => {
    process.env.PGPASSFILE = path.join(os.tmpdir(), `missing-async-${Date.now()}.pgpass`);
    expect(await resolvePgPassPasswordAsync('h', 1, 'd', 'u')).to.equal(undefined);
  });

  it('pgPassFileExists is false for missing path', () => {
    process.env.PGPASSFILE = path.join(os.tmpdir(), `nope-${Date.now()}`);
    expect(pgPassFileExists()).to.equal(false);
  });

  it('pgPassFileExists is true when file is readable', () => {
    const file = path.join(os.tmpdir(), `pgpass-exists-${Date.now()}.txt`);
    fs.writeFileSync(file, 'x', { mode: 0o600 });
    process.env.PGPASSFILE = file;
    expect(pgPassFileExists()).to.equal(true);
    fs.unlinkSync(file);
  });
});
