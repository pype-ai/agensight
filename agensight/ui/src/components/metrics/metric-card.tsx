"use client";

import React, { useRef, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/lib/services/metrics";
import { IconInfoCircle, IconChevronDown } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MetricCardProps {
  metric: Metric;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setHasOverflow(
          contentRef.current.scrollHeight > contentRef.current.clientHeight
        );
      }
    };
    
    // Check initially and on resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [metric.reason]);

  return (
    <div className="flex items-center justify-between p-2 rounded border mb-2">
      <div className="flex items-center gap-2">
        <div className="font-medium text-sm">{metric.metricName}</div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconInfoCircle size={16} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">
              <div className="relative">
                <p 
                  ref={contentRef}
                  className="text-xs leading-tight max-h-[120px] overflow-y-auto pr-2 custom-scrollbar-always-visible"
                >
                  {metric.reason}
                </p>
                {hasOverflow && (
                  <div className="absolute bottom-0 right-0 bg-gradient-to-t from-background to-transparent h-6 w-full pointer-events-none flex justify-center">
                    <IconChevronDown size={12} className="text-muted-foreground absolute bottom-0" />
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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
    </div>
  );
};

export default MetricCard; 