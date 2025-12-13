# ObserverNet Admin Setup Guide

## 🎯 Backend Configuration & Infrastructure Setup

This guide shows you how to configure blockchain, mix-net, privacy policies, and monitor system health as an admin.

---

## 📋 Table of Contents

1. [Accessing Admin Configuration](#accessing-admin-configuration)
2. [Blockchain Setup (Hyperledger Fabric)](#blockchain-setup)
3. [Mix-Net Configuration](#mix-net-configuration)
4. [Zero-Knowledge Proofs](#zero-knowledge-proofs)
5. [Privacy & Retention Policies](#privacy--retention-policies)
6. [System Health Monitoring](#system-health-monitoring)
7. [Integration Testing](#integration-testing)
8. [API Reference](#api-reference)

---

## 🔐 Accessing Admin Configuration

### Admin API Endpoints

All admin configuration endpoints are under `/api/admin/config` and require admin authentication.

**Base URL:** `http://localhost:8000/api/admin/config`

**Authentication:** JWT token with admin role

Example request:
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/health
```

---

## ⛓️ Blockchain Setup (Hyperledger Fabric)

### View Current Configuration

**GET /api/admin/config/blockchain**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/blockchain
```

Response:
```json
{
  "fabric_gateway_url": "peer0.org1.example.com:7051",
  "fabric_msp_id": "Org1MSP",
  "fabric_channel": "election",
  "fabric_chaincode": "ballot_cc"
}
```

### Update Configuration

**POST /api/admin/config/blockchain**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fabric_gateway_url": "peer0.org1.example.com:7051",
    "fabric_msp_id": "Org1MSP",
    "fabric_channel": "election",
    "fabric_chaincode": "ballot_cc",
    "fabric_cert_path": "/path/to/cert.pem",
    "fabric_key_path": "/path/to/key.pem"
  }' \
  http://localhost:8000/api/admin/config/blockchain
```

### Test Connection

**POST /api/admin/config/blockchain/test**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/config/blockchain/test
```

Response:
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "gateway": "peer0.org1.example.com:7051",
    "channel": "election",
    "chaincode": "ballot_cc"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Blockchain Setup Steps

1. **Install Hyperledger Fabric Network**
   ```bash
   # Clone Fabric samples
   git clone https://github.com/hyperledger/fabric-samples.git
   cd fabric-samples/test-network

   # Start network
   ./network.sh up createChannel -c election

   # Deploy chaincode
   ./network.sh deployCC -ccn ballot_cc -ccp ../ballot-chaincode -ccl javascript
   ```

2. **Generate Certificates**
   ```bash
   # Export connection profile
   export CORE_PEER_TLS_ENABLED=true
   export CORE_PEER_LOCALMSPID="Org1MSP"
   export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
   export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
   ```

3. **Update Environment Variables**
   ```bash
   # In .env file:
   FABRIC_GATEWAY_URL=peer0.org1.example.com:7051
   FABRIC_MSP_ID=Org1MSP
   FABRIC_CHANNEL_NAME=election
   FABRIC_CHAINCODE_NAME=ballot_cc
   ```

4. **Test via API**
   - Use the `/api/admin/config/blockchain/test` endpoint above

---

## 🌪️ Mix-Net Configuration

### View Mix-Net Nodes

**GET /api/admin/config/mixnet**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/mixnet
```

Response:
```json
{
  "threshold": 5,
  "total_nodes": 5,
  "nodes": [
    {
      "node_id": "node_1",
      "url": "https://mixnet-1.observernet.org",
      "public_key": "PUBLIC_KEY_1_PLACEHOLDER",
      "threshold_index": 1,
      "active": true
    },
    ...
  ]
}
```

### Update Mix-Net Configuration

**POST /api/admin/config/mixnet**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "threshold": 5,
    "total_nodes": 5,
    "nodes": [
      {
        "node_id": "node_1",
        "url": "https://mixnet-1.observernet.org",
        "public_key": "-----BEGIN PUBLIC KEY-----...",
        "threshold_index": 1,
        "active": true
      }
    ]
  }' \
  http://localhost:8000/api/admin/config/mixnet
```

### Test Mix-Net Connectivity

**POST /api/admin/config/mixnet/test**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/config/mixnet/test
```

### Mix-Net Setup Steps

1. **Deploy Mix-Net Nodes** (5 nodes recommended)
   - Each node should expose HTTPS endpoint
   - Generate threshold key shares (ElGamal, Paillier, or similar)
   - Distribute shares to nodes

2. **Generate Keys**
   ```python
   # Example using Python threshold crypto library
   from threshold_crypto import ThresholdCrypto

   tc = ThresholdCrypto(threshold=5, total=5)
   public_key, private_shares = tc.generate_keys()

   # Distribute private_shares[i] to node_i
   ```

3. **Configure Nodes**
   - Each node runs mix-net server
   - Accepts encrypted votes
   - Re-encrypts and shuffles
   - Forwards to next node

4. **Test via API**
   - Use `/api/admin/config/mixnet/test` endpoint

---

## 🔐 Zero-Knowledge Proofs

### View ZK Configuration

**GET /api/admin/config/zkproof**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/zkproof
```

### Update ZK Configuration

**POST /api/admin/config/zkproof**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proving_key_path": "/keys/proving_key.bin",
    "verification_key_path": "/keys/verification_key.bin",
    "circuit_type": "groth16",
    "max_voters_per_proof": 1000
  }' \
  http://localhost:8000/api/admin/config/zkproof
```

### ZK Proof Setup

1. **Install ZK Toolkit** (e.g., circom, snarkjs)
   ```bash
   npm install -g circom snarkjs
   ```

2. **Create Voting Circuit**
   ```circom
   // voting_circuit.circom
   template VoteTally(n) {
       signal input votes[n];
       signal input candidates[n];
       signal output tally[4];  // 4 candidates example

       // Circuit logic to prove tally correctness
       // without revealing individual votes
   }

   component main = VoteTally(1000);
   ```

3. **Generate Trusted Setup**
   ```bash
   circom voting_circuit.circom --r1cs --wasm
   snarkjs groth16 setup voting_circuit.r1cs pot12_final.ptau circuit_final.zkey
   snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
   ```

4. **Configure Paths**
   ```bash
   # In .env:
   ZK_PROVING_KEY_PATH=/keys/circuit_final.zkey
   ZK_VERIFICATION_KEY_PATH=/keys/verification_key.json
   ```

---

## 🛡️ Privacy & Retention Policies

### View All Policies

**GET /api/admin/config/retention-policies**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/retention-policies
```

### Create Retention Policy

**POST /api/admin/config/retention-policies**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data_type": "voter_profile",
    "retention_days": 90,
    "deletion_method": "anonymize",
    "jurisdiction": "GDPR",
    "legal_basis": "Post-election cleanup per GDPR Art. 5(1)(e)"
  }' \
  http://localhost:8000/api/admin/config/retention-policies
```

### Enforce Policies (Manual Trigger)

**POST /api/admin/config/retention-policies/enforce**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/config/retention-policies/enforce
```

Response:
```json
{
  "success": true,
  "message": "Retention policies enforced",
  "result": {
    "started_at": "2025-01-15T10:00:00Z",
    "policies_enforced": 3,
    "records_anonymized": 1250,
    "records_deleted": 45,
    "elections_processed": 5,
    "completed_at": "2025-01-15T10:05:00Z"
  }
}
```

### Recommended Retention Policies

```json
[
  {
    "data_type": "voter_profile",
    "retention_days": 90,
    "deletion_method": "anonymize",
    "jurisdiction": "GDPR"
  },
  {
    "data_type": "access_code",
    "retention_days": 90,
    "deletion_method": "delete"
  },
  {
    "data_type": "vote_token",
    "retention_days": 90,
    "deletion_method": "anonymize"
  },
  {
    "data_type": "audit_log_operational",
    "retention_days": 365,
    "deletion_method": "archive"
  },
  {
    "data_type": "audit_log_legal",
    "retention_days": 2555,
    "deletion_method": "archive"
  }
]
```

---

## 📊 System Health Monitoring

### Get System Health

**GET /api/admin/config/health**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8000/api/admin/config/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "components": {
    "database": {
      "status": "healthy",
      "message": "Connected"
    },
    "blockchain": {
      "status": "healthy",
      "gateway": "peer0.org1.example.com:7051",
      "channel": "election"
    },
    "mixnet": {
      "status": "healthy",
      "reachable_nodes": "5/5"
    },
    "privacy": {
      "status": "healthy",
      "overdue_breach_notifications": 0,
      "dsar_portal": "operational"
    }
  },
  "blockchain": {
    "gateway": "peer0.org1.example.com:7051",
    "channel": "election",
    "chaincode": "ballot_cc"
  },
  "privacy": {
    "jurisdictions_supported": 14,
    "dsar_automation": "enabled"
  },
  "integrations": {
    "didit_kyc": "configured",
    "email_provider": "sendgrid",
    "whatsapp_provider": "twilio"
  }
}
```

**Status Values:**
- `healthy` - All systems operational
- `degraded` - Some components have warnings
- `unhealthy` - Critical failures detected

---

## 🧪 Integration Testing

### Run Full-Stack Test

**POST /api/admin/config/test/full-stack**

Tests all components end-to-end:
1. Database connectivity
2. Blockchain write/read
3. Mix-net shuffle
4. ZK proof generation/verification
5. Privacy automation

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/config/test/full-stack
```

Response:
```json
{
  "overall_success": true,
  "timestamp": "2025-01-15T10:30:00Z",
  "results": {
    "database": {
      "success": true,
      "message": "Connected"
    },
    "blockchain": {
      "success": true,
      "message": "Write/read test passed",
      "tx_id": "test_tx_abc123"
    },
    "mixnet": {
      "success": true,
      "message": "Threshold encryption test passed",
      "threshold": "5-of-5"
    },
    "zkproof": {
      "success": true,
      "message": "Proof generation/verification passed",
      "proof_size_bytes": 128
    },
    "privacy": {
      "success": true,
      "message": "DSAR automation operational"
    }
  }
}
```

---

## 📚 API Reference

### Admin Config Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/config/blockchain` | GET | Get blockchain config |
| `/api/admin/config/blockchain` | POST | Update blockchain config |
| `/api/admin/config/blockchain/test` | POST | Test blockchain connection |
| `/api/admin/config/mixnet` | GET | Get mix-net config |
| `/api/admin/config/mixnet` | POST | Update mix-net config |
| `/api/admin/config/mixnet/test` | POST | Test mix-net nodes |
| `/api/admin/config/zkproof` | GET | Get ZK proof config |
| `/api/admin/config/zkproof` | POST | Update ZK proof config |
| `/api/admin/config/retention-policies` | GET | Get all retention policies |
| `/api/admin/config/retention-policies` | POST | Create retention policy |
| `/api/admin/config/retention-policies/enforce` | POST | Enforce retention policies |
| `/api/admin/config/health` | GET | Get system health |
| `/api/admin/config/test/full-stack` | POST | Run full integration test |

### Authentication

All endpoints require admin JWT token:

```bash
# Get admin token (example)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}' \
  http://localhost:8000/api/auth/login

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/admin/config/health
```

---

## 🚀 Quick Start Checklist

- [ ] Start Hyperledger Fabric network
- [ ] Deploy ballot chaincode
- [ ] Test blockchain connection via API
- [ ] Deploy 5 mix-net nodes
- [ ] Configure mix-net threshold keys
- [ ] Test mix-net connectivity via API
- [ ] Generate ZK proving/verification keys
- [ ] Configure ZK proof paths
- [ ] Create retention policies (voter_profile, access_code, etc.)
- [ ] Run full-stack integration test
- [ ] Monitor system health dashboard

---

## 🔧 Troubleshooting

### Blockchain Connection Fails

1. Check Fabric network is running:
   ```bash
   docker ps | grep hyperledger
   ```

2. Verify gateway URL is correct:
   ```bash
   ping peer0.org1.example.com
   ```

3. Check certificates are valid:
   ```bash
   openssl x509 -in cert.pem -text -noout
   ```

### Mix-Net Nodes Unreachable

1. Check node endpoints:
   ```bash
   curl https://mixnet-1.observernet.org/health
   ```

2. Verify public keys match

3. Check threshold configuration (must be ≤ total nodes)

### ZK Proof Generation Fails

1. Verify proving key exists:
   ```bash
   ls -lh /keys/proving_key.bin
   ```

2. Check circuit is compiled

3. Ensure sufficient memory (ZK proofs can be memory-intensive)

---

## 📖 Further Reading

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Threshold Cryptography](https://en.wikipedia.org/wiki/Threshold_cryptosystem)
- [Zero-Knowledge Proofs (circom)](https://docs.circom.io/)
- [GDPR Data Protection](https://gdpr.eu/)

---

**Need Help?** Contact the ObserverNet team or open an issue on GitHub.
