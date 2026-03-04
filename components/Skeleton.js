// Skeleton-Screens fuer Ladezustaende

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-700/50 rounded ${className}`} />
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2 mb-4" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-5 w-14 rounded" />
        <Skeleton className="h-5 w-10 rounded" />
      </div>
      <Skeleton className="h-3 w-1/3 mb-4" />
      <div className="flex gap-2 pt-3 border-t border-gray-700/50">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded ml-auto" />
      </div>
    </div>
  )
}

export function ProjectListSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
        </div>
      </div>
    </div>
  )
}

export function InfoCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/4 mb-3" />
      <Skeleton className="h-2 w-full rounded-full mb-2" />
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex gap-2 pt-3 border-t border-gray-700/50">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-8 rounded ml-auto" />
      </div>
    </div>
  )
}

export function DeployListSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700/50 divide-y divide-gray-700/50">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
      ))}
    </div>
  )
}
