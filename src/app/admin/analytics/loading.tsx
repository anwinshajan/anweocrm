// Generic table loading skeleton reused across admin sections
function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-48 rounded-xl" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="card p-0 rounded-2xl overflow-hidden">
        <div className="skeleton h-12 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-none border-t border-white/5" />
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-44 rounded-xl" />
        <div className="skeleton h-4 w-56 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-3">
            <div className="skeleton h-8 w-20 rounded-xl" />
            <div className="skeleton h-4 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card flex flex-col gap-4">
          <div className="skeleton h-5 w-36 rounded" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
        <div className="card flex flex-col gap-4">
          <div className="skeleton h-5 w-36 rounded" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
