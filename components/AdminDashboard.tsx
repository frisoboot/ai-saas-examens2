import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, StudentLevel } from '../types';
import { getQuestions, saveQuestion, deleteQuestion } from '../services/storageService';
import { AdminStudentManagement } from './AdminStudentManagement';
import { AdminHealthCheck } from './AdminHealthCheck';
import { BulkImportQuestions } from './BulkImportQuestions';
import { ExamBuilder } from './ExamBuilder';
import { ExamLibrary } from './ExamLibrary';
import { ImageOverview } from './ImageOverview';
import { FirecrawlImport } from './FirecrawlImport';
import { Button } from './Button';
import { Trash2, Plus, ArrowLeft, Save, Image as ImageIcon, Upload, X, FileText, Pencil, Search, LayoutGrid, Users, BookOpen, Loader2, Activity, Menu, LogOut, Library, Globe } from 'lucide-react';
import { imageStorage } from '../services/imageStorageService';
import { SUBJECTS, isValidSubject } from '../constants/subjects';

interface AdminDashboardProps {
  onBack: () => void | Promise<void>;
  adminUsername?: string;
}

type AdminTab = 'library' | 'questions' | 'students' | 'import' | 'firecrawl' | 'exam-builder' | 'health-check' | 'images';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, adminUsername = 'admin' }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('library');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [questionType, setQuestionType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [questionLevel, setQuestionLevel] = useState<StudentLevel>('HAVO');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [contextText, setContextText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [examYear, setExamYear] = useState<string>('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [newQuestionSource, setNewQuestionSource] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [modelAnswer, setModelAnswer] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshQuestions();
  }, []);

  const refreshQuestions = async () => {
    try {
      const questionsData = await getQuestions();
      setQuestions(questionsData);
    } catch (error) {
      console.error('Fout bij ophalen vragen:', error);
      setQuestions([]);
    }
  };

  const processImage = async (file: File) => {
    // Voor nu: toon preview met base64
    // De daadwerkelijke upload naar Supabase Storage gebeurt bij het opslaan
    setIsCompressing(true);
    try {
      // Maak een lokale preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNewQuestionImage(result); // Preview in de UI
      };
      reader.readAsDataURL(file);
      setUploadedFile(file); // Bewaar het bestand voor later
    } catch (err) {
      console.error("Fout bij verwerken afbeelding:", err);
      alert("Kon afbeelding niet verwerken.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setEditingId(null);
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionLevel('HAVO');
    setNewQuestionText('');
    setContextText('');
    setSelectedSubject(SUBJECTS[0]);
    setCustomSubject('');
    setExamYear('');
    setNewQuestionImage('');
    setNewQuestionSource('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setModelAnswer('');
    setIsCompressing(false);
    setUploadedFile(null);
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setQuestionType(q.type);
    setQuestionLevel(q.level);
    setNewQuestionText(q.text);
    setContextText(q.contextText || '');

    if (isValidSubject(q.subject)) {
      setSelectedSubject(q.subject);
      setCustomSubject('');
    } else {
      setSelectedSubject('Anders...');
      setCustomSubject(q.subject);
    }
    
    setNewQuestionImage(q.imageUrl || '');
    setNewQuestionSource(q.source || '');
    setExamYear(q.examYear ? q.examYear.toString() : '');

    if (q.type === 'MULTIPLE_CHOICE') {
      setOptions(q.options || ['', '', '', '']);
      setCorrectIndex(q.correctIndex || 0);
    } else {
      setModelAnswer(q.modelAnswer || '');
    }

    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = selectedSubject === 'Anders...' ? customSubject : selectedSubject;

    if (!newQuestionText || !finalSubject) {
      alert("Vul in ieder geval het onderwerp en de vraag in.");
      return;
    }

    if (!examYear) {
      alert("Examenjaar is verplicht voor officiële eindexamens.");
      return;
    }

    if (questionType === 'MULTIPLE_CHOICE' && options.some(o => !o)) {
      alert("Vul alle antwoordopties in voor een meerkeuzevraag.");
      return;
    }

    if (questionType === 'OPEN' && !modelAnswer) {
      alert("Geef een modelantwoord op zodat de AI het kan nakijken.");
      return;
    }

    setIsCompressing(true);
    let finalImageUrl = newQuestionImage;

    try {
      // Als er een nieuw bestand is geüpload, upload naar Supabase Storage
      if (uploadedFile) {
        const questionId = editingId || Date.now().toString();
        finalImageUrl = await imageStorage.uploadImage(uploadedFile, questionId);
        console.log('Afbeelding geüpload naar Supabase Storage:', finalImageUrl);
      } else if (newQuestionImage && imageStorage.isBase64Image(newQuestionImage)) {
        // Als het een base64 image is (oude data of preview), converteer naar storage
        const questionId = editingId || Date.now().toString();
        finalImageUrl = await imageStorage.migrateBase64ToStorage(newQuestionImage, questionId);
        console.log('Base64 afbeelding gemigreerd naar Supabase Storage:', finalImageUrl);
      }

      const newQuestion: Question = {
        id: editingId || Date.now().toString(),
        type: questionType,
        level: questionLevel,
        text: newQuestionText,
        subject: finalSubject,
        contextText: contextText || undefined,
        imageUrl: finalImageUrl || undefined,
        source: newQuestionSource || undefined,
        examYear: examYear ? parseInt(examYear) : undefined,
        examType: examYear ? 'official_exam' : undefined,
        ...(questionType === 'MULTIPLE_CHOICE' ? { options, correctIndex } : {}),
        ...(questionType === 'OPEN' ? { modelAnswer } : {})
      };

      await saveQuestion(newQuestion);
      await refreshQuestions();
      handleCancel();
    } catch (error: any) {
      console.error("Opslaan mislukt:", error);
      if (error.message?.includes("Storage bucket")) {
        alert(`⚠️ Supabase Storage nog niet geconfigureerd!\n\n${error.message}`);
      } else if (error.message === "OPSLAG_VOL") {
        alert("⚠️ Opslag is vol! Verwijder oude vragen of afbeeldingen.");
      } else if (error.message?.includes("Database fout")) {
        alert(`❌ Fout bij opslaan in de cloud database:\n${error.message}\n\nDe vraag is NIET opgeslagen.`);
      } else {
        alert("❌ Er ging iets mis bij het opslaan.\nControleer je internetverbinding.");
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) {
      try {
        await deleteQuestion(id);
        await refreshQuestions();
      } catch (error) {
        console.error('Fout bij verwijderen vraag:', error);
        alert('Er ging iets mis bij het verwijderen.');
      }
    }
  };

  const filteredQuestions = (filterSubject === 'ALL' 
    ? questions 
    : questions.filter(q => q.subject === filterSubject)
  ).filter(q => 
    searchQuery === '' || 
    q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    console.log('[AdminDashboard] Uitloggen clicked');
    try {
      await onBack();
    } catch (err) {
      console.error('[AdminDashboard] Logout error:', err);
      window.location.href = '/';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">Beheer</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Uitloggen"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2">
          <button
            onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'library' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Library className="w-4 h-4" />
            Examenbibliotheek
          </button>
          <button
            onClick={() => { setActiveTab('exam-builder'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'exam-builder' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Examen Toevoegen
          </button>
          <button
            onClick={() => { setActiveTab('questions'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'questions' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Alle Vragen
          </button>
          <button
            onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Leerlingen
          </button>
          <button
            onClick={() => { setActiveTab('import'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'import' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            CSV/JSON Import
          </button>
          <button
            onClick={() => { setActiveTab('firecrawl'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'firecrawl' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            PDF Scraper
          </button>
          <button
            onClick={() => { setActiveTab('health-check'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'health-check' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Systeem Status
          </button>
          <button
            onClick={() => { setActiveTab('images'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'images' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Afbeeldingen
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar Navigation - Desktop only */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex z-10">
         <div className="p-6 border-b border-slate-100">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-2 rounded-lg">
                   <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Beheer</span>
                  <span className="text-xs text-slate-500">Eindexamens & Leerlingen</span>
                </div>
             </div>

             {/* Tab Navigation */}
             <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('library')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'library'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  Examenbibliotheek
                </button>
                <button
                  onClick={() => setActiveTab('exam-builder')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'exam-builder'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Examen Toevoegen
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'questions'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Alle Vragen
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'students'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Leerlingen
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'import'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  CSV/JSON Import
                </button>
                <button
                  onClick={() => setActiveTab('firecrawl')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'firecrawl'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  PDF Scraper
                </button>
                <button
                  onClick={() => setActiveTab('health-check')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'health-check'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Systeem Status
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'images'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Afbeeldingen
                </button>
             </div>
         </div>

         {activeTab === 'questions' && (
         <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            <button 
               onClick={() => { setFilterSubject('ALL'); setSearchQuery(''); }}
               className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                 filterSubject === 'ALL' 
                   ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                   : 'text-slate-600 hover:bg-slate-50 border border-transparent'
               }`}
            >
              <div className="flex items-center justify-between">
                <span>Alle Vakken</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  filterSubject === 'ALL' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {questions.length}
                </span>
              </div>
            </button>
            <div className="mt-3 space-y-1">
              {SUBJECTS.map(subj => {
                 const count = questions.filter(q => q.subject === subj).length;
                 if (count === 0 && filterSubject !== subj) return null; // Hide empty subjects unless active
                 
                 return (
                   <button 
                     key={subj}
                     onClick={() => { setFilterSubject(subj); setSearchQuery(''); }}
                     className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                       filterSubject === subj 
                         ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                         : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                     }`}
                   >
                     <div className="flex items-center justify-between">
                       <span className="truncate">{subj}</span>
                       <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                         filterSubject === subj 
                           ? 'bg-indigo-100 text-indigo-700' 
                           : 'bg-slate-100 text-slate-500'
                       }`}>
                         {count}
                       </span>
                     </div>
                   </button>
                 )
              })}
            </div>
         </div>
         )}

         <div className="p-4 border-t border-slate-100 mt-auto">
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="w-full justify-start text-slate-500"
            >
               <LogOut className="w-4 h-4 mr-2" />
               Uitloggen
            </Button>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">

        {/* Render based on active tab */}
        {activeTab === 'library' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <ExamLibrary onEditQuestion={(q) => { handleEdit(q); setActiveTab('questions'); }} />
          </div>
        ) : activeTab === 'exam-builder' ? (
          <div className="flex-1 overflow-y-auto">
            <ExamBuilder onBack={() => setActiveTab('library')} />
          </div>
        ) : activeTab === 'students' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <AdminStudentManagement adminUsername={adminUsername} />
          </div>
        ) : activeTab === 'import' ? (
           <div className="flex-1 overflow-y-auto p-6">
             <BulkImportQuestions />
           </div>
        ) : activeTab === 'firecrawl' ? (
           <div className="flex-1 overflow-y-auto p-6">
             <FirecrawlImport />
           </div>
        ) : activeTab === 'health-check' ? (
           <div className="flex-1 overflow-y-auto p-6">
             <AdminHealthCheck />
           </div>
        ) : activeTab === 'images' ? (
           <div className="flex-1 overflow-y-auto">
             <ImageOverview onBack={() => setActiveTab('library')} />
           </div>
        ) : (
          <>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 flex-shrink-0">
          <div className="h-16 flex items-center justify-between px-6 md:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {isFormOpen
                  ? (editingId ? 'Vraag Bewerken' : 'Nieuwe Vraag')
                  : (filterSubject === 'ALL' ? 'Alle Vragen' : filterSubject)
                }
              </h1>
              {!isFormOpen && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {filteredQuestions.length} {filteredQuestions.length === 1 ? 'vraag' : 'vragen'}
                  {filterSubject !== 'ALL' && ` in ${filterSubject}`}
                </p>
              )}
            </div>
            {!isFormOpen && (
              <Button onClick={() => { resetForm(); setIsFormOpen(true); }} size="sm" className="shadow-md shadow-indigo-100">
                <Plus className="w-4 h-4 mr-2" />
                Vraag Toevoegen
              </Button>
            )}
          </div>
          {!isFormOpen && (
            <div className="px-6 md:px-8 pb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Zoek in vragen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
           
           {isFormOpen ? (
             /* FORM VIEW - WIDE LAYOUT */
             <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-slate-500">Vul de gegevens in voor een officiële eindexamenvraag met bronnen en afbeeldingen.</p>
                  <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                     <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">Vak</label>
                         <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                         >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            <option value="Anders...">Anders...</option>
                         </select>
                         {selectedSubject === 'Anders...' && (
                            <input type="text" placeholder="Naam vak..." value={customSubject} onChange={e => setCustomSubject(e.target.value)} className="w-full p-2.5 mt-2 bg-slate-50 border border-slate-200 rounded-lg" />
                         )}
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">Niveau</label>
                         <select 
                            value={questionLevel}
                            onChange={(e) => setQuestionLevel(e.target.value as StudentLevel)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                         >
                            <option value="VMBO-TL">VMBO-TL</option>
                            <option value="HAVO">HAVO</option>
                            <option value="VWO">VWO</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">Type</label>
                         <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <button type="button" onClick={() => setQuestionType('MULTIPLE_CHOICE')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${questionType === 'MULTIPLE_CHOICE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MC</button>
                            <button type="button" onClick={() => setQuestionType('OPEN')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${questionType === 'OPEN' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>OPEN</button>
                         </div>
                      </div>
                   </div>

                   {/* Exam Year and Source Row */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">
                            Examenjaar <span className="text-red-500">*</span>
                         </label>
                         <input
                            type="number"
                            min="2000"
                            max="2100"
                            placeholder="bijv. 2024"
                            value={examYear}
                            onChange={e => setExamYear(e.target.value)}
                            required
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                         />
                         <p className="text-xs text-slate-500 mt-1">Alleen officiële eindexamenvragen</p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">
                            Bron <span className="font-normal text-slate-400 text-xs ml-1">(Optioneel)</span>
                         </label>
                         <input
                            type="text"
                            placeholder="bijv. Examenblad 2024-I, Tijdvak 1"
                            value={newQuestionSource}
                            onChange={e => setNewQuestionSource(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Vraagstelling</label>
                            <textarea 
                              value={newQuestionText}
                              onChange={e => setNewQuestionText(e.target.value)}
                              rows={4}
                              className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder-slate-300"
                              placeholder="Wat is de vraag?"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                               <span>Brontekst <span className="font-normal text-slate-400 text-xs ml-1">(Optioneel)</span></span>
                            </label>
                            <textarea 
                              value={contextText}
                              onChange={e => setContextText(e.target.value)}
                              rows={6}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              placeholder="Plak hier een artikel of casus..."
                            />
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Antwoordmodel</label>
                            {questionType === 'MULTIPLE_CHOICE' ? (
                               <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  {options.map((opt, idx) => (
                                     <div key={idx} className="flex items-center gap-3">
                                        <input type="radio" name="correct" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="w-4 h-4 text-indigo-600" />
                                        <input 
                                           type="text" 
                                           value={opt} 
                                           onChange={e => handleOptionChange(idx, e.target.value)} 
                                           placeholder={`Optie ${String.fromCharCode(65+idx)}`}
                                           className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        />
                                     </div>
                                  ))}
                               </div>
                            ) : (
                               <textarea 
                                  value={modelAnswer}
                                  onChange={e => setModelAnswer(e.target.value)}
                                  rows={5}
                                  className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-indigo-900 placeholder-indigo-300"
                                  placeholder="Beschrijf het ideale antwoord voor de AI..."
                                />
                            )}
                         </div>

                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                <span>Afbeelding <span className="font-normal text-slate-400 text-xs ml-1">(Optioneel)</span></span>
                                {isCompressing && <span className="text-xs text-indigo-600 flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Comprimeren</span>}
                             </label>
                             <div 
                                className={`border-2 border-dashed rounded-xl p-4 h-32 flex flex-col items-center justify-center text-center transition-colors ${newQuestionImage ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-300 hover:bg-slate-50'}`}
                             >
                                {!newQuestionImage ? (
                                   <>
                                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                      <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>Kies Afbeelding</Button>
                                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                   </>
                                ) : (
                                   <div className="relative w-full h-full flex items-center justify-center">
                                      <img src={newQuestionImage} className="max-h-full object-contain" />
                                      <button type="button" onClick={() => setNewQuestionImage('')} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm border border-slate-200"><X className="w-4 h-4"/></button>
                                   </div>
                                )}
                             </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={handleCancel}>Annuleren</Button>
                      <Button type="submit" disabled={isCompressing} className="shadow-lg shadow-indigo-100"><Save className="w-4 h-4 mr-2"/> Opslaan</Button>
                   </div>
                </form>
             </div>
           ) : (
             /* LIST VIEW - CARD STYLE */
             <div className="space-y-4">
               {filteredQuestions.length === 0 ? (
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                   <div className="max-w-md mx-auto">
                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <FileText className="w-8 h-8 text-slate-400" />
                     </div>
                     <h3 className="text-lg font-semibold text-slate-700 mb-2">
                       {searchQuery ? 'Geen resultaten gevonden' : 'Geen vragen gevonden'}
                     </h3>
                     <p className="text-slate-500 text-sm mb-6">
                       {searchQuery 
                         ? `Geen vragen gevonden voor "${searchQuery}"`
                         : filterSubject === 'ALL' 
                           ? 'Voeg je eerste vraag toe om te beginnen.'
                           : `Er zijn nog geen vragen voor ${filterSubject}.`
                       }
                     </p>
                     {!searchQuery && (
                       <Button onClick={() => { resetForm(); setIsFormOpen(true); }} size="sm">
                         <Plus className="w-4 h-4 mr-2" />
                         Eerste Vraag Toevoegen
                       </Button>
                     )}
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                   {filteredQuestions.map(q => (
                     <div 
                       key={q.id} 
                       className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group"
                     >
                       {/* Header met vak en badges */}
                       <div className="flex items-start justify-between mb-3">
                         <div className="flex-1 min-w-0">
                           <h3 className="font-semibold text-slate-800 truncate mb-1">{q.subject}</h3>
                           <div className="flex flex-wrap gap-2">
                             <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                               {q.level}
                             </span>
                             <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                               q.type === 'MULTIPLE_CHOICE' 
                                 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                 : 'bg-orange-50 text-orange-700 border-orange-100'
                             }`}>
                               {q.type === 'MULTIPLE_CHOICE' ? 'Meerkeuze' : 'Open Vraag'}
                             </span>
                           </div>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                           <button 
                             onClick={() => handleEdit(q)} 
                             className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" 
                             title="Bewerken"
                           >
                             <Pencil className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDelete(q.id)} 
                             className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" 
                             title="Verwijderen"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </div>

                       {/* Vraag tekst */}
                       <p className="text-slate-700 text-sm line-clamp-3 mb-3 leading-relaxed">
                         {q.text}
                       </p>

                       {/* Metadata */}
                       <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100 flex-wrap">
                         {q.examYear && (
                           <span className="flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                             {q.examYear}
                           </span>
                         )}
                         {q.contextText && (
                           <span className="flex items-center gap-1">
                             <FileText className="w-3 h-3" />
                             Tekst
                           </span>
                         )}
                         {q.imageUrl && (
                           <span className="flex items-center gap-1">
                             <ImageIcon className="w-3 h-3" />
                             Afbeelding
                           </span>
                         )}
                         {q.source && (
                           <span className="truncate flex-1" title={q.source}>
                             {q.source}
                           </span>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
};
