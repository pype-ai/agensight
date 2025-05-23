import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  Row,
} from '@tanstack/react-table';

interface ReactTableProps<TData extends object> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
  page?: number;
  pageSize?: number;
  onPaginationChange?: (page: number) => void;
}

export function ReactTable<TData extends object>({
  columns,
  data,
  onRowClick,
  className = '',
  page,
  pageSize,
  onPaginationChange,
}: ReactTableProps<TData>) {
  // If external pagination is provided, slice the data
  const paginatedData =
    typeof page === 'number' && typeof pageSize === 'number'
      ? data.slice(page * pageSize, (page + 1) * pageSize)
      : data;

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-background border border-muted dark:border-gray-700 rounded-lg">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-muted dark:bg-muted/60">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-2 text-left text-gray-700 dark:text-gray-200">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-t border-muted dark:border-gray-700 hover:bg-primary/5 even:bg-muted/30 cursor-pointer"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={table.getAllLeafColumns().length} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                No data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 