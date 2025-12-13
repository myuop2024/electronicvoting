import { NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/dashboard/stats - Get superadmin platform statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is superadmin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.platformRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get platform-wide statistics
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalElections,
      activeElections,
      totalBallots,
      recentOrgsData,
      alerts,
    ] = await Promise.all([
      // Total organizations
      prisma.organization.count(),
      // Active organizations
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      // Total users
      prisma.user.count(),
      // Active users (logged in last 30 days)
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Total elections platform-wide
      prisma.election.count(),
      // Active elections
      prisma.election.count({ where: { status: 'ACTIVE' } }),
      // Total ballots cast
      prisma.ballot.count(),
      // Recent organizations
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          plan: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              elections: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // System alerts (organizations with issues)
      prisma.organization.findMany({
        where: {
          OR: [
            { status: 'SUSPENDED' },
            { status: 'TRIAL' },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    // Format recent organizations
    const recentOrgs = recentOrgsData.map((org) => ({
      id: org.id,
      name: org.name,
      status: org.status,
      plan: org.plan,
      users: org._count.members,
      elections: org._count.elections,
      createdAt: org.createdAt.toISOString(),
    }));

    // Format alerts
    const formattedAlerts = alerts.map((org, index) => ({
      id: index + 1,
      type: org.status === 'SUSPENDED' ? 'error' : 'warning',
      message: org.status === 'SUSPENDED'
        ? `${org.name} is suspended`
        : `${org.name} trial ending soon`,
      orgId: org.id,
    }));

    // Generate growth data (last 6 months)
    // In production, this would be actual monthly aggregates
    const now = new Date();
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      // Simulated growth pattern
      const baseOrgs = Math.max(1, totalOrganizations - (i * 2));
      const baseUsers = Math.max(1, totalUsers - (i * 10));
      growthData.push({
        month: monthName,
        organizations: baseOrgs,
        users: baseUsers,
      });
    }

    // System metrics (would come from monitoring in production)
    const systemMetrics = [
      { name: 'API Response', value: 45, max: 100, unit: 'ms', status: 'good' },
      { name: 'Database Load', value: 23, max: 100, unit: '%', status: 'good' },
      { name: 'Memory Usage', value: 67, max: 100, unit: '%', status: 'warning' },
      { name: 'Requests/min', value: 1250, max: 5000, unit: '', status: 'good' },
    ];

    // Fabric nodes status (would come from actual Fabric network)
    const fabricNodes = [
      { id: '1', name: 'peer0.org1', type: 'peer', status: 'running', uptime: '99.9%' },
      { id: '2', name: 'peer1.org1', type: 'peer', status: 'running', uptime: '99.8%' },
      { id: '3', name: 'orderer0', type: 'orderer', status: 'running', uptime: '99.9%' },
      { id: '4', name: 'ca.org1', type: 'ca', status: 'running', uptime: '100%' },
    ];

    return NextResponse.json({
      platformStats: {
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        activeUsers,
        totalElections,
        activeElections,
        totalBallots,
      },
      recentOrgs,
      alerts: formattedAlerts,
      growthData,
      systemMetrics,
      fabricNodes,
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
