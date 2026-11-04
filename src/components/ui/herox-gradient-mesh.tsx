"use client";

import {
  useState,
  useRef,
  useId,
  type KeyboardEvent,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

/**
 * Hero with an animated gradient mesh on a blue background (brand blue #157EC2 / deep #0E5E94).
 * Copy, stats and tabs are placeholder content from the original component: replace before use.
 */

type FeatureTab = {
  id: string;
  label: string;
  headline: string;
  metric: string;
  metricLabel: string;
  points: string[];
  bars: number[];
};

const TABS: FeatureTab[] = [
  {
    id: "automate",
    label: "Automate",
    headline: "Automate the busywork",
    metric: "8.5 hrs",
    metricLabel: "saved per teammate every week",
    points: [
      "Turn repeatable steps into workflows that run on their own",
      "Trigger on any event across the tools you already use",
      "Approvals, retries and rollbacks handled for you",
    ],
    bars: [42, 58, 51, 73, 66, 88, 79],
  },
  {
    id: "analyze",
    label: "Analyze",
    headline: "See every workflow live",
    metric: "312 ms",
    metricLabel: "median run time across pipelines",
    points: [
      "A real-time map of every run, queue and dependency",
      "Alerts the moment a workflow slows or drifts off target",
      "Drill from a single failed step to its exact input",
    ],
    bars: [30, 44, 40, 55, 62, 58, 71],
  },
  {
    id: "scale",
    label: "Scale",
    headline: "Scale without new headcount",
    metric: "6×",
    metricLabel: "throughput per engineer, on average",
    points: [
      "Run thousands of concurrent workflows on shared infra",
      "Cost controls and budgets enforced before anything ships",
      "Grow from one team to the whole org on the same setup",
    ],
    bars: [48, 52, 64, 60, 78, 84, 95],
  },
];

const STATS: { value: string; label: string }[] = [
  { value: "12k+", label: "teams onboard" },
  { value: "40M", label: "workflows / month" },
  { value: "99.99%", label: "uptime SLA" },
];

// Blue mesh: brand blue, sky and cyan blobs, with a touch of the brand orange.
const BLOBS: {
  className: string;
  anim: string;
  duration: string;
  delay: string;
}[] = [
  {
    className: "left-[-12%] top-[-14%] h-[46rem] w-[46rem] bg-[#157EC2]/70",
    anim: "heroxmesh-drift-1",
    duration: "22s",
    delay: "0s",
  },
  {
    className: "right-[-14%] top-[-8%] h-[40rem] w-[40rem] bg-blue-500/50",
    anim: "heroxmesh-drift-2",
    duration: "26s",
    delay: "-6s",
  },
  {
    className: "left-[22%] bottom-[-24%] h-[44rem] w-[44rem] bg-sky-400/45",
    anim: "heroxmesh-drift-3",
    duration: "30s",
    delay: "-3s",
  },
  {
    className: "right-[6%] bottom-[-18%] h-[34rem] w-[34rem] bg-cyan-400/35",
    anim: "heroxmesh-drift-1",
    duration: "28s",
    delay: "-11s",
  },
  {
    className: "left-[40%] top-[8%] h-[30rem] w-[30rem] bg-[#F28C28]/20",
    anim: "heroxmesh-drift-2",
    duration: "24s",
    delay: "-14s",
  },
];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const Arrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function HeroxGradientMesh() {
  const reduce = useReducedMotion();
  const uid = useId();
  const [active, setActive] = useState<number>(0);
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTab = TABS[active];

  function focusTab(index: number) {
    const next = (index + TABS.length) % TABS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  function onEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    if (status !== "idle") setStatus("idle");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section className="relative isolate w-full overflow-hidden bg-brand-deep px-5 py-24 text-white sm:px-8 sm:py-28 lg:py-36">
      <style>{`
        @keyframes heroxmesh-drift-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(7%, -9%, 0) scale(1.16); }
          66% { transform: translate3d(-6%, 7%, 0) scale(0.9); }
        }
        @keyframes heroxmesh-drift-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); }
          40% { transform: translate3d(-9%, 8%, 0) scale(0.88); }
          75% { transform: translate3d(6%, -5%, 0) scale(1.2); }
        }
        @keyframes heroxmesh-drift-3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.95); }
          50% { transform: translate3d(9%, -7%, 0) scale(1.18); }
        }
        @keyframes heroxmesh-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes heroxmesh-rise {
          from { transform: scaleY(0.35); opacity: 0.35; }
          to { transform: scaleY(1); opacity: 1; }
        }
        .heroxmesh-blob { animation: var(--heroxmesh-anim) var(--heroxmesh-dur) ease-in-out infinite; animation-delay: var(--heroxmesh-delay); will-change: transform; }
        .heroxmesh-card { animation: heroxmesh-float 7s ease-in-out infinite; }
        .heroxmesh-bar { transform-origin: bottom; animation: heroxmesh-rise 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .heroxmesh-blob, .heroxmesh-card, .heroxmesh-bar { animation: none !important; }
        }
      `}</style>

      {/* Animated mesh gradient */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {BLOBS.map((blob, i) => (
          <div
            key={i}
            className={`heroxmesh-blob absolute rounded-full mix-blend-screen blur-3xl ${blob.className}`}
            style={
              {
                "--heroxmesh-anim": blob.anim,
                "--heroxmesh-dur": blob.duration,
                "--heroxmesh-delay": blob.delay,
              } as Record<string, string>
            }
          />
        ))}
        {/* Fine grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Readability wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-deep/40 via-transparent to-brand-deep/70" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Left: copy + CTA */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <a
            href="#changelog"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur transition-colors hover:border-[#F28C28]/70 hover:text-white"
          >
            <span className="inline-flex h-4 items-center rounded-full bg-[#F28C28] px-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
              New
            </span>
            Nimbus Agents are now generally available
            <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ship operations that
            <span className="relative whitespace-nowrap">
              {" "}
              <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-white bg-clip-text text-transparent">
                run themselves
              </span>
            </span>
            .
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Nimbus connects your stack, watches every workflow, and clears the
            busywork before it ever reaches a person. Set it up once and let the
            platform handle the rest.
          </p>

          {/* Email capture */}
          <form onSubmit={onSubmit} noValidate className="mt-8 max-w-md">
            <label htmlFor={`${uid}-email`} className="sr-only">
              Work email
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-white/50">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id={`${uid}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={onEmailChange}
                  placeholder="you@company.com"
                  aria-invalid={status === "error"}
                  aria-describedby={`${uid}-status`}
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-3.5 text-sm text-white outline-none backdrop-blur transition placeholder:text-white/45 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/40"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F28C28] px-5 py-3 text-sm font-semibold text-brand-deep transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 active:scale-[0.98]"
              >
                Start free
                <Arrow className="h-4 w-4" />
              </button>
            </div>
            <p
              id={`${uid}-status`}
              aria-live="polite"
              className={`mt-2.5 min-h-[1.25rem] text-sm ${
                status === "error" ? "text-rose-300" : status === "done" ? "text-emerald-300" : "text-white/60"
              }`}
            >
              {status === "error"
                ? "Enter a valid work email to continue."
                : status === "done"
                  ? "You're on the list — check your inbox to activate."
                  : "No credit card · SOC 2 Type II · 14-day trial"}
            </p>
          </form>

          {/* Stats */}
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="order-2 text-sm text-white/60">{stat.label}</dt>
                <dd className="order-1 text-2xl font-semibold tracking-tight text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        {/* Right: interactive preview card */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="relative"
        >
          <div className="heroxmesh-card rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
            {/* Window chrome */}
            <div className="mb-5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-medium text-white/50">nimbus · live workspace</span>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Product capabilities" className="flex gap-1 rounded-xl bg-brand-deep/40 p-1">
              {TABS.map((tab, i) => {
                const selected = i === active;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`${uid}-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`${uid}-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                    className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                      selected ? "text-brand-deep" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId={`${uid}-tabpill`}
                        className="absolute inset-0 rounded-lg bg-white shadow-sm"
                        transition={{ duration: reduce ? 0 : 0.3, ease }}
                      />
                    )}
                    <span className="relative">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Panel */}
            <div role="tabpanel" id={`${uid}-panel-${activeTab.id}`} aria-labelledby={`${uid}-tab-${activeTab.id}`} className="mt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold text-white">{activeTab.headline}</h2>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                          {activeTab.metric}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/60">{activeTab.metricLabel}</p>
                    </div>

                    {/* Mini bar chart */}
                    <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
                      {activeTab.bars.map((h, bi) => (
                        <div
                          key={bi}
                          className="heroxmesh-bar w-3 rounded-t bg-gradient-to-t from-[#157EC2] to-sky-300"
                          style={{ height: `${h}%`, animationDelay: reduce ? "0s" : `${bi * 60}ms` }}
                        />
                      ))}
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {activeTab.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-white/80">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer action */}
            <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4">
              <span className="text-xs text-white/50">Updated moments ago</span>
              <a href="#demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 transition hover:text-white">
                Book a demo
                <Arrow className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-white/15 bg-brand-deep/80 px-4 py-3 shadow-lg backdrop-blur-xl sm:block">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">All systems operational</p>
                <p className="text-xs text-white/60">1,284 workflows running now</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
