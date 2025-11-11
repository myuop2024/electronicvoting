# Fabric Runbook

## Purpose
Ensure Hyperledger Fabric network uptime and ledger integrity for elections.

## Health Checks

1. Verify API `/health` endpoint returns ledger connection metadata.
2. Inspect Fabric Gateway metrics via Prometheus (`fabric_gateway_block_height`).
3. Use `peer channel getinfo -c election` to confirm block progression.

## Incident Response

- **Ledger stall**: Restart peer and orderer containers via Kubernetes Helm release. Confirm gossip sync resumes.
- **Chaincode failure**: Redeploy `ballot_cc` using the `deploy-chaincode.sh` script with incremented sequence number.
- **Gateway unreachable**: Validate TLS certificates and security groups. Failover to secondary gateway if available.

## Post-Incident

Record hash of remediation commands in audit log table with hash chaining reference to maintain tamper evidence.
