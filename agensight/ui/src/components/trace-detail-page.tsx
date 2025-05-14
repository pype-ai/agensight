"use client";

import React, { useEffect, useState, useMemo } from "react";
import { TraceItem } from "@/hooks/use-trace-column";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconClock, IconCode, IconMessageCircle, IconUser, IconRobot, IconFile, IconList, IconMessageDots } from "@tabler/icons-react";
import { getTraceById, getSpanDetailsById } from "@/lib/services/traces";
import { useQuery } from "@tanstack/react-query";
import {  Span, SpanDetails, ToolCall, TraceDetailPageProps } from "@/types/type";
import { GanttChartVisualizer} from "@/components/GannChart";
import { TraceDetailSkeleton } from "./skeletons/trace-details-skeleton";

// Add a custom hook to prevent scroll propagation
function usePreventScrollPropagation() {
  useEffect(() => {
    const preventPropagation = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const scrollContainer = target.closest('.scroll-container');
      
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        
        // Check if scroll is at the boundaries to decide if we should prevent propagation
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
          e.preventDefault();
        }
        
        e.stopPropagation();
      }
    };
    
    document.addEventListener('wheel', preventPropagation, { passive: false });
    return () => document.removeEventListener('wheel', preventPropagation);
  }, []);
}

function TraceDetailPage({ id,name,latency, router ,total_tokens}: TraceDetailPageProps) {
  const [activeTab, setActiveTab] = useState("trace-details");
  const [trace, setTrace] = useState<TraceItem | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spanDetailsLoading, setSpanDetailsLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [selectedGanttSpan, setSelectedGanttSpan] = useState<Span | null>(null);

  // Add a global message handler for iframe resizing
  useEffect(() => {
    const handleIframeResize = (msg: MessageEvent) => {
      if (msg.data && msg.data.type === 'resize-iframe' && msg.data.iframeId) {
        const iframe = document.getElementById(msg.data.iframeId) as HTMLIFrameElement | null;
        if (iframe) {
          iframe.style.height = `${msg.data.height + 30}px`;
        }
      }
    };
    
    window.addEventListener('message', handleIframeResize);
    return () => window.removeEventListener('message', handleIframeResize);
  }, []);

  // Use React Query for the trace data
  const { 
    data: traceData,
    isLoading 
  } = useQuery({
    queryKey: ['trace', id],
    queryFn: () => getTraceById(id)
  });
  

  // Process trace data when it changes
  useEffect(() => {
    if (traceData) {
      try {
        // Our new format doesn't match the schema, so we'll handle it directly        
        // Create a minimal trace object with the fields we have
        setTrace({
          id: id as any ,
          name: name,
          session_id: "N/A",
          duration: latency,
          trace_input: traceData.trace_input,
          trace_output: traceData.trace_output,
          metadata: {
            trace_id: id as any
          },
          total_tokens: total_tokens
        });
        
        // Set spans from the agents data
        if (traceData.agents && Array.isArray(traceData.agents)) {
          setSpans(traceData.agents);
        
          // Set the first span as selected by default if available
          if (traceData.agents.length > 0) {
            setSelectedSpan(traceData.agents[0]);
          }
        }
      } catch (err) {
        console.error("Error processing trace data:", err);
        setError(err instanceof Error ? err.message : "Failed to process trace data");
      }
    }
  }, [traceData]);
  
  // Handle errors in trace fetch
  useEffect(() => {
    if (isLoading) {
      setError(null);
    }
  }, [isLoading]);
  
  // Use React Query for span details
  const { 
    data: spanData,
    isLoading: isSpanLoading 
  } = useQuery({
    queryKey: ['span', selectedSpan?.span_id],
    queryFn: () => selectedSpan?.span_id ? getSpanDetailsById(selectedSpan.span_id) : null,
    enabled: !!selectedSpan?.span_id && !selectedSpan?.details
  });
  

  // Process span details when they change
  useEffect(() => {
    if (spanData) {
      updateSpanWithDetails(spanData);
    }
  }, [spanData]);
  
  // Update spanDetailsLoading based on isSpanLoading
  useEffect(() => {
    setSpanDetailsLoading(isSpanLoading);
  }, [isSpanLoading]);
  
  // Helper function to update span with details
  function updateSpanWithDetails(details: SpanDetails) {
    // Update the selected span with the details
    setSelectedSpan(prevSpan => {
      if (!prevSpan) return null;
      return {
        ...prevSpan,
        details
      };
    });
    
    // Also update the span in the spans array
    setSpans(prevSpans => 
      prevSpans.map(span => 
        // Make sure we're checking against a valid span ID
        (selectedSpan && span.span_id === selectedSpan.span_id)
          ? { ...span, details } 
          : span
      )
    );
  }

  // Add the hook to prevent scroll propagation
  usePreventScrollPropagation();
  
  // Add a useEffect to ensure scrollable containers work properly
  useEffect(() => {
    // Find all scroll containers and ensure they have proper overflow behavior
    const scrollContainers = document.querySelectorAll('.scroll-container');
    scrollContainers.forEach(container => {
      // Force a small scroll to activate scrolling
      if (container instanceof HTMLElement) {
        container.scrollTop = 1;
        container.scrollTop = 0;
      }
    });
    
    // Also initialize all pre element containers
    const preContainers = document.querySelectorAll('pre');
    preContainers.forEach(pre => {
      const parent = pre.parentElement;
      if (parent && parent.classList.contains('overflow-y-auto')) {
        parent.scrollTop = 1;
        parent.scrollTop = 0;
      }
    });
  }, [selectedSpan, activeTab]);


  const backButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-1 mr-4" 
      onClick={(e) => {
        e.preventDefault();
        // Store the current tab selection in session storage
        // This will be read by the dashboard page component to set active tab
        sessionStorage.setItem('dashboardActiveTab', 'traces');
        // Navigate to the dashboard page
        router.push("/");
      }}
    >
      <IconArrowLeft size={16} />
      <span>Back</span>
    </Button>
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().replace('T', ' ').replace('Z', '');
  };

  const formatDuration = (duration: number) => {
    return `${duration.toFixed(2)}s`;
  };

  return (
    <div className="max-h-screen flex flex-col overflow-hidden animate-fadeIn">
      {/* Main content takes full height */}
      <main className="flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between text-sm px-6 py-2 border-b bg-muted/20 flex-shrink-0 sticky top-0 z-20">
          {backButton}
          { trace && (
            <div className="flex items-center flex-wrap gap-2 py-2">
              <Badge variant="outline" className="text-xs">
                ID: {trace?.id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Session: {trace?.session_id || "N/A"}  
              </Badge>
              <Badge variant="outline" className="text-xs">
                Name: {trace.name}
              </Badge>
              <Badge variant="outline" className="text-xs" suppressHydrationWarning>
                Latency: {trace.duration}s
              </Badge>
              <Badge variant="outline" className="text-xs" suppressHydrationWarning>
                Total Tokens: {trace.total_tokens}
              </Badge>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex-1 overflow-auto">
            <TraceDetailSkeleton />
          </div>
        ) : error ? (
          <div className="flex-1 overflow-auto p-6">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{error}</p>
              </CardContent>
            </Card>
          </div>
        ) : trace ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="flex-1 flex gap-0 flex-col overflow-hidden"
            >
              <div className="border-b bg-muted/20 px-6 w-full flex-shrink-0 sticky top-0 z-10">
                <TabsList className="h-10 w-auto bg-transparent gap-6 border-0">
                  <TabsTrigger 
                    value="trace-details" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <IconFile size={18} />
                      <span>Trace Details</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="span-details" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <IconList size={18} />
                      <span>Span Details</span>
                      <Badge className="ml-1 h-5 bg-primary/10 text-primary hover:bg-primary/10">
                        {spans.length}
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent 
                  value="trace-details" 
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full overflow-hidden"
                >
                  <div className="flex w-full h-full overflow-hidden">
                    <div className="w-3/5 border-r overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Fixed header sections */}
                      <div className="flex-shrink-0 border-b">
                        <div className="bg-card z-20 pt-4 px-4 border-b pb-2">
                          <h2 className="text-base font-semibold flex items-center">
                            <IconMessageCircle size={16} className="mr-2 text-muted-foreground" />
                            Input
                          </h2>
                        </div>
                      </div>
                      
                      {/* Scrollable content area */}
                      <div className="flex-1 overflow-y-auto">
                        {/* Input content */}
                        <div className="p-4 pb-6">
                          <Card className="overflow-hidden border border-border">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                                <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                  <IconUser size={14} />
                                </div>
                                <span className="text-sm font-medium">User</span>
                              </div>
                              <div className="whitespace-pre-wrap pl-8 text-sm">
                                {trace.trace_input}
                              </div>
                            </CardContent>
                          </Card>
                      </div>

                      {/* Output Section */}
                        <div className="border-t">
                          <div className="flex-shrink-0 bg-card z-10 pt-4 px-4 border-b pb-2">
                          <h2 className="text-base font-semibold flex items-center">
                            <IconMessageDots size={16} className="mr-2 text-muted-foreground" />
                            Output
                          </h2>
                        </div>
                        <div className="p-4 pb-8">
                          <Card className="overflow-hidden border border-border">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                  <IconRobot size={14} />
                                </div>
                                <span className="text-sm font-medium">Assistant</span>
                              </div>
                              <div className="whitespace-pre-wrap pl-8 text-sm">
                                {trace.trace_output}
                              </div>
                            </CardContent>
                          </Card>
                          </div>
                        </div>
                      </div>
                    </div>
                      
                    {/* Right panel - Gantt chart */}
                    <div className="w-2/5 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Fixed header */}
                      <div className="flex-shrink-0 p-4 pb-2">
                        <h2 className="text-base font-semibold mb-2">Timeline</h2>
                      </div>
                      
                      {/* Scrollable content */}
                      <div className="flex-1 overflow-y-auto px-4">
                        <div className="flex flex-col">
                          {/* Chart container */}
                          <div className="border rounded-md p-3 overflow-hidden" style={{ height: '320px' }}>
                            <div className="h-full overflow-y-auto">
                              <GanttChartVisualizer 
                                spans={spans} 
                                trace={trace} 
                                onSelectSpan={(span) => setSelectedGanttSpan(span)}
                                onSelectTool={(tool) => setSelectedTool(tool)}
                                selectedSpanId={selectedGanttSpan?.span_id}
                              />
                            </div>
                          </div>
                          
                          {/* Details panel */}
                          {selectedTool && (
                            <div className="mt-4 border rounded-md p-3 bg-card max-h-[400px] overflow-y-auto scroll-container">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2 mr-1 text-xs flex items-center gap-1"
                                      onClick={() => setSelectedTool(null)}
                                    >
                                      <IconArrowLeft size={12} />
                                      <span>Back</span>
                                    </Button>
                                <h4 className="font-medium">{selectedTool.name}</h4>
                                  </div>
                                  {selectedGanttSpan && (
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <span>From:</span>
                                      <strong>{selectedGanttSpan.name}</strong>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
                                  ×
                                </Button>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                Duration: {selectedTool.duration.toFixed(2)}s
                              </div>
                              <div className="mb-2">
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                                  {JSON.stringify(selectedTool.args, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                                  {selectedTool.output}
                                </pre>
                              </div>
                              {selectedGanttSpan && selectedGanttSpan.tools_called && selectedGanttSpan.tools_called.length > 1 && (
                                <div className="mt-4 pt-3 border-t">
                                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Other Tools Used by {selectedGanttSpan.name}:</h5>
                                  <div className="space-y-1">
                                    {selectedGanttSpan.tools_called
                                      .filter(tool => tool.span_id !== selectedTool.span_id)
                                      .map((tool, i) => (
                                        <div 
                                          key={i} 
                                          className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTool(tool);
                                          }}
                                        >
                                          <span>{tool.name}</span>
                                          <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {selectedGanttSpan && !selectedTool && (
                            <div className="mt-4 border rounded-md p-3 bg-card">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{selectedGanttSpan.name}</h4>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedGanttSpan(null)} className="h-6 w-6 p-0">
                                  ×
                                </Button>
                              </div>
                              
                              <div className="text-xs text-muted-foreground mb-2">
                                Duration: {selectedGanttSpan.duration.toFixed(2)}s
                              </div>
                              
                              <div className="text-xs mb-2">
                                <div className="flex justify-between mb-1">
                                  <span className="text-muted-foreground">Start:</span>
                                  <span suppressHydrationWarning>{new Date(selectedGanttSpan.start_time * 1000).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">End:</span>
                                  <span suppressHydrationWarning>{new Date(selectedGanttSpan.end_time * 1000).toLocaleTimeString()}</span>
                                </div>
                              </div>
                              
                              {selectedGanttSpan.tools_called.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium mb-2">Tools Used:</h5>
                                  <div className="space-y-1">
                                    {selectedGanttSpan.tools_called.map((tool, i) => (
                                      <div 
                                        key={i} 
                                        className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTool(tool);
                                        }}
                                      >
                                        <span>{tool.name}</span>
                                        <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Span Details Tab */}
                <TabsContent 
                  value="span-details" 
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full overflow-hidden"
                >
                  <div className="flex w-full h-full overflow-hidden">
                    {/* Left Panel - Spans List */}
                    <div className="w-60 border-r overflow-hidden flex flex-col flex-shrink-0" style={{ height: 'calc(100vh - 110px)' }}>
                      <div className="overflow-y-auto flex-1 scroll-container">
                        {/* Group spans by agent name */}
                        {Object.entries(
                          spans.reduce((acc, span) => {
                            const agentName = span.name.includes("Agent") || span.name.includes("Planner") || 
                                            span.name.includes("Processor") || span.name.includes("Analyzer") || 
                                            span.name.includes("Presenter") || span.name.includes("Generator") 
                                            ? span.name : "Other";
                            acc[agentName] = acc[agentName] || [];
                            acc[agentName].push(span);
                            return acc;
                          }, {} as Record<string, Span[]>)
                        ).map(([agentName, agentSpans]) => (
                          <div key={agentName} className="mb-2">
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                              {agentName}
                            </div>
                            {agentSpans.map((span) => (
                          <div 
                            key={span.span_id}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              selectedSpan?.span_id === span.span_id 
                                ? 'bg-primary/5 border-l-4 border-l-primary' 
                                : 'hover:bg-muted/30 border-l-4 border-l-transparent'
                            }`}
                            onClick={() => setSelectedSpan(span)}
                          >
                            <div className="font-medium">{span.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <IconClock size={14} />
                                  <span suppressHydrationWarning>{formatDuration(span.duration)}</span>
                            </div>
                            {span.tools_called.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <IconCode size={12} />
                                    <span>{span.tools_called.length} tool{span.tools_called.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                              </div>
                            ))}
                          </div>
                        ))}
                        {spans.length === 0 && (
                          <div className="py-4 text-center text-muted-foreground">
                            No spans available for this trace
                          </div>
                        )}
                      </div>
                    </div>
                  
                    {/* Right Panel - Span Details */}
                    <div className="flex-1 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {selectedSpan ? (
                        <div className="h-full flex flex-col overflow-hidden">
                          <div className="p-4 flex-shrink-0 border-b">
                            <h2 className="text-xl font-semibold">{selectedSpan.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                Duration: {formatDuration(selectedSpan.duration)}
                              </Badge>
                              <Badge variant="outline">
                                ID: {selectedSpan.span_id}
                              </Badge>
                              <Badge variant="outline">
                                Total Tokens: {selectedSpan?.details?.completions[0].total_tokens || "N/A"} 
                              </Badge>
                            </div>
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                              <IconClock size={16} />
                              <span>
                                Start: <span suppressHydrationWarning>{formatTime(selectedSpan.start_time)}</span>
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                End: <span suppressHydrationWarning>{formatTime(selectedSpan.end_time)}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <Tabs defaultValue="completion" className="h-full flex flex-col overflow-hidden">
                              <TabsList className="bg-transparent border-b w-full px-4 rounded-none h-10 justify-start gap-4 flex-shrink-0">
                                <TabsTrigger 
                                  value="completion" 
                                  className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                                >
                                  <span>Span Details</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                                <TabsTrigger 
                                  value="tools" 
                                  className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                                >
                                  <span>Tool Calls</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                                <TabsTrigger 
                                  value="agent" 
                                  className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                                >
                                  <span>Span Info</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                              </TabsList>
                              
                              {/* Tab Content Container - This is where we need to fix scrolling */}
                              <div className="flex-1 overflow-hidden">
                                <TabsContent value="completion" className="h-full p-0 m-0 data-[state=active]:flex flex-col">
                                  <div className="px-4 py-4 pb-16 flex-1 overflow-y-auto scroll-container">
                                    {spanDetailsLoading ? (
                                      <div className="flex items-center justify-center h-32">
                                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                      </div>
                                    ) : selectedSpan?.details ? (
                                      <div className="space-y-6 mb-8">
                                        {/* Input/Prompt section */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                            <IconMessageCircle size={16} />
                                            <h3 className="text-base text-white font-medium">Input</h3>
                                          </div>
                                          {selectedSpan.details.prompts.length > 0 ? (
                                            <div className="space-y-4">
                                              {selectedSpan.details.prompts.map((prompt, index) => (
                                                <div key={index} className="border rounded-md">
                                                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                                                    <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                                      <IconUser size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium">User</span>
                                                  </div>
                                                  <div className="border-t">
                                                    <div>
                                                      <div className="w-full">
                                                        <iframe
                                                          id={`prompt-${prompt.id || index}`}
                                                          srcDoc={`
                                                            <!DOCTYPE html>
                                                            <html>
                                                              <head>
                                                                <style>
                                                                  body {
                                                                    margin: 0;
                                                                    padding: 12px;
                                                                    font-family: monospace;
                                                                    font-size: 12px;
                                                                    white-space: pre-wrap;
                                                                    overflow-y: auto;
                                                                    color:white;
                                                                    box-sizing: border-box;
                                                                  }
                                                                  html, body {
                                                                    height: auto;
                                                                  }
                                                                </style>
                                                                <script>
                                                                  window.onload = function() {
                                                                    sendHeight();
                                                                    
                                                                    // Set up a resize observer to handle dynamic content changes
                                                                    if (window.ResizeObserver) {
                                                                      const resizeObserver = new ResizeObserver(() => {
                                                                        sendHeight();
                                                                      });
                                                                      resizeObserver.observe(document.body);
                                                                    }
                                                                    
                                                                    function sendHeight() {
                                                                      window.parent.postMessage({
                                                                        type: 'resize-iframe',
                                                                        iframeId: '${`prompt-${prompt.id || index}`}',
                                                                        height: document.body.scrollHeight
                                                                      }, '*');
                                                                    }
                                                                  };
                                                                </script>
                                                              </head>
                                                              <body>${prompt.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                            </html>
                                                          `}
                                                          style={{width: "100%", border: "none"}}
                                                          className="min-h-[100px]"
                                                          title="Prompt content"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-muted-foreground">No input data available.</p>
                                          )}
                                        </div>
                                        
                                        {/* Output/Completion section */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                            <IconMessageDots size={16} />
                                            <h3 className="text-base font-medium">Output</h3>
                                          </div>
                                          {selectedSpan.details.completions.length > 0 ? (
                                            <div className="space-y-4">
                                              {selectedSpan.details.completions.map((completion, index) => (
                                                <div key={index} className="border rounded-md">
                                                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                                                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                      <IconRobot size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium">Assistant</span>
                                                  </div>
                                                  <div className="border-t">
                                                    <div>
                                                      <div className="w-full">
                                                        <iframe
                                                          id={`completion-${completion.id || index}`}
                                                          srcDoc={`
                                                            <!DOCTYPE html>
                                                            <html>
                                                              <head>
                                                                <style>
                                                                  body {
                                                                    margin: 0;
                                                                    padding: 12px;
                                                                    font-family: monospace;
                                                                    font-size: 12px;
                                                                    white-space: pre-wrap;
                                                                    overflow-y: auto;
                                                                    color:white;
                                                                    box-sizing: border-box;
                                                                  }
                                                                  html, body {
                                                                    height: auto;
                                                                  }
                                                                </style>
                                                                <script>
                                                                  window.onload = function() {
                                                                    sendHeight();
                                                                    
                                                                    // Set up a resize observer to handle dynamic content changes
                                                                    if (window.ResizeObserver) {
                                                                      const resizeObserver = new ResizeObserver(() => {
                                                                        sendHeight();
                                                                      });
                                                                      resizeObserver.observe(document.body);
                                                                    }
                                                                    
                                                                    function sendHeight() {
                                                                      window.parent.postMessage({
                                                                        type: 'resize-iframe',
                                                                        iframeId: '${`completion-${completion.id || index}`}',
                                                                        height: document.body.scrollHeight
                                                                      }, '*');
                                                                    }
                                                                  };
                                                                </script>
                                                              </head>
                                                              <body>${completion.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                            </html>
                                                          `}
                                                          style={{width: "100%", border: "none"}}
                                                          className="min-h-[100px]"
                                                          title="Completion content"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div>
                                              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                                <IconMessageCircle size={16} />
                                                <h3 className="text-base font-medium">Final Completion</h3>
                                              </div>
                                              <div className="border rounded-md">
                                                <div className="border-t">
                                                  <div>
                                                    <div className="w-full">
                                                      <iframe
                                                        id={`final-completion`}
                                                        srcDoc={`
                                                          <!DOCTYPE html>
                                                          <html>
                                                            <head>
                                                              <style>
                                                                body {
                                                                  margin: 0;
                                                                  padding: 12px;
                                                                  font-family: monospace;
                                                                  font-size: 12px;
                                                                  white-space: pre-wrap;
                                                                  overflow-y: auto;
                                                                  box-sizing: border-box;
                                                                  background-color: #f1f5f9;
                                                                }
                                                                @media (prefers-color-scheme: dark) {
                                                                  body {
                                                                    background-color: #1e293b;
                                                                    color: #f8fafc;
                                                                  }
                                                                }
                                                              </style>
                                                              <script>
                                                                window.onload = function() {
                                                                  sendHeight();
                                                                  
                                                                  // Set up a resize observer to handle dynamic content changes
                                                                  if (window.ResizeObserver) {
                                                                    const resizeObserver = new ResizeObserver(() => {
                                                                      sendHeight();
                                                                    });
                                                                    resizeObserver.observe(document.body);
                                                                  }
                                                                  
                                                                  function sendHeight() {
                                                                    window.parent.postMessage({
                                                                      type: 'resize-iframe',
                                                                      iframeId: '${`final-completion`}',
                                                                      height: document.body.scrollHeight
                                                                    }, '*');
                                                                  }
                                                                };
                                                              </script>
                                                            </head>
                                                            <body>${(selectedSpan?.final_completion || "No completion data available.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                          </html>
                                                        `}
                                                        style={{width: "100%", border: "none"}}
                                                        className="min-h-[100px]"
                                                        title="Final completion content"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                          <IconMessageCircle size={16} />
                                          <h3 className="text-base font-medium">Final Completion</h3>
                                        </div>
                                        <div className="border rounded-md">
                                          <div className="border-t">
                                            <div>
                                              <div className="w-full">
                                                <iframe
                                                  id={`final-completion`}
                                                  srcDoc={`
                                                    <!DOCTYPE html>
                                                    <html>
                                                      <head>
                                                        <style>
                                                          body {
                                                            margin: 0;
                                                            padding: 12px;
                                                            font-family: monospace;
                                                            font-size: 12px;
                                                            white-space: pre-wrap;
                                                            overflow-y: auto;
                                                            box-sizing: border-box;
                                                            background-color: #f1f5f9;
                                                          }
                                                          @media (prefers-color-scheme: dark) {
                                                            body {
                                                              background-color: #1e293b;
                                                              color: #f8fafc;
                                                            }
                                                          }
                                                        </style>
                                                        <script>
                                                          window.onload = function() {
                                                            sendHeight();
                                                            
                                                            // Set up a resize observer to handle dynamic content changes
                                                            if (window.ResizeObserver) {
                                                              const resizeObserver = new ResizeObserver(() => {
                                                                sendHeight();
                                                              });
                                                              resizeObserver.observe(document.body);
                                                            }
                                                            
                                                            function sendHeight() {
                                                              window.parent.postMessage({
                                                                type: 'resize-iframe',
                                                                iframeId: '${`final-completion`}',
                                                                height: document.body.scrollHeight
                                                              }, '*');
                                                            }
                                                          };
                                                        </script>
                                                      </head>
                                                      <body>${(selectedSpan?.final_completion || "No completion data available.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                    </html>
                                                  `}
                                                  style={{width: "100%", border: "none"}}
                                                  className="min-h-[100px]"
                                                  title="Final completion content"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="tools" className="h-full p-0 m-0 data-[state=active]:flex flex-col">
                                  <div className="px-4 py-4 pb-16 flex-1 overflow-y-auto scroll-container">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                      <IconCode size={16} />
                                      <h3 className="text-base font-medium">Tools Called</h3>
                                    </div>
                                    {selectedSpan.tools_called.length === 0 ? (
                                      <p className="text-muted-foreground">No tools were called in this span.</p>
                                    ) : (
                                      <div className="space-y-4 mb-8">
                                        {selectedSpan.tools_called.map((tool: ToolCall, index: number) => (
                                          <div key={index} className="border rounded-md p-4 border-border">
                                            <div className="font-medium">{tool.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Duration: {formatDuration(tool.duration)}
                                            </div>
                                            
                                            <div className="mt-3">
                                              <div className="text-xs font-medium text-muted-foreground mb-1">Arguments:</div>
                                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full max-h-32 scroll-container">
                                                {JSON.stringify(tool.args, null, 2)}
                                              </pre>
                                            </div>
                                            
                                            <div className="mt-3">
                                              <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full max-h-32 scroll-container">
                                                {tool.output}
                                              </pre>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="agent" className="h-full p-0 m-0 data-[state=active]:flex flex-col">
                                  <div className="px-4 py-4 pb-16 flex-1 overflow-y-auto scroll-container">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                      <IconRobot size={16} />
                                      <h3 className="text-base font-medium">Agent Information</h3>
                                    </div>
                                    
                                    <div className="space-y-6 mb-8">
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Agent</h4>
                                        <div className="p-3 bg-muted rounded-md">
                                          <div className="font-medium">{selectedSpan.name}</div>
                                          <div className="text-sm text-muted-foreground mt-1">
                                            Span ID: {selectedSpan.span_id}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Tools Used</h4>
                                        {selectedSpan.tools_called.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No tools were used by this agent.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {selectedSpan.tools_called.map((tool, index) => (
                                              <div key={index} className="p-2 bg-muted/60 rounded-md">
                                                <div className="font-medium">{tool.name}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Duration: {formatDuration(tool.duration)}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Execution Time</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="p-3 bg-muted rounded-md">
                                            <div className="text-xs text-muted-foreground mb-1">Start Time</div>
                                            <div className="text-sm" suppressHydrationWarning>
                                              {formatTime(selectedSpan.start_time)}
                                            </div>
                                          </div>
                                          <div className="p-3 bg-muted rounded-md">
                                            <div className="text-xs text-muted-foreground mb-1">End Time</div>
                                            <div className="text-sm" suppressHydrationWarning>
                                              {formatTime(selectedSpan.end_time)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Related Agents</h4>
                                        {spans.filter(span => span.span_id !== selectedSpan.span_id).length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No other agents in this trace.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {spans
                                              .filter(span => span.span_id !== selectedSpan.span_id)
                                              .map((span) => {
                                                // Determine relationship based on timing
                                                let relationship = "Parallel";
                                                if (span.end_time <= selectedSpan.start_time) {
                                                  relationship = "Preceding";
                                                } else if (span.start_time >= selectedSpan.end_time) {
                                                  relationship = "Following";
                                                }
                                                
                                                return (
                                                  <div 
                                                    key={span.span_id} 
                                                    className="p-2 bg-muted/60 rounded-md flex justify-between items-center cursor-pointer hover:bg-muted"
                                                    onClick={() => setSelectedSpan(span)}
                                                  >
                                                    <div>
                                                      <div className="font-medium">{span.name}</div>
                                                      <div className="text-xs text-muted-foreground">
                                                        Duration: {formatDuration(span.duration)}
                                                      </div>
                                                    </div>
                                                    <div>
                                                      <Badge 
                                                        variant={
                                                          relationship === "Preceding" ? "outline" : 
                                                          relationship === "Following" ? "secondary" : 
                                                          "default"
                                                        }
                                                        className={
                                                          relationship === "Preceding" ? "text-blue-500 bg-blue-500/10" : 
                                                          relationship === "Following" ? "text-green-500 bg-green-500/10" : 
                                                          "text-amber-500 bg-amber-500/10"
                                                        }
                                                      >
                                                        {relationship}
                                                      </Badge>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </TabsContent>
                              </div>
                            </Tabs>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center p-8">
                            <IconArrowLeft size={48} className="text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-medium mb-2">Select a span</h3>
                            <p className="text-muted-foreground">
                              Choose a span from the list to view its details
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            <Card>
              <CardHeader>
                <CardTitle>Trace Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p>The requested trace could not be found.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}



export default TraceDetailPage; 