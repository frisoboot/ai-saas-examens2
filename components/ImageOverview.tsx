import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, StudentLevel } from '../types';
import { getQuestions, saveQuestion } from '../services/storageService';
import { Button } from './Button';
import {
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Filter,
  Upload,
  Trash2,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';
import { imageStorage } from '../services/imageStorageService';
import { SUBJECTS } from '../constants/subjects';

interface ImageOverviewProps {
  onBack: () => void;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id: number;
}

export const ImageOverview: React.FC<ImageOverviewProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationId = useRef(0);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<StudentLevel | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');

  // Upload state - using Set to track multiple concurrent uploads
  const [uploadingQuestionIds, setUploadingQuestionIds] = useState<Set<string>>(new Set());
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const showNotification = useCallback((type: Notification['type'], message: string) => {
    const id = ++notificationId.current;
    setNotifications(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const allQuestions = await getQuestions();
      // Filter only questions that have hasImage = true
      const questionsWithImages = allQuestions.filter(q => q.hasImage === true);
      setQuestions(questionsWithImages);
    } catch (error) {
      console.error('Error loading questions:', error);
      showNotification('error', 'Fout bij laden vragen');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Apply filters
  const filteredQuestions = questions.filter(q => {
    if (filterSubject && q.subject !== filterSubject) return false;
    if (filterLevel && q.level !== filterLevel) return false;
    if (filterStatus === 'pending' && q.imageUrl) return false;
    if (filterStatus === 'done' && !q.imageUrl) return false;
    return true;
  });

  // Stats
  const totalWithHasImage = questions.length;
  const pendingImages = questions.filter(q => !q.imageUrl).length;
  const completedImages = questions.filter(q => q.imageUrl).length;

  const handleImageUpload = async (questionId: string, file: File) => {
    setUploadingQuestionIds(prev => new Set(prev).add(questionId));
    try {
      // Upload to storage
      const imageUrl = await imageStorage.uploadImage(file, questionId);

      // Find and update the question
      const question = questions.find(q => q.id === questionId);
      if (question) {
        const updatedQuestion: Question = {
          ...question,
          imageUrl
        };
        await saveQuestion(updatedQuestion);

        // Update local state
        setQuestions(prev => prev.map(q =>
          q.id === questionId ? updatedQuestion : q
        ));

        showNotification('success', 'Afbeelding toegevoegd');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('error', 'Fout bij uploaden afbeelding');
    } finally {
      setUploadingQuestionIds(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const handleRemoveImage = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question?.imageUrl) return;

    try {
      // Delete from storage
      await imageStorage.deleteImage(question.imageUrl);

      // Update question
      const updatedQuestion: Question = {
        ...question,
        imageUrl: undefined
      };
      await saveQuestion(updatedQuestion);

      // Update local state
      setQuestions(prev => prev.map(q =>
        q.id === questionId ? updatedQuestion : q
      ));

      showNotification('info', 'Afbeelding verwijderd');
    } catch (error) {
      console.error('Error removing image:', error);
      showNotification('error', 'Fout bij verwijderen afbeelding');
    }
  };

  const handleFileSelect = (questionId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(questionId, file);
    }
  };

  // Group questions by subject for better overview
  const groupedBySubject = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.subject]) {
      acc[q.subject] = [];
    }
    acc[q.subject].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slideIn ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewQuestion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewQuestion(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Vraag Preview</h3>
              <button onClick={() => setPreviewQuestion(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{previewQuestion.subject}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{previewQuestion.level}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                  {previewQuestion.type === 'MULTIPLE_CHOICE' ? 'Meerkeuze' : 'Open'}
                </span>
              </div>

              {previewQuestion.contextText && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                  {previewQuestion.contextText}
                </div>
              )}

              <p className="text-gray-900">{previewQuestion.text}</p>

              {previewQuestion.imageUrl && (
                <img
                  src={previewQuestion.imageUrl}
                  alt="Vraag afbeelding"
                  className="max-w-full rounded-lg border"
                />
              )}

              {previewQuestion.type === 'MULTIPLE_CHOICE' && previewQuestion.options && (
                <div className="space-y-2">
                  {previewQuestion.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${idx === previewQuestion.correctIndex ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                      {idx === previewQuestion.correctIndex && <span className="ml-2 text-green-600">✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === 'OPEN' && previewQuestion.modelAnswer && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-bold text-blue-900 mb-1">Modelantwoord:</p>
                  <p className="text-sm text-blue-800">{previewQuestion.modelAnswer}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
              Afbeeldingen Overzicht
            </h1>
            <p className="text-gray-600">Beheer afbeeldingen voor vragen</p>
          </div>
        </div>

        <Button variant="secondary" onClick={loadQuestions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Vernieuwen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalWithHasImage}</p>
              <p className="text-sm text-gray-600">Totaal gemarkeerd</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendingImages}</p>
              <p className="text-sm text-gray-600">Afbeelding nodig</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedImages}</p>
              <p className="text-sm text-gray-600">Afbeelding aanwezig</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vak</label>
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Alle vakken</option>
              {SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Niveau</label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value as StudentLevel | '')}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Alle niveaus</option>
              <option value="VMBO-TL">VMBO-TL</option>
              <option value="HAVO">HAVO</option>
              <option value="VWO">VWO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'pending' | 'done')}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Alles</option>
              <option value="pending">Afbeelding nodig</option>
              <option value="done">Afbeelding aanwezig</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-gray-600">Laden...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen vragen gevonden</h3>
          <p className="text-gray-600 mb-4">
            {questions.length === 0
              ? 'Er zijn nog geen vragen gemarkeerd als "heeft afbeelding".'
              : 'Geen vragen gevonden met de huidige filters.'}
          </p>
          <p className="text-sm text-gray-500">
            Tip: Markeer vragen met "Heeft afbeelding" in de Examen Builder om ze hier te zien.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBySubject).map(([subject, subjectQuestions]) => (
            <div key={subject} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{subject}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                      {subjectQuestions.filter(q => !q.imageUrl).length} nodig
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      {subjectQuestions.filter(q => q.imageUrl).length} klaar
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {subjectQuestions.map(question => (
                  <div
                    key={question.id}
                    className={`p-4 hover:bg-gray-50 transition ${!question.imageUrl ? 'bg-amber-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Image preview or upload zone */}
                      <div className="w-24 h-24 flex-shrink-0">
                        {question.imageUrl ? (
                          <div className="relative w-full h-full group">
                            <img
                              src={question.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPreviewQuestion(question)}
                                className="p-1.5 bg-white rounded text-gray-700 hover:bg-gray-100"
                                title="Bekijken"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveImage(question.id)}
                                className="p-1.5 bg-white rounded text-red-600 hover:bg-red-50"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                              <CheckCircle className="w-3 h-3" />
                            </div>
                          </div>
                        ) : (
                          <label className={`w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition ${
                            uploadingQuestionIds.has(question.id)
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-amber-300 bg-amber-50 hover:border-amber-400'
                          }`}>
                            {uploadingQuestionIds.has(question.id) ? (
                              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-amber-500 mb-1" />
                                <span className="text-xs text-amber-600 font-medium">Upload</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileSelect(question.id)}
                              disabled={uploadingQuestionIds.has(question.id)}
                            />
                          </label>
                        )}
                      </div>

                      {/* Question info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{question.level}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {question.type === 'MULTIPLE_CHOICE' ? 'MC' : 'Open'}
                          </span>
                          {question.examYear && (
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded">
                              {question.examYear}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-mono">{question.id}</span>
                        </div>

                        <p className="text-gray-900 text-sm line-clamp-2 mb-2">
                          {question.text}
                        </p>

                        <button
                          onClick={() => setPreviewQuestion(question)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Bekijk volledige vraag
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
