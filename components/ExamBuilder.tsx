import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, QuestionType, StudentLevel } from '../types';
import { saveQuestion, getQuestions } from '../services/storageService';
import { Button } from './Button';
import { Plus, Save, Trash2, FileText, ArrowLeft, Eye, AlertCircle, CheckCircle, Minus, Keyboard, RefreshCw, Upload, Download, Pencil, X, Image as ImageIcon } from 'lucide-react';
import { SUBJECTS } from '../constants/subjects';

interface ExamMetadata {
  subject: string;
  year: number;
  tijdvak: number;
  level: StudentLevel;
}

interface QuestionDraft extends Partial<Question> {
  tempId: string;
  text: string;
  type: QuestionType;
  questionNumber?: number;
}

interface ValidationErrors {
  text?: string;
  options?: string;
  modelAnswer?: string;
  subject?: string;
  year?: string;
  tijdvak?: string;
  level?: string;
}

interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  id: number;
}

interface JsonQuestion {
  questionNumber?: number;
  type: 'MULTIPLE_CHOICE' | 'OPEN';
  text: string;
  contextText?: string;
  options?: string[];
  correctIndex?: number;
  modelAnswer?: string;
  imageUrl?: string;
}

interface JsonImportFormat {
  subject?: string;
  year?: number;
  tijdvak?: number;
  level?: StudentLevel;
  questions: JsonQuestion[];
}

const DRAFT_STORAGE_KEY = 'examBuilder_draft';
const AUTO_SAVE_DELAY = 1000;

// Generate JSON template
const generateJsonTemplate = (): string => {
  const template: JsonImportFormat = {
    subject: "Geschiedenis",
    year: 2024,
    tijdvak: 1,
    level: "HAVO",
    questions: [
      {
        questionNumber: 1,
        type: "MULTIPLE_CHOICE",
        text: "Wat was de belangrijkste oorzaak van de Eerste Wereldoorlog?",
        contextText: "Lees de onderstaande bron over het begin van WO1.",
        options: ["De moord op Frans Ferdinand", "Economische rivaliteit", "Koloniale spanningen", "Nationalisme"],
        correctIndex: 0
      },
      {
        questionNumber: 2,
        type: "OPEN",
        text: "Leg uit waarom de industriële revolutie begon in Engeland.",
        contextText: "Gebruik minimaal drie argumenten in je antwoord.",
        modelAnswer: "De industriële revolutie begon in Engeland vanwege: 1) beschikbaarheid van steenkool en ijzer, 2) een groot koloniaal rijk voor grondstoffen en afzetmarkten, 3) een stabiel politiek systeem dat innovatie stimuleerde."
      }
    ]
  };
  return JSON.stringify(template, null, 2);
};

