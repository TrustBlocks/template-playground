import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import useAppStore from "../../store/store";
import { sandboxResolvers } from "../../store/sandboxResolvers";
import { EXECUTION_RESULT } from "../../constants/sandbox";

describe("useAppStore - Sandbox State", () => {
  beforeEach(() => {
    localStorage.clear();
    sandboxResolvers.clear();
    useAppStore.setState({
      sandboxIframe: null,
      isSandboxReady: false,
      isExecuting: false,
      executionId: 0,
      // The default sample carries a lifecycle; these tests set their own.
      lifecycleJson: "",
      simulateNow: "",
    });
  });

  afterEach(() => {
    sandboxResolvers.clear();
  });

  describe("setSandboxRef", () => {
    it("should store the iframe reference", () => {
      const mockIframe = document.createElement("iframe");
      useAppStore.getState().setSandboxRef(mockIframe);
      expect(useAppStore.getState().sandboxIframe).toBe(mockIframe);
    });

    it("should accept null to clear the reference", () => {
      const mockIframe = document.createElement("iframe");
      useAppStore.getState().setSandboxRef(mockIframe);
      useAppStore.getState().setSandboxRef(null);
      expect(useAppStore.getState().sandboxIframe).toBeNull();
    });
  });

  describe("setSandboxReady", () => {
    it("should update the readiness flag", () => {
      expect(useAppStore.getState().isSandboxReady).toBe(false);
      useAppStore.getState().setSandboxReady(true);
      expect(useAppStore.getState().isSandboxReady).toBe(true);
    });
  });

  describe("executeInSandbox", () => {
    it("should reject when sandbox is not ready", async () => {
      await expect(
        useAppStore.getState().executeInSandbox("code", "trigger", []),
      ).rejects.toThrow("Sandbox is not ready");
    });

    it("should reject when iframe ref is null", async () => {
      useAppStore.setState({ isSandboxReady: true, sandboxIframe: null });
      await expect(
        useAppStore.getState().executeInSandbox("code", "trigger", []),
      ).rejects.toThrow("Sandbox is not ready");
    });

    it("should reject when an execution is already in progress", async () => {
      const mockIframe = document.createElement("iframe");
      Object.defineProperty(mockIframe, "contentWindow", {
        value: { postMessage: vi.fn() },
        writable: false,
      });

      useAppStore.setState({
        sandboxIframe: mockIframe,
        isSandboxReady: true,
        isExecuting: true,
        executionId: 0,
      });

      await expect(
        useAppStore.getState().executeInSandbox("code", "trigger", []),
      ).rejects.toThrow("An execution is already in progress");
    });

    it("should increment executionId and set isExecuting on dispatch", () => {
      // Create a mock iframe with a contentWindow that has postMessage
      const mockIframe = document.createElement("iframe");
      Object.defineProperty(mockIframe, "contentWindow", {
        value: { postMessage: vi.fn() },
        writable: false,
      });

      useAppStore.setState({
        sandboxIframe: mockIframe,
        isSandboxReady: true,
        executionId: 0,
      });

      // Fire and forget — we just want to verify state transitions
      void useAppStore.getState().executeInSandbox("code", "trigger", []);

      const state = useAppStore.getState();
      expect(state.executionId).toBe(1);
      expect(state.isExecuting).toBe(true);
    });

    it("should resolve when the resolver is called with success", async () => {
      const mockPostMessage = vi.fn();
      const mockIframe = document.createElement("iframe");
      Object.defineProperty(mockIframe, "contentWindow", {
        value: { postMessage: mockPostMessage },
        writable: false,
      });

      useAppStore.setState({
        sandboxIframe: mockIframe,
        isSandboxReady: true,
        executionId: 0,
      });

      const promise = useAppStore
        .getState()
        .executeInSandbox("code", "init", [{ data: "test" }]);

      // The resolver should now be registered with executionId = 1
      expect(sandboxResolvers.has(1)).toBe(true);

      // Simulate the sandbox resolving
      const resolver = sandboxResolvers.get(1);
      if (!resolver) throw new Error("Resolver not found");
      resolver({ success: true, result: { count: 5 }, type: EXECUTION_RESULT });

      const result = await promise;
      expect(result).toEqual({ count: 5 });
      expect(useAppStore.getState().isExecuting).toBe(false);
    });

    it("should reject when the resolver is called with failure", async () => {
      const mockIframe = document.createElement("iframe");
      Object.defineProperty(mockIframe, "contentWindow", {
        value: { postMessage: vi.fn() },
        writable: false,
      });

      useAppStore.setState({
        sandboxIframe: mockIframe,
        isSandboxReady: true,
        executionId: 0,
      });

      const promise = useAppStore
        .getState()
        .executeInSandbox("code", "trigger", []);

      // Simulate the sandbox reporting an error
      const resolver = sandboxResolvers.get(1);
      if (!resolver) throw new Error("Resolver not found");
      resolver({
        success: false,
        error: "Logic threw an error",
        type: EXECUTION_RESULT,
      });

      await expect(promise).rejects.toThrow("Logic threw an error");
      expect(useAppStore.getState().isExecuting).toBe(false);
    });

    it("should reject if the client-side timeout is reached", async () => {
      vi.useFakeTimers();

      const mockIframe = document.createElement("iframe");
      Object.defineProperty(mockIframe, "contentWindow", {
        value: { postMessage: vi.fn() },
        writable: false,
      });

      useAppStore.setState({
        sandboxIframe: mockIframe,
        isSandboxReady: true,
        executionId: 0,
      });

      const promise = useAppStore
        .getState()
        .executeInSandbox("code", "trigger", []);

      // Advance time by the 6000ms client timeout
      vi.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow(
        "Execution timed out after 6000ms (client-side fallback)",
      );
      expect(useAppStore.getState().isExecuting).toBe(false);
      expect(sandboxResolvers.has(1)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("initContract", () => {
    it("should do nothing if compiledLogicJs is null", async () => {
      useAppStore.setState({ compiledLogicJs: null });
      await useAppStore.getState().initContract();
      expect(useAppStore.getState().executionState).toBe("");
    });

    it("should start with no state, and ask the runtime what can happen first", async () => {
      const lifecycle = { stateType: "S", transitions: [{ event: "Received", from: [], to: "RECEIVED", requires: [] }] };
      const executeInSandboxMock = vi.fn().mockResolvedValue([{ event: "Received", to: "RECEIVED", requires: [] }]);

      useAppStore.setState({
        compiledLogicJs: "some_code",
        lifecycleJson: JSON.stringify(lifecycle),
        data: '{"owner": "Alice"}',
        executeInSandbox: executeInSandboxMock
      });

      await useAppStore.getState().initContract();

      const state = useAppStore.getState();
      expect(executeInSandboxMock).toHaveBeenCalledWith("", "nextSteps", [lifecycle, null]);
      expect(state.executionState).toBe("{}");
      expect(state.executionEvents).toBe("[]");
      expect(state.compilationErrors).toEqual([]);
    });

    it("should not call the runtime for a clause with no lifecycle", async () => {
      const executeInSandboxMock = vi.fn();
      useAppStore.setState({ compiledLogicJs: "some_code", data: "{}", executeInSandbox: executeInSandboxMock });

      await useAppStore.getState().initContract();

      expect(executeInSandboxMock).not.toHaveBeenCalled();
      expect(useAppStore.getState().executionState).toBe("{}");
    });

    it("should catch errors, format them, and open the problems panel", async () => {
      const executeInSandboxMock = vi.fn().mockRejectedValue(new Error("Init failed"));

      useAppStore.setState({
        compiledLogicJs: "some_code",
        lifecycleJson: '{"transitions": []}',
        data: '{"owner": "Alice"}',
        executeInSandbox: executeInSandboxMock,
        compilationErrors: [],
        isProblemPanelVisible: false
      });

      await useAppStore.getState().initContract();

      const state = useAppStore.getState();
      expect(state.compilationErrors.length).toBe(1);
      expect(state.compilationErrors[0].message).toContain("Execution Error: Error: Init failed");
      expect(state.isProblemPanelVisible).toBe(true);
    });
  });

  describe("triggerContract", () => {
    it("should do nothing if compiledLogicJs is null", async () => {
      useAppStore.setState({ compiledLogicJs: null });
      await useAppStore.getState().triggerContract();
      expect(useAppStore.getState().executionResponse).toBe("");
    });

    it("should block execution and open Problems panel if contract is not initialized", async () => {
      useAppStore.setState({
        compiledLogicJs: "some_code",
        executionState: "",
        compilationErrors: [],
        isProblemPanelVisible: false
      });
      await useAppStore.getState().triggerContract();
      const state = useAppStore.getState();
      expect(state.compilationErrors.length).toBe(1);
      expect(state.compilationErrors[0].message).toContain("Execution Error: Contract must be initialized before triggering.");
      expect(state.isProblemPanelVisible).toBe(true);
    });

    it("should take one step through the runtime and update the executionResponse", async () => {
      const executeInSandboxMock = vi.fn().mockResolvedValue({
        ok: true,
        response: { $class: "test_response", value: 42 },
        state: { $class: "test_state", count: 2 },
        transition: null,
        certifiedAs: null,
        now: "2026-07-24T15:00:00.000Z",
      });

      useAppStore.setState({
        compiledLogicJs: "some_code",
        modelCto: "namespace test@1.0.0",
        data: '{"owner": "Alice"}',
        requestJson: '{"increment": 1}',
        executionState: '{"count": 1}',
        executeInSandbox: executeInSandboxMock
      });

      await useAppStore.getState().triggerContract();

      const state = useAppStore.getState();
      expect(executeInSandboxMock).toHaveBeenCalledWith("", "trigger", [{
        logic: "some_code",
        lifecycle: null,
        model: "namespace test@1.0.0",
        data: { owner: "Alice" },
        request: { increment: 1 },
        state: { count: 1 },
      }]);
      expect(state.executionResponse).toContain('"value": 42');
      expect(state.executionResponse).toContain('"now": "2026-07-24T15:00:00.000Z"');
      expect(state.executionState).toContain('"count": 2');
      expect(state.executionEvents).toBe("[]");
      expect(state.compilationErrors).toEqual([]);
    });

    it("should report a refusal with its message and code", async () => {
      useAppStore.setState({
        compiledLogicJs: "some_code",
        data: "{}",
        requestJson: "{}",
        executionState: "{}",
        executeInSandbox: vi.fn().mockResolvedValue({ ok: false, code: "clause-refused", error: "Not approved" }),
        compilationErrors: [],
      });

      await useAppStore.getState().triggerContract();

      expect(useAppStore.getState().compilationErrors[0].message)
        .toContain("Execution Error: Error: Not approved (clause-refused)");
    });

    it("should handle runtime errors in trigger pipeline", async () => {
      const executeInSandboxMock = vi.fn().mockRejectedValue(new Error("Trigger failed"));

      useAppStore.setState({
        compiledLogicJs: "some_code",
        data: '{"owner": "Alice"}',
        requestJson: '{}',
        executionState: '{}',
        executeInSandbox: executeInSandboxMock,
        compilationErrors: [],
        isProblemPanelVisible: false
      });

      await useAppStore.getState().triggerContract();

      const state = useAppStore.getState();
      expect(state.compilationErrors.length).toBe(1);
      expect(state.compilationErrors[0].message).toContain("Execution Error: Error: Trigger failed");
      expect(state.isProblemPanelVisible).toBe(true);
    });
  });
});
