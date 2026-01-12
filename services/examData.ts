import { StudentLevel } from '../types';

export interface SubjectTopic {
  id: string;
  name: string;
}

export const EXAM_TOPICS: Record<string, Record<StudentLevel, string[]>> = {
  'Aardrijkskunde': {
    'VMBO-TL': ['Weer en klimaat', 'Bevolking en ruimte', 'Water', 'Arm en rijk', 'Bronnen en energie', 'Grenzen en identiteit'],
    'HAVO': ['Systeem Aarde', 'Klimaatvraagstukken', 'Wonen in Nederland', 'Wereld: Globalisering', 'Brazilië', 'Leefomgeving: Overstromingsgevaar'],
    'VWO': ['Systeem Aarde', 'Klimaatverandering', 'Wereld: Globalisering', 'Zuid-Amerika', 'Leefomgeving: Steden', 'Aarde: Landschapszones']
  },
  'Bedrijfseconomie': {
    'VMBO-TL': ['Consumptie', 'Arbeid en productie', 'Overheid en bestuur', 'Internationale ontwikkelingen'], // Eigenlijk Economie topics, BE is vaak HAVO/VWO
    'HAVO': ['Financiële zelfredzaamheid', 'Bedrijf starten', 'Marktverovering', 'Personeelsbeleid', 'Investeren en financieren', 'Marketing'],
    'VWO': ['Financiële zelfredzaamheid', 'Rechtsvormen', 'Interne organisatie', 'Investeringsanalyse', 'Financiering', 'Verslaggeving']
  },
  'Biologie': {
    'VMBO-TL': ['Cellen en weefsels', 'Voortplanting', 'Erfelijkheid', 'Ecologie', 'Mens en milieu', 'Voeding en vertering', 'Gaswisseling', 'Bloedsomloop'],
    'HAVO': ['Cellen', 'Voortplanting', 'Erfelijkheid en DNA', 'Evolutie', 'Ecologie', 'Mens en milieu', 'Stofwisseling', 'Regeling en waarneming'],
    'VWO': ['Cellen', 'DNA en Eiwitsynthese', 'Erfelijkheid', 'Evolutie', 'Ecologie', 'Metabolisme', 'Zenuwstelsel en Hormonen', 'Afweer']
  },
  'Duits': {
    'VMBO-TL': ['Leesvaardigheid', 'Woordenschat', 'Grammatica', 'Signaalwoorden', 'Tekstverklaring'],
    'HAVO': ['Leesvaardigheid', 'Examenidioom', 'Tekststructuren', 'Argumentatie', 'Gatenteksten'],
    'VWO': ['Leesvaardigheid', 'Literatuurgeschiedenis', 'Complexe teksten', 'Wetenschappelijk taalgebruik', 'Examenidioom']
  },
  'Economie': {
    'VMBO-TL': ['Consumptie', 'Arbeid en productie', 'Overheid en bestuur', 'Internationale ontwikkelingen', 'Natuur en milieu'],
    'HAVO': ['Schaarste en ruil', 'Markt en overheid', 'Ruil over de tijd', 'Samenwerken en onderhandelen', 'Risico en informatie', 'Welvaart en groei'],
    'VWO': ['Schaarste', 'Vraag en aanbod', 'Markt en overheid', 'Speltheorie', 'Intertemporele ruil', 'Risico en verzekeren', 'Macro-economie']
  },
  'Engels': {
    'VMBO-TL': ['Leesvaardigheid', 'Woordenschat', 'Grammatica', 'Signaalwoorden', 'Tekstbegrip'],
    'HAVO': ['Leesvaardigheid', 'Examenidioom', 'Tekstanalyse', 'Verwijswoorden', 'Gatenteksten'],
    'VWO': ['Leesvaardigheid', 'Academisch Engels', 'Tekstanalyse', 'Inference questions', 'Examenidioom']
  },
  'Frans': {
    'VMBO-TL': ['Leesvaardigheid', 'Woordenschat', 'Basisgrammatica', 'Tekstbegrip', 'Alledaagse situaties'],
    'HAVO': ['Leesvaardigheid', 'Examenidioom', 'Tekstanalyse', 'Grammatica', 'Cultuur en maatschappij'],
    'VWO': ['Leesvaardigheid', 'Literatuur', 'Complexe tekstanalyse', 'Nuancering', 'Examenidioom']
  },
  'Geschiedenis': {
    'VMBO-TL': ['Staatsinrichting van Nederland', 'Historisch overzicht vanaf 1900', 'De Koude Oorlog', 'Sociale zekerheid'],
    'HAVO': ['Tijdvakken 5 t/m 10', 'Historische Context: Het Britse Rijk', 'Historische Context: Duitsland in Europa', 'Historische Context: Nederland 1948-2008'],
    'VWO': ['Tijdvakken', 'Historische Context: Steden en burgers', 'Historische Context: Verlichting', 'Historische Context: China', 'Historische Context: Duitsland']
  },
  'Kunst Algemeen': {
    'VMBO-TL': ['Cultuur van het moderne', 'Massacultuur', 'Architectuur', 'Beeldende kunst', 'Muziek en dans'],
    'HAVO': ['Cultuur van de kerk', 'Cultuur van de burgerij', 'Cultuur van het moderne', 'Massacultuur'],
    'VWO': ['Cultuur van de kerk', 'Hofcultuur', 'Cultuur van de burgerij', 'Cultuur van het moderne', 'Massacultuur']
  },
  'Maatschappijwetenschappen': {
    'VMBO-TL': ['Massamedia', 'Politiek', 'Criminaliteit', 'Multiculturele samenleving'], // Eigenlijk Maatschappijleer
    'HAVO': ['Rechtsstaat', 'Parlementaire democratie', 'Pluriforme samenleving', 'Verzorgingsstaat', 'Vorming', 'Verhouding', 'Binding', 'Verandering'],
    'VWO': ['Rechtsstaat', 'Democratie', 'Samenleving', 'Paradigma\'s', 'Politieke besluitvorming', 'Macht en Gezag']
  },
  'Natuurkunde': {
    'VMBO-TL': ['Stoffen en materialen', 'Elektriciteit', 'Energie', 'Geluid', 'Licht en beeld', 'Kracht en veiligheid'],
    'HAVO': ['Beweging en wisselwerking', 'Elektriciteit', 'Eigenschappen van stoffen en materialen', 'Technische automatisering', 'Optica', 'Straling'],
    'VWO': ['Mechanica', 'Elektriciteit en magnetisme', 'Eigenschappen van stoffen', 'Golven en trillingen', 'Kwantumfysica', 'Relativiteitstheorie', 'Biofysica']
  },
  'Nederlands': {
    'VMBO-TL': ['Leesvaardigheid', 'Schrijfvaardigheid', 'Fictie', 'Woordenschat', 'Spelling en grammatica'],
    'HAVO': ['Leesvaardigheid', 'Argumentatieve vaardigheden', 'Samenvatten', 'Schrijfvaardigheid', 'Literatuurgeschiedenis'],
    'VWO': ['Leesvaardigheid', 'Argumentatieanalyse', 'Wetenschappelijke teksten', 'Literatuurgeschiedenis', 'Overtuigend schrijven']
  },
  'Scheikunde': {
    'VMBO-TL': ['Stoffen en deeltjes', 'Chemische reacties', 'Verbranding', 'Water en reinigen', 'Zuren en basen'],
    'HAVO': ['Chemisch rekenen', 'Koolstofchemie', 'Materialen', 'Reactiekinetiek', 'Evenwichten', 'Redoxreacties', 'Groene chemie'],
    'VWO': ['Atoombouw en binding', 'Koolstofchemie', 'Biochemie', 'Reactiemechanismen', 'Evenwichten', 'Redox en elektrochemie', 'Proceschemie']
  },
  'Wiskunde A': {
    'VMBO-TL': ['Rekenen en meten', 'Verbanden', 'Vlakke meetkunde', 'Ruimtemeetkunde'], // Wiskunde algemeen
    'HAVO': ['Algemene vaardigheden', 'Tellen en kansen', 'Verbanden en grafieken', 'Verandering', 'Statistiek'],
    'VWO': ['Algemene vaardigheden', 'Kansrekening', 'Statistiek', 'Algebra en tellen', 'Verbanden', 'Differentiaalrekening']
  },
  'Wiskunde B': {
    'VMBO-TL': ['Rekenen', 'Verbanden', 'Meetkunde', 'Vergelijkingen'], // Wiskunde algemeen
    'HAVO': ['Functies en grafieken', 'Differentiaalrekening', 'Meetkunde', 'Goniometrie'],
    'VWO': ['Functies en grafieken', 'Differentiaal- en integraalrekening', 'Goniometrie', 'Meetkunde met coördinaten']
  },
  'Wiskunde C': {
    'VMBO-TL': ['Rekenen', 'Meten', 'Verbanden'], // Bestaat niet echt op VMBO
    'HAVO': ['Logisch redeneren', 'Vorm en ruimte', 'Verbanden', 'Kansrekening'], // Bestaat niet echt op HAVO
    'VWO': ['Logisch redeneren', 'Vorm en ruimte', 'Algebra en tellen', 'Verbanden en veranderingen', 'Statistiek en kansrekening']
  }
};

export const getTopicsForSubject = (subject: string, level: StudentLevel): string[] => {
  const subjectData = EXAM_TOPICS[subject];
  if (!subjectData) {
    return [];
  }
  return subjectData[level] || [];
};
