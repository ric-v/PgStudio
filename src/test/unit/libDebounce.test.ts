import { expect } from 'chai';
import * as sinon from 'sinon';
import { Debouncer, ThrottledFunction } from '../../lib/debounce';

describe('debounce', () => {
  it('Debouncer runs fn after delay', async () => {
    const clock = sinon.useFakeTimers();
    const fn = sinon.stub();
    const d = new Debouncer();
    d.debounce('k', fn, 100);
    expect(fn.called).to.be.false;
    clock.tick(100);
    expect(fn.calledOnce).to.be.true;
    clock.restore();
  });

  it('Debouncer cancel clears pending', () => {
    const clock = sinon.useFakeTimers();
    const fn = sinon.stub();
    const d = new Debouncer();
    d.debounce('k', fn, 100);
    d.cancel('k');
    clock.tick(100);
    expect(fn.called).to.be.false;
    clock.restore();
  });

  it('Debouncer clear clears all', () => {
    const clock = sinon.useFakeTimers();
    const d = new Debouncer();
    d.debounce('a', sinon.stub(), 50);
    d.debounce('b', sinon.stub(), 50);
    d.clear();
    expect(d.getPendingCount()).to.equal(0);
    clock.restore();
  });

  it('ThrottledFunction invokes fn', async () => {
    const fn = sinon.stub().resolves();
    const t = new ThrottledFunction(fn, 0);
    await t.call(1);
    expect(fn.calledWith(1)).to.be.true;
  });

  it('Debouncer clears prior timer when debouncing same key again', () => {
    const clock = sinon.useFakeTimers();
    const fn = sinon.stub();
    const d = new Debouncer();
    d.debounce('k', fn, 100);
    d.debounce('k', fn, 100);
    clock.tick(100);
    expect(fn.calledOnce).to.be.true;
    clock.restore();
  });

  it('Debouncer cancel is no-op when key is not pending', () => {
    const d = new Debouncer();
    d.cancel('missing');
    expect(d.getPendingCount()).to.equal(0);
  });

  it('ThrottledFunction schedules deferred invocation when within delay window', async () => {
    const clock = sinon.useFakeTimers({ now: 10_000 });
    const fn = sinon.stub().resolves();
    const t = new ThrottledFunction(fn, 50);
    await t.call('a');
    expect(fn.calledOnce).to.be.true;
    await t.call('b');
    await clock.tickAsync(50);
    expect(fn.calledTwice).to.be.true;
    expect(fn.secondCall.calledWith('b')).to.be.true;
    clock.restore();
  });
});
