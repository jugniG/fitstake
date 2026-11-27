// The push-up mascot from Workout Guide (see src/assets/exercises/ATTRIBUTION.md). These are
// the repo's normalized SVG frames, recoloured navy; the npm release only has PNGs, whose frames
// differ in line weight. The swap between poses is short and eased so it reads as one movement
// instead of two figures.
import UP_FRAME from '#/assets/exercises/push-up/frame-1.svg'
import DOWN_FRAME from '#/assets/exercises/push-up/frame-3.svg'

// Width of the hand-off between the two frames, as a share of the rep's depth.
const BLEND = 0.18
// The drawings are tilted; this levels the body. Negative lowers the head (left side), positive
// raises it.
const ROTATION_DEG = 8
// Where the floor shadow sits, as a share of the drawing's height and width. It is not rotated,
// so it stays flat under the hands and feet.
const SHADOW_TOP = '71%'
const SHADOW_CENTER_X = '54%'

// Energy scale for the year: slate → emerald → amber → orange → red. Deep, slightly muted tones
// so the bar reads as premium on the cream page rather than neon.
const HEAT_STOPS = [
  { at: 0, rgb: [100, 116, 139] },
  { at: 0.3, rgb: [16, 185, 129] },
  { at: 0.58, rgb: [245, 158, 11] },
  { at: 0.82, rgb: [234, 88, 12] },
  { at: 1, rgb: [220, 38, 38] },
]

export const HEAT_GRADIENT =
  'linear-gradient(90deg, #64748b 0%, #10b981 30%, #f59e0b 58%, #ea580c 82%, #dc2626 100%)'

export function heatColor(progress: number, alpha = 1): string {
  const t = Math.max(0, Math.min(1, progress))
  const upper = HEAT_STOPS.findIndex((stop) => stop.at >= t)
  const high = HEAT_STOPS[Math.max(upper, 1)]
  const low = HEAT_STOPS[Math.max(upper, 1) - 1]
  const mix = (t - low.at) / (high.at - low.at)
  const [r, g, b] = low.rgb.map((channel, index) =>
    Math.round(channel + (high.rgb[index] - channel) * mix),
  )
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// depth: 0 = arms straight (top), 1 = chest down (bottom).
// speed: 0..1, how fast the reps are; adds motion lines behind the mascot.
export function PushUpFigure({
  depth,
  speed = 0,
  className,
}: {
  depth: number
  speed?: number
  className?: string
}) {
  const downOpacity = smoothstep(0.5 - BLEND / 2, 0.5 + BLEND / 2, depth)

  return (
    <div aria-hidden="true" className={className}>
      <div className="relative aspect-square w-full">
        {/* Floor shadow: darker and tighter as the chest nears the floor. */}
        <div
          className="absolute h-[5%] w-[62%] rounded-[50%] bg-[#0d1b2a] blur-md"
          style={{
            top: SHADOW_TOP,
            left: SHADOW_CENTER_X,
            opacity: 0.12 + depth * 0.14,
            transform: `translate(-50%, -50%) scaleX(${1 - depth * 0.12})`,
          }}
        />

        {speed > 0.35 ? (
          <div
            className="absolute left-[4%] top-[38%] flex w-[18%] flex-col items-end gap-[6px]"
            style={{ opacity: Math.min(1, (speed - 0.35) * 1.8) }}
          >
            {[0.9, 1, 0.7].map((length, index) => (
              <span
                key={index}
                className="block h-[2px] rounded-full bg-[#0d1b2a]/25"
                style={{ width: `${length * speed * 100}%` }}
              />
            ))}
          </div>
        ) : null}

        <div className="absolute inset-0" style={{ transform: `rotate(${ROTATION_DEG}deg)` }}>
          <img
            src={UP_FRAME}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full select-none object-contain"
            style={{ opacity: 1 - downOpacity }}
          />
          <img
            src={DOWN_FRAME}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full select-none object-contain"
            style={{ opacity: downOpacity }}
          />
        </div>
      </div>
    </div>
  )
}
