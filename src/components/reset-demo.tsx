import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useCommitment } from '#/lib/commitment-store'
import { Button } from '#/components/ui/button'

export function ResetDemo({ compact = false }: { compact?: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const { resetDemo } = useCommitment()
  const navigate = useNavigate()

  if (!confirming) {
    return (
      <div className={compact ? '' : 'border border-line bg-panel/40 p-5'}>
        {compact ? null : (
          <>
            <p className="eyebrow">Prototype controls</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Erase the local demo plan, ledger and capture summaries. Video takes are not stored
              after you leave the recording screen.
            </p>
          </>
        )}
        <Button
          variant="danger"
          size={compact ? 'sm' : 'md'}
          className={compact ? '' : 'mt-4'}
          onClick={() => setConfirming(true)}
        >
          Reset demo
        </Button>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={compact ? 'space-y-3' : 'space-y-4 border border-rust/40 bg-rust/[0.055] p-5'}
    >
      <div>
        <p className="eyebrow text-rust">Reset demo</p>
        <p className="mt-2 text-sm leading-relaxed text-bone">
          Erase this commitment, its demo ledger and all capture summaries from this browser?
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirming(false)}>
          Keep demo
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            resetDemo()
            navigate({ to: '/setup', replace: true })
          }}
        >
          Erase demo
        </Button>
      </div>
    </div>
  )
}
