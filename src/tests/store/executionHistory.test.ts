import { describe, it, expect, beforeEach, vi } from "vitest";
import useAppStore from "../../store/store";

/**
 * initContract / triggerContract keep a run-by-run history (executionHistory)
 * that the design-v2 Simulate step renders. These tests drive the store with a
 * mocked sandbox, answering as Trustblocks' runtime (trustblocks-logic.js)
 * does: init asks what can happen first; each trigger is one step --
 * {ok, response, state, transition, certifiedAs, now}, or a refusal.
 */
const PAY = "com.trustblocks.municipal.construction.payapplication@1.0.0.";
const LIFECYCLE = {
  stateType: "ContractorPayRequestState",
  states: [{ name: "RECEIVED" }, { name: "INSPECTED" }],
  transitions: [
    { event: "PayRequestReceived", from: [], to: "RECEIVED",
      requires: [{ credential: "Receipt", authority: "RECEIVE_PAY_APPLICATIONS" }] },
  ],
};
const FIRST_STEP = [{ event: "PayRequestReceived", to: "RECEIVED", requires: LIFECYCLE.transitions[0].requires }];

const step = (status: string, extra: object = {}) => ({
  ok: true,
  response: { $class: "com.trustblocks.lifecycle@1.0.0.TransitionResponse", to: status },
  state: { $class: PAY + "ContractorPayRequestState", payRequestId: "pr-1", status, ...extra },
  transition: { event: "PayRequestReceived", from: [], to: status },
  certifiedAs: { credential: "Receipt", authority: "RECEIVE_PAY_APPLICATIONS" },
  now: "2026-07-24T15:00:00.000Z",
});

