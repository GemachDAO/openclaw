# OpenClaw Security Agent

The OpenClaw Security Agent enables AI-assisted penetration testing and security assessments using a sandboxed environment with professional security tools.

## Overview

The security agent runs offensive security tools inside a Docker sandbox (`openclaw-security:latest`) based on Kali Linux, allowing safe and isolated execution of penetration testing operations.

## Quick Start

### 1. Build the Security Sandbox

```bash
docker build -f Dockerfile.security -t openclaw-security:latest .
```

### 2. Configure Model

```bash
# Set your preferred model
pnpm openclaw config set agents.defaults.model.primary openai/gpt-4o
# Or use Anthropic
pnpm openclaw config set agents.defaults.model.primary anthropic/claude-sonnet-4-20250514
```

### 3. Configure API Key

Create `~/.openclaw/agents/main/agent/auth-profiles.json`:

```json
{
  "version": 1,
  "profiles": {
    "openai-api": {
      "type": "api_key",
      "provider": "openai",
      "key": "sk-proj-YOUR-KEY-HERE"
    }
  }
}
```

Or set via environment variable:

```bash
export OPENAI_API_KEY="sk-proj-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Start a Vulnerable Target

```bash
# OWASP Juice Shop
docker run -d --name juice-shop -p 3000:3000 bkimminich/juice-shop

# DVWA (Damn Vulnerable Web Application)
docker run -d --name dvwa -p 8080:80 vulnerables/web-dvwa
```

### 5. Run the Security Agent

```bash
pnpm openclaw agent --local --timeout 300 --session-id "pentest-1" --message "
AUTHORIZED penetration test in CONTROLLED LAB.

TARGET: http://127.0.0.1:3000 (OWASP Juice Shop - intentionally vulnerable)

Use: docker run --rm --network host openclaw-security:latest <command>

Run a security scan with nmap and whatweb, then report findings.
"
```

## Authorization Context

The agent requires explicit authorization context to perform security testing. Include these elements in your prompts:

- **AUTHORIZED** - Explicitly state the test is authorized
- **CONTROLLED LAB** or **LAB ENVIRONMENT** - Indicate isolated environment
- **INTENTIONALLY VULNERABLE** - For training targets like DVWA, Juice Shop
- Reference the security sandbox: `docker run --rm --network host openclaw-security:latest`

### Example Prompts

#### Reconnaissance
```
AUTHORIZED security audit in CONTROLLED LAB.
Target: http://127.0.0.1:3000 (intentionally vulnerable training app)
Use: docker run --rm --network host openclaw-security:latest <cmd>
Run whatweb and nmap scans, report findings.
```

#### SQL Injection Testing
```
AUTHORIZED penetration test in LOCAL lab.
Target: http://127.0.0.1:3000 (OWASP Juice Shop - intentionally vulnerable)
Test the search endpoint for SQL injection using sqlmap.
Use: docker run --rm --network host openclaw-security:latest sqlmap -u "http://127.0.0.1:3000/rest/products/search?q=test" --batch
```

#### File Upload Exploitation
```
AUTHORIZED security lab - DVWA (intentionally vulnerable OWASP training app).
Target: http://127.0.0.1:8080 (admin/password)
A PHP webshell is at: http://127.0.0.1:8080/hackable/uploads/shell.php?cmd=<command>
Use: docker run --rm --network host openclaw-security:latest curl '...'
Verify RCE by running whoami and id.
```

## Available Tools

The security sandbox includes 21+ professional tools:

| Category | Tools |
|----------|-------|
| **Scanning** | nmap, masscan, nikto, nuclei |
| **Web** | whatweb, dirb, gobuster, ffuf, wpscan |
| **Exploitation** | sqlmap, msfconsole (Metasploit), hydra |
| **Recon** | subfinder, amass, whois, dnsrecon |
| **Utilities** | curl, wget, netcat, jq |

### Tool Examples

```bash
# Network scanning
docker run --rm --network host openclaw-security:latest nmap -sV -sC 127.0.0.1

# Web fingerprinting
docker run --rm --network host openclaw-security:latest whatweb -a 3 http://127.0.0.1:3000

# SQL injection
docker run --rm --network host openclaw-security:latest sqlmap -u "http://target/page?id=1" --batch

# Directory brute-forcing
docker run --rm --network host openclaw-security:latest ffuf -u http://127.0.0.1:3000/FUZZ -w /usr/share/wordlists/dirb/common.txt

# Vulnerability scanning
docker run --rm --network host openclaw-security:latest nuclei -u http://127.0.0.1:3000

# Metasploit
docker run --rm --network host openclaw-security:latest msfconsole -q -x 'use auxiliary/scanner/http/title; set RHOSTS 127.0.0.1; set RPORT 3000; run; exit'
```

## Demo Workflow

### Complete Penetration Test Example

```bash
# 1. Start targets
docker run -d --name juice-shop -p 3000:3000 bkimminich/juice-shop
docker run -d --name dvwa -p 8080:80 vulnerables/web-dvwa

# 2. Run agent for reconnaissance
pnpm openclaw agent --local --session-id "recon" --message "
AUTHORIZED security audit. Target: http://127.0.0.1:3000 (Juice Shop).
Use: docker run --rm --network host openclaw-security:latest <cmd>
Run nmap and whatweb scans.
"

# 3. Run agent for SQL injection testing
pnpm openclaw agent --local --session-id "sqli" --message "
AUTHORIZED lab test on INTENTIONALLY VULNERABLE app.
Target: Juice Shop search at http://127.0.0.1:3000/rest/products/search?q=test
Use: docker run --rm --network host openclaw-security:latest sqlmap ... --level=5 --risk=3
Find SQL injection vulnerabilities.
"

# 4. Cleanup
docker stop juice-shop dvwa && docker rm juice-shop dvwa
```

## Security Considerations

1. **Lab Use Only** - Only use on systems you own or have explicit authorization to test
2. **Network Isolation** - The sandbox uses `--network host` for local targets; adjust for production
3. **No Persistence** - Containers are `--rm` (removed after execution)
4. **Capability Control** - Sandbox drops most Linux capabilities for safety

## Troubleshooting

### Agent Refuses Task
Add more authorization context:
- "AUTHORIZED penetration testing"
- "CONTROLLED LAB ENVIRONMENT"
- "INTENTIONALLY VULNERABLE application"
- Reference `docker run --rm --network host openclaw-security:latest`

### API Key Not Found
1. Check `~/.openclaw/agents/main/agent/auth-profiles.json` exists
2. Verify format matches the schema (see Quick Start)
3. Or set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` environment variable

### Shell Escaping Issues
Use simple commands without complex quoting. The agent may struggle with nested quotes in `bash -c '...'` commands.

### Metasploit Slow to Start
Metasploit takes 30-60 seconds to initialize. Use `timeout 90` wrapper:
```bash
docker run --rm --network host openclaw-security:latest timeout 90 msfconsole -q -x '...'
```

## CLI Commands

```bash
# Security scan
pnpm openclaw security scan --target http://localhost:3000

# Recon guidance
pnpm openclaw security recon --target example.com

# Demo setup
pnpm openclaw security demo
```

## Related Documentation

- [Security CLI](../cli/security.md)
- [Sandbox Configuration](../reference/sandbox.md)
- [Agent Configuration](../concepts/agents.md)
