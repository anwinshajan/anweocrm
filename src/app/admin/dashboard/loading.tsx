// loading.tsx for /admin/dashboard
export default function AdminDashboardLoading() {
  return (
    <div className="p-6 flex flex-col gap-8 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-48 rounded-xl" />
          <div className="skeleton h-4 w-36 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-3">
            <div className="skeleton h-8 w-20 rounded-xl" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card flex flex-col gap-3">
          <div className="skeleton h-5 w-32 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className="card flex flex-col gap-3">
          <div className="skeleton h-5 w-24 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="card flex flex-col gap-3">
        <div className="skeleton h-5 w-36 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
