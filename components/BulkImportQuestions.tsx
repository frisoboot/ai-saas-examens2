import React, { useState, useRef } from 'react';
import { BulkImportQuestion, ImportResult, QuestionType, StudentLevel } from '../types';
import { parseCSV, parseJSON, bulkImportQuestions, generateCSVTemplate, validateFileType, readFileAsText } from '../services/importService';
import { compressImage } from '../utils/imageUtils';
import { Button } from './Button';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, Pencil, Trash2, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export const BulkImportQuestions: React.FC = () => {
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<BulkImportQuestion[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BulkImportQuestion | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setImportResult(null);

    const validation = validateFileType(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Ongeldig bestand');
      return;
    }

    setFile(selectedFile);

    try {
      const text = await readFileAsText(selectedFile);
      const parsed = fileType === 'csv' ? parseCSV(text) : parseJSON(text);
      setParsedQuestions(parsed);

      if (parsed.length === 0) {
        setError('Geen vragen gevonden in het bestand');
      }
    } catch (err) {
      setError('Fout bij lezen van bestand');
      console.error(err);
    }
  };

  const handleImport = async () => {
    if (parsedQuestions.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const result = await bulkImportQuestions(parsedQuestions);
      setImportResult(result);

      if (result.success) {
        // Clear form after successful import
        setTimeout(() => {
          setFile(null);
          setParsedQuestions([]);
          setImportResult(null);
        }, 5000);
      } else if (result.failedCount > 0 && result.importedCount === 0) {
        // Alles mislukt
        setError('❌ Import volledig mislukt. Controleer de foutmeldingen hieronder.');
      }
    } catch (err: any) {
      setError(`❌ Kritieke fout bij importeren: ${err.message || 'Onbekende fout'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vragen-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Editing Functions
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
    if (confirm('Weet je zeker dat je deze vraag uit de import wilt verwijderen?')) {
      const newQuestions = [...parsedQuestions];
      newQuestions.splice(index, 1);
      setParsedQuestions(newQuestions);
      if (editingIndex === index) cancelEditing();
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editForm) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImage(file);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const processImage = async (file: File) => {
    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file);
      setEditForm(prev => prev ? { ...prev, imageUrl: compressedBase64 } : null);
    } catch (err) {
      console.error("Fout bij comprimeren:", err);
      alert("Kon afbeelding niet verwerken.");
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = () => {
    setEditForm(prev => prev ? { ...prev, imageUrl: undefined } : null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Examen Uploaden & Bewerken</h2>
          <p className="text-slate-500 text-sm mt-1">Stap 1: Upload CSV/JSON. Stap 2: Voeg afbeeldingen en bronnen toe.</p>
        </div>
        <Button
          onClick={handleDownloadTemplate}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </Button>
      </div>

      {/* File Type Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <label className="block text-sm font-bold text-slate-700 mb-3">Bestandstype</label>
        <div className="flex gap-3">
          <button
            onClick={() => setFileType('csv')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              fileType === 'csv'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileText className="w-5 h-5 mx-auto mb-1" />
            <div className="text-sm font-bold">CSV</div>
            <div className="text-xs text-slate-500">Excel formaat</div>
          </button>
          <button
            onClick={() => setFileType('json')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              fileType === 'json'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <FileText className="w-5 h-5 mx-auto mb-1" />
            <div className="text-sm font-bold">JSON</div>
            <div className="text-xs text-slate-500">Data formaat</div>
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <label className="block text-sm font-bold text-slate-700 mb-3">Bestand Uploaden</label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
          <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <input
            type="file"
            accept={fileType === 'csv' ? '.csv' : '.json'}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kies {fileType.toUpperCase()} bestand
          </label>
          {file && (
            <div className="mt-3 text-sm text-slate-600">
              Geselecteerd: <span className="font-medium">{file.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Preview & Edit Area */}
      {parsedQuestions.length > 0 && !importResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Review & Verrijk ({parsedQuestions.length} vragen)
            </h3>
            <Button
              onClick={handleImport}
              disabled={loading}
              variant="primary"
              className="flex items-center gap-2"
            >
              {loading ? 'Importeren...' : 'Importeer Alles'}
            </Button>
          </div>

          <div className="space-y-4">
             {parsedQuestions.map((q, idx) => {
               const isEditing = editingIndex === idx;

               if (isEditing && editForm) {
                 return (
                   <div key={idx} className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50/50 shadow-sm animate-fadeIn">
                      <div className="flex justify-between items-start mb-4">
                         <h4 className="font-bold text-indigo-900">Vraag {idx + 1} Bewerken</h4>
                         <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <div>
                               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vraag</label>
                               <textarea
                                 value={editForm.text}
                                 onChange={e => setEditForm({...editForm, text: e.target.value})}
                                 className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                 rows={3}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Brontekst (Grote bron)</label>
                               <textarea
                                 value={editForm.contextText || ''}
                                 onChange={e => setEditForm({...editForm, contextText: e.target.value})}
                                 className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                 rows={5}
                                 placeholder="Plak hier lange teksten..."
                               />
                            </div>
                         </div>

                         <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Afbeelding (Sleep hierheen)</label>
                                <div 
                                   onDragOver={(e) => e.preventDefault()}
                                   onDrop={handleImageDrop}
                                   className={`border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center text-center transition-all ${
                                      editForm.imageUrl ? 'border-indigo-300 bg-white' : 'border-indigo-200 bg-white hover:border-indigo-400'
                                   }`}
                                >
                                   {editForm.imageUrl ? (
                                      <div className="relative w-full h-full p-2">
                                         <img src={editForm.imageUrl} className="w-full h-full object-contain" />
                                         <button 
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"
                                         >
                                            <Trash2 className="w-4 h-4" />
                                         </button>
                                      </div>
                                   ) : (
                                      <div className="p-4">
                                         {isCompressing ? (
                                            <div className="flex flex-col items-center text-indigo-600">
                                               <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                               <span className="text-xs">Verwerken...</span>
                                            </div>
                                         ) : (
                                            <>
                                               <ImageIcon className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                                               <p className="text-sm text-indigo-900 font-medium">Sleep afbeelding hierheen</p>
                                               <p className="text-xs text-indigo-500 mb-3">of</p>
                                               <label className="cursor-pointer px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200">
                                                  Kies Bestand
                                                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                               </label>
                                            </>
                                         )}
                                      </div>
                                   )}
                                </div>
                             </div>

                             <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" onClick={cancelEditing} size="sm">Annuleren</Button>
                                <Button onClick={saveEditing} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"><Save className="w-4 h-4 mr-2"/> Opslaan</Button>
                             </div>
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
                       <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-700">{q.subject}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500">{q.level}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500">{q.type}</span>
                          {q.imageUrl && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Afbeelding</span>}
                          {q.contextText && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1"><FileText className="w-3 h-3"/> Brontekst</span>}
                       </div>
                       <p className="text-sm text-slate-600 line-clamp-2">{q.text}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                       <button onClick={() => startEditing(idx)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Bewerken & Media Toevoegen">
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
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`p-6 rounded-xl border-2 ${
          importResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
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
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span><strong>{importResult.importedCount}</strong> vragen succesvol geïmporteerd</span>
                </div>
                {importResult.failedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span><strong>{importResult.failedCount}</strong> vragen mislukt</span>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                      Toon fouten ({importResult.errors.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {importResult.errors.slice(0, 20).map((err, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-slate-200 text-xs">
                          <span className="font-medium">Rij {err.row}:</span> {err.message}
                          {err.field && <span className="text-slate-500"> (veld: {err.field})</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">CSV Template Formaat:</h3>
        <div className="text-xs text-blue-800 font-mono">
          subject,level,type,text,year,context,source,options,correctanswer,modelanswer
        </div>
        <ul className="mt-3 space-y-1 text-xs text-blue-800">
          <li><strong>subject:</strong> Vak (bijv. "Geschiedenis", "Wiskunde A")</li>
          <li><strong>level:</strong> VMBO-TL, HAVO, of VWO</li>
          <li><strong>type:</strong> MULTIPLE_CHOICE of OPEN</li>
          <li><strong>year:</strong> Examenjaar (optioneel, bijv. 2024)</li>
          <li><strong>options:</strong> Meerkeuze opties gescheiden door | (bijv. "A|B|C|D")</li>
          <li><strong>correctanswer:</strong> Juiste antwoord voor meerkeuze</li>
          <li><strong>modelanswer:</strong> Model antwoord voor open vragen</li>
        </ul>
      </div>
    </div>
  );
};
