import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Download,
  HardDrive,
  LoaderCircle,
  RotateCcw,
  ShieldQuestion,
  Square,
  Video,
} from 'lucide-react'
import { useState } from 'react'
import type { CaptureSummary, CommitmentPlan } from '#/lib/commitment'
import { getOpenDay } from '#/lib/commitment'
import { useCommitment } from '#/lib/commitment-store'
import { formatClock, formatDateTime, formatINR } from '#/lib/format'
import { useCameraRecorder } from '#/hooks/use-camera-recorder'
import type { RecordingTake } from '#/hooks/use-camera-recorder'
import { AppShell } from '#/components/app-shell'
import { ExerciseList } from '#/components/exercise-list'
import { PlanGate } from '#/components/plan-gate'
import { Button, buttonStyles } from '#/components/ui/button'

export const Route = createFileRoute('/record')({
  component: RecordPage,
})

function RecordPage() {
  return (
    <AppShell>
      <PlanGate>{(plan) => <RecordContent plan={plan} />}</PlanGate>
    </AppShell>
  )
}

function RecordContent({ plan }: { plan: CommitmentPlan }) {
  const { state, recordCapture } = useCommitment()
  const openDay = getOpenDay(state)
  const previousCapture = openDay ? state.captures[String(openDay)] : undefined
  const recorder = useCameraRecorder()
  const [savedCapture, setSavedCapture] = useState<{
    day: number
    capture: CaptureSummary
  } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (openDay === null) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">The mirror is closed</p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-none text-bone">
            No open day to record.
          </h1>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted">
          Every allocation already has a demo settlement. Reset the demo from the ledger or the
          commitment terms to record again.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/history" className={buttonStyles({ variant: 'primary' })}>
            Open the ledger
          </Link>
          <Link to="/dashboard" className={buttonStyles({ variant: 'secondary' })}>
            Back to the ritual
          </Link>
        </div>
      </div>
    )
  }

  const keepCapture = () => {
    if (!recorder.take) return
    setSaveError(null)

    const capture: CaptureSummary = {
      status: recorder.take.interrupted ? 'interrupted' : 'captured',
      capturedAt: new Date().toISOString(),
      durationSeconds: recorder.take.durationSeconds,
      note: recorder.take.interruptedReason ?? undefined,
    }

    const result = recordCapture(openDay, capture)
    if (!result.ok) {
      setSaveError(result.message)
      return
    }

    setSavedCapture({ day: openDay, capture })
  }

  const startAnotherTake = () => {
    setSavedCapture(null)
    setSaveError(null)
    recorder.discardTake()
    void recorder.startCamera()
  }

  const isReview = recorder.phase === 'review'
  // Another tab can settle the open day, so a saved summary only applies to the day it names.
  const currentSavedCapture = savedCapture?.day === openDay ? savedCapture.capture : null
  const saved = currentSavedCapture ?? previousCapture ?? null

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="eyebrow">Day {openDay} · live capture</p>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
            Local only
          </span>
        </div>
        <h1 className="mt-4 font-display text-[clamp(2.7rem,12vw,4.4rem)] font-medium leading-[0.9] tracking-[-0.02em] text-bone">
          The mirror.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          One required session for{' '}
          <span className="font-medium text-bone-dim">{formatINR(plan.dailyAmount)}</span> at stake.
          Camera access is requested only when you open the mirror.
        </p>
      </header>

      {saved && !currentSavedCapture ? (
        <div className="border border-sage/25 bg-sage/[0.045] px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm text-sage">
            <Check aria-hidden="true" className="h-4 w-4" />A capture summary is already saved for
            this open day.
          </p>
          <p className="mt-1.5 pl-6 text-xs leading-relaxed text-muted">
            {saved.status === 'interrupted' ? 'Interrupted' : 'Captured'} ·{' '}
            {formatClock(saved.durationSeconds)} · {formatDateTime(saved.capturedAt)}. The video
            file itself is not retained after reload. Verification is still pending and no money
            moved.
          </p>
        </div>
      ) : null}

      <section aria-labelledby="mirror-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Haunted mirror</p>
            <h2
              id="mirror-heading"
              className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
            >
              {phaseTitle(recorder.phase, Boolean(recorder.take))}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">At stake</p>
            <p className="mt-1 font-display text-2xl font-medium tabular-nums text-rust">
              {formatINR(plan.dailyAmount)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <span
              aria-hidden="true"
              className={
                recorder.phase === 'recording'
                  ? 'mirror-live-dot mirror-live-dot-recording'
                  : 'mirror-live-dot'
              }
            />
            {phaseLabel(recorder.phase)}
          </span>
          <span
            className="font-mono text-sm tabular-nums text-bone-dim"
            aria-label={`Elapsed time ${recorder.elapsedLabel}`}
          >
            {recorder.elapsedLabel}
          </span>
        </div>

        <div className="mirror-frame mt-2">
          <div className="mirror-glass">
            {isReview && recorder.take ? (
              <video
                src={recorder.take.url}
                controls
                playsInline
                className="mirror-video"
                aria-label="Review your recorded workout take"
              />
            ) : recorder.livePreview ? (
              <video
                ref={recorder.videoRef}
                autoPlay
                muted
                playsInline
                className="mirror-video mirror-video-live"
                aria-label="Live mirrored camera preview"
              />
            ) : (
              <MirrorPlaceholder phase={recorder.phase} />
            )}
            <div aria-hidden="true" className="mirror-vignette" />
            <span aria-hidden="true" className="mirror-ornament mirror-ornament-top" />
            <span aria-hidden="true" className="mirror-ornament mirror-ornament-bottom" />
          </div>
        </div>

        <div aria-live="polite" className="mt-3 min-h-5">
          {recorder.notice ? (
            <p className="flex gap-2 text-xs leading-relaxed text-rust/90">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {recorder.notice}
            </p>
          ) : null}
          {recorder.errorMessage ? (
            <p className="flex gap-2 text-xs leading-relaxed text-rust">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {recorder.errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {recorder.phase === 'idle' ||
          recorder.phase === 'denied' ||
          recorder.phase === 'error' ||
          recorder.phase === 'unsupported' ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1"
                onClick={() => void recorder.startCamera()}
              >
                <Camera aria-hidden="true" className="h-4 w-4" />
                Open the mirror
              </Button>
              <Link
                to="/dashboard"
                className={buttonStyles({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'w-full sm:w-auto',
                })}
              >
                Back to the ritual
              </Link>
            </div>
          ) : null}

          {recorder.phase === 'requesting' ? (
            <Button variant="secondary" size="lg" className="w-full" disabled>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Waiting for camera permission
            </Button>
          ) : null}

          {recorder.phase === 'ready' ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1"
                onClick={recorder.startRecording}
                disabled={!recorder.recordingSupported}
              >
                <Video aria-hidden="true" className="h-4 w-4" />
                Begin recording
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={recorder.closeMirror}
              >
                Close mirror
              </Button>
            </div>
          ) : null}

          {recorder.phase === 'recording' ? (
            <div className="space-y-2">
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                onClick={recorder.stopRecording}
              >
                <Square aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                End session
              </Button>
              <p className="text-center text-xs text-muted">
                Press end when the session is complete. Stopping does not mark the day complete.
              </p>
            </div>
          ) : null}

          {recorder.phase === 'stopping' ? (
            <Button variant="secondary" size="lg" className="w-full" disabled>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Sealing the take
            </Button>
          ) : null}

          {isReview && recorder.take ? (
            <ReviewActions
              take={recorder.take}
              day={openDay}
              saved={Boolean(currentSavedCapture)}
              saveError={saveError}
              onKeep={keepCapture}
              onRecordAgain={startAnotherTake}
              onDownload={() => recorder.downloadTake(`workout-commitment-day-${openDay}`)}
              onBack={() => void recorder.closeMirror()}
            />
          ) : null}

          {currentSavedCapture ? (
            <div className="border border-sage/30 bg-sage/[0.06] px-4 py-4">
              <p className="flex items-center gap-2 text-sm font-medium text-sage">
                <Check aria-hidden="true" className="h-4 w-4" />
                Capture summary saved for Day {openDay}.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Recording:{' '}
                {currentSavedCapture.status === 'interrupted' ? 'interrupted' : 'captured'} ·{' '}
                {formatClock(currentSavedCapture.durationSeconds)}. Verification remains pending and
                no money moved. The video file stays in this tab only; download it now if you want
                to keep it.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/dashboard" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
                  Back to the ritual
                </Link>
                <Link to="/history" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                  Open the ledger
                </Link>
                <Button variant="ghost" size="sm" onClick={startAnotherTake}>
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                  Record another take
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="session-heading" className="border border-line bg-panel/55">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <p className="eyebrow">Keep this readable</p>
          <h2
            id="session-heading"
            className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
          >
            Required session
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            The instructions sit below the mirror on purpose, so the frame never covers your body or
            the required movements.
          </p>
        </div>
        <div className="px-4 py-2 sm:px-5">
          <ExerciseList exercises={plan.exercises} />
        </div>
      </section>

      <section
        aria-labelledby="storage-heading"
        className="border border-line bg-void/35 px-4 py-5 sm:px-5"
      >
        <div className="flex items-start gap-3">
          <HardDrive aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rust" />
          <div>
            <h2
              id="storage-heading"
              className="font-display text-xl font-medium leading-none text-bone"
            >
              Where this take lives
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>
                This prototype does not upload the video. The live preview and take stay inside this
                browser tab.
              </li>
              <li>
                After you leave or reload this screen, the video file is gone. Only a capture
                summary — status, time and duration — can be saved to the local demo ledger.
              </li>
              <li>Download the take before leaving if you want to keep the file.</li>
              <li>Video only: no microphone audio is requested.</li>
              <li>
                Camera permission must be allowed for this site. If the feed is interrupted, the
                take is stopped and labeled interrupted rather than silently treated as complete.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 border-t border-line pt-4">
          <ShieldQuestion aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <h3 className="font-display text-lg font-medium leading-none text-bone">
              Capture is not verification
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              A camera recording does not prove that the exercises or reps were completed. The
              verification method is undecided, so nothing on this screen authorizes a payout or
              forfeiture.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ReviewActions({
  take,
  day,
  saved,
  saveError,
  onKeep,
  onRecordAgain,
  onDownload,
  onBack,
}: {
  take: RecordingTake
  day: number
  saved: boolean
  saveError: string | null
  onKeep: () => void
  onRecordAgain: () => void
  onDownload: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="border border-line bg-panel/50 px-3.5 py-3 text-xs leading-relaxed text-muted">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-bone-dim">
          Review · {formatClock(take.durationSeconds)} ·{' '}
          {Math.max(1, Math.round(take.bytes / 1024))} KB
        </p>
        <p className="mt-1.5">
          Keeping this take saves only its capture summary for Day {day}. The video file is not
          uploaded or kept after you leave.
        </p>
        {take.interruptedReason ? (
          <p className="mt-2 flex gap-2 text-rust/90">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {take.interruptedReason}
          </p>
        ) : null}
      </div>

      {saveError ? (
        <p role="alert" className="field-error">
          {saveError}
        </p>
      ) : null}

      {!saved ? (
        <Button variant="primary" size="lg" className="w-full" onClick={onKeep}>
          <Check aria-hidden="true" className="h-4 w-4" />
          Keep capture summary
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRecordAgain}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Record again
        </Button>
        <Button variant="secondary" onClick={onDownload}>
          <Download aria-hidden="true" className="h-4 w-4" />
          Download take
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Close mirror
        </Button>
      </div>

      <p className="flex gap-2 text-[0.7rem] leading-relaxed text-faint">
        <ShieldQuestion aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Keeping a capture does not complete the day, verify the workout or settle money.
      </p>
    </div>
  )
}

function MirrorPlaceholder({ phase }: { phase: string }) {
  const isRequesting = phase === 'requesting'
  const isDenied = phase === 'denied'
  const isError = phase === 'error' || phase === 'unsupported'

  return (
    <div className="mirror-placeholder">
      {isRequesting ? (
        <LoaderCircle aria-hidden="true" className="h-8 w-8 animate-spin text-rust" />
      ) : isDenied || isError ? (
        <CameraOff aria-hidden="true" className="h-8 w-8 text-rust/80" strokeWidth={1.3} />
      ) : (
        <Camera aria-hidden="true" className="h-8 w-8 text-rust/80" strokeWidth={1.2} />
      )}
      <p className="mt-4 font-display text-2xl font-medium text-bone">
        {isRequesting
          ? 'Asking the mirror for sight.'
          : isDenied
            ? 'The mirror stays dark.'
            : isError
              ? 'The mirror is unavailable.'
              : 'The mirror is dark.'}
      </p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted">
        {isRequesting
          ? 'Waiting for camera permission. Nothing is recorded while you decide.'
          : isDenied || isError
            ? 'The camera did not open. Read the message below and try again when you are ready.'
            : 'Open it when you are ready. Camera access is requested only after you tap.'}
      </p>
    </div>
  )
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'requesting':
      return 'Requesting camera'
    case 'ready':
      return 'Mirror live'
    case 'recording':
      return 'Recording'
    case 'stopping':
      return 'Sealing take'
    case 'review':
      return 'Reviewing take'
    case 'denied':
      return 'Permission denied'
    case 'unsupported':
      return 'Camera unavailable'
    case 'error':
      return 'Camera error'
    default:
      return 'Mirror dark'
  }
}

function phaseTitle(phase: string, hasTake: boolean): string {
  if (phase === 'review' && hasTake) return 'Review the take.'
  if (phase === 'recording') return 'Hold still. Begin.'
  if (phase === 'ready') return 'You are seen.'
  if (phase === 'requesting') return 'Opening the mirror.'
  if (phase === 'stopping') return 'Sealing the take.'
  return 'A dark mirror.'
}