describe("useAppStore - executionHistory", () => {
  beforeEach(() => {
    useAppStore.setState({
      compiledLogicJs: "(let [event (get request \"$class\")] {})",
      lifecycleJson: JSON.stringify(LIFECYCLE),
      simulateNow: "",
      data: `{"$class": "${PAY}ContractorPayRequest", "payRequestId": "pr-1"}`,
      requestJson: `{"$class": "${PAY}PayRequestReceived"}`,
      executionState: "",
      executionEvents: "",
      executionResponse: "",
      executionHistory: [],
      compilationErrors: [],
      isProblemPanelVisible: false,
    });
  });

  it("initContract starts a fresh history: no state yet, and what can happen first", async () => {
    const executeInSandbox = vi.fn().mockResolvedValue(FIRST_STEP);
    useAppStore.setState({ executionHistory: [{ id: "#1", method: "trigger" } as never], executeInSandbox });

    await useAppStore.getState().initContract();

    expect(executeInSandbox).toHaveBeenCalledWith("", "nextSteps", [LIFECYCLE, null]);
    const history = useAppStore.getState().executionHistory;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: "init",
      method: "init",
      request: { payRequestId: "pr-1" },
      response: { state: null, nextSteps: FIRST_STEP },
      stateBefore: null,
      stateAfter: {},
      events: [],
      error: null,
    });
    expect(typeof history[0].durationMs).toBe("number");
    expect(new Date(history[0].executedAt).toString()).not.toBe("Invalid Date");
    expect(useAppStore.getState().executionState).toBe("{}");
    expect(useAppStore.getState().executionResponse).toBe("");
  });

  it("initContract records a failed start with its error", async () => {
    useAppStore.setState({ executeInSandbox: vi.fn().mockRejectedValue(new Error("No runtime")) });

    await useAppStore.getState().initContract();

    const history = useAppStore.getState().executionHistory;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: "init", response: null, stateAfter: null, error: "Error: No runtime" });
  });

  it("triggerContract takes one step: the runtime gets the clause, lifecycle, model, data, request and state", async () => {
    const executeInSandbox = vi
      .fn()
      .mockResolvedValueOnce(FIRST_STEP)
      .mockResolvedValueOnce(step("RECEIVED"))
      .mockResolvedValueOnce(step("INSPECTED", { approvedPayItems: ["5.1"] }));
    useAppStore.setState({ executeInSandbox, modelCto: "namespace x@1.0.0", simulateNow: "2026-07-24T15:00:00.000Z" });

    const store = useAppStore.getState();
    await store.initContract();
    await store.triggerContract();
    await store.triggerContract();

    const [, method, [arg]] = executeInSandbox.mock.calls[1] as [string, string, [Record<string, unknown>]];
    expect(method).toBe("trigger");
    expect(arg).toMatchObject({
      logic: '(let [event (get request "$class")] {})',
      lifecycle: LIFECYCLE,
      model: "namespace x@1.0.0",
      data: { payRequestId: "pr-1" },
      request: { $class: PAY + "PayRequestReceived" },
      state: {},
      now: "2026-07-24T15:00:00.000Z",
    });

    const history = useAppStore.getState().executionHistory;
    expect(history.map((r) => r.id)).toEqual(["init", "#1", "#2"]);
    expect(history[1]).toMatchObject({
      method: "trigger",
      request: { $class: PAY + "PayRequestReceived" },
      response: {
        transition: { to: "RECEIVED" },
        certifiedAs: { credential: "Receipt", authority: "RECEIVE_PAY_APPLICATIONS" },
      },
      stateBefore: {},
      stateAfter: { status: "RECEIVED" },
      error: null,
    });
    expect(history[2]).toMatchObject({
      stateBefore: { status: "RECEIVED" },
      stateAfter: { status: "INSPECTED", approvedPayItems: ["5.1"] },
    });
  });

  it("without a time set, no now is sent -- the runtime takes the current time", async () => {
    const executeInSandbox = vi.fn().mockResolvedValueOnce(FIRST_STEP).mockResolvedValueOnce(step("RECEIVED"));
    useAppStore.setState({ executeInSandbox });

    await useAppStore.getState().initContract();
    await useAppStore.getState().triggerContract();

    const [, , [arg]] = executeInSandbox.mock.calls[1] as [string, string, [Record<string, unknown>]];
    expect(arg).not.toHaveProperty("now");
  });

  it("a refusal is a failed run, with the runtime's message and code, and the state unchanged", async () => {
    const executeInSandbox = vi
      .fn()
      .mockResolvedValueOnce(FIRST_STEP)
      .mockResolvedValueOnce({
        ok: false,
        code: "no-transition",
        error: "InspectionCertified cannot happen before the lifecycle has begun",
      });
    useAppStore.setState({ executeInSandbox });

    const store = useAppStore.getState();
    await store.initContract();
    await store.triggerContract();

    const state = useAppStore.getState();
    expect(state.executionHistory).toHaveLength(2);
    expect(state.executionHistory[1]).toMatchObject({
      id: "#1",
      response: null,
      stateBefore: {},
      stateAfter: {},
      events: [],
      error: "Error: InspectionCertified cannot happen before the lifecycle has begun (no-transition)",
    });
    expect(state.executionState).toBe("{}");
    expect(state.isProblemPanelVisible).toBe(true);
  });

  it("triggerContract records a request that is not valid JSON as a 'parse' run without calling the runtime", async () => {
    const executeInSandbox = vi.fn().mockResolvedValueOnce(FIRST_STEP);
    useAppStore.setState({ executeInSandbox });

    const store = useAppStore.getState();
    await store.initContract();
    useAppStore.setState({ requestJson: '{ "$class": "x" }}' });
    await store.triggerContract();

    const state = useAppStore.getState();
    expect(executeInSandbox).toHaveBeenCalledTimes(1);
    expect(state.executionHistory[1]).toMatchObject({
      id: "#1",
      stage: "parse",
      request: {},
      response: null,
      stateBefore: {},
      stateAfter: {},
    });
    expect(state.executionHistory[1].error).toMatch(/JSON/);
    expect(state.executionHistory[0].stage).toBe("run");
    expect(state.isProblemPanelVisible).toBe(true);
  });

  it("triggerContract numbers runs after failed ones too", async () => {
    const executeInSandbox = vi
      .fn()
      .mockResolvedValueOnce(FIRST_STEP)
      .mockResolvedValueOnce({ ok: false, code: "clause-refused", error: "nope" })
      .mockResolvedValueOnce(step("RECEIVED"));
    useAppStore.setState({ executeInSandbox });

    const store = useAppStore.getState();
    await store.initContract();
    await store.triggerContract();
    await store.triggerContract();

    expect(useAppStore.getState().executionHistory.map((r) => r.id)).toEqual(["init", "#1", "#2"]);
  });

  it("a template with a lifecycle and no clause runs too", async () => {
    const executeInSandbox = vi.fn().mockResolvedValueOnce(FIRST_STEP).mockResolvedValueOnce(step("RECEIVED"));
    useAppStore.setState({ executeInSandbox, compiledLogicJs: null });

    await useAppStore.getState().initContract();
    await useAppStore.getState().triggerContract();

    const [, , [arg]] = executeInSandbox.mock.calls[1] as [string, string, [Record<string, unknown>]];
    expect(arg.logic).toBe("");
    expect(useAppStore.getState().executionHistory[1]).toMatchObject({ stateAfter: { status: "RECEIVED" } });
  });

  it("triggerContract does not record anything when the contract is not started", async () => {
    await useAppStore.getState().triggerContract();
    expect(useAppStore.getState().executionHistory).toEqual([]);
  });

  it("clearExecutionHistory empties the list", () => {
    useAppStore.setState({ executionHistory: [{ id: "init" } as never] });
    useAppStore.getState().clearExecutionHistory();
    expect(useAppStore.getState().executionHistory).toEqual([]);
  });
});
