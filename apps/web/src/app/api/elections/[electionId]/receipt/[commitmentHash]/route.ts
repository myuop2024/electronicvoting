import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { electionId: string; commitmentHash: string } }) {
  const { electionId, commitmentHash } = params;
  // TODO: call FastAPI endpoint once wired up. Returning stub for integration tests.
  return NextResponse.json({
    electionId,
    commitmentHash,
    fabricTxId: 'fabric-demo-001',
    verified: true,
    talliedAt: new Date().toISOString()
  });
}
