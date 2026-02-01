/**
 * OpenClaw Security - Scan output parsing helpers
 *
 * Parse structured output from security tools (nmap XML, nuclei JSON, etc.)
 * for easier analysis and reporting.
 */

/**
 * Parsed nmap host result.
 */
export interface NmapHost {
  address: string;
  hostname?: string;
  status: "up" | "down";
  ports: NmapPort[];
  os?: string;
}

/**
 * Parsed nmap port result.
 */
export interface NmapPort {
  port: number;
  protocol: "tcp" | "udp";
  state: "open" | "closed" | "filtered";
  service?: string;
  version?: string;
  product?: string;
}

/**
 * Parsed nuclei finding.
 */
export interface NucleiFinding {
  templateId: string;
  name: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  type: string;
  host: string;
  matched: string;
  extractedResults?: string[];
  timestamp: string;
  curl?: string;
}

/**
 * Parsed ffuf result.
 */
export interface FfufResult {
  url: string;
  status: number;
  length: number;
  words: number;
  lines: number;
  contentType?: string;
  redirectLocation?: string;
}

/**
 * Parse nmap XML output to structured format.
 * Note: This is a simplified parser - for production use, consider xml2js.
 */
export function parseNmapXml(xml: string): NmapHost[] {
  const hosts: NmapHost[] = [];

  // Simple regex-based parsing (for full XML, use a proper parser)
  const hostMatches = xml.matchAll(
    /<host[^>]*>[\s\S]*?<\/host>/g,
  );

  for (const hostMatch of hostMatches) {
    const hostXml = hostMatch[0];

    // Extract address
    const addrMatch = hostXml.match(/<address addr="([^"]+)"/);
    if (!addrMatch) continue;

    const address = addrMatch[1];

    // Extract hostname
    const hostnameMatch = hostXml.match(/<hostname name="([^"]+)"/);
    const hostname = hostnameMatch?.[1];

    // Extract status
    const statusMatch = hostXml.match(/<status state="(up|down)"/);
    const status = (statusMatch?.[1] as "up" | "down") ?? "down";

    // Extract OS
    const osMatch = hostXml.match(/<osmatch name="([^"]+)"/);
    const os = osMatch?.[1];

    // Extract ports
    const ports: NmapPort[] = [];
    const portMatches = hostXml.matchAll(
      /<port protocol="(tcp|udp)" portid="(\d+)"[\s\S]*?<\/port>/g,
    );

    for (const portMatch of portMatches) {
      const portXml = portMatch[0];
      const protocol = portMatch[1] as "tcp" | "udp";
      const port = parseInt(portMatch[2], 10);

      const stateMatch = portXml.match(/<state state="(open|closed|filtered)"/);
      const state = (stateMatch?.[1] as "open" | "closed" | "filtered") ?? "filtered";

      const serviceMatch = portXml.match(/<service name="([^"]+)"/);
      const service = serviceMatch?.[1];

      const productMatch = portXml.match(/product="([^"]+)"/);
      const product = productMatch?.[1];

      const versionMatch = portXml.match(/version="([^"]+)"/);
      const version = versionMatch?.[1];

      ports.push({ port, protocol, state, service, product, version });
    }

    hosts.push({ address, hostname, status, ports, os });
  }

  return hosts;
}

/**
 * Parse nuclei JSON output (newline-delimited JSON).
 */
export function parseNucleiJson(jsonl: string): NucleiFinding[] {
  const findings: NucleiFinding[] = [];

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const obj = JSON.parse(trimmed);

      findings.push({
        templateId: obj["template-id"] ?? obj.templateId ?? "unknown",
        name: obj.info?.name ?? obj.name ?? "Unknown",
        severity: obj.info?.severity ?? obj.severity ?? "info",
        type: obj.type ?? "unknown",
        host: obj.host ?? "",
        matched: obj.matched ?? obj["matched-at"] ?? "",
        extractedResults: obj["extracted-results"] ?? obj.extractedResults,
        timestamp: obj.timestamp ?? new Date().toISOString(),
        curl: obj["curl-command"] ?? obj.curl,
      });
    } catch {
      // Skip invalid JSON lines
    }
  }

  return findings;
}

