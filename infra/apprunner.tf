# ─────────────────────────────────────────────
# ECR Repository
# ─────────────────────────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "${var.app_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ─────────────────────────────────────────────
# IAM Role for App Runner Instance (runtime)
# ─────────────────────────────────────────────

data "aws_iam_policy_document" "apprunner_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${var.app_name}-apprunner-instance-role"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_role.json

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [
      aws_dynamodb_table.trading_logs.arn,
      "${aws_dynamodb_table.trading_logs.arn}/index/*",
      aws_dynamodb_table.market_snapshots.arn,
      "${aws_dynamodb_table.market_snapshots.arn}/index/*",
      aws_dynamodb_table.predictions.arn,
      "${aws_dynamodb_table.predictions.arn}/index/*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = [
      "${aws_s3_bucket.images.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "dynamodb_access" {
  name   = "${var.app_name}-dynamodb-access"
  policy = data.aws_iam_policy_document.dynamodb_access.json
}

resource "aws_iam_role_policy_attachment" "apprunner_dynamodb" {
  role       = aws_iam_role.apprunner_instance.name
  policy_arn = aws_iam_policy.dynamodb_access.arn
}

# ─────────────────────────────────────────────
# IAM Role for App Runner ECR Access (image pull)
# ─────────────────────────────────────────────

data "aws_iam_policy_document" "apprunner_ecr_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${var.app_name}-apprunner-ecr-access"
  assume_role_policy = data.aws_iam_policy_document.apprunner_ecr_assume_role.json

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# ─────────────────────────────────────────────
# IAM User for GitHub Actions CI/CD
# ─────────────────────────────────────────────

resource "aws_iam_user" "github_actions" {
  name = "${var.app_name}-github-actions"

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "github_actions" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
}

resource "aws_iam_policy" "github_actions" {
  name   = "${var.app_name}-github-actions"
  policy = data.aws_iam_policy_document.github_actions.json
}

resource "aws_iam_user_policy_attachment" "github_actions" {
  user       = aws_iam_user.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}

# ─────────────────────────────────────────────
# App Runner Service
# ─────────────────────────────────────────────

resource "aws_apprunner_service" "backend" {
  service_name = "${var.app_name}-backend"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8000"

        runtime_environment_variables = {
          AWS_DEFAULT_REGION       = var.aws_region
          TABLE_NAME               = aws_dynamodb_table.trading_logs.name
          SNAPSHOTS_TABLE_NAME     = aws_dynamodb_table.market_snapshots.name
          PREDICTIONS_TABLE_NAME   = aws_dynamodb_table.predictions.name
          S3_BUCKET_NAME           = aws_s3_bucket.images.id
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = "1024"
    memory            = "2048"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}
