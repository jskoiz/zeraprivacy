# GhostSOL Photon RPC Infrastructure
# Terraform configuration for deploying Light Protocol Photon RPC indexer

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "ghostsol-terraform-state"
    key    = "photon-rpc/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "GhostSOL"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type for Photon RPC"
  type        = string
  default     = "c6i.4xlarge" # 16 vCPU, 32GB RAM
}

variable "volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 2000 # 2TB SSD
}

variable "ssh_key_name" {
  description = "SSH key pair name for instance access"
  type        = string
  default     = "ghostsol-photon-key"
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH into the instance"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Replace with your IP in production
}

variable "solana_cluster" {
  description = "Solana cluster (mainnet-beta, devnet)"
  type        = string
  default     = "devnet"
}

# Data sources
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "photon_rpc" {
  name        = "ghostsol-photon-rpc-${var.environment}"
  description = "Security group for GhostSOL Photon RPC"
  
  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }
  
  # RPC endpoint (internal)
  ingress {
    description = "Photon RPC"
    from_port   = 8899
    to_port     = 8899
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Health check endpoint
  ingress {
    description = "Health Check"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Websocket endpoint
  ingress {
    description = "WebSocket"
    from_port   = 8900
    to_port     = 8900
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "ghostsol-photon-rpc-sg-${var.environment}"
  }
}

# IAM Role for CloudWatch Logs
resource "aws_iam_role" "photon_rpc" {
  name = "ghostsol-photon-rpc-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "ghostsol-photon-rpc-role"
  }
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs" {
  role       = aws_iam_role.photon_rpc.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "photon_rpc" {
  name = "ghostsol-photon-rpc-profile-${var.environment}"
  role = aws_iam_role.photon_rpc.name
}

# EC2 Instance - Primary Photon RPC
resource "aws_instance" "photon_rpc_primary" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name
  
  iam_instance_profile = aws_iam_instance_profile.photon_rpc.name
  vpc_security_group_ids = [aws_security_group.photon_rpc.id]
  
  root_block_device {
    volume_size = var.volume_size
    volume_type = "gp3"
    iops        = 16000 # Max IOPS for gp3
    throughput  = 1000  # Max throughput (MB/s)
    encrypted   = true
    
    tags = {
      Name = "ghostsol-photon-rpc-primary-volume"
    }
  }
  
  user_data = templatefile("${path.module}/user-data.sh", {
    environment     = var.environment
    solana_cluster  = var.solana_cluster
    instance_name   = "primary"
  })
  
  monitoring = true
  
  tags = {
    Name        = "ghostsol-photon-rpc-primary"
    Environment = var.environment
    Role        = "photon-rpc"
  }
  
  lifecycle {
    create_before_destroy = false
  }
}

# Elastic IP for stable endpoint
resource "aws_eip" "photon_rpc_primary" {
  instance = aws_instance.photon_rpc_primary.id
  domain   = "vpc"
  
  tags = {
    Name = "ghostsol-photon-rpc-primary-eip"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "photon_rpc" {
  name              = "/aws/ec2/ghostsol-photon-rpc-${var.environment}"
  retention_in_days = 30
  
  tags = {
    Name = "ghostsol-photon-rpc-logs"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "ghostsol-photon-rpc-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors Photon RPC CPU utilization"
  
  dimensions = {
    InstanceId = aws_instance.photon_rpc_primary.id
  }
  
  tags = {
    Name = "photon-rpc-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = "ghostsol-photon-rpc-status-check-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "This metric monitors instance status checks"
  
  dimensions = {
    InstanceId = aws_instance.photon_rpc_primary.id
  }
  
  tags = {
    Name = "photon-rpc-status-alarm"
  }
}

# Outputs
output "instance_id" {
  description = "ID of the Photon RPC instance"
  value       = aws_instance.photon_rpc_primary.id
}

output "public_ip" {
  description = "Public IP address of Photon RPC"
  value       = aws_eip.photon_rpc_primary.public_ip
}

output "rpc_endpoint" {
  description = "Photon RPC endpoint URL"
  value       = "http://${aws_eip.photon_rpc_primary.public_ip}:8899"
}

output "health_endpoint" {
  description = "Health check endpoint URL"
  value       = "http://${aws_eip.photon_rpc_primary.public_ip}:8080/health"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${aws_eip.photon_rpc_primary.public_ip}"
}
