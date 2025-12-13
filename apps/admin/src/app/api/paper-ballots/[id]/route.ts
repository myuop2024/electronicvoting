import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/paper-ballots/[id] - Get a specific paper ballot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access' },
        { status: 403 }
      );
    }

    const ballot = await prisma.ballot.findFirst({
      where: {
        id,
        channel: 'PAPER',
        election: { orgId: membership.orgId },
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        votes: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
            option: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json(
        { error: 'Ballot not found' },
        { status: 404 }
      );
    }

    const metadata = (ballot.metadata as Record<string, any>) || {};

    return NextResponse.json({
      ballot: {
        id: ballot.id,
        electionId: ballot.electionId,
        electionName: ballot.election.name,
        batchId: metadata.batchId || `BATCH-${ballot.id.slice(-6).toUpperCase()}`,
        imageUrl: metadata.imageUrl || null,
        status: ballot.status.toLowerCase().replace('pending', 'pending_review'),
        ocrConfidence: metadata.ocrConfidence || 0.85,
        ocrData: {
          contests: ballot.votes.map((vote) => ({
            contestId: vote.contestId,
            optionId: vote.optionId,
            title: vote.contest?.name || 'Unknown Contest',
            selectedOption: vote.option?.name || null,
            confidence: metadata.confidences?.[vote.contestId] || 0.85,
          })),
        },
        uploadedAt: ballot.submittedAt.toISOString(),
        uploadedBy: metadata.uploadedBy || 'Scanner Station',
        reviewedBy: metadata.reviewedBy || null,
        reviewedAt: ballot.confirmedAt?.toISOString() || null,
        commitmentHash: ballot.commitmentHash,
        fabricTxId: ballot.fabricTxId,
      },
    });
  } catch (error) {
    console.error('Error fetching paper ballot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/paper-ballots/[id] - Update ballot status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason, editedVotes } = body;

    // Validate action
    if (!['approve', 'reject', 'edit'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or edit' },
        { status: 400 }
      );
    }

    // Get user's organization membership
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const ballot = await prisma.ballot.findFirst({
      where: {
        id,
        channel: 'PAPER',
        election: { orgId: membership.orgId },
      },
      include: {
        election: true,
      },
    });

    if (!ballot) {
      return NextResponse.json(
        { error: 'Ballot not found' },
        { status: 404 }
      );
    }

    // Check if ballot can be modified
    if (ballot.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending ballots can be modified' },
        { status: 400 }
      );
    }

    const now = new Date();
    const metadata = (ballot.metadata as Record<string, any>) || {};

    if (action === 'approve') {
      // Update ballot status to CONFIRMED
      await prisma.ballot.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          metadata: {
            ...metadata,
            reviewedBy: session.user.displayName || session.user.email,
            reviewedAt: now.toISOString(),
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          orgId: membership.orgId,
          electionId: ballot.electionId,
          action: 'paper_ballot.approved',
          resource: 'Ballot',
          resourceId: id,
          details: {
            commitmentHash: ballot.commitmentHash?.slice(0, 16),
          },
          hash: '',
        },
      });

      return NextResponse.json({
        status: 'approved',
        ballotId: id,
        message: 'Paper ballot approved and added to tally',
      });

    } else if (action === 'reject') {
      // Update ballot status to REJECTED
      await prisma.ballot.update({
        where: { id },
        data: {
          status: 'REJECTED',
          metadata: {
            ...metadata,
            reviewedBy: session.user.displayName || session.user.email,
            reviewedAt: now.toISOString(),
            rejectionReason: rejectionReason || 'Rejected by reviewer',
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          orgId: membership.orgId,
          electionId: ballot.electionId,
          action: 'paper_ballot.rejected',
          resource: 'Ballot',
          resourceId: id,
          details: {
            reason: rejectionReason,
          },
          hash: '',
        },
      });

      return NextResponse.json({
        status: 'rejected',
        ballotId: id,
        message: 'Paper ballot has been rejected',
      });

    } else if (action === 'edit') {
      // Update votes based on edited data
      if (!editedVotes || !Array.isArray(editedVotes)) {
        return NextResponse.json(
          { error: 'editedVotes array is required for edit action' },
          { status: 400 }
        );
      }

      // Delete existing votes and create new ones
      await prisma.vote.deleteMany({
        where: { ballotId: id },
      });

      for (const vote of editedVotes) {
        await prisma.vote.create({
          data: {
            ballotId: id,
            contestId: vote.contestId,
            optionId: vote.optionId,
            rank: vote.rank,
            weight: vote.weight,
            score: vote.score,
          },
        });
      }

      // Update ballot to confirmed
      await prisma.ballot.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          metadata: {
            ...metadata,
            reviewedBy: session.user.displayName || session.user.email,
            reviewedAt: now.toISOString(),
            manuallyEdited: true,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          orgId: membership.orgId,
          electionId: ballot.electionId,
          action: 'paper_ballot.edited',
          resource: 'Ballot',
          resourceId: id,
          details: {
            votesCount: editedVotes.length,
          },
          hash: '',
        },
      });

      return NextResponse.json({
        status: 'edited',
        ballotId: id,
        message: 'Paper ballot edited and approved',
      });
    }
  } catch (error) {
    console.error('Error updating paper ballot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
