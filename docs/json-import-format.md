# JSON Import Format - Bulk Examenvragen Importeren

## Volledig voorbeeld met ALLE velden (Multiple Choice + Open vragen)

```json
{
  "subject": "Geschiedenis",
  "level": "HAVO",
  "year": 2024,
  "source": "Examen HAVO 2024 tijdvak 1",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "text": "In welk jaar viel de Berlijnse Muur?",
      "options": ["1987", "1989", "1991", "1993"],
      "correctAnswer": "1989",
      "score": 2,
      "contextText": "Na decennia van spanning tussen Oost en West bereikten de protesten in Oost-Duitsland een hoogtepunt in het najaar. Op een avond in november stroomden duizenden burgers naar de grensovergangen.",
      "source": "Examen HAVO 2024 tijdvak 1",
      "section": "Koude Oorlog",
      "sectionIntro": "De volgende vragen gaan over de periode van de Koude Oorlog (1945-1989). Gebruik de bijgeleverde bronnen bij het beantwoorden van de vragen.",
      "imageUrl": "",
      "hasImage": false,
      "worksheetUrl": "",
      "worksheetLabel": "",
      "requiresWorksheet": false
    },
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Welke organisatie werd opgericht als westerse militaire alliantie tijdens de Koude Oorlog?",
      "options": ["De Verenigde Naties", "De NAVO", "Het Warschaupact", "De Europese Unie"],
      "correctAnswer": "De NAVO",
      "score": 1,
      "contextText": "",
      "source": "",
      "section": "Koude Oorlog",
      "sectionIntro": "",
      "imageUrl": "",
      "hasImage": false,
      "worksheetUrl": "",
      "worksheetLabel": "",
      "requiresWorksheet": false
    },
    {
      "type": "OPEN",
      "text": "Leg uit waarom de Val van de Berlijnse Muur wordt gezien als het symbolische einde van de Koude Oorlog. Gebruik minimaal twee argumenten.",
      "modelAnswer": "De val van de Berlijnse Muur markeerde het einde van de Koude Oorlog om de volgende redenen:\n1. De muur was het fysieke symbool van de verdeling tussen het kapitalistische Westen en het communistische Oosten. Het verdwijnen ervan betekende het einde van die ideologische scheiding.\n2. De val leidde tot de hereniging van Duitsland en versnelde het uiteenvallen van de Sovjet-Unie, waarmee de bipolaire wereldorde ophield te bestaan.",
      "score": 4,
      "contextText": "De Berlijnse Muur was bijna drie decennia lang het meest zichtbare symbool van de Koude Oorlog. De muur scheidde niet alleen een stad, maar stond voor de ideologische kloof tussen twee wereldmachten.",
      "source": "Examen HAVO 2024 tijdvak 1",
      "section": "Koude Oorlog",
      "sectionIntro": "",
      "imageUrl": "",
      "hasImage": false,
      "worksheetUrl": "",
      "worksheetLabel": "",
      "requiresWorksheet": false
    },
    {
      "type": "OPEN",
      "text": "Beschrijf de rol van Gorbatsjov bij het einde van de Koude Oorlog.",
      "modelAnswer": "Gorbatsjov voerde als leider van de Sovjet-Unie twee belangrijke hervormingen door: glasnost (openheid) en perestrojka (herstructurering). Deze hervormingen gaven meer vrijheid aan Oost-Europese landen en verzwakten de greep van de Sovjet-Unie op haar satellietstaten. Gorbatsjov koos ervoor om geen militair geweld te gebruiken toen Oost-Europese landen zich losmaakten, wat de vreedzame revoluties mogelijk maakte.",
      "score": 3,
      "contextText": "",
      "source": "",
      "section": "Koude Oorlog",
      "sectionIntro": "",
      "imageUrl": "",
      "hasImage": false,
      "worksheetUrl": "",
      "worksheetLabel": "",
      "requiresWorksheet": false
    }
  ]
}
```

---

## Velden Referentie

### Root-niveau velden (worden overgenomen door alle vragen)

| Veld       | Type   | Verplicht | Beschrijving                                      |
|------------|--------|-----------|---------------------------------------------------|
| `subject`  | string | Ja        | Vaknaam (bijv. "Geschiedenis", "Wiskunde A")       |
| `level`    | string | Ja        | "VMBO-TL", "HAVO" of "VWO"                        |
| `year`     | number | Nee       | Examenjaar (2000-2100)                             |
| `source`   | string | Nee       | Bronvermelding (bijv. "Examen HAVO 2024 tijdvak 1") |
| `questions`| array  | Ja        | Array met vraag-objecten                           |

### Vraag-niveau velden

