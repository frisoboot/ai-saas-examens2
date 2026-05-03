/**
 * Shared prompt builder for lookalike exam generation.
 * Used by both api/gemini.ts (non-streaming) and api/gemini-stream.ts (SSE streaming).
 */

function getSubjectGuidance(subject: string, level: string): string {
  const TAALVAKKEN = ['Engels', 'Duits', 'Frans', 'Nederlands'];
  const WISKUNDE = ['Wiskunde A', 'Wiskunde B', 'Wiskunde C'];
  const EXACTE_VAKKEN = ['Natuurkunde', 'Scheikunde'];

  if (TAALVAKKEN.includes(subject)) {
    const nederlandsExtra = subject === 'Nederlands' && level !== 'VMBO-TL'
      ? `\n- Bij open vragen over argumentatieanalyse: benoem concrete argumentatietechnieken (autoriteitsargument, analogie, emotioneel appèl)`
      : '';
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR ${subject.toUpperCase()}:
- VERPLICHT: elke meerkeuze- en open vraag heeft een eigen brontekst in contextText (200-350 woorden authentiek ${subject === 'Nederlands' ? 'Nederlands' : subject === 'Engels' ? 'Engels' : subject === 'Duits' ? 'Duits' : 'Frans'} proza of betoog)
- Vragen testen tekstbegrip, NIET losse kennis uit het hoofd
- Typische MC-vraagpatronen: "Welke bewering sluit het best aan bij alinea X?", "Wat bedoelt de auteur met '...' in regel X?", "Welk signaalwoord past op de stippellijn in regel X?"
- MC-opties zijn altijd tekstgebonden: verwijs naar tekstgedeelten, niet naar algemene kennis
- Open vragen: "Wat is de centrale stelling van de auteur?", "Welke twee argumenten gebruikt de auteur om...?"${nederlandsExtra}`;
  }

  if (WISKUNDE.includes(subject)) {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Basisberekeningen, verbanden en eenvoudige meetkunde\n- Gebruik concrete getallen, geen abstracte symbolen',
      'HAVO': '- Functies, differentiaalrekening, statistiek\n- Functies noteren als bijv. f(x) = 2x² - 3x + 1',
      'VWO': '- Integraalrekening, goniometrie, meetkunde met coördinaten\n- Complexere formules en meerstappenbewijzen',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR ${subject.toUpperCase()}:
- Elke vraag bevat een concreet wiskundig probleem met duidelijke getalswaarden of functies
- Notatie in tekstvorm (geen LaTeX): bijv. "f(x) = 2x² - 3x + 1", "wortel(16) = 4"
- MC-opties zijn specifieke getallen of uitdrukkingen, niet beschrijvingen
- Open vragen beginnen met: "Bereken", "Bepaal", "Bewijs dat", "Schets de grafiek van", "Leid af dat"
- Vermeld altijd het aantal decimalen of de exacte vorm die verwacht wordt
- MC heeft altijd precies 4 opties (A t/m D) met veelgemaakte rekenfouten als afleiders
${levelHints[level] || ''}`;
  }

  if (EXACTE_VAKKEN.includes(subject)) {
    const vakHints = subject === 'Scheikunde'
      ? '- Gebruik chemische formules in tekstvorm: bijv. "H2O", "CO2", "NaCl"\n- Reactievergelijkingen beschrijven in woorden of tekstvorm\n- Thema\'s: reactiekinetiek, evenwichten, zuren/basen, redox'
      : '- Gebruik SI-eenheden: m, kg, s, N, J, W, V, A, Ω\n- Beschrijf meetopstellingen in woorden\n- Thema\'s: krachten, energie, elektriciteit, golven, straling';
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR ${subject.toUpperCase()}:
- Elke vraag is verankerd in een reële of experimentele context (beschreven in woorden)
- Geef specifieke getalswaarden met eenheden in de vraag: bijv. "Een blok van 5,0 kg beweegt met een snelheid van 3,0 m/s"
- Open vragen: "Bereken", "Leg uit waarom", "Verklaar met behulp van [concept]"
- MC-afleiders: veelgemaakte fouten met eenheden of tekens, bijna-correcte formules
${vakHints}`;
  }

  if (subject === 'Geschiedenis') {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Directe vragen over historische feiten en eenvoudige oorzaak-gevolg relaties\n- "Noem een oorzaak van...", "Wat was het gevolg van..."',
      'HAVO': '- Historische context vragen: situeer de gebeurtenis in een bredere context\n- "Verklaar waarom...", "Welke factoren leidden tot..."',
      'VWO': '- Historisch redeneren: continuïteit-verandering, perspectief, bronkritiek\n- "Beredeneer in hoeverre...", "Analyseer de rol van...", "Vanuit welk perspectief..."',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR GESCHIEDENIS:
- Elke vraag is verankerd in een specifieke historische periode of context (noem altijd de tijdsperiode)
- Gebruik historische denkvaardigheden: oorzaak-gevolg, continuïteit-verandering, historisch perspectief
- Voeg bij open vragen een korte historische brontekst of parafrase als contextText toe (100-200 woorden)
- MC-opties bevatten alle plausibele historische verklaringen, niet overduidelijk foute opties
${levelHints[level] || ''}`;
  }

  if (subject === 'Aardrijkskunde') {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Basisprocessen: weer, bevolking, energie, water\n- "Noem twee kenmerken van...", "Wat is het verschil tussen..."',
      'HAVO': '- Systemen en vraagstukken: klimaat, globalisering, ruimtelijke ordening\n- "Verklaar het verband tussen...", "Beschrijf de gevolgen van..."',
      'VWO': '- Complexe ruimtelijke en fysisch-geografische processen\n- "Beredeneer welke factoren...", "Analyseer de ruimtelijke samenhang tussen..."',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR AARDRIJKSKUNDE:
- Verwijst altijd naar een specifieke regio, land of fysisch-geografisch proces
- Beschrijf geografische situaties volledig in woorden (geen kaarten/grafieken)
- Duurzaamheid en klimaatverandering zijn veelvoorkomende thema's
- Ruimtelijke samenhang aantonen: "leg het verband uit tussen X in regio Y en Z"
${levelHints[level] || ''}`;
  }

  if (subject === 'Economie' || subject === 'Bedrijfseconomie') {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Basiseconomie: consumptie, productie, overheid\n- Eenvoudige berekeningen: prijs × hoeveelheid, winst = omzet - kosten',
      'HAVO': '- Marktwerking, vraag en aanbod, macro-economie\n- "Bereken de evenwichtsprijs", "Verklaar met behulp van het begrip prijselasticiteit"',
      'VWO': '- Speltheorie, intertemporele keuzes, risico en verzekeren\n- "Beredeneer met behulp van het model...", "Welk marktfalen treedt op wanneer..."',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR ${subject.toUpperCase()}:
- Elke vraag heeft een concrete economische casus: een bedrijf, markt of beleidsbeslissing
- Berekeningsvragen altijd met duidelijke getalswaarden en gevraagde eenheid (€, %, index)
- Opdrachtwerkwoorden: "Bereken", "Toon aan", "Verklaar met behulp van het begrip [X]", "Geef twee gevolgen"
- MC-afleiders: economisch plausibele maar incorrecte redenaties, veelgemaakte rekenwisselfouten
${levelHints[level] || ''}`;
  }

  if (subject === 'Maatschappijwetenschappen') {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Basisconcepten: media, politiek, criminaliteit, multiculturele samenleving\n- "Noem twee kenmerken van...", "Wat verstaan we onder..."',
      'HAVO': '- Rechtsstaat, democratie, pluriforme samenleving, verzorgingsstaat\n- "Verklaar waarom...", "Geef twee voorbeelden van...", "Wat is het verband tussen..."',
      'VWO': '- Wetenschappelijke paradigma\'s, macht en gezag, politieke besluitvorming\n- "Beredeneer vanuit het perspectief van...", "Analyseer de machtsverhoudingen in..."',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR MAATSCHAPPIJWETENSCHAPPEN:
- Verankerd in een actuele maatschappelijke situatie of nieuwscontext (beschreven in tekst)
- Gebruik vakspecifieke begrippen correct: socialisatie, normen en waarden, democratie, rechtsstaat
- Voeg bij open vragen een korte nieuwstekst of casus als contextText toe (100-200 woorden)
- MC-opties bevatten conceptueel verwante maar onjuiste definities als afleiders
${levelHints[level] || ''}`;
  }

  if (subject === 'Biologie') {
    const levelHints: Record<string, string> = {
      'VMBO-TL': '- Basisprocessen: cellen, voortplanting, erfelijkheid, ecologie\n- "Noem de stappen van...", "Wat is de functie van..."',
      'HAVO': '- Stofwisseling, regeling, evolutie, DNA\n- "Beschrijf het proces van...", "Verklaar het verschil tussen..."',
      'VWO': '- Moleculaire biologie, biochemie, afweer, neurobiologie\n- "Verklaar het mechanisme van...", "Beredeneer waarom..."',
    };
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR BIOLOGIE:
- Vragen zijn procesgeoriënteerd: beschrijf celprocessen, fysiologische reacties of ecologische relaties
- Geneticavragen worden volledig in tekstvorm gesteld: bijv. "Een pea plant heeft genotype Aa. Hoe groot is de kans dat..."
- Open vragen: "Beschrijf de stappen van", "Verklaar het verloop van", "Geef aan waarom"
- MC-afleiders: biologisch plausibele maar onjuiste processen of begrippen
${levelHints[level] || ''}`;
  }

  if (['Kunst Algemeen'].includes(subject)) {
    return `VAK-SPECIFIEKE AANWIJZINGEN VOOR KUNST ALGEMEEN:
- Vragen gaan over kunsthistorische perioden en stijlkenmerken (volledig in tekstvorm beschreven)
- Beschrijf een kunstwerk, architectuurstijl of muziekstroom in woorden als context
- Open vragen: "Beschrijf twee kenmerken van", "Verklaar waardoor", "Noem de kunststroming waarbij"
- MC-opties bevatten stijlperioden of kunstenaars die dicht bij het antwoord liggen`;
  }

  // Fallback voor overige vakken
  return `VAK-SPECIFIEKE AANWIJZINGEN:
- Vragen zijn verankerd in een concrete context die volledig in tekstvorm beschreven wordt
- Gebruik vakspecifieke begrippen passend bij ${subject}
- Open vragen beginnen met een duidelijk opdrachtwerkwoord`;
}

