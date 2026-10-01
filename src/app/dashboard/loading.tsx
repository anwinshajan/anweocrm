// loading.tsx for /dashboard (team)
export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse flex flex-col gap-3">
            <div className="skeleton h-6 w-8 rounded" />
            <div className="skeleton h-8 w-16 rounded-xl" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Follow-ups */}
      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-40 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
