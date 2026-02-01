/**
 * OpenClaw Security - Pre-configured sandbox profile for autonomous pentesting
 *
 * This module provides the security sandbox configuration that can be used
 * to set up an agent for cybersecurity operations with proper network access,
 * capabilities, and tool permissions.
 */

import type { SandboxDockerSettings } from "../../config/types.sandbox.js";
import type { AgentConfig } from "../../config/types.agents.js";
import {
  SECURITY_SANDBOX_CAP_ADD,
  SECURITY_SANDBOX_CONTAINER_PREFIX,
  SECURITY_SANDBOX_IMAGE,
  SECURITY_SANDBOX_NETWORK,
  SECURITY_SANDBOX_REPORTS_PATH,
  SECURITY_SANDBOX_WORDLISTS_PATH,
  SECURITY_SANDBOX_WORKDIR,
  SECURITY_RATE_LIMITS,
  SECURITY_TOOL_ALLOW,
  SECURITY_TOOL_DENY,
} from "./constants.js";

/**
 * Docker configuration for the security sandbox.
 * Includes network access, capabilities for scanning, and wordlist mounts.
 */
export const SECURITY_DOCKER_CONFIG: SandboxDockerSettings = {
  image: SECURITY_SANDBOX_IMAGE,
  containerPrefix: SECURITY_SANDBOX_CONTAINER_PREFIX,
  workdir: SECURITY_SANDBOX_WORKDIR,
  network: SECURITY_SANDBOX_NETWORK,
  // Security tools need some capabilities for raw packet operations
  capDrop: ["ALL"],
  capAdd: [...SECURITY_SANDBOX_CAP_ADD],
  // Allow read-only root but with writable workspace and reports
  readOnlyRoot: false,
  tmpfs: ["/tmp:size=2G", "/var/tmp", "/run"],
  // Resource limits for intensive scanning operations
  memory: "4g",
  cpus: 2,
  pidsLimit: 1024,
  // DNS for external target resolution
  dns: ["8.8.8.8", "1.1.1.1"],
  env: {
    LANG: "C.UTF-8",
    TERM: "xterm-256color",
    // Security tools environment
    WORDLISTS: SECURITY_SANDBOX_WORDLISTS_PATH,
    REPORTS: SECURITY_SANDBOX_REPORTS_PATH,
  },
};

/**
 * Full agent configuration preset for security operations.
 * Use this as a template for creating security-focused agents.
 */
export const SECURITY_AGENT_PROFILE: Partial<AgentConfig> = {
  name: "Security Scanner",
  sandbox: {
    mode: "all",
    scope: "agent",
    workspaceAccess: "rw",
    docker: SECURITY_DOCKER_CONFIG,
  },
  tools: {
    allow: [...SECURITY_TOOL_ALLOW],
    deny: [...SECURITY_TOOL_DENY],
  },
};

/**
 * Get rate-limited command flags for production target scanning.
 * @param tool - The security tool name (nmap, masscan, ffuf, nuclei, hydra)
 * @returns The rate limiting flags for the tool, or empty string if not found
 */
export function getSecurityRateLimitFlags(tool: keyof typeof SECURITY_RATE_LIMITS): string {
  return SECURITY_RATE_LIMITS[tool] ?? "";
}

/**
 * Check if rate limiting should be applied based on config.
 */
export interface SecurityScanConfig {
  rateLimit?: boolean;
  maxRequestsPerSecond?: number;
  disclaimer?: boolean;
}

/**
 * Build a rate-limited command for security tools.
 * @param tool - The tool name
 * @param baseCommand - The base command without rate limits
 * @param config - Security scan configuration
 * @returns The command with rate limits applied if enabled
 */
export function buildRateLimitedCommand(
  tool: keyof typeof SECURITY_RATE_LIMITS,
  baseCommand: string,
  config?: SecurityScanConfig,
): string {
  if (!config?.rateLimit) {
    return baseCommand;
  }

  const rateLimitFlags = getSecurityRateLimitFlags(tool);
  if (!rateLimitFlags) {
    return baseCommand;
  }

  // Insert rate limit flags after the tool name
  const parts = baseCommand.split(" ");
  const toolIndex = parts.findIndex((p) => p === tool || p.endsWith(`/${tool}`));
  if (toolIndex >= 0) {
    parts.splice(toolIndex + 1, 0, rateLimitFlags);
    return parts.join(" ");
  }

  // Fallback: append to end
  return `${baseCommand} ${rateLimitFlags}`;
}

/**
 * Security disclaimer text shown before scanning operations.
 */
export const SECURITY_DISCLAIMER = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                        ⚠️  SECURITY SCANNING NOTICE  ⚠️                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  You are about to perform security scanning operations.                      ║
║                                                                              ║
║  IMPORTANT:                                                                  ║
║  • Only scan systems you have EXPLICIT AUTHORIZATION to test                 ║
║  • Unauthorized scanning may violate laws and regulations                    ║
║  • All scanning activities are logged                                        ║
║                                                                              ║
║  By proceeding, you confirm you have proper authorization.                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
`.trim();
