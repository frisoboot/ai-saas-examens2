import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, StudentLevel } from '../types';
import { getQuestions, saveQuestion, deleteQuestion } from '../services/storageService';
import { AdminStudentManagement } from './AdminStudentManagement';
import { BulkImportQuestions } from './BulkImportQuestions';
import { Button } from './Button';
import { Trash2, Plus, ArrowLeft, Save, Image as ImageIcon, Link, Upload, X, FileText, List, Type, Sparkles, Pencil, Search, Filter, LayoutGrid, Users, FileUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
  adminUsername?: string;
}

type AdminTab = 'questions' | 'students' | 'import';

const SUBJECTS = [
  'Aardrijkskunde', 'Bedrijfseconomie', 'Biologie', 'Duits', 'Economie',
  'Engels', 'Frans', 'Geschiedenis', 'Kunst Algemeen', 'Maatschappijwetenschappen',
  'Natuurkunde', 'Nederlands', 'Scheikunde', 'Wiskunde A', 'Wiskunde B', 'Wiskunde C'
];

// Helper to compress images
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fix: Add null check for canvas context
        if (!ctx) {
          reject(new Error('Kon canvas context niet verkrijgen'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, adminUsername = 'admin' }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');

  // Form State
  const [questionType, setQuestionType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [questionLevel, setQuestionLevel] = useState<StudentLevel>('HAVO');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [contextText, setContextText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [examYear, setExamYear] = useState<string>('');
  const [examType, setExamType] = useState<'practice' | 'official_exam'>('practice');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [newQuestionSource, setNewQuestionSource] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [modelAnswer, setModelAnswer] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

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
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setNewQuestionImage(compressedBase64);
    } catch (err) {
      console.error("Fout bij comprimeren:", err);
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
    setExamType('practice');
    setNewQuestionImage('');
    setNewQuestionSource('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setModelAnswer('');
    setIsCompressing(false);
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setQuestionType(q.type);
    setQuestionLevel(q.level);
    setNewQuestionText(q.text);
    setContextText(q.contextText || '');
    
    if (SUBJECTS.includes(q.subject)) {
      setSelectedSubject(q.subject);
      setCustomSubject('');
    } else {
      setSelectedSubject('Anders...');
      setCustomSubject(q.subject);
    }
    
    setNewQuestionImage(q.imageUrl || '');
    setNewQuestionSource(q.source || '');
    setExamYear(q.examYear ? q.examYear.toString() : '');
    setExamType(q.examType || 'practice');

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

    if (questionType === 'MULTIPLE_CHOICE' && options.some(o => !o)) {
      alert("Vul alle antwoordopties in voor een meerkeuzevraag.");
      return;
    }

    if (questionType === 'OPEN' && !modelAnswer) {
      alert("Geef een modelantwoord op zodat de AI het kan nakijken.");
      return;
    }

    const newQuestion: Question = {
      id: editingId || Date.now().toString(),
      type: questionType,
      level: questionLevel,
      text: newQuestionText,
      subject: finalSubject,
      contextText: contextText || undefined,
      imageUrl: newQuestionImage || undefined,
      source: newQuestionSource || undefined,
      examYear: examYear ? parseInt(examYear) : undefined,
      examType: examYear ? examType : undefined, // Only set examType if year is provided
      ...(questionType === 'MULTIPLE_CHOICE' ? { options, correctIndex } : {}),
      ...(questionType === 'OPEN' ? { modelAnswer } : {})
    };

    try {
      await saveQuestion(newQuestion);
      await refreshQuestions();
      handleCancel();
    } catch (error: any) {
      if (error.message === "OPSLAG_VOL") {
        alert("⚠️ Opslag is vol! Verwijder oude vragen of afbeeldingen.");
      } else {
        alert("Er ging iets mis bij het opslaan.");
      }
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

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-10">
         <div className="p-6 border-b border-slate-100">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-2 rounded-lg">
                   <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-slate-800">Beheer</span>
             </div>

             {/* Tab Navigation */}
             <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'questions'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Vragen Beheer
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
                  Studenten
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'import'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  Bulk Import
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
            <Button variant="secondary" onClick={onBack} className="w-full justify-start text-slate-500">
               <ArrowLeft className="w-4 h-4 mr-2" />
               Afsluiten
            </Button>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">

        {/* Render based on active tab */}
        {activeTab === 'students' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <AdminStudentManagement adminUsername={adminUsername} />
          </div>
        ) : activeTab === 'import' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <BulkImportQuestions />
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
                  <p className="text-slate-500">Vul de gegevens in voor de nieuwe examenvraag.</p>
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

                   {/* Exam Year, Type and Source Row */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">
                            Examenjaar <span className="font-normal text-slate-400 text-xs ml-1">(Optioneel)</span>
                         </label>
                         <input
                            type="number"
                            min="2000"
                            max="2100"
                            placeholder="bijv. 2024"
                            value={examYear}
                            onChange={e => setExamYear(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">Examentype</label>
                         <select
                            value={examType}
                            onChange={(e) => setExamType(e.target.value as 'practice' | 'official_exam')}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                            disabled={!examYear}
                         >
                            <option value="practice">Oefenexamen</option>
                            <option value="official_exam">Officieel Examen</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">
                            Bron <span className="font-normal text-slate-400 text-xs ml-1">(Optioneel)</span>
                         </label>
                         <input
                            type="text"
                            placeholder="bijv. Examenblad 2024-I"
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
                       <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
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
  );
};