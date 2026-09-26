const fs = require('fs');
const path = require('path');

const pages = [
    ['src/app/admin/users/page.tsx', 'Users', 'USERS'],
    ['src/app/admin/packages/page.tsx', 'Packages', 'PACKAGES'],
    ['src/app/admin/config/page.tsx', 'Config', 'CONFIG'],
    ['src/app/admin/brand/page.tsx', 'Brand Knowledge', 'BRAND_KNOWLEDGE'],
    ['src/app/admin/templates/page.tsx', 'Templates', 'TEMPLATES'],
    ['src/app/admin/announcements/page.tsx', 'Announcements', 'ANNOUNCEMENTS'],
    ['src/app/admin/logs/page.tsx', 'Logs', 'LOGS'],
    ['src/app/admin/settings/page.tsx', 'Settings', 'SETTINGS'],
    ['src/app/followups/page.tsx', 'Follow Ups', 'LEADS'],
    ['src/app/inbox/page.tsx', 'Inbox', 'MESSAGES'],
    ['src/app/leads/import/page.tsx', 'Import Leads', 'LEADS'],
    ['src/app/admin/analytics/page.tsx', 'Analytics', 'STATS']
];

const template = `import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { readObjects } from '@/lib/data/sheets-base';
import { TABS } from '@/lib/data/tabs';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');

  const data = await readObjects(TABS.{tab_name});

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            {title}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Manage your {lower_title} and view related data.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <span>+</span>
          <span>Add New</span>
        </button>
      </div>
      
      <div className="card-glass overflow-hidden p-0 shadow-lg border border-[var(--border)] group hover:border-[var(--border-active)] transition-all duration-300">
        <div className="table-container w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                {data.length > 0 && Object.keys(data[0]).map((k) => (
                  <th key={k} className="p-4 font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)] border-b border-[var(--border)]">
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.map((row: any, i) => (
                <tr key={i} className="hover:bg-[var(--surface-3)] transition-colors duration-200">
                  {Object.values(row).map((v: any, j) => (
                    <td key={j} className="p-4 text-sm text-[var(--text-primary)]">
                      {String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="empty-state py-16 text-center">
              <div className="empty-icon text-4xl mb-4 opacity-50">📭</div>
              <p className="text-[var(--text-muted)] text-lg">No records found for {title}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

pages.forEach(([filePath, title, tabName]) => {
    const fullPath = path.join(__dirname, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    let content = template.replace(/{title}/g, title).replace(/{lower_title}/g, title.toLowerCase()).replace(/{tab_name}/g, tabName);
    fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('Admin pages regenerated with premium UI.');
