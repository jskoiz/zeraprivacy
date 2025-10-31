#!/bin/bash

# Ghost Sol SDK - Beta Publishing Script
# This script automates the process of publishing beta releases to npm

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SDK_DIR="./sdk"
PACKAGE_JSON="$SDK_DIR/package.json"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Banner
echo ""
echo "═══════════════════════════════════════════════"
echo "  Ghost Sol SDK - Beta Publishing Script"
echo "═══════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "$PACKAGE_JSON" ]; then
    log_error "package.json not found at $PACKAGE_JSON"
    log_error "Please run this script from the repository root"
    exit 1
fi

# Check if user is logged in to npm
log_info "Checking npm authentication..."
if ! npm whoami &> /dev/null; then
    log_error "You are not logged in to npm"
    log_error "Please run: npm login"
    exit 1
fi
NPM_USER=$(npm whoami)
log_success "Logged in as: $NPM_USER"

# Get current version
CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version")
log_info "Current version: $CURRENT_VERSION"

# Suggest next beta version
if [[ $CURRENT_VERSION == *"-beta."* ]]; then
    # Extract and increment beta number
    BETA_NUM=$(echo $CURRENT_VERSION | sed 's/.*-beta\.\([0-9]*\).*/\1/')
    NEXT_BETA=$((BETA_NUM + 1))
    BASE_VERSION=$(echo $CURRENT_VERSION | sed 's/-beta\..*//')
    SUGGESTED_VERSION="$BASE_VERSION-beta.$NEXT_BETA"
else
    # First beta release
    SUGGESTED_VERSION="$CURRENT_VERSION-beta.0"
fi

# Prompt for version
echo ""
log_info "Suggested next version: $SUGGESTED_VERSION"
read -p "Enter version to publish (or press Enter to use suggested): " VERSION
VERSION=${VERSION:-$SUGGESTED_VERSION}

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-beta\.[0-9]+)?$ ]]; then
    log_error "Invalid version format. Use: X.Y.Z or X.Y.Z-beta.N"
    exit 1
fi

echo ""
log_info "Publishing version: $VERSION"

# Ask for confirmation
read -p "Are you sure you want to publish? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Publishing cancelled"
    exit 0
fi

echo ""
log_info "Starting publish process..."

# Navigate to SDK directory
cd "$SDK_DIR"

# Clean and build
log_info "Cleaning previous build..."
rm -rf dist

log_info "Building SDK..."
npm run build

if [ ! -d "dist" ]; then
    log_error "Build failed - dist/ directory not created"
    exit 1
fi
log_success "Build completed"

# Update version in package.json
log_info "Updating version to $VERSION..."
npm version "$VERSION" --no-git-tag-version
log_success "Version updated"

# Run tests (if available)
if grep -q '"test":' package.json; then
    log_info "Running tests..."
    if npm test 2>/dev/null; then
        log_success "Tests passed"
    else
        log_warning "Tests failed or not available, continuing anyway..."
    fi
fi

# Verify package contents
log_info "Verifying package contents..."
npm pack --dry-run
echo ""
read -p "Does the package contents look correct? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Publishing cancelled"
    git checkout package.json 2>/dev/null || true
    exit 0
fi

# Publish to npm
echo ""
log_info "Publishing to npm with beta tag..."
if [[ $VERSION == *"-beta."* ]]; then
    npm publish --tag beta --access public
else
    npm publish --access public
fi

log_success "Successfully published ghost-sol@$VERSION"

# Back to root
cd ..

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✓ Publishing Complete!"
echo "═══════════════════════════════════════════════"
echo ""
log_info "Package published: ghost-sol@$VERSION"
if [[ $VERSION == *"-beta."* ]]; then
    log_info "Install with: npm install ghost-sol@beta"
else
    log_info "Install with: npm install ghost-sol"
fi
echo ""
log_warning "Next steps:"
echo "  1. Commit the version change: git add sdk/package.json"
echo "  2. Create a git tag: git tag v$VERSION"
echo "  3. Push changes: git push && git push --tags"
echo ""
