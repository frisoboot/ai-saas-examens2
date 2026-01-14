import React, { useState, useEffect } from 'react';
import { StudentProfile, StudentLevel } from '../types';
import { getAllStudents, createStudentAccount, updateStudent, deactivateStudent, activateStudent, resetStudentPassword, deleteStudent } from '../services/authService';
import { Button } from './Button';
import { UserPlus, Search, Key, UserX, UserCheck, Mail, Shield, Trash2 } from 'lucide-react';

interface AdminStudentManagementProps {
  adminUsername: string;
}

export const AdminStudentManagement: React.FC<AdminStudentManagementProps> = ({ adminUsername }) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLevel, setNewLevel] = useState<StudentLevel>('HAVO');
  const [newStruggle, setNewStruggle] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      setError('Fout bij laden van studenten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newName.trim() || !newPassword.trim()) {
      setError('Naam en wachtwoord zijn verplicht');
      return;
    }

    const result = await createStudentAccount(
      adminUsername,
      newName,
      newPassword,
      newLevel,
      newStruggle || 'Algemene examenstof',
      newEmail
    );

    if (result.success) {
      setSuccess(`Student ${newName} is aangemaakt!`);
      setNewName('');
      setNewPassword('');
      setNewLevel('HAVO');
      setNewStruggle('');
      setNewEmail('');
      setShowCreateForm(false);
      loadStudents();
    } else {
      setError(result.error || 'Fout bij aanmaken student');
    }
  };

  const handleToggleActive = async (name: string, isActive: boolean) => {
    if (isActive) {
      await deactivateStudent(name);
      setSuccess(`${name} is gedeactiveerd`);
    } else {
      await activateStudent(name);
      setSuccess(`${name} is geactiveerd`);
    }
    loadStudents();
  };

  const handleResetPassword = async (name: string) => {
    const newPassword = prompt(`Nieuw wachtwoord voor ${name}:`);
    if (newPassword) {
      const result = await resetStudentPassword(name, newPassword);
      if (result.success) {
        setSuccess(`Wachtwoord voor ${name} is gereset`);
      } else {
        setError(result.error || 'Fout bij resetten wachtwoord');
      }
    }
  };

  const handleDeleteStudent = async (name: string) => {
    // Dubbele confirmatie voor delete actie
    const confirmed = window.confirm(
      `Weet je zeker dat je ${name} wilt verwijderen?\n\n` +
      `Dit verwijdert:\n` +
      `- Het student account\n` +
      `- Alle examen resultaten\n` +
      `- Alle voortgangsdata\n\n` +
      `Deze actie kan NIET ongedaan gemaakt worden!`
    );

    if (!confirmed) return;

    // Tweede confirmatie
    const doubleConfirm = window.confirm(
      `Laatste kans: verwijder ${name} definitief?`
    );

    if (!doubleConfirm) return;

    setError('');
    setSuccess('');

    const result = await deleteStudent(name);
    if (result.success) {
      setSuccess(`${name} is volledig verwijderd uit het systeem`);
      loadStudents();
    } else {
      setError(result.error || 'Fout bij verwijderen student');
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-slate-900">Studenten Beheer</h2>
          <p className="text-slate-500 text-sm mt-1">{students.length} studenten totaal</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Nieuwe Student
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Nieuwe Student Aanmaken</h3>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Naam</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email (optioneel)</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Wachtwoord</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Niveau</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['VMBO-TL', 'HAVO', 'VWO'] as StudentLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewLevel(lvl)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        newLevel === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Struggle Points</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Bijv: Wiskunde vraagstukken, Engelse teksten..."
                value={newStruggle}
                onChange={(e) => setNewStruggle(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary">Aanmaken</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Annuleren
              </Button>
            </div>
          </form>
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
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Aangemaakt door</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {student.createdByAdmin ? (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {student.createdByAdmin}
                        </span>
                      ) : (
                        <span className="text-slate-400">Zelf geregistreerd</span>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResetPassword(student.name)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Wachtwoord resetten"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(student.name, student.isActive !== false)}
                          className={`p-1.5 rounded transition-colors ${
                            student.isActive !== false
                              ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={student.isActive !== false ? 'Deactiveren' : 'Activeren'}
                        >
                          {student.isActive !== false ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Student permanent verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
