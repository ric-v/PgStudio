import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConnectionManager } from '../../services/ConnectionManager';
import {
  ExportRequestHandler,
  ImportRequestHandler,
  ShowConnectionSwitcherHandler,
  ShowDatabaseSwitcherHandler,
  ShowErrorMessageHandler
} from '../../services/handlers/CoreHandlers';
import { ConnectionUtils } from '../../utils/connectionUtils';

describe('CoreHandlers', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('ShowConnectionSwitcherHandler updates metadata when connection changes', async () => {
    const statusBar = { update: sandbox.stub() };
    const handler = new ShowConnectionSwitcherHandler(statusBar);
    sandbox.stub(ConnectionUtils, 'showConnectionPicker').resolves({
      id: 'c2',
      name: 'b',
      database: 'db2',
      host: 'h',
      port: 5432,
      username: 'u'
    });
    const update = sandbox.stub(ConnectionUtils, 'updateNotebookMetadata').resolves();

    await handler.handle(
      { connectionId: 'c1' },
      {
        editor: { notebook: { metadata: {} } } as unknown as vscode.NotebookEditor
      }
    );

    expect(update.calledOnce).to.be.true;
    expect(statusBar.update.calledOnce).to.be.true;
  });

  it('ShowConnectionSwitcherHandler does nothing when picker returns same id', async () => {
    const handler = new ShowConnectionSwitcherHandler({ update: sandbox.stub() });
    sandbox.stub(ConnectionUtils, 'showConnectionPicker').resolves({
      id: 'c1',
      database: 'db',
      host: 'h',
      port: 5432,
      username: 'u'
    });
    const update = sandbox.stub(ConnectionUtils, 'updateNotebookMetadata').resolves();

    await handler.handle(
      { connectionId: 'c1' },
      {
        editor: { notebook: {} } as unknown as vscode.NotebookEditor
      }
    );

    expect(update.called).to.be.false;
  });

  it('ShowDatabaseSwitcherHandler updates database when picker changes', async () => {
    const statusBar = { update: sandbox.stub() };
    const handler = new ShowDatabaseSwitcherHandler(statusBar);
    sandbox.stub(ConnectionUtils, 'findConnection').returns({
      id: 'c1',
      host: 'localhost',
      port: 5432,
      database: 'postgres'
    });
    sandbox.stub(ConnectionUtils, 'showDatabasePicker').resolves('otherdb');
    const update = sandbox.stub(ConnectionUtils, 'updateNotebookMetadata').resolves();

    await handler.handle(
      { connectionId: 'c1', currentDatabase: 'postgres' },
      {
        editor: { notebook: { metadata: {} } } as unknown as vscode.NotebookEditor
      }
    );

    expect(update.calledOnce).to.be.true;
    expect(statusBar.update.calledOnce).to.be.true;
  });

  it('ShowDatabaseSwitcherHandler shows error when connection missing', async () => {
    const handler = new ShowDatabaseSwitcherHandler({ update: sandbox.stub() });
    sandbox.stub(ConnectionUtils, 'findConnection').returns(undefined);

    await handler.handle(
      { connectionId: 'c1', currentDatabase: 'postgres' },
      {
        editor: { notebook: {} } as unknown as vscode.NotebookEditor
      }
    );

    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Connection not found')).to.be
      .true;
  });

  it('ImportRequestHandler imports rows in batches', async () => {
    const handler = new ImportRequestHandler();
    const query = sandbox.stub();
    const release = sandbox.stub();
    const getPooled = sandbox.stub().resolves({ query, release });
    sandbox.stub(ConnectionManager, 'getInstance').returns({
      getPooledClient: getPooled
    } as unknown as ConnectionManager);
    sandbox.stub(ConnectionUtils, 'findConnection').returns({
      id: 'c1',
      host: 'localhost',
      port: 5432,
      username: 'u',
      database: 'postgres'
    });

    query.onCall(0).resolves({});
    query.onCall(1).resolves({});
    query.onCall(2).resolves({});

    await handler.handle(
      {
        table: 't',
        schema: 'public',
        data: [{ a: 1, b: 'x' }]
      },
      {
        editor: {
          notebook: { metadata: { connectionId: 'c1' } }
        } as unknown as vscode.NotebookEditor
      }
    );

    expect(query.firstCall.args[0]).to.equal('BEGIN');
    expect(query.getCall(1).args[0]).to.contain('INSERT INTO');
    expect(query.lastCall.args[0]).to.equal('COMMIT');
    expect(release.calledOnce).to.be.true;
  });

  it('ImportRequestHandler shows error when notebook has no connectionId', async () => {
    const handler = new ImportRequestHandler();
    await handler.handle(
      { table: 't', schema: 'public', data: [{ a: 1 }] },
      {
        editor: {
          notebook: { metadata: {} }
        } as unknown as vscode.NotebookEditor
      }
    );
    expect(
      (vscode.window.showErrorMessage as sinon.SinonStub).calledWith('No active connection found for this notebook.')
    ).to.be.true;
  });

  it('ImportRequestHandler shows error when connection is missing from settings', async () => {
    const handler = new ImportRequestHandler();
    sandbox.stub(ConnectionUtils, 'findConnection').returns(undefined);
    await handler.handle(
      { table: 't', schema: 'public', data: [{ a: 1 }] },
      {
        editor: {
          notebook: { metadata: { connectionId: 'c1' } }
        } as unknown as vscode.NotebookEditor
      }
    );
    expect(
      (vscode.window.showErrorMessage as sinon.SinonStub).calledWith('Connection configuration not found.')
    ).to.be.true;
  });

  it('ImportRequestHandler rolls back and shows error when insert fails', async () => {
    const handler = new ImportRequestHandler();
    const query = sandbox.stub();
    const release = sandbox.stub();
    const getPooled = sandbox.stub().resolves({ query, release });
    sandbox.stub(ConnectionManager, 'getInstance').returns({
      getPooledClient: getPooled
    } as unknown as ConnectionManager);
    sandbox.stub(ConnectionUtils, 'findConnection').returns({
      id: 'c1',
      host: 'localhost',
      port: 5432,
      username: 'u',
      database: 'postgres'
    });

    query.onCall(0).resolves({});
    query.onCall(1).rejects(new Error('constraint failed'));

    await handler.handle(
      { table: 't', schema: 'public', data: [{ a: 1 }] },
      {
        editor: {
          notebook: { metadata: { connectionId: 'c1' } }
        } as unknown as vscode.NotebookEditor
      }
    );

    expect(query.getCall(2).args[0]).to.equal('ROLLBACK');
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith(sinon.match(/Import failed: constraint failed/))).to.be
      .true;
    expect(release.calledOnce).to.be.true;
  });

  it('ImportRequestHandler warns when no data', async () => {
    const messages: string[] = [];
    const prev = vscode.window.showWarningMessage;
    (vscode.window as any).showWarningMessage = async (msg: string) => {
      messages.push(msg);
      return undefined;
    };
    const handler = new ImportRequestHandler();
    sandbox.stub(ConnectionUtils, 'findConnection').returns({ id: 'c1' });
    try {
      await handler.handle(
        { table: 't', schema: 'public', data: [] },
        {
          editor: {
            notebook: { metadata: { connectionId: 'c1' } }
          } as unknown as vscode.NotebookEditor
        }
      );
      expect(messages).to.include('No data received for import.');
    } finally {
      (vscode.window as any).showWarningMessage = prev;
    }
  });

  it('ExportRequestHandler copies CSV to clipboard', async () => {
    const handler = new ExportRequestHandler();
    const prevPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = async () => 'Copy to Clipboard';
    const prevEnv = vscode.env;
    const writeText = sandbox.stub().resolves();
    (vscode as any).env = {
      clipboard: { writeText }
    };
    try {
      await handler.handle({
        rows: [{ id: 1, name: 'a' }],
        columns: ['id', 'name']
      });
      expect(writeText.calledOnce).to.be.true;
    } finally {
      (vscode.window as any).showQuickPick = prevPick;
      (vscode as any).env = prevEnv;
    }
  });

  it('ExportRequestHandler saves CSV when save dialog returns uri', async () => {
    const handler = new ExportRequestHandler();
    const prevPick = vscode.window.showQuickPick;
    const prevSave = vscode.window.showSaveDialog;
    (vscode.window as any).showQuickPick = async () => 'Save as CSV';
    const uri = vscode.Uri.file('/tmp/out.csv');
    (vscode.window as any).showSaveDialog = async () => uri;
    const writeFile = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
    try {
      await handler.handle({
        rows: [{ id: 1 }],
        columns: ['id']
      });
      expect(writeFile.calledOnce).to.be.true;
    } finally {
      (vscode.window as any).showQuickPick = prevPick;
      (vscode.window as any).showSaveDialog = prevSave;
    }
  });

  it('ExportRequestHandler saves JSON when selected', async () => {
    const handler = new ExportRequestHandler();
    const prevPick = vscode.window.showQuickPick;
    const prevSave = vscode.window.showSaveDialog;
    (vscode.window as any).showQuickPick = async () => 'Save as JSON';
    const uri = vscode.Uri.file('/tmp/out.json');
    (vscode.window as any).showSaveDialog = async () => uri;
    const writeFile = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
    try {
      await handler.handle({
        rows: [{ id: 1 }],
        columns: ['id']
      });
      expect(writeFile.calledOnce).to.be.true;
    } finally {
      (vscode.window as any).showQuickPick = prevPick;
      (vscode.window as any).showSaveDialog = prevSave;
    }
  });

  it('ShowErrorMessageHandler forwards message', async () => {
    const handler = new ShowErrorMessageHandler();
    await handler.handle({ message: 'boom' });
    expect((vscode.window.showErrorMessage as sinon.SinonStub).calledWith('boom')).to.be.true;
  });
});
