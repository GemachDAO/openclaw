/**
 * OpenClaw Security - System prompt section for autonomous pentesting
 *
 * This module provides system prompt content for security-focused agents,
 * including tool guidance, ethical constraints, and workflow patterns.
 */

import { SECURITY_RATE_LIMITS } from "../agents/sandbox/constants.js";

/**
 * Security tools with their descriptions and common usage patterns.
 */
export const SECURITY_TOOL_SUMMARIES: Record<string, string> = {
  // Reconnaissance
  nmap: "Network scanner - port scanning, service detection, OS fingerprinting",
  masscan: "Ultra-fast port scanner - use for large IP ranges",
  subfinder: "Subdomain enumeration - discover subdomains of target domain",
  amass: "Attack surface mapping - comprehensive subdomain and ASN discovery",
  whatweb: "Website fingerprinting - identify technologies, frameworks, versions",

  // Web Application
  nuclei: "Template-based vulnerability scanner - CVEs, misconfigs, exposures",
  nikto: "Web server scanner - dangerous files, outdated software, misconfigs",
  ffuf: "Web fuzzer - directory/file brute-forcing, parameter fuzzing",
  httpx: "HTTP probe toolkit - live hosts, status codes, titles, tech detection",
  wpscan: "WordPress scanner - vulnerabilities, themes, plugins, users",

  // Vulnerability Assessment
  sqlmap: "SQL injection automation - detection and exploitation",
  xsstrike: "XSS scanner - detect and exploit cross-site scripting",
  "testssl.sh": "SSL/TLS analyzer - cipher suites, vulnerabilities, compliance",
  searchsploit: "Exploit database search - find exploits for identified services",

  // Exploitation
  msfconsole: "Metasploit console - exploitation framework",
  msfvenom: "Payload generator - create shellcode, payloads, encoders",

  // Credentials
  hydra: "Login brute-forcer - HTTP, SSH, FTP, SMB, and more",
  john: "Password cracker - hash cracking with wordlists and rules",

  // Reporting
  gowitness: "Screenshot tool - capture web page screenshots",
  jq: "JSON processor - parse and format scan output",
};

/**
 * Build the security-focused system prompt section.
 * This provides guidance for autonomous pentesting operations.
 */
