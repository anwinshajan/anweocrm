// loading.tsx for /settings
export default function SettingsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-36 rounded-xl" />
        <div className="skeleton h-4 w-72 rounded" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-28 rounded-lg" />
        ))}
      </div>

      {/* Form card */}
      <div className="card max-w-lg flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ))}
        <div className="skeleton h-10 w-36 rounded-xl self-end mt-2" />
      </div>
    </div>
  );
}
