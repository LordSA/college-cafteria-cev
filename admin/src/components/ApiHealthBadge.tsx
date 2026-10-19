'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Activity, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
}

export function ApiHealthBadge() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as HealthData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-1.5 text-xs text-slate-300 shadow-sm backdrop-blur-sm">
      <span className="flex items-center gap-1.5 font-medium text-slate-400">
        <Activity className="h-3.5 w-3.5 text-slate-400" />
        API Status:
      </span>

      {loading ? (
        <span className="flex items-center gap-1 text-slate-400">
          <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
          Checking...
        </span>
      ) : error ? (
        <span className="flex items-center gap-1 font-medium text-rose-400" title={`Failed to reach ${apiUrl}/health (${error})`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Unreachable ({apiUrl})
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Operational ({data?.service} v{data?.version})
        </span>
      )}
    </div>
  );
}
