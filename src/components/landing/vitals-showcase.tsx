import { Activity, Heart, Shield, Cpu, Sparkles, CheckCircle2 } from 'lucide-react'

export function VitalsShowcase() {
  return (
    <section
      id="biometrics"
      className="scroll-mt-20 py-20 sm:py-28 border-t border-line/40 bg-pitch/50"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rust/40 bg-rust/10 px-3 py-1 font-mono text-xs text-rust">
                <Sparkles className="h-3.5 w-3.5" />
                <span>DEV Challenge · Presage SmartSpectra™ Integration</span>
              </div>
              <h2 className="mt-4 font-display text-3xl font-medium text-bone sm:text-5xl">
                Contactless Vitals & Living Proof of Effort
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-muted sm:text-base">
              Standard fitness apps ask you to pinky-promise that you worked out. Habit-Stakes uses
              Presage SmartSpectra™ optical sensing to extract physiological vitals directly from
              your facial micro-luminance modulation (rPPG)—no wearables or chest straps required.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-rust">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-bone">10-Second Readiness Scan</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Before each session, a baseline scan measures resting pulse (BPM), breathing
                    rate, and HRV to calibrate your cardiovascular profile.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-rose-400">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-bone">
                    Cardiovascular Exertion Tracking
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    As you execute reps, your pulse is tracked through real physiological exertion
                    zones (Resting → Warm-up → Aerobic → Peak).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-emerald-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-bone">
                    Heart Rate Recovery (HRR) Verification
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    During structured rest breaks between sets, the system measures your heart rate
                    recovery drop. Proves biological exertion and defeats screen loops or
                    pre-recorded spoofing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Simulation HUD */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-line/80 bg-void p-6 shadow-2xl backdrop-blur-md">
              {/* Fake Camera Feed Frame */}
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-line/60 bg-panel/80 flex flex-col justify-between p-5">
                {/* Top HUD */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 font-mono text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-bone font-medium">LIVE VISION HUD</span>
                  </div>

                  {/* SmartSpectra Pill */}
                  <div className="flex items-center gap-2 rounded bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 font-mono text-xs">
                    <span className="text-rose-400 animate-bounce">❤️</span>
                    <span className="font-bold text-bone">134 BPM</span>
                    <span className="rounded bg-rust/30 px-1.5 py-0.5 text-[0.6rem] text-rust font-semibold uppercase">
                      Aerobic
                    </span>
                  </div>
                </div>

                {/* Simulated Wireframe Skeleton Joint Visualization */}
                <div className="relative my-auto flex items-center justify-center py-6 text-center">
                  <div className="relative inline-block border border-dashed border-emerald-400/40 rounded-xl p-6 bg-emerald-500/5">
                    <p className="font-mono text-xs text-emerald-400">
                      ✓ Kinematic Depth Verified: Knee Angle 98°
                    </p>
                    <p className="mt-1 font-mono text-[0.7rem] text-muted">
                      Hips Descended: Thigh-to-Shin Ratio 0.28 (Parallel Squat)
                    </p>
                  </div>
                </div>

                {/* Bottom HUD */}
                <div className="flex items-center justify-between rounded bg-black/60 px-4 py-2 backdrop-blur-md border border-white/10">
                  <div className="font-mono text-xs text-bone">
                    <span className="text-muted">SET:</span> 2/3 ·{' '}
                    <span className="text-muted">REP:</span>{' '}
                    <span className="text-emerald-400 font-bold">11/15</span>
                  </div>
                  <div className="font-mono text-xs text-bone">
                    <span className="text-muted">LIVENESS:</span> 99.4%
                  </div>
                </div>
              </div>

              {/* Security & Privacy Badges Underneath */}
              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-line/40 bg-panel/40 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-bone">
                    <Shield className="h-3.5 w-3.5 text-rust" /> 100% On-Device
                  </div>
                  <p className="mt-1 text-[0.65rem] text-muted leading-relaxed">
                    MediaPipe & SmartSpectra run in local WebAssembly. Video never touches any
                    server.
                  </p>
                </div>
                <div className="rounded-lg border border-line/40 bg-panel/40 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-bone">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Tamper Proof
                  </div>
                  <p className="mt-1 text-[0.65rem] text-muted leading-relaxed">
                    Physiological exertion metrics are cryptographically verified before day
                    settlement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
