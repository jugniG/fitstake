import type { Exercise } from '#/lib/commitment'
import { formatPrescription } from '#/lib/format'
import { cn } from '#/lib/utils'

export function ExerciseList({
  exercises,
  dense = false,
}: {
  exercises: Exercise[]
  dense?: boolean
}) {
  return (
    <div className={cn('w-full', dense ? 'text-sm' : 'text-[0.95rem]')}>
      <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
        <span className="text-[0.58rem] uppercase tracking-[0.18em] text-muted">
          Required session
        </span>
        <span className="text-[0.58rem] uppercase tracking-[0.18em] text-muted">Sets × reps</span>
      </div>
      <ol className={cn('divide-y divide-line/80', dense ? '' : 'mt-1')}>
        {exercises.map((exercise, index) => (
          <li
            key={exercise.id}
            className={cn('flex items-center justify-between gap-4', dense ? 'py-2' : 'py-3.5')}
          >
            <span className="flex min-w-0 items-baseline gap-3">
              <span className="font-mono text-[0.62rem] tabular-nums text-rust/80">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 break-words text-bone">{exercise.name}</span>
            </span>
            <span className="shrink-0 font-mono text-[0.8rem] tabular-nums text-bone-dim">
              {formatPrescription(exercise.sets, exercise.reps)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
