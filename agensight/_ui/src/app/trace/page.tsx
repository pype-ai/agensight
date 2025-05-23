'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TraceDetailPage from '@/components/trace-details/trace-detail-page';

const TraceClient = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const name = searchParams.get('name');
  const latency = searchParams.get('latency');
  const total_tokens = searchParams.get('total_tokens');

  return (
    <TraceDetailPage
      id={id as string}
      total_tokens={Number(total_tokens)}
      name={name as string}
      latency={Number(latency)}
      router={router}
    />
  );
};

export default function TracePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TraceClient />
    </Suspense>
  );
}
