import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  LogOut,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from './Button';
import { dbStudents, supabase } from '../services/supabaseService';
import { StudentProfile } from '../types';

interface AdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
  onBackToStudent: () => void;
}

interface Subscription {
  id: string;
  user_email: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'payment_failed';
  trial_start?: string;
  trial_end?: string;
  created_at: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminEmail,
  onLogout,
  onBackToStudent
}) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'subscriptions'>('students');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Laad studenten
      const studentsData = await dbStudents.getAll();
      setStudents(studentsData);

      // Haal auth token voor API call
      const session = supabase ? await supabase.auth.getSession() : null;
      const token = session?.data?.session?.access_token;

      if (token) {
        // Laad subscriptions via API (server-side)
        const subResponse = await fetch('/api/admin/subscriptions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscriptions(subData.subscriptions || []);
        }
      }
    } catch (error) {
      console.error('Fout bij laden admin data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Actief
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" /> Trial
          </span>
        );
      case 'cancelled':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <XCircle className="w-3 h-3" /> {status === 'cancelled' ? 'Geannuleerd' : 'Verlopen'}
          </span>
        );
      case 'payment_failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> Betaling mislukt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="text-sm text-gray-500">{adminEmail}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onBackToStudent}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Student view
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                <p className="text-sm text-gray-500">Studenten</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {subscriptions.filter(s => s.status === 'active' || s.status === 'trial').length}
                </p>
                <p className="text-sm text-gray-500">Actieve abonnementen</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {subscriptions.filter(s => s.status === 'trial').length}
                </p>
                <p className="text-sm text-gray-500">In trial periode</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-100">
            <div className="flex gap-1 p-2">
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'students'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Studenten
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                Abonnementen
              </button>
              <div className="flex-1" />
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : activeTab === 'students' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Naam</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Niveau</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Geen studenten gevonden
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.name} className="hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-gray-600">{student.email || '-'}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {student.level}
                            </span>
                          </td>
                          <td className="py-3">
                            {student.isActive !== false ? (
                              <span className="text-green-600 text-sm">Actief</span>
                            ) : (
                              <span className="text-gray-400 text-sm">Inactief</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Aangemaakt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          Geen abonnementen gevonden
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="py-3 text-gray-900">{sub.user_email}</td>
                          <td className="py-3">{getStatusBadge(sub.status)}</td>
                          <td className="py-3 text-gray-600 text-sm">
                            {new Date(sub.created_at).toLocaleDateString('nl-NL')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