export const ExamBuilder: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Exam metadata
  const [examMeta, setExamMeta] = useState<ExamMetadata>({
    subject: SUBJECTS[0],
    year: new Date().getFullYear(),
    tijdvak: 1,
    level: 'HAVO'
  });

  // Questions being built
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDraft>({
    tempId: Date.now().toString(),
    text: '',
    type: 'MULTIPLE_CHOICE',
    options: ['', '', '', ''],
    correctIndex: 0,
    questionNumber: undefined
  });

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // State for improvements
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<QuestionDraft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // JSON Import state
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state for preview
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDraft | null>(null);

  const questionTextRef = useRef<HTMLTextAreaElement>(null);
  const notificationId = useRef(0);

  // Load existing questions for duplicate detection
  useEffect(() => {
    const loadExistingQuestions = async () => {
      try {
        const questions = await getQuestions();
        setExistingQuestions(questions);
      } catch (error) {
        console.error('Error loading existing questions:', error);
      }
    };
    loadExistingQuestions();
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.examMeta) setExamMeta(draft.examMeta);
        if (draft.questions && draft.questions.length > 0) {
          setQuestions(draft.questions);
          showNotification('info', `${draft.questions.length} concept-vragen geladen`);
        }
        if (draft.currentQuestion) setCurrentQuestion(draft.currentQuestion);
        setDraftLoaded(true);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
    setDraftLoaded(true);
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!draftLoaded) return;

    const timeoutId = setTimeout(() => {
      const draft = { examMeta, questions, currentQuestion };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [examMeta, questions, currentQuestion, draftLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!showPreview && !showJsonImport) {
          addQuestionToList();
        }
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (showPreview && questions.length > 0) {
          saveAllQuestions();
        } else if (questions.length > 0) {
          setShowPreview(true);
        }
      }
      if (e.key === 'Escape') {
        if (editingQuestionId) {
          cancelEditQuestion();
        } else if (showDuplicateWarning) {
          setShowDuplicateWarning(false);
          setPendingDuplicate(null);
        } else if (showJsonImport) {
          setShowJsonImport(false);
        } else if (showPreview) {
          setShowPreview(false);
        } else if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        }
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowKeyboardHelp(!showKeyboardHelp);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, questions, showDuplicateWarning, showKeyboardHelp, showJsonImport, editingQuestionId]);

  const showNotification = useCallback((type: Notification['type'], message: string) => {
    const id = ++notificationId.current;
    setNotifications(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const validateCurrentQuestion = (): boolean => {
    const errors: ValidationErrors = {};

    if (!currentQuestion.text.trim()) {
      errors.text = 'Vraag tekst is verplicht';
    }

    if (currentQuestion.type === 'MULTIPLE_CHOICE') {
      const filledOptions = currentQuestion.options?.filter(opt => opt.trim() !== '') || [];
      if (filledOptions.length < 2) {
        errors.options = 'Minimaal 2 antwoordopties zijn verplicht';
      }
    }

    if (currentQuestion.type === 'OPEN' && !currentQuestion.modelAnswer?.trim()) {
      errors.modelAnswer = 'Modelantwoord is verplicht voor open vragen';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExamMeta = (): boolean => {
    const errors: ValidationErrors = {};

    if (!examMeta.subject) {
      errors.subject = 'Selecteer een vak';
    }

    if (!examMeta.year || isNaN(examMeta.year) || examMeta.year < 2000 || examMeta.year > 2030) {
      errors.year = 'Vul een geldig jaar in (2000-2030)';
    }

    if (!examMeta.tijdvak || isNaN(examMeta.tijdvak)) {
      errors.tijdvak = 'Selecteer een tijdvak';
    }

    if (!examMeta.level) {
      errors.level = 'Selecteer een niveau';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkForDuplicate = (draft: QuestionDraft): Question | null => {
    const questionNumber = draft.questionNumber || (questions.length + 1);
    const potentialId = `${examMeta.subject}-${examMeta.year}-T${examMeta.tijdvak}-Q${questionNumber}`.replace(/\s+/g, '-');

    return existingQuestions.find(q => q.id === potentialId) || null;
  };

  const addQuestionToList = (forceAdd = false) => {
    if (!validateCurrentQuestion()) {
      return;
    }

    if (!forceAdd) {
      const duplicate = checkForDuplicate(currentQuestion);
      if (duplicate) {
        setPendingDuplicate(currentQuestion);
        setShowDuplicateWarning(true);
        return;
      }
    }

    const newQuestion = {
      ...currentQuestion,
      questionNumber: currentQuestion.questionNumber || (questions.length + 1)
    };

    setQuestions([...questions, newQuestion]);
    showNotification('success', `Vraag ${newQuestion.questionNumber} toegevoegd`);

    resetCurrentQuestion();
    setTimeout(() => questionTextRef.current?.focus(), 100);
  };

  const resetCurrentQuestion = () => {
    setCurrentQuestion({
      tempId: Date.now().toString(),
      text: '',
      type: 'MULTIPLE_CHOICE',
      options: ['', '', '', ''],
      correctIndex: 0,
      contextText: '',
      imageUrl: '',
      modelAnswer: '',
      questionNumber: undefined
    });
    setValidationErrors({});
  };

  const confirmAddDuplicate = () => {
    if (pendingDuplicate) {
      addQuestionToList(true);
    }
    setShowDuplicateWarning(false);
    setPendingDuplicate(null);
  };

  const removeQuestion = (tempId: string) => {
    const question = questions.find(q => q.tempId === tempId);
    setQuestions(questions.filter(q => q.tempId !== tempId));
    showNotification('info', `Vraag ${question?.questionNumber || ''} verwijderd`);
  };

  const addAnswerOption = () => {
    if ((currentQuestion.options?.length || 0) < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...(currentQuestion.options || []), '']
      });
    }
  };

  const removeAnswerOption = (index: number) => {
    if ((currentQuestion.options?.length || 0) > 2) {
      const newOptions = currentQuestion.options?.filter((_, i) => i !== index) || [];
      let newCorrectIndex = currentQuestion.correctIndex || 0;
      if (index === currentQuestion.correctIndex) {
        newCorrectIndex = 0;
      } else if (index < (currentQuestion.correctIndex || 0)) {
        newCorrectIndex = (currentQuestion.correctIndex || 0) - 1;
      }
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correctIndex: newCorrectIndex
      });
    }
  };

  // JSON Import Functions
  const handleJsonFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonImportError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as JsonImportFormat;

      // Validate structure
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('JSON moet een "questions" array bevatten');
      }

      // Update exam metadata if provided
      if (data.subject && SUBJECTS.includes(data.subject)) {
        setExamMeta(prev => ({ ...prev, subject: data.subject! }));
      }
      if (data.year && !isNaN(data.year)) {
        setExamMeta(prev => ({ ...prev, year: data.year! }));
      }
      if (data.tijdvak && [1, 2, 3].includes(data.tijdvak)) {
        setExamMeta(prev => ({ ...prev, tijdvak: data.tijdvak! }));
      }
      if (data.level && ['VMBO-TL', 'HAVO', 'VWO'].includes(data.level)) {
        setExamMeta(prev => ({ ...prev, level: data.level! }));
      }

      // Convert JSON questions to QuestionDraft format
      const importedQuestions: QuestionDraft[] = data.questions.map((q, index) => ({
        tempId: `import-${Date.now()}-${index}`,
        text: q.text || '',
        type: q.type || 'MULTIPLE_CHOICE',
        questionNumber: q.questionNumber || (questions.length + index + 1),
        contextText: q.contextText || '',
        imageUrl: q.imageUrl || '',
        options: q.type === 'MULTIPLE_CHOICE' ? (q.options || ['', '', '', '']) : undefined,
        correctIndex: q.type === 'MULTIPLE_CHOICE' ? (q.correctIndex || 0) : undefined,
        modelAnswer: q.type === 'OPEN' ? (q.modelAnswer || '') : undefined
      }));

      // Add to existing questions
      setQuestions(prev => [...prev, ...importedQuestions]);
      showNotification('success', `${importedQuestions.length} vragen geïmporteerd uit JSON`);
      setShowJsonImport(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      setJsonImportError(error instanceof Error ? error.message : 'Ongeldige JSON structuur');
    }
  };

  const downloadJsonTemplate = () => {
    const template = generateJsonTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'examen-template.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('info', 'JSON template gedownload');
  };

  // Edit question functions for preview
  const startEditQuestion = (q: QuestionDraft) => {
    setEditingQuestionId(q.tempId);
    setEditingQuestion({ ...q });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestion(null);
  };

  const saveEditQuestion = () => {
    if (!editingQuestion || !editingQuestionId) return;

    setQuestions(prev => prev.map(q =>
      q.tempId === editingQuestionId ? editingQuestion : q
    ));
    showNotification('success', `Vraag ${editingQuestion.questionNumber} bijgewerkt`);
    cancelEditQuestion();
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingQuestion({
          ...editingQuestion,
          imageUrl: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showNotification('error', 'Fout bij uploaden afbeelding');
    }
  };

  const handleEditImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          setEditingQuestion({
            ...editingQuestion,
            imageUrl: event.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      } catch (error) {
        showNotification('error', 'Fout bij uploaden afbeelding');
      }
    }
  };

  const saveAllQuestions = async () => {
    if (questions.length === 0) {
      showNotification('warning', 'Voeg minimaal één vraag toe');
      return;
    }

    if (!validateExamMeta()) {
      showNotification('error', 'Controleer de examen gegevens');
      return;
    }

    setSaving(true);
    setSavedCount(0);

    try {
      for (let i = 0; i < questions.length; i++) {
        const draft = questions[i];
        const questionNumber = draft.questionNumber || (i + 1);
        const questionId = `${examMeta.subject}-${examMeta.year}-T${examMeta.tijdvak}-Q${questionNumber}`.replace(/\s+/g, '-');

        const validOptions = draft.type === 'MULTIPLE_CHOICE'
          ? draft.options?.filter(opt => opt.trim() !== '')
          : undefined;

        const question: Question = {
          id: questionId,
          type: draft.type,
          subject: examMeta.subject,
          level: examMeta.level,
          text: draft.text,
          examYear: examMeta.year,
          examType: 'official_exam',
          source: `Examen ${examMeta.year} Tijdvak ${examMeta.tijdvak}`,
          contextText: draft.contextText,
          imageUrl: draft.imageUrl,
          ...(draft.type === 'MULTIPLE_CHOICE' ? {
            options: validOptions,
            correctIndex: draft.correctIndex
          } : {}),
          ...(draft.type === 'OPEN' ? {
            modelAnswer: draft.modelAnswer
          } : {})
        };

        await saveQuestion(question);
        setSavedCount(i + 1);
      }

      showNotification('success', `${questions.length} vragen succesvol opgeslagen!`);
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      const updatedQuestions = await getQuestions();
      setExistingQuestions(updatedQuestions);

      setQuestions([]);
      resetCurrentQuestion();
      setShowPreview(false);
    } catch (error) {
      console.error('Error saving questions:', error);
      showNotification('error', 'Fout bij opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentQuestion({
          ...currentQuestion,
          imageUrl: event.target?.result as string
        });
        showNotification('success', 'Afbeelding toegevoegd');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showNotification('error', 'Fout bij uploaden afbeelding');
    }
  };

  const clearDraft = () => {
    if (confirm('Weet je zeker dat je alle concept-vragen wilt verwijderen?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setQuestions([]);
      resetCurrentQuestion();
      showNotification('info', 'Concept verwijderd');
    }
  };

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
              notification.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </div>
        ))}
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Vraag bestaat al</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Er bestaat al een vraag met dit nummer voor dit examen.
              Wil je deze vraag toch toevoegen (overschrijft bestaande)?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setPendingDuplicate(null);
                }}
              >
                Annuleren
              </Button>
              <Button onClick={confirmAddDuplicate}>
                Toch toevoegen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardHelp(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Keyboard className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold">Sneltoetsen</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Vraag toevoegen</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Preview / Opslaan</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sluiten</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Escape</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deze help tonen</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Ctrl + /</kbd>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => setShowKeyboardHelp(false)}>
              Sluiten
            </Button>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showJsonImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowJsonImport(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl mx-4 shadow-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold">JSON Importeren</h3>
              </div>
              <button onClick={() => setShowJsonImport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileSelect}
                  className="hidden"
                  id="json-upload"
                />
                <label
                  htmlFor="json-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Kies JSON bestand
                </label>
                <p className="text-sm text-gray-500 mt-2">Of sleep een bestand hierheen</p>
              </div>

              {jsonImportError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {jsonImportError}
                </div>
              )}

              {/* Download Template */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Geen JSON template?</p>
                  <p className="text-sm text-gray-600">Download een voorbeeld bestand</p>
                </div>
                <Button variant="secondary" onClick={downloadJsonTemplate}>
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>

              {/* JSON Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-blue-900 mb-2">JSON Formaat:</h4>
                <pre className="text-xs text-blue-800 font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "subject": "Vak naam",
  "year": 2024,
  "tijdvak": 1,
  "level": "HAVO",
  "questions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE",
      "text": "Vraag tekst",
      "contextText": "Brontekst (optioneel)",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    },
    {
      "questionNumber": 2,
      "type": "OPEN",
      "text": "Open vraag",
      "modelAnswer": "Antwoord"
    }
  ]
}`}
                </pre>
                <p className="text-xs text-blue-700 mt-2">
                  Tip: Je kunt afbeeldingen later toevoegen in de preview modus.
                </p>
              </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Examen Toevoegen</h1>
            <p className="text-gray-600">Voeg een compleet examen toe in één keer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Auto-saved {lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Sneltoetsen (Ctrl+/)"
          >
            <Keyboard className="w-5 h-5 text-gray-400" />
          </button>

          {questions.length > 0 && (
            <>
              <button
                onClick={clearDraft}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition"
                title="Concept verwijderen"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
              >
                <Eye className="w-5 h-5" />
                Preview ({questions.length} vragen)
              </button>
            </>
          )}
        </div>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Exam Metadata */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-fit space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Examen Gegevens
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vak</label>
                  <select
                    value={examMeta.subject}
                    onChange={(e) => setExamMeta({ ...examMeta, subject: e.target.value })}
                    className={`w-full p-2 border rounded-lg ${validationErrors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  >
                    {SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jaar</label>
                  <input
                    type="number"
                    value={examMeta.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      if (!isNaN(year)) setExamMeta({ ...examMeta, year });
                    }}
                    className={`w-full p-2 border rounded-lg ${validationErrors.year ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    min="2000"
                    max="2030"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tijdvak</label>
                  <select
                    value={examMeta.tijdvak}
                    onChange={(e) => setExamMeta({ ...examMeta, tijdvak: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={1}>Tijdvak 1</option>
                    <option value={2}>Tijdvak 2</option>
                    <option value={3}>Tijdvak 3 (herkansing)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                  <select
                    value={examMeta.level}
                    onChange={(e) => setExamMeta({ ...examMeta, level: e.target.value as StudentLevel })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="VMBO-TL">VMBO-TL</option>
                    <option value="HAVO">HAVO</option>
                    <option value="VWO">VWO</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <strong>Preview:</strong><br />
                    {examMeta.subject} {examMeta.year} Tijdvak {examMeta.tijdvak} ({examMeta.level})
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Vragen toegevoegd: {questions.length}
                  </p>
                  {questions.length > 0 && (
                    <Button onClick={() => setShowPreview(true)} variant="secondary" className="w-full">
                      <Eye className="w-4 h-4" />
                      Bekijk Preview
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* JSON Import Section */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                Snel Importeren
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowJsonImport(true)}
                  variant="secondary"
                  className="w-full"
                >
                  <Upload className="w-4 h-4" />
                  JSON Importeren
                </Button>
                <Button
                  onClick={downloadJsonTemplate}
                  variant="secondary"
                  className="w-full text-gray-600"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Upload een JSON met vragen en voeg daarna afbeeldingen toe.
              </p>
            </div>
          </div>

          {/* Right: Question Builder */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Vraag Toevoegen</h2>
              <span className="text-xs text-gray-400">Ctrl+Enter om toe te voegen</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vraagnummer (optioneel)</label>
                  <input
                    type="number"
                    value={currentQuestion.questionNumber || ''}
                    onChange={(e) => {
                      const num = parseInt(e.target.value);
                      setCurrentQuestion({
                        ...currentQuestion,
                        questionNumber: isNaN(num) ? undefined : num
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    min="1"
                    placeholder={`Auto: ${questions.length + 1}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type Vraag</label>
                  <select
                    value={currentQuestion.type}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      type: e.target.value as QuestionType,
                      options: e.target.value === 'MULTIPLE_CHOICE' ? ['', '', '', ''] : undefined,
                      correctIndex: e.target.value === 'MULTIPLE_CHOICE' ? 0 : undefined,
                      modelAnswer: e.target.value === 'OPEN' ? '' : undefined
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="MULTIPLE_CHOICE">Meerkeuzevraag</option>
                    <option value="OPEN">Open vraag</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brontekst (optioneel)</label>
                <textarea
                  value={currentQuestion.contextText || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, contextText: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg h-24"
                  placeholder="Bijvoorbeeld een tekst of grafiek beschrijving..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vraag *</label>
                <textarea
                  ref={questionTextRef}
                  value={currentQuestion.text}
                  onChange={(e) => {
                    setCurrentQuestion({ ...currentQuestion, text: e.target.value });
                    if (validationErrors.text) {
                      setValidationErrors({ ...validationErrors, text: undefined });
                    }
                  }}
                  className={`w-full p-2 border rounded-lg h-20 ${validationErrors.text ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Typ hier de vraag..."
                />
                {validationErrors.text && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.text}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Afbeelding (optioneel)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                {currentQuestion.imageUrl && (
                  <div className="relative mt-2">
                    <img src={currentQuestion.imageUrl} alt="Preview" className="max-w-xs rounded" />
                    <button
                      onClick={() => setCurrentQuestion({ ...currentQuestion, imageUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Antwoordopties * (min. 2, max. 6)</label>
                    <button
                      onClick={addAnswerOption}
                      disabled={(currentQuestion.options?.length || 0) >= 6}
                      className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Optie toevoegen
                    </button>
                  </div>
                  {validationErrors.options && (
                    <p className="text-red-500 text-xs mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.options}
                    </p>
                  )}
                  {currentQuestion.options?.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctIndex === idx}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctIndex: idx })}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-gray-600 w-6">{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(currentQuestion.options || [])];
                          newOptions[idx] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          if (validationErrors.options) {
                            setValidationErrors({ ...validationErrors, options: undefined });
                          }
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg"
                        placeholder={`Optie ${String.fromCharCode(65 + idx)}`}
                      />
                      {(currentQuestion.options?.length || 0) > 2 && (
                        <button onClick={() => removeAnswerOption(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'OPEN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelantwoord *</label>
                  <textarea
                    value={currentQuestion.modelAnswer || ''}
                    onChange={(e) => {
                      setCurrentQuestion({ ...currentQuestion, modelAnswer: e.target.value });
                      if (validationErrors.modelAnswer) {
                        setValidationErrors({ ...validationErrors, modelAnswer: undefined });
                      }
                    }}
                    className={`w-full p-2 border rounded-lg h-24 ${validationErrors.modelAnswer ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Het ideale antwoord..."
                  />
                  {validationErrors.modelAnswer && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.modelAnswer}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => addQuestionToList()} className="flex-1">
                  <Plus className="w-4 h-4" />
                  Vraag Toevoegen aan Lijst
                  <span className="ml-2 text-xs opacity-75">(Ctrl+Enter)</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Mode with Edit Capability */
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {examMeta.subject} {examMeta.year} Tijdvak {examMeta.tijdvak} ({examMeta.level})
            </h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowPreview(false)} variant="secondary">
                <ArrowLeft className="w-4 h-4" />
                Terug
              </Button>
              <Button onClick={saveAllQuestions} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Opslaan... ({savedCount}/{questions.length})
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Alles Opslaan ({questions.length} vragen)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info banner for editing */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Klik op het potloodicoon om afbeeldingen of brontekst toe te voegen aan een vraag.
          </div>

          {saving && (
            <div className="mb-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${(savedCount / questions.length) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1 text-center">
                {savedCount} van {questions.length} vragen opgeslagen
              </p>
            </div>
          )}

          <div className="space-y-4">
            {questions
              .sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
              .map((q, idx) => {
                const isEditing = editingQuestionId === q.tempId;

                if (isEditing && editingQuestion) {
                  return (
                    <div key={q.tempId} className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50/50 animate-fadeIn">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-indigo-900">
                          Vraag {q.questionNumber || (idx + 1)} Bewerken
                        </h3>
                        <button onClick={cancelEditQuestion} className="p-1 hover:bg-indigo-100 rounded">
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vraag</label>
                            <textarea
                              value={editingQuestion.text}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                              className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brontekst</label>
                            <textarea
                              value={editingQuestion.contextText || ''}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, contextText: e.target.value })}
                              className="w-full p-2 border border-indigo-200 rounded-lg text-sm"
                              rows={4}
                              placeholder="Voeg brontekst of context toe..."
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Afbeelding</label>
                            <div
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleEditImageDrop}
                              className={`border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center text-center transition ${
                                editingQuestion.imageUrl ? 'border-indigo-300 bg-white' : 'border-indigo-200 bg-white hover:border-indigo-400'
                              }`}
                            >
                              {editingQuestion.imageUrl ? (
                                <div className="relative w-full h-full p-2">
                                  <img src={editingQuestion.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                                  <button
                                    onClick={() => setEditingQuestion({ ...editingQuestion, imageUrl: '' })}
                                    className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="p-4">
                                  <ImageIcon className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                                  <p className="text-sm text-indigo-900 font-medium">Sleep afbeelding hierheen</p>
                                  <p className="text-xs text-indigo-500 mb-2">of</p>
                                  <label className="cursor-pointer px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200">
                                    Kies Bestand
                                    <input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} />
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={cancelEditQuestion}>
                              Annuleren
                            </Button>
                            <Button onClick={saveEditQuestion}>
                              <Save className="w-4 h-4" />
                              Opslaan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={q.tempId} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Vraag {q.questionNumber || (idx + 1)}
                        <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {q.type === 'MULTIPLE_CHOICE' ? 'Meerkeuze' : 'Open'}
                        </span>
                        {q.imageUrl && (
                          <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Afbeelding
                          </span>
                        )}
                        {q.contextText && (
                          <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                            Brontekst
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditQuestion(q)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded opacity-50 group-hover:opacity-100 transition"
                          title="Bewerken"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeQuestion(q.tempId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded opacity-50 group-hover:opacity-100 transition"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {q.contextText && (
                      <p className="text-sm text-gray-600 italic mb-2 bg-gray-50 p-2 rounded">
                        {q.contextText}
                      </p>
                    )}

                    <p className="text-gray-800 mb-3">{q.text}</p>

                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question" className="max-w-md mb-3 rounded" />
                    )}

                    {q.type === 'MULTIPLE_CHOICE' && q.options && (
                      <div className="space-y-1">
                        {q.options.filter(opt => opt.trim() !== '').map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-2 rounded ${optIdx === q.correctIndex ? 'bg-green-50 border border-green-300' : 'bg-gray-50'}`}
                          >
                            {String.fromCharCode(65 + optIdx)}. {opt}
                            {optIdx === q.correctIndex && <span className="ml-2 text-green-600 font-semibold">✓</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'OPEN' && q.modelAnswer && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Modelantwoord:</p>
                        <p className="text-sm text-blue-800">{q.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
