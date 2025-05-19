import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatScore, getScoreColor } from '@/lib/services/metrics'
import { useMetricsColumn } from "@/hooks/use-metrics-column"
import { MetricsTablePagination } from "./metrics-table-pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function MetricsTable() {
  const {
    metrics,
    isLoading,
    pageCount,
    pageSize,
    pageIndex,
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useMetricsColumn()

  return (
    <div className="border rounded-lg flex flex-col bg-card/50 backdrop-blur-sm h-[550px] pb-0">
      <ScrollArea className="h-[calc(100%-56px)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted border-b">
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[200px] text-base font-semibold px-4 py-3">Metric Name</TableHead>
              <TableHead className="w-[100px] text-base font-semibold px-4 py-3">Score</TableHead>
              <TableHead className="w-[300px] text-base font-semibold px-4 py-3">Reason</TableHead>
              <TableHead className="w-[150px] text-base font-semibold px-4 py-3">Parent ID</TableHead>
              <TableHead className="w-[150px] text-base font-semibold px-4 py-3">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : !metrics || metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-base font-medium text-muted-foreground">No metrics found</p>
                    <p className="text-sm text-muted-foreground/80">
                      Run some evaluations to see metrics here
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              metrics.map((metric) => (
                <TableRow 
                  key={metric.id}
                  className="hover:bg-primary/5 even:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-4 py-3 text-base font-medium">{metric.metricName}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-medium bg-${getScoreColor(metric.score)}-100/80 text-${getScoreColor(metric.score)}-900 dark:bg-${getScoreColor(metric.score)}-900/30 dark:text-${getScoreColor(metric.score)}-400`}>
                      {formatScore(metric.score)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 w-[300px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-base text-muted-foreground truncate max-w-[300px]">
                            {metric.reason}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[400px] whitespace-normal">
                          <p className="text-sm leading-tight">{metric.reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-sm text-muted-foreground">{metric.parentId}</TableCell>
                  <TableCell className="px-4 py-3 text-base text-muted-foreground">
                    {new Date(metric.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <MetricsTablePagination 
        pageCount={pageCount}
        pageSize={pageSize}
        pageIndex={pageIndex}
        setPageIndex={setPageIndex}
        setPageSize={setPageSize}
      />
    </div>
  )
} 