export type CameraFailure = {
  phase: 'denied' | 'unsupported' | 'error'
  message: string
}

export function cameraSupportFailure(): CameraFailure | null {
  if (typeof window === 'undefined') return null
  if (!window.isSecureContext) {
    return {
      phase: 'unsupported',
      message:
        'Camera access requires a secure connection. Open this app over HTTPS or localhost, then try again.',
    }
  }
  // The DOM types promise mediaDevices, but insecure contexts and older browsers can omit it.
  const mediaDevices = navigator.mediaDevices as MediaDevices | undefined
  if (!mediaDevices?.getUserMedia) {
    return {
      phase: 'unsupported',
      message: 'This browser does not expose camera access. Try a current version of Chrome, Edge or Safari.',
    }
  }
  return null
}

export function describeCameraFailure(error: unknown): CameraFailure {
  const name = error instanceof DOMException ? error.name : ''

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        phase: 'denied',
        message:
          'Camera access was denied. Allow camera permission for this site in your browser settings, then try again.',
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
        message: 'The camera is already in use or could not be read. Close other camera apps and try again.',
      }
    case 'OverconstrainedError':
      return {
        phase: 'error',
        message: 'The camera could not match the requested video settings. Try again or use another browser.',
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
          'The camera could not start. Check browser permissions and device privacy settings, then try again.',
      }
  }
}
