import { FabricStatus } from '../components/FabricStatus';
import { ProviderChecklist } from '../components/ProviderChecklist';

export default function SuperAdminHome() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Fabric network health</h2>
        <FabricStatus />
      </section>
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Provider onboarding</h2>
        <ProviderChecklist />
      </section>
    </div>
  );
}
