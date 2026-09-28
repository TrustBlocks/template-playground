import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { SANDBOX_READY, LOAD_RUNTIME, RUNTIME_LOADED, EXECUTION_RESULT } from "../../constants/sandbox";
import useAppStore from "../../store/store";
import { sandboxResolvers } from "../../store/sandboxResolvers";
import SandboxFrame from "../../components/SandboxFrame";

describe("SandboxFrame", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      sandboxIframe: null,
      isSandboxReady: false,
    });
    sandboxResolvers.clear();
  });

  afterEach(() => {
    sandboxResolvers.clear();
    cleanup();
  });

  it("should render a hidden iframe with correct sandbox attributes", () => {
    const { container } = render(<SandboxFrame />);
    const iframe = container.querySelector("iframe");

    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
    expect(iframe).toHaveAttribute("src", "/logic-handler.html");
    expect(iframe).toHaveAttribute("title", "Logic Sandbox");
    expect(iframe).toHaveAttribute("aria-hidden", "true");
    expect(iframe).toHaveClass("sandbox-frame-hidden");
  });

  it("on sandbox-ready, sends the iframe the logic runtime; ready once it is loaded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("/* runtime */") });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<SandboxFrame />);
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessage = vi.fn();
    Object.defineProperty(iframe, "contentWindow", { value: { postMessage } });

    window.dispatchEvent(new MessageEvent("message", { data: { type: SANDBOX_READY }, origin: "null" }));
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith("/trustblocks-logic.js");
    expect(postMessage).toHaveBeenCalledWith({ type: LOAD_RUNTIME, source: "/* runtime */" }, "*");
    // Not ready until the runtime is in the worker
    expect(useAppStore.getState().isSandboxReady).toBe(false);

    window.dispatchEvent(new MessageEvent("message", { data: { type: RUNTIME_LOADED }, origin: "null" }));
    expect(useAppStore.getState().isSandboxReady).toBe(true);
    vi.unstubAllGlobals();
  });

  it("should ignore messages from non-null origins", () => {
    render(<SandboxFrame />);

    const maliciousEvent = new MessageEvent("message", {
      data: { type: SANDBOX_READY },
      origin: "https://malicious.com",
    });
    window.dispatchEvent(maliciousEvent);

    expect(useAppStore.getState().isSandboxReady).toBe(false);
  });

  it("should ignore messages with unrecognized types", () => {
    render(<SandboxFrame />);

    const unknownEvent = new MessageEvent("message", {
      data: { type: "unknown-type" },
      origin: "null",
    });
    window.dispatchEvent(unknownEvent);

    expect(useAppStore.getState().isSandboxReady).toBe(false);
  });

  it("should route execution-result messages to resolvers", () => {
    render(<SandboxFrame />);

    // Set up a mock resolver in the module-scoped map
    const mockResolver = vi.fn();
    sandboxResolvers.set(42, mockResolver);

    const resultEvent = new MessageEvent("message", {
      data: {
        type: EXECUTION_RESULT,
        executionId: 42,
        success: true,
        result: { count: 5 },
      },
      origin: "null",
    });
    window.dispatchEvent(resultEvent);

    expect(mockResolver).toHaveBeenCalledWith({
      type: EXECUTION_RESULT,
      executionId: 42,
      success: true,
      result: { count: 5 },
    });
    // Resolver should be cleaned up after use
    expect(sandboxResolvers.has(42)).toBe(false);
  });

  it("should reject pending resolvers and reset state on unmount", () => {
    const { unmount } = render(<SandboxFrame />);

    // Simulate a pending execution
    const mockResolver = vi.fn();
    sandboxResolvers.set(99, mockResolver);

    // Unmount the component
    unmount();

    // The pending resolver should have been called with an error
    expect(mockResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Sandbox iframe was unmounted",
      }),
    );
    // Resolver map should be cleared
    expect(sandboxResolvers.size).toBe(0);
    // Store should be reset
    expect(useAppStore.getState().isSandboxReady).toBe(false);
    expect(useAppStore.getState().sandboxIframe).toBeNull();
  });
});
