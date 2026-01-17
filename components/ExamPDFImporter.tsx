import React, { useState, useRef } from 'react';
import { StudentLevel, BulkImportQuestion, ImportResult } from '../types';
import {
  parseExamPDF,
  ParsedQuestion,
  convertToBulkImportFormat,
  validateParsedQuestion,
  getParseStatistics,
} from '../services/examPdfService';
import { bulkImportQuestions } from '../services/importService';
import { compressImage } from '../utils/imageUtils';
import { Button } from './Button';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileQuestion,
  BookOpen,
  Sparkles,
} from 'lucide-react';

const SUBJECTS = [
  'Aardrijkskunde', 'Bedrijfseconomie', 'Biologie', 'Duits', 'Economie',
  'Engels', 'Frans', 'Geschiedenis', 'Kunst Algemeen', 'Maatschappijwetenschappen',
  'Natuurkunde', 'Nederlands', 'Scheikunde', 'Wiskunde A', 'Wiskunde B', 'Wiskunde C'
];

type ImportStep = 'upload' | 'parsing' | 'review' | 'importing' | 'complete';

export const ExamPDFImporter: React.FC = () => {
  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');

  // Upload state
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);
  const [answersText, setAnswersText] = useState('');
  const [useTextAnswers, setUseTextAnswers] = useState(false);

  // Metadata
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState<StudentLevel>('HAVO');
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const [source, setSource] = useState('');

  // Parsed questions
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = useState('');

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedQuestion | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  // Import result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const questionsInputRef = useRef<HTMLInputElement>(null);
  const answersInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Statistics
  const stats = parsedQuestions.length > 0 ? getParseStatistics(parsedQuestions) : null;

  // ========== HANDLERS ==========

  const handleQuestionsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setQuestionsFile(file);
      setParseError('');
    } else if (file) {
      setParseError('Alleen PDF bestanden zijn toegestaan voor vragen');
    }
  };

  const handleAnswersFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAnswersFile(file);
    }
  };

  const handleParse = async () => {
    if (!questionsFile) {
      setParseError('Upload eerst een PDF met vragen');
      return;
    }

    setCurrentStep('parsing');
    setParseError('');

    try {
      const result = await parseExamPDF({
        questionsFile,
        answersFile: answersFile || undefined,
        answersText: useTextAnswers ? answersText : undefined,
        subject,
        level,
        examYear,
        source: source || `${subject} ${level} ${examYear}`,
      });

      if (result.success && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setCurrentStep('review');
      } else {
        setParseError(result.error || 'Kon geen vragen uit de PDF halen');
        setCurrentStep('upload');
      }
    } catch (error: any) {
      setParseError(error.message || 'Er ging iets mis bij het parsen');
      setCurrentStep('upload');
    }
  };

  const handleImport = async () => {
    if (parsedQuestions.length === 0) return;

    setCurrentStep('importing');

    try {
      const bulkQuestions = convertToBulkImportFormat(parsedQuestions);
      const result = await bulkImportQuestions(bulkQuestions);
      setImportResult(result);
      setCurrentStep('complete');
    } catch (error: any) {
      setParseError(error.message || 'Import mislukt');
      setCurrentStep('review');
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setQuestionsFile(null);
    setAnswersFile(null);
    setAnswersText('');
    setParsedQuestions([]);
    setParseError('');
    setImportResult(null);
    setEditingIndex(null);
    setEditForm(null);
    setExpandedQuestions(new Set());
  };

  // Editing functions
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...parsedQuestions[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
    setIsCompressing(false);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editForm) {
      const newQuestions = [...parsedQuestions];
      newQuestions[editingIndex] = editForm;
      setParsedQuestions(newQuestions);
      cancelEditing();
    }
  };

  const removeQuestion = (index: number) => {
    if (confirm('Weet je zeker dat je deze vraag wilt verwijderen?')) {
      const newQuestions = [...parsedQuestions];
      newQuestions.splice(index, 1);
      setParsedQuestions(newQuestions);
      if (editingIndex === index) cancelEditing();
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  // Image handling
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImage(file);
        setEditForm({ ...editForm, imageUrl: compressedBase64 });
      } catch (err) {
        console.error("Fout bij comprimeren:", err);
        alert("Kon afbeelding niet verwerken.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const removeImage = () => {
    if (editForm) {
      setEditForm({ ...editForm, imageUrl: undefined, hasImage: false });
    }
  };

  // ========== RENDER ==========

  // Upload Step
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Eindexamen Import</h2>
          <p className="text-slate-500 text-sm">Upload PDF bestanden en laat AI de vragen extraheren</p>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Examen Gegevens</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Vak</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Niveau</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as StudentLevel)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            >
              <option value="VMBO-TL">VMBO-TL</option>
              <option value="HAVO">HAVO</option>
              <option value="VWO">VWO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Examenjaar</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={examYear}
              onChange={(e) => setExamYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Bron (optioneel)</label>
            <input
              type="text"
              placeholder="bijv. Tijdvak 1"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Questions PDF Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileQuestion className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">PDF met Vragen</h3>
          <span className="text-xs text-red-500 font-medium">*verplicht</span>
        </div>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            questionsFile
              ? 'border-green-300 bg-green-50'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
        >
          <input
            ref={questionsInputRef}
            type="file"
            accept=".pdf"
            onChange={handleQuestionsFileSelect}
            className="hidden"
          />
          {questionsFile ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-slate-700">{questionsFile.name}</p>
                <p className="text-sm text-slate-500">{(questionsFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => setQuestionsFile(null)}
                className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <button
                onClick={() => questionsInputRef.current?.click()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Kies PDF met Vragen
              </button>
              <p className="text-sm text-slate-500 mt-3">Upload het officiële examen PDF bestand</p>
            </>
          )}
        </div>
      </div>

      {/* Answers Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Antwoorden / Correctievoorschrift</h3>
          <span className="text-xs text-slate-400 font-medium">(optioneel)</span>
        </div>

        {/* Toggle between PDF and Text */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setUseTextAnswers(false)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
              !useTextAnswers
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            PDF Bestand
          </button>
          <button
            onClick={() => setUseTextAnswers(true)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
              useTextAnswers
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Tekst Invoeren
          </button>
        </div>

        {!useTextAnswers ? (
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              answersFile
                ? 'border-green-300 bg-green-50'
                : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={answersInputRef}
              type="file"
              accept=".pdf"
              onChange={handleAnswersFileSelect}
              className="hidden"
            />
            {answersFile ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-slate-700">{answersFile.name}</span>
                <button
                  onClick={() => setAnswersFile(null)}
                  className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => answersInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm"
                >
                  Kies Antwoorden PDF
                </button>
                <p className="text-xs text-slate-500 mt-2">Upload het correctievoorschrift</p>
              </>
            )}
          </div>
        ) : (
          <textarea
            value={answersText}
            onChange={(e) => setAnswersText(e.target.value)}
            placeholder="Plak hier de antwoorden...&#10;&#10;Voorbeeld:&#10;1. B&#10;2. D&#10;3. Het antwoord moet bevatten: ..."
            className="w-full h-48 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
          />
        )}
      </div>

      {/* Error Message */}
      {parseError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fout bij parsen</p>
            <p className="text-sm mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {/* Parse Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleParse}
          disabled={!questionsFile}
          className="px-8 py-3 text-base shadow-lg shadow-indigo-100"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Analyseer met AI
        </Button>
      </div>
    </div>
  );

  // Parsing Step (Loading)
  const renderParsingStep = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-indigo-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-indigo-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mt-8">AI analyseert het examen...</h3>
      <p className="text-slate-500 mt-2">Dit kan 30-60 seconden duren</p>
      <div className="mt-6 space-y-2 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          Vragen extraheren uit PDF...
        </p>
        {(answersFile || answersText) && (
          <p className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            Antwoorden koppelen...
          </p>
        )}
      </div>
    </div>
  );

  // Review Step
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review & Bewerk</h2>
          <p className="text-slate-500 text-sm mt-1">
            Controleer de geparseerde vragen en voeg afbeeldingen toe waar nodig
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            Opnieuw
          </Button>
          <Button onClick={handleImport} className="shadow-lg shadow-indigo-100">
            <Save className="w-4 h-4 mr-2" />
            Importeer {parsedQuestions.length} Vragen
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Totaal</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-700">{stats.multipleChoice}</div>
            <div className="text-xs text-indigo-600 uppercase tracking-wide">Meerkeuze</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.open}</div>
            <div className="text-xs text-orange-600 uppercase tracking-wide">Open</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.withAnswers}</div>
            <div className="text-xs text-green-600 uppercase tracking-wide">Met Antwoord</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.withContext}</div>
            <div className="text-xs text-blue-600 uppercase tracking-wide">Met Brontekst</div>
          </div>
          {stats.needsReview > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.needsReview}</div>
              <div className="text-xs text-amber-600 uppercase tracking-wide">Check Nodig</div>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {parsedQuestions.map((q, idx) => {
          const isEditing = editingIndex === idx;
          const isExpanded = expandedQuestions.has(idx);
          const validation = validateParsedQuestion(q);

          if (isEditing && editForm) {
            return (
              <div key={idx} className="border-2 border-indigo-500 rounded-xl p-5 bg-indigo-50/50 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-indigo-900">Vraag {q.questionNumber || idx + 1} Bewerken</h4>
                  <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Question */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Type</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditForm({ ...editForm, type: 'MULTIPLE_CHOICE' })}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                            editForm.type === 'MULTIPLE_CHOICE'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          Meerkeuze
                        </button>
                        <button
                          onClick={() => setEditForm({ ...editForm, type: 'OPEN' })}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                            editForm.type === 'OPEN'
                              ? 'bg-orange-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          Open
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vraag</label>
                      <textarea
                        value={editForm.text}
                        onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                        className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Brontekst (optioneel)</label>
                      <textarea
                        value={editForm.contextText || ''}
                        onChange={(e) => setEditForm({ ...editForm, contextText: e.target.value })}
                        className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        rows={4}
                        placeholder="Eventuele brontekst bij de vraag..."
                      />
                    </div>
                  </div>

                  {/* Right Column - Answer & Image */}
                  <div className="space-y-4">
                    {editForm.type === 'MULTIPLE_CHOICE' ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Antwoordopties</label>
                          <div className="space-y-2">
                            {(editForm.options || ['', '', '', '']).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="correctAnswer"
                                  checked={editForm.correctAnswer === opt}
                                  onChange={() => setEditForm({ ...editForm, correctAnswer: opt })}
                                  className="w-4 h-4 text-indigo-600"
                                />
                                <span className="font-bold text-slate-500 w-6">{String.fromCharCode(65 + optIdx)}.</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...(editForm.options || [])];
                                    newOptions[optIdx] = e.target.value;
                                    setEditForm({ ...editForm, options: newOptions });
                                  }}
                                  className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelantwoord</label>
                        <textarea
                          value={editForm.modelAnswer || ''}
                          onChange={(e) => setEditForm({ ...editForm, modelAnswer: e.target.value })}
                          className="w-full p-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-orange-50"
                          rows={5}
                          placeholder="Het modelantwoord / beoordelingscriteria..."
                        />
                      </div>
                    )}

                    {/* Image Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Afbeelding</label>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <div className={`border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center ${
                        editForm.imageUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300'
                      }`}>
                        {editForm.imageUrl ? (
                          <div className="relative w-full h-full p-2">
                            <img src={editForm.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                            <button
                              onClick={removeImage}
                              className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {isCompressing ? (
                              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            ) : (
                              <>
                                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                <button
                                  onClick={() => imageInputRef.current?.click()}
                                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200"
                                >
                                  Afbeelding Toevoegen
                                </button>
                                {q.hasImage && q.imageDescription && (
                                  <p className="text-xs text-amber-600 mt-2 px-4 text-center">
                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                    PDF bevatte afbeelding: {q.imageDescription}
                                  </p>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="secondary" onClick={cancelEditing} size="sm">Annuleren</Button>
                      <Button onClick={saveEditing} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Opslaan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`bg-white border rounded-xl transition-all ${
                !validation.valid
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start gap-4 p-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  !validation.valid
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {q.questionNumber || idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      q.type === 'MULTIPLE_CHOICE'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {q.type === 'MULTIPLE_CHOICE' ? 'Meerkeuze' : 'Open'}
                    </span>
                    {q.correctAnswer && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Antwoord
                      </span>
                    )}
                    {q.modelAnswer && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Modelantwoord
                      </span>
                    )}
                    {q.contextText && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Brontekst
                      </span>
                    )}
                    {q.imageUrl && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Afbeelding
                      </span>
                    )}
                    {q.hasImage && !q.imageUrl && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Afbeelding nodig
                      </span>
                    )}
                    {!validation.valid && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Check nodig
                      </span>
                    )}
                  </div>

                  <p className={`text-sm text-slate-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {q.text}
                  </p>

                  {/* Validation Errors */}
                  {!validation.valid && (
                    <div className="mt-2 text-xs text-amber-700">
                      {validation.errors.map((err, i) => (
                        <span key={i} className="block">• {err}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleExpanded(idx)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    title={isExpanded ? 'Inklappen' : 'Uitklappen'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEditing(idx)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="Bewerken"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {q.type === 'MULTIPLE_CHOICE' && q.options && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Opties</p>
                        <div className="space-y-1">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`text-sm p-2 rounded ${
                                q.correctAnswer === opt
                                  ? 'bg-green-100 text-green-800 font-medium'
                                  : 'bg-slate-50 text-slate-600'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt}
                              {q.correctAnswer === opt && (
                                <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.type === 'OPEN' && q.modelAnswer && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Modelantwoord</p>
                        <div className="text-sm p-3 bg-orange-50 rounded-lg text-orange-900 border border-orange-100">
                          {q.modelAnswer}
                        </div>
                      </div>
                    )}

                    {q.contextText && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Brontekst</p>
                        <div className="text-sm p-3 bg-blue-50 rounded-lg text-blue-900 border border-blue-100 max-h-48 overflow-y-auto">
                          {q.contextText}
                        </div>
                      </div>
                    )}

                    {q.imageUrl && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Afbeelding</p>
                        <img src={q.imageUrl} className="max-h-48 rounded-lg border border-slate-200" alt="Vraag afbeelding" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Importing Step
  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mb-6" />
      <h3 className="text-xl font-bold text-slate-800">Vragen worden geïmporteerd...</h3>
      <p className="text-slate-500 mt-2">{parsedQuestions.length} vragen opslaan naar database</p>
    </div>
  );

  // Complete Step
  const renderCompleteStep = () => (
    <div className="flex flex-col items-center justify-center py-16">
      {importResult?.success ? (
        <>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Import Succesvol!</h3>
          <p className="text-slate-500 mb-6">
            {importResult.importedCount} vragen zijn toegevoegd aan de database
          </p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Import Voltooid met Fouten</h3>
          <p className="text-slate-500 mb-2">
            {importResult?.importedCount || 0} van {parsedQuestions.length} vragen geïmporteerd
          </p>
        </>
      )}

      {importResult && importResult.failedCount > 0 && (
        <div className="w-full max-w-lg mt-4">
          <details className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <summary className="cursor-pointer font-medium text-amber-800">
              {importResult.failedCount} vragen mislukt - toon details
            </summary>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {importResult.errors.slice(0, 10).map((err, idx) => (
                <div key={idx} className="text-sm text-amber-700 bg-white p-2 rounded border border-amber-100">
                  Vraag {err.row}: {err.message}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <Button onClick={handleReset} className="mt-8">
        Nieuw Examen Importeren
      </Button>
    </div>
  );

  // Main Render
  return (
    <div className="max-w-5xl mx-auto">
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'parsing' && renderParsingStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'importing' && renderImportingStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
};
