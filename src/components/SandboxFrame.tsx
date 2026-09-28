import { useEffect, useRef, useCallback } from "react";
import useAppStore from "../store/store";
import { sandboxResolvers } from "../store/sandboxResolvers";
import "../styles/components/SandboxFrame.css";

import {
  SANDBOX_READY,
  LOAD_RUNTIME,
  RUNTIME_LOADED,
  EXECUTION_RESULT,
  SandboxMessage,
} from "../constants/sandbox";

/** Trustblocks' clause runtime, built from trustblocks-templates (scripts/sync-trustblocks.mjs). */
const RUNTIME_URL = `${import.meta.env.BASE_URL}trustblocks-logic.js`;

/**
 * SandboxFrame renders a hidden, sandboxed iframe that serves as the
 * execution environment for user-authored contract logic.
 *
 * The iframe loads `/logic-handler.html` with `sandbox="allow-scripts"`
 * (omitting "allow-same-origin"), which forces the browser to assign it
 * a null origin — isolating it from the parent's DOM, storage, and memory.
 *
 * This component:
 * 1. Mounts the iframe and, when it is ready, sends it the logic runtime --
 *    trustblocks-logic.js, fetched here and passed as text, since the
 *    iframe may load no script by URL
 * 2. Registers the iframe with the Zustand store once the runtime is loaded
 * 3. Routes execution results to pending promise resolvers via the module-scoped resolver map
 */
export default function SandboxFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setSandboxRef = useAppStore((s) => s.setSandboxRef);
  const setSandboxReady = useAppStore((s) => s.setSandboxReady);

  const handleMessage = useCallback(
    (event: MessageEvent<SandboxMessage>) => {
      /*
       * Sandboxed iframes (sandbox="allow-scripts" without allow-same-origin)
       * are assigned an opaque origin by the browser, which serializes to the
       * literal string "null". This is intentional and is NOT a bug — it is
       * the standard way browsers represent opaque origins in postMessage events.
       */
      if (event.origin !== "null") return;

      const msg = event.data;
      if (!msg || typeof msg !== "object" || !msg.type) return;

      switch (msg.type) {
        case SANDBOX_READY:
          fetch(RUNTIME_URL)
            .then((response) => {
              if (!response.ok) throw new Error(`${RUNTIME_URL}: ${response.status}`);
              return response.text();
            })
            .then((source) => {
              iframeRef.current?.contentWindow?.postMessage({ type: LOAD_RUNTIME, source }, "*");
            })
            .catch((error: unknown) => {
              console.error("The logic runtime could not be loaded:", error);
            });
          break;

        case RUNTIME_LOADED:
          if (iframeRef.current) {
            setSandboxRef(iframeRef.current);
          }
          setSandboxReady(true);
          break;

        case EXECUTION_RESULT: {
          // Resolve the pending execution promise from the module-scoped resolver map
          if (msg.executionId !== undefined) {
            const resolver = sandboxResolvers.get(msg.executionId);
            if (resolver) {
              resolver(msg);
              sandboxResolvers.delete(msg.executionId);
            }
          }
          break;
        }
      }
    },
    [setSandboxRef, setSandboxReady],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      setSandboxRef(null);
      setSandboxReady(false);

      // Reject all pending resolvers on unmount to prevent stale promises
      for (const [id, resolver] of sandboxResolvers) {
        resolver({
          type: EXECUTION_RESULT,
          success: false,
          error: "Sandbox iframe was unmounted",
        });
        sandboxResolvers.delete(id);
      }
    };
  }, [handleMessage, setSandboxRef, setSandboxReady]);

  return (
    <iframe
      ref={iframeRef}
      src={`${import.meta.env.BASE_URL}logic-handler.html`}
      sandbox="allow-scripts"
      className="sandbox-frame-hidden"
      title="Logic Sandbox"
      aria-hidden="true"
    />
  );
}
