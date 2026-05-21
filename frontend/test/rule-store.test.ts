import { expect } from '@open-wc/testing';

import { RuleStore } from '../src/rule-store.js';
import type { HassConnection, Rule, SubscribeEvent } from '../src/types.js';

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '01ABC',
    targets: ['light.kitchen'],
    source: 'sensor.temp',
    mode: 'mapping',
    mapping: { on: { color: '#fff' } },
    enabled: true,
    priority: 10,
    created: '',
    updated: '',
    source_kind: 'ui',
    ...overrides,
  };
}

class FakeConnection implements HassConnection {
  initialRules: Rule[] = [];
  private subscriber: ((e: SubscribeEvent) => void) | null = null;
  unsubscribed = false;

  async sendMessagePromise<R>(message: { type: string }): Promise<R> {
    if (message.type === 'smart_icons/list') {
      return { rules: [...this.initialRules] } as unknown as R;
    }
    throw new Error(`FakeConnection: unexpected message ${message.type}`);
  }

  async subscribeMessage<E>(
    cb: (event: E) => void,
    _message: { type: string }
  ): Promise<() => Promise<void>> {
    this.subscriber = cb as unknown as (e: SubscribeEvent) => void;
    return async () => {
      this.subscriber = null;
      this.unsubscribed = true;
    };
  }

  async subscribeEvents(): Promise<() => Promise<void>> {
    return async () => {};
  }

  emit(event: SubscribeEvent): void {
    this.subscriber?.(event);
  }
}

describe('RuleStore', () => {
  it('hydrates from initial list on connect', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [rule(), rule({ id: '02XYZ', targets: ['light.b'] })];
    const store = new RuleStore();
    await store.connect(conn);
    expect(store.all()).to.have.lengthOf(2);
    expect(store.byTarget('light.b')).to.have.lengthOf(1);
  });

  it('applies added events', async () => {
    const conn = new FakeConnection();
    const store = new RuleStore();
    await store.connect(conn);
    conn.emit({
      type: 'added',
      id: '03',
      rule: rule({ id: '03', targets: ['light.c'] }),
    });
    expect(store.byTarget('light.c')).to.have.lengthOf(1);
  });

  it('applies updated events (replaces existing rule)', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [rule({ id: '01ABC', priority: 10 })];
    const store = new RuleStore();
    await store.connect(conn);
    conn.emit({
      type: 'updated',
      id: '01ABC',
      rule: rule({ id: '01ABC', priority: 99 }),
    });
    expect(store.all()[0].priority).to.equal(99);
  });

  it('applies removed events', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [rule()];
    const store = new RuleStore();
    await store.connect(conn);
    conn.emit({ type: 'removed', id: '01ABC', rule: rule() });
    expect(store.all()).to.have.lengthOf(0);
  });

  it('emits to subscribers, including immediately on subscribe', async () => {
    const conn = new FakeConnection();
    const store = new RuleStore();
    await store.connect(conn);
    let calls = 0;
    store.subscribe(() => calls++);
    expect(calls).to.equal(1);
    conn.emit({ type: 'added', id: 'x', rule: rule({ id: 'x' }) });
    expect(calls).to.equal(2);
  });

  it('sources() returns unique source ids across enabled rules only', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [
      rule({ id: '01', source: 'sensor.a' }),
      rule({ id: '02', source: 'sensor.a' }),
      rule({ id: '03', source: 'sensor.b' }),
      rule({ id: '04', source: 'sensor.c', enabled: false }),
    ];
    const store = new RuleStore();
    await store.connect(conn);
    expect([...store.sources()].sort()).to.eql(['sensor.a', 'sensor.b']);
  });

  it('disconnect tears down subscription and clears cache', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [rule()];
    const store = new RuleStore();
    await store.connect(conn);
    await store.disconnect();
    expect(conn.unsubscribed).to.be.true;
    expect(store.all()).to.have.lengthOf(0);
  });
});

describe('RuleStore localStorage cache', () => {
  const CACHE_KEY = 'smart_icons.rules_cache.v1';

  beforeEach(() => {
    localStorage.removeItem(CACHE_KEY);
  });

  it('hydrateFromCache returns 0 when no cache exists', () => {
    const store = new RuleStore();
    expect(store.hydrateFromCache()).to.equal(0);
    expect(store.all()).to.have.lengthOf(0);
  });

  it('connect writes the server snapshot to cache', async () => {
    const conn = new FakeConnection();
    conn.initialRules = [rule({ id: '01' }), rule({ id: '02', targets: ['light.b'] })];
    const store = new RuleStore();
    await store.connect(conn);

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    expect(cached.rules).to.have.lengthOf(2);
    expect(cached.rules.map((r: Rule) => r.id).sort()).to.eql(['01', '02']);
  });

  it('hydrateFromCache loads previously-cached rules synchronously', async () => {
    // Prime the cache via a first session.
    const conn1 = new FakeConnection();
    conn1.initialRules = [rule({ id: '01', targets: ['light.a'] })];
    const store1 = new RuleStore();
    await store1.connect(conn1);

    // Fresh store, hydrate without connecting.
    const store2 = new RuleStore();
    const n = store2.hydrateFromCache();
    expect(n).to.equal(1);
    expect(store2.byTarget('light.a')).to.have.lengthOf(1);
  });

  it('hydrate then connect: server snapshot replaces cache contents', async () => {
    // Cache has rule A; server says rule B exists instead. Connect wins.
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rules: [rule({ id: 'stale', targets: ['light.gone'] })] })
    );

    const store = new RuleStore();
    store.hydrateFromCache();
    expect(store.byTarget('light.gone')).to.have.lengthOf(1);

    const conn = new FakeConnection();
    conn.initialRules = [rule({ id: 'fresh', targets: ['light.new'] })];
    await store.connect(conn);

    expect(store.byTarget('light.gone')).to.have.lengthOf(0);
    expect(store.byTarget('light.new')).to.have.lengthOf(1);
  });

  it('subscribe events update the cache', async () => {
    const conn = new FakeConnection();
    const store = new RuleStore();
    await store.connect(conn);

    conn.emit({ type: 'added', id: 'X', rule: rule({ id: 'X' }) });
    let cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    expect(cached.rules.map((r: Rule) => r.id)).to.include('X');

    conn.emit({ type: 'removed', id: 'X', rule: rule({ id: 'X' }) });
    cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    expect(cached.rules.map((r: Rule) => r.id)).to.not.include('X');
  });

  it('hydrateFromCache survives corrupt cache contents', () => {
    localStorage.setItem(CACHE_KEY, '{not valid json');
    const store = new RuleStore();
    expect(store.hydrateFromCache()).to.equal(0);
    expect(store.all()).to.have.lengthOf(0);
  });
});
