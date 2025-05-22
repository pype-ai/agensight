"use client"

import { getAllSessions } from '@/lib/services/traces';
import { useQuery } from '@tanstack/react-query';
import React from 'react'
import { ReactTable } from '@/components/ReactTable';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

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

  const handleRowClick = (row: any) => {
    const { id, session_name, user_id } = row.original;
    const params = new URLSearchParams({
      sessionId: id,
      session_name: session_name || '',
      user_id: user_id || '',
    });
    router.push(`/session?${params.toString()}`);
  };

  console.log({ sessionsData });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'session_name',
      header: 'Session Name',
      cell: ({ getValue }) => getValue() || <span className="italic text-gray-400">-</span>,
    },
    {
      accessorKey: 'id',
      header: 'Session ID',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
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
      cell: ({ getValue }) => getValue() || <span className="italic text-gray-400">-</span>,
    },
  ];

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-lg text-muted-foreground">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>
      <ReactTable
        columns={columns}
        data={sessionsData || []}
        onRowClick={handleRowClick}
        page={page}
        pageSize={pageSize}
      />
    </div>
  )
}

