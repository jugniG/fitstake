import { useEffect, useState } from 'react'
import type { ExerciseType } from '#/lib/challenge'
import { cn } from '#/lib/utils'

interface MascotProps {
  className?: string
  autoplay?: boolean
  intervalMs?: number
}

const EXERCISE_FRAMES = [1, 2, 3] as const

/**
 * Bryllim Open-Source Exercise Demonstration Asset with Continuous Autoplay Animation
 * Automatically loops through the 3 movement frames at a natural workout cadence.
 * Respects prefers-reduced-motion for accessibility.
 */
export function BryllimExerciseImage({
  slug,
  name,
  className,
  autoplay = true,
  intervalMs = 700,
}: {
  slug: string
  name: string
  className?: string
  autoplay?: boolean
  intervalMs?: number
}) {
  // Start at frame index 1 (frame-2 is the signature active inflection posture)
  const [frameIndex, setFrameIndex] = useState(1)

  useEffect(() => {
    if (!autoplay) return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFrameIndex(1)
      return
    }

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % EXERCISE_FRAMES.length)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [autoplay, intervalMs])

  return (
    <div
      className={cn(
        'group/mascot relative flex items-center justify-center overflow-hidden rounded-xl bg-[#eef3fb]/80 border border-[#2b66f2]/20 p-1.5 transition-all select-none shadow-2xs',
        className,
      )}
      title={`${name} continuous demonstration`}
    >
      {/* Preload and crossfade all 3 frames for zero-flicker continuous autoplay */}
      {EXERCISE_FRAMES.map((f, i) => (
        <img
          key={f}
          src={`/exercises/${slug}/frame-${f}.png`}
          alt={`${name} movement phase ${f}`}
          className={cn(
            'size-full object-contain transition-opacity duration-200',
            i === frameIndex
              ? 'opacity-100'
              : 'opacity-0 absolute inset-0 p-1.5 pointer-events-none',
          )}
          loading="eager"
          draggable={false}
        />
      ))}
    </div>
  )
}

export function MascotSquat({ className, autoplay = true, intervalMs = 700 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="squat"
      name="Deep Squats"
      className={className}
      autoplay={autoplay}
      intervalMs={intervalMs}
    />
  )
}

export function MascotPushUp({ className, autoplay = true, intervalMs = 700 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="push_up"
      name="Chest Push-Ups"
      className={className}
      autoplay={autoplay}
      intervalMs={intervalMs}
    />
  )
}

export function MascotLegRaise({ className, autoplay = true, intervalMs = 700 }: MascotProps) {
  return (
    <BryllimExerciseImage
      slug="leg_raise"
      name="Lying Leg Raises"
      className={className}
      autoplay={autoplay}
      intervalMs={intervalMs}
    />
  )
}

/**
 * Exercise Mascot dispatcher rendering continuously animating Bryllim artwork
 */
export function ExerciseMascot({
  type,
  className,
  autoplay = true,
  intervalMs = 700,
}: {
  type: ExerciseType
  className?: string
  autoplay?: boolean
  intervalMs?: number
}) {
  switch (type) {
    case 'squat':
      return <MascotSquat className={className} autoplay={autoplay} intervalMs={intervalMs} />
    case 'push_up':
      return <MascotPushUp className={className} autoplay={autoplay} intervalMs={intervalMs} />
    case 'leg_raise':
      return <MascotLegRaise className={className} autoplay={autoplay} intervalMs={intervalMs} />
    default:
      return null
  }
}
