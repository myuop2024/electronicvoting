import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';
import crypto from 'crypto';

// GET /api/settings/webhooks - List webhooks
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
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

    const webhooks = await prisma.webhook.findMany({
      where: { orgId: membership.orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: w.events,
        status: w.status.toLowerCase(),
        lastTriggered: w.lastTriggeredAt?.toISOString() || null,
        successCount: w.successCount,
        failureCount: w.failureCount,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/settings/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      'election.created',
      'election.published',
      'election.started',
      'election.ended',
      'vote.created',
      'voter.registered',
      'voter.verified',
      'paper_ballot.uploaded',
      'paper_ballot.approved',
      'paper_ballot.rejected',
    ];

    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

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

    // Generate webhook secret
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        orgId: membership.orgId,
        name,
        url,
        secret,
        events,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        action: 'webhook.created',
        resource: 'Webhook',
        resourceId: webhook.id,
        details: { name, url, events },
        hash: '',
      },
    });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret, // Only returned on creation
        events: webhook.events,
        status: webhook.status.toLowerCase(),
        createdAt: webhook.createdAt.toISOString(),
      },
      message: 'Webhook created. Save the secret - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
