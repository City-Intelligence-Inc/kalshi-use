output "dynamodb_table_name" {
  value = aws_dynamodb_table.trading_logs.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.trading_logs.arn
}

output "snapshots_table_name" {
  value = aws_dynamodb_table.market_snapshots.name
}

output "snapshots_table_arn" {
  value = aws_dynamodb_table.market_snapshots.arn
}

output "predictions_table_name" {
  value = aws_dynamodb_table.predictions.name
}

output "predictions_table_arn" {
  value = aws_dynamodb_table.predictions.arn
}

output "integrations_table_name" {
  value = aws_dynamodb_table.integrations.name
}

output "integrations_table_arn" {
  value = aws_dynamodb_table.integrations.arn
}

output "s3_bucket_name" {
  value = aws_s3_bucket.images.id
}

output "apprunner_service_url" {
  description = "The URL of the App Runner service"
  value       = aws_apprunner_service.backend.service_url
}

output "apprunner_service_arn" {
  description = "The ARN of the App Runner service"
  value       = aws_apprunner_service.backend.arn
}

output "ecr_repository_url" {
  description = "The ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "github_actions_access_key_id" {
  description = "AWS access key ID for GitHub Actions (add as repo secret AWS_ACCESS_KEY_ID)"
  value       = aws_iam_access_key.github_actions.id
}

output "github_actions_secret_access_key" {
  description = "AWS secret access key for GitHub Actions (add as repo secret AWS_SECRET_ACCESS_KEY)"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}
