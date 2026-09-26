import { getBrandKnowledge } from '@/lib/data';
import TeamBrandClient from './TeamBrandClient';

export default async function TeamBrandPage() {
  const brandData = await getBrandKnowledge();
  return <TeamBrandClient data={brandData} />;
}
