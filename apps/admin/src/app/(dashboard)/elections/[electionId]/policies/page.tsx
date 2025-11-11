import { PolicyDesigner } from '@components/PolicyDesigner';

type PoliciesPageProps = {
  params: { electionId: string };
};

export default function ElectionPoliciesPage({ params }: PoliciesPageProps) {
  const { electionId } = params;
  return <PolicyDesigner electionId={electionId} />;
}
