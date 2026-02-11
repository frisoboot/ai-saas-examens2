# JSON Import Format - Bulk Examenvragen Importeren

## Volledig voorbeeld: Nederlands examen met tekstboekje + bijlage

Dit voorbeeld laat zien hoe je een Nederlands examen importeert waarbij:
- Het **tekstboekje** (PDF) per vraag op de juiste **pagina** opent
- De **bijlage** (bronnenboekje) per vraag op de juiste **pagina** opent

```json
{
  "subject": "Nederlands",
  "level": "HAVO",
  "year": 2024,
  "source": "Examen HAVO 2024 tijdvak 1",
  "examPdfUrl": "https://jouwproject.supabase.co/storage/v1/object/public/exams/nederlands-havo-2024-tekstboekje.pdf",
  "examBijlageUrl": "https://jouwproject.supabase.co/storage/v1/object/public/exams/nederlands-havo-2024-bijlage.pdf",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Welke functie heeft de eerste alinea in de context van het hele artikel?",
      "options": [
        "Het introduceren van het hoofdargument",
        "Het weerleggen van een tegenargument",
        "Het wekken van de interesse van de lezer",
        "Het samenvatten van het artikel"
      ],
      "correctAnswer": "Het wekken van de interesse van de lezer",
      "score": 1,
      "pdfPage": 2,
      "bijlagePdfPage": 1,
      "section": "Tekst 1 - De kracht van taal",
      "sectionIntro": "Lees tekst 1 in de bijlage voordat je de vragen 1 t/m 5 beantwoordt."
    },
    {
      "type": "OPEN",
      "text": "De auteur gebruikt in alinea 3 een metafoor. Citeer deze metafoor en leg uit wat de auteur ermee bedoelt.",
      "modelAnswer": "De metafoor is 'taal is een brug tussen werelden'. De auteur bedoelt hiermee dat taal het mogelijk maakt om verschillende culturen en perspectieven met elkaar te verbinden. Zonder taal zouden mensen opgesloten blijven in hun eigen wereldbeeld.",
      "score": 3,
      "pdfPage": 2,
      "bijlagePdfPage": 2,
      "section": "Tekst 1 - De kracht van taal"
    },
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Wat is de hoofdgedachte van tekst 2?",
      "options": [
        "Social media verrijkt de Nederlandse taal",
        "Jongeren kunnen geen correct Nederlands meer schrijven",
        "De invloed van technologie op taalgebruik is genuanceerder dan vaak wordt beweerd",
        "Taalverandering is altijd een teken van verval"
      ],
      "correctAnswer": "De invloed van technologie op taalgebruik is genuanceerder dan vaak wordt beweerd",
      "score": 1,
      "pdfPage": 4,
      "bijlagePdfPage": 5,
      "section": "Tekst 2 - Taal in het digitale tijdperk",
      "sectionIntro": "Lees tekst 2 in de bijlage voordat je de vragen 6 t/m 12 beantwoordt."
    },
    {
      "type": "OPEN",
      "text": "Leg uit op welke manier de schrijver in alinea 2 en 3 een tegenstelling opbouwt. Gebruik in je antwoord een citaat uit beide alinea's.",
      "modelAnswer": "In alinea 2 stelt de schrijver dat 'technologie taal vervlakt tot emoji's en afkortingen'. In alinea 3 nuanceert hij dit door te schrijven dat 'dezelfde jongeren die op WhatsApp afkorten, in hun werkstukken complexe zinnen construeren'. De tegenstelling zit dus in het contrast tussen de pessimistische kijk (alinea 2) en de genuanceerde werkelijkheid (alinea 3).",
      "score": 4,
      "pdfPage": 5,
      "bijlagePdfPage": 6,
      "section": "Tekst 2 - Taal in het digitale tijdperk"
    },
    {
      "type": "OPEN",
      "text": "Bepaal het schrijfdoel van tekst 2 en licht je antwoord toe met twee argumenten.",
      "modelAnswer": "Het schrijfdoel is beschouwend/betogend. Argument 1: De schrijver presenteert meerdere standpunten over taalverandering en weegt deze tegen elkaar af. Argument 2: De schrijver komt uiteindelijk tot een eigen conclusie (taalverandering is niet per definitie taalverval), wat duidt op een betoog.",
      "score": 4,
      "pdfPage": 6,
      "bijlagePdfPage": 8,
      "section": "Tekst 2 - Taal in het digitale tijdperk"
    }
  ]
}
```

