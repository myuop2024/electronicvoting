import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';
import { generateSlug } from '@electronicvoting/auth';

// GET /api/elections - List elections for the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get user's organization membership
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access' },
        { status: 403 }
      );
    }

    // Build query
    const where: any = { orgId: membership.orgId };
    if (status) {
      where.status = status;
    }

    // Fetch elections
    const [elections, total] = await Promise.all([
      prisma.election.findMany({
        where,
        include: {
          _count: {
            select: {
              voters: true,
              ballots: true,
              contests: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.election.count({ where }),
    ]);

    return NextResponse.json({
      elections: elections.map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        status: e.status,
        votingStartAt: e.votingStartAt,
        votingEndAt: e.votingEndAt,
        voterCount: e._count.voters,
        voteCount: e._count.ballots,
        contestCount: e._count.contests,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/elections - Create a new election
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'votingStartAt', 'votingEndAt'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
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

    // Generate slug
    const baseSlug = generateSlug(body.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug within organization
    while (
      await prisma.election.findFirst({
        where: { orgId: membership.orgId, slug },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create election
    const election = await prisma.election.create({
      data: {
        orgId: membership.orgId,
        createdById: session.user.id,
        name: body.name,
        slug,
        description: body.description,
        shortDescription: body.shortDescription,
        type: body.type || 'STANDARD',
        voteType: body.voteType || 'PLURALITY',
        logoUrl: body.logoUrl,
        heroImageUrl: body.heroImageUrl,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        votingStartAt: new Date(body.votingStartAt),
        votingEndAt: new Date(body.votingEndAt),
        registrationStartAt: body.registrationStartAt
          ? new Date(body.registrationStartAt)
          : undefined,
        registrationEndAt: body.registrationEndAt
          ? new Date(body.registrationEndAt)
          : undefined,
        resultsPublishAt: body.resultsPublishAt
          ? new Date(body.resultsPublishAt)
          : undefined,
        verificationMode: body.verificationMode || 'CODE_ONLY',
        requireCaptcha: body.requireCaptcha ?? true,
        allowVoteChange: body.allowVoteChange ?? false,
        allowOffline: body.allowOffline ?? false,
        languages: body.languages || ['en'],
        status: 'DRAFT',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        electionId: election.id,
        action: 'election.created',
        resource: 'Election',
        resourceId: election.id,
        details: { name: election.name },
        hash: '', // Will be computed
      },
    });

    return NextResponse.json({ election }, { status: 201 });
  } catch (error) {
    console.error('Error creating election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
