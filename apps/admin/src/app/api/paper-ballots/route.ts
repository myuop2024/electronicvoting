import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/paper-ballots - List paper ballots for the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const electionId = searchParams.get('electionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

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

    // Build query for paper ballots (channel = PAPER)
    const where: any = {
      channel: 'PAPER',
      election: { orgId: membership.orgId },
    };

    if (status) {
      where.status = status;
    }

    if (electionId) {
      where.electionId = electionId;
    }

    // Fetch paper ballots
    const [ballots, total, stats] = await Promise.all([
      prisma.ballot.findMany({
        where,
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
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ballot.count({ where }),
      // Get status counts
      prisma.ballot.groupBy({
        by: ['status'],
        where: {
          channel: 'PAPER',
          election: { orgId: membership.orgId },
        },
        _count: { id: true },
      }),
    ]);

    // Process status counts
    const statusCounts = {
      PENDING: 0,
      CONFIRMED: 0,
      TALLIED: 0,
      REJECTED: 0,
    };
    for (const stat of stats) {
      statusCounts[stat.status as keyof typeof statusCounts] = stat._count.id;
    }

    // Format ballots for frontend
    const formattedBallots = ballots.map((ballot) => {
      const metadata = (ballot.metadata as Record<string, any>) || {};

      return {
        id: ballot.id,
        electionId: ballot.electionId,
        electionName: ballot.election.name,
        batchId: metadata.batchId || `BATCH-${ballot.id.slice(-6).toUpperCase()}`,
        imageUrl: metadata.imageUrl || null,
        status: ballot.status.toLowerCase().replace('pending', 'pending_review'),
        ocrConfidence: metadata.ocrConfidence || 0.85,
        ocrData: {
          contests: ballot.votes.map((vote) => ({
            title: vote.contest?.name || 'Unknown Contest',
            selectedOption: vote.option?.name || null,
            confidence: metadata.confidences?.[vote.contestId] || 0.85,
          })),
        },
        uploadedAt: ballot.submittedAt.toISOString(),
        uploadedBy: metadata.uploadedBy || 'Scanner Station',
        reviewedBy: metadata.reviewedBy || null,
        reviewedAt: ballot.confirmedAt?.toISOString() || null,
        rejectionReason: metadata.rejectionReason || null,
        commitmentHash: ballot.commitmentHash,
        fabricTxId: ballot.fabricTxId,
      };
    });

    return NextResponse.json({
      ballots: formattedBallots,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    });
  } catch (error) {
    console.error('Error fetching paper ballots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
