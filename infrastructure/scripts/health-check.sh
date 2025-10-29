#!/bin/bash
# GhostSOL Photon RPC Health Check Script
# Verifies that the Photon RPC indexer is running correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
RPC_URL="${1:-http://localhost:8899}"
HEALTH_URL="${2:-http://localhost:8080/health}"
TIMEOUT=10
RETRY_COUNT=3

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

test_passed() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

test_failed() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

retry_command() {
    local cmd="$1"
    local description="$2"
    local count=0
    
    while [ $count -lt $RETRY_COUNT ]; do
        if eval "$cmd" &>/dev/null; then
            return 0
        fi
        ((count++))
        if [ $count -lt $RETRY_COUNT ]; then
            log_warn "$description failed, retrying ($count/$RETRY_COUNT)..."
            sleep 2
        fi
    done
    
    return 1
}

check_health_endpoint() {
    log_info "Testing health endpoint: $HEALTH_URL"
    
    if retry_command "curl -sf -m $TIMEOUT $HEALTH_URL" "Health check"; then
        local response=$(curl -sf -m $TIMEOUT "$HEALTH_URL")
        echo "$response" | jq . 2>/dev/null || echo "$response"
        
        # Check for healthy status
        if echo "$response" | grep -q '"status".*"healthy"' || echo "$response" | grep -q "healthy"; then
            test_passed "Health endpoint is responding (healthy)"
        else
            test_failed "Health endpoint responding but status is not healthy"
        fi
    else
        test_failed "Health endpoint is not responding"
        return 1
    fi
}

check_rpc_endpoint() {
    log_info "Testing RPC endpoint: $RPC_URL"
    
    # Test getHealth method
    local health_payload='{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
    
    if retry_command "curl -sf -m $TIMEOUT -X POST -H 'Content-Type: application/json' -d '$health_payload' $RPC_URL" "RPC health"; then
        local response=$(curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$health_payload" "$RPC_URL")
        echo "$response" | jq . 2>/dev/null || echo "$response"
        
        if echo "$response" | grep -q '"result"'; then
            test_passed "RPC endpoint is responding to getHealth"
        else
            test_failed "RPC endpoint responded but with unexpected format"
        fi
    else
        test_failed "RPC endpoint is not responding to getHealth"
        return 1
    fi
}

check_rpc_version() {
    log_info "Testing RPC getVersion method"
    
    local version_payload='{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
    
    if curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$version_payload" "$RPC_URL" &>/dev/null; then
        local response=$(curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$version_payload" "$RPC_URL")
        echo "$response" | jq . 2>/dev/null || echo "$response"
        
        if echo "$response" | grep -q '"solana-core"'; then
            test_passed "RPC getVersion is working"
        else
            test_warn "RPC responded but version format unexpected"
        fi
    else
        test_failed "RPC getVersion is not responding"
    fi
}

check_compression_methods() {
    log_info "Testing ZK Compression RPC methods"
    
    # Test getCompressedAccountsByOwner (this may fail if no accounts exist, which is ok)
    local owner="11111111111111111111111111111111"
    local compression_payload="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getCompressedAccountsByOwner\",\"params\":[\"$owner\"]}"
    
    if curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$compression_payload" "$RPC_URL" &>/dev/null; then
        local response=$(curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$compression_payload" "$RPC_URL")
        
        # Check if response is valid JSON-RPC (even if result is empty, that's ok)
        if echo "$response" | grep -q '"jsonrpc".*"2.0"'; then
            test_passed "ZK Compression RPC methods are available"
        else
            test_failed "ZK Compression RPC methods returned unexpected format"
        fi
    else
        test_warn "ZK Compression RPC methods may not be available (this is ok for non-Light RPC)"
    fi
}

check_response_time() {
    log_info "Testing RPC response time"
    
    local health_payload='{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
    local start_time=$(date +%s%N)
    
    if curl -sf -m $TIMEOUT -X POST -H "Content-Type: application/json" -d "$health_payload" "$RPC_URL" &>/dev/null; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        log_info "Response time: ${duration}ms"
        
        if [ $duration -lt 1000 ]; then
            test_passed "Response time is acceptable (<1s)"
        elif [ $duration -lt 5000 ]; then
            test_warn "Response time is slow (${duration}ms, target: <1s)"
        else
            test_failed "Response time is too slow (${duration}ms)"
        fi
    else
        test_failed "Could not measure response time"
    fi
}

check_metrics_endpoint() {
    log_info "Checking Prometheus metrics endpoint"
    
    # Extract base URL and port
    local base_url=$(echo "$RPC_URL" | sed 's|:\([0-9]*\).*|:9090/metrics|')
    
    if curl -sf -m $TIMEOUT "$base_url" &>/dev/null; then
        local metrics=$(curl -sf -m $TIMEOUT "$base_url")
        
        if echo "$metrics" | grep -q "^#"; then
            test_passed "Metrics endpoint is responding"
            
            # Count metrics
            local metric_count=$(echo "$metrics" | grep -c "^[a-z]" || echo "0")
            log_info "Found $metric_count metrics"
        else
            test_warn "Metrics endpoint responding but format unexpected"
        fi
    else
        test_warn "Metrics endpoint not available (may be disabled or on different port)"
    fi
}

print_summary() {
    echo ""
    echo "================================================"
    echo "Health Check Summary"
    echo "================================================"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo "================================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All health checks passed!${NC}"
        return 0
    else
        echo -e "${RED}Some health checks failed. Please review the output above.${NC}"
        return 1
    fi
}

main() {
    log_info "Starting GhostSOL Photon RPC health checks..."
    log_info "RPC URL: $RPC_URL"
    log_info "Health URL: $HEALTH_URL"
    echo ""
    
    # Check if curl and jq are available
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install curl to run health checks."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. JSON output will not be formatted."
    fi
    
    # Run all health checks
    check_health_endpoint || true
    echo ""
    
    check_rpc_endpoint || true
    echo ""
    
    check_rpc_version || true
    echo ""
    
    check_compression_methods || true
    echo ""
    
    check_response_time || true
    echo ""
    
    check_metrics_endpoint || true
    echo ""
    
    # Print summary and exit with appropriate code
    print_summary
}

main "$@"
