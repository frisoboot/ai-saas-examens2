import React from 'react';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { SEO } from '../SEO';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO
        title="Privacybeleid | AI Examentrainer"
        description="Lees hoe AI Examentrainer omgaat met je persoonsgegevens. Wij respecteren je privacy en verwerken gegevens conform de AVG."
        canonical="https://ai-examentrainer.nl/privacy"
      />

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">AI Examentrainer</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacybeleid</h1>
        <p className="text-slate-500 mb-8">Laatst bijgewerkt: 3 februari 2025</p>

        {/* Table of Contents */}
        <nav className="bg-white rounded-xl border border-slate-200 p-6 mb-10">
          <h2 className="font-semibold text-slate-900 mb-3">Inhoudsopgave</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-indigo-600">
            <li><a href="#introductie" className="hover:underline">Introductie</a></li>
            <li><a href="#gegevens" className="hover:underline">Welke gegevens verzamelen wij</a></li>
            <li><a href="#grondslag" className="hover:underline">Grondslag voor verwerking</a></li>
            <li><a href="#doel" className="hover:underline">Waarvoor gebruiken wij je gegevens</a></li>
            <li><a href="#ai" className="hover:underline">AI-verwerking</a></li>
            <li><a href="#cookies" className="hover:underline">Cookies en tracking</a></li>
            <li><a href="#betalingen" className="hover:underline">Betalingen en Mollie</a></li>
            <li><a href="#bewaartermijnen" className="hover:underline">Bewaartermijnen</a></li>
            <li><a href="#derden" className="hover:underline">Delen met derden</a></li>
            <li><a href="#beveiliging" className="hover:underline">Beveiliging</a></li>
            <li><a href="#rechten" className="hover:underline">Jouw rechten (AVG)</a></li>
            <li><a href="#minderjarigen" className="hover:underline">Minderjarigen</a></li>
            <li><a href="#wijzigingen" className="hover:underline">Wijzigingen</a></li>
            <li><a href="#contact" className="hover:underline">Contact</a></li>
          </ol>
        </nav>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* 1. Introductie */}
          <section id="introductie">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introductie</h2>
            <p className="text-slate-700 leading-relaxed">
              AI Examentrainer (<a href="https://ai-examentrainer.nl" className="text-indigo-600 hover:underline">ai-examentrainer.nl</a>) is een online
              platform waarmee scholieren zich voorbereiden op hun VMBO-TL, HAVO en VWO eindexamen.
              Wij hechten veel waarde aan de bescherming van jouw persoonsgegevens en verwerken deze
              in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG).
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              In dit privacybeleid leggen wij uit welke gegevens wij verzamelen, waarom wij dat doen,
              hoe wij deze beschermen en welke rechten jij hebt.
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              <strong>Contactgegevens verwerkingsverantwoordelijke:</strong><br />
              AI Examentrainer<br />
              E-mail: <a href="mailto:info@ai-examentrainer.nl" className="text-indigo-600 hover:underline">info@ai-examentrainer.nl</a>
            </p>
          </section>

          {/* 2. Welke gegevens */}
          <section id="gegevens">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Welke gegevens verzamelen wij</h2>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">Accountgegevens</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>Naam</li>
              <li>E-mailadres</li>
              <li>Wachtwoord (versleuteld opgeslagen)</li>
              <li>Schoolniveau (VMBO-TL, HAVO of VWO)</li>
              <li>Gekozen vakken</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">Studiegegevens</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>Examenresultaten en scores</li>
              <li>Voortgang per vak</li>
              <li>Antwoorden op oefenvragen</li>
              <li>Chatberichten met de AI-tutor</li>
              <li>Flashcard-sessies</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">Betalingsgegevens</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>Betalingstransacties (via Mollie, wij slaan geen creditcard- of bankrekeningnummers op)</li>
              <li>Abonnementsstatus en -historie</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">Technische gegevens</h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>IP-adres (voor beveiliging en rate limiting)</li>
              <li>Browsertype en -versie</li>
              <li>Tijdstip van bezoek</li>
            </ul>
          </section>

          {/* 3. Grondslag */}
          <section id="grondslag">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Grondslag voor verwerking</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij verwerken jouw persoonsgegevens op basis van de volgende AVG-grondslagen:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Uitvoering van de overeenkomst</strong> (art. 6 lid 1 sub b AVG) — nodig om je account aan te maken, examens aan te bieden en betalingen te verwerken.</li>
              <li><strong>Gerechtvaardigd belang</strong> (art. 6 lid 1 sub f AVG) — voor beveiliging, fraudepreventie en verbetering van onze dienst.</li>
              <li><strong>Toestemming</strong> (art. 6 lid 1 sub a AVG) — voor het gebruik van niet-essentiële cookies en het ontvangen van optionele communicatie.</li>
              <li><strong>Wettelijke verplichting</strong> (art. 6 lid 1 sub c AVG) — voor financiële administratie en belastingverplichtingen.</li>
            </ul>
          </section>

          {/* 4. Doel */}
          <section id="doel">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Waarvoor gebruiken wij je gegevens</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Het aanmaken en beheren van je account</li>
              <li>Het aanbieden van gepersonaliseerde examenoefeningen op basis van je niveau en vakken</li>
              <li>Het genereren van AI-gestuurde flashcards, oefenvragen en uitleg</li>
              <li>Het bijhouden van je studievoortgang en resultaten</li>
              <li>Het verwerken van betalingen en beheren van abonnementen</li>
              <li>Het beveiligen van ons platform en voorkomen van misbruik</li>
              <li>Het verbeteren van onze dienst</li>
            </ul>
          </section>

          {/* 5. AI */}
          <section id="ai">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. AI-verwerking</h2>
            <p className="text-slate-700 leading-relaxed">
              AI Examentrainer maakt gebruik van kunstmatige intelligentie voor het genereren van oefenvragen,
              flashcards, uitleg en het beoordelen van open antwoorden. Hierbij verwerken wij gegevens als volgt:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li>Jouw antwoorden en chatberichten worden via <strong>Vercel AI Gateway</strong> doorgestuurd naar <strong>Google Gemini</strong> voor verwerking.</li>
              <li>Er worden alleen de gegevens verstuurd die nodig zijn voor de specifieke AI-functie (bijv. je antwoord en de examenvraag voor beoordeling).</li>
              <li>Jouw gegevens worden <strong>niet</strong> gebruikt om AI-modellen te trainen.</li>
              <li>AI-gegenereerde antwoorden en beoordelingen zijn indicatief en vervangen geen officiële beoordeling.</li>
            </ul>
          </section>

          {/* 6. Cookies */}
          <section id="cookies">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Cookies en tracking</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij gebruiken de volgende soorten cookies:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Essentiële cookies</strong> — noodzakelijk voor het functioneren van de website, zoals authenticatietokens voor het inloggen (Supabase auth tokens).</li>
              <li><strong>Analytische cookies</strong> — om inzicht te krijgen in het gebruik van onze website en deze te verbeteren.</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Wij gebruiken geen tracking cookies van derden voor advertentiedoeleinden.
            </p>
          </section>

          {/* 7. Betalingen */}
          <section id="betalingen">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Betalingen en Mollie</h2>
            <p className="text-slate-700 leading-relaxed">
              Betalingen worden verwerkt via <strong>Mollie</strong>, een gecertificeerde betaaldienstverlener
              die voldoet aan de PCI-DSS standaard voor veilige betalingsverwerking.
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li>Bij registratie wordt een <strong>verificatiebetaling van €1,00</strong> uitgevoerd om je betaalmethode te verifiëren.</li>
              <li>Na registratie wordt een maandelijks abonnement van <strong>€12,50 per maand</strong> automatisch afgeschreven.</li>
              <li>Wij slaan geen creditcardnummers of bankrekeningnummers op. Alle financiële gegevens worden door Mollie beheerd.</li>
              <li>Wij bewaren alleen een referentie naar de Mollie-transactie en de abonnementsstatus.</li>
            </ul>
          </section>

          {/* 8. Bewaartermijnen */}
          <section id="bewaartermijnen">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Bewaartermijnen</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li><strong>Accountgegevens</strong> — worden bewaard zolang je account actief is. Na opzegging worden je gegevens binnen 30 dagen verwijderd, tenzij wettelijke bewaarplicht geldt.</li>
              <li><strong>Studiegegevens</strong> — worden bewaard zolang je account actief is en verwijderd samen met je account.</li>
              <li><strong>Betalingsgegevens</strong> — worden bewaard conform de wettelijke bewaarplicht van 7 jaar voor financiële administratie.</li>
              <li><strong>Technische gegevens</strong> — IP-adressen voor rate limiting worden maximaal 1 uur bewaard.</li>
            </ul>
          </section>

          {/* 9. Derden */}
          <section id="derden">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Delen met derden</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij delen jouw gegevens alleen met de volgende partijen, uitsluitend voor zover noodzakelijk
              voor de dienstverlening:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Supabase</strong> (VS/EU) — hosting van database en authenticatie.</li>
              <li><strong>Vercel</strong> (VS) — hosting van de website en serverless functies.</li>
              <li><strong>Mollie</strong> (Nederland) — betalingsverwerking.</li>
              <li><strong>Google</strong> (VS) — AI-verwerking via Google Gemini (via Vercel AI Gateway).</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Voor de doorgifte van gegevens naar partijen buiten de Europese Economische Ruimte (EER)
              zijn passende waarborgen getroffen, zoals Standard Contractual Clauses (SCC's).
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              Wij verkopen jouw persoonsgegevens nooit aan derden.
            </p>
          </section>

          {/* 10. Beveiliging */}
          <section id="beveiliging">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Beveiliging</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij nemen de beveiliging van jouw gegevens serieus en treffen de volgende maatregelen:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Versleuteld transport</strong> — alle communicatie verloopt via HTTPS/TLS.</li>
              <li><strong>Row Level Security (RLS)</strong> — databasebeveiliging zodat je alleen je eigen gegevens kunt inzien.</li>
              <li><strong>AES-256-GCM encryptie</strong> — wachtwoorden worden versleuteld opgeslagen tijdens het registratieproces.</li>
              <li><strong>CORS-beveiliging</strong> — alleen geautoriseerde domeinen kunnen met onze API communiceren.</li>
              <li><strong>Rate limiting</strong> — bescherming tegen misbruik van onze diensten.</li>
              <li><strong>Beveiligingsheaders</strong> — HSTS, X-Frame-Options, X-Content-Type-Options en XSS-bescherming.</li>
            </ul>
          </section>

          {/* 11. Rechten */}
          <section id="rechten">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Jouw rechten (AVG)</h2>
            <p className="text-slate-700 leading-relaxed">
              Op grond van de AVG heb je de volgende rechten:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Recht op inzage</strong> — je kunt opvragen welke gegevens wij van je hebben.</li>
              <li><strong>Recht op rectificatie</strong> — je kunt onjuiste gegevens laten corrigeren.</li>
              <li><strong>Recht op verwijdering</strong> — je kunt vragen om verwijdering van je gegevens.</li>
              <li><strong>Recht op beperking</strong> — je kunt vragen om beperking van de verwerking.</li>
              <li><strong>Recht op dataportabiliteit</strong> — je kunt je gegevens opvragen in een overdraagbaar formaat.</li>
              <li><strong>Recht op bezwaar</strong> — je kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang.</li>
              <li><strong>Recht om toestemming in te trekken</strong> — eerder gegeven toestemming kun je altijd intrekken.</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Om gebruik te maken van je rechten kun je contact opnemen via{' '}
              <a href="mailto:info@ai-examentrainer.nl" className="text-indigo-600 hover:underline">info@ai-examentrainer.nl</a>.
              Wij reageren binnen 30 dagen op je verzoek.
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              Daarnaast heb je het recht om een klacht in te dienen bij de{' '}
              <strong>Autoriteit Persoonsgegevens</strong> (<a href="https://autoriteitpersoonsgegevens.nl" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a>).
            </p>
          </section>

          {/* 12. Minderjarigen */}
          <section id="minderjarigen">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Minderjarigen</h2>
            <p className="text-slate-700 leading-relaxed">
              Onze dienst is gericht op scholieren die zich voorbereiden op hun eindexamen. Wij zijn ons
              ervan bewust dat veel van onze gebruikers minderjarig zijn.
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li>Gebruikers jonger dan <strong>16 jaar</strong> hebben toestemming van een ouder of voogd nodig om een account aan te maken.</li>
              <li>Door te registreren bevestigt de gebruiker (of diens ouder/voogd) dat deze toestemming is verleend.</li>
              <li>Ouders of voogden kunnen te allen tijde contact met ons opnemen om gegevens van hun kind in te zien, te wijzigen of te verwijderen.</li>
            </ul>
          </section>

          {/* 13. Wijzigingen */}
          <section id="wijzigingen">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Wijzigingen</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij kunnen dit privacybeleid van tijd tot tijd aanpassen. Bij wezenlijke wijzigingen informeren
              wij je via e-mail of een melding op het platform. De meest recente versie is altijd beschikbaar
              op deze pagina.
            </p>
          </section>

          {/* 14. Contact */}
          <section id="contact">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Contact</h2>
            <p className="text-slate-700 leading-relaxed">
              Heb je vragen over dit privacybeleid of over de verwerking van jouw gegevens?
              Neem contact met ons op:
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              <strong>AI Examentrainer</strong><br />
              E-mail: <a href="mailto:info@ai-examentrainer.nl" className="text-indigo-600 hover:underline">info@ai-examentrainer.nl</a><br />
              Website: <a href="https://ai-examentrainer.nl" className="text-indigo-600 hover:underline">ai-examentrainer.nl</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} AI Examentrainer</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-slate-700 transition-colors font-medium text-indigo-600">Privacy</a>
            <a href="/voorwaarden" className="hover:text-slate-700 transition-colors">Voorwaarden</a>
            <a href="mailto:info@ai-examentrainer.nl" className="hover:text-slate-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
