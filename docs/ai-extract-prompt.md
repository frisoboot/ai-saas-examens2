# AI Prompt - Examenvragen Extraheren uit PDF

Kopieer onderstaande prompt en plak deze in een AI (bijv. ChatGPT, Gemini, Claude) samen met de examen-PDF.

---

## De Prompt

```
Je bent een specialist in het extraheren van Nederlandse examenvragen uit PDF-bestanden.

JE TAAK:
Analyseer het bijgevoegde examen-PDF en extraheer ALLE vragen in exact het onderstaande JSON-formaat. Wees extreem nauwkeurig - elke vraag, elk antwoord, elke paginaverwijzing moet kloppen.

STAP 1 - INVENTARISEER:
- Tel het totaal aantal vragen in het examen
- Identificeer welke vragen meerkeuze (MULTIPLE_CHOICE) zijn en welke open (OPEN)
- Noteer bij welke tekst/bron elke vraag hoort
- Noteer op welke PDF-pagina elke vraag staat

STAP 2 - BEPAAL METADATA:
- Vak (subject): bijv. "Nederlands", "Geschiedenis", "Biologie"
- Niveau (level): "VMBO-TL", "HAVO" of "VWO"
- Jaar (year): het examenjaar
- Bron (source): bijv. "Examen HAVO 2024 tijdvak 1"

STAP 3 - EXTRAHEER ELKE VRAAG met deze regels:

Voor MULTIPLE_CHOICE vragen:
- "type": "MULTIPLE_CHOICE"
- "text": de volledige vraagtekst
- "options": array met alle antwoordopties (zonder letter-prefix zoals "A." of "1.")
- "correctAnswer": het juiste antwoord (exact zoals in options). Als het correcte antwoord niet in de PDF staat, vul dan "ONBEKEND - controleer correctiemodel" in
- "score": aantal punten (uit het correctiemodel als beschikbaar, anders 1)

Voor OPEN vragen:
- "type": "OPEN"
- "text": de volledige vraagtekst, inclusief instructies zoals "Gebruik bron 3" of "maximaal 120 woorden"
- "modelAnswer": het verwachte antwoord uit het correctiemodel. Als geen correctiemodel beschikbaar is, schrijf een volledig en correct modelantwoord gebaseerd op de vraag
- "score": aantal punten (uit het correctiemodel als beschikbaar, anders standaard 2)

Voor ALLE vragen:
- "pdfPage": het paginanummer in het OPGAVENBOEKJE waar deze vraag staat (1-gebaseerd)
- "bijlagePdfPage": het paginanummer in het BIJLAGE/BRONNENBOEKJE waar de relevante tekst/bron staat (alleen als er een apart bronnenboekje is)
- "section": de sectie-titel (bijv. "Tekst 1 - De kracht van taal" of "Opgave 3 - Genetica")
- "sectionIntro": alleen bij de EERSTE vraag van een nieuwe sectie, een korte intro (bijv. "Lees tekst 1 in de bijlage voordat je de vragen 1 t/m 5 beantwoordt.")
- "contextText": korte brontekst die DIRECT bij de vraag staat (niet de hele tekst uit de bijlage, maar wel citaten of kleine fragmenten die in de opgave zelf staan)

SPECIALE INSTRUCTIES:
1. Neem de vraagtekst LETTERLIJK over, wijzig geen woorden
2. Bij meerkeuze: neem antwoordopties over ZONDER de letter/nummer prefix ("A.", "B.", "1.", "2." etc.)
3. Als een vraag verwijst naar een afbeelding/figuur/grafiek, vermeld dit in de vraagtekst: "[Zie afbeelding in opgavenboekje pagina X]"
4. Als er deelvragen zijn (bijv. 3a, 3b), maak daar APARTE vraag-objecten van met duidelijke nummering in de text
5. Bij vragen met "maximaal X woorden" of "noem X argumenten" - neem die instructie mee in de vraagtekst
6. De pdfPage telt vanaf pagina 1 van het opgavenboekje (niet het voorblad als dat een aparte pagina is)
7. Als er een apart bronnenboekje/bijlage is, gebruik bijlagePdfPage om naar de juiste pagina te verwijzen

OUTPUT FORMAT:
Geef ALLEEN de JSON terug, geen uitleg ervoor of erna. Het moet valid JSON zijn.

{
  "subject": "[VAKNAAM]",
  "level": "[VMBO-TL/HAVO/VWO]",
  "year": [JAAR],
  "source": "[Examen NIVEAU JAAR tijdvak X]",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "text": "Volledige vraagtekst hier",
      "options": ["Optie 1", "Optie 2", "Optie 3", "Optie 4"],
      "correctAnswer": "Optie 2",
      "score": 1,
      "pdfPage": 3,
      "bijlagePdfPage": 1,
      "section": "Tekst 1 - Titel",
      "sectionIntro": "Lees tekst 1 voordat je de vragen 1 t/m 5 beantwoordt."
    },
    {
      "type": "OPEN",
      "text": "Volledige vraagtekst hier inclusief instructies",
      "modelAnswer": "Volledig uitgewerkt modelantwoord",
      "score": 3,
      "pdfPage": 4,
      "bijlagePdfPage": 2,
      "section": "Tekst 1 - Titel"
    }
  ]
}

CONTROLEER VOOR OUTPUT:
- [ ] Alle vragen zijn meegenomen (tel na!)
- [ ] Elke MC-vraag heeft options EN correctAnswer
- [ ] Elke OPEN-vraag heeft een modelAnswer
- [ ] pdfPage klopt bij elke vraag
- [ ] bijlagePdfPage klopt (als er een bijlage is)
- [ ] section is ingevuld bij elke vraag
- [ ] sectionIntro staat alleen bij de eerste vraag van elke sectie
- [ ] De JSON is geldig (geen trailing comma's, correcte quotes)
- [ ] Antwoordopties bevatten GEEN letter-prefix (geen "A.", "B." etc.)
```

