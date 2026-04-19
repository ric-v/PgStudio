import { expect } from 'chai';
import * as sinon from 'sinon';

import { ConnectionManager } from '../../services/ConnectionManager';
import { getDriver } from '../../core/db/registry';

describe('ConnectionManager', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    (ConnectionManager as any).instance = undefined;
  });

  it('is a singleton', () => {
    const instance1 = ConnectionManager.getInstance();
    const instance2 = ConnectionManager.getInstance();
    expect(instance1).to.equal(instance2);
  });

  it('delegates pooled and session clients to the registered engine driver', async () => {
    const manager = ConnectionManager.getInstance();
    const mysqlDriver = getDriver('mysql') as any;
    const postgresDriver = getDriver('postgres') as any;

    const mysqlPooledClient = { query: sandbox.stub(), release: sandbox.stub() };
    const mysqlSessionClient = { query: sandbox.stub(), on: sandbox.stub(), end: sandbox.stub().resolves() };
    const postgresPooledClient = { query: sandbox.stub(), release: sandbox.stub() };
    const postgresSessionClient = { query: sandbox.stub(), on: sandbox.stub(), end: sandbox.stub().resolves() };

    const mysqlPooledStub = sandbox.stub(mysqlDriver, 'getPooledClient').resolves(mysqlPooledClient);
    const mysqlSessionStub = sandbox.stub(mysqlDriver, 'getSessionClient').resolves(mysqlSessionClient);
    const postgresPooledStub = sandbox.stub(postgresDriver, 'getPooledClient').resolves(postgresPooledClient);
    const postgresSessionStub = sandbox.stub(postgresDriver, 'getSessionClient').resolves(postgresSessionClient);

    const mysqlConnection = {
      id: 'mysql-1',
      host: 'localhost',
      port: 3306,
      username: 'root',
      database: 'sample',
      engine: 'mysql' as const,
    };
    const postgresConnection = {
      id: 'pg-1',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'appdb',
    };

    expect(await manager.getPooledClient(mysqlConnection as any)).to.equal(mysqlPooledClient);
    expect(await manager.getSessionClient(mysqlConnection as any, 'session-1')).to.equal(mysqlSessionClient);
    expect(await manager.getPooledClient(postgresConnection as any)).to.equal(postgresPooledClient);
    expect(await manager.getSessionClient(postgresConnection as any, 'session-2')).to.equal(postgresSessionClient);

    expect(mysqlPooledStub.calledOnceWithExactly(mysqlConnection)).to.be.true;
    expect(mysqlSessionStub.calledOnceWithExactly(mysqlConnection, 'session-1')).to.be.true;
    expect(postgresPooledStub.calledOnceWithExactly(postgresConnection)).to.be.true;
    expect(postgresSessionStub.calledOnceWithExactly(postgresConnection, 'session-2')).to.be.true;
  });

  it('delegates close operations and metrics to the postgres driver', async () => {
    const manager = ConnectionManager.getInstance();
    const postgresDriver = getDriver('postgres') as any;

    const metrics = [{ connectionId: 'pg-1', totalConnections: 1, idleConnections: 0, waitingRequests: 0, createdAt: 1, lastActivity: 1 }];
    const getPoolMetricsStub = sandbox.stub(postgresDriver, 'getPoolMetrics').callsFake((connectionId: string) =>
      connectionId === 'pg-1' ? metrics[0] : undefined
    );
    const getAllPoolMetricsStub = sandbox.stub(postgresDriver, 'getAllPoolMetrics').returns(metrics);
    const closeSessionStub = sandbox.stub(postgresDriver, 'closeSession').resolves();
    const closeConnectionStub = sandbox.stub(postgresDriver, 'closeConnection').resolves();
    const closeAllByIdStub = sandbox.stub(postgresDriver, 'closeAllConnectionsById').resolves();
    const closeAllStub = sandbox.stub(postgresDriver, 'closeAll').resolves();

    expect(manager.getPoolMetrics('pg-1')).to.equal(metrics[0]);
    expect(manager.getAllPoolMetrics()).to.deep.equal(metrics);

    const postgresConnection = {
      id: 'pg-1',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'appdb',
    };

    await manager.closeSession(postgresConnection as any, 'session-9');
    await manager.closeConnection(postgresConnection as any);
    await manager.closeAllConnectionsById('pg-1');
    await manager.closeAll();

    expect(getPoolMetricsStub.calledOnceWithExactly('pg-1')).to.be.true;
    expect(getAllPoolMetricsStub.calledOnce).to.be.true;
    expect(closeSessionStub.calledOnceWithExactly(postgresConnection, 'session-9')).to.be.true;
    expect(closeConnectionStub.calledOnceWithExactly(postgresConnection)).to.be.true;
    expect(closeAllByIdStub.calledOnceWithExactly('pg-1')).to.be.true;
    expect(closeAllStub.calledOnce).to.be.true;
  });
});
