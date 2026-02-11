import React, { useState, useEffect, useMemo } from 'react';
import { Question, StudentLevel } from '../types';
import { getQuestions, deleteQuestion, deleteExam, updateExamPdf } from '../services/storageService';
import { worksheetStorage } from '../services/worksheetStorageService';
import { Button } from './Button';
import {
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  FileText,
  Calendar,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  BookOpen,
  Paperclip,
  Upload,
  Loader2,
  ArrowLeftRight
} from 'lucide-react';
import { SUBJECTS } from '../constants/subjects';

interface ExamLibraryProps {
  onEditQuestion?: (question: Question) => void;
}

interface YearGroup {
  year: number;
  questions: Question[];
  byLevel: {
    'VMBO-TL': Question[];
    'HAVO': Question[];
    'VWO': Question[];
  };
}

interface SubjectGroup {
  subject: string;
  totalQuestions: number;
  years: YearGroup[];
}

export const ExamLibrary: React.FC<ExamLibraryProps> = ({ onEditQuestion }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel | 'ALL'>('ALL');
  const [deletingExam, setDeletingExam] = useState<string | null>(null);
  const [swappingPdf, setSwappingPdf] = useState<string | null>(null); // key like "subject-year-level-pdf"

  const handleSwapPdf = async (
    subject: string,
    year: number,
    level: StudentLevel,
    pdfType: 'examPdfUrl' | 'examBijlageUrl',
    file: File,
    oldUrl?: string
  ) => {
    const swapKey = `${subject}-${year}-${level}-${pdfType}`;
    setSwappingPdf(swapKey);
    try {
      // 1. Upload new PDF
      const newUrl = await worksheetStorage.uploadWorksheet(file);

      // 2. Update all questions in this exam
      const updatedCount = await updateExamPdf(subject, year, level, pdfType, newUrl);

      // 3. Delete old PDF from storage if it existed
      if (oldUrl && oldUrl.includes('/storage/v1/object/public/')) {
        try {
          await worksheetStorage.deleteWorksheet(oldUrl);
        } catch (e) {
          console.error('Kon oude PDF niet verwijderen:', e);
        }
      }

      alert(`PDF bijgewerkt voor ${updatedCount} vragen.`);
      await loadQuestions();
    } catch (error: any) {
      console.error('Fout bij wisselen PDF:', error);
      alert(`Fout bij wisselen PDF: ${error.message || 'Onbekende fout'}`);
    } finally {
      setSwappingPdf(null);
    }
  };

  const handleRemovePdf = async (
    subject: string,
    year: number,
    level: StudentLevel,
    pdfType: 'examPdfUrl' | 'examBijlageUrl',
    oldUrl?: string
  ) => {
    const label = pdfType === 'examPdfUrl' ? 'opdrachten PDF' : 'bijlage PDF';
    if (!confirm(`Weet je zeker dat je de ${label} wilt verwijderen voor ${subject} ${year} ${level}?`)) return;

    const swapKey = `${subject}-${year}-${level}-${pdfType}`;
    setSwappingPdf(swapKey);
    try {
      // 1. Clear PDF URL on all questions
      const updatedCount = await updateExamPdf(subject, year, level, pdfType, undefined);

      // 2. Delete file from storage
      if (oldUrl && oldUrl.includes('/storage/v1/object/public/')) {
        try {
          await worksheetStorage.deleteWorksheet(oldUrl);
        } catch (e) {
          console.error('Kon PDF niet verwijderen uit storage:', e);
        }
      }

      alert(`PDF verwijderd van ${updatedCount} vragen.`);
      await loadQuestions();
    } catch (error: any) {
      console.error('Fout bij verwijderen PDF:', error);
      alert(`Fout: ${error.message || 'Onbekende fout'}`);
    } finally {
      setSwappingPdf(null);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestions();
      setQuestions(data);
    } catch (error) {
      console.error('Fout bij laden vragen:', error);
    } finally {
      setLoading(false);
    }
  };

  // Groepeer vragen per vak en jaar
  const groupedData = useMemo(() => {
    let filtered = questions;

    // Filter op niveau
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(q => q.level === selectedLevel);
    }

    // Filter op zoekterm
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.text.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query) ||
        (q.source && q.source.toLowerCase().includes(query))
      );
    }

    // Groepeer per vak
    const subjectMap = new Map<string, Question[]>();
    filtered.forEach(q => {
      const list = subjectMap.get(q.subject) || [];
      list.push(q);
      subjectMap.set(q.subject, list);
    });

    // Sorteer vakken volgens SUBJECTS volgorde
    const result: SubjectGroup[] = [];

    // Eerst bekende vakken
    SUBJECTS.forEach(subject => {
      const subjectQuestions = subjectMap.get(subject);
      if (subjectQuestions && subjectQuestions.length > 0) {
        result.push(createSubjectGroup(subject, subjectQuestions));
        subjectMap.delete(subject);
      }
    });

    // Dan overige vakken
    subjectMap.forEach((subjectQuestions, subject) => {
      result.push(createSubjectGroup(subject, subjectQuestions));
    });

    return result;
  }, [questions, selectedLevel, searchQuery]);

  function createSubjectGroup(subject: string, questions: Question[]): SubjectGroup {
    // Groepeer per jaar
    const yearMap = new Map<number, Question[]>();
    const noYear: Question[] = [];

    questions.forEach(q => {
      if (q.examYear) {
        const list = yearMap.get(q.examYear) || [];
        list.push(q);
        yearMap.set(q.examYear, list);
      } else {
        noYear.push(q);
      }
    });

    // Sorteer jaren (nieuwste eerst)
    const years: YearGroup[] = [];
    const sortedYears = [...yearMap.keys()].sort((a, b) => b - a);

    sortedYears.forEach(year => {
      const yearQuestions = yearMap.get(year)!;
      years.push({
        year,
        questions: yearQuestions,
        byLevel: {
          'VMBO-TL': yearQuestions.filter(q => q.level === 'VMBO-TL'),
          'HAVO': yearQuestions.filter(q => q.level === 'HAVO'),
          'VWO': yearQuestions.filter(q => q.level === 'VWO'),
        }
      });
    });

    // Voeg vragen zonder jaar toe als "Overig"
    if (noYear.length > 0) {
      years.push({
        year: 0, // 0 = geen jaar
        questions: noYear,
        byLevel: {
          'VMBO-TL': noYear.filter(q => q.level === 'VMBO-TL'),
          'HAVO': noYear.filter(q => q.level === 'HAVO'),
          'VWO': noYear.filter(q => q.level === 'VWO'),
        }
      });
    }

    return {
      subject,
      totalQuestions: questions.length,
      years
    };
  }

  const toggleSubject = (subject: string) => {
    const next = new Set(expandedSubjects);
    if (next.has(subject)) {
      next.delete(subject);
    } else {
      next.add(subject);
    }
    setExpandedSubjects(next);
  };

  const toggleYear = (key: string) => {
    const next = new Set(expandedYears);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedYears(next);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) {
      try {
        await deleteQuestion(id);
        await loadQuestions();
      } catch (error) {
        console.error('Fout bij verwijderen:', error);
        alert('Kon vraag niet verwijderen.');
      }
    }
  };

  const handleDeleteExam = async (subject: string, year: number, level: StudentLevel, questionCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const examLabel = `${subject} ${year} ${level}`;
    if (!confirm(`Weet je zeker dat je het hele examen "${examLabel}" wilt verwijderen?\n\nDit verwijdert ${questionCount} vragen inclusief alle afbeeldingen, bijlagen en PDF's.\n\nDeze actie kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    const deleteKey = `${subject}-${year}-${level}`;
    setDeletingExam(deleteKey);
    try {
      const result = await deleteExam(subject, year, level);
      const messages = [`${result.deletedQuestions} vragen verwijderd`];
      if (result.deletedImages > 0) messages.push(`${result.deletedImages} afbeeldingen verwijderd`);
      if (result.deletedWorksheets > 0) messages.push(`${result.deletedWorksheets} bijlagen/PDF's verwijderd`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} fouten opgetreden`);
      alert(messages.join('\n'));
      await loadQuestions();
    } catch (error) {
      console.error('Fout bij verwijderen examen:', error);
      alert('Er ging iets mis bij het verwijderen van het examen.');
    } finally {
      setDeletingExam(null);
    }
  };

  const totalQuestions = groupedData.reduce((sum, g) => sum + g.totalQuestions, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Examenbibliotheek</h1>
        <p className="text-slate-500">Bekijk en beheer alle examenvragen per vak en jaar</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek in vragen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Niveau:</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as StudentLevel | 'ALL')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">Alle niveaus</option>
            <option value="VMBO-TL">VMBO-TL</option>
            <option value="HAVO">HAVO</option>
            <option value="VWO">VWO</option>
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={loadQuestions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
          <div className="text-sm text-slate-500">Totaal vragen</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{groupedData.length}</div>
          <div className="text-sm text-slate-500">Vakken</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(questions.filter(q => q.examYear).map(q => q.examYear)).size}
          </div>
          <div className="text-sm text-slate-500">Examenjaren</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {questions.filter(q => q.type === 'OPEN').length}
          </div>
          <div className="text-sm text-slate-500">Open vragen</div>
        </div>
      </div>

      {/* Folder Structure */}
      {groupedData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {searchQuery ? 'Geen resultaten' : 'Geen examens gevonden'}
          </h3>
          <p className="text-slate-500 text-sm">
            {searchQuery
              ? `Geen vragen gevonden voor "${searchQuery}"`
              : 'Voeg examenvragen toe via "Examen Toevoegen" of "CSV/JSON Import"'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {groupedData.map((subjectGroup, idx) => {
            const isSubjectExpanded = expandedSubjects.has(subjectGroup.subject);

            return (
              <div key={subjectGroup.subject} className={idx > 0 ? 'border-t border-slate-100' : ''}>
                {/* Subject Row */}
                <button
                  onClick={() => toggleSubject(subjectGroup.subject)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  {isSubjectExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  {isSubjectExpanded ? (
                    <FolderOpen className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <Folder className="w-5 h-5 text-indigo-500" />
                  )}
                  <span className="font-semibold text-slate-800 flex-1">{subjectGroup.subject}</span>
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {subjectGroup.totalQuestions} {subjectGroup.totalQuestions === 1 ? 'vraag' : 'vragen'}
                  </span>
                </button>

                {/* Years */}
                {isSubjectExpanded && (
                  <div className="bg-slate-50/50">
                    {subjectGroup.years.map(yearGroup => {
                      const yearKey = `${subjectGroup.subject}-${yearGroup.year}`;
                      const isYearExpanded = expandedYears.has(yearKey);
                      const yearLabel = yearGroup.year === 0 ? 'Overig' : yearGroup.year.toString();

                      return (
                        <div key={yearKey}>
                          {/* Year Row */}
                          <button
                            onClick={() => toggleYear(yearKey)}
                            className="w-full flex items-center gap-3 pl-10 pr-4 py-2.5 hover:bg-slate-100 transition-colors text-left"
                          >
                            {isYearExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <Calendar className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-slate-700 flex-1">{yearLabel}</span>

                            {/* Level badges */}
                            <div className="flex gap-2">
                              {yearGroup.byLevel['VMBO-TL'].length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                  VMBO: {yearGroup.byLevel['VMBO-TL'].length}
                                </span>
                              )}
                              {yearGroup.byLevel['HAVO'].length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                                  HAVO: {yearGroup.byLevel['HAVO'].length}
                                </span>
                              )}
                              {yearGroup.byLevel['VWO'].length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                  VWO: {yearGroup.byLevel['VWO'].length}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Expanded: delete buttons + questions */}
                          {isYearExpanded && (
                            <div className="bg-white border-t border-slate-100">
                              {/* PDF management per level */}
                              {yearGroup.year > 0 && (
                                <div className="px-16 py-3 bg-indigo-50/50 border-b border-slate-100 space-y-3">
                                  {(['VMBO-TL', 'HAVO', 'VWO'] as StudentLevel[]).map(lvl => {
                                    const levelQuestions = yearGroup.byLevel[lvl];
                                    if (levelQuestions.length === 0) return null;
                                    const currentPdfUrl = levelQuestions.find(q => q.examPdfUrl)?.examPdfUrl;
                                    const currentBijlageUrl = levelQuestions.find(q => q.examBijlageUrl)?.examBijlageUrl;
                                    const pdfSwapKey = `${subjectGroup.subject}-${yearGroup.year}-${lvl}-examPdfUrl`;
                                    const bijlageSwapKey = `${subjectGroup.subject}-${yearGroup.year}-${lvl}-examBijlageUrl`;
                                    const isSwappingPdf = swappingPdf === pdfSwapKey;
                                    const isSwappingBijlage = swappingPdf === bijlageSwapKey;

                                    return (
                                      <div key={lvl} className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-600 font-bold w-16">{lvl}:</span>

                                        {/* Opdrachten PDF */}
                                        {currentPdfUrl ? (
                                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-100 border border-indigo-200">
                                            <FileText className="w-3 h-3 text-indigo-600" />
                                            <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 hover:underline max-w-[120px] truncate">
                                              Opdrachten
                                            </a>
                                            <label className={`cursor-pointer p-0.5 rounded hover:bg-indigo-200 transition-colors ${isSwappingPdf ? 'opacity-50 pointer-events-none' : ''}`} title="Wissel PDF">
                                              {isSwappingPdf ? <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" /> : <ArrowLeftRight className="w-3 h-3 text-indigo-600" />}
                                              <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={isSwappingPdf} onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleSwapPdf(subjectGroup.subject, yearGroup.year, lvl, 'examPdfUrl', file, currentPdfUrl);
                                                e.target.value = '';
                                              }} />
                                            </label>
                                            <button
                                              onClick={() => handleRemovePdf(subjectGroup.subject, yearGroup.year, lvl, 'examPdfUrl', currentPdfUrl)}
                                              className="p-0.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                              title="Verwijder PDF"
                                              disabled={isSwappingPdf}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className={`flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed cursor-pointer transition-colors ${
                                            isSwappingPdf ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                                          }`}>
                                            {isSwappingPdf ? (
                                              <><Loader2 className="w-3 h-3 animate-spin text-indigo-600" /><span className="text-indigo-600">Uploaden...</span></>
                                            ) : (
                                              <><Upload className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Opdrachten PDF</span></>
                                            )}
                                            <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={isSwappingPdf} onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) handleSwapPdf(subjectGroup.subject, yearGroup.year, lvl, 'examPdfUrl', file);
                                              e.target.value = '';
                                            }} />
                                          </label>
                                        )}

                                        {/* Bijlage PDF */}
                                        {currentBijlageUrl ? (
                                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 border border-amber-200">
                                            <Paperclip className="w-3 h-3 text-amber-600" />
                                            <a href={currentBijlageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 hover:underline max-w-[120px] truncate">
                                              Bijlage
                                            </a>
                                            <label className={`cursor-pointer p-0.5 rounded hover:bg-amber-200 transition-colors ${isSwappingBijlage ? 'opacity-50 pointer-events-none' : ''}`} title="Wissel bijlage">
                                              {isSwappingBijlage ? <Loader2 className="w-3 h-3 text-amber-600 animate-spin" /> : <ArrowLeftRight className="w-3 h-3 text-amber-600" />}
                                              <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={isSwappingBijlage} onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleSwapPdf(subjectGroup.subject, yearGroup.year, lvl, 'examBijlageUrl', file, currentBijlageUrl);
                                                e.target.value = '';
                                              }} />
                                            </label>
                                            <button
                                              onClick={() => handleRemovePdf(subjectGroup.subject, yearGroup.year, lvl, 'examBijlageUrl', currentBijlageUrl)}
                                              className="p-0.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                                              title="Verwijder bijlage"
                                              disabled={isSwappingBijlage}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className={`flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed cursor-pointer transition-colors ${
                                            isSwappingBijlage ? 'border-amber-300 bg-amber-50' : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
                                          }`}>
                                            {isSwappingBijlage ? (
                                              <><Loader2 className="w-3 h-3 animate-spin text-amber-600" /><span className="text-amber-600">Uploaden...</span></>
                                            ) : (
                                              <><Upload className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Bijlage PDF</span></>
                                            )}
                                            <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={isSwappingBijlage} onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) handleSwapPdf(subjectGroup.subject, yearGroup.year, lvl, 'examBijlageUrl', file);
                                              e.target.value = '';
                                            }} />
                                          </label>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Delete exam per level */}
                              {yearGroup.year > 0 && (
                                <div className="flex items-center gap-2 px-16 py-2 bg-slate-50 border-b border-slate-100">
                                  <span className="text-xs text-slate-500 mr-1">Verwijder examen:</span>
                                  {(['VMBO-TL', 'HAVO', 'VWO'] as StudentLevel[]).map(lvl => {
                                    const count = yearGroup.byLevel[lvl].length;
                                    if (count === 0) return null;
                                    const deleteKey = `${subjectGroup.subject}-${yearGroup.year}-${lvl}`;
                                    const isDeleting = deletingExam === deleteKey;
                                    return (
                                      <button
                                        key={lvl}
                                        onClick={(e) => handleDeleteExam(subjectGroup.subject, yearGroup.year, lvl, count, e)}
                                        disabled={isDeleting}
                                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                                          isDeleting
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                        }`}
                                        title={`Verwijder ${subjectGroup.subject} ${yearGroup.year} ${lvl} (${count} vragen)`}
                                      >
                                        {isDeleting ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3 h-3" />
                                        )}
                                        {lvl} ({count})
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {yearGroup.questions.map(q => (
                                <div
                                  key={q.id}
                                  className="flex items-start gap-3 pl-16 pr-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 group"
                                >
                                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                        q.level === 'VMBO-TL' ? 'bg-blue-50 text-blue-600' :
                                        q.level === 'HAVO' ? 'bg-orange-50 text-orange-600' :
                                        'bg-purple-50 text-purple-600'
                                      }`}>
                                        {q.level}
                                      </span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        q.type === 'MULTIPLE_CHOICE'
                                          ? 'bg-indigo-50 text-indigo-600'
                                          : 'bg-amber-50 text-amber-600'
                                      }`}>
                                        {q.type === 'MULTIPLE_CHOICE' ? 'MC' : 'Open'}
                                      </span>
                                      {q.source && (
                                        <span className="text-xs text-slate-400 truncate">
                                          {q.source}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onEditQuestion && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onEditQuestion(q); }}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                        title="Bewerken"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => handleDelete(q.id, e)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                      title="Verwijderen"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
