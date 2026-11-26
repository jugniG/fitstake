export function HonestQuestions() {
  return (
    <section
      id="in-short"
      className="border-t border-[#0d1b2a14] bg-gradient-to-b from-[#eef3fb]/60 via-[#faf8f5] to-[#faf8f5] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-5">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
                In short · Two quick questions
              </p>
              <h2 className="mt-3 text-lg font-extrabold text-[#5a6678] sm:text-xl">
                Before reading the rest, give yourself two honest answers:
              </h2>
            </div>

            <ul role="list" className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              <li className="flex min-w-0 items-start gap-4 rounded-2xl border border-[#0d1b2a14] bg-white px-5 py-4 shadow-xs sm:items-center sm:px-7 sm:py-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b66f2] font-mono text-xs font-bold text-white shadow-xs">
                  01
                </span>
                <p className="min-w-0 text-lg font-bold leading-snug tracking-tight text-[#0d1b2a] sm:text-2xl">
                  Do you believe daily physical movement is essential to your long-term health?
                </p>
              </li>

              <li className="flex min-w-0 items-start gap-4 rounded-2xl border border-[#0d1b2a14] bg-white px-5 py-4 shadow-xs sm:items-center sm:px-7 sm:py-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b66f2] font-mono text-xs font-bold text-white shadow-xs">
                  02
                </span>
                <p className="min-w-0 text-lg font-bold leading-snug tracking-tight text-[#0d1b2a] sm:text-2xl">
                  Do you believe 15–20 minutes of bodyweight movement a day is completely doable?
                </p>
              </li>
            </ul>
          </div>

          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-[#0d1b2a14] bg-white p-7 shadow-sm sm:p-10">
            <div className="flex flex-col gap-4">
              <span className="inline-block w-fit rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#2b66f2] uppercase">
                If your answer is yes
              </span>

              <h3 className="text-2xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-4xl">
                Let me tell you —{' '}
                <span className="serif text-[#2b66f2]">you still don’t do it.</span>
              </h3>

              <div className="space-y-3 text-base leading-relaxed text-[#5a6678]">
                <p>
                  You bought the gym membership. You bookmarked workout videos. You told yourself
                  &ldquo;I’ll start Monday morning.&rdquo;
                </p>
                <p>
                  Then 7:30 PM rolls around. You’re mentally drained from work. Your bed looks
                  comfortable. Because there is zero immediate consequence to skipping, free
                  motivation evaporates in 5 seconds.
                </p>
                <p className="font-semibold text-[#0d1b2a]">
                  Willpower is an unreliable plan. Immediate financial consequence is an unbeatable
                  one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
