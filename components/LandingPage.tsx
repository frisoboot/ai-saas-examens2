import { BookOpen, Brain, Target, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from './Button';

interface LandingPageProps {
  onAdminLogin: () => void;
  onStudentLogin: () => void;
  onRegister?: () => void;
}

export function LandingPage({ onAdminLogin, onStudentLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
              <Brain className="w-16 h-16 text-white" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI Examentrainer
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Oefen slim met AI-powered feedback voor VMBO, HAVO en VWO examens
          </p>

          <div className="flex flex-col items-center gap-6 mb-12">
            {/* Primary CTA - Registration */}
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={onRegister || (() => window.location.href = '/register')}
                variant="primary"
                className="text-lg px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 transform hover:scale-105 transition-all duration-200"
              >
                Start Gratis Trial (7 dagen)
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-gray-500">
                Daarna €12,50/maand · Opzeggen wanneer je wilt · Betaal met iDEAL
              </p>
            </div>

            {/* Secondary Links */}
            <div className="flex flex-col sm:flex-row gap-4 items-center text-sm">
              <button
                onClick={onStudentLogin}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors underline"
              >
                Al een account? Inloggen
              </button>
              <span className="hidden sm:inline text-gray-300">|</span>
              <button
                onClick={onAdminLogin}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                Docent? Admin login
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-blue-600" />}
            title="AI-Powered Feedback"
            description="Krijg directe, slimme feedback op je antwoorden met Google Gemini AI"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8 text-purple-600" />}
            title="Meerdere Niveaus"
            description="Oefenvragen voor VMBO-TL, HAVO en VWO aangepast op jouw niveau"
          />
          <FeatureCard
            icon={<Target className="w-8 h-8 text-green-600" />}
            title="Adaptief Leren"
            description="Focus op jouw struggle points en verbeter waar het nodig is"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-orange-600" />}
            title="Progress Tracking"
            description="Volg je voortgang en zie hoe je groeit per onderwerp"
          />
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Hoe het werkt
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Start Gratis Trial"
              description="Registreer je account en betaal veilig met iDEAL. Gratis voor 7 dagen!"
            />
            <StepCard
              number="2"
              title="Kies een Examen"
              description="Selecteer het vak en onderwerp waar je mee wilt oefenen op jouw niveau"
            />
            <StepCard
              number="3"
              title="Oefen en Leer"
              description="Maak vragen en krijg direct AI-feedback om je examencijfers te verbeteren"
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Waarom AI Examentrainer?
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <BenefitItem text="Oefen wanneer en waar je maar wilt" />
            <BenefitItem text="Direct feedback op al je antwoorden" />
            <BenefitItem text="Vraag generatie op maat met AI" />
            <BenefitItem text="Bijhouden van je voortgang per vak" />
            <BenefitItem text="Zowel meerkeuze als open vragen" />
            <BenefitItem text="Focus op jouw persoonlijke leerdoelen" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Log in en start direct met oefenen voor je examens
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onStudentLogin}
              variant="primary"
              className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700"
            >
              Start met Oefenen
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 AI Examentrainer - Gebouwd met React, Supabase en Google Gemini AI
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Made with ❤️ by Friso Boot
          </p>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Step Card Component
interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Benefit Item Component
interface BenefitItemProps {
  text: string;
}

function BenefitItem({ text }: BenefitItemProps) {
  return (
    <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </div>
  );
}
