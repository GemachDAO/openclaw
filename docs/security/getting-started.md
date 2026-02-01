---
title: Getting Started with OpenClaw Security
description: Set up the autonomous AI pentesting assistant
---

# Getting Started with OpenClaw Security

OpenClaw Security transforms OpenClaw into an autonomous AI pentesting assistant with industry-standard Kali Linux tools.

## Prerequisites

- Docker and Docker Compose installed
- OpenClaw installed (`npm install -g openclaw`)
- Basic familiarity with security testing concepts

## Quick Start

### 1. Build the Security Sandbox

```bash
# Build the Kali-based security sandbox image
docker-compose build security-sandbox

# This creates openclaw-security:latest with 21 security tools
```

### 2. Start the Demo Environment

```bash
# Start the security sandbox and Juice Shop demo target
docker-compose up -d security-sandbox juice-shop

# Verify containers are running
docker-compose ps
```

### 3. Enter the Sandbox

```bash
# Access the security sandbox shell
docker exec -it openclaw-security-sandbox bash

# You're now in a Kali-based environment with:
# - Reconnaissance tools (nmap, masscan, subfinder, amass, whatweb)
# - Web scanning tools (nuclei, nikto, ffuf, httpx, wpscan)
# - Vulnerability tools (sqlmap, xsstrike, testssl.sh, searchsploit)
# - Metasploit Framework
# - Credential tools (hydra, john)
# - Reporting tools (gowitness, jq)
# - SecLists wordlists at /wordlists
```

### 4. Run Your First Scan

```bash
# Inside the security sandbox, scan the demo target
nmap -sV -sC juice-shop

# Run vulnerability scanning
nuclei -u http://juice-shop:3000 -t cves/

# Fuzz for hidden directories
ffuf -u http://juice-shop:3000/FUZZ -w /wordlists/Discovery/Web-Content/common.txt
```

## CLI Commands

OpenClaw Security adds these CLI commands:

### `openclaw security scan <target>`

Run a structured security scan against a target.

```bash
# Full scan with all phases
openclaw security scan example.com

# Reconnaissance only
openclaw security scan example.com --recon

# With rate limiting for production
openclaw security scan example.com --rate-limit --max-rps 10

# Skip disclaimer (for pre-authorized targets)
openclaw security scan example.com --no-disclaimer
```

### `openclaw security recon <target>`

Quick reconnaissance workflow guide.

```bash
openclaw security recon example.com
```

### `openclaw security demo`

Show demo commands for Juice Shop.

```bash
# Show demo workflow
openclaw security demo

# Start Juice Shop automatically
openclaw security demo --start
```

### `openclaw security prompt`

Generate system prompt section for security agents.

```bash
# Basic prompt section
openclaw security prompt

# With rate limiting guidance
openclaw security prompt --rate-limit

# With Juice Shop target scope
openclaw security prompt --juice-shop
```

## Configuration

### Security Sandbox Settings

Configure the security sandbox in `~/.openclaw/config.json5`:

```json5
{
  "agents": {
    "list": [
      {
        "id": "security-scanner",
        "name": "Security Assistant",
        "sandbox": {
          "mode": "all",
          "scope": "agent",
          "workspaceAccess": "rw",
          "docker": {
            "image": "openclaw-security:latest",
            "network": "bridge",  // Required for external scanning
            "memory": "4g",
            "cpus": 2
          }
        }
      }
    ]
  }
}
```

### Rate Limiting

Enable rate limiting for production targets:

```json5
{
  "security": {
    "rateLimit": true,
    "maxRequestsPerSecond": 10
  }
}
```

### Disclaimer

Disable the disclaimer for pre-authorized environments:

```json5
{
  "security": {
    "disclaimer": false
  }
}
```

## Included Tools

| Category | Tools |
|----------|-------|
| Reconnaissance | nmap, masscan, subfinder, amass, whatweb |
| Web Application | nuclei, nikto, ffuf, httpx, wpscan |
| Vulnerability Assessment | sqlmap, xsstrike, testssl.sh, searchsploit |
| Exploitation | metasploit-framework (msfconsole, msfvenom) |
| Credentials | hydra, john |
| Reporting | gowitness, jq |

## Wordlists

SecLists is pre-installed at `/wordlists` (symlinked from `/usr/share/seclists`):

- `/wordlists/Discovery/Web-Content/common.txt`
- `/wordlists/Discovery/Web-Content/directory-list-2.3-medium.txt`
- `/wordlists/Passwords/Common-Credentials/10k-most-common.txt`
- `/wordlists/Discovery/DNS/subdomains-top1million-5000.txt`

## Next Steps

- Read the [Tools Reference](/security/tools) for detailed tool usage
- Learn about [Rate Limiting](/security/rate-limiting) for production scans
- Try the [Juice Shop Demo](/security/juice-shop-demo) walkthrough

## ⚠️ Legal Notice

Only scan systems you have explicit authorization to test. Unauthorized scanning may violate laws and regulations. All scanning activities are logged for audit purposes.
