import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/organizations/[id] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        elections: {
          select: {
            id: true,
            name: true,
            status: true,
            votingStartAt: true,
            votingEndAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            members: true,
            elections: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[id] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    const allowedFields = [
      'name',
      'description',
      'logoUrl',
      'websiteUrl',
      'contactEmail',
      'contactPhone',
      'address',
      'country',
      'timezone',
      'plan',
      'status',
      'maxElections',
      'maxVotersPerElection',
      'maxAdmins',
      'storageQuotaMb',
      'suspendedReason',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle verification
    if (body.verified === true && !existing.verifiedAt) {
      updateData.verifiedAt = new Date();
    } else if (body.verified === false) {
      updateData.verifiedAt = null;
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: id,
        action: 'organization.updated',
        resource: 'Organization',
        resourceId: id,
        details: { updatedFields: Object.keys(updateData) },
        hash: '',
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id] - Delete organization (soft delete via status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is superadmin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.platformRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { elections: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if org has active elections
    const activeElections = await prisma.election.count({
      where: {
        orgId: id,
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
    });

    if (activeElections > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with active elections' },
        { status: 400 }
      );
    }

    // Soft delete - set status to ARCHIVED
    await prisma.organization.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: id,
        action: 'organization.archived',
        resource: 'Organization',
        resourceId: id,
        details: { name: existing.name },
        hash: '',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
