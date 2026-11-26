import type { ExerciseType } from '#/lib/challenge'
import { cn } from '#/lib/utils'

interface MascotProps {
  className?: string
}

/**
 * Human Mascot performing Deep Squat
 */
export function MascotSquat({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Human mascot doing deep squats"
    >
      {/* Soft ground mat / shadow */}
      <ellipse cx="60" cy="110" rx="42" ry="6" fill="#0d1b2a" fillOpacity="0.08" />

      {/* Motion trail / kinetic depth arrow */}
      <path
        d="M26 62 L26 78 M26 78 L22 74 M26 78 L30 74"
        stroke="#2b66f2"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 3"
      />

      {/* Head with athletic headband */}
      <circle cx="70" cy="36" r="11" fill="#fed7aa" />
      <path d="M60 34 C63 32 75 32 80 34" stroke="#2b66f2" strokeWidth="3" strokeLinecap="round" />
      {/* Friendly eye dot */}
      <circle cx="74" cy="36" r="1.5" fill="#0d1b2a" />

      {/* Torso in athletic forward squat tilt */}
      <path
        d="M66 46 L50 68 L36 70"
        stroke="#2b66f2"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arms extended forward for balance */}
      <path
        d="M62 52 L82 56 L94 56"
        stroke="#fed7aa"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Legs in deep parallel squat: hip at 36,70 -> knee at 64,72 -> ankle at 62,106 -> foot at 74,106 */}
      <path
        d="M36 70 L66 70 L62 104 L74 106"
        stroke="#0d1b2a"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Athletic sneaker */}
      <rect x="58" y="102" width="22" height="7" rx="3.5" fill="#2b66f2" />

      {/* Parallel depth checkmark badge */}
      <circle cx="94" cy="28" r="8" fill="#10b981" fillOpacity="0.15" />
      <path
        d="M91 28 L93.5 30.5 L97.5 25.5"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Human Mascot performing Chest Push-Up
 */
export function MascotPushUp({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Human mascot doing push-ups"
    >
      {/* Exercise mat */}
      <rect x="12" y="94" width="96" height="6" rx="3" fill="#2b66f2" fillOpacity="0.15" />

      {/* Kinetic push arrows */}
      <path
        d="M48 64 L48 50 M48 50 L45 54 M48 50 L51 54"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Head looking down */}
      <circle cx="92" cy="62" r="10" fill="#fed7aa" />
      <path
        d="M84 60 C88 58 96 58 100 60"
        stroke="#2b66f2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Torso & Legs in plank line: shoulder at 80,70 -> hip at 52,72 -> feet at 22,86 */}
      <path
        d="M80 70 L52 73 L24 88"
        stroke="#0d1b2a"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bent Arm in 90° push-up: shoulder at 80,70 -> elbow at 66,58 -> hand at 70,94 */}
      <path
        d="M80 70 L66 60 L70 94"
        stroke="#fed7aa"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Palm planted on mat */}
      <rect x="66" y="91" width="12" height="5" rx="2" fill="#0d1b2a" />

      {/* Toes planted on mat */}
      <rect x="18" y="86" width="10" height="7" rx="2" fill="#2b66f2" />

      {/* Core focus badge */}
      <circle
        cx="52"
        cy="73"
        r="5"
        fill="#f59e0b"
        fillOpacity="0.3"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
    </svg>
  )
}

/**
 * Human Mascot performing Jumping Jack
 */
export function MascotJumpingJack({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Human mascot doing jumping jacks"
    >
      {/* Shadow */}
      <ellipse cx="60" cy="112" rx="36" ry="5" fill="#0d1b2a" fillOpacity="0.08" />

      {/* Energy stars / motion sparks */}
      <path d="M22 26 L24 30 L28 32 L24 34 L22 38 L20 34 L16 32 L20 30 Z" fill="#f59e0b" />
      <path d="M98 26 L100 30 L104 32 L100 34 L98 38 L96 34 L92 32 L96 30 Z" fill="#f59e0b" />

      {/* Athletic Head with smile */}
      <circle cx="60" cy="28" r="10" fill="#fed7aa" />
      <path
        d="M52 26 C56 24 64 24 68 26"
        stroke="#2b66f2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="63" cy="28" r="1.5" fill="#0d1b2a" />
      <path
        d="M59 32 C61 34 64 34 66 32"
        stroke="#0d1b2a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Torso upright athletic */}
      <path d="M60 38 L60 68" stroke="#2b66f2" strokeWidth="11" strokeLinecap="round" />

      {/* Arms raised wide in star position */}
      <path
        d="M26 34 L48 48 L60 48 L72 48 L94 34"
        stroke="#fed7aa"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Legs spread wide in star hop */}
      <path
        d="M32 102 L56 68 L60 68 L64 68 L88 102"
        stroke="#0d1b2a"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sneakers */}
      <rect x="24" y="99" width="14" height="6" rx="3" fill="#2b66f2" />
      <rect x="82" y="99" width="14" height="6" rx="3" fill="#2b66f2" />
    </svg>
  )
}

