import React, { useState } from 'react';
import { Question, QuestionType, StudentLevel } from '../types';
import { saveQuestion } from '../services/storageService';
import { Button } from './Button';
import { Plus, Save, Trash2, FileText, ArrowLeft, Eye } from 'lucide-react';
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
}

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
    correctIndex: 0
  });

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const addQuestionToList = () => {
    if (!currentQuestion.text.trim()) {
      alert('Voeg minimaal een vraag toe');
      return;
    }

    if (currentQuestion.type === 'MULTIPLE_CHOICE') {
      const hasAllOptions = currentQuestion.options?.every(opt => opt.trim() !== '');
      if (!hasAllOptions) {
        alert('Vul alle antwoordopties in voor meerkeuze vraag');
        return;
      }
    }

    if (currentQuestion.type === 'OPEN' && !currentQuestion.modelAnswer?.trim()) {
      alert('Voeg een modelantwoord toe voor open vraag');
      return;
    }

    setQuestions([...questions, { ...currentQuestion }]);

    // Reset for next question
    setCurrentQuestion({
      tempId: Date.now().toString(),
      text: '',
      type: 'MULTIPLE_CHOICE',
      options: ['', '', '', ''],
      correctIndex: 0,
      contextText: '',
      imageUrl: '',
      modelAnswer: ''
    });
  };

  const removeQuestion = (tempId: string) => {
    setQuestions(questions.filter(q => q.tempId !== tempId));
  };

  const saveAllQuestions = async () => {
    if (questions.length === 0) {
      alert('Voeg minimaal één vraag toe');
      return;
    }

    // Validate exam metadata
    if (!examMeta.subject) {
      alert('Selecteer een vak');
      return;
    }

    if (!examMeta.year || isNaN(examMeta.year) || examMeta.year < 2000 || examMeta.year > 2030) {
      alert('Vul een geldig jaar in (2000-2030)');
      return;
    }

    if (!examMeta.tijdvak || isNaN(examMeta.tijdvak)) {
      alert('Selecteer een tijdvak');
      return;
    }

    if (!examMeta.level) {
      alert('Selecteer een niveau');
      return;
    }

    setSaving(true);
    setSavedCount(0);

    try {
      for (let i = 0; i < questions.length; i++) {
        const draft = questions[i];
        const questionId = `${examMeta.subject}-${examMeta.year}-T${examMeta.tijdvak}-Q${i + 1}`.replace(/\s+/g, '-');

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
            options: draft.options,
            correctIndex: draft.correctIndex
          } : {}),
          ...(draft.type === 'OPEN' ? {
            modelAnswer: draft.modelAnswer
          } : {})
        };

        await saveQuestion(question);
        setSavedCount(i + 1);
      }

      alert(`✅ ${questions.length} vragen succesvol opgeslagen!`);

      // Reset everything
      setQuestions([]);
      setCurrentQuestion({
        tempId: Date.now().toString(),
        text: '',
        type: 'MULTIPLE_CHOICE',
        options: ['', '', '', ''],
        correctIndex: 0
      });
      setShowPreview(false);
    } catch (error) {
      console.error('Error saving questions:', error);
      alert('❌ Fout bij opslaan. Probeer opnieuw.');
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
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Fout bij uploaden afbeelding');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

        {questions.length > 0 && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
          >
            <Eye className="w-5 h-5" />
            Preview ({questions.length} vragen)
          </button>
        )}
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Exam Metadata */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Examen Gegevens
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vak
                </label>
                <select
                  value={examMeta.subject}
                  onChange={(e) => setExamMeta({ ...examMeta, subject: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jaar
                </label>
                <input
                  type="number"
                  value={examMeta.year}
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    if (!isNaN(year)) {
                      setExamMeta({ ...examMeta, year });
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="2000"
                  max="2030"
                  placeholder="Bijv. 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tijdvak
                </label>
                <select
                  value={examMeta.tijdvak}
                  onChange={(e) => {
                    const tijdvak = parseInt(e.target.value);
                    if (!isNaN(tijdvak)) {
                      setExamMeta({ ...examMeta, tijdvak });
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value={1}>Tijdvak 1</option>
                  <option value={2}>Tijdvak 2</option>
                  <option value={3}>Tijdvak 3 (herkansing)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niveau
                </label>
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
                  <Button
                    onClick={() => setShowPreview(true)}
                    variant="secondary"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4" />
                    Bekijk Preview
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Question Builder */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">
              Vraag {questions.length + 1} Toevoegen
            </h2>

            <div className="space-y-4">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type Vraag
                </label>
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

              {/* Context Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brontekst (optioneel)
                </label>
                <textarea
                  value={currentQuestion.contextText || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, contextText: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg h-24"
                  placeholder="Bijvoorbeeld een tekst of grafiek beschrijving..."
                />
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vraag *
                </label>
                <textarea
                  value={currentQuestion.text}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg h-20"
                  placeholder="Typ hier de vraag..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Afbeelding (optioneel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                {currentQuestion.imageUrl && (
                  <img src={currentQuestion.imageUrl} alt="Preview" className="mt-2 max-w-xs rounded" />
                )}
              </div>

              {/* Multiple Choice Options */}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Antwoordopties *
                  </label>
                  {currentQuestion.options?.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctIndex === idx}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctIndex: idx })}
                        className="w-4 h-4"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(currentQuestion.options || [])];
                          newOptions[idx] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg"
                        placeholder={`Optie ${String.fromCharCode(65 + idx)}`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-1">Selecteer het juiste antwoord met de radio button</p>
                </div>
              )}

              {/* Open Question Model Answer */}
              {currentQuestion.type === 'OPEN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelantwoord *
                  </label>
                  <textarea
                    value={currentQuestion.modelAnswer || ''}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, modelAnswer: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg h-24"
                    placeholder="Het ideale antwoord..."
                  />
                </div>
              )}

              {/* Add Question Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={addQuestionToList}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4" />
                  Vraag Toevoegen aan Lijst
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Mode */
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
                  <>Opslaan... ({savedCount}/{questions.length})</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Alles Opslaan ({questions.length} vragen)
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.tempId} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">Vraag {idx + 1}</h3>
                  <button
                    onClick={() => removeQuestion(q.tempId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    {q.options.map((opt, optIdx) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
