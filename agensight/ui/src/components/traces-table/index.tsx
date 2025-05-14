"use client"

import React, { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Row, flexRender } from "@tanstack/react-table";
import { CSS } from "@dnd-kit/utilities";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { TraceItem, useTraceColumn } from "@/hooks/use-trace-column";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { columns } from "./columns";

// The DraggableRow component for sortable tables
function DraggableRow({ row, onRowClick }: { row: Row<TraceItem>; onRowClick: (id: string | number,name: string,latency: string,total_tokens: string) => void }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });


  const latency = Number(row.original.ended_at) - Number(row.original.started_at);
  const handleRowClick = () => {
    onRowClick(row.original.id,row.original.name,latency.toFixed(2).toString(),row.original.total_tokens.toString());
  };

  return (
    <tr
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={cn(
        "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80",
        "hover:bg-primary/5 even:bg-muted/30 transition-colors cursor-pointer",
        isDragging && "shadow-lg scale-[1.01] ring-2 ring-primary rounded-xl"
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      onClick={handleRowClick}
      tabIndex={0}
    >
      {row.getVisibleCells().map((cell, i) => (
        <td
          key={cell.id}
          className={cn(
            "px-4 py-3 align-middle whitespace-nowrap overflow-hidden text-base border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            i === 0 && "sticky left-0 z-10 bg-background"
          )}
          style={{ 
            width: cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined,
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export function TracesTable({
  data: initialData,
}: {
  data: TraceItem[];
}) {
  const [data, setData] = useState(() => initialData);
  
  // Initialize table with the useTraceColumn hook, passing both data and columns
  const { table } = useTraceColumn({
    data,
    columns,
  });

  // Ensure pagination is enabled
  React.useEffect(() => {
    table.setPageSize(10);
  }, [table]);

  // Setup sensors for drag and drop
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  // Handle drag end events
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = data.findIndex(item => item.id === active.id);
        const newIndex = data.findIndex(item => item.id === over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  const router = useRouter();

  // Handle row click with optimizations for smooth navigation
  const handleRowClick = (traceId: string | number,name: string,latency: string,total_tokens: string) => {
    // Store current scroll position and filter state in sessionStorage for back navigation
    sessionStorage.setItem('tracesTableScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('tracesTableState', JSON.stringify({
      pagination: table.getState().pagination,
      sorting: table.getState().sorting,
      columnFilters: table.getState().columnFilters
    }));
    
    // Use shallow routing to avoid full page refresh
    router.push(`/trace?id=${traceId}&name=${name}&latency=${latency}&total_tokens=${total_tokens}`, { scroll: false });
  };

  // Restore table state from session storage on component mount
  React.useEffect(() => {
    const savedState = sessionStorage.getItem('tracesTableState');
    if (savedState) {
      try {
        const { pagination, sorting, columnFilters } = JSON.parse(savedState);
        if (pagination) table.setPagination(pagination);
        if (sorting) table.setSorting(sorting);
        if (columnFilters) table.setColumnFilters(columnFilters);
      } catch (e) {
        console.error('Error restoring table state:', e);
      }
    }
    
    // Restore scroll position
    const scrollPosition = sessionStorage.getItem('tracesTableScrollPosition');
    if (scrollPosition) {
      window.scrollTo(0, parseInt(scrollPosition));
    }
  }, [table]);

  return (
    <Tabs
      defaultValue="outline"
      className="w-full h-full flex flex-col"
    >
      <TabsContent
        value="outline"
        className="relative flex flex-col h-full"
      >
          <div className="flex flex-col w-full h-full">
            {/* Table container with sticky header */}
            <div className="w-full flex-1 overflow-hidden flex flex-col">
              {/* Outer container that enables scrolling */}
              <div className="w-full flex-1 overflow-auto">
                <div className="inline-block min-w-full">
                  <div className="relative">
                    {/* Sticky header */}
                    <div className="sticky top-0 z-10 bg-muted border-b">
                      <table className="min-w-full table-fixed border-separate border-spacing-0">
                        <thead>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map((header, i) => (
                                <th
                                  key={header.id}
                                  scope="col"
                                  className={cn(
                                    "text-base font-semibold px-4 py-3 text-left whitespace-nowrap border-b bg-muted/60",
                                    i === 0 && "sticky left-0 z-20 bg-muted"
                                  )}
                                  style={{ 
                                    width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined,
                                  }}
                                  tabIndex={0}
                                >
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                      )}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                      </table>
                    </div>

                    {/* Table body */}
                    <table className="min-w-full table-fixed border-separate border-spacing-0">
                      <tbody className="bg-background">
                        {table.getRowModel().rows?.length ? (
                          <SortableContext
                            items={data.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {table.getRowModel().rows.map((row) => (
                              <DraggableRow
                                key={row.id}
                                row={row}
                                onRowClick={handleRowClick}
                              />
                            ))}
                          </SortableContext>
                        ) : (
                          <tr>
                            <td
                              colSpan={table.getAllColumns().length}
                              className="h-24 text-center border-b text-muted-foreground"
                            >
                              <span className="inline-flex items-center gap-2">

                                No results found.
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pagination footer - make it sticky at the bottom */}
          <div className="bg-background py-2 px-4 flex-shrink-0 sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8 ml-auto">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rows-per-page" className="text-base font-medium">
                    Rows per page
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger size="sm" className="w-20 text-base" id="rows-per-page">
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`} className="text-base">
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-center text-base font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <IconChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <IconChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
      </TabsContent>
    </Tabs>
  );
}