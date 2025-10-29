#!/bin/bash
# User data script for Photon RPC instance initialization
# This script runs on first boot to set up the environment

set -e

echo "Starting GhostSOL Photon RPC initialization..."

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    pkg-config \
    libssl-dev \
    libudev-dev \
    llvm \
    clang \
    docker.io \
    docker-compose \
    awscli \
    jq

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Configure Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Create application directory
mkdir -p /opt/photon-rpc
cd /opt/photon-rpc

# Clone Light Protocol repository
git clone https://github.com/Lightprotocol/light-protocol.git
cd light-protocol

# Checkout specific version (use latest stable)
git checkout main

# Build Light Protocol indexer
echo "Building Light Protocol indexer..."
cargo build --release --bin photon-indexer

# Create configuration
cat > /opt/photon-rpc/config.toml <<EOL
[indexer]
cluster = "${solana_cluster}"
rpc_url = "https://api.${solana_cluster}.solana.com"
ws_url = "wss://api.${solana_cluster}.solana.com"

[server]
host = "0.0.0.0"
port = 8899
health_port = 8080

[database]
# PostgreSQL configuration for state storage
url = "postgresql://photon:photon@localhost:5432/photon_${environment}"

[monitoring]
enabled = true
metrics_port = 9090
EOL

# Set up systemd service
cat > /etc/systemd/system/photon-rpc.service <<EOL
[Unit]
Description=GhostSOL Photon RPC Indexer
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/photon-rpc
ExecStart=/opt/photon-rpc/light-protocol/target/release/photon-indexer --config /opt/photon-rpc/config.toml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Enable and start service
systemctl daemon-reload
systemctl enable photon-rpc
systemctl start photon-rpc

# Set up CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOL
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/ghostsol-photon-rpc-${environment}",
            "log_stream_name": "syslog-${instance_name}"
          },
          {
            "file_path": "/var/log/cloud-init-output.log",
            "log_group_name": "/aws/ec2/ghostsol-photon-rpc-${environment}",
            "log_stream_name": "cloud-init-${instance_name}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "GhostSOL/PhotonRPC",
    "metrics_collected": {
      "cpu": {
        "measurement": [{"name": "cpu_usage_idle", "unit": "Percent"}],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [{"name": "used_percent", "unit": "Percent"}],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [{"name": "mem_used_percent", "unit": "Percent"}],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOL

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

echo "Photon RPC initialization complete!"
echo "Service status:"
systemctl status photon-rpc --no-pager
