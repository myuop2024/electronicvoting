# ObserverNet Election Platform - Deployment Guide

## Production Deployment Checklist

### Prerequisites

- [ ] PostgreSQL 14+ database
- [ ] Redis 6+ instance
- [ ] Hyperledger Fabric network (v2.5+)
- [ ] Domain names configured with SSL certificates
- [ ] Email provider account (AWS SES, SMTP, or SendGrid)
- [ ] SMS provider account (Twilio)
- [ ] Didit.me API credentials
- [ ] Container orchestration (Kubernetes recommended)

---

## Phase 1: Infrastructure Setup

### 1.1 Database Setup

```bash
# Create PostgreSQL database
createdb observernet_prod

# Run migrations (from packages/database)
cd packages/database
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### 1.2 Redis Setup

```bash
# Start Redis with persistence enabled
redis-server --appendonly yes --requirepass YOUR_REDIS_PASSWORD
```

### 1.3 Hyperledger Fabric Network

#### Option A: Use Existing Fabric Network

1. Obtain connection profile and certificates from network administrator
2. Place certificates in secure location:
   ```
   /etc/fabric/crypto/
   ├── user.crt      # Client certificate
   ├── user.key      # Private key
   └── ca.crt        # TLS CA certificate
   ```
3. Update environment variables:
   ```bash
   FABRIC_GATEWAY_URL=peer0.org1.example.com:7051
   FABRIC_CERT_PATH=/etc/fabric/crypto/user.crt
   FABRIC_KEY_PATH=/etc/fabric/crypto/user.key
   FABRIC_TLS_CA_CERT=/etc/fabric/crypto/ca.crt
   ```

#### Option B: Deploy New Fabric Network

```bash
# Navigate to chain directory
cd apps/chain

# Start Fabric network (development)
./scripts/dev-up.sh

# Deploy chaincode
./scripts/deploy-chaincode.sh

# For production, use Kubernetes operator:
# See: https://github.com/hyperledger/fabric-operator
```

---

## Phase 2: Service Configuration

### 2.1 Email Provider Setup

#### AWS SES

```bash
# Verify domain in AWS SES
aws ses verify-domain-identity --domain observernet.org

# Configure DKIM and SPF records in DNS

# Create SES SMTP credentials
aws iam create-access-key --user-name ses-smtp-user

# Set environment variables
export EMAIL_PROVIDER=ses
export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
export AWS_SES_FROM_EMAIL=noreply@observernet.org
```

#### SMTP

```bash
export EMAIL_PROVIDER=smtp
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=your_username
export SMTP_PASSWORD=your_password
export SMTP_FROM_EMAIL=noreply@observernet.org
```

### 2.2 SMS Provider Setup (Twilio)

```bash
# Get credentials from: https://console.twilio.com
export SMS_PROVIDER=twilio
export TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_PHONE_NUMBER=+1234567890
```

### 2.3 WhatsApp Business API

```bash
# Enable WhatsApp in Twilio console
# Request WhatsApp Business number approval

export WHATSAPP_PROVIDER=twilio
export WHATSAPP_FROM_NUMBER=whatsapp:+1234567890
```

### 2.4 Didit.me Identity Verification

```bash
# Get API credentials from: https://didit.me/developers

export DIDIT_API_KEY=didit_live_XXXXXXXXXXXXXXXX
export DIDIT_CLIENT_ID=client_XXXXXXXXXXXXXXXX
export DIDIT_CLIENT_SECRET=your_client_secret

# Generate webhook secret
export DIDIT_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Configure webhook URL in Didit dashboard:
# https://api.observernet.org/webhooks/didit
```

---

## Phase 3: Application Deployment

### 3.1 Backend API (FastAPI)

```bash
cd apps/api

# Install dependencies
poetry install --no-dev

# Run database migrations
poetry run alembic upgrade head

# Start API server
poetry run uvicorn observernet_api.app:create_app --factory \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4

# Or use Gunicorn for production
poetry run gunicorn observernet_api.app:create_app \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout 120
```

### 3.2 Worker (Celery)

```bash
cd apps/worker

# Install dependencies
poetry install --no-dev

# Start Celery worker
poetry run celery -A observernet_worker.celery_app worker \
  --loglevel=info \
  --concurrency=4
```

### 3.3 Frontend Apps (Next.js)

```bash
# Build web portal
cd apps/web
pnpm install
pnpm build
pnpm start

# Build admin portal
cd apps/admin
pnpm install
pnpm build
pnpm start

