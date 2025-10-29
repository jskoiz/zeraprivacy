# GhostSOL Photon RPC Docker Image
# Light Protocol Indexer for ZK Compression state management

FROM ubuntu:22.04

LABEL maintainer="GhostSOL Team"
LABEL description="Light Protocol Photon RPC Indexer for GhostSOL"
LABEL version="1.0"

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    llvm \
    clang \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Clone Light Protocol repository
ARG LIGHT_PROTOCOL_VERSION=main
RUN git clone https://github.com/Lightprotocol/light-protocol.git && \
    cd light-protocol && \
    git checkout ${LIGHT_PROTOCOL_VERSION}

# Build Light Protocol indexer
WORKDIR /app/light-protocol
RUN cargo build --release --bin photon-indexer

# Create configuration directory
RUN mkdir -p /etc/photon-rpc

# Copy configuration file (will be mounted at runtime)
COPY config.toml /etc/photon-rpc/config.toml

# Create data directory
RUN mkdir -p /data/photon-rpc

# Expose ports
EXPOSE 8899  # RPC endpoint
EXPOSE 8080  # Health check endpoint
EXPOSE 8900  # WebSocket endpoint
EXPOSE 9090  # Metrics endpoint

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set up entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["/app/light-protocol/target/release/photon-indexer", "--config", "/etc/photon-rpc/config.toml"]
