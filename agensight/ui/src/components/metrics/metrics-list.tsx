"use client";

import React from "react";
import { MetricCard } from "./metric-card";
import { Metric } from "@/lib/services/metrics";
import { IconChartBar } from "@tabler/icons-react";

export interface MetricsListProps {
  metrics: Metric[];
  isLoading?: boolean;
}

export const MetricsList: React.FC<MetricsListProps> = ({
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground text-sm">
        <p>No metrics available for this span</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">      
      <div className="overflow-y-auto max-h-[200px]">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
};

export default MetricsList; 