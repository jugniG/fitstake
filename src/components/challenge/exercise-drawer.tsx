import { useEffect, useRef, useState } from 'react'
import type { ExerciseType, RoutineExercise, CustomGesture } from '#/lib/challenge'
import { CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import { ExerciseMascot } from './exercise-mascots'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Check, Plus, Trash2, X } from 'lucide-react'

export interface CatalogExerciseItem {
  type: ExerciseType
  name: string
  category: 'core' | 'lower' | 'upper'
  tags: string[]
  primaryTag: string
  description: string
  defaultSets: number
  defaultReps: number
  repsUnit: string
}

export const EXERCISE_CATALOG: CatalogExerciseItem[] = [
  {
    type: 'push_up',
    name: 'Chest Push-Ups',
    category: 'upper',
    tags: ['Chest & Pecs', 'Triceps', 'Core Strength'],
    primaryTag: 'Chest',
    description:
      'Horizontal plank with chest lowered to floor. Camera verifies 90° elbow depth and spinal alignment.',
    defaultSets: 3,
    defaultReps: 10,
    repsUnit: 'reps',
  },
  {
    type: 'squat',
    name: 'Deep Squats',
    category: 'lower',
    tags: ['Quads & Glutes', 'Hamstrings', 'Posterior Chain'],
    primaryTag: 'Quads & Glutes',
    description:
      'Full hip descent until thighs hit parallel with knees. Builds functional lower-body power and knee resilience.',
    defaultSets: 3,
    defaultReps: 15,
    repsUnit: 'reps',
  },
  {
    type: 'leg_raise',
    name: 'Lying Leg Raises',
    category: 'core',
    tags: ['Lower Abs', 'Hip Flexors', 'Core Stability'],
    primaryTag: 'Lower Abs',
    description:
      'Torso flat on workout mat, legs elevate to 90°. Directly isolates the lower abdominal wall and pelvis stabilizers.',
    defaultSets: 3,
    defaultReps: 12,
    repsUnit: 'reps',
  },
]

interface ExerciseDrawerProps {
  isOpen: boolean
  onClose: () => void
  routine: RoutineExercise[]
  onToggleExercise: (exercise: CatalogExerciseItem) => void
  onUpdateExercise: (
    exerciseType: ExerciseType,
    sets: number,
    reps: number,
    gesture?: CustomGesture | null,
  ) => void
}

