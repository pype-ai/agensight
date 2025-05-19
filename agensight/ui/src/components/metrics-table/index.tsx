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
import Image from "next/image"

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
    <div className="border rounded-lg flex flex-col  backdrop-blur-sm h-[550px] pb-0">
      <ScrollArea className="h-[calc(100%-56px)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted border-b">
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[150px] text-base font-semibold px-4 py-3 text-left whitespace-nowrap">Parent ID</TableHead>
              <TableHead className="w-[150px] text-base font-semibold px-4 py-3 text-left whitespace-nowrap">Created At</TableHead>
              <TableHead className="w-[200px] text-base font-semibold px-4 py-3 text-left whitespace-nowrap">Metric Name</TableHead>
              <TableHead className="w-[100px] text-base font-semibold px-4 py-3 text-left whitespace-nowrap">Score</TableHead>
              <TableHead className="w-[300px] text-base font-semibold px-4 py-3 text-left whitespace-nowrap">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-[550px] text-center">
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-[500px] text-center">
                  <div className="flex items-center justify-center h-full">
                    <div>
                      <Image src="/pype-logo.png" alt="PYPE Logo" width={100} height={100} className="h-12 w-20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No metrics available</h3>
                      <p className="text-muted-foreground mt-2">
                        Metrics data will appear here when you run evaluations
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              metrics.map((metric) => (
                <TableRow 
                  key={metric.id}
                  className="hover:bg-primary/5 even:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-4 py-3 font-mono text-sm text-muted-foreground whitespace-nowrap">{metric.parentId}</TableCell>
                  <TableCell className="px-4 py-3 text-base text-muted-foreground whitespace-nowrap">
                    {new Date(metric.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-base font-medium whitespace-nowrap">{metric.metricName}</TableCell>
                  <TableCell className="px-4 py-3 text-base whitespace-nowrap">
                    {formatScore(metric.score)}
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