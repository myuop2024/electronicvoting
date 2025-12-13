import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@electronicvoting/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> }
) {
  try {
    const { electionId } = await params;

    // Fetch election with contests and options
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
        contests: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Check if election is published or active
    if (!['PUBLISHED', 'ACTIVE', 'CLOSED'].includes(election.status)) {
      return NextResponse.json(
        { error: 'Election is not available' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const response = {
      election: {
        id: election.id,
        name: election.name,
        slug: election.slug,
        description: election.description,
        shortDescription: election.shortDescription,
        logoUrl: election.logoUrl,
        heroImageUrl: election.heroImageUrl,
        primaryColor: election.primaryColor || election.organization.primaryColor,
        secondaryColor: election.secondaryColor || election.organization.secondaryColor,
        status: election.status,
        votingStartAt: election.votingStartAt.toISOString(),
        votingEndAt: election.votingEndAt.toISOString(),
        resultsPublishAt: election.resultsPublishAt?.toISOString(),
        resultsVisibility: election.resultsVisibility,
        verificationMode: election.verificationMode,
        requireCaptcha: election.requireCaptcha,
        allowVoteChange: election.allowVoteChange,
        voteChangeDeadline: election.voteChangeDeadline?.toISOString(),
        languages: election.languages,
        organization: election.organization,
      },
      contests: election.contests.map((contest) => ({
        id: contest.id,
        name: contest.name,
        description: contest.description,
        type: contest.voteType,
        maxSelections: contest.maxSelections,
        minSelections: contest.minSelections,
        sortOrder: contest.sortOrder,
        options: contest.options.map((option) => ({
          id: option.id,
          name: option.name,
          subtitle: option.subtitle,
          description: option.description,
          imageUrl: option.imageUrl,
          sortOrder: option.sortOrder,
        })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching election:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
