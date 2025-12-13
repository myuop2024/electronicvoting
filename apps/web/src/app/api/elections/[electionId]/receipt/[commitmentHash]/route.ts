import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@electronicvoting/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string; commitmentHash: string }> }
) {
  try {
    const { electionId, commitmentHash } = await params;

    // Find the ballot by commitment hash
    const ballot = await prisma.ballot.findFirst({
      where: {
        electionId,
        commitmentHash,
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            status: true,
            resultsPublishAt: true,
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json(
        {
          verified: false,
          message: 'No ballot found with this commitment hash',
        },
        { status: 404 }
      );
    }

    // Return verification data
    return NextResponse.json({
      verified: true,
      electionId: ballot.electionId,
      electionName: ballot.election.name,
      commitmentHash: ballot.commitmentHash,
      status: ballot.status,
      channel: ballot.channel,
      submittedAt: ballot.submittedAt.toISOString(),
      confirmedAt: ballot.confirmedAt?.toISOString(),
      talliedAt: ballot.talliedAt?.toISOString(),
      fabricTxId: ballot.fabricTxId,
      fabricBlockNum: ballot.fabricBlockNum,
      fabricTimestamp: ballot.fabricTimestamp?.toISOString(),
      message: ballot.fabricTxId
        ? 'Your ballot has been verified and anchored to the blockchain'
        : 'Your ballot has been recorded and is pending blockchain confirmation',
    });
  } catch (error) {
    console.error('Error verifying ballot:', error);
    return NextResponse.json(
      { error: 'Internal server error', verified: false },
      { status: 500 }
    );
  }
}
