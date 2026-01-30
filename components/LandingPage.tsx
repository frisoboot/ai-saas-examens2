import React from 'react';
import { SEO } from './SEO';
import { Button } from './Button';
import {
  GraduationCap,
  Brain,
  Zap,
  Target,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp,
  Heart,
  Users,
  ChevronDown,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onCheckout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onCheckout }) => {
  const handleStartTrial = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      onLogin();
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-amber-50/30">
      <SEO
        title="AI Examentrainer | Oefen voor je VMBO, HAVO & VWO Eindexamen met AI"
        description="Behaal hogere cijfers met de AI Examentrainer. Oefen voor je eindexamen met AI-gegenereerde vragen, flashcards en persoonlijke begeleiding voor VMBO, HAVO en VWO."
        canonical="https://ai-examentrainer.nl/"
      />

      {/* Navigation */}
      <nav className="bg-white border-b border-amber-100" role="navigation">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-800">AI Examentrainer</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Functies</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Prijzen</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Vragen</button>
            </div>
            <button
              onClick={onLogin}
              className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              Inloggen
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-24 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-amber-100 mb-8">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-600">Persoonlijke examenvoorbereiding met AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Leer slim, scoor hoog
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              De AI Examentrainer helpt je gericht oefenen voor je eindexamen.
              Met slimme oefenvragen en persoonlijke feedback bereik je jouw beste resultaat.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={handleStartTrial}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-2xl shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 transition-all hover:-translate-y-0.5"
              >
                Probeer gratis
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-medium rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Bekijk hoe het werkt
              </button>
            </div>

            <p className="text-sm text-gray-500">
              3 dagen gratis proberen · Geen betaalgegevens nodig
            </p>
          </div>

          {/* Preview Card - Open vraag met fout antwoord */}
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100">
              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Biologie - HAVO</h3>
                    <p className="text-sm text-gray-500">Erfelijkheid · Vraag 5 van 10</p>
                  </div>
                </div>

                <div className="bg-amber-50/50 rounded-2xl p-6 mb-6 border border-amber-100">
                  <p className="text-gray-800 leading-relaxed">
                    Leg uit waarom kinderen van twee ouders met bruine ogen toch blauwe ogen kunnen hebben. Gebruik de begrippen 'allel', 'dominant' en 'recessief' in je antwoord.
                  </p>
                </div>

                {/* Student's answer */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">Jouw antwoord:</p>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-gray-700 leading-relaxed">
                      Blauwe ogen zijn dominant over bruine ogen. Als beide ouders het gen voor blauwe ogen hebben, kan het kind blauwe ogen krijgen.
                    </p>
                  </div>
                </div>

                {/* AI Feedback */}
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 mb-2">Bijna! Maar let op de dominantie.</p>
                      <p className="text-amber-800 text-sm leading-relaxed mb-3">
                        Je hebt het net andersom: <strong>bruin is dominant</strong> en <strong>blauw is recessief</strong>.
                        Hier is hoe je het beter kunt opschrijven:
                      </p>
                      <div className="bg-white rounded-xl p-4 border border-amber-100">
                        <p className="text-gray-700 text-sm leading-relaxed">
                          <span className="text-emerald-600 font-medium">"Bruin (B) is dominant over blauw (b). Als beide ouders het genotype Bb hebben (bruin, maar drager van blauw), is er 25% kans dat een kind bb krijgt en dus blauwe ogen heeft. Het recessieve allel komt alleen tot uiting als het kind het van beide ouders erft."</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features */}
      <section id="features" className="py-24 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Alles om te slagen voor je examen
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Van slimme oefenvragen tot persoonlijke begeleiding - wij hebben alles wat je nodig hebt.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI Oefenvragen',
                description: 'Onbeperkt nieuwe vragen die zich aanpassen aan jouw niveau.',
                color: 'amber'
              },
              {
                icon: MessageSquare,
                title: 'Persoonlijke Tutor',
                description: 'Stel vragen en krijg uitleg in begrijpelijke taal.',
                color: 'blue'
              },
              {
                icon: Target,
                title: 'Echte Examens',
                description: 'Oefen met officiële examens van voorgaande jaren.',
                color: 'purple'
              },
              {
                icon: Zap,
                title: 'Flashcards',
                description: 'Leer begrippen en definities snel met slimme flashcards.',
                color: 'emerald'
              },
              {
                icon: TrendingUp,
                title: 'Voortgang',
                description: 'Zie precies waar je staat en wat je moet verbeteren.',
                color: 'rose'
              },
              {
                icon: Clock,
                title: 'Tijdsoefeningen',
                description: 'Train je snelheid met examens onder tijdsdruk.',
                color: 'orange'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-${feature.color}-100 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Zo werkt het
            </h2>
            <p className="text-lg text-gray-600">
              In drie simpele stappen klaar voor je examen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Maak een account',
                description: 'Meld je aan en kies je niveau en vakken. Binnen een minuut klaar.',
                icon: Users
              },
              {
                step: '2',
                title: 'Start met oefenen',
                description: 'Kies een vak en begin direct met AI-gegenereerde oefenvragen.',
                icon: BookOpen
              },
              {
                step: '3',
                title: 'Verbeter jezelf',
                description: 'Krijg feedback, bekijk je voortgang en werk aan je zwakke punten.',
                icon: TrendingUp
              }
            ].map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Eenvoudige prijzen
            </h2>
            <p className="text-lg text-gray-600">
              Geen verborgen kosten. Maandelijks opzegbaar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Individual */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-200">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Individueel</h3>
                <p className="text-gray-600 text-sm">Voor leerlingen</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">€12,50</span>
                <span className="text-gray-500 ml-2">/ maand</span>
              </div>

              <div className="bg-white/60 rounded-xl px-4 py-3 mb-6">
                <p className="text-amber-700 font-medium text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Eerste 3 dagen gratis
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Onbeperkt AI-oefenvragen',
                  'Alle 16 vakken',
                  'Persoonlijke AI-tutor',
                  'Flashcards & echte examens',
                  'Voortgang bijhouden'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleStartTrial}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl shadow-lg shadow-amber-200 hover:shadow-xl transition-all"
              >
                Start gratis proefperiode
              </button>
            </div>

            {/* School */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Schoollicentie</h3>
                <p className="text-gray-600 text-sm">Voor scholen en docenten</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Op maat</span>
              </div>

              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6">
                <p className="text-gray-600 text-sm">
                  Prijs afhankelijk van aantal leerlingen
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Alles van Individueel',
                  'Onbeperkt leerlingen',
                  'Voortgangsrapportages',
                  'Eigen vragen toevoegen',
                  'Prioriteit support'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => window.location.href = 'mailto:info@ai-examentrainer.nl'}
                className="w-full py-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
              >
                Neem contact op
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Veelgestelde vragen
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'Voor welke vakken kan ik oefenen?',
                answer: 'Je kunt oefenen voor 16 vakken, waaronder Wiskunde, Nederlands, Engels, Biologie, Scheikunde, Natuurkunde, Geschiedenis, Aardrijkskunde, Economie en meer.'
              },
              {
                question: 'Hoe werkt de gratis proefperiode?',
                answer: 'Je krijgt 3 dagen volledige toegang tot alle functies. Je hoeft geen betaalgegevens in te vullen. Na de proefperiode kun je kiezen om door te gaan.'
              },
              {
                question: 'Kan ik maandelijks opzeggen?',
                answer: 'Ja, je kunt je abonnement op elk moment opzeggen. Er zijn geen langetermijnverplichtingen.'
              },
              {
                question: 'Werkt het op mijn telefoon?',
                answer: 'Ja, AI Examentrainer werkt op alle apparaten: laptop, tablet en smartphone. Je kunt overal oefenen.'
              },
              {
                question: 'Hoe betrouwbaar zijn de AI-vragen?',
                answer: 'Onze AI is getraind op duizenden echte examenvragen en volgt de exameneisen van het CITO. De vragen zijn qua stijl en moeilijkheid vergelijkbaar met echte examens.'
              }
            ].map((faq, index) => (
              <details key={index} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-gray-900 pr-4">{faq.question}</h3>
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-12 border border-amber-100">
            <Heart className="w-12 h-12 text-amber-500 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Klaar om te beginnen?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
              Sluit je aan bij duizenden leerlingen die al slimmer oefenen voor hun examen.
            </p>
            <button
              onClick={handleStartTrial}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-2xl shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 transition-all hover:-translate-y-0.5"
            >
              Probeer 3 dagen gratis
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-800">AI Examentrainer</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="mailto:info@ai-examentrainer.nl" className="hover:text-gray-700 transition-colors">Contact</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Voorwaarden</a>
            </div>

            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} AI Examentrainer
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
