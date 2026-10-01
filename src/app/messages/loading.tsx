// loading.tsx for /messages
export default function MessagesLoading() {
  return (
    <div className="p-6 md:p-10 flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-56 rounded-xl" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        <div className="skeleton h-10 w-36 rounded-t-lg" />
        <div className="skeleton h-10 w-36 rounded-t-lg" />
        <div className="skeleton h-10 w-28 rounded-t-lg" />
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-4">
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="flex justify-between">
              <div className="skeleton h-9 w-36 rounded-xl" />
              <div className="skeleton h-9 w-32 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
