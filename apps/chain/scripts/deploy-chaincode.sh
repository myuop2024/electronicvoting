#!/usr/bin/env bash
set -euo pipefail

echo "Packaging chaincode"
pushd chaincode/ballot_cc > /dev/null
go mod tidy
peer lifecycle chaincode package ballot_cc.tar.gz --path . --lang golang --label ballot_cc_1
popd > /dev/null

echo "Install chaincode on peer0"
peer lifecycle chaincode install chaincode/ballot_cc/ballot_cc.tar.gz || true

echo "Approve chaincode definition"
peer lifecycle chaincode approveformyorg \
  --channelID election \
  --name ballot_cc \
  --version 1 \
  --package-id ballot_cc_1:$(openssl rand -hex 8) \
  --sequence 1

echo "Commit chaincode"
peer lifecycle chaincode commit \
  --channelID election \
  --name ballot_cc \
  --version 1 \
  --sequence 1 \
  --peerAddresses localhost:7051 \
  --orderer localhost:7050
