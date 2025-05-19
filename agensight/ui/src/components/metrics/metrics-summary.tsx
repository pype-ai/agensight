"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/lib/services/metrics";
import { IconChartBar } from "@tabler/icons-react";

export interface MetricsSummaryProps {
  metrics: Metric[];
  isLoading?: boolean;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <IconChartBar size={16} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading metrics...</span>
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-3 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconChartBar size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-medium">Metrics</h3>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-md border"
          >
            <span className="text-xs font-medium mr-2">{metric.metricName}:</span>
            <Badge
              variant="outline"
              className={
                metric.score >= 0.7 ? "bg-green-500/10 text-green-500" :
                metric.score >= 0.5 ? "bg-yellow-500/10 text-yellow-500" :
                "bg-red-500/10 text-red-500"
              }
            >
              {(metric.score * 100).toFixed(0)}%
            </Badge>
            <span
              className="inline-block ml-1 cursor-help text-muted-foreground hover:text-foreground"
              title={metric.reason}
            >
              ℹ️
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsSummary; 