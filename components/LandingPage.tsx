import { ArrowRight, CheckCircle2, Brain, Target, Zap, GraduationCap } from 'lucide-react';

interface LandingPageProps {
  onAdminLogin: () => void;
  onStudentLogin: () => void;
  onRegister?: () => void;
}

export function LandingPage({ onAdminLogin, onStudentLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg shadow-gray-900/20 border border-gray-700">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Examentrainer.nl</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-8">
              <button
                onClick={onStudentLogin}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Inloggen
              </button>
              <button
                onClick={onRegister || (() => window.location.href = '/register')}
                className="hidden sm:flex px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Start gratis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background - same as other sections */}
        <div className="absolute inset-0 bg-blue-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-white to-transparent rounded-[100%] blur-3xl opacity-60"></div>

        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-8 tracking-tight leading-[1.1]">
            Haal hogere cijfers met <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Persoonlijke AI Coaching
            </span>
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Oefen met onbeperkte examenvragen voor VMBO, HAVO en VWO. Krijg direct feedback die je echt begrijpt, 24/7 beschikbaar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onRegister || (() => window.location.href = '/register')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              Start Gratis Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onStudentLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
            >
              Inloggen
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Direct resultaat</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Conform examenprogramma</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Opzeggen wanneer je wilt</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative overflow-hidden">
        {/* Background - same as pricing section */}
        <div className="absolute inset-0 bg-blue-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-white to-transparent rounded-[100%] blur-3xl opacity-60"></div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Hoe het werkt</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              In drie simpele stappen naar betere resultaten.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8 text-blue-600" />,
                title: "1. Kies je vak",
                desc: "Selecteer vak, niveau en specifiek onderwerp waar je mee wilt oefenen.",
                color: "bg-blue-50"
              },
              {
                icon: <Brain className="w-8 h-8 text-indigo-600" />,
                title: "2. Oefen slim",
                desc: "Maak vragen die speciaal voor jou zijn gegenereerd op basis van je niveau.",
                color: "bg-indigo-50"
              },
              {
                icon: <Zap className="w-8 h-8 text-purple-600" />,
                title: "3. Direct Feedback",
                desc: "Krijg uitleg alsof er een docent naast je zit. Leer direct van je fouten.",
                color: "bg-purple-50"
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Pricing CTA */}
      <section className="py-24 relative overflow-hidden">
        {/* Background - using lighter theme consistent with top section but slightly different to distinguish */}
        <div className="absolute inset-0 bg-blue-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-white to-transparent rounded-[100%] blur-3xl opacity-60"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 tracking-tight">
            Investeer in je toekomst
          </h2>
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Voor de prijs van een pizza heb je een maand lang onbeperkt toegang tot je eigen AI-privécoach.
          </p>

          <div className="bg-white rounded-[2rem] p-8 sm:p-12 max-w-lg mx-auto shadow-xl border border-blue-100/50 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex justify-center items-baseline gap-1 mb-2">
              <span className="text-5xl font-extrabold text-gray-900 tracking-tight">€12,50</span>
            </div>
            <div className="text-lg text-gray-400 font-medium mb-8">per maand</div>
            
            <div className="space-y-4 mb-8 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">Eerste 7 dagen gratis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">Onbeperkt oefenen</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">Direct opzegbaar</span>
              </div>
            </div>

            <button
              onClick={onRegister || (() => window.location.href = '/register')}
              className="w-full px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Start nu gratis
            </button>
            <p className="text-xs text-gray-400 mt-4">Geen creditcard nodig voor aanmelding</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Examentrainer.nl</span>
          </div>
          
          <div className="flex gap-8 text-sm text-gray-500">
            <button onClick={onAdminLogin} className="hover:text-gray-900 transition-colors">Docenten</button>
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Voorwaarden</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
