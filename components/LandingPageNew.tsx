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
  Star,
  ThumbsUp,
  Ticket
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

  const handleJoinWaitlist = () => {
    navigate('/wachtlijst');
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const examDate = useMemo(() => new Date('2026-05-11'), []);
  const daysUntilExam = useCountdown(examDate);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Roboto', Helvetica, Arial, sans-serif" }}>
      <SEO
        title="Wachtlijst | AI Examentrainer — VMBO, HAVO & VWO"
        description="Registratie is tijdelijk gesloten vanwege drukte. Schrijf je in voor de wachtlijst van AI Examentrainer en we laten het weten zodra er weer plek is."
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
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-7">
              <button onClick={() => scrollTo('features')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Hoe het werkt</button>
              <button onClick={() => scrollTo('vakken')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Vakken</button>
              <button onClick={() => scrollTo('pricing')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Prijzen</button>
              <button onClick={() => scrollTo('faq')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</button>
              <a href="/blog/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Blog</a>
            </div>
            <button
              onClick={() => navigate('/activate')}
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded transition-colors"
              style={{ backgroundColor: '#059669', color: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#047857')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#059669')}
            >
              <Ticket className="w-4 h-4" />
              Code inwisselen
            </button>
            <button
              onClick={onLogin}
              className="hidden md:block text-sm font-medium px-4 py-2 border rounded transition-colors"
              style={{ borderColor: '#1a56db', color: '#1a56db' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a56db'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1a56db'; }}
            >
              Inloggen
            </button>
            {/* Sticky CTA — zichtbaar zodra je scrollt */}
            {isNavScrolled && (
              <button
                onClick={handleJoinWaitlist}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded transition-colors"
                style={{ backgroundColor: '#1a56db' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1442b5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a56db')}
              >
                Wachtlijst
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-6 lg:px-8" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="text-reveal text-reveal-delay-1 inline-flex items-center gap-2 text-sm font-semibold mb-5 px-3 py-1.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                <Clock className="w-4 h-4" />
                Registratie tijdelijk gesloten — schrijf je in voor de wachtlijst
              </div>

              <h1
                className="text-reveal text-reveal-delay-2 font-bold text-gray-900 leading-tight mb-5"
                style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: 'clamp(2rem, 3vw + 1rem, 3rem)' }}
              >
                De AI-examenhulp die bijles vervangt — binnenkort weer beschikbaar
              </h1>

              <p className="text-reveal text-reveal-delay-3 text-gray-600 leading-relaxed mb-6" style={{ fontSize: '1.1rem' }}>
                Vanwege grote drukte nemen we tijdelijk geen nieuwe aanmeldingen aan. Laat je e-mailadres
                achter op de wachtlijst en we laten het direct weten zodra er weer plek is. Bestaande gebruikers
                kunnen gewoon blijven oefenen.
              </p>

              <div className="text-reveal text-reveal-delay-4 flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={handleJoinWaitlist}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-white font-semibold rounded transition-colors text-base"
                  style={{ backgroundColor: '#1a56db' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1442b5')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a56db')}
                >
                  Zet me op de wachtlijst
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogin}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-medium rounded border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Ik heb al een account
                </button>
              </div>

              {/* Trust row */}
              <div className="text-reveal text-reveal-delay-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" style={{ color: '#1a56db' }} />
                  Geen verplichting
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: '#1a56db' }} />
                  Alleen e-mail nodig
                </span>
                <span className="flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4" style={{ color: '#1a56db' }} />
                  We mailen je zodra er plek is
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
                quote: 'Lisa haalde een 4 voor biologie in haar proefexamen. Na 6 weken AI Examentrainer stond ze op een 7 voor het eindexamen. Ik had nooit gedacht dat zoiets kon voor €10 per maand.',
                name: 'Marieke de Vries',
                role: 'Moeder van Lisa, HAVO',
                result: 'Biologie: 4 → 7',
              },
              {
                quote: 'Tom twijfelde of hij VWO aankon. De AI-tutor legt stap voor stap uit waar hij de fout in gaat — geduldig, altijd beschikbaar. Zijn wiskunde ging van een 5,5 naar een 7,8.',
                name: 'Peter Janssen',
                role: 'Vader van Tom, VWO',
                result: 'Wiskunde: 5,5 → 7,8',
              },
              {
                quote: 'Bijles kost hier €45 per uur — dat konden we niet volhouden. AI Examentrainer doet hetzelfde voor €10 per maand. Youssef is iedere dag bezig en heeft zijn diploma gehaald.',
                name: 'Fatima El-Amrani',
                role: 'Moeder van Youssef, VMBO-TL',
                result: 'Geslaagd — bespaard: €400+',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-lg p-6 scroll-reveal">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{t.result}</span>
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
              Minder dan één uur bijles. Voor de hele maand.
            </h2>
            <p className="text-gray-500 mb-4">Bijles kost gemiddeld €45–60 per uur. AI Examentrainer kost €9,95 per maand — onbeperkt beschikbaar.</p>
            {daysUntilExam > 0 && (
              <div className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                <Clock className="w-4 h-4" />
                Nog {daysUntilExam} dagen — elk dag telt
              </div>
            )}
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
                onClick={handleJoinWaitlist}
                className="w-full py-3 rounded border border-gray-300 text-gray-700 font-medium text-sm transition-colors hover:bg-gray-50"
              >
                Zet me op de wachtlijst
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Registratie tijdelijk gesloten</p>
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
                onClick={handleJoinWaitlist}
                className="w-full py-3 rounded text-white font-medium text-sm transition-colors"
                style={{ backgroundColor: '#1a56db' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1442b5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a56db')}
              >
                Zet me op de wachtlijst
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Registratie tijdelijk gesloten</p>
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
                onClick={handleJoinWaitlist}
                className="w-full py-3 rounded border font-medium text-sm transition-colors hover:bg-gray-50"
                style={{ borderColor: '#0369a1', color: '#0369a1' }}
              >
                Zet me op de wachtlijst
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Registratie tijdelijk gesloten</p>
            </div>
          </div>

          {/* Geld-terug-garantie */}
          <div className="flex items-center gap-4 p-5 rounded-lg mb-6 scroll-reveal" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dcfce7' }}>
              <Shield className="w-6 h-6" style={{ color: '#166534' }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Tevreden of geld terug</p>
              <p className="text-sm text-gray-600">Probeer 5 dagen voor €2. Niet tevreden? Je krijgt je geld terug — geen vragen gesteld. Na de proefperiode kun je maandelijks opzeggen.</p>
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
              {
                question: 'Wat is het verschil met bijles?',
                answer: 'Bijles kost gemiddeld €45–60 per uur en is beschikbaar op vaste momenten. AI Examentrainer is 24/7 beschikbaar voor €9,95 per maand — ook op zondagavond voor een tentamen de volgende dag. De AI stelt vragen, geeft uitleg op maat en past het niveau automatisch aan. Geen reistijd, geen inplannen, altijd beschikbaar.',
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

      {/* ── Artikelen / Blog ── */}
      <section id="blog" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Lees onze tips & gidsen
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-sm">Praktische artikelen om jouw kind zo goed mogelijk voor te bereiden op het eindexamen.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 scroll-reveal">
            {[
              {
                href: '/blog/eindexamen-tips-2026/',
                title: '15 Bewezen Eindexamen Tips voor 2026 die Écht Werken',
                description: 'Wil je hoger scoren op je eindexamen 2026? Ontdek 15 bewezen tips van leerlingen die al geslaagd zijn. Van plannen tot oefenen — alles wat werkt.',
                tag: 'Tips',
              },
              {
                href: '/blog/hoe-oefen-je-eindexamen/',
                title: 'Hoe Oefen Je Effectief voor je Eindexamen? (Stappenplan)',
                description: 'Leer hoe je het meeste haalt uit je eindexamenvoorbereiding. Stappenplan met bewezen oefenmethodes voor VMBO, HAVO en VWO leerlingen.',
                tag: 'Stappenplan',
              },
              {
                href: '/blog/bijles-vs-ai-examentrainer/',
                title: 'Bijles of AI Examentrainer: wat is beter voor jouw eindexamen?',
                description: 'Bijles kost al snel €30–50 per uur. Maar is het beter dan AI-gestuurde examentraining? Een eerlijke vergelijking voor VMBO, HAVO en VWO leerlingen.',
                tag: 'Vergelijking',
              },
            ].map((article, i) => (
              <a
                key={i}
                href={article.href}
                className="group flex flex-col border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <span className="text-xs font-semibold uppercase tracking-wide mb-3 px-2 py-0.5 rounded self-start" style={{ backgroundColor: '#eff6ff', color: '#1a56db' }}>
                  {article.tag}
                </span>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug group-hover:text-blue-700 transition-colors" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">{article.description}</p>
                <span className="mt-4 text-sm font-medium" style={{ color: '#1a56db' }}>Lees artikel →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 lg:px-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          {/* Vak-links voor SEO + navigatie */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Vakken</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/wiskunde-eindexamen-oefenen/" className="hover:text-white transition-colors">Wiskunde</a></li>
                <li><a href="/nederlands-eindexamen-oefenen/" className="hover:text-white transition-colors">Nederlands</a></li>
                <li><a href="/engels-eindexamen-oefenen/" className="hover:text-white transition-colors">Engels</a></li>
                <li><a href="/biologie-eindexamen-oefenen/" className="hover:text-white transition-colors">Biologie</a></li>
                <li><a href="/scheikunde-eindexamen-oefenen/" className="hover:text-white transition-colors">Scheikunde</a></li>
                <li><a href="/natuurkunde-eindexamen-oefenen/" className="hover:text-white transition-colors">Natuurkunde</a></li>
                <li><a href="/geschiedenis-eindexamen-oefenen/" className="hover:text-white transition-colors">Geschiedenis</a></li>
                <li><a href="/aardrijkskunde-eindexamen-oefenen/" className="hover:text-white transition-colors">Aardrijkskunde</a></li>
                <li><a href="/economie-eindexamen-oefenen/" className="hover:text-white transition-colors">Economie</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Per niveau</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/havo-examen-oefenen/" className="hover:text-white transition-colors">HAVO examen oefenen</a></li>
                <li><a href="/vwo-examen-oefenen/" className="hover:text-white transition-colors">VWO examen oefenen</a></li>
                <li><a href="/vmbo-examen-oefenen/" className="hover:text-white transition-colors">VMBO examen oefenen</a></li>
                <li><a href="/wiskunde-havo-eindexamen-oefenen/" className="hover:text-white transition-colors">Wiskunde HAVO</a></li>
                <li><a href="/wiskunde-vwo-eindexamen-oefenen/" className="hover:text-white transition-colors">Wiskunde VWO</a></li>
                <li><a href="/biologie-havo-eindexamen-oefenen/" className="hover:text-white transition-colors">Biologie HAVO</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Vak + niveau</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/wiskunde-a-havo-oefenen/" className="hover:text-white transition-colors">Wiskunde A HAVO</a></li>
                <li><a href="/wiskunde-b-havo-oefenen/" className="hover:text-white transition-colors">Wiskunde B HAVO</a></li>
                <li><a href="/wiskunde-b-vwo-oefenen/" className="hover:text-white transition-colors">Wiskunde B VWO</a></li>
                <li><a href="/biologie-havo-oefenen/" className="hover:text-white transition-colors">Biologie HAVO</a></li>
                <li><a href="/biologie-vwo-oefenen/" className="hover:text-white transition-colors">Biologie VWO</a></li>
                <li><a href="/scheikunde-havo-oefenen/" className="hover:text-white transition-colors">Scheikunde HAVO</a></li>
                <li><a href="/economie-havo-oefenen/" className="hover:text-white transition-colors">Economie HAVO</a></li>
                <li><a href="/engels-havo-oefenen/" className="hover:text-white transition-colors">Engels HAVO</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Meer</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/blog/" className="hover:text-white transition-colors">Blog & tips</a></li>
                <li><a href="/blog/eindexamen-tips-2026/" className="hover:text-white transition-colors">Eindexamen tips 2026</a></li>
                <li><a href="/blog/hoe-oefen-je-eindexamen/" className="hover:text-white transition-colors">Hoe oefen je effectief</a></li>
                <li><a href="/blog/bijles-vs-ai-examentrainer/" className="hover:text-white transition-colors">Bijles vs AI</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/voorwaarden" className="hover:text-white transition-colors">Voorwaarden</a></li>
                <li><a href="mailto:bedrijfboot@gmail.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#1a56db' }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">AI Examentrainer</span>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} AI Examentrainer. Alle rechten voorbehouden.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
