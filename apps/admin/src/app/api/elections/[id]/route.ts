import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/elections/[id] - Get election details
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
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access' },
        { status: 403 }
      );
    }

    const election = await prisma.election.findFirst({
      where: {
        id,
        orgId: membership.orgId,
      },
      include: {
        contests: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            voters: true,
            ballots: true,
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

    return NextResponse.json({ election });
  } catch (error) {
    console.error('Error fetching election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/elections/[id] - Update election
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
    const existing = await prisma.election.findFirst({
      where: {
        id,
        orgId: membership.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Don't allow editing active or closed elections (except specific fields)
    if (['ACTIVE', 'CLOSED'].includes(existing.status)) {
      const allowedFields = ['resultsPublishAt', 'resultsVisibility'];
      const attemptedFields = Object.keys(body);
      const disallowedFields = attemptedFields.filter(
        (f) => !allowedFields.includes(f)
      );

      if (disallowedFields.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot modify ${disallowedFields.join(', ')} while election is ${existing.status}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    const allowedUpdates = [
      'name',
      'description',
      'shortDescription',
      'logoUrl',
      'heroImageUrl',
      'primaryColor',
      'secondaryColor',
      'votingStartAt',
      'votingEndAt',
      'registrationStartAt',
      'registrationEndAt',
      'resultsPublishAt',
      'verificationMode',
      'requireCaptcha',
      'allowVoteChange',
      'voteChangeDeadline',
      'allowOffline',
      'languages',
      'resultsVisibility',
      'showVoterTurnout',
      'showByChannel',
      'showByRegion',
    ];

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        if (field.endsWith('At') && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const election = await prisma.election.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        electionId: election.id,
        action: 'election.updated',
        resource: 'Election',
        resourceId: election.id,
        details: { updatedFields: Object.keys(updateData) },
        hash: '',
      },
    });

    return NextResponse.json({ election });
  } catch (error) {
    console.error('Error updating election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/elections/[id] - Delete election
export async function DELETE(
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
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify election belongs to organization
    const existing = await prisma.election.findFirst({
      where: {
        id,
        orgId: membership.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting elections with votes
    if (['ACTIVE', 'CLOSED'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot delete an active or closed election' },
        { status: 400 }
      );
    }

    await prisma.election.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        action: 'election.deleted',
        resource: 'Election',
        resourceId: id,
        details: { name: existing.name },
        hash: '',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
