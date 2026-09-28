/**
 * Message types exchanged between the main application and the sandbox iframe.
 */

/**
 * Sent by the iframe on load to signal availability.
 */
export const SANDBOX_READY = "sandbox-ready";

/**
 * Sent by the playground with the logic runtime's source (trustblocks-logic.js),
 * once, after SANDBOX_READY. The iframe can load no script by URL, so the
 * runtime arrives as text.
 */
export const LOAD_RUNTIME = "load-runtime";

/**
 * Sent by the iframe once its worker has the runtime: the sandbox can run logic.
 */
export const RUNTIME_LOADED = "runtime-loaded";

/**
 * Sent by the iframe to relay Worker execution outcomes back to the playground.
 */
export const EXECUTION_RESULT = "execution-result";

export type SandboxMessageType =
  | typeof SANDBOX_READY
  | typeof RUNTIME_LOADED
  | typeof EXECUTION_RESULT;

/**
 * Represents a postMessage payload exchanged between the main window and the SandboxFrame.
 */
export interface SandboxMessage {
  type: SandboxMessageType;
  executionId?: number;
  success?: boolean;
  result?: unknown;
  error?: string;
}
