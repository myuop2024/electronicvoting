import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// POST /api/elections/[id]/publish - Publish an election
export async function POST(
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
        role: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify election belongs to organization
    const election = await prisma.election.findFirst({
      where: {
        id,
        orgId: membership.orgId,
      },
      include: {
        contests: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Validate election can be published
    if (election.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Election cannot be published from ${election.status} status` },
        { status: 400 }
      );
    }

    // Validate election has required data
    const errors: string[] = [];

    if (!election.contests.length) {
      errors.push('Election must have at least one contest');
    }

    for (const contest of election.contests) {
      if (!contest.options.length) {
        errors.push(`Contest "${contest.name}" must have at least one option`);
      }
    }

    if (election.votingStartAt >= election.votingEndAt) {
      errors.push('Voting end date must be after start date');
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Publish election
    const updated = await prisma.election.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        electionId: id,
        action: 'election.published',
        resource: 'Election',
        resourceId: id,
        details: { publishedAt: updated.publishedAt },
        hash: '',
      },
    });

    return NextResponse.json({ election: updated });
  } catch (error) {
    console.error('Error publishing election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
