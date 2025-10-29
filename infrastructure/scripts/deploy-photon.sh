#!/bin/bash
# GhostSOL Photon RPC Deployment Script
# Deploys Photon RPC indexer infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker/photon-rpc"

# Default values
DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-terraform}" # terraform or docker
ENVIRONMENT="${ENVIRONMENT:-production}"
SKIP_TESTS="${SKIP_TESTS:-false}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ "$DEPLOYMENT_METHOD" = "terraform" ]; then
        if ! command -v terraform &> /dev/null; then
            log_error "Terraform is not installed. Please install Terraform first."
            exit 1
        fi
        
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI is not installed. Please install AWS CLI first."
            exit 1
        fi
        
        log_info "Terraform version: $(terraform version | head -n1)"
    elif [ "$DEPLOYMENT_METHOD" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed. Please install Docker first."
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            log_error "Docker Compose is not installed. Please install Docker Compose first."
            exit 1
        fi
        
        log_info "Docker version: $(docker --version)"
        log_info "Docker Compose version: $(docker-compose --version)"
    else
        log_error "Invalid deployment method: $DEPLOYMENT_METHOD"
        exit 1
    fi
}

deploy_terraform() {
    log_info "Deploying with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    log_info "Planning deployment..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    if [ "$SKIP_TESTS" != "true" ]; then
        echo -e "${YELLOW}Do you want to proceed with deployment? (yes/no)${NC}"
        read -r response
        if [ "$response" != "yes" ]; then
            log_warn "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Apply configuration
    log_info "Applying Terraform configuration..."
    terraform apply tfplan
    
    # Get outputs
    log_info "Deployment complete! Here are the details:"
    terraform output
    
    # Save outputs to file
    terraform output -json > "$PROJECT_ROOT/terraform-outputs.json"
    log_info "Outputs saved to terraform-outputs.json"
}

deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    cd "$DOCKER_DIR"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        log_warn ".env file not found. Creating from .env.example..."
        cp .env.example .env
        log_warn "Please edit .env with your configuration before proceeding."
        exit 1
    fi
    
    # Build images
    log_info "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check service status
    docker-compose ps
}

wait_for_sync() {
    log_info "Waiting for indexer to sync..."
    
    if [ "$DEPLOYMENT_METHOD" = "terraform" ]; then
        HEALTH_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw health_endpoint 2>/dev/null || echo "")
        if [ -z "$HEALTH_URL" ]; then
            log_warn "Could not get health endpoint from Terraform output. Skipping sync check."
            return
        fi
    else
        HEALTH_URL="http://localhost:8080/health"
    fi
    
    bash "$SCRIPT_DIR/wait-for-sync.sh" "$HEALTH_URL"
}

run_health_check() {
    log_info "Running health checks..."
    
    if [ "$DEPLOYMENT_METHOD" = "terraform" ]; then
        RPC_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw rpc_endpoint 2>/dev/null || echo "")
        HEALTH_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw health_endpoint 2>/dev/null || echo "")
    else
        RPC_URL="http://localhost:8899"
        HEALTH_URL="http://localhost:8080/health"
    fi
    
    if [ -n "$RPC_URL" ] && [ -n "$HEALTH_URL" ]; then
        bash "$SCRIPT_DIR/health-check.sh" "$RPC_URL" "$HEALTH_URL"
    else
        log_warn "Could not determine endpoints. Skipping health check."
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "$TERRAFORM_DIR/tfplan" 2>/dev/null || true
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy GhostSOL Photon RPC infrastructure

OPTIONS:
    -m, --method METHOD      Deployment method (terraform|docker) [default: terraform]
    -e, --environment ENV    Environment (production|staging|development) [default: production]
    -s, --skip-tests         Skip confirmation prompts and health checks
    -h, --help              Show this help message

EXAMPLES:
    # Deploy with Terraform (production)
    $0 -m terraform -e production
    
    # Deploy with Docker (local development)
    $0 -m docker -e development
    
    # Deploy without prompts (CI/CD)
    $0 -m terraform -s

ENVIRONMENT VARIABLES:
    DEPLOYMENT_METHOD       Same as -m option
    ENVIRONMENT            Same as -e option
    SKIP_TESTS             Same as -s option

EOF
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--method)
                DEPLOYMENT_METHOD="$2"
                shift 2
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting GhostSOL Photon RPC deployment..."
    log_info "Deployment method: $DEPLOYMENT_METHOD"
    log_info "Environment: $ENVIRONMENT"
    
    # Run deployment
    check_prerequisites
    
    if [ "$DEPLOYMENT_METHOD" = "terraform" ]; then
        deploy_terraform
    elif [ "$DEPLOYMENT_METHOD" = "docker" ]; then
        deploy_docker
    fi
    
    # Post-deployment checks
    if [ "$SKIP_TESTS" != "true" ]; then
        wait_for_sync
        run_health_check
    fi
    
    cleanup
    
    log_info "Deployment complete!"
    log_info "Next steps:"
    log_info "1. Verify the service is running correctly"
    log_info "2. Update SDK RPC endpoints to use the new infrastructure"
    log_info "3. Monitor logs and metrics"
    log_info "4. Set up alerts for production monitoring"
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main "$@"