| Veld               | Type     | Verplicht        | Beschrijving                                                  |
|--------------------|----------|------------------|---------------------------------------------------------------|
| `type`             | string   | Ja               | "MULTIPLE_CHOICE" of "OPEN"                                   |
| `text`             | string   | Ja               | De vraagtekst                                                 |
| `options`          | string[] | Ja (bij MC)      | Antwoordopties, minimaal 2                                    |
| `correctAnswer`    | string   | Ja (bij MC)      | Correct antwoord, moet matchen met een optie (case-insensitive)|
| `modelAnswer`      | string   | Ja (bij OPEN)    | Verwacht/model antwoord                                       |
| `score`            | number   | Nee              | Aantal punten (standaard: 1)                                  |
| `contextText`      | string   | Nee              | Bronmateriaal / leestekst bij de vraag                        |
| `source`           | string   | Nee              | Bronvermelding per vraag (overschrijft root-niveau)           |
| `section`          | string   | Nee              | Sectie-titel voor groepering van vragen                       |
| `sectionIntro`     | string   | Nee              | Introductietekst van de sectie (verschijnt eenmalig)          |
| `imageUrl`         | string   | Nee              | Base64-gecodeerde afbeelding                                  |
| `hasImage`         | boolean  | Nee              | Markering dat er een afbeelding nodig is                      |
| `worksheetUrl`     | string   | Nee              | URL naar PDF-werkblad in Supabase Storage                     |
| `worksheetLabel`   | string   | Nee              | Label voor werkblad (bijv. "Binas-tabel 45")                  |
| `requiresWorksheet`| boolean  | Nee              | Geeft aan of werkblad vereist is                              |

### Alternatieve veldnamen (worden ook geaccepteerd)

| Alternatief    | Standaard veld |
|----------------|---------------|
| `examYear`     | `year`        |
| `context`      | `contextText` |
| `bron`         | `source`      |
| `punten`       | `score`       |

---

## Minimaal voorbeeld (alleen verplichte velden)

```json
{
  "subject": "Nederlands",
  "level": "VWO",
  "year": 2024,
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Welk stijlmiddel wordt in regel 3 gebruikt?",
      "options": ["Metafoor", "Personificatie", "Alliteratie", "Hyperbool"],
      "correctAnswer": "Metafoor"
    },
    {
      "type": "OPEN",
      "text": "Leg uit wat de auteur bedoelt met de uitspraak in alinea 2.",
      "modelAnswer": "De auteur bedoelt dat technologie niet alleen voordelen biedt, maar ook onbedoelde gevolgen heeft voor de maatschappij."
    }
  ]
}
```

---

## Alternatieve formaten

### Format 2: Direct array (zonder metadata-wrapper)

```json
[
  {
    "subject": "Biologie",
    "level": "HAVO",
    "type": "MULTIPLE_CHOICE",
    "text": "Welk organel is verantwoordelijk voor de celademhaling?",
    "options": ["Celkern", "Mitochondriën", "Ribosomen", "Chloroplasten"],
    "correctAnswer": "Mitochondriën",
    "score": 1
  },
  {
    "subject": "Biologie",
    "level": "HAVO",
    "type": "OPEN",
    "text": "Beschrijf het proces van fotosynthese.",
    "modelAnswer": "Bij fotosynthese wordt lichtenergie omgezet in chemische energie. Koolstofdioxide en water worden met behulp van lichtenergie omgezet in glucose en zuurstof. Dit proces vindt plaats in de chloroplasten.",
    "score": 3
  }
]
```

### Format 3: Enkel vraag-object

```json
{
  "subject": "Wiskunde A",
  "level": "VMBO-TL",
  "type": "MULTIPLE_CHOICE",
  "text": "Wat is 25% van 80?",
  "options": ["16", "18", "20", "22"],
  "correctAnswer": "20",
  "score": 1
}
```

---

## Beschikbare vakken

- Aardrijkskunde
- Biologie
- Duits
- Economie
- Engels
- Frans
- Geschiedenis
- Kunst
- Maatschappijwetenschappen
- Natuurkunde
- Nederlands
- Scheikunde
- Wiskunde A
- Wiskunde B
- Wiskunde C

## Beschikbare niveaus

- VMBO-TL
- HAVO
- VWO

## Validatieregels

1. `subject` moet een geldig vak zijn uit bovenstaande lijst
2. `level` moet exact "VMBO-TL", "HAVO" of "VWO" zijn
3. `type` moet exact "MULTIPLE_CHOICE" of "OPEN" zijn
4. `text` mag niet leeg zijn
5. Bij MC: `options` moet minimaal 2 opties bevatten
6. Bij MC: `correctAnswer` moet matchen met een van de opties (case-insensitive)
7. Bij OPEN: `modelAnswer` is verplicht
8. `year` moet tussen 2000-2100 liggen (indien opgegeven)
9. Maximale bestandsgrootte: 5 MB
10. Als `year` is opgegeven wordt het examtype automatisch "official_exam", anders "practice"
