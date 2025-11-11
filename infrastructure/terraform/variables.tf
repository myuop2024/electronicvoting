variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
}

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "vpc_id" {
  type        = string
  description = "VPC hosting the cluster"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs"
}
