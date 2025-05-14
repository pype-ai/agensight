'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TraceDetailPage from '@/components/trace-detail-page';


export default function TraceClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const name = searchParams.get('name');
  const latency = searchParams.get('latency');
  const total_tokens = searchParams.get('total_tokens');

  return (
        <TraceDetailPage id={id as string} total_tokens={Number(total_tokens)} name={name as string} latency={Number(latency)} router={router}/>
  );
} 