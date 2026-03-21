import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../services/ConnectionManager';
import {
  SavepointCreateHandler,
  SavepointReleaseHandler,
  SavepointRollbackHandler,
  TransactionBeginHandler,
  TransactionCommitHandler,
  TransactionRollbackHandler
} from '../../services/handlers/TransactionHandlers';
import * as TransactionModule from '../../services/TransactionManager';
import { ConnectionUtils } from '../../utils/connectionUtils';

describe('TransactionHandlers', () => {
  let sandbox: sinon.SinonSandbox;
  let query: sinon.SinonStub;
  let fakeClient: { query: sinon.SinonStub };
  let txManager: {
    beginTransaction: sinon.SinonStub;
    commitTransaction: sinon.SinonStub;
    rollbackTransaction: sinon.SinonStub;
    createSavepoint: sinon.SinonStub;
    releaseSavepoint: sinon.SinonStub;
    rollbackToSavepoint: sinon.SinonStub;
    getTransactionSummary: sinon.SinonStub;
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    query = sandbox.stub();
    fakeClient = { query };
    sandbox.stub(ConnectionManager, 'getInstance').returns({
      getSessionClient: sandbox.stub().resolves(fakeClient)
    } as unknown as ConnectionManager);
    sandbox.stub(ConnectionUtils, 'findConnection').returns({
      id: 'c1',
      host: 'localhost',
      port: 5432,
      username: 'u',
      database: 'postgres'
    });
    txManager = {
      beginTransaction: sandbox.stub().resolves(),
      commitTransaction: sandbox.stub().resolves(),
      rollbackTransaction: sandbox.stub().resolves(),
      createSavepoint: sandbox.stub().resolves('sp1'),
      releaseSavepoint: sandbox.stub().resolves(),
      rollbackToSavepoint: sandbox.stub().resolves(),
      getTransactionSummary: sandbox.stub().returns('Tx active')
    };
    sandbox.stub(TransactionModule, 'getTransactionManager').returns(txManager as any);
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
  });

  afterEach(() => {
    sandbox.restore();
  });

  function notebookEditor(): vscode.NotebookEditor {
    return {
      notebook: {
        metadata: { connectionId: 'c1', databaseName: 'postgres' },
        uri: { toString: () => 'nb:1' }
      } as unknown as vscode.NotebookDocument
    } as vscode.NotebookEditor;
  }

  it('TransactionBeginHandler begins transaction', async () => {
    const handler = new TransactionBeginHandler();
    await handler.handle(
      { isolationLevel: 'READ COMMITTED', readOnly: false, deferrable: false },
      { editor: notebookEditor() }
    );
    expect(txManager.beginTransaction.calledOnce).to.be.true;
    expect(txManager.getTransactionSummary.calledOnce).to.be.true;
  });

  it('TransactionCommitHandler commits', async () => {
    const handler = new TransactionCommitHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect(txManager.commitTransaction.calledOnce).to.be.true;
  });

  it('TransactionRollbackHandler rolls back', async () => {
    const handler = new TransactionRollbackHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect(txManager.rollbackTransaction.calledOnce).to.be.true;
  });

  it('SavepointCreateHandler creates savepoint', async () => {
    const handler = new SavepointCreateHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect(txManager.createSavepoint.calledOnce).to.be.true;
  });

  it('SavepointReleaseHandler releases', async () => {
    const handler = new SavepointReleaseHandler();
    await handler.handle({ savepointName: 'sp' }, { editor: notebookEditor() });
    expect(txManager.releaseSavepoint.calledOnce).to.be.true;
  });

  it('SavepointRollbackHandler rolls back to savepoint', async () => {
    const handler = new SavepointRollbackHandler();
    await handler.handle({ savepointName: 'sp' }, { editor: notebookEditor() });
    expect(txManager.rollbackToSavepoint.calledOnce).to.be.true;
  });

  it('TransactionBeginHandler shows error when begin fails', async () => {
    txManager.beginTransaction.rejects(new Error('cannot start'));
    const handler = new TransactionBeginHandler();
    await handler.handle(
      { isolationLevel: 'READ COMMITTED', readOnly: false, deferrable: false },
      { editor: notebookEditor() }
    );
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to begin transaction: cannot start')).to.be
      .true;
  });

  it('TransactionCommitHandler shows error when commit fails', async () => {
    txManager.commitTransaction.rejects(new Error('lost'));
    const handler = new TransactionCommitHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to commit transaction: lost')).to.be.true;
  });

  it('TransactionRollbackHandler shows error when rollback fails', async () => {
    txManager.rollbackTransaction.rejects(new Error('network'));
    const handler = new TransactionRollbackHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to rollback transaction: network')).to.be
      .true;
  });

  it('SavepointCreateHandler shows error when createSavepoint fails', async () => {
    txManager.createSavepoint.rejects(new Error('no active transaction'));
    const handler = new SavepointCreateHandler();
    await handler.handle({}, { editor: notebookEditor() });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to create savepoint: no active transaction')).to
      .be.true;
  });

  it('SavepointReleaseHandler shows error when release fails', async () => {
    txManager.releaseSavepoint.rejects(new Error('missing'));
    const handler = new SavepointReleaseHandler();
    await handler.handle({ savepointName: 'sp' }, { editor: notebookEditor() });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to release savepoint: missing')).to.be.true;
  });

  it('SavepointRollbackHandler shows error when rollback to savepoint fails', async () => {
    txManager.rollbackToSavepoint.rejects(new Error('gone'));
    const handler = new SavepointRollbackHandler();
    await handler.handle({ savepointName: 'sp' }, { editor: notebookEditor() });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Failed to rollback savepoint: gone')).to.be.true;
  });
});