function getLevelInstructions(level: string): string {
  switch (level) {
    case 'VMBO-TL':
      return `VMBO-TL NIVEAU-AANWIJZINGEN:
- Taalgebruik: helder, direct en toegankelijk Nederlands — geen lange bijzinnen
- Cognitieve verdeling: 50% Onthouden/Begrijpen, 35% Toepassen, 15% Analyseren
- MC-vragen: directe kennisvragen waarbij het juiste antwoord duidelijk juist is
- Open vragen gebruiken: "Noem", "Beschrijf kort", "Geef een voorbeeld van", "Wat is de betekenis van"
- Open antwoord: maximaal 1-2 zinnen, concrete feiten of begrippen
- MC-afleiders: duidelijk onjuist maar verwarringswaardig voor leerlingen die het niet precies weten`;

    case 'HAVO':
      return `HAVO NIVEAU-AANWIJZINGEN:
- Taalgebruik: correct Nederlands met vakspecifieke terminologie
- Cognitieve verdeling: 30% Onthouden/Begrijpen, 40% Toepassen, 25% Analyseren, 5% Evalueren
- MC-vragen: toepassing van kennis in een nieuwe context, niet louter reproductie
- Open vragen gebruiken: "Verklaar", "Leg uit waarom", "Geef twee redenen", "Wat is het gevolg van", "Beschrijf het verband"
- Open antwoord: 2-3 zinnen, toon begrip én toepassing op de gegeven situatie
- MC-afleiders: plausibele alternatieven die een veelgemaakte vergissing weerspiegelen`;

    case 'VWO':
      return `VWO NIVEAU-AANWIJZINGEN:
- Taalgebruik: academisch, genuanceerd Nederlands — complexe zinsstructuren toegestaan
- Cognitieve verdeling: 20% Onthouden/Begrijpen, 30% Toepassen, 30% Analyseren, 15% Evalueren, 5% Creëren
- MC-vragen: nuancering en analyse vereist — alle opties zijn plausibel, slechts één is het meest correct
- Open vragen gebruiken: "Beredeneer", "Analyseer", "Betoog", "In hoeverre", "Leid af dat", "Vanuit welk perspectief"
- Open antwoord: 3-5 zinnen, argumentatief en genuanceerd, gebruik vakbegrippen
- MC-afleiders: inhoudelijk allemaal geloofwaardig, onderscheid zit in nuance of volledigheid`;

    default:
      return 'Pas het niveau aan.';
  }
}