export function ExerciseDrawer({
  isOpen,
  onClose,
  routine,
  onToggleExercise,
  onUpdateExercise,
}: ExerciseDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [filter, setFilter] = useState<'all' | 'core' | 'lower' | 'upper' | 'cardio' | 'desk'>(
    'all',
  )

  // Open / close modal with native dialog showModal()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Native backdrop click dismissal fallback
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    if (!isInDialog) {
      onClose()
    }
  }

  const filteredExercises = EXERCISE_CATALOG.filter((item) => {
    if (filter === 'all') return true
    return item.category === filter
  })

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={handleBackdropClick}
      aria-labelledby="exercise-drawer-title"
      className="fixed inset-x-0 bottom-0 top-auto z-50 m-0 w-full max-w-2xl mx-auto rounded-t-3xl border-t border-[#0d1b2a14] bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-xs overscroll-contain transition-transform"
      style={{
        maxHeight: '88vh',
      }}
    >
      <div className="flex flex-col h-full max-h-[88vh]">
        {/* Top Drag Handle */}
        <div className="pt-3 pb-1 text-center shrink-0">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-[#0d1b2a1a]" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-[#0d1b2a10] px-6 py-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
                Movement Library
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-emerald-800">
                {routine.length} in routine
              </span>
            </div>
            <h2
              id="exercise-drawer-title"
              className="mt-1 font-display text-xl font-bold text-[#0d1b2a] sm:text-2xl"
            >
              Select Your Daily Exercises
            </h2>
            <p className="mt-0.5 text-xs text-[#5a6678]">
              Choose the movements you want tracked sequentially on workout day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise pool"
            className="rounded-full p-2 text-[#5a6678] hover:bg-[#faf8f5] hover:text-[#0d1b2a] cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-6 py-3 border-b border-[#0d1b2a08] bg-[#faf8f5]/60 shrink-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Exercises (3)' },
            { id: 'upper', label: 'Chest & Arms' },
            { id: 'lower', label: 'Quads & Glutes' },
            { id: 'core', label: 'Lower Abs & Core' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id as typeof filter)}
              className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === cat.id
                  ? 'bg-[#2b66f2] text-white shadow-xs'
                  : 'bg-white border border-[#0d1b2a14] text-[#5a6678] hover:text-[#0d1b2a]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scrollable Exercise List */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {filteredExercises.map((cat) => {
            const activeItem = routine.find((r) => r.exerciseType === cat.type)
            const isAdded = Boolean(activeItem)
            const currentSets = activeItem?.targetSets ?? cat.defaultSets
            const currentReps = activeItem?.targetReps ?? cat.defaultReps

            return (
              <div
                key={cat.type}
                className={`relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isAdded
                    ? 'border-[#2b66f2] bg-white shadow-sm ring-1 ring-[#2b66f2]/20'
                    : 'border-[#0d1b2a12] bg-[#faf8f5]/40 hover:border-[#0d1b2a24]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Mascot and Info */}
                  <div className="flex items-start gap-4">
                    {/* Stylized Human Mascot Illustration */}
                    <div className="size-20 sm:size-24 rounded-2xl bg-white border border-[#0d1b2a10] p-1.5 grid place-items-center shrink-0 shadow-xs">
                      <ExerciseMascot type={cat.type} className="size-full" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base sm:text-lg font-bold text-[#0d1b2a]">
                          {cat.name}
                        </h3>
                        <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-bold text-[#2b66f2]">
                          Camera Verified
                        </span>
                      </div>

                      {/* Muscle Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {cat.tags.map((tag) => {
                          const isLowerAbs = tag.toLowerCase() === 'lower abs'
                          return (
                            <span
                              key={tag}
                              className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
                                isLowerAbs
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                                  : 'bg-[#0d1b2a08] text-[#5a6678]'
                              }`}
                            >
                              {tag}
                            </span>
                          )
                        })}
                      </div>

                      <p className="text-xs text-[#5a6678] leading-relaxed pt-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Add / Added Action Button */}
                  <div className="shrink-0 self-start sm:self-center">
                    {isAdded ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 font-mono text-xs font-bold text-emerald-800">
                          <Check className="size-3.5 stroke-[3]" /> Added
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleExercise(cat)}
                          title="Remove from routine"
                          className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onToggleExercise(cat)}
                        className="flex items-center gap-1.5 font-bold cursor-pointer"
                      >
                        <Plus className="size-4" /> Add
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sets & Reps Config (Always editable when added) */}
                {isAdded ? (
                  <div className="mt-4 border-t border-[#0d1b2a10] pt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5a6678]">
                        Sets
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={currentSets}
                        onChange={(e) =>
                          onUpdateExercise(
                            cat.type,
                            Math.max(1, parseInt(e.target.value) || 1),
                            currentReps,
                            activeItem?.customGesture,
                          )
                        }
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5a6678]">
                        Reps / Set ({cat.repsUnit})
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={currentReps}
                        onChange={(e) =>
                          onUpdateExercise(
                            cat.type,
                            currentSets,
                            Math.max(1, parseInt(e.target.value) || 1),
                            activeItem?.customGesture,
                          )
                        }
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    {cat.type === 'custom_gesture' ? (
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5a6678]">
                          Gesture
                        </Label>
                        <select
                          className="flex h-8 w-full rounded-2xl border border-[#0d1b2a1a] bg-white px-2 text-xs font-semibold text-[#0d1b2a] shadow-xs focus-visible:border-[#2b66f2] focus-visible:outline-none"
                          value={activeItem?.customGesture ?? 'pinch'}
                          onChange={(e) =>
                            onUpdateExercise(
                              cat.type,
                              currentSets,
                              currentReps,
                              e.target.value as CustomGesture,
                            )
                          }
                        >
                          {Object.entries(CUSTOM_GESTURE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Drawer Bottom Done Action */}
        <div className="border-t border-[#0d1b2a10] bg-[#faf8f5] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs font-mono font-bold text-[#0d1b2a]">
            <span className="text-[#2b66f2]">{routine.length}</span> movements configured in daily
            routine
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="font-bold px-6 cursor-pointer"
          >
            Save & Done
          </Button>
        </div>
      </div>
    </dialog>
  )
}
