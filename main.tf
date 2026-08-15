# Autonomous Income Deployment Infrastructure
# Zero-human intervention deployment system

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  
  backend "s3" {
    bucket = "autonomous-income-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "autonomous-income-vpc"
    Environment = var.environment
    ManagedBy   = "Terraform"
    AutoHealing = "enabled"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  
  map_public_ip_on_launch = true
  
  tags = {
    Name = "autonomous-income-public-${count.index + 1}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name = "autonomous-income-private-${count.index + 1}"
    Type = "Private"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "autonomous-income-igw"
  }
}

# ECS Cluster for containerized applications
resource "aws_ecs_cluster" "main" {
  name = "autonomous-income-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name        = "autonomous-income-cluster"
    Environment = var.environment
  }
}

# Lambda Functions for serverless income generation
resource "aws_lambda_function" "income_generator" {
  function_name = "autonomous-income-generator"
  role         = aws_iam_role.lambda_role.arn
  handler      = "index.handler"
  runtime      = "python3.11"
  timeout      = 300
  memory_size  = 1024
  
  filename         = "lambda/income_generator.zip"
  source_code_hash = filebase64sha256("lambda/income_generator.zip")
  
  environment {
    variables = {
      ENVIRONMENT     = var.environment
      AUTO_HEALING    = "true"
      LOG_LEVEL       = "INFO"
    }
  }
  
  tags = {
    Name    = "income-generator"
    Purpose = "autonomous-revenue"
  }
}

# CloudWatch Log Group for Lambda with retention policy
resource "aws_cloudwatch_log_group" "income_generator" {
  name              = "/aws/lambda/${aws_lambda_function.income_generator.function_name}"
  retention_in_days = 30

  tags = {
    Name        = "income-generator-logs"
    Environment = var.environment
  }
}

# CloudWatch Event Rule for scheduled income generation
resource "aws_cloudwatch_event_rule" "hourly_income" {
  name                = "autonomous-income-hourly"
  description         = "Trigger income generation every hour"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.hourly_income.name
  target_id = "IncomeLambda"
  arn       = aws_lambda_function.income_generator.arn
}

# DynamoDB for state management
resource "aws_dynamodb_table" "income_state" {
  name           = "autonomous-income-state"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  ttl {
    attribute_name = "expiry"
    enabled        = true
  }
  
  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
  
  tags = {
    Name        = "income-state"
    Environment = var.environment
  }
}

# S3 Bucket for data storage
resource "aws_s3_bucket" "data" {
  bucket = "autonomous-income-data-${var.environment}"
  
  tags = {
    Name        = "income-data"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access to the data bucket
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce SSL-only access to the data bucket
resource "aws_s3_bucket_policy" "data_ssl_only" {
  bucket = aws_s3_bucket.data.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonSSL"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*",
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.data]
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "autonomous-income-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Auto Scaling for self-healing
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/income-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "autonomous-income-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ECS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors ECS CPU utilization"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
  }
}

# Outputs
output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "lambda_function_name" {
  value       = aws_lambda_function.income_generator.function_name
  description = "Income generator Lambda function name"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.income_state.name
  description = "DynamoDB state table name"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.data.bucket
  description = "S3 data bucket name"
}
