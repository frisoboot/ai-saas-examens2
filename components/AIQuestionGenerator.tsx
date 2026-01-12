import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, Send, CheckCircle, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { StudentProfile } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIQuestionGeneratorProps {
  subject: string;
  student: StudentProfile;
  onBack: () => void;
}

interface GeneratedQuestion {
  question: string;
  type: 'multiple_choice' | 'open';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface QuestionResult {
  question: GeneratedQuestion;
  userAnswer: string;
  isCorrect: boolean;
  feedback: string;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export const AIQuestionGenerator: React.FC<AIQuestionGeneratorProps> = ({
  subject,
  student,
  onBack
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  // Generate first question on mount
  useEffect(() => {
    generateNewQuestion();
  }, []);

  const getSubjectCurriculum = (subject: string, level: string): string => {
    // Examenstof per vak en niveau
    const curriculum: Record<string, Record<string, string>> = {
      'Nederlands': {
        'VMBO-TL': 'Tekstanalyse (betoog, beschouwing), taalverzorging, zakelijke teksten, samenvatten',
        'HAVO': 'Literatuur (genres, themas), tekstanalyse, argumentatie, taalbeheersing, schrijfvaardigheid',
        'VWO': 'Literatuurgeschiedenis, literaire analyse, retoriek, argumentatiestructuur, essayistiek'
      },
      'Engels': {
        'VMBO-TL': 'Basisgrammatica, leesvaardigheid, alledaagse gesprekken, vocabulaire',
        'HAVO': 'Grammatica, reading comprehension, writing skills, idioms, formal/informal language',
        'VWO': 'Advanced grammar, literary analysis, academic writing, critical reading, debate skills'
      },
      'Wiskunde A': {
        'VMBO-TL': 'Rekenen met procenten, grafieken, statistiek, verhoudingen',
        'HAVO': 'Functies, afgeleide, integralen, statistiek, kansrekening, groei en verandering',
        'VWO': 'Differentiëren, integreren, exponentiële functies, logaritmen, statistiek en kansrekening'
      },
      'Wiskunde B': {
        'VMBO-TL': 'Niet van toepassing',
        'HAVO': 'Goniometrie, vectoren, differentiëren, integreren, exponentiële groei',
        'VWO': 'Goniometrische functies, vectorrekening, limieten, afgeleide, integralen, complexe getallen'
      },
      'Biologie': {
        'VMBO-TL': 'Menselijk lichaam, planten, dieren, milieu, gezondheid',
        'HAVO': 'Cellen, DNA, erfelijkheid, ecosystemen, evolutie, fotosynthese, homeostase',
        'VWO': 'Celbiologie, genetica, moleculaire biologie, evolutietheorie, ecologie, fysiologie'
      },
      'Scheikunde': {
        'VMBO-TL': 'Atomen, moleculen, reacties, zuren en basen, materialen',
        'HAVO': 'Periodiek systeem, chemische reacties, evenwichten, redox, organische chemie',
        'VWO': 'Thermodynamica, elektrochemie, evenwichten, kinetiek, organische chemie, synthese'
      },
      'Natuurkunde': {
        'VMBO-TL': 'Kracht en beweging, energie, elektriciteit, warmte, geluid en licht',
        'HAVO': 'Mechanica, energie, elektriciteit, straling, golven, kernfysica',
        'VWO': 'Klassieke mechanica, elektromagnetisme, moderne fysica, kwantummechanica, relativiteit'
      },
      'Geschiedenis': {
        'VMBO-TL': 'Belangrijke gebeurtenissen 20e eeuw, wereldoorlogen, Nederlandse geschiedenis',
        'HAVO': 'Tijdvakken, industrialisatie, imperialisme, wereldoorlogen, Koude Oorlog, dekolonisatie',
        'VWO': 'Historische analyse, bronnenkritiek, thematische geschiedenis, historiografie'
      },
      'Aardrijkskunde': {
        'VMBO-TL': 'Landen en steden, klimaat, bevolking, economie, milieu',
        'HAVO': 'Geografische systemen, duurzaamheid, ontwikkelingslanden, globalisering, landschappen',
        'VWO': 'Geo-systemen, ruimtelijke ordening, geopolitiek, duurzaamheidsvraagstukken'
      },
      'Economie': {
        'VMBO-TL': 'Geld, handel, bedrijven, werken',
        'HAVO': 'Vraag en aanbod, marktwerking, overheid en economie, internationale handel',
        'VWO': 'Macro-economie, micro-economie, marktstructuren, internationale economie, economische groei'
      },
      'Maatschappijwetenschappen': {
        'VMBO-TL': 'Niet standaard op VMBO-TL',
        'HAVO': 'Sociale groepen, cultuur, politiek, socialisatie, media',
        'VWO': 'Sociologie, politicologie, culturele antropologie, sociaal-wetenschappelijk onderzoek'
      },
      'Wiskunde C': {
        'VMBO-TL': 'Niet van toepassing',
        'HAVO': 'Niet van toepassing',
        'VWO': 'Discrete wiskunde, meetkunde, kansrekening, combinatoriek, grafen'
      },
      'Duits': {
        'VMBO-TL': 'Basisgrammatica, leesvaardigheid, gesprekken, vocabulaire',
        'HAVO': 'Grammatica, tekstbegrip, schrijfvaardigheid, idioom',
        'VWO': 'Gevorderde grammatica, literatuur, schrijfvaardigheid, analyse'
      },
      'Frans': {
        'VMBO-TL': 'Basisgrammatica, leesvaardigheid, alledaagse gesprekken',
        'HAVO': 'Grammatica, tekstbegrip, schrijfvaardigheid, Franse cultuur',
        'VWO': 'Gevorderde grammatica, Franse literatuur, essayistiek, analyse'
      },
      'Bedrijfseconomie': {
        'VMBO-TL': 'Basis bedrijfsvoering, administratie, financiën',
        'HAVO': 'Marketing, financiën, organisatie, productie, personeelsbeleid',
        'VWO': 'Strategisch management, financiële analyse, marketing strategie, ondernemerschap'
      },
      'Kunst Algemeen': {
        'VMBO-TL': 'Kunstgeschiedenis basiskennis, stijlen, bekende kunstenaars',
        'HAVO': 'Kunstgeschiedenis, stijlperioden, analyse kunstwerken, context',
        'VWO': 'Kunsttheorie, kunstgeschiedenis, kunstfilosofie, kritische analyse'
      }
    };

    return curriculum[subject]?.[level] || `Algemene examenstof voor ${subject} op ${level} niveau`;
  };

  const generateNewQuestion = async () => {
    setIsLoading(true);
    setShowResult(false);
    setCurrentResult(null);
    setUserAnswer('');
    setSelectedOption(null);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const curriculum = getSubjectCurriculum(subject, student.level);

      const prompt = `Je bent een examentrainer voor ${subject} op ${student.level} niveau.

EXAMENSTOF:
${curriculum}

OPDRACHT:
Genereer één examenvraag die past bij het niveau en de examenstof. De vraag moet uitdagend maar haalbaar zijn.

Kies willekeurig tussen:
1. Meerkeuze vraag (4 opties, A, B, C, D)
2. Open vraag (kort antwoord)

FORMAAT (JSON):
{
  "type": "multiple_choice" of "open",
  "question": "De vraag...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],  // alleen bij meerkeuze
  "correctAnswer": "Het juiste antwoord",
  "explanation": "Korte uitleg waarom dit het antwoord is"
}

Belangrijke regels:
- Vraag moet examenniveau zijn (niet te makkelijk)
- Bij meerkeuze: maak plausibele foute antwoorden
- Antwoord moet duidelijk en correct zijn
- Uitleg moet bondig zijn (max 2 zinnen)
- Gebruik geen afbeeldingen of complexe formules
- Vraag in het Nederlands

Genereer nu één vraag:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Kon geen geldige vraag genereren');
      }

      const questionData = JSON.parse(jsonMatch[0]);
      setCurrentQuestion(questionData);
      setQuestionsAnswered(prev => prev + 1);
    } catch (error) {
      console.error('Fout bij genereren vraag:', error);
      alert('Er ging iets mis bij het genereren van de vraag. Probeer het opnieuw.');
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = async () => {
    if (!currentQuestion) return;

    const answer = currentQuestion.type === 'multiple_choice'
      ? (selectedOption !== null ? currentQuestion.options![selectedOption] : '')
      : userAnswer;

    if (!answer.trim()) {
      alert('Vul eerst een antwoord in!');
      return;
    }

    setIsCheckingAnswer(true);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      let isCorrect = false;
      let feedback = '';

      if (currentQuestion.type === 'multiple_choice') {
        // Check exact match for multiple choice
        isCorrect = answer.includes(currentQuestion.correctAnswer) ||
                    currentQuestion.correctAnswer.includes(answer.charAt(0));
        feedback = isCorrect
          ? `✓ Correct! ${currentQuestion.explanation || ''}`
          : `✗ Helaas, het juiste antwoord was: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation || ''}`;
      } else {
        // Use AI to check open question
        const checkPrompt = `Je bent een examinator voor ${subject}.

VRAAG: ${currentQuestion.question}
MODELANTWOORD: ${currentQuestion.correctAnswer}
ANTWOORD VAN LEERLING: ${answer}

Beoordeel of het antwoord van de leerling correct is. Een antwoord is correct als:
- De kerninhoud klopt (mag in andere woorden)
- De belangrijkste punten worden genoemd
- Er geen grote fouten in zitten

Geef je beoordeling in dit formaat:
BEOORDELING: [CORRECT/GEDEELTELIJK CORRECT/ONJUIST]
FEEDBACK: [Korte uitleg in 1-2 zinnen]`;

        const checkResult = await model.generateContent(checkPrompt);
        const checkText = checkResult.response.text();

        isCorrect = checkText.includes('CORRECT') && !checkText.includes('ONJUIST');

        const feedbackMatch = checkText.match(/FEEDBACK:\s*(.+)/);
        feedback = feedbackMatch ? feedbackMatch[1] : checkText;
      }

      const result: QuestionResult = {
        question: currentQuestion,
        userAnswer: answer,
        isCorrect,
        feedback
      };

      setCurrentResult(result);
      setQuestionResults(prev => [...prev, result]);
      setShowResult(true);
    } catch (error) {
      console.error('Fout bij nakijken:', error);
      alert('Er ging iets mis bij het nakijken van je antwoord.');
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    generateNewQuestion();
  };

  const getScore = () => {
    const correct = questionResults.filter(r => r.isCorrect).length;
    return {
      correct,
      total: questionResults.length,
      percentage: questionResults.length > 0
        ? Math.round((correct / questionResults.length) * 100)
        : 0
    };
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-6 -ml-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">AI Oefenvragen</h1>
                <p className="text-slate-500 mt-1">{subject} • {student.level}</p>
              </div>
            </div>

            {/* Score Display */}
            {questionResults.length > 0 && (
              <div className="bg-white rounded-xl px-6 py-3 shadow-sm border border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {getScore().correct}/{getScore().total}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {getScore().percentage}% correct
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm">
              <strong>💡 Tip:</strong> De AI genereert elke vraag ter plekke op basis van de examenstof.
              Blijf oefenen om alle onderwerpen te behandelen!
            </p>
          </div>
        </div>

        {/* Question Display */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">AI genereert een nieuwe vraag...</p>
          </div>
        ) : currentQuestion ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            {/* Question */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                  Vraag {questionsAnswered}
                </span>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                  {currentQuestion.type === 'multiple_choice' ? 'Meerkeuze' : 'Open vraag'}
                </span>
              </div>
              <p className="text-lg text-slate-900 leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer Input */}
            {!showResult ? (
              <div className="space-y-4">
                {currentQuestion.type === 'multiple_choice' ? (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedOption(index)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedOption === index
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="font-medium text-slate-900">{option}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Typ hier je antwoord..."
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                )}

                <Button
                  onClick={checkAnswer}
                  disabled={isCheckingAnswer || (currentQuestion.type === 'multiple_choice' ? selectedOption === null : !userAnswer.trim())}
                  className="w-full justify-center"
                  size="lg"
                >
                  {isCheckingAnswer ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Nakijken...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Controleer Antwoord
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Result Display */
              <div className="space-y-6">
                <div className={`p-6 rounded-xl border-2 ${
                  currentResult?.isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-4">
                    {currentResult?.isCorrect ? (
                      <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-2 ${
                        currentResult?.isCorrect ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {currentResult?.isCorrect ? 'Goed gedaan!' : 'Helaas, niet helemaal'}
                      </h3>
                      <p className={currentResult?.isCorrect ? 'text-green-800' : 'text-red-800'}>
                        {currentResult?.feedback}
                      </p>

                      {!currentResult?.isCorrect && (
                        <div className="mt-4 pt-4 border-t border-red-200">
                          <p className="text-sm text-red-700">
                            <strong>Jouw antwoord:</strong> {currentResult?.userAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextQuestion}
                  className="w-full justify-center"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Volgende Vraag
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* Question History */}
        {questionResults.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Voortgang</h3>
            <div className="space-y-2">
              {questionResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    result.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium truncate">
                        Vraag {index + 1}: {result.question.question}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
