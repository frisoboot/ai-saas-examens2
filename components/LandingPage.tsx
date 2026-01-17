import React from 'react';
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
  Shield,
  Users,
  Award,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onCheckout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onCheckout }) => {
  const handleStartTrial = () => {
    console.log('handleStartTrial called, onCheckout:', typeof onCheckout, onCheckout);
    if (onCheckout) {
      console.log('Calling onCheckout...');
      onCheckout();
    } else {
      console.log('No onCheckout, calling onLogin...');
      onLogin();
    }
  };
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI Examentrainer</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-gray-900 transition-colors">Functies</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-gray-900 transition-colors">Hoe het werkt</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 transition-colors">Prijzen</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</button>
            </div>
            <Button onClick={onLogin} size="md">
              Inloggen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-full blur-3xl opacity-70"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-blue-100">
              <Sparkles className="w-4 h-4" />
              Examen 2025? Start vandaag met oefenen
            </div>

            {/* Main Headline - H1 for SEO */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
              Haal hogere cijfers met de{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Examentrainer
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              De slimste manier om te oefenen voor je VMBO, HAVO of VWO eindexamen.
              Onbeperkt oefenvragen, directe AI-feedback en gepersonaliseerde leertrajecten.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button onClick={handleStartTrial} size="xl" className="w-full sm:w-auto shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:-translate-y-1">
                Start 3 dagen gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={() => scrollToSection('how-it-works')} variant="outline" size="xl" className="w-full sm:w-auto">
                Bekijk hoe het werkt
              </Button>
            </div>

            {/* Urgency text */}
            <p className="text-sm text-gray-500 mb-8">
              Geen creditcard nodig • Direct toegang • Maandelijks opzegbaar
            </p>

            {/* Platform highlights */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Onbeperkt oefenvragen</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Direct AI-feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>VMBO, HAVO & VWO</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Preview - Realistic Platform Look */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 flex-1 bg-white rounded-lg px-3 py-1.5 text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ai-examentrainer.nl/dashboard
                </div>
              </div>

              {/* App Content */}
              <div className="bg-gray-50 p-4 sm:p-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Welkom, Lisa!</p>
                      <p className="text-xs text-gray-500">HAVO - Examenjaar 2025</p>
                    </div>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    3 dagen gratis
                  </div>
                </div>

                {/* Subject Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Wiskunde B', color: 'bg-blue-500', icon: '📐', progress: 68 },
                    { name: 'Nederlands', color: 'bg-orange-500', icon: '📖', progress: 45 },
                    { name: 'Engels', color: 'bg-red-500', icon: '🇬🇧', progress: 82 },
                    { name: 'Biologie', color: 'bg-green-500', icon: '🧬', progress: 23 },
                  ].map((subject) => (
                    <div key={subject.name} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className={`w-10 h-10 ${subject.color} rounded-lg flex items-center justify-center text-lg mb-2`}>
                        {subject.icon}
                      </div>
                      <h4 className="text-gray-900 font-medium text-sm mb-1">{subject.name}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${subject.color} rounded-full`} style={{ width: `${subject.progress}%` }}></div>
                        </div>
                        <span className="text-gray-400 text-xs">{subject.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons Preview */}
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-center text-sm font-medium">
                    Start AI Oefening
                  </div>
                  <div className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-lg py-2.5 text-center text-sm font-medium">
                    Flashcards
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Success Notification */}
            <div className="absolute -right-2 sm:-right-4 top-1/4 bg-white rounded-xl shadow-2xl p-3 sm:p-4 hidden md:block border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Goed gedaan!</p>
                  <p className="text-xs text-gray-500">8/10 correct</p>
                </div>
              </div>
            </div>

            {/* Floating AI Chat Bubble */}
            <div className="absolute -left-2 sm:-left-4 bottom-1/4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-2xl p-3 sm:p-4 hidden md:block text-white max-w-[200px]">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">"Bij deze vraag moet je eerst de afgeleide bepalen..."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vakken Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Alle eindexamenvakken beschikbaar</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Van Wiskunde tot Geschiedenis, van Biologie tot Economie. Oefen voor al je vakken op VMBO-TL, HAVO of VWO niveau.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Wiskunde A', 'Wiskunde B', 'Nederlands', 'Engels', 'Duits', 'Frans',
              'Biologie', 'Scheikunde', 'Natuurkunde', 'Geschiedenis', 'Aardrijkskunde',
              'Economie', 'Bedrijfseconomie', 'M&O', 'Filosofie', 'Maatschappijwetenschappen'
            ].map((vak) => (
              <span key={vak} className="bg-white px-4 py-2 rounded-full text-gray-700 text-sm font-medium shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-default">
                {vak}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Alles wat je nodig hebt om te slagen
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Onze AI-gestuurde tools helpen je slimmer te leren, niet harder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-gegenereerde vragen',
                description: 'Onbeperkt nieuwe oefenvragen op jouw niveau, gegenereerd door geavanceerde AI die echte examenvragen simuleert.',
                color: 'blue'
              },
              {
                icon: MessageSquare,
                title: 'Persoonlijke AI-tutor',
                description: 'Stel vragen aan je AI-assistent. Krijg uitleg over moeilijke onderwerpen in begrijpelijke taal.',
                color: 'indigo'
              },
              {
                icon: Target,
                title: 'Look-alike examens',
                description: 'Oefen met examens die exact lijken op het echte werk. Inclusief tijdslimiet en scorebeoordeling.',
                color: 'purple'
              },
              {
                icon: Zap,
                title: 'Flashcards',
                description: 'Leer definities en kernbegrippen met AI-gegenereerde flashcards. Perfect voor snelle herhaling.',
                color: 'yellow'
              },
              {
                icon: TrendingUp,
                title: 'Voortgang bijhouden',
                description: 'Zie precies waar je staat per vak. Ontdek je sterke en zwakke punten met gedetailleerde statistieken.',
                color: 'green'
              },
              {
                icon: BookOpen,
                title: 'Echte examenvragen',
                description: 'Toegang tot officiële examenvragen van voorgaande jaren, inclusief correctiemodellen.',
                color: 'orange'
              }
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-lg shadow-gray-100 border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all group">
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              In 3 stappen klaar voor je examen
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Geen gedoe met ingewikkelde software. Begin binnen 2 minuten met oefenen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Maak een account',
                description: 'Je docent maakt een account voor je aan. Log in met je naam en wachtwoord.',
                icon: Users
              },
              {
                step: '2',
                title: 'Kies je vak',
                description: 'Selecteer het vak waarvoor je wilt oefenen. Kies tussen AI-vragen, flashcards of echte examens.',
                icon: BookOpen
              },
              {
                step: '3',
                title: 'Oefen en verbeter',
                description: 'Krijg direct feedback op je antwoorden. De AI past zich aan jouw niveau aan.',
                icon: TrendingUp
              }
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 text-gray-300">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Waarom leerlingen kiezen voor AI Examentrainer
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Clock,
                    title: 'Bespaar tijd',
                    description: 'Geen uren zoeken naar goede oefenvragen. De AI genereert direct relevante vragen.'
                  },
                  {
                    icon: Target,
                    title: 'Gericht oefenen',
                    description: 'Focus op onderwerpen waar jij moeite mee hebt. De AI onthoudt waar je fouten maakt.'
                  },
                  {
                    icon: Shield,
                    title: 'Examenangst verminderen',
                    description: 'Door veel te oefenen met realistische examens ga je met meer zelfvertrouwen je examen in.'
                  },
                  {
                    icon: Award,
                    title: 'Betere resultaten',
                    description: 'Hoe meer je oefent, hoe beter je wordt. Met onbeperkt vragen kun je net zo lang doorgaan als je wilt.'
                  }
                ].map((benefit) => (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white">
              <div className="text-center">
                <div className="text-4xl font-extrabold mb-2">Wat je krijgt</div>
                <p className="text-blue-100 text-lg mb-8">Alles om optimaal voorbereid je examen in te gaan</p>

                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/20">
                  <div>
                    <div className="text-3xl font-bold">16</div>
                    <p className="text-blue-100 text-sm">Vakken beschikbaar</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">3</div>
                    <p className="text-blue-100 text-sm">Niveaus (VMBO/HAVO/VWO)</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">24/7</div>
                    <p className="text-blue-100 text-sm">Altijd beschikbaar</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold flex items-center justify-center gap-1">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-blue-100 text-sm">Onbeperkt AI-vragen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* Urgency Banner */}
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Clock className="w-4 h-4" />
              Eindexamens in mei 2025 - Start nu met voorbereiden
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Kies jouw pakket
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start met 3 dagen gratis proefperiode. Geen creditcard nodig.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Individual Subscription */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-sm font-medium text-center">
                Probeer 3 dagen gratis - Geen risico
              </div>
              <div className="pt-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Individueel</h3>
              <p className="text-gray-600 mb-6">Voor leerlingen die zelfstandig willen oefenen</p>

              <div className="mb-2">
                <span className="text-5xl font-extrabold text-gray-900">€12,50</span>
                <span className="text-gray-500 ml-2">/ maand</span>
              </div>
              <p className="text-green-600 font-medium mb-8 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Eerste 3 dagen gratis proberen
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Onbeperkt AI-oefenvragen',
                  'Alle 16 vakken beschikbaar',
                  'VMBO, HAVO & VWO niveau',
                  'Persoonlijke AI-tutor',
                  'Flashcards generator',
                  'Look-alike examens',
                  'Voortgang bijhouden',
                  'Maandelijks opzegbaar'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button onClick={handleStartTrial} className="w-full justify-center shadow-lg shadow-blue-600/25" size="lg">
                Start gratis proefperiode
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              </div>
            </div>

            {/* School License */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Schoollicentie</h3>
              <p className="text-gray-600 mb-6">Voor docenten en hun klassen</p>

              <div className="mb-2">
                <span className="text-4xl font-extrabold text-gray-900">Op aanvraag</span>
              </div>
              <p className="text-gray-500 mb-8">Prijs afhankelijk van aantal leerlingen</p>

              <ul className="space-y-4 mb-8">
                {[
                  'Onbeperkt aantal leerlingen',
                  'Alle vakken en niveaus',
                  'Voortgangsrapportages voor docenten',
                  'Eigen vragen toevoegen',
                  'Klasbeheer dashboard',
                  'Prioriteit support',
                  'Facturatie op maat'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button onClick={() => window.location.href = 'mailto:info@ai-examentrainer.nl'} variant="outline" className="w-full justify-center" size="lg">
                Neem contact op
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Important for SEO */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Veelgestelde vragen
            </h2>
            <p className="text-xl text-gray-600">
              Alles wat je wilt weten over AI Examentrainer
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'Wat is AI Examentrainer?',
                answer: 'AI Examentrainer is een online platform dat leerlingen helpt bij de voorbereiding op hun eindexamen. Met behulp van kunstmatige intelligentie genereren we onbeperkt oefenvragen die lijken op echte examenvragen. Beschikbaar voor VMBO-TL, HAVO en VWO.'
              },
              {
                question: 'Voor welke vakken kan ik oefenen?',
                answer: 'Je kunt oefenen voor alle veelvoorkomende eindexamenvakken, waaronder: Wiskunde A en B, Nederlands, Engels, Duits, Frans, Biologie, Scheikunde, Natuurkunde, Geschiedenis, Aardrijkskunde, Economie, Bedrijfseconomie, M&O, Filosofie en Maatschappijwetenschappen.'
              },
              {
                question: 'Hoe werkt de AI-feedback?',
                answer: 'Na elk antwoord krijg je direct feedback van onze AI. Bij meerkeuzevragen zie je of je goed of fout hebt. Bij open vragen vergelijkt de AI jouw antwoord met het modelantwoord en geeft tips voor verbetering. De AI past zich aan jouw niveau aan.'
              },
              {
                question: 'Is AI Examentrainer beschikbaar voor individuele leerlingen?',
                answer: 'Ja! Je kunt een individueel abonnement nemen voor €12,50 per maand. Je krijgt eerst 3 dagen gratis om het platform uit te proberen. Je kunt ook toegang krijgen via je school als zij een schoollicentie hebben.'
              },
              {
                question: 'Hoe betrouwbaar zijn de AI-gegenereerde vragen?',
                answer: 'Onze AI is getraind op duizenden echte examenvragen en volgt nauwkeurig de exameneisen van het CITO. De vragen zijn qua stijl, moeilijkheid en opbouw vergelijkbaar met echte examenvragen. Docenten kunnen ook eigen vragen toevoegen.'
              },
              {
                question: 'Kan ik mijn voortgang bijhouden?',
                answer: 'Ja! Je ziet per vak hoeveel vragen je hebt gemaakt, je gemiddelde score, en waar je sterke en zwakke punten liggen. Docenten kunnen ook de voortgang van hun leerlingen volgen.'
              },
              {
                question: 'Werkt AI Examentrainer op mijn telefoon?',
                answer: 'Ja, AI Examentrainer werkt op alle apparaten met een internetbrowser: laptop, tablet en smartphone. Je kunt dus overal oefenen, ook onderweg.'
              },
              {
                question: 'Hoeveel kost AI Examentrainer?',
                answer: 'Een individueel abonnement kost €12,50 per maand, met de eerste 3 dagen gratis om te proberen. Je kunt maandelijks opzeggen. Voor scholen bieden we licenties op maat aan, afhankelijk van het aantal leerlingen. Neem contact met ons op voor een prijsopgave.'
              }
            ].map((faq, index) => (
              <details key={index} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Klaar om te beginnen?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Begin vandaag nog met oefenen en verhoog je kansen op een goed examenresultaat.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={handleStartTrial} variant="white" size="xl" className="w-full sm:w-auto">
                  Start 3 dagen gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button onClick={onLogin} variant="ghost" size="xl" className="w-full sm:w-auto text-white border-white/30 hover:bg-white/10">
                  Al een account? Inloggen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white">AI Examentrainer</span>
              </div>
              <p className="text-gray-400 max-w-md">
                De slimste manier om te oefenen voor je eindexamen.
                AI-gestuurde oefenvragen voor VMBO, HAVO en VWO.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Functies</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Prijzen</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><a href="mailto:info@ai-examentrainer.nl" className="hover:text-white transition-colors">info@ai-examentrainer.nl</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; {new Date().getFullYear()} AI Examentrainer. Alle rechten voorbehouden.</p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacybeleid</a>
              <a href="#" className="hover:text-white transition-colors">Algemene voorwaarden</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
