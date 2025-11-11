terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "20.13.0"
  cluster_name    = var.cluster_name
  cluster_version = "1.29"
  vpc_id          = var.vpc_id
  subnet_ids      = var.private_subnet_ids

  eks_managed_node_groups = {
    api = {
      min_size     = 6
      max_size     = 200
      desired_size = 12
      instance_types = ["m6i.xlarge"]
    }
    worker = {
      min_size     = 4
      max_size     = 150
      desired_size = 8
      instance_types = ["c6i.xlarge"]
    }
  }
}
