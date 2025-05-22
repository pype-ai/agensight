'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getSingleSessionTraces, getSpans } from '@/lib/services/traces';
import { ChevronLeft, Clock, Database, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import Link from 'next/link';

export default function Session() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  // Fetch traces for this session
  const {
    data: sessionTraces,
    isLoading: tracesLoading,
    error: tracesError,
  } = useQuery({
    queryKey: ['session-traces', sessionId],
    queryFn: () => (sessionId ? getSingleSessionTraces(sessionId) : []),
    enabled: !!sessionId,
  });

  // State to hold all spans for each trace
  const [allSpans, setAllSpans] = React.useState<any[][]>([]);
  const [expandedAgents, setExpandedAgents] = React.useState<
    Record<string, boolean>
  >({});

  // Refs for syncing scroll
  const leftScrollRef = React.useRef<HTMLDivElement>(null);
  const rightScrollRef = React.useRef<HTMLDivElement>(null);

  // Toggle agent details expansion
  const toggleAgentDetails = (traceId: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [traceId]: !prev[traceId],
    }));
  };

  React.useEffect(() => {
    if (sessionTraces && Array.isArray(sessionTraces)) {
      const fetchAllSpans = async () => {
        const spansResults = await Promise.all(
          sessionTraces.map((trace) => getSpans(trace.id))
        );
        setAllSpans(spansResults);
      };
      fetchAllSpans();
    }
  }, [sessionTraces]);

  // Prepare the conversation array when both traces and spans are available
  const conversation = React.useMemo(() => {
    if (
      !sessionTraces ||
      !Array.isArray(sessionTraces) ||
      allSpans.length !== sessionTraces.length
    )
      return [];

    // Sort traces by timestamp if available
    const sortedData = sessionTraces
      .map((trace, idx) => {
        let spansData: any = allSpans[idx];
        if (Array.isArray(spansData)) {
          spansData = undefined;
        }
        return {
          traceId: trace.id,
          trace_input: spansData?.trace_input || '',
          trace_output: spansData?.trace_output || '',
          agents: spansData?.agents || [],
          trace,
          timestamp: trace.started_at || 0,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return sortedData;
  }, [sessionTraces, allSpans]);

  // Sync scroll between left and right panels
  const handleLeftScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (rightScrollRef.current) {
        const leftScrollPercentage =
          e.currentTarget.scrollTop /
          (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
        const rightScrollTarget =
          leftScrollPercentage *
          (rightScrollRef.current.scrollHeight -
            rightScrollRef.current.clientHeight);
        rightScrollRef.current.scrollTop = rightScrollTarget;
      }
    },
    []
  );

  const handleRightScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (leftScrollRef.current) {
        const rightScrollPercentage =
          e.currentTarget.scrollTop /
          (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
        const leftScrollTarget =
          rightScrollPercentage *
          (leftScrollRef.current.scrollHeight -
            leftScrollRef.current.clientHeight);
        leftScrollRef.current.scrollTop = leftScrollTarget;
      }
    },
    []
  );

  if (tracesLoading) {
    return <LoadingState />;
  }

  if (tracesError) {
    return <ErrorState />;
  }

  if (!conversation.length) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <Link href="/sessions">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <h1 className="text-sm font-semibold">Session Viewer</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs h-5 px-1.5">
              {sessionId?.substring(0, 8)}...
            </Badge>
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              <Clock className="mr-1 h-3 w-3" />
              {conversation[0]?.trace?.started_at
                ? new Date(
                    conversation[0].trace.started_at * 1000
                  ).toLocaleTimeString()
                : 'N/A'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content - 65/35 split layout */}
      <div className="flex-1 overflow-hidden max-w-screen-2xl w-full mx-auto">
        <div className="flex h-[calc(100vh-3rem)]">
          {/* Conversation area - 65% */}
          <div className="w-[65%] border-r border-zinc-200 dark:border-zinc-800">
            <div
              className="h-full overflow-y-auto"
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
            >
              <div className="p-3 space-y-4">
                {conversation.map((item, idx) => (
                  <div
                    key={item.traceId}
                    className="relative pb-4"
                    id={`trace-${item.traceId}`}
                  >
                    {/* Trace ID badge at top left */}
                    <Badge
                      variant="outline"
                      className="absolute left-0 top-0 font-mono text-xs px-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md"
                    >
                      Trace ID: {item.traceId}
                    </Badge>

                    {/* User message */}
                    <div className="flex flex-col items-end space-y-1 mb-3 mt-6">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          User
                        </span>
                        <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">
                            U
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-500 text-white px-3 py-2 rounded-xl rounded-tr-none max-w-[90%]">
                        <p className="whitespace-pre-line text-xs">
                          {item.trace_input}
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {item.trace?.started_at
                          ? new Date(
                              item.trace.started_at * 1000
                            ).toLocaleTimeString()
                          : ''}
                      </span>
                    </div>

                    {/* Assistant message */}
                    {item.trace_output && (
                      <div className="flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <span className="text-purple-600 dark:text-purple-300 text-xs font-medium">
                              A
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Assistant
                          </span>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl rounded-tl-none w-full max-w-[90%]">
                          <p className="whitespace-pre-line text-xs">
                            {item.trace_output}
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {item.trace?.ended_at
                            ? new Date(
                                item.trace.ended_at * 1000
                              ).toLocaleTimeString()
                            : ''}
                        </span>
                      </div>
                    )}

                    {/* Trace separator line */}
                    {idx < conversation.length - 1 && (
                      <div className="border-b border-dashed border-zinc-200 dark:border-zinc-800 mt-3"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent details area - 35% */}
          <div className="w-[35%] bg-zinc-50 dark:bg-zinc-900">
            <div
              className="h-full overflow-y-auto"
              ref={rightScrollRef}
              onScroll={handleRightScroll}
            >
              <div className="p-3">
                <div className="text-xs font-medium mb-2 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                  Agent Details
                </div>

                {conversation.map((item, idx) => (
                  <div
                    key={`details-${item.traceId}`}
                    className="mb-4"
                    id={`details-${item.traceId}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] h-4 px-1"
                      >
                        Trace ID: {item.traceId}
                      </Badge>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {item.trace?.started_at
                          ? new Date(
                              item.trace.started_at * 1000
                            ).toLocaleTimeString()
                          : ''}
                      </span>
                    </div>

                    {item.agents && item.agents.length > 0 ? (
                      <Collapsible
                        open={expandedAgents[item.traceId]}
                        onOpenChange={() => toggleAgentDetails(item.traceId)}
                        className="w-full"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-6 px-2 text-xs justify-between mb-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded"
                          >
                            <span>
                              {item.agents.length} Agent
                              {item.agents.length > 1 ? 's' : ''}
                            </span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${
                                expandedAgents[item.traceId] ? 'rotate-180' : ''
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-1">
                          {item.agents.map((agent: any, aidx: number) => (
                            <div
                              key={agent.span_id || aidx}
                              className="bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 p-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium">
                                  Agent {aidx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {agent.model || 'Unknown'}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">
                                Tokens: {agent.tokens || 'N/A'}
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-1 max-h-[80px] overflow-y-auto">
                                <p className="text-[10px] whitespace-pre-line">
                                  {agent.final_completion}
                                </p>
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                        No agent data available
                      </div>
                    )}

                    {idx < conversation.length - 1 && (
                      <div className="border-b border-dashed border-zinc-200 dark:border-zinc-800 mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">
          Error Loading Traces
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          There was a problem loading the session data. Please try again.
        </p>
        <Button asChild size="sm">
          <Link href="/sessions">Return to Sessions</Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="text-center">
        <Database className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">No Conversation Data</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          There are no traces available for this session.
        </p>
        <Button asChild size="sm">
          <Link href="/sessions">Return to Sessions</Link>
        </Button>
      </div>
    </div>
  );
}
