import { getServices, getPackages } from '@/lib/data';
import TeamServicesClient from './TeamServicesClient';

export default async function TeamServicesPage() {
  const [services, packages] = await Promise.all([
    getServices(),
    getPackages(),
  ]);
  
  // Filter only active services and packages for the team to view
  const activeServices = services.filter(s => s.active === 'TRUE');
  const activePackages = packages.filter(p => p.active === 'TRUE');

  return <TeamServicesClient services={activeServices} packages={activePackages} />;
}
