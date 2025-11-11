# Architecture Overview

ObserverNet is a production-grade multi-tenant election platform engineered for transparency, verifiability, and global scale. The monorepo is organized with Turborepo and PNPM to host shared packages and multiple Next.js frontends, Python microservices, and Fabric chaincode.

## Core Components

- **Web app (`apps/web`)** – Public election microsites, receipt verification flows, and WhatsApp deep links.
- **Admin app (`apps/admin`)** – Org administrators manage elections, allowlists, voting codes, paper ballot ingestion, and offline tallies.
- **Super admin app (`apps/superadmin`)** – Platform operators bootstrap Fabric environments, configure providers, and monitor health.
- **API service (`apps/api`)** – FastAPI with asynchronous endpoints for verification, allowlists, WhatsApp orchestration, voting, and results.
- **Verifier service (`apps/verifier`)** – Coordinates Didit session state and webhook handoff to the API.
- **Worker (`apps/worker`)** – Celery-based pipelines for OCR, AI-assisted review, notifications, and exports.
- **Fabric (`apps/chain`)** – Hyperledger Fabric dev environment, chaincode, and deployment scripts.

## Data Flow Summary

1. Voter joins election via web or WhatsApp. Policy evaluation determines whether a Didit session, access code, or hybrid verification is needed.
2. Successful verification triggers `RegisterSubject` on Fabric with the subject hash (salted + hashed, no PII) via the API service.
3. When the voter casts a ballot, the API writes a commitment hash, option identifier, and metadata (channel, offline flags) to Fabric using `CastVote`.
4. Fabric emits `VoteCast` events captured by the worker for dashboards and audit logs. Results are aggregated by channel and surfaced in admin dashboards and public embeds.
5. Paper ballots follow an OCR pipeline where images are redacted, transcribed, reviewed, and committed with `source=offline` metadata.

## Security & Compliance

- OWASP ASVS Level 2 controls including strict CSP, HSTS, TLS 1.3, WebAuthn MFA, signed webhooks, and RBAC.
- Audit log hash chaining ensures tamper-evident events across API and worker services.
- Secrets managed via Vault/KMS with service-specific access policies.

## Scalability

- Stateless services (API, verifier, web) scale horizontally behind Kubernetes HPA/KEDA.
- Redis Cluster for pub/sub and Celery broker; PostgreSQL 16 with Citus/Cockroach for multi-tenant sharding.
- k6 scenarios in `apps/docs/load-testing.md` outline ramp-up for 1,000,000 concurrent voters across web and WhatsApp channels.

## Developer Workflow

- Install dependencies with `pnpm install` and use Turborepo for task orchestration.
- Python services rely on Poetry; Dockerfiles are provided for reproducible builds.
- Fabric dev network can be launched via `apps/chain/scripts/dev-up.sh` for local experimentation.
