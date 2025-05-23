"use client"

import type React from "react"

// Types for trace and span
interface SpanType {
  span_id: string
  name: string
  duration: number
  start_time: number
  end_time: number
  type?: string
  [key: string]: any
}

interface TraceType {
  id: string
  name?: string
  spans: SpanType[]
  [key: string]: any
}

interface SessionGanttChartProps {
  traces: TraceType[]
  selectedTraceId: string | null
  selectedSpanId: string | null
  onSelectTrace: (traceId: string) => void
  onSelectSpan: (spanId: string, traceId: string) => void
}

/**
 * Session-level Gantt chart (traces + spans)
 * – Each trace bar is sized & positioned relative to the *full session* timeline
 * – All traces are shown / expanded at once for quick scanning
 * – Trace bars are colour-coded by index to aid visual grouping now that labels are gone
 * – Prop API is unchanged and still supports selecting traces / spans
 */
export const SessionGanttChart: React.FC<SessionGanttChartProps> = ({
  traces,
  selectedTraceId,
  selectedSpanId,
  onSelectTrace,
  onSelectSpan,
}) => {
  /* ------------------------------------------------------------------ */
  /*                           DERIVED METRICS                          */
  /* ------------------------------------------------------------------ */
  const allSpans = traces.flatMap((t) => t.spans)
  if (allSpans.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-400">
        No timeline data available
      </div>
    )
  }

  const sessionStart = Math.min(...allSpans.map((s) => s.start_time))
  const sessionEnd = Math.max(...allSpans.map((s) => s.end_time))
  const sessionDuration = sessionEnd - sessionStart || 1

  /* ------------------------------------------------------------------ */
  /*                               UTILS                                */
  /* ------------------------------------------------------------------ */
  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

  const formatDuration = (s: number) => {
    if (s < 1) return `${Math.round(s * 1000)}ms`
    if (s < 60) return `${s.toFixed(2)}s`
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}m ${sec}s`
  }

  // span-type colours - improved for dark background
  const spanColour = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "agent":
        return "bg-blue-400" // Softer blue
      case "llm":
        return "bg-emerald-400" // Better contrast than cyan
      case "tool":
        return "bg-amber-400" // Warmer yellow
      case "operation":
        return "bg-green-400"
      case "error":
        return "bg-red-400" // Softer red
      default:
        return "bg-indigo-400" // Better than purple
    }
  }

  // trace-level colours - more subtle and harmonious palette
  const tracePalette = [
    "bg-slate-500/40",     // Neutral gray-blue
    "bg-blue-500/35",      // Soft blue
    "bg-emerald-500/35",   // Soft green
    "bg-orange-500/35",    // Warm orange instead of amber
    "bg-indigo-500/35",    // Deep purple-blue
    "bg-teal-500/35",      // Teal for variety
    "bg-violet-500/35",    // Muted violet
    "bg-cyan-500/35",      // Soft cyan
  ]

  /* ------------------------------------------------------------------ */
  /*                               RENDER                               */
  /* ------------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col overflow-auto bg-zinc-950 rounded-lg border border-zinc-800">
      {/* ───────────────────────── Full-Session Overview ───────────────────────── */}
      <div className="p-4 border-b border-zinc-800">
        <div className="text-sm font-medium mb-3 text-white">Full Session</div>
        <div className="relative h-8 sm:h-9 w-full bg-zinc-900 rounded-md">
          {/* background */}
          <div className="absolute inset-0 rounded-md bg-zinc-800" />

          {/* time labels */}
          <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] sm:text-xs text-zinc-400">
            <span>{formatTime(sessionStart)}</span>
            <span>{formatTime(sessionEnd)}</span>
          </div>

          {/* mini trace blocks */}
          {traces.map((trace, idx) => {
            if (!trace.spans?.length) return null
            const tStart = Math.min(...trace.spans.map((s) => s.start_time))
            const tEnd = Math.max(...trace.spans.map((s) => s.end_time))
            const left = ((tStart - sessionStart) / sessionDuration) * 100
            const width = ((tEnd - tStart) / sessionDuration) * 100
            return (
              <div
                key={trace.id}
                className={`absolute h-full rounded-sm ${tracePalette[idx % tracePalette.length]} border-l border-l-white/20`}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }}
              />
            )
          })}
        </div>
      </div>

      {/* Legend - updated colors */}
      <div className="flex gap-5 px-4 py-2 border-b border-zinc-800 overflow-x-auto text-[11px] sm:text-xs text-zinc-300">
        {(
          [
            ["bg-blue-400", "Agent"],
            ["bg-emerald-400", "LLM"],
            ["bg-amber-400", "Tool"],
            ["bg-green-400", "Operation"],
            ["bg-red-400", "Error"],
            ["bg-indigo-400", "Other"],
          ] as const
        ).map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${cls}`} /> {label}
          </div>
        ))}
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[11px] sm:text-xs text-zinc-400 px-4 pt-3 pb-1">
        <span>{formatTime(sessionStart)}</span>
        <span>{formatDuration(sessionDuration)}</span>
        <span>{formatTime(sessionEnd)}</span>
      </div>

      {/* Traces */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 sm:space-y-5">
        {traces.map((trace, idx) => {
          if (!trace.spans?.length) return null

          const tStart = Math.min(...trace.spans.map((s) => s.start_time))
          const tEnd = Math.max(...trace.spans.map((s) => s.end_time))
          const tDuration = tEnd - tStart || 1
          const left = ((tStart - sessionStart) / sessionDuration) * 100
          const width = ((tDuration) / sessionDuration) * 100
          const isSelectedTrace = selectedTraceId === trace.id
          const colour = tracePalette[idx % tracePalette.length]

          return (
            <div key={trace.id} className="space-y-0.5">
              {/* trace bar */}
              <div
                title={`Trace ${idx + 1} - Duration: ${formatDuration(tDuration)}`}
                className={`relative h-6 sm:h-7 w-full bg-zinc-900 rounded-md overflow-hidden cursor-pointer transition-colors ${
                  isSelectedTrace ? "ring-2 ring-blue-400" : "hover:bg-zinc-800"}`}
                onClick={() => onSelectTrace(trace.id)}
              >
                <div
                  className={`absolute inset-y-0 rounded-md ${colour} border-l-2 border-l-white/30`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }}
                />
                {/* Trace number indicator */}
                <div 
                  className="absolute inset-y-0 flex items-center px-2 text-white/80 font-medium text-xs"
                  style={{ left: `${left}%` }}
                >
                  {width > 8 && `T${idx + 1}`}
                </div>
              </div>

              {/* spans */}
              <div className="pl-3 space-y-0.5">
                {trace.spans.map((span) => {
                  const spanLeft = ((span.start_time - tStart) / tDuration) * 100
                  const spanWidth = ((span.end_time - span.start_time) / tDuration) * 100
                  const isSelectedSpan = selectedSpanId === span.span_id
                  return (
                    <div key={span.span_id} className="relative h-4 sm:h-5 w-full bg-zinc-900/50 rounded-sm overflow-hidden">
                      <div
                        title={`${span.name}: ${formatDuration(span.end_time - span.start_time)}`}
                        className={`absolute top-0 h-full rounded-sm cursor-pointer transition-all duration-75 ${
                          spanColour(span.type)} ${
                          isSelectedSpan ? "ring-1 ring-white shadow-lg" : "hover:brightness-110 hover:shadow-md"}`}
                        style={{
                          left: `${spanLeft}%`,
                          width: `${Math.max(spanWidth, 0.5)}%`,
                          minWidth: "2px",
                        }}
                        onClick={() => onSelectSpan(span.span_id, trace.id)}
                      >
                        {spanWidth > 7 && (
                          <div className="h-full flex items-center px-1.5">
                            <span className="text-[10px] sm:text-[11px] text-white font-medium truncate drop-shadow-sm">
                              {span.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SessionGanttChart