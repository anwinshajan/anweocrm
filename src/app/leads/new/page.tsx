import { getConfigList } from '@/lib/data';
import NewLeadClient from './NewLeadClient';

export default async function NewLeadPage() {
  const [cats, sources] = await Promise.all([
    getConfigList('lead_category'),
    getConfigList('lead_source'),
  ]);
  return (
    <NewLeadClient
      categories={cats.map((c) => c.label)}
      sources={sources.map((s) => s.label)}
    />
  );
}