# Build superadmin portal
cd apps/superadmin
pnpm install
pnpm build
pnpm start
```

---

## Phase 4: Security Hardening

### 4.1 SSL/TLS Configuration

```bash
# Use Let's Encrypt for SSL certificates
certbot certonly --webroot -w /var/www/html \
  -d observernet.org \
  -d api.observernet.org \
  -d admin.observernet.org

# Configure nginx reverse proxy
# See: infrastructure/nginx/production.conf
```

### 4.2 Firewall Rules

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirect to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 4.3 Secrets Management

```bash
# Option 1: HashiCorp Vault
export VAULT_ADDR=https://vault.example.com:8200
vault login

# Store secrets in Vault
vault kv put secret/observernet/production \
  database_url="postgresql://..." \
  session_secret="..." \
  fabric_key="..."

# Option 2: Kubernetes Secrets
kubectl create secret generic observernet-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=session-secret="..." \
  --from-file=fabric-cert=/path/to/cert.pem
```

---

## Phase 5: Kubernetes Deployment (Recommended)

### 5.1 Deploy to Kubernetes

```bash
cd infrastructure/k8s

# Create namespace
kubectl create namespace observernet

# Apply configurations
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f admin-deployment.yaml

# Set up ingress
kubectl apply -f ingress.yaml
```

### 5.2 Helm Deployment

```bash
# Install using Helm chart
cd infrastructure/k8s/helm

helm install observernet ./observernet \
  --namespace observernet \
  --create-namespace \
  --values values.production.yaml
```

---

## Phase 6: Monitoring & Observability

### 6.1 Application Monitoring

```bash
# Sentry for error tracking
export SENTRY_DSN=https://xxx@sentry.io/xxx

# Prometheus metrics
# Metrics available at: http://api:8000/metrics
```

### 6.2 Logging

```bash
# Configure centralized logging (ELK stack)
# Logs are output in JSON format for easy parsing

export LOG_FORMAT=json
export LOG_LEVEL=INFO
```

### 6.3 Health Checks

```bash
# API health check
curl https://api.observernet.org/health

# Fabric connectivity check
curl https://api.observernet.org/health/fabric

# Database connectivity check
curl https://api.observernet.org/health/db
```

---

## Phase 7: Testing & Validation

### 7.1 End-to-End Testing

```bash
# Run integration tests
cd apps/api
poetry run pytest tests/integration/

# Run E2E tests
cd apps/web
pnpm test:e2e
```

### 7.2 Load Testing

```bash
# Use k6 for load testing
cd apps/docs
k6 run load-tests/voting-flow.js
```

### 7.3 Security Scanning

```bash
# Container image scanning
trivy image observernet/api:latest

# Dependency vulnerability scanning
snyk test

# OWASP ZAP security testing
zap-cli quick-scan https://app.observernet.org
```

---

## Phase 8: Backup & Disaster Recovery

### 8.1 Database Backups

```bash
# Automated PostgreSQL backups
pg_dump observernet_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://observernet-backups/
```

### 8.2 Blockchain Data

```bash
# Fabric ledger snapshots
# Blockchain data is immutable - no backups needed
# However, peer databases should be backed up regularly
```

---

## Production Readiness Checklist

- [ ] All environment variables configured from `.env.production.example`
- [ ] Database migrations applied successfully
- [ ] Redis connected and accessible
- [ ] Fabric network accessible and chaincode deployed
- [ ] Email sending works (test with `poetry run python -m observernet_api.test_email`)
- [ ] SMS sending works (test with `poetry run python -m observernet_api.test_sms`)
- [ ] Didit webhook endpoint accessible from public internet
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Firewall rules configured
- [ ] Secrets stored securely (Vault or K8s secrets)
- [ ] Monitoring and alerting configured
- [ ] Backup automation configured and tested
- [ ] Load testing completed successfully
- [ ] Security scanning passed
- [ ] Disaster recovery plan documented and tested

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool status
# Available at: /admin/db-status
```

### Fabric Connection Issues

```bash
# Verify certificates
openssl x509 -in $FABRIC_CERT_PATH -text -noout

# Test peer connectivity
peer channel list

# Check chaincode installation
peer chaincode list --installed
```

### Email/SMS Not Sending

```bash
# Check provider credentials
# View logs: docker logs observernet-api -f | grep EMAIL

# Test email provider
curl -X POST https://api.observernet.org/admin/test-email

# Test SMS provider
curl -X POST https://api.observernet.org/admin/test-sms
```

---

## Support

For production support, contact:
- Technical: tech@observernet.org
- Security: security@observernet.org

Documentation: https://docs.observernet.org
Status Page: https://status.observernet.org
