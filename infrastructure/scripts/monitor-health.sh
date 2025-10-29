#!/bin/bash
# GhostSOL Continuous Health Monitoring Script
# 
# This script performs continuous health checks on:
# - RPC endpoints
# - Forester queue status
# - API endpoint availability
# - Indexer sync status
#
# Alerts are sent to configured monitoring systems when thresholds are exceeded

set -euo pipefail

# Configuration
HEALTH_CHECK_INTERVAL=30
RPC_ENDPOINT="${RPC_ENDPOINT:-https://rpc.ghostsol.io}"
API_ENDPOINT="${API_ENDPOINT:-https://api.ghostsol.io}"
FORESTER_API="${FORESTER_API:-https://api.lightprotocol.com/forester}"
DATADOG_API_KEY="${DATADOG_API_KEY:-}"
PAGERDUTY_ROUTING_KEY="${PAGERDUTY_ROUTING_KEY:-}"

# Thresholds
RPC_TIMEOUT=5
FORESTER_QUEUE_WARNING=100
FORESTER_QUEUE_CRITICAL=200
MAX_BLOCKS_BEHIND=50

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Send metric to Datadog
send_metric() {
    local metric_name=$1
    local value=$2
    local tags=$3
    
    if [ -n "$DATADOG_API_KEY" ]; then
        local current_time=$(date +%s)
        curl -s -X POST "https://api.datadoghq.com/api/v1/series" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: ${DATADOG_API_KEY}" \
            -d "{
                \"series\": [{
                    \"metric\": \"${metric_name}\",
                    \"points\": [[${current_time}, ${value}]],
                    \"type\": \"gauge\",
                    \"tags\": [${tags}]
                }]
            }" > /dev/null 2>&1
    fi
}

# Send alert to PagerDuty
send_alert() {
    local severity=$1
    local summary=$2
    local details=$3
    
    if [ -n "$PAGERDUTY_ROUTING_KEY" ]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"${PAGERDUTY_ROUTING_KEY}\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"${summary}\",
                    \"severity\": \"${severity}\",
                    \"source\": \"ghostsol-health-monitor\",
                    \"custom_details\": ${details}
                }
            }" > /dev/null 2>&1
    fi
}

# Check RPC health
check_rpc_health() {
    log_info "Checking RPC health: ${RPC_ENDPOINT}"
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $RPC_TIMEOUT \
        -X POST "${RPC_ENDPOINT}/health" 2>&1)
    local end_time=$(date +%s%3N)
    local latency=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        log_info "RPC health check passed (${latency}ms)"
        send_metric "ghostsol.rpc.health" 1 "\"endpoint:${RPC_ENDPOINT}\""
        send_metric "ghostsol.rpc.latency" $latency "\"endpoint:${RPC_ENDPOINT}\""
        return 0
    else
        log_error "RPC health check failed: HTTP ${response}"
        send_metric "ghostsol.rpc.health" 0 "\"endpoint:${RPC_ENDPOINT}\""
        send_alert "critical" "RPC Health Check Failed" "{\"endpoint\": \"${RPC_ENDPOINT}\", \"status\": \"${response}\"}"
        return 1
    fi
}

# Check Forester queue depth
check_forester_queue() {
    log_info "Checking Forester queue depth"
    
    local queue_data=$(curl -s "${FORESTER_API}/queue" 2>&1)
    if [ $? -ne 0 ]; then
        log_error "Failed to fetch Forester queue data"
        return 1
    fi
    
    # Extract queue depth (assuming JSON response with "depth" field)
    local queue_depth=$(echo "$queue_data" | jq -r '.depth // 0' 2>/dev/null || echo "0")
    
    log_info "Forester queue depth: ${queue_depth}"
    send_metric "ghostsol.forester.queue_depth" $queue_depth "\"service:forester\""
    
    if [ "$queue_depth" -gt $FORESTER_QUEUE_CRITICAL ]; then
        log_error "Forester queue CRITICAL: ${queue_depth} > ${FORESTER_QUEUE_CRITICAL}"
        send_alert "critical" "Forester Queue Overflow" "{\"queue_depth\": ${queue_depth}, \"threshold\": ${FORESTER_QUEUE_CRITICAL}}"
        return 1
    elif [ "$queue_depth" -gt $FORESTER_QUEUE_WARNING ]; then
        log_warn "Forester queue WARNING: ${queue_depth} > ${FORESTER_QUEUE_WARNING}"
        send_alert "warning" "Forester Queue High" "{\"queue_depth\": ${queue_depth}, \"threshold\": ${FORESTER_QUEUE_WARNING}}"
        return 0
    else
        log_info "Forester queue healthy"
        return 0
    fi
}

# Check API endpoint availability
check_api_health() {
    log_info "Checking API health: ${API_ENDPOINT}"
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $RPC_TIMEOUT \
        "${API_ENDPOINT}/health" 2>&1)
    local end_time=$(date +%s%3N)
    local latency=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        log_info "API health check passed (${latency}ms)"
        send_metric "ghostsol.api.health" 1 "\"endpoint:${API_ENDPOINT}\""
        send_metric "ghostsol.api.latency" $latency "\"endpoint:${API_ENDPOINT}\""
        return 0
    else
        log_error "API health check failed: HTTP ${response}"
        send_metric "ghostsol.api.health" 0 "\"endpoint:${API_ENDPOINT}\""
        send_alert "critical" "API Endpoint Down" "{\"endpoint\": \"${API_ENDPOINT}\", \"status\": \"${response}\"}"
        return 1
    fi
}

# Check indexer sync status
check_indexer_sync() {
    log_info "Checking indexer sync status"
    
    local indexer_data=$(curl -s "${API_ENDPOINT}/indexer/status" 2>&1)
    if [ $? -ne 0 ]; then
        log_warn "Failed to fetch indexer status"
        return 1
    fi
    
    # Extract blocks behind (assuming JSON response)
    local blocks_behind=$(echo "$indexer_data" | jq -r '.blocks_behind // 0' 2>/dev/null || echo "0")
    
    log_info "Indexer blocks behind: ${blocks_behind}"
    send_metric "ghostsol.indexer.blocks_behind" $blocks_behind "\"service:indexer\""
    
    if [ "$blocks_behind" -gt $MAX_BLOCKS_BEHIND ]; then
        log_warn "Indexer sync lag: ${blocks_behind} blocks behind"
        send_alert "warning" "Indexer Sync Lag" "{\"blocks_behind\": ${blocks_behind}, \"threshold\": ${MAX_BLOCKS_BEHIND}}"
        return 1
    else
        log_info "Indexer sync healthy"
        return 0
    fi
}

# Main monitoring loop
main() {
    log_info "Starting GhostSOL health monitoring"
    log_info "Health check interval: ${HEALTH_CHECK_INTERVAL}s"
    log_info "RPC endpoint: ${RPC_ENDPOINT}"
    log_info "API endpoint: ${API_ENDPOINT}"
    
    while true; do
        echo "---"
        
        # Run all health checks
        check_rpc_health || true
        check_forester_queue || true
        check_api_health || true
        check_indexer_sync || true
        
        # Send heartbeat metric
        send_metric "ghostsol.monitor.heartbeat" 1 "\"host:$(hostname)\""
        
        log_info "Health check cycle complete. Sleeping ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Handle signals gracefully
trap 'log_info "Shutting down health monitor..."; exit 0' SIGINT SIGTERM

# Run main loop
main
