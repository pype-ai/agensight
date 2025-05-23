import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SessionGanttChart from '@/components/session/session-gantt-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Span, ToolCall } from '@/types/type';

import { getSingleSessionTraces, getTraceById, getSpanDetails } from '@/lib/services/traces';

function SessionDetailsSheet({ session, sheetOpen, setSheetOpen }: { session: any, sheetOpen: boolean, setSheetOpen: (open: boolean) => void }) {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // Fetch traces for this session (metadata only)
  const { data: traces, isLoading: loadingTraces, error: tracesError } = useQuery({
    queryKey: ['session-traces', session?.id],
    queryFn: () => session?.id ? getSingleSessionTraces(session.id) : [],
    enabled: !!session?.id && sheetOpen,
  });

  // Fetch all spans for all traces in parallel
  const {
    data: tracesWithSpans,
    isLoading: loadingTracesWithSpans,
    error: tracesWithSpansError,
  } = useQuery({
    queryKey: ['session-traces-with-spans', traces?.map((t: any) => t.id)],
    enabled: !!traces && traces.length > 0,
    queryFn: async () => {
      if (!traces) return [];
      const results = await Promise.all(
        traces.map(async (trace: any) => {
          try {
            const traceData = await getTraceById(trace.id);
            // Prefer traceData.spans, fallback to traceData.agents
            const spans = Array.isArray(traceData?.spans) && traceData.spans.length > 0
              ? traceData.spans
              : (Array.isArray(traceData?.agents) ? traceData.agents : []);
            return { ...trace, spans };
          } catch (err) {
            return { ...trace, spans: [] };
          }
        })
      );
      return results;
    }
  });

  console.log({traces})

  // Get the first trace's ID
  const firstTraceId = traces && traces.length > 0 ? traces[0].id : null;

  // Use selectedTraceId or default to firstTraceId
  const activeTraceId = selectedTraceId || firstTraceId;

  // Fetch the structured trace for the selected trace
  const { data: traceData, isLoading: loadingTraceData, error: traceError } = useQuery({
    queryKey: ['trace-by-id', activeTraceId],
    queryFn: () => activeTraceId ? getTraceById(activeTraceId) : null,
    enabled: !!activeTraceId && sheetOpen,
  });

  // For the Gantt chart: if no trace is selected, show all traces and all spans
  let ganttTraces: any[] = [];
  if (!selectedTraceId && Array.isArray(traces)) {
    ganttTraces = traces;
  } else if (traceData) {
    ganttTraces = [traceData];
  }

  // Spans for the selected trace
  const spans = Array.isArray(traceData?.spans) && traceData.spans.length > 0
    ? traceData.spans
    : (Array.isArray(traceData?.agents) ? traceData.agents : []);
  const trace = traceData || null;
  const selectedSpan = spans.find((span: any) => span.span_id === selectedSpanId) || null;

  console.log({traceData})

  // Fetch details for the selected span
  const { data: spanDetailsData, isLoading: loadingSpanDetails, error: spanDetailsError } = useQuery({
    queryKey: ['span-details', selectedSpanId],
    queryFn: () => selectedSpanId ? getSpanDetails(selectedSpanId) : null,
    enabled: !!selectedSpanId,
  });

  const spanDetails : any = spanDetailsData || null;
  console.log({spanDetails})

  // Optionally: auto-select the first span when data loads
  React.useEffect(() => {
    if (spans.length > 0 && !selectedSpanId) {
      setSelectedSpanId(spans[0].span_id);
    }
  }, [spans, selectedSpanId]);

  // Auto-select first trace on session open/change
  React.useEffect(() => {
    if (traces && traces.length > 0 && !selectedTraceId) {
      setSelectedTraceId(traces[0].id);
    }
  }, [traces, selectedTraceId]);

console.log({session, spans, traceData, selectedSpanId, selectedSpan, traces, firstTraceId});


  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button style={{ display: 'none' }}>Hidden trigger</button>
      </SheetTrigger>
      <SheetContent className="w-full min-w-[80%]" side="right">
        <SheetHeader>
          <SheetTitle>Session ID: <span className="font-mono text-xs">{session?.id || '-'}</span></SheetTitle>
        </SheetHeader>
        {/* Tabbed content area */}
        <div className="p-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Session Details</TabsTrigger>
              <TabsTrigger value="review">Conversation Review</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <div className="flex w-full h-[500px] gap-6">
                {/* Left: Hierarchical session/trace/span panel */}
                <div className="w-[40%] bg-muted/40 rounded-lg p-4 overflow-y-auto flex flex-col gap-4">
                  {/* Session Info */}
                  <div>
                    <div className="font-bold text-base mb-1">Session</div>
                    <div className="text-xs text-muted-foreground mb-1">ID: <span className="font-mono">{session?.id}</span></div>
                    {session?.session_name && (
                      <div className="text-xs text-muted-foreground mb-1">Name: <span className="font-mono">{session.session_name}</span></div>
                    )}
                  </div>
                  {/* Trace List */}
                  <div>
                    <div className="font-semibold text-sm mb-1">Traces</div>
                    <div className="flex flex-col gap-1">
                      {Array.isArray(traces) && traces.length > 0 ? traces.map((traceItem: any) => (
                        <button
                          key={traceItem.id}
                          className={`text-xs text-left px-2 py-1 rounded transition-colors ${activeTraceId === traceItem.id ? 'bg-primary/20 font-semibold' : 'hover:bg-muted'}`}
                          onClick={() => {
                            setSelectedTraceId(traceItem.id);
                            setSelectedSpanId(null); // clear selected span when switching traces
                          }}
                        >
                          {traceItem.name || traceItem.id}
                        </button>
                      )) : (
                        <span className="text-muted-foreground text-xs">No traces</span>
                      )}
                    </div>
                  </div>
                  {/* Trace Basic Info and Input/Output */}
                  <div>
                    <div className="font-bold text-base mb-1">Session</div>
                    <div className="text-xs text-muted-foreground mb-1">ID: <span className="font-mono">{session?.id}</span></div>
                    {session?.session_name && (
                      <div className="text-xs text-muted-foreground mb-1">Name: <span className="font-mono">{session.session_name}</span></div>
                    )}
                    {traceData && (
                      <>
                        <div className="font-semibold text-xs mb-1 mt-2">Trace</div>
                        <div className="text-xs mb-1">{traceData.name || traceData.id}</div>
                        <div className="font-semibold text-xs mb-1 mt-2">Trace Input:</div>
                        <div className="bg-background rounded p-2 text-xs whitespace-pre-line break-words max-h-24 overflow-y-auto">{traceData.trace_input}</div>
                        <div className="font-semibold text-xs mt-2 mb-1">Trace Output:</div>
                        <div className="bg-background rounded p-2 text-xs whitespace-pre-line break-words max-h-24 overflow-y-auto">{traceData.trace_output}</div>
                      </>
                    )}
                    {/* Show selected span output if present */}
                    {selectedSpan && selectedSpan.final_completion && (
                      <>
                        <div className="font-semibold text-xs mb-1 mt-2">Span Output:</div>
                        <div className="bg-background rounded p-2 text-xs whitespace-pre-line break-words max-h-24 overflow-y-auto">{selectedSpan.final_completion}</div>
                      </>
                    )}
                    {/* Show spanDetails completion if present */}
                    {spanDetails && spanDetails.completions && spanDetails.completions.length > 0 && (
                      <>
                        <div className="font-semibold text-xs mb-1 mt-2">Completion:</div>
                        <div className="bg-background rounded p-2 text-xs whitespace-pre-line break-words max-h-24 overflow-y-auto">{spanDetails.completions[0].content}</div>
                      </>
                    )}
                  </div>
                </div>
                {/* Right: Session-wide Gantt chart */}
                <div className="flex-1 bg-background rounded-lg p-4 border flex items-center justify-center min-w-0">
                  {loadingTraces || loadingTraceData ? (
                    <Skeleton className="h-64 w-full" />
                  ) : tracesError || traceError ? (
                    <span className="text-red-500">Error loading trace data.</span>
                  ) : tracesWithSpans && tracesWithSpans.length > 0 ? (
                    <SessionGanttChart
                      traces={tracesWithSpans}
                      selectedTraceId={selectedTraceId}
                      selectedSpanId={selectedSpanId}
                      onSelectTrace={traceId => {
                        setSelectedTraceId(traceId);
                        setSelectedSpanId(null); // clear span selection when switching traces
                      }}
                      onSelectSpan={(spanId, traceId) => {
                        setSelectedTraceId(traceId);
                        setSelectedSpanId(spanId);
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground">No timeline data available <span className="text-[9px]">(dummy data)</span></span>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="review" className="mt-4">
              <div className="w-full h-[500px] bg-muted/40 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">[Conversation chat view will go here]</span>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
      <SheetClose className="absolute top-4 right-4" aria-label="Close">
        ×
      </SheetClose>
    </Sheet>
  );
}

export default SessionDetailsSheet