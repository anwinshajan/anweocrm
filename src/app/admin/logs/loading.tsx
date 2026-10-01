// loading.tsx for /admin/logs
export default function AdminLogsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-36 rounded-xl" />
        <div className="skeleton h-4 w-56 rounded" />
      </div>
      <div className="card p-0 rounded-2xl overflow-hidden">
        <div className="skeleton h-12 w-full rounded-none" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full rounded-none border-t border-white/5" />
        ))}
      </div>
    </div>
  );
}