function getScoreGuidance(): string {
  return `PUNTENWAARDERING (score veld):
- Meerkeuze (MULTIPLE_CHOICE): altijd score: 1
- Open vragen — baseer de score op het opdrachtwerkwoord:
  * "Noem", "Geef aan", "Wat is": score: 1
  * "Beschrijf", "Verklaar", "Leg uit", "Geef twee redenen": score: 2
  * "Beredeneer", "Analyseer", "Betoog", "Leid af": score: 3
  * Complexe meerstappenredenering of bewijs: score: 4`;
}

export function buildLookalikePrompt(
  subject: string,
  level: string,
  count: number,
  topic?: string,
  examStyle?: string
): string {
  const examStyleDesc = examStyle === 'tijdvak1'
    ? 'eerste tijdvak (mei/juni)'
    : examStyle === 'tijdvak2'
      ? 'tweede tijdvak (juni/juli, iets moeilijker en met meer verdieping)'
      : 'mix van beide tijdvakken';

  const mcCount = Math.round(count * 0.7);
  const openCount = count - mcCount;

  return `Je bent een ervaren CITO-examinator die authentieke ${level} centraal eindexamenvragen maakt voor ${subject}.
${topic ? `SPECIFIEK ONDERWERP: Focus ALLE vragen uitsluitend op: "${topic}"` : ''}
STIJL: ${examStyleDesc}

${getLevelInstructions(level)}

${getSubjectGuidance(subject, level)}

OPDRACHT: Genereer PRECIES ${count} examenvragen: ${mcCount} meerkeuze en ${openCount} open.

AUTHENTIEKE EXAMENSTIJL:
- Schrijf in de stijl van officiële CITO-examens: zakelijk, precies en zonder ambiguïteit
- Meerkeuze heeft altijd precies 4 opties (A, B, C, D) — formuleer opties grammaticaal parallel en even lang
- Open vragen beginnen altijd met een duidelijk opdrachtwerkwoord (zie niveau-aanwijzingen)
- Modelantwoorden zijn volledig en bevatten de sleuteltermen die een leerling moet noemen

GEEN VISUELE BRONNEN:
- GEEN verwijzingen naar afbeeldingen, kaarten, grafieken, diagrammen, tabellen of figuren
- GEEN zinnen zoals "Figuur 1 toont...", "Bekijk de kaart...", "De grafiek laat zien..."
- Beschrijf visuele of geografische informatie volledig in woorden

${getScoreGuidance()}

JSON FORMAT — geef UITSLUITEND een JSON-array terug, geen markdown-blokken:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "De examenvraag inclusief eventuele context",
    "options": ["A. eerste optie", "B. tweede optie", "C. derde optie", "D. vierde optie"],
    "correctIndex": 0,
    "score": 1,
    "contextText": "Brontekst of casus (alleen invullen als de vragen hierop gebaseerd zijn, anders weglaten)"
  },
  {
    "type": "OPEN",
    "text": "Beredeneer waarom...",
    "modelAnswer": "Volledig modelantwoord met alle sleuteltermen en verwachte redeneerstappen",
    "score": 3,
    "contextText": "Brontekst of casus (alleen invullen als de vragen hierop gebaseerd zijn, anders weglaten)"
  }
]`;
}

export function getExamStyleDescription(examStyle?: string): string {
  return examStyle === 'tijdvak1'
    ? 'eerste tijdvak (mei/juni)'
    : examStyle === 'tijdvak2'
      ? 'tweede tijdvak (juni/juli, iets moeilijker)'
      : 'mix van beide tijdvakken';
}
