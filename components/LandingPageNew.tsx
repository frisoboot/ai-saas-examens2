import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import './landing/animations.css';

interface LandingPageProps {
  onLogin: () => void;
  onCheckout?: () => void;
}

// Custom hook for scroll reveal animations
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .stagger-children').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
};

// Custom hook for countdown to exam date
const useCountdown = (targetDate: Date) => {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      setDaysLeft(days);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [targetDate]);

  return daysLeft;
};

// Simple styled button
const StyledButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, onClick, className = '', variant = 'primary' }) => {
  const baseStyles = variant === 'primary'
    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5'
    : 'bg-white text-slate-800 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50';

  return (
    <button
      onClick={onClick}
      className={`px-8 py-4 font-semibold rounded-2xl transition-all duration-200 ${baseStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export const LandingPageNew: React.FC<LandingPageProps> = ({ onLogin, onCheckout }) => {
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const navigate = useNavigate();

  useScrollReveal();

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartTrial = (plan?: string) => {
    navigate(`/checkout${plan ? `?plan=${plan}` : '?plan=exam_package'}`);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Countdown to exam date (11 mei 2026)
  const examDate = useMemo(() => new Date('2026-05-11'), []);
  const daysUntilExam = useCountdown(examDate);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <SEO
        title="AI Examentrainer | Oefen voor je VMBO, HAVO & VWO Eindexamen met AI"
        description="Behaal hogere cijfers met de AI Examentrainer. Oefen voor je eindexamen met AI-gegenereerde vragen, flashcards en persoonlijke begeleiding voor VMBO, HAVO en VWO."
        canonical="https://ai-examentrainer.nl/"
      />

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isNavScrolled ? 'navbar-scrolled py-3' : 'bg-transparent py-5'
        }`}
        role="navigation"
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">AI Examentrainer</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Functies</button>
              <button onClick={() => scrollToSection('pricing')} className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Prijzen</button>
              <button onClick={() => scrollToSection('faq')} className="text-slate-600 hover:text-slate-900 transition-colors font-medium">FAQ</button>
            </div>
            <button
              onClick={onLogin}
              className="px-5 py-2.5 font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all"
            >
              Inloggen
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32 px-6 lg:px-8 overflow-hidden">
        {/* Animated Mesh Gradient Background */}
        <div className="mesh-gradient">
          <div className="mesh-blob mesh-blob-1"></div>
          <div className="mesh-blob mesh-blob-2"></div>
          <div className="mesh-blob mesh-blob-3"></div>
          <div className="absolute inset-0 bg-white/60"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="text-reveal text-reveal-delay-1 inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg shadow-slate-200/50 border border-white mb-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700">AI-gestuurde examenvoorbereiding</span>
            </div>

            {/* Countdown - Urgency */}
            {daysUntilExam > 0 && (
              <div className="text-reveal text-reveal-delay-1 mb-8">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full px-6 py-3 shadow-lg shadow-orange-500/30 animate-pulse">
                  <Clock className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">
                    Nog {daysUntilExam} dagen tot de eindexamens!
                  </span>
                </div>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-reveal text-reveal-delay-2 text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8 tracking-tight">
              Slaag met<br />
              <span className="gradient-text">vertrouwen</span>
            </h1>

            {/* Subheadline */}
            <p className="text-reveal text-reveal-delay-3 text-xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto">
              Geen stress meer voor je eindexamen. Oefen onbeperkt met AI-vragen op jouw niveau,
              krijg directe feedback en weet precies waar je staat.
            </p>

            {/* CTA Buttons */}
            <div className="text-reveal text-reveal-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <StyledButton onClick={handleStartTrial} variant="primary">
                <span className="flex items-center gap-2">
                  Start nu
                  <ArrowRight className="w-5 h-5" />
                </span>
              </StyledButton>
            </div>

            {/* Trust line */}
            <p className="text-reveal text-reveal-delay-5 text-sm text-slate-500 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                Geen abonnement nodig
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>Vanaf €39 totaal</span>
            </p>
          </div>

          {/* Simple Preview */}
          <div className="mt-20 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/50 overflow-hidden border border-slate-200">
              {/* Window header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-slate-400 text-sm font-medium ml-2">AI Examentrainer</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500 text-white text-sm font-medium">
                  <Brain className="w-4 h-4" />
                  <span>Biologie · HAVO</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white">
                {/* Question */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-5 shadow-sm">
                  <p className="text-slate-800 leading-relaxed">
                    Leg uit waarom kinderen van twee ouders met bruine ogen toch blauwe ogen kunnen hebben.
                  </p>
                </div>

                {/* Student answer */}
                <div className="flex justify-end mb-5">
                  <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-br-sm px-5 py-4">
                    <p className="text-slate-600 text-sm mb-1 font-medium">Jouw antwoord</p>
                    <p className="text-slate-800">Blauwe ogen zijn dominant over bruine ogen...</p>
                  </div>
                </div>

                {/* AI Feedback */}
                <div className="flex justify-start">
                  <div className="max-w-[90%]">
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl rounded-bl-sm px-5 py-4 border border-orange-200">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-orange-800 mb-2">Bijna! Maar let op de dominantie.</p>
                          <p className="text-orange-700 text-sm leading-relaxed">
                            Je hebt het net andersom: <strong>bruin is dominant</strong> en <strong>blauw is recessief</strong>.
                            Als beide ouders Bb zijn, is er 25% kans op blauwe ogen (bb).
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


      {/* Social Proof + Features */}
      <section id="features" className="py-20 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 text-center mb-16">
            {[
              { value: '2.500+', label: 'Leerlingen actief', icon: Users },
              { value: '150.000+', label: 'Vragen geoefend', icon: BookOpen },
              { value: '16', label: 'Examenvakken', icon: Target },
              { value: '4,7/5', label: 'Gemiddelde beoordeling', icon: Award }
            ].map((stat) => (
              <div key={stat.label} className="scroll-reveal">
                <stat.icon className="w-5 h-5 text-orange-500 mx-auto mb-1.5" />
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-0.5">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {[
              {
                icon: Brain,
                title: 'AI Oefenvragen',
                description: 'Onbeperkt nieuwe vragen op jouw niveau.',
                gradient: 'from-orange-500 to-amber-500',
                shadowColor: 'shadow-orange-500/20'
              },
              {
                icon: MessageSquare,
                title: 'Persoonlijke Tutor',
                description: 'Stel vragen en krijg uitleg in begrijpelijke taal.',
                gradient: 'from-indigo-500 to-purple-600',
                shadowColor: 'shadow-indigo-500/20'
              },
              {
                icon: Target,
                title: 'Echte Examens',
                description: 'Oefen met officiële CITO-examens.',
                gradient: 'from-emerald-500 to-teal-600',
                shadowColor: 'shadow-emerald-500/20'
              },
              {
                icon: Zap,
                title: 'Slimme Flashcards',
                description: 'Leer begrippen snel met AI-flashcards.',
                gradient: 'from-pink-500 to-rose-600',
                shadowColor: 'shadow-pink-500/20'
              },
              {
                icon: TrendingUp,
                title: 'Voortgang Inzicht',
                description: 'Zie precies waar je staat per vak.',
                gradient: 'from-cyan-500 to-blue-600',
                shadowColor: 'shadow-cyan-500/20'
              },
              {
                icon: Clock,
                title: 'Tijdsoefeningen',
                description: 'Train je snelheid onder tijdsdruk.',
                gradient: 'from-amber-500 to-orange-600',
                shadowColor: 'shadow-amber-500/20'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="feature-card bg-white rounded-2xl p-6 border border-slate-100 scroll-reveal"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg ${feature.shadowColor}`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1.5">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 scroll-reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Wat leerlingen zeggen
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 stagger-children">
            {[
              {
                quote: 'Na 2 weken oefenen ging mijn cijfer van een 5 naar een 7. De AI legt het zo uit dat ik het echt snap.',
                name: 'Sophie V.',
                level: 'HAVO',
                subject: 'Wiskunde A',
                gradient: 'from-orange-500 to-amber-500'
              },
              {
                quote: 'Veel beter dan samenvatten uit je boek. Je krijgt meteen feedback en weet precies wat je fout deed.',
                name: 'Daan M.',
                level: 'VWO',
                subject: 'Biologie',
                gradient: 'from-indigo-500 to-purple-500'
              },
              {
                quote: 'De flashcards zijn top voor scheikunde. Ik gebruik het elke dag in de trein en onthoud veel meer.',
                name: 'Fatima B.',
                level: 'HAVO',
                subject: 'Scheikunde',
                gradient: 'from-emerald-500 to-teal-500'
              }
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-slate-50 rounded-2xl p-5 border border-slate-100 scroll-reveal"
              >
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}>
                    <span className="text-white font-bold text-xs">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">{testimonial.name}</p>
                    <p className="text-slate-500 text-[11px]">{testimonial.level} · {testimonial.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-6">
              Prijzen
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Eenvoudig en transparant
            </h2>
            <p className="text-xl text-slate-600">
              Geen verborgen kosten. Kies het pakket dat bij je past.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {/* Maandelijks */}
            <div className="scroll-reveal">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Maandelijks</h3>
                  <p className="text-slate-500 text-sm">Flexibel en opzegbaar</p>
                </div>

                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-900">€14,95</span>
                  <span className="text-slate-500 ml-1">/ maand</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 rounded-full text-xs font-medium text-blue-700">
                    Maandelijks opzegbaar
                  </span>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {[
                    'Onbeperkt AI-oefenvragen',
                    'Alle 16 vakken',
                    'Persoonlijke AI-tutor',
                    'Flashcards & echte examens',
                    'Maandelijks opzegbaar'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-slate-600" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <StyledButton onClick={() => handleStartTrial('monthly')} variant="secondary" className="w-full justify-center">
                  Kies maandelijks
                </StyledButton>
              </div>
            </div>

            {/* Examenpakket - Highlighted */}
            <div className="scroll-reveal relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] blur opacity-30"></div>
              <div className="relative bg-white rounded-3xl p-8 border border-orange-100 shine-effect h-full flex flex-col">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  POPULAIR
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Examenpakket</h3>
                  <p className="text-slate-500 text-sm">4 maanden toegang</p>
                </div>

                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-900">€39</span>
                  <span className="text-slate-500 ml-1">totaal</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 rounded-full text-xs font-medium text-emerald-700">
                    = €9,75 per maand
                  </span>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {[
                    'Onbeperkt AI-oefenvragen',
                    'Alle 16 vakken',
                    'Persoonlijke AI-tutor',
                    'Flashcards & echte examens',
                    'Geen abonnement nodig'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <StyledButton onClick={() => handleStartTrial('exam_package')} className="w-full justify-center">
                  Koop examenpakket
                </StyledButton>
              </div>
            </div>

            {/* Jaarpakket */}
            <div className="scroll-reveal relative">
              <div className="bg-white rounded-3xl p-8 border border-emerald-200 h-full flex flex-col">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  BESTE DEAL
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Jaarpakket</h3>
                  <p className="text-slate-500 text-sm">12 maanden toegang</p>
                </div>

                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-900">€99</span>
                  <span className="text-slate-500 ml-1">totaal</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 rounded-full text-xs font-medium text-emerald-700">
                    = €8,25 per maand
                  </span>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {[
                    'Onbeperkt AI-oefenvragen',
                    'Alle 16 vakken',
                    'Persoonlijke AI-tutor',
                    'Flashcards & echte examens',
                    'Geen abonnement nodig'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <StyledButton onClick={() => handleStartTrial('yearly')} variant="secondary" className="w-full justify-center border-emerald-300 hover:border-emerald-400">
                  Koop jaarpakket
                </StyledButton>
              </div>
            </div>
          </div>

          {/* Schoollicentie */}
          <div className="max-w-2xl mx-auto scroll-reveal">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-grow text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Schoollicentie</h3>
                <p className="text-slate-500 text-sm">
                  Voor scholen en docenten — prijs op maat, onbeperkt leerlingen, voortgangsrapportages.
                </p>
              </div>
              <StyledButton
                onClick={() => window.location.href = 'mailto:info@ai-examentrainer.nl'}
                variant="secondary"
                className="flex-shrink-0 whitespace-nowrap"
              >
                Neem contact op
              </StyledButton>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-6">
              FAQ
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Veelgestelde vragen
            </h2>
          </div>

          <div className="space-y-4 scroll-reveal">
            {[
              {
                question: 'Voor welke vakken kan ik oefenen?',
                answer: 'Je kunt oefenen voor 16 vakken, waaronder Wiskunde A/B/C, Nederlands, Engels, Duits, Frans, Biologie, Scheikunde, Natuurkunde, Geschiedenis, Aardrijkskunde, Economie en meer.'
              },
              {
                question: 'Wat is het verschil tussen de pakketten?',
                answer: 'Het maandelijks abonnement (€14,95/maand) is flexibel en maandelijks opzegbaar. Het examenpakket (€39 totaal) geeft je 4 maanden volledige toegang — perfect voor de examenperiode. Het jaarpakket (€99 totaal) geeft je 12 maanden toegang, ideaal als je vroeg wilt beginnen. Alle pakketten geven toegang tot dezelfde functies.'
              },
              {
                question: 'Kan ik maandelijks opzeggen?',
                answer: 'Het maandelijks abonnement kun je op elk moment opzeggen, zonder opzegkosten. Het examenpakket en jaarpakket zijn vaste bedragen — die hoef je niet op te zeggen. De toegang loopt automatisch af na respectievelijk 4 of 12 maanden.'
              },
              {
                question: 'Werkt het op mijn telefoon?',
                answer: 'Ja, AI Examentrainer werkt perfect op alle apparaten: laptop, tablet en smartphone. Je kunt overal oefenen waar je internet hebt.'
              }
            ].map((faq, index) => (
              <details key={index} className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-100 transition-colors">
                  <h3 className="font-semibold text-lg text-slate-900 pr-4">{faq.question}</h3>
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 group-open:bg-orange-500 transition-colors">
                    <ChevronDown className="w-5 h-5 text-slate-600 group-open:text-white group-open:rotate-180 transition-all" />
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 lg:px-8 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">AI Examentrainer</span>
            </div>

            <div className="flex items-center gap-8 text-slate-400">
              <a href="mailto:info@ai-examentrainer.nl" className="hover:text-white transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/voorwaarden" className="hover:text-white transition-colors">Voorwaarden</a>
            </div>

            <p className="text-slate-500">
              © {new Date().getFullYear()} AI Examentrainer
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
