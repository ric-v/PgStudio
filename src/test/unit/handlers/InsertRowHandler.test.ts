import { expect } from 'chai';
import * as sinon from 'sinon';
import { ConnectionManager } from '../../../services/ConnectionManager';
import { InsertRowHandler } from '../../../services/handlers/InsertRowHandler';

describe('InsertRowHandler', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function stubClient(resultRows: any[] = []) {
    const query = sandbox.stub().resolves({ rows: resultRows });
    const release = sandbox.stub();
    sandbox.stub(ConnectionManager, 'getInstance').returns({
      getPooledClient: sandbox.stub().resolves({ query, release }),
    } as any);
    return { query, release };
  }

  it('inserts filtered values and returns the inserted row', async () => {
    const client = stubClient([{ id: 7, name: 'Ada', active: true }]);
    const postMessage = sandbox.stub().resolves(true);

    await new InsertRowHandler().handle(
      {
        type: 'insertRow',
        tableInfo: { schema: 'public', table: 'users' } as any,
        values: {
          id: '',
          name: 'Ada',
          active: '__NULL__',
          note: undefined,
        },
        tempId: 'tmp-1',
      },
      {
        editor: {
          notebook: {
            metadata: {
              connectionId: 'conn-1',
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              databaseName: 'postgres',
            },
          },
        },
        postMessage,
      } as any,
    );

    expect(client.query.calledOnce).to.be.true;
    const [sql, params] = client.query.firstCall.args;
    expect(sql).to.equal(
      'INSERT INTO "public"."users" ("name", "active") VALUES ($1, $2) RETURNING *',
    );
    expect(params).to.deep.equal(['Ada', null]);
    expect(
      postMessage.calledOnceWithMatch({
        type: 'insertSuccess',
        tempId: 'tmp-1',
        actualRow: { id: 7, name: 'Ada', active: true },
      }),
    ).to.be.true;
    expect(client.release.calledOnce).to.be.true;
  });

  it('returns insertFailed when all values are filtered out', async () => {
    const client = stubClient();
    const postMessage = sandbox.stub().resolves(true);

    await new InsertRowHandler().handle(
      {
        type: 'insertRow',
        tableInfo: { schema: 'public', table: 'users' } as any,
        values: {
          name: '',
          notes: undefined,
        },
        tempId: 'tmp-2',
      },
      {
        editor: {
          notebook: {
            metadata: {
              connectionId: 'conn-1',
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              databaseName: 'postgres',
            },
          },
        },
        postMessage,
      } as any,
    );

    expect(client.query.called).to.be.false;
    expect(
      postMessage.calledOnceWithMatch({
        type: 'insertFailed',
        tempId: 'tmp-2',
        error: 'No values provided for INSERT',
      }),
    ).to.be.true;
    expect(client.release.calledOnce).to.be.true;
  });

  it('returns insertFailed when connection metadata is missing', async () => {
    const getInstanceStub = sandbox.stub(ConnectionManager, 'getInstance');
    const postMessage = sandbox.stub().resolves(true);

    await new InsertRowHandler().handle(
      {
        type: 'insertRow',
        tableInfo: { schema: 'public', table: 'users' } as any,
        values: { name: 'Ada' },
        tempId: 'tmp-3',
      },
      {
        editor: {
          notebook: {
            metadata: {},
          },
        },
        postMessage,
      } as any,
    );

    expect(getInstanceStub.called).to.be.false;
    expect(
      postMessage.calledOnceWithMatch({
        type: 'insertFailed',
        tempId: 'tmp-3',
        error: 'No active connection found',
      }),
    ).to.be.true;
  });
});
