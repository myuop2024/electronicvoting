# Hyperledger Fabric Dev Network

This directory contains tooling to bootstrap a zero-fee Fabric network for ObserverNet elections. The `docker-compose.dev.yaml` file spins up an orderer, two peers, a CA, and the Fabric Gateway used by the API service.

## Quick start

```bash
cd apps/chain
./scripts/dev-up.sh
./scripts/deploy-chaincode.sh
```

## Components

- `chaincode/ballot_cc`: Go chaincode storing subject registrations and vote commitments
- `scripts/dev-up.sh`: Starts network using Docker Compose
- `scripts/deploy-chaincode.sh`: Installs and commits chaincode to the `election` channel
- `scripts/dev-down.sh`: Stops and cleans containers

Fabric state is kept local and is not persisted in production; production deployments should use the Helm charts in `infrastructure/k8s/helm/fabric`.
