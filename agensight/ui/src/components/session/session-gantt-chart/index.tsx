"use client"

import type React from "react"

import { useRef, useState, useEffect, useMemo } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
  started_at?: number
  [key: string]: any
}

interface SessionGanttChartProps {
  traces: TraceType[]
  selectedTraceId: string | null
  selectedSpanId: string | null
  onSelectTrace: (traceId: string) => void
  onSelectSpan: (spanId: string, traceId: string) => void
}

export const SessionGanttChart = ({
  traces,
  selectedTraceId,
  selectedSpanId,
  onSelectTrace,
  onSelectSpan,
}: SessionGanttChartProps) => {
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [showGradient, setShowGradient] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const { scrollWidth, clientWidth } = container;
      const overflowing = scrollWidth > clientWidth + 2; // fudge factor
      setShowScrollBadge(overflowing);
      setShowGradient(overflowing);
    };
    checkScroll();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
    }
    window.addEventListener('resize', checkScroll);
    return () => {
      if (container) container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  // Memoize sorted traces to prevent recalculation on every render
  const sortedTraces = useMemo(() => {
    return [...traces].sort((a, b) => {
      const aStart = a.started_at || Math.min(...(a.spans.length ? a.spans.map((s) => s.start_time) : [0]))
      const bStart = b.started_at || Math.min(...(b.spans.length ? b.spans.map((s) => s.start_time) : [0]))
      return aStart - bStart
    })
  }, [traces])

  // Memoize all spans to prevent recalculation
  const allSpans = useMemo(() => sortedTraces.flatMap((t) => t.spans), [sortedTraces])

  // Initialize all traces as expanded only when traces change
  useEffect(() => {
    if (traces.length > 0) {
      const initialExpandState = traces.reduce(
        (acc, trace) => {
          acc[trace.id] = true
          return acc
        },
        {} as Record<string, boolean>,
      )
      setExpandedTraces(initialExpandState)
    }
  }, [traces]) // Only depend on the original traces prop, not the derived sortedTraces

  // Early return if no spans
  if (allSpans.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-400">No timeline data available</div>
    )
  }

  // Calculate session timeline
  const sessionStart = Math.min(...allSpans.map((s) => s.start_time))
  const sessionEnd = Math.max(...allSpans.map((s) => s.end_time))
  const sessionDuration = sessionEnd - sessionStart || 1

  // Format time and duration
  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

  const formatDuration = (s: number) => {
    if (s < 1) return `${Math.round(s * 1000)}ms`
    if (s < 60) return `${s.toFixed(2)}s`
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}m ${sec}s`
  }

  // Get color for span type
  const getSpanColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "agent":
        return "#3b82f6" // Blue
      case "llm":
        return "#38bdf8" // Light blue
      case "tool":
        return "#facc15" // Yellow
      case "task":
        return "#4ade80" // Green
      case "operation":
        return "#4ade80" // Green
      case "error":
        return "#ef4444" // Red
      case "session":
        return "#ffffff" // White
      default:
        return "#a78bfa" // Purple
    }
  }

  // Get background color for span type (lighter version)
  const getSpanBackgroundColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "agent":
        return "rgba(59, 130, 246, 0.2)" // Blue
      case "llm":
        return "rgba(56, 189, 248, 0.2)" // Light blue
      case "tool":
        return "rgba(250, 204, 21, 0.2)" // Yellow
      case "task":
        return "rgba(74, 222, 128, 0.2)" // Green
      case "operation":
        return "rgba(74, 222, 128, 0.2)" // Green
      case "error":
        return "rgba(239, 68, 68, 0.2)" // Red
      case "session":
        return "rgba(255, 255, 255, 0.2)" // White
      default:
        return "rgba(167, 139, 250, 0.2)" // Purple
    }
  }

  // Toggle trace expansion
  const toggleTraceExpansion = (traceId: string) => {
    setExpandedTraces((prev) => ({
      ...prev,
      [traceId]: !prev[traceId],
    }))
  }

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = []
    const totalDuration = sessionEnd - sessionStart
    const numMarkers = 5 // Number of markers to display

    for (let i = 0; i <= numMarkers; i++) {
      const position = i / numMarkers
      const time = sessionStart + totalDuration * position

      markers.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-slate-700 border-dashed"
          style={{ left: `${position * 100}%` }}
        >
          <div className="text-xs text-slate-500 absolute -top-6 -translate-x-1/2">{formatTime(time)}</div>
        </div>
      )
    }

    return markers
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Legend */}
      <div className="flex gap-4 px-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSpanColor("agent") }}></div>
          <span className="text-xs">Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSpanColor("llm") }}></div>
          <span className="text-xs">Llm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSpanColor("tool") }}></div>
          <span className="text-xs">Tool</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSpanColor("task") }}></div>
          <span className="text-xs">Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSpanColor("session") }}></div>
          <span className="text-xs">Session</span>
        </div>
      </div>

      {/* Session bar */}
      <div className="px-4 py-2">
        <div className="flex items-center mb-1">
          <span className="text-xs font-medium">
            session: {formatDuration(sessionDuration)}
          </span>
        </div>
        <div className="relative h-8 w-full rounded border border-slate-700 bg-slate-900 mb-4">
          <div
            className="absolute inset-0 rounded"
            style={{
              backgroundColor: getSpanBackgroundColor("session"),
              borderLeft: `2px solid ${getSpanColor("session")}`,
            }}
          ></div>
        </div>
      </div>

      {/* Main timeline container */}
      <div className="gantt-chart-scroll w-full overflow-x-auto relative" ref={containerRef}>
        <div className="gantt-chart-content min-w-full" style={{ minWidth: '1100px', position: 'relative' }}>
          {/* Scroll gradient indicator */}
          {showGradient && (
            <div className="pointer-events-none absolute top-0 right-0 h-full w-10 z-20" style={{ background: 'linear-gradient(to left, rgba(16,23,42,0.35) 55%, transparent 100%)' }} />
          )}
          {/* Scroll badge top left */}
          {/* {showScrollBadge && (
            <div id="scroll-badge" className="pointer-events-none absolute top-2 left-2 z-40 flex items-center px-2 py-0.5 rounded bg-slate-800/90 text-xs text-slate-300 shadow select-none" style={{fontSize: '11px'}}>
              <span>⇄ scroll</span>
            </div>
          )} */}

          {/* Time markers */}
          <div className="relative h-full min-h-[500px]">
            {generateTimeMarkers()}

            {/* Traces and spans */}
            <div className="relative z-10">
              {sortedTraces.map((trace, traceIndex) => {
                if (!trace.spans?.length) return null

                const traceStart = Math.min(...trace.spans.map((s) => s.start_time))
                const traceEnd = Math.max(...trace.spans.map((s) => s.end_time))
                const traceDuration = traceEnd - traceStart
                const isExpanded = expandedTraces[trace.id] || false
                const isSelected = trace.id === selectedTraceId

                // Calculate position relative to session timeline
                const traceLeftPos = ((traceStart - sessionStart) / sessionDuration) * 100
                const traceWidthPos = ((traceEnd - traceStart) / sessionDuration) * 100;
                const traceName = trace.name || `Trace ${traceIndex + 1}`;

              return (
                <div key={trace.id} className="mb-6">
                  {/* Trace row */}
                  <div
                    className={`flex items-center mb-2 cursor-pointer ${isSelected ? "text-white" : "text-slate-300"}`}
                    onClick={() => onSelectTrace(trace.id)}
                    onDoubleClick={() => toggleTraceExpansion(trace.id)}
                  >
                    <button
                      className="mr-2 text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTraceExpansion(trace.id)
                      }}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="text-xs font-medium">{traceName}</div>
                  </div>
                  {/* Trace timeline bar and span row in a relative container */}
                  {/* Trace timeline bar and span row in a relative container with dynamic height */}
                  <div
                    className="relative w-full mb-2"
                    style={{
                      height: isExpanded ? `calc(40px + ${Math.max(trace.spans.length, 1) * 28}px)` : '40px',
                    }}
                  >
                    {/* Trace bar */}
                    <div
                      className={`absolute h-8 rounded gantt-span-box ${isSelected ? "ring-1 ring-white" : ""}`}
                      style={{
                        left: `${traceLeftPos}%`,
                        width: `${Math.max(traceWidthPos, 0.5)}%`,
                        minWidth: '100px',
                        backgroundColor: getSpanBackgroundColor("agent"),
                        borderLeft: `2px solid ${getSpanColor("agent")}`,
                        top: 0,
                      }}
                      onClick={() => onSelectTrace(trace.id)}
                    >
                      {traceWidthPos > 5 && (
                        <div className="absolute inset-0 flex items-center px-2 cursor-pointer">
                          <span className="text-xs text-white truncate">{traceName}: {formatDuration(trace.spans.length > 0 ? trace.spans[trace.spans.length - 1].end_time - trace.spans[0].start_time : 0)}</span>
                        </div>
                      )}
                    </div>
                    {/* Span row absolutely positioned under the trace bar */}
                    {isExpanded && (
                      <div
                        className="flex flex-col gap-1 mb-2"
                        style={{
                          position: 'absolute',
                          left: `${traceLeftPos}%`,
                          width: `${Math.max(traceWidthPos, 0.5)}%`,
                          minWidth: '100px',
                          top: '40px', // directly below the bar
                        }}
                      >
                        {trace.spans.map((span) => {
                          const spanStart = Math.min(...trace.spans.map((s) => s.start_time));
                          const spanEnd = Math.max(...trace.spans.map((s) => s.end_time));
                          const spanDuration = spanEnd - spanStart || 1;
                          const spanLeft = ((span.start_time - spanStart) / spanDuration) * 100;
                          const spanWidth = ((span.end_time - span.start_time) / spanDuration) * 100;
                          const isSelectedSpan = span.span_id === selectedSpanId;
                          return (
                            <TooltipProvider key={span.span_id} delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`relative h-6 rounded cursor-pointer gantt-span-box ${isSelectedSpan ? "ring-1 ring-white" : ""}`}
                                    style={{
                                      marginLeft: `${spanLeft}%`,
                                      width: `${Math.max(spanWidth, 0.5)}%`,
                                      minWidth: '36px',
                                      backgroundColor: getSpanBackgroundColor(span.type),
                                      borderLeft: `2px solid ${getSpanColor(span.type)}`,
                                    }}
                                    onClick={() => onSelectSpan(span.span_id, trace.id)}
                                  >
                                    <div className="flex items-center h-full px-2">
                                      <span className="text-xs text-white truncate">{span.name}</span>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  align="center"
                                  className="bg-slate-900 text-white border border-slate-700 shadow-lg"
                                >
                                  <div className="font-medium">{span.name}</div>
                                  <div className="text-slate-300">Type: {span.type || "Unknown"}</div>
                                  <div className="text-slate-300">Duration: {formatDuration(span.end_time - span.start_time)}</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>

    {/* Time scale at bottom */}
    <div className="px-4 py-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
      <span>{formatTime(sessionStart)}</span>
      <span>{formatDuration(sessionDuration)}</span>
      <span>{formatTime(sessionEnd)}</span>
    </div>
  </div>
);
}

export default SessionGanttChart