/**
 * Human Mascot performing Lying Leg Raises (with Lower Abs focus)
 */
export function MascotLegRaise({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Human mascot doing lying leg raises for lower abs"
    >
      {/* Workout floor mat */}
      <rect x="14" y="88" width="92" height="7" rx="3.5" fill="#2b66f2" fillOpacity="0.15" />

      {/* Head resting comfortably on mat */}
      <circle cx="28" cy="80" r="10" fill="#fed7aa" />
      <path
        d="M22 76 C25 74 33 74 36 76"
        stroke="#2b66f2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Torso horizontal flat on mat: shoulder at 38,82 -> hip at 66,82 */}
      <path d="M36 82 L68 82" stroke="#2b66f2" strokeWidth="11" strokeLinecap="round" />

      {/* Arm flat by hip for stabilization */}
      <path d="M42 84 L64 85" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />

      {/* Lower Abs Target Zone Glow */}
      <circle cx="62" cy="78" r="8" fill="#ef4444" fillOpacity="0.2" />
      <circle cx="62" cy="78" r="4" fill="#ef4444" />

      {/* Kinetic arc showing upward leg elevation */}
      <path
        d="M86 80 C86 56 78 40 68 28"
        stroke="#2b66f2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <path
        d="M68 28 L66 34 M68 28 L74 30"
        stroke="#2b66f2"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Both Legs raised upward at 90°: hip at 66,82 -> feet at 68,32 */}
      <path
        d="M66 82 L68 36"
        stroke="#0d1b2a"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Athletic sneakers at top */}
      <rect x="62" y="26" width="16" height="8" rx="4" fill="#2b66f2" />

      {/* Lower Abs Tag Pill in corner of mascot */}
      <g transform="translate(74, 52)">
        <rect width="42" height="18" rx="9" fill="#fef2f2" stroke="#fecaca" strokeWidth="1" />
        <text
          x="21"
          y="12"
          textAnchor="middle"
          fill="#dc2626"
          fontSize="8"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          LOWER ABS
        </text>
      </g>
    </svg>
  )
}

/**
 * Human Mascot performing Desk Hand Gesture
 */
export function MascotDeskGesture({ className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Human mascot doing desk hand gestures"
    >
      {/* Desk surface */}
      <rect x="16" y="86" width="88" height="6" rx="2" fill="#d97706" fillOpacity="0.3" />
      {/* Laptop base & screen */}
      <rect x="22" y="82" width="28" height="4" rx="1.5" fill="#64748b" />
      <path d="M26 82 L34 62 L48 62 L46 82 Z" fill="#94a3b8" />

      {/* Seated torso: shoulder at 72,56 -> hip at 82,90 */}
      <path d="M72 58 L82 90" stroke="#2b66f2" strokeWidth="11" strokeLinecap="round" />

      {/* Head */}
      <circle cx="72" cy="40" r="10" fill="#fed7aa" />
      <path
        d="M64 38 C68 36 76 36 80 38"
        stroke="#2b66f2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="70" cy="40" r="1.5" fill="#0d1b2a" />

      {/* Arm extended up showing hand to camera */}
      <path
        d="M72 58 L54 62 L48 42"
        stroke="#fed7aa"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hand making precision pinch gesture */}
      <circle cx="48" cy="38" r="6" fill="#fed7aa" />
      <circle cx="44" cy="34" r="2.5" fill="#fed7aa" />

      {/* Digital HUD optical tracking ring around hand */}
      <circle
        cx="46"
        cy="36"
        r="14"
        stroke="#2b66f2"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        fill="#2b66f2"
        fillOpacity="0.08"
      />
      <path
        d="M30 36 L34 36 M58 36 L62 36 M46 20 L46 24 M46 48 L46 52"
        stroke="#2b66f2"
        strokeWidth="1.5"
      />
    </svg>
  )
}

/**
 * Mascot dispatcher component
 */
export function ExerciseMascot({ type, className }: { type: ExerciseType; className?: string }) {
  switch (type) {
    case 'leg_raise':
      return <MascotLegRaise className={className} />
    case 'squat':
      return <MascotSquat className={className} />
    case 'push_up':
      return <MascotPushUp className={className} />
    case 'jumping_jack':
      return <MascotJumpingJack className={className} />
    case 'custom_gesture':
      return <MascotDeskGesture className={className} />
  }
}
