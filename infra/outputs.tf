output "dynamodb_table_name" {
  value = aws_dynamodb_table.trading_logs.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.trading_logs.arn
}
