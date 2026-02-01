/**
 * OpenClaw Security - Disclaimer and consent management
 *
 * Handles the legal disclaimer prompt and configuration for security operations.
 */

import { confirm, isCancel, cancel } from "@clack/prompts";
import chalk from "chalk";
import { theme } from "../terminal/theme.js";
import { SECURITY_DISCLAIMER } from "../agents/sandbox/security-profile.js";

/**
 * Security configuration options.
 */
export interface SecurityConfig {
  /** Show disclaimer before scanning (default: true) */
  disclaimer?: boolean;
  /** Enable rate limiting for production targets (default: false) */
  rateLimit?: boolean;
  /** Maximum requests per second when rate limiting (default: tool-specific) */
  maxRequestsPerSecond?: number;
  /** Target scope information */
  target?: {
    name?: string;
    scope?: string[];
    outOfScope?: string[];
  };
}

/**
 * Display the security disclaimer and get user consent.
 * Returns true if the user confirms, false otherwise.
 *
 * @param skipDisclaimer - If true, skip the disclaimer prompt
 */
export async function showSecurityDisclaimer(skipDisclaimer?: boolean): Promise<boolean> {
  if (skipDisclaimer) {
    return true;
  }

  console.log("");
  console.log(theme.warn(SECURITY_DISCLAIMER));
  console.log("");

  const confirmed = await confirm({
    message: "Do you have authorization to scan the target system(s)?",
    initialValue: false,
  });

  if (isCancel(confirmed) || !confirmed) {
    cancel("Security scan cancelled. Authorization required.");
    return false;
  }

  console.log(theme.success("Authorization confirmed. Proceeding with security operations."));
  return true;
}

/**
 * Display a compact disclaimer banner (for non-interactive mode).
 */
export function printSecurityBanner(): void {
  console.log(theme.warn("━".repeat(70)));
  console.log(
    theme.warn(chalk.bold("  ⚠️  SECURITY SCANNING - Authorization required for all targets")),
  );
  console.log(theme.warn("━".repeat(70)));
}

/**
 * Log a security operation for audit purposes.
 */
export function logSecurityOperation(params: {
  operation: string;
  target: string;
  tool: string;
  command?: string;
  timestamp?: Date;
}): void {
  const ts = (params.timestamp ?? new Date()).toISOString();
  const logLine = JSON.stringify({
    type: "security_operation",
    timestamp: ts,
    operation: params.operation,
    target: params.target,
    tool: params.tool,
    command: params.command,
  });

  // Log to stderr for audit trail (can be redirected to file)
  console.error(`[SECURITY_AUDIT] ${logLine}`);
}

/**
 * Validate that a target is within the allowed scope.
 *
 * @param target - The target to validate
 * @param config - Security configuration with scope info
 * @returns true if target is in scope, false if out of scope
 */
export function isTargetInScope(target: string, config?: SecurityConfig): boolean {
  if (!config?.target) {
    // No scope defined, allow all (but warn)
    return true;
  }

  const outOfScope = config.target.outOfScope ?? [];

  // Check if target matches any out-of-scope pattern
  for (const pattern of outOfScope) {
    if (target.includes(pattern) || pattern.includes(target)) {
      return false;
    }
  }

  const scope = config.target.scope ?? [];

  // If no explicit scope, allow (already checked out-of-scope)
  if (scope.length === 0) {
    return true;
  }

  // Check if target matches any in-scope pattern
  for (const pattern of scope) {
    if (target.includes(pattern) || pattern.includes(target)) {
      return true;
    }
  }

  // Not in explicit scope
  return false;
}

/**
 * Format a warning message for out-of-scope targets.
 */
export function formatOutOfScopeWarning(target: string): string {
  return [
    theme.error("━".repeat(60)),
    theme.error(chalk.bold("  ⛔ TARGET OUT OF SCOPE")),
    theme.error("━".repeat(60)),
    "",
    `  Target: ${chalk.bold(target)}`,
    "",
    "  This target is not in the authorized scope.",
    "  Scanning out-of-scope targets may be illegal.",
    "",
    theme.error("━".repeat(60)),
  ].join("\n");
}
