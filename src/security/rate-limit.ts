/**
 * OpenClaw Security - Rate limiting for production target scanning
 *
 * Provides configurable rate limiting to avoid overwhelming production systems.
 */

import { SECURITY_RATE_LIMITS } from "../agents/sandbox/constants.js";

/**
 * Rate limit configuration for security scanning.
 */
export interface RateLimitConfig {
  /** Enable rate limiting (default: false) */
  enabled: boolean;
  /** Global max requests per second (overrides tool defaults) */
  maxRequestsPerSecond?: number;
  /** Per-tool rate limit overrides */
  toolLimits?: Partial<Record<keyof typeof SECURITY_RATE_LIMITS, string>>;
}

/**
 * Default rate limits for each tool when in production mode.
 */
export const DEFAULT_RATE_LIMITS: Record<string, number> = {
  nmap: 100, // packets per second
  masscan: 100, // packets per second
  ffuf: 10, // requests per second
  nuclei: 10, // requests per second
  hydra: 4, // threads
  nikto: 5, // implied by tool design
  sqlmap: 10, // requests per second
  httpx: 50, // requests per second
};

/**
 * Get the rate limit flags for a specific tool.
 *
 * @param tool - The tool name
 * @param config - Rate limit configuration
 * @returns The command-line flags to apply rate limiting
 */
export function getRateLimitFlags(
  tool: string,
  config?: RateLimitConfig,
): string {
  if (!config?.enabled) {
    return "";
  }

  const toolLower = tool.toLowerCase();

  // Check for custom tool-specific override
  if (config.toolLimits?.[toolLower as keyof typeof SECURITY_RATE_LIMITS]) {
    return config.toolLimits[toolLower as keyof typeof SECURITY_RATE_LIMITS]!;
  }

  // Check for global rate limit override
  if (config.maxRequestsPerSecond !== undefined) {
    return formatRateLimitForTool(toolLower, config.maxRequestsPerSecond);
  }

  // Use default from constants
  if (toolLower in SECURITY_RATE_LIMITS) {
    return SECURITY_RATE_LIMITS[toolLower as keyof typeof SECURITY_RATE_LIMITS];
  }

  return "";
}

/**
 * Format rate limit flags for a specific tool based on a requests-per-second value.
 */
function formatRateLimitForTool(tool: string, rps: number): string {
  switch (tool) {
    case "nmap":
      return `--max-rate ${rps}`;
    case "masscan":
      return `--rate ${rps}`;
    case "ffuf":
      return `-rate ${rps}`;
    case "nuclei":
      return `-rl ${rps}`;
    case "hydra":
      return `-t ${Math.min(rps, 16)}`; // hydra uses threads, cap at 16
    case "httpx":
      return `-rl ${rps}`;
    case "sqlmap":
      return `--delay ${1 / rps}`; // sqlmap uses delay between requests
    default:
      return "";
  }
}

/**
 * Inject rate limit flags into a command.
 *
 * @param command - The original command
 * @param config - Rate limit configuration
 * @returns The command with rate limit flags injected
 */
export function injectRateLimits(command: string, config?: RateLimitConfig): string {
  if (!config?.enabled) {
    return command;
  }

  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) {
    return command;
  }

  // Find the tool name (might be a path like /usr/bin/nmap)
  const toolPart = parts[0];
  const toolName = toolPart.split("/").pop() ?? toolPart;

  const flags = getRateLimitFlags(toolName, config);
  if (!flags) {
    return command;
  }

  // Check if rate limit flags are already present
  const flagsLower = flags.toLowerCase();
  const commandLower = command.toLowerCase();

  // Common rate limit indicators
  const rateLimitIndicators = [
    "--max-rate",
    "--rate",
    "-rate",
    "-rl",
    "--delay",
    "-t ",
  ];

  for (const indicator of rateLimitIndicators) {
    if (commandLower.includes(indicator)) {
      // Rate limiting already specified, don't override
      return command;
    }
  }

  // Insert flags after the tool name
  parts.splice(1, 0, flags);
  return parts.join(" ");
}

/**
 * Parse rate limit configuration from environment or config object.
 */
export function parseRateLimitConfig(input?: {
  rateLimit?: boolean;
  maxRequestsPerSecond?: number;
}): RateLimitConfig {
  return {
    enabled: input?.rateLimit ?? false,
    maxRequestsPerSecond: input?.maxRequestsPerSecond,
  };
}

/**
 * Create a rate limit config for production scanning.
 */
export function createProductionRateLimitConfig(maxRps?: number): RateLimitConfig {
  return {
    enabled: true,
    maxRequestsPerSecond: maxRps,
  };
}

/**
 * Create a rate limit config for lab/CTF environments (no limiting).
 */
export function createLabRateLimitConfig(): RateLimitConfig {
  return {
    enabled: false,
  };
}
