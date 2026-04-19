import { expect } from 'chai';
import * as sinon from 'sinon';

import { ConnectionManager } from '../../services/ConnectionManager';
import { getDriver } from '../../core/db/registry';

describe('ConnectionManager additional coverage', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    (ConnectionManager as any).instance = undefined;
  });

  it('routes mysql and postgres connections to the matching driver implementations', async () => {
    const manager = ConnectionManager.getInstance();
    const mysqlDriver = getDriver('mysql') as any;
    const postgresDriver = getDriver('postgres') as any;

    const mysqlClient = { query: sandbox.stub(), release: sandbox.stub() };
    const postgresClient = { query: sandbox.stub(), release: sandbox.stub() };

    const mysqlStub = sandbox.stub(mysqlDriver, 'getPooledClient').resolves(mysqlClient);
    const postgresStub = sandbox.stub(postgresDriver, 'getPooledClient').resolves(postgresClient);

    const mysqlConnection = {
      id: 'mysql-1',
      host: 'mysql.local',
      port: 3306,
      username: 'root',
      database: 'sample',
      engine: 'mysql' as const,
    };
    const postgresConnection = {
      id: 'pg-1',
      host: 'pg.local',
      port: 5432,
      username: 'postgres',
      database: 'appdb',
    };

    expect(await manager.getPooledClient(mysqlConnection as any)).to.equal(mysqlClient);
    expect(await manager.getPooledClient(postgresConnection as any)).to.equal(postgresClient);

    expect(mysqlStub.calledOnceWithExactly(mysqlConnection)).to.be.true;
    expect(postgresStub.calledOnceWithExactly(postgresConnection)).to.be.true;
  });

  it('delegates connection-id cleanup to the postgres driver', async () => {
    const manager = ConnectionManager.getInstance();
    const postgresDriver = getDriver('postgres') as any;
    const closeAllByIdStub = sandbox.stub(postgresDriver, 'closeAllConnectionsById').resolves();

    await manager.closeAllConnectionsById('conn-42');

    expect(closeAllByIdStub.calledOnceWithExactly('conn-42')).to.be.true;
  });
});
