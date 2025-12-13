# ObserverNet - Public Blockchain Observer Portal

The Observer Portal provides public real-time verification of elections running on the ObserverNet platform.

## Features

- **Real-Time Turnout Tracking** - Live WebSocket updates of voter participation
- **Blockchain Explorer Integration** - Browse Hyperledger Fabric ledger directly
- **ZK Proof Verifier** - Verify zero-knowledge proofs of tally correctness
- **Commitment Search** - Search for ballot commitments by hash
- **Merkle Tree Viewer** - Explore ballot inclusion proofs
- **Mix-Net Audit** - Verify shuffle proofs from threshold mix-net

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The observer portal runs on port 3003 by default.

## Architecture

- **Frontend**: Next.js 15 with React 18
- **Styling**: Tailwind CSS with custom glassmorphism effects
- **Charts**: Recharts for real-time turnout visualization
- **API Integration**: Direct connection to FastAPI backend

## Pages

- `/` - Observer portal home with live elections list
- `/observe/[electionId]` - Detailed election observation page with:
  - Overview tab: Real-time turnout charts and results
  - Blockchain tab: Block timeline and embedded explorer
  - Proofs tab: ZK proof verification tool
  - Search tab: Ballot commitment search

## Public Access

The observer portal requires **no authentication** - it's designed for complete public transparency. All data displayed is already publicly verifiable on the blockchain.

## Environment Variables

```bash
# API endpoint (proxy configured in next.config.js)
API_BASE_URL=http://localhost:8000

# Optional: Hyperledger Explorer URL
EXPLORER_URL=http://localhost:8090
```

## Components

### TurnoutChart
Real-time chart showing voter participation over time with WebSocket updates.

### BlockchainTimeline
Chronological list of blockchain blocks with transaction details.

### ProofVerifier
Tool to paste and verify zero-knowledge proofs (Groth16 ZK-SNARKs).

### CommitmentSearch
Search engine for finding ballot commitments by hash or receipt code.

## Deployment

Deploy to Vercel, Netlify, or any static hosting:

```bash
pnpm build
pnpm start
```

Or use Docker:

```bash
docker build -t observernet-observer .
docker run -p 3003:3003 observernet-observer
```

## Security

- CSP headers configured for enhanced security
- CORS properly configured for API access
- No sensitive data exposed (all public blockchain data)
- Rate limiting on API endpoints

## License

Open source under MIT license - same as ObserverNet platform.
