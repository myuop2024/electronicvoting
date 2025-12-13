import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ElectionLanding } from '../../../components/election/ElectionLanding';

interface ElectionPageProps {
  params: { electionId: string };
}

// This would normally fetch from the API
async function getElection(electionId: string) {
  // Mock data for now - would be API call
  const mockElection = {
    id: electionId,
    name: 'Annual Board Election 2024',
    description: 'Election for the Board of Directors for the 2024-2025 term. All registered members are eligible to vote.',
    orgName: 'Demo Electoral Commission',
    orgLogoUrl: null,
    primaryColor: '#2563EB',
    heroImageUrl: null,
    votingStartAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    votingEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'VOTING_OPEN',
    verificationMode: 'HYBRID',
    allowChannels: ['web', 'whatsapp'],
    languages: ['en', 'es'],
    contestCount: 4,
    voterCount: 2500,
    votescast: 1680,
  };

  return mockElection;
}

export async function generateMetadata({ params }: ElectionPageProps): Promise<Metadata> {
  const election = await getElection(params.electionId);

  if (!election) {
    return { title: 'Election Not Found' };
  }

  return {
    title: election.name,
    description: election.description,
    openGraph: {
      title: election.name,
      description: election.description,
      type: 'website',
    },
  };
}

export default async function ElectionPage({ params }: ElectionPageProps) {
  const election = await getElection(params.electionId);

  if (!election) {
    notFound();
  }

  return <ElectionLanding election={election} />;
}
