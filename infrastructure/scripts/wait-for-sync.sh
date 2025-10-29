#!/bin/bash
# GhostSOL Photon RPC Sync Waiter
# Waits for the Photon RPC indexer to complete initial sync

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
HEALTH_URL="${1:-http://localhost:8080/health}"
MAX_WAIT_TIME="${MAX_WAIT_TIME:-3600}" # 1 hour default
CHECK_INTERVAL="${CHECK_INTERVAL:-10}"  # 10 seconds
SYNC_LAG_THRESHOLD="${SYNC_LAG_THRESHOLD:-100}" # Consider synced if lag < 100 slots

# State
START_TIME=$(date +%s)
LAST_SLOT=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${BLUE}[PROGRESS]${NC} $1"
}

format_time() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    printf "%02d:%02d:%02d" $hours $minutes $secs
}

check_health() {
    curl -sf -m 5 "$HEALTH_URL" 2>/dev/null
}

get_sync_status() {
    local health_response="$1"
    
    # Try to extract sync information from health response
    local last_slot=$(echo "$health_response" | jq -r '.last_indexed_slot // .lastIndexedSlot // 0' 2>/dev/null)
    local sync_lag=$(echo "$health_response" | jq -r '.sync_lag_slots // .syncLagSlots // .sync_lag // 999999' 2>/dev/null)
    local status=$(echo "$health_response" | jq -r '.status // "unknown"' 2>/dev/null)
    
    echo "$last_slot|$sync_lag|$status"
}

calculate_progress() {
    local current_slot=$1
    local target_slot=$2
    
    if [ "$target_slot" -eq 0 ]; then
        echo "0"
        return
    fi
    
    local progress=$((current_slot * 100 / target_slot))
    echo "$progress"
}

display_progress_bar() {
    local progress=$1
    local width=50
    local filled=$((progress * width / 100))
    local empty=$((width - filled))
    
    printf "["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' '-'
    printf "] %3d%%" "$progress"
}

monitor_sync() {
    log_info "Monitoring sync progress for Photon RPC indexer"
    log_info "Health URL: $HEALTH_URL"
    log_info "Max wait time: $(format_time $MAX_WAIT_TIME)"
    log_info "Check interval: ${CHECK_INTERVAL}s"
    echo ""
    
    local iteration=0
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - START_TIME))
        
        # Check timeout
        if [ $elapsed -ge $MAX_WAIT_TIME ]; then
            log_error "Timeout reached after $(format_time $elapsed)"
            log_error "Indexer did not complete sync within the maximum wait time"
            return 1
        fi
        
        # Check health endpoint
        local health_response=$(check_health)
        
        if [ -z "$health_response" ]; then
            if [ $iteration -eq 0 ]; then
                log_warn "Health endpoint not responding yet. Waiting for service to start..."
            else
                log_warn "Health endpoint not responding (elapsed: $(format_time $elapsed))"
            fi
            sleep $CHECK_INTERVAL
            ((iteration++))
            continue
        fi
        
        # Parse sync status
        IFS='|' read -r last_slot sync_lag status <<< "$(get_sync_status "$health_response")"
        
        # Validate data
        if ! [[ "$last_slot" =~ ^[0-9]+$ ]]; then
            last_slot=0
        fi
        
        if ! [[ "$sync_lag" =~ ^[0-9]+$ ]]; then
            sync_lag=999999
        fi
        
        # Calculate progress
        local slots_synced=$((last_slot - LAST_SLOT))
        local rate=0
        if [ $CHECK_INTERVAL -gt 0 ]; then
            rate=$((slots_synced / CHECK_INTERVAL))
        fi
        
        # Display progress
        echo -ne "\r\033[K" # Clear line
        log_progress "Slot: $last_slot | Lag: $sync_lag slots | Rate: ${rate} slots/s | Status: $status | Elapsed: $(format_time $elapsed)"
        
        # Check if synced
        if [ "$sync_lag" -lt "$SYNC_LAG_THRESHOLD" ]; then
            echo "" # New line
            log_info "Indexer is synced! (lag: $sync_lag slots)"
            return 0
        fi
        
        # Update state
        LAST_SLOT=$last_slot
        ((iteration++))
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

show_final_status() {
    echo ""
    echo "================================================"
    log_info "Final Status Check"
    echo "================================================"
    
    local health_response=$(check_health)
    
    if [ -n "$health_response" ]; then
        echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
    else
        log_error "Could not get final status"
        return 1
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [HEALTH_URL]

Wait for GhostSOL Photon RPC indexer to complete initial sync

ARGUMENTS:
    HEALTH_URL             Health check endpoint URL [default: http://localhost:8080/health]

ENVIRONMENT VARIABLES:
    MAX_WAIT_TIME          Maximum time to wait in seconds [default: 3600]
    CHECK_INTERVAL         Seconds between checks [default: 10]
    SYNC_LAG_THRESHOLD     Maximum lag in slots to consider synced [default: 100]

EXAMPLES:
    # Wait for local instance
    $0
    
    # Wait for remote instance
    $0 http://my-rpc.example.com:8080/health
    
    # Custom wait time (30 minutes)
    MAX_WAIT_TIME=1800 $0
    
    # Quick checks (every 5 seconds)
    CHECK_INTERVAL=5 $0

EXIT CODES:
    0    Indexer is synced successfully
    1    Timeout or error occurred

EOF
}

main() {
    # Check for help flag
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install curl first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. Status parsing may be limited."
    fi
    
    # Monitor sync
    if monitor_sync; then
        show_final_status
        log_info "Photon RPC indexer is ready!"
        exit 0
    else
        show_final_status || true
        log_error "Photon RPC indexer sync failed or timed out"
        exit 1
    fi
}

main "$@"
