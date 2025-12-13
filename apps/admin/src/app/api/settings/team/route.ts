import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/settings/team - List team members
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Get all team members
    const members = await prisma.orgMember.findMany({
      where: { orgId: membership.orgId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.displayName || m.user.email?.split('@')[0] || 'Unknown',
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role.toLowerCase(),
        status: m.status.toLowerCase(),
        lastActive: m.lastActiveAt?.toISOString() || null,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/settings/team - Invite a new team member
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get user's organization membership (must be admin+)
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create a pending user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          displayName: email.split('@')[0],
        },
      });
    }

    // Check if already a member
    const existingMember = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: membership.orgId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['VIEWER', 'OBSERVER', 'STAFF', 'MANAGER', 'ADMIN'];
    const memberRole = validRoles.includes(role?.toUpperCase()) ? role.toUpperCase() : 'STAFF';

    // Create membership
    const newMember = await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId: membership.orgId,
        role: memberRole,
        status: 'PENDING',
        invitedBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        action: 'team.member_invited',
        resource: 'OrgMember',
        resourceId: newMember.id,
        details: { email, role: memberRole },
        hash: '',
      },
    });

    return NextResponse.json({
      member: {
        id: newMember.id,
        name: newMember.user.displayName || email.split('@')[0],
        email: newMember.user.email,
        role: newMember.role.toLowerCase(),
        status: 'pending',
      },
      message: 'Invitation sent successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
