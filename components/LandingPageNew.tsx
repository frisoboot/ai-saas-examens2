import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from './SEO';
import {
  GraduationCap,
  Brain,
  Zap,
  Target,
  BookOpen,
  MessageSquare,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  ChevronDown,
  Shield,
  Award,
  ArrowRight,
  Check,
  Star
} from 'lucide-react';
import './landing/animations.css';

interface LandingPageProps {
  onLogin: () => void;
  onCheckout?: () => void;
}

// Scroll reveal hook
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .stagger-children').forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
};

// Countdown hook
const useCountdown = (targetDate: Date) => {
  const [daysLeft, setDaysLeft] = useState(0);
  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - new Date().getTime();
      setDaysLeft(Math.max(0, Math.ceil(diff / 86400000)));
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [targetDate]);
  return daysLeft;
};

export const LandingPageNew: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const navigate = useNavigate();
  useScrollReveal();

  useEffect(() => {
    if (typeof fbq === 'function') {
      fbq('track', 'ViewContent', { content_name: 'Landing Page' });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setIsNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStartTrial = (plan = 'quarterly') => {
    navigate(`/checkout?plan=${plan}`);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const examDate = useMemo(() => new Date('2026-05-11'), []);
  const daysUntilExam = useCountdown(examDate);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Roboto', Helvetica, Arial, sans-serif" }}>
      <SEO
        title="AI Examentrainer | Geef jouw kind de beste kans op slagen"
        description="Meer dan 2.500 leerlingen bereidden zich voor op hun VMBO, HAVO en VWO eindexamen met AI Examentrainer. Echte examenvragen, directe AI-uitleg. Probeer 5 dagen voor €2."
        canonical="https://ai-examentrainer.nl/"
      />

      {/* ── Navigatie ── */}
      <nav
        role="navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isNavScrolled ? 'navbar-scrolled bg-white py-3' : 'bg-white border-b border-gray-200 py-4'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#1a56db' }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">AI Examentrainer</span>
          </div>

          {/* Nav links + login */}
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-7">
              <button onClick={() => scrollTo('features')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Hoe het werkt</button>
              <button onClick={() => scrollTo('pricing')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Prijzen</button>
              <button onClick={() => scrollTo('faq')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</button>
            </div>
            <button
              onClick={onLogin}
              className="text-sm font-medium px-4 py-2 border rounded transition-colors"
              style={{ borderColor: '#1a56db', color: '#1a56db' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a56db'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1a56db'; }}
            >
              Inloggen
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-6 lg:px-8" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              {daysUntilExam > 0 && (
                <div className="text-reveal text-reveal-delay-1 inline-flex items-center gap-2 text-sm font-medium mb-5 px-3 py-1.5 rounded" style={{ backgroundColor: '#eff6ff', color: '#1a56db' }}>
                  <Clock className="w-4 h-4" />
                  Eindexamens over {daysUntilExam} dagen
                </div>
              )}

              <h1
                className="text-reveal text-reveal-delay-2 font-bold text-gray-900 leading-tight mb-5"
                style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: 'clamp(2rem, 3vw + 1rem, 3rem)' }}
              >
                Geef jouw kind de beste kans op slagen
              </h1>

              <p className="text-reveal text-reveal-delay-3 text-gray-600 leading-relaxed mb-8" style={{ fontSize: '1.1rem' }}>
                AI Examentrainer helpt leerlingen op VMBO-TL, HAVO en VWO dagelijks te oefenen
                met echte examenvragen — met directe uitleg van een AI-tutor.
                Vertrouwd door meer dan 2.500 families.
              </p>

              <div className="text-reveal text-reveal-delay-4 flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => handleStartTrial()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded transition-colors"
                  style={{ backgroundColor: '#1a56db' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1442b5')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a56db')}
                >
                  Start vandaag — 5 dagen voor €2
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollTo('features')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Bekijk hoe het werkt
                </button>
              </div>

              {/* Trust row */}
              <div className="text-reveal text-reveal-delay-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" style={{ color: '#1a56db' }} />
                  Direct opzegbaar
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: '#1a56db' }} />
                  Veilige betaling via Mollie
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: '#1a56db' }} />
                  Geen verrassingsfactuur
                </span>
              </div>
            </div>

            {/* Right: app preview */}
            <div className="text-reveal text-reveal-delay-3">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Window bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Biologie · HAVO</span>
                  <div className="w-16"></div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="bg-gray-50 rounded p-4 border border-gray-100">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Leg uit waarom kinderen van twee ouders met bruine ogen toch blauwe ogen kunnen hebben.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-gray-100 rounded-lg px-4 py-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Jouw antwoord</p>
                      <p className="text-sm text-gray-700">Blauwe ogen zijn dominant over bruine ogen...</p>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-lg px-4 py-3 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1a56db' }}>
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: '#1442b5' }}>Bijna goed — let op de volgorde</p>
                          <p className="text-sm leading-relaxed" style={{ color: '#1a56db' }}>
                            <strong>Bruin is dominant</strong>, blauw is recessief. Als beide ouders Bb zijn, is er 25% kans op bb (blauwe ogen).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats below hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 pt-10 border-t border-gray-200">
            {[
              { value: '2.500+', label: 'Leerlingen geholpen' },
              { value: '1.500+', label: 'Vragen beantwoord' },
              { value: '16', label: 'Vakken beschikbaar' },
              { value: '4,7 / 5', label: 'Gemiddelde beoordeling' },
            ].map((s) => (
              <div key={s.label} className="text-center scroll-reveal">
                <div className="text-2xl font-bold mb-1" style={{ color: '#1a56db' }}>{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hoe het werkt ── */}
      <section id="features" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Hoe helpt AI Examentrainer jouw kind?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Alles wat een leerling nodig heeft om goed voorbereid het examen in te gaan.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {[
              {
                icon: Brain,
                title: 'AI Oefenvragen',
                description: 'Onbeperkt oefenen met vragen op het exacte niveau van jouw kind — VMBO-TL, HAVO of VWO.',
                color: '#1a56db',
              },
              {
                icon: MessageSquare,
                title: 'Persoonlijke AI-tutor',
                description: 'Een geduldig AI-tutor die altijd beschikbaar is, ook laat op de avond voor een tentamen.',
                color: '#0369a1',
              },
              {
                icon: Target,
                title: 'Echte CITO-examens',
                description: 'Oefen met officiële examens zodat de opbouw en moeilijkheidsgraad geen verrassing zijn.',
                color: '#1a56db',
              },
              {
                icon: Zap,
                title: 'Slimme Flashcards',
                description: 'Begrippen inslijpen met AI-flashcards — ideaal voor onderweg of korte oefenmomenten.',
                color: '#0369a1',
              },
              {
                icon: TrendingUp,
                title: 'Voortgang bijhouden',
                description: 'Jouw kind ziet direct per vak waar verbetering nodig is. Transparant en motiverend.',
                color: '#1a56db',
              },
              {
                icon: Clock,
                title: 'Tijdsoefeningen',
                description: 'Oefenen onder tijdsdruk zodat de examenstress zo laag mogelijk blijft op de grote dag.',
                color: '#0369a1',
              },
            ].map((f) => (
              <div key={f.title} className="feature-card bg-white border border-gray-200 rounded-lg p-6">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center mb-4"
                  style={{ backgroundColor: f.color + '15' }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-6 lg:px-8" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Wat ouders zeggen
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {[
              {
                quote: 'Ik maakte me zorgen of Lisa het eindexamen zou halen. Na twee maanden AI Examentrainer zag ik haar zelfvertrouwen groeien. Ze is geslaagd met een 7 voor biologie.',
                name: 'Marieke de Vries',
                role: 'Moeder van Lisa, HAVO',
              },
              {
                quote: 'Als ouder weet je nooit of ze thuis echt oefenen. Met AI Examentrainer kan Tom oefenen wanneer het hem uitkomt — en ik zie dat het werkt aan zijn cijfers.',
                name: 'Peter Janssen',
                role: 'Vader van Tom, VWO',
              },
              {
                quote: 'We konden ons geen bijles veroorloven. AI Examentrainer was het beste alternatief: betaalbaar, effectief, en Youssef gebruikt het écht elke dag.',
                name: 'Fatima El-Amrani',
                role: 'Moeder van Youssef, VMBO-TL',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-lg p-6 scroll-reveal">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#f59e0b' }} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prijzen ── */}
      <section id="pricing" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Een investering in de toekomst van jouw kind
            </h2>
            <p className="text-gray-500">Minder dan een les bijles per maand. Direct opzegbaar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Maandelijks */}
            <div className="border border-gray-200 rounded-lg p-7 flex flex-col scroll-reveal">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Maandelijks</h3>
              <p className="text-sm text-gray-500 mb-5">Flexibel en opzegbaar</p>
              <div className="mb-5">
                <span className="text-4xl font-bold text-gray-900">€9,95</span>
                <span className="text-gray-500 text-sm ml-1">/ maand</span>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {['Alle 16 vakken', 'Onbeperkt AI-oefenvragen', 'Persoonlijke AI-tutor', 'Flashcards & echte examens', 'Maandelijks opzegbaar'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartTrial('monthly')}
                className="w-full py-3 rounded border border-gray-300 text-gray-700 font-medium text-sm transition-colors hover:bg-gray-50"
              >
                Kies maandelijks
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">5 dagen proberen voor €2</p>
            </div>

            {/* Per kwartaal — popular */}
            <div className="relative pt-5 scroll-reveal">
            <div className="border-2 rounded-lg p-7 flex flex-col shine-effect h-full" style={{ borderColor: '#1a56db' }}>
              <div
                className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap"
                style={{ backgroundColor: '#1a56db' }}
              >
                POPULAIR
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Per kwartaal</h3>
              <p className="text-sm text-gray-500 mb-5">Elke 3 maanden verlengd</p>
              <div className="mb-2">
                <span className="text-4xl font-bold text-gray-900">€8,32</span>
                <span className="text-gray-500 text-sm ml-1">/ maand</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">€24,95 per kwartaal</p>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded mb-5" style={{ backgroundColor: '#eff6ff', color: '#1a56db' }}>
                Bespaar 16%
              </span>
              <ul className="space-y-3 mb-8 flex-grow">
                {['Alle 16 vakken', 'Onbeperkt AI-oefenvragen', 'Persoonlijke AI-tutor', 'Flashcards & echte examens', 'Goedkoper dan maandelijks'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1a56db' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartTrial('quarterly')}
                className="w-full py-3 rounded text-white font-medium text-sm transition-colors"
                style={{ backgroundColor: '#1a56db' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1442b5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a56db')}
              >
                Kies per kwartaal
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">5 dagen proberen voor €2</p>
            </div>
            </div>

            {/* Jaarlijks */}
            <div className="border border-gray-200 rounded-lg p-7 flex flex-col scroll-reveal">
              <div
                className="inline-block text-white text-xs font-bold px-3 py-0.5 rounded-full mb-3 self-start"
                style={{ backgroundColor: '#0369a1' }}
              >
                BESTE DEAL
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Jaarlijks</h3>
              <p className="text-sm text-gray-500 mb-5">Elk jaar verlengd</p>
              <div className="mb-2">
                <span className="text-4xl font-bold text-gray-900">€6,58</span>
                <span className="text-gray-500 text-sm ml-1">/ maand</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">€79 per jaar</p>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded mb-5 text-emerald-700 bg-emerald-50">
                Bespaar 34%
              </span>
              <ul className="space-y-3 mb-8 flex-grow">
                {['Alle 16 vakken', 'Onbeperkt AI-oefenvragen', 'Persoonlijke AI-tutor', 'Flashcards & echte examens', 'Meest voordelig per maand'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartTrial('yearly')}
                className="w-full py-3 rounded border font-medium text-sm transition-colors hover:bg-gray-50"
                style={{ borderColor: '#0369a1', color: '#0369a1' }}
              >
                Kies jaarlijks
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">5 dagen proberen voor €2</p>
            </div>
          </div>

          {/* Schoollicentie */}
          <div className="border border-gray-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-5 scroll-reveal">
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Schoollicentie</h3>
              <p className="text-sm text-gray-500">Voor scholen en docenten — prijs op maat, onbeperkt leerlingen, voortgangsrapportages.</p>
            </div>
            <button
              onClick={() => window.location.href = 'mailto:info@ai-examentrainer.nl'}
              className="flex-shrink-0 px-5 py-2.5 rounded border font-medium text-sm transition-colors hover:bg-gray-50 whitespace-nowrap"
              style={{ borderColor: '#1a56db', color: '#1a56db' }}
            >
              Neem contact op
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-6 lg:px-8" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Veelgestelde vragen
            </h2>
          </div>

          <div className="space-y-3 scroll-reveal">
            {[
              {
                question: 'Is AI Examentrainer geschikt voor mijn kind?',
                answer: 'Ja — AI Examentrainer werkt voor leerlingen op VMBO-TL, HAVO én VWO. Jouw kind kiest bij aanmelding zijn of haar niveau en alle oefenvragen worden daar automatisch op afgestemd.',
              },
              {
                question: 'Hoe weet ik of mijn kind het daadwerkelijk gebruikt?',
                answer: 'Jouw kind heeft een voortgangsdashboard waarop duidelijk staat hoeveel vragen er zijn geoefend, welke vakken extra aandacht nodig hebben en hoe de scores verbeteren.',
              },
              {
                question: 'Kan ik opzeggen als het niet bevalt?',
                answer: 'Absoluut. Je begint met 5 dagen proberen voor €2. Bevalt het niet? Zeg op vóór die 5 dagen en er wordt niets verder in rekening gebracht. Na de proefperiode kun je maandelijks opzeggen via de instellingen.',
              },
              {
                question: 'Is de betaling en de data van mijn kind veilig?',
                answer: 'Ja. Betalingen lopen via Mollie, een gecertificeerde Nederlandse betaaldienst. Persoonlijke gegevens worden versleuteld opgeslagen en nooit gedeeld met derden.',
              },
              {
                question: 'Voor welke vakken kan mijn kind oefenen?',
                answer: 'Er zijn 16 vakken beschikbaar: Wiskunde A/B/C, Nederlands, Engels, Duits, Frans, Biologie, Scheikunde, Natuurkunde, Geschiedenis, Aardrijkskunde, Economie en meer.',
              },
            ].map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                  <h3 className="font-medium text-gray-900 pr-4 text-sm leading-snug">{faq.question}</h3>
                  <ChevronDown
                    className="w-5 h-5 flex-shrink-0 transition-transform group-open:rotate-180"
                    style={{ color: '#1a56db' }}
                  />
                </summary>
                <div className="px-6 pb-5 pt-1">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 px-6 lg:px-8" style={{ backgroundColor: '#1a56db' }}>
        <div className="max-w-3xl mx-auto text-center scroll-reveal">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            Klaar om jouw kind een vliegende start te geven?
          </h2>
          <p className="text-white/80 mb-8">
            Probeer AI Examentrainer 5 dagen voor slechts €2. Geen verplichtingen, direct opzegbaar.
          </p>
          <button
            onClick={() => handleStartTrial()}
            className="inline-flex items-center gap-2 bg-white font-semibold px-7 py-3.5 rounded transition-colors hover:bg-gray-100"
            style={{ color: '#1a56db' }}
          >
            Begin vandaag
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 lg:px-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#1a56db' }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">AI Examentrainer</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/voorwaarden" className="hover:text-white transition-colors">Voorwaarden</a>
              <a href="mailto:bedrijfboot@gmail.com" className="hover:text-white transition-colors">bedrijfboot@gmail.com</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} AI Examentrainer. Alle rechten voorbehouden.
          </div>
        </div>
      </footer>
    </div>
  );
};
