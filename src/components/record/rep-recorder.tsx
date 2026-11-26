import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { buildRepCounter, createLivenessGuard, getLandmarkerFor } from '#/lib/vision'
import type { Landmark, VisionLandmarker } from '#/lib/vision'
import { CUSTOM_GESTURE_LABELS, EXERCISE_LABELS } from '#/lib/challenge'
import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import { completeDay, startWorkout } from '#/lib/server/challenges'
import { cameraSupportFailure, describeCameraFailure } from '#/lib/camera'
import { formatClock } from '#/lib/format'
import { drawSkeleton, getExerciseFeedback } from '#/lib/vision/drawer'
import { SmartSpectraSensor } from '#/lib/vision/smartspectra'
import type { SmartSpectraReading } from '#/lib/vision/smartspectra'
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
  | 'scanning'
  | 'live'
  | 'resting'
  | 'submitting'
  | 'done'
  | 'denied'
  | 'unsupported'
  | 'error'

export function RepRecorder({
  dayNumber,
  exerciseType,
  customGesture,
  targetSets,
  targetReps,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const navigate = useNavigate()
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [reps, setReps] = useState(0)
  const [sets, setSets] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [justCountedRep, setJustCountedRep] = useState(false)
  const [restSeconds, setRestSeconds] = useState(30)
  const [scanProgress, setScanProgress] = useState(8)
  const [vitals, setVitals] = useState<SmartSpectraReading>({
    pulseBpm: 72,
    breathingRate: 16,
    hrvMs: 55,
    livenessScore: 0.95,
    exertionZone: 'Resting',
    signalQuality: 'Good',
    timestampMs: 0,
  })
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean }>({
    message: 'Looking for your body…',
    isError: false,
  })

  const mountedRef = useRef<boolean>(true)
  const ref = useRef({
    repCounter: buildRepCounter(exerciseType, customGesture),
    liveness: createLivenessGuard(),
    landmarker: null as VisionLandmarker | null,
    sensor: new SmartSpectraSensor(),
    startMs: 0,
    sets: 0,
    minConf: 1,
    running: false,
    starting: false,
    resting: false,
    restTimer: 0 as unknown as ReturnType<typeof setInterval>,
    scanTimer: 0 as unknown as ReturnType<typeof setInterval>,
    pulseTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    raf: 0,
    stream: null as MediaStream | null,
    sessionToken: null as string | null,
    track: null as MediaStreamTrack | null,
    onTrackEnded: null as (() => void) | null,
    onVisibility: null as (() => void) | null,
    lastElapsed: -1,
    lastReps: -1,
    lastFeedbackTime: 0,
    lastVitalsTime: 0,
  })

  const isMounted = () => mountedRef.current

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const current = ref.current
      current.running = false
      cancelAnimationFrame(current.raf)
      clearInterval(current.restTimer)
      clearInterval(current.scanTimer)
      clearTimeout(current.pulseTimer)
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
    current.resting = false
    clearInterval(current.restTimer)
    clearInterval(current.scanTimer)
    clearTimeout(current.pulseTimer)
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

  function startReadinessScan() {
    setStatus('scanning')
    setScanProgress(8)
    clearInterval(ref.current.scanTimer)

    ref.current.scanTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current.scanTimer)
          finishReadinessScan()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function finishReadinessScan() {
    clearInterval(ref.current.scanTimer)
    const reading = ref.current.sensor.processFrame(videoRef.current, performance.now())
    ref.current.sensor.setBaseline(reading.pulseBpm, reading.breathingRate, reading.hrvMs)
    setStatus('live')
  }

  function startRestPeriod() {
    ref.current.resting = true
    setStatus('resting')
    setRestSeconds(30)
    clearInterval(ref.current.restTimer)

    // Clear skeleton canvas during rest
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }

    ref.current.restTimer = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current.restTimer)
          resumeAfterRest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function resumeAfterRest() {
    clearInterval(ref.current.restTimer)
    ref.current.resting = false
    setStatus('live')
  }

  const isPortrait = exerciseType === 'squat' || exerciseType === 'jumping_jack'
  const isCustomGesture = exerciseType === 'custom_gesture'

  async function begin() {
    if (ref.current.running || ref.current.starting) return
    ref.current.starting = true
    setError(null)
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
        video: isPortrait
          ? {
              facingMode: { ideal: 'user' },
              aspectRatio: { ideal: 3 / 4 },
              width: { ideal: 960 },
              height: { ideal: 1280 },
            }
          : {
              facingMode: { ideal: 'user' },
              aspectRatio: { ideal: 16 / 9 },
              width: { ideal: 1280 },
              height: { ideal: 720 },
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
      setError(
        'The camera opened, but the live preview could not play. Try again or use another browser.',
      )
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
        interrupt(
          'The page was hidden during the set. The take was stopped and no completion was submitted.',
        )
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    ref.current.onVisibility = onVisibility

    ref.current.repCounter.reset()
    ref.current.liveness.reset()
    ref.current.sensor.reset()
    ref.current.sets = 0
    ref.current.minConf = 1
    ref.current.lastElapsed = -1
    ref.current.lastReps = -1
    ref.current.lastFeedbackTime = 0
    ref.current.lastVitalsTime = 0
    ref.current.running = true
    ref.current.starting = false
    ref.current.resting = false
    setReps(0)
    setSets(0)
    setElapsed(0)
    startReadinessScan()
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

    // SmartSpectra contactless vitals analysis (rPPG & exertion tracking)
    const reading = current.sensor.processFrame(
      video,
      nowMs,
      current.resting,
      reps + sets * targetReps,
    )
    if (nowMs - current.lastVitalsTime > 400) {
      current.lastVitalsTime = nowMs
      setVitals(reading)
    }

    if (current.resting) return

    let landmarks: Landmark[] | null = null
    try {
      const result = current.landmarker.detectForVideo(video, nowMs)
      landmarks = (result.landmarks?.[0] as Landmark[] | undefined) ?? null
    } catch (cause) {
      console.error('[record] landmark detection failed:', cause)
      return
    }

    // Draw skeleton on canvas overlay
    const canvas = canvasRef.current
    if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawSkeleton(ctx, landmarks, canvas.width, canvas.height, isCustomGesture)
      }
    }

    const live = current.liveness.onFrame(nowMs)
    if (!live.ok) {
      setFeedback({ message: live.reason ?? 'Looking for movement…', isError: true })
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

    // Update feedback text every 250ms to prevent jitter
    if (nowMs - current.lastFeedbackTime > 250) {
      current.lastFeedbackTime = nowMs
      setFeedback(getExerciseFeedback(exerciseType, customGesture, landmarks, result.warning))
    }

    if (result.repCounted) {
      setJustCountedRep(true)
      clearTimeout(current.pulseTimer)
      current.pulseTimer = setTimeout(() => setJustCountedRep(false), 500)

      if (current.repCounter.reps >= targetReps) {
        current.sets += 1
        setSets(current.sets)
        if (current.sets < targetSets) {
          current.repCounter.reset()
          current.lastReps = 0
          setReps(0)
          startRestPeriod()
        } else {
          void finish()
        }
      }
    }
  }

  async function finish() {
    if (!ref.current.running) return
    ref.current.running = false
    ref.current.resting = false
    clearInterval(ref.current.restTimer)
    clearInterval(ref.current.scanTimer)
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
    const biometricsSummary = ref.current.sensor.getSummary()

    try {
      await completeDay({
        data: {
          dayNumber,
          setsCompleted: ref.current.sets,
          totalReps,
          confidence: Math.max(0, ref.current.minConf),
          sessionToken: token,
          biometrics: biometricsSummary,
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
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-50 p-8 text-center space-y-3">
        <h1 className="font-display text-2xl font-extrabold text-emerald-900">
          Workout recorded & verified!
        </h1>
        <p className="text-sm font-medium text-emerald-800">
          Day {dayNumber} complete. Returning to your dashboard…
        </p>
      </div>
    )
  }

  const busy = status === 'loading' || status === 'submitting'
  const isLive = status === 'live' || status === 'resting'
  const exerciseTitle =
    exerciseType === 'custom_gesture'
      ? `${EXERCISE_LABELS.custom_gesture} (${CUSTOM_GESTURE_LABELS[customGesture ?? 'pinch']})`
      : EXERCISE_LABELS[exerciseType]

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
          Camera Verification
        </span>
        <h1 className="font-display text-2xl font-extrabold text-[#0d1b2a]">Day {dayNumber}</h1>
        <p className="text-xs font-medium text-[#5a6678]">
          {targetSets} sets × {targetReps} reps · On-device vision & SmartSpectra™ vitals
        </p>
      </header>

      <div
        className={`relative mx-auto overflow-hidden rounded-3xl border border-[#0d1b2a20] bg-[#0d1b2a] shadow-2xl ${
          isPortrait
            ? 'aspect-[3/4] max-w-sm sm:max-w-md'
            : isCustomGesture
              ? 'aspect-square max-w-md'
              : 'aspect-[16/9] max-w-2xl'
        }`}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Live camera preview"
          className="h-full w-full object-cover -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover -scale-x-100"
        />

        {/* SmartSpectra Pre-Workout Readiness Scan Overlay */}
        {status === 'scanning' ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-md">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-rose-500/80 animate-pulse">
              <span className="text-4xl">❤️</span>
            </div>
            <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-widest text-emerald-400">
              SmartSpectra™ Vitals Calibration
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              Cardiovascular Baseline
            </h2>
            <div className="my-2 font-mono text-3xl font-bold text-white">
              {vitals.pulseBpm} <span className="text-xs text-slate-400">BPM</span>
            </div>
            <p className="mb-5 max-w-xs text-xs text-slate-300">
              Calibrating resting pulse & biological pulse waveform ({scanProgress}s)…
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-white/10"
              onClick={finishReadinessScan}
            >
              Skip Calibration & Start Set 1
            </Button>
          </div>
        ) : null}

        {/* Top HUD: Exercise Title, SmartSpectra Vitals, Set, & Time */}
        {isLive || status === 'submitting' ? (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-1 backdrop-blur-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    feedback.isError ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                  {exerciseTitle}
                </span>
              </div>
              {/* SmartSpectra Heart Rate Pill */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-2.5 py-1 backdrop-blur-md">
                <span className="text-xs text-rose-400 animate-pulse">❤️</span>
                <span className="font-mono text-xs font-semibold text-white">
                  {vitals.pulseBpm}
                </span>
                <span className="text-[0.65rem] uppercase text-white/60 font-mono">
                  {vitals.exertionZone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-black/75 px-2.5 py-1 font-mono text-xs text-white/90 backdrop-blur-md">
                Set {Math.min(sets + 1, targetSets)}/{targetSets}
              </span>
              <span className="rounded-full border border-white/20 bg-black/75 px-2.5 py-1 font-mono text-xs text-white/70 backdrop-blur-md">
                {formatClock(elapsed)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Rep completion flash pulse */}
        {justCountedRep ? (
          <div className="pointer-events-none absolute inset-0 z-10 border-4 border-emerald-400/80 bg-emerald-500/15 transition-opacity duration-300" />
        ) : null}

        {/* Bottom Prominent Rep Counter */}
        {status === 'live' ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-baseline gap-2 rounded-lg border border-white/20 bg-black/80 px-3.5 py-2 shadow-lg backdrop-blur-md">
            <span className="font-mono text-3xl font-extrabold leading-none text-white sm:text-4xl">
              {reps}
            </span>
            <span className="font-mono text-sm font-medium text-white/60 sm:text-base">
              / {targetReps} reps
            </span>
          </div>
        ) : null}

        {/* Rest Break Overlay between sets with SmartSpectra Heart Rate Recovery */}
        {status === 'resting' ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-md">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
              Set {sets} of {targetSets} Complete!
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">Take a Breather</h2>
            <div className="my-2 font-mono text-5xl font-bold text-[#2b66f2]">{restSeconds}s</div>

            {/* SmartSpectra Heart Rate Recovery Gauge */}
            <div className="my-3 w-full max-w-xs rounded-xl border border-white/20 bg-white/10 p-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-xs text-rose-400">❤️</span> Recovery Pulse
                </span>
                <span className="font-mono font-bold text-white">{vitals.pulseBpm} BPM</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[0.65rem] text-slate-400 font-mono">
                <span>Peak: {ref.current.sensor.getSummary().peakBpm} BPM</span>
                <span className="text-emerald-400 font-medium">
                  -{Math.max(0, ref.current.sensor.getSummary().peakBpm - vitals.pulseBpm)} BPM
                  recovery
                </span>
              </div>
            </div>

            <p className="mb-5 max-w-xs text-xs text-slate-300">
              Catch your breath. Set {sets + 1} begins automatically when the timer runs out.
            </p>
            <Button variant="primary" size="lg" onClick={resumeAfterRest}>
              Start Set {sets + 1} Now
            </Button>
          </div>
        ) : null}
      </div>

      {status === 'idle' ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-[#0d1b2a14] bg-white p-5 text-sm leading-relaxed text-[#5a6678] shadow-xs">
            <p className="font-bold text-[#0d1b2a] mb-1">Camera setup instructions:</p>
            <p>
              {exerciseType === 'squat'
                ? 'Position your camera so hips, knees, and ankles are clearly visible. Turn slightly 45° so parallel knee flexion can be detected.'
                : exerciseType === 'push_up'
                  ? 'Position camera to your side so your shoulders, back, hips, and knees are visible.'
                  : exerciseType === 'jumping_jack'
                    ? 'Stand back far enough that your full body and overhead reach fit in the frame.'
                    : 'Hold your hand clearly in front of the camera.'}
            </p>
            <p className="mt-2 text-xs text-[#5a6678] font-medium">
              🔒 100% On-Device Privacy: SmartSpectra™ contactless vitals & joint kinematics run
              strictly in browser RAM. No video is ever saved or uploaded.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full py-4 text-base shadow-md"
            onClick={() => void begin()}
          >
            Open camera and begin Day {dayNumber}
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <p role="status" className="text-muted">
          Loading camera, pose models, and SmartSpectra sensor…
        </p>
      ) : null}

      {/* Real-time form feedback pill */}
      {status === 'live' && feedback.message ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded border px-3.5 py-2.5 text-xs transition-colors ${
            feedback.isError
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <span className="shrink-0">{feedback.isError ? '⚠️' : '✓'}</span>
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {status === 'submitting' ? (
        <p role="status" className="text-muted">
          Saving verified reps and biometric recovery summary…
        </p>
      ) : null}

      {status === 'denied' || status === 'unsupported' || status === 'error' ? (
        <div className="space-y-3">
          <p role="alert" className="field-error">
            {error}
          </p>
          {status !== 'unsupported' ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void begin()}
              disabled={busy}
            >
              Try again
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void navigate({ to: '/dashboard' })}
          >
            Back to dashboard
          </Button>
        </div>
      ) : null}
    </div>
  )
}
