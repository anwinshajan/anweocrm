// loading.tsx for /leads
export default function LeadsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-8 w-32 rounded-xl" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="skeleton h-10 w-60 rounded-xl" />
        <div className="skeleton h-10 w-36 rounded-xl" />
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
