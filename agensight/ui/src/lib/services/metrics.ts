// Type definitions for API responses
export interface MetricTag {
  name: string;
  value: string;
}

export interface MetricMetadata {
  count: number;
  limit: number;
  offset: number;
  filters: {
    parent_id?: string;
    parent_type?: string;
    metric_name?: string;
    source?: string;
    project_id?: string;
    min_score?: number;
    max_score?: number;
    from_date?: string;
    to_date?: string;
  };
}

export interface MetricLinks {
  span?: string;
  trace?: string;
}

export interface Metric {
  id: string;
  parentId?: string;
  parentType?: string;
  projectId?: string;
  metricName: string;
  score: number;
  reason: string;
  source?: string;
  model?: string;
  modelVersion?: string;
  type?: string;
  tags: string[];
  meta: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  _links?: MetricLinks;
}

export interface MetricsSummaryResponse {
  metrics: Array<{
    metricName: string;
    count: number;
    average_score: number;
    min_score: number;
    max_score: number;
    source?: string;
  }>;
  total_evaluations: number;
  unique_metrics: number;
  reporting_period: {
    from: string;
    to: string;
  };
  filters: {
    metric_name?: string;
    source?: string;
    project_id?: string;
    parent_type?: string;
  };
}

export interface MetricsBatchResponse {
  results: Record<string, Metric>;
  found: number;
  missing: string[];
  total_requested: number;
}

export interface MetricsResponse {
  metrics: Metric[];
  total: number;
}

// Base API URL - using the same as traces.ts
const API_BASE_URL = "http://0.0.0.0:5001/api";

/**
 * Helper function to perform fetch with retry logic
 */
async function fetchWithRetry<T>(url: string, options?: RequestInit): Promise<T> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching from ${url}: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error fetching from ${url}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch from ${url} (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt-1)));
    }
  }
  
  // Unreachable but needed for TypeScript
  throw new Error(`Failed to fetch from ${url} after ${maxRetries} attempts`);
}

/**
 * Get a list of metrics with optional filtering
 */
export async function getMetrics(params?: {
  parent_id?: string;
  parent_type?: string;
  metric_name?: string;
  source?: string;
  project_id?: string;
  min_score?: number;
  max_score?: number;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const url = `${API_BASE_URL}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return fetchWithRetry<any>(url);
}

/**
 * Get a specific metric by ID
 */
export async function getMetricById(metricId: string): Promise<Metric> {
  const url = `${API_BASE_URL}/metrics/${metricId}`;
  return fetchWithRetry<Metric>(url);
}

/**
 * Get all metrics for a specific span
 */
export async function getSpanMetrics(
  spanId: string,
  params?: {
    metric_name?: string;
    min_score?: number;
    max_score?: number;
  }
): Promise<MetricsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const url = `${API_BASE_URL}/span/${spanId}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetchWithRetry<MetricsResponse>(url);
  
  // Ensure we always return the correct format
  if (!response || !response.metrics) {
    return { metrics: [], total: 0 };
  }
  
  return response;
}

/**
 * Get all metrics for a specific trace
 */
export async function getTraceMetrics(
  traceId: string,
  params?: {
    metric_name?: string;
    min_score?: number;
    max_score?: number;
  }
): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const url = `${API_BASE_URL}/trace/${traceId}/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return fetchWithRetry<any>(url);
}

/**
 * Get a summary of metrics with optional filtering
 */
export async function getMetricsSummary(params?: {
  metric_name?: string;
  source?: string;
  project_id?: string;
  parent_type?: string;
  from_date?: string;
  to_date?: string;
}): Promise<MetricsSummaryResponse> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const url = `${API_BASE_URL}/metrics/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return fetchWithRetry<MetricsSummaryResponse>(url);
}

/**
 * Get multiple metrics by their IDs in a single request
 */
export async function getMetricsBatch(metricIds: string[]): Promise<MetricsBatchResponse> {
  const url = `${API_BASE_URL}/metrics/batch`;
  return fetchWithRetry<MetricsBatchResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metric_ids: metricIds }),
  });
}

// Utility function to format a score (0.0 to 1.0) as a percentage
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) {
    return '0.00';
  }
  // Round to 2 decimal places and convert to string
  return String(Math.round(Number(score) * 100) / 100);
}

// Utility to get a color based on score
export function getScoreColor(score: number): string {
  if (score >= 0.8) return 'green';
  if (score >= 0.6) return 'yellow';
  if (score >= 0.4) return 'orange';
  return 'red';
}

export default {
  getMetrics,
  getMetricById,
  getSpanMetrics,
  getTraceMetrics,
  getMetricsSummary,
  getMetricsBatch,
  formatScore,
  getScoreColor,
};