"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Clock, DollarSign, MessageSquare, PenToolIcon, AlertCircle, Hash, Copy } from "lucide-react"
import SessionGanttChart from "@/components/session/session-gantt-chart"
import { getSingleSessionTraces, getTraceById, getSpanDetails } from "@/lib/services/traces"
import { cn } from "@/lib/utils"
import { IconBrandOpenai } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

function SessionDetailsSheet({
  session,
  sheetOpen,
  setSheetOpen,

}: {
  session: any
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void

}) {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("session-details");

  const router = useRouter();
  const handleRunExperimentButton = () => {
    if (session?.id) {
      router.push(`/session-replay?session_id=${encodeURIComponent(session.id)}`);
    } else {
      router.push('/session-replay');
    }
  }

  // Fetch traces for this session (metadata only)
  const {
    data: traces,
    isLoading: loadingTraces,
    error: tracesError,
  } = useQuery({
    queryKey: ["session-traces", session?.id],
    queryFn: () => (session?.id ? getSingleSessionTraces(session.id) : []),
    enabled: !!session?.id && sheetOpen,
  });

  // Fetch all spans for all traces in parallel
  const { data: tracesWithSpans, isLoading: loadingTracesWithSpans } = useQuery({
    queryKey: ["session-traces-with-spans", traces?.map((t: any) => t.id)],
    enabled: !!traces && traces.length > 0,
    queryFn: async () => {
      if (!traces) return [];
      const results = await Promise.all(
        traces.map(async (trace: any) => {
          try {
            const traceData = await getTraceById(trace.id);
            // Prefer traceData.spans, fallback to traceData.agents
            return { ...trace, spans: traceData.spans || traceData.agents || [] };
          } catch {
            return { ...trace, spans: [] };
          }
        })
      );
      return results;
    },
  });

  // Session duration calculation
  let sessionDurationDisplay = 'N/A';
  let sessionDurationSeconds = null;
  if (tracesWithSpans && Array.isArray(tracesWithSpans) && tracesWithSpans.length > 0) {
    const allSpans = tracesWithSpans.flatMap((trace: any) => Array.isArray(trace.spans) ? trace.spans : []);
    if (allSpans.length > 0) {
      const minStart = Math.min(...allSpans.map((s: any) => s.start_time));
      const maxEnd = Math.max(...allSpans.map((s: any) => s.end_time));
      const durationSec = maxEnd - minStart;
      sessionDurationSeconds = durationSec;
      // Format as mm:ss or hh:mm:ss if needed
      const h = Math.floor(durationSec / 3600);
      const m = Math.floor((durationSec % 3600) / 60);
      const s = durationSec % 60;
      sessionDurationDisplay = [
        h > 0 ? String(h).padStart(2, '0') : null,
        String(m).padStart(2, '0'),
        String(s).padStart(2, '0')
      ].filter(Boolean).join(':');
    }
  }

  // Handles clicking a trace ID: navigates to the trace details page
  const handleTraceIdClick = (traceId: string, trace: any) => {
    // Store session and tab info for restoration
    sessionStorage.setItem('lastSessionId', session?.id ?? '');
    sessionStorage.setItem('sessionSheetActiveTab', 'session-conversation');
    sessionStorage.setItem('sessionSheetSelectedTraceId', traceId);
    sessionStorage.setItem('fromSessionConversation', 'true');
    // Use trace fields or fallback to undefined if not present
    const name = trace?.name || '';
    const latency = trace?.latency ?? '';
    const total_tokens = trace?.total_tokens ?? '';
    router.push(
      `/trace?id=${encodeURIComponent(traceId)}&name=${encodeURIComponent(name)}&latency=${encodeURIComponent(latency)}&total_tokens=${encodeURIComponent(total_tokens)}&redirect_from_session=true`
    );
  };


  // (Removed duplicate/broken code. Continue with logic for firstTraceId, activeTraceId, etc.)


  // Get the first trace's ID
  const firstTraceId = traces && traces.length > 0 ? traces[0].id : null

  // Use selectedTraceId or default to firstTraceId
  const activeTraceId = selectedTraceId || firstTraceId

  // Fetch the structured trace for the selected trace
  const { data: traceData, isLoading: loadingTraceData } = useQuery({
    queryKey: ["trace-by-id", activeTraceId],
    queryFn: () => (activeTraceId ? getTraceById(activeTraceId) : null),
    enabled: !!activeTraceId && sheetOpen,
  })

  // Fetch all trace details for chat view (for Terminal Logs tab)
  const {
    data: allTraceDetails,
    isLoading: loadingAllTraceDetails,
    error: errorAllTraceDetails,
  } = useQuery({
    queryKey: ["all-trace-details", traces?.map((t: any) => t.id)],
    enabled: !!traces && traces.length > 0 && sheetOpen,
    queryFn: async () => {
      if (!traces) return [];
      const results = await Promise.all(
        traces.map(async (trace: any) => {
          try {
            return await getTraceById(trace.id);
          } catch (err) {
            return { id: trace.id, trace_input: "N/A", trace_output: "N/A" };
          }
        })
      );
      return results;
    },
  });

  // Fetch details for the selected span
  const { data: spanDetailsData, isLoading: loadingSpanDetails } = useQuery({
    queryKey: ["span-details", selectedSpanId],
    queryFn: () => (selectedSpanId ? getSpanDetails(selectedSpanId) : null),
    enabled: !!selectedSpanId,
  })

  const spanDetails: any = spanDetailsData || null

  // Auto-select first trace on session open/change
  useEffect(() => {
    if (traces && traces.length > 0 && !selectedTraceId) {
      setSelectedTraceId(traces[0].id)
    }
  }, [traces, selectedTraceId])

  // Handle copy trace ID
  const handleCopyTraceId = () => {
    if (session?.id) {
      navigator.clipboard.writeText(session.id)
    }
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button style={{ display: "none" }}>Hidden trigger</button>
      </SheetTrigger>
      <SheetContent showCloseIcon={false} className="w-full min-w-[80%] p-0 overflow-y-auto" side="right">
        <SheetHeader className="sr-only">
          <SheetTitle>Session Details</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full bg-slate-950 text-white">
          {/* Header with Session/Trace ID */}
          <div className="flex items-center p-4 border-b border-slate-800">
            <button className="mr-2 text-slate-400 hover:text-white" onClick={() => setSheetOpen(false)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex w-full justify-between items-center">
              <div className="flex items-center">
                <span className="text-base font-medium">Session ID:</span>
                <span className="ml-2 font-mono text-sm">{session?.id || "-"}</span>
                <Button variant="ghost" className="ml-2 text-slate-400 hover:text-white" onClick={handleCopyTraceId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {/* <Button onClick={() => handleRunExperimentButton()} >
                Run Experiment
              </Button> */}
            </div>
          </div>

         
          {/* Metrics Bar */}
          <div className="flex border-b border-slate-800 text-sm">
            <div className="flex items-center px-4 py-3 border-r border-slate-800">
              <span className="text-slate-400 mr-2">
                <IconBrandOpenai size={16} />
              </span>
              <span>{traceData?.model || "N/A"}</span>
            </div>
            <MetricItem
              icon={<Clock className="h-4 w-4" />}
              label="Duration:"
              value={
                (sessionDurationSeconds !== null ? ` ${sessionDurationSeconds.toFixed(2)}s` : "")
              }
              />
            <MetricItem icon={<DollarSign className="h-4 w-4" />} label="Total Cost:" value="$0.0000000" />
            <MetricItem icon={<MessageSquare className="h-4 w-4" />} label="LLM Calls:" value="N/A" />
            <MetricItem icon={<PenToolIcon className="h-4 w-4" />} label="Tool Calls:" value="N/A" />
            <MetricItem icon={<AlertCircle className="h-4 w-4" />} label="Errors:" value="N/A" />
            <MetricItem icon={<Hash className="h-4 w-4" />} label="Total Tokens:" value="N/A" />
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-800 pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
              <TabsList className="bg-transparent h-12 p-0">
                <TabsTrigger
                  value="session-details"
                  className={cn(
                    "rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "border-b-2 border-transparent data-[state=active]:border-white px-4",
                  )}
                >
                  Session Details
                </TabsTrigger>
                <TabsTrigger
                  value="session-conversation"
                  className={cn(
                    "rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "border-b-2 border-transparent data-[state=active]:border-white px-4",
                  )}
                >
                  Session Conversation
                </TabsTrigger>
              </TabsList>

              {/* Main Content Area (TabsContent must be inside Tabs) */}
              <TabsContent value="session-details" className="flex-1 p-0 m-0">
                <div className="flex h-full">
                  {/* Left side: Trace/Span Details */}
                  <div className="w-1/2 p-4 border-r border-slate-800 overflow-y-auto">
                    {selectedSpanId ? (
                      // Show span details when a span is selected
                      <div>
                        <h3 className="text-lg font-medium mb-4">Span Details</h3>
                        {loadingSpanDetails ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full bg-slate-800" />
                            <Skeleton className="h-4 w-3/4 bg-slate-800" />
                          </div>
                        ) : spanDetails ? (
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Span ID</div>
                              <div className="font-mono text-sm">{selectedSpanId}</div>
                            </div>
                            {spanDetails?.completions && spanDetails.completions.length > 0 && (
                              <div>
                                <div className="text-sm text-slate-400 mb-1">Completion</div>
                                <div className="bg-slate-900 rounded p-2 text-xs font-mono whitespace-pre-line break-words max-h-64 overflow-y-auto">
                                  {spanDetails.completions[0].content}
                                </div>
                              </div>
                            )}
                            {spanDetails.input && (
                              <div>
                                <div className="text-sm text-slate-400 mb-1">Input</div>
                                <div className="bg-slate-900 rounded p-2 text-xs font-mono whitespace-pre-line break-words max-h-64 overflow-y-auto">
                                  {typeof spanDetails.input === "object"
                                    ? JSON.stringify(spanDetails.input, null, 2)
                                    : spanDetails.input}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400">No span details available</div>
                        )}
                      </div>
                    ) : (
                      // Show trace details when no span is selected
                      <div>
                        <h3 className="text-lg font-medium mb-4">Trace Details</h3>
                        {loadingTraceData ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full bg-slate-800" />
                            <Skeleton className="h-4 w-3/4 bg-slate-800" />
                          </div>
                        ) : traceData ? (
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Trace Id</div>
                              <div className="font-mono text-sm">{activeTraceId}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Trace Input</div>
                              <div className="bg-slate-900 rounded p-2 text-xs font-mono whitespace-pre-line break-words max-h-64 overflow-y-auto">
                                {traceData.trace_input || "N/A"}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400 mb-1">Trace Output</div>
                              <div className="bg-slate-900 rounded p-2 text-xs font-mono whitespace-pre-line break-words max-h-64 overflow-y-auto">
                                {traceData.trace_output || "N/A"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400">No trace selected</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side: Gantt Chart */}
                  <div className="w-1/2 flex flex-col">
                    <div className="bg-slate-900 rounded-lg flex-1 w-full flex flex-col overflow-hidden">
                      {loadingTraces || loadingTracesWithSpans ? (
                        <Skeleton className="h-full w-full rounded-lg bg-slate-800" />
                      ) : tracesWithSpans && tracesWithSpans.length > 0 ? (
                        <div className="max-h-[500px] overflow-y-auto">
                          <SessionGanttChart
                            traces={tracesWithSpans}
                            selectedTraceId={selectedTraceId}
                            selectedSpanId={selectedSpanId}
                            onSelectTrace={(traceId) => {
                              setSelectedTraceId(traceId)
                              setSelectedSpanId(null)
                            }}
                            onSelectSpan={(spanId, traceId) => {
                              setSelectedTraceId(traceId)
                              setSelectedSpanId(spanId)
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-slate-400">No timeline data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="session-conversation" className="flex-1 p-0 m-0">
                {/* Fetch all trace details for chat view */}
                {/* The hook is now at the top of the component */}
                <div className="bg-slate-900 h-full w-full flex flex-col p-0">
                  {loadingTraces || loadingAllTraceDetails ? (
                    <div className="flex items-center justify-center h-full w-full">
                      <Skeleton className="h-6 w-1/2 bg-slate-800" />
                    </div>
                  ) : allTraceDetails && traces && allTraceDetails.length > 0 ? (
                    <div className="flex-1 min-h-0">
                      <div className="flex flex-col gap-6 h-full overflow-y-auto p-4">
                        {allTraceDetails.map((trace: any, idx: number) => {
                          const traceId = traces[idx]?.id || trace.id;
                          return (
                            <div key={traceId} className="flex flex-col gap-2">
                              {/* Trace ID clickable */}
                              <div className="flex items-center mb-1">
                                <button
                                  className="text-xs text-slate-500 hover:text-slate-300 font-mono underline underline-offset-2 cursor-pointer transition-colors"
                                  title="Click to log full trace details"
                                  onClick={() => handleTraceIdClick(traceId, trace)}
                                >
                                  Trace ID: {traceId}
                                </button>
                              </div>
                              {/* Input bubble */}
                              <div className="flex justify-end">
                                <div className="bg-slate-800 px-4 py-2 rounded-lg max-w-2xl text-sm font-mono text-left shadow-sm border border-slate-700">
                                  <span className="block text-slate-400 text-xs mb-1">Input</span>
                                  <span className="whitespace-pre-line break-words">{trace.trace_input || 'N/A'}</span>
                                </div>
                              </div>
                              {/* Output bubble */}
                              <div className="flex">
                                <div className="bg-slate-700 px-4 py-2 rounded-lg max-w-2xl text-sm font-mono text-left shadow-sm border border-slate-600">
                                  <span className="block text-slate-400 text-xs mb-1 flex justify-start w-full">Output</span>
                                  <span className="whitespace-pre-line break-words">{trace.trace_output || 'N/A'}</span>
                                </div>
                              </div>
                              {/* Subtle trace end indicator */}
                              <div className="flex justify-center mt-2"></div>
                              {idx !== allTraceDetails.length - 1 && (
                                <div className="border-t border-dashed border-slate-800 my-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <span className="text-slate-400">No traces available for this session.</span>
                    </div>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Simple Metric Item Component
function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center px-4 py-3">
      <span className="text-slate-400 mr-2">{icon}</span>
      <span className="mr-2">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default SessionDetailsSheet
