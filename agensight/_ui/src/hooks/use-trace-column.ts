import { useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { z } from "zod";

// Schema definition for our data
export const schema = z.object({
  id: z.number(),
  ended_at: z.any(),
  name: z.string(),
  session_id: z.string(),
  started_at: z.any(),
  trace_input: z.string(),
  trace_output: z.string(),
  metadata: z.any(),
  total_tokens: z.number(),
  duration: z.any(),
});

export type TraceItem = z.infer<typeof schema>;

export function useTraceColumn({
  data,
  columns,
}: {
  data: TraceItem[];
  columns: ColumnDef<TraceItem>[];
}) {
  // State for table features
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Memoize the data IDs for drag and drop functionality
  const dataIds = useMemo(() => data?.map(({ id }) => id) || [], [data]);

  // Initialize the table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return {
    table,
    dataIds,
    rowSelection,
    columnVisibility,
    columnFilters,
    sorting,
    pagination,
  };
} 