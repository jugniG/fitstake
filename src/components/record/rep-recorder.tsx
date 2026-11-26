import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { buildRepCounter, createLivenessGuard, getLandmarkerFor } from '#/lib/vision'
import type { Landmark, VisionLandmarker } from '#/lib/vision'
import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import { completeDay, startWorkout } from '#/lib/server/challenges'
import { cameraSupportFailure, describeCameraFailure } from '#/lib/camera'
import { formatClock } from '#/lib/format'
import { Button } from '#/components/ui/button'

type Props = {
  dayNumber: number
  exerciseType: ExerciseType
  customGesture: CustomGesture | null
  targetSets: number
  targetReps: number
}

type CameraStatus =
  | 'idle'
  | 'loading'
  | 'live'
  | 'submitting'
  | 'done'
  | 'denied'
  | 'unsupported'
  | 'error'

export function RepRecorder({ dayNumber, exerciseType, customGesture, targetSets, targetReps }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const navigate = useNavigate()
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [reps, setReps] = useState(0)
  const [sets, setSets] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef<boolean>(true)
  const ref = useRef({
    repCounter: buildRepCounter(exerciseType, customGesture),
    liveness: createLivenessGuard(),
    landmarker: null as VisionLandmarker | null,
    startMs: 0,
    sets: 0,
    minConf: 1,
    running: false,
    starting: false,
    raf: 0,
    stream: null as MediaStream | null,
    sessionToken: null as string | null,
    track: null as MediaStreamTrack | null,
    onTrackEnded: null as (() => void) | null,
    onVisibility: null as (() => void) | null,
    lastElapsed: -1,
    lastReps: -1,
    lastWarning: null as string | null,
  })

  const isMounted = () => mountedRef.current

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const current = ref.current
      current.running = false
      cancelAnimationFrame(current.raf)
      detachCameraListeners(current)
      const stream = current.stream
      current.stream = null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function detachCameraListeners(current: typeof ref.current) {
    if (current.track && current.onTrackEnded) {
      current.track.removeEventListener('ended', current.onTrackEnded)
    }
    if (current.onVisibility) {
      document.removeEventListener('visibilitychange', current.onVisibility)
    }
    current.track = null
    current.onTrackEnded = null
    current.onVisibility = null
  }

  function stopStream() {
    const current = ref.current
    current.running = false
    cancelAnimationFrame(current.raf)
    detachCameraListeners(current)
    const stream = current.stream
    current.stream = null
    if (videoRef.current) videoRef.current.srcObject = null
    stream?.getTracks().forEach((track) => track.stop())
  }

  function interrupt(reason: string) {
    if (!ref.current.running && !ref.current.starting) return
    console.error('[record] session interrupted:', reason)
    stopStream()
    ref.current.starting = false
    setStatus('error')
    setError(reason)
  }

  async function begin() {
    if (ref.current.running || ref.current.starting) return
    ref.current.starting = true
    setError(null)
    setWarning(null)
    setStatus('loading')

    const supportFailure = cameraSupportFailure()
    if (supportFailure) {
      ref.current.starting = false
      setStatus(supportFailure.phase)
      setError(supportFailure.message)
      return
    }

    try {
      ref.current.landmarker = await getLandmarkerFor(exerciseType)
    } catch (cause) {
      console.error('[record] pose model failed to load:', cause)
      ref.current.starting = false
      if (!isMounted()) return
      setStatus('error')
      setError('The pose model could not load. Check your connection, then try again.')
      return
    }
    if (!isMounted()) return

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      })
    } catch (cause) {
      console.error('[record] camera failed to start:', cause)
      ref.current.starting = false
      if (!isMounted()) return
      const failure = describeCameraFailure(cause)
      setStatus(failure.phase)
      setError(failure.message)
      return
    }
    if (!isMounted()) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    ref.current.stream = stream
    const video = videoRef.current
    if (!video) {
      ref.current.starting = false
      stopStream()
      setStatus('error')
      setError('The camera preview element is missing. Reload the page and try again.')
      return
    }
    video.srcObject = stream
    try {
      await video.play()
    } catch (cause) {
      console.error('[record] camera preview failed to play:', cause)
      ref.current.starting = false
      stopStream()
      setStatus('error')
      setError('The camera opened, but the live preview could not play. Try again or use another browser.')
      return
    }

    if (document.visibilityState === 'hidden') {
      ref.current.starting = false
      stopStream()
      setStatus('error')
      setError('The page was hidden before the session started. Keep it visible and try again.')
      return
    }

    try {
      const session = await startWorkout({ data: { dayNumber } })
      ref.current.sessionToken = session.token
      ref.current.startMs = performance.now()
    } catch (cause) {
      console.error('[record] could not start a verified session:', cause)
      ref.current.starting = false
      stopStream()
      if (!isMounted()) return
      setStatus('error')
      setError((cause as Error).message)
      return
    }

    const track = stream.getVideoTracks().at(0)
    if (!track || track.readyState === 'ended') {
      ref.current.starting = false
      stopStream()
      setStatus('error')
      setError('The camera feed ended before the session could start. Try again.')
      return
    }

    const onTrackEnded = () => {
      interrupt('The camera feed ended. No completion was submitted.')
    }
    track.addEventListener('ended', onTrackEnded)
    ref.current.track = track
    ref.current.onTrackEnded = onTrackEnded

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        interrupt('The page was hidden during the set. The take was stopped and no completion was submitted.')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    ref.current.onVisibility = onVisibility

    ref.current.repCounter.reset()
    ref.current.liveness.reset()
    ref.current.sets = 0
    ref.current.minConf = 1
    ref.current.lastElapsed = -1
    ref.current.lastReps = -1
    ref.current.lastWarning = null
    ref.current.running = true
    ref.current.starting = false
    setReps(0)
    setSets(0)
    setElapsed(0)
    setWarning(null)
    setStatus('live')
    loop()
  }

  function loop() {
    const current = ref.current
    if (!current.running) return
    current.raf = requestAnimationFrame(loop)

    const video = videoRef.current
    if (!video || video.readyState < 2 || !current.landmarker) return

    const nowMs = performance.now()
    const nextElapsed = Math.floor((nowMs - current.startMs) / 1000)
    if (nextElapsed !== current.lastElapsed) {
      current.lastElapsed = nextElapsed
      setElapsed(nextElapsed)
    }

    let landmarks: Landmark[] | null = null
    try {
      const result = current.landmarker.detectForVideo(video, nowMs)
      landmarks = (result.landmarks?.[0] as Landmark[] | undefined) ?? null
    } catch (cause) {
      console.error('[record] landmark detection failed:', cause)
      return
    }

    const live = current.liveness.onFrame(nowMs)
    if (!live.ok) {
      if (live.reason !== current.lastWarning) {
        current.lastWarning = live.reason
        setWarning(live.reason)
      }
      return
    }

    const result = current.repCounter.onFrame(landmarks, nowMs)
    if (current.repCounter.reps !== current.lastReps) {
      current.lastReps = current.repCounter.reps
      setReps(current.repCounter.reps)
    }
    if (result.confidence > 0 && result.confidence < current.minConf) {
      current.minConf = result.confidence
    }
    if (result.warning !== current.lastWarning) {
      current.lastWarning = result.warning
      setWarning(result.warning)
    }

    if (result.repCounted && current.repCounter.reps >= targetReps) {
      current.sets += 1
      setSets(current.sets)
      if (current.sets < targetSets) {
        current.repCounter.reset()
        current.lastReps = 0
        setReps(0)
      } else {
        void finish()
      }
    }
  }

  async function finish() {
    if (!ref.current.running) return
    ref.current.running = false
    cancelAnimationFrame(ref.current.raf)
    detachCameraListeners(ref.current)
    const stream = ref.current.stream
    ref.current.stream = null
    if (videoRef.current) videoRef.current.srcObject = null
    stream?.getTracks().forEach((track) => track.stop())

    const token = ref.current.sessionToken
    if (!token) {
      setStatus('error')
      setError('The session token is missing. Start a new session.')
      return
    }

    setStatus('submitting')
    const totalReps = ref.current.sets * targetReps
    try {
      await completeDay({
        data: {
          dayNumber,
          setsCompleted: ref.current.sets,
          totalReps,
          confidence: Math.max(0, ref.current.minConf),
          sessionToken: token,
        },
      })
      if (!isMounted()) return
      setStatus('done')
      void navigate({ to: '/dashboard' })
    } catch (cause) {
      console.error('[record] completing the day failed:', cause)
      if (!isMounted()) return
      setStatus('error')
      setError((cause as Error).message)
    }
  }

  if (status === 'done') {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl text-bone">Workout recorded.</h1>
        <p className="text-sm text-muted">Day {dayNumber} complete. Returning to the ledger…</p>
      </div>
    )
  }

  const busy = status === 'loading' || status === 'submitting'
  const live = status === 'live'

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl text-bone">Day {dayNumber}</h1>
        <p className="text-xs text-muted">
          {targetSets} sets × {targetReps} reps · live camera counting, no video saved
        </p>
      </header>

      <div className="relative overflow-hidden border border-line bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Live camera preview"
          className="h-auto w-full -scale-x-100"
        />
        {live || status === 'submitting' ? (
          <div className="absolute left-3 top-3 space-y-1">
            <p className="font-mono text-xs text-bone/90">
              set {sets}/{targetSets} · rep {reps}/{targetReps}
            </p>
            <p className="font-mono text-xs text-bone/70">{formatClock(elapsed)}</p>
          </div>
        ) : null}
      </div>

      {status === 'idle' ? (
        <div className="space-y-4">
          <div className="space-y-2 border border-line bg-panel/40 px-4 py-3 text-sm leading-relaxed text-bone-dim">
            <p>
              Stand far enough back that your whole body is in frame. Face the camera for jumping
              jacks; turn sideways for squats and push-ups. Use even light.
            </p>
            <p className="text-xs text-muted">
              The camera runs only in this tab. Nothing is uploaded or recorded; the browser counts
              reps and sends only the counts.
            </p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => void begin()}>
            Open camera and start
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <p role="status" className="text-muted">Loading the camera and pose model…</p>
      ) : null}

      {live ? (
        <p role="status" className="text-xs text-muted">
          Keep your whole body visible. A set counts when you return to the starting position.
        </p>
      ) : null}

      {warning && live ? (
        <p role="status" className="border border-rust/30 bg-rust/[0.08] px-3 py-2 text-xs text-rust/90">
          {warning}
        </p>
      ) : null}

      {status === 'submitting' ? (
        <p role="status" className="text-muted">Saving the verified counts…</p>
      ) : null}

      {status === 'denied' || status === 'unsupported' || status === 'error' ? (
        <div className="space-y-3">
          <p role="alert" className="field-error">{error}</p>
          {status !== 'unsupported' ? (
            <Button variant="secondary" className="w-full" onClick={() => void begin()} disabled={busy}>
              Try again
            </Button>
          ) : null}
          <Button variant="ghost" className="w-full" onClick={() => void navigate({ to: '/dashboard' })}>
            Back to dashboard
          </Button>
        </div>
      ) : null}
    </div>
  )
}
