package main

import (
"encoding/json"
"fmt"

"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// BallotContract implements Fabric smart contract for ObserverNet elections.
type BallotContract struct {
contractapi.Contract
}

// VoteCommitment represents a recorded vote.
type VoteCommitment struct {
	ElectionID     string         `json:"electionId"`
	SubjectHash    string         `json:"subjectHash"`
	CommitmentHash string         `json:"commitmentHash"`
	OptionID       string         `json:"optionId"`
	Meta           map[string]any `json:"meta"`
}

// BallotCommitment represents a ballot submission record.
type BallotCommitment struct {
	ElectionID     string         `json:"electionId"`
	BallotID       string         `json:"ballotId"`
	CommitmentHash string         `json:"commitmentHash"`
	Timestamp      string         `json:"timestamp"`
	Metadata       map[string]any `json:"metadata"`
	TxID           string         `json:"txId"`
}

// AuditLogEntry represents an audit log anchored to blockchain.
type AuditLogEntry struct {
	MerkleRoot string         `json:"merkleRoot"`
	Timestamp  string         `json:"timestamp"`
	BatchSize  int            `json:"batchSize"`
	Metadata   map[string]any `json:"metadata"`
}

// ElectionResult represents certified election results.
type ElectionResult struct {
	ElectionID   string         `json:"electionId"`
	ResultsHash  string         `json:"resultsHash"`
	TotalVotes   int            `json:"totalVotes"`
	CertifiedAt  string         `json:"certifiedAt"`
	CertifierID  string         `json:"certifierId"`
	Metadata     map[string]any `json:"metadata"`
}

// RegisterSubject ensures each hashed voter is registered for the election.
func (c *BallotContract) RegisterSubject(ctx contractapi.TransactionContextInterface, electionID, subjectHash string) error {
key := fmt.Sprintf("subject:%s:%s", electionID, subjectHash)
exists, err := ctx.GetStub().GetState(key)
if err != nil {
return err
}
if exists != nil {
return nil
}
return ctx.GetStub().PutState(key, []byte("registered"))
}

// CastVote records a vote commitment on ledger.
func (c *BallotContract) CastVote(ctx contractapi.TransactionContextInterface, electionID, subjectHash, commitmentHash, optionID, metaJSON string) error {
key := fmt.Sprintf("vote:%s:%s", electionID, commitmentHash)
exists, err := ctx.GetStub().GetState(key)
if err != nil {
return err
}
if exists != nil {
return fmt.Errorf("commitment already exists")
}

var meta map[string]any
if err := json.Unmarshal([]byte(metaJSON), &meta); err != nil {
return err
}

commitment := VoteCommitment{
ElectionID:     electionID,
SubjectHash:    subjectHash,
CommitmentHash: commitmentHash,
OptionID:       optionID,
Meta:           meta,
}

bytes, err := json.Marshal(commitment)
if err != nil {
return err
}

return ctx.GetStub().PutState(key, bytes)
}

// SubmitBallotCommitment records a ballot commitment on the blockchain.
// This is called by the voting API after a voter submits their encrypted ballot.
func (c *BallotContract) SubmitBallotCommitment(
	ctx contractapi.TransactionContextInterface,
	electionID, ballotID, commitmentHash, timestamp, metadataJSON string,
) error {
	key := fmt.Sprintf("ballot:%s:%s", electionID, commitmentHash)

	// Check if commitment already exists (prevent double submission)
	exists, err := ctx.GetStub().GetState(key)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("ballot commitment already exists")
	}

	// Parse metadata
	var metadata map[string]any
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return err
		}
	}

	// Get transaction ID
	txID := ctx.GetStub().GetTxID()

	// Create ballot commitment record
	commitment := BallotCommitment{
		ElectionID:     electionID,
		BallotID:       ballotID,
		CommitmentHash: commitmentHash,
		Timestamp:      timestamp,
		Metadata:       metadata,
		TxID:           txID,
	}

	// Serialize and store
	bytes, err := json.Marshal(commitment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, bytes)
}

// GetBallotCommitment retrieves a ballot commitment by its hash.
func (c *BallotContract) GetBallotCommitment(
	ctx contractapi.TransactionContextInterface,
	commitmentHash string,
) (*BallotCommitment, error) {
	// Search across all elections for this commitment
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("ballot", []string{})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	for iterator.HasNext() {
		record, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var commitment BallotCommitment
		if err := json.Unmarshal(record.Value, &commitment); err != nil {
			continue
		}

		if commitment.CommitmentHash == commitmentHash {
			return &commitment, nil
		}
	}

	return nil, fmt.Errorf("ballot commitment not found")
}

// AnchorAuditLogs anchors a Merkle root of audit logs to the blockchain.
func (c *BallotContract) AnchorAuditLogs(
	ctx contractapi.TransactionContextInterface,
	merkleRoot, timestamp string,
	batchSize int,
	metadataJSON string,
) error {
	key := fmt.Sprintf("audit:%s", merkleRoot)

	// Parse metadata
	var metadata map[string]any
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return err
		}
	}

	// Create audit log entry
	entry := AuditLogEntry{
		MerkleRoot: merkleRoot,
		Timestamp:  timestamp,
		BatchSize:  batchSize,
		Metadata:   metadata,
	}

	// Serialize and store
	bytes, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, bytes)
}

// CertifyResults anchors certified election results to the blockchain.
func (c *BallotContract) CertifyResults(
	ctx contractapi.TransactionContextInterface,
	electionID, resultsHash string,
	totalVotes int,
	certifiedAt, certifierID, metadataJSON string,
) error {
	key := fmt.Sprintf("results:%s", electionID)

	// Check if already certified
	exists, err := ctx.GetStub().GetState(key)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("election results already certified")
	}

	// Parse metadata
	var metadata map[string]any
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return err
		}
	}

	// Create results record
	results := ElectionResult{
		ElectionID:  electionID,
		ResultsHash: resultsHash,
		TotalVotes:  totalVotes,
		CertifiedAt: certifiedAt,
		CertifierID: certifierID,
		Metadata:    metadata,
	}

	// Serialize and store
	bytes, err := json.Marshal(results)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, bytes)
}

// GetReceipt returns a vote receipt for the provided commitment.
func (c *BallotContract) GetReceipt(ctx contractapi.TransactionContextInterface, commitmentHash string) (*VoteCommitment, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("vote", []string{"", commitmentHash})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	if !iterator.HasNext() {
		return nil, fmt.Errorf("commitment not found")
	}

	record, err := iterator.Next()
	if err != nil {
		return nil, err
	}

	var commitment VoteCommitment
	if err := json.Unmarshal(record.Value, &commitment); err != nil {
		return nil, err
	}

	return &commitment, nil
}

func main() {
smartContract, err := contractapi.NewChaincode(new(BallotContract))
if err != nil {
panic(err)
}

if err := smartContract.Start(); err != nil {
panic(err)
}
}
