import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { IconGripVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { TraceItem } from "@/hooks/use-trace-column";

// Create a separate component for the drag handle
export function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

export const columns: ColumnDef<TraceItem>[] = [
  {
    accessorKey: "id",
    header: "Id",
    cell: ({ row }) => (
      <div className="w-full text-base overflow-hidden text-ellipsis">
        <div className="truncate max-w-[150px]" title={row.original.id.toString()}>
          {row.original.id}
        </div>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => (
      <div className="w-full text-base overflow-hidden text-ellipsis">
        <div className="truncate">
          {new Date(row.original.started_at * 1000).toLocaleString()}
        </div>
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="w-full text-base overflow-hidden text-ellipsis">
        <div className="truncate">
          {row.original.name}
        </div>
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "latency",
    header: "Latency",
    cell: ({ row }) => {
      const timeDifferenceSec = Number(row.original.ended_at) - Number(row.original.started_at);
      return (
        <div className="w-full text-base overflow-hidden text-ellipsis">
          <div className="truncate">
            {(timeDifferenceSec.toFixed(2))}s
          </div>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "tokens",
    header: "Total Tokens",
    cell: ({ row }) => {
      return (
        <div className="w-full text-base overflow-hidden text-ellipsis">
          <div className="truncate">
            {row.original.total_tokens}
          </div>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "metadata",
    header: "Metadata",
    cell: ({ row }) => {
      try {
        const metadata = JSON.parse(row.original.metadata);
        const priorityKeys = ["status", "priority", "user_id"];
        const keysToShow = Object.keys(metadata)
          .filter(key => priorityKeys.includes(key))
          .slice(0, 3);
        
        if (keysToShow.length === 0) {
          return (
            <div className="w-full text-sm text-muted-foreground overflow-hidden text-ellipsis px-2">
              No metadata
            </div>
          );
        }
        
        return (
          <div className="w-full text-sm overflow-hidden px-2">
            <div className="flex flex-wrap gap-1">
              {keysToShow.map(key => (
                <div key={key} className="text-xs bg-muted px-2 py-1 rounded">
                  {key}: {String(metadata[key])}
                </div>
              ))}
            </div>
          </div>
        );
      } catch (e) {
        return (
          <div className="w-full text-sm text-muted-foreground overflow-hidden text-ellipsis px-2">
            Invalid metadata
          </div>
        );
      }
    },
    size: 220,
  },
]; 