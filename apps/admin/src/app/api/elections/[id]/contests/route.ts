import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/elections/[id]/contests - List contests for an election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: electionId } = await params;

    const contests = await prisma.contest.findMany({
      where: { electionId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ contests });
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/elections/[id]/contests - Create a contest
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: electionId } = await params;
    const body = await request.json();

    // Verify user has access to this election
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

    const election = await prisma.election.findFirst({
      where: {
        id: electionId,
        orgId: membership.orgId,
      },
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    if (election.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot modify contests after election is published' },
        { status: 400 }
      );
    }

    // Get next sort order
    const lastContest = await prisma.contest.findFirst({
      where: { electionId },
      orderBy: { sortOrder: 'desc' },
    });
    const nextSortOrder = (lastContest?.sortOrder ?? -1) + 1;

    // Create contest with options
    const contest = await prisma.contest.create({
      data: {
        electionId,
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        voteType: body.voteType || 'PLURALITY',
        maxSelections: body.maxSelections || 1,
        minSelections: body.minSelections || 0,
        allowWriteIn: body.allowWriteIn || false,
        sortOrder: body.sortOrder ?? nextSortOrder,
        options: body.options?.length
          ? {
              create: body.options.map((opt: any, idx: number) => ({
                name: opt.name,
                subtitle: opt.subtitle,
                description: opt.description,
                imageUrl: opt.imageUrl,
                sortOrder: opt.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ contest }, { status: 201 });
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
