# OpenClaw Security — Product Requirements Document

> AI-powered autonomous pentesting assistant built on openclaw's agent infrastructure

## Vision

Transform openclaw into **OpenClaw Security** — a viral-worthy cybersecurity assistant that can autonomously perform reconnaissance, vulnerability scanning, and exploitation tasks using industry-standard Kali tools, all orchestrated by an AI agent.

## Target Users

- Security professionals with authorized access to target systems
- CTF competitors  
- Security researchers
- Red team operators

---

## Architecture

### Sandbox: Kali-Rolling Docker

- **Base image:** `kalilinux/kali-rolling`
- **Network:** `bridge` (required for external scanning)
- **Workspace:** `/workspace` (rw) for reports/artifacts
- **Wordlists:** Mount host `/usr/share/wordlists` or SecLists to `/wordlists:ro`

### Tool Categories (21 Tools)

**Reconnaissance (5)**
- nmap — Network scanning & service detection
- masscan — Ultra-fast port scanning
- subfinder — Subdomain enumeration
- amass — Attack surface mapping
- whatweb — Website fingerprinting

**Web Application (5)**
- nuclei — Template-based vulnerability scanning
- nikto — Web server scanner
- ffuf — Web fuzzer (dirs/params)
- httpx — HTTP probing toolkit
- wpscan — WordPress scanner

**Vulnerability Assessment (4)**
- sqlmap — SQL injection automation
- xsstrike — XSS detection
- testssl.sh — SSL/TLS analysis
- searchsploit — Exploit database search

**Exploitation (1)**
- metasploit-framework — Exploitation framework with msfconsole, msfvenom

**Credentials (2)**
- hydra — Login brute-forcing
- john — Password cracking

**Reporting (2)**
- gowitness — Screenshot web pages
- jq — JSON processing (built-in)

**Wordlists (mounted)**
- SecLists — Comprehensive wordlist collection at `/wordlists`

### Demo Environment

Bundle OWASP Juice Shop in docker-compose for safe demonstration.

### Legal Disclaimer

- **Default:** ON (shows warning before scans)
- **Config:** `security.disclaimer: false` to disable for pre-authorized environments
- All users bound by system consent agreements

### Rate Limiting

- **Default:** No limit (for CTF/lab environments)
- **Production mode:** `security.rateLimit: true`
  - nmap: `--max-rate 100`
  - masscan: `--rate 100`
  - ffuf: `-rate 10`
  - nuclei: `-rl 10`
  - hydra: `-t 4`
- **Config:** `security.maxRequestsPerSecond: N` for custom limits

---

## Tasks

### Phase 1: Sandbox Infrastructure

- [ ] 1. Create `Dockerfile.security` with `kalilinux/kali-rolling` base and non-root user
- [ ] 2. Install recon tools: nmap, masscan, subfinder, amass, whatweb
- [ ] 3. Install web tools: nuclei, nikto, ffuf, httpx, wpscan
- [ ] 4. Install vuln tools: sqlmap, xsstrike, testssl.sh, exploitdb (searchsploit)
- [ ] 5. Install exploitation tools: metasploit-framework
- [ ] 6. Install cred tools: hydra, john
- [ ] 7. Install reporting tools: gowitness, jq
- [ ] 8. Configure SecLists wordlist mount at /wordlists
- [ ] 9. Add `security-sandbox` service to docker-compose.yml with network bridge
- [ ] 10. Add Juice Shop demo target service to docker-compose.yml

### Phase 2: Agent Configuration

- [ ] 11. Add security sandbox constants in src/sandbox/constants.ts
- [ ] 12. Create security agent profile with network=bridge, wordlist mount
- [ ] 13. Update tool allowlist for security operations (exec, process, read, write)
- [ ] 14. Add security-focused system prompt section with tool guidance
- [ ] 15. Implement disclaimer prompt with config toggle (security.disclaimer)
- [ ] 16. Implement rate limiting config (security.rateLimit, security.maxRequestsPerSecond)
- [ ] 17. Add scan output parsing helpers for structured results (nmap XML, nuclei JSON)

### Phase 3: CLI Integration

- [ ] 18. Add `openclaw security` CLI command group
- [ ] 19. Add `openclaw security scan` subcommand with target validation
- [ ] 20. Add `openclaw security recon` workflow template  
- [ ] 21. Add --no-disclaimer flag for authorized environments
- [ ] 22. Add --rate-limit flag for production target scanning
- [ ] 23. Add --wordlist flag to specify custom wordlist path

### Phase 4: Documentation & Demo

- [ ] 24. Create docs/security/getting-started.md with setup instructions
- [ ] 25. Create docs/security/tools.md documenting all 21 tools
- [ ] 26. Create docs/security/rate-limiting.md for production usage
- [ ] 27. Create demo script: Juice Shop full pentest (recon → exploit → report)
- [ ] 28. Record demo GIF showing autonomous pentest flow
- [ ] 29. Add security badges and demo GIF to README
- [ ] 30. Create SECURITY-DISCLAIMER.md with legal notice and authorization requirements

---

## Success Metrics

- [ ] Agent can autonomously complete Juice Shop pentest end-to-end
- [ ] All 21 tools working in sandbox with proper output parsing
- [ ] Rate limiting works correctly for production scans
- [ ] Wordlists accessible at /wordlists in sandbox
- [ ] Metasploit msfconsole runs and can generate payloads
- [ ] Demo GIF shows impressive recon → vuln scan → exploit flow
- [ ] Clean CLI UX with proper warnings and authorization checks
- [ ] Ready for viral Twitter/LinkedIn demo 🔥
