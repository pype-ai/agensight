import { useState, useEffect } from "react"
import { getMetrics, Metric } from "@/lib/services/metrics"

export function useMetricsColumn() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageCount, setPageCount] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)
  const [sorting, setSorting] = useState<any[]>([])
  const [columnFilters, setColumnFilters] = useState<any[]>([])

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      try {
        const response = await getMetrics({
          limit: pageSize,
          offset: pageIndex * pageSize,
          metric_name: columnFilters.find((filter) => filter.id === "metricName")?.value,
        })
        
        if (!response || !response.metrics) {
          console.warn("Invalid response from metrics API")
          setMetrics([])
          setPageCount(1)
          return
        }

        setMetrics(response.metrics)
        setPageCount(Math.ceil(response.total / pageSize))
      } catch (error) {
        console.error("Error fetching metrics:", error)
        setMetrics([])
        setPageCount(1)
      }
      setIsLoading(false)
    }

    fetchMetrics()
  }, [pageIndex, pageSize, columnFilters])

  return {
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
  }
} 