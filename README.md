# ObserverNet Election Platform Monorepo

ObserverNet is a multi-tenant, verifiable online election platform designed for electoral observation groups. The platform provides zero-fee ballot storage on Hyperledger Fabric, Didit.me identity verification, and rich admin experiences across web and WhatsApp channels.

## Monorepo Structure

```
apps/
  web/         # Public microsites, voter flows, receipt verification (Next.js 15)
  admin/       # Org admin portal for election management, policies, OCR review
  superadmin/  # Platform operations portal for Fabric controls, providers, AI governance
  api/         # FastAPI service orchestrating verification, voting, allowlists, results
  verifier/    # Didit session coordinator and webhook endpoint
  chain/       # Hyperledger Fabric dev network, chaincode, deploy scripts
  worker/      # Celery/Dramatiq workers for OCR, notifications, exports
  docs/        # Architecture, runbooks, load testing
packages/
  ui/          # Shared React components (shadcn/ui + Tailwind)
  config/      # Shared Tailwind/PostCSS/TS configs
  proto/       # JSON schemas and validation primitives
infrastructure/
  k8s/helm/    # Kubernetes deployment manifests
  terraform/   # Cloud provisioning for EKS and supporting services
```

## Key Capabilities

- Multi-tenant org model with customizable microsites, branding, and observer links.
- Verification via Didit.me with signed webhook handling and subject registration on Fabric.
- Voting policies supporting allowlists, access codes, hybrid verification, offline ingestion, and vote types (plurality, approval, IRV, weighted).
- WhatsApp Business API integration with conversational flow and fallbacks.
- Paper ballot OCR with AI-assisted review, provenance tracking, and offline vote commitments.
- Audit-ready security posture: WebAuthn MFA, OWASP ASVS L2 controls, strict CSP/HSTS, hash-chained audit logs.

## Getting Started

1. Install dependencies: `pnpm install`
2. Launch web apps: `pnpm dev:web`, `pnpm dev:admin`, `pnpm dev:superadmin`
3. Bootstrap Fabric dev network:
   ```bash
   cd apps/chain
   ./scripts/dev-up.sh
   ./scripts/deploy-chaincode.sh
   ```
4. Run API locally:
   ```bash
   cd apps/api
   poetry install
   poetry run uvicorn observernet_api.app:create_app --factory --reload
   ```
5. Start worker:
   ```bash
   cd apps/worker
   poetry install
   poetry run celery -A observernet_worker.celery_app worker --loglevel=info
   ```

## Testing & Quality

- Frontend: `pnpm test --filter web` or Playwright specs per app.
- Backend: `poetry run pytest` within service directories.
- Security: integrate Trivy/Grype/Snyk via GitHub Actions workflows (to be added).
- Load: follow k6 profiles defined in `apps/docs/load-testing.md`.

## Environment Variables

See `.env.example` for required secrets including Didit, WhatsApp, email providers, Gemini/OpenRouter, and Fabric MSP paths. Secrets should be sourced from Vault/KMS in production deployments.
