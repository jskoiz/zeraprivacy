#!/bin/bash
# Entrypoint script for Photon RPC container

set -e

echo "Starting GhostSOL Photon RPC Indexer..."
echo "Environment: ${ENVIRONMENT:-production}"
echo "Solana Cluster: ${SOLANA_CLUSTER:-devnet}"

# Wait for database to be ready (if using PostgreSQL)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    until pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-photon}"; do
        echo "Database is unavailable - sleeping"
        sleep 2
    done
    echo "Database is ready!"
fi

# Update configuration with environment variables
if [ -n "$SOLANA_RPC_URL" ]; then
    echo "Using custom RPC URL: $SOLANA_RPC_URL"
fi

# Run migrations or initialization if needed
# (Add any pre-start tasks here)

# Start the indexer
exec "$@"
