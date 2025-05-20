"use client";

import React, { useState, useEffect } from "react";
import { Span } from "@/types/type";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconClock, IconChartBar, IconCode } from "@tabler/icons-react";
import SpanDetailsView from "./span-details";
import { MetricsList } from "../metrics/metrics-list";
import { Metric, MetricsResponse } from "@/lib/services/metrics";

export interface SpanDetailsContainerProps {
  span: Span | null;
  isSpanLoading: boolean;
  metrics: MetricsResponse | undefined | null;
  isMetricsLoading: boolean;
  formatDuration: (duration: number) => string;
  formatTime: (timestamp: number) => string;
}

export const SpanDetailsContainer: React.FC<SpanDetailsContainerProps> = ({
  span,
  isSpanLoading,
  metrics,
  isMetricsLoading,
  formatDuration,
  formatTime,
}) => {
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  // Close metrics dropdown when no metrics are available
  useEffect(() => {
    if (!isMetricsLoading && (!metrics?.metrics || metrics.metrics.length === 0)) {
      setMetricsExpanded(false);
    }
  }, [metrics, isMetricsLoading]);

  if (!span) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <IconChartBar size={24} className="text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-medium mb-2">Select a span</h3>
          <p className="text-muted-foreground">
            Choose a span from the list to view its details and metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex-shrink-0 border-b">
        <h2 className="text-xl font-semibold">{span.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">
            Duration: {formatDuration(span.duration)}
          </Badge>
          <Badge variant="outline">
            ID: {span.span_id}
          </Badge>
          <Badge variant="outline">
            Total Tokens: {span?.details?.completions[0]?.total_tokens || "N/A"} 
          </Badge>
        </div>
        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
          <IconClock size={16} />
          <span>
            Start: <span suppressHydrationWarning>{formatTime(span.start_time)}</span>
          </span>
          <span className="mx-2">•</span>
          <span>
            End: <span suppressHydrationWarning>{formatTime(span.end_time)}</span>
          </span>
        </div>
      </div>
      
      {/* Main content - Two panels */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Span I/O */}
        <div className="flex-1 overflow-y-auto p-4 border-r">
          <SpanDetailsView 
            span={span} 
            isLoading={isSpanLoading} 
          />
        </div>
        
        {/* Right Panel - Metrics and Tools */}
        <div className="w-2/5 overflow-y-auto p-4">
          {/* Metrics Section */}
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer pb-2 border-b"
              onClick={() => setMetricsExpanded(!metricsExpanded)}
            >
              <div className="flex items-center gap-2">
                <IconChartBar size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-medium">Metrics {metrics?.metrics?.length ? `(${metrics.metrics.length})` : ''}</h3>
              </div>
              <div className={`transform transition-transform ${metricsExpanded ? 'rotate-90' : ''}`}>▶</div>
            </div>
            
            {metricsExpanded && (
              <div className="mt-2 mb-6">
                <MetricsList 
                  metrics={metrics?.metrics || []} 
                  isLoading={isMetricsLoading} 
                />
              </div>
            )}
          </div>
          
          {/* Tools Called Section */}
          {span.tools_called && span.tools_called.length > 0 && (
            <div className="mt-4">
              <div 
                className="flex items-center justify-between cursor-pointer pb-2 border-b"
                onClick={() => setToolsExpanded(!toolsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <IconCode size={16} className="text-muted-foreground" />
                  <h3 className="text-sm font-medium">Tools Called ({span.tools_called.length})</h3>
                </div>
                <div className={`transform transition-transform ${toolsExpanded ? 'rotate-90' : ''}`}>▶</div>
              </div>
              
              {toolsExpanded && (
                <div className="mt-2 overflow-y-auto" style={{ maxHeight: "300px" }}>
                  {span.tools_called.map((tool, index) => (
                    <div key={index} className="border rounded-md p-3 mb-2">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{tool.name}</div>
                        <Badge>{formatDuration(tool.duration)}</Badge>
                      </div>
                      
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Arguments:</div>
                          <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24 scroll-container">
                            {JSON.stringify(tool.args, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                          <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24 scroll-container">
                            {tool.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpanDetailsContainer; 