import { NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/dashboard/stats - Get admin dashboard statistics
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

    const orgId = membership.orgId;

    // Get election statistics
    const [
      activeElections,
      totalElections,
      totalVoters,
      totalBallots,
      pendingVoters,
      recentElectionsData,
      recentActivity,
    ] = await Promise.all([
      // Active elections count
      prisma.election.count({
        where: { orgId, status: 'ACTIVE' },
      }),
      // Total elections
      prisma.election.count({
        where: { orgId },
      }),
      // Total voters across all elections
      prisma.voter.count({
        where: { election: { orgId } },
      }),
      // Total ballots cast
      prisma.ballot.count({
        where: { election: { orgId } },
      }),
      // Pending voter verifications
      prisma.voter.count({
        where: { election: { orgId }, status: 'PENDING' },
      }),
      // Recent elections with stats
      prisma.election.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          status: true,
          votingEndAt: true,
          _count: {
            select: {
              voters: true,
              ballots: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Recent audit logs
      prisma.auditLog.findMany({
        where: { orgId },
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          createdAt: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate turnout percentage
    const turnoutPercentage = totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;

    // Format recent elections
    const recentElections = recentElectionsData.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status.toLowerCase(),
      turnout: e._count.voters > 0 ? (e._count.ballots / e._count.voters) * 100 : 0,
      totalVoters: e._count.voters,
      votesCast: e._count.ballots,
      endDate: e.votingEndAt.toISOString(),
    }));

    // Format recent activity
    const formattedActivity = recentActivity.map((log, index) => {
      const actionTypeMap: Record<string, string> = {
        'election.created': 'election',
        'election.published': 'election',
        'voters.imported': 'upload',
        'ballot.cast': 'vote',
        'auth.login_failed': 'security',
      };

      const details = log.details as Record<string, any> || {};
      let message = `${log.action} on ${log.resource}`;

      if (log.action === 'voters.imported') {
        message = `Voters imported (+${details.created || 0} voters)`;
      } else if (log.action === 'election.created') {
        message = `New election created`;
      } else if (log.action === 'ballot.cast') {
        message = `Vote cast in election`;
      }

      return {
        id: index + 1,
        type: actionTypeMap[log.action] || 'election',
        message,
        time: formatRelativeTime(log.createdAt),
      };
    });

    // Generate mock voting activity data based on actual ballots
    // In production, this would aggregate actual ballot timestamps
    const turnoutData = [
      { time: '9AM', votes: Math.floor(totalBallots * 0.05) },
      { time: '10AM', votes: Math.floor(totalBallots * 0.12) },
      { time: '11AM', votes: Math.floor(totalBallots * 0.22) },
      { time: '12PM', votes: Math.floor(totalBallots * 0.35) },
      { time: '1PM', votes: Math.floor(totalBallots * 0.50) },
      { time: '2PM', votes: Math.floor(totalBallots * 0.65) },
      { time: '3PM', votes: Math.floor(totalBallots * 0.82) },
      { time: '4PM', votes: totalBallots },
    ];

    // Device breakdown (would need tracking data in production)
    const deviceBreakdown = [
      { name: 'Mobile', value: 62, color: '#3b82f6' },
      { name: 'Desktop', value: 31, color: '#10b981' },
      { name: 'Tablet', value: 7, color: '#f59e0b' },
    ];

    return NextResponse.json({
      stats: {
        activeElections,
        totalElections,
        totalVoters,
        totalVotesCast: totalBallots,
        turnoutPercentage: Math.round(turnoutPercentage * 10) / 10,
        pendingReviews: pendingVoters,
        paperBallotsPending: 0, // Paper ballot tracking not implemented
      },
      recentElections,
      recentActivity: formattedActivity,
      turnoutData,
      deviceBreakdown,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