/**
 * Parse ffuf JSON output.
 */
export function parseFfufJson(json: string): FfufResult[] {
  try {
    const data = JSON.parse(json);
    const results = data.results ?? [];

    return results.map((r: Record<string, unknown>) => ({
      url: String(r.url ?? ""),
      status: Number(r.status ?? 0),
      length: Number(r.length ?? 0),
      words: Number(r.words ?? 0),
      lines: Number(r.lines ?? 0),
      contentType: r["content-type"] as string | undefined,
      redirectLocation: r.redirectlocation as string | undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Format nmap results as a summary table.
 */
export function formatNmapSummary(hosts: NmapHost[]): string {
  const lines: string[] = ["# Nmap Scan Results", ""];

  for (const host of hosts) {
    const hostLine = host.hostname
      ? `## ${host.address} (${host.hostname})`
      : `## ${host.address}`;
    lines.push(hostLine);
    lines.push(`Status: ${host.status}`);
    if (host.os) {
      lines.push(`OS: ${host.os}`);
    }
    lines.push("");

    const openPorts = host.ports.filter((p) => p.state === "open");
    if (openPorts.length > 0) {
      lines.push("| Port | Protocol | Service | Version |");
      lines.push("|------|----------|---------|---------|");
      for (const port of openPorts) {
        const version = [port.product, port.version].filter(Boolean).join(" ");
        lines.push(
          `| ${port.port} | ${port.protocol} | ${port.service ?? "-"} | ${version || "-"} |`,
        );
      }
    } else {
      lines.push("No open ports found.");
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format nuclei findings as a severity-grouped report.
 */
export function formatNucleiReport(findings: NucleiFinding[]): string {
  const lines: string[] = ["# Nuclei Vulnerability Report", ""];

  // Group by severity
  const bySeverity: Record<string, NucleiFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };

  for (const finding of findings) {
    const sev = finding.severity.toLowerCase();
    if (bySeverity[sev]) {
      bySeverity[sev].push(finding);
    } else {
      bySeverity.info.push(finding);
    }
  }

  // Summary
  lines.push("## Summary");
  lines.push(`- Critical: ${bySeverity.critical.length}`);
  lines.push(`- High: ${bySeverity.high.length}`);
  lines.push(`- Medium: ${bySeverity.medium.length}`);
  lines.push(`- Low: ${bySeverity.low.length}`);
  lines.push(`- Info: ${bySeverity.info.length}`);
  lines.push("");

  // Details by severity
  for (const severity of ["critical", "high", "medium", "low", "info"]) {
    const sevFindings = bySeverity[severity];
    if (sevFindings.length === 0) continue;

    const emoji =
      severity === "critical"
        ? "🔴"
        : severity === "high"
          ? "🟠"
          : severity === "medium"
            ? "🟡"
            : severity === "low"
              ? "🟢"
              : "🔵";

    lines.push(`## ${emoji} ${severity.toUpperCase()} (${sevFindings.length})`);
    lines.push("");

    for (const f of sevFindings) {
      lines.push(`### ${f.name}`);
      lines.push(`- Template: \`${f.templateId}\``);
      lines.push(`- Host: ${f.host}`);
      lines.push(`- Matched: ${f.matched}`);
      if (f.extractedResults?.length) {
        lines.push(`- Extracted: ${f.extractedResults.join(", ")}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Format ffuf results as a table.
 */
export function formatFfufTable(results: FfufResult[]): string {
  const lines: string[] = ["# FFUF Fuzzing Results", ""];

  if (results.length === 0) {
    lines.push("No results found.");
    return lines.join("\n");
  }

  lines.push(`Found ${results.length} results.`);
  lines.push("");
  lines.push("| URL | Status | Size | Words |");
  lines.push("|-----|--------|------|-------|");

  for (const r of results) {
    lines.push(`| ${r.url} | ${r.status} | ${r.length} | ${r.words} |`);
  }

  return lines.join("\n");
}
