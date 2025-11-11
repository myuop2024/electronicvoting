# Load Testing Strategy

ObserverNet targets one million concurrent voters across web and WhatsApp channels. k6 scripts simulate a 70/30 traffic split with layered policy checks and Fabric write bursts.

## k6 Profiles

- `smoke`: 5k virtual users (VU) ramping in 2 minutes to validate environments.
- `election-day`: 1M VU ramp over 15 minutes, sustained for 30 minutes with spike injections every 5 minutes.
- `whatsapp-failover`: 200k VU focusing on `/whatsapp/webhook` and `/whatsapp/send` endpoints with retry storms.

## Performance Targets

- P95 latency ≤ 400ms for `/e/{id}/vote`
- Fabric commit acknowledgement within 2 seconds
- Redis queue depth < 5k tasks during bursts

## Infrastructure Tuning

- Enable Kubernetes HPA (API deployments) with CPU target 65% and max replicas 120.
- KEDA scaled object for Celery workers triggered by Redis queue length.
- Postgres connection pool via PgBouncer, set to 5x API replicas.
- Redis cluster sharding with at least 6 shards for pub/sub fanout.
- Use Cloudflare CDN for static Next.js assets and websocket acceleration.

## Execution

1. Deploy staging stack via Helm charts with production parity configuration.
2. Populate synthetic elections and allowlists using seed scripts.
3. Run k6 tests from multiple geographic regions via distributed execution.
4. Capture metrics in Prometheus/Grafana and export JSON summary for regression tracking.

## Reporting

Summaries stored in `infra/observability/k6-reports/` with regression thresholds validated in CI/CD.
