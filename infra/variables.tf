variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "kalshi-use"
}

variable "openrouter_api_key" {
  description = "API key for OpenRouter (vision model routing)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_api_key" {
  description = "API key for Google Gemini"
  type        = string
  sensitive   = true
  default     = ""
}

variable "encryption_key" {
  description = "Fernet encryption key for storing platform credentials"
  type        = string
  sensitive   = true
  default     = ""
}
