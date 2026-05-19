import { expect } from '@open-wc/testing';

import { RuleStore } from '../src/rule-store.js';
import type { HassConnection, Rule, SubscribeEvent } from '../src/types.js';

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '01ABC',
    target: 'light.kitchen',
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
    conn.initialRules = [rule(), rule({ id: '02XYZ', target: 'light.b' })];
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
      rule: rule({ id: '03', target: 'light.c' }),
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