---

## Hoe werken de PDF-velden?

### Tekstboekje (opdrachtenpagina's)

| Veld          | Niveau | Beschrijving |
|---------------|--------|--------------|
| `examPdfUrl`  | Root   | URL naar het PDF-tekstboekje. Wordt gedeeld door alle vragen in het examen. Zet dit op root-niveau zodat je het niet per vraag hoeft te herhalen. |
| `pdfPage`     | Vraag  | Paginanummer in het tekstboekje dat bij **deze specifieke vraag** hoort. De PDF-viewer opent automatisch op deze pagina. |

### Bijlage (bronnenboekje)

| Veld              | Niveau | Beschrijving |
|-------------------|--------|--------------|
| `examBijlageUrl`  | Root   | URL naar de bijlage-PDF. Wordt gedeeld door alle vragen in het examen. Zet dit op root-niveau. |
| `bijlagePdfPage`  | Vraag  | Paginanummer in de bijlage dat bij **deze specifieke vraag** hoort. De PDF-viewer opent automatisch op deze pagina. |

### Hoe het werkt voor de student

```
Vraag 1  -->  Tekstboekje opent op pagina 2  |  Bijlage opent op pagina 1
Vraag 2  -->  Tekstboekje opent op pagina 2  |  Bijlage opent op pagina 2
Vraag 3  -->  Tekstboekje opent op pagina 4  |  Bijlage opent op pagina 5
Vraag 4  -->  Tekstboekje opent op pagina 5  |  Bijlage opent op pagina 6
Vraag 5  -->  Tekstboekje opent op pagina 6  |  Bijlage opent op pagina 8
```

Elke keer als een student naar de volgende vraag navigeert, springt de PDF-viewer automatisch naar de juiste pagina.

---

## Alle velden - Volledige referentie

### Root-niveau velden (worden overgenomen door alle vragen)

| Veld              | Type   | Verplicht | Beschrijving                                                      |
|-------------------|--------|-----------|-------------------------------------------------------------------|
| `subject`         | string | Ja        | Vaknaam (bijv. "Nederlands", "Geschiedenis")                       |
| `level`           | string | Ja        | "VMBO-TL", "HAVO" of "VWO"                                        |
| `year`            | number | Nee       | Examenjaar (2000-2100)                                             |
| `source`          | string | Nee       | Bronvermelding (bijv. "Examen HAVO 2024 tijdvak 1")               |
| `examPdfUrl`      | string | Nee       | URL naar tekstboekje-PDF in Supabase Storage (gedeeld door alle vragen) |
| `examBijlageUrl`  | string | Nee       | URL naar bijlage-PDF in Supabase Storage (gedeeld door alle vragen)    |
| `questions`       | array  | Ja        | Array met vraag-objecten                                           |

### Vraag-niveau velden

#### Verplichte velden

| Veld               | Type     | Wanneer verplicht | Beschrijving                                                  |
|--------------------|----------|-------------------|---------------------------------------------------------------|
| `type`             | string   | Altijd            | "MULTIPLE_CHOICE" of "OPEN"                                   |
| `text`             | string   | Altijd            | De vraagtekst                                                 |
| `options`          | string[] | Bij MC            | Antwoordopties, minimaal 2                                    |
| `correctAnswer`    | string   | Bij MC            | Correct antwoord, moet matchen met een optie (case-insensitive)|
| `modelAnswer`      | string   | Bij OPEN          | Verwacht/model antwoord                                       |

#### PDF & Bijlage velden

| Veld               | Type   | Beschrijving                                                          |
|--------------------|--------|-----------------------------------------------------------------------|
| `pdfPage`          | number | Paginanummer in het tekstboekje voor deze vraag                       |
| `bijlagePdfPage`   | number | Paginanummer in de bijlage voor deze vraag                            |
| `examPdfUrl`       | string | Per-vraag override van de tekstboekje-URL (normaal niet nodig)        |
| `examBijlageUrl`   | string | Per-vraag override van de bijlage-URL (normaal niet nodig)            |

