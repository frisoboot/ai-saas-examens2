import React, { useState, useEffect } from 'react';
import { StudentProfile, StudentLevel } from '../types';
import { dbStudents, auth } from '../services/supabaseService';
import { Button } from './Button';
import { Search, Mail, UserCheck, UserX, Plus, Trash2, X, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface AdminStudentManagementProps {
  adminUsername: string;
}

interface NewStudentForm {
  name: string;
  email: string;
  level: StudentLevel;
}

interface CreatedStudent {
  email: string;
  name: string;
  temporaryPassword: string;
}

export const AdminStudentManagement: React.FC<AdminStudentManagementProps> = ({ adminUsername }) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudentForm>({
    name: '',
    email: '',
    level: 'HAVO'
  });
  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<StudentProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    const { session } = await auth.getSession();
    return session?.access_token || null;
  };

  const loadStudents = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await dbStudents.getAll();
      setStudents(data);
    } catch (err: any) {
      console.error('[AdminStudentManagement] Error:', err);
      setError('Fout bij laden studenten. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStudent(true);
    setError('');

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Geen geldige sessie. Log opnieuw in.');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newStudent.name,
          email: newStudent.email,
          level: newStudent.level,
          customPassword: useCustomPassword ? customPassword : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kon student niet aanmaken');
      }

      // Toon het gegenereerde wachtwoord
      setCreatedStudent({
        email: newStudent.email,
        name: newStudent.name,
        temporaryPassword: data.temporaryPassword
      });

      // Reset form
      setNewStudent({ name: '', email: '', level: 'HAVO' });
      setUseCustomPassword(false);
      setCustomPassword('');
      setShowPassword(false);

      // Herlaad studenten lijst
      await loadStudents();

    } catch (err: any) {
      setError(err.message || 'Er ging iets mis bij het aanmaken van de student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (student: StudentProfile) => {
    if (!student.email) {
      setError('Student heeft geen email adres, kan niet verwijderen');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Geen geldige sessie. Log opnieuw in.');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: student.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kon student niet verwijderen');
      }

      setSuccess(`${student.name} is succesvol verwijderd`);
      setDeleteConfirm(null);

      // Herlaad studenten lijst
      await loadStudents();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Er ging iets mis bij het verwijderen');
    } finally {
      setDeleting(false);
    }
  };

  const copyPassword = async () => {
    if (createdStudent?.temporaryPassword) {
      await navigator.clipboard.writeText(createdStudent.temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setCreatedStudent(null);
    setNewStudent({ name: '', email: '', level: 'HAVO' });
    setCopiedPassword(false);
    setUseCustomPassword(false);
    setCustomPassword('');
    setShowPassword(false);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500">Studenten laden...</div>
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
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Student Toevoegen
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setError('');
                loadStudents();
              }}
            >
              Opnieuw proberen
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            >
              Database controleren
            </Button>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Zoek studenten op naam of email..."
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
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {searchQuery ? 'Geen studenten gevonden met deze zoekopdracht' : 'Nog geen studenten toegevoegd'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.email || student.name} className="hover:bg-slate-50">
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteConfirm(student)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijder student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {createdStudent ? 'Student Aangemaakt' : 'Nieuwe Student Toevoegen'}
              </h3>
              <button onClick={closeAddModal} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {createdStudent ? (
              // Success view with password
              <div className="p-4 space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">Student succesvol aangemaakt!</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-500">Naam</label>
                    <p className="font-medium">{createdStudent.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Email</label>
                    <p className="font-medium">{createdStudent.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Tijdelijk Wachtwoord</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-slate-100 rounded font-mono text-sm">
                        {createdStudent.temporaryPassword}
                      </code>
                      <button
                        onClick={copyPassword}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Kopieer wachtwoord"
                      >
                        {copiedPassword ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <strong>Let op:</strong> Deel dit wachtwoord veilig met de student. Ze kunnen dit later wijzigen in hun profiel.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={closeAddModal} className="flex-1">
                    Sluiten
                  </Button>
                  <Button
                    onClick={() => {
                      setCreatedStudent(null);
                      setNewStudent({ name: '', email: '', level: 'HAVO' });
                      setUseCustomPassword(false);
                      setCustomPassword('');
                      setShowPassword(false);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    Nog een student
                  </Button>
                </div>
              </div>
            ) : (
              // Add student form
              <form onSubmit={handleAddStudent} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Naam *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Voornaam Achternaam"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="student@email.nl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Niveau *
                  </label>
                  <select
                    required
                    value={newStudent.level}
                    onChange={(e) => setNewStudent({ ...newStudent, level: e.target.value as StudentLevel })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="VMBO-TL">VMBO-TL</option>
                    <option value="HAVO">HAVO</option>
                    <option value="VWO">VWO</option>
                  </select>
                </div>

                {/* Wachtwoord opties */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustomPassword"
                      checked={useCustomPassword}
                      onChange={(e) => {
                        setUseCustomPassword(e.target.checked);
                        if (!e.target.checked) {
                          setCustomPassword('');
                          setShowPassword(false);
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="useCustomPassword" className="text-sm font-medium text-slate-700">
                      Eigen wachtwoord instellen
                    </label>
                  </div>

                  {useCustomPassword ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Wachtwoord * <span className="font-normal text-slate-500">(minimaal 8 tekens)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Voer een wachtwoord in"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      Er wordt automatisch een veilig wachtwoord gegenereerd. Dit wordt getoond nadat de student is aangemaakt.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeAddModal}
                    className="flex-1"
                    disabled={addingStudent}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={addingStudent}
                  >
                    {addingStudent ? 'Bezig...' : 'Student Aanmaken'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Student Verwijderen</h3>
                <p className="text-sm text-slate-500">Deze actie kan niet ongedaan worden gemaakt</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6">
              Weet je zeker dat je <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email}) wilt verwijderen?
              Dit verwijdert ook alle bijbehorende data.
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
                disabled={deleting}
              >
                Annuleren
              </Button>
              <button
                onClick={() => handleDeleteStudent(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Bezig...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
