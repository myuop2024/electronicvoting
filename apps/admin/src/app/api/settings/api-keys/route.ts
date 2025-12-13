import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';
import crypto from 'crypto';

// GET /api/settings/api-keys - List API keys
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

    const apiKeys = await prisma.apiKey.findMany({
      where: { orgId: membership.orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.keyPrefix + '...',
        scopes: key.scopes,
        status: key.status.toLowerCase(),
        lastUsed: key.lastUsedAt?.toISOString() || null,
        usageCount: key.usageCount,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/settings/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes = ['read'], expiresInDays } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
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

    // Generate secure API key
    const keyBytes = crypto.randomBytes(32);
    const rawKey = `ev_${Buffer.from(keyBytes).toString('base64url')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    // Calculate expiry
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        orgId: membership.orgId,
        name,
        keyHash,
        keyPrefix,
        scopes,
        createdBy: session.user.id,
        expiresAt,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        action: 'apikey.created',
        resource: 'ApiKey',
        resourceId: apiKey.id,
        details: { name, scopes },
        hash: '',
      },
    });

    // Return key (only shown once!)
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned on creation
        prefix: keyPrefix + '...',
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt.toISOString(),
        expiresAt: apiKey.expiresAt?.toISOString() || null,
      },
      message: 'API key created. Copy the key now - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