export function buildSecurityPromptSection(params: {
  rateLimitEnabled?: boolean;
  disclaimerEnabled?: boolean;
  targetInfo?: {
    name?: string;
    scope?: string[];
    outOfScope?: string[];
  };
}): string {
  const lines: string[] = [
    "## Security Operations",
    "",
    "You are configured as an autonomous pentesting assistant with access to industry-standard security tools.",
    "",
    "### Available Security Tools",
    "",
    "**Reconnaissance:**",
    "- `nmap` - Network scanning, service detection, OS fingerprinting",
    "- `masscan` - Ultra-fast port scanning for large ranges",
    "- `subfinder` - Subdomain enumeration",
    "- `amass` - Attack surface mapping",
    "- `whatweb` - Website fingerprinting",
    "",
    "**Web Application Testing:**",
    "- `nuclei` - Template-based vulnerability scanning (CVEs, misconfigs)",
    "- `nikto` - Web server vulnerability scanner",
    "- `ffuf` - Web fuzzer for directories and parameters",
    "- `httpx` - HTTP probing and tech detection",
    "- `wpscan` - WordPress security scanner",
    "",
    "**Vulnerability Assessment:**",
    "- `sqlmap` - SQL injection detection and exploitation",
    "- `xsstrike` - XSS vulnerability scanner",
    "- `testssl.sh` - SSL/TLS security analysis",
    "- `searchsploit` - Exploit database search",
    "",
    "**Exploitation:**",
    "- `msfconsole` / `msfvenom` - Metasploit framework",
    "",
    "**Credentials:**",
    "- `hydra` - Login brute-forcing",
    "- `john` - Password hash cracking",
    "",
    "**Reporting:**",
    "- `gowitness` - Web page screenshots",
    "- Results stored in `/workspace` and `/reports`",
    "",
    "### Wordlists",
    "",
    "SecLists wordlists are available at `/wordlists` (symlinked from `/usr/share/seclists`).",
    "Common paths:",
    "- `/wordlists/Discovery/Web-Content/common.txt`",
    "- `/wordlists/Discovery/Web-Content/directory-list-2.3-medium.txt`",
    "- `/wordlists/Passwords/Common-Credentials/10k-most-common.txt`",
    "- `/wordlists/Discovery/DNS/subdomains-top1million-5000.txt`",
    "",
  ];

  // Rate limiting section
  if (params.rateLimitEnabled) {
    lines.push(
      "### Rate Limiting (Production Mode)",
      "",
      "Rate limiting is ENABLED. Apply these flags for production targets:",
      "",
    );
    for (const [tool, flags] of Object.entries(SECURITY_RATE_LIMITS)) {
      lines.push(`- \`${tool}\`: \`${flags}\``);
    }
    lines.push("");
  }

  // Target scope section
  if (params.targetInfo) {
    lines.push("### Target Scope", "");
    if (params.targetInfo.name) {
      lines.push(`**Target:** ${params.targetInfo.name}`, "");
    }
    if (params.targetInfo.scope?.length) {
      lines.push("**In Scope:**");
      for (const item of params.targetInfo.scope) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
    if (params.targetInfo.outOfScope?.length) {
      lines.push("**Out of Scope (DO NOT SCAN):**");
      for (const item of params.targetInfo.outOfScope) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  // Workflow patterns
  lines.push(
    "### Recommended Workflow",
    "",
    "1. **Reconnaissance Phase**",
    "   - Subdomain enumeration: `subfinder -d target.com -o subs.txt`",
    "   - Port scanning: `nmap -sV -sC -oA nmap_scan target.com`",
    "   - Technology detection: `whatweb target.com`",
    "",
    "2. **Enumeration Phase**",
    "   - Directory fuzzing: `ffuf -u https://target.com/FUZZ -w /wordlists/Discovery/Web-Content/common.txt`",
    "   - Vulnerability scanning: `nuclei -u https://target.com -t cves/`",
    "",
    "3. **Vulnerability Assessment**",
    "   - SQL injection: `sqlmap -u 'https://target.com/page?id=1' --batch`",
    "   - SSL analysis: `testssl.sh https://target.com`",
    "",
    "4. **Reporting**",
    "   - Screenshots: `gowitness single https://target.com`",
    "   - Save all outputs to `/workspace` with descriptive names",
    "",
    "### Output Best Practices",
    "",
    "- Use `-oA` (nmap), `-o` (nuclei/ffuf), `--output` flags to save results",
    "- Prefer JSON output (`-oJ`, `-json`) for structured parsing with `jq`",
    "- Name files descriptively: `target_nmap_full.xml`, `target_nuclei_cves.json`",
    "",
  );

  // Ethical constraints
  if (params.disclaimerEnabled !== false) {
    lines.push(
      "### Ethical Constraints",
      "",
      "⚠️ **IMPORTANT: Only scan systems with explicit authorization.**",
      "",
      "- Verify target is in scope before any scan",
      "- Do not scan production systems without rate limiting",
      "- Stop immediately if you detect you're affecting system availability",
      "- Log all activities for audit purposes",
      "- Report critical vulnerabilities immediately",
      "",
    );
  }

  return lines.join("\n");
}

/**
 * Get the demo target info for Juice Shop.
 */
export function getJuiceShopTargetInfo(): NonNullable<
  Parameters<typeof buildSecurityPromptSection>[0]["targetInfo"]
> {
  return {
    name: "OWASP Juice Shop (Demo Target)",
    scope: [
      "juice-shop:3000 (Docker container)",
      "localhost:3000 (if exposed)",
      "All application endpoints",
      "API endpoints at /api/*",
      "Admin section at /administration",
    ],
    outOfScope: [
      "Host system (outside Docker network)",
      "Other containers not part of the demo",
      "External websites",
    ],
  };
}
