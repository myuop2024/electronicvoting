import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@electronicvoting/auth/server';
import { prisma } from '@electronicvoting/database';

// GET /api/settings/organization - Get organization settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access' },
        { status: 403 }
      );
    }

    const org = membership.organization;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logoUrl: org.logoUrl,
        websiteUrl: org.websiteUrl,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        timezone: org.timezone,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        plan: org.plan,
        settings: org.settings,
        features: org.features,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/organization - Update organization settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get user's organization membership
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

    // Build update object
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) updateData.secondaryColor = body.secondaryColor;

    // Settings is a JSON field, merge with existing
    if (body.settings) {
      const currentSettings = (membership.organization.settings as Record<string, any>) || {};
      updateData.settings = { ...currentSettings, ...body.settings };
    }

    // Slug update requires uniqueness check
    if (body.slug && body.slug !== membership.organization.slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug: body.slug },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Slug already taken' },
          { status: 400 }
        );
      }
      updateData.slug = body.slug;
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: membership.orgId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        orgId: membership.orgId,
        action: 'organization.updated',
        resource: 'Organization',
        resourceId: membership.orgId,
        details: { updatedFields: Object.keys(updateData) },
        hash: '',
      },
    });

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        logoUrl: updated.logoUrl,
        websiteUrl: updated.websiteUrl,
        contactEmail: updated.contactEmail,
        timezone: updated.timezone,
      },
      message: 'Organization updated successfully',
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
