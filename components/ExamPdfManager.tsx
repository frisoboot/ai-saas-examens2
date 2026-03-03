import React, { useState } from 'react';
import { Question, StudentLevel } from '../types';
import { worksheetStorage } from '../services/worksheetStorageService';
import { updateExamPdfs } from '../services/storageService';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  BookOpen,
  Paperclip,
  X,
  Check,
  ExternalLink,
  Map
} from 'lucide-react';
import { Button } from './Button';

interface ExamPdfManagerProps {
  subject: string;
  year: number;
  level: StudentLevel;
  questions: Question[];
  onClose: () => void;
  onUpdated: () => void;
}

type PdfType = 'pdf' | 'bijlage' | 'kaart';

export const ExamPdfManager: React.FC<ExamPdfManagerProps> = ({
  subject,
  year,
  level,
  questions,
  onClose,
  onUpdated,
}) => {
  const currentPdfUrl = questions.find(q => q.examPdfUrl)?.examPdfUrl;
  const currentBijlageUrl = questions.find(q => q.examBijlageUrl)?.examBijlageUrl;
  const currentKaartUrl = questions.find(q => q.examKaartUrl)?.examKaartUrl;

  const [uploading, setUploading] = useState<PdfType | null>(null);
  const [removing, setRemoving] = useState<PdfType | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: PdfType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(type);

    try {
      const url = await worksheetStorage.uploadWorksheet(file);

      // Remove old PDF from storage if replacing
      const oldUrl = type === 'pdf' ? currentPdfUrl : type === 'bijlage' ? currentBijlageUrl : currentKaartUrl;
      if (oldUrl && oldUrl.includes('/storage/v1/object/public/')) {
        try {
          await worksheetStorage.deleteWorksheet(oldUrl);
        } catch {
          // Non-critical: old file might already be gone
        }
      }

      const params: Record<string, any> = { subject, year, level };
      if (type === 'pdf') params.examPdfUrl = url;
      if (type === 'bijlage') params.examBijlageUrl = url;
      if (type === 'kaart') params.examKaartUrl = url;

      const result = await updateExamPdfs(params);

      if (result.errors.length > 0) {
        setError(`${result.updatedQuestions} vragen bijgewerkt, ${result.errors.length} fouten.`);
      } else {
        const label = type === 'pdf' ? 'Opdrachten PDF' : type === 'bijlage' ? 'Bijlage PDF' : 'Kaartboekje PDF';
        setSuccess(`${label} toegevoegd aan ${result.updatedQuestions} vragen.`);
      }
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Fout bij uploaden');
    } finally {
      setUploading(null);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleRemove = async (type: PdfType) => {
    const label = type === 'pdf' ? 'opdrachten PDF' : type === 'bijlage' ? 'bijlage PDF' : 'kaartboekje PDF';
    if (!confirm(`Weet je zeker dat je de ${label} wilt verwijderen van alle ${questions.length} vragen?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setRemoving(type);

    try {
      // Delete from storage
      const url = type === 'pdf' ? currentPdfUrl : type === 'bijlage' ? currentBijlageUrl : currentKaartUrl;
      if (url && url.includes('/storage/v1/object/public/')) {
        try {
          await worksheetStorage.deleteWorksheet(url);
        } catch {
          // Non-critical
        }
      }

      const params: Record<string, any> = { subject, year, level };
      if (type === 'pdf') params.examPdfUrl = null;
      if (type === 'bijlage') params.examBijlageUrl = null;
      if (type === 'kaart') params.examKaartUrl = null;

      const result = await updateExamPdfs(params);

      if (result.errors.length > 0) {
        setError(`${result.updatedQuestions} vragen bijgewerkt, ${result.errors.length} fouten.`);
      } else {
        setSuccess(`${label.charAt(0).toUpperCase() + label.slice(1)} verwijderd van ${result.updatedQuestions} vragen.`);
      }
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Fout bij verwijderen');
    } finally {
      setRemoving(null);
    }
  };

  const renderPdfSlot = (
    type: PdfType,
    label: string,
    icon: React.ReactNode,
    url: string | undefined,
    colorClass: { bg: string; border: string; text: string; hoverBg: string; iconColor: string }
  ) => {
    const isUploading = uploading === type;
    const isRemoving = removing === type;
    const isDisabled = uploading !== null || removing !== null;

    return (
      <div className={`rounded-xl border ${url ? colorClass.border : 'border-slate-200'} ${url ? colorClass.bg : 'bg-white'} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={url ? colorClass.iconColor : 'text-slate-400'}>{icon}</span>
          <span className={`text-sm font-bold ${url ? colorClass.text : 'text-slate-600'}`}>{label}</span>
        </div>

        {url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className={`w-4 h-4 flex-shrink-0 ${colorClass.iconColor}`} />
              <span className={`truncate flex-1 ${colorClass.text}`}>
                {worksheetStorage.getFileNameFromUrl(url)}
              </span>
            </div>
            <div className="flex gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border ${colorClass.border} ${colorClass.text} hover:${colorClass.hoverBg} transition-colors`}
              >
                <ExternalLink className="w-3 h-3" />
                Bekijk
              </a>
              <label className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border ${colorClass.border} ${colorClass.text} hover:${colorClass.hoverBg} transition-colors cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Uploaden...</>
                ) : (
                  <><Upload className="w-3 h-3" /> Vervang</>
                )}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => handleUpload(e, type)}
                  disabled={isDisabled}
                />
              </label>
              <button
                onClick={() => handleRemove(type)}
                disabled={isDisabled}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRemoving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Verwijderen...</>
                ) : (
                  <><Trash2 className="w-3 h-3" /> Verwijder</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isUploading ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          } ${isDisabled && !isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                <span className="text-sm text-slate-500">Uploaden...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-500">Upload {label.toLowerCase()}</span>
                <span className="text-xs text-slate-400">Alleen PDF bestanden</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => handleUpload(e, type)}
              disabled={isDisabled}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-lg animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900">PDF's Beheren</h3>
          <p className="text-sm text-slate-500">
            {subject} {year} {level} — {questions.length} vragen
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Status messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderPdfSlot('pdf', 'Opdrachten PDF', <BookOpen className="w-5 h-5" />, currentPdfUrl, {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            hoverBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
          })}

          {renderPdfSlot('bijlage', 'Bijlage PDF', <Paperclip className="w-5 h-5" />, currentBijlageUrl, {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-800',
            hoverBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
          })}

          {renderPdfSlot('kaart', 'Kaartboekje PDF', <Map className="w-5 h-5" />, currentKaartUrl, {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            hoverBg: 'bg-green-100',
            iconColor: 'text-green-600',
          })}
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Wijzigingen worden direct toegepast op alle {questions.length} vragen in dit examen.
        </p>
      </div>
    </div>
  );
};
