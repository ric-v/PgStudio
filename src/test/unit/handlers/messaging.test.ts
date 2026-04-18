import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { safelyPostMessage } from '../../../services/handlers/messaging';

describe('safelyPostMessage', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined as any);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns false when postMessage is undefined', async () => {
    const result = await safelyPostMessage(undefined, { type: 'x' }, { contextLabel: 'test' });
    expect(result).to.equal(false);
  });

  it('returns true when message is delivered', async () => {
    const postMessage = sandbox.stub().resolves(true);

    const result = await safelyPostMessage(postMessage, { type: 'ok' }, { contextLabel: 'test' });

    expect(result).to.equal(true);
    expect(postMessage.calledOnceWithExactly({ type: 'ok' })).to.equal(true);
    expect((vscode.window.showWarningMessage as any).called).to.equal(false);
  });

  it('returns false and warns when delivery returns false', async () => {
    const postMessage = sandbox.stub().resolves(false);

    const result = await safelyPostMessage(postMessage, { type: 'nope' }, {
      contextLabel: 'test',
      notifyOnFailure: true,
    });

    expect(result).to.equal(false);
    expect((vscode.window.showWarningMessage as any).calledOnce).to.equal(true);
  });

  it('returns false and warns when postMessage throws', async () => {
    const postMessage = sandbox.stub().rejects(new Error('panel closed'));

    const result = await safelyPostMessage(postMessage, { type: 'boom' }, {
      contextLabel: 'test',
      notifyOnFailure: true,
    });

    expect(result).to.equal(false);
    expect((vscode.window.showWarningMessage as any).calledOnce).to.equal(true);
  });
});
