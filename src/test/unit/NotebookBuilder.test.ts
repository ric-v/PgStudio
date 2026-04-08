/**
 * Unit tests for NotebookBuilder.show() persistent session logic.
 * Task 3.1 — Requirements: 2.1, 2.2, 2.3, 4.2, 5.2, 5.3
 */
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

// We need to reset the module-level _extensionContext between tests.
// Import the module under test after setting up stubs.
import { NotebookBuilder } from '../../commands/helper';
import { SessionRegistry } from '../../services/SessionRegistry';

function makeContext(globalStorageUri?: vscode.Uri): vscode.ExtensionContext {
  return {
    globalStorageUri: globalStorageUri ?? vscode.Uri.file('/global-storage'),
    subscriptions: [],
    workspaceState: { get: () => undefined, update: async () => {} } as any,
    globalState: { get: () => undefined, update: async () => {} } as any,
    extensionUri: vscode.Uri.file('/ext'),
    extension: { packageJSON: {} },
    secrets: { get: async () => undefined, store: async () => {}, delete: async () => {} }
  } as any;
}

function makeNotebookDoc(uri: vscode.Uri, cellCount = 0, isClosed = false): vscode.NotebookDocument {
  const doc = new (vscode.NotebookDocument as any)(uri) as any;
  doc.cellCount = cellCount;
  doc.isClosed = isClosed;
  return doc as vscode.NotebookDocument;
}

