import { z } from 'zod'

// Onboarding choices survive the plan checkout redirect in localStorage. The server never reads
// this; createChallenge re-validates everything when the card is authorized.
const SETUP_DRAFT_KEY = 'stakefit:setup-draft:v1'

export const exerciseItemSchema = z.object({
  enabled: z.boolean(),
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture', 'leg_raise']),
  customGesture: z.enum(['pinch', 'fist', 'open_hand']).nullable().optional(),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(500),
})

const setupDraftSchema = z.object({
  totalDays: z.number().int().min(1).max(365),
  dailyStakeAmount: z.number().int().min(1).max(10_000),
  exercises: z.array(exerciseItemSchema),
  startDayOffset: z.enum(['0', '1']),
})

export type SetupDraft = z.infer<typeof setupDraftSchema>

export function readSetupDraft(): SetupDraft | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(SETUP_DRAFT_KEY)
  } catch (error) {
    console.error('[setup-draft] could not read draft:', error)
    return null
  }
  if (!raw) return null
  try {
    const parsed = setupDraftSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
    console.error('[setup-draft] discarding invalid draft:', parsed.error.issues)
  } catch (error) {
    console.error('[setup-draft] discarding unreadable draft:', error)
  }
  clearSetupDraft()
  return null
}

export function saveSetupDraft(draft: SetupDraft): void {
  try {
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    // Storage can be full or disabled (private mode). Onboarding still works in one sitting.
    console.error('[setup-draft] could not save draft:', error)
  }
}

export function clearSetupDraft(): void {
  try {
    localStorage.removeItem(SETUP_DRAFT_KEY)
  } catch (error) {
    console.error('[setup-draft] could not clear draft:', error)
  }
}
