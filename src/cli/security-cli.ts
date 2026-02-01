import type { Command } from "commander";
import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { runSecurityAudit } from "../security/audit.js";
import {
  showSecurityDisclaimer,
  printSecurityBanner,
  logSecurityOperation,
  isTargetInScope,
  formatOutOfScopeWarning,
  type SecurityConfig,
} from "../security/disclaimer.js";
import { fixSecurityFootguns } from "../security/fix.js";
import {
  createProductionRateLimitConfig,
  createLabRateLimitConfig,
  injectRateLimits,
} from "../security/rate-limit.js";
import {
  buildSecurityPromptSection,
  getJuiceShopTargetInfo,
} from "../security/system-prompt-security.js";
import { formatDocsLink } from "../terminal/links.js";
import { isRich, theme } from "../terminal/theme.js";
import { shortenHomeInString, shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

type SecurityAuditOptions = {
  json?: boolean;
  deep?: boolean;
  fix?: boolean;
};

function formatSummary(summary: { critical: number; warn: number; info: number }): string {
  const rich = isRich();
  const c = summary.critical;
  const w = summary.warn;
  const i = summary.info;
  const parts: string[] = [];
  parts.push(rich ? theme.error(`${c} critical`) : `${c} critical`);
  parts.push(rich ? theme.warn(`${w} warn`) : `${w} warn`);
  parts.push(rich ? theme.muted(`${i} info`) : `${i} info`);
  return parts.join(" · ");
}

export function registerSecurityCli(program: Command) {
  const security = program
    .command("security")
    .description("Security tools (audit)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/security", "docs.openclaw.ai/cli/security")}\n`,
    );

  security
    .command("audit")
    .description("Audit config + local state for common security foot-guns")
    .option("--deep", "Attempt live Gateway probe (best-effort)", false)
    .option("--fix", "Apply safe fixes (tighten defaults + chmod state/config)", false)
    .option("--json", "Print JSON", false)
    .action(async (opts: SecurityAuditOptions) => {
      const fixResult = opts.fix ? await fixSecurityFootguns().catch((_err) => null) : null;

      const cfg = loadConfig();
      const report = await runSecurityAudit({
        config: cfg,
        deep: Boolean(opts.deep),
        includeFilesystem: true,
        includeChannelSecurity: true,
      });

      if (opts.json) {
        defaultRuntime.log(
          JSON.stringify(fixResult ? { fix: fixResult, report } : report, null, 2),
        );
        return;
      }

      const rich = isRich();
      const heading = (text: string) => (rich ? theme.heading(text) : text);
      const muted = (text: string) => (rich ? theme.muted(text) : text);

      const lines: string[] = [];
      lines.push(heading("OpenClaw security audit"));
      lines.push(muted(`Summary: ${formatSummary(report.summary)}`));
      lines.push(muted(`Run deeper: ${formatCliCommand("openclaw security audit --deep")}`));

      if (opts.fix) {
        lines.push(muted(`Fix: ${formatCliCommand("openclaw security audit --fix")}`));
        if (!fixResult) {
          lines.push(muted("Fixes: failed to apply (unexpected error)"));
        } else if (
          fixResult.errors.length === 0 &&
          fixResult.changes.length === 0 &&
          fixResult.actions.every((a) => !a.ok)
        ) {
          lines.push(muted("Fixes: no changes applied"));
        } else {
          lines.push("");
          lines.push(heading("FIX"));
          for (const change of fixResult.changes) {
            lines.push(muted(`  ${shortenHomeInString(change)}`));
          }
          for (const action of fixResult.actions) {
            if (action.kind === "chmod") {
              const mode = action.mode.toString(8).padStart(3, "0");
              if (action.ok) {
                lines.push(muted(`  chmod ${mode} ${shortenHomePath(action.path)}`));
              } else if (action.skipped) {
                lines.push(
                  muted(`  skip chmod ${mode} ${shortenHomePath(action.path)} (${action.skipped})`),
                );
              } else if (action.error) {
                lines.push(
                  muted(`  chmod ${mode} ${shortenHomePath(action.path)} failed: ${action.error}`),
                );
              }
              continue;
            }
            const command = shortenHomeInString(action.command);
            if (action.ok) {
              lines.push(muted(`  ${command}`));
            } else if (action.skipped) {
              lines.push(muted(`  skip ${command} (${action.skipped})`));
            } else if (action.error) {
              lines.push(muted(`  ${command} failed: ${action.error}`));
            }
          }
          if (fixResult.errors.length > 0) {
            for (const err of fixResult.errors) {
              lines.push(muted(`  error: ${shortenHomeInString(err)}`));
            }
          }
        }
      }

      const bySeverity = (sev: "critical" | "warn" | "info") =>
        report.findings.filter((f) => f.severity === sev);

      const render = (sev: "critical" | "warn" | "info") => {
        const list = bySeverity(sev);
        if (list.length === 0) {
          return;
        }
        const label =
          sev === "critical"
            ? rich
              ? theme.error("CRITICAL")
              : "CRITICAL"
            : sev === "warn"
              ? rich
                ? theme.warn("WARN")
                : "WARN"
              : rich
                ? theme.muted("INFO")
                : "INFO";
        lines.push("");
        lines.push(heading(label));
        for (const f of list) {
          lines.push(`${theme.muted(f.checkId)} ${f.title}`);
          lines.push(`  ${f.detail}`);
          if (f.remediation?.trim()) {
            lines.push(`  ${muted(`Fix: ${f.remediation.trim()}`)}`);
          }
        }
      };

      render("critical");
      render("warn");
      render("info");

      defaultRuntime.log(lines.join("\n"));
    });

  // =============================================================================
  // PENTEST COMMANDS - Autonomous security scanning workflows
  // =============================================================================

  // openclaw security scan
  security
    .command("scan")
    .description("Run a security scan against a target")
    .argument("<target>", "Target to scan (hostname, IP, or URL)")
    .option("--no-disclaimer", "Skip the authorization disclaimer")
    .option("--rate-limit", "Enable rate limiting for production targets")
    .option("--max-rps <number>", "Maximum requests per second", parseInt)
    .option("--recon", "Run reconnaissance phase only")
    .option("--web", "Run web application scanning only")
    .option("--vuln", "Run vulnerability assessment only")
    .option("--full", "Run full pentest workflow (default)")
    .action(async (target: string, opts) => {
      const config: SecurityConfig = {
        disclaimer: opts.disclaimer,
        rateLimit: opts.rateLimit,
        maxRequestsPerSecond: opts.maxRps,
      };

      // Show disclaimer unless skipped
      if (opts.disclaimer) {
        const confirmed = await showSecurityDisclaimer(false);
        if (!confirmed) {
          process.exit(1);
        }
      } else {
        printSecurityBanner();
      }

      // Validate target scope
      if (!isTargetInScope(target, config)) {
        console.log(formatOutOfScopeWarning(target));
        process.exit(1);
      }

      // Log the operation
      logSecurityOperation({
        operation: "scan",
        target,
        tool: "openclaw-security",
      });

      console.log("");
      console.log(theme.heading(" OpenClaw Security Scan "));
      console.log(`Target: ${theme.heading(target)}`);
      console.log(
        `Rate limiting: ${config.rateLimit ? theme.success("enabled") : theme.warn("disabled")}`,
      );

      // Determine scan phases
      const phases: string[] = [];
      if (opts.recon || opts.full || (!opts.web && !opts.vuln)) {
        phases.push("recon");
      }
      if (opts.web || opts.full || (!opts.recon && !opts.vuln)) {
        phases.push("web");
      }
      if (opts.vuln || opts.full || (!opts.recon && !opts.web)) {
        phases.push("vuln");
      }

      console.log(`Phases: ${phases.join(", ")}`);
      console.log("");

      // Output the commands that would be run
      const rateLimitConfig = config.rateLimit
        ? createProductionRateLimitConfig(config.maxRequestsPerSecond)
        : createLabRateLimitConfig();

      if (phases.includes("recon")) {
        console.log(theme.heading("📡 Reconnaissance Phase"));
        const nmapCmd = injectRateLimits(
          `nmap -sV -sC -oA nmap_${target.replace(/[^a-zA-Z0-9]/g, "_")} ${target}`,
          rateLimitConfig,
        );
        console.log(`  ${theme.muted("$")} ${nmapCmd}`);
        const subfinderCmd = `subfinder -d ${target} -o subdomains.txt`;
        console.log(`  ${theme.muted("$")} ${subfinderCmd}`);
        console.log("");
      }

      if (phases.includes("web")) {
        console.log(theme.heading("🌐 Web Application Phase"));
        const nucleiCmd = injectRateLimits(
          `nuclei -u https://${target} -t cves/ -o nuclei_results.json -json`,
          rateLimitConfig,
        );
        console.log(`  ${theme.muted("$")} ${nucleiCmd}`);
        const ffufCmd = injectRateLimits(
          `ffuf -u https://${target}/FUZZ -w /wordlists/Discovery/Web-Content/common.txt -o ffuf_results.json -of json`,
          rateLimitConfig,
        );
        console.log(`  ${theme.muted("$")} ${ffufCmd}`);
        console.log("");
      }

      if (phases.includes("vuln")) {
        console.log(theme.heading("🔓 Vulnerability Assessment Phase"));
        console.log(`  ${theme.muted("$")} testssl.sh https://${target}`);
        console.log(`  ${theme.muted("$")} searchsploit ${target}`);
        console.log("");
      }

      console.log(theme.success("Run these commands in the security sandbox to execute the scan."));
      console.log("");
      console.log(theme.muted("Tip: Start the sandbox with:"));
      console.log(theme.muted("  docker-compose up -d security-sandbox"));
      console.log(theme.muted("  docker exec -it openclaw-security-sandbox bash"));
    });

  // openclaw security recon
  security
    .command("recon")
    .description("Quick reconnaissance workflow")
    .argument("<target>", "Target domain or IP")
    .option("--no-disclaimer", "Skip authorization disclaimer")
    .action(async (target: string, opts) => {
      if (opts.disclaimer) {
        const confirmed = await showSecurityDisclaimer(false);
        if (!confirmed) {
          process.exit(1);
        }
      }

      logSecurityOperation({ operation: "recon", target, tool: "recon-workflow" });

      console.log("");
      console.log(theme.heading(" OpenClaw Reconnaissance "));
      console.log("");
      console.log(theme.heading("Recommended recon workflow:"));
      console.log("");
      console.log(`1. ${theme.info("Subdomain enumeration:")}`);
      console.log(`   subfinder -d ${target} -o subs.txt`);
      console.log(`   amass enum -d ${target} -o amass.txt`);
      console.log("");
      console.log(`2. ${theme.info("Port scanning:")}`);
      console.log(`   nmap -sV -sC -oA nmap_scan ${target}`);
      console.log(`   masscan -p1-65535 --rate=1000 ${target} -oG masscan.txt`);
      console.log("");
      console.log(`3. ${theme.info("Technology detection:")}`);
      console.log(`   whatweb ${target}`);
      console.log(`   httpx -u https://${target} -tech-detect`);
      console.log("");
      console.log(theme.success("Execute in the security sandbox."));
    });

  // openclaw security demo
  security
    .command("demo")
    .description("Run demo pentest against Juice Shop (docker-compose)")
    .option("--start", "Start Juice Shop container first")
    .action(async (opts) => {
      console.log("");
      console.log(theme.heading(" OpenClaw Security Demo "));
      console.log("");

      if (opts.start) {
        console.log(theme.muted("Starting Juice Shop demo target..."));
        console.log(theme.muted("  docker-compose up -d juice-shop"));
        console.log("");
      }

      const targetInfo = getJuiceShopTargetInfo();

      console.log(theme.heading("🎯 Demo Target: OWASP Juice Shop"));
      console.log("");
      console.log(theme.success("In Scope:"));
      for (const item of targetInfo.scope ?? []) {
        console.log(`  ✓ ${item}`);
      }
      console.log("");
      console.log(theme.error("Out of Scope:"));
      for (const item of targetInfo.outOfScope ?? []) {
        console.log(`  ✗ ${item}`);
      }
      console.log("");

      console.log(theme.heading("Demo commands:"));
      console.log("");
      console.log("# Start the demo environment");
      console.log("docker-compose up -d security-sandbox juice-shop");
      console.log("");
      console.log("# Enter the security sandbox");
      console.log("docker exec -it openclaw-security-sandbox bash");
      console.log("");
      console.log("# Run recon against Juice Shop");
      console.log("nmap -sV -sC juice-shop");
      console.log("whatweb http://juice-shop:3000");
      console.log("");
      console.log("# Scan for vulnerabilities");
      console.log("nuclei -u http://juice-shop:3000 -t cves/");
      console.log("nikto -h http://juice-shop:3000");
      console.log("");
      console.log("# Fuzz for hidden endpoints");
      console.log(
        "ffuf -u http://juice-shop:3000/FUZZ -w /wordlists/Discovery/Web-Content/common.txt",
      );
      console.log("");

      console.log(theme.success("Happy hacking! 🔥"));
    });

  // openclaw security prompt
  security
    .command("prompt")
    .description("Generate security system prompt section")
    .option("--rate-limit", "Include rate limiting guidance")
    .option("--juice-shop", "Include Juice Shop as demo target")
    .action((opts) => {
      const promptSection = buildSecurityPromptSection({
        rateLimitEnabled: opts.rateLimit,
        disclaimerEnabled: true,
        targetInfo: opts.juiceShop ? getJuiceShopTargetInfo() : undefined,
      });

      console.log(promptSection);
    });
}
