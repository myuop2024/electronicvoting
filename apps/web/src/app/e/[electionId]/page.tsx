import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ElectionLanding } from '../../../components/election/ElectionLanding';
import { prisma } from '@electronicvoting/database';

interface ElectionPageProps {
  params: Promise<{ electionId: string }>;
}

async function getElection(electionId: string) {
  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        organization: {
          select: {
            name: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        _count: {
          select: {
            contests: true,
            voters: true,
            ballots: true,
          },
        },
      },
    });

    if (!election) return null;

    // Only show published, active, or closed elections
    if (!['PUBLISHED', 'ACTIVE', 'CLOSED'].includes(election.status)) {
      return null;
    }

    // Determine voting status
    const now = new Date();
    let votingStatus = 'NOT_STARTED';
    if (election.status === 'CLOSED') {
      votingStatus = 'CLOSED';
    } else if (now >= election.votingStartAt && now <= election.votingEndAt) {
      votingStatus = 'VOTING_OPEN';
    } else if (now > election.votingEndAt) {
      votingStatus = 'CLOSED';
    }

    return {
      id: election.id,
      name: election.name,
      description: election.description,
      orgName: election.organization.name,
      orgLogoUrl: election.organization.logoUrl,
      primaryColor: election.primaryColor || election.organization.primaryColor,
      heroImageUrl: election.heroImageUrl,
      votingStartAt: election.votingStartAt.toISOString(),
      votingEndAt: election.votingEndAt.toISOString(),
      status: votingStatus,
      verificationMode: election.verificationMode,
      allowChannels: election.allowChannels,
      languages: election.languages,
      contestCount: election._count.contests,
      voterCount: election._count.voters,
      votescast: election._count.ballots,
    };
  } catch (error) {
    console.error('Error fetching election:', error);
    return null;
  }
}

export async function generateMetadata({ params }: ElectionPageProps): Promise<Metadata> {
  const { electionId } = await params;
  const election = await getElection(electionId);

  if (!election) {
    return { title: 'Election Not Found' };
  }

  return {
    title: election.name,
    description: election.description || `Vote in ${election.name}`,
    openGraph: {
      title: election.name,
      description: election.description || `Vote in ${election.name}`,
      type: 'website',
    },
  };
}

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { electionId } = await params;
  const election = await getElection(electionId);

  if (!election) {
    notFound();
  }

  return <ElectionLanding election={election} />;
}
