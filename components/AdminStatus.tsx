import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { getAdminToken } from '../services/authService';

interface StatusCheck {
  name: string;
  status: 'loading' | 'ok' | 'error';
  message?: string;
}

export const AdminStatus: React.FC = () => {
  const [checks, setChecks] = useState<StatusCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const runChecks = async () => {
    setIsChecking(true);
    const results: StatusCheck[] = [];

    // Check 1: Admin Token
    const token = getAdminToken();
    results.push({
      name: 'Admin Token',
      status: token ? 'ok' : 'error',
      message: token ? 'Geldig token aanwezig' : 'Geen token - log opnieuw in'
    });
    setChecks([...results]);

    // Check 2: Admin API
    try {
      const apiBase = import.meta.env.DEV ? 'http://localhost:3001/api' : `${window.location.origin}/api`;
      const response = await fetch(`${apiBase}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'list-students' })
      });
      const data = await response.json();

      results.push({
        name: 'Admin API',
        status: data.success ? 'ok' : 'error',
        message: data.success ? 'API bereikbaar' : (data.error || 'API fout')
      });
    } catch (e) {
      results.push({
        name: 'Admin API',
        status: 'error',
        message: 'Kan API niet bereiken'
      });
    }
    setChecks([...results]);

    // Check 3: Supabase Database (via questions)
    try {
      const { supabase } = await import('../services/supabaseService');
      if (supabase) {
        const { error } = await supabase.from('questions').select('id').limit(1);
        results.push({
          name: 'Supabase Database',
          status: error ? 'error' : 'ok',
          message: error ? error.message : 'Database verbonden'
        });
      } else {
        results.push({
          name: 'Supabase Database',
          status: 'error',
          message: 'Supabase niet geconfigureerd'
        });
      }
    } catch (e) {
      results.push({
        name: 'Supabase Database',
        status: 'error',
        message: 'Database connectie mislukt'
      });
    }
    setChecks([...results]);

    // Check 4: Student count
    try {
      const apiBase = import.meta.env.DEV ? 'http://localhost:3001/api' : `${window.location.origin}/api`;
      const response = await fetch(`${apiBase}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'list-students' })
      });
      const data = await response.json();

      if (data.success) {
        const count = data.students?.length || 0;
        results.push({
          name: 'Studenten',
          status: 'ok',
          message: `${count} student${count === 1 ? '' : 'en'} in database`
        });
      }
    } catch {
      // Skip if failed
    }
    setChecks([...results]);

    setIsChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBg = (status: StatusCheck['status']) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'ok':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Systeem Status</h2>
          <p className="text-slate-500 text-sm mt-1">Overzicht van alle actieve systemen</p>
        </div>
        <Button
          onClick={runChecks}
          disabled={isChecking}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          Vernieuwen
        </Button>
      </div>

      <div className="grid gap-4">
        {checks.map((check, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border ${getStatusBg(check.status)} transition-all`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(check.status)}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{check.name}</h3>
                {check.message && (
                  <p className="text-sm text-slate-600 mt-0.5">{check.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {checks.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Systemen controleren...
          </div>
        )}
      </div>

      {!isChecking && checks.every(c => c.status === 'ok') && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-xl text-center">
          <p className="text-green-800 font-semibold">Alle systemen werken correct!</p>
        </div>
      )}

      {!isChecking && checks.some(c => c.status === 'error') && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-xl text-center">
          <p className="text-red-800 font-semibold">Er zijn problemen gedetecteerd</p>
        </div>
      )}
    </div>
  );
};
