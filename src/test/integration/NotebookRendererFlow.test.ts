import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { PostgresKernel } from '../../providers/NotebookKernel';
import { MessageHandlerRegistry } from '../../services/MessageHandler';

describe('Notebook renderer flow smoke test', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('routes notebook renderer messages through the handler registry', async () => {
    let onDidReceiveMessageCallback: ((event: any) => Promise<void>) | undefined;
    const controllerStub = {
      supportsExecutionOrder: false,
      executeHandler: undefined as any,
      dispose: sandbox.stub(),
      onDidReceiveMessage: (cb: (event: any) => Promise<void>) => {
        onDidReceiveMessageCallback = cb;
      }
    };

    sandbox.stub(vscode.notebooks, 'createNotebookController').returns(controllerStub as any);
    sandbox.stub(vscode.languages, 'registerCompletionItemProvider').returns({ dispose: sandbox.stub() } as any);

    const registerStub = sandbox.stub();
    const handleMessageStub = sandbox.stub().resolves();
    sandbox.stub(MessageHandlerRegistry, 'getInstance').returns({
      register: registerStub,
      handleMessage: handleMessageStub
    } as any);

    const contextStub = { subscriptions: [] } as any;
    const messagingStub = {
      postMessage: sandbox.stub().resolves(true)
    } as any;

    new PostgresKernel(contextStub, messagingStub, 'postgres-notebook');

    expect(onDidReceiveMessageCallback).to.not.equal(undefined);

    const editor = { notebook: { uri: { toString: () => 'notebook-uri' } } };
    await onDidReceiveMessageCallback!({
      message: { type: 'showErrorMessage', error: 'x' },
      editor
    });

    expect(handleMessageStub.calledOnce).to.be.true;
    expect(handleMessageStub.firstCall.args[0]).to.deep.equal({ type: 'showErrorMessage', error: 'x' });
    expect(handleMessageStub.firstCall.args[1]).to.have.property('postMessage');
    expect(typeof handleMessageStub.firstCall.args[1].postMessage).to.equal('function');
  });
});
