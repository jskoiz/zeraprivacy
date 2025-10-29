# GhostSOL Photon RPC Terraform Variables
# Copy this file and customize for your environment

# AWS Configuration
aws_region = "us-east-1"
environment = "production"

# Instance Configuration
instance_type = "c6i.4xlarge" # 16 vCPU, 32GB RAM
volume_size   = 2000          # 2TB SSD

# SSH Access
ssh_key_name     = "ghostsol-photon-key"
allowed_ssh_cidr = ["YOUR_IP_ADDRESS/32"] # Replace with your IP

# Solana Configuration
solana_cluster = "devnet" # Change to "mainnet-beta" for production
