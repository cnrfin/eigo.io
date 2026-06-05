'use client'

/**
 * Pulsing placeholder card shown while content loads — same shape/chrome as the
 * real cards so the layout doesn't jump (pattern from the Home lesson skeleton).
 */
export default function SkeletonCard({
  rows = 3,
  center = false,
  className = '',
}: {
  rows?: number
  center?: boolean
  className?: string
}) {
  // Varied bar widths so stacked skeletons read as "content", not stripes.
  const widths = ['w-40', 'w-56', 'w-32', 'w-48', 'w-24']
  return (
    <div
      aria-hidden
      className={`p-5 rounded-2xl animate-pulse ${className}`}
      style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}
    >
      <div className={`flex flex-col gap-2.5 ${center ? 'items-center' : ''}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`rounded ${i === 0 ? 'h-4' : 'h-3'} ${widths[i % widths.length]} max-w-full`}
            style={{ background: 'var(--inset)' }}
          />
        ))}
      </div>
    </div>
  )
}
