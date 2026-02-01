#!/bin/bash
# Juice Shop Full Pentest Demo Script
# This script demonstrates OpenClaw Security's autonomous pentesting workflow
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - OpenClaw Security containers built
#   - Run: docker-compose up -d juice-shop security-sandbox
#
# Usage: ./scripts/juice-shop-demo.sh [target]
#   target: Juice Shop URL (default: http://juice-shop:3000)

set -e

# Configuration
TARGET="${1:-http://juice-shop:3000}"
OUTPUT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="${OUTPUT_DIR}/juice-shop-${TIMESTAMP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
cat << 'EOF'
   ___                    ____ _                 ____                       _ _         
  / _ \ _ __   ___ _ __  / ___| | __ ___      __/ ___|  ___  ___ _   _ _ __ (_) |_ _   _ 
 | | | | '_ \ / _ \ '_ \| |   | |/ _` \ \ /\ / /\___ \ / _ \/ __| | | | '__| | __| | | |
 | |_| | |_) |  __/ | | | |___| | (_| |\ V  V /  ___) |  __/ (__| |_| | |  | | |_| |_| |
  \___/| .__/ \___|_| |_|\____|_|\__,_| \_/\_/  |____/ \___|\___|\__,_|_|  |_|\__|\__, |
       |_|                                                                        |___/ 
  Juice Shop Pentest Demo
EOF
echo -e "${NC}"

# Functions
log_info() { echo -e "${BLUE}[*]${NC} $1"; }
log_success() { echo -e "${GREEN}[+]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[-]${NC} $1"; }
log_phase() { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}\n"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker ps | grep -q "juice-shop"; then
        log_warning "Juice Shop container not running. Starting..."
        docker-compose up -d juice-shop
        log_info "Waiting for Juice Shop to start..."
        sleep 10
    fi
    
    if ! docker ps | grep -q "security-sandbox"; then
        log_warning "Security sandbox not running. Starting..."
        docker-compose up -d security-sandbox
        sleep 5
    fi
    
    mkdir -p "$REPORT_DIR"
    log_success "Prerequisites check passed"
}

# Run command in security sandbox
run_security() {
    docker exec security-sandbox "$@"
}

# Phase 1: Reconnaissance
phase_recon() {
    log_phase "Phase 1: Reconnaissance"
    
    # Port scan
    log_info "Running nmap service scan..."
    run_security nmap -sV -sC -oX /reports/nmap_juice.xml "$TARGET" 2>/dev/null || true
    log_success "Nmap scan complete"
    
    # Technology detection
    log_info "Detecting technologies with whatweb..."
    run_security whatweb --log-json=/reports/whatweb.json "$TARGET" 2>/dev/null || true
    log_success "Technology detection complete"
    
    # HTTP probing
    log_info "Probing HTTP endpoints..."
    echo "$TARGET" | run_security httpx -tech-detect -status-code -json -o /reports/httpx.json 2>/dev/null || true
    log_success "HTTP probing complete"
}

# Phase 2: Web Enumeration
phase_enumeration() {
    log_phase "Phase 2: Web Enumeration"
    
    # Directory fuzzing
    log_info "Fuzzing directories with ffuf..."
    run_security ffuf -u "${TARGET}/FUZZ" \
        -w /wordlists/Discovery/Web-Content/common.txt \
        -mc 200,301,302,403 \
        -o /reports/ffuf_dirs.json \
        -of json 2>/dev/null || true
    log_success "Directory fuzzing complete"
    
    # API endpoint fuzzing
    log_info "Fuzzing API endpoints..."
    run_security ffuf -u "${TARGET}/api/FUZZ" \
        -w /wordlists/Discovery/Web-Content/api/api-endpoints.txt \
        -mc 200,301,302,403,500 \
        -o /reports/ffuf_api.json \
        -of json 2>/dev/null || true
    log_success "API fuzzing complete"
    
    # Check for robots.txt and sitemap
    log_info "Checking for robots.txt..."
    curl -s "${TARGET}/robots.txt" > "${REPORT_DIR}/robots.txt" 2>/dev/null || true
    log_success "Robots.txt check complete"
}

# Phase 3: Vulnerability Scanning
phase_vulnscan() {
    log_phase "Phase 3: Vulnerability Scanning"
    
    # Nuclei scan
    log_info "Running Nuclei vulnerability scan..."
    run_security nuclei -u "$TARGET" \
        -t cves/ \
        -t vulnerabilities/ \
        -t exposures/ \
        -s critical,high,medium \
        -o /reports/nuclei.json \
        -json 2>/dev/null || true
    log_success "Nuclei scan complete"
    
    # Nikto scan
    log_info "Running Nikto web server scan..."
    run_security nikto -h "$TARGET" -o /reports/nikto.txt 2>/dev/null || true
    log_success "Nikto scan complete"
    
    # SSL/TLS check (if HTTPS)
    if [[ "$TARGET" == https* ]]; then
        log_info "Running testssl.sh..."
        run_security testssl.sh --jsonfile /reports/testssl.json "$TARGET" 2>/dev/null || true
        log_success "SSL/TLS scan complete"
    fi
}

# Phase 4: Targeted Testing
phase_targeted() {
    log_phase "Phase 4: Targeted Testing"
    
    # SQL injection testing
    log_info "Testing for SQL injection..."
    # Test login endpoint
    run_security sqlmap -u "${TARGET}/rest/user/login" \
        --data='{"email":"*","password":"test"}' \
        --batch \
        --level=2 \
        --risk=1 \
        --output-dir=/reports/sqlmap 2>/dev/null || true
    log_success "SQL injection testing complete"
    
    # XSS testing
    log_info "Testing for XSS vulnerabilities..."
    # Test search parameter
    run_security xsstrike -u "${TARGET}/#/search?q=test" --skip-dom 2>/dev/null | tee "${REPORT_DIR}/xsstrike.txt" || true
    log_success "XSS testing complete"
    
    # JWT analysis
    log_info "Checking for JWT vulnerabilities..."
    # Juice Shop uses JWT for auth
    curl -s -X POST "${TARGET}/rest/user/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}' 2>/dev/null | \
        jq -r '.authentication.token // empty' > "${REPORT_DIR}/jwt_sample.txt" || true
    log_success "JWT analysis complete"
}

# Phase 5: Screenshot and Reporting
phase_reporting() {
    log_phase "Phase 5: Screenshot and Reporting"
    
    # Take screenshots
    log_info "Taking screenshots with gowitness..."
    echo "$TARGET" | run_security gowitness file -f - -P /reports/screenshots 2>/dev/null || true
    log_success "Screenshots captured"
    
    # Copy reports from container
    log_info "Copying reports from container..."
    docker cp security-sandbox:/reports/. "$REPORT_DIR/" 2>/dev/null || true
    log_success "Reports copied to $REPORT_DIR"
    
    # Generate summary
    log_info "Generating summary report..."
    generate_summary
}

# Generate summary report
generate_summary() {
    SUMMARY_FILE="${REPORT_DIR}/SUMMARY.md"
    
    cat > "$SUMMARY_FILE" << EOF
# Juice Shop Pentest Summary

**Target:** $TARGET
**Date:** $(date)
**Report Directory:** $REPORT_DIR

## Executive Summary

This automated penetration test was performed against OWASP Juice Shop using OpenClaw Security.

## Findings Overview

### Files Generated
EOF

    # List generated files
    echo "" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
    ls -la "$REPORT_DIR" >> "$SUMMARY_FILE" 2>/dev/null || true
    echo '```' >> "$SUMMARY_FILE"
    
    # Add nuclei findings summary if available
    if [ -f "${REPORT_DIR}/nuclei.json" ]; then
        echo "" >> "$SUMMARY_FILE"
        echo "### Nuclei Vulnerabilities" >> "$SUMMARY_FILE"
        echo '```' >> "$SUMMARY_FILE"
        jq -r '[.info.severity] | group_by(.) | map({severity: .[0], count: length})' "${REPORT_DIR}/nuclei.json" 2>/dev/null >> "$SUMMARY_FILE" || echo "No findings" >> "$SUMMARY_FILE"
        echo '```' >> "$SUMMARY_FILE"
    fi
    
    # Add ffuf findings summary if available
    if [ -f "${REPORT_DIR}/ffuf_dirs.json" ]; then
        echo "" >> "$SUMMARY_FILE"
        echo "### Discovered Directories" >> "$SUMMARY_FILE"
        echo '```' >> "$SUMMARY_FILE"
        jq -r '.results[].url' "${REPORT_DIR}/ffuf_dirs.json" 2>/dev/null | head -20 >> "$SUMMARY_FILE" || echo "No directories found" >> "$SUMMARY_FILE"
        echo '```' >> "$SUMMARY_FILE"
    fi

    cat >> "$SUMMARY_FILE" << EOF

## Recommendations

1. Review all findings in individual tool reports
2. Prioritize critical and high severity vulnerabilities
3. Test fixes in staging before production deployment
4. Schedule follow-up assessment after remediation

## Disclaimer

This assessment was performed on OWASP Juice Shop, a deliberately vulnerable application designed for security training. All findings are expected behaviors for this training application.

---
*Generated by OpenClaw Security*
EOF

    log_success "Summary report generated: $SUMMARY_FILE"
}

# Main execution
main() {
    echo ""
    log_info "Starting Juice Shop penetration test"
    log_info "Target: $TARGET"
    log_info "Output: $REPORT_DIR"
    echo ""
    
    check_prerequisites
    phase_recon
    phase_enumeration
    phase_vulnscan
    phase_targeted
    phase_reporting
    
    log_phase "Pentest Complete!"
    log_success "All phases completed successfully"
    log_success "Reports saved to: $REPORT_DIR"
    echo ""
    log_info "View summary: cat $REPORT_DIR/SUMMARY.md"
    echo ""
}

# Run main
main "$@"
