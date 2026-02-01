import os from "node:os";
import path from "node:path";
import { CHANNEL_IDS } from "../../channels/registry.js";
import { STATE_DIR } from "../../config/config.js";

export const DEFAULT_SANDBOX_WORKSPACE_ROOT = path.join(os.homedir(), ".openclaw", "sandboxes");

export const DEFAULT_SANDBOX_IMAGE = "openclaw-sandbox:bookworm-slim";
export const DEFAULT_SANDBOX_CONTAINER_PREFIX = "openclaw-sbx-";
export const DEFAULT_SANDBOX_WORKDIR = "/workspace";
export const DEFAULT_SANDBOX_IDLE_HOURS = 24;
export const DEFAULT_SANDBOX_MAX_AGE_DAYS = 7;

// =============================================================================
// OPENCLAW SECURITY - Autonomous Pentesting Sandbox
// =============================================================================

export const SECURITY_SANDBOX_IMAGE = "openclaw-security:latest";
export const SECURITY_SANDBOX_CONTAINER_PREFIX = "openclaw-sec-";
export const SECURITY_SANDBOX_WORKDIR = "/workspace";
export const SECURITY_SANDBOX_WORDLISTS_PATH = "/wordlists";
export const SECURITY_SANDBOX_REPORTS_PATH = "/reports";

/** Security sandbox requires network access for scanning */
export const SECURITY_SANDBOX_NETWORK = "bridge";

/** Security tools need NET_RAW and NET_ADMIN capabilities for scanning */
export const SECURITY_SANDBOX_CAP_ADD = ["NET_RAW", "NET_ADMIN"] as const;

/** Tools allowed in security sandbox - expanded for pentesting operations */
export const SECURITY_TOOL_ALLOW = [
  "exec",
  "process",
  "read",
  "write",
  "edit",
  "apply_patch",
  "image",
  "sessions_list",
  "sessions_history",
] as const;

/** Tools denied in security sandbox - restrict messaging/gateway access */
export const SECURITY_TOOL_DENY = [
  "browser",
  "canvas",
  "nodes",
  "cron",
  "gateway",
  ...CHANNEL_IDS,
] as const;

/** Default rate limits for production target scanning */
export const SECURITY_RATE_LIMITS = {
  nmap: "--max-rate 100",
  masscan: "--rate 100",
  ffuf: "-rate 10",
  nuclei: "-rl 10",
  hydra: "-t 4",
} as const;

// =============================================================================

export const DEFAULT_TOOL_ALLOW = [
  "exec",
  "process",
  "read",
  "write",
  "edit",
  "apply_patch",
  "image",
  "sessions_list",
  "sessions_history",
  "sessions_send",
  "sessions_spawn",
  "session_status",
] as const;

// Provider docking: keep sandbox policy aligned with provider tool names.
export const DEFAULT_TOOL_DENY = [
  "browser",
  "canvas",
  "nodes",
  "cron",
  "gateway",
  ...CHANNEL_IDS,
] as const;

export const DEFAULT_SANDBOX_BROWSER_IMAGE = "openclaw-sandbox-browser:bookworm-slim";
export const DEFAULT_SANDBOX_COMMON_IMAGE = "openclaw-sandbox-common:bookworm-slim";

export const DEFAULT_SANDBOX_BROWSER_PREFIX = "openclaw-sbx-browser-";
export const DEFAULT_SANDBOX_BROWSER_CDP_PORT = 9222;
export const DEFAULT_SANDBOX_BROWSER_VNC_PORT = 5900;
export const DEFAULT_SANDBOX_BROWSER_NOVNC_PORT = 6080;
export const DEFAULT_SANDBOX_BROWSER_AUTOSTART_TIMEOUT_MS = 12_000;

export const SANDBOX_AGENT_WORKSPACE_MOUNT = "/agent";

const resolvedSandboxStateDir = STATE_DIR ?? path.join(os.homedir(), ".openclaw");
export const SANDBOX_STATE_DIR = path.join(resolvedSandboxStateDir, "sandbox");
export const SANDBOX_REGISTRY_PATH = path.join(SANDBOX_STATE_DIR, "containers.json");
export const SANDBOX_BROWSER_REGISTRY_PATH = path.join(SANDBOX_STATE_DIR, "browsers.json");
