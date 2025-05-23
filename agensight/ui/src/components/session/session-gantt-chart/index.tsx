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
        </div>,
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
      <div ref={containerRef} className="flex-1 overflow-auto px-4 pb-4 relative">
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
              const traceWidthPos = ((traceEnd - traceStart) / sessionDuration) * 100

              // Get a name for the trace
              const traceName = trace.name || `Trace ${traceIndex + 1}`

              return (
                <div key={trace.id} className="mb-6">
                  {/* Trace row */}
                  <div
                    className={`flex items-center mb-2 cursor-pointer ${isSelected ? "text-white" : "text-slate-300"}`}
                    onClick={() => onSelectTrace(trace.id)}
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

                  {/* Trace timeline */}
                  <div className="relative h-8 w-full mb-2">
                    {(!isExpanded ? (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute h-full rounded ${isSelected ? "ring-1 ring-white" : ""}`}
                              style={{
                                left: `${traceLeftPos}%`,
                                width: `${Math.max(traceWidthPos, 0.5)}%`,
                                backgroundColor: getSpanBackgroundColor("agent"),
                                borderLeft: `2px solid ${getSpanColor("agent")}`,
                              }}
                              onClick={() => onSelectTrace(trace.id)}
                            >
                              {traceWidthPos > 5 && (
                                <div className="absolute inset-0 flex items-center px-2 cursor-pointer">
                                  <span className="text-xs text-white truncate">{traceName}</span>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            align="center"
                            className="bg-slate-900 text-white border border-slate-700 shadow-lg"
                          >
                            <div className="font-medium">{traceName}</div>
                            <div className="text-slate-300">Spans: {trace.spans.length}</div>
                            <div className="text-slate-300">
                              Duration: {formatDuration(trace.spans.length > 0 ? trace.spans[trace.spans.length - 1].end_time - trace.spans[0].start_time : 0)}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div
                        className={`absolute h-full rounded ${isSelected ? "ring-1 ring-white" : ""}`}
                        style={{
                          left: `${traceLeftPos}%`,
                          width: `${Math.max(traceWidthPos, 0.5)}%`,
                          backgroundColor: getSpanBackgroundColor("agent"),
                          borderLeft: `2px solid ${getSpanColor("agent")}`,
                        }}
                        onClick={() => onSelectTrace(trace.id)}
                      >
                        {traceWidthPos > 5 && (
                          <div className="absolute inset-0 flex items-center px-2 cursor-pointer">
                            <span className="text-xs text-white truncate">
                              {traceName}: {formatDuration(trace.spans.length > 0 ? trace.spans[trace.spans.length - 1].end_time - trace.spans[0].start_time : 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Span rows (only show if trace is expanded) */}
                  {isExpanded && (
                    <div className="pl-6 border-l border-slate-800">
                      {trace.spans.map((span) => {
                        const spanLeftPos = ((span.start_time - sessionStart) / sessionDuration) * 100
                        const spanWidthPos = ((span.end_time - span.start_time) / sessionDuration) * 100
                        const isSelectedSpan = span.span_id === selectedSpanId
                        return (
                          <div key={span.span_id} className="relative h-8 mb-1">
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute h-full rounded cursor-pointer ${isSelectedSpan ? "ring-1 ring-white" : ""}`}
                                    style={{
                                      left: `${spanLeftPos}%`,
                                      width: `${Math.max(spanWidthPos, 0.5)}%`,
                                      backgroundColor: getSpanBackgroundColor(span.type),
                                      borderLeft: `2px solid ${getSpanColor(span.type)}`,
                                    }}
                                    onClick={() => onSelectSpan(span.span_id, trace.id)}
                                  >
                                    {spanWidthPos > 5 && (
                                      <div className="absolute inset-0 flex items-center px-2">
                                        <span className="text-xs text-white truncate">{span.name}</span>
                                      </div>
                                    )}
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
                          </div>
                        )
                      })}

                    </div>
                  )}
                </div>
              )
            })}
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
  )
}

export default SessionGanttChart
