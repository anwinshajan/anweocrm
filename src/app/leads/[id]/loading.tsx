// loading.tsx for /leads/[id]
export default function LeadDetailLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse max-w-6xl mx-auto">
      {/* Back + title */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-9 w-72 rounded-xl" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>

      {/* AI buttons */}
      <div className="flex gap-2">
        <div className="skeleton h-9 w-28 rounded-xl" />
        <div className="skeleton h-9 w-28 rounded-xl" />
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* Status bar */}
      <div className="card flex gap-4 animate-pulse">
        <div className="skeleton h-10 w-40 rounded-xl" />
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-10 w-24 rounded-xl" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full rounded" />
          ))}
        </div>
        <div className="card flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full rounded" />
          ))}
        </div>
        <div className="card md:col-span-2 flex flex-col gap-3">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
