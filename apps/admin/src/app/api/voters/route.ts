import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';
import { hashToken } from '@electronicvoting/auth';

// GET /api/voters - List voters for elections in the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get user's organization
    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access' },
        { status: 403 }
      );
    }

    // Build query - only voters for elections in user's org
    const where: any = {
      election: {
        orgId: membership.orgId,
      },
    };

    if (electionId) {
      where.electionId = electionId;
    }
    if (status) {
      where.status = status;
    }

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        include: {
          election: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.voter.count({ where }),
    ]);

    return NextResponse.json({
      voters: voters.map((v) => ({
        id: v.id,
        electionId: v.electionId,
        electionName: v.election.name,
        voterHashPrefix: v.voterHash.substring(0, 8) + '...',
        status: v.status,
        channel: v.channel,
        region: v.region,
        district: v.district,
        verifiedAt: v.verifiedAt,
        createdAt: v.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching voters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/voters - Import voters (bulk or single)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { electionId, voters: voterData } = body;

    if (!electionId || !voterData || !Array.isArray(voterData)) {
      return NextResponse.json(
        { error: 'Missing electionId or voters array' },
        { status: 400 }
      );
    }

    // Verify user has access to this election
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'] },
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

    // Process voters
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const voter of voterData) {
      try {
        // Hash the voter identifier (email, national ID, etc.)
        const voterHash = hashToken(voter.identifier || voter.email || voter.id);

        // Check if voter already exists
        const existing = await prisma.voter.findFirst({
          where: {
            electionId,
            voterHash,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create voter
        await prisma.voter.create({
          data: {
            electionId,
            voterHash,
            status: 'PENDING',
            channel: voter.channel || 'WEB',
            region: voter.region,
            district: voter.district,
            category: voter.category,
            weight: voter.weight,
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors.push(`Failed to create voter: ${err.message}`);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        electionId,
        action: 'voters.imported',
        resource: 'Voter',
        details: {
          total: voterData.length,
          created: results.created,
          skipped: results.skipped,
        },
        hash: '',
      },
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error importing voters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
