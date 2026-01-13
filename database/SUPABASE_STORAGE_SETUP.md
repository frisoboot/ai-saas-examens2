# Supabase Storage Setup voor Afbeeldingen

## Waarom Supabase Storage?

Voorheen werden afbeeldingen opgeslagen als **base64 strings** in de database. Dit heeft grote nadelen:
- 📦 Database wordt heel groot (base64 is 30-40% groter dan het originele bestand)
- 🐌 Langzaam laden van vragen met afbeeldingen
- 💰 Duurder (database storage kost meer dan file storage)
- ⚠️ Database kolom grootte limiet

Met **Supabase Storage** worden afbeeldingen als bestanden opgeslagen, en alleen de URL wordt in de database opgeslagen.

## Setup Instructies

### Stap 1: Maak een Storage Bucket aan

1. Ga naar je Supabase dashboard: [https://app.supabase.com](https://app.supabase.com)
2. Selecteer je project
3. Klik op **"Storage"** in het linkermenu
4. Klik op de **"New bucket"** knop

### Stap 2: Configureer de Bucket

Vul de volgende instellingen in:

- **Naam**: `exam-images`
- **Publiek**: ✅ **Ja** (zodat afbeeldingen zichtbaar zijn voor studenten)
- **File size limit**: `5 MB` (optioneel, aanbevolen)
- **Allowed MIME types**: `image/*` (optioneel, om alleen afbeeldingen toe te staan)

Klik op **"Create bucket"**

### Stap 3: Stel Storage Policies in

Je bucket moet toegankelijk zijn voor het uploaden en lezen van afbeeldingen.

Ga naar de **Policies** tab van je bucket en voeg de volgende policies toe:

#### Policy 1: Public Read Access (Iedereen kan afbeeldingen bekijken)

```sql
CREATE POLICY "Public read access for exam images"
ON storage.objects FOR SELECT
USING (bucket_id = 'exam-images');
```

#### Policy 2: Authenticated Upload (Alleen ingelogde admins kunnen uploaden)

```sql
CREATE POLICY "Authenticated users can upload exam images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exam-images'
  AND auth.role() = 'authenticated'
);
```

#### Policy 3: Authenticated Delete (Alleen ingelogde admins kunnen verwijderen)

```sql
CREATE POLICY "Authenticated users can delete exam images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exam-images'
  AND auth.role() = 'authenticated'
);
```

### Stap 4: Test de Setup

1. Start je applicatie
2. Log in als admin
3. Ga naar "Vraag toevoegen"
4. Upload een afbeelding
5. Als alles goed is geconfigureerd, zie je:
   - De afbeelding wordt geüpload
   - Je krijgt een URL zoals: `https://xxx.supabase.co/storage/v1/object/public/exam-images/question-123.jpg`
   - De vraag wordt opgeslagen met deze URL

## Hoe het werkt

### Voor Admin Dashboard

Wanneer je een afbeelding uploadt:

1. Je selecteert een afbeelding bestand (`.jpg`, `.png`, etc.)
2. De afbeelding wordt getoond als preview
3. Bij het opslaan van de vraag:
   - Het bestand wordt geüpload naar Supabase Storage bucket `exam-images`
   - Je krijgt een publieke URL terug
   - Deze URL wordt opgeslagen in de `image_url` kolom van de database

### Voor Studenten

Wanneer een student een vraag ziet met een afbeelding:
- De browser laadt de afbeelding direct van Supabase Storage
- Dit is veel sneller dan base64 strings uit de database halen
- De afbeelding wordt gecached door de browser

## Migratie van Oude Data

Als je al vragen hebt met base64 afbeeldingen, worden deze **automatisch gemigreerd** naar Supabase Storage wanneer je de vraag bewerkt en opslaat.

De code detecteert automatisch of een `imageUrl` een base64 string is, en uploadt deze dan naar Storage.

## Voordelen

✅ **Sneller laden** - Afbeeldingen worden parallel geladen, niet via de database
✅ **Kleinere database** - Database bevat alleen URLs in plaats van grote base64 strings
✅ **Goedkoper** - File storage is goedkoper dan database storage
✅ **Schaalbaarheid** - Kan duizenden afbeeldingen aan zonder problemen
✅ **CDN caching** - Supabase gebruikt een CDN voor snelle wereldwijde toegang

## Troubleshooting

### Error: "Storage bucket 'exam-images' bestaat nog niet"

Volg de setup instructies hierboven om de bucket aan te maken.

### Error: "new row violates row-level security policy"

Je hebt de storage policies niet correct ingesteld. Controleer Stap 3.

### Afbeeldingen worden niet geladen

1. Controleer of de bucket **publiek** is ingesteld
2. Controleer of de "Public read access" policy actief is
3. Open de afbeelding URL in je browser om te testen

### Upload faalt

1. Controleer of je bent ingelogd als admin
2. Controleer of de "Authenticated upload" policy actief is
3. Controleer het bestandsformaat (alleen `.jpg`, `.png`, `.gif`, `.webp`)
4. Controleer de bestandsgrootte (max 5MB aanbevolen)

## Bestandsformaten

Ondersteunde formaten:
- ✅ `.jpg` / `.jpeg`
- ✅ `.png`
- ✅ `.gif`
- ✅ `.webp`
- ✅ `.svg`

## Toekomstige Verbeteringen

Mogelijke uitbreidingen:
- 🔄 Automatische afbeelding compressie aan de backend
- 📏 Automatische resize naar meerdere formaten (thumbnail, medium, large)
- 🗂️ Organisatie in submappen per vak of jaar
- 🔍 Automatische OCR voor tekst extractie uit afbeeldingen
