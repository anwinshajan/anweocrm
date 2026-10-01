// loading.tsx for /admin/payments
export default function AdminPaymentsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-40 rounded-xl" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-2">
            <div className="skeleton h-8 w-20 rounded-xl" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="card p-0 rounded-2xl overflow-hidden">
        <div className="skeleton h-12 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-none border-t border-white/5" />
        ))}
      </div>
    </div>
  );
}
