'use client';

import {
  getAllSessions,
  getSingleSessionTraces,
  getSpans,
} from '@/lib/services/traces';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useMemo } from 'react';
import { ReactTable } from '@/components/ReactTable';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IconInfoCircle } from '@tabler/icons-react';
import SessionDetailsSheet from '@/components/session/session-details-sheet';
import { useState, useEffect } from 'react';

export default function Sessions() {
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['config-sessions'],
    queryFn: getAllSessions,
  });

  const router = useRouter();
  const [page, setPage] = React.useState(0);
  const pageSize = 10;
  const totalRows = sessionsData?.length || 0;
  const totalPages = Math.ceil(totalRows / pageSize);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'session_name',
        header: 'Session Name',
        cell: ({ getValue }) =>
          getValue() || <span className="italic text-gray-400">-</span>,
      },
      {
        accessorKey: 'id',
        header: 'Session ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: 'Started At',
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? new Date(Number(value) * 1000).toLocaleString() : '-';
        },
      },
      {
        accessorKey: 'user_id',
        header: 'User ID',
        cell: ({ getValue }) =>
          getValue() || <span className="italic text-gray-400">-</span>,
      },
    ],
    []
  );

  // Metrics placeholder data
  const metrics = [
    {
      label: 'Total Cost',
      value: '-',
      tooltip: 'Total cost incurred for this period (placeholder).',
    },
    {
      label: 'Tokens Generated',
      value: '-',
      tooltip: 'Total number of tokens generated (placeholder).',
    },
    {
      label: 'Fail Rate',
      value: '-',
      tooltip: 'Percentage of failed events (placeholder).',
    },
    {
      label: 'Total Events',
      value: '-',
      tooltip: 'Total number of events in this period (placeholder).',
    },
  ];

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-lg text-muted-foreground">
          Loading sessions...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>
      {/* Metrics summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, idx) => (
          <div
            key={metric.label}
            className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3"
          >
            <span className="font-medium text-sm">{metric.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-help">
                    <IconInfoCircle
                      size={16}
                      className="text-muted-foreground"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{metric.tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="ml-auto font-mono text-base">{metric.value}</span>
          </div>
        ))}
      </div>
      <ReactTable
        columns={columns}
        data={sessionsData || []}
        onRowClick={(row) => {
          setSelectedSession(row);
          setSheetOpen(true);
        }}
      />
      {/* Sidesheet for session details */}
      <SessionDetailsSheet
        session={selectedSession}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
      />
    </div>
  );
}
