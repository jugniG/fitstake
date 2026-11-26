import { useState } from 'react'
import type { ExerciseType } from '#/lib/challenge'
import { cn } from '#/lib/utils'

interface MascotProps {
  className?: string
  frame?: 1 | 2 | 3
}

/**
 * Bryllim Open-Source Exercise Demonstration Asset
 * Standardized transparent exercise illustrations from @bryllim/workout-guide (CC BY-SA 4.0 / MIT)
 */
export function BryllimExerciseImage({
  slug,
  name,
  className,
  initialFrame = 2,
}: {
  slug: string
  name: string
  className?: string
  initialFrame?: 1 | 2 | 3
}) {
  const [frame, setFrame] = useState<number>(initialFrame)

  return (
    <div
      className={cn(
        'group/mascot relative flex items-center justify-center overflow-hidden rounded-xl bg-[#eef3fb]/80 border border-[#2b66f2]/20 p-1.5 transition-all select-none shadow-2xs',
        className,
      )}
      onMouseEnter={() => setFrame(1)}
      onMouseLeave={() => setFrame(initialFrame)}
      title={`${name} (hover to preview movement)`}
    >
      <img
        src={`/exercises/${slug}/frame-${frame}.png`}
        alt={`${name} demonstration`}
        className="size-full object-contain transition-opacity duration-150"
        loading="lazy"
        draggable={false}
      />
    </div>
  )
}

export function MascotSquat({ className, frame = 2 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="squat"
      name="Deep Squats"
      className={className}
      initialFrame={frame}
    />
  )
}

export function MascotPushUp({ className, frame = 2 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="push_up"
      name="Chest Push-Ups"
      className={className}
      initialFrame={frame}
    />
  )
}

export function MascotLegRaise({ className, frame = 2 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="leg_raise"
      name="Lying Leg Raises"
      className={className}
      initialFrame={frame}
    />
  )
}

/**
 * Exercise Mascot dispatcher rendering Bryllim open-source fitness artwork
 */
export function ExerciseMascot({
  type,
  className,
  frame = 2,
}: {
  type: ExerciseType
  className?: string
  frame?: 1 | 2 | 3
}) {
  switch (type) {
    case 'squat':
      return <MascotSquat className={className} frame={frame} />
    case 'push_up':
      return <MascotPushUp className={className} frame={frame} />
    case 'leg_raise':
      return <MascotLegRaise className={className} frame={frame} />
    default:
      return null
  }
}