#### Sectie & context velden

| Veld               | Type   | Beschrijving                                                          |
|--------------------|--------|-----------------------------------------------------------------------|
| `score`            | number | Aantal punten (standaard: 1)                                          |
| `contextText`      | string | Bronmateriaal / leestekst direct bij de vraag                         |
| `source`           | string | Bronvermelding per vraag (overschrijft root-niveau)                   |
| `section`          | string | Sectie-titel voor groepering (bijv. "Tekst 1 - De kracht van taal")  |
| `sectionIntro`     | string | Introductietekst van de sectie (verschijnt eenmalig boven eerste vraag)|

#### Afbeelding & werkblad velden

| Veld               | Type    | Beschrijving                                                         |
|--------------------|---------|----------------------------------------------------------------------|
| `imageUrl`         | string  | Base64-gecodeerde afbeelding                                         |
| `hasImage`         | boolean | Markering dat er een afbeelding nodig is                             |
| `worksheetUrl`     | string  | URL naar een los PDF-werkblad (bijv. Binas-tabel)                    |
| `worksheetLabel`   | string  | Label voor werkblad (bijv. "Binas-tabel 45")                         |
| `requiresWorksheet`| boolean | Geeft aan of werkblad vereist is                                     |

### Alternatieve veldnamen (worden ook geaccepteerd)

| Alternatief    | Standaard veld |
|----------------|---------------|
| `examYear`     | `year`        |
| `context`      | `contextText` |
| `bron`         | `source`      |
| `punten`       | `score`       |

---

## Voorbeeld: Geschiedenis examen met bronnenboekje

```json
{
  "subject": "Geschiedenis",
  "level": "VWO",
  "year": 2024,
  "source": "Examen VWO 2024 tijdvak 1",
  "examPdfUrl": "https://jouwproject.supabase.co/storage/v1/object/public/exams/geschiedenis-vwo-2024-opgaven.pdf",
  "examBijlageUrl": "https://jouwproject.supabase.co/storage/v1/object/public/exams/geschiedenis-vwo-2024-bronnenboekje.pdf",
  "questions": [
    {
      "type": "OPEN",
      "text": "Gebruik bron 1. Leg uit welk belang de VOC had bij het stichten van een handelspost op Ceylon.",
      "modelAnswer": "De VOC wilde de handel in kaneel monopoliseren. Ceylon was de belangrijkste producent van kaneel, dus door een handelspost te stichten kon de VOC de aanvoer controleren en concurrenten (vooral de Portugezen) buitensluiten.",
      "score": 3,
      "pdfPage": 1,
      "bijlagePdfPage": 1,
      "section": "De VOC in Azie",
      "sectionIntro": "De volgende vragen gaan over de handel van de VOC in Azie in de 17e en 18e eeuw. Gebruik het bronnenboekje."
    },
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Bron 2 toont een kaart van handelsroutes. Welke route werd het meest gebruikt door de VOC?",
      "options": [
        "Via Kaap de Goede Hoop naar Batavia",
        "Door het Suezkanaal naar India",
        "Via de Noordwest Passage naar China",
        "Langs de westkust van Afrika naar Brazilie"
      ],
      "correctAnswer": "Via Kaap de Goede Hoop naar Batavia",
      "score": 1,
      "pdfPage": 1,
      "bijlagePdfPage": 3,
      "section": "De VOC in Azie"
    }
  ]
}
```

---

## Minimaal voorbeeld (alleen verplichte velden, zonder PDF's)

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
    "options": ["Celkern", "Mitochondrien", "Ribosomen", "Chloroplasten"],
    "correctAnswer": "Mitochondrien",
    "score": 1
  },
  {
    "subject": "Biologie",
    "level": "HAVO",
    "type": "OPEN",
    "text": "Beschrijf het proces van fotosynthese.",
    "modelAnswer": "Bij fotosynthese wordt lichtenergie omgezet in chemische energie.",
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
11. `pdfPage` en `bijlagePdfPage` moeten positieve gehele getallen zijn
12. `examPdfUrl` en `examBijlageUrl` moeten geldige URLs zijn naar PDF's in Supabase Storage
