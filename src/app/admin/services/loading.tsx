// loading.tsx for /admin/services
export default function AdminServicesLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-36 rounded-xl" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-3">
            <div className="skeleton h-6 w-40 rounded-xl" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-9 w-24 rounded-xl mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
