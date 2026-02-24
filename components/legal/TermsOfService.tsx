import React from 'react';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { SEO } from '../SEO';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO
        title="Algemene Voorwaarden | AI Examentrainer"
        description="Lees de algemene voorwaarden van AI Examentrainer. Informatie over je account, abonnement en gebruik van onze dienst."
        canonical="https://ai-examentrainer.nl/voorwaarden"
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Algemene Voorwaarden</h1>
        <p className="text-slate-500 mb-8">Laatst bijgewerkt: 24 februari 2026</p>

        {/* Table of Contents */}
        <nav className="bg-white rounded-xl border border-slate-200 p-6 mb-10">
          <h2 className="font-semibold text-slate-900 mb-3">Inhoudsopgave</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-indigo-600">
            <li><a href="#definities" className="hover:underline">Definities</a></li>
            <li><a href="#toepasselijkheid" className="hover:underline">Toepasselijkheid</a></li>
            <li><a href="#account" className="hover:underline">Het account</a></li>
            <li><a href="#dienst" className="hover:underline">De dienst</a></li>
            <li><a href="#abonnement" className="hover:underline">Abonnement en betaling</a></li>
            <li><a href="#opzegging" className="hover:underline">Opzegging</a></li>
            <li><a href="#ai-gebruik" className="hover:underline">Gebruik van AI</a></li>
            <li><a href="#eigendom" className="hover:underline">Intellectueel eigendom</a></li>
            <li><a href="#aansprakelijkheid" className="hover:underline">Aansprakelijkheid</a></li>
            <li><a href="#privacy" className="hover:underline">Privacybeleid</a></li>
            <li><a href="#verboden-gebruik" className="hover:underline">Verboden gebruik</a></li>
            <li><a href="#wijzigingen" className="hover:underline">Wijzigingen</a></li>
            <li><a href="#toepasselijk-recht" className="hover:underline">Toepasselijk recht</a></li>
            <li><a href="#contact" className="hover:underline">Contact</a></li>
          </ol>
        </nav>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* 1. Definities */}
          <section id="definities">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Definities</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li><strong>AI Examentrainer</strong> (ook: "wij", "ons", "onze") — de aanbieder van de dienst, bereikbaar via <a href="https://ai-examentrainer.nl" className="text-indigo-600 hover:underline">ai-examentrainer.nl</a>.</li>
              <li><strong>Gebruiker</strong> (ook: "jij", "je", "jouw") — iedere persoon die een account aanmaakt en/of gebruikmaakt van de dienst.</li>
              <li><strong>Dienst</strong> — het online platform van AI Examentrainer, inclusief alle functionaliteiten zoals examenoefeningen, AI-tutor, flashcards en voortgangsoverzichten.</li>
              <li><strong>Account</strong> — de persoonlijke toegang tot de dienst, beveiligd met e-mailadres en wachtwoord.</li>
              <li><strong>Abonnement</strong> — de betaalde toegang tot de dienst.</li>
            </ul>
          </section>

          {/* 2. Toepasselijkheid */}
          <section id="toepasselijkheid">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Toepasselijkheid</h2>
            <p className="text-slate-700 leading-relaxed">
              Deze algemene voorwaarden zijn van toepassing op elk gebruik van de dienst en op elke
              overeenkomst tussen AI Examentrainer en de gebruiker. Door je te registreren en gebruik te
              maken van onze dienst, ga je akkoord met deze voorwaarden.
            </p>
            <p className="text-slate-700 leading-relaxed mt-3">
              Afwijkingen van deze voorwaarden zijn alleen geldig indien schriftelijk overeengekomen.
            </p>
          </section>

          {/* 3. Account */}
          <section id="account">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Het account</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Om gebruik te maken van de dienst heb je een account nodig. Je maakt een account aan via het registratieformulier op onze website.</li>
              <li>Je bent verantwoordelijk voor het geheimhouden van je inloggegevens. Alle activiteiten via jouw account komen voor jouw rekening.</li>
              <li>Je garandeert dat de gegevens die je bij registratie opgeeft juist en volledig zijn.</li>
              <li>Eén account is strikt persoonlijk en mag niet gedeeld worden met anderen.</li>
              <li>Wij behouden ons het recht voor om accounts te blokkeren of te verwijderen bij vermoeden van misbruik.</li>
            </ul>
          </section>

          {/* 4. Dienst */}
          <section id="dienst">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. De dienst</h2>
            <p className="text-slate-700 leading-relaxed">
              AI Examentrainer biedt de volgende functionaliteiten:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li><strong>Examenoefeningen</strong> — oefenen met echte examenvragen op VMBO-TL, HAVO en VWO niveau, geordend per vak en jaar.</li>
              <li><strong>AI-gegenereerde oefenvragen</strong> — extra oefenvragen die door kunstmatige intelligentie worden samengesteld op basis van het officiële examenprogramma.</li>
              <li><strong>AI-tutor</strong> — een chatfunctie waarmee je vragen kunt stellen over examenstof en uitleg kunt krijgen.</li>
              <li><strong>Flashcards</strong> — AI-gegenereerde studiekaarten om examenstof te herhalen.</li>
              <li><strong>Voortgangsoverzicht</strong> — inzicht in je scores en ontwikkeling per vak.</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Wij streven naar een hoge beschikbaarheid van de dienst, maar garanderen geen ononderbroken
              toegang. Wij kunnen de dienst tijdelijk onderbreken voor onderhoud of updates.
            </p>
          </section>

          {/* 5. Abonnement */}
          <section id="abonnement">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Abonnement en betaling</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Het maandelijks abonnement kost <strong>€9,95 per maand</strong>. Daarnaast zijn er kwartaal- (€24,95) en jaarabonnementen (€79,00). Alle abonnementen worden automatisch verlengd en starten met een proefperiode van 5 dagen voor €2,00.</li>
              <li>Betalingen worden verwerkt via <strong>Mollie</strong>. De beschikbare betaalmethoden worden getoond bij het afrekenen.</li>
              <li>Bij een mislukte betaling proberen wij de betaling opnieuw te verwerken. Na herhaaldelijk falen kan de toegang worden opgeschort.</li>
              <li>Alle bedragen zijn inclusief BTW (indien van toepassing).</li>
            </ul>
          </section>

          {/* 7. Opzegging */}
          <section id="opzegging">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Opzegging</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Je kunt je abonnement op elk moment opzeggen via de instellingenpagina in je account.</li>
              <li>Na opzegging behoud je toegang tot de dienst tot het einde van de lopende betaalperiode.</li>
              <li>Er vindt geen restitutie plaats van reeds betaalde bedragen voor de lopende periode.</li>
              <li>Na afloop van de betaalperiode wordt je toegang beëindigd. Je kunt op elk moment een nieuw abonnement afsluiten.</li>
            </ul>
          </section>

          {/* 8. AI */}
          <section id="ai-gebruik">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Gebruik van AI</h2>
            <p className="text-slate-700 leading-relaxed">
              AI Examentrainer maakt gebruik van kunstmatige intelligentie (AI) voor verschillende functionaliteiten.
              Hierbij geldt het volgende:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li>AI-gegenereerde inhoud is <strong>uitsluitend bedoeld voor educatieve doeleinden</strong> en dient als hulpmiddel bij de examenvoorbereiding.</li>
              <li>Wij geven <strong>geen garantie op de juistheid</strong> van AI-gegenereerde antwoorden, beoordelingen of uitleg. AI kan fouten maken.</li>
              <li>AI-beoordelingen van open antwoorden zijn indicatief en komen niet noodzakelijk overeen met de beoordeling door een examinator.</li>
              <li>Gebruik de AI als aanvulling op je studie, niet als vervanging van lesmateriaal of begeleiding door docenten.</li>
            </ul>
          </section>

          {/* 9. Eigendom */}
          <section id="eigendom">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Intellectueel eigendom</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>Alle inhoud op het platform (software, ontwerp, teksten, logo's) is eigendom van AI Examentrainer of haar licentiegevers, tenzij anders vermeld.</li>
              <li>Officiële examenvragen zijn eigendom van de betreffende rechthebbenden (zoals het College voor Toetsen en Examens) en worden gebruikt voor educatieve doeleinden.</li>
              <li>Het is niet toegestaan om inhoud van het platform te kopiëren, verspreiden of commercieel te gebruiken zonder schriftelijke toestemming.</li>
              <li>Door het gebruik van de dienst verleen je ons geen rechten op jouw studiegegevens, anders dan nodig voor de dienstverlening.</li>
            </ul>
          </section>

          {/* 10. Aansprakelijkheid */}
          <section id="aansprakelijkheid">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Aansprakelijkheid</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2">
              <li>AI Examentrainer is een <strong>hulpmiddel bij de examenvoorbereiding</strong>. Wij garanderen geen specifieke examenresultaten of slagingspercentages.</li>
              <li>Onze aansprakelijkheid is beperkt tot het bedrag dat je in de 3 maanden voorafgaand aan het ontstaan van de schade aan ons hebt betaald.</li>
              <li>Wij zijn niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.</li>
              <li>Wij zijn niet aansprakelijk voor schade als gevolg van onjuiste AI-gegenereerde inhoud.</li>
              <li>Wij zijn niet aansprakelijk voor tijdelijke onbeschikbaarheid van de dienst als gevolg van onderhoud of overmacht.</li>
            </ul>
          </section>

          {/* 11. Privacy */}
          <section id="privacy">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Privacybeleid</h2>
            <p className="text-slate-700 leading-relaxed">
              Op de verwerking van persoonsgegevens is ons{' '}
              <a href="/privacy" className="text-indigo-600 hover:underline font-medium">privacybeleid</a>{' '}
              van toepassing. Door gebruik te maken van de dienst ga je akkoord met de verwerking van
              je gegevens zoals beschreven in ons privacybeleid.
            </p>
          </section>

          {/* 12. Verboden gebruik */}
          <section id="verboden-gebruik">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Verboden gebruik</h2>
            <p className="text-slate-700 leading-relaxed">
              Het is niet toegestaan om:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mt-3">
              <li>De dienst te gebruiken voor andere doeleinden dan persoonlijke examenvoorbereiding.</li>
              <li>Je account te delen met of beschikbaar te stellen aan derden.</li>
              <li>De beveiliging van het platform te omzeilen of te testen zonder toestemming.</li>
              <li>Geautomatiseerde systemen (bots, scrapers) in te zetten om inhoud van het platform te verzamelen.</li>
              <li>De dienst te gebruiken op een manier die andere gebruikers hindert of het platform overbelast.</li>
              <li>Inhoud te plaatsen die onrechtmatig, beledigend of in strijd met de wet is.</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Bij overtreding behouden wij ons het recht voor om je account per direct te blokkeren zonder restitutie.
            </p>
          </section>

          {/* 13. Wijzigingen */}
          <section id="wijzigingen">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Wijzigingen</h2>
            <p className="text-slate-700 leading-relaxed">
              Wij behouden ons het recht voor om deze algemene voorwaarden te wijzigen. Bij wezenlijke
              wijzigingen informeren wij je minimaal 30 dagen van tevoren via e-mail of een melding
              op het platform. Door na de wijziging gebruik te blijven maken van de dienst, ga je
              akkoord met de gewijzigde voorwaarden.
            </p>
          </section>

          {/* 14. Toepasselijk recht */}
          <section id="toepasselijk-recht">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Toepasselijk recht</h2>
            <p className="text-slate-700 leading-relaxed">
              Op deze voorwaarden en op elk geschil dat hieruit voortvloeit is <strong>Nederlands recht</strong> van
              toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.
            </p>
          </section>

          {/* 15. Contact */}
          <section id="contact">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Contact</h2>
            <p className="text-slate-700 leading-relaxed">
              Heb je vragen over deze voorwaarden? Neem contact met ons op:
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
            <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="/voorwaarden" className="hover:text-slate-700 transition-colors font-medium text-indigo-600">Voorwaarden</a>
            <a href="mailto:info@ai-examentrainer.nl" className="hover:text-slate-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
