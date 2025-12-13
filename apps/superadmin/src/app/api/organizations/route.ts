import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/organizations - List all organizations (superadmin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is superadmin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.platformRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              members: true,
              elections: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    return NextResponse.json({
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        contactEmail: org.contactEmail,
        plan: org.plan,
        status: org.status,
        memberCount: org._count.members,
        electionCount: org._count.elections,
        verifiedAt: org.verifiedAt,
        createdAt: org.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization (superadmin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is superadmin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.platformRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.contactEmail) {
      return NextResponse.json(
        { error: 'Name and contact email are required' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let counter = 1;

    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slug}-${counter}`;
      counter++;
    }

    const organization = await prisma.organization.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        logoUrl: body.logoUrl,
        websiteUrl: body.websiteUrl,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        address: body.address,
        country: body.country,
        timezone: body.timezone || 'UTC',
        plan: body.plan || 'FREE',
        maxElections: body.maxElections || 3,
        maxVotersPerElection: body.maxVotersPerElection || 1000,
        maxAdmins: body.maxAdmins || 5,
        status: body.status || 'PENDING',
      },
    });

    // If owner email specified, invite them
    if (body.ownerEmail) {
      await prisma.orgInvitation.create({
        data: {
          orgId: organization.id,
          email: body.ownerEmail,
          role: 'OWNER',
          invitedBy: session.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: organization.id,
        action: 'organization.created',
        resource: 'Organization',
        resourceId: organization.id,
        details: { name: organization.name, plan: organization.plan },
        hash: '',
      },
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
