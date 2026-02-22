terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "trading_logs" {
  name         = "kalshi-use-trading-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "trade_id"

  attribute {
    name = "trade_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    App         = "kalshi-use"
  }
}

resource "aws_dynamodb_table" "predictions" {
  name         = "kalshi-use-predictions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "prediction_id"

  attribute {
    name = "prediction_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    App         = "kalshi-use"
  }
}

resource "aws_s3_bucket" "images" {
  bucket = "kalshi-use-images"

  tags = {
    Environment = var.environment
    App         = "kalshi-use"
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "market_snapshots" {
  name         = "kalshi-use-market-snapshots"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_ticker"
  range_key    = "scraped_at"

  attribute {
    name = "event_ticker"
    type = "S"
  }

  attribute {
    name = "scraped_at"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    range_key       = "scraped_at"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    App         = "kalshi-use"
  }
}
