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
ElectionID     string            `json:"electionId"`
SubjectHash    string            `json:"subjectHash"`
CommitmentHash string            `json:"commitmentHash"`
OptionID       string            `json:"optionId"`
Meta           map[string]any    `json:"meta"`
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
