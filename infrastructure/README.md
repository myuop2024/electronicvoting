# Infrastructure Overview

Infrastructure as Code is split between Kubernetes Helm charts and Terraform modules. Helm charts provide deploy-time configuration for each microservice, while Terraform provisions shared cloud primitives (EKS, networking, databases, Redis, Vault).

## Helm

- `k8s/helm/api`: Deploys the FastAPI service with autoscaling, TLS, and secret references.
- Additional charts should be created for web frontends, worker pools, verifier service, Redis, Postgres, and Fabric peers.

## Terraform

- `main.tf`: Provisions EKS with managed node groups tuned for API and worker workloads.
- Integrate with AWS MSK, MemoryDB, or other managed offerings as the platform evolves.

Secrets such as Didit keys, WhatsApp credentials, and email provider tokens must be injected via Vault or Kubernetes Secrets sourced from external secret stores.
