import { expect } from 'chai';
import * as sinon from 'sinon';
import { SchemaCache, getSchemaCache } from '../../lib/schema-cache';

describe('SchemaCache', () => {
  let cache: SchemaCache;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    cache = new SchemaCache();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should store and retrieve values', async () => {
    const fetcher = sinon.stub().resolves('data');
    const result1 = await cache.getOrFetch('key', fetcher);
    expect(result1).to.equal('data');
    expect(fetcher.calledOnce).to.be.true;

    const result2 = await cache.getOrFetch('key', fetcher);
    expect(result2).to.equal('data');
    expect(fetcher.calledOnce).to.be.true; // Should be cached
  });

  it('should expire values after TTL', async () => {
    const fetcher = sinon.stub().resolves('data');
    await cache.getOrFetch('key', fetcher, 1000);

    // Advance time 500ms
    clock.tick(500);
    await cache.getOrFetch('key', fetcher, 1000);
    expect(fetcher.calledOnce).to.be.true;

    // Advance past TTL (total 1500ms)
    clock.tick(1000);
    await cache.getOrFetch('key', fetcher, 1000);
    expect(fetcher.calledTwice).to.be.true;
  });

  it('should invalidate specific keys', async () => {
    const fetcher = sinon.stub().resolves('data');
    await cache.getOrFetch('key1', fetcher);
    await cache.getOrFetch('key2', fetcher);

    cache.invalidate('key1');

    await cache.getOrFetch('key1', fetcher);
    expect(fetcher.callCount).to.equal(3); // 1 (initial key1) + 1 (key2) + 1 (refetch key1)

    // key2 should still be cached if we didn't use fetcher for it?
    // Wait, if I call getOrFetch('key2', fetcher), fetcher count shouldn't increase
    await cache.getOrFetch('key2', fetcher);
    expect(fetcher.callCount).to.equal(3);
  });

  it('should invalidate connection cache', async () => {
    const fetcher = sinon.stub().resolves('data');
    const key = SchemaCache.buildKey('conn1', 'db1');
    await cache.getOrFetch(key, fetcher);

    cache.invalidateConnection('conn1');

    await cache.getOrFetch(key, fetcher);
    expect(fetcher.calledTwice).to.be.true;
  });

  it('should build keys correctly', () => {
    const key = SchemaCache.buildKey('conn1', 'db1', 'schema1', 'cat1');
    expect(key).to.equal('conn:conn1:db:db1:schema:schema1:cat:cat1');
  });

  it('should clear all cache', async () => {
    const fetcher = sinon.stub().resolves('data');
    await cache.getOrFetch('key1', fetcher);

    cache.clear();

    const stats = cache.getStats();
    expect(stats.size).to.equal(0);
  });

  it('invalidate() with no pattern clears entire cache', async () => {
    const fetcher = sinon.stub().resolves('data');
    await cache.getOrFetch('a', fetcher);
    await cache.getOrFetch('b', fetcher);
    cache.invalidate();
    await cache.getOrFetch('a', fetcher);
    await cache.getOrFetch('b', fetcher);
    expect(fetcher.callCount).to.equal(4);
  });

  it('invalidateDatabase removes keys for that connection and database', async () => {
    const fetcher = sinon.stub().resolves('x');
    const key = SchemaCache.buildKey('c1', 'db1');
    await cache.getOrFetch(key, fetcher);
    cache.invalidateDatabase('c1', 'db1');
    await cache.getOrFetch(key, fetcher);
    expect(fetcher.calledTwice).to.be.true;
  });

  it('invalidateSchema removes keys for connection, database, and schema', async () => {
    const fetcher = sinon.stub().resolves('x');
    const key = SchemaCache.buildKey('c1', 'db1', 'public');
    await cache.getOrFetch(key, fetcher);
    cache.invalidateSchema('c1', 'db1', 'public');
    await cache.getOrFetch(key, fetcher);
    expect(fetcher.calledTwice).to.be.true;
  });

  it('getStats sums accessCount across entries', async () => {
    const fetcher = sinon.stub().resolves('v');
    await cache.getOrFetch('k1', fetcher);
    await cache.getOrFetch('k1', fetcher);
    await cache.getOrFetch('k2', fetcher);
    const stats = cache.getStats();
    expect(stats.totalAccess).to.equal(3);
  });

  it('getStats memory estimate uses MB when cache is large', async () => {
    const fetcher = sinon.stub().resolves(0);
    const keys = Array.from({ length: 1025 }, (_, i) => `bulk-${i}`);
    await Promise.all(keys.map(k => cache.getOrFetch(k, fetcher)));
    const stats = cache.getStats();
    expect(stats.memorySizeEstimate).to.match(/^\d+\.\d+MB$/);
  });

  it('applies short adaptive TTL after many hits on the same key', async () => {
    const fetcher = sinon.stub().resolves('v');
    for (let i = 0; i < 12; i++) {
      await cache.getOrFetch('hot', fetcher);
    }
    expect(fetcher.calledOnce).to.be.true;
    clock.tick(31000);
    await cache.getOrFetch('hot', fetcher);
    expect(fetcher.calledTwice).to.be.true;
  });

  it('getSchemaCache returns singleton instance', () => {
    const a = getSchemaCache();
    const b = getSchemaCache();
    expect(a).to.equal(b);
  });
});
