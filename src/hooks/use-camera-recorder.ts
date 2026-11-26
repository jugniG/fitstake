import { useCallback, useEffect, useRef, useState } from 'react'
import { formatClock } from '#/lib/format'

export type RecorderPhase =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'recording'
  | 'stopping'
  | 'review'
  | 'denied'
  | 'unsupported'
  | 'error'

export type RecordingTake = {
  url: string
  durationSeconds: number
  mimeType: string
  bytes: number
  interrupted: boolean
  interruptedReason: string | null
}

type CameraFailure = {
  phase: 'denied' | 'unsupported' | 'error'
  message: string
}

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=h264',
  'video/mp4',
]

export function useCameraRecorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number | null>(null)
  const interruptedRef = useRef<string | null>(null)
  const failedRef = useRef(false)
  const mountedRef = useRef(true)
  const takeUrlRef = useRef<string | null>(null)
  const phaseRef = useRef<RecorderPhase>('idle')
  const cameraRequestRef = useRef(0)

  const [phase, setPhaseState] = useState<RecorderPhase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [take, setTake] = useState<RecordingTake | null>(null)
  const [recordingSupported, setRecordingSupported] = useState(false)

  const updatePhase = useCallback((next: RecorderPhase) => {
    phaseRef.current = next
    setPhaseState(next)
  }, [])

  useEffect(() => {
    setRecordingSupported(typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined')
  }, [])

  const stopStreamTracks = useCallback(() => {
    const stream = streamRef.current
    streamRef.current = null
    if (!stream) return

    for (const track of stream.getTracks()) {
      track.stop()
    }
  }, [])

  const clearTakeUrl = useCallback(() => {
    if (takeUrlRef.current) {
      URL.revokeObjectURL(takeUrlRef.current)
      takeUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    if (phase !== 'ready' && phase !== 'recording') return

    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    if (video.srcObject !== stream) {
      video.srcObject = stream
    }

    void video.play().catch((error: unknown) => {
      console.error('[camera] could not start the live preview:', error)
      if (mountedRef.current) {
        setNotice('The camera opened, but the live preview could not play. Try reopening it.')
      }
    })
  }, [phase])

  useEffect(() => {
    if (phase !== 'recording') return

    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) return
      setElapsedSeconds(Math.floor((performance.now() - startedAtRef.current) / 1000))
    }, 250)

    return () => window.clearInterval(timer)
  }, [phase])

  const finalizeRecording = useCallback(() => {
    const recorder = recorderRef.current
    const startedAt = startedAtRef.current
    startedAtRef.current = null
    recorderRef.current = null

    if (failedRef.current) {
      failedRef.current = false
      chunksRef.current = []
      stopStreamTracks()
      return
    }

    const durationSeconds = startedAt
      ? Math.max(1, Math.round((performance.now() - startedAt) / 1000))
      : 0
    const chunks = chunksRef.current
    chunksRef.current = []
    const mimeType = recorder?.mimeType || 'video/webm'
    const blob = new Blob(chunks, { type: mimeType })

    stopStreamTracks()

    if (!mountedRef.current) return

    if (blob.size === 0) {
      updatePhase('error')
      setErrorMessage(
        'The recording ended but produced no video data. Nothing was saved. Open the mirror and try again.',
      )
      setNotice(null)
      return
    }

    clearTakeUrl()
    const url = URL.createObjectURL(blob)
    takeUrlRef.current = url
    const interruptedReason = interruptedRef.current

    setTake({
      url,
      durationSeconds,
      mimeType,
      bytes: blob.size,
      interrupted: Boolean(interruptedReason),
      interruptedReason,
    })
    setElapsedSeconds(durationSeconds)
    setNotice(interruptedReason)
    updatePhase('review')
  }, [clearTakeUrl, stopStreamTracks, updatePhase])

  const handleCameraInterrupted = useCallback(() => {
    if (!streamRef.current) return

    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      interruptedRef.current =
        'The camera feed was interrupted during the take. The recording was stopped and may be incomplete.'
      setNotice('Camera interrupted. Review the partial take before keeping the capture summary.')
      updatePhase('stopping')
      try {
        recorder.stop()
      } catch (error) {
        console.error('[camera] could not stop the interrupted recorder:', error)
        failedRef.current = true
        stopStreamTracks()
        updatePhase('error')
        setErrorMessage('The camera was interrupted and the partial take could not be saved.')
      }
      return
    }

    stopStreamTracks()
    updatePhase('error')
    setErrorMessage('The camera feed ended. Reopen the mirror to continue.')
  }, [stopStreamTracks, updatePhase])

  const startCamera = useCallback(async () => {
    setErrorMessage(null)
    setNotice(null)

    if (typeof window === 'undefined') return
    const requestToken = ++cameraRequestRef.current

    if (!window.isSecureContext) {
      updatePhase('unsupported')
      setErrorMessage(
        'Camera access requires a secure connection. Open this app over HTTPS or localhost, then try again.',
      )
      return
    }
    // The DOM types promise mediaDevices, but insecure contexts and older browsers can omit it.
    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined
    if (!mediaDevices) {
      updatePhase('unsupported')
      setErrorMessage(
        'This browser does not expose camera access. Live preview and recording are unavailable here.',
      )
      return
    }

    stopStreamTracks()
    updatePhase('requesting')

    try {
      const stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      })

      if (!mountedRef.current || cameraRequestRef.current !== requestToken) {
        for (const track of stream.getTracks()) track.stop()
        return
      }

      streamRef.current = stream
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('ended', handleCameraInterrupted)
      }

      updatePhase('ready')
      if (typeof MediaRecorder === 'undefined') {
        setNotice(
          'Live preview works, but this browser cannot record video. No capture summary can be saved here.',
        )
      }
    } catch (error) {
      if (!mountedRef.current || cameraRequestRef.current !== requestToken) return
      console.error('[camera] failed to open the live preview:', error)
      stopStreamTracks()
      const failure = describeCameraFailure(error)
      updatePhase(failure.phase)
      setErrorMessage(failure.message)
    }
  }, [handleCameraInterrupted, stopStreamTracks, updatePhase])

  const startRecording = useCallback(() => {
    if (phaseRef.current !== 'ready') return
    if (recorderRef.current) return
    if (typeof MediaRecorder === 'undefined') {
      setErrorMessage('This browser cannot record video. Live preview only.')
      return
    }

    const stream = streamRef.current
    if (!stream) {
      setErrorMessage('The camera feed is not available. Reopen the mirror and try again.')
      return
    }

    clearTakeUrl()
    setTake(null)
    setErrorMessage(null)
    setNotice(null)
    setElapsedSeconds(0)
    chunksRef.current = []
    interruptedRef.current = null
    failedRef.current = false

    const selectedMimeType = MIME_CANDIDATES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    )

    try {
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream)

      recorderRef.current = recorder
      startedAtRef.current = performance.now()

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onerror = (event) => {
        console.error('[camera] MediaRecorder reported an error:', event)
        failedRef.current = true
        stopStreamTracks()
        updatePhase('error')
        setErrorMessage(
          'The browser reported a recording failure. Nothing was saved. Reopen the mirror and try again.',
        )
        setNotice(null)
      }

      recorder.onstop = finalizeRecording

      recorder.start(1000)
      updatePhase('recording')
    } catch (error) {
      console.error('[camera] could not start recording:', error)
      stopStreamTracks()
      updatePhase('error')
      setErrorMessage(
        'Recording could not start. Your camera may be busy or this browser may not support video capture.',
      )
    }
  }, [clearTakeUrl, finalizeRecording, stopStreamTracks, updatePhase])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    updatePhase('stopping')
    try {
      recorder.stop()
    } catch (error) {
      console.error('[camera] could not stop recording cleanly:', error)
      failedRef.current = true
      stopStreamTracks()
      updatePhase('error')
      setErrorMessage('The recording could not be stopped cleanly. Nothing was saved.')
    }
  }, [stopStreamTracks, updatePhase])

  const discardTake = useCallback(() => {
    clearTakeUrl()
    setTake(null)
    setElapsedSeconds(0)
    setNotice(null)
    setErrorMessage(null)
    updatePhase('idle')
  }, [clearTakeUrl, updatePhase])

  const closeMirror = useCallback(() => {
    cameraRequestRef.current += 1
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch (error) {
        console.error('[camera] could not stop the recorder while closing the mirror:', error)
      }
    }
    recorderRef.current = null
    failedRef.current = true
    stopStreamTracks()
    clearTakeUrl()
    setTake(null)
    setElapsedSeconds(0)
    setErrorMessage(null)
    setNotice(null)
    updatePhase('idle')
  }, [clearTakeUrl, stopStreamTracks, updatePhase])

  const downloadTake = useCallback(
    (fileNameBase: string) => {
      if (!take) return
      const extension = take.mimeType.includes('mp4') ? 'mp4' : 'webm'
      const link = document.createElement('a')
      link.href = take.url
      link.download = `${fileNameBase}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
    [take],
  )

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return

      const recorder = recorderRef.current
      if (recorder && recorder.state === 'recording') {
        interruptedRef.current =
          'The page was hidden while recording, which can happen during an app switch or phone call. The take was stopped and may be incomplete.'
        setNotice(
          'The page was hidden during the take. It was stopped to protect the stream; review the partial capture.',
        )
        updatePhase('stopping')
        try {
          recorder.stop()
        } catch (error) {
          console.error('[camera] could not stop the recorder after the page was hidden:', error)
          failedRef.current = true
          stopStreamTracks()
          updatePhase('error')
          setErrorMessage('The page was hidden and the partial take could not be saved.')
        }
        return
      }

      if (streamRef.current) {
        stopStreamTracks()
        updatePhase('idle')
        setNotice('The mirror closed when this page was hidden. Open it again to continue.')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [stopStreamTracks, updatePhase])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (error) {
          console.error('[camera] failed to stop recorder during cleanup:', error)
        }
      }
      recorderRef.current = null
      stopStreamTracks()
      if (takeUrlRef.current) {
        URL.revokeObjectURL(takeUrlRef.current)
        takeUrlRef.current = null
      }
    }
  }, [stopStreamTracks])

  return {
    videoRef,
    phase,
    errorMessage,
    notice,
    elapsedSeconds,
    elapsedLabel: formatClock(elapsedSeconds),
    take,
    recordingSupported,
    livePreview: phase === 'ready' || phase === 'recording',
    startCamera,
    startRecording,
    stopRecording,
    discardTake,
    closeMirror,
    downloadTake,
  }
}

function describeCameraFailure(error: unknown): CameraFailure {
  const name = error instanceof DOMException ? error.name : ''

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        phase: 'denied',
        message:
          'Camera access was denied. Allow camera permission for this site in your browser settings, then try again. No recording was made.',
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        phase: 'error',
        message: 'No camera was found on this device. Connect a camera and try again.',
      }
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        phase: 'error',
        message:
          'The camera is already in use or could not be read. Close other camera apps and try again.',
      }
    case 'OverconstrainedError':
      return {
        phase: 'error',
        message:
          'The camera could not match the requested video settings. Try again or use another browser.',
      }
    case 'SecurityError':
      return {
        phase: 'unsupported',
        message:
          'The browser blocked camera access. Camera capture requires HTTPS or localhost, and permission must be allowed for this site.',
      }
    case 'NotSupportedError':
      return {
        phase: 'unsupported',
        message: 'This browser does not support camera capture.',
      }
    case 'AbortError':
      return {
        phase: 'error',
        message: 'Camera access was interrupted before it could start. Try again.',
      }
    default:
      return {
        phase: 'error',
        message:
          'The camera could not start. Check browser permissions and device privacy settings, then try again. No recording was made.',
      }
  }
}
