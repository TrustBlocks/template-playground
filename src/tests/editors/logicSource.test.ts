import { describe, it, expect } from 'vitest';
// The bundle's text, as the sandbox receives it.
import runtimeSource from '../../../public/trustblocks-logic.js?raw';
import {
  DEFAULT_LOGIC_BOILERPLATE,
  describeLogicModel,
  scaffoldFromModel,
  nextLogicSource,
} from '../../editors/logicSource';
import * as counter from '../../samples/counterLogic';
import * as latePayment from '../../samples/latePaymentPenalty';
import * as employment from '../../samples/employmentOffer';
import * as helloworld from '../../samples/helloworld';

describe('describeLogicModel', () => {
  it('finds the template concept, request/response transactions and state asset', () => {
    const model = describeLogicModel(counter.MODEL);
    expect(model?.namespace).toBe('org.acme.counter@1.0.0');
    expect(model?.template?.name).toBe('CounterContract');
    expect(model?.request?.fqn).toBe('org.acme.counter@1.0.0.CounterRequest');
    expect(model?.response?.fqn).toBe('org.acme.counter@1.0.0.CounterResponse');
    expect(model?.state?.name).toBe('CounterState');
    expect(model?.state?.identifier).toBe('stateId');
    // System properties ($timestamp, $identifier) are not listed as fields.
    expect(model?.response?.fields.map((f) => f.name)).toEqual(['message', 'newCount']);
    expect(model?.state?.fields.map((f) => f.name)).toEqual(['stateId', 'count', 'owner']);
  });

  it('parses a model with unresolved imports (syntax only)', () => {
    const model = describeLogicModel(latePayment.MODEL);
    expect(model?.request?.name).toBe('LatePaymentRequest');
    expect(model?.response?.name).toBe('LatePaymentResponse');
  });

  it('reports no request/response for a model without transactions', () => {
    const model = describeLogicModel(helloworld.MODEL);
    expect(model?.template?.name).toBe('HelloWorld');
    expect(model?.request).toBeUndefined();
    expect(model?.response).toBeUndefined();
  });

  it('finds the request/response the gallery samples now declare', () => {
    const offer = describeLogicModel(employment.MODEL);
    expect(offer?.request?.name).toBe('AcceptanceRequest');
    expect(offer?.response?.name).toBe('AcceptanceResponse');
    expect(offer?.state?.name).toBe('OfferState');
  });

  it('is null for an empty or unparsable model', () => {
    expect(describeLogicModel('')).toBeNull();
    expect(describeLogicModel('namespace {')).toBeNull();
  });
});

/*
 * Trustblocks' clause runtime -- the same file the sandbox runs, brought in by
 * scripts/sync-trustblocks.mjs -- so a skeleton is held to what the runtime
 * accepts, not to how it reads.
 */
type Runtime = {
  check(logic: string): string | null;
  trigger(opts: object): { ok: boolean; error?: string; response?: Record<string, unknown>; state?: Record<string, unknown> };
};
const runtime = (): Runtime => {
  const g = globalThis as unknown as { TrustblocksLogic?: Runtime };
  if (!g.TrustblocksLogic) {
    new Function(runtimeSource)();
  }
  return g.TrustblocksLogic!;
};

describe('scaffoldFromModel', () => {
  it('answers the request transaction with the response, and merges the state asset', () => {
    const src = scaffoldFromModel(describeLogicModel(counter.MODEL));
    expect(src).toContain('(= event "org.acme.counter@1.0.0.CounterRequest")');
    expect(src).toContain('{:response {"$class" "org.acme.counter@1.0.0.CounterResponse"');
    expect(src).toContain('"$timestamp" now');
    expect(src).toContain('"message" ""');
    expect(src).toContain('"newCount" 0');
    expect(src).toContain(':state (merge state');
    expect(src).toContain('{"$class" "org.acme.counter@1.0.0.CounterState"');
    expect(src).toContain('"stateId" (get data "stateId")');
    expect(src).toContain('"count" 0');
    expect(src).toContain('"owner" ""');
    expect(src).toContain('(throw (ex-info (str "This contract does not answer " event) {}))');
  });

  it('gives each primitive a first value of its type', () => {
    const src = scaffoldFromModel(describeLogicModel(latePayment.MODEL));
    expect(src).toContain('"penalty" 0.0');
    expect(src).toContain('"sellerMayTerminate" false');
  });

  it('is a clause the runtime accepts, and runs', () => {
    const src = scaffoldFromModel(describeLogicModel(counter.MODEL));
    expect(runtime().check(src)).toBeNull();
    const step = runtime().trigger({
      logic: src,
      lifecycle: null,
      model: counter.MODEL,
      data: counter.DATA,
      request: { $class: 'org.acme.counter@1.0.0.CounterRequest', increment: 1 },
      state: null,
      now: '2026-07-24T15:00:00.000Z',
    });
    expect(step.ok, step.error).toBe(true);
    expect(step.response).toMatchObject({
      $class: 'org.acme.counter@1.0.0.CounterResponse',
      $timestamp: '2026-07-24T15:00:00.000Z',
    });
    expect(step.state).toMatchObject({ $class: 'org.acme.counter@1.0.0.CounterState' });
  });

  it('so is the generic boilerplate', () => {
    expect(runtime().check(DEFAULT_LOGIC_BOILERPLATE)).toBeNull();
  });

  it('falls back to the generic boilerplate without request/response', () => {
    expect(scaffoldFromModel(describeLogicModel(helloworld.MODEL))).toBe(DEFAULT_LOGIC_BOILERPLATE);
    expect(scaffoldFromModel(null)).toBe(DEFAULT_LOGIC_BOILERPLATE);
  });
});

describe('nextLogicSource', () => {
  it('keeps the editor content when there is any', () => {
    expect(nextLogicSource('class X {}', '', counter.MODEL)).toBe('class X {}');
  });

  it('uses the model skeleton, or the boilerplate, when both editor and committed logic are empty', () => {
    expect(nextLogicSource('', '', counter.MODEL)).toBe(scaffoldFromModel(describeLogicModel(counter.MODEL)));
    expect(nextLogicSource('  ', '', '')).toBe(DEFAULT_LOGIC_BOILERPLATE);
  });
});
