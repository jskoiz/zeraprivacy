# GhostSOL Photon RPC Terraform Configuration

This directory contains Terraform configuration for deploying the GhostSOL Photon RPC infrastructure on AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** v1.0 or higher installed
3. **AWS CLI** configured with credentials
4. **SSH Key Pair** created in AWS EC2

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Configure Variables

Copy and edit the variables file:

```bash
cp variables.tfvars my-environment.tfvars
# Edit my-environment.tfvars with your settings
```

Key variables to configure:
- `aws_region`: AWS region for deployment
- `environment`: Environment name (production, staging, development)
- `ssh_key_name`: Your SSH key pair name in AWS
- `allowed_ssh_cidr`: Your IP address for SSH access
- `solana_cluster`: Target Solana cluster (devnet or mainnet-beta)

### 3. Plan Deployment

Review the resources that will be created:

```bash
terraform plan -var-file=my-environment.tfvars
```

### 4. Deploy Infrastructure

```bash
terraform apply -var-file=my-environment.tfvars
```

This will create:
- EC2 instance (c6i.4xlarge)
- 2TB gp3 EBS volume
- Security groups
- Elastic IP
- IAM roles and policies
- CloudWatch log groups and alarms

### 5. Access the Instance

After deployment, get the SSH command:

```bash
terraform output ssh_command
```

Get the RPC endpoint:

```bash
terraform output rpc_endpoint
```

## Architecture

```
┌─────────────────────────────────────────┐
│         AWS Cloud (us-east-1)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  EC2 Instance (c6i.4xlarge)       │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Photon RPC Indexer         │ │ │
│  │  │  - Port 8899 (RPC)          │ │ │
│  │  │  - Port 8080 (Health)       │ │ │
│  │  │  - Port 8900 (WebSocket)    │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  Storage: 2TB gp3 SSD            │ │
│  └───────────────────────────────────┘ │
│              │                          │
│              │ Elastic IP               │
│              ▼                          │
│  ┌───────────────────────────────────┐ │
│  │  CloudWatch Logs & Alarms         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Resource Details

### EC2 Instance
- **Type**: c6i.4xlarge (16 vCPU, 32GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 2TB gp3 SSD (16,000 IOPS, 1000 MB/s throughput)
- **Network**: Elastic IP for stable endpoint

### Security
- SSH access restricted to specified CIDR blocks
- RPC endpoints accessible for monitoring
- Encrypted EBS volumes
- IAM role with CloudWatch permissions

### Monitoring
- CloudWatch Logs for system logs
- CPU utilization alarms (>80%)
- Instance status check alarms
- Custom metrics via CloudWatch agent

## Cost Estimate

Monthly costs (us-east-1):
- EC2 c6i.4xlarge: ~$450/month
- 2TB gp3 storage: ~$160/month
- Data transfer: ~$10-50/month (varies)
- CloudWatch: ~$10/month
- **Total**: ~$630-680/month

## Maintenance

### View Service Status

```bash
ssh ubuntu@<instance-ip>
sudo systemctl status photon-rpc
```

### View Logs

```bash
# System logs
sudo journalctl -u photon-rpc -f

# CloudWatch logs
aws logs tail /aws/ec2/ghostsol-photon-rpc-production --follow
```

### Update Configuration

1. Edit `/opt/photon-rpc/config.toml` on the instance
2. Restart the service: `sudo systemctl restart photon-rpc`

### Update Photon RPC

```bash
cd /opt/photon-rpc/light-protocol
git pull
cargo build --release --bin photon-indexer
sudo systemctl restart photon-rpc
```

## Scaling

### Vertical Scaling

To increase instance resources:

1. Update `instance_type` in variables.tfvars
2. Run `terraform apply`
3. The instance will be replaced (brief downtime)

### Horizontal Scaling

For redundancy, deploy multiple instances:

1. Create separate Terraform workspaces
2. Deploy to different regions
3. Use DNS load balancing or failover

## Disaster Recovery

### Backup Strategy

- EBS snapshots: Automated daily
- Configuration: Version controlled in Git
- State: Terraform state in S3 backend

### Recovery Procedure

1. Deploy new instance with Terraform
2. Restore from latest EBS snapshot
3. Update DNS to new Elastic IP
4. Verify sync status

## Troubleshooting

### Instance Not Responding

1. Check AWS console for instance status
2. Verify security group rules
3. Check CloudWatch logs for errors

### Sync Issues

1. Verify Solana cluster RPC is accessible
2. Check disk space: `df -h`
3. Review indexer logs: `journalctl -u photon-rpc`

### High CPU Usage

1. Review CloudWatch metrics
2. Consider upgrading instance type
3. Optimize indexer configuration

## Clean Up

To destroy all resources:

```bash
terraform destroy -var-file=my-environment.tfvars
```

**Warning**: This will permanently delete the instance and all data!

## Security Best Practices

1. **SSH Access**: Restrict to specific IP addresses
2. **Rotate Keys**: Change SSH keys periodically
3. **Updates**: Apply security patches regularly
4. **Monitoring**: Set up alerting for suspicious activity
5. **Backups**: Enable automated EBS snapshots

## Support

For issues or questions:
- Documentation: `/workspace/docs/research/liveness-and-infra.md`
- GitHub Issues: [GhostSOL repository]
- Discord: [GhostSOL community]

## License

See main repository LICENSE file.
