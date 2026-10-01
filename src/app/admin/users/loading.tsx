// loading.tsx for /admin/users
export default function AdminUsersLoading() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-52 rounded-xl" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
      </div>

      {/* Table */}
      <div className="card p-0 rounded-2xl overflow-hidden">
        <div className="skeleton h-12 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-none border-t border-white/5" />
        ))}
      </div>
    </div>
  );
}
