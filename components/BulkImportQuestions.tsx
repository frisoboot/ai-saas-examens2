import React, { useState } from 'react';
import { BulkImportQuestion, ImportResult } from '../types';
import { parseCSV, parseJSON, bulkImportQuestions, generateCSVTemplate, validateFileType, readFileAsText } from '../services/importService';
import { Button } from './Button';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const BulkImportQuestions: React.FC = () => {
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<BulkImportQuestion[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bulk Import Vragen</h2>
          <p className="text-slate-500 text-sm mt-1">Upload meerdere vragen tegelijk via CSV of JSON</p>
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

      {/* Preview */}
      {parsedQuestions.length > 0 && !importResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Preview ({parsedQuestions.length} vragen)
            </h3>
            <Button
              onClick={handleImport}
              disabled={loading}
              variant="primary"
              className="flex items-center gap-2"
            >
              {loading ? 'Importeren...' : 'Importeer Vragen'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Vak</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Niveau</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Vraag</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">Jaar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedQuestions.slice(0, 10).map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{q.subject}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">
                        {q.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{q.type}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-md truncate">{q.text}</td>
                    <td className="px-3 py-2 text-slate-600">{q.examYear || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedQuestions.length > 10 && (
              <div className="p-3 text-center text-sm text-slate-500 border-t border-slate-200">
                En nog {parsedQuestions.length - 10} vragen meer...
              </div>
            )}
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
