import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { formatSqlCommand } from '../../commands/formatSql';
import { SqlFormatterService } from '../../services/SqlFormatterService';

describe('formatSqlCommand', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    delete (vscode.window as any).activeTextEditor;
    delete (vscode.window as any).setStatusBarMessage;
  });

  it('shows info when there is no active editor', async () => {
    (vscode.window as any).activeTextEditor = undefined;
    const infoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

    await formatSqlCommand();

    expect(infoStub.calledOnceWithExactly('No active editor to format')).to.be.true;
  });

  it('formats selected SQL text when selection is not empty', async () => {
    const replaceStub = sandbox.stub();
    const editStub = sandbox.stub().callsFake(async (cb: any) => {
      cb({ replace: replaceStub });
      return true;
    });
    const setStatusBarStub = sandbox.stub();
    (vscode.window as any).setStatusBarMessage = setStatusBarStub;

    const editor = {
      document: {
        languageId: 'sql',
        getText: sandbox.stub().returns('select * from users')
      },
      selection: { isEmpty: false },
      edit: editStub
    } as any;
    (vscode.window as any).activeTextEditor = editor;

    const formatter = {
      format: sandbox.stub().resolves('SELECT *\nFROM users'),
      formatDocument: sandbox.stub().resolves([])
    } as any;
    sandbox.stub(SqlFormatterService, 'getInstance').returns(formatter);

    await formatSqlCommand();

    expect(formatter.format.calledOnceWithExactly('select * from users')).to.be.true;
    expect(editStub.calledOnce).to.be.true;
    expect(replaceStub.calledOnceWithExactly(editor.selection, 'SELECT *\nFROM users')).to.be.true;
    expect(setStatusBarStub.calledOnceWithExactly('$(check) SQL formatted (selection)', 3000)).to.be.true;
  });

  it('formats full document when there is no selection', async () => {
    const statusStub = sandbox.stub();
    (vscode.window as any).setStatusBarMessage = statusStub;

    const doc = {
      languageId: 'postgres',
      uri: vscode.Uri.file('/tmp/query.sql'),
      getText: sandbox.stub().returns('select 1')
    } as any;

    (vscode.window as any).activeTextEditor = {
      document: doc,
      selection: { isEmpty: true }
    } as any;

    const edits = [{ range: { start: 0, end: 1 }, newText: 'SELECT 1;' }] as any;
    const formatter = {
      format: sandbox.stub().resolves('SELECT 1;'),
      formatDocument: sandbox.stub().resolves(edits)
    } as any;
    sandbox.stub(SqlFormatterService, 'getInstance').returns(formatter);

    const applyEditStub = sandbox.stub(vscode.workspace, 'applyEdit').resolves(true);

    await formatSqlCommand();

    expect(formatter.formatDocument.calledOnceWithExactly(doc)).to.be.true;
    expect(applyEditStub.calledOnce).to.be.true;
    expect(statusStub.calledOnceWithExactly('$(check) SQL formatted', 3000)).to.be.true;
  });

  it('reports unsupported language ids', async () => {
    const infoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    (vscode.window as any).activeTextEditor = {
      document: { languageId: 'typescript' },
      selection: { isEmpty: true }
    } as any;

    await formatSqlCommand();

    expect(infoStub.calledOnce).to.be.true;
    expect(infoStub.firstCall.args[0]).to.contain('Format SQL is not available for typescript files');
  });
});
