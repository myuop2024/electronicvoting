output "cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS control plane endpoint"
}

output "cluster_security_group_id" {
  value       = module.eks.cluster_security_group_id
  description = "Security group for API server"
}
