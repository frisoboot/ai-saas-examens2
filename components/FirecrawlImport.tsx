import React, { useState, useRef } from 'react';
import { BulkImportQuestion, ImportResult, StudentLevel } from '../types';
import { scrapeExamFromPdf } from '../services/firecrawlService';
import { bulkImportQuestions } from '../services/importService';
import { worksheetStorage } from '../services/worksheetStorageService';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS } from '../constants/subjects';
import { Button } from './Button';
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  Pencil, Trash2, Save, X, Globe
} from 'lucide-react';

type ImportStep = 'input' | 'uploading' | 'extracting' | 'preview' | 'importing' | 'done';

export const FirecrawlImport: React.FC = () => {
  const { session } = useAuth();

  // Input state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState<StudentLevel>('HAVO');
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear());

  // Process state
  const [step, setStep] = useState<ImportStep>('input');
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Preview state
  const [questions, setQuestions] = useState<BulkImportQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BulkImportQuestion | null>(null);

  // Import result
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (file.type !== 'application/pdf') {
      setError('Alleen PDF bestanden zijn toegestaan.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Bestand is te groot. Maximum grootte is 20MB.');
      return;
    }

    setPdfFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setError('');

    if (file.type !== 'application/pdf') {
      setError('Alleen PDF bestanden zijn toegestaan.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Bestand is te groot. Maximum grootte is 20MB.');
      return;
    }

    setPdfFile(file);
  };

  const handleExtract = async () => {
    if (!pdfFile || !session?.access_token) return;

    setError('');
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Upload PDF to Supabase Storage
      setStep('uploading');
      const uploadedUrl = await worksheetStorage.uploadWorksheet(pdfFile);
      setPdfUrl(uploadedUrl);

      // Step 2: Send to Firecrawl for extraction
      setStep('extracting');
      const result = await scrapeExamFromPdf(
        uploadedUrl,
        subject,
        level,
        examYear,
        session.access_token,
        abortControllerRef.current.signal
      );

      if (result.questions.length === 0) {
        setError('Geen examenvragen gevonden in dit PDF document. Probeer een ander bestand.');
        setStep('input');
        return;
      }

      setQuestions(result.questions);
      setStep('preview');

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStep('input');
        return;
      }
      setError(err.message || 'Er ging iets mis bij het verwerken van de PDF.');
      setStep('input');
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setStep('input');
  };

  const handleImport = async () => {
    if (questions.length === 0) return;

    setStep('importing');
    setError('');

    try {
      // Inject examPdfUrl into all questions
      const questionsWithPdf = questions.map(q => ({
        ...q,
        examPdfUrl: pdfUrl || undefined,
      }));

      const result = await bulkImportQuestions(questionsWithPdf);
      setImportResult(result);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Fout bij het importeren van vragen.');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfUrl(null);
    setQuestions([]);
    setEditingIndex(null);
    setEditForm(null);
    setImportResult(null);
    setError('');
    setStep('input');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Editing functions
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...questions[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editForm) {
      const updated = [...questions];
      updated[editingIndex] = editForm;
      setQuestions(updated);
      cancelEditing();
    }
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
    if (editingIndex === index) cancelEditing();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Globe className="w-7 h-7 text-indigo-600" />
          PDF Examen Scraper
        </h2>
        <p className="text-slate-600 mt-1">
          Upload een examen-PDF en laat Firecrawl automatisch de vragen extraheren.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Step 1: Input */}
      {(step === 'input') && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Examen PDF</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                pdfFile ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-600" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{pdfFile.name}</p>
                    <p className="text-sm text-slate-500">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium mb-1">Sleep een PDF hierheen</p>
                  <p className="text-sm text-slate-500 mb-3">of</p>
                  <label className="cursor-pointer px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors">
                    Kies Bestand
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-3">Maximaal 20MB, alleen PDF</p>
                </>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Vak</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Niveau</label>
              <div className="flex gap-2">
                {(['VMBO-TL', 'HAVO', 'VWO'] as StudentLevel[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      level === l
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Examenjaar</label>
              <input
                type="number"
                value={examYear}
                onChange={e => setExamYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Extract button */}
          <Button
            onClick={handleExtract}
            disabled={!pdfFile || !session?.access_token}
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <Globe className="w-5 h-5" />
            Examenvragen Extraheren
          </Button>
        </div>
      )}

      {/* Loading states */}
      {(step === 'uploading' || step === 'extracting') && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {step === 'uploading' ? 'PDF uploaden...' : 'Examenvragen extraheren...'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {step === 'uploading'
              ? 'PDF wordt geupload naar de server.'
              : 'Firecrawl analyseert de PDF en extraheert de vragen. Dit kan 15-30 seconden duren.'
            }
          </p>
          <Button variant="secondary" onClick={handleCancel} size="sm">
            Annuleren
          </Button>
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && questions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Review & Bewerk ({questions.length} vragen)
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleReset} size="sm">
                Opnieuw
              </Button>
              <Button
                onClick={handleImport}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                Importeer Alles
              </Button>
            </div>
          </div>

          {pdfUrl && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800 flex-1">
                PDF wordt automatisch gekoppeld als examPdfUrl aan alle vragen.
              </span>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-shrink-0">
                Bekijk PDF
              </a>
            </div>
          )}

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditing = editingIndex === idx;

              if (isEditing && editForm) {
                return (
                  <div key={idx} className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50/50 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-indigo-900">Vraag {idx + 1} Bewerken</h4>
                      <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Type</label>
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm({ ...editForm, type: e.target.value as 'MULTIPLE_CHOICE' | 'OPEN' })}
                          className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                        >
                          <option value="MULTIPLE_CHOICE">Meerkeuze</option>
                          <option value="OPEN">Open</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vraag</label>
                        <textarea
                          value={editForm.text}
                          onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                          className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          rows={3}
                        />
                      </div>

                      {editForm.contextText !== undefined && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Brontekst</label>
                          <textarea
                            value={editForm.contextText || ''}
                            onChange={e => setEditForm({ ...editForm, contextText: e.target.value || undefined })}
                            className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            rows={3}
                          />
                        </div>
                      )}

                      {editForm.type === 'MULTIPLE_CHOICE' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Opties (1 per regel)</label>
                          <textarea
                            value={(editForm.options || []).join('\n')}
                            onChange={e => setEditForm({ ...editForm, options: e.target.value.split('\n').filter(o => o.trim()) })}
                            className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            rows={4}
                            placeholder="A optie&#10;B optie&#10;C optie&#10;D optie"
                          />
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Juist antwoord</label>
                            <input
                              value={editForm.correctAnswer || ''}
                              onChange={e => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                              className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {editForm.type === 'OPEN' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelantwoord</label>
                          <textarea
                            value={editForm.modelAnswer || ''}
                            onChange={e => setEditForm({ ...editForm, modelAnswer: e.target.value || undefined })}
                            className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            rows={3}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Score (punten)</label>
                          <input
                            type="number"
                            value={editForm.score || ''}
                            onChange={e => setEditForm({ ...editForm, score: parseInt(e.target.value) || undefined })}
                            className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sectie</label>
                          <input
                            value={editForm.section || ''}
                            onChange={e => setEditForm({ ...editForm, section: e.target.value || undefined })}
                            className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={cancelEditing} size="sm">Annuleren</Button>
                        <Button onClick={saveEditing} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                          <Save className="w-4 h-4 mr-2" /> Opslaan
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all bg-white group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        q.type === 'MULTIPLE_CHOICE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {q.type === 'MULTIPLE_CHOICE' ? 'Meerkeuze' : 'Open'}
                      </span>
                      {q.score && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{q.score}p</span>
                      )}
                      {q.section && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{q.section}</span>
                      )}
                      {q.contextText && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Brontekst
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{q.text}</p>
                    {q.type === 'MULTIPLE_CHOICE' && q.options && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              q.correctAnswer && opt.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                                ? 'bg-green-100 text-green-700 font-medium'
                                : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditing(idx)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Bewerken">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeQuestion(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Verwijderen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleImport}
              variant="primary"
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Importeer {questions.length} Vragen
            </Button>
          </div>
        </div>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Vragen importeren...</h3>
          <p className="text-slate-500 text-sm mt-2">{questions.length} vragen worden opgeslagen.</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && importResult && (
        <div className={`p-6 rounded-xl border-2 ${
          importResult.success ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {importResult.success ? 'Import Succesvol!' : 'Import Voltooid met Fouten'}
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">{importResult.importedCount} vragen geimporteerd</p>
                {importResult.failedCount > 0 && (
                  <p className="text-orange-700">{importResult.failedCount} vragen mislukt</p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Vraag {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={handleReset}>
              Nog een examen importeren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
