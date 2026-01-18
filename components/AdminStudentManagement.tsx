import React, { useState, useEffect } from 'react';
import { StudentProfile, StudentLevel } from '../types';
import { dbStudents } from '../services/supabaseService';
import { adminUsersService } from '../services/adminUsersService';
import { Button } from './Button';
import { Search, Mail, UserCheck, UserX } from 'lucide-react';

interface AdminStudentManagementProps {
  adminUsername: string;
}

export const AdminStudentManagement: React.FC<AdminStudentManagementProps> = ({ adminUsername }) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '' });
  const [deleteEmail, setDeleteEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await dbStudents.getAll();
      setStudents(data);
    } catch (err) {
      setError('Fout bij laden van studenten');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setActionMessage(null);

    const result = await adminUsersService.createUser(createForm.email, createForm.password);

    if (result.success) {
      setActionMessage({ type: 'success', text: `Account aangemaakt voor ${result.email}` });
      setCreateDialogOpen(false);
      setCreateForm({ email: '', password: '' });
      loadStudents();
    } else {
      setActionMessage({ type: 'error', text: result.message || 'Account aanmaken mislukt' });
    }

    setSubmitting(false);
  };

  const handleDeleteUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setActionMessage(null);

    const result = await adminUsersService.deleteUser(deleteEmail);

    if (result.success) {
      setActionMessage({ type: 'success', text: `Account verwijderd voor ${result.email}` });
      setDeleteDialogOpen(false);
      setDeleteEmail('');
      loadStudents();
    } else {
      setActionMessage({ type: 'error', text: result.message || 'Account verwijderen mislukt' });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Studenten Overzicht</h2>
          <p className="text-slate-500 text-sm mt-1">{students.length} studenten totaal</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            Account toevoegen
          </Button>
          <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
            Account verwijderen
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {actionMessage && (
        <div
          className={`p-4 border rounded-lg text-sm ${
            actionMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Zoek studenten..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Students Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Naam</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Niveau</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Geen studenten gevonden
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {student.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {student.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <UserCheck className="w-3 h-3" />
                          Actief
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <UserX className="w-3 h-3" />
                          Inactief
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Account toevoegen</h3>
            <p className="text-sm text-slate-500 mt-1">
              Bevestig dat je een nieuwe gebruiker wilt aanmaken.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Wachtwoord</label>
                <input
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={submitting}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Bezig...' : 'Account toevoegen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Account verwijderen</h3>
            <p className="text-sm text-slate-500 mt-1">
              Weet je zeker dat je het account wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleDeleteUser}>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  value={deleteEmail}
                  onChange={(event) => setDeleteEmail(event.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={submitting}
                >
                  Annuleren
                </Button>
                <Button type="submit" variant="danger" disabled={submitting}>
                  {submitting ? 'Bezig...' : 'Account verwijderen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
