import os

pages = [
    ('src/app/admin/users/page.tsx', 'Users', 'USERS'),
    ('src/app/admin/packages/page.tsx', 'Packages', 'PACKAGES'),
    ('src/app/admin/config/page.tsx', 'Config', 'CONFIG'),
    ('src/app/admin/brand/page.tsx', 'Brand Knowledge', 'BRAND_KNOWLEDGE'),
    ('src/app/admin/templates/page.tsx', 'Templates', 'TEMPLATES'),
    ('src/app/admin/announcements/page.tsx', 'Announcements', 'ANNOUNCEMENTS'),
    ('src/app/admin/logs/page.tsx', 'Logs', 'LOGS'),
    ('src/app/admin/settings/page.tsx', 'Settings', 'SETTINGS'),
    ('src/app/followups/page.tsx', 'Follow Ups', 'LEADS'),
    ('src/app/inbox/page.tsx', 'Inbox', 'MESSAGES'),
]

template = """import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { readObjects } from '@/lib/data/sheets-base';
import { TABS } from '@/lib/data/tabs';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');

  const data = await readObjects(TABS.{tab_name});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">{title}</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {data.length > 0 && Object.keys(data[0]).map((k) => (
                <th key={k} className="border-b p-3 font-medium text-sm text-gray-600 capitalize">{k.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {Object.values(row).map((v: any, j) => (
                  <td key={j} className="border-b p-3 text-sm text-gray-700">{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="p-6 text-gray-500 text-center">No records found.</p>}
      </div>
    </div>
  );
}
"""

for path, title, tab_name in pages:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(template.replace('{title}', title).replace('{tab_name}', tab_name))

print('Admin pages generated.')
