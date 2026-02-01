---
title: Rate Limiting Guide
description: Configure rate limits for production pentesting with OpenClaw Security
---

# Rate Limiting Guide

Rate limiting prevents overloading targets and getting blocked during security assessments. This guide covers production-safe scanning configurations.

## Why Rate Limiting?

1. **Avoid detection** — High-rate scans trigger IDS/IPS and WAF rules
2. **Prevent denial of service** — Don't accidentally DoS production systems
3. **Respect target resources** — Shared infrastructure can affect other users
4. **Stay compliant** — Many pentest rules of engagement specify rate limits

## Configuration

### Enable Rate Limiting

```bash
# Via environment variable
export OPENCLAW_SECURITY_RATE_LIMIT=true
openclaw security scan target.com

# Via config
openclaw config set security.rateLimit true
```

### Disable for Lab Environments

```bash
# Disable rate limiting for CTF/lab targets
export OPENCLAW_SECURITY_RATE_LIMIT=false
openclaw security scan juice-shop:3000
```

## Tool-Specific Limits

OpenClaw Security applies sensible defaults for production scanning:

| Tool | Production Limit | Flag Used |
|------|------------------|-----------|
| nmap | 100 packets/sec | `--max-rate 100` |
| masscan | 100 packets/sec | `--rate 100` |
| nuclei | 10 requests/sec | `-rl 10` |
| ffuf | 10 requests/sec | `-rate 10` |
| httpx | 20 requests/sec | `-rl 20` |
| hydra | 4 threads | `-t 4` |
| nikto | 1 thread (default) | `-maxtime 3600` |

### nmap

```bash
# Production (rate limited)
nmap -sV --max-rate 100 target.com

# Lab (full speed)
nmap -sV target.com
```

### nuclei

```bash
# Production
nuclei -u https://target.com -rl 10 -c 2

# Lab
nuclei -u https://target.com
```

### ffuf

```bash
# Production
ffuf -u https://target.com/FUZZ -w wordlist.txt -rate 10

# Lab
ffuf -u https://target.com/FUZZ -w wordlist.txt
```

### hydra

```bash
# Production (4 parallel threads)
hydra -t 4 -l admin -P passwords.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"

# Lab (16 threads)
hydra -t 16 -l admin -P passwords.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"
```

## Recommended Profiles

### Conservative (Production)

Best for live production systems with strict SLAs:

```bash
openclaw config set security.rateProfile conservative
```

| Tool | Limit |
|------|-------|
| nmap | 50 packets/sec |
| nuclei | 5 requests/sec |
| ffuf | 5 requests/sec |
| hydra | 2 threads |

### Standard (Production)

Default for most production assessments:

```bash
openclaw config set security.rateProfile standard
```

Uses the tool defaults listed above.

### Aggressive (Lab Only)

For CTFs, Juice Shop, and isolated test environments:

```bash
openclaw config set security.rateProfile aggressive
```

No rate limits applied. Use only on systems you own or in isolated environments.

## Automatic Detection

OpenClaw Security can detect common lab environments and adjust accordingly:

```bash
# Juice Shop - detected as lab
openclaw security scan juice-shop:3000
# → Rate limiting disabled

# External domain - production mode
openclaw security scan example.com
# → Rate limiting enabled
```

### Known Lab Signatures

- `juice-shop` hostname
- `localhost` / `127.0.0.1`
- `*.local` domains
- Internal RFC 1918 ranges (optional)

## Manual Override

Force a specific mode regardless of detection:

```bash
# Force production mode on internal target
OPENCLAW_SECURITY_RATE_LIMIT=true openclaw security scan internal.corp

# Force lab mode on external target (not recommended)
OPENCLAW_SECURITY_RATE_LIMIT=false openclaw security scan target.com
```

## Rate Limit Errors

### "Rate limit exceeded" from target

The target's WAF or rate limiter is blocking requests. Solutions:

1. **Reduce rate further:**
   ```bash
   nuclei -u https://target.com -rl 2
   ```

2. **Add delays:**
   ```bash
   nmap --scan-delay 1s target.com
   ```

3. **Use multiple source IPs** (with authorization)

### "Connection refused" after many requests

Target may be blocking your IP. Solutions:

1. Wait 10-15 minutes for rate limits to reset
2. Contact target admin if you're authorized
3. Use VPN or rotate IP (with proper authorization)

## Best Practices

### Before Scanning

1. **Verify authorization** — Written permission from asset owner
2. **Review scope** — IP ranges and domains explicitly authorized
3. **Check rules of engagement** — Rate limits often specified
4. **Test connectivity** — Single request before full scan

### During Scanning

1. **Monitor responses** — Watch for 429/503 errors
2. **Adjust dynamically** — Reduce rate if errors appear
3. **Log everything** — Keep records for reporting

### After Scanning

1. **Verify no impact** — Check target is still operational
2. **Document rates used** — Include in final report
3. **Note any blocks** — Document if you were rate limited

## Integration with CI/CD

For automated security scanning in pipelines:

```yaml
# .github/workflows/security.yml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run security scan
        env:
          OPENCLAW_SECURITY_RATE_LIMIT: true
        run: |
          openclaw security scan ${{ secrets.TARGET_URL }} --output results.json
```

## API Reference

### getRateLimitFlags(tool: string, production: boolean)

Returns rate limit flags for a given tool:

```typescript
import { getRateLimitFlags } from 'openclaw/security';

const flags = getRateLimitFlags('nmap', true);
// Returns: ['--max-rate', '100']
```

### injectRateLimits(command: string, production: boolean)

Automatically injects rate limits into a command string:

```typescript
import { injectRateLimits } from 'openclaw/security';

const cmd = injectRateLimits('nmap -sV target.com', true);
// Returns: 'nmap -sV --max-rate 100 target.com'
```
