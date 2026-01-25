import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SEO } from './SEO';
import {
  GraduationCap,
  Brain,
  Zap,
  Target,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  ChevronDown,
  Star,
  Play,
  Shield,
  Award,
  ArrowRight,
  Check,
  X,
  Heart,
  BarChart3,
  Wallet,
  Smile
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

// Custom hook for animated counter
const useAnimatedCounter = (end: number, duration: number = 2000, startOnView: boolean = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
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

// Custom hook for simulated online users (Bandwagon Effect)
const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    // Generate random number between 80-150
    const generateCount = () => Math.floor(Math.random() * (150 - 80 + 1)) + 80;
    setOnlineUsers(generateCount());

    // Update every 30 seconds with small variation
    const interval = setInterval(() => {
      setOnlineUsers((prev) => {
        const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newValue = prev + change;
        return Math.max(80, Math.min(150, newValue));
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return onlineUsers;
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

  useScrollReveal();

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Animated counters
  const studentsCounter = useAnimatedCounter(2500);
  const schoolsCounter = useAnimatedCounter(50);
  const subjectsCounter = useAnimatedCounter(16);
  const ratingCounter = useAnimatedCounter(48);

  // Countdown to exam date (12 mei 2025)
  const examDate = useMemo(() => new Date('2025-05-12'), []);
  const daysUntilExam = useCountdown(examDate);

  // Simulated online users
  const onlineUsers = useOnlineUsers();

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
              Leer slim,<br />
              <span className="gradient-text">scoor hoog</span>
            </h1>

            {/* Subheadline */}
            <p className="text-reveal text-reveal-delay-3 text-xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto">
              De slimste manier om je voor te bereiden op je eindexamen.
              Persoonlijke AI-feedback, onbeperkt oefenen, en precies weten waar je staat.
            </p>

            {/* CTA Buttons */}
            <div className="text-reveal text-reveal-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <StyledButton onClick={handleStartTrial} variant="primary">
                <span className="flex items-center gap-2">
                  Start gratis
                  <ArrowRight className="w-5 h-5" />
                </span>
              </StyledButton>
              <StyledButton onClick={() => scrollToSection('demo')} variant="secondary">
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Bekijk demo
                </span>
              </StyledButton>
            </div>

            {/* Trust line */}
            <p className="text-reveal text-reveal-delay-5 text-sm text-slate-500 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                Geen creditcard nodig
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>3 dagen gratis</span>
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

      {/* Social Proof / Stats */}
      <section className="py-20 px-6 lg:px-8 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
            {[
              { value: studentsCounter.count, suffix: '+', label: 'Leerlingen', ref: studentsCounter.ref },
              { value: schoolsCounter.count, suffix: '+', label: 'Scholen', ref: schoolsCounter.ref },
              { value: subjectsCounter.count, suffix: '', label: 'Vakken', ref: subjectsCounter.ref },
              { value: (ratingCounter.count / 10).toFixed(1), suffix: '', label: 'Beoordeling', ref: ratingCounter.ref, icon: Star }
            ].map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <span ref={stat.ref} className="counter-value">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString('nl-NL') : stat.value}
                  </span>
                  {stat.suffix}
                  {stat.icon && <stat.icon className="w-7 h-7 text-amber-400 fill-amber-400" />}
                </div>
                <div className="text-slate-400 font-medium">{stat.label}</div>
              </div>
            ))}
            {/* Live online indicator - Bandwagon Effect */}
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>{onlineUsers}</span>
              </div>
              <div className="text-slate-400 font-medium">Nu online</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-6 lg:px-8 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {[
              { icon: Shield, text: 'AVG Compliant', color: 'emerald' },
              { icon: Award, text: 'CITO Examenstijl', color: 'indigo' },
              { icon: Clock, text: '24/7 Beschikbaar', color: 'orange' }
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${badge.color}-100 rounded-xl flex items-center justify-center`}>
                  <badge.icon className={`w-5 h-5 text-${badge.color}-600`} />
                </div>
                <span className="font-semibold text-slate-700">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6 lg:px-8 bg-slate-50 dot-pattern">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-6">
              Functies
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Alles om te slagen
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Van slimme oefenvragen tot persoonlijke begeleiding — wij hebben alles wat je nodig hebt.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
            {[
              {
                icon: Brain,
                title: 'AI Oefenvragen',
                description: 'Onbeperkt nieuwe vragen die zich aanpassen aan jouw niveau en leerstijl.',
                gradient: 'from-orange-500 to-amber-500',
                shadowColor: 'shadow-orange-500/20'
              },
              {
                icon: MessageSquare,
                title: 'Persoonlijke Tutor',
                description: 'Stel vragen en krijg uitleg in begrijpelijke taal, wanneer je maar wilt.',
                gradient: 'from-indigo-500 to-purple-600',
                shadowColor: 'shadow-indigo-500/20'
              },
              {
                icon: Target,
                title: 'Echte Examens',
                description: 'Oefen met officiële examens van voorgaande jaren van CITO.',
                gradient: 'from-emerald-500 to-teal-600',
                shadowColor: 'shadow-emerald-500/20'
              },
              {
                icon: Zap,
                title: 'Slimme Flashcards',
                description: 'Leer begrippen en definities snel met AI-gegenereerde flashcards.',
                gradient: 'from-pink-500 to-rose-600',
                shadowColor: 'shadow-pink-500/20'
              },
              {
                icon: TrendingUp,
                title: 'Voortgang Inzicht',
                description: 'Zie precies waar je staat en welke onderwerpen extra aandacht nodig hebben.',
                gradient: 'from-cyan-500 to-blue-600',
                shadowColor: 'shadow-cyan-500/20'
              },
              {
                icon: Clock,
                title: 'Tijdsoefeningen',
                description: 'Train je snelheid en ervaar hoe het is om onder tijdsdruk te werken.',
                gradient: 'from-amber-500 to-orange-600',
                shadowColor: 'shadow-amber-500/20'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="feature-card bg-white rounded-3xl p-8 border border-slate-100 scroll-reveal"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg ${feature.shadowColor}`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section - For Parents */}
      <section className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-6">
              Waarom AI Examentrainer?
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Effectiever dan traditioneel
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Ontdek het verschil tussen traditioneel studeren en leren met AI.
            </p>
          </div>

          <div className="scroll-reveal">
            <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
              <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200">
                <div className="p-6"></div>
                <div className="p-6 text-center border-x border-slate-200">
                  <span className="text-slate-500 font-medium">Traditioneel</span>
                </div>
                <div className="p-6 text-center bg-gradient-to-r from-orange-500 to-amber-500">
                  <span className="text-white font-bold">AI Examentrainer</span>
                </div>
              </div>

              {[
                { feature: 'Directe feedback', traditional: false, ai: true },
                { feature: '24/7 beschikbaar', traditional: false, ai: true },
                { feature: 'Persoonlijke uitleg', traditional: false, ai: true },
                { feature: 'Onbeperkt oefenen', traditional: false, ai: true },
                { feature: 'Voortgang bijhouden', traditional: false, ai: true },
                { feature: 'Aanpassen aan niveau', traditional: false, ai: true }
              ].map((row, index) => (
                <div key={row.feature} className={`grid grid-cols-3 ${index !== 5 ? 'border-b border-slate-200' : ''}`}>
                  <div className="p-5 font-medium text-slate-700">{row.feature}</div>
                  <div className="p-5 flex items-center justify-center border-x border-slate-200">
                    {row.traditional ? (
                      <Check className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <X className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="p-5 flex items-center justify-center bg-orange-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-md shadow-orange-500/30">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
              Hoe het werkt
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Begin in 3 stappen
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Binnen een minuut klaar om te oefenen voor je examen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: '01',
                title: 'Maak een account',
                description: 'Meld je aan met je e-mail en kies je niveau en vakken.',
                icon: Users
              },
              {
                step: '02',
                title: 'Start met oefenen',
                description: 'Kies een vak en begin direct met AI-gegenereerde oefenvragen.',
                icon: BookOpen
              },
              {
                step: '03',
                title: 'Verbeter jezelf',
                description: 'Krijg feedback, bekijk je voortgang en werk aan je zwakke punten.',
                icon: TrendingUp
              }
            ].map((item, index) => (
              <div key={item.step} className="scroll-reveal text-center md:text-left">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 mb-8 shadow-xl shadow-orange-500/30 float">
                  <span className="text-3xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-6">
              Ervaringen
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Wat leerlingen zeggen
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
            {[
              {
                name: 'Sophie de Vries',
                school: 'HAVO 5 · Amsterdam',
                text: 'Mijn cijfer voor wiskunde ging van een 5 naar een 7,5. De uitleg bij de vragen is echt super duidelijk en persoonlijk!',
                avatar: 'S',
                gradient: 'from-pink-500 to-rose-500'
              },
              {
                name: 'Tim Bakker',
                school: 'VWO 6 · Utrecht',
                text: 'Ik gebruik het voor 4 vakken tegelijk. Fijn dat alles op één plek staat en de AI echt snapt waar ik moeite mee heb.',
                avatar: 'T',
                gradient: 'from-indigo-500 to-purple-500'
              },
              {
                name: 'Emma Jansen',
                school: 'VMBO-TL 4 · Rotterdam',
                text: 'De flashcards zijn perfect voor het leren van begrippen. Ik kan nu overal oefenen, zelfs in de trein!',
                avatar: 'E',
                gradient: 'from-emerald-500 to-teal-500'
              },
              {
                name: 'Marieke van Dijk',
                school: 'Moeder van HAVO-leerling',
                text: 'Eindelijk minder stress thuis rond de examens. Mijn dochter oefent zelfstandig en ik zie duidelijke verbetering in haar cijfers.',
                avatar: 'M',
                gradient: 'from-amber-500 to-orange-500'
              },
              {
                name: 'Dhr. de Jong',
                school: 'Wiskundedocent · Den Haag',
                text: 'Bespaart mij enorm veel tijd. Leerlingen komen beter voorbereid naar de les en de resultaten van mijn klas zijn zichtbaar verbeterd.',
                avatar: 'J',
                gradient: 'from-cyan-500 to-blue-500'
              }
            ].map((testimonial, index) => (
              <div key={index} className="glass-card rounded-3xl p-8 scroll-reveal hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-lg mb-8 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${testimonial.gradient} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{testimonial.name}</p>
                    <p className="text-slate-500">{testimonial.school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voor Ouders Section */}
      <section className="py-32 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-6">
              Voor Ouders
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Investeer in het succes van je kind
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              AI Examentrainer helpt niet alleen leerlingen, maar geeft ouders ook rust en overzicht.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 stagger-children">
            {[
              {
                icon: BarChart3,
                title: 'Voortgangsrapport',
                description: 'Zie precies wat je kind leert en waar ze aan werken. Volg de ontwikkeling zonder over de schouder mee te hoeven kijken.',
                gradient: 'from-indigo-500 to-purple-500',
                shadowColor: 'shadow-indigo-500/20'
              },
              {
                icon: Wallet,
                title: 'Goedkoper dan bijles',
                description: 'Voor minder dan €0,50 per dag krijgt je kind onbeperkt toegang. Eén uurtje bijles kost al snel €30-50.',
                gradient: 'from-emerald-500 to-teal-500',
                shadowColor: 'shadow-emerald-500/20'
              },
              {
                icon: Smile,
                title: 'Minder stress',
                description: 'Je kind oefent zelfstandig op eigen tempo. Geen gedoe meer over huiswerk of discussies over leren.',
                gradient: 'from-amber-500 to-orange-500',
                shadowColor: 'shadow-amber-500/20'
              }
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-3xl p-8 border border-slate-100 scroll-reveal hover:shadow-lg transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-6 shadow-lg ${benefit.shadowColor}`}>
                  <benefit.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-3">{benefit.title}</h3>
                <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 scroll-reveal">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-6">
              Prijzen
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Eenvoudig en transparant
            </h2>
            <p className="text-xl text-slate-600">
              Geen verborgen kosten. Maandelijks opzegbaar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Individual */}
            <div className="scroll-reveal-left scroll-reveal relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] blur opacity-30"></div>
              <div className="relative bg-white rounded-3xl p-10 border border-orange-100 shine-effect h-full">
                <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAIR
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Individueel</h3>
                  <p className="text-slate-500">Perfect voor leerlingen</p>
                </div>

                <div className="mb-4">
                  <span className="text-5xl font-bold text-slate-900">€12,50</span>
                  <span className="text-slate-500 ml-2">/ maand</span>
                </div>

                {/* Mental Accounting - Price Framing */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                    = €0,42 per dag
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 rounded-full text-sm font-medium text-emerald-700">
                    Goedkoper dan 1 uur bijles
                  </span>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl px-5 py-4 mb-8 border border-orange-100">
                  <p className="text-orange-700 font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Eerste 3 dagen gratis!
                  </p>
                </div>

                <ul className="space-y-4 mb-10">
                  {[
                    'Onbeperkt AI-oefenvragen',
                    'Alle 16 vakken',
                    'Persoonlijke AI-tutor',
                    'Flashcards & echte examens',
                    'Voortgang bijhouden'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <StyledButton onClick={handleStartTrial} className="w-full justify-center">
                  Start gratis proefperiode
                </StyledButton>
              </div>
            </div>

            {/* School */}
            <div className="scroll-reveal-right scroll-reveal">
              <div className="bg-white rounded-3xl p-10 border border-slate-200 h-full flex flex-col">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Schoollicentie</h3>
                  <p className="text-slate-500">Voor scholen en docenten</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold text-slate-900">Op maat</span>
                </div>

                <div className="bg-slate-50 rounded-xl px-5 py-4 mb-8 border border-slate-100">
                  <p className="text-slate-600">
                    Prijs afhankelijk van aantal leerlingen
                  </p>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {[
                    'Alles van Individueel',
                    'Onbeperkt leerlingen',
                    'Voortgangsrapportages',
                    'Eigen vragen toevoegen',
                    'Prioriteit support'
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <StyledButton
                  onClick={() => window.location.href = 'mailto:info@ai-examentrainer.nl'}
                  variant="secondary"
                  className="w-full justify-center"
                >
                  Neem contact op
                </StyledButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
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
                question: 'Hoe werkt de gratis proefperiode?',
                answer: 'Je krijgt 3 dagen volledige toegang tot alle functies. Je hoeft geen betaalgegevens in te vullen. Na de proefperiode kun je kiezen om door te gaan met een abonnement.'
              },
              {
                question: 'Kan ik maandelijks opzeggen?',
                answer: 'Ja, je kunt je abonnement op elk moment opzeggen. Er zijn geen langetermijnverplichtingen of opzegkosten.'
              },
              {
                question: 'Werkt het op mijn telefoon?',
                answer: 'Ja, AI Examentrainer werkt perfect op alle apparaten: laptop, tablet en smartphone. Je kunt overal oefenen waar je internet hebt.'
              },
              {
                question: 'Hoe betrouwbaar zijn de AI-vragen?',
                answer: 'Onze AI is getraind op duizenden echte examenvragen en volgt de exameneisen van het CITO. De vragen zijn qua stijl, moeilijkheid en format vergelijkbaar met echte eindexamens.'
              },
              {
                question: 'Is dit hetzelfde als ChatGPT?',
                answer: 'Nee, AI Examentrainer is specifiek ontwikkeld voor Nederlandse eindexamens. Onze AI genereert vragen in CITO-stijl, kent de exameneisen per vak en niveau, en geeft feedback die aansluit bij hoe examens worden beoordeeld. ChatGPT is een algemene chatbot zonder deze specialisatie.'
              },
              {
                question: 'Wat als mijn kind het niet gebruikt?',
                answer: 'We sturen automatisch herinneringen om te blijven oefenen. Als ouder kun je de voortgang volgen en zien wanneer je kind voor het laatst heeft geoefend. Zo kun je tijdig bijsturen als het even niet lekker loopt.'
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
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Voorwaarden</a>
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