---

## Variant: Alleen opgavenboekje (zonder correctiemodel)

Als je GEEN correctiemodel hebt, voeg dit toe aan het einde van de prompt:

```
BELANGRIJK: Er is GEEN correctiemodel beschikbaar.
- Voor MULTIPLE_CHOICE: vul correctAnswer in als "ONBEKEND - controleer correctiemodel"
- Voor OPEN: schrijf zelf een zo goed mogelijk modelantwoord gebaseerd op je kennis van het vak en het niveau
- Markeer bij elke vraag of het antwoord door jou is gegenereerd door aan het einde van modelAnswer toe te voegen: "\n\n[AI-gegenereerd antwoord - controleer voor gebruik]"
```

---

## Variant: Met apart correctiemodel

Als je WEL een correctiemodel hebt, voeg dit toe:

```
BELANGRIJK: Het correctiemodel is ook bijgevoegd.
- Gebruik het correctiemodel voor de correcte antwoorden en scoreverdeling
- Voor MULTIPLE_CHOICE: het correcte antwoord staat in het correctiemodel
- Voor OPEN: neem het modelantwoord/verwachte antwoord over uit het correctiemodel
- Score per vraag: neem de punten over uit het correctiemodel
- Als het correctiemodel meerdere goedgekeurde antwoorden geeft, neem het meest volledige antwoord
```

---

## Variant: Twee aparte PDF's (opgaven + bijlage)

Als het examen uit twee PDF's bestaat:

```
Er zijn TWEE PDF's:
1. OPGAVENBOEKJE - bevat de vragen en instructies
2. BIJLAGE/BRONNENBOEKJE - bevat de teksten, bronnen, afbeeldingen

Regels:
- "pdfPage" = paginanummer in het OPGAVENBOEKJE
- "bijlagePdfPage" = paginanummer in het BIJLAGE/BRONNENBOEKJE
- Als een vraag verwijst naar een tekst/bron in de bijlage, noteer de bijlagePdfPage
- Als een vraag geen verwijzing naar de bijlage heeft, laat bijlagePdfPage weg
```

---

## Tips voor beste resultaten

1. **Upload de PDF als afbeelding** als de AI moeite heeft met PDF-tekst - sommige examen-PDF's zijn gescand
2. **Voeg het correctiemodel apart toe** als tweede PDF voor de beste antwoorden
3. **Controleer altijd de output** - tel of alle vragen er zijn en of paginanummers kloppen
4. **Bij grote examens** (30+ vragen): vraag de AI om in delen te werken ("Extraheer eerst vragen 1-15, dan 16-30")
5. **Na extractie**: upload de JSON in de Bulk Import tool en controleer de preview voordat je importeert
