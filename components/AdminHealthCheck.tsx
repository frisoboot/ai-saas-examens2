import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Database,
  Shield,
  HardDrive,
  Bot,
  CreditCard,
  Settings,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from './Button';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  error?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'degraded':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'unhealthy':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <HelpCircle className="w-5 h-5 text-slate-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    case 'degraded':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'unhealthy':
      return 'bg-red-50 border-red-200 text-red-700';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-600';
  }
};

const getServiceIcon = (serviceName: string) => {
  if (serviceName.includes('Database')) return <Database className="w-5 h-5" />;
  if (serviceName.includes('Auth')) return <Shield className="w-5 h-5" />;
  if (serviceName.includes('Storage')) return <HardDrive className="w-5 h-5" />;
  if (serviceName.includes('Gemini') || serviceName.includes('xAI')) return <Bot className="w-5 h-5" />;
  if (serviceName.includes('Mollie') || serviceName.includes('Payment')) return <CreditCard className="w-5 h-5" />;
  if (serviceName.includes('Environment') || serviceName.includes('Config')) return <Settings className="w-5 h-5" />;
  return <Activity className="w-5 h-5" />;
};

const formatResponseTime = (ms?: number) => {
  if (ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const AdminHealthCheck: React.FC = () => {
  const { session } = useAuth();
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealthStatus = useCallback(async () => {
    if (!session?.access_token) {
      setError('Niet ingelogd');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/health-check', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: HealthCheckResponse = await response.json();
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err: any) {
      console.error('Health check failed:', err);
      setError(err.message || 'Kon status niet ophalen');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Initial fetch
  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHealthStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealthStatus]);

  const getOverallStatusMessage = () => {
    if (!healthData) return '';
    switch (healthData.status) {
      case 'healthy':
        return 'Alle systemen werken correct';
      case 'degraded':
        return 'Sommige systemen hebben problemen';
      case 'unhealthy':
        return 'Kritieke systemen zijn niet beschikbaar';
      default:
        return 'Status onbekend';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Activity className="w-7 h-7 text-indigo-600" />
              Systeem Status
            </h2>
            <p className="text-slate-500 mt-1">
              Overzicht van alle backend services en hun status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Auto-refresh (30s)
            </label>
            <Button
              onClick={fetchHealthStatus}
              disabled={isLoading}
              variant="secondary"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Vernieuwen
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Fout bij ophalen status</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !healthData && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="ml-3 text-slate-600">Status ophalen...</span>
        </div>
      )}

      {/* Health Data */}
      {healthData && (
        <>
          {/* Overall Status Card */}
          <div
            className={`mb-6 p-6 rounded-xl border-2 ${
              healthData.status === 'healthy'
                ? 'bg-emerald-50 border-emerald-200'
                : healthData.status === 'degraded'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${
                    healthData.status === 'healthy'
                      ? 'bg-emerald-100'
                      : healthData.status === 'degraded'
                      ? 'bg-amber-100'
                      : 'bg-red-100'
                  }`}
                >
                  {getStatusIcon(healthData.status)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {healthData.status === 'healthy' && 'Systeem Gezond'}
                    {healthData.status === 'degraded' && 'Verminderde Prestaties'}
                    {healthData.status === 'unhealthy' && 'Systeem Problemen'}
                  </h3>
                  <p className="text-slate-600">{getOverallStatusMessage()}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">{healthData.summary.healthy}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">{healthData.summary.degraded}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">{healthData.summary.unhealthy}</span>
                  </div>
                </div>
                {lastChecked && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    Laatst gecheckt: {lastChecked.toLocaleTimeString('nl-NL')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData.services.map((service, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${getStatusColor(service.status)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/50 rounded-lg">
                      {getServiceIcon(service.name)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{service.name}</h4>
                      <p className="text-sm opacity-80 mt-0.5">{service.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.responseTime !== undefined && (
                      <span className="text-xs font-mono bg-white/50 px-2 py-1 rounded">
                        {formatResponseTime(service.responseTime)}
                      </span>
                    )}
                    {getStatusIcon(service.status)}
                  </div>
                </div>

                {/* Details */}
                {service.details && Object.keys(service.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(service.details).map(([key, value]) => (
                        <span
                          key={key}
                          className="text-xs bg-white/50 px-2 py-1 rounded"
                        >
                          <span className="opacity-70">{key}:</span>{' '}
                          <span className="font-medium">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Status Legenda
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">Healthy - Werkt correct</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-slate-600">Degraded - Langzaam/beperkt</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-slate-600">Unhealthy - Niet beschikbaar</span>
              </div>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Unknown - Niet geconfigureerd</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
