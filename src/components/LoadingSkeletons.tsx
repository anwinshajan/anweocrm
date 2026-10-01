// Shared skeleton primitives used across all loading.tsx files
export function SkeletonBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`skeleton ${w} ${h} rounded-xl`} />;
}

export function SkeletonCard({ rows = 3, children }: { rows?: number; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 animate-pulse">
      {children ?? Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} w={i === 0 ? 'w-1/3' : i % 2 === 0 ? 'w-3/4' : 'w-full'} />
      ))}
    </div>
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24" style={{ color: 'var(--text-muted)' }}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--brand-500)]/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--brand-500)] animate-spin" />
      </div>
      {label && <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>}
    </div>
  );
}