describe('NotebookBuilder.show()', () => {
  let sandbox: sinon.SinonSandbox;
  let prevApplyEdit: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Clear registry before each test
    (SessionRegistry as any).map?.clear?.();
    // Reset context
    NotebookBuilder.setContext(undefined as any);
    // Default workspace.notebookDocuments to empty
    (vscode.workspace as any).notebookDocuments = [];
    // Save and replace applyEdit directly (avoids double-stub issues with other test files)
    prevApplyEdit = (vscode.workspace as any).applyEdit;
    (vscode.workspace as any).applyEdit = async (_edit: any) => true;
  });

  afterEach(() => {
    sandbox.restore();
    NotebookBuilder.setContext(undefined as any);
    (SessionRegistry as any).map?.clear?.();
    (vscode.workspace as any).applyEdit = prevApplyEdit;
  });

  // ── Legacy path ──────────────────────────────────────────────────────────

  it('falls back to createAndShowNotebook when no context is set (Req 5.3)', async () => {
    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(makeNotebookDoc(vscode.Uri.file('/tmp/nb')));
    const showNotebook = sandbox.stub(vscode.window, 'showNotebookDocument').resolves(new (vscode.NotebookEditor as any)());

    const builder = new NotebookBuilder({ connectionId: 'conn-1' });
    builder.addSql('SELECT 1');
    await builder.show();

    // openNotebookDocument called with type string (legacy path)
    expect(openNotebook.calledOnce).to.be.true;
    expect(openNotebook.firstCall.args[0]).to.equal('postgres-notebook');
    expect(showNotebook.calledOnce).to.be.true;
  });

  it('falls back to createAndShowNotebook when connectionId is absent (Req 5.3)', async () => {
    NotebookBuilder.setContext(makeContext());
    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(makeNotebookDoc(vscode.Uri.file('/tmp/nb')));
    const showNotebook = sandbox.stub(vscode.window, 'showNotebookDocument').resolves(new (vscode.NotebookEditor as any)());

    const builder = new NotebookBuilder({ /* no connectionId */ });
    builder.addSql('SELECT 1');
    await builder.show();

    expect(openNotebook.calledOnce).to.be.true;
    expect(openNotebook.firstCall.args[0]).to.equal('postgres-notebook');
    expect(showNotebook.calledOnce).to.be.true;
  });

  // ── New file path ─────────────────────────────────────────────────────────

  it('creates directory, opens new notebook, inserts cells, registers in registry (Req 1.2, 1.5, 2.3)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-1.pgsql');
    const doc = makeNotebookDoc(scratchUri, 0);

    const createDir = sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    // stat throws → file does not exist
    sandbox.stub(vscode.workspace.fs, 'stat').rejects(new Error('FileNotFound'));
    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(doc);
    const applyEditSpy = sinon.spy();
    (vscode.workspace as any).applyEdit = async (edit: any) => { applyEditSpy(edit); return true; };
    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    const showNotebook = sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-1', host: 'localhost', databaseName: 'mydb' });
    builder.addSql('SELECT 1');
    await builder.show();

    expect(createDir.calledOnce).to.be.true;
    // Opens with 'postgres-notebook' type for new file (Req 1.4)
    expect(openNotebook.calledOnce).to.be.true;
    expect(openNotebook.firstCall.args[0]).to.equal('postgres-notebook');
    expect(applyEditSpy.calledOnce).to.be.true;
    expect(showNotebook.calledOnce).to.be.true;
    // Registered in registry
    expect(SessionRegistry.get('conn-1')).to.equal(doc);
  });

  it('opens existing file by URI when scratch file exists (Req 1.3, 3.1)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-2.pgsql');
    const doc = makeNotebookDoc(scratchUri, 2);

    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    // stat resolves → file exists
    sandbox.stub(vscode.workspace.fs, 'stat').resolves({ type: 1, ctime: 0, mtime: 0, size: 100 });
    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(doc);
    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-2', host: 'localhost', databaseName: 'mydb' });
    builder.addSql('SELECT 2');
    await builder.show();

    // Opens by URI (not by type string) to preserve existing content
    expect(openNotebook.calledOnce).to.be.true;
    const firstArg = openNotebook.firstCall.args[0];
    expect(firstArg).to.not.equal('postgres-notebook');
    expect(firstArg.toString()).to.include('scratch-conn-2.pgsql');
  });

  // ── Append path ───────────────────────────────────────────────────────────

  it('appends cells to already-open document and reveals last cell (Req 2.1, 2.2, 4.2)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-3.pgsql');
    const doc = makeNotebookDoc(scratchUri, 3, false);
    SessionRegistry.set('conn-3', doc);

    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument');
    const applyEditSpy = sinon.spy();
    (vscode.workspace as any).applyEdit = async (edit: any) => { applyEditSpy(edit); return true; };
    const mockEditor = new (vscode.NotebookEditor as any)();
    const revealRange = sandbox.stub(mockEditor, 'revealRange');
    const showNotebook = sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-3' });
    builder.addSql('SELECT 3');
    await builder.show();

    // Should NOT open a new document
    expect(openNotebook.called).to.be.false;
    // Should apply edit to append cells
    expect(applyEditSpy.calledOnce).to.be.true;
    // Should show/focus existing document
    expect(showNotebook.calledOnce).to.be.true;
    expect(showNotebook.firstCall.args[0]).to.equal(doc);
    // Should reveal last cell
    expect(revealRange.calledOnce).to.be.true;
  });

  // ── Closed document path ──────────────────────────────────────────────────

  it('treats closed document as absent and re-opens scratch file (Req 6.3)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-4.pgsql');
    // Registry has a closed document
    const closedDoc = makeNotebookDoc(scratchUri, 1, true /* isClosed */);
    SessionRegistry.set('conn-4', closedDoc);

    const freshDoc = makeNotebookDoc(scratchUri, 1, false);
    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    sandbox.stub(vscode.workspace.fs, 'stat').resolves({ type: 1, ctime: 0, mtime: 0, size: 50 });
    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(freshDoc);
    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-4' });
    builder.addSql('SELECT 4');
    await builder.show();

    // Should have opened a new document (not used the closed one)
    expect(openNotebook.calledOnce).to.be.true;
    // Registry should now point to the fresh document
    expect(SessionRegistry.get('conn-4')).to.equal(freshDoc);
  });

  // ── Metadata restoration (file-open path) ────────────────────────────────

  it('restores connection metadata after opening an existing scratch file (Req 3.3)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-meta.pgsql');
    // Existing doc has stale/empty metadata
    const doc = makeNotebookDoc(scratchUri, 1);
    (doc as any).metadata = {};

    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    // stat resolves → file exists
    sandbox.stub(vscode.workspace.fs, 'stat').resolves({ type: 1, ctime: 0, mtime: 0, size: 100 });
    sandbox.stub(vscode.workspace, 'openNotebookDocument').resolves(doc);

    const updateMetaSpy = sinon.spy();
    const updateNotebookMetadataStub = sinon.stub(vscode.NotebookEdit, 'updateNotebookMetadata').callsFake((meta: any) => {
      updateMetaSpy(meta);
      return new (vscode.NotebookEdit as any)(0, []);
    });

    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-meta', host: 'db.example.com', databaseName: 'mydb' });
    builder.addSql('SELECT 1');
    await builder.show();

    // updateNotebookMetadata should have been called with the connection info
    expect(updateMetaSpy.called).to.be.true;
    const metaArg = updateMetaSpy.firstCall.args[0];
    expect(metaArg).to.have.property('connectionId', 'conn-meta');
    expect(metaArg).to.have.property('host', 'db.example.com');
    expect(metaArg).to.have.property('database', 'mydb');

    updateNotebookMetadataStub.restore();
  });

  it('includes all required metadata fields when creating a new scratch file (Req 3.3)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    sandbox.stub(vscode.workspace.fs, 'stat').rejects(new Error('FileNotFound'));

    let capturedData: vscode.NotebookData | undefined;
    sandbox.stub(vscode.workspace, 'openNotebookDocument').callsFake(async (_typeOrUri: any, data?: any) => {
      capturedData = data;
      return makeNotebookDoc(vscode.Uri.file('/global-storage/scratch-conn-newmeta.pgsql'), 0);
    });

    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-newmeta', host: 'pg.host', databaseName: 'testdb' });
    builder.addSql('SELECT 1');
    await builder.show();

    expect(capturedData).to.not.be.undefined;
    expect(capturedData!.metadata).to.have.property('connectionId', 'conn-newmeta');
    expect(capturedData!.metadata).to.have.property('host', 'pg.host');
    expect(capturedData!.metadata).to.have.property('database', 'testdb');
    expect(capturedData!.metadata).to.have.property('databaseName', 'testdb');
  });

  // ── Duplicate-tab guard ───────────────────────────────────────────────────

  it('detects duplicate open tab by URI and focuses it without opening a new document (Req 4.3)', async () => {
    const ctx = makeContext(vscode.Uri.file('/global-storage'));
    NotebookBuilder.setContext(ctx);

    const scratchUri = vscode.Uri.file('/global-storage/scratch-conn-5.pgsql');
    // Registry is empty but the document is already open in workspace
    const existingDoc = makeNotebookDoc(scratchUri, 2, false);
    (vscode.workspace as any).notebookDocuments = [existingDoc];

    const openNotebook = sandbox.stub(vscode.workspace, 'openNotebookDocument');
    const applyEditSpy = sinon.spy();
    (vscode.workspace as any).applyEdit = async (edit: any) => { applyEditSpy(edit); return true; };
    const mockEditor = new (vscode.NotebookEditor as any)();
    mockEditor.revealRange = sandbox.stub();
    const showNotebook = sandbox.stub(vscode.window, 'showNotebookDocument').resolves(mockEditor);

    const builder = new NotebookBuilder({ connectionId: 'conn-5' });
    builder.addSql('SELECT 5');
    await builder.show();

    // Should NOT open a second document
    expect(openNotebook.called).to.be.false;
    // Should focus the existing document
    expect(showNotebook.calledOnce).to.be.true;
    expect(showNotebook.firstCall.args[0]).to.equal(existingDoc);
    // Registry should now track it
    expect(SessionRegistry.get('conn-5')).to.equal(existingDoc);
  });
});
