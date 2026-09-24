import { getServices, getPackages } from '@/lib/data';
import AdminServicesClient from './ServicesClient';

export default async function AdminServicesPage() {
  const [services, packages] = await Promise.all([
    getServices(),
    getPackages(),
  ]);
  return <AdminServicesClient services={services} packages={packages} />;
}
