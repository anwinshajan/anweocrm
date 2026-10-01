// loading.tsx for /followups
export default function FollowupsLoading() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-44 rounded-xl" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
