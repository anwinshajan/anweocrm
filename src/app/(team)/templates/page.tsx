import { getTemplates } from '@/lib/data';
import TeamTemplatesClient from './TeamTemplatesClient';

export default async function TeamTemplatesPage() {
  const templates = await getTemplates();
  const activeTemplates = templates.filter(t => t.active === 'TRUE');
  return <TeamTemplatesClient templates={activeTemplates} />;
}
